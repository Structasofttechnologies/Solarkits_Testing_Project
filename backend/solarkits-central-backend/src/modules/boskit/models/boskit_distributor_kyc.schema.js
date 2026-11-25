const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributor_kyc — KYC document storage for BOSKIT Distributors.
 *
 * SECURITY: storage_key holds an ENCRYPTED Cloudinary path.
 * Never expose storage_key in API responses without generating a signed URL.
 *
 * Mirrors reseller_kyc.schema.js pattern.
 *
 * Collection: boskit_distributor_kyc
 */

const kycDocSchema = new mongoose.Schema({
  storage_key:    { type: String, required: true },  // Encrypted path in Cloudinary
  original_name:  { type: String, required: true },
  mime_type:      { type: String, required: true },
  size_bytes:     { type: Number, required: true },
  file_url:       { type: String, default: null },   // Data URL or signed Cloudinary URL for preview
  doc_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejection_reason: { type: String, default: null, trim: true, maxlength: 500 },
  uploaded_at:    { type: Date, default: Date.now },
  reviewed_at:    { type: Date, default: null },
  reviewed_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, { _id: false });

const reviewHistorySchema = new mongoose.Schema({
  status:      { type: String, required: true },
  actor_type:  { type: String, enum: ['cms_user', 'boskit_distributor', 'system'], required: true },
  actor_id:    { type: mongoose.Schema.Types.ObjectId, default: null },
  note:        { type: String, default: null, trim: true, maxlength: 2000 },
  timestamp:   { type: Date, default: Date.now },
}, { _id: false });

const schema = new mongoose.Schema({
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },

  docs: {
    // Required KYC documents
    gst_certificate:      { type: kycDocSchema, default: null },
    pan_card:             { type: kycDocSchema, default: null },
    aadhaar_front:        { type: kycDocSchema, default: null },
    aadhaar_back:         { type: kycDocSchema, default: null },
    shop_photo:           { type: kycDocSchema, default: null },
    address_proof:        { type: kycDocSchema, default: null },
    cancelled_cheque:     { type: kycDocSchema, default: null },
    business_registration:{ type: kycDocSchema, default: null },

    // Optional / admin-requested additional documents
    additional_docs: [kycDocSchema],
  },

  overall_status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'verified', 'rejected', 'resubmission_required'],
    default: 'draft',
  },

  verified_by:       { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  verified_at:       { type: Date, default: null },
  rejected_reason:   { type: String, default: null, trim: true, maxlength: 2000 },
  resubmission_note: { type: String, default: null, trim: true, maxlength: 2000 },

  history: [reviewHistorySchema],
}, {
  collection: 'boskit_distributor_kyc',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1 }, { unique: true });
schema.index({ overall_status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributor_kyc', schema);
