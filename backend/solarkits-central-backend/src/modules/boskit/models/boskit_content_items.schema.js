const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_content_items — CMS content for the BOSKIT website.
 *
 * Manages banners, videos, and images displayed on the BOSKIT public website
 * and authenticated portals.
 *
 * Targeting rules control which content is shown to which audience.
 *
 * Collection: boskit_content_items
 */

const schema = new mongoose.Schema({
  // ── Content Type ──────────────────────────────────────────────────────────
  content_type: {
    type: String,
    enum: [
      'desktop_banner', 'mobile_banner', 'promotional_banner',
      'product_banner', 'product_video', 'installation_video',
      'distributor_video', 'promotional_video',
      'product_image', 'shop_image', 'installation_image',
      'project_image', 'distributor_image',
    ],
    required: true,
  },

  // ── Content Details ───────────────────────────────────────────────────────
  title:       { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, default: null, trim: true, maxlength: 2000 },
  alt_text:    { type: String, default: null, trim: true, maxlength: 300 },

  // ── Media ─────────────────────────────────────────────────────────────────
  media_url:          { type: String, default: null },  // Cloudinary URL
  media_storage_key:  { type: String, default: null },  // Encrypted storage key
  media_type:         { type: String, enum: ['image', 'video', null], default: null },
  thumbnail_url:      { type: String, default: null },  // For videos

  // ── CTA ───────────────────────────────────────────────────────────────────
  cta_text:   { type: String, default: null, trim: true, maxlength: 100 },
  cta_url:    { type: String, default: null, trim: true },

  // ── Display ───────────────────────────────────────────────────────────────
  display_position: { type: String, default: null, trim: true, maxlength: 100 }, // 'hero', 'sidebar', 'footer', etc.
  priority:         { type: Number, default: 100 },

  // ── Targeting ─────────────────────────────────────────────────────────────
  target_platform:    { type: String, enum: ['boskit', 'solarkits', 'both'], default: 'boskit' },
  target_channel:     { type: String, enum: ['public', 'distributor', 'dealer', 'all'], default: 'public' },
  target_state_ids:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1' }],
  target_district_ids:[{ type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2' }],
  target_industry_ids:[{ type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types' }],
  target_product_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'products' }],
  target_plan_ids:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'boskit_distributor_plans' }],

  // ── Schedule ──────────────────────────────────────────────────────────────
  start_datetime: { type: Date, default: null },
  end_datetime:   { type: Date, default: null },

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'expired', 'archived'],
    default: 'draft',
  },
  published_at:   { type: Date, default: null },
  published_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

  // ── Audit ────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'boskit_content_items',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ content_type: 1, status: 1, priority: 1 });
schema.index({ target_platform: 1, target_channel: 1, status: 1 });
schema.index({ start_datetime: 1, end_datetime: 1, status: 1 });
schema.index({ deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_content_items', schema);
