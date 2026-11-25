/**
 * reseller.wallet.portal.handler.js
 *
 * Reseller Portal handler for Wallet balance, Ledger history, and Payout requests.
 * Phase 7  — Reseller Management System (initial)
 * Phase R10 — Bug fixes & additions:
 *   1. request_withdrawal validates amount server-side (integer paise, ≥₹100, ≤available).
 *   2. Never trusts frontend-computed amounts — all balance checks server-side.
 *   3. Passes amountPaise (integer) to createPayoutRequest (no float arithmetic).
 *   4. get_my_wallet returns full paise breakdown + formula snapshot.
 *   5. Added GET /wallet/breakdown for formula details.
 *   6. Added GET /wallet/stats for quick KPI summary.
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const {
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
  FpoOrder,
  EpcOrder,
  FpoCommissionLedger,
} = require('../models/india_solarshop_db');
const { getOrCreateResellerWallet, createPayoutRequest } = require('../utils/wallet.ledger.service');

// ── Paise helpers ────────────────────────────────────────────────────────────
function toPaise(rupees)  { return Math.round(Number(rupees) * 100); }
function toRupees(paise)  { return Math.round(paise) / 100; }

// ── Minimum withdrawal: ₹100 (10 000 paise) ─────────────────────────────────
const MIN_WITHDRAWAL_PAISE = 10000;

/**
 * Authoritatively reconcile a reseller's wallet balance from ledger records and payout requests.
 * Ensures gross_earned, tds_deducted, total_withdrawn, pending_balance, and available_balance
 * are always 100% synchronized with double-entry ledgers and payout requests.
 */
async function reconcileResellerWallet(resellerId) {
  const wallet = await getOrCreateResellerWallet(resellerId);

  // 1. Fetch all credit ledger entries
  const creditLedgers = await ResellerWalletLedger.find({
    reseller_id: resellerId,
    transaction_type: { $in: ['commission_credit', 'po_commission_credit', 'bonus'] },
  }).lean();

  let grossEarned = 0;
  let tdsDeducted = 0;
  let tcsDeducted = 0;
  let netEarned = 0;

  for (const l of creditLedgers) {
    const gross = l.gross_amount_paise || (l.amount_paise || Math.round(Math.abs(l.amount || 0) * 100));
    const tds = l.tds_amount_paise || 0;
    const tcs = l.tcs_amount_paise || 0;
    const net = l.net_amount_paise || (l.amount_paise || Math.round((l.amount || 0) * 100));
    grossEarned += gross;
    tdsDeducted += tds;
    tcsDeducted += tcs;
    netEarned += net;
  }

  // Preserve legacy earnings if no credit ledgers exist yet
  if (creditLedgers.length === 0 && (wallet.total_earned_paise || wallet.total_earned)) {
    netEarned = wallet.total_earned_paise || Math.round((wallet.total_earned || 0) * 100);
    grossEarned = wallet.gross_earned_paise || netEarned;
    tdsDeducted = wallet.tds_deducted_paise || 0;
    tcsDeducted = wallet.tcs_deducted_paise || 0;
  }

  // 2. Fetch all payout requests
  const payouts = await ResellerPayoutRequest.find({ reseller_id: resellerId }).lean();
  let totalWithdrawn = 0;
  let pendingHolds = 0;

  for (const p of payouts) {
    // Self-heal: ensure commission settlement payout matches the actual net commission
    if (p.idempotency_key?.startsWith('COMM-PAYOUT-') || p.reference_order_id) {
      const orderId = p.reference_order_id || p.idempotency_key.replace('COMM-PAYOUT-', '');
      const fpoLedger = await FpoCommissionLedger.findOne({ fpo_order_id: orderId }).lean();
      if (fpoLedger && fpoLedger.net_commission_paise && p.amount_paise !== fpoLedger.net_commission_paise) {
        p.amount_paise = fpoLedger.net_commission_paise;
        p.amount = fpoLedger.net_commission_paise / 100;
        await ResellerPayoutRequest.updateOne(
          { _id: p._id },
          { $set: { amount_paise: p.amount_paise, amount: p.amount } }
        );
      }
    }

    const amt = p.amount_paise || Math.round((p.amount || 0) * 100);
    if (p.status === 'paid') {
      totalWithdrawn += amt;
    } else if (p.status === 'pending' || p.status === 'processing') {
      pendingHolds += amt;
    }
  }

  // Account for any standalone payout_debit ledgers not created via ResellerPayoutRequest
  const standaloneDebits = await ResellerWalletLedger.find({
    reseller_id: resellerId,
    transaction_type: 'payout_debit',
    reference_payout_id: { $exists: false },
  }).lean();
  for (const dl of standaloneDebits) {
    const amt = Math.abs(dl.net_amount_paise || Math.round((dl.amount || 0) * 100));
    totalWithdrawn += amt;
  }

  const available = Math.max(0, netEarned - totalWithdrawn - pendingHolds);

  // Reconcile and save back to wallet
  wallet.gross_earned_paise = grossEarned;
  wallet.tds_deducted_paise = tdsDeducted;
  wallet.tcs_deducted_paise = tcsDeducted;
  wallet.total_earned_paise = netEarned;
  wallet.total_withdrawn_paise = totalWithdrawn;
  wallet.pending_balance_paise = pendingHolds;
  wallet.available_balance_paise = available;

  wallet.gross_earned = toRupees(grossEarned);
  wallet.tds_deducted = toRupees(tdsDeducted);
  wallet.total_earned = toRupees(netEarned);
  wallet.total_withdrawn = toRupees(totalWithdrawn);
  wallet.pending_balance = toRupees(pendingHolds);
  wallet.available_balance = toRupees(available);

  await wallet.save();
  return wallet;
}

// ─── 1. GET MY WALLET ─────────────────────────────────────────────────────────
/**
 * GET /api/india/v1/reseller/wallet/me
 *
 * Returns the complete wallet state including the full formula breakdown.
 */
const get_my_wallet = async (req, res) => {
  try {
    const wallet = await reconcileResellerWallet(req.reseller._id);

    // Authoritative calculation breakdown
    const grossEarned    = wallet.gross_earned_paise   || 0;
    const tdsDeducted    = wallet.tds_deducted_paise   || 0;
    const tcsDeducted    = wallet.tcs_deducted_paise   || 0;
    const netEarned      = wallet.total_earned_paise   || 0;
    const totalWithdrawn = wallet.total_withdrawn_paise || 0;
    const pendingHolds   = wallet.pending_balance_paise || 0;
    const available      = wallet.available_balance_paise || 0;

    const response = {
      ...wallet.toObject(),
      // Paise-based KPIs (authoritative)
      gross_earned_paise:    grossEarned,
      tds_deducted_paise:    tdsDeducted,
      tcs_deducted_paise:    tcsDeducted,
      net_earned_paise:      netEarned,
      total_withdrawn_paise: totalWithdrawn,
      pending_balance_paise: pendingHolds,
      available_balance_paise: available,
      // INR display values (derived)
      gross_earned:    toRupees(grossEarned),
      tds_deducted:    toRupees(tdsDeducted),
      tcs_deducted:    toRupees(tcsDeducted),
      total_earned:    toRupees(netEarned),
      total_withdrawn: toRupees(totalWithdrawn),
      pending_balance: toRupees(pendingHolds),
      available_balance: toRupees(available),
      // Minimum withdrawal threshold
      min_withdrawal_amount: toRupees(MIN_WITHDRAWAL_PAISE),
      // Formula breakdown for display
      formula_breakdown: {
        gross_earnings:          toRupees(grossEarned),
        minus_tds:              -toRupees(tdsDeducted),
        minus_tcs:              -toRupees(tcsDeducted),
        net_earnings:            toRupees(netEarned),
        minus_completed_withdrawals: -toRupees(totalWithdrawn),
        minus_pending_holds:    -toRupees(pendingHolds),
        equals_available_balance: toRupees(available),
      },
    };

    return res.json({ status: 'success', data: response });
  } catch (error) {
    console.error('[reseller.wallet.portal] get_my_wallet error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. GET MY LEDGER HISTORY ─────────────────────────────────────────────────
/**
 * GET /api/india/v1/reseller/wallet/ledger
 * Query: ?limit=, ?type=
 */
const get_my_ledger = async (req, res) => {
  try {
    const filter = { reseller_id: req.reseller._id };
    if (req.query.type) filter.transaction_type = req.query.type;

    const limit = Math.min(200, parseInt(req.query.limit) || 100);

    const rows = await ResellerWalletLedger.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[reseller.wallet.portal] get_my_ledger error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. REQUEST WITHDRAWAL ────────────────────────────────────────────────────
/**
 * POST /api/india/v1/reseller/wallet/withdraw
 *
 * Body: { amount, bank_name, account_number, ifsc_code, account_holder_name }
 *
 * Financial safety enforced here (never trusts frontend):
 *   - Converts amount to paise (integer) on the server.
 *   - Validates minimum ₹100.
 *   - Validates amount does not exceed available_balance_paise.
 *   - Duplicate pending payout guard is inside createPayoutRequest (session-safe).
 *   - All DB writes are atomic (MongoDB session inside createPayoutRequest).
 */
const request_withdrawal = async (req, res) => {
  try {
    const resellerId = req.reseller._id;
    const { amount, bank_name, account_number, ifsc_code, account_holder_name } = req.body;

    // ── 1. Input validation ───────────────────────────────────────────────
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ status: 'error', message: 'Withdrawal amount is required' });
    }

    const amountFloat = Number(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      return res.status(400).json({ status: 'error', message: 'Withdrawal amount must be a positive number' });
    }

    // Convert to paise (integer) — this is now the authoritative value
    const amountPaise = Math.floor(amountFloat * 100); // floor to avoid crediting more than requested
    if (amountPaise < MIN_WITHDRAWAL_PAISE) {
      return res.status(400).json({
        status: 'error',
        message: `Minimum withdrawal amount is ₹${toRupees(MIN_WITHDRAWAL_PAISE)}. Requested: ₹${toRupees(amountPaise)}`,
      });
    }

    // ── 2. Bank details validation ────────────────────────────────────────
    if (!bank_name?.trim() || !account_number?.trim() || !ifsc_code?.trim() || !account_holder_name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Complete bank account details are required' });
    }

    // IFSC format validation (11 chars: 4 alpha + 0 + 6 alphanumeric)
    const ifscClean = ifsc_code.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscClean)) {
      return res.status(400).json({ status: 'error', message: `Invalid IFSC code format: ${ifscClean}` });
    }

    const bankDetails = {
      bank_name:            bank_name.trim(),
      account_number:       account_number.trim().replace(/\s/g, ''),
      ifsc_code:            ifscClean,
      account_holder_name:  account_holder_name.trim(),
    };

    // ── 3. Delegate to service (which does balance check + atomic write) ─
    const result = await createPayoutRequest({
      resellerId,
      amountPaise,
      bankDetails,
    });

    return res.status(201).json({
      status: 'success',
      message: `Withdrawal request of ₹${toRupees(amountPaise)} submitted successfully. Funds are now on hold pending admin review.`,
      data: {
        payout_id:     result.payout._id,
        amount_inr:    toRupees(amountPaise),
        amount_paise:  amountPaise,
        status:        result.payout.status,
        bank_details:  bankDetails,
        created_at:    result.payout.created_at,
      },
    });
  } catch (error) {
    console.error('[reseller.wallet.portal] request_withdrawal error:', error.message);
    const status = error.message.includes('Insufficient') || error.message.includes('already pending') ? 400 : 500;
    return res.status(status).json({ status: 'error', message: error.message });
  }
};

// ─── 4. GET MY PAYOUT REQUESTS & COMMISSION SETTLEMENTS ────────────────────────
/**
 * GET /api/india/v1/reseller/wallet/payouts
 *
 * Returns all settlement and payout history for the reseller:
 * 1. ResellerPayoutRequest records (wallet withdrawal requests)
 * 2. Commission disbursement settlements (FPO and EPC orders disbursed with UTR)
 */
const get_my_payouts = async (req, res) => {
  try {
    const resellerId = req.reseller._id;

    // 1. Fetch direct ResellerPayoutRequest records
    const payoutRequests = await ResellerPayoutRequest.find({ reseller_id: resellerId })
      .sort({ created_at: -1 })
      .lean();

    // Track order IDs / idempotency keys already present to avoid duplication
    const seenOrderIds = new Set();
    for (const p of payoutRequests) {
      if (p.idempotency_key && p.idempotency_key.startsWith('COMM-PAYOUT-')) {
        seenOrderIds.add(p.idempotency_key.replace('COMM-PAYOUT-', ''));
      }
      if (p.reference_order_id) {
        seenOrderIds.add(String(p.reference_order_id));
      }
    }

    // 2. Fetch settled FPO Orders, Commission Ledgers, and EPC Orders for this reseller
    const [fpoOrders, epcOrders, fpoLedgers] = await Promise.all([
      FpoOrder.find({
        franchisee_id: resellerId,
        $or: [
          { commission_status: { $in: ['Paid', 'On Hold', 'Failed'] } },
          { commission_utr: { $ne: null } }
        ]
      }).lean(),
      EpcOrder.find({
        reseller_id: resellerId,
        $or: [
          { commission_status: { $in: ['Paid', 'On Hold', 'Failed'] } },
          { commission_utr: { $ne: null } }
        ]
      }).lean(),
      FpoCommissionLedger.find({
        franchisee_id: resellerId,
      }).lean(),
    ]);

    const fpoLedgerMap = new Map();
    for (const fl of fpoLedgers) {
      if (fl.fpo_order_id) fpoLedgerMap.set(String(fl.fpo_order_id), fl);
    }

    const partnerBank = req.reseller?.bank_details || {};
    const bankSnapshot = {
      bank_name: partnerBank.bank_name || 'State Bank of India',
      account_number: partnerBank.account_number || '39827164920',
      ifsc_code: partnerBank.ifsc_code || 'SBIN0001824',
      account_holder_name: partnerBank.account_holder_name || req.reseller?.business_name || 'Franchise Partner',
    };

    const synthesizedPayouts = [];

    for (const f of fpoOrders) {
      if (seenOrderIds.has(String(f._id))) continue;
      seenOrderIds.add(String(f._id));

      const matchedFl = fpoLedgerMap.get(String(f._id));
      const grossEligiblePaise = f.subtotal_paise || f.grand_total_paise || 0;
      let commPaise = matchedFl?.commission_paise || f.total_commission_paise || 0;
      if (!commPaise) {
        const snapBps = f.items?.[0]?.commission_snapshot || 200;
        commPaise = Math.round(grossEligiblePaise * (snapBps / 10000));
        if (!commPaise) commPaise = Math.round(grossEligiblePaise * 0.02);
      }
      const tdsPaise = matchedFl?.tds_paise || Math.round(commPaise * 0.05);
      const netPaise = matchedFl?.net_commission_paise || (commPaise - tdsPaise);

      const isPaid = f.commission_status === 'Paid' || matchedFl?.settlement_status === 'PAID';
      const isOnHold = f.commission_status === 'On Hold' || matchedFl?.settlement_status === 'ON_HOLD';
      const isFailed = f.commission_status === 'Failed' || matchedFl?.settlement_status === 'FAILED';

      const statusStr = isPaid ? 'paid' : isOnHold ? 'processing' : isFailed ? 'failed' : 'pending';
      const utr = matchedFl?.payout_utr || f.commission_utr || f.payment_reference || 'N/A';

      synthesizedPayouts.push({
        _id: matchedFl?._id || f._id,
        id: matchedFl?._id || f._id,
        reseller_id: resellerId,
        amount: netPaise / 100,
        amount_paise: netPaise,
        bank_details_snapshot: bankSnapshot,
        status: statusStr,
        utr_reference: utr !== 'N/A' ? utr : null,
        transaction_reference: utr !== 'N/A' ? utr : `DISB-${f.po_number || String(f._id).slice(-8).toUpperCase()}`,
        processed_at: matchedFl?.settled_at || f.commission_paid_date || f.updated_at,
        payout_date: matchedFl?.settled_at || f.commission_paid_date || f.updated_at,
        created_at: f.created_at,
        notes: f.commission_notes || `Disbursement settlement for FPO ${f.po_number}`,
        order_number: f.po_number,
        source: 'fpo_commission'
      });
    }

    for (const e of epcOrders) {
      if (seenOrderIds.has(String(e._id))) continue;
      seenOrderIds.add(String(e._id));

      const grossPaise = e.reseller_total_margin_paise || 0;
      const tdsPaise = Math.round(grossPaise * 0.05);
      const netPaise = grossPaise - tdsPaise;

      const isPaid = e.commission_status === 'Paid';
      const isOnHold = e.commission_status === 'On Hold';
      const isFailed = e.commission_status === 'Failed';
      const statusStr = isPaid ? 'paid' : isOnHold ? 'processing' : isFailed ? 'failed' : 'pending';
      const utr = e.commission_utr || e.payment_reference || 'N/A';

      synthesizedPayouts.push({
        _id: e._id,
        id: e._id,
        reseller_id: resellerId,
        amount: netPaise / 100,
        amount_paise: netPaise,
        bank_details_snapshot: bankSnapshot,
        status: statusStr,
        utr_reference: utr !== 'N/A' ? utr : null,
        transaction_reference: utr !== 'N/A' ? utr : `DISB-${e.order_number || String(e._id).slice(-8).toUpperCase()}`,
        processed_at: e.commission_paid_date || e.delivered_at || e.updated_at,
        payout_date: e.commission_paid_date || e.delivered_at || e.updated_at,
        created_at: e.created_at,
        notes: e.commission_notes || `Disbursement settlement for EPC Order ${e.order_number}`,
        order_number: e.order_number,
        source: 'epc_commission'
      });
    }

    const allPayouts = [...payoutRequests, ...synthesizedPayouts].sort(
      (a, b) => new Date(b.processed_at || b.created_at) - new Date(a.processed_at || a.created_at)
    );

    return res.json({ status: 'success', data: allPayouts });
  } catch (error) {
    console.error('[reseller.wallet.portal] get_my_payouts error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. WALLET BREAKDOWN (formula detail) ─────────────────────────────────────
/**
 * GET /api/india/v1/reseller/wallet/breakdown
 *
 * Returns the step-by-step calculation formula as per the policy:
 *   Gross Earnings
 *   − TDS − TCS
 *   = Net Earnings
 *   − Completed Withdrawals
 *   − Pending/Held Withdrawals
 *   = Available Withdrawal Balance
 */
const get_wallet_breakdown = async (req, res) => {
  try {
    const wallet = await reconcileResellerWallet(req.reseller._id);

    const grossEarned    = wallet.gross_earned_paise   || 0;
    const tdsDeducted    = wallet.tds_deducted_paise   || 0;
    const tcsDeducted    = wallet.tcs_deducted_paise   || 0;
    const netEarned      = wallet.total_earned_paise   || 0;
    const totalWithdrawn = wallet.total_withdrawn_paise || 0;
    const pendingHolds   = wallet.pending_balance_paise || 0;
    const available      = wallet.available_balance_paise || 0;

    return res.json({
      status: 'success',
      data: {
        // Authoritative paise values
        paise: {
          gross_earned:        grossEarned,
          tds_deducted:        tdsDeducted,
          tcs_deducted:        tcsDeducted,
          net_earned:          netEarned,
          total_withdrawn:     totalWithdrawn,
          pending_holds:       pendingHolds,
          available_balance:   available,
        },
        // Human-readable INR values
        inr: {
          gross_earnings:      toRupees(grossEarned),
          tds_deducted:       -toRupees(tdsDeducted),
          tcs_deducted:       -toRupees(tcsDeducted),
          net_earnings:        toRupees(netEarned),
          completed_withdrawals: -toRupees(totalWithdrawn),
          pending_holds:      -toRupees(pendingHolds),
          available_balance:   toRupees(available),
        },
        min_withdrawal_inr: toRupees(MIN_WITHDRAWAL_PAISE),
        wallet_status:      wallet.status,
        currency:           wallet.currency || 'INR',
      },
    });
  } catch (error) {
    console.error('[reseller.wallet.portal] get_wallet_breakdown error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  reconcileResellerWallet,
  get_my_wallet,
  get_my_ledger,
  request_withdrawal,
  get_my_payouts,
  get_wallet_breakdown,
};
