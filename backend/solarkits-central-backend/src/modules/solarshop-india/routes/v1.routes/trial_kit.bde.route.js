const express = require('express');
const router = express.Router();
const handler = require('../../controller/v1.handlers/trial_kit_bde.handler');
const { verify_bde_auth } = require('../../middlewares/verify_bde_auth');

router.get('/funnel', verify_bde_auth, handler.get_funnel_leads);
router.put('/funnel/:order_id/status', verify_bde_auth, handler.update_funnel_stage);
router.post('/funnel/:order_id/notes', verify_bde_auth, handler.add_call_note);
router.post('/funnel/:order_id/link-quote', verify_bde_auth, handler.link_commercial_quote);
router.get('/analytics/my-leads', verify_bde_auth, handler.get_my_lead_analytics);

module.exports = router;
