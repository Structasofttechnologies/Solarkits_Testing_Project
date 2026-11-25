const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_vehicle_fleet.schema.js
 * Physical Vehicle Database.
 * Section 3: VEHICLE DATABASE
 */
const FLEET_STATUSES = [
  'Available',
  'Reserved',
  'Assigned',
  'Loading',
  'In Transit',
  'Delivered',
  'Unavailable',
  'Maintenance',
];

const schema = new mongoose.Schema({
  service_provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_service_providers',
    required: true,
  },
  vehicle_master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_vehicle_masters',
    required: true,
  },
  registration_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  load_capacity_kg: {
    type: Number,
    required: true,
    min: 0,
  },
  length_ft: {
    type: Number,
    default: null,
  },
  width_ft: {
    type: Number,
    default: null,
  },
  height_ft: {
    type: Number,
    default: null,
  },
  max_distance_km: {
    type: Number,
    default: null,
  },
  active_states: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
  }],
  active_districts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
  }],
  current_status: {
    type: String,
    enum: FLEET_STATUSES,
    default: 'Available',
    index: true,
  },
  current_delivery_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_orders',
    default: null,
  },
  assigned_driver: {
    name: { type: String, default: null, trim: true },
    mobile: { type: String, default: null, trim: true },
    license_number: { type: String, default: null, trim: true },
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'delivery_vehicle_fleets',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_vehicle_fleets', schema);
module.exports.FLEET_STATUSES = FLEET_STATUSES;
