const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  items: [{
    combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true },
    variant_index: { type: Number, required: true },
    qty: { type: Number, required: true },
    price_per_kit: { type: Number, required: true },
    total_price: { type: Number, required: true },
    product_tier: { type: String }
  }],
  total_amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
}, { collection: 'request_orders', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('request_orders', schema);
