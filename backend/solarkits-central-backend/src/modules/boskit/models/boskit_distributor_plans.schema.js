const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributor_plans — Comprehensive master schema for BOSKIT Distributor Plans.
 *
 * Single source of truth for all distributor subscription tiers.
 * Changes to published plans automatically create immutable version snapshots in boskit_plan_versions.
 * Active distributor subscriptions reference the immutable version snapshot.
 *
 * All monetary values stored in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_distributor_plans
 */

const schema = new mongoose.Schema({
  // ── 1. Plan Identity ───────────────────────────────────────────────────────
  name:              { type: String, required: true, trim: true, maxlength: 200 },
  plan_code:         { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
  short_description: { type: String, default: null, trim: true, maxlength: 500 },
  description:       { type: String, default: null, trim: true, maxlength: 3000 },
  sort_order:        { type: Number, default: 0 },
  is_popular:        { type: Boolean, default: false },
  badge_text:        { type: String, default: 'Most Popular Distributor Plan', trim: true, maxlength: 100 },

  // ── 2. Validity & Billing ──────────────────────────────────────────────────
  validity_value:    { type: Number, required: true, min: 1, default: 12 },
  validity_unit:     { type: String, enum: ['days', 'months', 'years'], default: 'months' },
  billing_type:      { type: String, enum: ['one_time', 'annual_recurring', 'monthly', 'quarterly'], default: 'annual_recurring' },

  // ── 3. Commercials & Taxes (in Paise) ──────────────────────────────────────
  joining_fee_paise: { type: Number, default: 0, min: 0 },
  renewal_fee_paise: { type: Number, default: 0, min: 0 },
  currency:          { type: String, default: 'INR', trim: true },
  tax_rate_percent:  { type: Number, default: 18, min: 0, max: 100 }, // 18% GST standard
  is_tax_inclusive:  { type: Boolean, default: false },
  gst_hsn_code:      { type: String, default: '998399', trim: true },

  // ── 4. Renewal & Grace Period ──────────────────────────────────────────────
  auto_renew:        { type: Boolean, default: false },
  grace_period_days: { type: Number, default: 15, min: 0 },
  renewal_rules:     { type: String, default: null, trim: true, maxlength: 1000 },

  // ── 5. Territory Scope & Exclusivity ───────────────────────────────────────
  territory_type:            { type: String, enum: ['district', 'multiple_districts', 'state', 'region', 'custom'], default: 'district' },
  allowed_territories_count: { type: Number, default: 1, min: 1 },
  is_territory_exclusive:    { type: Boolean, default: true },

  // ── 6. Dealer Network Governance ───────────────────────────────────────────
  dealer_allowed:                { type: Boolean, default: true },
  max_dealers:                   { type: Number, default: 15 }, // null = unlimited
  can_onboard_dealers:           { type: Boolean, default: true },
  dealer_direct_activation:      { type: Boolean, default: false }, // distributor can activate without admin
  dealer_pricing_permission:     { type: Boolean, default: false }, // can distributor set custom dealer price
  dealer_uses_admin_slabs_only:  { type: Boolean, default: true },
  max_dealer_credit_limit_paise: { type: Number, default: 0, min: 0 },

  // ── 7. Catalogue & Distributor Pricing Slabs ──────────────────────────────
  allows_all_products:          { type: Boolean, default: true },
  allowed_product_ids:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'products' }],
  allowed_category_ids:         [{ type: mongoose.Schema.Types.ObjectId }],
  product_access_type:          { type: String, enum: ['all', 'whitelisted_only', 'tier_based'], default: 'all' },
  discount_percentage:          { type: Number, default: 10, min: 0, max: 100 },
  distributor_margin_slab_min:  { type: Number, default: 8, min: 0, max: 100 },
  distributor_margin_slab_max:  { type: Number, default: 14, min: 0, max: 100 },
  pricing_tier:                 { type: String, default: 'Standard Wholesale Slab', trim: true },
  can_see_mrp:                  { type: Boolean, default: true },

  // ── 8. Sales & Lead Permissions ───────────────────────────────────────────
  can_sell_direct:       { type: Boolean, default: true },
  can_generate_quotes:   { type: Boolean, default: true },
  lead_access_tier:      { type: String, enum: ['none', 'standard', 'priority', 'exclusive'], default: 'standard' },
  leads_per_month:       { type: Number, default: 25, min: 0 },

  // ── 9. Inventory Visibility & Reservation ──────────────────────────────────
  inventory_visibility:    { type: String, enum: ['none', 'basic', 'allocated_only', 'full'], default: 'full' },
  can_reserve_stock:       { type: Boolean, default: true },
  stock_reservation_hours: { type: Number, default: 48, min: 0 },

  // ── 10. Order Limits & Credit ──────────────────────────────────────────────
  min_order_value_paise:  { type: Number, default: 0, min: 0 },
  max_orders_per_month:   { type: Number, default: null }, // null = unlimited
  credit_limit_paise:     { type: Number, default: 0, min: 0 },
  credit_period_days:     { type: Number, default: 0, min: 0 },
  distributor_default_moq:{ type: Number, default: 1, min: 1 },
  dealer_default_moq:     { type: Number, default: 1, min: 1 },

  // ── 11. Dynamic Benefits Builder ───────────────────────────────────────────
  benefits: [{
    type: String,
    trim: true,
  }],

  // ── 12. Granular Dashboard Modules ────────────────────────────────────────
  dashboard_modules: {
    overview:           { type: Boolean, default: true },
    territories:        { type: Boolean, default: true },
    catalogue:          { type: Boolean, default: true },
    pricing:            { type: Boolean, default: true },
    inventory:          { type: Boolean, default: true },
    orders:             { type: Boolean, default: true },
    customers:          { type: Boolean, default: true },
    dealers:            { type: Boolean, default: true },
    dealer_onboarding:  { type: Boolean, default: true },
    leads:              { type: Boolean, default: true },
    sales_reports:      { type: Boolean, default: true },
    margin_reports:     { type: Boolean, default: true },
    documents:          { type: Boolean, default: true },
    support:            { type: Boolean, default: true },
    subscriptions:      { type: Boolean, default: true },
  },

  // ── 13. Effective Dates & Status ───────────────────────────────────────────
  status:         { type: String, enum: ['draft', 'published', 'unpublished', 'archived'], default: 'published' },
  is_active:      { type: Boolean, default: true },
  effective_from: { type: Date, default: Date.now },
  effective_to:   { type: Date, default: null },

  // ── 14. Versioning & Audit ─────────────────────────────────────────────────
  current_version: { type: Number, default: 1, min: 1 },
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at:      { type: Date, default: null },
}, {
  collection: 'boskit_distributor_plans',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ plan_code: 1 }, { unique: true });
schema.index({ status: 1, is_active: 1, sort_order: 1 });
schema.index({ effective_from: 1, effective_to: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributor_plans', schema);
