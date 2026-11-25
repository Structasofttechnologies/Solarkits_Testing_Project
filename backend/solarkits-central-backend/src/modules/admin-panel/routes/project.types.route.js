const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/project.types.handler');

const { upload_files } = require('../utils/upload.files');
const subcategoryImageUpload = upload_files("public/uploads/subcategories", 5, "image", 1);

// CATEGORY
router.post('/add-category', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['add'] }]), handler.add_project_category);
router.put('/update-category', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['edit'] }]), handler.update_project_category);
router.get('/get-categories', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }, { unique_code: 'RSL_PRODAUTH', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_project_categories);

// SUBCATEGORY
router.post('/add-subcategory', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['add'] }]), subcategoryImageUpload, handler.add_project_subcategory);
router.put('/update-subcategory', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['edit'] }]), subcategoryImageUpload, handler.update_project_subcategory);
router.get('/get-subcategories', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }, { unique_code: 'RSL_PRODAUTH', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_project_subcategories);

// TYPE
router.post('/add-type', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['add'] }]), handler.add_project_type);
router.put('/update-type', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['edit'] }]), handler.update_project_type);
router.get('/get-types', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }, { unique_code: 'RSL_PRODAUTH', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_project_types);
router.get('/list', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_project_types);

// MAPPING
router.post('/map-type', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['add'] }]), handler.map_type_to_subcategory);
router.get('/get-subcategory-types', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }, { unique_code: 'RSL_PRODAUTH', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_subcategory_types);

// RANGE
router.post('/add-range', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['add'] }]), handler.add_project_range);
router.put('/update-range', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['edit'] }]), handler.update_project_range);
router.get('/get-ranges', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KIT_VARIANTS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }, { unique_code: 'ADM_PO_ORDERS', permissions: ['view'] }, { unique_code: 'ADM_BULK_COMBO', permissions: ['view'] }, { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }, { unique_code: 'ADM_ORDER_SETTINGS', permissions: ['view'] }, { unique_code: 'RSL_PROD_AUTH', permissions: ['view'] }, { unique_code: 'RSL_PRODAUTH', permissions: ['view'] }, { unique_code: 'FPO_MOQ', permissions: ['view'] }, { unique_code: 'RSL_MGMT', permissions: ['view'] }]), handler.get_project_ranges);

// FULL TREE
router.get('/public-hierarchy', handler.get_all_project_hierarchy);
router.get('/get-all-hierarchy', check_auth, check_permissions([{ unique_code: 'ADM_PROJ_TYPES', permissions: ['view'] }, { unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }]), handler.get_all_project_hierarchy);

module.exports = router;