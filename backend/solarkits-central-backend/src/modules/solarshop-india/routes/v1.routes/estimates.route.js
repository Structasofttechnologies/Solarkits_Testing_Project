/**
 * estimates.route.js — EPC Saved Estimates CRUD Routes
 * Prefix: /api/india/v1/estimates
 */

'use strict';

const express = require('express');
const router = express.Router();
const { verify_auth } = require('../../middlewares/auth');
const h = require('../../controller/estimator.handler');

// All saved estimates routes require EPC authentication
router.get('/dashboard',          verify_auth, h.get_estimates_dashboard_stats);
router.post('/',                  verify_auth, h.save_estimate);
router.get('/',                   verify_auth, h.list_my_estimates);
router.get('/:id',                verify_auth, h.get_estimate_detail);
router.put('/:id',                verify_auth, h.update_estimate);
router.delete('/:id',             verify_auth, h.delete_estimate);
router.post('/:id/recalculate',   verify_auth, h.recalculate_estimate);
router.post('/:id/generate-quote',verify_auth, h.generate_quote_from_estimate);

module.exports = router;
