const mongoose = require('mongoose');
const { EpcAccount, WebsiteEpcLead, EpcOrder, FranchiseeCluster } = require('../../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');
const EpcPreference = require('../../../solarshop-india/models/india_solarshop_db/epc_preferences.schema');
const EpcMarketingConsent = require('../../../solarshop-india/models/india_solarshop_db/epc_marketing_consents.schema');
const CompanyWarehouse = require('../../models/company_warehouse_db/company_warehouses.schema');
const WarehouseClusterMapping = require('../../models/core_db/warehouse_cluster_mapping.schema');
const {
  MarketingUnsubscribe,
  MarketingSegmentContact,
  MarketingAudienceSegment
} = require('../models');
const {
  normalizeEmail,
  normalizePhone10,
  reconcileSegmentLeadsWithVerifiedEpcs
} = require('./segmentPromotion.service');
const { cleanGeoToken, cleanStateToken } = require('./segmentGeo.service');

const escapeRegex = (val) => String(val || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const matchesCaseInsensitive = (actual, expected) => {
  const target = String(expected || '').trim().toLowerCase();
  if (!target) return true;
  return String(actual || '').trim().toLowerCase() === target;
};

/**
 * Safely parse valid ObjectIds and resolve EPC + Lead + Segment Group audience with deduplication and consent checks.
 */
const toObjectIds = (arr = []) =>
  (Array.isArray(arr) ? arr : [])
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

/**
 * Expand clusters & warehouses into target state IDs, state tokens, district IDs, and district tokens.
 */
const expandAreaFilters = async ({
  area_type = 'all_india',
  state_ids = [],
  state_names = [],
  district_ids = [],
  district_names = [],
  cluster_ids = [],
  cluster_names = [],
  cluster_codes = [],
  warehouse_ids = []
}) => {
  const hasExplicitArea =
    (state_ids && state_ids.length > 0) ||
    (state_names && state_names.length > 0) ||
    (district_ids && district_ids.length > 0) ||
    (district_names && district_names.length > 0) ||
    (cluster_ids && cluster_ids.length > 0) ||
    (cluster_names && cluster_names.length > 0) ||
    (cluster_codes && cluster_codes.length > 0) ||
    (warehouse_ids && warehouse_ids.length > 0);

  if (!area_type || area_type === 'all_india' || (['imported_batch', 'custom_selection'].includes(area_type) && !hasExplicitArea)) {
    return { isAllIndia: true };
  }

  const stateIdList = toObjectIds(state_ids);
  const districtIdList = toObjectIds(district_ids);
  const clusterIdList = toObjectIds(cluster_ids);
  const warehouseIdList = toObjectIds(warehouse_ids);

  const stateIdStrSet = new Set(stateIdList.map(String));
  const districtIdStrSet = new Set(districtIdList.map(String));
  const stateTokenSet = new Set((state_names || []).map((s) => cleanStateToken(s)).filter(Boolean));
  const districtTokenSet = new Set((district_names || []).map((d) => cleanGeoToken(d)).filter(Boolean));
  const clusterCodesSet = new Set((cluster_codes || []).map((c) => String(c || '').trim().toUpperCase()).filter(Boolean));
  const clusterNameTokenSet = new Set((cluster_names || []).map((c) => cleanGeoToken(c)).filter(Boolean));

  // Symmetrically resolve GeoLevel1 state IDs <-> state tokens
  if (stateIdList.length > 0 || stateTokenSet.size > 0) {
    const geoStates = await GeoLevel1.find({ deleted_at: null }).select('_id name').lean().catch(() => []);
    for (const gs of geoStates) {
      const idStr = String(gs._id);
      const tok = cleanStateToken(gs.name);
      if (stateIdStrSet.has(idStr) || (tok && stateTokenSet.has(tok))) {
        stateIdStrSet.add(idStr);
        if (tok) stateTokenSet.add(tok);
      }
    }
  }

  if (districtIdList.length > 0) {
    const geoDistricts = await GeoLevel2.find({ _id: { $in: districtIdList }, deleted_at: null })
      .select('_id name')
      .lean()
      .catch(() => []);
    for (const gd of geoDistricts) {
      districtIdStrSet.add(String(gd._id));
      const tok = cleanGeoToken(gd.name);
      if (tok) districtTokenSet.add(tok);
    }
  }

  if (clusterIdList.length > 0 || (cluster_names && cluster_names.length > 0) || clusterCodesSet.size > 0) {
    const clusterQuery = { deleted_at: null };
    const orConds = [];
    if (clusterIdList.length > 0) orConds.push({ _id: { $in: clusterIdList } });
    if (clusterCodesSet.size > 0) orConds.push({ cluster_code: { $in: Array.from(clusterCodesSet) } });
    if (cluster_names && cluster_names.length > 0) {
      const cnameRegexes = cluster_names.filter(Boolean).map((n) => new RegExp(`^${escapeRegex(String(n).trim())}$`, 'i'));
      if (cnameRegexes.length > 0) orConds.push({ cluster_name: { $in: cnameRegexes } });
    }
    if (orConds.length > 0) {
      clusterQuery.$or = orConds;
      const clusters = await FranchiseeCluster.find(clusterQuery)
        .select('cluster_name cluster_code state_id state_name district_ids district_names')
        .lean()
        .catch(() => []);
      for (const cl of clusters) {
        if (cl.state_id) stateIdStrSet.add(String(cl.state_id));
        if (cl.state_name) {
          const stTok = cleanStateToken(cl.state_name);
          if (stTok) stateTokenSet.add(stTok);
        }
        if (cl.cluster_code) clusterCodesSet.add(String(cl.cluster_code).trim().toUpperCase());
        if (cl.cluster_name) {
          const clTok = cleanGeoToken(cl.cluster_name);
          if (clTok) clusterNameTokenSet.add(clTok);
        }
        for (const did of cl.district_ids || []) districtIdStrSet.add(String(did));
        for (const dname of cl.district_names || []) {
          const dTok = cleanGeoToken(dname);
          if (dTok) districtTokenSet.add(dTok);
        }
      }
    }
  }

  const hasClusterOrStateSelection =
    stateIdStrSet.size > 0 ||
    stateTokenSet.size > 0 ||
    districtIdStrSet.size > 0 ||
    districtTokenSet.size > 0 ||
    clusterIdList.length > 0 ||
    clusterCodesSet.size > 0 ||
    clusterNameTokenSet.size > 0;

  if (warehouseIdList.length > 0 && (area_type === 'warehouse' || !hasClusterOrStateSelection)) {
    const [mappings, warehouses] = await Promise.all([
      WarehouseClusterMapping.find({ warehouse_id: { $in: warehouseIdList }, deleted_at: null }).lean().catch(() => []),
      CompanyWarehouse.find({ _id: { $in: warehouseIdList }, deleted_at: null }).select('level_1 level_2').lean().catch(() => [])
    ]);

    for (const m of mappings) {
      for (const sid of m.state_ids || []) stateIdStrSet.add(String(sid));
      for (const sname of m.states || []) {
        const stTok = cleanStateToken(sname);
        if (stTok) stateTokenSet.add(stTok);
      }
      for (const fc of m.franchise_clusters || []) {
        if (fc.state_name) {
          const stTok = cleanStateToken(fc.state_name);
          if (stTok) stateTokenSet.add(stTok);
        }
        for (const dname of fc.district_names || []) {
          const dTok = cleanGeoToken(dname);
          if (dTok) districtTokenSet.add(dTok);
        }
      }
    }

    for (const wh of warehouses) {
      if (wh.level_1) stateIdStrSet.add(String(wh.level_1));
      if (wh.level_2) districtIdStrSet.add(String(wh.level_2));
    }
  }

  const hasDistrictConstraint =
    districtIdStrSet.size > 0 ||
    districtTokenSet.size > 0 ||
    clusterCodesSet.size > 0 ||
    clusterNameTokenSet.size > 0 ||
    clusterIdList.length > 0;

  return {
    isAllIndia: false,
    hasDistrictConstraint,
    stateIdStrSet,
    stateTokenSet,
    districtIdStrSet,
    districtTokenSet,
    clusterCodesSet,
    clusterNameTokenSet
  };
};

const matchesTerritoryFields = (
  area,
  { stateIds = [], stateName = '', districtIds = [], districtName = '', clusterName = '', clusterCode = '' }
) => {
  if (!area || area.isAllIndia) return true;
  const stTok = cleanStateToken(stateName);
  const dTok = cleanGeoToken(districtName);
  const cTok = cleanGeoToken(clusterName);
  const cCode = String(clusterCode || '').trim().toUpperCase();

  if (area.hasDistrictConstraint) {
    if (Array.isArray(districtIds) && districtIds.some((d) => area.districtIdStrSet.has(String(d)))) return true;
    if (dTok && (area.districtTokenSet.has(dTok) || area.clusterNameTokenSet.has(dTok))) return true;
    if (cCode && area.clusterCodesSet.has(cCode)) return true;
    if (cTok && area.clusterNameTokenSet.has(cTok)) return true;
    return false;
  }

  if (Array.isArray(stateIds) && stateIds.some((s) => area.stateIdStrSet.has(String(s)))) return true;
  if (stTok && area.stateTokenSet.has(stTok)) return true;
  return false;
};

/**
 * Resolve deduplicated EPC & Lead audience with area, classification, preference, opt-out, and consent controls.
 */
const resolveAudience = async (inputConfig = {}) => {
  let filterConfig = { ...inputConfig };

  if (inputConfig.segment_id && mongoose.Types.ObjectId.isValid(String(inputConfig.segment_id))) {
    const seg = await MarketingAudienceSegment.findById(inputConfig.segment_id).lean().catch(() => null);
    if (seg && seg.filters) {
      filterConfig = { ...seg.filters, ...inputConfig };
    }
  }

  const {
    epc_groups: rawEpcGroups,
    exclude_groups = [],
    epc_types = [],
    area_type = 'all_india',
    state_ids = [],
    state_names = [],
    district_ids = [],
    district_names = [],
    cluster_ids = [],
    cluster_names = [],
    cluster_codes = [],
    warehouse_ids = [],
    location_basis = 'registered',
    purchase_activity = 'all',
    last_order_days_condition = 'any',
    last_order_days = 90,
    segment_ids = [],
    segment_state_filter = '',
    segment_cluster_filter = '',
    segment_district_filter = '',
    channel = null, // 'email' | 'whatsapp' | 'both'
    industry_ids = [],
    kit_ids = [],
    subcategory_ids = [],
    include_imported_leads = true,
    lead_sources = [],
    import_batch_id = null,
    require_consent = true,
    selected_recipient_emails = []
  } = filterConfig;

  const cleanLeadSources = Array.isArray(lead_sources)
    ? lead_sources.map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  const selectedEmailSet = new Set(
    (Array.isArray(selected_recipient_emails) ? selected_recipient_emails : [])
      .map((e) => normalizeEmail(e))
      .filter(isValidEmail)
  );

  const validSegmentIds = Array.isArray(segment_ids)
    ? segment_ids.filter((id) => id && mongoose.Types.ObjectId.isValid(String(id))).map((id) => new mongoose.Types.ObjectId(String(id)))
    : [];

  const epc_groups = rawEpcGroups || (
    validSegmentIds.length > 0
      ? { registered_epc: false, verified_epc: false, buyer_epc: false }
      : { registered_epc: true, verified_epc: true, buyer_epc: true }
  );

  const hasAnyEpcGroup = Boolean(
    epc_groups.registered_epc || epc_groups.verified_epc || epc_groups.buyer_epc
  );

  const cutoffDate = new Date(Date.now() - (Number(last_order_days) || 90) * 24 * 60 * 60 * 1000);

  const area = await expandAreaFilters({
    area_type,
    state_ids,
    state_names,
    district_ids,
    district_names,
    cluster_ids,
    cluster_names,
    cluster_codes,
    warehouse_ids
  });

  // Always load active unsubscribes once for EPCs, Website/CSV Leads, and Segment Groups
  const unsubs = await MarketingUnsubscribe.find({ is_active: true })
    .select('email phone channel')
    .lean()
    .catch(() => []);

  const unsubscribedEmailSet = new Set();
  const unsubscribedPhoneSet = new Set();
  for (const u of unsubs) {
    const e = normalizeEmail(u.email);
    const p = normalizePhone10(u.phone);
    if (e) unsubscribedEmailSet.add(e);
    if (p) unsubscribedPhoneSet.add(p);
  }

  const eligibleMap = new Map();
  const dedupContactSet = new Set();
  let leadSourceCount = 0;

  let excludedCount = 0;
  let unsubscribedSkipped = 0;
  let consentSkipped = 0;
  let emailConsentedCount = 0;
  let whatsappConsentedCount = 0;
  const seenEmails = new Set();
  const seenPhones = new Set();
  let solarPvCount = 0;
  let solarAgriCount = 0;
  let commercialCount = 0;
  let solarEvCount = 0;
  let energyStorageCount = 0;
  const tierBreakdown = {
    registered_epc: 0,
    verified_epc: 0,
    buyer_epc: 0
  };

  const isLegacySegmentOnlyMode = validSegmentIds.length > 0 && !hasAnyEpcGroup;

  if (hasAnyEpcGroup || import_batch_id || (include_imported_leads && !isLegacySegmentOnlyMode)) {
    const orders = await EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
      .select('epc_id delivery_address customer_phone created_at')
      .sort({ created_at: -1 })
      .lean()
      .catch(() => []);

    const buyerEpcIdSet = new Set();
    const buyerPhoneSet = new Set();
    const buyerLastOrderMap = new Map();
    const deliveryAddressesByEpcId = new Map();

    for (const ord of orders) {
      const ordDate = ord.created_at ? new Date(ord.created_at) : null;
      if (ord.epc_id) {
        const strId = String(ord.epc_id);
        buyerEpcIdSet.add(strId);
        if (ordDate && !buyerLastOrderMap.has(strId)) {
          buyerLastOrderMap.set(strId, ordDate);
        }
        if (
          ord.delivery_address &&
          (ord.delivery_address.state_id ||
            ord.delivery_address.state_name ||
            ord.delivery_address.district_id ||
            ord.delivery_address.district_name)
        ) {
          if (!deliveryAddressesByEpcId.has(strId)) {
            deliveryAddressesByEpcId.set(strId, []);
          }
          deliveryAddressesByEpcId.get(strId).push(ord.delivery_address);
        }
      }
      const rawOrderPhone = ord.delivery_address?.contact_phone || ord.customer_phone;
      if (rawOrderPhone) {
        const p10 = normalizePhone10(rawOrderPhone);
        if (p10) {
          buyerPhoneSet.add(p10);
          if (ordDate && !buyerLastOrderMap.has(p10)) {
            buyerLastOrderMap.set(p10, ordDate);
          }
        }
      }
    }

    if (hasAnyEpcGroup && !import_batch_id) {
      // 1. Query registered EPC accounts (excluding soft-deleted & globally unsubscribed)
      const epcQuery = {
        deleted_at: null,
        is_marketing_unsubscribed: { $ne: true }
      };

      const epcTypeObjIds = toObjectIds(epc_types);
      if (epcTypeObjIds.length > 0) {
        epcQuery.epc_type_id = { $in: epcTypeObjIds };
      }

      const allCandidates = await EpcAccount.find(epcQuery)
        .select('name company_name email whatsapp phone states districts state_name district_name gstin gst_verification_status is_gstin_active epc_type epc_type_id created_at')
        .lean()
        .catch(() => []);

      const allEpcIds = allCandidates.map((c) => c._id);
      const [prefDocs, consentDocs] = allEpcIds.length > 0
        ? await Promise.all([
          EpcPreference.find({ epc_id: { $in: allEpcIds }, deleted_at: null }).lean().catch(() => []),
          EpcMarketingConsent.find({ epc_id: { $in: allEpcIds }, is_active: true, withdrawn_at: null }).lean().catch(() => [])
        ])
        : [[], []];

      const prefMap = new Map();
      for (const p of prefDocs) prefMap.set(String(p.epc_id), p);

      const consentMap = new Map();
      for (const c of consentDocs) consentMap.set(String(c.epc_id), c);

      for (const epc of allCandidates) {
        const epcIdStr = String(epc._id);
        const cleanEmail = normalizeEmail(epc.email);
        const rawPhone = epc.whatsapp || epc.phone || '';
        const cleanPhone10 = normalizePhone10(rawPhone);

        if (!area.isAllIndia) {
          const delivList = deliveryAddressesByEpcId.get(epcIdStr) || [];
          const territoryOk =
            location_basis === 'delivery' && delivList.length > 0
              ? delivList.some((da) =>
                matchesTerritoryFields(area, {
                  stateIds: da.state_id ? [da.state_id] : [],
                  stateName: da.state_name || '',
                  districtIds: da.district_id ? [da.district_id] : [],
                  districtName: da.district_name || ''
                })
              )
              : matchesTerritoryFields(area, {
                stateIds: epc.states || [],
                stateName: epc.state_name || '',
                districtIds: epc.districts || [],
                districtName: epc.district_name || ''
              });
          if (!territoryOk) continue;
        }

        if (selectedEmailSet.size > 0 && (!isValidEmail(cleanEmail) || !selectedEmailSet.has(cleanEmail))) {
          excludedCount++;
          continue;
        }

        const isBuyer = buyerEpcIdSet.has(epcIdStr) || (cleanPhone10 && buyerPhoneSet.has(cleanPhone10));
        const hasVerifiedFlag =
          ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
          epc.is_gstin_active === true ||
          Boolean(epc.gstin && String(epc.gstin).trim().length >= 10);
        const isVerified = !isBuyer && hasVerifiedFlag;
        const isRegistered = !isBuyer && !isVerified;

        if (exclude_groups.includes('buyer_epc') && isBuyer) {
          excludedCount++;
          continue;
        }
        if (exclude_groups.includes('verified_epc') && isVerified) {
          excludedCount++;
          continue;
        }
        if (exclude_groups.includes('registered_epc') && isRegistered) {
          excludedCount++;
          continue;
        }

        if ((cleanEmail && unsubscribedEmailSet.has(cleanEmail)) || (cleanPhone10 && unsubscribedPhoneSet.has(cleanPhone10))) {
          excludedCount++;
          unsubscribedSkipped++;
          continue;
        }

        let isIncluded = false;
        if (epc_groups.buyer_epc && isBuyer) isIncluded = true;
        if (epc_groups.verified_epc && isVerified) isIncluded = true;
        if (epc_groups.registered_epc && isRegistered) isIncluded = true;
        if (!isIncluded) continue;

        const lastOrd = buyerLastOrderMap.get(epcIdStr) || (cleanPhone10 ? buyerLastOrderMap.get(cleanPhone10) : null);
        if (purchase_activity === 'never_purchased' && isBuyer) {
          excludedCount++;
          continue;
        }
        if (purchase_activity === 'active_buyer' && (!isBuyer || !lastOrd || lastOrd < cutoffDate)) {
          excludedCount++;
          continue;
        }
        if (purchase_activity === 'inactive_buyer' && (!isBuyer || (lastOrd && lastOrd >= cutoffDate))) {
          excludedCount++;
          continue;
        }
        if (last_order_days_condition === 'within' && (!isBuyer || !lastOrd || lastOrd < cutoffDate)) {
          excludedCount++;
          continue;
        }
        if (last_order_days_condition === 'more_than' && (!isBuyer || (lastOrd && lastOrd >= cutoffDate))) {
          excludedCount++;
          continue;
        }

        const pref = prefMap.get(epcIdStr);
        if (industry_ids && industry_ids.length > 0) {
          const epcInds = (pref?.selected_industry_ids || []).map(String);
          if (!industry_ids.some((id) => epcInds.includes(String(id)))) {
            excludedCount++;
            continue;
          }
        }

        if (subcategory_ids && subcategory_ids.length > 0) {
          const epcSubs = (pref?.selected_subcategory_ids || []).map(String);
          if (!subcategory_ids.some((id) => epcSubs.includes(String(id)))) {
            excludedCount++;
            continue;
          }
        }

        if (kit_ids && kit_ids.length > 0) {
          const epcKits = (pref?.selected_kit_ids || []).map(String);
          if (!kit_ids.some((id) => epcKits.includes(String(id)))) {
            excludedCount++;
            continue;
          }
        }

        const hasValidEmail = isValidEmail(cleanEmail);
        const hasValidPhone = cleanPhone10.length >= 10;
        if (channel === 'email' && !hasValidEmail) {
          excludedCount++;
          continue;
        }
        if (channel === 'whatsapp' && !hasValidPhone) {
          excludedCount++;
          continue;
        }
        if (!hasValidEmail && !hasValidPhone) {
          excludedCount++;
          continue;
        }

        const consent = consentMap.get(epcIdStr);
        const hasEmailConsent = Boolean(
          hasValidEmail &&
          ((consent && (consent.email_consent || consent.email_marketing_consent)) ||
            (pref && pref.email_marketing_consent))
        );
        const hasWhatsappConsent = Boolean(
          hasValidPhone &&
          ((consent && (consent.whatsapp_consent || consent.whatsapp_marketing_consent)) ||
            (pref && pref.whatsapp_marketing_consent))
        );

        if (hasEmailConsent) emailConsentedCount++;
        if (hasWhatsappConsent) whatsappConsentedCount++;

        if (require_consent && channel) {
          if (channel === 'email' && !hasEmailConsent) {
            excludedCount++;
            consentSkipped++;
            continue;
          }
          if (channel === 'whatsapp' && !hasWhatsappConsent) {
            excludedCount++;
            consentSkipped++;
            continue;
          }
          if (channel === 'both' && !hasEmailConsent && !hasWhatsappConsent) {
            excludedCount++;
            consentSkipped++;
            continue;
          }
        }

        if (hasValidEmail) {
          dedupContactSet.add(`e:${cleanEmail}`);
          seenEmails.add(cleanEmail);
        }
        if (hasValidPhone) {
          dedupContactSet.add(`p:${cleanPhone10}`);
          seenPhones.add(cleanPhone10);
        }

        const epcTier = isBuyer ? 'Buyer EPC' : isVerified ? 'Verified EPC' : 'Registered EPC';
        if (isBuyer) tierBreakdown.buyer_epc++;
        else if (isVerified) tierBreakdown.verified_epc++;
        else tierBreakdown.registered_epc++;

        eligibleMap.set(`epc_${epcIdStr}`, {
          epc_id: epc._id,
          lead_id: null,
          segment_id: null,
          segment_contact_id: null,
          custom_fields: {},
          source_type: 'epc_account',
          epc_tier: epcTier,
          name: epc.company_name || epc.name || 'Solar EPC Partner',
          phone: rawPhone,
          email: cleanEmail,
          state_name: epc.state_name || '',
          district_name: epc.district_name || '',
          is_verified: isVerified,
          is_buyer: isBuyer,
          has_email_consent: hasEmailConsent,
          has_whatsapp_consent: hasWhatsappConsent,
          status: 'queued'
        });
      }
    }

    // 2. Include deduplicated website / CSV-imported EPC leads when enabled
    if (include_imported_leads) {
      const leadQuery = { deleted_at: null };
      if (import_batch_id) {
        leadQuery.import_batch_id = String(import_batch_id).trim();
      }
      if (cleanLeadSources.length > 0) {
        leadQuery.$or = [
          { lead_source: { $in: cleanLeadSources } },
          { source: { $in: cleanLeadSources } }
        ];
      }

      const leads = await WebsiteEpcLead.find(leadQuery)
        .select('name company_name contact_person phone mobile_number email state_id state_name district_id district_name cluster_name cluster_code gst_number gst_verification_status lead_source import_batch_id lifetime_orders marketing_consent created_at')
        .lean()
        .catch(() => []);

      for (const lead of leads) {
        if (!area.isAllIndia) {
          const territoryOk = matchesTerritoryFields(area, {
            stateIds: lead.state_id ? [lead.state_id] : [],
            stateName: lead.state_name || '',
            districtIds: lead.district_id ? [lead.district_id] : [],
            districtName: lead.district_name || '',
            clusterName: lead.cluster_name || '',
            clusterCode: lead.cluster_code || ''
          });
          if (!territoryOk) continue;
        }

        const cleanEmail = normalizeEmail(lead.email);
        const rawPhone = lead.phone || lead.mobile_number || '';
        const cleanPhone10 = normalizePhone10(rawPhone);

        if (selectedEmailSet.size > 0 && (!isValidEmail(cleanEmail) || !selectedEmailSet.has(cleanEmail))) {
          excludedCount++;
          continue;
        }

        if ((cleanEmail && dedupContactSet.has(`e:${cleanEmail}`)) || (cleanPhone10 && dedupContactSet.has(`p:${cleanPhone10}`))) {
          continue; // Already included from primary EpcAccount
        }

        if ((cleanEmail && unsubscribedEmailSet.has(cleanEmail)) || (cleanPhone10 && unsubscribedPhoneSet.has(cleanPhone10))) {
          excludedCount++;
          unsubscribedSkipped++;
          continue;
        }

        if (lead.marketing_consent === false) {
          excludedCount++;
          consentSkipped++;
          continue;
        }

        const ordersCount = Number(lead.lifetime_orders || 0);
        const isBuyer = ordersCount > 0 || (cleanPhone10 && buyerPhoneSet.has(cleanPhone10));
        const hasVerifiedFlag =
          ['verified_automatic', 'verified_admin'].includes(lead.gst_verification_status) ||
          Boolean(lead.gst_number && String(lead.gst_number).trim().length >= 10);
        const isVerified = !isBuyer && hasVerifiedFlag;
        const isRegistered = !isBuyer && !isVerified;

        if (exclude_groups.includes('buyer_epc') && isBuyer) { excludedCount++; continue; }
        if (exclude_groups.includes('verified_epc') && isVerified) { excludedCount++; continue; }
        if (exclude_groups.includes('registered_epc') && isRegistered) { excludedCount++; continue; }

        if (!import_batch_id && (hasAnyEpcGroup || isLegacySegmentOnlyMode)) {
          let isIncluded = false;
          if (epc_groups.buyer_epc && isBuyer) isIncluded = true;
          if (epc_groups.verified_epc && isVerified) isIncluded = true;
          if (epc_groups.registered_epc && isRegistered) isIncluded = true;
          if (!isIncluded) continue;
        }

        const lastOrd = cleanPhone10 ? buyerLastOrderMap.get(cleanPhone10) : null;
        if (purchase_activity === 'never_purchased' && isBuyer) { excludedCount++; continue; }
        if (purchase_activity === 'active_buyer' && (!isBuyer || (lastOrd && lastOrd < cutoffDate))) { excludedCount++; continue; }
        if (purchase_activity === 'inactive_buyer' && (!isBuyer || (lastOrd && lastOrd >= cutoffDate))) { excludedCount++; continue; }
        if (last_order_days_condition === 'within' && (!isBuyer || (lastOrd && lastOrd < cutoffDate))) { excludedCount++; continue; }
        if (last_order_days_condition === 'more_than' && (!isBuyer || (lastOrd && lastOrd >= cutoffDate))) { excludedCount++; continue; }

        const hasValidEmail = isValidEmail(cleanEmail);
        const hasValidPhone = cleanPhone10.length >= 10;
        if (channel === 'email' && !hasValidEmail) { excludedCount++; continue; }
        if (channel === 'whatsapp' && !hasValidPhone) { excludedCount++; continue; }
        if (!hasValidEmail && !hasValidPhone) { excludedCount++; continue; }

        if (hasValidEmail) {
          dedupContactSet.add(`e:${cleanEmail}`);
          seenEmails.add(cleanEmail);
          emailConsentedCount++;
        }
        if (hasValidPhone) {
          dedupContactSet.add(`p:${cleanPhone10}`);
          seenPhones.add(cleanPhone10);
          whatsappConsentedCount++;
        }
        leadSourceCount++;

        const epcTier = isBuyer ? 'Buyer EPC' : isVerified ? 'Verified EPC' : 'Registered EPC';
        if (isBuyer) tierBreakdown.buyer_epc++;
        else if (isVerified) tierBreakdown.verified_epc++;
        else tierBreakdown.registered_epc++;

        eligibleMap.set(`lead_${String(lead._id)}`, {
          epc_id: null,
          lead_id: lead._id,
          segment_id: null,
          segment_contact_id: null,
          custom_fields: {},
          source_type: lead.lead_source === 'csv_dynamic_import' || lead.import_batch_id ? 'csv_import' : 'website_lead',
          epc_tier: epcTier,
          name: lead.company_name || lead.name || lead.contact_person || 'Solar Lead Partner',
          phone: rawPhone,
          email: cleanEmail,
          state_name: lead.state_name || '',
          district_name: lead.district_name || '',
          is_verified: isVerified,
          is_buyer: isBuyer,
          has_email_consent: hasValidEmail,
          has_whatsapp_consent: hasValidPhone,
          status: 'queued'
        });
      }
    }
  }

  // 3. Resolve Selected Segment Group Leads (reconciling already-verified EPCs out first)
  const segmentRecipients = [];
  const segmentBreakdown = {};

  if (validSegmentIds.length > 0) {
    await reconcileSegmentLeadsWithVerifiedEpcs(validSegmentIds);

    const segQuery = {
      segment_id: { $in: validSegmentIds },
      deleted_at: null,
      promotion_status: { $ne: 'promoted_to_verified_epc' }
    };

    const segContacts = await MarketingSegmentContact.find(segQuery).lean();
    const cleanStateFilter = String(segment_state_filter || '').trim();
    const cleanClusterFilter = String(segment_cluster_filter || '').trim();
    const cleanDistrictFilter = String(segment_district_filter || '').trim();

    for (const contact of segContacts) {
      const cState = contact.state || contact.dynamic_fields?.state || contact.dynamic_fields?.state_name || '';
      const cCluster = contact.cluster_name || contact.cluster_code || '';
      const cDistrict = contact.district || contact.dynamic_fields?.district || contact.dynamic_fields?.district_name || contact.dynamic_fields?.city || '';

      if (cleanStateFilter && !matchesCaseInsensitive(cState, cleanStateFilter)) {
        excludedCount++;
        continue;
      }
      if (cleanClusterFilter && !matchesCaseInsensitive(contact.cluster_name, cleanClusterFilter) && !matchesCaseInsensitive(contact.cluster_code, cleanClusterFilter)) {
        excludedCount++;
        continue;
      }
      if (cleanDistrictFilter && !matchesCaseInsensitive(cDistrict, cleanDistrictFilter)) {
        excludedCount++;
        continue;
      }

      const cleanEmail = normalizeEmail(contact.email);
      const cleanPhone10 = normalizePhone10(contact.phone_normalized || contact.phone);

      if (selectedEmailSet.size > 0 && (!isValidEmail(cleanEmail) || !selectedEmailSet.has(cleanEmail))) {
        excludedCount++;
        continue;
      }

      if ((cleanEmail && unsubscribedEmailSet.has(cleanEmail)) || (cleanPhone10 && unsubscribedPhoneSet.has(cleanPhone10))) {
        excludedCount++;
        unsubscribedSkipped++;
        continue;
      }

      if (channel === 'email' && !isValidEmail(cleanEmail)) { excludedCount++; continue; }
      if (channel === 'whatsapp' && !cleanPhone10) { excludedCount++; continue; }
      if (!isValidEmail(cleanEmail) && !cleanPhone10) { excludedCount++; continue; }

      // Deduplicate against selected EPCs, leads, and other selected segments
      if (
        (cleanEmail && (dedupContactSet.has(`e:${cleanEmail}`) || seenEmails.has(cleanEmail))) ||
        (cleanPhone10 && (dedupContactSet.has(`p:${cleanPhone10}`) || seenPhones.has(cleanPhone10)))
      ) {
        excludedCount++;
        continue;
      }

      if (cleanEmail) seenEmails.add(cleanEmail);
      if (cleanPhone10) seenPhones.add(cleanPhone10);
      if (isValidEmail(cleanEmail)) emailConsentedCount++;
      if (cleanPhone10) whatsappConsentedCount++;

      const segIdStr = String(contact.segment_id);
      segmentBreakdown[segIdStr] = (segmentBreakdown[segIdStr] || 0) + 1;

      segmentRecipients.push({
        epc_id: null,
        lead_id: null,
        source_type: 'segment',
        epc_tier: 'Segment Contact',
        segment_id: contact.segment_id,
        segment_contact_id: contact._id,
        custom_fields: contact.dynamic_fields || {},
        name: contact.name || contact.dynamic_fields?.name || contact.dynamic_fields?.company || 'Solar Partner',
        phone: cleanPhone10 || contact.phone || '',
        email: cleanEmail || '',
        state_name: cState,
        district_name: cDistrict,
        is_verified: false,
        is_buyer: false,
        has_email_consent: Boolean(isValidEmail(cleanEmail)),
        has_whatsapp_consent: Boolean(cleanPhone10),
        status: 'queued'
      });
    }
  }

  const baseRecipients = Array.from(eligibleMap.values());
  const recipients = [...baseRecipients, ...segmentRecipients];

  return {
    total_eligible: recipients.length,
    deduplicatedTotal: recipients.length,
    epcCount: baseRecipients.length - leadSourceCount,
    segmentCount: segmentRecipients.length,
    segment_breakdown: segmentBreakdown,
    tier_breakdown: tierBreakdown,
    total_excluded: excludedCount,
    unsubscribed_skipped: unsubscribedSkipped,
    consent_skipped: consentSkipped,
    sample_preview: recipients.slice(0, 50),
    recipients,
    source_breakdown: {
      epc_accounts: baseRecipients.length - leadSourceCount,
      leads_and_imports: leadSourceCount,
      segment_groups: segmentRecipients.length
    },
    consent_breakdown: {
      email_consented: emailConsentedCount,
      whatsapp_consented: whatsappConsentedCount
    },
    industry_breakdown: {
      all: recipients.length,
      solar_pv: solarPvCount,
      solar_agri: solarAgriCount,
      commercial: commercialCount,
      solar_ev: solarEvCount,
      energy_storage: energyStorageCount
    }
  };
};

module.exports = {
  resolveAudience,
  escapeRegex
};
