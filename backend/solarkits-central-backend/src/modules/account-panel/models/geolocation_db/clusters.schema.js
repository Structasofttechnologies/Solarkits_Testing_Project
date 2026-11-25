const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

// clusters — level_1 FK SAME DB → ObjectId
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  level_1: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'clusters', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('clusters', schema);
