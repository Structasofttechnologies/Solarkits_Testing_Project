const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: true },
  is_combokit_active: { type: Boolean, default: false },
  is_customize_kit_active: { type: Boolean, default: false },
  base_price_cached: { type: Number, default: 0 },
  selling_price_cached: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  collection: 'warehouse_kit_activations',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ warehouse_id: 1, combo_kit_id: 1, deleted_at: null }, { unique: true });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('warehouse_kit_activations', schema);
