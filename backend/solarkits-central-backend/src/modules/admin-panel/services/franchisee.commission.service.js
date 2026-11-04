/**
 * franchisee.commission.service.js
 *
 * Commission calculation and settlement engine for Franchisee Purchase Orders.
 *
 * Supports:
 *   PERCENTAGE    — commission = eligible_order_amount × commission_percentage / 100
 *   FIXED_PER_KIT — commission = eligible_delivered_kit_qty × fixed_amount_per_kit_paise / 100 (INR)
 *
 * All amounts in integer Paise (1 INR = 100 Paise).
 * Idempotency key prevents duplicate commission credits.
 * Reversal handles partial returns and cancellations proportionally.
 */

const mongoose = require('mongoose');
const {
  FranchiseeCommissionRule,
  FpoCommissionLedger,
  FpoOrder,
  ResellerPlan,
  ResellerWallet,
  ResellerWalletLedger,
  SolarShopSettings,
} = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

/**
 * Resolve the active commission rule for a plan (and optionally specific combo kit) at a given date.
 * Priority: Specific ComboKit FranchiseeCommissionRule > Plan-level FranchiseeCommissionRule > Plan-level direct settings.
 *
 * @param {string|ObjectId} plan_id
 * @param {string|ObjectId|Date} [combo_kit_id_or_asOf]
 * @param {Date} [asOf]
 * @returns {Promise<object|null>}
 */
async function resolveCommissionRule(plan_id, combo_kit_id_or_asOf = null, asOf = null) {
  let combo_kit_id = null;
  let dateToUse = asOf;

  if (combo_kit_id_or_asOf instanceof Date) {
    dateToUse = combo_kit_id_or_asOf;
  } else if (combo_kit_id_or_asOf) {
    combo_kit_id = combo_kit_id_or_asOf;
  }

  const now = dateToUse || new Date();
  const baseQuery = {
    plan_id,
    is_active: true,
    deleted_at: null,
    effective_from: { $lte: now },
    $or: [{ effective_until: null }, { effective_until: { $gte: now } }],
  };

  let rule = null;

  // 1. First priority: Specific Combo Kit rule if kit_id is provided
  if (combo_kit_id) {
    rule = await FranchiseeCommissionRule.findOne({ ...baseQuery, combo_kit_id })
      .sort({ effective_from: -1 })
      .lean();
  }

  // 2. Second priority: Any active rule for the plan
  if (!rule) {
    rule = await FranchiseeCommissionRule.findOne(baseQuery)
      .sort({ effective_from: -1 })
      .lean();
  }

  // 3. Fallback to plan direct defaults
  if (!rule && plan_id) {
    const plan = await ResellerPlan.findOne({ _id: plan_id, deleted_at: null }).lean();
    if (plan) {
      rule = {
        plan_id: plan._id,
        commission_method: plan.commission_method || 'PERCENTAGE',
        commission_percentage: plan.default_commission_rate ?? 8,
        fixed_amount_per_kit_paise: plan.fixed_amount_per_kit_paise || 0,
        min_eligible_quantity: plan.min_eligible_quantity || 0,
        max_commission_paise: plan.max_commission_paise || null,
        calculation_stage: 'RETURN_PERIOD_COMPLETED',
        settlement_rule: 'MONTHLY_BATCH',
      };
    }
  }

  return rule;
}

/**
 * Calculate commission (pure function — no DB side effects).
 *
 * @param {object} params
 * @param {object} params.commission_rule - From resolveCommissionRule()
 * @param {number} params.eligible_kit_quantity - Delivered - returned - cancelled
 * @param {number} params.gross_eligible_paise - Eligible order value in paise (for PERCENTAGE)
 * @returns {{ commission_paise: number, capped: boolean }}
 */
function calculateCommissionAmount({ commission_rule, eligible_kit_quantity, gross_eligible_paise }) {
  let commission_paise = 0;

  if (!commission_rule) {
    return { commission_paise: 0, capped: false };
  }

  if (commission_rule.commission_method === 'PERCENTAGE') {
    commission_paise = Math.round(gross_eligible_paise * (commission_rule.commission_percentage / 100));
  } else if (commission_rule.commission_method === 'FIXED_PER_KIT') {
    commission_paise = Math.round(eligible_kit_quantity * (commission_rule.fixed_amount_per_kit_paise || 0));
  }

  const minQty = commission_rule.min_eligible_quantity || 0;
  if (eligible_kit_quantity < minQty) {
    return { commission_paise: 0, capped: false };
  }

  let capped = false;
  if (commission_rule.max_commission_paise !== null && commission_rule.max_commission_paise !== undefined) {
    if (commission_paise > commission_rule.max_commission_paise) {
      commission_paise = commission_rule.max_commission_paise;
      capped = true;
    }
  }

  return { commission_paise: Math.max(0, commission_paise), capped };
}

/**
 * Post commission to the franchisee wallet for a delivered FPO order.
 * Idempotent: safe to call multiple times for the same order.
 *
 * @param {object} params
 * @param {string|ObjectId} params.fpo_order_id
 * @param {string|ObjectId} [params.actor_id]
 * @param {object} [params.req]
 * @returns {Promise<object>}
 */
async function postCommission({ fpo_order_id, actor_id = null, req = null }) {
  const idempotencyKey = `FPO-COMMISSION-${fpo_order_id}`;

  // Idempotency check: only return early if wallet ledger is already linked
  let existing = await FpoCommissionLedger.findOne({ idempotency_key: idempotencyKey });
  if (existing && existing.wallet_ledger_id) {
    return {
      posted: true,
      already_posted: true,
      ledger: existing.toObject ? existing.toObject() : existing,
      message: `Commission for FPO order "${existing.po_number}" already posted.`,
    };
  }

  const order = await FpoOrder.findById(fpo_order_id).lean();
  if (!order) throw new Error(`FPO order "${fpo_order_id}" not found`);

  if (!['PAID', 'CONFIRMED', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
    throw new Error(`Commission can only be posted for PAID, CONFIRMED, DELIVERED or COMPLETED orders. Current status: ${order.status}`);
  }

  const commission_rule = order.commission_rule_snapshot
    ? order.commission_rule_snapshot
    : await resolveCommissionRule(order.plan_id);

  // Compute eligible quantities and commission from line items
  let eligible_kit_quantity = 0;
  let gross_eligible_paise = 0;
  let computed_commission_paise = 0;
  let isVariationMatched = false;

  if (order.total_commission_paise && order.total_commission_paise > 0) {
    computed_commission_paise = order.total_commission_paise;
    isVariationMatched = true;
    for (const item of (order.items || [])) {
      if (item.contributes_to_target === false) continue;
      const delivered = item.delivered_quantity || item.quantity || 0;
      const returned  = item.returned_quantity  || 0;
      const cancelled = item.cancelled_quantity || 0;
      const eligible  = Math.max(0, delivered - returned - cancelled);
      eligible_kit_quantity += eligible;
      gross_eligible_paise  += Math.round((item.unit_price_paise || 0) * eligible);
    }
  } else {
    for (const item of (order.items || [])) {
      if (item.contributes_to_target === false) continue;
      const delivered = item.delivered_quantity || item.quantity || 0;
      const returned  = item.returned_quantity  || 0;
      const cancelled = item.cancelled_quantity || 0;
      const eligible  = Math.max(0, delivered - returned - cancelled);
      eligible_kit_quantity += eligible;
      const itemSubtotal = Math.round((item.unit_price_paise || 0) * eligible);
      gross_eligible_paise  += itemSubtotal;

      // Check individual variation commission configured in Franchise Commission Settings
      if (order.franchisee_id && (item.combo_kit_id || item.kit_id)) {
        let varComm = await resolveVariationCommission({
          reseller_id: order.franchisee_id,
          combo_kit_id: item.combo_kit_id || item.kit_id,
          quantity: eligible,
          order_type: 'po',
        });
        if (varComm === null || varComm < 0) {
          varComm = await resolveVariationCommission({
            reseller_id: order.franchisee_id,
            combo_kit_id: item.combo_kit_id || item.kit_id,
            quantity: eligible,
            order_type: 'loose',
          });
        }
        if (varComm !== null && varComm >= 0) {
          computed_commission_paise += varComm;
          isVariationMatched = true;
          continue;
        }
      }

      // Check item-level commission_snapshot
      if (item.commission_snapshot != null && item.commission_snapshot > 0) {
        const itemComm = Math.round(itemSubtotal * (Number(item.commission_snapshot) / 10000));
        computed_commission_paise += itemComm;
      }
    }
  }

  let commission_paise = 0;
  let capped = false;

  if (computed_commission_paise > 0) {
    commission_paise = computed_commission_paise;
  } else {
    const calc = calculateCommissionAmount({
      commission_rule: commission_rule || { commission_method: 'PERCENTAGE', commission_percentage: 2 },
      eligible_kit_quantity,
      gross_eligible_paise,
    });
    commission_paise = calc.commission_paise;
    capped = calc.capped;
  }

  if (commission_paise <= 0) {
    return { posted: false, reason: 'Calculated commission is zero. No ledger entry created.' };
  }

  // Fetch TDS/TCS settings (default: 5% Section 194H TDS)
  const settings = await SolarShopSettings.findOne().lean();
  const tdsRatePct = settings?.tds_rate_pct != null ? settings.tds_rate_pct : 5.0;
  const tcsRatePct = settings?.tcs_rate_pct != null ? settings.tcs_rate_pct : 0.0;

  const tds_paise = Math.round(commission_paise * (tdsRatePct / 100));
  const tcs_paise = Math.round(commission_paise * (tcsRatePct / 100));
  const net_commission_paise = Math.max(0, commission_paise - tds_paise - tcs_paise);

  // Write or reuse commission ledger entry
  let ledger = existing;
  if (!ledger) {
    ledger = await FpoCommissionLedger.create({
      franchisee_id:        order.franchisee_id,
      fpo_order_id:         order._id,
      po_number:            order.po_number,
      commission_method:    commission_rule?.commission_method || 'PERCENTAGE',
      eligible_kit_quantity,
      gross_eligible_paise,
      commission_paise,
      tds_paise,
      tcs_paise,
      net_commission_paise,
      max_cap_applied:      capped,
      commission_rule_id:   commission_rule?._id || null,
      calculation_stage:    commission_rule?.calculation_stage || 'ORDER_CONFIRMED',
      settlement_status:    'PENDING',
      idempotency_key:      idempotencyKey,
      created_by:           actor_id,
    });
  }

  // Update FPO order flags
  await FpoOrder.findByIdAndUpdate(fpo_order_id, {
    $set: {
      commission_posted:      true,
      commission_ledger_id:   ledger._id,
      total_commission_paise: net_commission_paise,
    },
  });

  // Credit reseller wallet (same wallet as existing EPC commission flow)
  const walletIdempotencyKey = `FPO-WALLET-${fpo_order_id}`;
  const walletExisting = await ResellerWalletLedger.findOne({ idempotency_key: walletIdempotencyKey }).lean();

  if (!walletExisting) {
    let wallet = await ResellerWallet.findOne({ reseller_id: order.franchisee_id });
    if (!wallet) wallet = await ResellerWallet.create({ reseller_id: order.franchisee_id });

    const newBalancePaise     = (wallet.available_balance_paise || 0) + net_commission_paise;
    const newGrossEarnedPaise = (wallet.gross_earned_paise || 0) + commission_paise;
    const newTotalEarnedPaise = (wallet.total_earned_paise || 0) + net_commission_paise;
    const newTdsPaise         = (wallet.tds_deducted_paise || 0) + tds_paise;
    const newTcsPaise         = (wallet.tcs_deducted_paise || 0) + tcs_paise;

    wallet.available_balance_paise = newBalancePaise;
    wallet.gross_earned_paise      = newGrossEarnedPaise;
    wallet.total_earned_paise      = newTotalEarnedPaise;
    wallet.tds_deducted_paise      = newTdsPaise;
    wallet.tcs_deducted_paise      = newTcsPaise;
    wallet.available_balance       = Math.round(newBalancePaise) / 100;
    wallet.total_earned            = Math.round(newTotalEarnedPaise) / 100;
    await wallet.save();

    const walletLedger = await ResellerWalletLedger.create({
      reseller_id:        order.franchisee_id,
      transaction_type:   'po_commission_credit',
      amount:             net_commission_paise / 100,
      balance_type:       'available',
      balance_after:      newBalancePaise / 100,
      gross_amount_paise: commission_paise,
      tds_amount_paise:   tds_paise,
      tcs_amount_paise:   tcs_paise,
      net_amount_paise:   net_commission_paise,
      balance_after_paise: newBalancePaise,
      reference_order_id: order._id,
      idempotency_key:    walletIdempotencyKey,
      narration: `FPO Commission (${order.po_number}): ${
        isVariationMatched || (order.total_commission_paise && order.total_commission_paise > 0)
          ? `Tier Rate (${eligible_kit_quantity} Kits)`
          : commission_rule.commission_method === 'FIXED_PER_KIT'
            ? `${eligible_kit_quantity} kits × ₹${(commission_rule.fixed_amount_per_kit_paise / 100).toFixed(2)}`
            : `Tier Margin (${eligible_kit_quantity} Kits)`
      } = ₹${(net_commission_paise / 100).toFixed(2)} (net)`,
      created_by: actor_id,
    });

    await FpoCommissionLedger.findByIdAndUpdate(ledger._id, {
      $set: { wallet_ledger_id: walletLedger._id, settlement_status: 'SETTLED', settled_at: new Date() },
    });
  }

  await logAudit({
    actor_type:     actor_id ? 'cms_user' : 'system',
    actor_id:       actor_id || order.franchisee_id,
    action:         'FPO_COMMISSION_POSTED',
    entity_type:    'fpo_commission_ledgers',
    entity_id:      ledger._id,
    after_snapshot: {
      order_id:             order._id,
      po_number:            order.po_number,
      commission_paise,
      net_commission_paise,
      eligible_kit_quantity,
    },
    req,
  });

  return {
    posted:                 true,
    already_posted:         false,
    po_number:              order.po_number,
    commission_method:      commission_rule.commission_method,
    eligible_kit_quantity,
    gross_eligible_paise,
    commission_paise,
    tds_paise,
    tcs_paise,
    net_commission_paise,
    ledger,
  };
}

/**
 * Reverse or reduce commission after a return or partial cancellation.
 * Posts a negative adjustment entry.
 *
 * @param {object} params
 * @param {string|ObjectId} params.fpo_order_id
 * @param {number} params.returned_kit_quantity - Quantity being returned/cancelled
 * @param {string} params.reason
 * @param {string|ObjectId} [params.actor_id]
 * @param {object} [params.req]
 */
async function reverseCommission({ fpo_order_id, returned_kit_quantity, reason, actor_id = null, req = null }) {
  const order = await FpoOrder.findById(fpo_order_id).lean();
  if (!order) throw new Error(`FPO order "${fpo_order_id}" not found`);

  const originalLedger = await FpoCommissionLedger.findOne({
    fpo_order_id,
    settlement_status: 'SETTLED',
  }).lean();

  if (!originalLedger) {
    return { reversed: false, reason: 'No settled commission found to reverse.' };
  }

  if (returned_kit_quantity <= 0) {
    return { reversed: false, reason: 'Return quantity must be positive.' };
  }

  const reversalIdempotencyKey = `FPO-REVERSAL-${fpo_order_id}-${Date.now()}`;
  const originalQty   = originalLedger.eligible_kit_quantity || 1;
  const proportion    = Math.min(returned_kit_quantity / originalQty, 1);
  const reversal_commission_paise     = Math.round(originalLedger.commission_paise * proportion);
  const reversal_net_commission_paise = Math.round(originalLedger.net_commission_paise * proportion);
  const reversal_tds_paise = Math.round(originalLedger.tds_paise * proportion);
  const reversal_tcs_paise = Math.round(originalLedger.tcs_paise * proportion);

  // Create reversal ledger entry
  const reversalLedger = await FpoCommissionLedger.create({
    franchisee_id:        order.franchisee_id,
    fpo_order_id:         order._id,
    po_number:            order.po_number,
    commission_method:    originalLedger.commission_method,
    eligible_kit_quantity: -returned_kit_quantity,
    gross_eligible_paise:  -Math.round(originalLedger.gross_eligible_paise * proportion),
    commission_paise:      -reversal_commission_paise,
    tds_paise:             -reversal_tds_paise,
    tcs_paise:             -reversal_tcs_paise,
    net_commission_paise:  -reversal_net_commission_paise,
    commission_rule_id:    originalLedger.commission_rule_id,
    calculation_stage:     originalLedger.calculation_stage,
    settlement_status:     'REVERSED',
    reversed_at:           new Date(),
    reversal_reason:       reason,
    idempotency_key:       reversalIdempotencyKey,
    created_by:            actor_id,
  });

  // Deduct from wallet
  let wallet = await ResellerWallet.findOne({ reseller_id: order.franchisee_id });
  if (wallet) {
    wallet.available_balance_paise = Math.max(0, (wallet.available_balance_paise || 0) - reversal_net_commission_paise);
    wallet.available_balance = Math.round(wallet.available_balance_paise) / 100;
    await wallet.save();

    await ResellerWalletLedger.create({
      reseller_id:        order.franchisee_id,
      transaction_type:   'po_commission_reversal',
      amount:             -(reversal_net_commission_paise / 100),
      balance_type:       'available',
      balance_after:      wallet.available_balance,
      gross_amount_paise: -reversal_commission_paise,
      tds_amount_paise:   -reversal_tds_paise,
      tcs_amount_paise:   -reversal_tcs_paise,
      net_amount_paise:   -reversal_net_commission_paise,
      balance_after_paise: wallet.available_balance_paise,
      reference_order_id: order._id,
      idempotency_key:    `FPO-WALLET-REVERSAL-${fpo_order_id}-${Date.now()}`,
      narration: `FPO Commission Reversal (${order.po_number}): ${returned_kit_quantity} kits returned. Reason: ${reason}`,
      created_by: actor_id,
    });
  }

  await logAudit({
    actor_type:  actor_id ? 'cms_user' : 'system',
    actor_id:    actor_id || order.franchisee_id,
    action:      'FPO_COMMISSION_REVERSED',
    entity_type: 'fpo_commission_ledgers',
    entity_id:   reversalLedger._id,
    after_snapshot: {
      order_id:               order._id,
      returned_kit_quantity,
      reversal_commission:    reversal_commission_paise,
      reversal_net:           reversal_net_commission_paise,
      reason,
    },
    req,
  });

  // Update FPO order total commission
  const totalLedgers = await FpoCommissionLedger.aggregate([
    { $match: { fpo_order_id: new mongoose.Types.ObjectId(fpo_order_id) } },
    { $group: { _id: null, total: { $sum: '$net_commission_paise' } } },
  ]);
  const newTotal = Math.max(0, totalLedgers[0]?.total || 0);
  await FpoOrder.findByIdAndUpdate(fpo_order_id, { $set: { total_commission_paise: newTotal } });

  return {
    reversed: true,
    returned_kit_quantity,
    reversal_commission_paise,
    reversal_net_commission_paise,
    reversal_ledger: reversalLedger,
  };
}

/**
 * Resolve variation commission for an EPC or Franchise order.
 *
 * @param {object} params
 * @param {string|ObjectId} params.reseller_id
 * @param {string|ObjectId} params.combo_kit_id
 * @param {number} params.quantity
 * @param {string} [params.order_type='loose'] - 'loose' (EPC/retail order) | 'po' (Franchise bulk PO)
 * @returns {Promise<number|null>} commission in paise for this item, or null if no variation rule configured
 */
async function resolveVariationCommission({ reseller_id, combo_kit_id, quantity, order_type = 'loose' }) {
  if (!reseller_id || !combo_kit_id || !quantity) return null;

  const { FranchiseeVariationCommission } = require('../models/india_solarshop_db');
  const variationRules = await FranchiseeVariationCommission.find({
    reseller_id,
    combo_kit_id,
    order_type,
    is_active: true,
    deleted_at: null,
  }).sort({ order_quantity: -1 }).lean();

  if (!variationRules || variationRules.length === 0) return null;

  const qty = parseInt(quantity, 10);

  // 1. Exact match on quantity tier (e.g. 5 kits ordered, 5 kits tier defined)
  const exact = variationRules.find((r) => r.order_quantity === qty);
  if (exact) return exact.commission_amount_paise;

  // 2. Nearest qualifying lower tier (e.g. 7 kits ordered, 5 kits tier defined)
  const lower = variationRules.find((r) => r.order_quantity <= qty);
  if (lower) return lower.commission_amount_paise;

  // 3. Fallback to lowest defined tier if quantity is less than minimum tier
  return variationRules[variationRules.length - 1]?.commission_amount_paise ?? null;
}

module.exports = {
  resolveCommissionRule,
  calculateCommissionAmount,
  resolveVariationCommission,
  postCommission,
  reverseCommission,
};
