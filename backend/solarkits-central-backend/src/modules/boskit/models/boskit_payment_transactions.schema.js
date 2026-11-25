const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_payment_transactions — Individual Razorpay webhook events and payment actions.
 *
 * IDEMPOTENCY: razorpay_event_id is unique to prevent duplicate webhook processing.
 * Every webhook event is logged here before any business logic runs.
 *
 * Collection: boskit_payment_transactions
 */

const schema = new mongoose.Schema({
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_payments',
    default: null,
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_orders',
    default: null,
  },

  // ── Razorpay Event ────────────────────────────────────────────────────────
  razorpay_event_id:   { type: String, default: null, trim: true }, // unique idempotency key
  razorpay_order_id:   { type: String, default: null, trim: true },
  razorpay_payment_id: { type: String, default: null, trim: true },
  event_type:          { type: String, required: true, trim: true }, // 'payment.captured', 'payment.failed', etc.

  // ── Payload Snapshot ──────────────────────────────────────────────────────
  raw_payload:  { type: mongoose.Schema.Types.Mixed, default: null }, // Full webhook body
  signature_verified: { type: Boolean, default: false },

  // ── Processing Result ─────────────────────────────────────────────────────
  processing_status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'duplicate', 'failed', 'ignored'],
    default: 'received',
  },
  processing_error: { type: String, default: null, trim: true },
  processed_at: { type: Date, default: null },

  // ── Amount ────────────────────────────────────────────────────────────────
  amount_paise: { type: Number, default: null, min: 0 },
  currency:     { type: String, default: 'INR' },
}, {
  collection: 'boskit_payment_transactions',
  timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable log
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Unique idempotency index — duplicate webhook events will fail to insert
schema.index({ razorpay_event_id: 1 }, { unique: true, sparse: true });
schema.index({ payment_id: 1 });
schema.index({ order_id: 1 });
schema.index({ event_type: 1, processing_status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_payment_transactions', schema);
