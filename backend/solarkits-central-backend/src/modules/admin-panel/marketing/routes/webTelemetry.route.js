const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/webTelemetry.controller');

const router = express.Router();

// Lenient rate limiter allowing active SPA browsing & 20s heartbeats while curbing floods
const telemetryRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 120 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const isLocal =
      req.ip === '127.0.0.1' ||
      req.ip === '::1' ||
      req.ip === '::ffff:127.0.0.1' ||
      req.hostname === 'localhost';
    return isLocal && process.env.NODE_ENV !== 'production';
  },
  handler: (req, res) => {
    res.status(429).json({ success: false, message: 'Telemetry rate limit exceeded' });
  },
});

// Support navigator.sendBeacon text/plain bodies as well as standard application/json
router.post(
  '/visit',
  telemetryRateLimiter,
  express.text({ type: 'text/plain', limit: '64kb' }),
  controller.track_website_visit
);

module.exports = router;
