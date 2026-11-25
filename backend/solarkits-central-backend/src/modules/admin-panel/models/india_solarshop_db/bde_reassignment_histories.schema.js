const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_reassignment_histories — Permanent audit trail of lead and franchisee reassignments.
 *
 * Collection: bde_reassignment_histories
 */
const schema = new mongoose.Schema({
  entity_type: {
    type: String,
    enum: ['lead', 'franchisee'],
    required: true,
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_leads',
    default: null,
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
  },
  previous_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  previous_bde_name: { type: String, default: null, trim: true },
  new_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  new_bde_name: { type: String, default: null, trim: true },
  reassigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    required: false,
    default: null,
  },
  reassigned_by_name: { type: String, default: 'Admin', trim: true },
  reassignment_reason: {
    type: String,
    required: true,
    trim: true,
  },
  reassigned_at: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'bde_reassignment_histories',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ entity_type: 1, lead_id: 1 });
schema.index({ entity_type: 1, franchisee_id: 1 });
schema.index({ new_bde_id: 1, reassigned_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('bde_reassignment_histories', schema);
