const mongoose = require('mongoose');
const { EpcAccount, WebsiteEpcLead, EpcOrder, FranchiseeCluster } = require('../../models/india_solarshop_db');
const EpcPreference = require('../../../solarshop-india/models/india_solarshop_db/epc_preferences.schema');
const EpcMarketingConsent = require('../../../solarshop-india/models/india_solarshop_db/epc_marketing_consents.schema');
const CompanyWarehouse = require('../../models/company_warehouse_db/company_warehouses.schema');
const WarehouseClusterMapping = require('../../models/core_db/warehouse_cluster_mapping.schema');
const { MarketingUnsubscribe, MarketingSegment } = require('../models');

/**
 * Safely parse valid ObjectIds from mixed string/ObjectId array.
 */
const toObjectIds = (arr = []) =>
  (Array.isArray(arr) ? arr : [])
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(String(id)));

/**
 * Expand clusters & warehouses into target state IDs, state names, district IDs, and district names.
 */
const expandAreaFilters = async ({
  area_type = 'all_india',
  state_ids = [],
  state_names = [],
  district_ids = [],
  district_names = [],
  cluster_ids = [],
  cluster_names = [],
  warehouse_ids = []
}) => {
  if (!area_type || area_type === 'all_india') {
    return { isAllIndia: true };
  }

  const stateIdList = toObjectIds(state_ids);
  const districtIdList = toObjectIds(district_ids);
  const clusterIdList = toObjectIds(cluster_ids);
  const warehouseIdList = toObjectIds(warehouse_ids);

  const stateNamesSet = new Set((state_names || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean));
  const districtNamesSet = new Set((district_names || []).map((d) => String(d).trim().toLowerCase()).filter(Boolean));

  if (clusterIdList.length > 0 || (cluster_names && cluster_names.length > 0)) {
    const clusterQuery = { deleted_at: null };
    const orConds = [];
    if (clusterIdList.length > 0) orConds.push({ _id: { $in: clusterIdList } });
    if (cluster_names && cluster_names.length > 0) {
      orConds.push({ cluster_name: { $in: cluster_names } });
    }
    if (orConds.length > 0) {
      clusterQuery.$or = orConds;
      const clusters = await FranchiseeCluster.find(clusterQuery)
        .select('state_id state_name district_ids district_names')
        .lean()
        .catch(() => []);
      for (const cl of clusters) {
        if (cl.state_id) stateIdList.push(cl.state_id);
        if (cl.state_name) stateNamesSet.add(String(cl.state_name).trim().toLowerCase());
        for (const did of cl.district_ids || []) districtIdList.push(did);
        for (const dname of cl.district_names || []) districtNamesSet.add(String(dname).trim().toLowerCase());
      }
    }
  }

  if (warehouseIdList.length > 0) {
    const [mappings, warehouses] = await Promise.all([
      WarehouseClusterMapping.find({ warehouse_id: { $in: warehouseIdList }, deleted_at: null }).lean().catch(() => []),
      CompanyWarehouse.find({ _id: { $in: warehouseIdList }, deleted_at: null }).select('level_1 level_2').lean().catch(() => [])
    ]);

    for (const m of mappings) {
      for (const sid of m.state_ids || []) stateIdList.push(sid);
      for (const sname of m.states || []) stateNamesSet.add(String(sname).trim().toLowerCase());
      for (const fc of m.franchise_clusters || []) {
        if (fc.state_name) stateNamesSet.add(String(fc.state_name).trim().toLowerCase());
        for (const dname of fc.district_names || []) districtNamesSet.add(String(dname).trim().toLowerCase());
      }
    }

    for (const wh of warehouses) {
      if (wh.level_1) stateIdList.push(wh.level_1);
      if (wh.level_2) districtIdList.push(wh.level_2);
    }
  }

  const dedupedStateIds = Array.from(new Set(stateIdList.map(String))).map((id) => new mongoose.Types.ObjectId(id));
  const dedupedDistrictIds = Array.from(new Set(districtIdList.map(String))).map((id) => new mongoose.Types.ObjectId(id));

  return {
    isAllIndia: false,
    stateIds: dedupedStateIds,
    stateNamesSet,
    districtIds: dedupedDistrictIds,
    districtNamesSet
  };
};

/**
 * Resolve deduplicated EPC & Lead audience with area, classification, preference, opt-out, and consent controls.
 */
const resolveAudience = async (inputConfig = {}) => {
  let filterConfig = { ...inputConfig };

  if (inputConfig.segment_id && mongoose.Types.ObjectId.isValid(String(inputConfig.segment_id))) {
    const seg = await MarketingSegment.findById(inputConfig.segment_id).lean().catch(() => null);
    if (seg && seg.filters) {
      filterConfig = { ...seg.filters, ...inputConfig };
    }
  }

  const {
    epc_groups = { registered_epc: true, verified_epc: true, buyer_epc: true },
    exclude_groups = [],
    epc_types = [],
    area_type = 'all_india',
    state_ids = [],
    state_names = [],
    district_ids = [],
    district_names = [],
    cluster_ids = [],
    cluster_names = [],
    warehouse_ids = [],
    purchase_activity = 'all',
    last_order_days = 90,
    channel = null,
    industry_ids = [],
    kit_ids = [],
    subcategory_ids = [],
    include_imported_leads = true,
    require_consent = true
  } = filterConfig;

  const area = await expandAreaFilters({
    area_type,
    state_ids,
    state_names,
    district_ids,
    district_names,
    cluster_ids,
    cluster_names,
    warehouse_ids
  });

  // 1. Query registered EPC accounts (excluding soft-deleted & globally unsubscribed)
  const epcQuery = {
    deleted_at: null,
    is_marketing_unsubscribed: { $ne: true }
  };

  if (!area.isAllIndia) {
    const areaOr = [];
    if (area.districtIds.length > 0) areaOr.push({ districts: { $in: area.districtIds } });
    if (area.districtNamesSet.size > 0) {
      const regexList = Array.from(area.districtNamesSet).map((d) => new RegExp(`^${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
      areaOr.push({ district_name: { $in: regexList } });
    }
    if (areaOr.length === 0) {
      if (area.stateIds.length > 0) areaOr.push({ states: { $in: area.stateIds } });
      if (area.stateNamesSet.size > 0) {
        const regexList = Array.from(area.stateNamesSet).map((s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
        areaOr.push({ state_name: { $in: regexList } });
      }
    }
    if (areaOr.length > 0) {
      epcQuery.$or = areaOr;
    }
  }

  const epcTypeObjIds = toObjectIds(epc_types);
  if (epcTypeObjIds.length > 0) {
    epcQuery.epc_type_id = { $in: epcTypeObjIds };
  }

  const [allCandidates, unsubs, orders] = await Promise.all([
    EpcAccount.find(epcQuery)
      .select('name email whatsapp state_name district_name gstin gst_verification_status is_gstin_active epc_type epc_type_id created_at')
      .lean()
      .catch(() => []),
    MarketingUnsubscribe.find({ is_active: true }).select('email phone channel').lean().catch(() => []),
    EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
      .select('epc_id customer_phone created_at')
      .sort({ created_at: -1 })
      .lean()
      .catch(() => [])
  ]);

  const unsubscribedEmailSet = new Set();
  const unsubscribedPhoneSet = new Set();
  for (const u of unsubs) {
    if (u.email) unsubscribedEmailSet.add(u.email.toLowerCase().trim());
    if (u.phone) {
      const p10 = String(u.phone).replace(/\D/g, '').slice(-10);
      if (p10) unsubscribedPhoneSet.add(p10);
    }
  }

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

  const buyerEpcIdSet = new Set();
  const buyerPhoneSet = new Set();
  const buyerLastOrderMap = new Map();

  for (const ord of orders) {
    if (ord.epc_id) {
      const strId = String(ord.epc_id);
      buyerEpcIdSet.add(strId);
      if (!buyerLastOrderMap.has(strId)) {
        buyerLastOrderMap.set(strId, new Date(ord.created_at));
      }
    }
    if (ord.customer_phone) {
      const p10 = String(ord.customer_phone).replace(/\D/g, '').slice(-10);
      if (p10) {
        buyerPhoneSet.add(p10);
        if (!buyerLastOrderMap.has(p10)) {
          buyerLastOrderMap.set(p10, new Date(ord.created_at));
        }
      }
    }
  }

  const eligibleMap = new Map();
  const dedupContactSet = new Set();
  let excludedCount = 0;
  let unsubscribedSkipped = 0;
  let consentSkipped = 0;
  let emailConsentedCount = 0;
  let whatsappConsentedCount = 0;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - last_order_days * 24 * 60 * 60 * 1000);

  for (const epc of allCandidates) {
    const epcIdStr = String(epc._id);
    const cleanEmail = (epc.email || '').toLowerCase().trim();
    const cleanPhone10 = String(epc.whatsapp || '').replace(/\D/g, '').slice(-10);

    const isBuyer = buyerEpcIdSet.has(epcIdStr) || (cleanPhone10 && buyerPhoneSet.has(cleanPhone10));
    const isVerified =
      ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
      epc.is_gstin_active === true ||
      Boolean(epc.gstin && String(epc.gstin).trim().length >= 10);
    const isRegistered = true;

    if (exclude_groups.includes('buyer_epc') && isBuyer) {
      excludedCount++;
      continue;
    }
    if (exclude_groups.includes('verified_epc') && isVerified) {
      excludedCount++;
      continue;
    }
    if (exclude_groups.includes('registered_epc') && isRegistered && !isVerified && !isBuyer) {
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
    if (purchase_activity === 'inactive_buyer' && (!isBuyer || !lastOrd || lastOrd >= cutoffDate)) {
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

    const consent = consentMap.get(epcIdStr);
    const hasEmailConsent = Boolean(
      (consent && (consent.email_consent || consent.email_marketing_consent)) ||
      (pref && pref.email_marketing_consent)
    );
    const hasWhatsappConsent = Boolean(
      (consent && (consent.whatsapp_consent || consent.whatsapp_marketing_consent)) ||
      (pref && pref.whatsapp_marketing_consent)
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

    if (cleanEmail) dedupContactSet.add(`e:${cleanEmail}`);
    if (cleanPhone10) dedupContactSet.add(`p:${cleanPhone10}`);

    eligibleMap.set(`epc_${epcIdStr}`, {
      epc_id: epc._id,
      lead_id: null,
      source_type: 'epc_account',
      name: epc.name || 'Solar EPC Partner',
      phone: epc.whatsapp || '',
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

  // 2. Include deduplicated website / CSV-imported EPC leads when enabled
  let leadSourceCount = 0;
  if (include_imported_leads) {
    const leadQuery = { deleted_at: null };
    if (!area.isAllIndia) {
      const leadOr = [];
      if (area.districtNamesSet.size > 0) {
        const regexList = Array.from(area.districtNamesSet).map((d) => new RegExp(`^${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
        leadOr.push({ district_name: { $in: regexList } });
      }
      if (leadOr.length === 0 && (area.stateIds.length > 0 || area.stateNamesSet.size > 0)) {
        if (area.stateIds.length > 0) leadOr.push({ state_id: { $in: area.stateIds } });
        if (area.stateNamesSet.size > 0) {
          const regexList = Array.from(area.stateNamesSet).map((s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
          leadOr.push({ state_name: { $in: regexList } });
        }
      }
      if (leadOr.length > 0) leadQuery.$or = leadOr;
    }

    const leads = await WebsiteEpcLead.find(leadQuery)
      .select('name company_name contact_person phone mobile_number email state_name district_name gst_number lead_source lifetime_orders marketing_consent created_at')
      .lean()
      .catch(() => []);

    for (const lead of leads) {
      const cleanEmail = (lead.email || '').toLowerCase().trim();
      const rawPhone = lead.phone || lead.mobile_number || '';
      const cleanPhone10 = String(rawPhone).replace(/\D/g, '').slice(-10);

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
      const isVerified = Boolean(lead.gst_number && String(lead.gst_number).trim().length >= 10);
      const isRegistered = !isBuyer && !isVerified;

      if (exclude_groups.includes('buyer_epc') && isBuyer) { excludedCount++; continue; }
      if (exclude_groups.includes('verified_epc') && isVerified) { excludedCount++; continue; }
      if (exclude_groups.includes('registered_epc') && isRegistered) { excludedCount++; continue; }

      let isIncluded = false;
      if (epc_groups.buyer_epc && isBuyer) isIncluded = true;
      if (epc_groups.verified_epc && isVerified) isIncluded = true;
      if (epc_groups.registered_epc && (isRegistered || epc_groups.registered_epc)) isIncluded = true;
      if (!isIncluded) continue;

      if (purchase_activity === 'never_purchased' && isBuyer) { excludedCount++; continue; }
      if (purchase_activity === 'active_buyer' && !isBuyer) { excludedCount++; continue; }

      if (cleanEmail) dedupContactSet.add(`e:${cleanEmail}`);
      if (cleanPhone10) dedupContactSet.add(`p:${cleanPhone10}`);
      leadSourceCount++;

      const hasEmail = Boolean(cleanEmail);
      const hasPhone = cleanPhone10.length >= 10;
      if (hasEmail) emailConsentedCount++;
      if (hasPhone) whatsappConsentedCount++;

      eligibleMap.set(`lead_${String(lead._id)}`, {
        epc_id: null,
        lead_id: lead._id,
        source_type: lead.lead_source === 'csv_dynamic_import' ? 'csv_import' : 'website_lead',
        name: lead.company_name || lead.name || lead.contact_person || 'Solar Lead Partner',
        phone: rawPhone,
        email: cleanEmail,
        state_name: lead.state_name || '',
        district_name: lead.district_name || '',
        is_verified: isVerified,
        is_buyer: isBuyer,
        has_email_consent: hasEmail,
        has_whatsapp_consent: hasPhone,
        status: 'queued'
      });
    }
  }

  const recipients = Array.from(eligibleMap.values());

  return {
    total_eligible: recipients.length,
    total_excluded: excludedCount,
    unsubscribed_skipped: unsubscribedSkipped,
    consent_skipped: consentSkipped,
    sample_preview: recipients.slice(0, 8),
    recipients,
    source_breakdown: {
      epc_accounts: recipients.length - leadSourceCount,
      leads_and_imports: leadSourceCount
    },
    consent_breakdown: {
      email_consented: emailConsentedCount,
      whatsapp_consented: whatsappConsentedCount
    }
  };
};

module.exports = {
  resolveAudience
};
