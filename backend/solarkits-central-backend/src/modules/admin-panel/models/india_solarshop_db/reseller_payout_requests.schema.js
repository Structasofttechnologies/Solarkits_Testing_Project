const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_payout_requests — Payout withdrawal request pipeline for Resellers.
 * Collection: reseller_payout_requests
 *
 * Phase R10: Added amount_paise (integer), utr_reference, processed_at, notes,
 *            wallet_balance_at_request snapshot, and 'failed' status.
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },

  // ── Requested Amount ──────────────────────────────────────────────────────
  // Both INR float (legacy) and paise integer (authoritative) are stored.
  amount: {
    type: Number,
    required: true,
    min: 1,
  },
  amount_paise: {
    type: Number,
    required: true,
    min: 100, // minimum ₹1 = 100 paise
    validate: {
      validator: Number.isInteger,
      message: 'amount_paise must be a whole integer (no decimals)',
    },
  },

  // ── Bank / UPI Details Snapshot at time of request ─────────────────────
  bank_details_snapshot: {
    bank_name:            { type: String, required: true },
    account_number:       { type: String, required: true },
    ifsc_code:            { type: String, required: true },
    account_holder_name:  { type: String, required: true },
  },

  // ── Wallet Balance Snapshot at time of request (for audit integrity) ────
  wallet_balance_at_request: {
    available_balance_paise: { type: Number, default: 0 },
    pending_balance_paise:   { type: Number, default: 0 },
    total_earned_paise:      { type: Number, default: 0 },
  },

  // ── Lifecycle Status ─────────────────────────────────────────────────────
  // pending   → Submitted by reseller, awaiting admin review
  // processing → Admin approved, payout being processed
  // paid      → Payout successfully transferred to reseller bank
  // rejected  → Admin rejected, funds returned to available_balance
  // failed    → Payout processing failed (funds returned to available_balance)
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'rejected', 'failed'],
    default: 'pending',
  },

  // ── Payout Settlement Fields ─────────────────────────────────────────────
  utr_reference: {
    type: String,
    default: null,
    trim: true,
  },
  transaction_reference: {
    type: String,
    default: null,
    trim: true,
  },

  // ── Admin Review Fields ──────────────────────────────────────────────────
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  processed_at: {
    type: Date,
    default: null,
  },
  rejection_reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 2000,
  },
  notes: {
    type: String,
    default: null,
    trim: true,
    maxlength: 2000,
  },
  payout_date: {
    type: Date,
    default: null,
  },

  // ── Idempotency Key ──────────────────────────────────────────────────────
  // Set to `PAYOUT_REQUEST_{resellerId}_{timestamp}` on creation.
  // Prevents replay attacks and double-creation.
  idempotency_key: {
    type: String,
    default: null,
    trim: true,
  },
}, {
  collection: 'reseller_payout_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ───────────────────────────────────────────────────────────────
schema.index({ reseller_id: 1, status: 1 });
schema.index({ reseller_id: 1, status: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });
schema.index({ idempotency_key: 1 }, { sparse: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_payout_requests', schema);
