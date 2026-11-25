const mongoose = require('mongoose');
const { solarkits_core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_product_subtypes', required: true },
  group_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  unit_group_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  data_type: { type: String, default: 'text' },
  is_required: { type: Boolean, default: false },
  is_variant: { type: Boolean, default: false },
  is_sku_part: { type: Boolean, default: false },
  is_filterable: { type: Boolean, default: false },
  attribute_type: { type: String, enum: ['sku', 'phase', 'tolerance', 'tollarance', 'engineering', 'custom'], default: 'custom' },
  is_system: { type: Boolean, default: false },
  display_order: { type: Number, default: 0 },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_subtype_attributes', timestamps: false, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
s.virtual('is_sku').get(function () { return this.attribute_type === 'sku'; });
s.virtual('is_phase').get(function () { return this.attribute_type === 'phase'; });
s.virtual('is_tolerance').get(function () { return this.attribute_type === 'tolerance' || this.attribute_type === 'tollarance'; });
s.virtual('is_engineering').get(function () { return this.attribute_type === 'engineering'; });

module.exports = db.model('pc_subtype_attributes', s);
