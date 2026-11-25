const express = require('express')
const router = express.Router()

const modules_handler = require('../controller/module.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.get('/', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['view'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['view'] }]), modules_handler.get_modules);
router.get('/levels', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['view', 'add', 'edit'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['view', 'add', 'edit'] }]), modules_handler.get_levels)
router.post('/', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['add'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['add'] }]), modules_handler.create_module);
router.get('/update-otp/:id', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['edit'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['edit'] }]), modules_handler.send_otp_for_update_module);
router.put('/:id', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['edit'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['edit'] }]), modules_handler.update_module);
router.get('/delete-otp/:id', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['delete'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['delete'] }]), modules_handler.send_otp_for_delete_module);
router.delete('/:id', check_auth, check_permissions([{ unique_code: 'DEV_MODULES', permissions: ['delete'] }, { unique_code: 'DEV_WH_MODULES', permissions: ['delete'] }]), modules_handler.delete_module);

module.exports = router