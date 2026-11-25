const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributor_applications — Multi-step onboarding wizard state.
 *
 * Created when distributor begins registration (Step 1).
 * Each step updates this document. Supports resuming across sessions.
 *
 * step_completed tracks highest completed wizard step (1-14).
 *
 * Application states:
 *   draft → submitted → gst_verification_pending → gst_verified |
 *   gst_verification_failed → under_review → more_info_required →
 *   approved | rejected
 *
 * Collection: boskit_distributor_applications
 */

const statusHistorySchema = new mongoose.Schema({
  status:     { type: String, required: true },
  actor_type: { type: String, enum: ['cms_user', 'distributor', 'system'], required: true },
  actor_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  note:       { type: String, default: null, trim: true, maxlength: 2000 },
  timestamp:  { type: Date, default: Date.now },
}, { _id: false });

const schema = new mongoose.Schema({
  // ── Linked Distributor Account ────────────────────────────────────────────
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },

  // ── Application Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'gst_verification_pending',
      'gst_verified',
      'gst_verification_failed',
      'under_review',
      'more_info_required',
      'approved',
      'rejected',
    ],
    default: 'draft',
  },

  // ── Wizard Progress ───────────────────────────────────────────────────────
  step_completed: { type: Number, default: 0, min: 0, max: 17 },

  // ── Step Data Snapshots (saved per step) ──────────────────────────────────
  step_data: {
    // Step 1: Account signup (email, mobile, password — stored on distributor entity)
    step1_completed_at: { type: Date, default: null },

    // Step 2: Company/business details
    step2: {
      business_name:   { type: String, default: null },
      business_type:   { type: String, default: null }, // Proprietorship, Partnership, Pvt Ltd, etc.
      years_in_business: { type: Number, default: null },
    },

    // Step 3-5: GST number + verification
    step3: {
      gst_number:          { type: String, default: null },
      gst_verification_id: { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },
      verified_at:         { type: Date, default: null },
      verification_status: { type: String, enum: ['pending', 'verified', 'failed', null], default: null },
    },

    // Step 6: State selection
    step6: {
      state_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
    },

    // Step 7: District selection
    step7: {
      district_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
    },

    // Step 8-9: Shop / warehouse location
    step8: {
      location_type: { type: String, enum: ['shop', 'warehouse', 'office', null], default: null },
      lat:  { type: Number, default: null },
      lng:  { type: Number, default: null },
      address_line: { type: String, default: null },
      city:         { type: String, default: null },
      pincode:      { type: String, default: null },
      state_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
      district_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    },

    // Step 10: Authorized person details
    step10: {
      name:        { type: String, default: null },
      designation: { type: String, default: null },
      mobile:      { type: String, default: null },
      email:       { type: String, default: null },
    },

    // Step 11: KYC/Document upload (doc keys stored on boskit_distributor_kyc)
    step11_completed_at: { type: Date, default: null },

    // Step 12: Plan selection
    step12: {
      selected_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributor_plans', default: null },
    },

    // Step 13: Review & Declaration
    step13: {
      declaration_accepted:    { type: Boolean, default: false },
      declaration_accepted_at: { type: Date, default: null },
      declaration_ip:          { type: String, default: null },
    },

    // Step 14: Submitted
    step14_submitted_at: { type: Date, default: null },
  },

  // ── Status Audit History ──────────────────────────────────────────────────
  status_history: [statusHistorySchema],

  // ── Admin Review ─────────────────────────────────────────────────────────
  rejection_reason:  { type: String, default: null, trim: true, maxlength: 2000 },
  more_info_request: { type: String, default: null, trim: true, maxlength: 2000 },
  internal_notes:    { type: String, default: null, trim: true, maxlength: 5000 },

  // ── Soft Delete & Audit ──────────────────────────────────────────────────
  deleted_at: { type: Date, default: null },
}, {
  collection: 'boskit_distributor_applications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1 }, { unique: true });
schema.index({ status: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributor_applications', schema);
