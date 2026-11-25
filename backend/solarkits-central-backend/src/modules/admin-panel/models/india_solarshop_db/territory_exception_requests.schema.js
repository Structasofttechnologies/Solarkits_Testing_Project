const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * territory_exception_requests — Approval requests when BDE creates leads or signs up franchisees outside assigned territory/plan.
 *
 * Collection: territory_exception_requests
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  bde_name: { type: String, default: null, trim: true },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_leads',
    default: null,
  },
  prospect_name: { type: String, default: null, trim: true },
  company_name: { type: String, default: null, trim: true },

  // Territory details
  requested_country: { type: String, default: 'India', trim: true },
  requested_state: { type: String, required: true, trim: true },
  requested_district: { type: String, required: true, trim: true },
  requested_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'reseller_plans', default: null },
  requested_plan_name: { type: String, default: null, trim: true },

  reason: { type: String, required: true, trim: true },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  reviewed_at: { type: Date, default: null },
  admin_remarks: { type: String, default: null, trim: true },
}, {
  collection: 'territory_exception_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ bde_id: 1, status: 1 });
schema.index({ status: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('territory_exception_requests', schema);
