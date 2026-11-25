const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_kyc — KYC documents & verification record for BDE.
 *
 * Collection: bde_kycs
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
    unique: true,
    index: true,
  },
  aadhaar_number: {
    type: String,
    required: true,
    trim: true,
    match: [/^\d{12}$/, 'Aadhaar must be a 12-digit number'],
    index: true,
  },
  pan_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must follow standard format (e.g. ABCDE1234F)'],
    index: true,
  },
  aadhaar_document_url: {
    type: String,
    required: true,
    trim: true,
  },
  pan_document_url: {
    type: String,
    required: true,
    trim: true,
  },
  kyc_status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    index: true,
  },
  kyc_remarks: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  rejection_reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  verified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  verified_at: {
    type: Date,
    default: null,
  },
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  rejected_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'bde_kycs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('aadhaar_masked').get(function () {
  if (!this.aadhaar_number || this.aadhaar_number.length < 4) return 'XXXXXXXXXXXX';
  return 'XXXXXXXX' + this.aadhaar_number.slice(-4);
});

schema.virtual('pan_masked').get(function () {
  if (!this.pan_number || this.pan_number.length < 4) return 'XXXXXXXXXX';
  return this.pan_number.slice(0, 2) + 'XXXXXX' + this.pan_number.slice(-2);
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('bde_kycs', schema);
