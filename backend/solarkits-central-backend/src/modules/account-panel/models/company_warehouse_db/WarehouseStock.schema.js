const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  sku_id:                   { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
  sku_code:                 { type: String, required: true },
  qty:                      { type: Number, required: true, default: 0 },
  total_kw:                 { type: Number, default: 0 }, // specifically for solar panels
  average_invoice_price:    { type: Number, default: 0 },
  average_invoice_price_per_watt: { type: Number, default: 0 },
  average_benchmark_price:  { type: Number, default: 0 },
  average_benchmark_price_per_watt: { type: Number, default: 0 },
  total_valuation_invoice:   { type: Number, default: 0 },
  total_valuation_benchmark: { type: Number, default: 0 }
}, {
  collection: 'warehouse_stocks',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ warehouse_id: 1, sku_id: 1 }, { unique: true });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_stocks', schema);
