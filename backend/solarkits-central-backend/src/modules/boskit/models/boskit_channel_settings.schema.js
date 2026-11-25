const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_channel_settings — Industry→State→District→Distributor configuration hierarchy.
 *
 * Defines the complete channel configuration for a distributor in a territory:
 *   - Assigned products, MRP, distributor purchase rate
 *   - GST rate, dealer allowed flag, dealer pricing limits
 *   - MOQ for distributor and dealer
 *
 * All monetary values in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_channel_settings
 */

const productChannelConfigSchema = new mongoose.Schema({
  product_id:               { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:                   { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  mrp_paise:                { type: Number, required: true, min: 0 },
  distributor_rate_paise:   { type: Number, required: true, min: 0 },
  gst_rate_pct:             { type: Number, required: true, default: 18, min: 0, max: 100 },

  // Dealer config
  dealer_allowed:           { type: Boolean, default: true },
  dealer_rate_paise:        { type: Number, default: null, min: 0 }, // admin-defined dealer rate
  dealer_min_rate_paise:    { type: Number, default: null, min: 0 }, // floor for distributor-set dealer price
  dealer_max_rate_paise:    { type: Number, default: null, min: 0 }, // ceiling for distributor-set dealer price

  // MOQ
  distributor_moq:          { type: Number, default: 1, min: 1 },
  dealer_moq:               { type: Number, default: 1, min: 1 },
}, { _id: false });

const schema = new mongoose.Schema({
  // ── Hierarchy Dimensions ──────────────────────────────────────────────────
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    default: null,
  },
  project_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    default: null,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    default: null,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
  },
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    default: null,
  },

  // ── Product-level configs ─────────────────────────────────────────────────
  product_configs: [productChannelConfigSchema],

  // ── Global flags for this channel config ─────────────────────────────────
  rule_priority:  { type: Number, default: 100 },
  effective_from: { type: Date, default: Date.now },
  effective_to:   { type: Date, default: null },
  status:         { type: String, enum: ['active', 'inactive', 'draft'], default: 'draft' },

  // ── Audit ────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'boskit_channel_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1, status: 1 });
schema.index({ state_id: 1, district_id: 1, status: 1 });
schema.index({ industry_type_id: 1, status: 1 });
schema.index({ effective_from: 1, effective_to: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_channel_settings', schema);
