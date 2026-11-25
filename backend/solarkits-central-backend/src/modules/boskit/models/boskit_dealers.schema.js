const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_dealers — BOSKIT Dealer accounts.
 *
 * Dealers are onboarded by their assigned Distributor.
 * Admin can require approval or allow direct distributor activation.
 *
 * All monetary values in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_dealers
 */

const schema = new mongoose.Schema({
  // ── Identity ─────────────────────────────────────────────────────────────
  business_name:  { type: String, required: true, trim: true, maxlength: 300 },
  mobile:         { type: String, required: true, trim: true, maxlength: 15 },
  email:          { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  password_hash:  { type: String, required: true },

  // ── GST & Business Identity ──────────────────────────────────────────────
  gst_number:              { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },
  pan_number:              { type: String, default: null, trim: true, uppercase: true, maxlength: 10 },
  gst_legal_name:          { type: String, default: null, trim: true, maxlength: 300 },
  gst_trade_name:          { type: String, default: null, trim: true, maxlength: 300 },
  gst_registration_status: { type: String, default: null, trim: true, maxlength: 50 },
  gst_verified_at:         { type: Date, default: null },
  gst_verification_log_id: { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },

  // ── Territory Assignment ─────────────────────────────────────────────────
  assigned_state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
  assigned_district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

  // ── Shop Address ─────────────────────────────────────────────────────────
  shop_address: {
    line:        { type: String, default: null, trim: true, maxlength: 500 },
    city:        { type: String, default: null, trim: true, maxlength: 100 },
    pincode:     { type: String, default: null, trim: true, maxlength: 10 },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    lat:         { type: Number, default: null },
    lng:         { type: Number, default: null },
  },

  // ── Distributor Relationship ─────────────────────────────────────────────
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },

  // ── Pricing Permissions (set by distributor within admin-defined limits) ──
  can_see_mrp:          { type: Boolean, default: true },
  can_place_orders:     { type: Boolean, default: true },

  // ── Lifecycle & Status ───────────────────────────────────────────────────
  lifecycle_status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'gst_verified',
      'under_review',
      'approved',
      'rejected',
      'active',
      'suspended',
      'deactivated',
    ],
    default: 'draft',
  },
  activation_status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deactivated'],
    default: 'pending',
  },
  kyc_status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'verified', 'rejected', 'resubmission_required'],
    default: 'draft',
  },

  // ── Admin / Distributor Review ────────────────────────────────────────────
  rejection_reason: { type: String, default: null, trim: true, maxlength: 2000 },
  internal_notes:   { type: String, default: null, trim: true, maxlength: 5000 },
  activated_by:     { type: mongoose.Schema.Types.ObjectId, default: null }, // cms_user OR distributor
  activated_by_type:{ type: String, enum: ['cms_user', 'distributor', null], default: null },
  activated_at:     { type: Date, default: null },

  // ── Verification Flags ───────────────────────────────────────────────────
  is_email_verified:  { type: Boolean, default: false },
  is_mobile_verified: { type: Boolean, default: false },
  is_active:          { type: Boolean, default: false },

  // ── Security ─────────────────────────────────────────────────────────────
  token_version:         { type: Number, default: 1 },
  failed_login_attempts: { type: Number, default: 0 },
  last_failed_login_at:  { type: Date, default: null },
  last_login_at:         { type: Date, default: null },

  // ── Soft Delete & Audit ──────────────────────────────────────────────────
  deleted_at:  { type: Date, default: null },
  created_by:  { type: mongoose.Schema.Types.ObjectId, default: null }, // cms_user or distributor
  updated_by:  { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  collection: 'boskit_dealers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ mobile: 1 }, { unique: true });
schema.index({ email: 1 }, { unique: true });
schema.index({ gst_number: 1 }, { sparse: true });
schema.index({ distributor_id: 1, activation_status: 1 });
schema.index({ assigned_state_id: 1, assigned_district_id: 1 });
schema.index({ lifecycle_status: 1 });
schema.index({ deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_dealers', schema);
