const express = require('express');
const router = express.Router();
const { optional_auth } = require('../../middlewares/auth');
const handler = require('../../controller/v1.handlers/epc_preferences.handler');

// 1. Fetch dynamic industry types, categories and combo kits
router.get('/config-options', handler.get_config_options);

// 2. Check if EPC needs first-login modal or has new kit alerts
router.get('/check-status', optional_auth, handler.check_epc_preference_status);

// 3. Submit first-login or profile preferences
router.post('/submit', optional_auth, handler.submit_preferences);

// 4. Skip first-login preferences
router.post('/skip', optional_auth, handler.skip_preferences);

// 5. 1-Click "Add this type of kits to your preferences" action
router.post('/add-kit-preference', optional_auth, handler.add_kit_to_preferences);

// 6. Dismiss new kit alert modal
router.post('/dismiss-kit-alert', optional_auth, handler.dismiss_kit_alert);

// 7. Get my preferences for profile tab
router.get('/my-preferences', optional_auth, handler.get_my_preferences);

module.exports = router;
