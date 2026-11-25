'use strict';

const express = require('express');
const router = express.Router();
const handler = require('../../controller/solarshop/pipeline_status.handler');

router.get('/', handler.get_pipeline_status);

module.exports = router;
