const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_plan_assignments — Franchisee plan assignments for BDEs.
 *
 * Collection: bde_plan_assignments
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
    index: true,
  },
  plan_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_plans',
  }],
  plan_names: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'revoked'],
    default: 'active',
    index: true,
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'bde_plan_assignments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('bde_plan_assignments', schema);
