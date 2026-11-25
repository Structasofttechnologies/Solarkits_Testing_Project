/**
 * product.payment.milestones.route.js
 *
 * Routes for Product-Wise Payment Milestone Configuration & Checkout Resolution.
 * Mounted at: /payment-milestones (under /admin-api, /api)
 */

'use strict';

const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const h = require('../controller/product.payment.milestones.handler');

// ── Public / EPC Checkout Resolution (No auth required to see product milestone terms) ──
router.get('/resolve', h.resolve_payment_milestones);

// ── Order Stages & Turnaround Time (TAT) Configuration ────────────────────────────────
router.get('/stages-tat', check_auth, h.get_order_stages_tat);
router.put('/stages-tat', check_auth, h.update_order_stages_tat);
router.post('/stages-tat', check_auth, h.update_order_stages_tat);

// ── Admin Product Payment Milestones CRUD ─────────────────────────────────────────────
router.get('/kits-overview', check_auth, h.get_kits_milestones_overview);
router.get('/list', check_auth, h.list_milestone_configs);
router.get('/get/:id', check_auth, h.get_milestone_config_by_id);
router.post('/create', check_auth, h.create_milestone_config);
router.put('/update/:id', check_auth, h.update_milestone_config);
router.delete('/delete/:id', check_auth, h.delete_milestone_config);
router.patch('/toggle/:id', check_auth, h.toggle_milestone_config);

module.exports = router;
