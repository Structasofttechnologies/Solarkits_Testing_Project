const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * estimator_settings — Admin global configuration for the Know My Margin (KMM) Estimator.
 *
 * Single-document configuration collection (findOneAndUpdate with upsert: true).
 * Controls EPC margin estimation permissions, limits, GST computation methods, and numbering.
 *
 * Collection: estimator_settings
 */

const schema = new mongoose.Schema(
  {
    // ── Master Switches ───────────────────────────────────────────────────────
    is_enabled:             { type: Boolean, default: true },
    enabled_for_epc:        { type: Boolean, default: true },
    enabled_for_franchisee: { type: Boolean, default: true },

    // ── Margin Constraints ────────────────────────────────────────────────────
    allowed_margin_types:   { type: String, enum: ['amount', 'percentage', 'both'], default: 'both' },
    min_margin:             { type: Number, default: 0, min: 0 },
    max_margin:             { type: Number, default: 10000000, min: 0 },
    min_margin_percentage:  { type: Number, default: 0, min: 0 },
    max_margin_percentage:  { type: Number, default: 100, min: 0, max: 100 },

    // ── BOM Visibility & Flexibility ──────────────────────────────────────────
    show_bom_rates_to_epc:        { type: Boolean, default: true },
    allow_optional_bom_selection: { type: Boolean, default: true },

    // ── Comparison Features ───────────────────────────────────────────────────
    allow_comparison:     { type: Boolean, default: true },
    max_comparison_count: { type: Number, default: 3, min: 2, max: 5 },

    // ── Actions Permitted ─────────────────────────────────────────────────────
    allow_save_estimates:   { type: Boolean, default: true },
    allow_generate_quotes:  { type: Boolean, default: true },

    // ── GST Computation ───────────────────────────────────────────────────────
    // 'on_cost': GST applied only on project cost (Kit + BOM), margin added after tax
    // 'on_cost_plus_margin': GST applied on total taxable value (Kit + BOM + Margin)
    gst_calculation_method: {
      type: String,
      enum: ['on_cost', 'on_cost_plus_margin'],
      default: 'on_cost_plus_margin',
    },
    default_gst_rate:    { type: Number, default: 18 },
    allowed_gst_options: { type: [Number], default: [0, 5, 12, 13.8, 18] },

    // ── Numbering & Validity ───────────────────────────────────────────────────
    estimate_number_prefix:   { type: String, default: 'SK-EST', trim: true, uppercase: true },
    estimate_number_sequence: { type: Number, default: 0, min: 0 },
    estimate_validity_days:   { type: Number, default: 30, min: 1 },

    // ── Hierarchy Filters (empty = all enabled) ───────────────────────────────
    eligible_industry_types: [{ type: mongoose.Schema.Types.ObjectId, default: null }],

    // ── Audit ─────────────────────────────────────────────────────────────────
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    collection: 'estimator_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = india_solarshop_db.model('estimator_settings', schema);
