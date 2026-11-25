const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  account_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  company_name:    { type: String, required: true },
  email:           { type: String, required: true },
  whatsapp:        { type: String, required: true },
  status:          { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  state_id:        { type: mongoose.Schema.Types.ObjectId, default: null }, // CROSS DB (geo_level_1)
  district_id:     { type: mongoose.Schema.Types.ObjectId, default: null }, // CROSS DB (geo_level_2)
  state_name:      { type: String, default: null },
  district_name:   { type: String, default: null },
  gstin:           { type: String, default: null, trim: true, uppercase: true },
  reference_image: { type: String, default: null },
  reviewed_by:     { type: mongoose.Schema.Types.ObjectId, default: null }, // user_id
  reviewed_at:     { type: Date, default: null },
  // --- EPC Classification Type ---
  epc_type:                 { type: String, default: null, trim: true },
  epc_type_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'epc_types', default: null },
  // --- Phase 5: Reseller / BDE Onboarding Pipeline (backward-compatible) ---
  onboarded_by_reseller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  onboarding_source:        { type: String, enum: ['direct', 'reseller', 'bde'], default: 'direct' },
  onboarded_by_bde_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
  bde_name:                 { type: String, default: null },
  assigned_reseller_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  assigned_reseller_name:   { type: String, default: null },
  is_direct_store_epc:      { type: Boolean, default: false },
  auto_assigned:            { type: Boolean, default: false },
  // ------------------------------------------------------------------
  created_at:      { type: Date, default: Date.now },
}, { collection: 'epc_signup_requests', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

// Indexes for high performance querying, pagination, and sorting
schema.index({ status: 1, created_at: -1 });
schema.index({ deleted_at: 1, created_at: -1 });
schema.index({ deleted_at: 1, status: 1, created_at: -1 });
schema.index({ created_at: -1 });
schema.index({ account_id: 1 });
schema.index({ state_id: 1, status: 1 });
schema.index({ district_id: 1 });
schema.index({ epc_type: 1 });
schema.index({ company_name: 1 });
schema.index({ email: 1 });
schema.index({ whatsapp: 1 });

module.exports = db.model('epc_signup_requests', schema);
