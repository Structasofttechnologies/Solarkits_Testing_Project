const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  customer_id:                 { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
  country_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  state_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  district_id:                 { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', required: true },
  cluster_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  warehouse_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true },
  base_price_snapshot:         { type: Number, required: true },
  selling_price_snapshot:      { type: Number, required: true },
  standard_margin_snapshot:     { type: Number, default: 0 },
  showcase_margin_snapshot:     { type: Number, default: 0 },
  po_discounted_margin_snapshot: { type: Number, default: 0 },
  sku_prices_snapshot: [{
    sku_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', required: true },
    price:                     { type: Number, required: true }
  }],
  delivery_address: {
    address_line:  { type: String, default: null },
    state_id:      { type: mongoose.Schema.Types.ObjectId, default: null },
    state_name:    { type: String, default: null },
    district_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    district_name: { type: String, default: null },
    pincode:       { type: String, default: null },
    contact_number:{ type: String, default: null },
    contact_name:  { type: String, default: null },
    lat:           { type: Number, default: null },
    lng:           { type: Number, default: null }
  },
  status:                      { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  created_at:                  { type: Date, default: Date.now }
}, { collection: 'purchase_orders', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('solarshop_purchase_orders', schema);
