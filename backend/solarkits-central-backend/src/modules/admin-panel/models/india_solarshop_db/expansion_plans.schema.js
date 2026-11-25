const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * expansion_plans — Strategic expansion targets set by Admin for BDEs and territories.
 *
 * Collection: expansion_plans
 */
const schema = new mongoose.Schema({
  plan_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  title: { type: String, required: true, trim: true },
  financial_year: { type: String, required: true, default: '2026-2027', trim: true },
  period_type: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual'],
    default: 'quarterly',
  },
  quarter: { type: Number, min: 1, max: 4, default: 3 },
  month: { type: Number, min: 1, max: 12, default: 8 },

  // Territory Scope
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_name: { type: String, default: null, trim: true },
  district_ids: [{ type: mongoose.Schema.Types.ObjectId }],
  district_names: [{ type: String, trim: true }],

  // Franchisee Plans Scope
  plan_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'reseller_plans' }],
  plan_names: [{ type: String, trim: true }],

  // Assigned BDE
  assigned_bde_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
  assigned_bde_name: { type: String, default: null, trim: true },

  // Targets
  target_signups: { type: Number, required: true, default: 10, min: 0 },
  target_fee_paid: { type: Number, required: true, default: 8, min: 0 },
  target_operational_stores: { type: Number, required: true, default: 5, min: 0 },

  // Realized Actuals
  actual_signups: { type: Number, default: 0, min: 0 },
  actual_fee_paid: { type: Number, default: 0, min: 0 },
  actual_operational_stores: { type: Number, default: 0, min: 0 },

  // Dates & Priority
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'high',
  },
  status: {
    type: String,
    enum: ['PLANNED', 'ON_TRACK', 'AT_RISK', 'BEHIND_TARGET', 'COMPLETED'],
    default: 'PLANNED',
  },

  notes: { type: String, default: null, trim: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'expansion_plans',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ assigned_bde_id: 1, financial_year: 1 });
schema.index({ state_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('expansion_plans', schema);
