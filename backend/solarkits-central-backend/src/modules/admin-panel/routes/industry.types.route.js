/**
 * industry.types.route.js
 *
 * Admin routes for Industry Type management.
 * All routes require CMS auth + module permission check (unique_code: ADM_INDUSTRY_TYPES).
 *
 * Route prefix (registered in index.js): /admin-api/industry-types
 *
 * Phase 1 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/industry.types.handler');

// ─── Industry Type CRUD ────────────────────────────────────────────────────────

const ALLOWED_VIEW_MODULES = [
  { unique_code: 'ADM_INDUSTRY_TYPES',    permissions: ['view'] },
  { unique_code: 'ADM_PROJ_TYPES',        permissions: ['view'] },
  { unique_code: 'ADM_SOLAR_KITS',        permissions: ['view'] },
  { unique_code: 'ADM_COMBO_KITS',        permissions: ['view'] },
  { unique_code: 'ADM_COMBO_KIT_VARIANTS',permissions: ['view'] },
  { unique_code: 'ADM_CUSTOMIZE_KITS',    permissions: ['view'] },
  { unique_code: 'ADM_PO_ORDERS',         permissions: ['view'] },
  { unique_code: 'ADM_BULK_COMBO',        permissions: ['view'] },
  { unique_code: 'ADM_WH_KIT_ACT',        permissions: ['view'] },
  { unique_code: 'ADM_WH_BULK_CONFIG',    permissions: ['view'] },
  { unique_code: 'ADM_WH_KIT_CONFIG',     permissions: ['view'] },
  { unique_code: 'ADM_WH_PO_CONFIG',      permissions: ['view'] },
  { unique_code: 'ADM_ORDER_SETTINGS',    permissions: ['view'] },
  { unique_code: 'RSL_MGMT',              permissions: ['view'] },
  { unique_code: 'RSL_PROD_AUTH',         permissions: ['view'] },
  { unique_code: 'RSL_PRODAUTH',          permissions: ['view'] },
  { unique_code: 'FPO_MOQ',               permissions: ['view'] },
];

const ALLOWED_ADD_MODULES = [
  { unique_code: 'ADM_INDUSTRY_TYPES',    permissions: ['add'] },
  { unique_code: 'ADM_PROJ_TYPES',        permissions: ['add'] },
  { unique_code: 'ADM_SOLAR_KITS',        permissions: ['add'] },
  { unique_code: 'ADM_COMBO_KITS',        permissions: ['add'] },
];

const ALLOWED_EDIT_MODULES = [
  { unique_code: 'ADM_INDUSTRY_TYPES',    permissions: ['edit'] },
  { unique_code: 'ADM_PROJ_TYPES',        permissions: ['edit'] },
  { unique_code: 'ADM_SOLAR_KITS',        permissions: ['edit'] },
  { unique_code: 'ADM_COMBO_KITS',        permissions: ['edit'] },
];

const ALLOWED_DELETE_MODULES = [
  { unique_code: 'ADM_INDUSTRY_TYPES',    permissions: ['delete'] },
  { unique_code: 'ADM_PROJ_TYPES',        permissions: ['delete'] },
  { unique_code: 'ADM_SOLAR_KITS',        permissions: ['delete'] },
  { unique_code: 'ADM_COMBO_KITS',        permissions: ['delete'] },
];

router.get(
  '/list',
  check_auth,
  check_permissions(ALLOWED_VIEW_MODULES),
  handler.list_industry_types
);

router.post(
  '/add',
  check_auth,
  check_permissions(ALLOWED_ADD_MODULES),
  handler.add_industry_type
);

router.put(
  '/update',
  check_auth,
  check_permissions(ALLOWED_EDIT_MODULES),
  handler.update_industry_type
);

router.put(
  '/toggle-status',
  check_auth,
  check_permissions(ALLOWED_EDIT_MODULES),
  handler.toggle_industry_type_status
);

router.delete(
  '/delete',
  check_auth,
  check_permissions(ALLOWED_DELETE_MODULES),
  handler.delete_industry_type
);

// ─── Project-Subcategory ↔ Industry Type Mappings ─────────────────────────────

router.post(
  '/map-to-subcategory',
  check_auth,
  check_permissions([{ unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['add'] }]),
  handler.map_industry_to_subcategory
);

router.delete(
  '/unmap',
  check_auth,
  check_permissions([{ unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['delete'] }]),
  handler.unmap_industry_from_subcategory
);

router.get(
  '/mappings',
  check_auth,
  check_permissions([
    { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['view'] },
    { unique_code: 'ADM_PROJ_TYPES',     permissions: ['view'] },
    { unique_code: 'RSL_MGMT',           permissions: ['view'] },
  ]),
  handler.get_industry_mappings_for_subcategory
);

// ─── Public list (no auth — for reseller/EPC frontend industry selectors) ─────
router.get('/public/list', handler.list_industry_types_public);

// ─── User-Industry Assignment (admin only) ────────────────────────────────────
const USER_ASSIGN_MODULES = [
  { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['add', 'edit'] },
  { unique_code: 'RSL_MGMT',           permissions: ['add', 'edit'] },
];

router.post(
  '/user-assign',
  check_auth,
  check_permissions(USER_ASSIGN_MODULES),
  handler.assign_user_to_industry
);

router.post(
  '/user-revoke',
  check_auth,
  check_permissions(USER_ASSIGN_MODULES),
  handler.revoke_user_from_industry
);

router.get(
  '/user-assignments',
  check_auth,
  check_permissions([
    { unique_code: 'ADM_INDUSTRY_TYPES', permissions: ['view'] },
    { unique_code: 'RSL_MGMT',           permissions: ['view'] },
  ]),
  handler.list_user_industry_assignments
);

module.exports = router;

