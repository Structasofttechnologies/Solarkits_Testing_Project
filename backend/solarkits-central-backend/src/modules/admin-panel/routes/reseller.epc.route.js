/**
 * reseller.epc.route.js
 *
 * Admin routes for Reseller-Onboarded EPC Buyer Pipeline.
 * Unique permission code: RSL_EPC_BUYERS
 * Prefix: /admin-api/reseller-mgmt/epc-buyers
 *
 * Phase 5 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.epc.handler');

router.get(
  '/list',
  check_auth,
  check_permissions([{ unique_code: 'RSL_EPC_BUYERS', permissions: ['view'] }]),
  handler.list_reseller_epc_buyers
);

router.put(
  '/review/:signup_request_id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_EPC_BUYERS', permissions: ['edit'] }]),
  handler.review_reseller_epc_buyer
);

module.exports = router;
