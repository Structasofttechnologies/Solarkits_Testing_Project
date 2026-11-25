const express = require('express')
const router = express.Router()

const user_panels_handler = require('../controller/user_panels.handler');
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');

router.get('/', check_auth, check_permissions([{ unique_code: 'DEV_PANELS', permissions: ['view'] }]), user_panels_handler.get_panels);
router.post('/', check_auth, check_permissions([{ unique_code: 'DEV_PANELS', permissions: ['add'] }]), user_panels_handler.create_panel);
router.get('/update-otp/:id', check_auth, check_permissions([{ unique_code: 'DEV_PANELS', permissions: ['edit'] }]), user_panels_handler.send_otp_for_update_panel);
router.put('/:id', check_auth, check_permissions([{ unique_code: 'DEV_PANELS', permissions: ['edit'] }]), user_panels_handler.update_panel);

module.exports = router