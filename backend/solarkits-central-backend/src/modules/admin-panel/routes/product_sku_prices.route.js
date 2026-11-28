const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const check_permissions = require('../middlewares/check.permissions');
const handler = require('../controller/product_sku_prices.handler');

router.get('/', check_auth, check_permissions([
  { unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['view'] },
  { unique_code: 'ADM_CO_MARGIN', permissions: ['view'] },
  { unique_code: 'ADM_WH_KIT_ACT', permissions: ['view'] }
]), handler.get_sku_prices);
router.post('/', check_auth, check_permissions([{ unique_code: 'ADM_BETCHMARK_PRICE_MASTER', permissions: ['add', 'edit'] }]), handler.set_sku_prices);

module.exports = router;
