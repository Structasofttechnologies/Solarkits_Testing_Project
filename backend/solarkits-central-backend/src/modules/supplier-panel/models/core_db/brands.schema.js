const mongoose = require('mongoose');
const { core_db } = require('../../config/databases');

const s = new mongoose.Schema({
  brand_name: { type: String, required: true, unique: true },
  logo: { type: String, default: null },
  deleted_at: { type: Date, default: null }
}, { collection: 'brands', timestamps: false });

module.exports = core_db.model('brands', s);
