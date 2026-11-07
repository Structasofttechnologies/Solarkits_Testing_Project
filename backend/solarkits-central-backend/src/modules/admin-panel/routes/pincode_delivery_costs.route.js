const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/pincode_delivery_costs.handler');

const permissionCodes = [
  { unique_code: 'ADM_COMBO_KITS', permissions: ['view', 'add', 'edit', 'delete'] },
  { unique_code: 'ADM_COMBO_CFG', permissions: ['view', 'add', 'edit', 'delete'] },
  { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view', 'add', 'edit', 'delete'] },
];

router.get('/fulfillment-warehouses', check_auth, check_permissions(permissionCodes), handler.get_fulfillment_warehouses);
router.get('/warehouse-summary', check_auth, check_permissions(permissionCodes), handler.get_warehouse_delivery_summary);
router.get('/', check_auth, check_permissions(permissionCodes), handler.get_delivery_costs);
router.get('/kit-stats', check_auth, check_permissions(permissionCodes), handler.get_kit_stats);
router.post('/apply-district-rates', check_auth, check_permissions(permissionCodes), handler.apply_district_rates);
router.post('/', check_auth, check_permissions(permissionCodes), handler.create_delivery_cost);
router.put('/:id', check_auth, check_permissions(permissionCodes), handler.update_delivery_cost);
router.delete('/:id', check_auth, check_permissions(permissionCodes), handler.delete_delivery_cost);
router.post('/bulk-import', check_auth, check_permissions(permissionCodes), handler.bulk_import_delivery_costs);

module.exports = router;
