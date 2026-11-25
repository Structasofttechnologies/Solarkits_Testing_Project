const express = require('express')
const router = express.Router()

const root_handler = require('../controller/root.handler');
const operations_handler = require('../controller/operations.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/user-data', check_auth, root_handler.get_user_data);
router.get('/user-modules', check_auth, root_handler.get_user_modules);

router.get('/geography/countries', check_auth, root_handler.get_active_countries);
router.get('/geography/states', check_auth, root_handler.get_active_states);
router.get('/geography/states/:country_id', check_auth, root_handler.get_active_states);
router.get('/geography/clusters', check_auth, root_handler.get_active_clusters);
router.get('/geography/clusters/:state_id', check_auth, root_handler.get_active_clusters);
router.get('/geography/assigned-clusters', check_auth, root_handler.get_assigned_clusters);

// Price Request routes
router.get('/operations/sku-benchmark-info', check_auth, operations_handler.get_sku_benchmark_info);
router.post('/operations/price-requests/create', check_auth, operations_handler.create_price_request);

// Warehouse Stock Report route
router.get('/operations/warehouse-stock-report', check_auth, operations_handler.get_warehouse_stock_report);

module.exports = router