const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  state_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', required: true },
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  name:               { type: String, required: true, trim: true },
  category_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories' },
  subcategory_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories' },
  type_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps' },
  project_range_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_ranges', default: null },
  subscription_rate:  { type: Number, required: true },
  order_size:         { type: Number, required: true },
  order_size_unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units' },
  po_validity_type:   { type: String, enum: ['days', 'monthly_date'], default: 'days' },
  po_validity_days:   { type: Number, default: null },
  po_validity_date:   { type: Number, default: null },
  token_settlement_rule: { type: String, enum: ['PRO_RATA', 'FINAL_ORDER', 'UPFRONT'], default: 'PRO_RATA' },
  penalty_type:       { type: String, enum: ['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'], default: 'FLAT_PER_UNPURCHASED_KIT' },
  penalty_rate:       { type: Number, default: 500 },
  penalty_rules:      [{
    min_committed_qty: { type: Number, default: 1 },
    max_committed_qty: { type: Number, default: null },
    penalty_type:      { type: String, enum: ['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'], default: 'FLAT_PER_UNPURCHASED_KIT' },
    penalty_rate:      { type: Number, default: 500 },
  }],
  is_active:          { type: Boolean, default: true },
  disabled_kits:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit' }],
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now }
}, { collection: 'po_settings', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

schema.index({ warehouse_id: 1, name: 1, deleted_at: 1 }, { unique: true });

module.exports = db.model('po_settings', schema);
