const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_content_industry_map — Many-to-many mapping between content and industry types.
 * A single content item can be assigned to multiple industries.
 * Setting assign_all=true means it is visible to ALL active industries.
 *
 * Collection: industry_content_industry_maps
 */
const schema = new mongoose.Schema({
  content_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'industry_contents', required: true },
  industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', required: true },
  is_active:        { type: Boolean, default: true },
  deleted_at:       { type: Date, default: null },
}, {
  collection: 'industry_content_industry_maps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Unique active mapping (allow soft-deleted to remain for audit)
schema.index({ content_id: 1, industry_type_id: 1 }, { unique: true });
schema.index({ industry_type_id: 1, deleted_at: 1 });
schema.index({ content_id: 1, deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('industry_content_industry_maps', schema);
