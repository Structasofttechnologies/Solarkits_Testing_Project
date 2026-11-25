const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

// pc_product_skus — centralized SKU master definition
const s = new mongoose.Schema({
  product_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'products', required: true },
  sku_code:          { type: String, required: true, trim: true, unique: true },
  image:             { type: String, default: null },
  attributes: [{
    subtype_attribute_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes' },
    value_raw:            { type: String, default: null },
    value_base_unit:      { type: Number, default: 0 },
    unit_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units' },
    conversion_metadata: {
      source_unit:       { type: String, default: null },
      target_unit:       { type: String, default: null },
      conversion_factor: { type: Number, default: 1 }
    }
  }],
  deleted_at:        { type: Date, default: null },
  created_at:        { type: Date, default: Date.now },
}, { collection: 'pc_product_skus', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
module.exports = core_db.model('pc_product_skus', s);
