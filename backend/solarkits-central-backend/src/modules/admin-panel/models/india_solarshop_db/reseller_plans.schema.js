const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_plans — Master list of Reseller Plan / Store Type packages.
 *
 * Defines fees, validity, allowed territory counts, and scope.
 *
 * Store Management additions:
 *   - store_category: company_store | franchisee_store
 *   - franchisee_subtype_id: ref to franchisee_subtypes (configurable)
 *   - commission_enabled / setup_cost_enabled: independent toggles
 *   - setup_cost_amount: configurable setup fee override
 *   - epc_onboarding_scope: country | state | district
 *   - bde_assignment_mandatory: for Company Store BDE policy
 *
 * Collection: reseller_plans
 */
const schema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true, maxlength: 200 },
  slug:            { type: String, required: true, trim: true, lowercase: true, maxlength: 100, unique: true },
  territory_level: {
    type: String,
    enum: ['district', 'state', 'country'],
    required: true,
    default: 'district',
  },
  one_time_fee:    { type: Number, required: true, min: 0, default: 0 },
  currency:        { type: String, default: 'INR', uppercase: true, trim: true },
  validity_value:  { type: Number, required: true, min: 1, default: 1 },
  validity_unit:   {
    type: String,
    enum: ['months', 'years'],
    required: true,
    default: 'years',
  },
  allowed_territories_count: { type: Number, required: true, min: 1, default: 1 },

  renewal_rules: {
    auto_renew:        { type: Boolean, default: false },
    grace_period_days: { type: Number, default: 15 },
  },

  allowed_project_type_ids:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types' }],
  allowed_industry_type_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types' }],
  allowed_category_ids:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories' }],
  allowed_subcategory_ids:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories' }],
  allowed_combo_kit_ids:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit' }],

  // ─── 1. Warehouse Requirements ─────────────────────────────────────────────
  warehouse_required:   { type: Boolean, default: false },
  warehouse_count:      { type: Number, min: 0, default: 0 },
  warehouse_space_sqft: { type: Number, min: 0, default: 0 },

  // ─── 2. MOQ & Capacity Specifications (Project / Kit types) ───────────────────
  moq_capacity_kw:      { type: Number, min: 0, default: 10000 },
  moq_kits_count:       { type: Number, min: 0, default: 1 },
  moq_project_type:     { type: String, default: 'All Kit Types (Residential / Commercial / Industrial)', trim: true },
  moq_description:      { type: String, default: null, trim: true, maxlength: 1000 },

  // ─── 3. Order Type Support ───────────────────────────────────────────────────
  order_type_allowed: {
    type: [String],
    default: ['po_order'],
  },

  // ─── 3b. Franchise Quote Creation Permissions ─────────────────────────────────
  quote_permissions: {
    type: [String],
    default: ['po_quote', 'loose_quote'],
  },

  // ─── 4. Company Fixed Franchisee Margins & Commissions ──────────────────────
  default_dealer_margin:      { type: Number, min: 0, default: 5 },
  commission_method:          { type: String, enum: ['PERCENTAGE', 'FIXED_PER_KIT'], default: 'PERCENTAGE' },
  default_commission_rate:    { type: Number, min: 0, default: 8 },
  fixed_amount_per_kit_paise: { type: Number, min: 0, default: 0 },
  min_eligible_quantity:      { type: Number, min: 0, default: 0 },
  max_commission_paise:       { type: Number, min: 0, default: null },

  // ─── 5. Store Management — Store Type Configuration ──────────────────────────
  store_category: {
    type: String,
    enum: ['company_store', 'franchisee_store'],
    required: true,
    default: 'franchisee_store',
  },
  // Link to configurable franchisee subtype (null = not a franchisee store)
  franchisee_subtype_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_subtypes',
    default: null,
  },
  // Independent commission enable/disable — does not affect setup fee
  commission_enabled: { type: Boolean, default: true },
  // Independent setup cost enable/disable — does not affect commission
  setup_cost_enabled: { type: Boolean, default: true },
  // Setup cost amount (overrides one_time_fee when set)
  setup_cost_amount:  { type: Number, min: 0, default: 0 },
  // EPC onboarding geographic scope for this store type
  epc_onboarding_scope: {
    type: String,
    enum: ['country', 'state', 'district'],
    default: 'district',
  },
  // Whether BDE assignment is mandatory for Company Stores on this plan
  bde_assignment_mandatory: { type: Boolean, default: false },

  description:     { type: String, default: null, trim: true, maxlength: 1000 },
  sort_order:      { type: Number, default: 0 },
  is_active:       { type: Boolean, default: true },
  deleted_at:      { type: Date, default: null },
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'reseller_plans',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ territory_level: 1, is_active: 1 });
schema.index({ sort_order: 1 });
schema.index({ store_category: 1, is_active: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_plans', schema);
