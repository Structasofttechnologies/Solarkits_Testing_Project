const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  product_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true },
  quantity:      { type: Number, required: true },
  customer_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  expiry_time:   { type: Date, required: true },
  status:        { type: String, enum: ['reserved', 'booked', 'released'], default: 'reserved' },
  reminder_sent: { type: Boolean, default: false },
  created_at:    { type: Date, default: Date.now }
}, { collection: 'inventory_reservations', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('inventory_reservations', schema);
