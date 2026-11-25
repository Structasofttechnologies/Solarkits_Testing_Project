const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_wallet_ledgers — Double-entry audit ledger for Reseller wallet movements.
 * Enforces financial idempotency via unique idempotency_key index.
 * Collection: reseller_wallet_ledgers
 *
 * Phase R9:  Integer Paise accounting, TDS, and TCS fields added.
 * Phase R10: Added 'refund', 'failed_payout', 'platform_fee' transaction types.
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  transaction_type: {
    type: String,
    enum: [
      'commission_credit',     // Net commission earned (after TDS/TCS) — credited to available
      'po_commission_credit',  // Franchisee PO Order Commission credited
      'payout_hold',            // Funds moved available → pending upon payout request
      'payout_debit',        // Funds debited from pending upon successful payout
      'payout_reversal',     // Funds returned pending → available upon rejection
      'failed_payout',       // Funds returned pending → available upon payout failure
      'refund',              // Commission reversed due to order refund/cancellation
      'platform_fee',        // Platform fee debit
      'bonus',               // Incentive bonus credit
      'adjustment',          // Admin ledger adjustment (requires reason)
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true, // Positive for credit/bonus, negative for debits/holds
  },
  balance_type: {
    type: String,
    enum: ['available', 'pending'],
    default: 'available',
  },
  balance_after: {
    type: Number,
    required: true,
  },

  // ── Phase R9+: Integer Paise Accounting Fields ──────────────────────────
  gross_amount_paise:   { type: Number, default: 0 },
  tds_amount_paise:     { type: Number, default: 0 },
  tcs_amount_paise:     { type: Number, default: 0 },
  net_amount_paise:     { type: Number, default: 0 },
  balance_after_paise:  { type: Number, default: 0 },

  reference_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  reference_payout_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'reseller_payout_requests',
    default: null,
  },
  idempotency_key: {
    type: String,
    required: true,
    unique: true,
  },
  narration: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, {
  collection: 'reseller_wallet_ledgers',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, created_at: -1 });
schema.index({ reference_payout_id: 1 }, { sparse: true });
schema.index({ reference_order_id: 1 }, { sparse: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_wallet_ledgers', schema);
