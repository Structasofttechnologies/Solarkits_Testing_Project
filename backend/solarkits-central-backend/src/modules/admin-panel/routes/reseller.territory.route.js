/**
 * reseller.territory.route.js
 *
 * Admin routes for Reseller Territory management.
 * Unique permission code: RSL_TERRITORY
 * Prefix: /admin-api/reseller-mgmt/territories
 *
 * Phase 3 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.territory.handler');

router.get(
  '/list/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TERRITORY', permissions: ['view'] }]),
  handler.list_reseller_territories
);

router.post(
  '/assign/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TERRITORY', permissions: ['add'] }]),
  handler.assign_territory
);

router.delete(
  '/delete/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TERRITORY', permissions: ['delete'] }]),
  handler.remove_territory
);

router.get(
  '/history/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TERR_HIST', permissions: ['view'] }, { unique_code: 'RSL_TERRITORY', permissions: ['view'] }]),
  handler.get_territory_history
);

router.post(
  '/validate/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TERRITORY', permissions: ['view'] }]),
  handler.validate_territory_access
);

module.exports = router;
