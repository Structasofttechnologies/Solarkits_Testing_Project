/**
 * franchisee.goal.route.js
 * Prefix: /admin-api/franchisee/goals
 * Permission code: FPO_GOAL
 */
const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.goal.handler');

router.get('/widget/:franchisee_id', check_auth, check_permissions([{ unique_code: 'FPO_GOAL', permissions: ['view'] }]),   h.get_goal_widget);
router.get('/widget',                check_auth, check_permissions([{ unique_code: 'FPO_GOAL', permissions: ['view'] }]),   h.get_goal_widget);
router.get('/progress',              check_auth, check_permissions([{ unique_code: 'FPO_GOAL', permissions: ['view'] }]),   h.list_all_progress);
router.post('/recalculate',          check_auth, check_permissions([{ unique_code: 'FPO_GOAL', permissions: ['edit'] }]),   h.trigger_recalculation);

module.exports = router;
