const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

// project_subcategory_types — pivot table (subcategory_id, type_id)
const schema = new mongoose.Schema({

  subcategory:        { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_subcategories', required: true },
  type:               { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types', required: true },
  is_active:          { type: Boolean, default: true },
  deleted_at:         { type: Date, default: null },
}, { collection: 'sys_filter_type_maps', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('sys_filter_type_maps', schema);
