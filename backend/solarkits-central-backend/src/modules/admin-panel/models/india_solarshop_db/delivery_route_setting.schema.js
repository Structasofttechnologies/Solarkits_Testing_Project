const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_route_setting.schema.js
 * Admin settings for Nearby Districts and Route Clubbing / Consolidation.
 * Combined Delivery Specification - Section 3: ADMIN – NEARBY DISTRICT / DELIVERY ROUTE SETTINGS
 */
const COST_ALLOCATION_METHODS = [
  'by_kit_qty',
  'by_weight_kg',
  'by_distance',
  'by_kg_distance',
  'manual',
];

const schema = new mongoose.Schema({
  route_name: {
    type: String,
    required: true,
    trim: true, // e.g. "Pune Cluster Route 01"
  },
  origin_warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
  },
  primary_district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    required: true,
  },
  nearby_district_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
  }],
  pincode_groups: [{
    pincode: { type: String, trim: true, required: true },
    label: { type: String, trim: true, default: null },
  }],
  max_route_distance_km: {
    type: Number,
    required: true,
    min: 1, // Maximum Route Distance in KM
  },
  max_route_deviation_km: {
    type: Number,
    default: 25,
    min: 0, // Maximum Route Deviation in KM
  },
  max_waiting_period_hours: {
    type: Number,
    required: true,
    default: 48, // Maximum Waiting Period for Consolidation in Hours
    min: 1,
  },
  min_vehicle_utilization_pct: {
    type: Number,
    default: 70,
    min: 1,
    max: 100, // Minimum vehicle utilization %
  },
  max_delivery_stops: {
    type: Number,
    default: 5,
    min: 2,
    max: 20, // Maximum number of delivery stops
  },
  combined_delivery_enabled: {
    type: Boolean,
    default: true,
  },
  cost_allocation_default: {
    type: String,
    enum: COST_ALLOCATION_METHODS,
    default: 'by_kit_qty',
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
  collection: 'delivery_route_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_route_settings', schema);
module.exports.COST_ALLOCATION_METHODS = COST_ALLOCATION_METHODS;
