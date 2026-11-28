const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:               { type: String, required: true },
  description:        { type: String, default: null },
  state_id:           { type: mongoose.Schema.Types.ObjectId, default: null },
  cluster_id:         { type: mongoose.Schema.Types.ObjectId, default: null },
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, default: null },
  country_id:         { type: mongoose.Schema.Types.ObjectId, default: null },
  solar_kit_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kit_definitions', required: true },
  project_range_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
  capacity:           { type: Number, default: 0 },
  inverter_tolerance: { type: Number, default: 10 },
  inverter_mode:      { type: String, default: 'single' },
  kit_image:          { type: String, default: null },
  datasheet:          { type: String, default: null },
  variant_id:         { type: mongoose.Schema.Types.ObjectId, default: null },
  variant_ids:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'combo_kit_variants' }],
  order_quantities:   [{ type: Number }],
  loose_order_quantities: [{ type: Number }],
  allow_trial_kit:    { type: Boolean, default: false },
  trial_kit_quantity: { type: Number, default: 10 },
  trial_kit_max_orders_per_buyer: { type: Number, default: 1 },
  
  base_components: [{
    template_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
    subtype_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', default: null },
    brand_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
    brand_ids:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'brands' }],
    sku_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', default: null },
    quantity:         { type: Number, default: 1 }
  }],
  
  bos_kits: [{
    name:             { type: String, required: true },
    brand_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
    brand_ids:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'brands' }],
    sku_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', default: null },
    quantity:         { type: Number, default: 1 },
    image:            { type: String, default: null },
    template_ids:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates' }],
    subtype_ids:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes' }]
  }],

  base_price_cached:    { type: Number, default: 0 },
  selling_price_cached: { type: Number, default: 0 },
  max_margin:           { type: Number, default: 0, min: 0 },
  is_custom:          { type: Boolean, default: false },
  is_active:          { type: Boolean, default: true },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now }
}, { 
  collection: 'pc_combo_kits',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_combo_kits', schema);