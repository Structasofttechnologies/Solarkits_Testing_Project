const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributors — Primary entity for BOSKIT Distributor accounts.
 *
 * Lifecycle states (reseller_lifecycle_status equivalent):
 *   draft → submitted → gst_verification_pending → gst_verified |
 *   gst_verification_failed → under_review → more_info_required →
 *   approved → active | rejected | suspended | deactivated
 *
 * All monetary values stored as integers in Paise (1 INR = 100 Paise).
 *
 * Collection: boskit_distributors
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
  gst_registration_status: { type: String, default: null, trim: true, maxlength: 50 }, // 'ACTIVE' | 'CANCELLED'
  gst_verified_at:         { type: Date, default: null },
  gst_verification_log_id: { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },

  // ── Registered Address (from GST auto-fetch) ─────────────────────────────
  registered_address: {
    line:        { type: String, default: null, trim: true, maxlength: 500 },
    city:        { type: String, default: null, trim: true, maxlength: 100 },
    pincode:     { type: String, default: null, trim: true, maxlength: 10 },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    country_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
  },

  // ── Shop / Warehouse Location ─────────────────────────────────────────────
  shop_address: {
    line:        { type: String, default: null, trim: true, maxlength: 500 },
    city:        { type: String, default: null, trim: true, maxlength: 100 },
    pincode:     { type: String, default: null, trim: true, maxlength: 10 },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    country_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
    lat:         { type: Number, default: null },
    lng:         { type: Number, default: null },
  },

  // ── Authorized Person ────────────────────────────────────────────────────
  authorized_person: {
    name:         { type: String, default: null, trim: true, maxlength: 150 },
    designation:  { type: String, default: null, trim: true, maxlength: 100 },
    mobile:       { type: String, default: null, trim: true, maxlength: 15 },
    email:        { type: String, default: null, trim: true, maxlength: 200 },
    aadhaar_masked: { type: String, default: null, trim: true, maxlength: 14 }, // e.g. XXXX-XXXX-1234
  },

  // ── Plan ─────────────────────────────────────────────────────────────────
  plan_assignment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributor_plan_assignments',
    default: null,
  },

  // ── Territory ────────────────────────────────────────────────────────────
  // Assigned states and districts stored in boskit_distributor_territories (separate collection)

  // ── Application & Lifecycle Status ───────────────────────────────────────
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributor_applications',
    default: null,
  },
  lifecycle_status: {
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
      'active',
      'suspended',
      'deactivated',
    ],
    default: 'draft',
  },
  kyc_status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'verified', 'rejected', 'resubmission_required'],
    default: 'draft',
  },
  activation_status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'deactivated', 'terminated'],
    default: 'pending',
  },

  // ── Admin Actions ─────────────────────────────────────────────────────────
  rejection_reason:  { type: String, default: null, trim: true, maxlength: 2000 },
  more_info_request: { type: String, default: null, trim: true, maxlength: 2000 },
  internal_notes:    { type: String, default: null, trim: true, maxlength: 5000 },
  reviewed_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  reviewed_at:       { type: Date, default: null },
  approved_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  approved_at:       { type: Date, default: null },
  activated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  activated_at:      { type: Date, default: null },

  // ── Verification Flags ───────────────────────────────────────────────────
  is_email_verified:  { type: Boolean, default: false },
  is_mobile_verified: { type: Boolean, default: false },
  is_active:          { type: Boolean, default: false },

  // ── Security ─────────────────────────────────────────────────────────────
  token_version:          { type: Number, default: 1 },
  failed_login_attempts:  { type: Number, default: 0 },
  last_failed_login_at:   { type: Date, default: null },
  last_login_at:          { type: Date, default: null },

  // ── Soft Delete & Audit ──────────────────────────────────────────────────
  deleted_at:  { type: Date, default: null },
  created_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'boskit_distributors',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ mobile: 1 }, { unique: true });
schema.index({ email: 1 }, { unique: true });
schema.index({ gst_number: 1 }, { sparse: true });
schema.index({ lifecycle_status: 1, activation_status: 1 });
schema.index({ 'shop_address.state_id': 1, 'shop_address.district_id': 1 });
schema.index({ plan_assignment_id: 1 });
schema.index({ deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributors', schema);
