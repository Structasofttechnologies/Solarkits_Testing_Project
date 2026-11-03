/**
 * reseller.portal.route.js
 *
 * Express router for Reseller Portal self-service APIs.
 * Prefix: /api/india/v1/reseller
 *
 * Phase 2 — Reseller Management System
 */

const express = require('express');
const router = express.Router();

const { verify_reseller_auth } = require('../../middlewares/verify_reseller_auth');
const handler = require('../../controller/reseller.portal.handler');
const { upload_files, upload_any_files } = require('../../../admin-panel/utils/upload.files');
// Phase R1: Rate limiting on reseller auth, GST and OTP endpoints
const { authRateLimiter, gstRateLimiter, otpRateLimiter } = require('../../../admin-panel/middlewares/rate.limit');

const kycDocUpload = upload_any_files('public/uploads/kyc', 10);
const poReceiptUpload = upload_any_files('public/uploads/po_receipts', 10);

// ── Public Auth & Registration ───────────────────────────────────────────────
router.get('/types', handler.get_active_types);
router.post('/auth/register', authRateLimiter, handler.register_reseller);
router.post('/auth/login',    authRateLimiter, handler.login_reseller);
router.post('/auth/login-pin', authRateLimiter, handler.login_reseller_pin);
router.post('/auth/pin/status', handler.check_pin_status);
router.post('/auth/logout', handler.logout_reseller);

// ── Dynamic Landing Page CMS Content ──────────────────────────────────────────
router.get('/landing-content', require('../../../admin-panel/controller/website.content.handler').get_public_franchise_content);

// ── Territory Availability & Exclusivity Verification ─────────────────────────
router.get('/territory/availability', handler.check_territory_availability);

// ── Inbound Franchisee & Territory Application Leads ─────────────────────────
router.post('/leads/submit', require('../../../admin-panel/controller/reseller.leads.handler').submit_lead);

// ── GST Verification (Public QuickeKYC corporate/gstin check) ────────────────
router.post('/gst/verify', gstRateLimiter, handler.verify_gstin);

// ── Mobile OTP Verification (Franchise Onboarding / Reseller Portal) ─────────
router.post('/otp/send',   otpRateLimiter, handler.send_mobile_otp);
router.post('/otp/verify', handler.verify_mobile_otp);

// ── Public / Self-service Franchise Purchase & Onboarding ───────────────────
router.post('/plans/purchase-and-onboard', handler.purchase_and_onboard);

// ── Protected Reseller Endpoints ──────────────────────────────────────────────
router.get('/auth/me', verify_reseller_auth, handler.get_reseller_me);
router.post('/auth/pin/setup', verify_reseller_auth, handler.setup_reseller_pin);
router.post('/auth/pin/change', verify_reseller_auth, handler.change_reseller_pin);
router.get('/territories', verify_reseller_auth, handler.get_reseller_my_territories);
router.get('/authorized-products', verify_reseller_auth, handler.get_reseller_authorized_products);
router.get('/commission-rates',     verify_reseller_auth, handler.get_reseller_commission_rates);
router.post('/kyc/upload', verify_reseller_auth, kycDocUpload, handler.upload_kyc_document);
router.post('/kyc/submit', verify_reseller_auth, handler.submit_kyc);
router.get('/plans/list', handler.get_active_plans);
router.get('/plans/my-subscription', verify_reseller_auth, handler.get_my_subscription);
router.post('/plans/subscribe',     verify_reseller_auth, handler.subscribe_plan);

// ── Franchise Agreement Signing Routes ─────────────────────────────────────
router.get('/agreement/current', verify_reseller_auth, handler.get_current_agreement);
router.post('/agreement/sign',    verify_reseller_auth, kycDocUpload, handler.sign_agreement);

// ── Offline Manual Fee Payment & Receipt Routes ───────────────────────────
router.get('/fee-payment/info',           verify_reseller_auth, handler.get_fee_payment_info);
router.post('/fee-payment/upload-receipt', verify_reseller_auth, kycDocUpload, handler.upload_manual_payment_receipt);

// ── Physical Store Setup & Verification Routes ─────────────────────────────
router.get('/store-setup/my-setup', verify_reseller_auth, handler.get_my_store_setup);
router.get('/store-setup/master-checklist', handler.get_master_store_setup_checklist);

router.post('/epc-buyers/register', verify_reseller_auth, handler.register_epc_buyer);
router.get('/epc-buyers/list', verify_reseller_auth, handler.list_my_epc_buyers);
router.get('/epc-orders/list', verify_reseller_auth, handler.list_my_epc_orders);
router.get('/epc-orders/:id/tracking', verify_reseller_auth, handler.get_epc_order_live_tracking);
router.post('/checkout/validate', verify_reseller_auth, require('../../../admin-panel/controller/reseller.checkout.handler').validate_checkout);

// ── Franchisee Self-Service PO Ordering Routes ─────────────────────────────
router.get('/po/plan-settings',       verify_reseller_auth, handler.get_my_plan_po_settings);
router.get('/po/my-orders',           verify_reseller_auth, handler.list_my_po_orders);
router.get('/po/active-quotas',       verify_reseller_auth, handler.get_my_active_po_quotas);
router.post('/po/create',             verify_reseller_auth, handler.create_my_po_order);
router.put('/po/:id/allocate',        verify_reseller_auth, handler.allocate_po_products);
router.post('/po/:id/pay-token',      verify_reseller_auth, handler.pay_po_token);
router.post('/po/:id/validate',       verify_reseller_auth, handler.validate_my_po);
router.get('/po/detail/:id',          verify_reseller_auth, handler.get_my_po_order_detail);
router.get('/po/:id/penalty-preview', verify_reseller_auth, handler.preview_po_penalty);
router.post('/po/:id/request-refund', verify_reseller_auth, handler.request_po_refund);
router.post('/po/upload-receipt',    verify_reseller_auth, poReceiptUpload, handler.upload_po_receipt);
router.post('/po/:id/reorder',        verify_reseller_auth, handler.reorder_against_po);
router.get('/goals/my-goal',          verify_reseller_auth, handler.get_my_goal_progress);

// Bank Details Routes (commission payout account management)
router.get('/profile/bank-details',  verify_reseller_auth, handler.get_reseller_bank_details);
router.put('/profile/bank-details',  verify_reseller_auth, handler.update_reseller_bank_details);


// Wallet & Ledger Routes (Phase 7 + R10)
const walletPortalHandler = require('../../../admin-panel/controller/reseller.wallet.portal.handler');
router.get('/wallet/me',        verify_reseller_auth, walletPortalHandler.get_my_wallet);
router.get('/wallet/breakdown', verify_reseller_auth, walletPortalHandler.get_wallet_breakdown);
router.get('/wallet/ledger',    verify_reseller_auth, walletPortalHandler.get_my_ledger);
router.post('/wallet/withdraw', verify_reseller_auth, walletPortalHandler.request_withdrawal);
router.get('/wallet/payouts',   verify_reseller_auth, walletPortalHandler.get_my_payouts);

// Procurement & Stock Inventory Routes
const procurementHandler = require('../../../admin-panel/controller/reseller.procurement.handler');
router.post('/procurement/create', verify_reseller_auth, procurementHandler.create_order);
router.post('/procurement/confirm-payment', verify_reseller_auth, procurementHandler.confirm_procurement_payment);
router.get('/procurement/list', verify_reseller_auth, procurementHandler.list_procurement_orders);
router.get('/inventory', verify_reseller_auth, procurementHandler.get_inventory_balance);

// Storefront Listings Routes & Lifecycle Actions
const pricingHandler = require('../../../admin-panel/controller/reseller.pricing.handler');
const checkoutHandler = require('../../../admin-panel/controller/reseller.checkout.handler');
router.get('/listings', verify_reseller_auth, pricingHandler.list_reseller_listings);
router.post('/listings', verify_reseller_auth, pricingHandler.upsert_reseller_listing);
router.post('/listings/:id/purchase', verify_reseller_auth, pricingHandler.purchase_reseller_product);
router.post('/listings/:id/margin', verify_reseller_auth, pricingHandler.update_reseller_margin);
router.post('/listings/:id/publish', verify_reseller_auth, pricingHandler.publish_reseller_listing);
router.post('/listings/:id/unpublish', verify_reseller_auth, pricingHandler.unpublish_reseller_listing);

// EPC Buyer Checkout Routes
router.post('/epc-checkout/create', checkoutHandler.create_epc_order);
router.post('/epc-checkout/confirm', checkoutHandler.confirm_epc_payment);

// EPC Wallet Routes (authenticated via verify_auth)
const { verify_auth } = require('../../middlewares/auth');
const epcWalletHandler = require('../../../admin-panel/controller/epc.wallet.handler');
router.get('/epc/wallet/me', verify_auth, epcWalletHandler.get_my_wallet);
router.get('/epc/wallet/ledger', verify_auth, epcWalletHandler.get_my_ledger);

// ── Industry Content Dashboard Routes ─────────────────────────────────────────
// These routes serve industry-aware content to the authenticated reseller's dashboard.
// All requests are double-validated: JWT + approved UserIndustryMap.
const industryDashboardHandler = require('../../controller/industry.dashboard.handler');
router.get('/industry/my-industries',   verify_reseller_auth, industryDashboardHandler.get_my_industries);
router.post('/industry/select',         verify_reseller_auth, industryDashboardHandler.select_industry);
router.get('/industry/dashboard-content', verify_reseller_auth, industryDashboardHandler.get_dashboard_content);
router.get('/industry/related-products',  verify_reseller_auth, industryDashboardHandler.get_related_products);
router.get('/industry/theme',             verify_reseller_auth, industryDashboardHandler.get_industry_theme);

// ── Service Ticket / Kit Item Replacement Routes (Franchisee) ─────────────────
const serviceTicketHandler = require('../../controller/service_ticket.handler');
const proofUpload = upload_any_files('public/uploads/service-tickets', 5);

router.post('/service-tickets/raise',              verify_reseller_auth, serviceTicketHandler.raise_ticket);
router.get('/service-tickets',                     verify_reseller_auth, serviceTicketHandler.get_my_tickets);
router.get('/service-tickets/:id',                 verify_reseller_auth, serviceTicketHandler.get_my_ticket_detail);
router.post('/service-tickets/:id/confirm-delivery', verify_reseller_auth, serviceTicketHandler.confirm_replacement_received);
router.post('/service-tickets/:id/upload-proof',   verify_reseller_auth, proofUpload, serviceTicketHandler.upload_ticket_proof);

// ── Service Ticket / Kit Item Replacement Routes (EPC Buyer) ──────────────────
router.post('/epc/service-tickets/raise',              verify_auth, serviceTicketHandler.raise_epc_ticket);
router.get('/epc/service-tickets',                     verify_auth, serviceTicketHandler.get_epc_tickets);
router.get('/epc/service-tickets/:id',                 verify_auth, serviceTicketHandler.get_epc_ticket_detail);
router.post('/epc/service-tickets/:id/confirm-delivery', verify_auth, serviceTicketHandler.confirm_epc_replacement);

// ── EPC Quotation & Follow-up Module ──────────────────────────────────────
router.use('/quotes', require('./reseller.quotes.route'));

module.exports = router;

