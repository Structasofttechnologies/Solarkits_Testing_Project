const express = require('express');
const router = express.Router();
const handler = require('../../controller/v1.handlers/trial_kit_epc.handler');
<<<<<<< HEAD
const { verify_auth } = require('../../middlewares/auth');

=======
const feedbackConfigHandler = require('../../../admin-panel/controller/trial_kit_feedback_config.handler');
const { verify_auth, optional_auth } = require('../../middlewares/auth');

router.get('/feedback-config', optional_auth, feedbackConfigHandler.get_storefront_feedback_config);
>>>>>>> origin/main
router.get('/availability', verify_auth, handler.get_availability);
router.post('/order', verify_auth, handler.place_order);
router.get('/my-orders', verify_auth, handler.get_my_orders);
router.post('/my-orders/:id/feedback', verify_auth, handler.submit_feedback);

module.exports = router;
