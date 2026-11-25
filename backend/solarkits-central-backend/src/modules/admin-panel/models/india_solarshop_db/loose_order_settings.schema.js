const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const schema = new mongoose.Schema({
  country_id:              { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', default: null },
  warehouse_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', required: true },
  is_loose_order_enabled:  { type: Boolean, default: true },
  min_order_quantity:      { type: Number, default: 1 },
  max_order_quantity:      { type: Number, default: 100 },
  allow_loose_panels:      { type: Boolean, default: true },
  allow_loose_inverters:   { type: Boolean, default: true },
  allow_loose_batteries:   { type: Boolean, default: true },
  allow_loose_bos:         { type: Boolean, default: true },
  loose_markup_percentage: { type: Number, default: 5 },
  custom_notes:            { type: String, default: '' },
  is_active:               { type: Boolean, default: true },
  deleted_at:              { type: Date, default: null }
}, {
  collection: 'loose_order_settings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.virtual('id').get(function () { return this._id; });
schema.index({ warehouse_id: 1, deleted_at: 1 });

module.exports = db.model('loose_order_settings', schema);
