'use strict';

const express = require('express');
const router = express.Router();

const { authenticateBoskitDistributor, optionalBoskitDistributorAuth } = require('../middlewares/auth.middleware');
const { gstRateLimiter } = require('../../admin-panel/middlewares/rate.limit');
const onboardingController = require('../controllers/distributor/onboarding.controller');
const distributorController = require('../controllers/distributor/distributor.controller');

// ── Onboarding Wizard Routes (Accessible to prospective / authenticated distributors) ──
router.use('/onboarding', optionalBoskitDistributorAuth);
router.get('/onboarding/state',          onboardingController.get_onboarding_state);
router.post('/onboarding/save-step',     onboardingController.save_onboarding_step);
router.post('/onboarding/gst-verify',    gstRateLimiter, onboardingController.verify_gst_live);
router.post('/onboarding/kyc-upload',    onboardingController.upload_kyc_document);
router.get('/onboarding/geo/states',     onboardingController.get_geo_states);
router.get('/onboarding/geo/districts',  onboardingController.get_geo_districts);
router.post('/onboarding/submit',        onboardingController.submit_onboarding_application);

// ── Authenticated Distributor Portal Routes ───────────────────────────────────
router.use(authenticateBoskitDistributor);
router.get('/entitlements',                     distributorController.get_distributor_entitlements);
router.get('/dashboard/stats',                  distributorController.get_distributor_dashboard_stats);
router.get('/dealers',                          distributorController.get_distributor_dealers);
router.post('/dealers/invite',                  distributorController.invite_dealer);
router.get('/dealer-applications',              distributorController.get_distributor_dealer_applications);
router.post('/dealer-applications/:id/review',  distributorController.review_dealer_application);
router.get('/territory',                        distributorController.get_distributor_territory);
router.get('/plan',                             distributorController.get_distributor_plan);
router.get('/catalogue',                        distributorController.get_distributor_catalogue);
router.post('/pricing/margin',                  distributorController.set_distributor_product_margin);
router.post('/procure/order',                   distributorController.create_distributor_procurement_order);

// ── Industry Media Showcase Endpoints ──
router.get('/industry/my-industries',           distributorController.get_distributor_industries);
router.get('/industry/dashboard-content',       distributorController.get_distributor_dashboard_content);
router.get('/industry/theme',                   distributorController.get_distributor_industry_theme);
router.get('/industry/related-products',        distributorController.get_distributor_industry_related_products);

module.exports = router;
