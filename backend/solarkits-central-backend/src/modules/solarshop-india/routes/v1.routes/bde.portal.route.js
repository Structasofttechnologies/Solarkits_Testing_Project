/**
 * bde.portal.route.js
 *
 * Express router for BDE Portal self-service APIs.
 * Prefix: /api/bde/v1 or /api/india/v1/bde
 *
 * SolarKits – Updated BDE Login & EPC Management Module
 */

const express = require('express');
const router = express.Router();

const { verify_bde_auth } = require('../../middlewares/verify_bde_auth');
const handler = require('../../controller/bde.portal.handler');
const employeeHandler = require('../../../admin-panel/controller/store.setup.employee.handler');
const { upload_any_files } = require('../../../admin-panel/utils/upload.files');

const proofUpload = upload_any_files('public/uploads/store_setup', 10);

// ── Public Auth Endpoints ─────────────────────────────────────────────────────
router.post('/auth/login', handler.login_bde);
router.post('/auth/logout', handler.logout_bde);
router.post('/auth/forgot-password', handler.forgot_password);

// ── Protected BDE Core Endpoints ──────────────────────────────────────────────
router.post('/auth/change-password', verify_bde_auth, handler.change_password);
router.get('/profile/me', verify_bde_auth, handler.get_bde_me);
router.put('/profile/update', verify_bde_auth, handler.update_me || handler.update_bde_me);
router.get('/dashboard', verify_bde_auth, handler.get_bde_dashboard);
router.get('/sidebar-counts', verify_bde_auth, handler.get_sidebar_counts);

// Notifications
router.get('/notifications', verify_bde_auth, handler.get_notifications);
router.put('/notifications/read-all', verify_bde_auth, handler.mark_all_notifications_read);
router.put('/notifications/:id/read', verify_bde_auth, handler.mark_notification_read);

// Scoped assignments & Territory Information
router.get('/territory/my', verify_bde_auth, handler.get_my_territory);
router.get('/territory/availability', verify_bde_auth, require('../../controller/reseller.portal.handler').check_territory_availability);
router.get('/plans/my', verify_bde_auth, handler.get_my_plans);
router.get('/plans', verify_bde_auth, handler.get_my_plans);
router.get('/goals/my', verify_bde_auth, handler.get_my_goals);
router.get('/goals', verify_bde_auth, handler.get_my_goals);

// Store Setup & 16-Step Physical Inspection Execution
router.get('/store-setup', verify_bde_auth, handler.get_my_store_setups);
router.get('/store-setup/:id', verify_bde_auth, handler.get_bde_store_setup_detail);
router.put('/store-setup/:id/checklist/:activity_id', verify_bde_auth, proofUpload, employeeHandler.update_checklist_activity);
router.post('/store-setup/:id/checklist/:activity_id', verify_bde_auth, proofUpload, employeeHandler.update_checklist_activity);
router.post('/store-setup/:id/submit-verification', verify_bde_auth, employeeHandler.submit_for_admin_verification);
router.post('/store-setup/:id/delay-request', verify_bde_auth, proofUpload, employeeHandler.submit_delay_request);

// ── Franchisee Pipeline (Legacy / Store Prospect Leads) ───────────────────────
router.post('/leads/create', verify_bde_auth, handler.create_bde_lead);
router.get('/leads/list', verify_bde_auth, handler.list_bde_leads);
router.get('/leads/detail/:id', verify_bde_auth, handler.get_bde_lead_detail);
router.put('/leads/update/:id', verify_bde_auth, handler.update_bde_lead);
router.get('/leads/activity/:id', verify_bde_auth, handler.get_lead_activities);
router.post('/leads/activity/:id', verify_bde_auth, handler.add_lead_activity);
router.post('/leads/follow-up/:id', verify_bde_auth, handler.schedule_follow_up);
router.put('/leads/stage/:id', verify_bde_auth, handler.update_lead_stage);
router.post('/leads/start-signup/:id', verify_bde_auth, handler.start_franchisee_signup);
router.get('/pipeline', verify_bde_auth, handler.get_bde_pipeline);

// ── 1 & 2. EPC Leads Management ───────────────────────────────────────────────
router.post('/epc-leads/create', verify_bde_auth, handler.create_epc_lead);
router.get('/epc-leads/list', verify_bde_auth, handler.list_epc_leads);
router.get('/epc-leads/detail/:id', verify_bde_auth, handler.get_epc_lead_detail);
router.put('/epc-leads/update/:id', verify_bde_auth, handler.update_epc_lead);
router.post('/epc-leads/follow-up/:id', verify_bde_auth, handler.schedule_epc_follow_up);
router.put('/epc-leads/status/:id', verify_bde_auth, handler.update_epc_lead_status);

// ── 3 & 4. GST-Based EPC Onboarding & Franchisee Assignment ───────────────────
router.post('/epc/verify-gst', verify_bde_auth, handler.verify_epc_gstin);
router.post('/epc/onboard-with-gst', verify_bde_auth, handler.onboard_epc_with_gst);
router.get('/epc/eligible-franchisees', verify_bde_auth, handler.get_eligible_franchisees_for_epc);
router.post('/epc/assign-franchisee', verify_bde_auth, handler.assign_epc_to_franchisee);

// Legacy EPC endpoints (backward-compatible)
router.get('/epc/stats', verify_bde_auth, handler.get_bde_epc_stats);
router.get('/epc/list', verify_bde_auth, handler.get_bde_epc_list);
router.post('/epc/onboard', verify_bde_auth, handler.onboard_epc);
router.get('/epc/franchise-partners', verify_bde_auth, handler.get_bde_franchise_partners);
router.post('/epc/assign-partner', verify_bde_auth, handler.assign_franchise_partner);

// ── 5 & 6. Franchisee Network, Goal vs Achievement & Performance ──────────────
router.get('/franchisees', verify_bde_auth, handler.get_my_franchisees);
router.get('/franchisees/performance', verify_bde_auth, handler.get_franchisee_performance);

// ── 7. Franchisee Order History ───────────────────────────────────────────────
router.get('/franchisees/:id/orders', verify_bde_auth, handler.get_franchisee_order_history);
router.get('/orders/all', verify_bde_auth, handler.get_territory_order_history);

// ── 8. Kit Sales Performance Analytics ────────────────────────────────────────
router.get('/analytics/kit-sales', verify_bde_auth, handler.get_kit_sales_analytics);

// ── 11. Performance Ranking ───────────────────────────────────────────────────
router.get('/ranking/franchisees', verify_bde_auth, handler.get_franchisee_ranking);

// ── 12. EPC Quotation & Follow-up Module ─────────────────────────────────────
router.use('/quotes', require('./bde.quotes.route'));

// ── 13. Franchisee Purchase Order & EPC Allocation Module ────────────────────
router.get('/po/onboarded-epcs', verify_bde_auth, handler.get_bde_onboarded_epcs);
router.get('/po/combokits', verify_bde_auth, handler.get_bde_company_combokits);
router.get('/po/franchisees', verify_bde_auth, handler.get_bde_po_franchisees);
router.get('/po/franchisee/:franchiseeId/plan-settings', verify_bde_auth, handler.get_franchisee_po_plan_settings);
router.get('/po/franchisee/:franchiseeId/epc-buyers', verify_bde_auth, handler.get_franchisee_epc_buyers);
router.get('/po/orders', verify_bde_auth, handler.list_bde_po_orders);
router.post('/po/create', verify_bde_auth, handler.create_bde_po_order);
router.put('/po/:id/allocate', verify_bde_auth, handler.allocate_bde_po_products);
router.post('/po/:id/pay-token', verify_bde_auth, handler.pay_bde_po_token);
router.post('/po/:id/validate', verify_bde_auth, handler.validate_bde_po);
router.post('/po/:id/reorder', verify_bde_auth, handler.reorder_bde_po);
router.get('/po/detail/:id', verify_bde_auth, handler.get_bde_po_detail);
router.get('/shop-hierarchy', verify_bde_auth, require('../../controller/v1.handlers/shop.handler').get_shop_hierarchy);

// ── 14. EPC Customer Store Behavior Analytics & Profile Behavior ──────────────
const epcAnalyticsController = require('../../../admin-panel/controller/epc.analytics.controller');
router.get('/epc-analytics/behavior', verify_bde_auth, epcAnalyticsController.get_epc_behavior_analytics);
router.get('/epc-analytics/epc-profile/:id', verify_bde_auth, epcAnalyticsController.get_epc_profile_detail);
router.put('/epc-analytics/epc-profile/:id/behavior', verify_bde_auth, epcAnalyticsController.update_epc_profile_behavior);

module.exports = router;

