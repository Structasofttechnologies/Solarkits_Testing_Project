const express = require('express');
const router = express.Router();

const check_auth = require('../../middlewares/check.auth');
const check_permissions = require('../../middlewares/check.permissions');
const handler = require('../../controller/solarshop/company_margins.handler');

const check_perms = (action) => check_permissions([{ unique_code: 'ADM_CO_MARGIN', permissions: [action] }]);

router.get('/', check_auth, check_perms('view'), handler.get_company_margins);
router.get('/warehouse/:warehouseId', check_auth, check_perms('view'), handler.get_warehouse_margin);
router.post('/save', check_auth, check_perms('add'), handler.save_warehouse_margin);
router.post('/delete', check_auth, check_perms('delete'), handler.delete_company_margin);

module.exports = router;
