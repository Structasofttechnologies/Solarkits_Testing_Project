const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_commission_rules — Configurable commission rules for SOLARKITS franchisees.
 *
 * Supports both percentage and fixed amount commissions.
 * Scoped by industry, project type, state, franchisee account, and product.
 *
 * All monetary values in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_commission_rules
 */

const schema = new mongoose.Schema({
  rule_name:   { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 1000 },

  // ── Platform ──────────────────────────────────────────────────────────────
  platform: {
    type: String,
    enum: ['solarkits', 'boskit'],
    required: true,
    default: 'solarkits',
  },

  // ── Scope Dimensions ──────────────────────────────────────────────────────
  industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
  project_type_id:  { type: mongoose.Schema.Types.ObjectId, default: null },
  state_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  district_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

  // Franchisee / Reseller scope
  reseller_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  distributor_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributors', default: null },

  // Product scope
  product_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  category_id:      { type: mongoose.Schema.Types.ObjectId, default: null },

  // ── Commission Type ───────────────────────────────────────────────────────
  commission_type: {
    type: String,
    enum: ['percentage', 'fixed_per_unit', 'fixed_per_order'],
    required: true,
    default: 'percentage',
  },
  commission_percentage:  { type: Number, default: null, min: 0, max: 100 },
  commission_fixed_paise: { type: Number, default: null, min: 0 },

  // ── Effective Dates ───────────────────────────────────────────────────────
  effective_from: { type: Date, default: Date.now },
  effective_to:   { type: Date, default: null },
  priority:       { type: Number, default: 100 },
  status:         { type: String, enum: ['active', 'inactive'], default: 'active' },

  // ── Audit ────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'boskit_commission_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ platform: 1, status: 1 });
schema.index({ reseller_id: 1, status: 1 });
schema.index({ distributor_id: 1, status: 1 });
schema.index({ product_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_commission_rules', schema);
