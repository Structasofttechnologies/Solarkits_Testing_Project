const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const supplierSkeletonSchema = new mongoose.Schema({
  company_name: { type: String, default: null },
  brand_name:   { type: String, default: null },
  email:        { type: String, default: null },
  phone:        { type: String, default: null },
  gst_number:   { type: String, default: null },
}, { collection: 'suppliers', strict: false });

if (!db.models['suppliers']) {
  db.model('suppliers', supplierSkeletonSchema);
}

const schema = new mongoose.Schema({
  po_number:       { type: String, required: true, unique: true },
  warehouse_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  supplier_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', required: true },
  supplier_name:   { type: String, default: null },
  supplier_brand:  { type: String, default: null },
  supplier_gst:    { type: String, default: null },
  warehouse_code:  { type: String, default: null },
  warehouse_name:  { type: String, default: null },
  items: [{
    sku_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: false, default: null },
    sku_code:         { type: String, default: 'PROCUREMENT-ITEM' },
    item_name:        { type: String, default: null },
    qty:              { type: Number, default: 1 },
    benchmark_price:  { type: Number, default: 0 },
    benchmark_price_per_watt: { type: Number, default: 0 },
    order_price:      { type: Number, default: 0 },
    order_price_per_watt: { type: Number, default: 0 }
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'invoiced', 'paid', 'delivered', 'cancelled', 'pending_price_approval'],
    default: 'pending'
  },
  // ── Procurement Type: 'panel' | 'inverter' | 'mixed' ──
  procurement_type: {
    type: String,
    enum: ['panel', 'inverter', 'mixed', null],
    default: null
  },
  // ── PO Type: indicates whether this PO was created from EPC/Franchise combined payment ──
  po_type: {
    type: String,
    enum: ['supplier_manual', 'epc_combined', 'franchise_combined', 'mixed_combined'],
    default: 'supplier_manual'
  },
  // ── Source Orders: EPC / Franchise orders that triggered the need for this supplier PO ──
  source_orders: [{
    order_id:        { type: mongoose.Schema.Types.ObjectId, required: true },
    order_type:      { type: String, enum: ['epc', 'franchise', 'manual'], required: true },
    order_number:    { type: String, default: null },
    customer_name:   { type: String, default: null },
    customer_contact:{ type: String, default: null },
    order_amount:    { type: Number, default: 0 },       // Amount in INR (original customer order)
    delivery_address:{ type: mongoose.Schema.Types.Mixed, default: null },
    items: [{
      sku_id:    { type: mongoose.Schema.Types.ObjectId, default: null },
      sku_code:  { type: String, default: null },
      item_name: { type: String, default: null },
      quantity:  { type: Number, default: 0 },
      scope_type:{ type: String, default: null }
    }]
  }],
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
  payment_details: {
    reference_no:   { type: String, default: null },
    payment_date:   { type: Date, default: null },
    amount:         { type: Number, default: null },
    payment_mode:   { type: String, default: null },
    receipt_url:    { type: String, default: null }
  },
  created_by:      { type: mongoose.Schema.Types.ObjectId, required: true },
}, {
  collection: 'purchase_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('purchase_orders', schema);
