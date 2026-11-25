const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * project_type_industry_maps — M:N mapping between project subcategory types
 * (sys_filter_subcategories) and industry types (sys_industry_types).
 *
 * This allows an admin to say: "Project type X is available for industry types A, B, C"
 *
 * Collection: sys_project_industry_maps
 */
const schema = new mongoose.Schema({
  project_subcategory_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_filter_subcategories',
    required: true,
  },
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    required: true,
  },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'sys_project_industry_maps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Prevent duplicate mappings
schema.index(
  { project_subcategory_id: 1, industry_type_id: 1, deleted_at: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ project_subcategory_id: 1, is_active: 1 });
schema.index({ industry_type_id: 1, is_active: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('sys_project_industry_maps', schema);
