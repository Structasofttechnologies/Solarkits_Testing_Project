const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
    index: true
  },
  email_consent: {
    type: Boolean,
    default: false
  },
  whatsapp_consent: {
    type: Boolean,
    default: false
  },
  consent_source: {
    type: String,
    enum: ['signup', 'first_login_popup', 'new_kit_modal', 'profile_settings', 'epc_profile_page', 'admin_import', 'portal', 'register'],
    default: 'first_login_popup'
  },
  company_name: {
    type: String,
    default: null,
    trim: true
  },
  registered_email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },
  registered_mobile: {
    type: String,
    default: null,
    trim: true
  },
  ip_address: {
    type: String,
    default: null
  },
  user_agent: {
    type: String,
    default: null
  },
  consent_wording: {
    type: String,
    default: 'I agree to receive promotional communication about relevant solar kits, discounts, product updates and marketing campaigns.'
  },
  consent_version: {
    type: String,
    default: 'v1.0'
  },
  withdrawn_at: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'epc_marketing_consents',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

schema.index({ epc_id: 1, is_active: 1 });
schema.index({ email_consent: 1, whatsapp_consent: 1 });

module.exports = db.model('epc_marketing_consents', schema);
