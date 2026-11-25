const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

// brand_country_map
// brand_id SAME DB → ObjectId
// country_id CROSS DB (geolocation_level_0) → legacy_id numeric only
const s = new mongoose.Schema({
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'brands', required: true },
  country_id: { type: mongoose.Schema.Types.ObjectId, default: null, required: true }, // CROSS DB → geo level_0 legacy_id
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'brand_country_map', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });
s.index({ brand_id: 1, country_id: 1 }, { unique: true });
s.virtual('id').get(function () { return this._id; });
module.exports = db.model('brand_country_map', s);
