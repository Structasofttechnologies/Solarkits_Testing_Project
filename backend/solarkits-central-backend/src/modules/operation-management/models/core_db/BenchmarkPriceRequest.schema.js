const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  sku_id:                   { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
  warehouse_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  requested_price:          { type: Number, required: true, min: 0 },
  current_benchmark_price:  { type: Number, required: true, default: 0 },
  reason:                   { type: String, required: true, trim: true },
  requested_by:             { type: mongoose.Schema.Types.ObjectId, required: true },
  status:                   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  purchase_order_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'purchase_orders', default: null },
}, {
  collection: 'pc_benchmark_price_requests',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_benchmark_price_requests', schema);
