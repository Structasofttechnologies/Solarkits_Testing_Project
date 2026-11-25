const express = require('express')
const router = express.Router()

const modules_handler = require('../controller/module.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.get('/:level_id/:panel_id', check_auth, check_permissions([{ unique_code: 'ADM_RBAC', permissions: ['view'] }]), modules_handler.get_modules_by_level_and_panel);

module.exports = router