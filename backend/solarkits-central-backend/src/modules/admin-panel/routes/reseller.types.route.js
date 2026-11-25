/**
 * reseller.types.route.js
 *
 * Admin routes for Reseller Type management.
 * All routes require CMS auth + module permission check (unique_code: RSL_TYPES).
 *
 * Route prefix (registered in index.js): /admin-api/reseller-mgmt/types
 *
 * Phase 1 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.types.handler');

// ─── Reseller Type CRUD ────────────────────────────────────────────────────────

router.get(
  '/list',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TYPES', permissions: ['view'] }]),
  handler.list_reseller_types
);

router.post(
  '/add',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TYPES', permissions: ['add'] }]),
  handler.add_reseller_type
);

router.put(
  '/update',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TYPES', permissions: ['edit'] }]),
  handler.update_reseller_type
);

router.put(
  '/toggle-status',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TYPES', permissions: ['edit'] }]),
  handler.toggle_reseller_type_status
);

router.delete(
  '/delete',
  check_auth,
  check_permissions([{ unique_code: 'RSL_TYPES', permissions: ['delete'] }]),
  handler.delete_reseller_type
);

module.exports = router;
