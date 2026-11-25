'use strict';

const express = require('express');
const router = express.Router();

const pricingController = require('../controllers/pricing.controller');

// ── Public & Authenticated Pricing Calculator Endpoints ───────────────────────
router.post('/calculate', pricingController.calculate_price);
router.get('/rules',      pricingController.get_pricing_rules);
router.post('/rules',     pricingController.create_pricing_rule);
router.get('/plans',      pricingController.get_plan_matrix);

module.exports = router;
