const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/product.templates.handler');

// TEMPLATE APIs
router.post('/add-template', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createProductTemplate);
router.put('/update-template', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['edit'] }]), handler.updateProductTemplate);
router.get('/get-templates', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }]), handler.listProductTemplates);

// SUBTYPE APIs
router.post('/add-subtype', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createSubtype);
router.put('/update-subtype', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['edit'] }]), handler.updateSubtype);
router.get('/get-subtypes', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] }]), handler.listSubtypes);

// TEMPLATE SCOPE APIs
router.post('/add-subtype-scope', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createSubtypeScope);
router.get('/get-subtype-scope', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }]), handler.listSubtypeScopes);
router.delete('/delete-subtype-scope', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['delete'] }]), handler.deleteSubtypeScope);
router.get('/get-templates-by-scope', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }]), handler.listTemplatesByScope);


// ATTRIBUTE GROUP APIs
router.post('/add-attribute-group', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createAttributeGroup);
router.put('/update-attribute-group', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['edit'] }]), handler.updateAttributeGroup);
router.get('/get-attribute-groups', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }]), handler.listAttributeGroups);
router.post('/update-attribute-groups-order', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.reorderAttributeGroups);

// ATTRIBUTE APIs
router.post('/add-attribute', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createAttribute);
router.put('/update-attribute', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['edit'] }]), handler.updateAttribute);
router.get('/get-attributes', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }]), handler.listAttributes);
router.post('/update-attributes-order', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.reorderAttributes);

// ATTRIBUTE VALUES APIs
router.post('/add-attribute-value', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.createAttributeOption);
router.put('/update-attribute-value', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['edit'] }]), handler.updateAttributeOption);
router.delete('/delete-attribute-value', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['delete'] }]), handler.deleteAttributeOption);
router.post('/update-attribute-values-order', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.reorderAttributeOptions);
router.get('/get-attribute-values', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SKU', permissions: ['view'] }]), handler.listAttributeOptions);

// BRAND MAPPING APIs
router.post('/map-brand-template', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['add'] }]), handler.mapBrandTemplate);
router.delete('/delete-brand-mapping', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['delete'] }]), handler.deleteBrandMapping);
router.get('/get-brands-by-template', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }]), handler.listBrandsByTemplate);
router.get('/get-brands-by-template-flat', check_auth, check_permissions([{ unique_code: 'ADM_PROD_TMPL', permissions: ['view'] }, { unique_code: 'ADM_SOLAR_KITS', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }]), handler.listBrandsByTemplateFlat);

router.get('/get-brands-by-subtype', check_auth, check_permissions([{ unique_code: 'ADM_SKU', permissions: ['view'] }, { unique_code: 'ADM_COMBO_KITS', permissions: ['view'] }, { unique_code: 'ADM_CUSTOMIZE_KITS', permissions: ['view'] }]), handler.listBrandsBySubtype);
router.get('/get-scopes-by-subtype', check_auth, check_permissions([{ unique_code: 'ADM_SKU', permissions: ['view'] }]), handler.listScopesBySubtype);

module.exports = router;