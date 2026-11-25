const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_payments — Payment records for BOSKIT orders.
 *
 * One payment record per order. Detailed transactions tracked in boskit_payment_transactions.
 *
 * All monetary values in Paise.
 *
 * Collection: boskit_payments
 */

const schema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_orders',
    required: true,
  },
  order_number: { type: String, required: true, trim: true },

  // ── Buyer ─────────────────────────────────────────────────────────────────
  buyer_type: { type: String, enum: ['distributor', 'dealer'], required: true },
  buyer_id:   { type: mongoose.Schema.Types.ObjectId, required: true },

  // ── Amount ────────────────────────────────────────────────────────────────
  amount_paise:     { type: Number, required: true, min: 0 },
  currency:         { type: String, default: 'INR' },
  amount_refunded_paise: { type: Number, default: 0, min: 0 },

  // ── Razorpay ──────────────────────────────────────────────────────────────
  razorpay_order_id:   { type: String, default: null, trim: true },
  razorpay_payment_id: { type: String, default: null, trim: true },
  razorpay_signature:  { type: String, default: null, trim: true },

  // ── Status ────────────────────────────────────────────────────────────────
  payment_status: {
    type: String,
    enum: ['pending', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  payment_method:  { type: String, default: null, trim: true }, // upi, card, netbanking, etc.
  payment_gateway: { type: String, default: 'razorpay' },

  // ── Timestamps ────────────────────────────────────────────────────────────
  captured_at:   { type: Date, default: null },
  failed_at:     { type: Date, default: null },
  refunded_at:   { type: Date, default: null },

  // ── Error Info ────────────────────────────────────────────────────────────
  failure_reason: { type: String, default: null, trim: true },
}, {
  collection: 'boskit_payments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ order_id: 1 });
schema.index({ buyer_type: 1, buyer_id: 1, created_at: -1 });
schema.index({ razorpay_order_id: 1 }, { sparse: true });
schema.index({ razorpay_payment_id: 1 }, { sparse: true });
schema.index({ payment_status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_payments', schema);
