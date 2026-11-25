const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_variation_commissions — Tiered quantity variation commission rules per Franchise.
 *
 * Configured via FranchiseeCommissionSettings in Admin Panel:
 *   - Allows defining flat commission per variation tier (e.g. 5 kits, 10 kits, 35 kits).
 *   - Differentiates between 'po' (Franchisee bulk procurement) and 'loose' (Onboarded EPC / retail order).
 *
 * All amounts stored in integer Paise (1 INR = 100 Paise).
 *
 * Collection: franchisee_variation_commissions
 */
const schema = new mongoose.Schema(
  {
    reseller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      required: true,
      index: true,
    },
    combo_kit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'pc_comobo_kit',
      required: true,
      index: true,
    },
    order_quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    order_type: {
      type: String,
      enum: ['po', 'loose'],
      required: true,
      default: 'loose',
    },
    commission_amount_paise: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cms_users',
      default: null,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cms_users',
      default: null,
    },
  },
  {
    collection: 'franchisee_variation_commissions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound unique index: one commission value per reseller + kit + qty tier + order type
schema.index(
  { reseller_id: 1, combo_kit_id: 1, order_quantity: 1, order_type: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ reseller_id: 1, is_active: 1 });
schema.index({ combo_kit_id: 1, is_active: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_variation_commissions', schema);
