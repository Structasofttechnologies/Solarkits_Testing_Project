/**
 * rate.limit.js
 *
 * Configurable rate-limiting middleware factory using express-rate-limit.
 * Phase R1 — Security Hardening: Roles, Permissions, Audit & Config Masters
 *
 * Usage:
 *   const { authRateLimiter, gstRateLimiter, otpRateLimiter } = require('./rate.limit');
 *   router.post('/login', authRateLimiter, handler);
 *
 * All window/max values are driven by .env variables so they can be tuned
 * without a code deploy.
 */

const rateLimit = require('express-rate-limit');

/**
 * Build a standardized rate-limit handler with a structured JSON response.
 */
function buildLimiter({ windowMs, max, name }) {
  return rateLimit({
    windowMs,
    max: process.env.NODE_ENV === 'production' ? max : 1000,
    skip: (req) => {
      const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1' || req.hostname === 'localhost';
      return isLocal && process.env.NODE_ENV !== 'production';
    },
    standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
    legacyHeaders:   false,   // Disable `X-RateLimit-*` legacy headers
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      const retryAfterSec = Math.ceil(windowMs / 1000);
      res.status(429).json({
        status:  'error',
        message: `Too many ${name} attempts. Please wait ${retryAfterSec} seconds before trying again.`,
        retry_after_seconds: retryAfterSec,
      });
    },
  });
}

/**
 * Rate limiter for authentication endpoints:
 *   POST /auth/login, POST /auth/register, POST /auth/logout
 *
 * Environment:
 *   RATE_LIMIT_AUTH_WINDOW_MS  — window duration in ms  (default: 15 min)
 *   RATE_LIMIT_AUTH_MAX        — max requests per window (default: 10)
 */
const authRateLimiter = buildLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_AUTH_MAX,        10) || 10,
  name:     'login/auth',
});

/**
 * Rate limiter for GST verification endpoints:
 *   POST /gst/verify, POST /reseller-mgmt/gst-verify
 *
 * Environment:
 *   RATE_LIMIT_GST_WINDOW_MS  — window duration in ms  (default: 1 min)
 *   RATE_LIMIT_GST_MAX        — max requests per window (default: 5)
 */
const gstRateLimiter = buildLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_GST_WINDOW_MS, 10) || 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_GST_MAX,       10) || 5,
  name:     'GST verification',
});

/**
 * Rate limiter for OTP endpoints:
 *   POST /otp/send, POST /otp/verify
 *
 * Environment:
 *   RATE_LIMIT_OTP_WINDOW_MS  — window duration in ms  (default: 5 min)
 *   RATE_LIMIT_OTP_MAX        — max requests per window (default: 5)
 */
const otpRateLimiter = buildLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS, 10) || 5 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_OTP_MAX,       10) || 5,
  name:     'OTP',
});

/**
 * Rate limiter for general API abuse prevention.
 * Applied globally at the app level (lenient — 300 req / 15 min per IP).
 */
const globalRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max:      300,
  name:     'API',
});

module.exports = {
  authRateLimiter,
  gstRateLimiter,
  otpRateLimiter,
  globalRateLimiter,
};
