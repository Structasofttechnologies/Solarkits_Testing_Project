/**
 * reseller.analytics.route.js
 *
 * Admin routes for Executive Analytics & Tax Compliance Audit Reports.
 * Unique permission code: RSL_ANALYTICS
 * Prefix: /admin-api/reseller-mgmt/analytics
 *
 * Phase R10 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.analytics.handler');

router.get(
  '/dashboard',
  check_auth,
  check_permissions([{ unique_code: 'RSL_ANALYTICS', permissions: ['view'] }]),
  handler.get_executive_dashboard
);

router.get(
  '/tax-compliance',
  check_auth,
  check_permissions([{ unique_code: 'RSL_ANALYTICS', permissions: ['view'] }]),
  handler.get_tax_compliance_report
);

module.exports = router;
