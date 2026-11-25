const express = require('express');
const router = express.Router();
const auth = require('../controller/auth.handler');
const check_auth = require('../middlewares/check.auth');

// Public routes
router.get('/countries',                     auth.get_active_countries);
router.get('/states',                        auth.get_active_states);
router.get('/districts',                     auth.get_active_districts);
router.post('/register',                     auth.register);
router.post('/request-verify-account-otp',   auth.request_verify_account_otp);
router.post('/request-forgot-password-otp',  auth.request_forgot_password_otp);
router.post('/verify-otp',                   auth.verify_otp);
router.post('/set-passcode',                 auth.set_passcode);
router.post('/login',                        auth.login);
router.post('/refresh-access-token',         auth.refresh_access_token);
router.post('/logout',                       auth.logout);
router.post('/gst/generate-otp',             auth.gst_generate_otp);
router.post('/gst/submit-otp',               auth.gst_submit_otp);
router.post('/send-register-email-otp',     auth.send_register_email_otp);
router.post('/verify-register-email-otp',   auth.verify_register_email_otp);
router.post('/send-register-phone-otp',     auth.send_register_phone_otp);
router.post('/verify-register-phone-otp',   auth.verify_register_phone_otp);

// Protected routes
router.get('/me', check_auth, auth.me);
router.get('/my-accounts', check_auth, auth.get_my_accounts);
router.post('/select-account', check_auth, auth.select_account);

module.exports = router;
