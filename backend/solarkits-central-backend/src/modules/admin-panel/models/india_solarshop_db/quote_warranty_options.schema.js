const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * quote_warranty_options — Admin-managed warranty packages available for EPC quotations.
 *
 * pricing_mode = 'fixed'      → price_per_kit_paise is used
 * pricing_mode = 'percentage' → price_pct of product_subtotal is used
 * Both fields are stored always; pricing_mode tells the engine which to apply.
 *
 * Eligibility arrays: empty = eligible for all; non-empty = restrict to listed IDs.
 *
 * Collection: quote_warranty_options
 */
const schema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    name:             { type: String, required: true, trim: true, maxlength: 200 },
    duration_months:  { type: Number, required: true, min: 0 },
    covered_products: { type: String, default: null, trim: true, maxlength: 1000 },
    terms:            { type: String, default: null, trim: true, maxlength: 2000 },

    // ── Pricing ───────────────────────────────────────────────────────────────
    pricing_mode: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: true,
      default: 'fixed',
    },
    // Used when pricing_mode = 'fixed'
    price_per_kit_paise: { type: Number, default: 0, min: 0 },
    // Used when pricing_mode = 'percentage' (e.g. 2.5 = 2.5% of product_subtotal)
    price_pct: { type: Number, default: 0, min: 0, max: 100 },

    // ── Eligibility Filters ───────────────────────────────────────────────────
    // Empty array = eligible for ALL; non-empty = restrict to listed ObjectIds
    eligible_industry_type_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types' }],
    eligible_project_type_ids:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types' }],
    eligible_combo_kit_ids:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits' }],

    // ── Display ───────────────────────────────────────────────────────────────
    sort_order: { type: Number, default: 0 },
    is_active:  { type: Boolean, default: true },
    badge_color: { type: String, default: null }, // optional hex color for frontend badge

    // ── Audit ─────────────────────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'quote_warranty_options',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ is_active: 1, sort_order: 1, deleted_at: 1 });
schema.index({ eligible_combo_kit_ids: 1 }, { sparse: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('quote_warranty_options', schema);
