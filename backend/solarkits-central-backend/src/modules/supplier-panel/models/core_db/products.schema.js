const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', default: null },
  description: { type: String, default: null },
  features: { type: Array, default: [] },
  image: { type: String, default: null },
  deleted_at: { type: Date, default: null }
}, { collection: 'products', timestamps: false });

module.exports = core_db.model('products', s);
