const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_contents — CMS content items (banners, videos, themes, etc.)
 * assigned to one or more industry types and targeted at specific audiences.
 *
 * Collection: industry_contents
 */
const schema = new mongoose.Schema({
  // Content identity
  title:         { type: String, required: true, trim: true, maxlength: 300 },
  internal_name: { type: String, required: true, trim: true, maxlength: 300 },

  // Classification
  content_type: {
    type: String,
    required: true,
    enum: [
      'PHOTO', 'POSTER', 'VIDEO', 'GALLERY',
      'HERO_BANNER', 'IMAGE_SLIDER', 'VIDEO_SLIDER', 'EXPLAINER_VIDEO', 'PROMOTIONAL_CARD', 'ANNOUNCEMENT', 'INDUSTRY_THEME'
    ],
  },

  // Browse tab category — determines which public browse section this content appears in
  content_category: {
    type: String,
    enum: ['INDUSTRY', 'GOVT_TENDER'],
    default: 'INDUSTRY',
  },

  // Target audience (SolarKits Reseller, BOS Kits Distributor, EPC, or Both)
  target_audience: {
    type: String,
    required: true,
    enum: ['RESELLER', 'DISTRIBUTOR', 'EPC', 'BOTH'],
    default: 'BOTH',
  },

  // Display placement
  placement: {
    type: String,
    required: true,
    enum: [
      'HERO', 'GALLERY', 'POSTER_HIGHLIGHT', 'VIDEO_HIGHLIGHT',
      'DASHBOARD_TOP', 'DASHBOARD_MIDDLE', 'DASHBOARD_BOTTOM', 'STOREFRONT_TOP', 'PRODUCT_LISTING', 'PRODUCT_DETAILS', 'CHECKOUT_INFORMATION'
    ],
    default: 'GALLERY',
  },

  // Visible content
  heading:           { type: String, default: null, trim: true, maxlength: 500 },
  short_description: { type: String, default: null, trim: true, maxlength: 2000 },
  
  // Universal CTA
  cta_label:         { type: String, default: null, trim: true, maxlength: 100 },
  cta_url:           { type: String, default: null, trim: true, maxlength: 1000 },

  // Role-specific CTA overrides (when target_audience is BOTH)
  reseller_cta_label:    { type: String, default: null, trim: true, maxlength: 100 },
  reseller_cta_url:      { type: String, default: null, trim: true, maxlength: 1000 },
  distributor_cta_label: { type: String, default: null, trim: true, maxlength: 100 },
  distributor_cta_url:   { type: String, default: null, trim: true, maxlength: 1000 },

  // Highlight & Feature flags
  is_featured:       { type: Boolean, default: false },

  // Status lifecycle
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'EXPIRED', 'ARCHIVED'],
    default: 'DRAFT',
  },

  // Ordering & priority
  priority:      { type: Number, default: 0 },
  display_order: { type: Number, default: 0 },

  // Scheduling
  start_at: { type: Date, default: null },
  end_at:   { type: Date, default: null },

  // Media interaction & playback permissions
  autoplay:         { type: Boolean, default: false },
  show_controls:    { type: Boolean, default: true },
  muted:            { type: Boolean, default: true },
  loop:             { type: Boolean, default: false },
  allow_download:   { type: Boolean, default: true },
  allow_share:      { type: Boolean, default: true },
  allow_fullscreen: { type: Boolean, default: true },

  // Focal position for responsive cropping: 'center', 'top', 'bottom', 'left', 'right'
  focal_position:   { type: String, default: 'center', trim: true },

  // Analytics
  view_count:       { type: Number, default: 0 },
  likes_count:      { type: Number, default: 0 },

  // Optional Product / Kit associations
  related_kit_ids:  [{ type: String, trim: true }],

  // Geolocation targeting (Pan-India or specific States & Districts)
  is_all_states:        { type: Boolean, default: true },
  applicable_states:    [{ type: String, trim: true }],
  applicable_districts: [{ type: String, trim: true }],

  // Audit
  created_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  approved_by:  { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  published_at: { type: Date, default: null },
  updated_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
}, {
  collection: 'industry_contents',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for efficient dashboard content queries
schema.index({ status: 1, start_at: 1, end_at: 1, deleted_at: 1 });
schema.index({ target_audience: 1, placement: 1, status: 1 });
schema.index({ content_type: 1, status: 1 });
schema.index({ priority: -1, display_order: 1, published_at: -1 });
schema.index({ is_featured: 1 });
schema.index({ created_by: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('industry_contents', schema);
