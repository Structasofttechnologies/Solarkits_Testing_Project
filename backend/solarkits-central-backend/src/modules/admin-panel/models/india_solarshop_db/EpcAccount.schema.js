const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  whatsapp: { type: String, required: true },
  registered_whatsapp: { type: String, default: null },
  is_registered_same_as_whatsapp: { type: Boolean, default: false },
  password_hash: { type: String, required: true },
  security_pin: { type: String, default: null, trim: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_companies', default: null },
  states: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  districts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
  is_email_verified: { type: Boolean, default: false },
  is_whatsapp_verified: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  // --- EPC Classification Type ---
  epc_type:                 { type: String, default: null, trim: true },
  epc_type_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'epc_types', default: null },

  // --- Phase 5: Reseller Onboarding Pipeline (backward-compatible) ---
  onboarded_by_reseller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  onboarding_source:        { type: String, enum: ['direct', 'reseller', 'bde', 'portal', 'lead', 'government', 'verified', 'database', 'website'], default: 'direct' },
  reseller_assigned_date:   { type: Date, default: null },
  gst_verification_status:  { type: String, enum: ['verified_automatic', 'verified_admin', 'pending_admin', 'unverified'], default: 'unverified' },

  // --- BDE Onboarding & Attribution Pipeline ---
  onboarded_by_bde_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
  bde_assigned_date:        { type: Date, default: null },
  state_name:               { type: String, default: null },
  district_name:            { type: String, default: null },
  address:                  { type: String, default: null },
  pincode:                  { type: String, default: null },

  // --- Phase R4: Canonical GSTIN & Reseller Identity ---
  gstin:                    { type: String, default: null, trim: true, uppercase: true, maxlength: 20 },
  gstin_verified_at:        { type: Date, default: null },
  gstin_legal_name:         { type: String, default: null, trim: true },
  gstin_trade_name:         { type: String, default: null, trim: true },
  gstin_registration_status:{ type: String, default: null, trim: true },
  is_gstin_active:          { type: Boolean, default: false },
  primary_reseller_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  onboarding_gstin_log_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'gst_verification_logs', default: null },

  // --- Phase EPC Analytics & Customer Behavior ---
  behavior_status:          { type: String, default: 'active' },
  customer_tier:            { type: String, default: 'Standard EPC' },
  recovery_discount_pct:    { type: Number, default: 0 },
  recovery_followup_status: { type: String, default: 'none' },
  credit_limit_inr:         { type: Number, default: 0 },
  behavior_notes:           { type: String, default: '' },
  last_activity_at:         { type: Date, default: null },

  deleted_at: { type: Date, default: null }
}, { 
  collection: 'epc_accounts', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.index({ gstin: 1 }, { sparse: true });
schema.index({ security_pin: 1 }, { sparse: true });
schema.index({ primary_reseller_id: 1, deleted_at: 1 });
schema.index({ onboarded_by_reseller_id: 1, deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });
module.exports = db.model('epc_accounts', schema);
