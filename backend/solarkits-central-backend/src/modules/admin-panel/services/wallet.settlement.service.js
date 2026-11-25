/**
 * wallet.settlement.service.js
 *
 * Idempotent wallet settlement engine.
 *
 * On EPC order confirmation:
 *   1. Company margin  → credited to platform (tracked via platform_commission fields)
 *   2. Reseller margin → credited to reseller wallet (pending → available after settlement window)
 *   3. EPC margin      → credited to EPC wallet (pending → available after settlement window)
 *
 * On cancellation / refund:
 *   - Reverses any pending or available ledger entries.
 *   - Returns funds to their respective sources.
 *
 * Idempotency key format: `<entity_type>:<entityId>:<role>:<version>`
 */

const mongoose = require('mongoose');
const {
  ResellerWallet,
  ResellerWalletLedger,
  EpcWallet,
  EpcWalletLedger,
  EpcAccount,
} = require('../models/india_solarshop_db');

const SETTLEMENT_PERIOD_DAYS = 7; // Default settlement window

// ─── Helper: upsert reseller wallet ──────────────────────────────────────────
async function ensureResellerWallet(resellerId) {
  let wallet = await ResellerWallet.findOne({ reseller_id: resellerId });
  if (!wallet) {
    wallet = await ResellerWallet.create({
      reseller_id: resellerId,
      available_balance: 0,
      pending_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
    });
  }
  return wallet;
}

// ─── Helper: upsert EPC wallet ────────────────────────────────────────────────
async function ensureEpcWallet(epcAccountId) {
  let wallet = await EpcWallet.findOne({ epc_account_id: epcAccountId });
  if (!wallet) {
    wallet = await EpcWallet.create({ epc_account_id: epcAccountId });
  }
  return wallet;
}

// ─── Credit reseller margin on EPC order ─────────────────────────────────────
async function creditResellerMargin({ resellerId, orderId, orderNumber, marginPaise, settlementDays = SETTLEMENT_PERIOD_DAYS }) {
  if (!resellerId || !marginPaise || marginPaise <= 0) return null;

  const idempotencyKey = `epc_order:${orderId}:reseller_margin:v1`;

  // Check if already credited (idempotency)
  const existing = await ResellerWalletLedger.findOne({ idempotency_key: idempotencyKey });
  if (existing) {
    console.log(`[settlement] Reseller margin already credited for order ${orderNumber} — skipping`);
    return existing;
  }

  const wallet = await ensureResellerWallet(resellerId);
  const newPendingPaise = (wallet.pending_balance_paise || 0) + marginPaise;

  const ledger = await ResellerWalletLedger.create({
    reseller_id: new mongoose.Types.ObjectId(resellerId.toString()),
    transaction_type: 'commission_credit',
    amount: marginPaise / 100,
    balance_type: 'pending',
    balance_after: newPendingPaise / 100,
    gross_amount_paise: marginPaise,
    net_amount_paise: marginPaise,
    balance_after_paise: newPendingPaise,
    reference_order_id: new mongoose.Types.ObjectId(orderId.toString()),
    idempotency_key: idempotencyKey,
    narration: `Reseller margin for EPC order ${orderNumber}`,
  });

  // Update wallet pending balance
  await ResellerWallet.findOneAndUpdate(
    { reseller_id: new mongoose.Types.ObjectId(resellerId.toString()) },
    {
      $inc: {
        pending_balance: marginPaise / 100,
        pending_balance_paise: marginPaise,
        total_earned: marginPaise / 100,
        total_earned_paise: marginPaise,
      },
    },
    { upsert: true }
  );

  console.log(`[settlement] Credited ₹${(marginPaise / 100).toFixed(2)} reseller margin (pending) for order ${orderNumber}`);
  return ledger;
}

// ─── Credit EPC margin on EPC order ──────────────────────────────────────────
async function creditEpcMargin({ epcAccountId, orderId, orderNumber, marginPaise, settlementDays = SETTLEMENT_PERIOD_DAYS }) {
  if (!epcAccountId || !marginPaise || marginPaise <= 0) return null;

  const idempotencyKey = `epc_order:${orderId}:epc_margin:v1`;

  // Check if already credited (idempotency)
  const existing = await EpcWalletLedger.findOne({ idempotency_key: idempotencyKey });
  if (existing) {
    console.log(`[settlement] EPC margin already credited for order ${orderNumber} — skipping`);
    return existing;
  }

  const settleAfter = new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000);

  const ledger = await EpcWalletLedger.create({
    epc_account_id: new mongoose.Types.ObjectId(epcAccountId.toString()),
    reference_type: 'epc_order_commission',
    reference_id: new mongoose.Types.ObjectId(orderId.toString()),
    idempotency_key: idempotencyKey,
    credit_paise: marginPaise,
    debit_paise: 0,
    net_paise: marginPaise,
    status: 'pending',
    settle_after: settleAfter,
    description: `EPC margin earned on order ${orderNumber}`,
    created_by_type: 'system',
  });

  // Update EPC wallet pending balance
  await ensureEpcWallet(epcAccountId);
  await EpcWallet.findOneAndUpdate(
    { epc_account_id: new mongoose.Types.ObjectId(epcAccountId.toString()) },
    {
      $inc: {
        pending_paise: marginPaise,
        lifetime_earned_paise: marginPaise,
      },
    },
    { upsert: true }
  );

  console.log(`[settlement] Credited ₹${(marginPaise / 100).toFixed(2)} EPC margin (pending) for order ${orderNumber}`);
  return ledger;
}

// ─── Settle pending entries when window expires ───────────────────────────────
// NOTE: Only EPC wallet entries are managed here. Reseller wallet settlement
// uses the existing commission.service flow which has its own lifecycle.
async function runSettlementCycle() {
  const now = new Date();

  // Settle EPC pending entries only
  const epcPending = await EpcWalletLedger.find({
    status: 'pending',
    settle_after: { $lte: now },
  });

  for (const entry of epcPending) {
    await EpcWalletLedger.findByIdAndUpdate(entry._id, {
      $set: { status: 'available', settled_at: now },
    });
    await EpcWallet.findOneAndUpdate(
      { epc_account_id: entry.epc_account_id },
      {
        $inc: { balance_paise: entry.net_paise, pending_paise: -entry.net_paise },
        $set: { last_settlement_at: now },
      }
    );
  }

  console.log(`[settlement] EPC cycle complete — settled ${epcPending.length} EPC entries`);
}

// ─── Reverse EPC entries on cancellation/refund ──────────────────────────────
// NOTE: Reseller reversal uses the existing payout_reversal transaction type
// handled by the reseller.commission.service — not managed here.
async function reverseOrderMargins({ orderId, orderNumber, reason = 'Order cancelled/refunded' }) {
  const now = new Date();
  const orderObjId = new mongoose.Types.ObjectId(orderId.toString());

  // Reverse EPC wallet entries only
  const epcEntries = await EpcWalletLedger.find({
    reference_id: orderObjId,
    reference_type: 'epc_order_commission',
    status: { $in: ['pending', 'available'] },
  });

  for (const entry of epcEntries) {
    const refundPaise = entry.net_paise;
    await EpcWalletLedger.findByIdAndUpdate(entry._id, {
      $set: { status: 'reversed', reversed_at: now, reversal_reason: reason },
    });

    const update = entry.status === 'pending'
      ? { $inc: { pending_paise: -refundPaise, lifetime_earned_paise: -refundPaise } }
      : { $inc: { balance_paise: -refundPaise, lifetime_earned_paise: -refundPaise } };
    await EpcWallet.findOneAndUpdate({ epc_account_id: entry.epc_account_id }, update);
  }

  console.log(`[settlement] Reversed EPC margins for order ${orderNumber} — ${epcEntries.length} EPC entries reversed`);
}

module.exports = {
  creditResellerMargin,
  creditEpcMargin,
  runSettlementCycle,
  reverseOrderMargins,
};
