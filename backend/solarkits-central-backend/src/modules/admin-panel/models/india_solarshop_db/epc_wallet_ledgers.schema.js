const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_wallet_ledgers — Immutable transaction ledger for EPC wallet entries.
 *
 * Each record represents a credit (margin earned) or debit (refund/reversal).
 * Idempotency key prevents duplicate entries for the same order event.
 *
 * All monetary fields stored in integer Paise (1 INR = 100 Paise).
 *
 * Collection: epc_wallet_ledgers
 */
const schema = new mongoose.Schema({
  epc_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
  },

  // ── Reference ────────────────────────────────────────────────────────────────
  reference_type: {
    type: String,
    enum: ['epc_order_commission', 'refund_reversal', 'cancellation_reversal', 'admin_adjustment', 'withdrawal', 'icici_ecollection', 'po_unfulfilled_penalty'],
    required: true,
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    comment: 'epc_order _id or payout_request _id',
  },

  // ── Idempotency ───────────────────────────────────────────────────────────────
  idempotency_key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    comment: 'Prevents duplicate credits: format epc_order:<orderId>:commission',
  },

  // ── Amount ───────────────────────────────────────────────────────────────────
  credit_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  debit_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  net_paise: {
    type: Number,
    default: 0,
    comment: 'credit_paise - debit_paise',
  },

  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
  },

  // ── Settlement Status ─────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'available', 'reversed', 'withdrawn'],
    default: 'pending',
    comment: 'pending → available after settlement_period_days; reversed on cancellation/refund',
  },

  settle_after: {
    type: Date,
    default: null,
    comment: 'Datetime when this entry becomes available (after settlement window)',
  },
  settled_at: {
    type: Date,
    default: null,
  },
  reversed_at: {
    type: Date,
    default: null,
  },
  reversal_reason: {
    type: String,
    default: null,
    trim: true,
  },

  // ── Audit ────────────────────────────────────────────────────────────────────
  description: {
    type: String,
    default: null,
    trim: true,
  },
  created_by_type: {
    type: String,
    enum: ['system', 'admin', 'epc'],
    default: 'system',
  },
  created_by_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, {
  collection: 'epc_wallet_ledgers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ epc_account_id: 1, created_at: -1 });
schema.index({ reference_id: 1, reference_type: 1 });
schema.index({ status: 1, settle_after: 1 });

schema.virtual('id').get(function () { return this._id; });
schema.virtual('credit_inr').get(function () { return (this.credit_paise / 100).toFixed(2); });
schema.virtual('debit_inr').get(function () { return (this.debit_paise / 100).toFixed(2); });

module.exports = india_solarshop_db.model('epc_wallet_ledgers', schema);
