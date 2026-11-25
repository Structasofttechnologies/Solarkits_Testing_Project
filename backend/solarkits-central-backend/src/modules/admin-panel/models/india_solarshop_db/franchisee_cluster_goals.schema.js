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
  target_revenue: { type: Number, min: 0, default: 0 }, // in INR (optional)
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
  previous_epc_onboard_days: { type: Number, default: 90 },
  previous_monthly_kits_target: { type: Number, default: 0 },
  previous_annual_kits_target: { type: Number, default: 0 },
  previous_annual_po_orders_goal: { type: Number, default: 0 },
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

  // ── 1. Monthly & 2. Yearly Sell Kit Targets ───────────────────────────────
  monthly_kits_target: {
    type: Number,
    min: 0,
    default: 100, // Monthly Sell Kit Target
  },
  annual_kits_target: {
    type: Number,
    min: 0,
    default: 1200, // Yearly Sell Kit Target
  },

  // ── 3. EPC Onboarding Goal (Day 90 Target) ─────────────────────────────────
  annual_epc_goal: {
    type: Number,
    required: true,
    min: 0,
    default: 50, // Total successfully registered & approved EPCs target
  },
  epc_onboard_days: {
    type: Number,
    default: 90, // Onboarding timeframe (e.g. Day 90 me 50 EPC onboard)
  },

  // ── 4. EPC Active Goal - Yearly ───────────────────────────────────────────
  annual_live_epc_goal: {
    type: Number,
    required: true,
    min: 0,
    default: 60, // EPCs meeting active business criteria yearly
  },
  live_epc_criteria_days: {
    type: Number,
    default: 90, // Active threshold window (e.g. active in last 90 days)
  },

  // ── 5. PO Orders -> Yearly ────────────────────────────────────────────────
  annual_po_orders_goal: {
    type: Number,
    min: 0,
    default: 50, // Year me 50 PO orders create karna hai
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
