const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * gst_verification_logs — Audit log for all GSTIN verification requests.
 *
 * Phase R2 additions:
 *   - provider_reference_id: External reference ID from the Quick eKYC provider
 *   - registration_date:     GST registration date returned by provider
 *   - principal_address:     Registered principal business address (from provider)
 *   - derived_district_id:   Resolved geolocation_level_2 ID from principal address
 *   - taxpayer_type:         e.g. 'Regular', 'Composition', 'Input Service Distributor'
 *   - normalized_status:     Normalized active/inactive status string
 *
 * All new fields default to null for backward-compatibility.
 *
 * Collection: gst_verification_logs
 */
const schema = new mongoose.Schema({
  entity_type: {
    type: String,
    // Phase BOSKIT: Added 'boskit_distributor' and 'boskit_dealer' — backward-compatible addition
    // Phase ACCOUNTS: Added 'supplier'
    enum: ['reseller', 'epc_buyer', 'boskit_distributor', 'boskit_dealer', 'supplier'],
    required: true,
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  gstin: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    maxlength: 20,
  },
  provider: {
    type: String,
    default: 'mock',
  },
  request_payload: { type: Object, default: {} },
  response_snapshot: { type: Object, default: {} },

  // ── Core verified data ──────────────────────────────────────────────────
  legal_name: { type: String, default: null },
  trade_name: { type: String, default: null },
  business_status: { type: String, default: null },
  registration_state: { type: String, default: null },
  derived_state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },

  is_valid: { type: Boolean, required: true },
  error_message: { type: String, default: null },

  verified_by: { type: String, default: 'system' }, // 'system' or cms_user id
  verified_at: { type: Date, default: Date.now },

  // ── Phase R2: Extended provider fields ──────────────────────────────────
  // provider_reference_id: Reference/transaction ID returned by Quick eKYC provider.
  // Will be null for mock responses.
  provider_reference_id: { type: String, default: null, trim: true },

  // registration_date: Date of GST registration from the provider response.
  registration_date: { type: Date, default: null },

  // principal_address: Parsed principal business place of supply from provider.
  // Stored as a freeform object to accommodate provider-specific field names.
  principal_address: {
    type: Object,
    default: null,
    // Expected shape (when populated):
    //   { addr: String, ntr: String, pncd: String (pincode), dst: String, stcd: String (state) }
  },

  // derived_district_id: geolocation_level_2 ObjectId resolved from principal_address.pncd
  // or principal_address.dst. Populated by gst.verification.service after district lookup.
  derived_district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

  // taxpayer_type: e.g. 'Regular', 'Composition', 'Input Service Distributor', 'Non Resident'
  taxpayer_type: { type: String, default: null, trim: true },

  // normalized_status: Application-layer normalization of business_status.
  // Values: 'active' | 'inactive' | 'unknown' | 'error'
  normalized_status: {
    type: String,
    enum: ['active', 'inactive', 'unknown', 'error'],
    default: null,
  },
}, {
  collection: 'gst_verification_logs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Existing indexes — untouched
schema.index({ gstin: 1 });
schema.index({ entity_type: 1, entity_id: 1 });

// Phase R2: Index for district-level GST origin lookups
schema.index({ derived_district_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('gst_verification_logs', schema);
