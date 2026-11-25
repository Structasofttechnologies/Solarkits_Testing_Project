const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_setup_verifications — Audit history of every employee submission and admin review cycle.
 *
 * Collection: store_setup_verifications
 */
const schema = new mongoose.Schema({
  store_setup_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'store_setups',
    required: true,
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  cycle_number: { type: Number, required: true, default: 1 },

  // Employee Submission
  submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', required: true },
  submitted_by_name: { type: String, default: null, trim: true },
  submitted_at: { type: Date, default: Date.now },
  employee_remarks: { type: String, default: null, trim: true },

  // Admin Review
  admin_decision: {
    type: String,
    enum: ['pending', 'approved', 'correction_required'],
    default: 'pending',
  },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  reviewed_at: { type: Date, default: null },
  admin_remarks: { type: String, default: null, trim: true },
  correction_items: [{ type: String, trim: true }],
}, {
  collection: 'store_setup_verifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ store_setup_id: 1, cycle_number: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_setup_verifications', schema);
