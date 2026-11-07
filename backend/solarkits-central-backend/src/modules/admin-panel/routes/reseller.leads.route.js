/**
 * reseller.leads.route.js
 *
 * Admin routes for Franchisee & Territory Application Leads CRM.
 * Unique permission code: RSL_MGMT
 * Prefix: /admin-api/resellers/leads & /admin-api/reseller-mgmt/leads
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/reseller.leads.handler');

router.post('/submit', handler.submit_lead);
router.get('/excluded-districts', handler.get_excluded_districts);
router.post('/gst-otp/generate', handler.generate_lead_gst_otp);
router.post('/gst-otp/verify', handler.verify_lead_gst_otp);

router.get(
  '/list',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['view'] },
    { unique_code: 'RSL_PLAN', permissions: ['view'] },
  ]),
  handler.list_leads
);

router.post(
  '/add',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['add'] },
    { unique_code: 'RSL_PLAN', permissions: ['add'] },
  ]),
  handler.add_manual_lead
);

router.post(
  '/:id/approve',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit', 'add'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit', 'add'] },
  ]),
  handler.approve_lead_as_franchisee
);

router.post(
  '/approve',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit', 'add'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit', 'add'] },
  ]),
  handler.approve_lead_as_franchisee
);

router.put(
  '/status',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.update_lead_status
);

router.put(
  '/:id/status',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.update_lead_status
);

router.put(
  '/:id/assign-bde',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.assign_lead_to_bde
);

router.put(
  '/assign-bde',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['edit'] },
    { unique_code: 'RSL_PLAN', permissions: ['edit'] },
  ]),
  handler.assign_lead_to_bde
);

router.delete(
  '/delete',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['delete'] },
    { unique_code: 'RSL_PLAN', permissions: ['delete'] },
  ]),
  handler.delete_lead
);

router.delete(
  '/:id',
  check_auth,
  check_permissions([
    { unique_code: 'RSL_MGMT', permissions: ['delete'] },
    { unique_code: 'RSL_PLAN', permissions: ['delete'] },
  ]),
  handler.delete_lead
);

module.exports = router;

