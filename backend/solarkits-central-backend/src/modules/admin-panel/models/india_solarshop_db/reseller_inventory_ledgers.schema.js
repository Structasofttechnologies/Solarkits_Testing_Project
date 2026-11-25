const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_inventory_ledgers — Double-entry stock movement ledger for Reseller inventory.
 *
 * All financial valuations stored in integer Paise (1 INR = 100 Paise).
 *
 * Movement types:
 *   - 'procurement_in': Stock added from delivered company procurement order
 *   - 'sales_out': Stock deducted for EPC sales order fulfillment
 *   - 'return_in': Stock returned by customer
 *   - 'adjustment_add': Manual stock audit addition by admin/reseller
 *   - 'adjustment_deduct': Manual stock audit deduction by admin/reseller
 *   - 'reservation_hold': Stock reserved for pending checkout
 *   - 'reservation_release': Reserved stock released back
 *
 * Collection: reseller_inventory_ledgers
 */
const schema = new mongoose.Schema({
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  item_type: {
    type: String,
    enum: ['product', 'kit'],
    required: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    default: null,
  },
  movement_type: {
    type: String,
    enum: [
      'procurement_in',
      'sales_out',
      'return_in',
      'adjustment_add',
      'adjustment_deduct',
      'reservation_hold',
      'reservation_release',
    ],
    required: true,
  },
  quantity: {
    type: Number,
    required: true, // Positive for IN/ADD/RELEASE, negative for OUT/DEDUCT/HOLD
  },
  balance_after: {
    type: Number,
    required: true,
    min: 0,
  },
  unit_cost_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_valuation_paise: {
    type: Number,
    default: 0,
    min: 0,
  },
  reference_type: {
    type: String,
    enum: ['procurement_order', 'epc_order', 'manual_adjustment', 'reservation'],
    required: true,
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  reason: {
    type: String,
    default: null,
    trim: true,
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
}, {
  collection: 'reseller_inventory_ledgers',
  timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable append-only
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, created_at: -1 });
schema.index({ reseller_id: 1, item_type: 1, product_id: 1, kit_id: 1 });
schema.index({ reference_type: 1, reference_id: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_inventory_ledgers', schema);
