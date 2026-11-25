const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * project_categories (sys_filter_categories)
 *
 * Extended in Phase 1 to support:
 *   - sort_order: admin-controlled display sequence
 *   - display_visibility: controls shop-front visibility
 *   - country_ids / state_ids: geographic availability scoping
 *
 * All new fields have defaults — existing documents are NOT affected.
 */
const schema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true, maxlength: 250 },
  // --- Phase 1 additions (backward-compatible) ---
  sort_order:         { type: Number, default: 0 },
  display_visibility: { type: Boolean, default: true },
  country_ids:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0' }],
  state_ids:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  // ------------------------------------------------
  industry_type_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'sys_filter_categories',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ sort_order: 1, is_active: 1 });

schema.virtual('id').get(function () { return this._id; });
module.exports = solarkits_core_db.model('sys_filter_categories', schema);
