const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_templates', required: true },
  deleted_at: { type: Date, default: null }
}, { collection: 'pc_product_subtypes', timestamps: false });

module.exports = core_db.model('pc_product_subtypes', s);
