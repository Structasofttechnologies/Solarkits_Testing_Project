const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  brand_name:   { type: String, required: true, trim: true, unique: true },
  company_name: { type: String, default: null },
  logo:         { type: String, default: null },
  deleted_at:   { type: Date, default: null },
}, { collection: 'brands', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.models.brands || db.model('brands', s);
