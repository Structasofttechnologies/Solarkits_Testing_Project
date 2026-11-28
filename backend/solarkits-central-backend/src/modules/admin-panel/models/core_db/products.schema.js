const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// products — template_id, subtype_id, brand_id SAME DB → ObjectId
// Soft delete via deleted_at (was in MySQL too)
const s = new mongoose.Schema({

  name:              { type: String, required: true, trim: true, maxlength: 255 },
  sku_code:          { type: String, default: null, trim: true, uppercase: true },
  description:       { type: String, default: null },
  features:          { type: [String], default: [] },
  image:             { type: String, default: null, maxlength: 500 },
  datasheet:         { type: String, default: null, maxlength: 500 },
  template_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', default: null },

  subtype_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', default: null },

  brand_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
  industry_type_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
  category_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'project_categories', default: null },
  subcategory_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'project_subcategories', default: null },

  base_price_paise:  { type: Number, default: 0, min: 0 },
  min_margin_paise:  { type: Number, default: 0, min: 0 },
  max_margin_paise:  { type: Number, default: 100000000, min: 0 },
  tax_rate_pct:      { type: Number, default: 18, min: 0 },
  stock_quantity:    { type: Number, default: 100, min: 0 },
  specifications:    { type: mongoose.Schema.Types.Mixed, default: {} },
  is_active:         { type: Boolean, default: true },
  status:            { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },

  scope_ids:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps' }],

  sku_config: {
    template_len: { type: Number, default: 3 },
    brand_len:    { type: Number, default: 5 },
    product_len:  { type: Number, default: 4 },
    subtype_len:  { type: Number, default: 4 }
  },

  deleted_at:        { type: Date, default: null },
  created_at:        { type: Date, default: Date.now },
}, { collection: 'products', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('products', s);
