const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_product_assignments — Product/kit permission matrix for distributors and dealers.
 *
 * Explicit whitelist or blacklist of products assigned to a distributor or dealer.
 * Scope: distributor-level or dealer-level.
 *
 * Collection: boskit_product_assignments
 */

const schema = new mongoose.Schema({
  // ── Target Entity ─────────────────────────────────────────────────────────
  entity_type: {
    type: String,
    enum: ['distributor', 'dealer'],
    required: true,
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // refs boskit_distributors or boskit_dealers depending on entity_type
  },

  // ── Product Scope ─────────────────────────────────────────────────────────
  scope_type: {
    type: String,
    enum: ['all', 'category', 'product', 'kit'],
    required: true,
    default: 'product',
  },
  category_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  product_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },

  // ── Territory Scope ───────────────────────────────────────────────────────
  state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

  // ── Authorization ─────────────────────────────────────────────────────────
  is_authorized: { type: Boolean, required: true, default: true }, // true = whitelist, false = blacklist

  // ── Source ────────────────────────────────────────────────────────────────
  source: {
    type: String,
    enum: ['plan_default', 'admin_override', 'distributor_assigned'],
    default: 'admin_override',
  },

  // ── Effective Dates ───────────────────────────────────────────────────────
  effective_date: { type: Date, default: Date.now },
  expiry_date:    { type: Date, default: null },
  status:         { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },

  // ── Audit ────────────────────────────────────────────────────────────────
  assigned_by:     { type: mongoose.Schema.Types.ObjectId, default: null },
  assigned_by_type:{ type: String, enum: ['cms_user', 'distributor', 'system'], default: 'cms_user' },
  override_reason: { type: String, default: null, trim: true, maxlength: 1000 },
}, {
  collection: 'boskit_product_assignments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ entity_type: 1, entity_id: 1, status: 1 });
schema.index({ product_id: 1, entity_type: 1, status: 1 });
schema.index({ district_id: 1, entity_type: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_product_assignments', schema);
