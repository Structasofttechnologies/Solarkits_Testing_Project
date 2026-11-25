const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// geolocation_level_4 (Rural Cities) — level_3 SAME DB → ObjectId
const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 100 },
  level_3:        { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_3', required: true },
  deleted_at:     { type: Date, default: null },
  created_at:     { type: Date, default: Date.now },
}, { collection: 'geolocation_level_4', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_4', schema);
