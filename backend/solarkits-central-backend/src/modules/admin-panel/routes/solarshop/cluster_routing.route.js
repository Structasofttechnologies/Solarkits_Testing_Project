const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/cluster_routing.handler');

// Permissions checking helpers for unique_code = ADM_ORDER_SETTINGS
const check_perms = (action) => check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: [action] }]);
const check_view_perms = check_perms('view');
const check_add_perms = check_perms('add');
const check_edit_perms = check_perms('edit');
const check_delete_perms = check_perms('delete');

// 1. Clusters
router.get('/clusters', check_auth, check_view_perms, handler.get_clusters);
router.post('/clusters', check_auth, check_add_perms, handler.create_cluster);
router.put('/clusters/:id', check_auth, check_edit_perms, handler.update_cluster);
router.delete('/clusters/:id', check_auth, check_delete_perms, handler.delete_cluster);

// 2. Warehouse Mappings & Coverage Options
router.get('/coverage-options', check_auth, check_view_perms, handler.get_coverage_options);
router.get('/mappings', check_auth, check_view_perms, handler.get_mappings);
router.post('/mappings', check_auth, check_add_perms, handler.create_mapping);
router.put('/mappings/:id', check_auth, check_edit_perms, handler.update_mapping);
router.delete('/mappings/:id', check_auth, check_delete_perms, handler.delete_mapping);

// 3. Kit Capabilities
router.get('/capabilities', check_auth, check_view_perms, handler.get_capabilities);
router.put('/capabilities/:warehouseId', check_auth, check_edit_perms, handler.update_capability);
router.patch('/capabilities/:warehouseId', check_auth, check_edit_perms, handler.update_capability);
router.post('/capabilities/toggle', check_auth, check_edit_perms, handler.update_capability);

// 4. Available Warehouses
router.get('/available-warehouses', check_auth, check_view_perms, handler.get_available_warehouses);

// 5. Route Resolver (Public / Store access as well)
router.post('/resolve-route', handler.resolve_route);

module.exports = router;
