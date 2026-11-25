/**
 * franchisee.subtypes.route.js
 *
 * Admin routes for Franchisee Subtype management.
 * Prefix: /admin-api/store-management/subtypes
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/franchisee.subtypes.handler');

router.get(
  '/list',
  check_auth,
  check_permissions([
    { unique_code: 'STR_TYPE_CFG', permissions: ['view'] },
    { unique_code: 'STR_MGMT', permissions: ['view'] },
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
  ]),
  handler.list_subtypes
);

router.post(
  '/add',
  check_auth,
  check_permissions([
    { unique_code: 'STR_TYPE_CFG', permissions: ['add'] },
    { unique_code: 'STR_MGMT', permissions: ['add'] },
    { unique_code: 'RSL_PLAN', permissions: ['add'] },
  ]),
  handler.add_subtype
);

router.put(
  '/update',
  check_auth,
  check_permissions([
    { unique_code: 'STR_TYPE_CFG', permissions: ['edit'] },
    { unique_code: 'STR_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.update_subtype
);

router.put(
  '/toggle-status',
  check_auth,
  check_permissions([
    { unique_code: 'STR_TYPE_CFG', permissions: ['edit'] },
    { unique_code: 'STR_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.toggle_subtype_status
);

router.delete(
  '/delete',
  check_auth,
  check_permissions([
    { unique_code: 'STR_TYPE_CFG', permissions: ['delete'] },
    { unique_code: 'STR_MGMT', permissions: ['delete'] },
    { unique_code: 'RSL_PLAN', permissions: ['delete'] },
  ]),
  handler.delete_subtype
);

module.exports = router;
