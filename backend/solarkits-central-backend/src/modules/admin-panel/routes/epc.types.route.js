/**
 * epc.types.route.js
 *
 * Routes for EPC Classification Types management.
 * Mounted at:
 *   - /admin-api/epc-types
 *   - /api/epc-types
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/epc.types.handler');

// ─── Public / Client Portal Route (Dropdown options for BDE & Franchisee) ─────
router.get('/active', handler.list_active_epc_types);

// ─── Admin Master Routes ──────────────────────────────────────────────────────
router.get('/list', check_auth, handler.list_epc_types);
router.post('/add', check_auth, handler.add_epc_type);
router.post('/create', check_auth, handler.add_epc_type);
router.put('/update/:id', check_auth, handler.update_epc_type);
router.put('/toggle/:id', check_auth, handler.toggle_epc_type_status);
router.delete('/delete/:id', check_auth, handler.delete_epc_type);

module.exports = router;

