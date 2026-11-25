/**
 * store.management.payment.route.js
 *
 * Routes for Store Setup Fee Payment Verification Sub-Module.
 * Prefix: /store-management/payments
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/store.management.payment.handler');

const VIEW_PERMISSIONS = [
  { unique_code: 'STR_MGMT', permissions: ['view'] },
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
  { unique_code: 'ACC_MGMT', permissions: ['view'] },
];

const EDIT_PERMISSIONS = [
  { unique_code: 'STR_MGMT', permissions: ['edit'] },
  { unique_code: 'RSL_MGMT', permissions: ['edit'] },
  { unique_code: 'ACC_MGMT', permissions: ['edit'] },
];

router.post('/submit', check_auth, check_permissions(EDIT_PERMISSIONS), handler.submit_fee_payment);
router.post('/verify', check_auth, check_permissions(EDIT_PERMISSIONS), handler.verify_fee_payment);
router.post('/reject', check_auth, check_permissions(EDIT_PERMISSIONS), handler.reject_fee_payment);
router.get('/queue', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_payment_queue);

module.exports = router;
