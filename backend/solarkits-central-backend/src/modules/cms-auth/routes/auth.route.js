const express = require('express')
const router = express.Router()

const auth_handler = require('../controller/auth.handler')

router.get('/countries',auth_handler.get_active_countries)
router.post('/request-verify-account-otp', auth_handler.request_verify_account_otp)
router.post('/request-forgot-password-otp', auth_handler.request_forgot_password_otp)
router.post('/verify-otp', auth_handler.verify_otp)
router.post('/set-passcode', auth_handler.set_passcode)
router.post('/login', auth_handler.login)   
router.post('/logout', auth_handler.logout)
router.get('/identify-user-panel',auth_handler.identify_user_panel)
router.post('/refresh-access-token',auth_handler.refresh_access_token)

module.exports = router