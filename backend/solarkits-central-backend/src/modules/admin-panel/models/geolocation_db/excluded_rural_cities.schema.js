const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

const schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  lat:        { type: Number, default: 0 },
  lng:        { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
}, { collection: 'excluded_rural_cities', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = geolocation_db.model('excluded_rural_cities', schema);
