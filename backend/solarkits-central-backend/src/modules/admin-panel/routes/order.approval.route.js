const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const controller = require('../controller/order.approval.controller');

// ─── 1. Summary KPIs ─────────────────────────────────────────────────────────
router.get('/summary', check_auth, controller.get_summary);

// ─── 2. Unified Approval Queue ───────────────────────────────────────────────
router.get('/queue', check_auth, controller.get_queue);

// ─── 3. Action Dispatcher (Approve / Reject / Return) ─────────────────────────
router.post('/:stage/:id/action', check_auth, controller.submit_action);

// ─── 4. Stage Rules & TAT Configuration ──────────────────────────────────────
router.get('/config', check_auth, controller.get_config);
router.put('/config', check_auth, controller.update_config);

module.exports = router;
