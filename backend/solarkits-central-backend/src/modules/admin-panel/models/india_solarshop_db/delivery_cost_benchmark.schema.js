const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_cost_benchmark.schema.js
 * Configurable Warehouse-wise + Vehicle-wise + Geography-wise Delivery Cost Settings.
 * Section 5: DELIVERY COST SETTINGS
 */
const schema = new mongoose.Schema({
  service_provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_service_providers',
    default: null,
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true,
  },
  vehicle_master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_vehicle_masters',
    required: true,
  },
  state_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_1',
    required: true,
  },
  district_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'geolocation_level_2',
    required: true,
  },
  benchmark_cost: {
    type: Number,
    required: true,
    min: 0, // Benchmark transport cost in ₹
  },
  gst_applicable: {
    type: Boolean,
    default: true,
  },
  gst_rate: {
    type: Number,
    default: 18,
    min: 0,
    max: 100,
  },
  effective_date: {
    type: Date,
    default: Date.now,
  },
  free_delivery_eligible: {
    type: Boolean,
    default: false,
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
  collection: 'delivery_cost_benchmarks',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

// Compound unique index on vendor + warehouse + vehicle + district
schema.index({ service_provider_id: 1, warehouse_id: 1, vehicle_master_id: 1, district_id: 1 }, { unique: true });

const Model = db.model('delivery_cost_benchmarks', schema);

// Safe cleanup of legacy 3-field index if present in MongoDB
Model.collection.dropIndex('warehouse_id_1_vehicle_master_id_1_district_id_1').catch(() => {
  // Ignore if old index does not exist
});

module.exports = Model;
