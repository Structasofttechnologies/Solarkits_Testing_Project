const express = require('express');
const router = express.Router();

const DashboardController = require('../controllers/dashboard.controller');
const ProviderController = require('../controllers/provider.controller');
const QuotaController = require('../controllers/quota.controller');
const LogsController = require('../controllers/logs.controller');
const ResendController = require('../controllers/resend.controller');
const BillingController = require('../controllers/billing.controller');
const AnalyticsController = require('../controllers/analytics.controller');
const WebhooksController = require('../controllers/webhooks.controller');

// 1. Dashboard Metrics
router.get('/dashboard/overview', DashboardController.getOverview);

// 2. Provider Management
router.get('/providers', ProviderController.getAll);
router.put('/providers/:provider_key', ProviderController.updateProvider);
router.post('/providers/:provider_key/set-default', ProviderController.setDefault);
router.post('/providers/:provider_key/test', ProviderController.testConnection);
router.post('/providers/send-test-email', ProviderController.sendTestEmail);

// 3. Quota Management
router.get('/quotas', QuotaController.getOverview);
router.put('/quotas/:provider', QuotaController.updateConfig);
router.post('/quotas/:provider/reset', QuotaController.resetUsage);

// 4. Email Logs
router.get('/logs', LogsController.getLogs);
router.get('/logs/export/csv', LogsController.exportCsv);
router.get('/logs/:id', LogsController.getLogDetail);

// 5. Resend & Retry Manager
router.get('/resend/failed-queue', ResendController.getFailedQueue);
router.post('/resend/retry-single/:id', ResendController.retrySingle);
router.post('/resend/retry-bulk', ResendController.retryBulk);

// 6. Billing & Payments
router.get('/billing/summary', BillingController.getSummary);
router.post('/billing/invoices', BillingController.createInvoice);
router.put('/billing/invoices/:id/pay', BillingController.markInvoicePaid);

// 7. Analytics
router.get('/analytics/deliverability', AnalyticsController.getDeliverability);
router.get('/analytics/providers', AnalyticsController.getProviderMetrics);

// 8. Webhooks (External delivery/bounce tracking)
router.post('/webhooks/ses', WebhooksController.handleSesWebhook);
router.post('/webhooks/sender', WebhooksController.handleSenderWebhook);

module.exports = router;
