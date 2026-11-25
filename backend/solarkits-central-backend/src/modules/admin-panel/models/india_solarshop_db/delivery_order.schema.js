const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_order.schema.js
 * Central Delivery Order & Master Delivery Trip Model.
 * Supports Single Orders, Combined Multi-Stop Routes, Multi-Vehicle Allocations,
 * Individual Stop PODs, and the Critical 3-Tier Financial Ledger.
 */
const DELIVERY_STATUSES = [
  'delivery_created',
  'pending_approval',
  'cost_approved',
  'cost_rejected',
  'cost_returned',
  'vehicle_assigned',
  'pickup_scheduled',
  'loading',
  'dispatched',
  'in_transit',
  'reached_destination',
  'delivered',
  'pod_confirmed',
  'closed',
];

const STOP_STATUSES = [
  'pending',
  'in_transit',
  'reached_destination',
  'delivered',
  'pod_confirmed',
];

const deliveryStopSchema = new mongoose.Schema({
  stop_number: {
    type: Number,
    required: true,
    min: 1,
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  order_number: {
    type: String,
    required: true,
    trim: true,
  },
  order_model: {
    type: String,
    enum: ['epc_orders', 'fpo_orders', 'purchase_orders'],
    default: 'epc_orders',
  },
  recipient_type: {
    type: String,
    enum: ['epc_buyer', 'franchisee_store', 'end_customer'],
    default: 'epc_buyer',
  },
  recipient_name: {
    type: String,
    default: null,
  },
  destination: {
    address: { type: String, default: null },
    state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    state_name: { type: String, default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    district_name: { type: String, default: null },
    pincode: { type: String, default: null },
    is_franchisee_destination: { type: Boolean, default: false },
    franchisee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
    contact_name: { type: String, default: null },
    contact_phone: { type: String, default: null },
  },
  cargo: {
    total_kits: { type: Number, default: 0 },
    total_weight_kg: { type: Number, default: 0 },
    total_kw: { type: Number, default: 0 },
    kit_items: [{
      kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits' },
      kit_name: { type: String },
      quantity: { type: Number, default: 1 },
      unit_weight_kg: { type: Number, default: 0 },
      total_weight_kg: { type: Number, default: 0 },
    }],
  },
  // Order-Wise Stop Status & Separate POD
  stop_status: {
    type: String,
    enum: STOP_STATUSES,
    default: 'pending',
  },
  delivered_at: {
    type: Date,
    default: null,
  },
  pod: {
    pod_url: { type: String, default: null },
    pod_notes: { type: String, default: null },
    receiver_name: { type: String, default: null },
    receiver_phone: { type: String, default: null },
    confirmed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    confirmed_at: { type: Date, default: null },
  },
  // Stop-Wise Internal Cost & Margin Allocation
  customer_delivery_charge: {
    type: Number,
    default: 0, // In ₹ (What customer/franchisee was charged)
  },
  allocated_vendor_cost: {
    type: Number,
    default: 0, // In ₹ (Allocated share of actual transporter cost)
  },
  allocated_benchmark_cost: {
    type: Number,
    default: 0, // In ₹ (Allocated share of benchmark cost)
  },
  stop_delivery_margin: {
    type: Number,
    default: 0, // customer_delivery_charge - allocated_vendor_cost
  },
}, { _id: true });

const vehicleAllocationSchema = new mongoose.Schema({
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_vehicle_fleets',
    required: true,
  },
  registration_number: {
    type: String,
    required: true,
    trim: true,
  },
  vehicle_master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_vehicle_masters',
    default: null,
  },
  driver_name: {
    type: String,
    default: null,
    trim: true,
  },
  driver_mobile: {
    type: String,
    default: null,
    trim: true,
  },
  driver_license: {
    type: String,
    default: null,
    trim: true,
  },
  allocated_weight_kg: {
    type: Number,
    default: 0,
  },
  allocated_kits: {
    type: Number,
    default: 0,
  },
  assigned_stops: [{
    type: Number, // Stop numbers assigned to this vehicle
  }],
  vehicle_cost: {
    type: Number,
    default: 0,
  },
}, { _id: true });

const schema = new mongoose.Schema({
  delivery_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // e.g. "DEL-2026-0001"
  },
  delivery_type: {
    type: String,
    enum: ['single_order', 'consolidated_master_trip'],
    default: 'single_order',
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true,
  },
  route_setting_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_route_settings',
    default: null,
  },
  service_provider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_service_providers',
    required: true,
  },
  booking_source: {
    type: String,
    enum: ['manual', 'third_party_api'],
    default: 'manual',
  },

  // Multi-Stop Array (1 stop for single order, 2+ for combined deliveries)
  stops: [deliveryStopSchema],

  // Vehicles Allocated (supports multi-vehicle split)
  vehicles_allocated: [vehicleAllocationSchema],

  // Aggregate Cargo Summary
  cargo_summary: {
    total_shipment_weight_kg: { type: Number, default: 0 },
    total_kits: { type: Number, default: 0 },
    total_kw: { type: Number, default: 0 },
    total_stops: { type: Number, default: 1 },
    estimated_route_distance_km: { type: Number, default: 0 },
  },

  // ─── CRITICAL 3-TIER FINANCIAL LEDGER ─────────────────────────────────────
  customer_delivery_charge: {
    type: Number,
    default: 0, // Sum of all customer delivery fees charged
  },
  company_benchmark_cost: {
    type: Number,
    default: 0, // Active benchmark transport cost
  },
  actual_vendor_cost: {
    type: Number,
    default: 0, // True payable to third-party transporter
  },
  gst_applicable: {
    type: Boolean,
    default: true,
  },
  gst_rate: {
    type: Number,
    default: 18,
  },
  gst_amount: {
    type: Number,
    default: 0,
  },
  total_transport_payable: {
    type: Number,
    default: 0, // actual_vendor_cost + gst_amount
  },
  variance_from_benchmark: {
    type: Number,
    default: 0, // actual_vendor_cost - company_benchmark_cost
  },
  delivery_margin: {
    type: Number,
    default: 0, // customer_delivery_charge - actual_vendor_cost
  },

  // ─── COMBINED SAVINGS & COST ALLOCATION ────────────────────────────────────
  sum_separate_benchmark_cost: {
    type: Number,
    default: 0, // e.g. ORD-101(12k) + ORD-102(8k) = 20k
  },
  estimated_savings: {
    type: Number,
    default: 0, // sum_separate_benchmark_cost - actual_vendor_cost
  },
  cost_allocation_method: {
    type: String,
    enum: ['by_kit_qty', 'by_weight_kg', 'by_distance', 'by_kg_distance', 'manual'],
    default: 'by_kit_qty',
  },

  // ─── ADMIN OVERRIDE AUDIT LOG ─────────────────────────────────────────────
  is_overridden: {
    type: Boolean,
    default: false,
  },
  override_details: {
    original_benchmark: { type: Number, default: null },
    actual_rate: { type: Number, default: null },
    difference: { type: Number, default: null },
    overridden_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    override_reason: { type: String, default: null },
    overridden_at: { type: Date, default: null },
  },

  // ─── STAGE 4: DELIVERY CHARGE APPROVAL INDEPENDENT TRACKING ───────────────
  delivery_approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'returned', 'not_required'],
      default: 'not_required',
      index: true,
    },
    requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    requested_by_name: { type: String, default: null },
    requested_at: { type: Date, default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    approved_by_name: { type: String, default: null },
    approved_at: { type: Date, default: null },
    rejection_reason: { type: String, default: null },
    return_reason: { type: String, default: null },
    remarks: { type: String, default: null },
    quotation_doc_url: { type: String, default: null },
    benchmark_cost: { type: Number, default: 0 },
    proposed_cost: { type: Number, default: 0 },
    variance_amount: { type: Number, default: 0 },
    variance_pct: { type: Number, default: 0 },
  },

  // ─── 10-STEP LIFECYCLE STATUS JOURNEY ─────────────────────────────────────
  status: {
    type: String,
    enum: DELIVERY_STATUSES,
    default: 'delivery_created',
    index: true,
  },
  status_history: [{
    status: { type: String, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    note: { type: String, default: null },
    changed_at: { type: Date, default: Date.now },
  }],
  milestones: [{
    status: { type: String, required: true },
    description: { type: String, default: null },
    location: { type: String, default: null },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    timestamp: { type: Date, default: Date.now },
  }],

  // Timestamps
  pickup_scheduled_at: { type: Date, default: null },
  dispatched_at: { type: Date, default: null },
  expected_delivery_date: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  closed_at: { type: Date, default: null },

  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
}, {
  collection: 'delivery_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('delivery_orders', schema);
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
module.exports.STOP_STATUSES = STOP_STATUSES;
