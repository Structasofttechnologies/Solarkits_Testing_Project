const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * kit_delivery_cost_rule.schema.js
 * Inside delivery-cost setting: Kit-wise & purchase-type delivery cost rules.
 * Section 6: KIT-WISE DELIVERY COST CONFIGURATION
 */
const ORDER_TYPES = [
  'loose_order',
  'trial_order',
  'bulk_buy',
  'po_order',
];

const schema = new mongoose.Schema({
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    default: null,
  },
  project_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_filter_types',
    default: null,
  },
  project_subtype_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_combo_kits',
    required: true,
  },
  order_type: {
    type: String,
    enum: ORDER_TYPES,
    required: true,
  },
  number_of_kits: {
    type: Number,
    required: true,
    min: 1, // Quantity threshold or tier
  },
  vehicle_master_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'delivery_vehicle_masters',
    required: true,
  },
  total_delivery_cost: {
    type: Number,
    required: true,
    min: 0, // Total delivery in ₹
  },
  per_kit_delivery_cost: {
    type: Number,
    required: true,
    min: 0, // Per kit in ₹
  },
  shipment_weight_kg: {
    type: Number,
    default: 0,
    min: 0, // Total estimated shipment weight in KG
  },
  total_weight_kg: {
    type: Number,
    default: 0,
    min: 0, // Backward compatibility alias
  },
  free_delivery: {
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
  collection: 'kit_delivery_cost_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('kit_delivery_cost_rules', schema);
module.exports.ORDER_TYPES = ORDER_TYPES;
