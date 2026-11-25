const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_wallets — Primary Wallet balance tracking per Reseller.
 * Collection: reseller_wallets
 *
 * Phase R9:  Integer Paise accounting fields added alongside backward-compatible INR fields.
 * Phase R10: Added gross_earned_paise, total_refunds_paise, platform_fees_paise.
 *
 * Authoritative balance formula (all values in paise):
 *   available_balance_paise
 *     = gross_earned_paise
 *     − tds_deducted_paise
 *     − tcs_deducted_paise
 *     − total_refunds_paise
 *     − platform_fees_paise
 *     − total_withdrawn_paise
 *     − pending_balance_paise
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
    unique: true,
  },

  // ── Backward-compatible INR fields (synced from paise fields) ─────────
  available_balance: { type: Number, required: true, default: 0, min: 0 },
  pending_balance:   { type: Number, required: true, default: 0, min: 0 },
  total_earned:      { type: Number, required: true, default: 0, min: 0 },
  total_withdrawn:   { type: Number, required: true, default: 0, min: 0 },
  gross_earned:      { type: Number, default: 0, min: 0 },
  tds_deducted:      { type: Number, default: 0, min: 0 },

  // ── Phase R9+: Integer Paise Accounting Fields (AUTHORITATIVE) ───────
  available_balance_paise: { type: Number, default: 0, min: 0 },
  pending_balance_paise:   { type: Number, default: 0, min: 0 },

  // Gross earned = sum of all commission credits BEFORE tax deductions
  gross_earned_paise: { type: Number, default: 0, min: 0 },

  // Net earned = gross − TDS − TCS (what actually lands in available_balance)
  total_earned_paise:      { type: Number, default: 0, min: 0 },

  total_withdrawn_paise:   { type: Number, default: 0, min: 0 },

  // Tax deductions
  tds_deducted_paise: { type: Number, default: 0, min: 0 },
  tcs_deducted_paise: { type: Number, default: 0, min: 0 },

  // Phase R10: Refunds and platform fee tracking
  total_refunds_paise:   { type: Number, default: 0, min: 0 },
  platform_fees_paise:   { type: Number, default: 0, min: 0 },

  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['active', 'frozen'],
    default: 'active',
  },
}, {
  collection: 'reseller_wallets',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

// Virtual: net available in paise (computed on read for verification)
schema.virtual('computed_available_paise').get(function () {
  return (
    (this.total_earned_paise || 0)
    - (this.total_refunds_paise || 0)
    - (this.platform_fees_paise || 0)
    - (this.total_withdrawn_paise || 0)
    - (this.pending_balance_paise || 0)
  );
});

module.exports = india_solarshop_db.model('reseller_wallets', schema);
