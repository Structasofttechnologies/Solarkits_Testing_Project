const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true, maxlength: 50 },
  iso2:             { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
  phone_code:       { type: String, required: true, trim: true, maxlength: 10 },
  min_phone_length: { type: Number, default: 0 },
  max_phone_length: { type: Number, default: 0 },
  is_active:        { type: Boolean, default: true },
  deleted_at:       { type: Date, default: null },
}, { 
  collection: 'geolocation_level_0', 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('geolocation_level_0', schema);
