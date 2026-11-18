const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/invoice.do.settings.handler');

// ── Dynamic Invoice & Delivery Order (DO) Settings Routes ───────────────────
router.get('/', check_auth, handler.get_settings);
router.post('/', check_auth, handler.save_settings);
router.get('/scopes', check_auth, handler.list_all_scope_settings);
router.get('/warehouses', check_auth, handler.get_available_warehouses);
router.delete('/:id', check_auth, handler.delete_scope_settings);

module.exports = router;
