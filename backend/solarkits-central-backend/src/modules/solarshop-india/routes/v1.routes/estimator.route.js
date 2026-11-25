/**
 * estimator.route.js — EPC Estimator Routes
 * Prefix: /api/india/v1/estimator
 */

'use strict';

const express = require('express');
const router = express.Router();
const { verify_auth, optional_auth } = require('../../middlewares/auth');
const h = require('../../controller/estimator.handler');

// Hierarchy & Filter APIs (allowed for authenticated or browsing EPC)
router.get('/industries',         optional_auth, h.get_eligible_industries);
router.get('/project-types',      optional_auth, h.get_eligible_project_types);
router.get('/project-sub-types',  optional_auth, h.get_eligible_sub_types);
router.get('/eligible-solutions', optional_auth, h.get_eligible_solutions);
router.get('/eligible-boms',      optional_auth, h.get_eligible_boms);
router.get('/eligible-gst',       optional_auth, h.get_eligible_gst);

// Calculation & Comparison APIs
router.post('/calculate',         optional_auth, h.calculate);
router.post('/compare-solutions', optional_auth, h.compare_solutions);

module.exports = router;
