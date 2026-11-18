/**
 * franchise.form.fields.route.js
 *
 * Routes for Franchise Application Form Field Configuration.
 * Module code: FPO_SETTINGS / RSL_SETTINGS
 */

const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/franchise.form.fields.handler');

// Public route for storefront
router.get('/public', handler.get_public_franchise_form_fields);

// Admin routes
router.get(
  '/',
  check_auth,
  check_permissions([
    { unique_code: 'FPO_SETTINGS', permissions: ['view'] },
    { unique_code: 'RSL_SETTINGS', permissions: ['view'] },
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
  ]),
  handler.get_admin_franchise_form_fields
);

router.put(
  '/',
  check_auth,
  check_permissions([
    { unique_code: 'FPO_SETTINGS', permissions: ['edit'] },
    { unique_code: 'RSL_SETTINGS', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.update_admin_franchise_form_fields
);

router.post(
  '/reset',
  check_auth,
  check_permissions([
    { unique_code: 'FPO_SETTINGS', permissions: ['edit'] },
    { unique_code: 'RSL_SETTINGS', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.reset_admin_franchise_form_fields
);

module.exports = router;
