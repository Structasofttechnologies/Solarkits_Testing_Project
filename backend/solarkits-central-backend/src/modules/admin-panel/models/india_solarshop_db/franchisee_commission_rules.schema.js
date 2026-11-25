const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_commission_rules — Dynamic commission configuration per Reseller Plan.
 *
 * Supports two commission methods:
 *   PERCENTAGE    — commission = eligible_order_amount × commission_percentage / 100
 *   FIXED_PER_KIT — commission = eligible_delivered_kit_qty × fixed_amount_per_kit_paise / 100
 *
 * Only one active rule is allowed per plan + method + effective period combination.
 * The recommended calculation_stage is RETURN_PERIOD_COMPLETED.
 *
 * All monetary amounts stored in integer Paise (1 INR = 100 Paise).
 *
 * Collection: franchisee_commission_rules
 */
const schema = new mongoose.Schema(
  {
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reseller_plans',
      required: true,
    },

    // ── Commission Method ─────────────────────────────────────────────────────
    commission_method: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED_PER_KIT'],
      required: true,
    },

    // ── PERCENTAGE method fields ───────────────────────────────────────────────
    commission_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null, // Required when commission_method === 'PERCENTAGE'
    },

    // ── FIXED_PER_KIT method fields ───────────────────────────────────────────
    fixed_amount_per_kit_paise: {
      type: Number,
      min: 0,
      default: null, // Required when commission_method === 'FIXED_PER_KIT' (integer paise)
    },

    // ── Eligibility Constraints ───────────────────────────────────────────────
    min_eligible_quantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    max_commission_paise: {
      type: Number,
      min: 0,
      default: null, // null = no cap
    },

    // ── Scope Filters ─────────────────────────────────────────────────────────
    combo_kit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'pc_comobo_kit',
      default: null,
    },
    applicable_industry_type_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types' },
    ],
    applicable_project_type_ids: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types' },
    ],

    // ── Calculation & Settlement ──────────────────────────────────────────────
    calculation_stage: {
      type: String,
      enum: [
        'ORDER_CONFIRMED',
        'PAYMENT_CAPTURED',
        'DISPATCHED',
        'DELIVERED',
        'RETURN_PERIOD_COMPLETED',
      ],
      default: 'RETURN_PERIOD_COMPLETED',
    },
    settlement_rule: {
      type: String,
      enum: ['IMMEDIATE', 'MONTHLY_BATCH', 'MANUAL'],
      default: 'MONTHLY_BATCH',
    },

    // ── Effective Period ──────────────────────────────────────────────────────
    effective_from: { type: Date, required: true },
    effective_until: { type: Date, default: null }, // null = open-ended

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active: { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'franchisee_commission_rules',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate active rules for the same plan + method + period
schema.index(
  { plan_id: 1, commission_method: 1, effective_from: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ plan_id: 1, is_active: 1 });
schema.index({ effective_from: 1, effective_until: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_commission_rules', schema);
