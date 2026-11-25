const mongoose = require("mongoose");
const { geolocation_boundary_db } = require("../../config/databases");

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  lat: {
    type: Number
  },
  lng: {
    type: Number
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
  geometry_type: {
    type: String,
    enum: ["Point", "Polygon", "MultiPolygon"],
    default: "Polygon"
  },
  level_0: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "geolocation_level_0",
    required: true,
    index: true
  }
}, { timestamps: true, collection: 'geolocation_level_1' });

const State = geolocation_boundary_db.model("geolocation_level_1", stateSchema);
module.exports = State;