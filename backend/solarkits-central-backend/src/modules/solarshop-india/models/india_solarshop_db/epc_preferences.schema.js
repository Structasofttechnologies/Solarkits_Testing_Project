const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
    unique: true,
    index: true
  },
  // Selected industry verticals (e.g., Solar PV, Solar Agriculture, Solar EV, Energy Storage...)
  selected_industry_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: []
  }],
  selected_industry_names: [{
    type: String,
    trim: true
  }],
  // Selected project categories under those industries
  selected_category_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    default: []
  }],
  selected_category_names: [{
    type: String,
    trim: true
  }],
  // Selected project subcategories under categories
  selected_subcategory_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_filter_subcategories',
    default: []
  }],
  selected_subcategory_names: [{
    type: String,
    trim: true
  }],
  // Selected kit types / combo kits
  selected_kit_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    default: []
  }],
  selected_kit_names: [{
    type: String,
    trim: true
  }],
  // Status: 'submitted' (completed preferences), 'skipped' (skipped for now), 'not_prompted'
  status: {
    type: String,
    enum: ['submitted', 'skipped', 'not_prompted'],
    default: 'not_prompted'
  },
  // Marketing consent copies
  email_marketing_consent: {
    type: Boolean,
    default: false
  },
  whatsapp_marketing_consent: {
    type: Boolean,
    default: false
  },
  // Timestamp when EPC last submitted or dismissed kit alerts
  last_seen_kit_at: {
    type: Date,
    default: Date.now
  },
  submitted_at: {
    type: Date,
    default: null
  },
  // History tracking for audit and compliance
  history: [{
    action: { type: String, required: true }, // e.g. 'FIRST_LOGIN_SUBMIT', 'FIRST_LOGIN_SKIP', 'ADD_NEW_KIT_PREFERENCE', 'PROFILE_UPDATE'
    details: { type: mongoose.Schema.Types.Mixed },
    created_at: { type: Date, default: Date.now }
  }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null }
}, {
  collection: 'epc_preferences',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

schema.index({ epc_id: 1, status: 1 });
schema.index({ selected_industry_ids: 1 });
schema.index({ selected_kit_ids: 1 });
schema.index({ email_marketing_consent: 1, whatsapp_marketing_consent: 1 });

module.exports = db.model('epc_preferences', schema);
