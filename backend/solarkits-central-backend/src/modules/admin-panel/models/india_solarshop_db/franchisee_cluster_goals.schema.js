const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_cluster_goals — Annual EPC & Monthly Kit Sales Goal Settings.
 *
 * Configures dual-level performance targets:
 *  1. Annual EPC Onboarding Goal & Live EPC Goal
 *  2. Monthly Kit Sales Targets (quantity, revenue, category breakdown, PO vs Loose)
 *
 * Collection: franchisee_cluster_goals
 */
const monthlyKitGoalSchema = new mongoose.Schema({
  month: { type: Number, required: true, min: 1, max: 12 }, // 1 to 12
  year: { type: Number, required: true },
  target_kits_quantity: { type: Number, required: true, min: 0, default: 0 },
  target_revenue: { type: Number, required: true, min: 0, default: 0 }, // in INR
  target_po_kits: { type: Number, default: 0, min: 0 },
  target_loose_orders: { type: Number, default: 0, min: 0 },
  category_targets: [{
    category_name: { type: String, trim: true },
    target_kits: { type: Number, default: 0 },
  }],
}, { _id: false });

const goalRevisionSchema = new mongoose.Schema({
  revised_at: { type: Date, default: Date.now },
  revised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  effective_date: { type: Date, default: Date.now },
  reason: { type: String, default: null, trim: true },
  previous_annual_epc_goal: { type: Number, default: 0 },
  previous_annual_live_epc_goal: { type: Number, default: 0 },
  previous_monthly_goals: [monthlyKitGoalSchema],
}, { _id: true });

const schema = new mongoose.Schema({
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_clusters',
    required: true,
    index: true,
  },
  franchisee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null,
    index: true,
  },
  financial_year: {
    type: String,
    required: true,
    trim: true,
    // Format: '2026-27'
    index: true,
  },

  // ── Section 4.1: Annual EPC Onboarding Goals ──────────────────────────────
  annual_epc_goal: {
    type: Number,
    required: true,
    min: 0,
    default: 100, // Total successfully registered & approved EPCs
  },
  annual_live_epc_goal: {
    type: Number,
    required: true,
    min: 0,
    default: 60, // EPCs meeting active business criteria
  },
  live_epc_criteria_days: {
    type: Number,
    default: 90, // Active if order or qualifying action in last N days
  },

  // ── Section 4.2: Monthly Kit Sales Goals (12 Months) ──────────────────────
  monthly_kit_goals: [monthlyKitGoalSchema],

  // ── Goal History & Revisions ──────────────────────────────────────────────
  revisions: [goalRevisionSchema],

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
  collection: 'franchisee_cluster_goals',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () {
  return this._id;
});

schema.index({ cluster_id: 1, financial_year: 1 }, { unique: true });
schema.index({ franchisee_id: 1, financial_year: 1 });

module.exports = india_solarshop_db.model('franchisee_cluster_goals', schema);
