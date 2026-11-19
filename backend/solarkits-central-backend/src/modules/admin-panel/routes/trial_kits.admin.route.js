const express = require('express');
const router = express.Router();
const handler = require('../controller/trial_kit_admin.handler');
const check_auth = require('../middlewares/check.auth');

// ── Stock Management (Admin & Account) ─────────────────────────────────────────
router.get('/stock', check_auth, handler.get_stock);
router.post('/stock/allocate', check_auth, handler.allocate_stock);
router.post('/stock/inward', check_auth, handler.inward_stock);
router.post('/stock/adjust', check_auth, handler.adjust_stock);
router.get('/stock/history', check_auth, handler.get_stock_history);

// ── Orders & Delivery Tracking (Admin, Account, Warehouse) ────────────────────
router.get('/filter-options', check_auth, handler.get_filter_options);
router.get('/orders', check_auth, handler.get_orders);
router.get('/badge-count', check_auth, handler.get_badge_count);
router.post('/group-and-send', check_auth, handler.group_and_send_orders);
router.post('/direct-out-for-delivery', check_auth, handler.direct_out_for_delivery);
router.post('/mark-delivered', check_auth, handler.mark_delivered);
router.put('/orders/:id/delivery', check_auth, handler.update_delivery);
router.post('/orders/:id/cancel-reversal', check_auth, handler.admin_cancel_reversal);
router.put('/orders/:order_id/reassign-bde', check_auth, handler.reassign_bde);

// ── Analytics & Conversion BI (Admin & Account) ──────────────────────────────
router.get('/analytics/summary', check_auth, handler.get_analytics_summary);
router.get('/analytics/conversion-comparison', check_auth, handler.get_conversion_comparison);

module.exports = router;
