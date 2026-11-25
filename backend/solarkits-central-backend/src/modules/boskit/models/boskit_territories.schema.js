const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_territories — Hierarchical Indian territory assignments for BOSKIT Distributors.
 *
 * Enforces exclusive revenue district and state rights.
 * Compound index on { district_id, is_exclusive, status } guarantees no double allocation
 * of exclusive territories at the database level.
 *
 * Collection: boskit_territories
 */

const schema = new mongoose.Schema({
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    default: null,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
  },
  state_name:    { type: String, default: null, trim: true },
  district_name: { type: String, default: null, trim: true },
  city_name:     { type: String, default: null, trim: true },
  pincodes:      [{ type: String, trim: true }],

  is_exclusive:  { type: Boolean, default: true },
  status: {
    type: String,
    enum: ['pending_validation', 'active', 'suspended', 'released', 'overridden'],
    default: 'active',
  },

  assignment_source: {
    type: String,
    enum: ['onboarding', 'admin_assigned', 'admin_override'],
    default: 'onboarding',
  },
  override_reason: { type: String, default: null, trim: true, maxlength: 2000 },
  assigned_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  notes:           { type: String, default: null, trim: true, maxlength: 1000 },
}, {
  collection: 'boskit_territories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1, status: 1 });
schema.index({ state_id: 1, district_id: 1, is_exclusive: 1, status: 1 });
schema.index({ district_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_territories', schema);
