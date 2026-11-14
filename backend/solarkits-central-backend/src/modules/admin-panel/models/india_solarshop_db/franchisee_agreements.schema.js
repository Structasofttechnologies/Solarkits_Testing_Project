const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_agreements — Year-wise Agreement Tracking & Expiry/Renewal Lifecycle.
 *
 * Tracks franchisee contract validity, document uploads, digital signatures,
 * renewal chains, and operational restrictions on expiration.
 *
 * Collection: franchisee_agreements
 */
const renewalHistoryItemSchema = new mongoose.Schema({
  previous_agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_agreements', default: null },
  renewed_at: { type: Date, default: Date.now },
  renewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  previous_start_date: { type: Date, default: null },
  previous_end_date: { type: Date, default: null },
  renewal_fee_paid: { type: Number, default: 0 },
  payment_reference: { type: String, default: null, trim: true },
  remarks: { type: String, default: null, trim: true },
}, { _id: true });

const schema = new mongoose.Schema({
  agreement_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    // Format: AGR-SKT-{YEAR}-{SEQUENCE}, e.g. AGR-SKT-2026-0001
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
    index: true,
  },
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_clusters',
    required: true,
    index: true,
  },
  version: {
    type: String,
    default: '1.0',
    trim: true,
  },
  title: {
    type: String,
    default: 'SolarKits Authorized Franchise Partner Agreement',
    trim: true,
  },
  agreement_duration_type: {
    type: String,
    enum: ['1_year', '2_years', '3_years', 'custom'],
    default: '2_years',
  },
  duration_months: {
    type: Number,
    default: 24,
    min: 1,
  },
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
    index: true,
  },
  document_url: {
    type: String,
    default: null,
    trim: true,
  },
  document_name: {
    type: String,
    default: null,
    trim: true,
  },
  is_digitally_signed: {
    type: Boolean,
    default: false,
  },
  signed_at: {
    type: Date,
    default: null,
  },
  signer_name: {
    type: String,
    default: null,
    trim: true,
  },
  signer_designation: {
    type: String,
    default: 'Authorized Franchisee Signatory',
    trim: true,
  },
  signer_ip: {
    type: String,
    default: null,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'expiring_soon', 'expired', 'renewal_pending', 'renewed', 'terminated'],
    default: 'active',
    index: true,
  },
  setup_fee: {
    type: Number,
    default: 0,
  },
  renewal_fee: {
    type: Number,
    default: 0,
  },
  security_deposit: {
    type: Number,
    default: 0,
  },
  payment_status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid', 'overdue', 'refunded'],
    default: 'paid',
  },
  renewal_conditions: {
    type: String,
    default: 'Standard renewal subject to performance metrics, minimum kit targets, and admin approval.',
    trim: true,
  },
  restrict_operations_on_expiry: {
    type: Boolean,
    default: true,
  },
  expiry_alert_days: {
    type: Number,
    default: 30, // Notify before 30 days
  },
  assigned_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
  },
  renewal_followup_task_created: {
    type: Boolean,
    default: false,
  },
  renewal_history: [renewalHistoryItemSchema],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'franchisee_agreements',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

schema.index({ franchisee_id: 1, status: 1 });
schema.index({ cluster_id: 1, end_date: 1 });

module.exports = india_solarshop_db.model('franchisee_agreements', schema);
