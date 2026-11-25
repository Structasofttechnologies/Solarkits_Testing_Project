const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const controller = require('../controller/store.dashboard.controller');

// GET /admin-api/store-dashboard/analytics
router.get('/analytics', check_auth, controller.get_store_analytics);
router.get('/data', check_auth, controller.get_store_analytics);

module.exports = router;

