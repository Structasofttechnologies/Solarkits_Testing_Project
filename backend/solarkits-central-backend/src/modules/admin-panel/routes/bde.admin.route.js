/**
 * bde.admin.route.js
 *
 * Admin routes for SolarKits BDE Management.
 * Prefix: /admin-api/bde or /admin-api/bde-mgmt
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/bde.admin.handler');
const { upload_any_files } = require('../utils/upload.files');

const bdeDocUpload = upload_any_files('public/uploads/bde', 10);

// Overview Dashboard Stats
router.get(
  '/dashboard-stats',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_dashboard_stats
);

// Performance KPIs & Evaluation Dashboard
router.get(
  '/performance/dashboard',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_bde_performance_dashboard
);

// List and Search BDEs
router.get(
  ['/list', '/all', '/'],
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.list_bdes
);

// Create BDE
router.post(
  '/create',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['add'] }]),
  bdeDocUpload,
  handler.create_bde
);

// Get BDE Detail
router.get(
  '/detail/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_bde_detail
);

// Update BDE Profile
router.put(
  '/update/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit'] }]),
  bdeDocUpload,
  handler.update_bde
);

// Upload / Re-upload KYC Documents
router.post(
  '/kyc/upload/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit', 'add'] }]),
  bdeDocUpload,
  handler.upload_kyc
);

// Review KYC (Verify / Reject)
router.put(
  '/kyc/review/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit'] }]),
  handler.review_kyc
);

// Change Status (Activate / Suspend / Deactivate)
router.put(
  '/status/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit'] }]),
  handler.change_status
);

// Reset Login Credentials
router.post(
  '/reset-login/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit'] }]),
  handler.reset_login
);

// Territory Assignment
router.post(
  '/territory/assign',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit', 'add'] }]),
  handler.assign_territory
);

router.get(
  '/territory/:bde_id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_territory
);

router.delete(
  '/territory/:bde_id/:assignment_id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit', 'delete'] }]),
  handler.remove_territory_assignment
);

// Franchisee Plan Assignment
router.post(
  '/plans/assign',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit', 'add'] }]),
  handler.assign_plans
);

router.get(
  '/plans/:bde_id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_plans
);

// Goal Assignment
router.post(
  '/goals/assign',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit', 'add'] }]),
  handler.assign_goals
);

router.get(
  '/goals/:bde_id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_goals
);

// Onboarding Permissions Toggle
router.put(
  '/permissions/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['edit'] }]),
  handler.update_bde_permissions
);

// Activity History
router.get(
  '/activity-history/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  handler.get_activity_history
);

// Step 2: BDE Leads, Reassignment, Territory Exceptions & Funnel
router.use('/leads', require('./bde.lead.admin.route'));

module.exports = router;
