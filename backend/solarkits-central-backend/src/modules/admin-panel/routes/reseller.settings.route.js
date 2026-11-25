/**
 * reseller.settings.route.js
 *
 * Admin routes for platform-wide Solarshop configuration.
 * Phase R1 — Roles, Permissions, Audit & Config Masters Reconciliation
 *
 * Prefix: /admin-api/reseller-mgmt/settings
 *
 * Permission codes:
 *   RSL_SETTINGS  — Read/update reseller platform configuration
 */

const express = require('express');
const router  = express.Router();

const check_auth        = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler           = require('../controller/reseller.settings.handler');

// GET /admin-api/reseller-mgmt/settings
// View current platform settings. Super Admin and anyone with RSL_SETTINGS view permission.
router.get(
  '/',
  check_auth,
  check_permissions([{ unique_code: 'RSL_SETTINGS', permissions: ['view'] }]),
  handler.get_platform_settings,
);

// PUT /admin-api/reseller-mgmt/settings
// Update platform settings. Super Admin only (enforced by RSL_SETTINGS edit + super_admin flag in check_auth).
router.put(
  '/',
  check_auth,
  check_permissions([{ unique_code: 'RSL_SETTINGS', permissions: ['edit'] }]),
  handler.update_platform_settings,
);

module.exports = router;
