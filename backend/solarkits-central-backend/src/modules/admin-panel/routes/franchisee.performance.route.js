/**
 * franchisee.performance.route.js
 * Prefix: /admin-api/franchisee/performance
 * Permission code: FPO_ANALYTICS
 */
const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.performance.handler');

router.get('/tracker',              check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['view'] }]), h.get_performance_tracker);
router.get('/location',             check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['view'] }]), h.get_location_analytics);
router.get('/franchisee/:id',       check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['view'] }]), h.get_franchisee_performance);
router.get('/alerts',               check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['view'] }]), h.get_alerts);
router.put('/alerts/resolve',       check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['edit'] }]), h.resolve_alert);
router.post('/alerts/evaluate',     check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['edit'] }]), h.run_alert_evaluation);
router.get('/export/csv',           check_auth, check_permissions([{ unique_code: 'FPO_ANALYTICS', permissions: ['view'] }]), h.export_performance_csv);

module.exports = router;
