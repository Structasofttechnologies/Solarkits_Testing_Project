const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  product_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  sku_id:             { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_skus', default: null },
  attribute_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'pc_subtype_attributes', required: true },

  value_text:         { type: String, default: null },
  value_number:       { type: Number, default: null },
  value_boolean:      { type: Boolean, default: null },
  value_option_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'pc_attribute_options', default: null },
  value_file:         { type: String, default: null },
  
  unit_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units', default: null },

  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now },
}, { collection: 'pc_attribute_values', timestamps: false });

s.virtual('id').get(function () { return this._id; });
module.exports = core_db.model('pc_attribute_values', s);
