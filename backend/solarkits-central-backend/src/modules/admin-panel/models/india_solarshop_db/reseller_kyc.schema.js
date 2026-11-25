const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * Single document entry inside reseller_kyc docs map.
 * Secure storage: stores encrypted key and metadata, NOT public URLs.
 */
const kycDocSchema = new mongoose.Schema({
  storage_key:   { type: String, required: true }, // Encrypted path in Cloudinary/S3
  original_name: { type: String, required: true },
  mime_type:     { type: String, required: true },
  size_bytes:    { type: Number, required: true },
  uploaded_at:   { type: Date, default: Date.now },
}, { _id: false });

/**
 * Review history entry for auditability.
 */
const reviewHistorySchema = new mongoose.Schema({
  status:      { type: String, required: true },
  actor_type:  { type: String, enum: ['cms_user', 'reseller', 'system'], required: true },
  actor_id:    { type: mongoose.Schema.Types.ObjectId, default: null },
  note:        { type: String, default: null },
  timestamp:   { type: Date, default: Date.now },
}, { _id: false });

/**
 * reseller_kyc — Stores KYC document uploads, review history, and verification state.
 *
 * Collection: reseller_kyc
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  docs: {
    aadhaar_front:     { type: kycDocSchema, default: null },
    aadhaar_back:      { type: kycDocSchema, default: null },
    pan_card:          { type: kycDocSchema, default: null },
    gst_certificate:   { type: kycDocSchema, default: null },
    shop_photo:        { type: kycDocSchema, default: null },
    address_proof:     { type: kycDocSchema, default: null },
    cancelled_cheque:  { type: kycDocSchema, default: null },
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending', 'verified', 'rejected', 'resubmission_required'],
    default: 'draft',
  },
  verified_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  verified_at:     { type: Date, default: null },
  rejected_reason: { type: String, default: null, trim: true },
  resubmission_note: { type: String, default: null, trim: true },
  history:         [reviewHistorySchema],
}, {
  collection: 'reseller_kyc',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1 }, { unique: true });
schema.index({ status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_kyc', schema);
