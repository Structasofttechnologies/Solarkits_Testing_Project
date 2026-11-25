const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// geolocation_level_2 (Districts) — level_1 + cluster FK SAME DB → ObjectId
const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 100 },
  level_1:        { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster:        { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', default: null },
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
  created_at:     { type: Date, default: Date.now },
}, { collection: 'geolocation_level_2', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_2', schema);
