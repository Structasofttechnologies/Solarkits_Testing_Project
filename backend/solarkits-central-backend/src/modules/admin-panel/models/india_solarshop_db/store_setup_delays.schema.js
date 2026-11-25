const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_setup_delays — Formal timeline extension requests and delay management audits.
 *
 * Collection: store_setup_delays
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
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    required: true,
  },
  requested_by_name: { type: String, default: null, trim: true },

  // Delay Request Details
  reason: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  responsible_party: {
    type: String,
    enum: [
      'franchisee',
      'state_employee',
      'vendor',
      'civil_work',
      'branding_agency',
      'external_force_majeure',
    ],
    default: 'civil_work',
  },
  supporting_proof_urls: [{ type: String, trim: true }],
  corrective_action: { type: String, required: true, trim: true },

  // Timeline Adjustments
  additional_days_requested: { type: Number, required: true, min: 1 },
  original_completion_date: { type: Date, required: true },
  proposed_revised_date: { type: Date, required: true },

  // Admin Decision
  decision_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'clarification_requested'],
    default: 'pending',
  },
  approved_additional_days: { type: Number, default: 0 },
  approved_revised_date: { type: Date, default: null },
  decision_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  decision_at: { type: Date, default: null },
  admin_remarks: { type: String, default: null, trim: true },
}, {
  collection: 'store_setup_delays',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ store_setup_id: 1, decision_status: 1 });
schema.index({ franchisee_id: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_setup_delays', schema);
