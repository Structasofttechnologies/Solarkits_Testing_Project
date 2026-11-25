const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_product_authorizations — Product access control matrix for Resellers.
 *
 * Defines explicit grant (whitelist) or restriction (blacklist) per category,
 * subcategory, product, or kit.
 *
 * Phase R5 additions:
 *   - district_id: Optional district scoping
 *   - allowed_project_type_ids: Scoping by project type
 *   - allowed_industry_type_ids: Scoping by industry type
 *
 * Collection: reseller_product_authorizations
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
  },
  scope_type: {
    type: String,
    enum: ['all', 'category', 'subcategory', 'product', 'kit'],
    required: true,
    default: 'category',
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_filter_categories',
    default: null,
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_filter_subcategories',
    default: null,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    // Bug fix: registered model name is 'pc_combo_kits', not 'warehouse_combo_kits'
    ref: 'pc_combo_kits',
    default: null,
  },
  allowed_project_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],
  allowed_industry_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],

  is_authorized: {
    type: Boolean,
    required: true,
    default: true, // true = Whitelist grant, false = Blacklist restriction
  },
  source: {
    type: String,
    enum: ['plan_default', 'admin_override', 'commercial_mode', 'district_rule'],
    required: true,
    default: 'admin_override',
  },

  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  override_reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  effective_date: {
    type: Date,
    default: Date.now,
  },
  expiry_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active',
  },
}, {
  collection: 'reseller_product_authorizations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, status: 1 });
schema.index({ scope_type: 1, category_id: 1, subcategory_id: 1, product_id: 1 });
schema.index({ district_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_product_authorizations', schema);
