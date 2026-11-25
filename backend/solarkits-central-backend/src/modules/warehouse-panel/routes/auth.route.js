const express = require('express');
const router = express.Router();
const auth_handler = require('../controller/auth.handler');
const check_auth = require('../middlewares/check.auth');

router.get('/countries', auth_handler.get_active_countries);
router.post('/request-verify-account-otp', auth_handler.request_verify_account_otp);
router.post('/request-forgot-password-otp', auth_handler.request_forgot_password_otp);
router.post('/verify-otp', auth_handler.verify_otp);
router.post('/set-passcode', auth_handler.set_passcode);
router.post('/login', auth_handler.login);

router.post('/login-identify', auth_handler.login_identify);
router.post('/set-password', auth_handler.set_password);
router.post('/login-password', auth_handler.login_password);
router.post('/refresh-access-token', auth_handler.refresh_access_token);
router.post('/logout', auth_handler.logout);
router.get('/me', check_auth, auth_handler.me);

module.exports = router;
