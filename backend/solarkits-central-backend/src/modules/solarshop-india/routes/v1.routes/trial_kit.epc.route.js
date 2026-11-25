const express = require('express');
const router = express.Router();
const handler = require('../../controller/v1.handlers/trial_kit_epc.handler');
const { verify_auth } = require('../../middlewares/auth');

router.get('/availability', verify_auth, handler.get_availability);
router.post('/order', verify_auth, handler.place_order);
router.get('/my-orders', verify_auth, handler.get_my_orders);
router.post('/my-orders/:id/feedback', verify_auth, handler.submit_feedback);

module.exports = router;
