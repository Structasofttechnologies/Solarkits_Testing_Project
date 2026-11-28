const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  state_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster_id:                  { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  warehouse_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true }, // in India DB kit ref is pc_combo_kits
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
  // --- Phase 6: Reseller Dual-Mode Order Tagging (backward-compatible) ---
  reseller_id:                 { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
  reseller_commercial_mode:    { type: String, enum: ['commission', 'dealer'], default: null },
  reseller_commission_rate:    { type: Number, default: 0 },
  reseller_commission_amount:  { type: Number, default: 0 },
  dealer_discount_amount:      { type: Number, default: 0 },
  dealer_invoice_number:       { type: String, default: null },
  // ------------------------------------------------------------------------
  created_at:                  { type: Date, default: Date.now }
}, { collection: 'purchase_orders', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('solarshop_purchase_orders', schema);
