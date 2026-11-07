/**
 * solarshop_settings.schema.js
 *
 * Platform-wide configuration document for India Solarshop operations.
 * Only ONE document should exist in this collection.
 *
 * Phase R1 additions:
 *   - Territory exclusivity policy
 *   - Settlement trigger and return window
 *   - Platform commission defaults
 *   - EPC GST re-verification policy
 *   - Reseller activation readiness flags
 *
 * To read settings, always call SolarshopSettings.findOne().lean() and
 * provide sensible defaults if the document doesn't exist yet.
 *
 * Collection: solarshop_settings
 */

const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  // ── Existing checkout settings ─────────────────────────────────────────────
  enable_checkout_timer:      { type: Boolean, default: true },
  checkout_timer_duration:    { type: Number, default: 20 },    // minutes
  combokit_bulk_panels_limit: { type: Number, default: 30 },
  gst_rate:                   { type: Number, default: 13.8 },

  // ── Stage TATs & Procurement Settings ──────────────────────────────────────
  payment_stage_tats: { type: mongoose.Schema.Types.Mixed, default: {} },
  procurement_settings: {
    production_tat_days:      { type: Number, default: 5 },
    supply_tat_days:          { type: Number, default: 3 },
    estimated_transport_cost: { type: Number, default: 0 },
  },

  // ── Centralized Order & Operational Stage Approval Workflow Settings ────────
  approval_workflow_config: {
    require_order_approval:            { type: Boolean, default: true },
    require_po_approval:               { type: Boolean, default: true },
    require_advance_payment_approval:  { type: Boolean, default: true },
    require_balance_payment_approval:  { type: Boolean, default: true },
    require_delivery_charge_approval:  { type: Boolean, default: true },
    stage_tat_hours: {
      order:          { type: Number, default: 24 },
      po:             { type: Number, default: 24 },
      first_payment:  { type: Number, default: 24 },
      second_payment: { type: Number, default: 24 },
      delivery:       { type: Number, default: 12 },
    }
  },

  // ── Phase R1: Territory Exclusivity Policy ──────────────────────────────────
  /**
   * territory_exclusivity_mode:
   *   'strict'        — Only one active primary reseller per district (default).
   *   'multi_reseller'— Multiple resellers allowed per district; no uniqueness enforced.
   *   'category'      — Exclusivity scoped per product category (application-layer check).
   *   'product'       — Exclusivity scoped per individual product.
   *   'industry'      — Exclusivity scoped per industry type.
   *
   * Backend services must read this setting before performing district assignments.
   * Changing this at runtime does NOT retroactively revoke existing assignments.
   */
  territory_exclusivity_mode: {
    type: String,
    enum: ['strict', 'multi_reseller', 'category', 'product', 'industry'],
    default: 'strict',
  },

  // ── Phase R1: Settlement Engine Defaults ────────────────────────────────────
  /**
   * settlement_trigger:
   *   'delivery_plus_window' — Settlement eligible after delivery + return_window_days (recommended).
   *   'manual'              — Admin manually triggers settlement eligibility.
   *   'payment_confirmation'— Settlement triggered immediately on payment capture (NOT recommended).
   *
   * WARNING: 'payment_confirmation' creates reversal risk for returns/chargebacks.
   * Only enable after explicit business and accounting approval.
   */
  settlement_trigger: {
    type: String,
    enum: ['delivery_plus_window', 'manual', 'payment_confirmation'],
    default: 'delivery_plus_window',
  },

  /**
   * settlement_return_window_days:
   * Number of days after delivery before a settlement becomes eligible.
   * Default: 7 days.
   */
  settlement_return_window_days: { type: Number, default: 7, min: 0 },

  /**
   * platform_commission_pct:
   * Default platform commission percentage deducted from each reseller-channel sale.
   * Can be overridden per reseller or per product via reseller_pricing_rules.
   * Stored as a percentage (e.g. 5 = 5%). Precision limited to 4 decimal places.
   * Default: 0 (no commission) until explicitly configured.
   */
  platform_commission_pct: { type: Number, default: 0, min: 0, max: 100 },

  /**
   * pgw_charge_pct:
   * Default payment gateway charge percentage passed through from Razorpay.
   * Default: 2%.
   */
  pgw_charge_pct: { type: Number, default: 2, min: 0, max: 10 },

  // ── Phase R1: EPC GST Re-Verification Policy ───────────────────────────────
  /**
   * epc_gst_reverify_policy:
   *   'onboarding_only' — GST verified once during EPC onboarding; no re-checks (default).
   *   'periodic'        — Re-verify every epc_gst_reverify_days days automatically.
   *   'per_order'       — Re-verify GST status before every order placement.
   *
   * Affects Phase R8 order pre-validation logic.
   */
  epc_gst_reverify_policy: {
    type: String,
    enum: ['onboarding_only', 'periodic', 'per_order'],
    default: 'onboarding_only',
  },

  /**
   * epc_gst_reverify_days:
   * Applicable when epc_gst_reverify_policy === 'periodic'.
   * Number of days between automatic re-verifications.
   * Default: 90 days.
   */
  epc_gst_reverify_days: { type: Number, default: 90, min: 1 },

  // ── Phase R1: Reseller Activation Requirements ─────────────────────────────
  /**
   * Configurable boolean flags that control which checks the activation-readiness
   * service enforces before marking a reseller as 'active'.
   * All default to true (most restrictive). Admin can relax individual requirements.
   */
  activation_require_gst_verified:        { type: Boolean, default: true },
  activation_require_kyc_approved:        { type: Boolean, default: true },
  activation_require_signed_agreement:    { type: Boolean, default: false }, // Off until agreement flow is built (Phase R2)
  activation_require_active_plan:         { type: Boolean, default: false }, // Off until plan requirement is confirmed (Blocking Q4)
  activation_require_territory_assigned:  { type: Boolean, default: true },
  activation_require_product_auth:        { type: Boolean, default: true },

  // ── Franchise Master Agreement Content & Template ──────────────────────────
  franchise_agreement_title: {
    type: String,
    default: 'SolarKits Authorized Franchise Partner Agreement',
    trim: true,
  },
  franchise_agreement_version: {
    type: String,
    default: '2.0',
    trim: true,
  },
  franchise_agreement_template: {
    type: String,
    default: `SOLARKITS AUTHORIZED FRANCHISE PARTNER AGREEMENT

This Franchise Distribution & Commercial Channel Agreement ("Agreement") is formally entered into and effective as of {{AGREEMENT_DATE}} by and between:

1. THE COMPANY:
SolarKits Clean Energy Solutions Private Limited, having its corporate fulfillment center and technology office in India (hereinafter referred to as the "Company" or "SolarKits").

2. THE FRANCHISE PARTNER:
{{BUSINESS_NAME}}, represented by authorized signatory {{PARTNER_NAME}}, having registered commercial premises at {{TERRITORY}}, with GSTIN: {{GSTIN}} (hereinafter referred to as the "Franchise Partner" or "Franchisee").

RECITALS & PURPOSE:
WHEREAS the Company is engaged in the manufacturing, assembly, and turnkey supply of pre-engineered Solar BOS Combo Kits, mono PERC / TopCon panels, on-grid/hybrid inverters, module mounting structures, and associated electrical accessories.
WHEREAS the Franchise Partner desires to obtain authorized distribution, retail demonstration, and local EPC contractor procurement fulfillment rights for the Designated Territory of {{TERRITORY}}.

NOW THEREFORE, the parties mutually agree as follows:

CLAUSE 1 — APPOINTMENT & TERRITORY AUTHORIZATION
1.1 The Company hereby authorizes the Franchise Partner as an Official SolarKits Franchisee for the designated territory of {{TERRITORY}}.
1.2 The Franchise Partner is authorized to promote, stock, distribute, and supply turnkey SolarKits Combo Packages to local EPC contractors, solar installers, commercial clients, and residential end-users.

CLAUSE 2 — COMMERCIAL TERMS, PRICING & MARGINS
2.1 Franchise Partner shall receive guaranteed factory-direct wholesale pricing, exclusive bundle margin slabs, and procurement discounts across all pre-engineered kits.
2.2 The Commercial Model assigned to Franchise Partner is {{COMMERCIAL_MODE}}.
2.3 Margin settlements and incentive payouts shall be governed by platform settlement policies and credited to Franchise Partner's dedicated wallet.

CLAUSE 3 — QUALITY ASSURANCE & WARRANTY
3.1 Franchise Partner covenants to supply only genuine SolarKits certified modules, inverters, and BOS accessories.
3.2 All components carry standard manufacturer warranties (25-year panel performance, 5/10-year inverter replacement warranty).

CLAUSE 4 — REGISTRATION & ONE-TIME FEE SETTLEMENT
4.1 Franchise onboarding requires digital signature of this Agreement and verification of the franchise fee settlement.
4.2 Upon verification, full operational platform access, priority stock allocation, and regional lead routing will be unlocked immediately.

CLAUSE 5 — TERM, RENEWAL & TERMINATION
5.1 This Agreement is valid for a period of 12 (twelve) months from the date of activation and shall renew annually based on minimum order quantity (MOQ) targets and mutual agreement.
5.2 Either party may terminate this agreement with 30 days written notice in case of breach of quality compliance or exclusivity guidelines.

CLAUSE 6 — GOVERNING LAW & JURISDICTION
6.1 This Agreement shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in India.

[DIGITAL EXECUTION DECLARATION]
By digitally signing below, the Franchise Partner certifies that they have read, understood, and accept all terms and conditions of this Franchise Agreement.`,
  },

  // ── Flagship Store / Excluded Districts (Territories blocked for prospective franchisees) ──
  flagship_excluded_districts: [
    {
      state: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      reason: { type: String, default: 'Company Flagship Store', trim: true },
      added_at: { type: Date, default: Date.now },
    }
  ],

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  collection: 'solarshop_settings',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('solarshop_settings', schema);
