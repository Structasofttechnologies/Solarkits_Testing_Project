const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_reseller_relationships — Active and historical EPC–Reseller links.
 * Preserves historical relationship context when EPC accounts are transferred across resellers.
 *
 * Collection: epc_reseller_relationships
 */
const schema = new mongoose.Schema({
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  gstin: {
    type: String,
    default: null,
    uppercase: true,
    trim: true,
  },
  effective_from: {
    type: Date,
    default: Date.now,
  },
  effective_to: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'transferred', 'revoked'],
    default: 'active',
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  assigned_by_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  assigned_by_bde_name: {
    type: String,
    default: null,
  },
  assigned_by_bde_code: {
    type: String,
    default: null,
  },
  assigned_date: {
    type: Date,
    default: null,
  },
  transfer_reason: {
    type: String,
    default: null,
    trim: true,
  },
}, {
  collection: 'epc_reseller_relationships',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, status: 1 });
schema.index({ epc_id: 1, created_at: -1 });

// Partial unique index: only 1 active reseller assignment per EPC
schema.index(
  { epc_id: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  }
);

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_reseller_relationships', schema);
