const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  level_0:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'geolocation_level_1', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_1', schema);
