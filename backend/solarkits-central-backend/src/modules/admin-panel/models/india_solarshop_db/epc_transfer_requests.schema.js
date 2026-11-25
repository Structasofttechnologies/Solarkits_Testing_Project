const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_transfer_requests — Review queue for EPC GSTIN conflict and reseller transfer requests.
 *
 * Collection: epc_transfer_requests
 */
const schema = new mongoose.Schema({
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    default: null,
  },
  requested_by_reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  current_reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
  },
  gstin: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reason: {
    type: String,
    default: null,
    trim: true,
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  reviewed_at: {
    type: Date,
    default: null,
  },
  review_note: {
    type: String,
    default: null,
    trim: true,
  },
}, {
  collection: 'epc_transfer_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ gstin: 1, status: 1 });
schema.index({ requested_by_reseller_id: 1, status: 1 });
schema.index({ status: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_transfer_requests', schema);
