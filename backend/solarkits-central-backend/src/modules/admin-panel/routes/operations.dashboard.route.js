const express = require('express');
const router = express.Router();
const check_auth = require('../middlewares/check.auth');
const controller = require('../controller/operations.dashboard.controller');

// GET /admin-api/operations-dashboard/analytics
router.get('/analytics', check_auth, controller.get_operations_analytics);
router.get('/data', check_auth, controller.get_operations_analytics);

module.exports = router;

