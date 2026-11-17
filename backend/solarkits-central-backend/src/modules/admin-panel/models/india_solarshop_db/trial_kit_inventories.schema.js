const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * TrialKitInventory — Warehouse-wise Trial Kit stock allocation and lifecycle quantities.
 * SOLARKITS – Trial Kit Management Module (Sections 1 & 2)
 */
const schema = new mongoose.Schema({
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_comobo_kit',
    default: null
  },
  kit_type: {
    type: String,
    required: true,
    trim: true
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true
  },
  warehouse_name: {
    type: String,
    trim: true,
    default: ''
  },
  available_stock: {
    type: Number,
    min: 0,
    default: 0
  },
  reserved_stock: {
    type: Number,
    min: 0,
    default: 0
  },
  ordered_quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  dispatched_quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  delivered_quantity: {
    type: Number,
    min: 0,
    default: 0
  },
  unit_cost_price_inr: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  collection: 'trial_kit_inventories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ combo_kit_id: 1, warehouse_id: 1 });
schema.index({ kit_type: 1, warehouse_id: 1 });
schema.index({ warehouse_id: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('trial_kit_inventories', schema);
