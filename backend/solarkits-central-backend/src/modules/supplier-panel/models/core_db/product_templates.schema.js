const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: null },
  deleted_at: { type: Date, default: null }
}, { collection: 'pc_product_templates', timestamps: false });

module.exports = core_db.model('pc_product_templates', s);
