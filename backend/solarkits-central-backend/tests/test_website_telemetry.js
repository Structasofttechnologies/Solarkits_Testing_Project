/**
 * test_website_telemetry.js
 * Isolated unit & controller verification suite for 3-website telemetry and Main Dashboard Website Performance.
 * Uses an in-memory mock store for UtmVisit so staging/production MongoDB data is never modified.
 */

const assert = require('assert');
const mongoose = require('mongoose');
const path = require('path');

// Prevent live DB connection attempts during offline unit test
process.env.MONGODB_URI = '';

const { UtmVisit } = require('../src/modules/admin-panel/marketing/models');
const { resolveWebsiteInfo } = require('../src/modules/admin-panel/marketing/constants/websiteRegistry');
const webTelemetryService = require('../src/modules/admin-panel/marketing/services/webTelemetry.service');
const dashboardController = require('../src/modules/admin-panel/controller/main.dashboard.controller');
const { EpcLead, EpcQuote, EpcOrder, EpcAccount, BDELead } = require('../src/modules/admin-panel/models/india_solarshop_db');
const { MarketingCampaign } = require('../src/modules/admin-panel/marketing/models');

function makeQueryWrapper(rows) {
  let result = [...rows];
  const wrapper = {
    sort() { return wrapper; },
    skip(n) { result = result.slice(n); return wrapper; },
    limit(n) { result = result.slice(0, n); return wrapper; },
    lean() { return Promise.resolve(result); },
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };
  return wrapper;
}

function matchesFilter(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (filter.$or) {
    return filter.$or.some((sub) => matchesFilter(doc, sub));
  }
  for (const [k, cond] of Object.entries(filter)) {
    const val = doc[k];
    if (cond instanceof mongoose.Types.ObjectId || val instanceof mongoose.Types.ObjectId) {
      if (String(val) !== String(cond)) return false;
    } else if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) && !(cond instanceof RegExp)) {
      if (cond.$gte && new Date(val) < new Date(cond.$gte)) return false;
      if (cond.$lte && new Date(val) > new Date(cond.$lte)) return false;
      if (cond.$ne !== undefined && val === cond.$ne) return false;
      if (cond.$in && !cond.$in.includes(val ?? null)) return false;
      if (cond.$regex) {
        const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, cond.$options || '');
        if (!re.test(String(val || ''))) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

async function runTests() {
  const store = [];

  // Stub UtmVisit methods cleanly against in-memory array
  UtmVisit.findOne = async (filter) => {
    const found = store.find((d) => matchesFilter(d, filter));
    return found || null;
  };
  UtmVisit.exists = async (filter) => {
    const found = store.find((d) => matchesFilter(d, filter));
    return found ? { _id: found._id } : null;
  };
  UtmVisit.create = async (doc) => {
    const now = new Date();
    const row = {
      _id: new mongoose.Types.ObjectId(),
      created_at: now,
      updated_at: now,
      ...doc,
    };
    store.push(row);
    return row;
  };
  UtmVisit.updateOne = async (filter, ops) => {
    const doc = store.find((d) => matchesFilter(d, filter));
    if (!doc) return { modifiedCount: 0 };
    if (ops.$set) Object.assign(doc, ops.$set);
    if (ops.$inc) {
      for (const [k, v] of Object.entries(ops.$inc)) {
        doc[k] = (doc[k] || 0) + v;
      }
    }
    if (ops.$addToSet) {
      for (const [k, v] of Object.entries(ops.$addToSet)) {
        if (!Array.isArray(doc[k])) doc[k] = [];
        if (!doc[k].includes(v)) doc[k].push(v);
      }
    }
    doc.updated_at = new Date();
    return { modifiedCount: 1 };
  };
  UtmVisit.find = (filter) => makeQueryWrapper(store.filter((d) => matchesFilter(d, filter)));
  UtmVisit.countDocuments = async (filter) => store.filter((d) => matchesFilter(d, filter)).length;

  // Stub secondary models used in overview/conversion endpoints
  EpcLead.find = () => makeQueryWrapper([]);
  EpcAccount.find = () => makeQueryWrapper([]);
  BDELead.find = () => makeQueryWrapper([]);
  EpcQuote.find = () => makeQueryWrapper([]);
  EpcOrder.find = () => makeQueryWrapper([]);
  MarketingCampaign.find = () => makeQueryWrapper([]);

  console.log('1. Testing websiteRegistry resolution...');
  assert.strictEqual(resolveWebsiteInfo({ site_url: 'http://solarkits.in/' }).website_key, 'solarkits_main');
  assert.strictEqual(resolveWebsiteInfo({ site_url: 'https://store.solarkits.in/' }).website_key, 'solar_store');
  assert.strictEqual(resolveWebsiteInfo({ site_url: 'https://franchise.solarkits.in/' }).website_key, 'franchise_portal');
  assert.strictEqual(resolveWebsiteInfo({ origin: 'https://store.solarkits.in' }).site_domain, 'store.solarkits.in');

  console.log('2. Testing telemetry ingestion across all 3 websites...');
  // Website 1: http://solarkits.in/ — multi-page visit + form conversion
  await webTelemetryService.recordVisitEvent(
    {
      website_key: 'solarkits_main',
      visitor_id: 'vid_main_1',
      visitor_session_id: 'sid_main_1',
      landing_url: '/',
      current_path: '/',
      utm_source: 'google',
      utm_medium: 'organic',
      event_type: 'page_view',
    },
    { headers: { 'user-agent': 'Mozilla/5.0 Chrome/125.0' } }
  );
  await webTelemetryService.recordVisitEvent(
    {
      website_key: 'solarkits_main',
      visitor_id: 'vid_main_1',
      visitor_session_id: 'sid_main_1',
      current_path: '/industries',
      duration_seconds: 65,
      event_type: 'page_view',
    },
    { headers: { 'user-agent': 'Mozilla/5.0 Chrome/125.0' } }
  );
  await webTelemetryService.linkLeadToVisit(
    {
      website_key: 'solarkits_main',
      visitor_id: 'vid_main_1',
      visitor_session_id: 'sid_main_1',
      landing_url: '/',
    },
    {
      lead_id: new mongoose.Types.ObjectId(),
      lead_model: 'website_epc_leads',
      form_key: 'industry_rfp',
      website_key_fallback: 'solarkits_main',
    },
    { headers: {} }
  );

  // Returning session on solarkits_main from same visitor_id
  await webTelemetryService.recordVisitEvent(
    {
      website_key: 'solarkits_main',
      visitor_id: 'vid_main_1',
      visitor_session_id: 'sid_main_2',
      landing_url: '/industries/dairy',
      current_path: '/industries/dairy',
      utm_source: 'facebook',
      utm_medium: 'paid_social',
      duration_seconds: 25,
      event_type: 'page_view',
    },
    { headers: { 'user-agent': 'Mozilla/5.0 Mobile Safari' } }
  );

  // Website 2: https://store.solarkits.in/ — cross-site referral from solarkits.in
  await webTelemetryService.recordVisitEvent(
    JSON.stringify({
      website_key: 'solar_store',
      visitor_id: 'vid_store_1',
      visitor_session_id: 'sid_store_1',
      landing_url: '/shop?kw=3',
      current_path: '/shop',
      referrer: 'http://solarkits.in/',
      duration_seconds: 40,
      event_type: 'page_view',
    }),
    { headers: { 'user-agent': 'Mozilla/5.0 Chrome/125.0' } }
  );

  // Website 3: https://franchise.solarkits.in/ — WhatsApp campaign + franchise lead
  await webTelemetryService.recordVisitEvent(
    {
      website_key: 'franchise_portal',
      visitor_id: 'vid_fr_1',
      visitor_session_id: 'sid_fr_1',
      landing_url: '/franchise',
      current_path: '/franchise',
      utm_source: 'whatsapp',
      utm_campaign: 'franchise_2026',
      duration_seconds: 90,
      event_type: 'heartbeat',
    },
    { headers: { 'user-agent': 'Mozilla/5.0 Android Mobile' } }
  );
  await webTelemetryService.linkLeadToVisit(
    {
      website_key: 'franchise_portal',
      visitor_id: 'vid_fr_1',
      visitor_session_id: 'sid_fr_1',
      landing_url: '/franchise',
    },
    {
      lead_id: new mongoose.Types.ObjectId(),
      lead_model: 'franchise_leads',
      form_key: 'franchisee_enquiry',
      website_key_fallback: 'franchise_portal',
    },
    { headers: {} }
  );

  assert.strictEqual(store.length, 4, 'Expected 4 sessions recorded in store');

  console.log('3. Testing Main Dashboard get_website_performance (combined & separate)...');
  const mockRes = () => {
    const out = { statusCode: 200, body: null };
    return {
      status(code) { out.statusCode = code; return this; },
      json(payload) { out.body = payload; return out; },
      out,
    };
  };

  // All 3 websites combined
  const resAll = mockRes();
  await dashboardController.get_website_performance({ query: { dateRange: 'last_30_days', website: 'all' } }, resAll);
  assert.strictEqual(resAll.out.statusCode, 200);
  const allData = resAll.out.body.data;
  assert.strictEqual(allData.summary.totalVisitors, 4);
  assert.strictEqual(allData.summary.uniqueVisitors, 3);
  assert.strictEqual(allData.summary.returningVisitors, 1);
  assert.strictEqual(allData.summary.newVisitors, 2);
  assert.strictEqual(allData.summary.formSubmissions, 2);
  assert.strictEqual(allData.websiteBreakdown.length, 3);

  const mainSite = allData.websiteBreakdown.find((w) => w.websiteKey === 'solarkits_main');
  const storeSite = allData.websiteBreakdown.find((w) => w.websiteKey === 'solar_store');
  const frSite = allData.websiteBreakdown.find((w) => w.websiteKey === 'franchise_portal');
  assert.strictEqual(mainSite.totalVisitors, 2);
  assert.strictEqual(mainSite.uniqueVisitors, 1);
  assert.strictEqual(mainSite.formSubmissions, 1);
  assert.strictEqual(storeSite.totalVisitors, 1);
  assert.strictEqual(frSite.totalVisitors, 1);
  assert.strictEqual(frSite.formSubmissions, 1);

  // Filtered to solar_store only
  const resStore = mockRes();
  await dashboardController.get_website_performance({ query: { dateRange: 'last_30_days', website: 'solar_store' } }, resStore);
  const storeOnly = resStore.out.body.data;
  assert.strictEqual(storeOnly.summary.totalVisitors, 1);
  assert.strictEqual(storeOnly.topLandingPages[0].siteDomain, 'store.solarkits.in');
  assert.strictEqual(storeOnly.topLandingPages[0].page, '/shop');
  assert.strictEqual(storeOnly.trafficSources[0].name, 'Cross-Site Referral');
  assert.strictEqual(storeOnly.websiteBreakdown.length, 3, 'Comparison breakdown should remain populated for all 3 sites');

  // Drill-down filtered to franchise_portal
  const resDrill = mockRes();
  await dashboardController.get_drill_down_records(
    { query: { section: 'website', website: 'franchise_portal', dateRange: 'last_30_days' } },
    resDrill
  );
  assert.strictEqual(resDrill.out.body.totalCount, 1);
  assert.strictEqual(resDrill.out.body.records[0].site_domain, 'franchise.solarkits.in');
  assert.strictEqual(resDrill.out.body.records[0].has_form_submitted, true);

  // Overview KPIs with website filter
  const resOverview = mockRes();
  await dashboardController.get_overview_kpis({ query: { dateRange: 'last_30_days', website: 'solarkits_main' } }, resOverview);
  const totalCard = resOverview.out.body.data.find((c) => c.id === 'total_visitors');
  const uniqueCard = resOverview.out.body.data.find((c) => c.id === 'unique_visitors');
  assert.strictEqual(totalCard.current, 2);
  assert.strictEqual(uniqueCard.current, 1);

  console.log('4. Testing bot filtering...');
  const botRes = await webTelemetryService.recordVisitEvent(
    { website_key: 'solarkits_main', visitor_session_id: 'bot_sid' },
    { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } }
  );
  assert.strictEqual(botRes.skipped, true);

  console.log('\n✅ All website telemetry and dashboard verification assertions passed!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
