/**
 * franchisee.moq.rules.route.js
 * Prefix: /admin-api/franchisee/moq-rules
 * Permission code: FPO_MOQ
 */
const express = require('express');
const router  = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.moq.rules.handler');

router.get('/list',             check_auth, check_permissions([{ unique_code: 'FPO_MOQ', permissions: ['view'] }]), h.list_moq_rules);
router.post('/add',             check_auth, check_permissions([{ unique_code: 'FPO_MOQ', permissions: ['add']  }]), h.add_moq_rule);
router.put('/update',           check_auth, check_permissions([{ unique_code: 'FPO_MOQ', permissions: ['edit'] }]), h.update_moq_rule);
router.delete('/delete',        check_auth, check_permissions([{ unique_code: 'FPO_MOQ', permissions: ['delete'] }]), h.delete_moq_rule);
// Public validation endpoint — only auth required (no special permission needed for live validation)
router.post('/validate-quantity', check_auth, h.validate_quantity);

module.exports = router;
