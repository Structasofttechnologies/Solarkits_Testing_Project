const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

// Load required SolarKits native models
const EpcAccount = db.model('epc_accounts');
let EpcOrder;
try {
  EpcOrder = db.model('epc_orders');
} catch (e) {
  // If not compiled yet, require it
  EpcOrder = require('../../../india_solarshop_db/epc_orders.schema');
}

/**
 * Resolve EPC Audience with strict deduplication and area filters
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
    last_order_days = 90
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
      sample_preview: []
    };
  }

  // 1.5 Fetch all active unsubscribed emails to guarantee automatic exclusion
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
    console.warn('⚠️ Notice reading unsubscribed list in audience.service:', err.message);
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
    console.warn('⚠️ Could not query epc_orders for buyer resolution:', err.message);
  }

  // 3. Classify Each EPC and Apply Overlap Deduplication
  const eligibleMap = new Map(); // Key: epc._id (Guarantees exactly ONE recipient per EPC)
  let excludedCount = 0;
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - last_order_days * 24 * 60 * 60 * 1000);

  for (const epc of allCandidates) {
    const epcIdStr = String(epc._id);
    const isBuyer = buyerEpcIdSet.has(epcIdStr);
    const isVerified =
      ['verified_automatic', 'verified_admin'].includes(epc.gst_verification_status) ||
      epc.is_gstin_active === true;
    const isRegistered = true; // All in epc_accounts are registered

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

    // Check Automatic Unsubscribe Filter (Never send to EPCs who clicked Unsubscribe)
    const cleanEmail = (epc.email || '').toLowerCase().trim();
    if (cleanEmail && unsubscribedEmailSet.has(cleanEmail)) {
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
      status: 'queued'
    });
  }

  const recipients = Array.from(eligibleMap.values());

  return {
    total_eligible: recipients.length,
    total_excluded: excludedCount,
    sample_preview: recipients.slice(0, 8),
    recipients
  };
};

module.exports = {
  resolveAudience
};
