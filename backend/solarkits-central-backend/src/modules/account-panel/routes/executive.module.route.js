const express = require('express');
const router = express.Router();
const executiveHandler = require('../controller/executive.module.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/overview', check_auth, executiveHandler.get_executive_overview);

module.exports = router;
