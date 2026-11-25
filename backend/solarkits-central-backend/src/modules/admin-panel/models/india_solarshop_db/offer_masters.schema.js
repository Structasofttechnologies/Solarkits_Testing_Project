const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  offer_name:          { type: String, required: true, trim: true },
  offer_type:          { type: String, enum: ['discount', 'sales_day', 'bundle', 'coupon'], required: true },
  discount_type:       { type: String, enum: ['flat', 'percent'], default: 'flat' },
  discount_value:      { type: Number, required: true },
  start_date:          { type: Date, required: true },
  end_date:            { type: Date, required: true },
  products_applicable: [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits' }],
  customer_category:   { type: String, default: 'all' },
  coupon_code:         { type: String, default: null, trim: true },
  cluster_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', default: null },
  priority:            { type: Number, required: true }, // 1: Flash Sale, 2: Bundle Offer, 3: Coupon, 4: Standard Discount
  stackable:           { type: Boolean, default: false },
  is_active:           { type: Boolean, default: true },
  max_qty:             { type: Number, default: null },
  deleted_at:          { type: Date, default: null },
  created_at:          { type: Date, default: Date.now }
}, { collection: 'offer_masters', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('offer_masters', schema);
