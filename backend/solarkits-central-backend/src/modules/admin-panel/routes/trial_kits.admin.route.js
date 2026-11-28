const express = require('express');
const router = express.Router();
const handler = require('../controller/trial_kit_admin.handler');
const procurementHandler = require('../controller/trial_kit_procurement.handler');
const feedbackConfigHandler = require('../controller/trial_kit_feedback_config.handler');
const check_auth = require('../middlewares/check.auth');

// ── Multi-Stage Procurement & Inward Ecosystem (Warehouse ➔ Accounts ➔ Admin) ────
router.post('/procurement/request', check_auth, procurementHandler.request_inward);
router.get('/procurement/list', check_auth, procurementHandler.list_procurements);
router.get('/procurement/badge-counts', check_auth, procurementHandler.get_procurement_badge_counts);
router.get('/procurement/:id/component-breakdown', check_auth, procurementHandler.get_component_breakdown);
router.get('/procurement/:id', check_auth, procurementHandler.get_procurement_details);
router.post('/procurement/:id/record-payment', check_auth, procurementHandler.record_payment);
router.post('/procurement/:id/approve', check_auth, procurementHandler.admin_approve_procurement);
router.post('/procurement/:id/reject', check_auth, procurementHandler.admin_reject_procurement);

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

// ── State & District Wise Feedback & Intent Configurations ────────────────────
router.get('/feedback-configs/states', check_auth, feedbackConfigHandler.get_states);
router.get('/feedback-configs/districts', check_auth, feedbackConfigHandler.get_districts_with_config);
router.put('/feedback-configs/district/:district_id', check_auth, feedbackConfigHandler.save_district_config);
router.put('/feedback-configs/state-default/:state_id', check_auth, feedbackConfigHandler.save_state_default_config);
router.delete('/feedback-configs/district/:district_id', check_auth, feedbackConfigHandler.reset_district_config);

module.exports = router;
