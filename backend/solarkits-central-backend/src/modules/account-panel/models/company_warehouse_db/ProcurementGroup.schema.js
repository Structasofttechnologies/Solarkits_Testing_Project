const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  order_ids: [{
    type: mongoose.Schema.Types.Mixed,
    required: true,
  }],
  order_numbers: [{
    type: String,
  }],
  order_count: {
    type: Number,
    required: true,
    min: 1,
  },
  total_kits: {
    type: Number,
    required: true,
    default: 0,
  },
  total_weight_kg: {
    type: Number,
    default: 0,
  },
  kit_type_breakdown: [{
    kit_type: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    weight_kg: { type: Number, default: 0 },
  }],
  vehicle_strategy: {
    type: String,
    enum: ['single', 'multiple_same', 'multiple_types'],
    default: 'single',
  },
  vehicle_details: {
    vehicle_id: { type: mongoose.Schema.Types.Mixed, default: null },
    vehicle_code: { type: String, default: null },
    vehicle_name: { type: String, default: null },
    vehicle_model: { type: String, default: null },
    capacity_kg: { type: Number, default: 0 },
    estimated_load_kg: { type: Number, default: 0 },
    utilization_pct: { type: Number, default: 0 },
    validation_status: { type: String, enum: ['Pass', 'Warning', 'Fail'], default: 'Pass' },
    unallocated_kits: { type: Number, default: 0 },
  },
  supplier_groups: [{
    supplier_id: { type: mongoose.Schema.Types.Mixed, default: null },
    supplier_name: { type: String, required: true },
    is_oem: { type: Boolean, default: false },
    warehouse_id: { type: mongoose.Schema.Types.Mixed, default: null },
    warehouse_code: { type: String, default: null },
    warehouse_name: { type: String, default: null },
    items: [{
      product_name: { type: String, default: 'Solar Equipment' },
      sku_code: { type: String, default: null },
      quantity: { type: Number, required: true, default: 1 },
      unit: { type: String, default: 'Units' },
      is_mapped: { type: Boolean, default: true },
    }],
  }],
  geographic_summary: {
    states_count: { type: Number, default: 0 },
    districts_count: { type: Number, default: 0 },
    pincodes_count: { type: Number, default: 0 },
    states: [{ type: String }],
    districts: [{ type: String }],
    pincodes: [{ type: String }],
  },
  order_origins: [{ type: String }],
  payment_modes: [{ type: String }],
  source_orders: [{ type: mongoose.Schema.Types.Mixed }],
  supplier_breakdown: [{ type: mongoose.Schema.Types.Mixed }],
  exceptions: [{
    type: { type: String, default: 'supplier_mapping' },
    message: { type: String, required: true },
    severity: { type: String, enum: ['warning', 'critical'], default: 'warning' },
    product_name: { type: String, default: null },
  }],
  batch_status: {
    type: String,
    enum: ['Preparing', 'Batch Ready', 'Procurement In Progress', 'Transferred to Delivery'],
    default: 'Batch Ready',
  },
  procurement_readiness_status: {
    type: String,
    enum: [
      'Procurement In Progress',
      'Awaiting Warehouse Inward',
      'Ready for Kit Preparation',
      'Ready for Dispatch',
    ],
    default: 'Procurement In Progress',
  },
  delivery_handover: {
    transferred_at: { type: Date, default: null },
    transferred_by: { type: mongoose.Schema.Types.Mixed, default: null },
    delivery_order_id: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  status: {
    type: String,
    enum: [
      'New Order',
      'Selected for Processing',
      'Group Validation Pending',
      'Ready for Procurement',
      'Batch Ready',
      'Sent to Procurement',
      'Procurement In Progress',
      'Procurement Completed',
      'Exception / Rework Required',
      'Transferred to Delivery',
    ],
    default: 'Batch Ready',
  },
  created_by: {
    user_id: { type: mongoose.Schema.Types.Mixed, default: null },
    name: { type: String, default: 'Account User' },
    email: { type: String, default: null },
    role: { type: String, default: 'Accounts' },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'procurement_groups',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

module.exports = db.model('procurement_groups', schema);
