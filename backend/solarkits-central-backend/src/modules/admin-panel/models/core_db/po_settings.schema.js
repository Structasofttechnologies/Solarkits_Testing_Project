const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

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
  is_active:          { type: Boolean, default: true },
  disabled_kits:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'pc_comobo_kit' }],
  deleted_at:         { type: Date, default: null },
  created_at:         { type: Date, default: Date.now }
}, { collection: 'po_settings', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });

schema.index({ warehouse_id: 1, name: 1, deleted_at: 1 }, { unique: true });

module.exports = db.model('po_settings', schema);
