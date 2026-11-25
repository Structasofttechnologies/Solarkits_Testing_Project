const express = require('express');
const router = express.Router();

const check_auth = require('../../../middlewares/check.auth');
const check_permissions = require('../../../middlewares/check.permissions');
const handler = require('../../../controller/solarshop/india/company_margins.handler');

const check_perms = (action) => check_permissions([{ unique_code: 'ADM_CO_MARGIN', permissions: [action] }]);

router.get('/', check_auth, check_perms('view'), handler.get_company_margins_india);
router.get('/warehouse/:warehouseId', check_auth, check_perms('view'), handler.get_warehouse_margin_india);
router.post('/save', check_auth, check_perms('add'), handler.create_company_margin_india);
router.post('/delete', check_auth, check_perms('delete'), handler.delete_company_margin_india);

module.exports = router;
