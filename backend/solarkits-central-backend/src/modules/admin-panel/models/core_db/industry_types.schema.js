const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_types — Master list of industry types for reseller/EPC configuration.
 * Examples: "Residential", "Commercial", "Industrial", "Agricultural", "Government"
 *
 * Collection: sys_industry_types
 */
const schema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true, maxlength: 250 },
  code:          { type: String, default: null, trim: true, uppercase: true, maxlength: 50 },
  slug:          { type: String, required: true, trim: true, lowercase: true, maxlength: 100, unique: true },
  description:   { type: String, default: null, trim: true, maxlength: 1000 },
  icon:          { type: String, default: null, trim: true, maxlength: 500 },  // Cloudinary URL or emoji
  cover_image:   { type: String, default: null, trim: true, maxlength: 500 },  // Cloudinary URL
  thumbnail:     { type: String, default: null, trim: true, maxlength: 500 },  // Cloudinary URL
  sort_order:    { type: Number, default: 0 },
  is_active:     { type: Boolean, default: true },
  // Audience availability
  for_resellers: { type: Boolean, default: true },
  for_epc:       { type: Boolean, default: true },
  created_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at:    { type: Date, default: null },
}, {
  collection: 'sys_industry_types',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ name: 1, deleted_at: 1 });
schema.index({ sort_order: 1, is_active: 1 });
schema.index({ code: 1, deleted_at: 1 }, { sparse: true });
schema.index({ for_resellers: 1, is_active: 1, deleted_at: 1 });
schema.index({ for_epc: 1, is_active: 1, deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('sys_industry_types', schema);
