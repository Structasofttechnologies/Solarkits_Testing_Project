const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

// Load required SolarKits native models with safe fallbacks
let EpcAccount;
try {
  EpcAccount = db.model('epc_accounts');
} catch (e) {
  EpcAccount = require('../../models/india_solarshop_db/EpcAccount.schema');
}

let EpcOrder;
try {
  EpcOrder = db.model('epc_orders');
} catch (e) {
  EpcOrder = require('../../models/india_solarshop_db/epc_orders.schema');
}

let EpcPreference;
try {
  EpcPreference = db.model('epc_preferences');
} catch (e) {
  EpcPreference = require('../../../solarshop-india/models/india_solarshop_db/epc_preferences.schema');
}

let EpcMarketingConsent;
try {
  EpcMarketingConsent = db.model('epc_marketing_consents');
} catch (e) {
  EpcMarketingConsent = require('../../../solarshop-india/models/india_solarshop_db/epc_marketing_consents.schema');
}

const { MarketingSegmentContact, MarketingUnsubscribe } = require('../models');
const {
  normalizeEmail,
  normalizePhone10,
  reconcileSegmentLeadsWithVerifiedEpcs
} = require('./segmentPromotion.service');

const escapeRegex = (val) => String(val || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const matchesCaseInsensitive = (actual, expected) => {
  const target = String(expected || '').trim().toLowerCase();
  if (!target) return true;
  return String(actual || '').trim().toLowerCase() === target;
};

/**
 * Resolve combined EPC + isolated Segment Group audience with deduplication and channel consent.
 */
const resolveAudience = async (filterConfig = {}) => {
  const {
    epc_groups: rawEpcGroups,
    exclude_groups = [],
    area_type = 'all_india',
    state_ids = [],
    state_names = [],
    district_ids = [],
    district_names = [],
    warehouse_ids = [],
    cluster_ids = [],
    purchase_activity = 'all',
    last_order_days = 90,
    // --- Segment Group Criteria (strictly Non-EPC until GSTIN verified) ---
    segment_ids = [],
    segment_state_filter = '',
    segment_cluster_filter = '',
    segment_district_filter = '',
    // --- Industry & Kit Preference Criteria (Section 5 & 7 of PRD) ---
    channel = null, // 'email' | 'whatsapp' | 'both'
    industry_ids = [],
    kit_ids = [],
    subcategory_ids = [],
    require_consent = true
  } = filterConfig;

  const validSegmentIds = Array.isArray(segment_ids)
    ? segment_ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
    : [];

  const epc_groups = rawEpcGroups || (
    validSegmentIds.length > 0
      ? { registered_epc: false, verified_epc: false, buyer_epc: false }
      : { registered_epc: true, verified_epc: false, buyer_epc: false }
  );

  const hasAnyEpcGroup = Boolean(
    epc_groups.registered_epc || epc_groups.verified_epc || epc_groups.buyer_epc
  );

  // 1. Fetch active unsubscribed contacts once for both EPCs and Segments
  const unsubscribedEmailSet = new Set();
  const unsubscribedPhoneSet = new Set();
  try {
    const unsubs = await MarketingUnsubscribe.find({ is_active: true }).select('email phone').lean();
    for (const u of unsubs) {
      const e = normalizeEmail(u.email);
      const p = normalizePhone10(u.phone);
      if (e) unsubscribedEmailSet.add(e);
      if (p) unsubscribedPhoneSet.add(p);
    }
  } catch (err) {
    // Non-fatal
  }

  let excludedCount = 0;
  let emailConsentedCount = 0;
  let whatsappConsentedCount = 0;
  const epcRecipients = [];
  const seenEmails = new Set();
  const seenPhones = new Set();
  let solarPvCount = 0;
  let solarAgriCount = 0;
  let commercialCount = 0;
  let solarEvCount = 0;
  let energyStorageCount = 0;

  // 2. Resolve EPC Audience (only when at least one EPC group checkbox is enabled)
  if (hasAnyEpcGroup) {
    const baseMatch = { deleted_at: null };

    if (area_type !== 'all_india') {
      if (state_ids && state_ids.length > 0) {
        baseMatch.states = { $in: state_ids.map((id) => new mongoose.Types.ObjectId(id)) };
      } else if (state_names && state_names.length > 0) {
        baseMatch.state_name = { $in: state_names };
      }

      if (district_ids && district_ids.length > 0) {
        baseMatch.districts = { $in: district_ids.map((id) => new mongoose.Types.ObjectId(id)) };
      } else if (district_names && district_names.length > 0) {
        baseMatch.district_name = { $in: district_names };
      }
    } else if (segment_state_filter || segment_district_filter) {
      // No-op: EPC area filter remains controlled strictly by EPC area_type/state_ids
    }

    const allCandidates = await EpcAccount.find(baseMatch)
      .select('name email whatsapp state_name district_name gst_verification_status is_gstin_active created_at')
      .lean();

    if (allCandidates && allCandidates.length > 0) {
      const allEpcIds = allCandidates.map((c) => c._id);
      const [prefDocs, consentDocs] = await Promise.all([
        EpcPreference.find({ epc_id: { $in: allEpcIds }, deleted_at: null }).lean(),
        EpcMarketingConsent.find({ epc_id: { $in: allEpcIds }, is_active: true, withdrawn_at: null }).lean()
      ]);

      const prefMap = new Map(prefDocs.map((p) => [String(p.epc_id), p]));
      const consentMap = new Map(consentDocs.map((c) => [String(c.epc_id), c]));

      const buyerEpcIdSet = new Set();
      const buyerLastOrderMap = new Map();
      try {
        if (EpcOrder) {
          const orders = await EpcOrder.find({ order_status: { $nin: ['cancelled', 'rejected'] } })
            .select('epc_id created_at')
            .sort({ created_at: -1 })
            .lean();
          for (const ord of orders) {
            if (ord.epc_id) {
              const strId = String(ord.epc_id);
              buyerEpcIdSet.add(strId);
              if (!buyerLastOrderMap.has(strId)) buyerLastOrderMap.set(strId, new Date(ord.created_at));
            }
          }
        }
      } catch (err) {
        // Non-fatal
      }

      const eligibleMap = new Map();
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - last_order_days * 24 * 60 * 60 * 1000);

      for (const epc of allCandidates) {
        const epcIdStr = String(epc._id);
        const isBuyer = buyerEpcIdSet.has(epcIdStr);
        const isVerified =
          ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
          epc.is_gstin_active === true;
        const isRegistered = true;

        if (exclude_groups.includes('buyer_epc') && isBuyer) { excludedCount++; continue; }
        if (exclude_groups.includes('verified_epc') && isVerified) { excludedCount++; continue; }
        if (exclude_groups.includes('registered_epc') && isRegistered && !isVerified && !isBuyer) { excludedCount++; continue; }

        const cleanEmail = normalizeEmail(epc.email);
        const cleanPhone10 = normalizePhone10(epc.whatsapp);
        if (cleanEmail && unsubscribedEmailSet.has(cleanEmail)) { excludedCount++; continue; }
        if (cleanPhone10 && unsubscribedPhoneSet.has(cleanPhone10)) { excludedCount++; continue; }

        let isIncluded = false;
        if (epc_groups.buyer_epc && isBuyer) isIncluded = true;
        if (epc_groups.verified_epc && isVerified) isIncluded = true;
        if (epc_groups.registered_epc && isRegistered) isIncluded = true;
        if (!isIncluded) continue;

        if (purchase_activity === 'never_purchased' && isBuyer) { excludedCount++; continue; }
        if (purchase_activity === 'active_buyer') {
          const lastOrd = buyerLastOrderMap.get(epcIdStr);
          if (!isBuyer || !lastOrd || lastOrd < cutoffDate) { excludedCount++; continue; }
        }
        if (purchase_activity === 'inactive_buyer') {
          const lastOrd = buyerLastOrderMap.get(epcIdStr);
          if (!isBuyer || !lastOrd || lastOrd >= cutoffDate) { excludedCount++; continue; }
        }

        const pref = prefMap.get(epcIdStr);
        if (industry_ids && industry_ids.length > 0) {
          const epcInds = (pref?.selected_industry_ids || []).map(String);
          if (!industry_ids.some((id) => epcInds.includes(String(id)))) { excludedCount++; continue; }
        }
        if (subcategory_ids && subcategory_ids.length > 0) {
          const epcSubs = (pref?.selected_subcategory_ids || []).map(String);
          if (!subcategory_ids.some((id) => epcSubs.includes(String(id)))) { excludedCount++; continue; }
        }
        if (kit_ids && kit_ids.length > 0) {
          const epcKits = (pref?.selected_kit_ids || []).map(String);
          if (!kit_ids.some((id) => epcKits.includes(String(id)))) { excludedCount++; continue; }
        }

        const consent = consentMap.get(epcIdStr);
        const hasEmailConsent = Boolean((consent && consent.email_consent) || (pref && pref.email_marketing_consent));
        const hasWhatsappConsent = Boolean((consent && consent.whatsapp_consent) || (pref && pref.whatsapp_marketing_consent));

        if (hasEmailConsent) emailConsentedCount++;
        if (hasWhatsappConsent) whatsappConsentedCount++;

        if (require_consent && channel) {
          if (channel === 'email' && !hasEmailConsent) { excludedCount++; continue; }
          if (channel === 'whatsapp' && !hasWhatsappConsent) { excludedCount++; continue; }
          if (channel === 'both' && !hasEmailConsent && !hasWhatsappConsent) { excludedCount++; continue; }
        }

        eligibleMap.set(epcIdStr, {
          epc_id: epc._id,
          source_type: 'epc',
          segment_id: null,
          segment_contact_id: null,
          custom_fields: {},
          name: epc.name || 'Solar EPC Partner',
          phone: cleanPhone10 || epc.whatsapp || '',
          email: cleanEmail || epc.email || '',
          state_name: epc.state_name || '',
          district_name: epc.district_name || '',
          is_verified: isVerified,
          is_buyer: isBuyer,
          has_email_consent: hasEmailConsent,
          has_whatsapp_consent: hasWhatsappConsent,
          status: 'queued'
        });

        if (cleanEmail) seenEmails.add(cleanEmail);
        if (cleanPhone10) seenPhones.add(cleanPhone10);
      }

      epcRecipients.push(...eligibleMap.values());
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

      if (cleanEmail && unsubscribedEmailSet.has(cleanEmail)) { excludedCount++; continue; }
      if (cleanPhone10 && unsubscribedPhoneSet.has(cleanPhone10)) { excludedCount++; continue; }

      if (channel === 'email' && !cleanEmail) { excludedCount++; continue; }
      if (channel === 'whatsapp' && !cleanPhone10) { excludedCount++; continue; }
      if (!cleanEmail && !cleanPhone10) { excludedCount++; continue; }

      // Deduplicate against selected EPCs and other selected segments
      if ((cleanEmail && seenEmails.has(cleanEmail)) || (cleanPhone10 && seenPhones.has(cleanPhone10))) {
        excludedCount++;
        continue;
      }

      if (cleanEmail) seenEmails.add(cleanEmail);
      if (cleanPhone10) seenPhones.add(cleanPhone10);
      if (cleanEmail) emailConsentedCount++;
      if (cleanPhone10) whatsappConsentedCount++;

      const segIdStr = String(contact.segment_id);
      segmentBreakdown[segIdStr] = (segmentBreakdown[segIdStr] || 0) + 1;

      segmentRecipients.push({
        epc_id: null,
        source_type: 'segment',
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
        has_email_consent: Boolean(cleanEmail),
        has_whatsapp_consent: Boolean(cleanPhone10),
        status: 'queued'
      });
    }
  }

  const recipients = [...epcRecipients, ...segmentRecipients];

  return {
    total_eligible: recipients.length,
    deduplicatedTotal: recipients.length,
    epcCount: epcRecipients.length,
    segmentCount: segmentRecipients.length,
    segment_breakdown: segmentBreakdown,
    total_excluded: excludedCount,
    sample_preview: recipients.slice(0, 8),
    recipients,
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
