const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// zones — cluster SAME DB → ObjectId
const schema = new mongoose.Schema({

  name:           { type: String, required: true, trim: true, maxlength: 100 },
  cluster:        { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  districts:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
  deleted_at:     { type: Date, default: null },
  created_at:     { type: Date, default: Date.now },
}, { collection: 'zones', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('zones', schema);
