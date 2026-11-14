const mongoose = require('mongoose');
const { company_warehouse_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_code: { type: String, required: true, trim: true, unique: true },
  images: { type: String, default: null }, // Store as string to match SQL behavior
  address: { type: String, default: null },
  pincode: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  status: { type: Number, enum: [1, 2, 3, 4, 5], default: 1 },
  rejection_reason: { type: String, default: null },
  warehouse_type: { type: String, enum: ['company', '3pl', 'master', 'sub'], required: true },
  level_0: { type: mongoose.Schema.Types.ObjectId, default: null }, // Country ID
  level_1: { type: mongoose.Schema.Types.ObjectId, default: null }, // State ID
  level_2: { type: mongoose.Schema.Types.ObjectId, default: null }, // District ID
  customer_types: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'company_customers_types' }], default: [] },

  // ── Module 1.1: Physical Warehouse Capacity Metrics ─────────────────────
  // Used for checkout capacity validation when EPC Buyer selects
  // EPC Warehouse / Company Warehouse fulfillment mode.
  max_kit_capacity: { type: Number, default: 0 }, // Max number of kits the warehouse can hold
  max_weight_capacity_kg: { type: Number, default: 0 }, // Max total payload weight in kg
  allocated_incoming_capacity: { type: Number, default: 0 }, // Kit slots reserved by placed but un-delivered orders

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
  due_date: { type: Date, default: null },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { collection: 'company_warehouses', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('company_warehouses', schema);
