/**
 * epc.wallet.handler.js
 *
 * EPC partner wallet & ledger endpoints.
 * Authenticated via verify_auth middleware (JWT account_id claim).
 *
 * Endpoints:
 *   GET /api/india/v1/epc/wallet/me      — wallet balance
 *   GET /api/india/v1/epc/wallet/ledger  — ledger entries
 */

const mongoose = require('mongoose');
const { EpcWallet, EpcWalletLedger, EpcAccount } = require('../models/india_solarshop_db');

// ─── Helper: resolve EPC account from JWT ─────────────────────────────────────
async function resolveEpcAccountId(req) {
  return req.user?.account_id || req.user?._id || req.epc?._id || null;
}

// ─── 1. GET MY WALLET ──────────────────────────────────────────────────────────
/**
 * GET /api/india/v1/epc/wallet/me
 */
const get_my_wallet = async (req, res) => {
  try {
    const epcAccountId = await resolveEpcAccountId(req);
    if (!epcAccountId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    // Upsert wallet (auto-create if first access)
    let wallet = await EpcWallet.findOne({ epc_account_id: epcAccountId }).lean();
    if (!wallet) {
      wallet = await EpcWallet.create({ epc_account_id: epcAccountId });
      wallet = wallet.toObject();
    }

    return res.json({
      status: 'success',
      data: {
        id: wallet._id,
        epc_account_id: wallet.epc_account_id,
        balance_paise: wallet.balance_paise,
        balance_inr: (wallet.balance_paise / 100).toFixed(2),
        pending_paise: wallet.pending_paise,
        pending_inr: (wallet.pending_paise / 100).toFixed(2),
        lifetime_earned_paise: wallet.lifetime_earned_paise,
        lifetime_earned_inr: (wallet.lifetime_earned_paise / 100).toFixed(2),
        lifetime_withdrawn_paise: wallet.lifetime_withdrawn_paise,
        lifetime_withdrawn_inr: (wallet.lifetime_withdrawn_paise / 100).toFixed(2),
        currency: wallet.currency || 'INR',
        is_frozen: wallet.is_frozen,
        settlement_period_days: wallet.settlement_period_days,
        last_settlement_at: wallet.last_settlement_at,
      },
    });
  } catch (error) {
    console.error('[epc.wallet] get_my_wallet error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. GET MY LEDGER ──────────────────────────────────────────────────────────
/**
 * GET /api/india/v1/epc/wallet/ledger
 * Query: ?status=pending|available|reversed&page=1&limit=20
 */
const get_my_ledger = async (req, res) => {
  try {
    const epcAccountId = await resolveEpcAccountId(req);
    if (!epcAccountId) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { epc_account_id: new mongoose.Types.ObjectId(epcAccountId.toString()) };
    if (req.query.status && ['pending', 'available', 'reversed', 'withdrawn'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const [rows, total] = await Promise.all([
      EpcWalletLedger.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EpcWalletLedger.countDocuments(query),
    ]);

    const data = rows.map((r) => ({
      id: r._id,
      reference_type: r.reference_type,
      reference_id: r.reference_id,
      description: r.description,
      credit_paise: r.credit_paise,
      credit_inr: (r.credit_paise / 100).toFixed(2),
      debit_paise: r.debit_paise,
      debit_inr: (r.debit_paise / 100).toFixed(2),
      net_paise: r.net_paise,
      net_inr: ((r.net_paise || 0) / 100).toFixed(2),
      status: r.status,
      settle_after: r.settle_after,
      settled_at: r.settled_at,
      reversed_at: r.reversed_at,
      reversal_reason: r.reversal_reason,
      created_at: r.created_at,
    }));

    return res.json({
      status: 'success',
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[epc.wallet] get_my_ledger error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  get_my_wallet,
  get_my_ledger,
};
