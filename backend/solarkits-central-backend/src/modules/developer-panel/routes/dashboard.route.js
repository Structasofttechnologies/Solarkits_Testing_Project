const express = require('express')
const router = express.Router()

const dashboard_handler = require('../controller/dashboard.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/types', check_auth, dashboard_handler.get_dashboard_types);

module.exports = router