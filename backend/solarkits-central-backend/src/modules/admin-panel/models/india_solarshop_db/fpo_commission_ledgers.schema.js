const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * fpo_commission_ledgers — Immutable commission entries for Franchisee Purchase Orders.
 *
 * Written by franchisee.commission.service.postCommission().
 * Protected by idempotency_key to prevent duplicate credits.
 *
 * All monetary values in integer Paise.
 *
 * Collection: fpo_commission_ledgers
 */
const schema = new mongoose.Schema(
  {
    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      required: true,
    },
    fpo_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'fpo_orders',
      required: true,
    },
    po_number: { type: String, required: true, trim: true, uppercase: true },

    // ── Commission Calculation ────────────────────────────────────────────────
    commission_method: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED_PER_KIT'],
      required: true,
    },
    eligible_kit_quantity:  { type: Number, required: true, min: 0 }, // kits that earned commission
    gross_eligible_paise:   { type: Number, required: true, min: 0 }, // order amount in paise (for PERCENTAGE)
    commission_paise:       { type: Number, required: true, min: 0 }, // gross commission before TDS/TCS
    tds_paise:              { type: Number, default: 0, min: 0 },
    tcs_paise:              { type: Number, default: 0, min: 0 },
    net_commission_paise:   { type: Number, required: true, min: 0 }, // after TDS/TCS
    max_cap_applied:        { type: Boolean, default: false }, // true if max_commission_paise cap was hit

    // ── References ────────────────────────────────────────────────────────────
    commission_rule_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_commission_rules', default: null },
    wallet_ledger_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'reseller_wallet_ledgers', default: null },

    // ── Settlement ────────────────────────────────────────────────────────────
    calculation_stage: {
      type: String,
      enum: ['ORDER_CONFIRMED', 'PAYMENT_CAPTURED', 'DISPATCHED', 'DELIVERED', 'RETURN_PERIOD_COMPLETED'],
      required: true,
    },
    settlement_status: {
      type: String,
      enum: ['PENDING', 'SETTLED', 'PAID', 'ON_HOLD', 'FAILED', 'REVERSED'],
      default: 'PENDING',
    },
    payout_utr:  { type: String, default: null, trim: true },
    settled_at:  { type: Date, default: null },
    reversed_at: { type: Date, default: null },
    reversal_reason: { type: String, default: null, maxlength: 1000 },

    // ── Idempotency ───────────────────────────────────────────────────────────
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ── Audit ─────────────────────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    collection: 'fpo_commission_ledgers',
    timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ franchisee_id: 1, settlement_status: 1, created_at: -1 });
schema.index({ fpo_order_id: 1 });
schema.index({ settlement_status: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('fpo_commission_ledgers', schema);
