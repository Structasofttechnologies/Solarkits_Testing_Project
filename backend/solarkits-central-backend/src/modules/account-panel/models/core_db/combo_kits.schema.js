const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name:               { type: String, required: true },
  description:        { type: String, default: null },
  state_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_states', default: null },
  cluster_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_clusters', default: null },
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
  country_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
  solar_kit_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kit_definitions', required: true },
  project_range_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_ranges', default: null },
  capacity:           { type: Number, default: 0 },
  inverter_tolerance: { type: Number, default: 10 },
  kit_image:          { type: String, default: null },
  variant_id:         { type: mongoose.Schema.Types.ObjectId, default: null },
  
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
  is_custom:          { type: Boolean, default: false },
  is_active:          { type: Boolean, default: true },
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now }
}, { collection: 'pc_comobo_kit', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('pc_comobo_kit', s);
