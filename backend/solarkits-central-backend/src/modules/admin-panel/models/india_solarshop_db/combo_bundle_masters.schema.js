const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  customer_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  total_kits:          { type: Number, required: true },
  discount_applied:    { type: Number, required: true },
  purchase_order_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'purchase_orders', required: true },
  created_at:          { type: Date, default: Date.now }
}, { collection: 'combo_bundle_masters', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('combo_bundle_masters', schema);
