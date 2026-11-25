const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/order_settings.handler');

// Permissions checking helper for unique_code = ADM_ORDER_SETTINGS
const check_view_perms = check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }]);
const check_edit_perms = check_permissions([
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['add'] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['edit'] }
]);

router.get('/', check_auth, check_view_perms, handler.get_order_settings);
router.post('/save', check_auth, check_edit_perms, handler.save_order_settings);

module.exports = router;
