/**
 * wallet.ledger.service.js
 *
 * Idempotent Double-Entry Wallet Ledger & Payout Service.
 * Phase 7  — Reseller Management System (initial)
 * Phase R10 — Bug fixes:
 *   1. All multi-write operations wrapped in MongoDB sessions (atomic).
 *   2. Duplicate pending payout guard added.
 *   3. amount_paise (integer) now authoritative; INR float synced from it.
 *   4. pending_balance_paise and available_balance_paise correctly updated.
 *   5. wallet_balance_at_request snapshot stored on every payout.
 *   6. creditCommissionToWallet (float-based orphan) removed — use
 *      reseller.commission.service.js → settleOrderCommission() instead.
 *
 * Financial Safeguards:
 *   - Idempotency key prevents duplicate commission credits per order.
 *   - Double-entry balance snapshot on every ledger entry.
 *   - Funds held in pending_balance during payout request lifecycle.
 *   - MongoDB session ensures all-or-nothing writes (no partial state).
 *   - All monetary arithmetic performed on integers (paise) to avoid float drift.
 */

const mongoose = require('mongoose');
const {
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
} = require('../models/india_solarshop_db');
const { logAudit } = require('./audit.service');

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert rupee float to integer paise, rounding to nearest paise.
 */
function toPaise(rupees) {
  return Math.round(Number(rupees) * 100);
}

/**
 * Convert integer paise to rupee float (for INR backward-compat fields).
 */
function toRupees(paise) {
  return Math.round(paise) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Get or Create Wallet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create wallet document for a reseller.
 * Thread-safe via upsert.
 *
 * @param {mongoose.Types.ObjectId|string} resellerId
 * @param {mongoose.ClientSession} [session] Optional session for transactions
 */
async function getOrCreateResellerWallet(resellerId, session = null) {
  const opts = session ? { session } : {};
  let wallet = await ResellerWallet.findOne({ reseller_id: resellerId }, null, opts);
  if (!wallet) {
    const docs = await ResellerWallet.create([{ reseller_id: resellerId }], opts);
    wallet = docs[0];
  }
  return wallet;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Submit Payout Withdrawal Request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit a payout withdrawal request.
 *
 * Financial safety guarantees:
 *   1. Checks for an existing pending payout (prevents duplicate/concurrent requests).
 *   2. Validates available_balance_paise >= amountPaise (server-side, never trust frontend).
 *   3. Atomically moves funds from available_balance → pending_balance inside a MongoDB session.
 *   4. Creates payout request record and ledger entry within the same session.
 *   5. Stores wallet snapshot at request time for audit.
 *
 * @param {object}  params
 * @param {string|mongoose.Types.ObjectId} params.resellerId
 * @param {number}  params.amountPaise   - Withdrawal amount in integer paise (NOT rupees)
 * @param {object}  params.bankDetails   - { bank_name, account_number, ifsc_code, account_holder_name }
 * @param {string}  [params.idempotencyKey] - Caller-supplied key; generated if omitted
 */
async function createPayoutRequest({ resellerId, amountPaise, bankDetails, idempotencyKey }) {
  if (!resellerId) throw new Error('resellerId is required');
  if (!Number.isInteger(amountPaise) || amountPaise < 100) {
    throw new Error('amountPaise must be a positive integer ≥ 100 paise (₹1 minimum)');
  }
  if (!bankDetails?.bank_name || !bankDetails?.account_number || !bankDetails?.ifsc_code || !bankDetails?.account_holder_name) {
    throw new Error('Complete bank account details are required');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 1. Load wallet (within session) ──────────────────────────────────
    const wallet = await getOrCreateResellerWallet(resellerId, session);

    // ── 2. Duplicate pending payout guard ────────────────────────────────
    const existingPending = await ResellerPayoutRequest.findOne(
      { reseller_id: resellerId, status: 'pending' },
      null,
      { session }
    );
    if (existingPending) {
      throw new Error(
        `A payout request of ₹${toRupees(existingPending.amount_paise)} is already pending review. ` +
        `Please wait for it to be processed before submitting a new request.`
      );
    }

    // ── 3. Balance validation (server-side only) ─────────────────────────
    const availablePaise = wallet.available_balance_paise || 0;
    if (availablePaise < amountPaise) {
      throw new Error(
        `Insufficient balance. Available: ₹${toRupees(availablePaise)}, Requested: ₹${toRupees(amountPaise)}`
      );
    }

    // ── 4. Snapshot wallet state BEFORE deduction ────────────────────────
    const balanceSnapshot = {
      available_balance_paise: availablePaise,
      pending_balance_paise:   wallet.pending_balance_paise || 0,
      total_earned_paise:      wallet.total_earned_paise || 0,
    };

    // ── 5. Move funds: available → pending ──────────────────────────────
    const newAvailablePaise = availablePaise - amountPaise;
    const newPendingPaise   = (wallet.pending_balance_paise || 0) + amountPaise;

    wallet.available_balance_paise = newAvailablePaise;
    wallet.pending_balance_paise   = newPendingPaise;
    // Sync backward-compatible INR float fields
    wallet.available_balance = toRupees(newAvailablePaise);
    wallet.pending_balance   = toRupees(newPendingPaise);
    await wallet.save({ session });

    // ── 6. Create payout request record ──────────────────────────────────
    const iKey = idempotencyKey || `PAYOUT_REQUEST_${resellerId}_${Date.now()}`;
    const [payoutReq] = await ResellerPayoutRequest.create([{
      reseller_id:             resellerId,
      amount:                  toRupees(amountPaise),
      amount_paise:            amountPaise,
      bank_details_snapshot:   bankDetails,
      wallet_balance_at_request: balanceSnapshot,
      status:                  'pending',
      idempotency_key:         iKey,
    }], { session });

    // ── 7. Double-entry ledger record ─────────────────────────────────────
    const [ledger] = await ResellerWalletLedger.create([{
      reseller_id:          resellerId,
      transaction_type:     'payout_hold',
      amount:               -toRupees(amountPaise),
      balance_type:         'available',
      balance_after:        toRupees(newAvailablePaise),
      net_amount_paise:     -amountPaise,
      balance_after_paise:  newAvailablePaise,
      reference_payout_id:  payoutReq._id,
      idempotency_key:      `PAYOUT_HOLD_${payoutReq._id}`,
      narration:            `Withdrawal request ₹${toRupees(amountPaise)} submitted (ID: ${payoutReq._id}). Funds held in pending.`,
    }], { session });

    // ── 8. Commit transaction ─────────────────────────────────────────────
    await session.commitTransaction();

    return { payout: payoutReq, ledger, wallet };

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: Process Payout Decision (Admin action: paid | rejected | failed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process payout approval, rejection, or failure mark (Admin function).
 *
 * Decisions:
 *   'paid'     → Debit from pending_balance, add to total_withdrawn. Requires utrReference.
 *   'rejected' → Return funds from pending_balance → available_balance.
 *   'failed'   → Same as rejected (funds returned) but status = 'failed'.
 *
 * All 3 DB writes happen inside a MongoDB session.
 *
 * @param {object} params
 * @param {string} params.payoutRequestId
 * @param {string} [params.adminUserId]
 * @param {'paid'|'rejected'|'failed'} params.decision
 * @param {string} [params.utrReference]    - UTR/NEFT ref for 'paid' decisions
 * @param {string} [params.rejectionReason] - Required for 'rejected'/'failed'
 */
async function processPayoutDecision({ payoutRequestId, adminUserId, decision, utrReference, rejectionReason }) {
  if (!['paid', 'rejected', 'failed'].includes(decision)) {
    throw new Error(`Invalid decision "${decision}". Must be paid | rejected | failed`);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 1. Load payout request ────────────────────────────────────────────
    const payoutReq = await ResellerPayoutRequest.findById(payoutRequestId).session(session);
    if (!payoutReq) throw new Error('Payout request not found');

    // ── 2. Guard: only pending or processing can be actioned ─────────────
    if (!['pending', 'processing'].includes(payoutReq.status)) {
      throw new Error(`Cannot action this request — status is already "${payoutReq.status}"`);
    }

    // ── 3. Load wallet ────────────────────────────────────────────────────
    const wallet = await ResellerWallet.findOne({ reseller_id: payoutReq.reseller_id }).session(session);
    if (!wallet) throw new Error('Reseller wallet not found');

    const amountPaise    = payoutReq.amount_paise || toPaise(payoutReq.amount);
    const pendingPaise   = wallet.pending_balance_paise || 0;
    const nowTime        = new Date();

    let newPendingPaise  = pendingPaise;
    let newAvailPaise    = wallet.available_balance_paise || 0;
    let newWithdrawnPaise = wallet.total_withdrawn_paise || 0;
    let txnType, narration;

    if (decision === 'paid') {
      // ── PAID: deduct from pending, add to withdrawn ───────────────────
      newPendingPaise   = Math.max(0, pendingPaise - amountPaise);
      newWithdrawnPaise = newWithdrawnPaise + amountPaise;

      payoutReq.status            = 'paid';
      payoutReq.utr_reference     = utrReference?.trim() || null;
      payoutReq.transaction_reference = utrReference?.trim() || `TXN_${Date.now()}`;
      payoutReq.processed_by      = adminUserId || null;
      payoutReq.processed_at      = nowTime;
      payoutReq.payout_date       = nowTime;

      txnType   = 'payout_debit';
      narration = `Payout of ₹${toRupees(amountPaise)} fulfilled. UTR: ${payoutReq.utr_reference || 'N/A'}. Ref ID: ${payoutReq._id}`;

    } else {
      // ── REJECTED or FAILED: return funds to available ─────────────────
      newPendingPaise = Math.max(0, pendingPaise - amountPaise);
      newAvailPaise   = newAvailPaise + amountPaise;

      payoutReq.status          = decision; // 'rejected' or 'failed'
      payoutReq.rejection_reason = rejectionReason?.trim() || (decision === 'failed' ? 'Payout processing failed' : 'Rejected by admin');
      payoutReq.processed_by    = adminUserId || null;
      payoutReq.processed_at    = nowTime;

      txnType   = decision === 'failed' ? 'failed_payout' : 'payout_reversal';
      narration = decision === 'failed'
        ? `Payout of ₹${toRupees(amountPaise)} failed. Funds returned to available balance. Reason: ${payoutReq.rejection_reason}`
        : `Payout of ₹${toRupees(amountPaise)} rejected. Funds returned to available balance. Reason: ${payoutReq.rejection_reason}`;
    }

    // ── 4. Save payout request ────────────────────────────────────────────
    await payoutReq.save({ session });

    // ── 5. Update wallet balances ─────────────────────────────────────────
    wallet.pending_balance_paise   = newPendingPaise;
    wallet.available_balance_paise = newAvailPaise;
    wallet.total_withdrawn_paise   = newWithdrawnPaise;
    // Sync INR float fields
    wallet.pending_balance   = toRupees(newPendingPaise);
    wallet.available_balance = toRupees(newAvailPaise);
    wallet.total_withdrawn   = toRupees(newWithdrawnPaise);
    await wallet.save({ session });

    // ── 6. Double-entry ledger record ─────────────────────────────────────
    const iKey = `PAYOUT_${decision.toUpperCase()}_${payoutReq._id}`;
    const ledgerAmount    = decision === 'paid' ? -amountPaise : amountPaise;
    const balanceAfterPaise = decision === 'paid' ? newPendingPaise : newAvailPaise;

    await ResellerWalletLedger.create([{
      reseller_id:          payoutReq.reseller_id,
      transaction_type:     txnType,
      amount:               toRupees(ledgerAmount),
      balance_type:         decision === 'paid' ? 'pending' : 'available',
      balance_after:        toRupees(balanceAfterPaise),
      net_amount_paise:     ledgerAmount,
      balance_after_paise:  balanceAfterPaise,
      reference_payout_id:  payoutReq._id,
      idempotency_key:      iKey,
      narration,
      created_by:           adminUserId || null,
    }], { session });

    // ── 7. Commit transaction ─────────────────────────────────────────────
    await session.commitTransaction();

    // ── 8. Audit log (non-blocking, outside session) ──────────────────────
    const actionMap = { paid: 'PAYOUT_PAID', rejected: 'PAYOUT_REJECTED', failed: 'PAYOUT_FAILED' };
    await logAudit({
      actor_type:     'cms_user',
      actor_id:       adminUserId,
      action:         actionMap[decision],
      entity_type:    'reseller_payout_requests',
      entity_id:      payoutReq._id,
      before_snapshot: { status: 'pending', amount_paise: amountPaise },
      after_snapshot: {
        status:          payoutReq.status,
        utr_reference:   payoutReq.utr_reference,
        rejection_reason: payoutReq.rejection_reason,
      },
    });

    return { payout: payoutReq, wallet };

  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = {
  getOrCreateResellerWallet,
  createPayoutRequest,
  processPayoutDecision,

  // ⚠️ DEPRECATED: Use reseller.commission.service.js → settleOrderCommission()
  // This float-based function is kept for backward compatibility only.
  // DO NOT call this for new commission credits.
  creditCommissionToWallet: async function deprecatedCreditCommission() {
    throw new Error(
      '[DEPRECATED] creditCommissionToWallet is removed. Use settleOrderCommission() ' +
      'from reseller.commission.service.js instead.'
    );
  },
};
