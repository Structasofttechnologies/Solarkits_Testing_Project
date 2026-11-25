/**
 * store.setup.admin.route.js
 *
 * Admin and State-Employee routes for Store Setup, Operations, Expansion Plans & Performance.
 * Prefix: /admin-api/store-setup
 */

const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const adminHandler = require('../controller/store.setup.admin.handler');
const employeeHandler = require('../controller/store.setup.employee.handler');
const { upload_any_files } = require('../utils/upload.files');

const proofUpload = upload_any_files('public/uploads/store_setup', 10);

// ── ADMIN STORE SETUP MANAGEMENT ─────────────────────────────────────────────
router.get(
  '/dashboard-stats',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.get_dashboard_stats
);

router.get(
  '/list',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.list_store_setups
);

router.get(
  '/detail/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.get_store_setup_detail
);

router.get(
  '/coordinators',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }, { unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  adminHandler.list_coordinators
);

router.get(
  '/employees',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }, { unique_code: 'ADM_BDE_MGMT', permissions: ['view'] }]),
  adminHandler.list_coordinators
);

router.post(
  '/assign-employee/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit', 'add'] }]),
  adminHandler.assign_employee
);

router.put(
  '/delay/review/:delay_id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit'] }]),
  adminHandler.review_delay_request
);

router.put(
  '/verification/review/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit'] }]),
  adminHandler.review_final_verification
);

router.post(
  '/start-operations/:id',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit'] }]),
  adminHandler.start_operations
);

// ── SETTINGS & CHECKLIST TEMPLATE ─────────────────────────────────────────────
router.get(
  '/settings',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.get_settings
);

router.put(
  '/settings',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit'] }]),
  adminHandler.update_settings
);

router.post(
  '/settings/sync-active',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['edit'] }]),
  adminHandler.sync_active_setups
);

// ── EXPANSION PLANS ───────────────────────────────────────────────────────────
router.get(
  '/expansion-plans/list',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.list_expansion_plans
);

router.post(
  '/expansion-plans/create',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['add', 'edit'] }]),
  adminHandler.create_expansion_plan
);

// ── FRANCHISEE PERFORMANCE RANKING ────────────────────────────────────────────
router.get(
  '/performance/ranking',
  check_auth,
  check_permissions([{ unique_code: 'ADM_STORE_SETUP', permissions: ['view'] }]),
  adminHandler.get_franchisee_performance_ranking
);

// ── STATE EMPLOYEE WORKFLOWS (Scoped) ─────────────────────────────────────────
router.get(
  '/employee/assigned-list',
  check_auth,
  employeeHandler.list_assigned_setups
);

router.post(
  '/employee/start/:id',
  check_auth,
  employeeHandler.start_setup
);

router.put(
  '/employee/checklist/:id/:activity_id',
  check_auth,
  proofUpload,
  employeeHandler.update_checklist_activity
);

router.post(
  '/employee/delay-request/:id',
  check_auth,
  proofUpload,
  employeeHandler.submit_delay_request
);

router.post(
  '/employee/submit-verification/:id',
  check_auth,
  employeeHandler.submit_for_admin_verification
);

module.exports = router;
