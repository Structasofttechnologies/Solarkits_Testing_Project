/**
 * reseller.wallet.route.js
 *
 * Admin routes for Commission Engine & Wallet Ledger System.
 * Unique permission code: RSL_WALLET
 * Prefix: /admin-api/reseller-mgmt/wallet
 *
 * Phase 7  — Reseller Management System (initial)
 * Phase R10 — Added: mark-failed, export-payouts, payouts/:id detail endpoint.
 */

const express = require('express');
const router = express.Router();

const check_auth        = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler           = require('../controller/reseller.wallet.admin.handler');

// ─── Wallet Overview ─────────────────────────────────────────────────────────

router.get(
  '/list',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.list_reseller_wallets
);

// ─── Ledger History ──────────────────────────────────────────────────────────

router.get(
  '/ledger/:reseller_id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.get_reseller_ledger_history
);

// ─── Payout Requests Queue ───────────────────────────────────────────────────

router.get(
  '/payouts',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.list_payout_requests
);

// GET single payout with ledger entries
router.get(
  '/payouts/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.get_payout_detail
);

// Process payout: mark as paid (with UTR) or reject (with reason)
router.put(
  '/payouts/process/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['edit'] }]),
  handler.process_payout_request
);

// Mark a processing payout as failed (funds returned)
router.put(
  '/payouts/mark-failed/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['edit'] }]),
  handler.mark_payout_failed
);

// ─── Reports & Export ────────────────────────────────────────────────────────

router.get(
  '/export-payouts',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.export_payouts_csv
);

// ─── Commission Settlement ───────────────────────────────────────────────────

router.post(
  '/settle-commission',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_COMM_SETTLE', permissions: ['add', 'edit'] },
    { unique_code: 'RSL_WALLET', permissions: ['edit'] },
  ]),
  handler.settle_commission_manual
);

// ─── Franchisee Commission Earnings (Live Accounts Sync) ──────────────────────

router.get(
  '/commissions',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.list_commission_earnings
);

// ─── Double-Entry Wallet Ledgers Audit Trail ───────────────────────────────────

router.get(
  '/ledgers',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.list_wallet_ledgers
);

// ─── Aggregate Wallet & Commission KPIs ───────────────────────────────────────

router.get(
  '/stats',
  check_auth,
  check_permissions([{ unique_code: 'RSL_WALLET', permissions: ['view'] }]),
  handler.get_wallet_kpis
);

module.exports = router;
