const mongoose = require("mongoose");
const { geolocation_boundary_db } = require("../../config/databases");

const districtSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  level_1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "geolocation_level_1",
    required: true,
    index: true
  },
  lat: {
    type: Number
  },
  lng: {
    type: Number
  },
  geometry_type: {
    type: String,
    enum: ["Point", "Polygon", "MultiPolygon"],
    default: "Polygon"
  },
  coordinates: {
    type: {
      type: String,
      enum: ["Point", "Polygon", "MultiPolygon"],
      default: "Point"
    },
    coordinates: {
      type: Array,
      required: false
    }
  },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, collection: 'geolocation_level_2' });

const District = geolocation_boundary_db.model("geolocation_level_2", districtSchema);
module.exports = District;