'use strict';
/**
 * BOSKIT Module Entry Point
 *
 * Registers all BOSKIT Mongoose models by requiring the barrel export,
 * then wires up route sub-routers.
 *
 * Route prefix (mounted in src/index.js):
 *   /api/boskit/v1  → public + auth + distributor + dealer routes
 *
 * To be expanded per phase:
 *   Phase 3: auth routes
 *   Phase 4: public routes
 *   Phase 7: distributor routes
 *   Phase 8: dealer routes
 */

// Register all BOSKIT models (must be required before any queries)
require('./models/index');

const express = require('express');
const router = express.Router();

// Health check / placeholder — routes will be added phase by phase
router.get('/health', (req, res) => {
  res.json({ platform: 'boskit', status: 'operational', version: 'v1' });
});

// ── Phase 3: Authentication routes ───────────────────────────────────────────
router.use('/auth', require('./routes/auth.route'));

// ── Phase 4: Public routes ────────────────────────────────────────────────────
router.use('/public', require('./routes/public.route'));

// ── Phase 7 & 5: Distributor portal routes ───────────────────────────────────────
router.use('/distributor', require('./routes/distributor.route'));

// ── Phase 6 & 12: Admin portal routes ────────────────────────────────────────
router.use('/admin', require('./routes/admin.route'));

// ── Phase 8: Dealer portal routes ────────────────────────────────────────────
router.use('/dealer', require('./routes/dealer.route'));

// ── Phase 9: Pricing & GST Engine routes ───────────────────────────────────────
router.use('/pricing', require('./routes/pricing.route'));

// ── Phase 10: Cart, Checkout & Orders routes ──────────────────────────────────
router.use('/order', require('./routes/order.route'));

// ── Phase 13: Notifications & Real-Time Alerts ────────────────────────────────
router.use('/notification', require('./routes/notification.route'));

module.exports = router;
