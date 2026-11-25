const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_listings — Reseller's active product and kit storefront listings.
 *
 * All price fields stored in integer Paise (1 INR = 100 Paise).
 * Enforces MAP (Minimum Advertised Price) compliance.
 *
 * Collection: reseller_listings
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  item_type: {
    type: String,
    enum: ['product', 'kit'],
    required: true,
    default: 'product',
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    // Bug fix: model is registered as 'pc_combo_kits' (see combo_kits.schema.js line 51)
    ref: 'pc_combo_kits',
    default: null,
  },

  // ── Classification & Metadata ──────────────────────────────────────────────
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    default: null,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project_categories',
    default: null,
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project_subcategories',
    default: null,
  },
  brand_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'brands',
    default: null,
  },
  title: {
    type: String,
    default: null,
    trim: true,
  },
  description: {
    type: String,
    default: null,
    trim: true,
  },
  image_url: {
    type: String,
    default: null,
    trim: true,
  },
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  stock_quantity: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ── Integer Paise Financial Fields & Margin Bounds ───────────────────────
  cost_price_paise: {
    type: Number,
    required: true,
    min: 0,
  },
  map_price_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  max_price_paise: {
    type: Number,
    default: null,
  },
  min_margin_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  max_margin_paise: {
    type: Number,
    default: 100000000, // Default max limit
    min: 0,
  },
  reseller_margin_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  reseller_margin_pct: {
    type: Number,
    default: 0,
    min: 0,
  },
  tax_rate_pct: {
    type: Number,
    default: 18,
    min: 0,
  },
  taxes_and_charges_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  selling_price_paise: {
    type: Number,
    required: true,
    min: 0,
  },
  platform_commission_pct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // ── Lifecycle Status Machine ─────────────────────────────────────────────
  // Enforcing statuses: draft, active, assigned, accepted, purchased, margin_pending, ready_to_publish, published, suspended, revoked
  assignment_status: {
    type: String,
    enum: [
      'draft',
      'active',
      'assigned',
      'accepted',
      'purchased',
      'margin_pending',
      'ready_to_publish',
      'published',
      'suspended',
      'revoked',
    ],
    default: 'assigned',
  },

  is_map_compliant: {
    type: Boolean,
    required: true,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'delisted'],
    default: 'active',
  },

  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  assigned_at: {
    type: Date,
    default: Date.now,
  },
  purchased_at: {
    type: Date,
    default: null,
  },
  published_at: {
    type: Date,
    default: null,
  },

  audit_history: [
    {
      status: { type: String, required: true },
      actor_type: { type: String, default: 'system' },
      actor_id: { type: mongoose.Schema.Types.ObjectId, default: null },
      notes: { type: String, default: null },
      timestamp: { type: Date, default: Date.now },
    },
  ],

  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, {
  collection: 'reseller_listings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, assignment_status: 1, status: 1 });
schema.index({ reseller_id: 1, item_type: 1, product_id: 1, kit_id: 1 }, { unique: true });
schema.index({ is_map_compliant: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_listings', schema);
