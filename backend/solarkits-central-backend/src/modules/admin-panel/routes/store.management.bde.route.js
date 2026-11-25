/**
 * store.management.bde.route.js
 *
 * Routes for Company Store BDE Direct Assignment & History.
 * Prefix: /store-management/bde
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/store.management.bde.handler');

const VIEW_PERMISSIONS = [
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
  { unique_code: 'STR_MGMT', permissions: ['view'] },
  { unique_code: 'BDE_MGMT', permissions: ['view'] },
];

const EDIT_PERMISSIONS = [
  { unique_code: 'RSL_MGMT', permissions: ['edit'] },
  { unique_code: 'STR_MGMT', permissions: ['edit'] },
  { unique_code: 'BDE_MGMT', permissions: ['edit'] },
];

router.post('/assign', check_auth, check_permissions(EDIT_PERMISSIONS), handler.assign_bde_to_company_store);
router.get('/history/:store_id', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_company_store_bde_history);
router.get('/list', check_auth, check_permissions(VIEW_PERMISSIONS), handler.list_available_bdes);

module.exports = router;
