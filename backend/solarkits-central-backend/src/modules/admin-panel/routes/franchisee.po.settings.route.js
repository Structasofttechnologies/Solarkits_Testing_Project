/**
 * franchisee.po.settings.route.js
 * Prefix: /admin-api/franchisee/po-settings
 * Permission code: FPO_SETTINGS
 */
const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const h = require('../controller/franchisee.po.settings.handler');

router.get('/list', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['view'] }]), h.list_po_settings);
router.get('/contract', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['view'] }]), h.get_plan_po_contract);
router.post('/contract/save', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['edit', 'add'] }]), h.save_plan_po_contract);
router.post('/add', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['add'] }]), h.add_po_settings);
router.put('/update', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['edit'] }]), h.update_po_settings);
router.put('/toggle-status', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['edit'] }]), h.toggle_po_settings_status);
router.delete('/delete', check_auth, check_permissions([{ unique_code: 'FPO_SETTINGS', permissions: ['delete'] }]), h.delete_po_settings);

module.exports = router;
