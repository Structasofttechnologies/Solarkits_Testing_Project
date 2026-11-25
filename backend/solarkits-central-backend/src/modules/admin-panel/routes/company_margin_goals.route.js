/**
 * company_margin_goals.route.js
 * Prefix: /admin-api/company/margin-goals
 * Permission code: ADM_CO_MARGIN
 */
const express = require('express');
const router  = express.Router();
const check_auth        = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/company_margin_goals.handler');

const check_perms = (action) =>
  check_permissions([
    { unique_code: 'ADM_CO_MARGIN', permissions: [action] },
    { unique_code: 'FPO_COMM', permissions: [action] },
    { unique_code: 'FPO_TARGET', permissions: [action] },
    { unique_code: 'RSL_MGMT', permissions: [action] },
  ]);

// Goals CRUD
router.get('/list',        check_auth, check_perms('view'),   h.list_goals);
router.get('/achievement', check_auth, check_perms('view'),   h.get_achievement_summary);
router.post('/add',        check_auth, check_perms('add'),    h.add_goal);
router.put('/update',      check_auth, check_perms('edit'),   h.update_goal);
router.delete('/delete',   check_auth, check_perms('delete'), h.delete_goal);

// Commission Ledger (admin read)
router.get('/commission-ledger', check_auth, check_perms('view'), h.get_commission_ledger);

// Margin Analytics (real data aggregation)
router.get('/analytics',         check_auth, check_perms('view'), h.get_margin_analytics);

module.exports = router;
