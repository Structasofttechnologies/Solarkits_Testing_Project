const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    is_active: { type: Boolean, default: true },
    filters: {
      epc_groups: {
        registered_epc: { type: Boolean, default: true },
        verified_epc: { type: Boolean, default: true },
        buyer_epc: { type: Boolean, default: true }
      },
      exclude_groups: [{ type: String }],
      epc_types: [{ type: mongoose.Schema.Types.ObjectId }],
      purchase_activity: {
        type: String,
        enum: ['all', 'never_purchased', 'active_buyer', 'inactive_buyer'],
        default: 'all'
      },
      last_order_days: { type: Number, default: 90 },
      area_type: {
        type: String,
        enum: ['all_india', 'state', 'cluster', 'warehouse', 'store'],
        default: 'all_india'
      },
      state_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      state_names: [{ type: String }],
      cluster_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      cluster_names: [{ type: String }],
      warehouse_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      district_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      industry_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      kit_ids: [{ type: mongoose.Schema.Types.ObjectId }],
      channel: { type: String, enum: ['email', 'whatsapp', 'both', null], default: null },
      include_imported_leads: { type: Boolean, default: true },
      require_consent: { type: Boolean, default: false }
    },
    cached_count: { type: Number, default: 0 },
    last_computed_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'marketing_audience_segments',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_audience_segments', schema);
