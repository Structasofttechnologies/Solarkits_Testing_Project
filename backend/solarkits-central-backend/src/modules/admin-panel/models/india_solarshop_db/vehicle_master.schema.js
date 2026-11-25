const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * vehicle_master.schema.js
 * Master database of vehicle types available for transportation.
 * Section 1: VEHICLE MASTER – DELIVERY MANAGEMENT
 */
const schema = new mongoose.Schema({
  vehicle_code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true, // Tata Ace, Pickup, Truck, etc.
  },
  brand_make: {
    type: String,
    required: true,
    trim: true, // Tata Motors, Mahindra, etc.
  },
  model: {
    type: String,
    required: true,
    trim: true, // Ace Gold, Bolero Maxi, etc.
  },
  length_ft: {
    type: Number,
    required: true,
    min: 0, // Feet
  },
  width_ft: {
    type: Number,
    required: true,
    min: 0, // Feet
  },
  height_ft: {
    type: Number,
    required: true,
    min: 0, // Feet
  },
  max_load_kg: {
    type: Number,
    required: true,
    min: 0, // Used to calculate how many kits can safely be loaded
  },
  max_delivery_distance_km: {
    type: Number,
    required: true,
    min: 0, // KM
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'delivery_vehicle_masters',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_vehicle_masters', schema);
