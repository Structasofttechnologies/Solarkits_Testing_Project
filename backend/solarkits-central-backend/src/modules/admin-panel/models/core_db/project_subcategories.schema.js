const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

// project_subcategories — category_id SAME DB → ObjectId
const schema = new mongoose.Schema({

  name:           { type: String, required: true, trim: true, maxlength: 250 },
  category:       { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_categories', required: true },
  image:          { type: String, default: null },
  color:          { type: String, default: null },
  is_active:      { type: Boolean, default: true },
  deleted_at:     { type: Date, default: null },
}, { collection: 'sys_filter_subcategories', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

schema.index({ category: 1 });
schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('sys_filter_subcategories', schema);
