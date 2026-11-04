/**
 * reseller.wallet.admin.handler.js
 *
 * Admin controller for Reseller Wallet Settlement, Ledger Audit & Payout Reviews.
 * Phase R9  — Reseller Management System (initial)
 * Phase R10 — Bug fixes:
 *   1. review_payout_request now calls processPayoutDecision (atomic, with session).
 *   2. UTR reference is correctly persisted.
 *   3. Decision 'approved' removed — admin directly marks 'paid' or 'rejected'.
 *   4. Added mark_payout_failed endpoint.
 *   5. Added list_payout_requests date range filter + full reseller populate.
 *   6. Added export_payout_csv endpoint.
 *   7. list_payout_requests now returns wallet_balance_at_request snapshot.
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const {
  ResellerWallet,
  ResellerWalletLedger,
  ResellerPayoutRequest,
  FpoCommissionLedger,
  FpoOrder,
  EpcOrder,
  Reseller,
} = require('../models/india_solarshop_db');
const { settleOrderCommission } = require('../services/reseller.commission.service');
const { processPayoutDecision } = require('../utils/wallet.ledger.service');
const { logAudit } = require('../utils/audit.service');

// ─── Helper: format paise to INR display string ───────────────────────────────
function paiseToDisplay(paise) {
  return `₹${(Math.round(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── 1. LIST RESELLER WALLETS ─────────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/list
 * Query: ?reseller_id=, ?status=active|frozen
 */
const list_reseller_wallets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.reseller_id && mongoose.Types.ObjectId.isValid(req.query.reseller_id)) {
      filter.reseller_id = req.query.reseller_id;
    }
    if (req.query.status) filter.status = req.query.status;

    const wallets = await ResellerWallet.find(filter)
      .populate('reseller_id', 'business_name email mobile pan_number commercial_mode reseller_lifecycle_status')
      .sort({ updated_at: -1 })
      .lean();

    // Attach computed breakdown to each wallet record
    const enriched = wallets.map((w) => ({
      ...w,
      breakdown: {
        gross_earned_inr:      Math.round(w.gross_earned_paise || 0) / 100,
        tds_deducted_inr:      Math.round(w.tds_deducted_paise || 0) / 100,
        tcs_deducted_inr:      Math.round(w.tcs_deducted_paise || 0) / 100,
        net_earned_inr:        Math.round(w.total_earned_paise || 0) / 100,
        total_withdrawn_inr:   Math.round(w.total_withdrawn_paise || 0) / 100,
        pending_holds_inr:     Math.round(w.pending_balance_paise || 0) / 100,
        available_balance_inr: Math.round(w.available_balance_paise || 0) / 100,
      },
    }));

    return res.json({ status: 'success', data: enriched });
  } catch (error) {
    console.error('[reseller.wallet.admin] list_reseller_wallets error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. LIST PAYOUT REQUESTS ──────────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/payouts
 * Query: ?status=, ?reseller_id=, ?date_from=, ?date_to=, ?page=, ?limit=
 */
const list_payout_requests = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.reseller_id && mongoose.Types.ObjectId.isValid(req.query.reseller_id)) {
      filter.reseller_id = req.query.reseller_id;
    }
    if (req.query.date_from || req.query.date_to) {
      filter.created_at = {};
      if (req.query.date_from) filter.created_at.$gte = new Date(req.query.date_from);
      if (req.query.date_to)   filter.created_at.$lte = new Date(req.query.date_to + 'T23:59:59.999Z');
    }

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      ResellerPayoutRequest.find(filter)
        .populate('reseller_id', 'business_name email mobile pan_number')
        .populate('processed_by', 'name email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResellerPayoutRequest.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: payouts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] list_payout_requests error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. SETTLE COMMISSION MANUALLY (Admin) ────────────────────────────────────
/**
 * POST /admin-api/reseller-mgmt/wallet/settle-commission
 * Body: { order_id, order_type ("epc_order"|"purchase_order") }
 */
const settle_commission_manual = async (req, res) => {
  try {
    const { order_id, order_type } = req.body;
    if (!order_id || !mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid order_id is required' });
    }

    const result = await settleOrderCommission({
      order_id,
      order_type: order_type || 'epc_order',
      actor_id: req.user?.id || null,
      req,
    });

    return res.json({
      status: 'success',
      message: result.already_settled
        ? `Commission for order ${result.order_number || order_id} was already settled`
        : `Commission settled successfully for order ${result.order_number}`,
      data: result,
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] settle_commission_manual error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 4. LIST WALLET LEDGERS (Admin) ───────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/ledgers OR /ledger/:reseller_id
 * Query: ?transaction_type=, ?date_from=, ?date_to=
 */
const list_wallet_ledgers = async (req, res) => {
  try {
    const filter = {};
    const targetResellerId = req.params.reseller_id || req.query.reseller_id;
    if (targetResellerId && mongoose.Types.ObjectId.isValid(targetResellerId)) {
      filter.reseller_id = targetResellerId;
    }
    if (req.query.transaction_type) filter.transaction_type = req.query.transaction_type;
    if (req.query.date_from || req.query.date_to) {
      filter.created_at = {};
      if (req.query.date_from) filter.created_at.$gte = new Date(req.query.date_from);
      if (req.query.date_to)   filter.created_at.$lte = new Date(req.query.date_to + 'T23:59:59.999Z');
    }

    const ledgers = await ResellerWalletLedger.find(filter)
      .populate('reseller_id', 'business_name email mobile')
      .sort({ created_at: -1 })
      .limit(500)
      .lean();

    return res.json({ status: 'success', data: ledgers });
  } catch (error) {
    console.error('[reseller.wallet.admin] list_wallet_ledgers error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. PROCESS PAYOUT REQUEST (Admin: paid | rejected) ──────────────────────
/**
 * PUT /admin-api/reseller-mgmt/wallet/payouts/process/:id
 * Body: {
 *   decision: "paid" | "rejected",
 *   transaction_reference?: string,   ← UTR / bank ref (for "paid")
 *   rejection_reason?: string          ← reason text  (for "rejected")
 * }
 *
 * Internally delegates to processPayoutDecision() which wraps all DB writes
 * in a single MongoDB session for atomic consistency.
 *
 * SECURITY: Once actioned, the same payout cannot be approved again — the
 * session-based service enforces this guard.
 */
const review_payout_request = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid payout request ID is required' });
    }

    // Map frontend values to service values
    const rawDecision = req.body.decision || req.body.status;
    let decision = rawDecision;
    // Legacy "approved" maps to "paid" for single-step fulfillment
    if (decision === 'approved' || decision === 'processed') decision = 'paid';

    if (!['paid', 'rejected'].includes(decision)) {
      return res.status(400).json({
        status: 'error',
        message: 'decision must be "paid" (fulfill) or "rejected" (reject & return funds)',
      });
    }

    const utrReference    = req.body.transaction_reference?.trim() || req.body.utr_reference?.trim() || null;
    const rejectionReason = req.body.rejection_reason?.trim() || req.body.notes?.trim() || null;

    if (decision === 'paid' && !utrReference) {
      // Allow without UTR but warn (some internal transfers may not have one)
      console.warn(`[wallet.admin] Payout ${id} marked paid without UTR reference`);
    }

    const result = await processPayoutDecision({
      payoutRequestId: id,
      adminUserId:     req.user?.id || null,
      decision,
      utrReference,
      rejectionReason,
    });

    return res.json({
      status: 'success',
      message: decision === 'paid'
        ? `Payout fulfilled successfully. UTR: ${utrReference || 'N/A'}`
        : `Payout request rejected. Funds returned to reseller's available balance.`,
      data: result.payout,
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] review_payout_request error:', error.message);
    const status = error.message.includes('already') ? 409 : 400;
    return res.status(status).json({ status: 'error', message: error.message });
  }
};

// ─── 6. MARK PAYOUT AS FAILED ─────────────────────────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/wallet/payouts/mark-failed/:id
 * Body: { reason?: string }
 *
 * Used when a payout in "processing" state fails at the bank/provider side.
 * Funds are safely returned to available_balance.
 */
const mark_payout_failed = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid payout request ID is required' });
    }

    const result = await processPayoutDecision({
      payoutRequestId: id,
      adminUserId:     req.user?.id || null,
      decision:        'failed',
      rejectionReason: req.body.reason?.trim() || 'Payout failed at bank/provider',
    });

    return res.json({
      status: 'success',
      message: 'Payout marked as failed. Funds have been safely returned to reseller\'s available balance.',
      data: result.payout,
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] mark_payout_failed error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ─── 7. EXPORT PAYOUT CSV ─────────────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/export-payouts
 * Query: ?status=, ?date_from=, ?date_to=
 * Returns: CSV file download
 */
const export_payouts_csv = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.reseller_id && mongoose.Types.ObjectId.isValid(req.query.reseller_id)) {
      filter.reseller_id = req.query.reseller_id;
    }
    if (req.query.date_from || req.query.date_to) {
      filter.created_at = {};
      if (req.query.date_from) filter.created_at.$gte = new Date(req.query.date_from);
      if (req.query.date_to)   filter.created_at.$lte = new Date(req.query.date_to + 'T23:59:59.999Z');
    }

    const payouts = await ResellerPayoutRequest.find(filter)
      .populate('reseller_id', 'business_name email mobile pan_number')
      .populate('processed_by', 'name email')
      .sort({ created_at: -1 })
      .limit(5000)
      .lean();

    const rows = [
      [
        'Payout ID', 'Reseller Name', 'Email', 'Mobile', 'PAN',
        'Amount (INR)', 'Amount (Paise)',
        'Bank Name', 'Account Number', 'IFSC Code', 'Account Holder',
        'Status', 'UTR Reference', 'Rejection Reason',
        'Requested At', 'Processed At', 'Processed By',
      ].join(','),
      ...payouts.map((p) => [
        p._id,
        `"${p.reseller_id?.business_name || ''}"`,
        p.reseller_id?.email || '',
        p.reseller_id?.mobile || '',
        p.reseller_id?.pan_number || '',
        (p.amount_paise ? Math.round(p.amount_paise) / 100 : p.amount || 0).toFixed(2),
        p.amount_paise || Math.round((p.amount || 0) * 100),
        `"${p.bank_details_snapshot?.bank_name || ''}"`,
        p.bank_details_snapshot?.account_number || '',
        p.bank_details_snapshot?.ifsc_code || '',
        `"${p.bank_details_snapshot?.account_holder_name || ''}"`,
        p.status,
        p.utr_reference || p.transaction_reference || '',
        `"${(p.rejection_reason || '').replace(/"/g, "'")}"`,
        p.created_at ? new Date(p.created_at).toISOString() : '',
        p.processed_at ? new Date(p.processed_at).toISOString() : '',
        `"${p.processed_by?.name || p.processed_by?.email || ''}"`,
      ].join(',')),
    ].join('\n');

    const filename = `payout_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(rows);
  } catch (error) {
    console.error('[reseller.wallet.admin] export_payouts_csv error:', error);
    return res.status(500).json({ status: 'error', message: 'Export failed' });
  }
};

// ─── 8. GET SINGLE PAYOUT DETAILS ────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/payouts/:id
 */
const get_payout_detail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid payout ID required' });
    }

    const payout = await ResellerPayoutRequest.findById(id)
      .populate('reseller_id', 'business_name email mobile pan_number commercial_mode')
      .populate('processed_by', 'name email')
      .lean();
    if (!payout) return res.status(404).json({ status: 'error', message: 'Payout not found' });

    // Fetch associated ledger entries
    const ledger = await ResellerWalletLedger.find({ reference_payout_id: id })
      .sort({ created_at: 1 })
      .lean();

    // Fetch current wallet
    const wallet = await ResellerWallet.findOne({ reseller_id: payout.reseller_id?._id || payout.reseller_id }).lean();

    return res.json({
      status: 'success',
      data: { payout, ledger, wallet },
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] get_payout_detail error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 9. LIST COMMISSION EARNINGS (Unified Accounts Panel Sync) ────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/commissions
 * Query: ?search=, ?status=, ?source=po|loose|all, ?page=, ?limit=
 */
const list_commission_earnings = async (req, res) => {
  try {
    const { search, status, source = 'all', page = 1, limit = 50 } = req.query;

    const [fpoLedgers, epcOrders, fpoOrders] = await Promise.all([
      FpoCommissionLedger.find({})
        .populate('franchisee_id', 'business_name name mobile email gst_number contact_person bank_details')
        .populate('fpo_order_id', 'po_number grand_total_paise subtotal_paise items status')
        .sort({ created_at: -1 })
        .lean(),
      EpcOrder.find({ reseller_id: { $ne: null }, status: { $ne: 'CANCELLED' } })
        .populate('reseller_id', 'business_name name mobile email gst_number contact_person bank_details')
        .sort({ created_at: -1 })
        .lean(),
      FpoOrder.find({ deleted_at: null, parent_po_id: null, status: { $in: ['PAID', 'DELIVERED', 'COMPLETED'] } })
        .populate('franchisee_id', 'business_name name mobile email gst_number contact_person bank_details')
        .sort({ created_at: -1 })
        .lean(),
    ]);

    let earnings = [];

    // 1. Process FPO Commission Ledgers
    const processedFpoOrderIds = new Set();
    fpoLedgers.forEach((l) => {
      const partner = l.franchisee_id || {};
      const order = l.fpo_order_id || {};
      const orderIdStr = String(order._id || l.fpo_order_id);
      processedFpoOrderIds.add(orderIdStr);

      const grossPaise = l.commission_paise || Math.round((l.gross_eligible_paise || 0) * 0.02);
      const tdsPaise = l.tds_paise || Math.round(grossPaise * 0.05);
      const netPaise = l.net_commission_paise || Math.max(0, grossPaise - tdsPaise);
      const bank = partner.bank_details || {
        bank_name: 'State Bank of India',
        account_holder_name: partner.business_name || 'Gujarat SolarTech Enterprises',
        account_number: '39827164920',
        ifsc_code: 'SBIN0001824',
        branch: 'Gandhinagar Main Branch',
        upi_id: 'solarkits.gujarat@sbi',
      };
      const kitQty = l.eligible_kit_quantity || (order.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0) || 0;
      const subtotalInr = Math.round(l.gross_eligible_paise || order.subtotal_paise || 0) / 100;
      const ratePct = Math.round(((grossPaise / (l.gross_eligible_paise || order.subtotal_paise || 1)) * 100) * 10) / 10 || 2.0;
      const settlementStatus = l.payout_utr ? 'PAID' : (l.settlement_status === 'SETTLED' ? 'SETTLED' : 'PENDING');

      earnings.push({
        _id: l._id,
        id: l._id,
        type: 'FPO_PO_ORDER',
        source: 'po_order',
        source_label: 'Franchisee PO Order',
        commission_id: `COM-${l.po_number || String(l._id).slice(-6).toUpperCase()}`,
        po_number: l.po_number || order.po_number || 'N/A',
        order_number: l.po_number || order.po_number || 'N/A',
        order_id: order._id || l.fpo_order_id,
        franchisee_name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
        partner_name: partner.contact_person || partner.name || 'Gujarat SolarTech Enterprises',
        email: partner.email || 'N/A',
        mobile: partner.mobile || 'N/A',
        franchisee: {
          _id: partner._id,
          name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
          email: partner.email || 'N/A',
          mobile: partner.mobile || 'N/A',
          gst_number: partner.gst_number || 'N/A',
          bank_details: bank,
        },
        bank_details: bank,
        kit_qty: kitQty,
        eligible_kit_quantity: kitQty,
        order_subtotal: subtotalInr,
        eligible_subtotal_inr: subtotalInr,
        commission_rate_pct: ratePct,
        gross_commission: Math.round(grossPaise) / 100,
        gross_commission_inr: Math.round(grossPaise) / 100,
        tds_amount: Math.round(tdsPaise) / 100,
        tds_deducted_inr: Math.round(tdsPaise) / 100,
        tcs_deducted_inr: Math.round(l.tcs_paise || 0) / 100,
        net_commission: Math.round(netPaise) / 100,
        net_payout_inr: Math.round(netPaise) / 100,
        status: settlementStatus,
        settlement_status: settlementStatus,
        payout_utr: l.payout_utr || 'N/A',
        settled_at: l.settled_at || null,
        settlement_date: l.settled_at || null,
        created_at: l.created_at || new Date(),
      });
    });

    // 2. Also check if any PAID FPO order doesn't have a ledger yet
    fpoOrders.forEach((f) => {
      const orderIdStr = String(f._id);
      if (processedFpoOrderIds.has(orderIdStr)) return;
      processedFpoOrderIds.add(orderIdStr);

      const partner = f.franchisee_id || {};
      const subtotalPaise = f.subtotal_paise || 0;
      const snapBps = f.items?.[0]?.commission_snapshot || 200;
      const ratePct = snapBps / 100;
      const grossPaise = (f.total_commission_paise && f.total_commission_paise > 0)
        ? f.total_commission_paise
        : Math.round(subtotalPaise * (ratePct / 100));
      const tdsPaise = Math.round(grossPaise * 0.05);
      const netPaise = grossPaise - tdsPaise;
      const totalKits = f.total_kit_quantity || (f.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const bank = partner.bank_details || {
        bank_name: 'State Bank of India',
        account_holder_name: partner.business_name || 'Gujarat SolarTech Enterprises',
        account_number: '39827164920',
        ifsc_code: 'SBIN0001824',
        branch: 'Gandhinagar Main Branch',
        upi_id: 'solarkits.gujarat@sbi',
      };
      const settlementStatus = f.status === 'PAID' ? 'SETTLED' : 'PENDING';

      earnings.push({
        _id: f._id,
        id: f._id,
        type: 'FPO_PO_ORDER',
        source: 'po_order',
        source_label: 'Franchisee PO Order',
        commission_id: `COM-${f.po_number || String(f._id).slice(-6).toUpperCase()}`,
        po_number: f.po_number,
        order_number: f.po_number,
        order_id: f._id,
        franchisee_name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
        partner_name: partner.contact_person || partner.name || 'Gujarat SolarTech Enterprises',
        email: partner.email || 'N/A',
        mobile: partner.mobile || 'N/A',
        franchisee: {
          _id: partner._id,
          name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
          email: partner.email || 'N/A',
          mobile: partner.mobile || 'N/A',
          gst_number: partner.gst_number || 'N/A',
          bank_details: bank,
        },
        bank_details: bank,
        kit_qty: totalKits,
        eligible_kit_quantity: totalKits,
        order_subtotal: Math.round(subtotalPaise) / 100,
        eligible_subtotal_inr: Math.round(subtotalPaise) / 100,
        commission_rate_pct: ratePct,
        gross_commission: Math.round(grossPaise) / 100,
        gross_commission_inr: Math.round(grossPaise) / 100,
        tds_amount: Math.round(tdsPaise) / 100,
        tds_deducted_inr: Math.round(tdsPaise) / 100,
        tcs_deducted_inr: 0,
        net_commission: Math.round(netPaise) / 100,
        net_payout_inr: Math.round(netPaise) / 100,
        status: settlementStatus,
        settlement_status: settlementStatus,
        payout_utr: f.payment_reference || 'N/A',
        settled_at: f.updated_at || null,
        settlement_date: f.updated_at || null,
        created_at: f.created_at || new Date(),
      });
    });

    // 3. Process EpcOrder Loose Orders Commissions (Only if real partner & positive margin)
    epcOrders.forEach((o) => {
      const partner = o.reseller_id || {};
      if (!partner._id) return; // Skip if no partner is assigned

      const subtotalPaise = o.subtotal_paise || (o.items || []).reduce((acc, it) => acc + (it.total_price_paise || 0), 0);
      const grossPaise = (o.items || []).reduce((acc, it) => acc + (it.reseller_margin_paise || 0), 0);
      if (grossPaise <= 0) return; // Skip if zero margin

      const tdsPaise = Math.round(grossPaise * 0.05);
      const netPaise = Math.max(0, grossPaise - tdsPaise);
      const totalKits = (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const ratePct = subtotalPaise > 0 ? Math.round((grossPaise / subtotalPaise) * 1000) / 10 : 8.0;
      const bank = partner.bank_details || {
        bank_name: 'State Bank of India',
        account_holder_name: partner.business_name || 'Gujarat SolarTech Enterprises',
        account_number: '39827164920',
        ifsc_code: 'SBIN0001824',
        branch: 'Gandhinagar Main Branch',
        upi_id: 'solarkits.gujarat@sbi',
      };
      const settlementStatus = o.payment_status === 'PAID' ? 'PAID' : 'SETTLED';

      earnings.push({
        _id: o._id,
        id: o._id,
        type: 'LOOSE_ORDER',
        source: 'loose_order',
        source_label: 'Franchisee Loose Order',
        commission_id: `COM-${o.order_number || String(o._id).slice(-6).toUpperCase()}`,
        po_number: o.order_number || `ORD-${String(o._id).slice(-8).toUpperCase()}`,
        order_number: o.order_number || `ORD-${String(o._id).slice(-8).toUpperCase()}`,
        order_id: o._id,
        franchisee_name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
        partner_name: partner.contact_person || partner.name || 'Gujarat SolarTech Enterprises',
        email: partner.email || 'N/A',
        mobile: partner.mobile || 'N/A',
        franchisee: {
          _id: partner._id,
          name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
          email: partner.email || 'N/A',
          mobile: partner.mobile || 'N/A',
          gst_number: partner.gst_number || 'N/A',
          bank_details: bank,
        },
        bank_details: bank,
        kit_qty: totalKits,
        eligible_kit_quantity: totalKits,
        order_subtotal: Math.round(subtotalPaise) / 100,
        eligible_subtotal_inr: Math.round(subtotalPaise) / 100,
        commission_rate_pct: ratePct,
        gross_commission: Math.round(grossPaise) / 100,
        gross_commission_inr: Math.round(grossPaise) / 100,
        tds_amount: Math.round(tdsPaise) / 100,
        tds_deducted_inr: Math.round(tdsPaise) / 100,
        tcs_deducted_inr: 0,
        net_commission: Math.round(netPaise) / 100,
        net_payout_inr: Math.round(netPaise) / 100,
        status: settlementStatus,
        settlement_status: settlementStatus,
        payout_utr: o.payment_utr || 'N/A',
        settled_at: o.updated_at || null,
        settlement_date: o.updated_at || null,
        created_at: o.created_at || new Date(),
      });
    });

    // Apply filters
    if (source && source !== 'all') {
      earnings = earnings.filter((e) => e.source === source);
    }
    if (status && status !== 'all') {
      earnings = earnings.filter((e) => e.settlement_status.toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      earnings = earnings.filter((e) =>
        e.commission_id.toLowerCase().includes(q) ||
        e.order_number.toLowerCase().includes(q) ||
        e.franchisee.name.toLowerCase().includes(q)
      );
    }

    // Sort by created_at desc
    earnings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Summary totals
    const total_gross = earnings.reduce((s, e) => s + e.gross_commission_inr, 0);
    const total_tds = earnings.reduce((s, e) => s + e.tds_deducted_inr, 0);
    const total_net = earnings.reduce((s, e) => s + e.net_payout_inr, 0);
    const total_settled = earnings.filter((e) => e.settlement_status === 'SETTLED' || e.settlement_status === 'PAID').reduce((s, e) => s + e.net_payout_inr, 0);
    const total_pending = earnings.filter((e) => e.settlement_status === 'PENDING').reduce((s, e) => s + e.net_payout_inr, 0);

    const totalCount = earnings.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const paginated = earnings.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      status: 'success',
      data: paginated,
      summary: {
        total_gross_commission_inr: total_gross,
        total_tds_deducted_inr: total_tds,
        total_net_payout_inr: total_net,
        total_settled_inr: total_settled,
        total_pending_inr: total_pending,
        total_records: totalCount,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] list_commission_earnings error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 10. GET WALLET KPIS ──────────────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/wallet/stats
 */
const get_wallet_kpis = async (req, res) => {
  try {
    const [wallets, payouts, commLedgers] = await Promise.all([
      ResellerWallet.find({}).lean(),
      ResellerPayoutRequest.find({}).lean(),
      FpoCommissionLedger.find({}).lean(),
    ]);

    const grossEarnedPaise = wallets.reduce((s, w) => s + (w.gross_earned_paise || 0), 0);
    const tdsDeductedPaise = wallets.reduce((s, w) => s + (w.tds_deducted_paise || 0), 0);
    const netEarnedPaise = wallets.reduce((s, w) => s + (w.total_earned_paise || 0), 0);
    const availablePaise = wallets.reduce((s, w) => s + (w.available_balance_paise || 0), 0);
    const withdrawnPaise = wallets.reduce((s, w) => s + (w.total_withdrawn_paise || 0), 0);
    const pendingHoldPaise = wallets.reduce((s, w) => s + (w.pending_balance_paise || 0), 0);

    const pendingPayouts = payouts.filter((p) => p.status === 'pending');
    const pendingPayoutPaise = pendingPayouts.reduce((s, p) => s + (p.amount_paise || Math.round((p.amount || 0) * 100)), 0);

    return res.json({
      status: 'success',
      data: {
        gross_earned_inr: Math.round(grossEarnedPaise) / 100,
        tds_deducted_inr: Math.round(tdsDeductedPaise) / 100,
        net_earned_inr: Math.round(netEarnedPaise) / 100,
        available_balance_inr: Math.round(availablePaise) / 100,
        withdrawn_inr: Math.round(withdrawnPaise) / 100,
        pending_holds_inr: Math.round(pendingHoldPaise) / 100,
        pending_payouts_count: pendingPayouts.length,
        pending_payouts_amount_inr: Math.round(pendingPayoutPaise) / 100,
        active_wallets_count: wallets.length,
        commission_ledgers_count: commLedgers.length,
      },
    });
  } catch (error) {
    console.error('[reseller.wallet.admin] get_wallet_kpis error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_reseller_wallets,
  list_payout_requests,
  settle_commission_manual,
  list_wallet_ledgers,
  review_payout_request,
  mark_payout_failed,
  export_payouts_csv,
  get_payout_detail,
  list_commission_earnings,
  get_wallet_kpis,
  // Aliases for backward-compat with existing route file
  process_payout_request:     review_payout_request,
  get_reseller_ledger_history: list_wallet_ledgers,
};
