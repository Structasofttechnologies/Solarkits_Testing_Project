/**
 * store.management.onboarding.route.js
 *
 * Admin routes for Store Management Onboarding Engine.
 * Prefix: /store-management/onboarding
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/store.management.onboarding.handler');

const VIEW_PERMISSIONS = [
  { unique_code: 'RSL_MGMT', permissions: ['view'] },
  { unique_code: 'STR_MGMT', permissions: ['view'] },
  { unique_code: 'STR_TYPE_CFG', permissions: ['view'] },
];

const ADD_PERMISSIONS = [
  { unique_code: 'RSL_MGMT', permissions: ['add'] },
  { unique_code: 'STR_MGMT', permissions: ['add'] },
];

const EDIT_PERMISSIONS = [
  { unique_code: 'RSL_MGMT', permissions: ['edit'] },
  { unique_code: 'STR_MGMT', permissions: ['edit'] },
];

router.post('/create', check_auth, check_permissions(ADD_PERMISSIONS), handler.create_store);
router.post('/advance-status', check_auth, check_permissions(EDIT_PERMISSIONS), handler.advance_status);
router.post('/hold-or-reject', check_auth, check_permissions(EDIT_PERMISSIONS), handler.reject_or_hold_store);
router.post('/activate', check_auth, check_permissions(EDIT_PERMISSIONS), handler.activate_store);

router.get('/status-history/:store_id', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_status_history);
router.get('/queue', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_onboarding_queue);
router.get('/pipeline-stats', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_pipeline_stats);
router.get('/details/:store_id', check_auth, check_permissions(VIEW_PERMISSIONS), handler.get_store_details);

module.exports = router;
