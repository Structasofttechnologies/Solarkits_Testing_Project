const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'logistics_3pl_vendors', default: null },
  sku_id: { type: mongoose.Schema.Types.ObjectId, ref: 'product_skus', required: true },
  sku_code: { type: String, default: null },
  sku_name: { type: String, default: null },
  company_verified_stock: { type: Number, required: true, default: 0 },
  vendor_reported_stock: { type: Number, required: true, default: 0 },
  discrepancy_qty: { type: Number, default: 0 }, // vendor_reported - company_verified
  reconciliation_status: { 
    type: String, 
    enum: ['matched', 'investigating', 'adjusted', 'disputed'], 
    default: 'matched' 
  },
  last_reconciled_at: { type: Date, default: Date.now },
  reconciled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  remarks: { type: String, default: null }
}, {
  collection: 'warehouse_stock_reconciliations',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_stock_reconciliations', schema);
