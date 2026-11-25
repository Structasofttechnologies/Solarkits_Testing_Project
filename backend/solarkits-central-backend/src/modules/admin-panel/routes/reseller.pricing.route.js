/**
 * reseller.pricing.route.js
 *
 * Admin routes for Reseller Listings, MAP Pricing Rules & Commission Controls.
 * Unique permission codes: RSL_LISTINGS, RSL_PRICING
 * Prefix: /admin-api/reseller-mgmt/pricing-rules
 *
 * Phase R7 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.pricing.handler');

router.get(
  '/',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PRICING', permissions: ['view'] }]),
  handler.list_pricing_rules
);

router.post(
  '/',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PRICING', permissions: ['add'] }]),
  handler.create_pricing_rule
);

router.delete(
  '/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PRICING', permissions: ['delete'] }]),
  handler.delete_pricing_rule
);

module.exports = router;
