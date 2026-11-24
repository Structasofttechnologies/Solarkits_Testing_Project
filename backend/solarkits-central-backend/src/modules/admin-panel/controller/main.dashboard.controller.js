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
} = require('../models/india_solarshop_db');

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
    const { dateRange, startDate, endDate, state, district } = req.query;
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
      UtmVisit.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      UtmVisit.find(buildDateMatch('created_at', prevStart, prevEnd)).lean().catch(() => []),

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

    const currUniqueVisitors = new Set(currVisits.map(v => v.visitor_session_id || v.ip_address).filter(Boolean)).size || currTotalVisitors;
    const prevUniqueVisitors = new Set(prevVisits.map(v => v.visitor_session_id || v.ip_address).filter(Boolean)).size || prevTotalVisitors;

    // 2. Enquiries & Qualified Leads
    const currEnquiries = currLeads.length;
    const prevEnquiries = prevLeads.length;

    const currQualified = currLeads.filter(l => ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;
    const prevQualified = prevLeads.filter(l => ['Interested', 'Follow-up', 'Onboarding Started', 'Onboarded'].includes(l.lead_status) || l.gst_verified).length;

    // 3. EPC Network Metrics
    const registeredEpcsCount = allEpcs.length;
    const verifiedEpcsCount = allEpcs.filter(e => e.gst_verification_status?.includes('verified') || e.is_gstin_active || (e.gstin && e.gstin.length >= 10)).length;

    // Approved definition: Verified EPCs with activity in last 30 days OR at least 1 order
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const activeEpcsCount = allEpcs.filter(e => {
      const isVerified = e.gst_verification_status?.includes('verified') || (e.gstin && e.gstin.length >= 10);
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
    const { dateRange, startDate, endDate } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const visits = await UtmVisit.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []);

    const totalVisitors = visits.length;
    const uniqueSessionMap = new Map();
    const sourceCount = {};
    const landingCount = {};
    const landingEnquiries = {};
    const dailyMap = {};
    let formSubmissions = 0;
    let totalDurationSeconds = 0;
    let durationCount = 0;
    let singleVisitSessions = 0;

    visits.forEach((v) => {
      const sid = v.visitor_session_id || v.ip_address || 'unknown';
      uniqueSessionMap.set(sid, (uniqueSessionMap.get(sid) || 0) + 1);

      // Traffic Source
      const src = (v.utm_source || v.referrer || 'Direct Website').trim().toLowerCase();
      let normalizedSrc = 'Direct Website';
      if (src.includes('google') || src.includes('bing') || src.includes('yahoo')) normalizedSrc = 'Organic Search';
      else if (src.includes('meta') || src.includes('facebook') || src.includes('instagram')) normalizedSrc = 'Meta Ads';
      else if (src.includes('cpc') || src.includes('adwords') || src.includes('paid')) normalizedSrc = 'Paid Ads';
      else if (src.includes('email') || src.includes('newsletter')) normalizedSrc = 'Email Campaign';
      else if (src.includes('whatsapp') || src.includes('wa.me')) normalizedSrc = 'WhatsApp Campaign';
      sourceCount[normalizedSrc] = (sourceCount[normalizedSrc] || 0) + 1;

      // Landing Pages & Enquiries
      const landing = (v.landing_url || '/').split('?')[0];
      landingCount[landing] = (landingCount[landing] || 0) + 1;

      if (v.has_form_submitted || v.lead_id) {
        formSubmissions += 1;
        landingEnquiries[landing] = (landingEnquiries[landing] || 0) + 1;
      }

      // Session Duration & Bounce Rate
      if (v.first_touch_at && v.last_touch_at) {
        const diffSec = Math.max(0, (new Date(v.last_touch_at) - new Date(v.first_touch_at)) / 1000);
        if (diffSec > 0) {
          totalDurationSeconds += diffSec;
          durationCount += 1;
        }
      }
      if ((v.visit_count || 1) <= 1) {
        singleVisitSessions += 1;
      }

      // Daily trend mapping
      if (v.created_at) {
        const dKey = new Date(v.created_at).toISOString().slice(0, 10);
        dailyMap[dKey] = (dailyMap[dKey] || 0) + 1;
      }
    });

    const uniqueVisitors = uniqueSessionMap.size || totalVisitors;
    const returningVisitors = Array.from(uniqueSessionMap.values()).filter(count => count > 1).length;
    const newVisitors = Math.max(0, uniqueVisitors - returningVisitors);

    // Format Sources for Chart
    const trafficSources = Object.entries(sourceCount).map(([name, value]) => ({ name, value }));

    // Top Landing Pages with Authentic Conversion Rate
    const topLandingPages = Object.entries(landingCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([page, count]) => {
        const enq = landingEnquiries[page] || 0;
        return {
          page,
          visits: count,
          enquiries: enq,
          conversionPct: count > 0 ? ((enq / count) * 100).toFixed(1) : '0.0',
        };
      });

    // Authentic Daily Trend Array
    const dailyTrend = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        name: date.slice(5), // 'MM-DD'
        visitors: count,
      }));

    // Authentic Session Metrics
    const avgDurationSec = durationCount > 0 ? Math.round(totalDurationSeconds / durationCount) : 0;
    const avgDurationStr = avgDurationSec > 0 ? `${Math.floor(avgDurationSec / 60)}m ${avgDurationSec % 60}s` : '0m 0s';
    const bounceRatePct = totalVisitors > 0 ? Number(((singleVisitSessions / totalVisitors) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalVisitors,
          uniqueVisitors,
          newVisitors,
          returningVisitors,
          formSubmissions,
          avgSessionDuration: avgDurationStr,
          bounceRate: `${bounceRatePct}%`,
        },
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
    const verifiedEpcs = allEpcs.filter(e => e.gst_verification_status?.includes('verified') || (e.gstin && e.gstin.length >= 10)).length;
    const pendingVerification = allEpcs.filter(e => e.gst_verification_status === 'pending_admin' || (!e.gst_verification_status && !e.gstin)).length;
    const rejectedEpcs = allEpcs.filter(e => e.status === 'rejected' || e.gst_verification_status === 'unverified').length;

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
      return (e.gst_verification_status?.includes('verified') || e.gstin) && (isRecent || epcOrdersMap.has(e._id.toString()));
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
    const { dateRange, startDate, endDate } = req.query;
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    const [visits, enquiries, quotes, orders, campaigns] = await Promise.all([
      UtmVisit.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcLead.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcQuote.find(buildDateMatch('created_at', currentStart, currentEnd)).lean().catch(() => []),
      EpcOrder.find({ ...buildDateMatch('created_at', currentStart, currentEnd), order_status: { $ne: 'cancelled' } }).lean().catch(() => []),
      MarketingCampaign.find({}).lean().catch(() => []),
    ]);

    const rawVisitors = new Set(visits.map(v => v.visitor_session_id || v.ip_address).filter(Boolean)).size || visits.length;
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

    return res.status(200).json({
      success: true,
      data: {
        summary: {
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
      EpcAccount.find({}, 'state_name district_name gstin gst_verification_status').lean().catch(() => []),
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
      const isVerified = e.gst_verification_status?.includes('verified') || (e.gstin && e.gstin.length >= 10);
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
      EpcAccount.find({}, 'state_name district_name gstin gst_verification_status created_at').lean().catch(() => []),
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

      // Match Orders
      orders.forEach((o) => {
        const oDist = clean(o.delivery_address?.district_name);
        if (distCleanSet.has(oDist)) {
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

      // Match Leads / Enquiries
      leads.forEach((l) => {
        const lDist = clean(l.district_name);
        if (distCleanSet.has(lDist)) {
          clusterEnquiries += 1;
          const matchedDistrict = assignedDistricts.find((d) => clean(d) === lDist);
          if (matchedDistrict && districtMetrics[matchedDistrict]) {
            districtMetrics[matchedDistrict].enquiries += 1;
          }
        }
      });

      // Match EPCs
      epcs.forEach((e) => {
        const eDist = clean(e.district_name);
        if (distCleanSet.has(eDist)) {
          clusterRegisteredEpcs += 1;
          const isVerified = e.gst_verification_status?.includes('verified') || (e.gstin && e.gstin.length >= 10);
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
      dateRange = 'last_30_days',
      startDate,
      endDate,
    } = req.query;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { currentStart, currentEnd } = getDateRanges(dateRange, startDate, endDate);

    let records = [];
    let totalCount = 0;

    if (section === 'website') {
      const q = buildDateMatch('created_at', currentStart, currentEnd);
      totalCount = await UtmVisit.countDocuments(q);
      records = await UtmVisit.find(q)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();
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
