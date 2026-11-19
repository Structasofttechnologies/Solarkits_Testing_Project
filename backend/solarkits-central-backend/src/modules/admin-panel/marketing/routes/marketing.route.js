const express = require('express');
const router = express.Router();
const controller = require('../controllers/marketing.controller');
const check_auth = require('../../middlewares/check.auth');

// ── Public Short URL Tracking ──
router.get('/t/:code', controller.handleShortUrl);

// ── Protected Admin Marketing Endpoints ──
router.use(check_auth);

// Dashboard & Analytics
router.get('/analytics', controller.getDashboardAnalytics);
router.get('/territory-map', controller.getTerritoryMapAnalytics);
router.get('/reports', controller.getReports);

// Campaigns
router.get('/campaigns', controller.getCampaigns);
router.post('/campaigns', controller.createCampaign);
router.get('/campaigns/:id', controller.getCampaignById);
router.put('/campaigns/:id', controller.updateCampaign);
router.delete('/campaigns/:id', controller.deleteCampaign);
router.post('/campaigns/:id/launch', controller.triggerLaunchCampaign);
router.post('/campaigns/:id/pause', controller.pauseCampaign);

// Audience Preview
router.post('/audience/preview', controller.previewAudience);

// Email & WhatsApp Senders
router.get('/senders', controller.getSenders);
router.post('/senders', controller.createSender);
router.post('/senders/test', controller.testSender);

// Templates
router.get('/templates', controller.getTemplates);
router.post('/templates', controller.createTemplate);

// Website Form Mappings
router.get('/form-mappings', controller.getFormMappings);
router.put('/form-mappings/:id', controller.updateFormMapping);

module.exports = router;
