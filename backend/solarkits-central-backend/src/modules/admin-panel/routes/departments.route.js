const express = require('express')
const router = express.Router()
const departments_handler = require('../controller/departments.handler')
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const { CmsDepartment } = require('../models/user_db');
const check_protected = require('../middlewares/check.protected');

router.get('/', check_auth, check_permissions([{unique_code: 'ADM_DEPTS', permissions: ['view']},{unique_code: 'ADM_RBAC', permissions: ['add']}]), departments_handler.get_departments)
router.post('/', check_auth, check_permissions([{unique_code: 'ADM_DEPTS', permissions: ['add']}]), departments_handler.create_department)
router.get('/update-otp/:id', check_auth, check_permissions([{unique_code: 'ADM_DEPTS', permissions: ['add']}]), departments_handler.send_otp_for_update_department)
router.put('/:id', check_auth, check_permissions([{unique_code: 'ADM_DEPTS', permissions: ['edit']}]), check_protected(CmsDepartment), departments_handler.update_department)
module.exports = router