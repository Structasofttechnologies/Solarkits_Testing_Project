/**
 * reseller.prodauth.route.js
 *
 * Admin routes for Reseller Product Authorization Matrix.
 * Unique permission code: RSL_PROD_AUTH
 * Prefix: /admin-api/reseller-mgmt/product-auth
 *
 * Phase 4 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.prodauth.handler');

const VIEW_AUTH_PERMISSIONS = [
  { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] },
  { unique_code: 'FPO_COMM', permissions: ['view'] },
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
];

router.get(
  '/list-all',
  check_auth,
  check_permissions(VIEW_AUTH_PERMISSIONS),
  (req, res) => {
    req.params.id = 'all';
    return handler.list_product_authorizations(req, res);
  }
);

router.get(
  '/list',
  check_auth,
  check_permissions(VIEW_AUTH_PERMISSIONS),
  (req, res) => {
    req.params.id = req.query.reseller_id || req.query.id || 'all';
    return handler.list_product_authorizations(req, res);
  }
);

router.get(
  '/list/:id',
  check_auth,
  check_permissions(VIEW_AUTH_PERMISSIONS),
  handler.list_product_authorizations
);

router.post(
  '/assign/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['add'] }]),
  handler.assign_product_authorization
);

router.put(
  '/revoke/:rule_id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['edit'] }]),
  handler.revoke_product_authorization
);

router.put(
  '/stock/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['edit'] }]),
  handler.update_product_auth_stock
);

router.get(
  '/check-auth/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }]),
  handler.check_product_auth
);

router.post(
  '/seed-dummy/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['add'] }]),
  handler.seed_dummy_rules
);

// ── District Product Rules Routes ─────────────────────────────────────────────
router.get(
  '/district-rules',
  check_auth,
  check_permissions([{ unique_code: 'RSL_DIST_RULE', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }]),
  handler.list_district_product_rules
);

router.post(
  '/district-rules',
  check_auth,
  check_permissions([{ unique_code: 'RSL_DIST_RULE', permissions: ['add'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['add'] }]),
  handler.create_district_product_rule
);

router.delete(
  '/district-rules/:id',
  check_auth,
  check_permissions([{ unique_code: 'RSL_DIST_RULE', permissions: ['delete'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['delete'] }]),
  handler.delete_district_product_rule
);

// ── Kit Cluster Authorizations Routes (New Architecture) ────────────────────────
const clusterAuthHandler = require('../controller/solarshop/kit_cluster_auth.handler');

router.get('/filter-options', check_auth, check_permissions(VIEW_AUTH_PERMISSIONS), clusterAuthHandler.get_filter_options);
router.get('/cluster-kits', check_auth, check_permissions(VIEW_AUTH_PERMISSIONS), clusterAuthHandler.get_cluster_kits);
router.post('/toggle-auth', check_auth, check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['edit'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['add'] }]), clusterAuthHandler.toggle_kit_auth);
router.post('/bulk-toggle-auth', check_auth, check_permissions([{ unique_code: 'RSL_PROD_AUTH', permissions: ['edit'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['add'] }]), clusterAuthHandler.bulk_toggle_auth);
router.get('/map-coverage-summary', check_auth, check_permissions(VIEW_AUTH_PERMISSIONS), clusterAuthHandler.get_map_coverage_summary);

module.exports = router;
