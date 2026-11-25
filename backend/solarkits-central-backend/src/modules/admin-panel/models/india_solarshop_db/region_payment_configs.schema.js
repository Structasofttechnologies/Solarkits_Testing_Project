const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * region_payment_configs — Region-wise Payment Gateway Configuration.
 *
 * Allows Admin to configure permitted payment methods (Online/Offline/Both)
 * at the State + District level. Resolved at checkout time by the Solar Store.
 *
 * Scope: epc_orders, fpo_orders (including loose_order type)
 * Collection: region_payment_configs
 */
const schema = new mongoose.Schema({
  // ── Geography (State + District) ──────────────────────────────────────────
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
  },
  state_name: {
    type: String,
    trim: true,
    default: null,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    required: true,
  },
  district_name: {
    type: String,
    trim: true,
    default: null,
  },

  // ── Payment Mode ─────────────────────────────────────────────────────────
  payment_mode: {
    type: String,
    enum: ['offline', 'online', 'both'],
    default: 'offline',
    required: true,
  },
  online_enabled: {
    type: Boolean,
    default: false, // ICICI eCollection
  },
  offline_enabled: {
    type: Boolean,
    default: true,  // UTR + Receipt upload
  },

  // ── Offline Approval Workflow ─────────────────────────────────────────────
  offline_requires_accounts_verification: {
    type: Boolean,
    default: true,
  },
  offline_requires_admin_approval: {
    type: Boolean,
    default: true,
  },

  // ── Order Types This Config Applies To ────────────────────────────────────
  applies_to: {
    type: [String],
    enum: ['epc_order', 'fpo_order', 'loose_order'],
    default: ['epc_order', 'fpo_order', 'loose_order'],
  },

  // ── Meta ─────────────────────────────────────────────────────────────────
  is_active: {
    type: Boolean,
    default: true,
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
  collection: 'region_payment_configs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// One config per state + district (unique, active or not)
schema.index({ state_id: 1, district_id: 1 }, { unique: true });
schema.index({ is_active: 1 });
schema.index({ payment_mode: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('region_payment_configs', schema);
