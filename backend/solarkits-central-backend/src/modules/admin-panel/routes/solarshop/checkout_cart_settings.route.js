const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/checkout_cart_settings.handler');

const check_view_perms = check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }]);
const check_edit_perms = check_permissions([
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['add'] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['edit'] }
]);

router.get('/', check_auth, check_view_perms, handler.get_settings);
router.put('/', check_auth, check_edit_perms, handler.update_settings);
router.get('/metrics', check_auth, check_view_perms, handler.get_reservation_metrics);

module.exports = router;
