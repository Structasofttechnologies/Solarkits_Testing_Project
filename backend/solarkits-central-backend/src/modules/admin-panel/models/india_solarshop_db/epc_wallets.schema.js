const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_wallets — EPC partner wallet for margin earnings.
 *
 * Tracks balance from EPC margin on completed orders.
 * All monetary fields stored in integer Paise (1 INR = 100 Paise).
 *
 * Collection: epc_wallets
 */
const schema = new mongoose.Schema({
  epc_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
    unique: true,
  },

  // ── Balances (Paise) ────────────────────────────────────────────────────────
  balance_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  pending_paise: {
    type: Number,
    default: 0,
    min: 0,
    comment: 'Earnings from orders in settlement window — not yet available for withdrawal',
  },
  lifetime_earned_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  lifetime_withdrawn_paise: {
    type: Number,
    default: 0,
    min: 0,
  },

  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true,
  },

  // ── Settlement Config ────────────────────────────────────────────────────────
  settlement_period_days: {
    type: Number,
    default: 7,
    comment: 'Days after order confirmation before pending moves to available',
  },

  last_settlement_at: {
    type: Date,
    default: null,
  },

  is_frozen: {
    type: Boolean,
    default: false,
    comment: 'Admin can freeze wallet to prevent withdrawals (e.g. dispute)',
  },

  frozen_reason: {
    type: String,
    default: null,
    trim: true,
  },
}, {
  collection: 'epc_wallets',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });
schema.virtual('balance_inr').get(function () { return (this.balance_paise / 100).toFixed(2); });
schema.virtual('pending_inr').get(function () { return (this.pending_paise / 100).toFixed(2); });

module.exports = india_solarshop_db.model('epc_wallets', schema);
