const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_territory_assignments — Territory and district assignments for BDEs.
 *
 * Collection: bde_territory_assignments
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
    index: true,
  },
  country_name: {
    type: String,
    default: 'India',
    trim: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
    index: true,
  },
  state_name: {
    type: String,
    required: true,
    trim: true,
  },
  district_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
  }],
  district_names: [{
    type: String,
    trim: true,
  }],
  cluster_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_clusters',
    index: true,
  }],
  cluster_names: [{
    type: String,
    trim: true,
  }],
  assignment_start_date: {
    type: Date,
    default: Date.now,
  },
  assignment_end_date: {
    type: Date,
    default: null,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'primary'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked', 'expired'],
    default: 'active',
    index: true,
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  notes: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
}, {
  collection: 'bde_territory_assignments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('bde_territory_assignments', schema);
