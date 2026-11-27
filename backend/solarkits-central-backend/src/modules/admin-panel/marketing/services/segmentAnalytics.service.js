const mongoose = require('mongoose');
const {
  MarketingSegment,
  MarketingSegmentContact,
  MarketingCampaign,
  UtmVisit
} = require('../models');
const {
  EpcAccount,
  EpcOrder,
  FranchiseLead,
  Reseller
} = require('../../models/india_solarshop_db');
const { normalizeEmail, normalizePhone10 } = require('./segmentPromotion.service');
const { cleanGeoToken, cleanStateToken, buildGeoAndClusterResolver } = require('./segmentGeo.service');

const VALID_PURPOSES = ['epc_signup_login', 'franchisee_signup_login', 'kit_sales'];

const PURPOSE_LABELS = {
  epc_signup_login: 'EPC Sign Up & Login',
  franchisee_signup_login: 'Franchisee Sign Up & Login',
  kit_sales: 'Kit Sales'
};

const pct = (num, den) => {
  if (!den || den <= 0) return 0;
  return Number(((num / den) * 100).toFixed(1));
};

const toDateMs = (d) => {
  if (!d) return null;
  const ts = new Date(d).getTime();
  return Number.isFinite(ts) ? ts : null;
};

const parseRangeDate = (raw, endOfDay = false) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay && String(raw).length <= 10) {
    d.setHours(23, 59, 59, 999);
  }
  return d.getTime();
};

const extractOrderKitsCount = (order) => {
  const metricKits = Number(order?.order_load_metrics?.total_kits || 0);
  if (metricKits > 0) return metricKits;
  return (order?.items || []).reduce((acc, item) => acc + (Number(item?.quantity) || 0), 0);
};

const addToIndexMap = (map, key, value) => {
  if (!key) return;
  if (!map.has(key)) map.set(key, value);
};

/**
 * Computes 100% live, database-backed analytics across all Segment Groups,
 * joining uploaded leads with EPC/Franchisee registrations, verifications,
 * orders/revenue, active campaigns, and UTM click/conversion telemetry.
 */
const computeDynamicSegmentAnalytics = async (filters = {}) => {
  const {
    segment_id: filterSegmentId = '',
    purpose: filterPurpose = '',
    state: filterState = '',
    cluster: filterCluster = '',
    district: filterDistrict = '',
    campaign_id: filterCampaignId = '',
    start_date: filterStartDate = '',
    end_date: filterEndDate = ''
  } = filters || {};

  const startMs = parseRangeDate(filterStartDate, false);
  const endMs = parseRangeDate(filterEndDate, true);

  const segmentQuery = { deleted_at: null };
  if (filterSegmentId && mongoose.Types.ObjectId.isValid(filterSegmentId)) {
    segmentQuery._id = new mongoose.Types.ObjectId(filterSegmentId);
  }
  if (filterPurpose && VALID_PURPOSES.includes(filterPurpose)) {
    segmentQuery.purpose = filterPurpose;
  }

  const campaignQuery = {};
  if (filterCampaignId && mongoose.Types.ObjectId.isValid(filterCampaignId)) {
    campaignQuery._id = new mongoose.Types.ObjectId(filterCampaignId);
  }

  const [
    geoResolver,
    segments,
    allCampaigns,
    epcAccounts,
    epcOrders,
    franchiseLeads,
    resellers
  ] = await Promise.all([
    buildGeoAndClusterResolver(),
    MarketingSegment.find(segmentQuery).sort({ created_at: -1 }).lean(),
    MarketingCampaign.find(campaignQuery)
      .select(
        '_id campaign_name campaign_code campaign_type campaign_objective purpose status ' +
        'segment_ids segment_state_filter segment_district_filter start_date end_date created_at ' +
        'total_recipients stats recipients utm_campaign tracking_short_code'
      )
      .sort({ created_at: -1 })
      .lean(),
    EpcAccount.find({ deleted_at: null })
      .select(
        '_id name email whatsapp registered_whatsapp gst_verification_status is_gstin_active ' +
        'gstin gstin_verified_at status state_name district_name states districts created_at'
      )
      .lean(),
    EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
      .select('_id order_number epc_id grand_total_paise order_load_metrics items delivery_address created_at')
      .lean(),
    FranchiseLead
      ? FranchiseLead.find({ deleted_at: null })
          .select('_id full_name email mobile_number whatsapp_number gst_verified gst_verified_at status converted_reseller_id state district cluster_id cluster_name created_at')
          .lean()
      : Promise.resolve([]),
    Reseller
      ? Reseller.find({ deleted_at: null })
          .select('_id business_name email mobile gst_number gst_verified_at kyc_status reseller_lifecycle_status activation_status address created_at')
          .lean()
      : Promise.resolve([])
  ]);

  const segmentIdList = segments.map((s) => s._id);
  const contacts = segmentIdList.length > 0
    ? await MarketingSegmentContact.find({
        segment_id: { $in: segmentIdList },
        is_admin_deleted: { $ne: true },
        $or: [
          { deleted_at: null },
          { promotion_status: 'promoted_to_verified_epc' }
        ]
      })
        .select(
          '_id segment_id name email phone phone_normalized state state_id district district_id ' +
          'cluster_id cluster_name cluster_code dynamic_fields promotion_status promoted_epc_id promoted_at created_at'
        )
        .lean()
    : [];

  const campaignIdList = allCampaigns.map((c) => c._id);
  const utmVisits = campaignIdList.length > 0 && UtmVisit
    ? await UtmVisit.find({ campaign_id: { $in: campaignIdList } })
        .select('campaign_id has_form_submitted epc_id has_ordered order_id attributed_revenue visit_count first_touch_at last_touch_at')
        .lean()
    : [];

  // Index platform entities by email & 10-digit phone for exact matching
  const epcById = new Map();
  const epcByEmail = new Map();
  const epcByPhone = new Map();
  for (const epc of epcAccounts) {
    epcById.set(String(epc._id), epc);
    addToIndexMap(epcByEmail, normalizeEmail(epc.email), epc);
    addToIndexMap(epcByPhone, normalizePhone10(epc.whatsapp), epc);
    addToIndexMap(epcByPhone, normalizePhone10(epc.registered_whatsapp), epc);
  }

  const ordersByEpcId = new Map();
  for (const ord of epcOrders) {
    if (!ord.epc_id) continue;
    const eid = String(ord.epc_id);
    if (!ordersByEpcId.has(eid)) ordersByEpcId.set(eid, []);
    ordersByEpcId.get(eid).push(ord);
  }

  const resellerByEmail = new Map();
  const resellerByPhone = new Map();
  for (const r of resellers) {
    addToIndexMap(resellerByEmail, normalizeEmail(r.email), r);
    addToIndexMap(resellerByPhone, normalizePhone10(r.mobile), r);
  }

  const franchiseLeadByEmail = new Map();
  const franchiseLeadByPhone = new Map();
  for (const fl of franchiseLeads) {
    addToIndexMap(franchiseLeadByEmail, normalizeEmail(fl.email), fl);
    addToIndexMap(franchiseLeadByPhone, normalizePhone10(fl.mobile_number), fl);
    addToIndexMap(franchiseLeadByPhone, normalizePhone10(fl.whatsapp_number), fl);
  }

  // Group UTM visits by campaign
  const utmByCampaignId = new Map();
  for (const u of utmVisits) {
    const cid = String(u.campaign_id);
    if (!utmByCampaignId.has(cid)) {
      utmByCampaignId.set(cid, {
        visits: 0,
        form_submissions: 0,
        orders: 0,
        revenue_inr: 0,
        epc_ids: new Set()
      });
    }
    const bucket = utmByCampaignId.get(cid);
    bucket.visits += Number(u.visit_count || 1);
    if (u.has_form_submitted) bucket.form_submissions += 1;
    if (u.has_ordered) bucket.orders += 1;
    bucket.revenue_inr += Number(u.attributed_revenue || 0);
    if (u.epc_id) bucket.epc_ids.add(String(u.epc_id));
  }

  // Index campaigns per segment & per recipient identity
  const campaignsBySegmentId = new Map();
  const campaignRecipientIndex = new Map(); // campaignId -> { byContactId, byEmail, byPhone }

  const getCampaignStartMs = (c) => {
    if (c.start_date) return toDateMs(c.start_date);
    let minSent = null;
    for (const r of c.recipients || []) {
      const s = toDateMs(r.sent_at || r.delivered_at);
      if (s && (!minSent || s < minSent)) minSent = s;
    }
    return minSent || toDateMs(c.created_at);
  };

  for (const c of allCampaigns) {
    const cid = String(c._id);
    const segSet = new Set((c.segment_ids || []).map((id) => String(id)));
    const byContactId = new Map();
    const byEmail = new Map();
    const byPhone = new Map();

    for (const r of c.recipients || []) {
      if (r.segment_id) segSet.add(String(r.segment_id));
      if (r.segment_contact_id) byContactId.set(String(r.segment_contact_id), r);
      const em = normalizeEmail(r.email);
      if (em) byEmail.set(em, r);
      const ph = normalizePhone10(r.phone);
      if (ph) byPhone.set(ph, r);
    }

    campaignRecipientIndex.set(cid, { byContactId, byEmail, byPhone });

    for (const sid of segSet) {
      if (!campaignsBySegmentId.has(sid)) campaignsBySegmentId.set(sid, []);
      campaignsBySegmentId.get(sid).push(c);
    }
  }

  // Filter tokens for geo filters
  const filterStateTok = cleanStateToken(filterState) || cleanGeoToken(filterState);
  const filterClusterTok = cleanGeoToken(filterCluster);
  const filterClusterUpper = String(filterCluster || '').trim().toUpperCase();
  const filterDistrictTok = cleanGeoToken(filterDistrict);

  const matchesGeoFilter = (resolved) => {
    if (filterState) {
      const idMatch = String(resolved.state_id || '') === String(filterState);
      const sTok = cleanStateToken(resolved.state) || cleanGeoToken(resolved.state);
      if (!idMatch && (!filterStateTok || sTok !== filterStateTok)) return false;
    }
    if (filterCluster) {
      const idMatch = String(resolved.cluster_id || '') === String(filterCluster);
      const codeMatch = resolved.cluster_code && String(resolved.cluster_code).toUpperCase() === filterClusterUpper;
      const nameTok = cleanGeoToken(resolved.cluster_name);
      if (!idMatch && !codeMatch && (!filterClusterTok || nameTok !== filterClusterTok)) return false;
    }
    if (filterDistrict) {
      const idMatch = String(resolved.district_id || '') === String(filterDistrict);
      const dTok = cleanGeoToken(resolved.district);
      if (!idMatch && (!filterDistrictTok || dTok !== filterDistrictTok)) return false;
    }
    return true;
  };

  // Group filtered contacts by segment_id
  const contactsBySegmentId = new Map();
  const resolvedContactsList = [];

  for (const c of contacts) {
    if (startMs || endMs) {
      const cMs = toDateMs(c.created_at);
      if (cMs) {
        if (startMs && cMs < startMs) continue;
        if (endMs && cMs > endMs) continue;
      }
    }

    const df = c.dynamic_fields || {};
    const resolvedGeo =
      c.state_id && c.district_id && c.cluster_id
        ? {
            state_id: c.state_id,
            state: c.state,
            district_id: c.district_id,
            district: c.district,
            cluster_id: c.cluster_id,
            cluster_name: c.cluster_name,
            cluster_code: c.cluster_code
          }
        : geoResolver.resolve({
            stateName: c.state || df.state || df.state_name || '',
            districtName: c.district || df.district || df.district_name || df.city || '',
            clusterName: c.cluster_name || c.cluster_code || df.cluster || df.cluster_name || ''
          });

    // Prefer already resolved stored fields if resolver left blank
    const geo = {
      state_id: resolvedGeo.state_id || c.state_id || null,
      state: resolvedGeo.state || c.state || '',
      district_id: resolvedGeo.district_id || c.district_id || null,
      district: resolvedGeo.district || c.district || '',
      cluster_id: resolvedGeo.cluster_id || c.cluster_id || null,
      cluster_name: resolvedGeo.cluster_name || c.cluster_name || '',
      cluster_code: resolvedGeo.cluster_code || c.cluster_code || ''
    };

    if (!matchesGeoFilter(geo)) continue;

    // If a specific campaign_id filter was passed, restrict contacts only to segments linked with that campaign
    if (filterCampaignId) {
      const sidCampaigns = campaignsBySegmentId.get(String(c.segment_id)) || [];
      if (sidCampaigns.length === 0) continue;
    }

    const enriched = { contact: c, geo };
    resolvedContactsList.push(enriched);
    const sid = String(c.segment_id);
    if (!contactsBySegmentId.has(sid)) contactsBySegmentId.set(sid, []);
    contactsBySegmentId.get(sid).push(enriched);
  }

  // Evaluate each segment group
  const segmentRows = [];
  const stateMap = new Map();
  const districtMap = new Map();

  const ensureStateEntry = (stateId, stateName) => {
    const label = String(stateName || '').trim() || 'Unspecified';
    const key = cleanStateToken(label) || label.toLowerCase();
    if (!stateMap.has(key)) {
      stateMap.set(key, {
        key,
        state_id: stateId || null,
        state_name: label,
        leads_uploaded: 0,
        active_cold_leads: 0,
        registered_count: 0,
        verified_count: 0,
        buyers_count: 0,
        orders_count: 0,
        kits_ordered: 0,
        revenue_inr: 0,
        post_campaign_conversions: 0,
        post_campaign_revenue_inr: 0,
        campaigns_set: new Set(),
        segments_map: new Map(),
        clusters_map: new Map(),
        unclustered_districts_map: new Map()
      });
    } else if (stateId && !stateMap.get(key).state_id) {
      stateMap.get(key).state_id = stateId;
    }
    return stateMap.get(key);
  };

  // Seed all active states and active FranchiseeClusters so map popups ALWAYS list every active cluster & its districts
  if (!filterState && !filterCluster && !filterDistrict) {
    for (const s of geoResolver.states || []) {
      ensureStateEntry(s._id, s.name);
    }
  }
  for (const clu of geoResolver.franchiseeClusters || []) {
    const cluGeo = {
      state_id: clu.state_id,
      state: clu.state_name,
      cluster_id: clu._id,
      cluster_name: clu.cluster_name,
      cluster_code: clu.cluster_code,
      district_id: null,
      district: ''
    };
    if (filterState && !matchesGeoFilter({ ...cluGeo, district: '' })) continue;
    if (filterCluster && !matchesGeoFilter(cluGeo)) continue;

    const sEntry = ensureStateEntry(clu.state_id, clu.state_name);
    const cluKey = clu.cluster_code || String(clu._id);
    if (!sEntry.clusters_map.has(cluKey)) {
      sEntry.clusters_map.set(cluKey, {
        cluster_id: clu._id,
        cluster_name: clu.cluster_name,
        cluster_code: clu.cluster_code,
        color_code: clu.color_code || '#2563eb',
        status: clu.status || 'available',
        configured_districts: [...(clu.district_names || [])],
        leads_uploaded: 0,
        active_cold_leads: 0,
        registered_count: 0,
        verified_count: 0,
        buyers_count: 0,
        orders_count: 0,
        kits_ordered: 0,
        revenue_inr: 0,
        post_campaign_conversions: 0,
        districts_map: new Map()
      });
    }
    const cEntry = sEntry.clusters_map.get(cluKey);
    for (const dName of clu.district_names || []) {
      if (filterDistrict && cleanGeoToken(dName) !== filterDistrictTok) continue;
      if (!cEntry.districts_map.has(dName)) {
        cEntry.districts_map.set(dName, {
          district_name: dName,
          leads_uploaded: 0,
          active_cold_leads: 0,
          registered_count: 0,
          verified_count: 0,
          buyers_count: 0,
          orders_count: 0,
          kits_ordered: 0,
          revenue_inr: 0,
          post_campaign_conversions: 0
        });
      }
    }
  }

  for (const seg of segments) {
    const sid = String(seg._id);
    const segCampaigns = campaignsBySegmentId.get(sid) || [];
    if (filterCampaignId && segCampaigns.length === 0) continue;

    const segContacts = contactsBySegmentId.get(sid) || [];

    // Earliest campaign start for this segment
    let earliestCampaignStartMs = null;
    const campaignSummaries = segCampaigns.map((c) => {
      const cStartMs = getCampaignStartMs(c);
      if (cStartMs && (!earliestCampaignStartMs || cStartMs < earliestCampaignStartMs)) {
        earliestCampaignStartMs = cStartMs;
      }
      const utm = utmByCampaignId.get(String(c._id));
      return {
        _id: c._id,
        campaign_name: c.campaign_name,
        campaign_code: c.campaign_code,
        campaign_type: c.campaign_type,
        campaign_objective: c.campaign_objective,
        purpose: c.purpose,
        status: c.status,
        start_date: c.start_date || (cStartMs ? new Date(cStartMs) : c.created_at),
        total_recipients: c.total_recipients || (c.recipients || []).length,
        stats: c.stats || {},
        utm_visits: utm ? utm.visits : 0,
        utm_form_submissions: utm ? utm.form_submissions : 0,
        utm_orders: utm ? utm.orders : 0,
        utm_revenue_inr: utm ? utm.revenue_inr : 0,
        campaign_contacts_reached: 0,
        campaign_registered: 0,
        campaign_verified: 0,
        campaign_buyers: 0,
        campaign_orders: 0,
        campaign_revenue_inr: 0
      };
    });

    const campSummaryById = new Map(campaignSummaries.map((cs) => [String(cs._id), cs]));

    let leadsUploaded = 0;
    let activeColdLeads = 0;
    let registeredCount = 0;
    let epcRegisteredCount = 0;
    let franchiseRegisteredCount = 0;
    let verifiedCount = 0;
    let buyersCount = 0;
    let ordersCount = 0;
    let kitsOrdered = 0;
    let revenueInr = 0;

    let campaignTargetedCount = 0;
    let campaignDeliveredCount = 0;
    let campaignOpenedCount = 0;
    let campaignClickedCount = 0;

    const preCampaign = {
      registered: 0,
      verified: 0,
      buyers: 0,
      orders: 0,
      revenue_inr: 0
    };
    const postCampaign = {
      targeted_contacts: 0,
      registered: 0,
      verified: 0,
      buyers: 0,
      orders: 0,
      kits: 0,
      revenue_inr: 0
    };
    const noCampaign = {
      registered: 0,
      verified: 0,
      buyers: 0,
      orders: 0,
      revenue_inr: 0
    };

    const segStateBreakdownMap = new Map();

    for (const { contact, geo } of segContacts) {
      leadsUploaded += 1;

      const emailNorm = normalizeEmail(contact.email);
      const phoneNorm = normalizePhone10(contact.phone_normalized || contact.phone);

      // 1. Platform Registration & Verification resolution
      const epc =
        (contact.promoted_epc_id && epcById.get(String(contact.promoted_epc_id))) ||
        (emailNorm && epcByEmail.get(emailNorm)) ||
        (phoneNorm && epcByPhone.get(phoneNorm)) ||
        null;

      const reseller =
        (emailNorm && resellerByEmail.get(emailNorm)) ||
        (phoneNorm && resellerByPhone.get(phoneNorm)) ||
        null;

      const franchiseLead =
        (emailNorm && franchiseLeadByEmail.get(emailNorm)) ||
        (phoneNorm && franchiseLeadByPhone.get(phoneNorm)) ||
        null;

      const isEpcReg = Boolean(epc) || contact.promotion_status === 'promoted_to_verified_epc';
      const isFranReg = Boolean(reseller) || Boolean(franchiseLead);
      const isRegistered = isEpcReg || isFranReg;

      const isEpcVerified =
        contact.promotion_status === 'promoted_to_verified_epc' ||
        Boolean(
          epc &&
            (['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
              epc.is_gstin_active === true)
        );
      const isFranVerified =
        Boolean(
          reseller &&
            (reseller.kyc_status === 'verified' ||
              reseller.activation_status === 'active' ||
              reseller.reseller_lifecycle_status === 'active' ||
              Boolean(reseller.gst_verified_at))
        ) ||
        Boolean(franchiseLead && (franchiseLead.gst_verified === true || franchiseLead.status === 'APPROVED_CONVERTED'));

      const isVerified = isEpcVerified || isFranVerified;

      if (isRegistered) registeredCount += 1;
      else activeColdLeads += 1;
      if (isEpcReg) epcRegisteredCount += 1;
      if (isFranReg) franchiseRegisteredCount += 1;
      if (isVerified) verifiedCount += 1;

      // Registration & Verification timestamps
      const regTimestamps = [
        epc ? toDateMs(epc.created_at) : null,
        reseller ? toDateMs(reseller.created_at) : null,
        franchiseLead ? toDateMs(franchiseLead.created_at) : null,
        contact.promoted_at ? toDateMs(contact.promoted_at) : null
      ].filter(Boolean);
      const registeredAtMs = regTimestamps.length > 0 ? Math.min(...regTimestamps) : null;

      const verTimestamps = [
        epc?.gstin_verified_at ? toDateMs(epc.gstin_verified_at) : null,
        reseller?.gst_verified_at ? toDateMs(reseller.gst_verified_at) : null,
        franchiseLead?.gst_verified_at ? toDateMs(franchiseLead.gst_verified_at) : null,
        contact.promoted_at ? toDateMs(contact.promoted_at) : null,
        isVerified ? registeredAtMs : null
      ].filter(Boolean);
      const verifiedAtMs = isVerified && verTimestamps.length > 0 ? Math.min(...verTimestamps) : null;

      // 2. Order & Buyer resolution
      const matchedOrders = epc ? ordersByEpcId.get(String(epc._id)) || [] : [];
      const contactOrdersCount = matchedOrders.length;
      const contactKitsCount = matchedOrders.reduce((s, o) => s + extractOrderKitsCount(o), 0);
      const contactRevenueInr = matchedOrders.reduce(
        (s, o) => s + Number(o.grand_total_paise || 0) / 100,
        0
      );
      const isBuyer = contactOrdersCount > 0;

      if (isBuyer) {
        buyersCount += 1;
        ordersCount += contactOrdersCount;
        kitsOrdered += contactKitsCount;
        revenueInr += contactRevenueInr;
      }

      // 3. Campaign Reach & Pre/Post Attribution
      let contactCampaignStartMs = null;
      let reachedByAnyCampaign = false;
      let anyDelivered = false;
      let anyOpened = false;
      let anyClicked = false;
      const matchedCampaignSummaries = [];

      for (const cs of campaignSummaries) {
        const idx = campaignRecipientIndex.get(String(cs._id));
        const recip =
          idx?.byContactId.get(String(contact._id)) ||
          (emailNorm && idx?.byEmail.get(emailNorm)) ||
          (phoneNorm && idx?.byPhone.get(phoneNorm)) ||
          null;

        if (recip) {
          reachedByAnyCampaign = true;
          matchedCampaignSummaries.push({ cs, recip });
          const cMs = toDateMs(recip.sent_at || recip.delivered_at || cs.start_date);
          if (cMs && (!contactCampaignStartMs || cMs < contactCampaignStartMs)) {
            contactCampaignStartMs = cMs;
          }
          if (['sent', 'delivered', 'read', 'opened', 'clicked', 'visited', 'submitted_form', 'converted'].includes(recip.status) || recip.delivered_at) {
            anyDelivered = true;
          }
          if (['read', 'opened', 'clicked', 'visited', 'submitted_form', 'converted'].includes(recip.status) || recip.read_at) {
            anyOpened = true;
          }
          if (['clicked', 'visited', 'submitted_form', 'converted'].includes(recip.status) || recip.clicked_at || recip.visited_at) {
            anyClicked = true;
          }
        }
      }

      if (reachedByAnyCampaign) {
        campaignTargetedCount += 1;
        postCampaign.targeted_contacts += 1;
      }
      if (anyDelivered) campaignDeliveredCount += 1;
      if (anyOpened) campaignOpenedCount += 1;
      if (anyClicked) campaignClickedCount += 1;

      const effectiveCampaignBoundaryMs = contactCampaignStartMs || earliestCampaignStartMs;
      let isPostCampaignConversion = false;
      let postOrderRevForContact = 0;

      if (segCampaigns.length === 0) {
        if (isRegistered) noCampaign.registered += 1;
        if (isVerified) noCampaign.verified += 1;
        if (isBuyer) {
          noCampaign.buyers += 1;
          noCampaign.orders += contactOrdersCount;
          noCampaign.revenue_inr += contactRevenueInr;
        }
      } else if (effectiveCampaignBoundaryMs) {
        if (isRegistered) {
          if (registeredAtMs && registeredAtMs >= effectiveCampaignBoundaryMs) {
            postCampaign.registered += 1;
            isPostCampaignConversion = true;
          } else {
            preCampaign.registered += 1;
          }
        }
        if (isVerified) {
          if (verifiedAtMs && verifiedAtMs >= effectiveCampaignBoundaryMs) {
            postCampaign.verified += 1;
            isPostCampaignConversion = true;
          } else {
            preCampaign.verified += 1;
          }
        }
        if (isBuyer) {
          let hasPreOrder = false;
          let hasPostOrder = false;
          for (const ord of matchedOrders) {
            const ordMs = toDateMs(ord.created_at) || 0;
            const ordRev = Number(ord.grand_total_paise || 0) / 100;
            const ordKits = extractOrderKitsCount(ord);
            if (ordMs >= effectiveCampaignBoundaryMs) {
              hasPostOrder = true;
              postCampaign.orders += 1;
              postCampaign.kits += ordKits;
              postCampaign.revenue_inr += ordRev;
              postOrderRevForContact += ordRev;
            } else {
              hasPreOrder = true;
              preCampaign.orders += 1;
              preCampaign.revenue_inr += ordRev;
            }
          }
          if (hasPostOrder) {
            postCampaign.buyers += 1;
            isPostCampaignConversion = true;
          }
          if (hasPreOrder && !hasPostOrder) {
            preCampaign.buyers += 1;
          }
        }
      }

      // Attribute per-campaign numbers
      for (const { cs, recip } of matchedCampaignSummaries) {
        cs.campaign_contacts_reached += 1;
        const rBoundary = toDateMs(recip.sent_at || recip.delivered_at || cs.start_date) || 0;
        if (isRegistered && (!rBoundary || !registeredAtMs || registeredAtMs >= rBoundary)) {
          cs.campaign_registered += 1;
        }
        if (isVerified && (!rBoundary || !verifiedAtMs || verifiedAtMs >= rBoundary)) {
          cs.campaign_verified += 1;
        }
        const postOrdsForCamp = matchedOrders.filter((o) => (toDateMs(o.created_at) || 0) >= rBoundary);
        if (postOrdsForCamp.length > 0) {
          cs.campaign_buyers += 1;
          cs.campaign_orders += postOrdsForCamp.length;
          cs.campaign_revenue_inr += postOrdsForCamp.reduce(
            (sum, o) => sum + Number(o.grand_total_paise || 0) / 100,
            0
          );
        }
      }

      // 4. Segment State & Map Accumulation
      const sName = geo.state || 'Unspecified';
      const sEntry = ensureStateEntry(geo.state_id, sName);
      sEntry.leads_uploaded += 1;
      if (isRegistered) sEntry.registered_count += 1;
      else sEntry.active_cold_leads += 1;
      if (isVerified) sEntry.verified_count += 1;
      if (isBuyer) {
        sEntry.buyers_count += 1;
        sEntry.orders_count += contactOrdersCount;
        sEntry.kits_ordered += contactKitsCount;
        sEntry.revenue_inr += contactRevenueInr;
      }
      if (isPostCampaignConversion) {
        sEntry.post_campaign_conversions += 1;
        sEntry.post_campaign_revenue_inr += postOrderRevForContact;
      }
      for (const cs of segCampaigns) {
        sEntry.campaigns_set.add(String(cs._id));
      }

      // Track Segment presence inside State
      if (!sEntry.segments_map.has(sid)) {
        sEntry.segments_map.set(sid, {
          segment_id: sid,
          segment_name: seg.name,
          purpose: seg.purpose,
          leads_uploaded: 0,
          registered_count: 0,
          verified_count: 0,
          buyers_count: 0,
          revenue_inr: 0,
          campaigns_count: segCampaigns.length
        });
      }
      const stSeg = sEntry.segments_map.get(sid);
      stSeg.leads_uploaded += 1;
      if (isRegistered) stSeg.registered_count += 1;
      if (isVerified) stSeg.verified_count += 1;
      if (isBuyer) {
        stSeg.buyers_count += 1;
        stSeg.revenue_inr += contactRevenueInr;
      }

      // Segment card-level State breakdown
      if (!segStateBreakdownMap.has(sName)) {
        segStateBreakdownMap.set(sName, {
          state: sName,
          leads_uploaded: 0,
          registered_count: 0,
          verified_count: 0,
          buyers_count: 0,
          revenue_inr: 0
        });
      }
      const sb = segStateBreakdownMap.get(sName);
      sb.leads_uploaded += 1;
      if (isRegistered) sb.registered_count += 1;
      if (isVerified) sb.verified_count += 1;
      if (isBuyer) {
        sb.buyers_count += 1;
        sb.revenue_inr += contactRevenueInr;
      }

      // Accumulate into State -> Cluster -> District & Flat District lookup
      const distLabel = String(geo.district || '').trim() || 'Unspecified District';
      if (geo.cluster_name || geo.cluster_code) {
        const cluKey = geo.cluster_code || String(geo.cluster_id || geo.cluster_name);
        if (!sEntry.clusters_map.has(cluKey)) {
          const masterClu = geo.cluster_id ? geoResolver.clusterById.get(String(geo.cluster_id)) : null;
          sEntry.clusters_map.set(cluKey, {
            cluster_id: geo.cluster_id || null,
            cluster_name: geo.cluster_name || masterClu?.cluster_name || cluKey,
            cluster_code: geo.cluster_code || masterClu?.cluster_code || '',
            color_code: masterClu?.color_code || '#2563eb',
            status: masterClu?.status || 'available',
            configured_districts: [...(masterClu?.district_names || [])],
            leads_uploaded: 0,
            active_cold_leads: 0,
            registered_count: 0,
            verified_count: 0,
            buyers_count: 0,
            orders_count: 0,
            kits_ordered: 0,
            revenue_inr: 0,
            post_campaign_conversions: 0,
            districts_map: new Map()
          });
        }
        const cEntry = sEntry.clusters_map.get(cluKey);
        cEntry.leads_uploaded += 1;
        if (isRegistered) cEntry.registered_count += 1;
        else cEntry.active_cold_leads += 1;
        if (isVerified) cEntry.verified_count += 1;
        if (isBuyer) {
          cEntry.buyers_count += 1;
          cEntry.orders_count += contactOrdersCount;
          cEntry.kits_ordered += contactKitsCount;
          cEntry.revenue_inr += contactRevenueInr;
        }
        if (isPostCampaignConversion) cEntry.post_campaign_conversions += 1;

        if (!cEntry.districts_map.has(distLabel)) {
          cEntry.districts_map.set(distLabel, {
            district_name: distLabel,
            leads_uploaded: 0,
            active_cold_leads: 0,
            registered_count: 0,
            verified_count: 0,
            buyers_count: 0,
            orders_count: 0,
            kits_ordered: 0,
            revenue_inr: 0,
            post_campaign_conversions: 0
          });
        }
        const dEntry = cEntry.districts_map.get(distLabel);
        dEntry.leads_uploaded += 1;
        if (isRegistered) dEntry.registered_count += 1;
        else dEntry.active_cold_leads += 1;
        if (isVerified) dEntry.verified_count += 1;
        if (isBuyer) {
          dEntry.buyers_count += 1;
          dEntry.orders_count += contactOrdersCount;
          dEntry.kits_ordered += contactKitsCount;
          dEntry.revenue_inr += contactRevenueInr;
        }
        if (isPostCampaignConversion) dEntry.post_campaign_conversions += 1;
      } else {
        if (!sEntry.unclustered_districts_map.has(distLabel)) {
          sEntry.unclustered_districts_map.set(distLabel, {
            district_name: distLabel,
            leads_uploaded: 0,
            active_cold_leads: 0,
            registered_count: 0,
            verified_count: 0,
            buyers_count: 0,
            orders_count: 0,
            kits_ordered: 0,
            revenue_inr: 0,
            post_campaign_conversions: 0
          });
        }
        const udEntry = sEntry.unclustered_districts_map.get(distLabel);
        udEntry.leads_uploaded += 1;
        if (isRegistered) udEntry.registered_count += 1;
        else udEntry.active_cold_leads += 1;
        if (isVerified) udEntry.verified_count += 1;
        if (isBuyer) {
          udEntry.buyers_count += 1;
          udEntry.orders_count += contactOrdersCount;
          udEntry.kits_ordered += contactKitsCount;
          udEntry.revenue_inr += contactRevenueInr;
        }
        if (isPostCampaignConversion) udEntry.post_campaign_conversions += 1;
      }

      // Flat district lookup for map tooltips
      if (geo.district) {
        const dLookupKey = `${cleanStateToken(sName) || sName.toLowerCase()}::${cleanGeoToken(distLabel)}`;
        if (!districtMap.has(dLookupKey)) {
          districtMap.set(dLookupKey, {
            state_name: sName,
            district_name: distLabel,
            cluster_id: geo.cluster_id || null,
            cluster_name: geo.cluster_name || '',
            cluster_code: geo.cluster_code || '',
            leads_uploaded: 0,
            active_cold_leads: 0,
            registered_count: 0,
            verified_count: 0,
            buyers_count: 0,
            orders_count: 0,
            kits_ordered: 0,
            revenue_inr: 0,
            post_campaign_conversions: 0,
            campaigns_set: new Set(),
            segments_map: new Map()
          });
        }
        const fd = districtMap.get(dLookupKey);
        fd.leads_uploaded += 1;
        if (isRegistered) fd.registered_count += 1;
        else fd.active_cold_leads += 1;
        if (isVerified) fd.verified_count += 1;
        if (isBuyer) {
          fd.buyers_count += 1;
          fd.orders_count += contactOrdersCount;
          fd.kits_ordered += contactKitsCount;
          fd.revenue_inr += contactRevenueInr;
        }
        if (isPostCampaignConversion) fd.post_campaign_conversions += 1;
        for (const cs of segCampaigns) fd.campaigns_set.add(String(cs._id));
        if (!fd.segments_map.has(sid)) {
          fd.segments_map.set(sid, { segment_id: sid, segment_name: seg.name, leads: 0, registered: 0, buyers: 0 });
        }
        const fds = fd.segments_map.get(sid);
        fds.leads += 1;
        if (isRegistered) fds.registered += 1;
        if (isBuyer) fds.buyers += 1;
      }
    }

    // Conversion Ratios
    const registrationRatePct = pct(registeredCount, leadsUploaded);
    const verificationRatePct = pct(verifiedCount, leadsUploaded);
    const buyerConversionRatePct = pct(buyersCount, leadsUploaded);
    const buyerOfRegisteredPct = pct(buyersCount, registeredCount);

    // Pre vs Post rates within group
    const preConvCount = Math.max(preCampaign.registered, preCampaign.buyers);
    const postConvCount = Math.max(postCampaign.registered, postCampaign.buyers);
    const preRatePct = pct(preConvCount, leadsUploaded);
    const postDen = postCampaign.targeted_contacts > 0 ? postCampaign.targeted_contacts : leadsUploaded;
    const postRatePct = pct(postConvCount, postDen);

    const hasCampaigns = segCampaigns.length > 0;
    const campaignsFormatted = campaignSummaries.map((c) => {
      const campDelivered = Number(c.stats?.delivered || 0);
      const campSent = Number(c.stats?.messages_sent || 0);
      return {
        ...c,
        campaign_revenue_inr: Math.round(c.campaign_revenue_inr),
        utm_revenue_inr: Math.round(c.utm_revenue_inr),
        messages_sent: campSent,
        delivered: campDelivered,
        link_clicks: Number(c.stats?.link_clicks || 0),
        website_visits: Number(c.stats?.website_visits || 0),
        form_submissions: Number(c.stats?.form_submissions || 0),
        conversions: Number(c.stats?.conversions || 0),
        revenue_generated: Number(c.stats?.revenue_generated || 0)
      };
    });

    segmentRows.push({
      _id: seg._id,
      name: seg.name,
      purpose: seg.purpose,
      purpose_label: PURPOSE_LABELS[seg.purpose] || seg.purpose,
      segment_type: seg.segment_type || '',
      description: seg.description || '',
      selected_kits: seg.selected_kits || [],
      status: seg.status,
      created_at: seg.created_at,
      last_uploaded_at: seg.last_uploaded_at,

      // Core dynamic counts
      leads_uploaded: leadsUploaded,
      active_cold_leads: activeColdLeads,
      registered_count: registeredCount,
      epc_registered_count: epcRegisteredCount,
      franchise_registered_count: franchiseRegisteredCount,
      verified_count: verifiedCount,
      buyers_count: buyersCount,
      orders_count: ordersCount,
      kits_ordered: kitsOrdered,
      revenue_inr: Math.round(revenueInr),

      // Conversion Ratios (%)
      registration_rate_pct: registrationRatePct,
      verification_rate_pct: verificationRatePct,
      buyer_conversion_rate_pct: buyerConversionRatePct,
      buyer_of_registered_pct: buyerOfRegisteredPct,
      overall_conversion_rate_pct: registrationRatePct,

      // Campaign Inclusion & Effect/Impact
      has_campaigns: hasCampaigns,
      campaigns_count: segCampaigns.length,
      earliest_campaign_started_at: earliestCampaignStartMs ? new Date(earliestCampaignStartMs) : null,
      campaigns: campaignsFormatted,
      campaign_reach: {
        targeted_contacts: campaignTargetedCount,
        delivered: campaignDeliveredCount,
        opened: campaignOpenedCount,
        clicked: campaignClickedCount
      },
      pre_campaign: {
        ...preCampaign,
        revenue_inr: Math.round(preCampaign.revenue_inr),
        conversion_rate_pct: preRatePct
      },
      post_campaign_impact: {
        ...postCampaign,
        revenue_inr: Math.round(postCampaign.revenue_inr),
        registration_lift_pct: pct(postCampaign.registered, postDen),
        verification_lift_pct: pct(postCampaign.verified, postDen),
        buyer_lift_pct: pct(postCampaign.buyers, postDen),
        conversion_rate_pct: postRatePct,
        net_conversion_lift_pct: Number((postRatePct - preRatePct).toFixed(1))
      },
      no_campaign_conversions: {
        ...noCampaign,
        revenue_inr: Math.round(noCampaign.revenue_inr)
      },
      state_breakdown: Array.from(segStateBreakdownMap.values())
        .map((sb) => ({ ...sb, revenue_inr: Math.round(sb.revenue_inr) }))
        .sort((a, b) => b.leads_uploaded - a.leads_uploaded)
    });
  }

  // Global Summary across filtered segments
  const totals = segmentRows.reduce(
    (acc, s) => {
      acc.total_segments += 1;
      if (s.has_campaigns) acc.segments_with_campaigns += 1;
      else acc.segments_without_campaigns += 1;
      acc.total_leads_uploaded += s.leads_uploaded;
      acc.total_active_cold_leads += s.active_cold_leads;
      acc.total_registered += s.registered_count;
      acc.total_verified += s.verified_count;
      acc.total_buyers += s.buyers_count;
      acc.total_orders += s.orders_count;
      acc.total_kits_ordered += s.kits_ordered;
      acc.total_revenue_inr += s.revenue_inr;
      acc.post_campaign_registered += s.post_campaign_impact.registered;
      acc.post_campaign_verified += s.post_campaign_impact.verified;
      acc.post_campaign_buyers += s.post_campaign_impact.buyers;
      acc.post_campaign_orders += s.post_campaign_impact.orders;
      acc.post_campaign_revenue_inr += s.post_campaign_impact.revenue_inr;
      return acc;
    },
    {
      total_segments: 0,
      segments_with_campaigns: 0,
      segments_without_campaigns: 0,
      total_leads_uploaded: 0,
      total_active_cold_leads: 0,
      total_registered: 0,
      total_verified: 0,
      total_buyers: 0,
      total_orders: 0,
      total_kits_ordered: 0,
      total_revenue_inr: 0,
      post_campaign_registered: 0,
      post_campaign_verified: 0,
      post_campaign_buyers: 0,
      post_campaign_orders: 0,
      post_campaign_revenue_inr: 0
    }
  );

  const summary = {
    ...totals,
    overall_registration_rate_pct: pct(totals.total_registered, totals.total_leads_uploaded),
    overall_verification_rate_pct: pct(totals.total_verified, totals.total_leads_uploaded),
    overall_buyer_conversion_rate_pct: pct(totals.total_buyers, totals.total_leads_uploaded),
    post_campaign_share_of_registrations_pct: pct(totals.post_campaign_registered, totals.total_registered),
    post_campaign_share_of_revenue_pct: pct(totals.post_campaign_revenue_inr, totals.total_revenue_inr)
  };

  // Comparative With-Campaign vs Without-Campaign Groups
  const buildCohortStats = (cohort) => {
    const agg = cohort.reduce(
      (a, s) => {
        a.groups_count += 1;
        a.leads_uploaded += s.leads_uploaded;
        a.registered_count += s.registered_count;
        a.verified_count += s.verified_count;
        a.buyers_count += s.buyers_count;
        a.orders_count += s.orders_count;
        a.revenue_inr += s.revenue_inr;
        a.post_campaign_registered += s.post_campaign_impact.registered;
        a.post_campaign_verified += s.post_campaign_impact.verified;
        a.post_campaign_buyers += s.post_campaign_impact.buyers;
        a.post_campaign_revenue_inr += s.post_campaign_impact.revenue_inr;
        return a;
      },
      {
        groups_count: 0,
        leads_uploaded: 0,
        registered_count: 0,
        verified_count: 0,
        buyers_count: 0,
        orders_count: 0,
        revenue_inr: 0,
        post_campaign_registered: 0,
        post_campaign_verified: 0,
        post_campaign_buyers: 0,
        post_campaign_revenue_inr: 0
      }
    );
    return {
      ...agg,
      registration_rate_pct: pct(agg.registered_count, agg.leads_uploaded),
      verification_rate_pct: pct(agg.verified_count, agg.leads_uploaded),
      buyer_conversion_rate_pct: pct(agg.buyers_count, agg.leads_uploaded)
    };
  };

  const withCampaignCohort = buildCohortStats(segmentRows.filter((s) => s.has_campaigns));
  const withoutCampaignCohort = buildCohortStats(segmentRows.filter((s) => !s.has_campaigns));

  const campaign_impact_comparison = {
    with_campaigns: withCampaignCohort,
    without_campaigns: withoutCampaignCohort,
    registration_rate_lift_pct: Number(
      (withCampaignCohort.registration_rate_pct - withoutCampaignCohort.registration_rate_pct).toFixed(1)
    ),
    verification_rate_lift_pct: Number(
      (withCampaignCohort.verification_rate_pct - withoutCampaignCohort.verification_rate_pct).toFixed(1)
    ),
    buyer_rate_lift_pct: Number(
      (withCampaignCohort.buyer_conversion_rate_pct - withoutCampaignCohort.buyer_conversion_rate_pct).toFixed(1)
    )
  };

  // Format Map Territory Output (100% dynamic, NO hardcoded 50 limit)
  const formattedStates = Array.from(stateMap.values())
    .map((st) => {
      const clusters = Array.from(st.clusters_map.values())
        .map((c) => {
          const districtsList = Array.from(c.districts_map.values())
            .map((d) => ({
              ...d,
              revenue_inr: Math.round(d.revenue_inr),
              conversion_rate_pct: pct(d.registered_count, d.leads_uploaded)
            }))
            .sort((a, b) => b.leads_uploaded - a.leads_uploaded || a.district_name.localeCompare(b.district_name));
          return {
            cluster_id: c.cluster_id,
            cluster_name: c.cluster_name,
            cluster_code: c.cluster_code,
            color_code: c.color_code,
            status: c.status,
            configured_districts: c.configured_districts,
            leads_uploaded: c.leads_uploaded,
            active_cold_leads: c.active_cold_leads,
            registered_count: c.registered_count,
            verified_count: c.verified_count,
            buyers_count: c.buyers_count,
            orders_count: c.orders_count,
            kits_ordered: c.kits_ordered,
            revenue_inr: Math.round(c.revenue_inr),
            post_campaign_conversions: c.post_campaign_conversions,
            conversion_rate_pct: pct(c.registered_count, c.leads_uploaded),
            districts: districtsList
          };
        })
        .sort((a, b) => b.leads_uploaded - a.leads_uploaded || a.cluster_name.localeCompare(b.cluster_name));

      const unclusteredDistricts = Array.from(st.unclustered_districts_map.values())
        .map((d) => ({
          ...d,
          revenue_inr: Math.round(d.revenue_inr),
          conversion_rate_pct: pct(d.registered_count, d.leads_uploaded)
        }))
        .sort((a, b) => b.leads_uploaded - a.leads_uploaded);

      return {
        state_id: st.state_id,
        state_name: st.state_name,
        leads_uploaded: st.leads_uploaded,
        active_cold_leads: st.active_cold_leads,
        registered_count: st.registered_count,
        verified_count: st.verified_count,
        buyers_count: st.buyers_count,
        orders_count: st.orders_count,
        kits_ordered: st.kits_ordered,
        revenue_inr: Math.round(st.revenue_inr),
        post_campaign_conversions: st.post_campaign_conversions,
        post_campaign_revenue_inr: Math.round(st.post_campaign_revenue_inr),
        registration_rate_pct: pct(st.registered_count, st.leads_uploaded),
        verification_rate_pct: pct(st.verified_count, st.leads_uploaded),
        buyer_conversion_rate_pct: pct(st.buyers_count, st.leads_uploaded),
        campaigns_count: st.campaigns_set.size,
        active_clusters_count: clusters.length,
        segments: Array.from(st.segments_map.values()).map((sg) => ({
          ...sg,
          revenue_inr: Math.round(sg.revenue_inr)
        })),
        clusters,
        unclustered_districts: unclusteredDistricts
      };
    })
    .filter((st) => st.leads_uploaded > 0 || st.active_clusters_count > 0)
    .sort((a, b) => b.leads_uploaded - a.leads_uploaded || b.active_clusters_count - a.active_clusters_count);

  const formattedDistricts = Array.from(districtMap.values()).map((d) => ({
    state_name: d.state_name,
    district_name: d.district_name,
    cluster_id: d.cluster_id,
    cluster_name: d.cluster_name,
    cluster_code: d.cluster_code,
    leads_uploaded: d.leads_uploaded,
    active_cold_leads: d.active_cold_leads,
    registered_count: d.registered_count,
    verified_count: d.verified_count,
    buyers_count: d.buyers_count,
    orders_count: d.orders_count,
    kits_ordered: d.kits_ordered,
    revenue_inr: Math.round(d.revenue_inr),
    post_campaign_conversions: d.post_campaign_conversions,
    registration_rate_pct: pct(d.registered_count, d.leads_uploaded),
    buyer_conversion_rate_pct: pct(d.buyers_count, d.leads_uploaded),
    campaigns_count: d.campaigns_set.size,
    segments: Array.from(d.segments_map.values())
  }));

  // Dynamic Filter Dropdown Options from DB
  const filter_options = {
    segments: (await MarketingSegment.find({ deleted_at: null }).select('_id name purpose').sort({ created_at: -1 }).lean()).map((s) => ({
      _id: s._id,
      name: s.name,
      purpose: s.purpose
    })),
    purposes: VALID_PURPOSES.map((p) => ({ value: p, label: PURPOSE_LABELS[p] })),
    states: (geoResolver.states || []).map((s) => ({ _id: s._id, name: s.name })),
    clusters: (geoResolver.franchiseeClusters || []).map((c) => ({
      _id: c._id,
      cluster_name: c.cluster_name,
      cluster_code: c.cluster_code,
      state_id: c.state_id,
      state_name: c.state_name,
      district_names: c.district_names || []
    })),
    districts: (geoResolver.districts || []).map((d) => ({ _id: d._id, name: d.name, level_1: d.level_1 })),
    campaigns: allCampaigns.map((c) => ({
      _id: c._id,
      campaign_name: c.campaign_name,
      campaign_code: c.campaign_code,
      status: c.status
    }))
  };

  return {
    summary,
    campaign_impact_comparison,
    segments: segmentRows,
    map_territory: {
      states: formattedStates,
      districts: formattedDistricts
    },
    filter_options
  };
};

module.exports = {
  computeDynamicSegmentAnalytics,
  PURPOSE_LABELS,
  VALID_PURPOSES
};
