const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  sku_id:       { type: mongoose.Schema.Types.ObjectId, required: true },
  sku_code:     { type: String, required: true },
  qty:          { type: Number, required: true, default: 0 }
}, {
  collection: 'warehouse_stocks',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_stocks', schema);
