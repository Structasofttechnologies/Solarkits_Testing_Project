'use strict';

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/admin.controller');
const contentController = require('../controllers/cms/content.controller');
const reportsController = require('../controllers/admin/reports.controller');
const auditController = require('../controllers/admin/audit.controller');

// ── Admin Distributor Application Endpoints ─────────────────────────────────
router.get('/stats',                                    adminController.get_admin_stats);
router.get('/distributor-applications',                 adminController.get_distributor_applications);
router.get('/distributor-applications/:id',             adminController.get_distributor_application_detail);
router.post('/distributor-applications/:id/review',     adminController.review_distributor_application);
router.post('/distributor-applications/:id/activate',   adminController.activate_distributor_account);
router.get('/distributors',                             adminController.get_distributors);
router.post('/distributors/:id/status',                 adminController.update_distributor_status);
router.get('/dealers',                                  adminController.get_dealers);

// ── Admin Distributor Plan Management Endpoints ─────────────────────────────
router.get('/plans',                                    adminController.get_plans);
router.post('/plans',                                   adminController.create_plan);
router.put('/plans/reorder',                            adminController.reorder_plans);
router.post('/plans/migrate-distributors',              adminController.migrate_distributors_plan);
router.get('/plans/territory-allocations',              adminController.get_territory_allocations);
router.post('/plans/territory-override',                adminController.override_territory_conflict);
router.put('/plans/:id',                                adminController.update_plan);
router.post('/plans/:id/duplicate',                     adminController.duplicate_plan);
router.patch('/plans/:id/status',                       adminController.set_plan_status);
router.get('/plans/:id/versions',                       adminController.get_plan_versions);

// ── Channel Settings Master Endpoints ─────────────────────────────────────────
router.get('/channel-settings',                         adminController.get_channel_settings);
router.post('/channel-settings',                        adminController.create_channel_setting);
router.put('/channel-settings/:id',                     adminController.update_channel_setting);
router.post('/channel-settings/:id/duplicate',          adminController.duplicate_channel_setting);
router.delete('/channel-settings/:id',                  adminController.delete_channel_setting);

// ── Products, Categories & Pricing Masters ────────────────────────────────────
router.get('/products',                                 adminController.get_admin_products);
router.put('/products/:id/pricing',                     adminController.update_product_pricing);
router.get('/categories',                               adminController.get_admin_categories);

// ── MOQ Rules Master Endpoints ────────────────────────────────────────────────
router.get('/moq-rules',                                adminController.get_moq_rules);
router.post('/moq-rules',                               adminController.create_moq_rule);
router.put('/moq-rules/:id',                            adminController.update_moq_rule);
router.delete('/moq-rules/:id',                         adminController.delete_moq_rule);

// ── GST / Tax Rules Master Endpoints ──────────────────────────────────────────
router.get('/tax-rules',                                adminController.get_tax_rules);
router.post('/tax-rules',                               adminController.create_tax_rule);
router.put('/tax-rules/:id',                            adminController.update_tax_rule);
router.delete('/tax-rules/:id',                         adminController.delete_tax_rule);

// ── Territory Master Endpoints ────────────────────────────────────────────────
router.get('/territories',                              adminController.get_admin_territories);
router.post('/territories/assign',                      adminController.assign_territory);

// ── Orders Master Endpoints ───────────────────────────────────────────────────
router.get('/orders',                                   adminController.get_admin_orders);
router.get('/orders/:id',                               adminController.get_admin_order_detail);
router.post('/orders/:id/status',                       adminController.update_order_status);
router.put('/orders/:id/status',                        adminController.update_order_status);

// ── Payments Master Endpoints ─────────────────────────────────────────────────
router.get('/payments',                                 adminController.get_admin_payments);

// ── Content Management CMS Endpoints ──────────────────────────────────────────
router.get('/content',                                  contentController.get_admin_content);
router.post('/content',                                 contentController.create_admin_content);
router.put('/content/:id',                              contentController.update_admin_content);
router.delete('/content/:id',                           contentController.delete_admin_content);

// ── Cross-Platform Reports Endpoints ──────────────────────────────────────────
router.get('/reports/executive-summary',                reportsController.get_executive_summary);
router.get('/reports/financials',                       reportsController.get_financial_reports);
router.get('/reports/territory-coverage',               reportsController.get_territory_reports);

// ── Audit Logs Endpoints ──────────────────────────────────────────────────────
router.get('/audit-logs',                               auditController.get_audit_logs);

module.exports = router;

