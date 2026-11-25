const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/saas_products.handler');

router.get('/company-products', check_auth, check_permissions([{ unique_code: 'ADM_SAAS_PRODS', permissions: ['view'] }]), handler.get_company_saas_products);
router.post('/send-deactivate-otp', check_auth, check_permissions([{ unique_code: 'ADM_SAAS_PRODS', permissions: ['edit'] }]), handler.send_deactivate_otp);
router.post('/toggle-country', check_auth, check_permissions([{ unique_code: 'ADM_SAAS_PRODS', permissions: ['edit'] }]), handler.toggle_country_saas_product);

module.exports = router;
