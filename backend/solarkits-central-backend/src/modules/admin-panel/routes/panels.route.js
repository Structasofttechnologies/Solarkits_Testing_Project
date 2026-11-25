const express = require('express')
const router = express.Router()
const panels_handler = require('../controller/panels.handler')
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.get('/', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['add'] },{ unique_code: 'ADM_DEPTS', permissions: ['add'] }]), panels_handler.get_panels);

module.exports = router