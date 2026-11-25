const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_price_rules — Centralized server-side pricing engine rules.
 *
 * CRITICAL: Pricing must NEVER be scattered or hard-coded.
 * All price calculations must call PricingEngine.calculate() which evaluates
 * these rules in order of precedence.
 *
 * Rule Precedence (highest to lowest):
 *   1. user_override         → specific distributor_id or dealer_id
 *   2. plan_product_district → plan + product + district
 *   3. plan_product_state    → plan + product + state
 *   4. plan_product          → plan + product
 *   5. channel_product_district → channel + product + district
 *   6. channel_product_state    → channel + product + state
 *   7. channel_product          → channel + product
 *   8. product_default          → product only
 *
 * All monetary values in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_price_rules
 */

const schema = new mongoose.Schema({
  // ── Rule Identity ─────────────────────────────────────────────────────────
  rule_name:   { type: String, required: true, trim: true, maxlength: 200 },
  rule_code:   { type: String, required: true, trim: true, uppercase: true, maxlength: 100 },
  description: { type: String, default: null, trim: true, maxlength: 1000 },

  // ── Scope / Priority ──────────────────────────────────────────────────────
  scope: {
    type: String,
    enum: [
      'user_override',
      'plan_product_district',
      'plan_product_state',
      'plan_product',
      'channel_product_district',
      'channel_product_state',
      'channel_product',
      'product_default',
    ],
    required: true,
  },
  priority: { type: Number, required: true, default: 100 }, // lower number = higher priority within same scope

  // ── Scope Dimensions (set relevant fields based on scope) ─────────────────
  platform: {
    type: String,
    enum: ['boskit', 'solarkits', 'both'],
    default: 'boskit',
  },
  channel: {
    type: String,
    enum: ['distributor', 'dealer', null],
    default: null,
  },

  // Specific entity targets
  distributor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributors', default: null },
  dealer_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_dealers', default: null },

  // Product / Kit
  product_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  category_id: { type: mongoose.Schema.Types.ObjectId, default: null },

  // Geography
  country_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
  state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

  // Plan
  plan_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributor_plans', default: null },

  // Industry / Project Type
  industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
  project_type_id:  { type: mongoose.Schema.Types.ObjectId, default: null },

  // ── Price Rule Type ───────────────────────────────────────────────────────
  rule_type: {
    type: String,
    enum: [
      'percentage_discount',  // MRP - X%
      'fixed_discount',        // MRP - ₹X
      'fixed_distributor_rate',// Absolute price for distributor
      'fixed_dealer_rate',     // Absolute price for dealer
      'quantity_slab',         // Different price per quantity range
      'plan_based',            // Price from plan config
    ],
    required: true,
  },

  // ── Price Values (in Paise) ───────────────────────────────────────────────
  base_mrp_paise:          { type: Number, default: null, min: 0 },
  distributor_rate_paise:  { type: Number, default: null, min: 0 },
  dealer_rate_paise:       { type: Number, default: null, min: 0 },

  // Percentage discount (0-100)
  discount_percentage:     { type: Number, default: null, min: 0, max: 100 },

  // Fixed discount (Paise)
  discount_fixed_paise:    { type: Number, default: null, min: 0 },

  // ── Quantity Slabs (for rule_type = 'quantity_slab') ─────────────────────
  quantity_slabs: [{
    min_qty:      { type: Number, required: true, min: 1 },
    max_qty:      { type: Number, default: null }, // null = unlimited
    price_paise:  { type: Number, required: true, min: 0 },
    _id: false,
  }],

  // ── MOQ (Minimum Order Quantity) ──────────────────────────────────────────
  moq: { type: Number, default: 1, min: 1 },

  // ── Effective Dates ───────────────────────────────────────────────────────
  effective_from: { type: Date, required: true, default: Date.now },
  effective_to:   { type: Date, default: null },

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft',
  },
  is_conflict_checked: { type: Boolean, default: false }, // admin UI sets after validation

  // ── Audit ────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'boskit_price_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Query indexes for the pricing engine evaluation
schema.index({ scope: 1, status: 1, effective_from: 1, effective_to: 1 });
schema.index({ platform: 1, channel: 1, status: 1 });
schema.index({ distributor_id: 1, product_id: 1, status: 1 });
schema.index({ dealer_id: 1, product_id: 1, status: 1 });
schema.index({ plan_id: 1, product_id: 1, district_id: 1, status: 1 });
schema.index({ plan_id: 1, product_id: 1, state_id: 1, status: 1 });
schema.index({ product_id: 1, scope: 1, status: 1 });
schema.index({ rule_code: 1 }, { unique: true });
schema.index({ deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_price_rules', schema);
