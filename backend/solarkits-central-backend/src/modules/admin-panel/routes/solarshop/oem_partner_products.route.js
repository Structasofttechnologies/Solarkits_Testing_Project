const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/oem_partner_products.handler');

// Permissions checking helper for ADM_ORDER_SETTINGS
const check_perms = (action) => check_permissions([{ unique_code: 'ADM_ORDER_SETTINGS', permissions: [action] }]);
const check_view_perms = check_perms('view');
const check_edit_perms = check_perms('edit');

// 1. Fetch OEM Partners with assigned products
router.get('/', check_auth, check_view_perms, handler.get_oem_partners);

// 2. Fetch system catalog products for assignment
router.get('/catalog-products', check_auth, check_view_perms, handler.get_catalog_products);

// 3. Assign / Update products for an OEM partner
router.put('/:oemBrandId/assign', check_auth, check_edit_perms, handler.assign_products);

// 4. Remove single product from an OEM partner
router.delete('/:oemBrandId/products/:productId', check_auth, check_edit_perms, handler.remove_product);

// 5. Toggle OEM status on a brand
router.patch('/:brandId/toggle-oem', check_auth, check_edit_perms, handler.toggle_oem_status);

module.exports = router;
