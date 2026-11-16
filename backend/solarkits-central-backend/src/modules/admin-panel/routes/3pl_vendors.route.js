const express = require('express');
const router = express.Router();

const vendor_handler = require('../controller/3pl_vendors.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

const VIEW_PERMS = [
  { unique_code: 'ADM_WAREHOUSES', permissions: ['view'] },
  { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] },
  { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] },
  { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }
];

const ADD_PERMS = [
  { unique_code: 'ADM_WAREHOUSES', permissions: ['add'] },
  { unique_code: 'ADM_WH_KIT_ACT', permissions: ['add'] }
];

const EDIT_PERMS = [
  { unique_code: 'ADM_WAREHOUSES', permissions: ['edit'] },
  { unique_code: 'ADM_WH_KIT_ACT', permissions: ['edit'] }
];

router.get('/approved', check_auth, check_permissions(VIEW_PERMS), vendor_handler.get_approved_vendors);
router.get('/', check_auth, check_permissions(VIEW_PERMS), vendor_handler.get_vendors);
router.get('/:id', check_auth, check_permissions(VIEW_PERMS), vendor_handler.get_vendor);
router.post('/register', check_auth, check_permissions(ADD_PERMS), vendor_handler.register_vendor);
router.put('/:id', check_auth, check_permissions(EDIT_PERMS), vendor_handler.update_vendor);
router.post('/:id/verify-document', check_auth, check_permissions(EDIT_PERMS), vendor_handler.verify_document);
router.post('/:id/change-status', check_auth, check_permissions(EDIT_PERMS), vendor_handler.change_vendor_status);

module.exports = router;
