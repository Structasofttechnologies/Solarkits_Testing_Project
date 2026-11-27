const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const fieldDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['email', 'name', 'phone', 'state', 'district', 'cluster', 'custom'],
      default: 'custom'
    }
  },
  { _id: false }
);

const selectedKitSchema = new mongoose.Schema(
  {
    kit_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    kit_name: { type: String, trim: true, default: '' },
    capacity: { type: Number, default: 0 },
    solar_kit_name: { type: String, trim: true, default: '' },
    category_name: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['combo_kit', 'solar_kit'], default: 'combo_kit' }
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    segment_type: { type: String, required: false, trim: true, default: '' },
    purpose: {
      type: String,
      enum: ['epc_signup_login', 'franchisee_signup_login', 'kit_sales'],
      default: 'epc_signup_login',
      required: true,
      index: true
    },
    selected_kits: { type: [selectedKitSchema], default: [] },
    description: { type: String, trim: true, default: '' },
    field_definitions: { type: [fieldDefinitionSchema], default: [] },
    contact_count: { type: Number, default: 0 },
    email_count: { type: Number, default: 0 },
    phone_count: { type: Number, default: 0 },
    promoted_count: { type: Number, default: 0 },
    last_uploaded_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    deleted_at: { type: Date, default: null, index: true }
  },
  {
    collection: 'marketing_segments',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

schema.index({ status: 1, deleted_at: 1 });
schema.index({ purpose: 1, deleted_at: 1 });
schema.index({ segment_type: 1, deleted_at: 1 });

module.exports = db.model('marketing_segments', schema);
