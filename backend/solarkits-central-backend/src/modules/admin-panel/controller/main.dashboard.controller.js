const mongoose = require('mongoose');

// Import database models from existing modules
const {
  EpcAccount,
  EpcType,
  EpcOrder,
  EpcQuote,
  EpcLead,
  WebsiteEpcLead,
  BDELead,
  BDEFollowUp,
  BDEProfile,
  Reseller,
  WarehouseComboKit: IndiaComboKit,
  FranchiseeCluster,
  FranchiseeClusterGoal,
} = require('../models/india_solarshop_db');

const {
  sendDeduplicatedAdminAlert,
} = require('../services/admin.notification.service');

const {
  SolarKit,
  WarehouseComboKit,
  Product,
} = require('../models/core_db');

const {
  MarketingCampaign,
  UtmVisit,
} = require('../marketing/models');
const {
  TRACKED_WEBSITES,
  resolveWebsiteInfo,
  getWebsiteByKey,
} = require('../marketing/constants/websiteRegistry');

const {
  GeoLevel1,
  GeoLevel2,
} = require('../models/geolocation_db');

/* =========================================================================
   DATE RANGE & FILTER HELPER UTILITIES
   ========================================================================= */

/**
 * Computes current and previous date periods based on selection
 */
const getDateRanges = (dateRange = 'last_30_days', customStart = null, customEnd = null) => {
  const now = new Date();
  let currentStart = null;
  let currentEnd = now;

  const range = (dateRange || 'last_30_days').toLowerCase();

  if (range === 'today') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'yesterday') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'last_7_days' || range === 'week') {
    currentStart = new Date(now.getTime() - 7 * 86400000);
  } else if (range === 'last_30_days') {
    currentStart = new Date(now.getTime() - 30 * 86400000);
  } else if (range === 'this_month' || range === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'last_month') {
    currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (range === 'quarterly' || range === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    currentStart = new Date(now.getFullYear(), qMonth, 1);
  } else if (range === 'yearly' || range === 'year') {
    currentStart = new Date(now.getFullYear(), 0, 1);
  } else if (range === 'custom' && customStart && customEnd) {
    currentStart = new Date(customStart);
    currentEnd = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
  } else {
    // Default to last 30 days
    currentStart = new Date(now.getTime() - 30 * 86400000);
  }

  // Calculate previous period of equal length
  const durationMs = Math.max(86400000, currentEnd.getTime() - currentStart.getTime());
  const prevEnd = new Date(currentStart.getTime());
  const prevStart = new Date(currentStart.getTime() - durationMs);

  return { currentStart, currentEnd, prevStart, prevEnd };
};

/**
 * Builds standard MongoDB match query for a date field
 */
const buildDateMatch = (field, start, end) => {
  const match = {};
  if (start && end) {
    match[field] = { $gte: start, $lte: end };
  } else if (start) {
    match[field] = { $gte: start };
  }
  return match;
};

/**
 * Safe percentage change calculation
 */
const calcPctChange = (current, previous) => {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    if (curr === 0) return { pct: 0, trend: 'neutral' };
    return { pct: 100, trend: 'up' };
  }
  const diff = ((curr - prev) / prev) * 100;
  return {
    pct: Math.abs(Number(diff.toFixed(1))),
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
  };
};

/**
 * Safe conversion ratio calculation
 */
const safeRatio = (num, den) => {
  const n = Number(num) || 0;
  const d = Number(den) || 0;
  if (d === 0) return 0;
  return Number(((n / d) * 100).toFixed(1));
};

/**
 * Builds MongoDB filter for UtmVisit supporting optional website filter across new and legacy records.
 */
const buildVisitFilter = (baseMatch = {}, website = 'all') => {
  if (!website || website === 'all') return baseMatch;
  const site = getWebsiteByKey(website) || resolveWebsiteInfo({ website_key: website });
  if (!site) return baseMatch;
  return {
    ...baseMatch,
    $or: [
      { website_key: site.website_key },
      { website_key: { $in: [null, ''] }, site_domain: site.site_domain },
      {
        website_key: { $in: [null, ''] },
        landing_url: { $regex: escapeRegex(site.site_domain), $options: 'i' },
      },
    ],
  };
};

/**
 * Normalizes a UtmVisit document into its canonical website descriptor.
 */
const resolveVisitSite = (visit = {}) =>
  resolveWebsiteInfo({
    website_key: visit.website_key,
    site_domain: visit.site_domain,
    site_url: visit.site_url,
    landing_url: visit.landing_url,
  });

const classifyTrafficSource = (v = {}) => {
  const utmSource = (v.utm_source || '').trim().toLowerCase();
  const utmMedium = (v.utm_medium || '').trim().toLowerCase();
  const referrer = (v.referrer || '').trim().toLowerCase();
  const combined = `${utmSource} ${utmMedium} ${referrer}`.trim();

  if (
    utmSource.includes('meta') ||
    utmSource.includes('facebook') ||
    utmSource.includes('instagram') ||
    utmSource === 'fb' ||
    utmSource === 'ig' ||
    referrer.includes('facebook.') ||
    referrer.includes('instagram.') ||
    referrer.includes('l.facebook')
  ) {
    return 'Meta Ads';
  }
  if (
    ['cpc', 'ppc', 'paid', 'paid_social', 'sem'].some((k) => utmMedium.includes(k) || utmSource.includes(k)) ||
    utmSource.includes('adwords')
  ) {
    return 'Paid Ads';
  }
  if (utmSource.includes('whatsapp') || utmMedium.includes('whatsapp') || referrer.includes('wa.me') || referrer.includes('whatsapp')) {
    return 'WhatsApp Campaign';
  }
  if (utmSource.includes('email') || utmMedium.includes('email') || utmSource.includes('newsletter')) {
    return 'Email Campaign';
  }
  if (utmSource.includes('sms') || utmMedium.includes('sms')) {
    return 'SMS Campaign';
  }
  if (
    combined.includes('google') ||
    combined.includes('bing') ||
    combined.includes('yahoo') ||
    combined.includes('duckduckgo')
  ) {
    return 'Organic Search';
  }
  if (utmSource) {
    return 'Marketing Campaign';
  }
  if (referrer.includes('solarkits.in')) {
    return 'Cross-Site Referral';
  }
  if (referrer) {
    return 'Referral Website';
  }
  return 'Direct Website';
};

const getSessionDurationSeconds = (v = {}) => {
  if (Number(v.duration_seconds) > 0) {
    return Math.min(14400, Math.round(Number(v.duration_seconds)));
  }
  if (v.first_touch_at && v.last_touch_at) {
    const diffSec = Math.max(0, Math.round((new Date(v.last_touch_at) - new Date(v.first_touch_at)) / 1000));
    return Math.min(14400, diffSec);
  }
  return 0;
};

const formatDurationStr = (sec) => {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s <= 0) return '0m 0s';
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const aggregateVisitSummary = (visitList = []) => {
  const totalVisitors = visitList.length;
  const visitorMap = new Map();
  let pageViews = 0;
  let formSubmissions = 0;
  let totalDurationSeconds = 0;
  let durationCount = 0;
  let bouncedSessions = 0;

  visitList.forEach((v) => {
    const visitorKey = v.visitor_id || v.visitor_session_id || v.ip_address || String(v._id || 'unknown');
    const prev = visitorMap.get(visitorKey) || { count: 0, hasReturningFlag: false };
    prev.count += 1;
    if (v.is_returning) prev.hasReturningFlag = true;
    visitorMap.set(visitorKey, prev);

    const pv = Math.max(1, Number(v.page_views || v.visit_count || 1));
    pageViews += pv;

    if (v.has_form_submitted || v.lead_id) {
      formSubmissions += 1;
    }

    const durSec = getSessionDurationSeconds(v);
    if (durSec > 0) {
      totalDurationSeconds += durSec;
      durationCount += 1;
    }

    const isBounce =
      typeof v.is_bounce === 'boolean'
        ? v.is_bounce
        : pv <= 1 && durSec < 10 && !v.has_form_submitted && !v.lead_id;
    if (isBounce) {
      bouncedSessions += 1;
    }
  });

  const uniqueVisitors = totalVisitors > 0 ? visitorMap.size : 0;
  const returningVisitors = Array.from(visitorMap.values()).filter(
    (entry) => entry.hasReturningFlag || entry.count > 1
  ).length;
  const newVisitors = Math.max(0, uniqueVisitors - returningVisitors);
  const avgDurationSec = durationCount > 0 ? Math.round(totalDurationSeconds / durationCount) : 0;
  const bounceRatePct = totalVisitors > 0 ? Number(((bouncedSessions / totalVisitors) * 100).toFixed(1)) : 0;
  const conversionRatePct = totalVisitors > 0 ? Number(((formSubmissions / totalVisitors) * 100).toFixed(1)) : 0;

  return {
    totalVisitors,
    uniqueVisitors,
    newVisitors,
    returningVisitors,
    pageViews,
    formSubmissions,
    conversionRate: `${conversionRatePct}%`,
    avgSessionDurationSec: avgDurationSec,
    avgSessionDuration: formatDurationStr(avgDurationSec),
    bounceRate: `${bounceRatePct}%`,
    bounceRateNum: bounceRatePct,
  };
};

/* =========================================================================
   1. BOOTSTRAP MASTER FILTERS
   ========================================================================= */

// Helper to escape special regex characters
const escapeRegex = (text) => (text || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// Comprehensive standard list of all 36 Indian States and Union Territories
const INDIA_STANDARD_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry', 'Dadra and Nagar Haveli and Daman and Diu', 'Andaman and Nicobar Islands', 'Lakshadweep'
];

// Canonical corrections for historical data entries
const CANONICAL_STATES = {
  'gujrat': 'Gujarat',
  'maharastra': 'Maharashtra',
  'orissa': 'Odisha',
  'uttaranchal': 'Uttarakhand',
  'pondicherry': 'Puducherry',
};

const normalizeStateName = (name) => {
  if (!name) return '';
  const clean = name.trim();
  const lower = clean.toLowerCase();
  if (CANONICAL_STATES[lower]) return CANONICAL_STATES[lower];
  // Match case-insensitively with standard states
  const std = INDIA_STANDARD_STATES.find((s) => s.toLowerCase() === lower);
  return std || clean;
};

/**
 * Fetch active configured combo kits from Admin registry across core_db and india_solarshop_db
 */
const getConfiguredComboKits = async () => {
  const query = { deleted_at: null, is_custom: false };
  const [kitsCore, kitsIndia] = await Promise.all([
    WarehouseComboKit.find(query).lean().catch(() => []),
    IndiaComboKit.find(query).lean().catch(() => []),
  ]);
  const kitsMap = new Map();
  [...kitsCore, ...kitsIndia].forEach((k) => kitsMap.set(k._id.toString(), k));
  return Array.from(kitsMap.values());
};

exports.get_dashboard_bootstrap = async (req, res) => {
  try {
    const [states, epcTypes, bdes, configuredKits, campaigns] = await Promise.all([
      GeoLevel1.find({ is_active: { $ne: false } }).sort({ name: 1 }).lean().catch(() => []),
      EpcType.find({ is_active: { $ne: false } }, 'type_name name description _id').lean().catch(() => []),
      BDEProfile.find({}, 'bde_id full_name mobile email status _id').lean().catch(() => []),
      getConfiguredComboKits(),
      MarketingCampaign.find({}, 'campaign_name campaign_type status _id').lean().catch(() => []),
    ]);

    // Fetch active districts mapped by state
    const districts = await GeoLevel2.find({ is_active: { $ne: false } })
      .sort({ name: 1 })
      .lean()
      .catch(() => []);

    // Get distinct state names from actual database records (EPCs, Leads, Orders)
    const [epcStates, leadStates, orderStates] = await Promise.all([
      EpcAccount.distinct('state_name').catch(() => []),
      EpcLead.distinct('state_name').catch(() => []),
      EpcOrder.distinct('delivery_address.state_name').catch(() => []),
    ]);

    const distinctRealStates = Array.from(new Set([...epcStates, ...leadStates, ...orderStates].filter(Boolean)));

    // Build unified map of states with priority: DB GeoLevel1 -> Real Data -> Standard States
    const stateMap = new Map();
    const stateIdToName = new Map();

    (states || []).forEach((s) => {
      const nm = normalizeStateName(s.name || s.state_name);
      if (nm) {
        const id = s._id ? s._id.toString() : nm;
        stateMap.set(nm.toLowerCase(), {
          id,
          name: nm,
          code: s.code || nm.slice(0, 2).toUpperCase(),
        });
        if (s._id) {
          stateIdToName.set(s._id.toString(), nm);
        }
      }
    });

    distinctRealStates.forEach((raw) => {
      const nm = normalizeStateName(raw);
      if (nm && !stateMap.has(nm.toLowerCase())) {
        stateMap.set(nm.toLowerCase(), {
          id: nm,
          name: nm,
          code: nm.slice(0, 2).toUpperCase(),
        });
      }
    });

    INDIA_STANDARD_STATES.forEach((nm) => {
      if (!stateMap.has(nm.toLowerCase())) {
        stateMap.set(nm.toLowerCase(), {
          id: nm,
          name: nm,
          code: nm.slice(0, 2).toUpperCase(),
        });
      }
    });

    const finalStates = Array.from(stateMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Map districts with proper field resolution (name, level_1 and state_name)
    const finalDistricts = (districts || []).map((d) => {
      const dName = (d.name || d.district_name || '').trim();
      const stateId = d.level_1 ? d.level_1.toString() : (d.state_id ? d.state_id.toString() : null);
      const stateName = (stateId && stateIdToName.get(stateId)) || normalizeStateName(d.state_name) || null;
      return {
        id: d._id ? d._id.toString() : dName,
        name: dName,
        state_id: stateId,
        state_name: stateName,
      };
    }).filter((d) => Boolean(d.name));

    // Extract authentic configured combo kits and their capacities
    const comboKitList = (configuredKits || []).map((k) => {
      const capNum = Number(k.kit_capacity_kw || k.capacity || (k.name.match(/(\d+)\s*(?:kw|k\.w)/i)?.[1]) || 1);
      return {
        id: k._id.toString(),
        name: k.name,
        capacity: `${capNum} kW`,
        capacityKw: capNum,
      };
    });

    const kitCapacities = Array.from(new Set(comboKitList.map((k) => k.capacity))).sort((a, b) => parseInt(a) - parseInt(b));
    const kitTypes = comboKitList.map((k) => k.name);

    return res.status(200).json({
      success: true,
      data: {
        states: finalStates,
        districts: finalDistricts,
        epcTypes: (epcTypes || []).map((t) => ({ id: t._id, name: t.type_name || t.name })),
        bdes: (bdes || []).map((b) => ({ id: b._id, name: b.full_name, code: b.bde_id })),
        configuredComboKits: comboKitList,
        kitCapacities: kitCapacities.length > 0 ? kitCapacities : ['1 kW', '2 kW', '3 kW'],
        kitTypes: kitTypes.length > 0 ? kitTypes : ['Combo Kit'],
        salesSources: ['Website Form', 'Phone Call', 'WhatsApp Enquiry', 'BDE Direct', 'Franchisee Quote', 'Email Campaign', 'Direct Portal'],
        orderStatuses: ['Enquiry', 'Quotation', 'Trial Order', 'Confirmed', 'Processing', 'Dispatched', 'Delivered', 'Cancelled'],
        campaigns: (campaigns || []).map((c) => ({ id: c._id, name: c.campaign_name, type: c.campaign_type })),
        websites: TRACKED_WEBSITES.map((w) => ({
          id: w.website_key,
          key: w.website_key,
          domain: w.site_domain,
          url: w.site_url,
          label: w.label,
          shortLabel: w.short_label,
          color: w.color,
        })),
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Bootstrap error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard bootstrap masters', error: error.message });
  }
};

/* =========================================================================
   2. OVERVIEW 14 KPI CARDS
   ========================================================================= */

exports.get_overview_kpis = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, state, district, website } = req.query;
    const { currentStart, currentEnd, prevStart, prevEnd } = getDateRanges(dateRange, startDate, endDate);

    // Filter helper for state and district (case-insensitive)
    const applyGeo = (q, stateField = 'state_name', distField = 'district_name') => {
      const filter = { ...q };
      if (state && state !== 'all') {
        filter[stateField] = { $regex: new RegExp(`^${escapeRegex(state)}$`, 'i') };
      }
      if (district && district !== 'all') {
        filter[distField] = { $regex: new RegExp(`^${escapeRegex(district)}$`, 'i') };
      }
      return filter;
    };

    // Parallel fetch for current and previous period records
    const [
      // 1 & 2: Visitors
      currVisits,
      prevVisits,

      // 3 & 4: Enquiries & Qualified Leads
      currLeads,
      prevLeads,

      // 5, 6, 7: EPCs
      allEpcs,

      // 8: Sales Leads
      currBdeLeads,
      prevBdeLeads,

      // 9: Quotations
      currQuotes,
      prevQuotes,

      // 10, 11, 12, 13, 14: Orders & Revenue & Demand
      currOrders,
      prevOrders,
    ] = await Promise.all([
      // Visits (from UtmVisit)
      UtmVisit.find(buildVisitFilter(buildDateMatch('created_at', currentStart, currentEnd), website)).lean().catch(() => []),
      UtmVisit.find(buildVisitFilter(buildDateMatch('created_at', prevStart, prevEnd), website)).lean().catch(() => []),

      // Enquiries (from EpcLead + WebsiteEpcLead)
      EpcLead.find(applyGeo(buildDateMatch('created_at', currentStart, currentEnd))).lean().catch(() => []),
      EpcLead.find(applyGeo(buildDateMatch('created_at', prevStart, prevEnd))).lean().catch(() => []),

      // EPC Accounts (Registered, Verified, Active)
      EpcAccount.find(applyGeo({ deleted_at: null }, 'state_name', 'district_name')).lean().catch(() => []),

      // CRM Sales Leads
      BDELead.find(applyGeo(buildDateMatch('created_at', currentStart, currentEnd))).lean().catch(() => []),
      BDELead.find(applyGeo(buildDateMatch('created_at', prevStart, prevEnd))).lean().catch(() => []),

      // Quotations
      EpcQuote.find(applyGeo(buildDateMatch('created_at', currentStart, currentEnd), 'territory.state_name', 'territory.district_name')).lean().catch(() => []),
      EpcQuote.find(applyGeo(buildDateMatch('created_at', prevStart, prevEnd), 'territory.state_name', 'territory.district_name')).lean().catch(() => []),

      // Orders
      EpcOrder.find(applyGeo(buildDateMatch('created_at', currentStart, currentEnd), 'delivery_address.state_name', 'delivery_address.district_name')).lean().catch(() => []),
      EpcOrder.find(applyGeo(buildDateMatch('created_at', prevStart, prevEnd), 'delivery_address.state_name', 'delivery_address.district_name')).lean().catch(() => []),
    ]);

    // 1. Visitors Calculations
    const currTotalVisitors = currVisits.length;
    const prevTotalVisitors = prevVisits.length;

    const currUniqueVisitors = new Set(currVisits.map(v => v.visitor_id || v.visitor_session_id || v.ip_address).filter(Boolean)).size || currTotalVisitors;
    const prevUniqueVisitors = new Set(prevVisits.map(v => v.visitor_id || v.visitor_session_id || v.ip_address).filter(Boolean)).size || prevTotalVisitors;

    // 2. Enquiries & Qualified Leads
    const currEnquiries = currLeads.length;
    const prevEnquiries = prevLeads.length;

    const currQualified = currLeads.filter(l => ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;
    const prevQualified = prevLeads.filter(l => ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;

    // 3. EPC Network Metrics
    const registeredEpcsCount = allEpcs.length;
    const isEpcVerified = (e) => Boolean(
      e.is_gstin_active ||
      (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
      (e.gst_verification_status && e.gst_verification_status !== 'unverified' && e.gst_verification_status.includes('verified'))
    );
    const verifiedEpcsCount = allEpcs.filter(isEpcVerified).length;

    // Approved definition: Verified EPCs with activity in last 30 days OR at least 1 order
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const activeEpcsCount = allEpcs.filter(e => {
      const isVerified = isEpcVerified(e);
      const isRecent = e.last_activity_at && new Date(e.last_activity_at) >= thirtyDaysAgo;
      return isVerified && (isRecent || e.behavior_status === 'active' || e.behavior_status === 'loyal_repeat');
    }).length;

    // 4. Sales Leads & Quotes
    const currSalesLeads = currBdeLeads.length + currEnquiries;
    const prevSalesLeads = prevBdeLeads.length + prevEnquiries;

    const currQuotations = currQuotes.length;
    const prevQuotations = prevQuotes.length;

    // 5. Confirmed & Pipeline Orders & Financials
    const validOrderStatuses = ['confirmed', 'processing', 'vehicle_assigned', 'ready_for_dispatch', 'dispatched', 'in_transit', 'reached_destination', 'delivered'];
    const currActiveOrders = currOrders.filter(o => o.order_status !== 'cancelled');
    const prevActiveOrders = prevOrders.filter(o => o.order_status !== 'cancelled');

    const currConfirmedOrders = currOrders.filter(o => validOrderStatuses.includes(o.order_status));
    const prevConfirmedOrders = prevOrders.filter(o => validOrderStatuses.includes(o.order_status));

    const currEffectiveOrders = currConfirmedOrders.length > 0 ? currConfirmedOrders : currActiveOrders;
    const prevEffectiveOrders = prevConfirmedOrders.length > 0 ? prevConfirmedOrders : prevActiveOrders;

    const currConfirmedCount = currEffectiveOrders.length;
    const prevConfirmedCount = prevEffectiveOrders.length;

    // Monetary conversions from Paise to INR
    const currOrderValueInr = Math.round(currEffectiveOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0) / 100);
    const prevOrderValueInr = Math.round(prevEffectiveOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0) / 100);

    const currRealizedRevInr = Math.round(currEffectiveOrders.reduce((sum, o) => {
      if (o.offline_payment?.verification_status === 'approved') {
        return sum + (o.offline_payment.amount_paid || (o.grand_total_paise / 100));
      }
      return sum;
    }, 0));
    const prevRealizedRevInr = Math.round(prevEffectiveOrders.reduce((sum, o) => {
      if (o.offline_payment?.verification_status === 'approved') {
        return sum + (o.offline_payment.amount_paid || (o.grand_total_paise / 100));
      }
      return sum;
    }, 0));

    const currPendingCollectionsInr = Math.max(0, currOrderValueInr - currRealizedRevInr);
    const prevPendingCollectionsInr = Math.max(0, prevOrderValueInr - prevRealizedRevInr);

    // 6. Estimated Kit Demand in kW (from Quotes + Orders + Leads)
    const currQuoteKw = currQuotes.reduce((sum, q) => sum + (q.total_kw || ((q.kit_capacity_kw || 0) * (q.quantity || 1)) || 0), 0);
    const currOrderKw = currEffectiveOrders.reduce((sum, o) => sum + (o.order_load_metrics?.total_kw || 0), 0);
    let currLeadKw = 0;
    currLeads.forEach(l => {
      if (l.required_capacity) {
        const parsed = parseFloat(String(l.required_capacity).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) currLeadKw += parsed;
      }
    });
    const currEstimatedKw = Math.round(currQuoteKw + currOrderKw + currLeadKw);

    const prevQuoteKw = prevQuotes.reduce((sum, q) => sum + (q.total_kw || ((q.kit_capacity_kw || 0) * (q.quantity || 1)) || 0), 0);
    const prevOrderKw = prevConfirmedOrders.reduce((sum, o) => sum + (o.order_load_metrics?.total_kw || 0), 0);
    let prevLeadKw = 0;
    prevLeads.forEach(l => {
      if (l.required_capacity) {
        const parsed = parseFloat(String(l.required_capacity).replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) prevLeadKw += parsed;
      }
    });
    const prevEstimatedKw = Math.round(prevQuoteKw + prevOrderKw + prevLeadKw);

    // Construct 14 KPI Cards with Comparison
    const kpiCards = [
      {
        id: 'total_visitors',
        title: 'Total Website Visitors',
        current: currTotalVisitors,
        previous: prevTotalVisitors,
        format: 'number',
        ...calcPctChange(currTotalVisitors, prevTotalVisitors),
        sectionKey: 'website',
      },
      {
        id: 'unique_visitors',
        title: 'Unique Visitors',
        current: currUniqueVisitors,
        previous: prevUniqueVisitors,
        format: 'number',
        ...calcPctChange(currUniqueVisitors, prevUniqueVisitors),
        sectionKey: 'website',
      },
      {
        id: 'total_enquiries',
        title: 'Total Enquiries',
        current: currEnquiries,
        previous: prevEnquiries,
        format: 'number',
        ...calcPctChange(currEnquiries, prevEnquiries),
        sectionKey: 'enquiries',
      },
      {
        id: 'qualified_leads',
        title: 'Qualified Leads',
        current: currQualified,
        previous: prevQualified,
        format: 'number',
        ...calcPctChange(currQualified, prevQualified),
        sectionKey: 'enquiries',
      },
      {
        id: 'registered_epcs',
        title: 'Registered EPCs',
        current: registeredEpcsCount,
        previous: registeredEpcsCount,
        format: 'number',
        pct: 0,
        trend: 'neutral',
        sectionKey: 'epcs',
      },
      {
        id: 'verified_epcs',
        title: 'Verified EPCs',
        current: verifiedEpcsCount,
        previous: verifiedEpcsCount,
        format: 'number',
        pct: 0,
        trend: 'neutral',
        sectionKey: 'epcs',
      },
      {
        id: 'active_epcs',
        title: 'Active EPCs',
        current: activeEpcsCount,
        previous: activeEpcsCount,
        format: 'number',
        pct: 0,
        trend: 'neutral',
        sectionKey: 'epcs',
      },
      {
        id: 'total_sales_leads',
        title: 'Total Sales Leads',
        current: currSalesLeads,
        previous: prevSalesLeads,
        format: 'number',
        ...calcPctChange(currSalesLeads, prevSalesLeads),
        sectionKey: 'pipeline',
      },
      {
        id: 'total_quotations',
        title: 'Total Quotations',
        current: currQuotations,
        previous: prevQuotations,
        format: 'number',
        ...calcPctChange(currQuotations, prevQuotations),
        sectionKey: 'quotes',
      },
      {
        id: 'confirmed_orders',
        title: 'Confirmed Orders',
        current: currConfirmedCount,
        previous: prevConfirmedCount,
        format: 'number',
        ...calcPctChange(currConfirmedCount, prevConfirmedCount),
        sectionKey: 'revenue',
      },
      {
        id: 'total_order_value',
        title: 'Total Order Value',
        current: currOrderValueInr,
        previous: prevOrderValueInr,
        format: 'currency',
        ...calcPctChange(currOrderValueInr, prevOrderValueInr),
        sectionKey: 'revenue',
      },
      {
        id: 'realized_revenue',
        title: 'Realized Revenue',
        current: currRealizedRevInr,
        previous: prevRealizedRevInr,
        format: 'currency',
        ...calcPctChange(currRealizedRevInr, prevRealizedRevInr),
        sectionKey: 'revenue',
      },
      {
        id: 'pending_collections',
        title: 'Pending Collections',
        current: currPendingCollectionsInr,
        previous: prevPendingCollectionsInr,
        format: 'currency',
        ...calcPctChange(currPendingCollectionsInr, prevPendingCollectionsInr),
        sectionKey: 'revenue',
      },
      {
        id: 'estimated_kit_demand',
        title: 'Estimated Kit Demand',
        current: currEstimatedKw,
        previous: prevEstimatedKw,
        format: 'kw',
        ...calcPctChange(currEstimatedKw, prevEstimatedKw),
        sectionKey: 'quotes',
      },
    ];

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      dateRange: { start: currentStart, end: currentEnd },
      data: kpiCards,
    });
  } catch (error) {
    console.error('[MainDashboard] Overview KPI error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate overview KPIs', error: error.message });
  }
};

/* =========================================================================
   3. WEBSITE PERFORMANCE
   ========================================================================= */

exports.get_website_performance = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, website = 'all' } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const allVisits = await UtmVisit.find(buildDateMatch('created_at', currentStart, currentEnd))
      .lean()
      .catch(() => []);

    // Tag every visit with its canonical website key so all 3 sites are always tracked separately
    const visitsByWebsite = new Map(TRACKED_WEBSITES.map((w) => [w.website_key, []]));
    const taggedVisits = allVisits.map((v) => {
      const siteInfo = resolveVisitSite(v);
      const bucket = visitsByWebsite.get(siteInfo.website_key);
      if (bucket) {
        bucket.push(v);
      }
      return { visit: v, siteInfo };
    });

    const totalAllSitesVisitors = allVisits.length;
    const websiteBreakdown = TRACKED_WEBSITES.map((site) => {
      const siteVisits = visitsByWebsite.get(site.website_key) || [];
      const siteSummary = aggregateVisitSummary(siteVisits);
      const sharePct =
        totalAllSitesVisitors > 0
          ? Number(((siteSummary.totalVisitors / totalAllSitesVisitors) * 100).toFixed(1))
          : 0;
      return {
        websiteKey: site.website_key,
        siteDomain: site.site_domain,
        siteUrl: site.site_url,
        label: site.label,
        shortLabel: site.short_label,
        color: site.color,
        sharePct,
        ...siteSummary,
      };
    });

    const activeWebsiteFilter = website && website !== 'all' ? website : 'all';
    const filteredEntries =
      activeWebsiteFilter === 'all'
        ? taggedVisits
        : taggedVisits.filter((entry) => entry.siteInfo.website_key === activeWebsiteFilter);

    const filteredVisits = filteredEntries.map((e) => e.visit);
    const summary = aggregateVisitSummary(filteredVisits);

    const sourceCount = {};
    const landingStats = new Map();
    const dailyMap = {};

    filteredEntries.forEach(({ visit: v, siteInfo }) => {
      // Traffic Source
      const normalizedSrc = classifyTrafficSource(v);
      sourceCount[normalizedSrc] = (sourceCount[normalizedSrc] || 0) + 1;

      // Landing Pages & Enquiries (kept distinct per website so '/' doesn't collide)
      const rawPath = (v.landing_url || '/').split('?')[0];
      const landingPath = rawPath.startsWith('http')
        ? (() => {
          try {
            return new URL(rawPath).pathname || '/';
          } catch (_) {
            return '/';
          }
        })()
        : rawPath || '/';
      const landingKey = `${siteInfo.website_key}::${landingPath}`;
      const existingLanding = landingStats.get(landingKey) || {
        websiteKey: siteInfo.website_key,
        siteDomain: siteInfo.site_domain,
        siteLabel: siteInfo.label,
        page: landingPath,
        visits: 0,
        enquiries: 0,
      };
      existingLanding.visits += 1;
      if (v.has_form_submitted || v.lead_id) {
        existingLanding.enquiries += 1;
      }
      landingStats.set(landingKey, existingLanding);

      // Daily trend mapping (with separate per-website series)
      const dateSource = v.created_at || v.first_touch_at;
      if (dateSource) {
        const dKey = new Date(dateSource).toISOString().slice(0, 10);
        if (!dailyMap[dKey]) {
          dailyMap[dKey] = {
            date: dKey,
            name: dKey.slice(5),
            visitors: 0,
            solarkits_main: 0,
            solar_store: 0,
            franchise_portal: 0,
          };
        }
        dailyMap[dKey].visitors += 1;
        if (dailyMap[dKey][siteInfo.website_key] !== undefined) {
          dailyMap[dKey][siteInfo.website_key] += 1;
        }
      }
    });

    // Format Sources for Chart
    const trafficSources = Object.entries(sourceCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Top Landing Pages with Authentic Conversion Rate & Website Identification
    const topLandingPages = Array.from(landingStats.values())
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10)
      .map((row) => ({
        websiteKey: row.websiteKey,
        siteDomain: row.siteDomain,
        siteLabel: row.siteLabel,
        page: row.page,
        visits: row.visits,
        enquiries: row.enquiries,
        conversionPct: row.visits > 0 ? ((row.enquiries / row.visits) * 100).toFixed(1) : '0.0',
      }));

    // Authentic Daily Trend Array
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({
      success: true,
      data: {
        activeWebsite: activeWebsiteFilter,
        summary,
        websiteBreakdown,
        trafficSources,
        topLandingPages,
        dailyTrend,
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Website Performance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate website performance', error: error.message });
  }
};

/* =========================================================================
   4. ENQUIRY FUNNEL
   ========================================================================= */

exports.get_enquiry_funnel = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, state, district } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const match = buildDateMatch('created_at', currentStart, currentEnd);
    if (state && state !== 'all') match.state_name = state;
    if (district && district !== 'all') match.district_name = district;

    const leads = await EpcLead.find(match).lean().catch(() => []);

    const sourceCounts = {
      'Website Form': 0,
      'Call Enquiry': 0,
      'WhatsApp Enquiry': 0,
      'Other': 0,
    };

    const statusCounts = {};
    let qualifiedCount = 0;
    let pendingCount = 0;
    let responseTimeSumMinutes = 0;
    let responseCount = 0;

    leads.forEach((l) => {
      const src = (l.lead_source || 'website').toLowerCase();
      if (src.includes('phone') || src.includes('call')) sourceCounts['Call Enquiry'] += 1;
      else if (src.includes('whatsapp')) sourceCounts['WhatsApp Enquiry'] += 1;
      else if (src.includes('portal') || src.includes('web') || src.includes('form')) sourceCounts['Website Form'] += 1;
      else sourceCounts['Other'] += 1;

      const st = l.lead_status || 'New';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      if (['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(st) || l.gst_verified) {
        qualifiedCount += 1;
      }
      if (['New', 'GST Verification Pending'].includes(st)) {
        pendingCount += 1;
      }

      // First response time calculation
      if (l.assigned_at && l.created_at) {
        const diffMinutes = Math.max(0, (new Date(l.assigned_at) - new Date(l.created_at)) / 60000);
        responseTimeSumMinutes += diffMinutes;
        responseCount += 1;
      }
    });

    const totalEnquiries = leads.length;
    const avgResponseMinutes = responseCount > 0 ? Math.round(responseTimeSumMinutes / responseCount) : null;
    const responseTimeStr = avgResponseMinutes !== null ? `${avgResponseMinutes} mins` : 'N/A';

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalEnquiries,
          websiteFormEnquiries: sourceCounts['Website Form'],
          callEnquiries: sourceCounts['Call Enquiry'],
          whatsappEnquiries: sourceCounts['WhatsApp Enquiry'],
          qualifiedLeads: qualifiedCount,
          unqualifiedLeads: Math.max(0, totalEnquiries - qualifiedCount),
          pendingEnquiries: pendingCount,
          firstResponseTime: responseTimeStr,
          averageResponseTime: responseTimeStr,
          unattendedEnquiries: pendingCount,
        },
        sourcesDistribution: Object.entries(sourceCounts).map(([name, value]) => ({ name, value })),
        statusDistribution: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Enquiry Funnel error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate enquiry funnel', error: error.message });
  }
};

/* =========================================================================
   5. EPC NETWORK
   ========================================================================= */

exports.get_epc_network = async (req, res) => {
  try {
    const { state, district } = req.query;
    const query = { deleted_at: null };
    if (state && state !== 'all') query.state_name = state;
    if (district && district !== 'all') query.district_name = district;

    const [allEpcs, allOrders] = await Promise.all([
      EpcAccount.find(query).lean().catch(() => []),
      EpcOrder.find({ order_status: { $ne: 'cancelled' } }, 'epc_id grand_total_paise items').lean().catch(() => []),
    ]);

    const totalEpcs = allEpcs.length;
    const isEpcVerified = (e) => Boolean(
      e.is_gstin_active ||
      (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
      (e.gst_verification_status && e.gst_verification_status !== 'unverified' && e.gst_verification_status.includes('verified'))
    );
    const verifiedEpcs = allEpcs.filter(isEpcVerified).length;
    const pendingVerification = allEpcs.filter(e => e.gst_verification_status === 'pending_admin' || (!e.gst_verification_status && !e.gstin)).length;
    const rejectedEpcs = allEpcs.filter(e => e.status === 'rejected' || (!isEpcVerified(e) && e.gst_verification_status === 'unverified')).length;

    // Order mapping per EPC
    const epcOrdersMap = new Map();
    allOrders.forEach(o => {
      const eid = o.epc_id?.toString();
      if (!eid) return;
      if (!epcOrdersMap.has(eid)) {
        epcOrdersMap.set(eid, { count: 0, orderValuePaise: 0 });
      }
      const entry = epcOrdersMap.get(eid);
      entry.count += 1;
      entry.orderValuePaise += (o.grand_total_paise || 0);
    });

    const epcsWithOrders = allEpcs.filter(e => epcOrdersMap.has(e._id.toString())).length;
    const epcsWithoutOrders = Math.max(0, totalEpcs - epcsWithOrders);

    // Active vs Inactive based on approved rule (activity in 30 days OR has orders)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const activeEpcs = allEpcs.filter(e => {
      const isRecent = e.last_activity_at && new Date(e.last_activity_at) >= thirtyDaysAgo;
      return isEpcVerified(e) && (isRecent || epcOrdersMap.has(e._id.toString()));
    }).length;

    const inactiveEpcs = Math.max(0, totalEpcs - activeEpcs);

    // Top performing EPCs
    const topEpcs = allEpcs
      .filter(e => epcOrdersMap.has(e._id.toString()))
      .map(e => {
        const stats = epcOrdersMap.get(e._id.toString());
        return {
          id: e._id,
          name: e.company_name || e.name || 'Solar EPC Contractor',
          gstin: e.gstin || 'Unregistered',
          state: e.state_name || 'Regional',
          district: e.district_name || 'Central',
          totalOrders: stats.count,
          orderValue: Math.round(stats.orderValuePaise / 100),
          lastActive: e.last_activity_at || e.updated_at || e.created_at,
        };
      })
      .sort((a, b) => b.orderValue - a.orderValue)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          registeredEpcs: totalEpcs,
          verifiedEpcs,
          pendingVerification,
          rejectedEpcs,
          activeEpcs,
          inactiveEpcs,
          epcsWithOrders,
          epcsWithoutOrders,
        },
        verificationFunnel: [
          { stage: 'Registered EPCs', count: totalEpcs },
          { stage: 'GST Verified', count: verifiedEpcs },
          { stage: 'Active EPCs', count: activeEpcs },
          { stage: 'EPCs with Orders', count: epcsWithOrders },
        ],
        topEpcs,
      },
    });
  } catch (error) {
    console.error('[MainDashboard] EPC Network error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate EPC network', error: error.message });
  }
};

/* =========================================================================
   6. SALES PIPELINE
   ========================================================================= */

exports.get_sales_pipeline = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, state, district } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const match = buildDateMatch('created_at', currentStart, currentEnd);
    if (state && state !== 'all') match.state_name = state;
    if (district && district !== 'all') match.district_name = district;

    const [bdeLeads, epcLeads, epcQuotes, epcOrders] = await Promise.all([
      BDELead.find(match).lean().catch(() => []),
      EpcLead.find(match).lean().catch(() => []),
      EpcQuote.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcOrder.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
    ]);

    const totalLeads = bdeLeads.length + epcLeads.length;

    // Pipeline Stage counts according to required stages:
    // New Lead → Contacted → Qualified → Quotation Generated → Follow-up → Trial Order → Confirmed Order (Won)
    const contactedCount = bdeLeads.filter(l => ['contacted', 'follow_up_scheduled', 'interested', 'completed'].includes(l.lead_status)).length +
      epcLeads.filter(l => ['Contacted', 'Interested', 'Follow-up'].includes(l.lead_status)).length;

    const qualifiedCount = bdeLeads.filter(l => ['interested', 'approved', 'converted', 'onboarded'].includes(l.lead_status)).length +
      epcLeads.filter(l => ['Interested', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;

    const quotesCount = epcQuotes.length;
    const followUpsCount = bdeLeads.filter(l => l.lead_status === 'follow_up_scheduled' || l.follow_up_date).length +
      epcLeads.filter(l => l.lead_status === 'Follow-up').length;

    const trialOrdersCount = epcOrders.filter(o => o.is_trial_order || o.order_type === 'trial_order').length;
    const confirmedOrdersCount = epcOrders.filter(o => ['confirmed', 'processing', 'dispatched', 'delivered'].includes(o.order_status)).length;

    const pipelineStages = [
      { stage: 'New Lead', count: totalLeads },
      { stage: 'Contacted', count: contactedCount },
      { stage: 'Qualified', count: qualifiedCount },
      { stage: 'Quotation Generated', count: quotesCount },
      { stage: 'Follow-up', count: followUpsCount },
      { stage: 'Trial Order', count: trialOrdersCount },
      { stage: 'Confirmed Order (Won)', count: confirmedOrdersCount },
    ];

    // Lost Reasons
    const lostReasons = {
      'Price': 0,
      'Competition': 0,
      'No Response': 0,
      'Product Mismatch': 0,
      'Customer Cancelled': 0,
      'Other': 0,
    };

    epcQuotes.forEach(q => {
      if (q.lost_reason) {
        const r = q.lost_reason.toLowerCase();
        if (r.includes('price') || r.includes('cost')) lostReasons['Price'] += 1;
        else if (r.includes('compet') || r.includes('vendor')) lostReasons['Competition'] += 1;
        else if (r.includes('response') || r.includes('reach')) lostReasons['No Response'] += 1;
        else if (r.includes('mismatch') || r.includes('spec')) lostReasons['Product Mismatch'] += 1;
        else if (r.includes('cancel')) lostReasons['Customer Cancelled'] += 1;
        else lostReasons['Other'] += 1;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalLeads,
          contacted: contactedCount,
          qualified: qualifiedCount,
          quotations: quotesCount,
          followUpsDue: followUpsCount,
          trialOrders: trialOrdersCount,
          confirmedOrders: confirmedOrdersCount,
          lostLeads: Object.values(lostReasons).reduce((a, b) => a + b, 0),
        },
        pipelineStages,
        lostReasonsDistribution: Object.entries(lostReasons).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Sales Pipeline error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate sales pipeline', error: error.message });
  }
};

/* =========================================================================
   7. CONVERSION ANALYTICS
   ========================================================================= */

exports.get_conversion_analytics = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, website } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const [visits, enquiries, quotes, orders, campaigns] = await Promise.all([
      UtmVisit.find(buildVisitFilter(buildDateMatch('created_at', currentStart, currentEnd), website)).lean().catch(() => []),
      EpcLead.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcQuote.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcOrder.find({ ...buildDateMatch('created_at', currentStart, currentEnd), order_status: { $ne: 'cancelled' } }).lean().catch(() => []),
      MarketingCampaign.find({}).lean().catch(() => []),
    ]);

    const rawVisitors = new Set(visits.map(v => v.visitor_id || v.visitor_session_id || v.ip_address).filter(Boolean)).size || visits.length;
    const totalEnquiries = enquiries.length;
    // Eliminate division-by-zero anomaly when web telemetry collection is awaiting live visits:
    const uniqueVisitors = rawVisitors > 0 ? rawVisitors : totalEnquiries;

    const qualifiedLeads = enquiries.filter(l => ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;
    const totalQuotations = quotes.length;

    // Active orders in pipeline (placed from quotations / enquiries)
    const pipelineOrders = orders.filter(o => o.order_status !== 'cancelled');
    const totalOrdersPlaced = pipelineOrders.length;
    const confirmedOrders = orders.filter(o => ['confirmed', 'processing', 'dispatched', 'delivered'].includes(o.order_status)).length;

    // Campaign attributed orders
    const campaignLeads = campaigns.reduce((sum, c) => sum + (c.stats?.form_submissions || 0), 0);
    const campaignOrders = campaigns.reduce((sum, c) => sum + (c.stats?.conversions || 0), 0);

    // Exact documented conversion ratios:
    const conversionMetrics = [
      {
        id: 'visitor_to_enquiry',
        metric: 'Visitor to Enquiry',
        formula: rawVisitors > 0 ? 'Enquiries ÷ Unique Visitors × 100' : 'Inbound Enquiries (Web Telemetry Setup Pending)',
        ratio: rawVisitors > 0 ? safeRatio(totalEnquiries, rawVisitors) : (totalEnquiries > 0 ? 100 : 0),
        numerator: totalEnquiries,
        denominator: uniqueVisitors,
        unit: '%',
      },
      {
        id: 'enquiry_to_qualified',
        metric: 'Enquiry to Onboarded Lead',
        formula: 'Onboarded Leads ÷ Total Enquiries × 100',
        ratio: safeRatio(qualifiedLeads, totalEnquiries),
        numerator: qualifiedLeads,
        denominator: totalEnquiries,
        unit: '%',
      },
      {
        id: 'qualified_to_quotation',
        metric: 'Onboarded Lead to Quotation',
        formula: 'Quotations Generated ÷ Onboarded Leads × 100',
        ratio: safeRatio(totalQuotations, qualifiedLeads),
        numerator: totalQuotations,
        denominator: qualifiedLeads,
        unit: '%',
      },
      {
        id: 'quotation_to_order',
        metric: 'Quotation to Order',
        formula: 'Orders Placed from Quotations ÷ Quotations × 100',
        ratio: safeRatio(totalOrdersPlaced, totalQuotations),
        numerator: totalOrdersPlaced,
        denominator: totalQuotations,
        unit: '%',
      },
      {
        id: 'lead_to_order',
        metric: 'Lead to Order',
        formula: 'Orders Placed ÷ Total Enquiries × 100',
        ratio: safeRatio(totalOrdersPlaced, totalEnquiries),
        numerator: totalOrdersPlaced,
        denominator: totalEnquiries,
        unit: '%',
      },
      {
        id: 'campaign_conversion',
        metric: 'Campaign Conversion',
        formula: campaignLeads > 0 ? 'Orders Attributed to Campaign ÷ Campaign Leads × 100' : 'No Broadcast Campaigns Active',
        ratio: safeRatio(campaignOrders, campaignLeads),
        numerator: campaignOrders,
        denominator: campaignLeads,
        unit: '%',
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        conversions: conversionMetrics,
        dateRange: { start: currentStart, end: currentEnd },
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Conversion Analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate conversion analytics', error: error.message });
  }
};

/* =========================================================================
   8. KIT POTENTIAL & DEMAND
   ========================================================================= */

exports.get_kit_demand = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, state, district } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const [quotes, orders, configuredKits] = await Promise.all([
      EpcQuote.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcOrder.find({ ...buildDateMatch('created_at', currentStart, currentEnd), order_status: { $ne: 'cancelled' } }).lean().catch(() => []),
      getConfiguredComboKits(),
    ]);

    // Initialize map with authentic configured combo kits from Admin registry
    const demandMap = new Map();
    (configuredKits || []).forEach((k) => {
      const id = k._id.toString();
      const capNum = Number(k.kit_capacity_kw || k.capacity || (k.name.match(/(\d+)\s*(?:kw|k\.w)/i)?.[1]) || 1);
      demandMap.set(id, {
        id,
        kitName: k.name,
        category: k.name,
        capacity: `${capNum} kW`,
        capacityKw: capNum,
        estimatedQty: 0,
        estimatedKw: 0,
        confirmedQty: 0,
        confirmedKw: 0,
        estValuePaise: 0,
      });
    });

    // Aggregate from Quotations
    quotes.forEach((q) => {
      const kitId = q.combo_kit_id ? q.combo_kit_id.toString() : null;
      let target = kitId && demandMap.get(kitId);
      if (!target) {
        const cap = Number(q.kit_capacity_kw || q.total_kw || 1);
        target = Array.from(demandMap.values()).find((k) => k.capacityKw === cap);
      }
      if (target) {
        const qty = Number(q.quantity || 1);
        const kw = Number(q.total_kw || (target.capacityKw * qty));
        target.estimatedQty += qty;
        target.estimatedKw += kw;
        target.estValuePaise += (q.total_amount_paise || 0);
      }
    });

    // Aggregate from Confirmed Orders
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const kitId = item.combo_kit_id ? item.combo_kit_id.toString() : null;
        let target = kitId && demandMap.get(kitId);
        if (!target) {
          const name = (item.item_name || item.name || '').toLowerCase();
          target = Array.from(demandMap.values()).find(
            (k) => name.includes(k.kitName.toLowerCase()) || name.includes(k.capacity.toLowerCase())
          );
        }
        if (target) {
          const qty = Number(item.quantity || 1);
          target.confirmedQty += qty;
          target.confirmedKw += (target.capacityKw * qty);
        }
      });
    });

    const reportRows = Array.from(demandMap.values()).map((d) => ({
      id: d.id,
      kitName: d.kitName,
      category: d.kitName,
      capacity: d.capacity,
      estimatedQuantity: d.estimatedQty,
      estimatedKw: Math.round(d.estimatedKw),
      confirmedQuantity: d.confirmedQty,
      confirmedKw: Math.round(d.confirmedKw),
      estimatedOrderValue: Math.round(d.estValuePaise / 100),
    }));

    const totalEstimatedKw = reportRows.reduce((sum, r) => sum + r.estimatedKw, 0);
    const totalConfirmedKw = reportRows.reduce((sum, r) => sum + r.confirmedKw, 0);
    const pendingKw = Math.max(0, totalEstimatedKw - totalConfirmedKw);

    const totalEstimatedQty = reportRows.reduce((sum, r) => sum + (r.estimatedQuantity || 0), 0);
    const totalConfirmedQty = reportRows.reduce((sum, r) => sum + (r.confirmedQuantity || 0), 0);
    const pendingQty = Math.max(0, totalEstimatedQty - totalConfirmedQty);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalEstimatedDemandQty: totalEstimatedQty,
          confirmedKitDemandQty: totalConfirmedQty,
          pendingKitDemandQty: pendingQty,
          totalEstimatedDemandKw: totalEstimatedKw,
          confirmedKitDemandKw: totalConfirmedKw,
          pendingKitDemandKw: pendingKw,
          totalEstimatedValueInr: reportRows.reduce((sum, r) => sum + r.estimatedOrderValue, 0),
        },
        demandRows: reportRows,
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Kit Demand error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate kit demand', error: error.message });
  }
};

/* =========================================================================
   9. GEOGRAPHY ANALYTICS & MAP METRICS
   ========================================================================= */

exports.get_geography_analytics = async (req, res) => {
  try {
    const { metric = 'revenue' } = req.query;

    const [states, epcs, leads, orders, quotes] = await Promise.all([
      GeoLevel1.find({ is_active: { $ne: false } }).lean().catch(() => []),
      EpcAccount.find({ deleted_at: null }, 'state_name district_name gstin gst_verification_status is_gstin_active').lean().catch(() => []),
      EpcLead.find({}, 'state_name district_name lead_status').lean().catch(() => []),
      EpcOrder.find({ order_status: { $ne: 'cancelled' } }, 'delivery_address grand_total_paise order_load_metrics items').lean().catch(() => []),
      EpcQuote.find({}, 'territory total_kw kit_capacity_kw quantity').lean().catch(() => []),
    ]);

    // Build state-level and district-level aggregator map
    const stateMap = {};

    // 1. Initialize from standard Indian States to ensure full national coverage
    INDIA_STANDARD_STATES.forEach((nm) => {
      stateMap[nm] = {
        state: nm,
        code: nm.slice(0, 2).toUpperCase(),
        visitors: 0,
        enquiries: 0,
        registeredEpcs: 0,
        activeEpcs: 0,
        estimatedDemandKw: 0,
        confirmedOrders: 0,
        revenue: 0,
        districts: {},
      };
    });

    // 2. Overlay any database GeoLevel1 states
    (states || []).forEach((s) => {
      const name = (s.name || s.state_name || '').trim();
      if (!name) return;
      if (!stateMap[name]) {
        stateMap[name] = {
          state: name,
          code: s.code || name.slice(0, 2).toUpperCase(),
          visitors: 0,
          enquiries: 0,
          registeredEpcs: 0,
          activeEpcs: 0,
          estimatedDemandKw: 0,
          confirmedOrders: 0,
          revenue: 0,
          districts: {},
        };
      }
    });

    // Aggregate EPCs
    epcs.forEach(e => {
      const s = normalizeStateName(e.state_name) || 'Other';
      const d = (e.district_name || 'Other').trim();
      if (!stateMap[s]) {
        stateMap[s] = { state: s, code: s.slice(0, 2).toUpperCase(), visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0, districts: {} };
      }
      stateMap[s].registeredEpcs += 1;
      const isVerified = Boolean(
        e.is_gstin_active ||
        (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
        (e.gst_verification_status && e.gst_verification_status !== 'unverified' && e.gst_verification_status.includes('verified'))
      );
      if (isVerified) stateMap[s].activeEpcs += 1;

      if (!stateMap[s].districts[d]) {
        stateMap[s].districts[d] = { district: d, visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0 };
      }
      stateMap[s].districts[d].registeredEpcs += 1;
      if (isVerified) stateMap[s].districts[d].activeEpcs += 1;
    });

    // Aggregate Enquiries
    leads.forEach(l => {
      const s = normalizeStateName(l.state_name) || 'Other';
      const d = (l.district_name || 'Other').trim();
      if (!stateMap[s]) {
        stateMap[s] = { state: s, code: s.slice(0, 2).toUpperCase(), visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0, districts: {} };
      }
      stateMap[s].enquiries += 1;
      if (!stateMap[s].districts[d]) {
        stateMap[s].districts[d] = { district: d, visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0 };
      }
      stateMap[s].districts[d].enquiries += 1;
    });

    // Aggregate Orders & Revenue
    orders.forEach(o => {
      const s = normalizeStateName(o.delivery_address?.state_name) || 'Other';
      const d = (o.delivery_address?.district_name || 'Other').trim();
      const rev = Math.round((o.grand_total_paise || 0) / 100);
      const kw = o.order_load_metrics?.total_kw ||
        (o.items || []).reduce((acc, it) => acc + (it.kit_capacity_kw || it.capacity_kw || 1) * (it.quantity || 1), 0) || 0;

      if (!stateMap[s]) {
        stateMap[s] = { state: s, code: s.slice(0, 2).toUpperCase(), visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0, districts: {} };
      }
      stateMap[s].confirmedOrders += 1;
      stateMap[s].revenue += rev;
      stateMap[s].estimatedDemandKw += kw;

      if (!stateMap[s].districts[d]) {
        stateMap[s].districts[d] = { district: d, visitors: 0, enquiries: 0, registeredEpcs: 0, activeEpcs: 0, estimatedDemandKw: 0, confirmedOrders: 0, revenue: 0 };
      }
      stateMap[s].districts[d].confirmedOrders += 1;
      stateMap[s].districts[d].revenue += rev;
      stateMap[s].districts[d].estimatedDemandKw += kw;
    });

    // Format for GeoJSON Choropleth / Map consumption
    const stateList = Object.values(stateMap).map(st => {
      // High demand low coverage flag: demand > 25 kW and active EPCs < 2
      const isHighDemandLowCoverage = st.estimatedDemandKw >= 25 && st.activeEpcs < 2;
      return {
        ...st,
        isHighDemandLowCoverage,
        districtsCount: Object.keys(st.districts).length,
        districtsList: Object.values(st.districts),
      };
    });

    return res.status(200).json({
      success: true,
      selectedMetric: metric,
      data: stateList,
    });
  } catch (error) {
    console.error('[MainDashboard] Geography Analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate geography analytics', error: error.message });
  }
};

/* =========================================================================
   9B. FRANCHISE CLUSTER GEOGRAPHY ANALYTICS & INTERACTIVE MAP
   ========================================================================= */

exports.get_cluster_geography_analytics = async (req, res) => {
  try {
    const { metric = 'revenue', state, status, bde_id } = req.query;

    const clusterQuery = { deleted_at: null, is_active: true };
    if (state && state !== 'all') {
      clusterQuery.state_name = new RegExp(`^${state.trim()}$`, 'i');
    }
    if (status && status !== 'all') {
      clusterQuery.status = status;
    }
    if (bde_id && bde_id !== 'all') {
      clusterQuery.primary_bde_id = bde_id;
    }

    const [clusters, epcs, leads, orders] = await Promise.all([
      FranchiseeCluster.find(clusterQuery)
        .populate('assigned_franchisee_id', 'business_name company_name name phone store_name')
        .populate('primary_bde_id', 'full_name name employee_id mobile_number')
        .lean()
        .catch(() => []),
      EpcAccount.find({ deleted_at: null }, 'state_name district_name gstin gst_verification_status is_gstin_active created_at').lean().catch(() => []),
      EpcLead.find({}, 'state_name district_name lead_status required_capacity created_at').lean().catch(() => []),
      EpcOrder.find({ order_status: { $ne: 'cancelled' } }, 'delivery_address grand_total_paise order_load_metrics items created_at').lean().catch(() => []),
    ]);

    const clean = (s) => (s || '').toLowerCase().replace(/bhoomi/g, 'bhumi').replace(/[^a-z0-9]/g, '');

    // Lookup index of district -> cluster
    const districtClusterMap = {};
    const clusterSummaries = [];

    // Distinct palette for clusters
    const CLUSTER_COLORS = [
      '#2563eb', '#059669', '#7c3aed', '#ea580c', '#0891b2',
      '#db2777', '#0d9488', '#d97706', '#4f46e5', '#65a30d',
      '#e11d48', '#0284c7'
    ];

    clusters.forEach((c, idx) => {
      const assignedDistricts = c.district_names || [];
      const distCleanSet = new Set(assignedDistricts.map(clean));
      const clusterColor = c.color_code || CLUSTER_COLORS[idx % CLUSTER_COLORS.length];

      let clusterRevenue = 0;
      let clusterOrders = 0;
      let clusterDemandKw = 0;
      let clusterEnquiries = 0;
      let clusterActiveEpcs = 0;
      let clusterRegisteredEpcs = 0;

      // Group metrics by each district in this cluster
      const districtMetrics = {};
      assignedDistricts.forEach((d) => {
        districtMetrics[d] = {
          district: d,
          revenue: 0,
          orders: 0,
          demandKw: 0,
          enquiries: 0,
          activeEpcs: 0,
          registeredEpcs: 0,
        };
      });

      const clusterStateClean = clean(c.state_name);

      // Match Orders (matching district AND state to prevent cross-state collision)
      orders.forEach((o) => {
        const oDist = clean(o.delivery_address?.district_name);
        const oState = clean(o.delivery_address?.state_name);
        const stateMatches = !oState || !clusterStateClean || oState === clusterStateClean;
        if (stateMatches && distCleanSet.has(oDist)) {
          const rev = Math.round((o.grand_total_paise || 0) / 100);
          const kw = o.order_load_metrics?.total_kw ||
            (o.items || []).reduce((acc, it) => acc + (it.kit_capacity_kw || it.capacity_kw || 1) * (it.quantity || 1), 0) || 0;

          clusterRevenue += rev;
          clusterOrders += 1;
          clusterDemandKw += kw;

          // Find exact district
          const matchedDistrict = assignedDistricts.find((d) => clean(d) === oDist);
          if (matchedDistrict && districtMetrics[matchedDistrict]) {
            districtMetrics[matchedDistrict].revenue += rev;
            districtMetrics[matchedDistrict].orders += 1;
            districtMetrics[matchedDistrict].demandKw += kw;
          }
        }
      });

      // Match Leads / Enquiries (matching district AND state)
      leads.forEach((l) => {
        const lDist = clean(l.district_name);
        const lState = clean(l.state_name);
        const stateMatches = !lState || !clusterStateClean || lState === clusterStateClean;
        if (stateMatches && distCleanSet.has(lDist)) {
          clusterEnquiries += 1;
          const matchedDistrict = assignedDistricts.find((d) => clean(d) === lDist);
          if (matchedDistrict && districtMetrics[matchedDistrict]) {
            districtMetrics[matchedDistrict].enquiries += 1;
          }
        }
      });

      // Match EPCs (matching district AND state to prevent cross-state collision)
      epcs.forEach((e) => {
        const eDist = clean(e.district_name);
        const eState = clean(e.state_name);
        const stateMatches = !eState || !clusterStateClean || eState === clusterStateClean;
        if (stateMatches && distCleanSet.has(eDist)) {
          clusterRegisteredEpcs += 1;
          const isVerified = Boolean(
            e.is_gstin_active ||
            (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
            (e.gst_verification_status && e.gst_verification_status !== 'unverified' && e.gst_verification_status.includes('verified'))
          );
          if (isVerified) clusterActiveEpcs += 1;

          const matchedDistrict = assignedDistricts.find((d) => clean(d) === eDist);
          if (matchedDistrict && districtMetrics[matchedDistrict]) {
            districtMetrics[matchedDistrict].registeredEpcs += 1;
            if (isVerified) districtMetrics[matchedDistrict].activeEpcs += 1;
          }
        }
      });

      const franchiseeName =
        c.assigned_franchisee_id?.company_name ||
        c.assigned_franchisee_id?.business_name ||
        c.assigned_franchisee_id?.store_name ||
        (c.status === 'available' ? 'Open for Allocation' : 'Unassigned');

      const bdeName = c.primary_bde_id?.full_name || c.primary_bde_id?.name || 'Not Assigned';
      const bdePhone = c.primary_bde_id?.mobile_number || '';

      const clusterObj = {
        id: String(c._id),
        name: c.cluster_name,
        code: c.cluster_code,
        state: c.state_name,
        districts: assignedDistricts,
        districtsCount: assignedDistricts.length,
        districtMetrics: Object.values(districtMetrics),
        status: c.status || 'available',
        color: clusterColor,
        franchisee: franchiseeName,
        franchiseeId: c.assigned_franchisee_id?._id || null,
        franchiseePhone: c.assigned_franchisee_id?.phone || '',
        bde: bdeName,
        bdeId: c.primary_bde_id?._id || null,
        bdePhone,
        setupFee: c.setup_fee_config?.total_payable || 135000,
        agreementYears: c.setup_fee_config?.agreement_duration_years || 2,
        revenue: clusterRevenue,
        estimatedDemandKw: clusterDemandKw,
        confirmedOrders: clusterOrders,
        enquiries: clusterEnquiries,
        activeEpcs: clusterActiveEpcs,
        registeredEpcs: clusterRegisteredEpcs,
      };

      clusterSummaries.push(clusterObj);

      // Register in districtClusterMap for SVG instant match
      assignedDistricts.forEach((d) => {
        const key = clean(d);
        districtClusterMap[key] = {
          clusterId: String(c._id),
          clusterName: c.cluster_name,
          clusterCode: c.cluster_code,
          clusterState: c.state_name,
          clusterStatus: c.status || 'available',
          clusterColor,
          franchisee: franchiseeName,
          bde: bdeName,
          clusterRevenue,
          clusterDemandKw,
          clusterOrders,
          clusterEnquiries,
          clusterActiveEpcs,
        };
      });
    });

    // Summary calculations
    const summary = {
      totalClusters: clusterSummaries.length,
      allottedClusters: clusterSummaries.filter((c) => c.status === 'allotted').length,
      availableClusters: clusterSummaries.filter((c) => c.status === 'available').length,
      reservedClusters: clusterSummaries.filter((c) => c.status === 'reserved').length,
      totalRevenue: clusterSummaries.reduce((sum, c) => sum + c.revenue, 0),
      totalDemandKw: clusterSummaries.reduce((sum, c) => sum + c.estimatedDemandKw, 0),
      totalOrders: clusterSummaries.reduce((sum, c) => sum + c.confirmedOrders, 0),
      totalEnquiries: clusterSummaries.reduce((sum, c) => sum + c.enquiries, 0),
      totalActiveEpcs: clusterSummaries.reduce((sum, c) => sum + c.activeEpcs, 0),
      totalDistrictsCovered: Object.keys(districtClusterMap).length,
    };

    return res.status(200).json({
      success: true,
      selectedMetric: metric,
      summary,
      clusters: clusterSummaries,
      districtClusterMap,
    });
  } catch (error) {
    console.error('[MainDashboard] Cluster Geography Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate cluster geography analytics',
      error: error.message,
    });
  }
};

/* =========================================================================
   10. REVENUE & MARGIN
   ========================================================================= */

exports.get_revenue_margin = async (req, res) => {
  try {
    const { dateRange, startDate, endDate, state, district } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const match = buildDateMatch('created_at', currentStart, currentEnd);
    if (state && state !== 'all') match['delivery_address.state_name'] = state;
    if (district && district !== 'all') match['delivery_address.district_name'] = district;

    const allOrders = await EpcOrder.find(match).lean().catch(() => []);

    const validOrderStatuses = ['confirmed', 'processing', 'vehicle_assigned', 'ready_for_dispatch', 'dispatched', 'in_transit', 'reached_destination', 'delivered'];
    const activeOrders = allOrders.filter(o => o.order_status !== 'cancelled');
    const confirmedOrders = allOrders.filter(o => validOrderStatuses.includes(o.order_status));
    const cancelledOrders = allOrders.filter(o => o.order_status === 'cancelled');

    // Use confirmed orders when available; otherwise reflect active placed orders awaiting verification
    const effectiveOrders = confirmedOrders.length > 0 ? confirmedOrders : activeOrders;
    const totalEffectiveOrders = effectiveOrders.length;

    // Total Order Value in INR
    const totalOrderValueInr = Math.round(effectiveOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0) / 100);
    const averageOrderSizeInr = totalEffectiveOrders > 0 ? Math.round(totalOrderValueInr / totalEffectiveOrders) : 0;

    // Authentic COGS calculation from product/kit BOM registry
    const configuredKits = await getConfiguredComboKits();
    const kitMap = new Map();
    (configuredKits || []).forEach(k => kitMap.set(k._id.toString(), k));

    let totalCogsInr = 0;
    effectiveOrders.forEach(o => {
      (o.items || []).forEach(item => {
        const qty = item.quantity || 1;
        const matchingKit = item.combo_kit_id ? kitMap.get(item.combo_kit_id.toString()) : null;
        const itemCostPaise = item.cost_price_paise || matchingKit?.bom_cost_paise || matchingKit?.cost_price_paise || 0;
        totalCogsInr += ((itemCostPaise * qty) / 100);
      });
    });
    totalCogsInr = Math.round(totalCogsInr);

    // Gross Margin
    const grossMarginInr = Math.max(0, totalOrderValueInr - totalCogsInr);
    const grossMarginPct = totalOrderValueInr > 0 ? Number(((grossMarginInr / totalOrderValueInr) * 100).toFixed(1)) : 0;

    // Realized Revenue vs Collections
    let realizedRevenueInr = 0;
    effectiveOrders.forEach(o => {
      if (o.offline_payment?.verification_status === 'approved') {
        realizedRevenueInr += (o.offline_payment.amount_paid || Math.round((o.grand_total_paise || 0) / 100));
      }
    });

    const pendingCollectionsInr = Math.max(0, totalOrderValueInr - realizedRevenueInr);

    // Overdue collections calculated strictly from payment milestones exceeding due date
    let overdueCollectionsInr = 0;
    const now = new Date();
    effectiveOrders.forEach(o => {
      const mList = Array.isArray(o.payment_milestones)
        ? o.payment_milestones
        : (o.payment_milestones?.milestones || []);

      mList.forEach(m => {
        if (m.due_date && new Date(m.due_date) < now && m.status !== 'paid' && m.payment_status !== 'paid') {
          overdueCollectionsInr += Math.round((m.amount_paise || (m.amount ? m.amount * 100 : 0)) / 100);
        }
      });
    });

    const cancelledOrderValueInr = Math.round(cancelledOrders.reduce((sum, o) => sum + (o.grand_total_paise || 0), 0) / 100);

    // Revenue by Configured Combo Kit Type
    const kitTypeRevenue = {};
    (configuredKits || []).forEach((k) => {
      kitTypeRevenue[k.name] = 0;
    });

    effectiveOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const kitId = item.combo_kit_id ? item.combo_kit_id.toString() : null;
        const matching = kitId ? kitMap.get(kitId) : null;
        const kitName = matching?.name || item.item_name || item.name || 'Combo Kit';
        const itemRev = Math.round((item.total_price_paise || ((item.unit_price_paise || 0) * (item.quantity || 1))) / 100);
        kitTypeRevenue[kitName] = (kitTypeRevenue[kitName] || 0) + itemRev;
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalOrderValue: totalOrderValueInr,
          averageOrderSize: averageOrderSizeInr,
          grossSales: totalOrderValueInr,
          approvedCogs: totalCogsInr,
          grossMargin: grossMarginInr,
          grossMarginPct,
          realizedRevenue: realizedRevenueInr,
          pendingCollections: pendingCollectionsInr,
          overdueCollections: overdueCollectionsInr,
          totalOrders: totalEffectiveOrders,
          cancelledOrderValue: cancelledOrderValueInr,
        },
        revenueByKitType: Object.entries(kitTypeRevenue).map(([name, value]) => ({ name, value })),
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Revenue & Margin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate revenue and margin', error: error.message });
  }
};

/* =========================================================================
   11. CAMPAIGN PERFORMANCE
   ========================================================================= */

exports.get_campaign_performance = async (req, res) => {
  try {
    const campaigns = await MarketingCampaign.find({}).lean().catch(() => []);

    const campaignList = (campaigns || []).map(c => {
      const stats = c.stats || {};
      const sent = stats.messages_sent || 0;
      const delivered = stats.delivered || 0;
      const read = stats.opened_or_read || 0;
      const clicks = stats.link_clicks || 0;
      const enquiries = stats.form_submissions || 0;
      const qualified = stats.qualified_leads || 0;
      const orders = stats.conversions || 0;
      const revenue = stats.revenue_generated || 0;
      const conversionRate = enquiries > 0 ? ((orders / enquiries) * 100).toFixed(1) : '0.0';

      return {
        id: c._id,
        campaignName: c.campaign_name || 'Solar Promotion',
        campaignType: c.campaign_type || 'both',
        channel: c.campaign_type === 'both' ? 'Email & WhatsApp' : c.campaign_type === 'email' ? 'Email' : 'WhatsApp',
        audience: c.target_audience_filters?.tier || 'All EPCs',
        totalAudience: (c.recipients || []).length || 0,
        eligibleAudience: (c.recipients || []).length || 0,
        sent,
        delivered,
        opened: read,
        clicks,
        enquiries,
        qualifiedLeads: qualified,
        orders,
        revenue,
        conversionRate,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        campaigns: campaignList,
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Campaign Performance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to aggregate campaign performance', error: error.message });
  }
};

/* =========================================================================
   12. IN-PAGE DRILL-DOWN DETAILED RECORDS
   ========================================================================= */

exports.get_drill_down_records = async (req, res) => {
  try {
    const {
      section = 'enquiries',
      kpiId,
      page = 1,
      limit = 20,
      state,
      district,
      website,
      dateRange = 'last_30_days',
      startDate,
      endDate,
    } = req.query;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    let records = [];
    let totalCount = 0;

    if (section === 'website') {
      const q = buildVisitFilter(buildDateMatch('created_at', currentStart, currentEnd), website);
      totalCount = await UtmVisit.countDocuments(q);
      const rawVisits = await UtmVisit.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
      records = rawVisits.map((r) => {
        const siteInfo = resolveVisitSite(r);
        return {
          ...r,
          website_key: r.website_key || siteInfo.website_key,
          site_domain: r.site_domain || siteInfo.site_domain,
          site_label: siteInfo.label,
          traffic_source_label: classifyTrafficSource(r),
          duration_seconds: getSessionDurationSeconds(r),
          page_views: r.page_views || r.visit_count || 1,
        };
      });
    } else if (section === 'enquiries') {
      const q = buildDateMatch('created_at', currentStart, currentEnd);
      if (state && state !== 'all') q.state_name = new RegExp(`^${state.trim()}$`, 'i');
      if (district && district !== 'all') q.district_name = new RegExp(`^${district.trim()}$`, 'i');

      if (kpiId === 'qualified_leads') {
        q.$or = [
          { lead_status: { $in: ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'] } },
          { gst_verified: true },
        ];
      }

      totalCount = await EpcLead.countDocuments(q);
      records = await EpcLead.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
    } else if (section === 'epcs') {
      const q = { deleted_at: null };
      if (state && state !== 'all') q.state_name = new RegExp(`^${state.trim()}$`, 'i');
      if (district && district !== 'all') q.district_name = new RegExp(`^${district.trim()}$`, 'i');

      const verifiedOrConditions = [
        { is_gstin_active: true },
        { gstin: { $regex: /^.{10,}$/, $ne: 'Pending' } },
        { gst_verification_status: { $regex: /verified/i } },
      ];

      if (kpiId === 'verified_epcs') {
        q.$or = verifiedOrConditions;
      } else if (kpiId === 'active_epcs') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
        q.$and = [
          { $or: verifiedOrConditions },
          {
            $or: [
              { last_activity_at: { $gte: thirtyDaysAgo } },
              { behavior_status: { $in: ['active', 'loyal_repeat'] } },
            ],
          },
        ];
      }

      totalCount = await EpcAccount.countDocuments(q);
      const rawRecords = await EpcAccount.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      records = rawRecords.map((e) => {
        const isVerified = Boolean(
          e.is_gstin_active ||
          (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
          e.gst_verification_status === 'verified'
        );
        const isActive = Boolean(
          e.behavior_status === 'active' ||
          e.behavior_status === 'loyal_repeat' ||
          e.is_active ||
          (e.last_activity_at && new Date(e.last_activity_at) >= new Date(Date.now() - 30 * 86400000))
        );
        return {
          ...e,
          is_verified: isVerified,
          is_behavior_active: isActive,
          verification_label: isVerified ? 'GST Verified' : 'Pending Verification',
          behavior_status: isActive ? 'active' : 'inactive',
        };
      });
    } else if (section === 'pipeline' || section === 'leads' || kpiId === 'total_sales_leads') {
      const q = buildDateMatch('created_at', currentStart, currentEnd);
      if (state && state !== 'all') q.state_name = new RegExp(`^${state.trim()}$`, 'i');
      if (district && district !== 'all') q.district_name = new RegExp(`^${district.trim()}$`, 'i');

      const [bdeCount, epcCount] = await Promise.all([
        BDELead.countDocuments(q),
        EpcLead.countDocuments(q),
      ]);
      totalCount = bdeCount + epcCount;

      const [rawBde, rawEpc] = await Promise.all([
        BDELead.find(q).sort({ created_at: -1 }).lean(),
        EpcLead.find(q).sort({ created_at: -1 }).lean(),
      ]);

      const formattedBde = rawBde.map((l) => ({
        ...l,
        lead_type: 'BDE Sales Lead',
        contact_name: l.prospect_name || l.company_name || 'Prospect',
        company_name: l.company_name || l.prospect_name || 'N/A',
        lead_source: l.lead_source || 'direct_visit',
        status_label: l.lead_status || 'new_lead',
      }));

      const formattedEpc = rawEpc.map((l) => ({
        ...l,
        lead_type: 'Inbound Enquiry',
        contact_name: l.contact_person || l.name || l.company_name || 'Enquiry',
        company_name: l.company_name || l.name || 'N/A',
        lead_source: l.lead_source || 'website',
        status_label: l.lead_status || 'New',
      }));

      const combined = [...formattedBde, ...formattedEpc].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      records = combined.slice(skip, skip + Number(limit));
    } else if (section === 'revenue' || section === 'orders') {
      const q = buildDateMatch('created_at', currentStart, currentEnd);
      if (state && state !== 'all') q['delivery_address.state_name'] = new RegExp(`^${state.trim()}$`, 'i');
      if (district && district !== 'all') q['delivery_address.district_name'] = new RegExp(`^${district.trim()}$`, 'i');

      const validOrderStatuses = ['confirmed', 'processing', 'vehicle_assigned', 'ready_for_dispatch', 'dispatched', 'in_transit', 'reached_destination', 'delivered'];
      const confirmedCount = await EpcOrder.countDocuments({ ...q, order_status: { $in: validOrderStatuses } });

      if (kpiId === 'confirmed_orders' && confirmedCount > 0) {
        q.order_status = { $in: validOrderStatuses };
      } else {
        q.order_status = { $ne: 'cancelled' };
      }

      totalCount = await EpcOrder.countDocuments(q);
      records = await EpcOrder.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
    } else if (section === 'quotes' || section === 'demand' || kpiId === 'total_quotations' || kpiId === 'estimated_kit_demand') {
      const q = buildDateMatch('created_at', currentStart, currentEnd);
      if (state && state !== 'all') q['territory.state_name'] = new RegExp(`^${state.trim()}$`, 'i');
      if (district && district !== 'all') q['territory.district_name'] = new RegExp(`^${district.trim()}$`, 'i');

      totalCount = await EpcQuote.countDocuments(q);
      const rawQuotes = await EpcQuote.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      records = rawQuotes.map((q) => ({
        ...q,
        customer_name: q.epc_snapshot?.company_name || q.epc_snapshot?.contact_person || 'EPC Contractor',
        location: `${q.territory?.state_name || q.epc_snapshot?.state_name || 'N/A'}${q.territory?.district_name ? `, ${q.territory.district_name}` : ''}`,
        capacity_display: `${q.kit_capacity_kw || q.total_kw || 1} kW`,
        total_amount: Math.round((q.total_amount_paise || 0) / 100),
      }));
    }

    return res.status(200).json({
      success: true,
      section,
      kpiId: kpiId || null,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit)),
      records,
    });
  } catch (error) {
    console.error('[MainDashboard] Drill-down records error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch drill-down records', error: error.message });
  }
};

/* =========================================================================
   13. INSIGHTS & SUGGESTIVE AI
   ========================================================================= */

exports.get_insights_ai = async (req, res) => {
  try {
    const { state, district, dateRange, startDate, endDate, minEpcs, epcBenchmark } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);
    const benchmarkThreshold = Math.max(1, Number(minEpcs || epcBenchmark) || 50);

    // 1. Fetch Clusters based on optional state filter
    const clusterQuery = { deleted_at: null, is_active: true };
    if (state && state !== 'all') {
      clusterQuery.state_name = new RegExp(`^${state.trim()}$`, 'i');
    }

    const [
      clusters,
      allEpcs,
      clusterGoals,
      orders,
      quotes,
      leads,
      websiteLeads,
      configuredKits,
    ] = await Promise.all([
      FranchiseeCluster.find(clusterQuery)
        .populate('assigned_franchisee_id', 'business_name company_name name phone store_name email reseller_lifecycle_status store_category')
        .populate('primary_bde_id', 'full_name name employee_id mobile_number')
        .lean()
        .catch(() => []),
      EpcAccount.find({ deleted_at: null }, 'state_name district_name gstin gst_verification_status is_gstin_active last_activity_at created_at company_name name status onboarded_by_reseller_id primary_reseller_id').lean().catch(() => []),
      FranchiseeClusterGoal.find({ deleted_at: null }).lean().catch(() => []),
      EpcOrder.find({ order_status: { $ne: 'cancelled' } }, 'delivery_address grand_total_paise order_load_metrics items created_at epc_id order_number').lean().catch(() => []),
      EpcQuote.find({ status: { $nin: ['cancelled', 'lost', 'expired', 'converted'] } }, 'territory kit_capacity_kw total_kw quantity total_amount_paise combo_kit_id created_at status combo_kit_snapshot quote_number items').lean().catch(() => []),
      EpcLead.find({}, 'state_name district_name interested_products required_capacity lead_status created_at').lean().catch(() => []),
      WebsiteEpcLead.find({}, 'state_name district_name created_at').lean().catch(() => []),
      getConfiguredComboKits(),
    ]);

    const clean = (s) => (s || '').toLowerCase().replace(/bhoomi/g, 'bhumi').replace(/[^a-z0-9]/g, '');

    // Map of orders by EPC id for quick activity check
    const epcOrdersMap = new Map();
    orders.forEach((o) => {
      const eid = o.epc_id?.toString();
      if (!eid) return;
      epcOrdersMap.set(eid, (epcOrdersMap.get(eid) || 0) + 1);
    });

    const isEpcVerified = (e) => Boolean(
      e.status === 'approved' ||
      e.status === 'active' ||
      e.is_gstin_active ||
      (e.gstin && e.gstin.length >= 10 && e.gstin !== 'Pending') ||
      (e.gst_verification_status && e.gst_verification_status !== 'unverified' && e.gst_verification_status.includes('verified'))
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const isEpcActive = (e) => Boolean(
      e.status === 'approved' ||
      e.status === 'active' ||
      e.is_gstin_active ||
      (e.last_activity_at && new Date(e.last_activity_at) >= thirtyDaysAgo) ||
      epcOrdersMap.has(e._id.toString())
    );

    // Index goals by cluster_id
    const goalsByCluster = new Map();
    clusterGoals.forEach((g) => {
      if (g.cluster_id) goalsByCluster.set(g.cluster_id.toString(), g);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION B: Cluster & Franchisee Potential Analysis
    // ─────────────────────────────────────────────────────────────────────────
    const clusterPotentialList = [];
    const campaignSuggestionsList = [];
    const threeMonthGoalsList = [];

    let newFranchiseeOppCount = 0;
    let campaignSuggestionsCount = 0;
    let threeMonthGoalsInProgressCount = 0;

    const now = new Date();

    for (const c of clusters) {
      const assignedDistricts = c.district_names || [];
      const distCleanSet = new Set(assignedDistricts.map(clean));
      const clusterStateClean = clean(c.state_name);
      const hasFranchisee = Boolean(c.status === 'allotted' && c.assigned_franchisee_id);
      const franchiseeId = c.assigned_franchisee_id ? String(c.assigned_franchisee_id._id || c.assigned_franchisee_id) : null;
      const franchiseeName = hasFranchisee
        ? (c.assigned_franchisee_id.business_name || c.assigned_franchisee_id.company_name || c.assigned_franchisee_id.name || 'Allotted Franchisee')
        : 'Not Available';
      const storeName = hasFranchisee
        ? (c.assigned_franchisee_id.store_name || `${c.cluster_name} Store`)
        : 'N/A';

      // Match EPCs in this cluster territory
      const territoryEpcs = allEpcs.filter((e) => {
        const eDist = clean(e.district_name);
        const eState = clean(e.state_name);
        const stateMatches = !eState || !clusterStateClean || eState === clusterStateClean;
        return Boolean(stateMatches && distCleanSet.has(eDist));
      });

      // Match EPCs attributed to the franchisee (onboarded by or assigned to store)
      const franchiseeEpcs = franchiseeId ? allEpcs.filter((e) => (
        (e.onboarded_by_reseller_id && String(e.onboarded_by_reseller_id) === franchiseeId) ||
        (e.primary_reseller_id && String(e.primary_reseller_id) === franchiseeId)
      )) : [];

      // For allotted cluster, evaluate the franchisee's actual buyer network;
      // for unallotted clusters, evaluate territory EPCs
      const clusterEpcs = (hasFranchisee && franchiseeEpcs.length > 0) ? franchiseeEpcs : territoryEpcs;

      const registeredEpcs = clusterEpcs.length;
      const verifiedEpcs = clusterEpcs.filter(isEpcVerified).length;
      const activeEpcs = clusterEpcs.filter(isEpcActive).length;

      // Match Leads & Enquiries in this cluster
      const clusterLeads = leads.filter((l) => {
        const lDist = clean(l.district_name);
        const lState = clean(l.state_name);
        const stateMatches = !lState || !clusterStateClean || lState === clusterStateClean;
        return stateMatches && distCleanSet.has(lDist);
      });
      const clusterWebLeads = websiteLeads.filter((w) => {
        const wDist = clean(w.district_name);
        const wState = clean(w.state_name);
        const stateMatches = !wState || !clusterStateClean || wState === clusterStateClean;
        return stateMatches && distCleanSet.has(wDist);
      });

      // MIS EPC Potential: Total recorded prospective contractors in the territory
      const misPotential = clusterLeads.length + clusterWebLeads.length + territoryEpcs.length;

      const clusterGoal = goalsByCluster.get(c._id.toString());
      const epcTarget = clusterGoal?.annual_epc_goal || benchmarkThreshold; // Approved benchmark
      const epcAchievement = activeEpcs;
      const epcGap = Math.max(0, epcTarget - epcAchievement);
      const achievementPct = epcTarget > 0 ? Math.min(100, Math.round((epcAchievement / epcTarget) * 100)) : 0;

      let conditionType = '';
      let suggestedAction = '';
      let actionBadge = '';

      if (!hasFranchisee) {
        // Condition 1: Franchisee Not Available
        if (misPotential >= benchmarkThreshold || registeredEpcs >= benchmarkThreshold) {
          conditionType = 'NEW_OPPORTUNITY';
          actionBadge = 'New Franchisee Opportunity';
          suggestedAction = `New Franchisee Opportunity: Cluster has reached the ${benchmarkThreshold} EPC benchmark (${registeredEpcs} registered, ${misPotential} prospective). No franchisee is currently assigned. Consider opening a new franchisee in this cluster.`;
          newFranchiseeOppCount += 1;

          // Dispatch deduplicated Admin Alert
          sendDeduplicatedAdminAlert({
            title: `New Franchisee Opportunity: ${c.cluster_name}`,
            message: `Cluster ${c.cluster_name} (${c.state_name}) has achieved the ${benchmarkThreshold} EPC potential benchmark (${misPotential} potential EPCs). No franchisee is currently assigned.`,
            category: 'epc',
            priority: 'high',
            action_url: '/admin-panel/home',
            metadata: {
              alert_type: 'new_franchisee_opportunity',
              cluster_id: String(c._id),
              cluster_name: c.cluster_name,
              state_name: c.state_name,
              potential_epcs: misPotential,
              benchmark: benchmarkThreshold,
            },
          }).catch(() => { });
        } else {
          conditionType = 'BUILDING_PIPELINE';
          actionBadge = 'Pipeline Building';
          suggestedAction = `Market Under Development: EPC potential (${misPotential}/${benchmarkThreshold}) is growing towards franchisee viability benchmark.`;
        }
      } else {
        // Franchisee already exists
        if (activeEpcs >= epcTarget) {
          // Condition 3: Target Already Achieved
          conditionType = 'TARGET_ACHIEVED';
          actionBadge = 'Target Achieved';
          suggestedAction = `Target Achieved: Existing franchisee has achieved the approved active EPC target (${activeEpcs}/${epcTarget} Active EPCs).`;
        } else {
          // Condition 2: Target Pending -> Recommend META Campaign
          conditionType = 'CAMPAIGN_REQUIRED';
          actionBadge = 'META Campaign Recommended';
          suggestedAction = `META Campaign Recommended: Active EPC target gap of ${epcGap} EPCs. Recommend acquiring new EPC registrations for franchisee store ${storeName}.`;
          campaignSuggestionsCount += 1;

          // Dispatch deduplicated Admin Alert if significant gap exists
          if (epcGap >= 5) {
            sendDeduplicatedAdminAlert({
              title: `EPC Acquisition Required: ${c.cluster_name}`,
              message: `Franchisee ${franchiseeName} in ${c.cluster_name} has an active EPC target gap of ${epcGap} EPCs (${activeEpcs}/${epcTarget}). META campaign recommended.`,
              category: 'epc',
              priority: 'normal',
              action_url: '/admin-panel/home',
              metadata: {
                alert_type: 'franchisee_epc_acquisition',
                cluster_id: String(c._id),
                franchisee_id: String(c.assigned_franchisee_id._id),
                gap: epcGap,
              },
            }).catch(() => { });
          }
        }
      }

      clusterPotentialList.push({
        id: String(c._id),
        cluster: c.cluster_name,
        clusterCode: c.cluster_code,
        state: c.state_name,
        districts: assignedDistricts,
        misPotential,
        registeredEpcs,
        verifiedEpcs,
        activeEpcs,
        franchiseeAvailability: hasFranchisee ? 'Available' : 'Not Available',
        franchiseeName,
        storeName,
        epcTarget,
        epcAchievement,
        epcGap,
        achievementPct,
        conditionType,
        actionBadge,
        suggestedAction,
      });

      // SECTION C: EPC Growth & META Campaign Suggestions Row
      if (hasFranchisee && conditionType === 'CAMPAIGN_REQUIRED') {
        campaignSuggestionsList.push({
          id: String(c._id),
          cluster: c.cluster_name,
          state: c.state_name,
          franchisee: franchiseeName,
          franchiseeId: String(c.assigned_franchisee_id._id),
          store: storeName,
          registeredEpcs,
          verifiedEpcs,
          activeEpcs,
          activeEpcTarget: epcTarget,
          remainingEpcTarget: epcGap,
          targetDuration: '3 Months',
          suggestedCampaign: 'META Campaign (EPC Acquisition)',
          campaignObjective: 'New EPC registrations for the franchisee store',
          recommendation: `Launch targeted META Lead Generation campaigns focused on electrical contractors and solar installers in ${assignedDistricts.slice(0, 3).join(', ')} to bridge the ${epcGap} active EPC gap for ${storeName}.`,
        });
      }

      // SECTION D: Three-Month Active EPC Goal Tracking Row
      if (hasFranchisee) {
        threeMonthGoalsInProgressCount += 1;

        // Determine Goal Start Date:
        // Use clusterGoal created_at, or if the franchisee onboarded EPCs in the current cycle prior to goal record creation,
        // anchor the 90-day goal window to the earliest onboarding date so Month 1 reflects their active onboarding work.
        let goalStartDate = clusterGoal?.created_at ? new Date(clusterGoal.created_at) : null;

        // Find earliest EPC creation date among cluster EPCs
        let earliestEpcDate = null;
        clusterEpcs.forEach((e) => {
          if (e.created_at) {
            const d = new Date(e.created_at);
            if (!isNaN(d.getTime())) {
              if (!earliestEpcDate || d < earliestEpcDate) {
                earliestEpcDate = d;
              }
            }
          }
        });

        if (!goalStartDate || isNaN(goalStartDate.getTime())) {
          if (earliestEpcDate) {
            goalStartDate = earliestEpcDate;
          } else {
            const qMonth = Math.floor(now.getMonth() / 3) * 3;
            goalStartDate = new Date(now.getFullYear(), qMonth, 1);
          }
        } else if (earliestEpcDate && earliestEpcDate < goalStartDate) {
          // If EPCs were onboarded within 45 days prior to formal goal setting (e.g. Nov 3 vs Nov 18),
          // anchor the 90-day goal window to the earliest onboarding date so Month 1 reflects their active onboarding work
          const diffDays = (goalStartDate.getTime() - earliestEpcDate.getTime()) / 86400000;
          if (diffDays <= 45) {
            goalStartDate = earliestEpcDate;
          }
        }

        const goalEndDate = new Date(goalStartDate.getTime() + 90 * 86400000); // 90 days / 3 months
        const remainingDays = Math.max(0, Math.ceil((goalEndDate.getTime() - now.getTime()) / 86400000));

        // Evaluate newly registered, verified, activated within goal window
        const newEpcsInGoalPeriod = clusterEpcs.filter((e) => e.created_at && new Date(e.created_at) >= goalStartDate);
        const newlyVerifiedInGoalPeriod = newEpcsInGoalPeriod.filter(isEpcVerified);
        const newlyActivatedInGoalPeriod = newEpcsInGoalPeriod.filter(isEpcActive);

        // Pre-existing starting active EPCs
        const startingActiveEpcs = Math.max(0, activeEpcs - newlyActivatedInGoalPeriod.length);

        // 3-Month breakdown: Month 1 (day 1-30), Month 2 (day 31-60), Month 3 (day 61-90)
        const m1End = new Date(goalStartDate.getTime() + 30 * 86400000);
        const m2End = new Date(goalStartDate.getTime() + 60 * 86400000);

        const m1Epcs = clusterEpcs.filter((e) => e.created_at && new Date(e.created_at) >= goalStartDate && new Date(e.created_at) < m1End);
        const m2Epcs = clusterEpcs.filter((e) => e.created_at && new Date(e.created_at) >= m1End && new Date(e.created_at) < m2End);
        const m3Epcs = clusterEpcs.filter((e) => e.created_at && new Date(e.created_at) >= m2End && new Date(e.created_at) <= goalEndDate);

        // Deadline breach alert trigger
        if (remainingDays === 0 && activeEpcs < epcTarget) {
          sendDeduplicatedAdminAlert({
            title: `3-Month EPC Goal Deadline Breached: ${c.cluster_name}`,
            message: `Franchisee ${franchiseeName} achieved ${activeEpcs}/${epcTarget} active EPCs within the 90-day goal timeframe. Remaining gap: ${epcGap} EPCs.`,
            category: 'epc',
            priority: 'urgent',
            action_url: '/admin-panel/home',
            metadata: {
              alert_type: 'epc_goal_deadline_breached',
              cluster_id: String(c._id),
            },
          }).catch(() => { });
        }

        threeMonthGoalsList.push({
          id: String(c._id),
          franchisee: franchiseeName,
          franchiseeId: String(c.assigned_franchisee_id._id),
          cluster: c.cluster_name,
          state: c.state_name,
          activeEpcTarget: epcTarget,
          startingActiveEpcs,
          currentActiveEpcs: activeEpcs,
          newEpcRegistrations: newEpcsInGoalPeriod.length,
          newlyVerifiedEpcs: newlyVerifiedInGoalPeriod.length,
          newlyActivatedEpcs: newlyActivatedInGoalPeriod.length,
          remainingEpcTarget: epcGap,
          achievementPercentage: achievementPct,
          goalStartDate: goalStartDate.toISOString().slice(0, 10),
          goalEndDate: goalEndDate.toISOString().slice(0, 10),
          remainingDays,
          isOverdue: remainingDays === 0 && activeEpcs < epcTarget,
          isAchieved: activeEpcs >= epcTarget,
          monthlyProgress: [
            {
              monthLabel: 'Month 1',
              dayRange: 'Days 1-30',
              registrations: m1Epcs.length,
              verifications: m1Epcs.filter(isEpcVerified).length,
              activations: m1Epcs.filter(isEpcActive).length,
            },
            {
              monthLabel: 'Month 2',
              dayRange: 'Days 31-60',
              registrations: m2Epcs.length,
              verifications: m2Epcs.filter(isEpcVerified).length,
              activations: m2Epcs.filter(isEpcActive).length,
            },
            {
              monthLabel: 'Month 3',
              dayRange: 'Days 61-90',
              registrations: m3Epcs.length,
              verifications: m3Epcs.filter(isEpcVerified).length,
              activations: m3Epcs.filter(isEpcActive).length,
            },
          ],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION E: Kit Sales Potential & Ranking
    // ─────────────────────────────────────────────────────────────────────────

    // Build combo kit registry map
    const kitCatalogMap = new Map();
    (configuredKits || []).forEach((k) => {
      const id = k._id.toString();
      const capNum = Number(k.kit_capacity_kw || k.capacity || (k.name.match(/(\d+)\s*(?:kw|k\.w)/i)?.[1]) || 1);
      const sku = k.sku || k.kit_code || `SK-KIT-${capNum}KW`;
      kitCatalogMap.set(id, {
        id,
        kitName: k.name,
        kitType: k.kit_type || 'Combo Kit',
        capacity: `${capNum} kW`,
        capacityKw: capNum,
        sku,
      });
    });

    // Helper: find matched cluster for an address
    const getClusterForLocation = (districtName, stateName) => {
      const dClean = clean(districtName);
      const sClean = clean(stateName);
      if (!dClean) return null;
      return clusters.find((c) => {
        const clusterState = clean(c.state_name);
        const stateMatches = !sClean || !clusterState || sClean === clusterState;
        return stateMatches && (c.district_names || []).some((dn) => clean(dn) === dClean);
      });
    };

    // Helper: match kit catalog item from order item or quote
    const matchCatalogKit = (comboKitId, itemName, capKw) => {
      if (comboKitId && kitCatalogMap.has(comboKitId.toString())) {
        return kitCatalogMap.get(comboKitId.toString());
      }
      if (itemName) {
        const lower = itemName.toLowerCase();
        for (const k of kitCatalogMap.values()) {
          if (lower.includes(k.kitName.toLowerCase())) return k;
        }
      }
      if (capKw) {
        const num = Number(capKw);
        for (const k of kitCatalogMap.values()) {
          if (k.capacityKw === num) return k;
        }
      }
      // Fallback virtual kit descriptor
      const fallbackCap = Number(capKw || 1);
      return {
        id: `virtual-${fallbackCap}kw`,
        kitName: itemName || `${fallbackCap} kW Solar Kit`,
        kitType: 'Combo Kit',
        capacity: `${fallbackCap} kW`,
        capacityKw: fallbackCap,
        sku: `SK-KIT-${fallbackCap}KW`,
      };
    };

    // Group Active Sales (Cluster x Kit) and (State x Kit)
    const clusterActiveSales = new Map();
    const stateActiveSales = new Map();

    orders.forEach((o) => {
      const oState = o.delivery_address?.state_name || 'Regional';
      const oDist = o.delivery_address?.district_name || '';
      const matchedCluster = getClusterForLocation(oDist, oState);
      const clusterId = matchedCluster ? String(matchedCluster._id) : `unassigned-${clean(oState)}`;
      const clusterName = matchedCluster ? matchedCluster.cluster_name : `${oState} Regional`;

      (o.items || []).forEach((it) => {
        const cap = Number(it.kit_capacity_kw || it.capacity_kw || (it.capacity ? String(it.capacity).match(/(\d+)/)?.[1] : 1) || 1);
        const kit = matchCatalogKit(it.kit_id || it.combo_kit_id, it.item_name || it.name, cap);
        const qty = Number(it.quantity || 1);
        const kw = Number(it.quantity ? qty * kit.capacityKw : 1);
        const val = Math.round((it.total_price_paise || o.grand_total_paise || 0) / 100);

        // Cluster bucket
        const cKey = `${clusterId}::${kit.id}`;
        if (!clusterActiveSales.has(cKey)) {
          clusterActiveSales.set(cKey, {
            clusterId,
            cluster: clusterName,
            state: oState,
            kitName: kit.kitName,
            kitType: kit.kitType,
            capacity: kit.capacity,
            capacityKw: kit.capacityKw,
            sku: kit.sku,
            confirmedOrders: 0,
            confirmedQuantity: 0,
            confirmedKw: 0,
            confirmedOrderValue: 0,
          });
        }
        const cEntry = clusterActiveSales.get(cKey);
        cEntry.confirmedOrders += 1;
        cEntry.confirmedQuantity += qty;
        cEntry.confirmedKw += kw;
        cEntry.confirmedOrderValue += val;

        // State bucket
        const sKey = `${oState}::${kit.id}`;
        if (!stateActiveSales.has(sKey)) {
          stateActiveSales.set(sKey, {
            state: oState,
            kitName: kit.kitName,
            kitType: kit.kitType,
            capacity: kit.capacity,
            capacityKw: kit.capacityKw,
            sku: kit.sku,
            confirmedOrders: 0,
            confirmedQuantity: 0,
            confirmedKw: 0,
            confirmedOrderValue: 0,
          });
        }
        const sEntry = stateActiveSales.get(sKey);
        sEntry.confirmedOrders += 1;
        sEntry.confirmedQuantity += qty;
        sEntry.confirmedKw += kw;
        sEntry.confirmedOrderValue += val;
      });
    });

    // Group Potential Demand (Cluster x Kit) and (State x Kit)
    const clusterPotentialDemand = new Map();
    const statePotentialDemand = new Map();

    quotes.forEach((q) => {
      const qState = q.territory?.state_name || 'Regional';
      const qDist = q.territory?.district_name || '';
      const matchedCluster = getClusterForLocation(qDist, qState);
      const clusterId = matchedCluster ? String(matchedCluster._id) : `unassigned-${clean(qState)}`;
      const clusterName = matchedCluster ? matchedCluster.cluster_name : `${qState} Regional`;

      const cap = Number(q.kit_capacity_kw || q.total_kw || 1);
      const kit = matchCatalogKit(q.combo_kit_id, q.combo_kit_snapshot?.name, cap);
      const qty = Number(q.quantity || 1);
      const kw = Number(q.total_kw || (qty * kit.capacityKw));
      const val = Math.round((q.total_amount_paise || 0) / 100);

      // Cluster bucket
      const cKey = `${clusterId}::${kit.id}`;
      if (!clusterPotentialDemand.has(cKey)) {
        clusterPotentialDemand.set(cKey, {
          clusterId,
          cluster: clusterName,
          state: qState,
          kitName: kit.kitName,
          kitType: kit.kitType,
          capacity: kit.capacity,
          capacityKw: kit.capacityKw,
          sku: kit.sku,
          enquiryCount: 0,
          quotationCount: 0,
          estimatedKitDemand: 0,
          pendingKitDemand: 0,
          estimatedDemandKw: 0,
          potentialOrderValue: 0,
        });
      }
      const cEntry = clusterPotentialDemand.get(cKey);
      cEntry.quotationCount += 1;
      cEntry.estimatedKitDemand += qty;
      cEntry.estimatedDemandKw += kw;
      cEntry.potentialOrderValue += val;

      // State bucket
      const sKey = `${qState}::${kit.id}`;
      if (!statePotentialDemand.has(sKey)) {
        statePotentialDemand.set(sKey, {
          state: qState,
          kitName: kit.kitName,
          kitType: kit.kitType,
          capacity: kit.capacity,
          capacityKw: kit.capacityKw,
          sku: kit.sku,
          enquiryCount: 0,
          quotationCount: 0,
          estimatedKitDemand: 0,
          pendingKitDemand: 0,
          estimatedDemandKw: 0,
          potentialOrderValue: 0,
        });
      }
      const sEntry = statePotentialDemand.get(sKey);
      sEntry.quotationCount += 1;
      sEntry.estimatedKitDemand += qty;
      sEntry.estimatedDemandKw += kw;
      sEntry.potentialOrderValue += val;
    });

    // Attribute recorded lead enquiries to kit demand
    leads.forEach((l) => {
      const lState = l.state_name || 'Regional';
      const lDist = l.district_name || '';
      const matchedCluster = getClusterForLocation(lDist, lState);
      const clusterId = matchedCluster ? String(matchedCluster._id) : `unassigned-${clean(lState)}`;
      const clusterName = matchedCluster ? matchedCluster.cluster_name : `${lState} Regional`;

      const cap = Number(l.required_capacity || 1);
      const kit = matchCatalogKit(null, null, cap);

      const cKey = `${clusterId}::${kit.id}`;
      if (clusterPotentialDemand.has(cKey)) {
        clusterPotentialDemand.get(cKey).enquiryCount += 1;
      }
      const sKey = `${lState}::${kit.id}`;
      if (statePotentialDemand.has(sKey)) {
        statePotentialDemand.get(sKey).enquiryCount += 1;
      }
    });

    // Compute Pending Kit Demand = max(Estimated - Confirmed, 0)
    clusterPotentialDemand.forEach((pot, key) => {
      const active = clusterActiveSales.get(key);
      const confirmed = active ? active.confirmedQuantity : 0;
      pot.pendingKitDemand = Math.max(0, pot.estimatedKitDemand - confirmed);
    });
    statePotentialDemand.forEach((pot, key) => {
      const active = stateActiveSales.get(key);
      const confirmed = active ? active.confirmedQuantity : 0;
      pot.pendingKitDemand = Math.max(0, pot.estimatedKitDemand - confirmed);
    });

    // ── Build Cluster-wise Active Kit Rankings ──
    const clusterActiveRows = Array.from(clusterActiveSales.values());
    const clusterActiveGrouped = {};
    clusterActiveRows.forEach((row) => {
      if (!clusterActiveGrouped[row.cluster]) clusterActiveGrouped[row.cluster] = [];
      clusterActiveGrouped[row.cluster].push(row);
    });
    Object.values(clusterActiveGrouped).forEach((list) => {
      list.sort((a, b) => b.confirmedQuantity - a.confirmedQuantity || b.confirmedOrderValue - a.confirmedOrderValue);
      list.forEach((item, idx) => { item.rank = idx + 1; });
    });

    // ── Build Cluster-wise Potential Kit Rankings ──
    const clusterPotentialRows = Array.from(clusterPotentialDemand.values());
    const clusterPotentialGrouped = {};
    clusterPotentialRows.forEach((row) => {
      if (!clusterPotentialGrouped[row.cluster]) clusterPotentialGrouped[row.cluster] = [];
      clusterPotentialGrouped[row.cluster].push(row);
    });
    Object.values(clusterPotentialGrouped).forEach((list) => {
      list.sort((a, b) => b.pendingKitDemand - a.pendingKitDemand || b.potentialOrderValue - a.potentialOrderValue);
      list.forEach((item, idx) => { item.rank = idx + 1; });
    });

    // ── Build State-wise Active Kit Rankings ──
    const stateActiveRows = Array.from(stateActiveSales.values());
    const stateActiveGrouped = {};
    stateActiveRows.forEach((row) => {
      if (!stateActiveGrouped[row.state]) stateActiveGrouped[row.state] = [];
      stateActiveGrouped[row.state].push(row);
    });
    Object.values(stateActiveGrouped).forEach((list) => {
      list.sort((a, b) => b.confirmedQuantity - a.confirmedQuantity || b.confirmedOrderValue - a.confirmedOrderValue);
      list.forEach((item, idx) => { item.rank = idx + 1; });
    });

    // ── Build State-wise Potential Kit Rankings ──
    const statePotentialRows = Array.from(statePotentialDemand.values());
    const statePotentialGrouped = {};
    statePotentialRows.forEach((row) => {
      if (!statePotentialGrouped[row.state]) statePotentialGrouped[row.state] = [];
      statePotentialGrouped[row.state].push(row);
    });
    Object.values(statePotentialGrouped).forEach((list) => {
      list.sort((a, b) => b.pendingKitDemand - a.pendingKitDemand || b.potentialOrderValue - a.potentialOrderValue);
      list.forEach((item, idx) => { item.rank = idx + 1; });
    });

    return res.status(200).json({
      success: true,
      data: {
        // Section A: Overview KPI summary badges
        overview: {
          newFranchiseeOpportunities: newFranchiseeOppCount,
          franchiseesRequiringCampaigns: campaignSuggestionsCount,
          activeGoalsInProgress: threeMonthGoalsInProgressCount,
          activeKitsCount: new Set(clusterActiveRows.map((r) => r.kitName)).size,
          potentialKitsCount: new Set(clusterPotentialRows.map((r) => r.kitName)).size,
          benchmarkThreshold,
        },
        // Section B: Cluster & Franchisee Potential Analysis Table
        clusterPotential: clusterPotentialList,
        // Section C: EPC Growth & META Campaign Suggestions
        campaignSuggestions: campaignSuggestionsList,
        // Section D: Three-Month Active EPC Goal Tracking
        threeMonthGoals: threeMonthGoalsList,
        // Section E: Kit Sales Potential & Rankings
        kitRankings: {
          clusterActive: clusterActiveRows.sort((a, b) => a.cluster.localeCompare(b.cluster) || a.rank - b.rank),
          clusterPotential: clusterPotentialRows.sort((a, b) => a.cluster.localeCompare(b.cluster) || a.rank - b.rank),
          stateActive: stateActiveRows.sort((a, b) => a.state.localeCompare(b.state) || a.rank - b.rank),
          statePotential: statePotentialRows.sort((a, b) => a.state.localeCompare(b.state) || a.rank - b.rank),
        },
      },
    });
  } catch (error) {
    console.error('[MainDashboard] Insights & Suggestive AI aggregation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate Insights & Suggestive AI data',
      error: error.message,
    });
  }
};
