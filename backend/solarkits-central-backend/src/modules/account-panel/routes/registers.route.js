const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/registers.handler');

// ── Statutory & Operational Registers Routes ────────────────────────────────
router.get('/summary', check_auth, handler.get_registers_summary);
router.get('/data', check_auth, handler.get_register_data);

module.exports = router;
