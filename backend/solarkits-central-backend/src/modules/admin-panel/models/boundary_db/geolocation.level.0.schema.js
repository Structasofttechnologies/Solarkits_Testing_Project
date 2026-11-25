const mongoose = require("mongoose");
const { geolocation_boundary_db } = require("../../config/databases");

const countrySchema = new mongoose.Schema({
  // ... (keeping same schema content)
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  iso2: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2, unique: true, index: true },
  phone_code: { type: String, required: true, trim: true },
  phone_length: { type: Number },
  currency_name: { type: String, trim: true },
  currency_code: { type: String, uppercase: true, trim: true },
  currency_symbol: { type: String, trim: true },
  native: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number },
  coordinates: {
    type: { type: String, enum: ["Point", "Polygon", "MultiPolygon"], default: "Point" },
    coordinates: { type: Array, required: false }
  },
  geometry_type: { type: String, enum: ["Point", "Polygon", "MultiPolygon"], default: "Polygon" }
}, { timestamps: true, collection: 'geolocation_level_0' });

const Country = geolocation_boundary_db.model("geolocation_level_0", countrySchema);
module.exports = Country;
