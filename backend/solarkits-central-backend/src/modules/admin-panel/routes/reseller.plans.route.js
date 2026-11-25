/**
 * reseller.plans.route.js
 *
 * Admin routes for Reseller Plan management.
 * Unique permission code: RSL_PLAN
 * Prefix: /admin-api/resellers/plans
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.plans.handler');

router.get(
  '/list',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
  ]),
  handler.list_reseller_plans
);

router.get(
  '/config-options',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
  ]),
  handler.get_plan_config_options
);

router.post(
  '/add',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PLAN', permissions: ['add'] }]),
  handler.add_reseller_plan
);

router.put(
  '/update',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PLAN', permissions: ['edit'] }]),
  handler.update_reseller_plan
);

router.put(
  '/toggle-status',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PLAN', permissions: ['edit'] }]),
  handler.toggle_reseller_plan_status
);

router.delete(
  '/delete',
  check_auth,
  check_permissions([{ unique_code: 'RSL_PLAN', permissions: ['delete'] }]),
  handler.delete_reseller_plan
);

module.exports = router;
