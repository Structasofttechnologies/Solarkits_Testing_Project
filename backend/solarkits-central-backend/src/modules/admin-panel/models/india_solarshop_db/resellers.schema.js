const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * resellers — Primary entity for Reseller / Store accounts in the Solarkits system.
 *
 * Stores business identity, GST/PAN/Aadhaar (masked/encrypted), territory address,
 * KYC status, plan subscription, agreement status, and activation status.
 *
 * Phase R2 additions:
 *   - reseller_lifecycle_status: Full end-to-end pipeline state (separate from kyc_status)
 *   - GST identity fields from Quick eKYC verification
 *   - contact_person for operations team communication
 *
 * Store Management additions:
 *   - store_category: company_store | franchisee_store
 *   - franchisee_subtype_id: configurable subtype reference
 *   - company_store_bde_id: direct BDE assignment for Company Stores
 *   - onboarding_rejection_reason / onboarding_hold_reason
 *
 * Collection: resellers
 */
const schema = new mongoose.Schema({
  business_name:   { type: String, required: true, trim: true, maxlength: 250 },
  gst_number:      { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },
  pan_number:      { type: String, default: null, trim: true, uppercase: true, maxlength: 10 },
  aadhaar_masked:  { type: String, default: null, trim: true, maxlength: 14 }, // e.g. "XXXX-XXXX-1234"
  mobile:          { type: String, required: true, trim: true, maxlength: 15 },
  email:           { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  password_hash:   { type: String, required: true },

  // ── 4-Digit Security PIN for Fast Login ──────────────────────────────────
  security_pin_hash:   { type: String, default: null }, // bcrypt hashed 4-digit PIN
  is_pin_set:          { type: Boolean, default: false },
  pin_set_at:          { type: Date, default: null },
  pin_failed_attempts: { type: Number, default: 0 },
  pin_locked_until:    { type: Date, default: null },

  address: {
    line:        { type: String, default: null, trim: true, maxlength: 500 },
    country_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
    state_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    city:        { type: String, default: null, trim: true, maxlength: 100 },
    pincode:     { type: String, default: null, trim: true, maxlength: 10 },
  },

  commercial_mode: {
    type: String,
    enum: ['commission', 'dealer'],
    required: true,
    default: 'commission',
  },
  store_category: {
    type: String,
    enum: ['company_store', 'franchisee_store'],
    default: 'franchisee_store',
  },
  franchisee_subtype_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_subtypes',
    default: null,
  },
  reseller_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_types',
    required: true,
  },
  plan_subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_plan_subscriptions',
    default: null,
  },
  approved_industry_type_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    default: [],
  }],

  // ── Existing KYC sub-process status (unchanged) ───────────────────────────
  kyc_status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'verified', 'rejected', 'resubmission_required'],
    default: 'draft',
  },

  // ── Phase R2: Full Reseller Lifecycle Status ──────────────────────────────
  // Tracks the complete onboarding pipeline end-to-end, distinct from kyc_status
  // (which only reflects the KYC document review sub-process).
  //
  // Transition map:
  //   draft → store_created → gst_verification_pending → gst_verified → kyc_pending → kyc_submitted →
  //   kyc_under_review → kyc_verified → agreement_pending → agreement_signed →
  //   fee_payment_pending / payment_pending → payment_verification_pending → payment_verified →
  //   setup_verification_pending → territory_pending → active → suspended / on_hold / rejected / expired / terminated
  reseller_lifecycle_status: {
    type: String,
    enum: [
      'draft',
      'store_created',
      'lead_captured',
      'gst_verification_pending',
      'gst_verified',
      'admin_review',
      'approved',
      'agreement_pending',
      'agreement_signed',
      'fee_payment_pending',
      'payment_pending',
      'payment_verification_pending',
      'payment_verified',
      'store_setup_pending',
      'setup_verification_pending',
      'kyc_pending',
      'kyc_submitted',
      'kyc_under_review',
      'kyc_rejected',
      'kyc_resubmission_required',
      'kyc_verified',
      'territory_pending',
      'active',
      'on_hold',
      'rejected',
      'suspended',
      'expired',
      'terminated',
    ],
    default: 'draft',
  },

  // ── Store Management: Company Store BDE & Onboarding Meta ───────────────
  company_store_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  company_store_bde_assigned_at: { type: Date, default: null },
  company_store_bde_assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  onboarding_rejection_reason: { type: String, default: null, trim: true },
  onboarding_hold_reason:      { type: String, default: null, trim: true },

  // ── Phase R2: GST Identity (populated after Quick eKYC verification) ──────
  gst_legal_name:          { type: String, default: null, trim: true, maxlength: 300 },
  gst_trade_name:          { type: String, default: null, trim: true, maxlength: 300 },
  gst_registration_status: { type: String, default: null, trim: true, maxlength: 50 }, // e.g. 'ACTIVE', 'CANCELLED'
  gst_verified_at:         { type: Date,   default: null },
  gst_verification_log_id: { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },

  // ── Operations Contact ───────────────────────────────────────────────────
  contact_person: { type: String, default: null, trim: true, maxlength: 150 },

  // ── Franchise Agreement Status ───────────────────────────────────────────
  agreement_status: {
    type: String,
    enum: ['pending', 'generated', 'signed', 'expired', 'revoked'],
    default: 'pending',
  },
  agreement_signed_at: { type: Date, default: null },
  agreement_signer_name: { type: String, default: null },

  // ── Manual Fee Payment & Receipt Details ─────────────────────────────────
  fee_payment_status: {
    type: String,
    enum: ['pending_payment', 'receipt_uploaded', 'verified', 'rejected'],
    default: 'pending_payment',
  },
  fee_payment_utr:            { type: String, default: null, trim: true },
  fee_payment_amount:         { type: Number, default: null },
  fee_payment_date:           { type: Date, default: null },
  fee_payment_receipt_url:    { type: String, default: null, trim: true },
  fee_payment_verified_at:    { type: Date, default: null },
  fee_payment_verified_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  fee_payment_remarks:        { type: String, default: null, trim: true },

  // ── Franchise Commission Bank Details ──────────────────────────────────
  bank_details: {
    bank_name:           { type: String, default: null, trim: true },
    account_holder_name: { type: String, default: null, trim: true },
    account_number:      { type: String, default: null, trim: true },
    ifsc_code:           { type: String, default: null, trim: true, uppercase: true },
    branch:              { type: String, default: null, trim: true },
    upi_id:              { type: String, default: null, trim: true },
    updated_at:          { type: Date, default: null },
  },

  // ── Step 2 & 3: BDE Attribution & Store Operations ───────────────────────
  bde_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
  original_bde_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
  lead_id:               { type: mongoose.Schema.Types.ObjectId, ref: 'bde_leads', default: null },
  lead_source:           { type: String, default: 'direct' },
  store_setup_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'store_setups', default: null },
  is_operational:        { type: Boolean, default: false },
  operations_started_at: { type: Date, default: null },

  // ── Module 1.1: Franchisee Warehouse Physical Capacity (for Checkout Validation) ──
  // These metrics are used during EPC Buyer checkout to validate whether the
  // Franchisee Warehouse can absorb the incoming order without overflow.
  //
  // Available Capacity = max_kits - (current_stock_kits + allocated_incoming_kits)
  //
  // CRITICAL: allocated_incoming_kits must be incremented atomically at order
  // placement (Double Commit Prevention) — not deferred to physical dispatch.
  warehouse_capacity: {
    max_kits:                  { type: Number, default: 0 }, // Maximum physical kit storage capacity
    max_weight_kg:             { type: Number, default: 0 }, // Maximum weight in kg
    max_area_sqft:             { type: Number, default: 0 }, // Physical floor area in sq ft
    current_stock_kits:        { type: Number, default: 0 }, // Current kits physically in warehouse
    allocated_incoming_kits:   { type: Number, default: 0 }, // Orders placed but not yet delivered (committed slots)
    last_capacity_updated_at:  { type: Date, default: null },
  },

  activation_status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'terminated'],
    default: 'pending',
  },

  is_email_verified:  { type: Boolean, default: false },
  is_mobile_verified: { type: Boolean, default: false },
  is_active:          { type: Boolean, default: true },
  token_version:      { type: Number, default: 1 },
  deleted_at:         { type: Date, default: null },
  created_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'resellers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Existing indexes — untouched
schema.index({ mobile: 1 }, { unique: true });
schema.index({ email: 1 }, { unique: true });
schema.index({ gst_number: 1 }, { sparse: true });
schema.index({ activation_status: 1, kyc_status: 1 });
schema.index({ reseller_type_id: 1 });

// Phase R2: Lifecycle status index for activation readiness queries
schema.index({ reseller_lifecycle_status: 1, activation_status: 1 });
schema.index({ store_category: 1, activation_status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('resellers', schema);
