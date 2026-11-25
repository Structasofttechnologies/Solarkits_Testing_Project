const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const handler = require('../../../account-panel/controller/solarshop.accounts.handler');

// Admin endpoints for Solar Shop EPC Orders & Payment Approvals
router.get('/', check_auth, handler.get_unified_epc_orders);
router.get('/check-duplicate-utr', check_auth, handler.check_duplicate_utr);
router.post('/:id/admin-approve', check_auth, handler.admin_approve_epc_payment);
router.get('/tat-config', check_auth, handler.get_tat_config);
router.put('/tat-config', check_auth, handler.update_tat_config);

module.exports = router;
