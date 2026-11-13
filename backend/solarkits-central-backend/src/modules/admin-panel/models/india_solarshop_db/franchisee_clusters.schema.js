const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_clusters — Centralized Franchisee Cluster Entity across India.
 *
 * Configures district-wise clusters, assigns franchisees and BDEs, tracks
 * setup fee breakdowns, agreement durations, and maintains full audit history.
 *
 * Collection: franchisee_clusters
 */
const auditLogItemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  user_name: { type: String, default: 'Admin' },
  action: { type: String, required: true }, // e.g. 'CREATED', 'TERRITORY_UPDATED', 'FEE_UPDATED', 'STATUS_CHANGED', 'FRANCHISEE_MAPPED', 'BDE_MAPPED'
  timestamp: { type: Date, default: Date.now },
  old_state: { type: mongoose.Schema.Types.Mixed, default: null },
  new_state: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: null, trim: true },
}, { _id: true });

const additionalChargeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  cluster_name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 150,
  },
  cluster_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
    // Format: CLU-{STATE_CODE}-{SEQUENCE}, e.g., CLU-GJ-001
  },
  country_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_0',
    required: true,
  },
  country_name: {
    type: String,
    default: 'India',
    trim: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
    index: true,
  },
  state_name: {
    type: String,
    required: true,
    trim: true,
  },
  district_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    required: true,
  }],
  district_names: [{
    type: String,
    trim: true,
  }],
  franchisee_store_type: {
    type: String,
    default: 'district_wise_franchisee_store',
    trim: true,
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'allotted', 'inactive'],
    default: 'available',
    index: true,
  },
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  assigned_franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
    index: true,
  },
  primary_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
    index: true,
  },
  support_bde_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: [],
  }],

  // ── Section 1.2: Cluster Setup Fee Configuration ───────────────────────────
  setup_fee_config: {
    setup_fee: { type: Number, default: 100000, min: 0 },
    agreement_duration_years: { type: Number, default: 2, min: 1, max: 10 },
    renewal_fee: { type: Number, default: 10000, min: 0 },
    security_deposit: { type: Number, default: 25000, min: 0 },
    additional_charges: [additionalChargeSchema],
    total_payable: { type: Number, default: 135000, min: 0 },
    waiver_discount: {
      amount: { type: Number, default: 0, min: 0 },
      approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      reason: { type: String, default: null, trim: true },
    },
  },

  payment_status: {
    type: String,
    enum: ['pending', 'partially_paid', 'paid', 'overdue', 'refunded'],
    default: 'pending',
    index: true,
  },
  paid_amount: {
    type: Number,
    default: 0,
    min: 0,
  },
  payment_receipt_url: {
    type: String,
    default: null,
    trim: true,
  },
  invoice_number: {
    type: String,
    default: null,
    trim: true,
  },

  // ── Territory Management Rules ─────────────────────────────────────────────
  is_shared_territory_allowed: {
    type: Boolean,
    default: false,
  },
  effective_date: {
    type: Date,
    default: Date.now,
  },
  agreement_start_date: {
    type: Date,
    default: null,
  },
  agreement_expiry_date: {
    type: Date,
    default: null,
  },

  // ── Audit & Change History ─────────────────────────────────────────────────
  audit_history: [auditLogItemSchema],

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
  collection: 'franchisee_clusters',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

// Calculate total payable pre-save
schema.pre('save', function () {
  if (this.setup_fee_config) {
    const fee = Number(this.setup_fee_config.setup_fee || 0);
    const renewal = Number(this.setup_fee_config.renewal_fee || 0);
    const deposit = Number(this.setup_fee_config.security_deposit || 0);
    const extras = (this.setup_fee_config.additional_charges || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const waiver = Number(this.setup_fee_config.waiver_discount?.amount || 0);
    this.setup_fee_config.total_payable = Math.max(0, fee + renewal + deposit + extras - waiver);
  }
});

schema.index({ state_id: 1, status: 1 });
schema.index({ district_ids: 1 });

module.exports = india_solarshop_db.model('franchisee_clusters', schema);
