const express = require('express');
const router = express.Router();

const check_auth = require('../middlewares/check.auth');
const handler = require('../controller/price_requests.handler');

router.get('/', check_auth, handler.get_price_requests);
router.post('/:id/approve', check_auth, handler.approve_price_request);
router.post('/:id/reject', check_auth, handler.reject_price_request);

module.exports = router;
