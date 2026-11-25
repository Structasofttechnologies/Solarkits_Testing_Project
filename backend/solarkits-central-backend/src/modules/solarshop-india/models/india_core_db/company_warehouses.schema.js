const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_code: { type: String, required: true, trim: true },
  address: { type: String, default: null },
  pincode: { type: String, default: null },
  warehouse_type: { type: String, enum: ['company', '3pl', 'master', 'sub'], required: true },
  level_0: { type: mongoose.Schema.Types.ObjectId, default: null }, // Country ID
  level_1: { type: mongoose.Schema.Types.ObjectId, default: null }, // State ID
  level_2: { type: mongoose.Schema.Types.ObjectId, default: null }, // District ID

  // ── Module 1.1: Physical Warehouse Capacity Metrics ─────────────────────
  max_kit_capacity: { type: Number, default: 0 },
  max_weight_capacity_kg: { type: Number, default: 0 },
  allocated_incoming_capacity: { type: Number, default: 0 },

  // ── Order Type Fulfillment Capabilities ─────────────────────────────────
  order_fulfillment_types: {
    type: [String],
    enum: ['po_order', 'loose_order', 'trial_order'],
    default: ['po_order', 'loose_order', 'trial_order']
  },
  order_fulfillment_config: {
    po_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 50 }, notes: { type: String, default: null } },
    loose_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 100 }, notes: { type: String, default: null } },
    trial_order: { is_active: { type: Boolean, default: true }, max_daily_capacity: { type: Number, default: 20 }, notes: { type: String, default: null } }
  },

  is_active: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },

}, {
  collection: 'company_warehouses',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouses', schema);
