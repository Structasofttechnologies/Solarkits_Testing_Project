const express = require('express');
const router = express.Router();
const whFinanceHandler = require('../controller/warehouse_finance.module.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/triggers', check_auth, whFinanceHandler.get_trigger_config);
router.post('/triggers', check_auth, whFinanceHandler.update_trigger_config);
router.get('/opportunities', check_auth, whFinanceHandler.get_warehouse_opportunities);
router.post('/opportunities', check_auth, whFinanceHandler.create_warehouse_opportunity);
router.post('/opportunities/:id/status', check_auth, whFinanceHandler.update_opportunity_status);

module.exports = router;
