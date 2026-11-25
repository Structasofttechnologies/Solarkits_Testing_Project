const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/datasheet_settings.handler');

const COMBO_KITS_PERMS = [{ unique_code: 'ADM_COMBO_KITS', permissions: ['view', 'edit'] }];

router.get('/', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }]), handler.get_datasheet_settings);
router.put('/', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), handler.update_datasheet_settings);
router.post('/reset', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), handler.reset_datasheet_settings);

module.exports = router;
