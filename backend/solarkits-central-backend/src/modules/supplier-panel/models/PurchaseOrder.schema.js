const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../config/databases');

const schema = new mongoose.Schema({
  po_number:       { type: String, required: true, unique: true },
  warehouse_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  supplier_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', required: true },
  items: [{
    sku_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
    sku_code:         { type: String, required: true },
    qty:              { type: Number, required: true, min: 1 },
    benchmark_price:  { type: Number, required: true },
    benchmark_price_per_watt: { type: Number, default: 0 },
    order_price:      { type: Number, required: true },
    order_price_per_watt: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'invoiced', 'paid', 'delivered', 'cancelled'],
    default: 'pending'
  },
  timeline:        { type: Date, required: true },
  delivery_date:   { type: Date, default: null },
  invoice_no:           { type: String, default: null },
  invoice_date:         { type: Date, default: null },
  invoice_pdf:          { type: String, default: null },
  supplier_gst:         { type: String, default: null },
  // Supplier proforma invoice (set when status → 'invoiced' from supplier panel)
  proforma_invoice_no:  { type: String, default: null },
  proforma_invoice_date:{ type: Date, default: null },
  proforma_invoice_pdf: { type: String, default: null },
  purchase_order_pdf:   { type: String, default: null },
  created_by:      { type: mongoose.Schema.Types.ObjectId, required: true },
}, {
  collection: 'purchase_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('purchase_orders', schema);
