const express = require('express');
const router = express.Router();
const controller = require('../controllers/marketing.controller');
const check_auth = require('../../middlewares/check.auth');
const { upload_files } = require('../../../account-panel/utils/upload.files');

// Permissive auth for marketing management in dev/staging environments, strict JWT in production
const marketing_auth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || (req.query.token ? `Bearer ${req.query.token}` : null);
  const isProd = process.env.NODE_ENV === 'production';

  if (!authHeader) {
    if (!isProd) {
      req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
      return next();
    }
    return res.status(401).json({ status: 'error', message: 'Authorization header missing', auth: false });
  }

  return check_auth(req, res, (err) => {
    if (err) {
      if (!isProd) {
        req.user = { is_super_admin: true, name: 'Admin', role_id: 'super_admin' };
        return next();
      }
      return next(err);
    }
    next();
  });
};

// ── Public Routes (Tracking Redirect & One-Click Unsubscribe) ──
router.get('/t/:code', controller.handleShortUrl);
router.get('/unsubscribe', controller.handleUnsubscribe);
router.post('/unsubscribe', controller.handleUnsubscribe);

// ── Protected Admin Marketing Endpoints ──
router.use(marketing_auth);

// Dynamic Reference Resources (States, Clusters, Warehouses, Kits, Owners, Industries, Coupons)
router.get('/resources', controller.getMarketingResources);

// Media Upload to Cloudinary
router.post('/media/upload', upload_files('marketing-creatives', 10, 'file', 1), controller.uploadMarketingMedia);

// Queue & Delivery Logs Monitoring
router.get('/queue/status', controller.getMarketingQueueStatus);
router.post('/queue/clear', controller.clearMarketingQueue);
router.get('/delivery-logs', controller.getDeliveryLogs);

// Dashboard & Analytics
router.get('/analytics', controller.getDashboardAnalytics);
router.get('/territory-map', controller.getTerritoryMapAnalytics);
router.get('/reports', controller.getReports);

// Campaigns Lifecycle & Test Dispatch
router.get('/campaigns', controller.getCampaigns);
router.post('/campaigns', controller.createCampaign);
router.post('/campaigns/test-send', controller.testCampaignSend);
router.get('/campaigns/:id', controller.getCampaignById);
router.get('/campaigns/:id/logs', controller.getCampaignLogs);
router.put('/campaigns/:id', controller.updateCampaign);
router.delete('/campaigns/:id', controller.deleteCampaign);
router.post('/campaigns/:id/launch', controller.triggerLaunchCampaign);
router.post('/campaigns/:id/resume', controller.triggerLaunchCampaign);
router.post('/campaigns/:id/pause', controller.pauseCampaign);
router.post('/campaigns/:id/cancel', controller.cancelCampaign);

// Audience Hub, CSV Import, Segments & Suppression
router.get('/audience/list', controller.getAudienceList);
router.post('/audience/import-leads', controller.importDynamicCsvLeads);
router.post('/audience/import', controller.importDynamicCsvLeads);
router.get('/audience/clusters-summary', controller.getAudienceClustersSummary);
router.post('/audience/preview', controller.previewAudience);
router.get('/audience/unsubscribed', controller.getUnsubscribedList);
router.post('/audience/unsubscribed/suppress', controller.suppressContact);
router.post('/audience/unsubscribed/resubscribe', controller.resubscribeContact);

router.get('/segments', controller.getSegments);
router.post('/segments', controller.createSegment);
router.put('/segments/:id', controller.updateSegment);
router.delete('/segments/:id', controller.deleteSegment);

// Email & WhatsApp Senders
router.get('/senders', controller.getSenders);
router.post('/senders', controller.createSender);
router.put('/senders/:id', controller.updateSender);
router.delete('/senders/:id', controller.deleteSender);
router.post('/senders/test', controller.testSender);

// Templates CRUD & Testing
router.get('/templates', controller.getTemplates);
router.post('/templates', controller.createTemplate);
router.put('/templates/:id', controller.updateTemplate);
router.delete('/templates/:id', controller.deleteTemplate);
router.patch('/templates/:id/status', controller.patchTemplateStatus);
router.post('/templates/:id/test', controller.testTemplate);

// Tracking Links & UTM Manager
router.get('/tracking-links', controller.getTrackingLinks);
router.post('/tracking-links', controller.createTrackingLink);
router.delete('/tracking-links/:id', controller.deleteTrackingLink);

// Seasonal Coupons (Backed by OfferMaster)
router.get('/coupons', controller.getCoupons);
router.post('/coupons', controller.createCoupon);
router.put('/coupons/:id', controller.updateCoupon);
router.patch('/coupons/:id/toggle', controller.toggleCoupon);
router.delete('/coupons/:id', controller.deleteCoupon);

// Website Form Mappings
router.get('/form-mappings', controller.getFormMappings);
router.put('/form-mappings/bulk-update', controller.bulkUpdateFormMappings);
router.put('/form-mappings/:id', controller.updateFormMapping);

module.exports = router;
