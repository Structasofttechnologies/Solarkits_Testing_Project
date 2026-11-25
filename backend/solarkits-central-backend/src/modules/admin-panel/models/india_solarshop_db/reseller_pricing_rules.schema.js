const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_pricing_rules — Admin-configured pricing boundaries and platform commission rules.
 *
 * All MAP / Price boundary fields stored in integer Paise (1 INR = 100 Paise).
 *
 * Collection: reseller_pricing_rules
 */
const schema = new mongoose.Schema({
  scope_type: {
    type: String,
    enum: ['global', 'reseller_type', 'reseller', 'category', 'product', 'kit'],
    required: true,
    default: 'global',
  },
  reseller_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_types',
    default: null,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    default: null,
  },

  // ── Pricing Boundaries & Commission ────────────────────────────────────
  min_margin_pct: {
    type: Number,
    default: 0,
    min: 0,
  },
  max_markup_pct: {
    type: Number,
    default: 100,
    min: 0,
  },
  default_commission_pct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  map_price_paise: {
    type: Number,
    default: null,
    min: 0,
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'reseller_pricing_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ scope_type: 1, status: 1 });
schema.index({ reseller_id: 1, status: 1 });
schema.index({ product_id: 1, kit_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_pricing_rules', schema);
