const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/kit_cluster_auth.handler');

const check_perms = (action) => check_permissions([
  { unique_code: 'RSL_PROD_AUTH', permissions: [action] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: [action] },
  { unique_code: 'ADM_WH_KIT_ACT', permissions: [action] }
]);

const check_view_perms = check_perms('view');
const check_edit_perms = check_perms('edit');

// 1. Cascading Filter Masters
router.get('/filter-options', check_auth, check_view_perms, handler.get_filter_options);

// 2. Active Cluster Kits with Toggle Status
router.get('/cluster-kits', check_auth, check_view_perms, handler.get_cluster_kits);

// 3. Single Kit Authorization Toggle
router.post('/toggle-auth', check_auth, check_edit_perms, handler.toggle_kit_auth);

// 4. Bulk Kit Authorization Toggle
router.post('/bulk-toggle-auth', check_auth, check_edit_perms, handler.bulk_toggle_auth);

// 5. Regional Coverage Summary for Map View
router.get('/map-coverage-summary', check_auth, check_view_perms, handler.get_map_coverage_summary);

module.exports = router;
