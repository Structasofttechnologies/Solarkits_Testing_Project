const mongoose = require('mongoose');
const { core_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  subtype_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  group_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  unit_group_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  data_type: { type: String, default: 'text' },
  is_required: { type: Boolean, default: false },
  is_variant: { type: Boolean, default: false },
  is_sku_part: { type: Boolean, default: false },
  is_filterable: { type: Boolean, default: false },
  attribute_type: { type: String, default: 'custom' },
  is_system: { type: Boolean, default: false },
  display_order: { type: Number, default: 0 },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'pc_subtype_attributes', timestamps: false });

s.virtual('id').get(function () { return this._id; });

module.exports = db.models.pc_subtype_attributes || db.model('pc_subtype_attributes', s);
