const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_commissions — Commission ledger entries linked to orders.
 *
 * Created per order when applicable commission rule is matched.
 * Tracks approval and payment status.
 *
 * All monetary values in Paise.
 *
 * Collection: boskit_commissions
 */

const schema = new mongoose.Schema({
  // ── Source ────────────────────────────────────────────────────────────────
  platform: { type: String, enum: ['solarkits', 'boskit'], required: true },

  order_id:     { type: mongoose.Schema.Types.ObjectId, default: null }, // boskit_orders or epc_orders
  order_number: { type: String, required: true, trim: true },

  // ── Beneficiary ───────────────────────────────────────────────────────────
  beneficiary_type: {
    type: String,
    enum: ['reseller', 'boskit_distributor'],
    required: true,
  },
  beneficiary_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // ── Commission Rule ───────────────────────────────────────────────────────
  commission_rule_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_commission_rules',
    default: null,
  },
  rule_snapshot: { type: mongoose.Schema.Types.Mixed, default: null }, // Immutable snapshot

  // ── Amounts ───────────────────────────────────────────────────────────────
  commission_type:       { type: String, enum: ['percentage', 'fixed_per_unit', 'fixed_per_order'] },
  commission_value:      { type: Number, required: true }, // pct value OR fixed paise value
  order_amount_paise:    { type: Number, required: true, min: 0 },
  commission_amount_paise:{ type: Number, required: true, min: 0 },

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled', 'on_hold'],
    default: 'pending',
  },
  approved_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  approved_at:  { type: Date, default: null },
  paid_at:      { type: Date, default: null },
  payment_ref:  { type: String, default: null, trim: true },

  notes: { type: String, default: null, trim: true, maxlength: 1000 },
}, {
  collection: 'boskit_commissions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ beneficiary_type: 1, beneficiary_id: 1, status: 1 });
schema.index({ order_id: 1 });
schema.index({ status: 1, created_at: -1 });
schema.index({ platform: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_commissions', schema);
