const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * Single line item in reseller procurement order.
 * Financial amounts stored in integer Paise (1 INR = 100 Paise).
 */
const procurementItemSchema = new mongoose.Schema({
  scope_type:       { type: String, enum: ['product', 'kit'], required: true },
  product_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', default: null },
  item_name:        { type: String, required: true },
  quantity:         { type: Number, required: true, min: 1 },
  unit_price_paise: { type: Number, required: true, min: 0 }, // Integer paise
  gst_rate:         { type: Number, default: 13.8 },
  tax_paise:        { type: Number, required: true, min: 0 },
  total_price_paise:{ type: Number, required: true, min: 0 },
}, { _id: false });

/**
 * reseller_procurement_orders — B2B stock purchase orders placed by resellers from company warehouse.
 *
 * Collection: reseller_procurement_orders
 */
const schema = new mongoose.Schema({
  procurement_order_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    default: null,
  },
  items: [procurementItemSchema],

  // ── Integer Paise Totals ────────────────────────────────────────────────
  subtotal_paise:     { type: Number, required: true, min: 0 },
  tax_total_paise:    { type: Number, required: true, min: 0 },
  shipping_fee_paise: { type: Number, default: 0, min: 0 },
  grand_total_paise:  { type: Number, required: true, min: 0 },

  order_status: {
    type: String,
    enum: ['draft', 'submitted', 'payment_pending', 'paid', 'allocated', 'dispatched', 'delivered', 'cancelled'],
    default: 'submitted',
  },
  payment_status: {
    type: String,
    enum: ['pending', 'captured', 'failed', 'refunded'],
    default: 'pending',
  },
  payment_reference: {
    type: String,
    default: null,
    trim: true,
  },
  razorpay_order_id: {
    type: String,
    default: null,
    trim: true,
  },

  dispatch_date: { type: Date, default: null },
  delivery_date: { type: Date, default: null },
  cancellation_reason: { type: String, default: null },

  created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  collection: 'reseller_procurement_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, order_status: 1 });
schema.index({ created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_procurement_orders', schema);
