const express = require('express');
const router = express.Router();
const check_auth = require('../../../middlewares/check.auth');
const check_permissions = require('../../../middlewares/check.permissions');
const handler = require('../../../controller/solarshop/india/po_settings.handler');

const check_perms = (action) => check_permissions([{ unique_code: 'ADM_PO_ORDERS', permissions: [action] }]);

router.get('/', check_auth, check_perms('view'), handler.get_po_settings_india);
router.post('/create', check_auth, check_perms('add'), handler.create_po_setting_india);
router.put('/update', check_auth, check_perms('edit'), handler.update_po_setting_india);
router.post('/delete', check_auth, check_perms('delete'), handler.delete_po_setting_india);

module.exports = router;
