const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * kit_cluster_authorizations — State & Franchise Cluster Kit Visibility & Authorization.
 *
 * Controls whether an activated warehouse combo kit is visible and orderable in the
 * Solar Store for customers & EPCs browsing from a given State / Franchise Cluster / District.
 *
 * Collection: kit_cluster_authorizations
 */
const schema = new mongoose.Schema({
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    default: null
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true
  },
  state_name: {
    type: String,
    required: true,
    trim: true
  },
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_clusters',
    required: true
  },
  cluster_code: {
    type: String,
    required: true,
    trim: true
  },
  cluster_name: {
    type: String,
    required: true,
    trim: true
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null
  },
  district_name: {
    type: String,
    default: null,
    trim: true
  },
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    required: true
  },
  is_authorized: {
    type: Boolean,
    required: true,
    default: true // true = Visible in Store (ON), false = Hidden in Store (OFF)
  },
  notes: {
    type: String,
    default: null
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null
  },
  deleted_at: {
    type: Date,
    default: null
  }
}, {
  collection: 'kit_cluster_authorizations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Index for fast lookups by cluster & kit
schema.index({ cluster_id: 1, combo_kit_id: 1, district_id: 1, deleted_at: 1 });
schema.index({ state_id: 1, cluster_id: 1, is_authorized: 1 });

module.exports = india_solarshop_db.model('kit_cluster_authorizations', schema);
