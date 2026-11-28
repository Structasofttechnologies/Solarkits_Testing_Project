const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const normalizePhone10 = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

const schema = new mongoose.Schema(
  {
    segment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_segments',
      required: true,
      index: true
    },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '', index: true },
    phone: { type: String, trim: true, default: '', index: true },
    phone_normalized: { type: String, trim: true, default: '', index: true },
    state: { type: String, trim: true, default: '', index: true },
    state_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_1',
      default: null,
      index: true
    },
    district: { type: String, trim: true, default: '', index: true },
    district_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'geolocation_level_2',
      default: null,
      index: true
    },
    cluster_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'franchisee_clusters',
      default: null,
      index: true
    },
    cluster_name: { type: String, trim: true, default: '', index: true },
    cluster_code: { type: String, trim: true, default: '', index: true },
    dynamic_fields: { type: mongoose.Schema.Types.Mixed, default: {} },
    source_file_name: { type: String, trim: true, default: '' },
    promotion_status: {
      type: String,
      enum: ['active', 'promoted_to_verified_epc'],
      default: 'active',
      index: true
    },
    promoted_epc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', default: null },
    promoted_gstin: { type: String, trim: true, uppercase: true, default: null },
    promoted_at: { type: Date, default: null },
    is_admin_deleted: { type: Boolean, default: false, index: true },
    deleted_at: { type: Date, default: null, index: true }
  },
  {
    collection: 'marketing_segment_contacts',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

schema.pre('validate', function () {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }
  const normalized = normalizePhone10(this.phone || this.phone_normalized);
  if (normalized) {
    this.phone_normalized = normalized;
  }
});

schema.index({ segment_id: 1, deleted_at: 1, state: 1, district: 1 });
schema.index({ segment_id: 1, deleted_at: 1, state: 1, cluster_name: 1, district: 1 });
schema.index({ email: 1, deleted_at: 1 });
schema.index({ phone_normalized: 1, deleted_at: 1 });
schema.index({ segment_id: 1, promotion_status: 1 });
schema.index({ segment_id: 1, is_admin_deleted: 1, promotion_status: 1 });

module.exports = db.model('marketing_segment_contacts', schema);
