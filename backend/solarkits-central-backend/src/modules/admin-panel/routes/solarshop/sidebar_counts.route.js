'use strict';

const express = require('express');
const router = express.Router();
const check_auth = require('../../middlewares/check.auth');
const handler = require('../../controller/solarshop/sidebar_counts.handler');

router.get('/', check_auth, handler.get_sidebar_counts);

module.exports = router;
