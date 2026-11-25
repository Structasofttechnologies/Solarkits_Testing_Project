const express = require('express');
const router = express.Router();

const check_auth = require('../../../middlewares/check.auth');
const check_permissions = require('../../../middlewares/check.permissions');
const handler = require('../../../controller/solarshop/india/bulk_kit_settings.handler');

// Bulk Combo Kits module unique code = ADM_BULK_COMBO
const check_perms = (action) => check_permissions([{ unique_code: 'ADM_BULK_COMBO', permissions: [action] }]);

router.get('/', check_auth, check_perms('view'), handler.get_bulk_kit_settings_india);
router.get('/warehouse/:warehouseId', check_auth, check_perms('view'), handler.get_warehouse_bulk_settings_india);
router.post('/save', check_auth, check_perms('add'), handler.save_bulk_kit_settings_india);
router.post('/delete', check_auth, check_perms('delete'), handler.delete_bulk_kit_settings_india);

module.exports = router;
