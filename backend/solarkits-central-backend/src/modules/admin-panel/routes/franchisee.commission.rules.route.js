/**
 * franchisee.commission.rules.route.js
 * Prefix: /admin-api/franchisee/commission-rules
 * Permission code: FPO_COMM
 */
const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.commission.rules.handler');

router.get('/list',            check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['view'] }]), h.list_commission_rules);
router.post('/add',            check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['add']  }]), h.add_commission_rule);
router.put('/update',          check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['edit'] }]), h.update_commission_rule);
router.put('/toggle-status',   check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['edit'] }]), h.toggle_commission_rule_status);
router.delete('/delete',       check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['delete'] }]), h.delete_commission_rule);

// ── Individual Franchisee Variation Commission Rules ────────────────────────
router.get('/individual/list', check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['view'] }]), h.get_individual_commission_rules);
router.post('/individual/save', check_auth, check_permissions([{ unique_code: 'FPO_COMM', permissions: ['add', 'edit'] }]), h.save_individual_commission_rules);

module.exports = router;
