const express = require('express');
const router = express.Router();
const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/loose_order_settings.handler');

const check_perms = (action) => check_permissions([
  { unique_code: 'ADM_LOOSE_ORDERS', permissions: [action] },
  { unique_code: 'ADM_PO_ORDERS', permissions: [action] },
  { unique_code: 'ADM_CO_MARGIN', permissions: [action] },
  { unique_code: 'ADM_WAREHOUSES', permissions: [action] }
]);

router.get('/', check_auth, check_perms('view'), handler.get_all_settings);
router.get('/warehouse/:warehouseId', check_auth, check_perms('view'), handler.get_warehouse_settings);
router.post('/save', check_auth, check_perms('edit'), handler.save_settings);

module.exports = router;
