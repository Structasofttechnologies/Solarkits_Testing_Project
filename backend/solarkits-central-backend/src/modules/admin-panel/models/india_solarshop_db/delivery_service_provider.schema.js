const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_service_provider.schema.js
 * Transport Vendor / Delivery Service Provider master.
 * Section 2: TRANSPORT VENDOR ONBOARDING
 */
const schema = new mongoose.Schema({
  provider_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true, // Service Provider Name
  },
  owner_name: {
    type: String,
    required: true,
    trim: true, // Owner/Contact Person
  },
  mobile_number: {
    type: String,
    required: true,
    trim: true,
  },
  customer_service_number: {
    type: String,
    default: null,
    trim: true,
  },
  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true,
  },
  gst_number: {
    type: String,
    default: null,
    trim: true,
    uppercase: true,
  },
  registered_address: {
    type: String,
    default: null,
    trim: true,
  },
  active_states: [{
    state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' },
    state_name: { type: String, trim: true },
  }],
  active_districts: [{
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' },
    district_name: { type: String, trim: true },
    state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' },
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
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
  collection: 'delivery_service_providers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_service_providers', schema);
