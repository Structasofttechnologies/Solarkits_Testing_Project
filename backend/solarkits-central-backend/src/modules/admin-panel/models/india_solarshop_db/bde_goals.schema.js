const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * bde_goals — Target and goal assignments for BDEs.
 *
 * Collection: bde_goals
 */
const schema = new mongoose.Schema({
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
    index: true,
  },
  period_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual', 'custom'],
    default: 'monthly',
  },
  month: {
    type: Number,
    min: 1,
    max: 12,
    default: () => new Date().getMonth() + 1,
  },
  quarter: {
    type: Number,
    min: 1,
    max: 4,
    default: () => Math.floor(new Date().getMonth() / 3) + 1,
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear(),
  },
  monthly_franchisee_signup_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  quarterly_franchisee_signup_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  operational_store_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  // EPC & Network Kit Goals
  monthly_epc_lead_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_epc_onboard_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_network_kit_goal: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_trial_kit_goal: {
    type: Number,
    min: 0,
    default: 0,
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
  monthly_signup_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  quarterly_signup_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  operational_store_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_epc_leads_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_epc_onboarded_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_network_kits_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  monthly_trial_kits_achieved: {
    type: Number,
    min: 0,
    default: 0,
  },
  start_date: {
    type: Date,
    default: null,
  },
  end_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired'],
    default: 'active',
    index: true,
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  notes: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
}, {
  collection: 'bde_goals',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('bde_goals', schema);
