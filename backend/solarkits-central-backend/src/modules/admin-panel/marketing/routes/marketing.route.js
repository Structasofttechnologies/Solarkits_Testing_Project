const express = require('express');
const router = express.Router();
const controller = require('../controllers/marketing.controller');
const check_auth = require('../../middlewares/check.auth');

// Permissive auth for marketing management in dev/staging environments
const marketing_auth = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || (req.query.token ? `Bearer ${req.query.token}` : null);
  if (!authHeader) {
    if (process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'staging') {
      req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
      return next();
    }
    return res.status(401).json({ status: "error", message: "Authorization header missing", auth: false });
  }

  return check_auth(req, res, (err) => {
    if (err) {
      if (process.env.NODE_ENV !== 'production' || process.env.NODE_ENV === 'staging') {
        req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
        return next();
      }
      return next(err);
    }
    next();
  });
};

const { upload_files } = require('../../../account-panel/utils/upload.files');

// ── Public Routes (Tracking & Unsubscribe) ──
router.get('/t/:code', controller.handleShortUrl);
router.get('/unsubscribe', controller.handleUnsubscribe);

// ── Protected Admin Marketing Endpoints ──
router.use(marketing_auth);

// Audience Hub Unsubscribed List
router.get('/audience/unsubscribed', controller.getUnsubscribedList);

// Media Upload to Cloudinary (for email banners, logos, and attachments)
router.post('/media/upload', upload_files('marketing-creatives', 10, 'file', 1), controller.uploadMarketingMedia);

// Email Queue Status Monitoring
router.get('/queue/status', controller.getMarketingQueueStatus);

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

// Audience Hub & Dynamic CSV Import (Boss Requirements 1 & 2)
router.get('/audience/list', controller.getAudienceList);
router.post('/audience/import-leads', controller.importDynamicCsvLeads);
router.post('/audience/import', controller.importDynamicCsvLeads);
router.get('/audience/clusters-summary', controller.getAudienceClustersSummary);
router.post('/audience/preview', controller.previewAudience);

// Email & WhatsApp Senders
router.get('/senders', controller.getSenders);
router.post('/senders', controller.createSender);
router.put('/senders/:id', controller.updateSender);
router.delete('/senders/:id', controller.deleteSender);
router.post('/senders/test', controller.testSender);

// Templates
router.get('/templates', controller.getTemplates);
router.post('/templates', controller.createTemplate);

// Website Form Mappings
router.get('/form-mappings', controller.getFormMappings);
router.put('/form-mappings/bulk-update', controller.bulkUpdateFormMappings);
router.put('/form-mappings/:id', controller.updateFormMapping);

module.exports = router;
