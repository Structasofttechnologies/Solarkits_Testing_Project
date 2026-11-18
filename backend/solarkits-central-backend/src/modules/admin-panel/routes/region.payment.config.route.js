/**
 * region.payment.config.route.js
 *
 * Routes for Region-wise Payment Gateway Configuration & Order Processing.
 * Mounted at: /payment-config (under /admin-api, /api)
 */

'use strict';

const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const h = require('../controller/region.payment.config.handler');

// ── Public / Checkout Resolution (No auth required for checkout) ─────────────
router.get('/resolve', h.resolve_payment_config);
router.get('/bank-account', h.get_bank_account_details);

// ── Admin Offline Bank Account Settings (CRUD) ────────────────────────────────
router.put('/bank-account', check_auth, h.update_bank_account_details);
router.post('/bank-account', check_auth, h.update_bank_account_details);

// ── Admin Region Payment Configuration CRUD ──────────────────────────────────
router.get('/regions', check_auth, h.list_configs);
router.get('/regions/:id', check_auth, h.get_config_by_id);
router.post('/regions', check_auth, h.create_config);
router.put('/regions/:id', check_auth, h.update_config);
router.patch('/regions/:id/toggle', check_auth, h.toggle_config);

// ── Admin Offline Payment Approval Queue ─────────────────────────────────────
router.get('/offline-pending', check_auth, h.list_pending_offline_orders);
router.post('/offline-orders/:orderType/:id/approve', check_auth, h.approve_offline_order);
router.post('/offline-orders/:orderType/:id/reject', check_auth, h.reject_offline_order);

module.exports = router;
