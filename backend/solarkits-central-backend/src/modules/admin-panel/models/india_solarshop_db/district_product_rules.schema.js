const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * district_product_rules — District-level product authorization and restriction rules configured by Admin.
 *
 * Scopes product catalog access based on reseller's active district territory, project types, and industry types.
 *
 * Collection: district_product_rules
 */
const schema = new mongoose.Schema({
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    required: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    required: true,
  },
  scope_type: {
    type: String,
    enum: ['all', 'category', 'subcategory', 'product', 'kit'],
    required: true,
    default: 'category',
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  project_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],
  industry_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: [],
  }],
  is_authorized: {
    type: Boolean,
    required: true,
    default: true, // true = Whitelist grant, false = Blacklist restriction
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
  collection: 'district_product_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ district_id: 1, status: 1 });
schema.index({ scope_type: 1, district_id: 1, is_authorized: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('district_product_rules', schema);
