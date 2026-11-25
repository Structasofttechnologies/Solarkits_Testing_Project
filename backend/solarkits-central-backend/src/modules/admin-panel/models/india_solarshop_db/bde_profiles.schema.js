const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_profiles — Master record for Business Development Executives (BDE).
 *
 * Collection: bde_profiles
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  profile_photo: {
    type: String,
    default: null,
    trim: true,
  },
  mobile_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
  },
  address: {
    type: String,
    default: null,
    trim: true,
    maxlength: 500,
  },
  country_name: {
    type: String,
    default: 'India',
    trim: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    default: null,
  },
  state_name: {
    type: String,
    default: null,
    trim: true,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    default: null,
  },
  district_name: {
    type: String,
    default: null,
    trim: true,
  },
  joining_date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['draft', 'kyc_pending', 'kyc_verified', 'active', 'suspended', 'inactive'],
    default: 'draft',
    index: true,
  },
  kyc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_kycs',
    default: null,
  },
  // Authentication & Security fields
  password_hash: {
    type: String,
    default: null,
    select: false, // don't return by default in queries
  },
  is_first_login: {
    type: Boolean,
    default: true,
  },
  // Onboarding Permissions / Decision controls
  can_onboard_epc: {
    type: Boolean,
    default: true,
  },
  can_onboard_franchise: {
    type: Boolean,
    default: true,
  },
  token_version: {
    type: Number,
    default: 0,
  },
  last_login_at: {
    type: Date,
    default: null,
  },
  last_login_ip: {
    type: String,
    default: null,
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
  collection: 'bde_profiles',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

schema.virtual('name').get(function () {
  return this.full_name;
});

schema.virtual('employee_id').get(function () {
  return this.bde_id;
});

schema.virtual('mobile').get(function () {
  return this.mobile_number;
});

module.exports = india_solarshop_db.model('bde_profiles', schema);
