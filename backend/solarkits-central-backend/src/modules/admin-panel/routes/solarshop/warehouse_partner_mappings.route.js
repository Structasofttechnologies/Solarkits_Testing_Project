const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/warehouse_partner_mappings.handler');

const check_perms = (action) =>
  check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: [action] }]);

// 1. Get warehouses list with kit counts and configuration metrics
router.get('/warehouses', check_auth, check_perms('view'), handler.get_warehouses_partner_overview);

// 2. Get dedicated kit products & partner mappings for a specific warehouse
router.get('/warehouse/:warehouseId', check_auth, check_perms('view'), handler.get_warehouse_kit_partner_config);

// 3. Save single kit partner mapping
router.post('/save', check_auth, check_perms('edit'), handler.save_kit_partner_mapping);

// 4. Bulk save warehouse partner mappings
router.post('/bulk-save', check_auth, check_perms('edit'), handler.bulk_save_warehouse_partner_mappings);

module.exports = router;
