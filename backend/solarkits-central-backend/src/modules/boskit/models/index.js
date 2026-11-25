'use strict';

/**
 * BOSKIT Models — Barrel Export
 *
 * Import from here in all BOSKIT controllers and services.
 * All BOSKIT collections are registered here.
 */

// ── Distributor Onboarding & Territory ───────────────────────────────────────
const BoskitDistributor            = require('./boskit_distributors.schema');
const BoskitDistributorApplication = require('./boskit_distributor_applications.schema');
const BoskitDistributorKyc         = require('./boskit_distributor_kyc.schema');
const BoskitTerritory              = require('./boskit_territories.schema');

// ── Dealer Onboarding ────────────────────────────────────────────────────────
const BoskitDealer                 = require('./boskit_dealers.schema');
const BoskitDealerApplication      = require('./boskit_dealer_applications.schema');
const BoskitDistributorDealerMap   = require('./boskit_distributor_dealer_maps.schema');

// ── Plans ────────────────────────────────────────────────────────────────────
const BoskitDistributorPlan        = require('./boskit_distributor_plans.schema');
const BoskitPlanVersion            = require('./boskit_plan_versions.schema');
const BoskitDistributorPlanAssignment = require('./boskit_distributor_plan_assignments.schema');

// ── Pricing & Configuration ──────────────────────────────────────────────────
const BoskitPriceRule              = require('./boskit_price_rules.schema');
const BoskitMoqRule                = require('./boskit_moq_rules.schema');
const BoskitProductAssignment      = require('./boskit_product_assignments.schema');
const BoskitChannelSettings        = require('./boskit_channel_settings.schema');
const BoskitTaxRule                = require('./boskit_tax_rules.schema');

// ── Cart, Orders, Payments ───────────────────────────────────────────────────
const BoskitCart                   = require('./boskit_carts.schema');
const BoskitOrder                  = require('./boskit_orders.schema');
const BoskitPayment                = require('./boskit_payments.schema');
const BoskitPaymentTransaction     = require('./boskit_payment_transactions.schema');
const BoskitInvoice                = require('./boskit_invoices.schema');

// ── Commissions ──────────────────────────────────────────────────────────────
const BoskitCommissionRule         = require('./boskit_commission_rules.schema');
const BoskitCommission             = require('./boskit_commissions.schema');

// ── Content & Notifications ──────────────────────────────────────────────────
const BoskitContentItem            = require('./boskit_content_items.schema');
const BoskitNotification           = require('./boskit_notifications.schema');
const BoskitOtp                    = require('./boskit_otps.schema');

// ── Settings (singleton) ──────────────────────────────────────────────────────
const BoskitSettings               = require('./boskit_settings.schema');

module.exports = {
  // Distributor & Territory
  BoskitDistributor,
  BoskitDistributorApplication,
  BoskitDistributorKyc,
  BoskitTerritory,
  // Dealer
  BoskitDealer,
  BoskitDealerApplication,
  BoskitDistributorDealerMap,
  // Plans
  BoskitDistributorPlan,
  BoskitPlanVersion,
  BoskitDistributorPlanAssignment,
  // Pricing & Config
  BoskitPriceRule,
  BoskitMoqRule,
  BoskitProductAssignment,
  BoskitChannelSettings,
  BoskitTaxRule,
  // Orders & Payments
  BoskitCart,
  BoskitOrder,
  BoskitPayment,
  BoskitPaymentTransaction,
  BoskitInvoice,
  // Commissions
  BoskitCommissionRule,
  BoskitCommission,
  // Content & Notifications
  BoskitContentItem,
  BoskitNotification,
  BoskitOtp,
  // Settings
  BoskitSettings,
};
