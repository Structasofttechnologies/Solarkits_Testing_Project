const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id:    { type: mongoose.Schema.Types.ObjectId, default: null },
  state_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'sys_geo_level_1', default: null }, // null = All India
  state_name:    { type: String, default: 'All India', trim: true },
  district_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'sys_geo_level_2', default: null }, // null = All districts
  district_name: { type: String, default: 'All Districts', trim: true },
  pincode:       { type: String, default: null, trim: true }, // optional specific pincode
  combo_kit_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true },
  kit_type:      { type: String, default: null, trim: true }, // On-Grid, Off-Grid, Hybrid, Commercial, etc.
  badge_text:    { type: String, default: 'Our Best Seller', trim: true },
  priority:      { type: Number, default: 1, min: 1 }, // 1 = top priority
  is_active:     { type: Boolean, default: true },
  notes:         { type: String, default: null },
  created_at:    { type: Date, default: Date.now },
  updated_at:    { type: Date, default: Date.now },
  deleted_at:    { type: Date, default: null }
}, {
  collection: 'best_seller_kits',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });

schema.index({ state_id: 1, district_id: 1, is_active: 1, deleted_at: 1 });
schema.index({ combo_kit_id: 1, deleted_at: 1 });

module.exports = db.model('best_seller_kits', schema);
