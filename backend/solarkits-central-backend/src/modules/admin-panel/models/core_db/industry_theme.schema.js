const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_themes — Design token configuration per industry type.
 * Applied as CSS variables on the dashboard when a user selects an industry.
 * One theme record per industry (unique).
 *
 * Collection: industry_themes
 */
const schema = new mongoose.Schema({
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    required: true,
    unique: true,
  },

  // Color tokens (hex, rgb, or hsl strings — sanitized on save)
  primary_color:   { type: String, default: null, trim: true, maxlength: 50 },
  secondary_color: { type: String, default: null, trim: true, maxlength: 50 },
  accent_color:    { type: String, default: null, trim: true, maxlength: 50 },
  bg_color:        { type: String, default: null, trim: true, maxlength: 50 },
  text_color:      { type: String, default: null, trim: true, maxlength: 50 },
  section_bg:      { type: String, default: null, trim: true, maxlength: 50 },

  // Button style
  button_style: {
    type: String,
    enum: ['SOLID', 'OUTLINE', 'GHOST'],
    default: 'SOLID',
  },

  // Default fallback media
  default_banner_url:           { type: String, default: null, trim: true, maxlength: 1000 },
  default_video_thumbnail_url:  { type: String, default: null, trim: true, maxlength: 1000 },

  // Audit
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'industry_themes',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ industry_type_id: 1, deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('industry_themes', schema);
