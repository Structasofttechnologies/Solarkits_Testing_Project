const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_moq_rules — Minimum Order Quantity rules.
 *
 * MOQ is validated on both frontend (soft warning) and backend (hard block at checkout).
 * Rules cascade: user-specific → channel+product+district → channel+product → product default.
 *
 * All values in units (not Paise).
 *
 * Collection: boskit_moq_rules
 */

const schema = new mongoose.Schema({
  rule_name:   { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 500 },

  // ── Scope ─────────────────────────────────────────────────────────────────
  scope: {
    type: String,
    enum: ['user_override', 'channel_product_district', 'channel_product', 'product_default'],
    required: true,
  },
  channel: {
    type: String,
    enum: ['distributor', 'dealer', null],
    default: null,
  },

  distributor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributors', default: null },
  dealer_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_dealers', default: null },
  product_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  state_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  district_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
  plan_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributor_plans', default: null },

  // ── MOQ Value ─────────────────────────────────────────────────────────────
  moq: { type: Number, required: true, min: 1, default: 1 },

  // ── Effective Dates ───────────────────────────────────────────────────────
  effective_from: { type: Date, default: Date.now },
  effective_to:   { type: Date, default: null },

  // ── Status ────────────────────────────────────────────────────────────────
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'boskit_moq_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ scope: 1, status: 1 });
schema.index({ product_id: 1, channel: 1, status: 1 });
schema.index({ distributor_id: 1, product_id: 1 });
schema.index({ dealer_id: 1, product_id: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_moq_rules', schema);
