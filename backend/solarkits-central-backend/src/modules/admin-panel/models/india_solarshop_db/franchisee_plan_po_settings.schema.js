const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_plan_po_settings — PO Ordering configuration linked to a Reseller Plan.
 *
 * Governs whether PO ordering is enabled for a plan, quantity limits, payment terms,
 * allowed project/product types, territory levels, approval requirements, and
 * whether the PO quantity counts toward the monthly kit target.
 *
 * Collection: franchisee_plan_po_settings
 */
const cancellationRulesSchema = new mongoose.Schema(
  {
    allow_before_approval:   { type: Boolean, default: true },
    allow_before_payment:    { type: Boolean, default: true },
    allow_after_payment:     { type: Boolean, default: false },
    allow_after_dispatch:    { type: Boolean, default: false },
    allow_partial_cancel:    { type: Boolean, default: true },
    cancellation_window_hrs: { type: Number, default: 24 },
  },
  { _id: false }
);

const amendmentRulesSchema = new mongoose.Schema(
  {
    allow_before_approval: { type: Boolean, default: true },
    allow_before_payment:  { type: Boolean, default: false },
    max_amendments:        { type: Number, default: 3 },
  },
  { _id: false }
);

const contractClauseSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    body:         { type: String, required: true },
    is_mandatory: { type: Boolean, default: true },
  },
  { _id: false }
);

const poContractSettingsSchema = new mongoose.Schema(
  {
    is_contract_required:    { type: Boolean, default: true },
    contract_title:          { type: String, default: 'SolarKits EPC Purchase Order & Supply Commitment Agreement' },
    contract_version:        { type: String, default: '1.0' },
    validity_days:           { type: Number, default: 30 },
    require_mobile_otp:      { type: Boolean, default: true },
    terms_introduction:      { type: String, default: 'This Purchase Order Contract is entered into between the Authorized SolarKits Franchise Partner and the Assigned Solar EPC Contractor for supply commitment and token deposit under the terms set forth below.' },
    clauses:                 [contractClauseSchema],
    penalty_clauses_summary: { type: String, default: null },
    cancellation_terms:      { type: String, default: null },
    updated_at:              { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reseller_plans',
      required: true,
    },

    // ── PO Enable / Disable ───────────────────────────────────────────────────
    po_enabled: { type: Boolean, default: true }, // Default TRUE — admin must explicitly disable

    // ── Quantity Limits ───────────────────────────────────────────────────────
    min_po_quantity: { type: Number, min: 0, default: 1 },
    max_po_quantity: { type: Number, min: 0, default: null }, // null = unlimited

    // ── Mixed Orders ─────────────────────────────────────────────────────────
    allow_mixed_project_types: { type: Boolean, default: true },
    max_line_items:            { type: Number, min: 1, default: 50 },

    // ── Eligibility Filters ───────────────────────────────────────────────────
    allowed_industry_type_ids:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types' }],
    allowed_project_type_ids:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types' }],
    allowed_category_ids:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories' }],
    allowed_subcategory_ids:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories' }],
    allowed_combo_kit_ids:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits' }],
    allowed_product_ids:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'products' }],
    allowed_territory_levels:   [{ type: String, enum: ['district', 'state', 'country'] }],

    // ── Validity ──────────────────────────────────────────────────────────────
    po_validity_days: { type: Number, min: 1, default: 30 },

    // ── Approval ─────────────────────────────────────────────────────────────
    requires_approval: { type: Boolean, default: true },

    // ── Payment & Token Booking Terms ─────────────────────────────────────────
    token_booking_enabled: { type: Boolean, default: true },
    token_type: {
      type: String,
      enum: ['FIXED_AMOUNT', 'PERCENTAGE'],
      default: 'FIXED_AMOUNT',
    },
    token_value: { type: Number, default: 50000 }, // Fixed ₹ amount (e.g. 50000) or Percentage (e.g. 10)
    min_token_amount: { type: Number, default: 10000 },
    po_lock_days: { type: Number, default: 30 },

    // ── Token Settlement & Penalty Rules ──────────────────────────────────────
    token_settlement_rule: {
      type: String,
      enum: ['PRO_RATA', 'FINAL_ORDER', 'UPFRONT'],
      default: 'PRO_RATA',
    },
    default_penalty_type: {
      type: String,
      enum: ['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'],
      default: 'FLAT_PER_UNPURCHASED_KIT',
    },
    default_penalty_rate: { type: Number, default: 500 }, // ₹500 flat per unpurchased kit or %
    penalty_rules: [
      {
        min_committed_qty: { type: Number, default: 1 },
        max_committed_qty: { type: Number, default: null },
        kit_type_ids:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types' }],
        penalty_type:      {
          type: String,
          enum: ['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'],
          default: 'FLAT_PER_UNPURCHASED_KIT',
        },
        penalty_rate:          { type: Number, default: 500 },
        max_penalty_cap_paise: { type: Number, default: 0 },
      },
    ],

    payment_terms: {
      type: String,
      enum: [
        'FULL_ADVANCE',
        'PARTIAL_ADVANCE',
        'PAY_BEFORE_DISPATCH',
        'CREDIT_PERIOD',
        'MANUAL_OFFLINE_PAYMENT',
      ],
      default: 'FULL_ADVANCE',
    },
    advance_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null, // Required when payment_terms === 'PARTIAL_ADVANCE'
    },

    // ── Credit Terms ──────────────────────────────────────────────────────────
    credit_period_eligible: { type: Boolean, default: false },
    credit_period_days:     { type: Number, min: 0, default: 0 },

    // ── Rules ─────────────────────────────────────────────────────────────────
    cancellation_rules: { type: cancellationRulesSchema, default: () => ({}) },
    amendment_rules:    { type: amendmentRulesSchema, default: () => ({}) },

    // ── PO Order Contract Configuration ──────────────────────────────────────
    po_contract: { type: poContractSettingsSchema, default: () => ({}) },

    // ── Target Contribution ───────────────────────────────────────────────────
    contributes_to_monthly_target: { type: Boolean, default: true },

    // ── Effective Period ──────────────────────────────────────────────────────
    effective_from:  { type: Date, required: true, default: Date.now }, // Bug fix: default prevents required-field errors
    effective_until: { type: Date, default: null },

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active:  { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'franchisee_plan_po_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying by plan and status
schema.index({ plan_id: 1, effective_from: 1 });
schema.index({ plan_id: 1, is_active: 1 });
schema.index({ plan_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_plan_po_settings', schema);
