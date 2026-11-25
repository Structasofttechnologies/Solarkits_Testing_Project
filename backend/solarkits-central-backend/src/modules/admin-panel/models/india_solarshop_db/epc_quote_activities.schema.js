const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_quote_activities — Append-only activity log per EPC quote.
 *
 * Records every status change, share event, PDF download, follow-up addition,
 * order conversion, and revision. Never update or delete entries.
 *
 * Collection: epc_quote_activities
 */
const schema = new mongoose.Schema(
  {
    quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_quotes',
      required: true,
      index: true,
    },
    quote_number: { type: String, default: null, trim: true, uppercase: true },

    // ── Action ────────────────────────────────────────────────────────────────
    // Naming: ENTITY_VERB e.g. QUOTE_GENERATED, STATUS_CHANGED, FOLLOW_UP_ADDED
    action: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },

    old_status: { type: String, default: null },
    new_status: { type: String, default: null },

    remarks: { type: String, default: null, trim: true, maxlength: 1000 },

    // ── Actor ─────────────────────────────────────────────────────────────────
    performed_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    performed_by_role: {
      type: String,
      enum: ['reseller', 'bde', 'cms_user', 'epc', 'system', 'admin'],
      required: true,
    },
    performed_by_name: { type: String, default: null, trim: true },

    // ── Extra context (freeform) ───────────────────────────────────────────────
    // e.g. { order_id, order_number } for conversion
    //      { method, recipient } for sharing
    //      { revision_number, new_quote_id } for revision
    metadata: { type: Object, default: null },
  },
  {
    collection: 'epc_quote_activities',
    timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable — no updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ quote_id: 1, created_at: -1 });
schema.index({ performed_by: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_quote_activities', schema);
