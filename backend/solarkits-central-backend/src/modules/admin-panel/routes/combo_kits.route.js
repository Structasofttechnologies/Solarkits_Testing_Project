const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/combo_kits.handler');
const { upload_any_files } = require('../utils/upload.files');

const upload_to_cloudinary = upload_any_files('public/uploads/combo_kits', 10);

router.get('/', check_auth, handler.get_combo_kits_india);
router.post('/create-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['add'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['add'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['add'] }]), upload_to_cloudinary, handler.create_combo_kit);
router.get('/get-kits', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }, { unique_code: 'FPO_COMM', permissions: ['view'] }]), handler.get_combo_kits);
router.put('/update-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['edit'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['edit'] }]), upload_to_cloudinary, handler.update_combo_kit);
router.post('/delete-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['delete'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['delete'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['delete'] }]), handler.delete_combo_kit);

// India Database Core Routes
router.post('/india/create-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['add'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['add'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['add'] }]), upload_to_cloudinary, handler.create_combo_kit_india);
router.get('/india/get-kits', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }, { unique_code: 'FPO_COMM', permissions: ['view'] }]), handler.get_combo_kits_india);
router.put('/india/update-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['edit'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['edit'] }]), upload_to_cloudinary, handler.update_combo_kit_india);
router.post('/india/delete-kit', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['delete'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['delete'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['delete'] }]), handler.delete_combo_kit_india);

// Kit Status Check Route - Checks if all SKUs have prices and company margins are set
router.get('/:id/status', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }]), handler.get_combo_kit_status);

// Datasheet Management Routes
router.post('/upload-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), upload_to_cloudinary, handler.upload_combokit_datasheet);
router.post('/remove-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), handler.remove_combokit_datasheet);
router.post('/india/upload-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), upload_to_cloudinary, handler.upload_combokit_datasheet);
router.post('/india/remove-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['edit'] }]), handler.remove_combokit_datasheet);

// Combined Kit Datasheet Generation & PDF Download Routes
router.get('/:id/combined-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }]), handler.get_combined_datasheet);
router.get('/:id/combined-datasheet-pdf', handler.download_combined_datasheet_pdf);
router.get('/india/:id/combined-datasheet', check_auth, check_permissions([{ unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }]), handler.get_combined_datasheet);
router.get('/india/:id/combined-datasheet-pdf', handler.download_combined_datasheet_pdf);

module.exports = router;
