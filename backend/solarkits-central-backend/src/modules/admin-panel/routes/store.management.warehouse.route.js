/**
 * store.management.warehouse.route.js
 *
 * Routes for Store Warehouse Allocation & Fulfillment Verification.
 * Prefix: /store-management/warehouses
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/store.management.warehouse.handler');

const VIEW_PERMISSIONS = [
  { unique_code: 'STR_MGMT', permissions: ['view'] },
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
  { unique_code: 'WH_MGMT', permissions: ['view'] },
];

const EDIT_PERMISSIONS = [
  { unique_code: 'STR_MGMT', permissions: ['edit'] },
  { unique_code: 'RSL_MGMT', permissions: ['edit'] },
  { unique_code: 'WH_MGMT', permissions: ['edit'] },
];

router.post('/allocate', check_auth, check_permissions(EDIT_PERMISSIONS), handler.allocate_warehouse);
router.post('/verify', check_auth, check_permissions(EDIT_PERMISSIONS), handler.verify_warehouse_allocation);
router.get('/list', check_auth, check_permissions(VIEW_PERMISSIONS), handler.list_warehouses);

module.exports = router;
