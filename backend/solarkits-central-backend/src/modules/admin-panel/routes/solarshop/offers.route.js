const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/offers.handler');

const check_view_perms = check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }]);
const check_edit_perms = check_permissions([
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['add'] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['edit'] }
]);

router.get('/', check_auth, check_view_perms, handler.get_offers);
router.post('/', check_auth, check_edit_perms, handler.create_offer);
router.put('/:id', check_auth, check_edit_perms, handler.update_offer);
router.delete('/:id', check_auth, check_edit_perms, handler.delete_offer);

module.exports = router;
