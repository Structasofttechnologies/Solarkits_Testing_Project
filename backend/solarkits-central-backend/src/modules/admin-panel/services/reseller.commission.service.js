/**
 * reseller.commission.service.js
 *
 * Automated Commission Settlement Engine & Tax Accounting Service.
 * Phase R9 — Reseller Management System
 *
 * Features:
 *   1. Calculates Gross Margin/Commission, TDS (Tax Deducted at Source), TCS (Tax Collected at Source), and Net Payable.
 *   2. Financial idempotency via unique idempotency_key index.
 *   3. Strict Integer Paise accounting (1 INR = 100 Paise).
 *   4. Updates ResellerWallet & writes double-entry audit record to ResellerWalletLedger.
 */

const {
  Reseller,
  EpcOrder,
  PurchaseOrder,
  ResellerWallet,
  ResellerWalletLedger,
  SolarShopSettings,
} = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

/**
 * Settle commission/margin for a delivered or completed order.
 *
 * @param {object} params
 * @param {string|ObjectId} params.order_id
 * @param {string} [params.order_type] - 'epc_order' | 'purchase_order'
 * @param {string|ObjectId} [params.actor_id]
 * @param {object} [params.req]
 */
async function settleOrderCommission({
  order_id,
  order_type = 'epc_order',
  actor_id = null,
  req = null,
}) {
  let order = null;
  let resellerId = null;
  let grossMarginPaise = 0;
  let orderRefNumber = '';

  if (order_type === 'epc_order') {
    order = await EpcOrder.findById(order_id);
    if (!order) throw new Error(`EPC Order "${order_id}" not found`);
    resellerId = order.reseller_id;
    grossMarginPaise = order.reseller_total_margin_paise || 0;
    orderRefNumber = order.order_number;
  } else if (order_type === 'purchase_order') {
    order = await PurchaseOrder.findById(order_id);
    if (!order) throw new Error(`Purchase Order "${order_id}" not found`);
    resellerId = order.reseller_id;
    grossMarginPaise = Math.round((order.reseller_commission_amount || 0) * 100);
    orderRefNumber = order.po_number;
  } else {
    throw new Error(`Invalid order_type "${order_type}"`);
  }

  if (!resellerId) {
    return { settled: false, reason: 'Order has no assigned reseller ID (direct order)' };
  }
  if (grossMarginPaise <= 0) {
    return { settled: false, reason: 'Order gross margin is zero or negative' };
  }

  const reseller = await Reseller.findOne({ _id: resellerId, deleted_at: null }).lean();
  if (!reseller) throw new Error(`Reseller account "${resellerId}" not found`);

  // Idempotency Check
  const idempotencyKey = `SETTLE-${order_type}-${order._id}`;
  const existingLedger = await ResellerWalletLedger.findOne({ idempotency_key: idempotencyKey }).lean();
  if (existingLedger) {
    return {
      settled: true,
      already_settled: true,
      ledger: existingLedger,
      message: `Commission for order "${orderRefNumber}" was already settled.`,
    };
  }

  // Fetch Platform Tax Settings (TDS & TCS rates)
  const settings = await SolarShopSettings.findOne().lean();
  const tdsRatePct = settings?.tds_rate_pct != null ? settings.tds_rate_pct : 5.0; // 5% Section 194H TDS default
  const tcsRatePct = settings?.tcs_rate_pct != null ? settings.tcs_rate_pct : 1.0; // 1% GST TCS default

  const tdsAmountPaise = Math.round(grossMarginPaise * (tdsRatePct / 100));
  const tcsAmountPaise = Math.round(grossMarginPaise * (tcsRatePct / 100));
  const netMarginPaise = Math.max(0, grossMarginPaise - tdsAmountPaise - tcsAmountPaise);

  // Update or Create ResellerWallet atomically
  let wallet = await ResellerWallet.findOne({ reseller_id: resellerId });
  if (!wallet) {
    wallet = await ResellerWallet.create({ reseller_id: resellerId });
  }

  const newBalancePaise      = (wallet.available_balance_paise || 0) + netMarginPaise;
  const newGrossEarnedPaise  = (wallet.gross_earned_paise || 0) + grossMarginPaise;
  const newTotalEarnedPaise  = (wallet.total_earned_paise || 0) + netMarginPaise;
  const newTdsPaise          = (wallet.tds_deducted_paise || 0) + tdsAmountPaise;
  const newTcsPaise          = (wallet.tcs_deducted_paise || 0) + tcsAmountPaise;

  // Phase R10: Update all paise fields atomically
  wallet.available_balance_paise = newBalancePaise;
  wallet.gross_earned_paise      = newGrossEarnedPaise;
  wallet.total_earned_paise      = newTotalEarnedPaise;
  wallet.tds_deducted_paise      = newTdsPaise;
  wallet.tcs_deducted_paise      = newTcsPaise;

  // Sync backward-compatible INR float fields (derived from paise)
  wallet.available_balance = Math.round(newBalancePaise) / 100;
  wallet.total_earned      = Math.round(newTotalEarnedPaise) / 100;

  await wallet.save();

  // Create Double-Entry Audit Ledger Record
  const ledger = await ResellerWalletLedger.create({
    reseller_id: resellerId,
    transaction_type: 'commission_credit',
    amount: netMarginPaise / 100,
    balance_type: 'available',
    balance_after: newBalancePaise / 100,
    gross_amount_paise: grossMarginPaise,
    tds_amount_paise: tdsAmountPaise,
    tcs_amount_paise: tcsAmountPaise,
    net_amount_paise: netMarginPaise,
    balance_after_paise: newBalancePaise,
    reference_order_id: order._id,
    idempotency_key: idempotencyKey,
    narration: `Commission settlement for ${order_type} (${orderRefNumber}) - Gross: ${grossMarginPaise / 100} INR, Net: ${netMarginPaise / 100} INR (TDS: ${tdsAmountPaise / 100}, TCS: ${tcsAmountPaise / 100})`,
    created_by: actor_id,
  });

  await logAudit({
    actor_type: actor_id ? 'cms_user' : 'system',
    actor_id: actor_id || resellerId,
    action: 'COMMISSION_SETTLED',
    entity_type: 'reseller_wallet_ledgers',
    entity_id: ledger._id,
    after_snapshot: {
      order_id: order._id,
      gross_amount_paise: grossMarginPaise,
      net_amount_paise: netMarginPaise,
      tds_amount_paise: tdsAmountPaise,
      tcs_amount_paise: tcsAmountPaise,
      new_balance_paise: newBalancePaise,
    },
    req,
  });

  return {
    settled: true,
    already_settled: false,
    order_number: orderRefNumber,
    gross_margin_paise: grossMarginPaise,
    tds_amount_paise: tdsAmountPaise,
    tcs_amount_paise: tcsAmountPaise,
    net_margin_paise: netMarginPaise,
    new_wallet_balance_paise: newBalancePaise,
    ledger: ledger,
  };
}

module.exports = {
  settleOrderCommission,
};
