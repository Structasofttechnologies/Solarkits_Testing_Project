const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_kit_targets — Monthly kit order goals for franchisees.
 *
 * target_type hierarchy (highest to lowest priority):
 *   FRANCHISEE → DISTRICT → STATE → PLAN → GLOBAL
 *
 * Only the highest-priority matching target is applied per franchisee per month.
 *
 * Recommended calculation_stage: DELIVERED_QUANTITY
 *
 * Collection: franchisee_kit_targets
 */
const schema = new mongoose.Schema(
  {
    target_type: {
      type: String,
      enum: ['GLOBAL', 'PLAN', 'STATE', 'DISTRICT', 'FRANCHISEE', 'INDUSTRY', 'PROJECT_TYPE'],
      required: true,
    },

    // ── Scope References (only relevant fields populated per target_type) ──────
    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
    },
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reseller_plans',
      default: null,
    },
    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_1',
      default: null,
    },
    district_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_2',
      default: null,
    },
    industry_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_industry_types',
      default: null,
    },
    project_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_types',
      default: null,
    },

    // ── Target Quantity ───────────────────────────────────────────────────────
    target_quantity: { type: Number, required: true, min: 0 },

    // ── Calculation Stage ─────────────────────────────────────────────────────
    calculation_stage: {
      type: String,
      enum: [
        'ORDERED_QUANTITY',
        'APPROVED_PO_QUANTITY',
        'PAID_QUANTITY',
        'DISPATCHED_QUANTITY',
        'DELIVERED_QUANTITY',
      ],
      default: 'DELIVERED_QUANTITY',
    },

    // ── Period ────────────────────────────────────────────────────────────────
    target_month: { type: Number, required: true, min: 1, max: 12 },
    target_year:  { type: Number, required: true, min: 2020 },

    // ── Recurrence ────────────────────────────────────────────────────────────
    is_recurring:        { type: Boolean, default: false },
    carry_forward_enabled: { type: Boolean, default: false },
    grace_period_days:   { type: Number, min: 0, default: 0 },

    // ── Effective Period ──────────────────────────────────────────────────────
    effective_from:  { type: Date, default: null },
    effective_until: { type: Date, default: null },

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active:  { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'franchisee_kit_targets',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate targets for the same scope+period
schema.index(
  { target_type: 1, franchisee_id: 1, plan_id: 1, state_id: 1, district_id: 1, target_month: 1, target_year: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ target_month: 1, target_year: 1, is_active: 1 });
schema.index({ franchisee_id: 1, target_month: 1, target_year: 1 });
schema.index({ plan_id: 1, target_month: 1, target_year: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_kit_targets', schema);
