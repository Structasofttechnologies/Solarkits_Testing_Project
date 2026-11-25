const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', required: true },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  deleted_at: { type: Date, default: null }
}, { collection: 'pc_brand_template_map', timestamps: false });

module.exports = core_db.model('pc_brand_template_map', s);
