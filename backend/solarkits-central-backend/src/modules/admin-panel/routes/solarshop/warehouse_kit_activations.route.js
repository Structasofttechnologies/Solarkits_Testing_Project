const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/warehouse_kit_activations.handler');

// Warehouse Wise ComboKit & Customize Kit Active/Deactive — unique_code = ADM_WH_KIT_ACT
const check_perms = (action) => check_permissions([{ unique_code: 'ADM_WH_KIT_ACT', permissions: [action] }]);
const check_view_perms = check_permissions([
  { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] },
  { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }
]);

router.get('/', check_auth, check_view_perms, handler.get_warehouse_kit_activations);
router.get('/warehouse/:warehouseId', check_auth, check_view_perms, handler.get_warehouse_activations);
router.post('/save', check_auth, check_perms('add'), handler.save_warehouse_kit_activation);
router.post('/bulk-save', check_auth, check_perms('add'), handler.bulk_save_warehouse_kit_activations);
router.post('/toggle', check_auth, check_perms('edit'), handler.toggle_kit_activation);
router.post('/delete', check_auth, check_perms('delete'), handler.delete_warehouse_kit_activation);

module.exports = router;