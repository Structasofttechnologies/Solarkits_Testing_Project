const mongoose = require('mongoose');
const { geolocation_db } = require('../../config/databases');

/**
 * geolocation_level_0 (Countries) — solarkits_geolocations.geolocation_level_0
 * MySQL equivalent:
 *   id INT PK AUTO_INCREMENT
 *   name VARCHAR(50) NOT NULL UNIQUE
 *   iso2 CHAR(2) NOT NULL UNIQUE
 *   phone_code VARCHAR(10) NOT NULL
 *   min_phone_length TINYINT(4) NOT NULL
 *   max_phone_length TINYINT(4) NOT NULL
 *   currency_name VARCHAR(100) NOT NULL
 *   currency_code CHAR(3) NOT NULL
 *   lat DECIMAL(10,6) NOT NULL
 *   lng DECIMAL(10,6) NOT NULL
 *   is_active TINYINT(1) DEFAULT 1
 *   created_at TIMESTAMP DEFAULT current_timestamp()
 *   updated_at TIMESTAMP ON UPDATE current_timestamp()
 *   mongo_id VARCHAR(50) NOT NULL
 */
const geoLevel0Schema = new mongoose.Schema(
  {

    name:             { type: String, required: true, trim: true, maxlength: 50, unique: true },
    iso2:             { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 2, unique: true },
    phone_code:       { type: String, required: true, trim: true, maxlength: 10 },
    min_phone_length: { type: Number, required: true, default: 0 },
    max_phone_length: { type: Number, required: true, default: 0 },
    currency_name:    { type: String, required: true, trim: true, maxlength: 100 },
    currency_code:    { type: String, required: true, trim: true, uppercase: true, maxlength: 3 },
    lat:              { type: Number, required: true },
    lng:              { type: Number, required: true },
    is_active:        { type: Boolean, default: true },
    created_at:       { type: Date,   default: Date.now },
    updated_at:       { type: Date,   default: Date.now },

    // GeoJSON geometry (used by admin panel MongoDB queries)
    coordinates: {
      type:        { type: String, enum: ['Point', 'Polygon', 'MultiPolygon'], default: 'Point' },
      coordinates: { type: Array, default: [] },
    },
    geometry_type: { type: String, enum: ['Point', 'Polygon', 'MultiPolygon'], default: 'Polygon' },
  },
  {
    collection: 'geolocation_level_0',
    timestamps: false,
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

geoLevel0Schema.virtual('id').get(function () {
  return this._id;
});

geoLevel0Schema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

module.exports = geolocation_db.model('geolocation_level_0', geoLevel0Schema);
