const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

// project_range
const schema = new mongoose.Schema({
  min_value: { type: Number, required: true },
  max_value: { type: Number, required: true },
  unit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_units', required: true },
  subcategory_type: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_type_maps', required: true },
  is_active: { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, { collection: 'sys_filter_ranges', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('sys_filter_ranges', schema);
