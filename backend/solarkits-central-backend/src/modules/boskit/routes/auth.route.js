'use strict';

const express = require('express');
const router = express.Router();

// Rate limiters
const { authRateLimiter, otpRateLimiter } = require('../../admin-panel/middlewares/rate.limit');

// Middlewares
const {
  authenticateBoskitDistributor,
  authenticateBoskitDealer,
} = require('../middlewares/auth.middleware');

// Controllers
const distributorAuth = require('../controllers/auth/distributor.auth.controller');
const dealerAuth = require('../controllers/auth/dealer.auth.controller');

// ── 1. Distributor Authentication Routes ──────────────────────────────────────
router.post('/distributor/gst/verify',                authRateLimiter, distributorAuth.verify_gst_public);
router.post('/distributor/register/init',             authRateLimiter, distributorAuth.register_init);
router.post('/distributor/otp/send',                 otpRateLimiter,  distributorAuth.send_registration_otp);
router.post('/distributor/otp/verify',               otpRateLimiter,  distributorAuth.verify_registration_otp);
router.post('/distributor/login',                    authRateLimiter, distributorAuth.login);
router.post('/distributor/refresh-token',                             distributorAuth.refresh_token);
router.get('/distributor/me',                        authenticateBoskitDistributor, distributorAuth.get_me);
router.post('/distributor/logout',                                    distributorAuth.logout);
router.post('/distributor/forgot-password/send-otp', otpRateLimiter,  distributorAuth.forgot_password_send_otp);
router.post('/distributor/forgot-password/verify-otp',otpRateLimiter, distributorAuth.forgot_password_verify_otp);
router.post('/distributor/forgot-password/reset-password', authRateLimiter, distributorAuth.reset_password);

// ── 2. Dealer Authentication Routes ───────────────────────────────────────────
router.post('/dealer/login',                         authRateLimiter, dealerAuth.login);
router.post('/dealer/refresh-token',                                  dealerAuth.refresh_token);
router.get('/dealer/me',                             authenticateBoskitDealer, dealerAuth.get_me);
router.post('/dealer/logout',                                         dealerAuth.logout);
router.post('/dealer/forgot-password/send-otp',      otpRateLimiter,  dealerAuth.forgot_password_send_otp);
router.post('/dealer/forgot-password/verify-otp',    otpRateLimiter,  dealerAuth.forgot_password_verify_otp);
router.post('/dealer/forgot-password/reset-password',authRateLimiter, dealerAuth.reset_password);

module.exports = router;
