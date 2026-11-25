const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', required: true },
  combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit', required: true },
  
  kit_type: { type: String, enum: ['combo', 'customize', 'bulk'], required: true },

  sub_warehouse_active: { type: Boolean, default: false },
  master_warehouse_active: { type: Boolean, default: false },
  nearest_supplier_active: { type: Boolean, default: false },
  in_cluster_supplier_active: { type: Boolean, default: false },

  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'order_settings', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

// Ensure uniqueness per district, kit and type
schema.index({ district_id: 1, combo_kit_id: 1, kit_type: 1, deleted_at: 1 }, { unique: true });

module.exports = db.model('order_settings', schema);
