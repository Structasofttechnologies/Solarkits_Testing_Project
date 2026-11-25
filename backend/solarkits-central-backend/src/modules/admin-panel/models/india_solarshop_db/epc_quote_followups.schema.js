const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_quote_followups — Scheduled and recorded follow-up interactions for EPC quotations.
 *
 * Separate from bde_follow_ups (which are lead-scoped).
 * These are specifically linked to a generated quote document.
 *
 * Collection: epc_quote_followups
 */
const schema = new mongoose.Schema(
  {
    // ── References ────────────────────────────────────────────────────────────
    quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_quotes',
      required: true,
    },
    quote_number: { type: String, default: null, trim: true, uppercase: true },
    is_trial_kit: { type: Boolean, default: false, index: true },

    epc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      required: true,
    },
    epc_name: { type: String, default: null, trim: true },

    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
    },

    bde_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bde_profiles',
      default: null,
    },

    // ── Schedule ──────────────────────────────────────────────────────────────
    last_follow_up_date: { type: Date, default: null },
    next_follow_up_date: { type: Date, required: true, index: true },
    follow_up_time:      { type: String, default: null, trim: true },

    // ── Mode & Content ────────────────────────────────────────────────────────
    follow_up_mode: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'meeting', 'site_visit', 'other'],
      default: 'call',
    },
    remarks: { type: String, default: null, trim: true, maxlength: 1000 },

    // ── Expectation Capture ───────────────────────────────────────────────────
    expected_quantity:        { type: Number, default: null, min: 0 },
    expected_order_date:      { type: Date, default: null },
    expected_order_value_paise: { type: Number, default: null, min: 0 },
    probability_pct:          { type: Number, default: null, min: 0, max: 100 },

    // ── Outcome ───────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'scheduled',
        'completed',
        'rescheduled',
        'interested',
        'negotiation',
        'order_expected',
        'converted',
        'lost',
        'not_reachable',
        'not_interested',
        'overdue',
      ],
      default: 'scheduled',
    },
    outcome_notes: { type: String, default: null, trim: true, maxlength: 1000 },
    completed_at:  { type: Date, default: null },

    // ── Assignment ────────────────────────────────────────────────────────────
    assigned_to:      { type: mongoose.Schema.Types.ObjectId, default: null },
    assigned_to_role: { type: String, enum: ['reseller', 'bde'], default: 'reseller' },

    // ── Audit ─────────────────────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, required: true },
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'epc_quote_followups',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
schema.index({ quote_id: 1, created_at: -1 });
schema.index({ franchisee_id: 1, next_follow_up_date: 1, status: 1 });
schema.index({ bde_id: 1, next_follow_up_date: 1, status: 1 });
schema.index({ epc_id: 1, next_follow_up_date: 1 });
schema.index({ next_follow_up_date: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_quote_followups', schema);
