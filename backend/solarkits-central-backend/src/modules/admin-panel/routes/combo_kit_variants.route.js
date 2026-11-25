const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/combo_kit_variants.handler');

// Core Database Routes
router.post('/create-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['add'] }]), handler.create_config);
router.get('/get-configs', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }]), handler.get_configs);
router.put('/update-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['edit'] }]), handler.update_config);
router.post('/delete-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['delete'] }]), handler.delete_config);

// India Database Routes
router.post('/india/create-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['add'] }]), handler.create_config_india);
router.get('/india/get-configs', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }]), handler.get_configs_india);
router.put('/india/update-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['edit'] }]), handler.update_config_india);
router.post('/india/delete-config', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['delete'] }]), handler.delete_config_india);

module.exports = router;
