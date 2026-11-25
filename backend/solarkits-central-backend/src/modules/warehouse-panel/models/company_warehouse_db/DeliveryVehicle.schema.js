const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

/**
 * VEHICLE_TYPE_CODES — Standardized vehicle type presets for the Module 1
 * Vehicle Assignment Recommendation Engine.
 * Used by the Smart Auto-Recommendation Algorithm to filter eligible vehicles
 * based on kit count, kW load, and payload weight constraints.
 */
const VEHICLE_TYPE_CODES = [
  'Tata Ace',
  '3-Wheeler Electric',
  '14ft Canter',
  '20ft Truck',
  '32ft Container',
  'Custom',
];

const schema = new mongoose.Schema({
  warehouse_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  name:                { type: String, required: true, trim: true },

  // ── Vehicle Type & Registration ──────────────────────────────────────────
  vehicle_type:        { type: String, enum: VEHICLE_TYPE_CODES, default: 'Custom', trim: true },
  registration_number: { type: String, required: true, trim: true },

  // ── Module 1.2: Logistical Constraint Limits (Vehicle Master Fields) ─────
  // Used by the Smart Auto-Recommendation Algorithm to match order load metrics.
  max_kits:            { type: Number, default: 0, min: 0 },       // Max number of combo kits this vehicle can carry
  max_kw:              { type: Number, default: 0, min: 0 },       // Max cumulative kW load (solar capacity)
  max_weight_kg:       { type: Number, default: 0, min: 0 },       // Max payload weight in kg (same as capacity_kg for legacy compatibility)

  // ── Legacy capacity fields (kept for backward compatibility) ────────────
  capacity_kg:         { type: Number, required: true, min: 0 },   // Legacy: max payload weight
  base_rate_per_km:    { type: Number, required: true, min: 0 },
  fuel_type:           { type: String, enum: ['Diesel', 'Petrol', 'CNG', 'Electric'], default: 'Diesel' },
  fuel_efficiency_kmpl:{ type: Number, required: true, min: 0.1 },
  fuel_price_per_litre:{ type: Number, required: true, min: 0 },

  // ── Module 1.2: Serviceable Geographies ─────────────────────────────────
  // When populated, only orders whose delivery address falls within these IDs
  // will be eligible for recommendation. Empty arrays = serves all geographies.
  serviceable_states:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  serviceable_districts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
  serviceable_pincodes:  [{ type: String, trim: true }],

  // ── Driver Attribution (optional fast-lookup) ────────────────────────────
  assigned_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'delivery_drivers', default: null },

  is_active:  { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'delivery_vehicles',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ warehouse_id: 1, is_active: 1, is_deleted: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_vehicles', schema);
module.exports.VEHICLE_TYPE_CODES = VEHICLE_TYPE_CODES;
