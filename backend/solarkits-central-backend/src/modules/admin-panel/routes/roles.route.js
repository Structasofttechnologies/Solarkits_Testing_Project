const express = require('express')
const router = express.Router()
const roles_handler = require('../controller/roles.handler')
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const { CmsRole } = require('../models/user_db');
const check_protected = require('../middlewares/check.protected');

router.get('/', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['view'] }]), roles_handler.get_roles)
router.get('/levels', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add','edit'] }]), roles_handler.get_levels)
router.post('/', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add'] }]), roles_handler.add_role)
router.get('/update-otp/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add'] }]), roles_handler.send_otp_for_update_role)
router.post('/send-otp-unassign-module', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['edit'] }]), roles_handler.send_otp_for_unassign_module)
router.post('/assign-module/:role_id/:module_id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add'] }]), roles_handler.assign_module_to_role)
router.post('/module-permission/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add'] }]), roles_handler.update_module_permissions)
router.put('/module-permission/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['edit'] }]), roles_handler.update_module_permissions)
router.post('/unassign-module/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['edit'] }]), roles_handler.unassign_module_from_role)
router.get('/country-saas-products/:country_id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['view'] }]), roles_handler.get_country_saas_products)
router.get('/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['view'] }]), roles_handler.get_role)
router.put('/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['edit'] }]), roles_handler.update_role)
router.delete('/:id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['edit'] }]), roles_handler.delete_role)
router.get('/:department_id/:level_id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['view'] }]), roles_handler.get_parent_roles)

module.exports = router