const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * territory_assignment_history — Immutable log of all reseller territory assignments, overrides, and revocations.
 *
 * Collection: territory_assignment_history
 */
const schema = new mongoose.Schema({
  territory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_territories',
    required: true,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  action: {
    type: String,
    enum: ['ASSIGN', 'UPDATE', 'REVOKE', 'OVERRIDE', 'EXPIRE'],
    required: true,
  },
  territory_level: {
    type: String,
    enum: ['district', 'state', 'country'],
    required: true,
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    required: true,
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
  assignment_type: {
    type: String,
    enum: ['primary', 'secondary', 'temporary'],
    default: 'primary',
  },
  exclusivity_scope: {
    type: String,
    enum: ['strict', 'multi_reseller', 'category', 'product', 'industry'],
    default: 'strict',
  },
  source: {
    type: String,
    enum: ['gst_derived', 'plan', 'admin_assigned', 'admin_override'],
    required: true,
  },
  reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  before_snapshot: {
    type: Object,
    default: null,
  },
  after_snapshot: {
    type: Object,
    default: null,
  },
}, {
  collection: 'territory_assignment_history',
  timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable append-only
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, created_at: -1 });
schema.index({ district_id: 1, created_at: -1 });
schema.index({ territory_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('territory_assignment_history', schema);
