const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// geolocation_level_2 (Districts) — level_1 + cluster FK SAME DB → ObjectId
const schema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true, maxlength: 100 },
  level_1:        { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster:        { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', default: null },
  lat:            { type: Number, default: 0 },
  lng:            { type: Number, default: 0 },
  pincodes:       [{
    pincode:      { type: String, trim: true },
    lat:          { type: Number, default: 0 },
    lng:          { type: Number, default: 0 },
    locality:     { type: String, default: '' },
    is_active:    { type: Boolean, default: true }
  }],
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
  created_at:     { type: Date, default: Date.now },
}, { collection: 'geolocation_level_2', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
schema.index({ level_1: 1, name: 1 });
schema.index({ 'pincodes.pincode': 1 });

module.exports = geolocation_db.model('geolocation_level_2', schema);
