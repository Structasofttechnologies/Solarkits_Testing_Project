const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_agreements — Tracks legal agreements generated and signed by resellers.
 *
 * Collection: reseller_agreements
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchise_leads',
    default: null,
  },
  agreement_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    default: 'SolarKits Authorized Franchise Partner Agreement',
    trim: true,
  },
  version: {
    type: String,
    default: '1.0',
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'generated', 'signed', 'expired', 'revoked'],
    default: 'pending',
  },
  territory_scope: {
    type: String,
    default: null,
    trim: true,
  },
  agreement_content: {
    type: String,
    default: null,
  },
  pdf_storage_key: {
    type: String,
    default: null,
  },
  signed_at: {
    type: Date,
    default: null,
  },
  signed_ip: {
    type: String,
    default: null,
  },
  signer_name: {
    type: String,
    default: null,
  },
  signer_designation: {
    type: String,
    default: 'Authorized Signatory / Proprietor',
    trim: true,
  },
  expires_at: {
    type: Date,
    default: null,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'reseller_agreements',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, status: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_agreements', schema);
