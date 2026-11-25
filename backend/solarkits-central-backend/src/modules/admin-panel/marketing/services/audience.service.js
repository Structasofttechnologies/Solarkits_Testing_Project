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

/**
 * Resolve EPC Audience with strict deduplication, industry/kit preference filtering, and channel consent
 */
const resolveAudience = async (filterConfig = {}) => {
  const {
    epc_groups = { registered_epc: true, verified_epc: false, buyer_epc: false },
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
    // --- Industry & Kit Preference Criteria (Section 5 & 7 of PRD) ---
    channel = null, // 'email' | 'whatsapp' | 'both'
    industry_ids = [],
    kit_ids = [],
    subcategory_ids = [],
    require_consent = true
  } = filterConfig;

  // 1. Build Base EPC Match Filter
  const baseMatch = { deleted_at: null };

  // Area Filters
  if (area_type !== 'all_india') {
    if (state_ids && state_ids.length > 0) {
      baseMatch['states'] = { $in: state_ids.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (state_names && state_names.length > 0) {
      baseMatch['state_name'] = { $in: state_names };
    }

    if (district_ids && district_ids.length > 0) {
      baseMatch['districts'] = { $in: district_ids.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (district_names && district_names.length > 0) {
      baseMatch['district_name'] = { $in: district_names };
    }
  }

  // Fetch all potential candidates in the targeted area
  const allCandidates = await EpcAccount.find(baseMatch)
    .select('name email whatsapp state_name district_name gst_verification_status is_gstin_active created_at')
    .lean();

  if (!allCandidates || allCandidates.length === 0) {
    return {
      total_eligible: 0,
      total_excluded: 0,
      recipients: [],
      sample_preview: [],
      consent_breakdown: { email_consented: 0, whatsapp_consented: 0 }
    };
  }

  // 1.5 Fetch active unsubscribed contacts
  let unsubscribedEmailSet = new Set();
  let unsubscribedPhoneSet = new Set();
  try {
    const { MarketingUnsubscribe } = require('../models');
    const unsubs = await MarketingUnsubscribe.find({ is_active: true }).select('email phone').lean();
    for (const u of unsubs) {
      if (u.email) unsubscribedEmailSet.add(u.email.toLowerCase().trim());
      if (u.phone) unsubscribedPhoneSet.add(u.phone.trim());
    }
  } catch (err) {
    // Non-fatal
  }

  // 1.6 Fetch EPC Preferences & Consents for Industry / Kit / Channel filtering
  const allEpcIds = allCandidates.map(c => c._id);
  const [prefDocs, consentDocs] = await Promise.all([
    EpcPreference.find({ epc_id: { $in: allEpcIds }, deleted_at: null }).lean(),
    EpcMarketingConsent.find({ epc_id: { $in: allEpcIds }, is_active: true, withdrawn_at: null }).lean()
  ]);

  const prefMap = new Map();
  for (const p of prefDocs) {
    prefMap.set(String(p.epc_id), p);
  }

  const consentMap = new Map();
  for (const c of consentDocs) {
    consentMap.set(String(c.epc_id), c);
  }

  // 2. Identify Buyer EPC IDs by querying epc_orders
  let buyerEpcIdSet = new Set();
  let buyerLastOrderMap = new Map();

  try {
    if (EpcOrder) {
      const orders = await EpcOrder.find({
        order_status: { $nin: ['cancelled', 'rejected'] }
      })
        .select('epc_id created_at')
        .sort({ created_at: -1 })
        .lean();

      for (const ord of orders) {
        if (ord.epc_id) {
          const strId = String(ord.epc_id);
          buyerEpcIdSet.add(strId);
          if (!buyerLastOrderMap.has(strId)) {
            buyerLastOrderMap.set(strId, new Date(ord.created_at));
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal
  }

  // 3. Classify Each EPC and Apply Overlap Deduplication & Channel Consent
  const eligibleMap = new Map(); // Key: epc._id (Guarantees exactly ONE recipient per EPC)
  let excludedCount = 0;
  let emailConsentedCount = 0;
  let whatsappConsentedCount = 0;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - last_order_days * 24 * 60 * 60 * 1000);

  for (const epc of allCandidates) {
    const epcIdStr = String(epc._id);
    const isBuyer = buyerEpcIdSet.has(epcIdStr);
    const isVerified =
      ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
      epc.is_gstin_active === true;
    const isRegistered = true;

    // Check Exclusions
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

    // Check Unsubscribe Filter
    const cleanEmail = (epc.email || '').toLowerCase().trim();
    const cleanPhone = (epc.whatsapp || '').trim();
    if (cleanEmail && unsubscribedEmailSet.has(cleanEmail)) {
      excludedCount++;
      continue;
    }
    if (cleanPhone && unsubscribedPhoneSet.has(cleanPhone)) {
      excludedCount++;
      continue;
    }

    // Check Inclusion Criteria (Matches ANY selected group)
    let isIncluded = false;
    if (epc_groups.buyer_epc && isBuyer) isIncluded = true;
    if (epc_groups.verified_epc && isVerified) isIncluded = true;
    if (epc_groups.registered_epc && isRegistered) isIncluded = true;

    if (!isIncluded) continue;

    // Check Purchase Activity Filter
    if (purchase_activity === 'never_purchased' && isBuyer) {
      excludedCount++;
      continue;
    }
    if (purchase_activity === 'active_buyer') {
      const lastOrd = buyerLastOrderMap.get(epcIdStr);
      if (!isBuyer || !lastOrd || lastOrd < cutoffDate) {
        excludedCount++;
        continue;
      }
    }
    if (purchase_activity === 'inactive_buyer') {
      const lastOrd = buyerLastOrderMap.get(epcIdStr);
      if (!isBuyer || !lastOrd || lastOrd >= cutoffDate) {
        excludedCount++;
        continue;
      }
    }

    // ── Check Industry & Kit Preferences (Section 5 of PRD) ──
    const pref = prefMap.get(epcIdStr);
    if (industry_ids && industry_ids.length > 0) {
      const epcInds = (pref?.selected_industry_ids || []).map(String);
      const hasInd = industry_ids.some(id => epcInds.includes(String(id)));
      if (!hasInd) {
        excludedCount++;
        continue;
      }
    }

    if (subcategory_ids && subcategory_ids.length > 0) {
      const epcSubs = (pref?.selected_subcategory_ids || []).map(String);
      const hasSub = subcategory_ids.some(id => epcSubs.includes(String(id)));
      if (!hasSub) {
        excludedCount++;
        continue;
      }
    }

    if (kit_ids && kit_ids.length > 0) {
      const epcKits = (pref?.selected_kit_ids || []).map(String);
      const hasKit = kit_ids.some(id => epcKits.includes(String(id)));
      if (!hasKit) {
        excludedCount++;
        continue;
      }
    }

    // ── Check Marketing Consent (Section 4 & 7 of PRD) ──
    const consent = consentMap.get(epcIdStr);
    const hasEmailConsent = Boolean(
      (consent && consent.email_consent) || (pref && pref.email_marketing_consent)
    );
    const hasWhatsappConsent = Boolean(
      (consent && consent.whatsapp_consent) || (pref && pref.whatsapp_marketing_consent)
    );

    if (hasEmailConsent) emailConsentedCount++;
    if (hasWhatsappConsent) whatsappConsentedCount++;

    if (require_consent && channel) {
      if (channel === 'email' && !hasEmailConsent) {
        excludedCount++;
        continue;
      }
      if (channel === 'whatsapp' && !hasWhatsappConsent) {
        excludedCount++;
        continue;
      }
      if (channel === 'both' && !hasEmailConsent && !hasWhatsappConsent) {
        excludedCount++;
        continue;
      }
    }

    // Store in deduplicated map
    eligibleMap.set(epcIdStr, {
      epc_id: epc._id,
      name: epc.name || 'Solar EPC Partner',
      phone: epc.whatsapp || '',
      email: epc.email || '',
      state_name: epc.state_name || '',
      district_name: epc.district_name || '',
      is_verified: isVerified,
      is_buyer: isBuyer,
      has_email_consent: hasEmailConsent,
      has_whatsapp_consent: hasWhatsappConsent,
      status: 'queued'
    });
  }

  const recipients = Array.from(eligibleMap.values());

  return {
    total_eligible: recipients.length,
    total_excluded: excludedCount,
    sample_preview: recipients.slice(0, 8),
    recipients,
    consent_breakdown: {
      email_consented: emailConsentedCount,
      whatsapp_consented: whatsappConsentedCount
    }
  };
};

module.exports = {
  resolveAudience
};
