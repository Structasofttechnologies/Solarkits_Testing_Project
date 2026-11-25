const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_margin_estimates — Saved margin estimates created by EPCs or Franchisees.
 *
 * Captures an immutable snapshot of kit details, BOM item rates, GST calculations,
 * and EPC margin configurations at the time the estimate is saved.
 * Can be converted into a formal EPC Quote (epc_quotes).
 *
 * Collection: epc_margin_estimates
 */

const bomItemSnapshotSchema = new mongoose.Schema(
  {
    bom_id:             { type: mongoose.Schema.Types.ObjectId, default: null },
    name:               { type: String, required: true },
    code:               { type: String, required: true },
    rate_type:          { type: String, required: true },
    unit:               { type: String, default: 'Nos' },
    applied_rate:       { type: Number, required: true },
    multiplier_or_qty:  { type: Number, required: true, default: 1 },
    amount:             { type: Number, required: true },
    gst_applicable:     { type: Boolean, default: true },
    gst_rate:           { type: Number, default: 18 },
    is_mandatory:       { type: Boolean, default: true },
    is_included_in_kit: { type: Boolean, default: false },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    // ── Identity & Status ─────────────────────────────────────────────────────
    estimate_number: { type: String, required: true, trim: true, uppercase: true },
    title:           { type: String, default: 'Solar Project Margin Estimate', trim: true },
    status: {
      type: String,
      enum: ['draft', 'saved', 'expired', 'quote_generated', 'archived'],
      default: 'saved',
      index: true,
    },

    // ── Stakeholder Identity & Attribution ────────────────────────────────────
    epc_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true, index: true },
    epc_snapshot:        { type: Object, default: null },
    franchisee_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null, index: true },
    franchisee_snapshot: { type: Object, default: null },
    bde_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
    bde_snapshot:        { type: Object, default: null },

    created_by:      { type: mongoose.Schema.Types.ObjectId, required: true },
    created_by_role: { type: String, enum: ['epc', 'reseller', 'bde', 'cms_user'], default: 'epc', required: true },

    // ── Hierarchy Snapshots ───────────────────────────────────────────────────
    industry_type_snapshot:    { type: Object, default: null }, // { id, name, code }
    project_type_snapshot:     { type: Object, default: null }, // { id, name, code }
    project_sub_type_snapshot: { type: Object, default: null }, // { id, name, code }

    // ── Solution / Kit Details ────────────────────────────────────────────────
    solution_id:       { type: mongoose.Schema.Types.Mixed, required: true },
    solution_type:     { type: String, enum: ['combo_kit', 'customize_kit'], default: 'combo_kit' },
    solution_snapshot: { type: Object, default: null },
    kit_capacity_kw:   { type: Number, required: true, min: 0 },
    quantity:          { type: Number, required: true, min: 1, default: 1 },
    total_kw:          { type: Number, required: true, min: 0 },
    kit_unit_price:    { type: Number, required: true, min: 0 }, // in ₹
    kit_total_price:   { type: Number, required: true, min: 0 }, // in ₹

    // ── BOM Items Snapshot ────────────────────────────────────────────────────
    bom_snapshot: [bomItemSnapshotSchema],
    bom_total_cost: { type: Number, default: 0, min: 0 },

    // ── Delivery & Location ───────────────────────────────────────────────────
    delivery_snapshot:  { type: Object, default: null },
    warehouse_snapshot: { type: Object, default: null },

    // ── Financials & Margin ───────────────────────────────────────────────────
    gst_calculation_method:   { type: String, enum: ['on_cost', 'on_cost_plus_margin'], default: 'on_cost_plus_margin' },
    gst_rate:                 { type: Number, default: 18 },
    gst_snapshot:             { type: Object, default: null },

    margin_input_type:        { type: String, enum: ['amount', 'percentage'], default: 'amount' },
    margin_percentage:        { type: Number, default: 0, min: 0 },
    margin_amount:            { type: Number, default: 0, min: 0 },

    project_cost_before_gst:  { type: Number, required: true, min: 0 },
    gst_amount:               { type: Number, required: true, min: 0 },
    total_project_cost:       { type: Number, required: true, min: 0 }, // kit + BOM (before margin)
    estimated_customer_price: { type: Number, required: true, min: 0 }, // Final customer selling price
    profit_amount:            { type: Number, default: 0 },

    // ── Timestamps & Conversion ───────────────────────────────────────────────
    rate_effective_date: { type: Date, default: Date.now },
    valid_until:         { type: Date, default: null },
    quote_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'epc_quotes', default: null },
    order_id:            { type: mongoose.Schema.Types.ObjectId, default: null },
    notes:               { type: String, default: null, trim: true, maxlength: 1000 },
    deleted_at:          { type: Date, default: null },
  },
  {
    collection: 'epc_margin_estimates',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ epc_id: 1, status: 1, created_at: -1 });
schema.index({ franchisee_id: 1, status: 1, created_at: -1 });
schema.index({ estimate_number: 1 }, { unique: true });

module.exports = india_solarshop_db.model('epc_margin_estimates', schema);
