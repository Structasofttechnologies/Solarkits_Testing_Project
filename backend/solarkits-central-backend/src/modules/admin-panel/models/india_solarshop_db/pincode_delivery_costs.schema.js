const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  state_name: { type: String, required: true, trim: true }, // e.g. "Gujarat"
  district_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  district_name: { type: String, required: true, trim: true }, // e.g. "Devbhumi Dwarka"
  pincode: { type: String, required: true, trim: true, index: true }, // e.g. "361320"
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', default: null }, // null means all kits / default for pincode
  combo_kit_name: { type: String, default: null }, // snapshot of kit name

  // Warehouse Fulfillment Mapping
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  warehouse_code: { type: String, default: null, trim: true }, // e.g. "WH-AHM-02"
  warehouse_name: { type: String, default: null, trim: true }, // e.g. "Ahmedabad Sub-Depot (WH-02)"
  warehouse_type: { type: String, enum: ['master', 'sub', null], default: null },

  // Pricing Mode: 'fixed' | 'per_km'
  pricing_mode: { type: String, enum: ['fixed', 'per_km'], default: 'fixed' },

  // Distance & KM Rate Parameters
  distance_km: { type: Number, default: 0, min: 0 },
  rate_per_km_loose: { type: Number, default: 0, min: 0 },
  rate_per_km_po: { type: Number, default: 0, min: 0 },
  rate_per_km_trial: { type: Number, default: 0, min: 0 },
  base_delivery_cost: { type: Number, default: 0, min: 0 },

  // Final / Effective delivery cost by order type
  delivery_cost: { type: Number, required: true, min: 0 }, // fallback / standard
  loose_delivery_cost: { type: Number, default: 0, min: 0 }, // Loose kit orders
  po_delivery_cost: { type: Number, default: 0, min: 0 }, // Bulk PO procurement orders
  trial_delivery_cost: { type: Number, default: 0, min: 0 }, // Trial kit orders

  estimated_days_min: { type: Number, default: 3 },
  estimated_days_max: { type: Number, default: 7 },
  is_active: { type: Boolean, default: true },
  notes: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  collection: 'pincode_delivery_costs',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

// Compound unique index on pincode + combo_kit_id
schema.index({ pincode: 1, combo_kit_id: 1 }, { unique: true });
schema.index({ state_name: 1, district_name: 1 });
schema.index({ district_id: 1 });
schema.index({ state_id: 1 });
schema.index({ warehouse_code: 1 });

module.exports = db.model('pincode_delivery_costs', schema);
