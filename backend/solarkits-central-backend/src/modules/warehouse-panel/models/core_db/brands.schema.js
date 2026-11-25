const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  brand_name:   { type: String, required: true, trim: true, unique: true },
  company_name: { type: String, default: null },
  logo:         { type: String, default: null },
  country_ids:  [{ type: mongoose.Schema.Types.ObjectId }],
  state_ids:    [{ type: mongoose.Schema.Types.ObjectId }],
  district_ids: [{ type: mongoose.Schema.Types.ObjectId }],
  deleted_at:   { type: Date, default: null },
}, { collection: 'brands', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('brands', s);
