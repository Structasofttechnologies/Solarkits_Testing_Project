const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  sku_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'product_skus', required: true },
  qty:          { type: Number, default: 0 }
}, { collection: 'warehouse_stocks', timestamps: false });

module.exports = db.model('warehouse_stocks', schema);
