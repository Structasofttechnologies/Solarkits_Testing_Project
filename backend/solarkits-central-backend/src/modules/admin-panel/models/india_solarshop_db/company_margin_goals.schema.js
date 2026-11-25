const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * company_margin_goals — Monthly company-level kit sales & margin targets.
 *
 * Supports granular goal setting at:
 *   Country → State → District → Kit → Month/Year
 *
 * Historical records are preserved. Admin sets a new goal each month;
 * prior months remain queryable for performance comparison.
 *
 * Collection: company_margin_goals
 */
const schema = new mongoose.Schema(
  {
    // ── Scope ────────────────────────────────────────────────────────────────
    country_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // null = all states
    },
    district_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // null = all districts in the state
    },
    combo_kit_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // null = all kits
    },

    // ── Period ────────────────────────────────────────────────────────────────
    target_month: { type: Number, required: true, min: 1, max: 12 },
    target_year:  { type: Number, required: true, min: 2020 },

    // ── Targets ───────────────────────────────────────────────────────────────
    target_quantity:    { type: Number, required: true, min: 0 }, // kit units
    target_sales_value: { type: Number, default: 0, min: 0 },     // INR
    target_margin_pct:  { type: Number, default: null, min: 0, max: 100 }, // %

    // ── Performance Thresholds (for classification) ───────────────────────────
    on_track_threshold:    { type: Number, default: 80 },   // % of target to be "On Track"
    critical_threshold:    { type: Number, default: 50 },   // % of target to be "Critical"

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active:  { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'company_margin_goals',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent duplicate goals for the same scope + period
schema.index(
  { country_id: 1, state_id: 1, district_id: 1, combo_kit_id: 1, target_month: 1, target_year: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ target_month: 1, target_year: 1, is_active: 1 });
schema.index({ country_id: 1, state_id: 1, target_month: 1, target_year: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('company_margin_goals', schema);
