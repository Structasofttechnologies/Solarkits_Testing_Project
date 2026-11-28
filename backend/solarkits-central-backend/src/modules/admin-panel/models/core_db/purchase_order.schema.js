const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  state_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  warehouse_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: true },
  base_price_snapshot:         { type: Number, required: true },
  selling_price_snapshot:      { type: Number, required: true },
  standard_margin_snapshot:     { type: Number, default: 0 },
  showcase_margin_snapshot:     { type: Number, default: 0 },
  po_discounted_margin_snapshot: { type: Number, default: 0 },
  sku_prices_snapshot: [{
    sku_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
    price:                     { type: Number, required: true }
  }],
  status:                      { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  created_at:                  { type: Date, default: Date.now }
}, { collection: 'purchase_orders', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('solarshop_purchase_orders', schema);
