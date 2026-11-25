const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_content_media — Stores media files associated with a content item.
 * Each content item can have multiple media files for different device types.
 *
 * Collection: industry_content_media
 */
const schema = new mongoose.Schema({
  content_id: { type: mongoose.Schema.Types.ObjectId, ref: 'industry_contents', required: true },

  // Media classification
  media_type: {
    type: String,
    enum: ['IMAGE', 'VIDEO', 'THUMBNAIL', 'POSTER', 'PHOTO', 'ALBUM_ITEM'],
    required: true,
  },

  // Device targeting
  device_type: {
    type: String,
    enum: ['DESKTOP', 'TABLET', 'MOBILE', 'ALL'],
    default: 'ALL',
  },

  // Storage info
  url:           { type: String, required: true, trim: true, maxlength: 1000 },  // Cloudinary secure_url OR external URL
  thumbnail_url: { type: String, default: null, trim: true, maxlength: 1000 },  // Custom video or poster thumbnail
  poster_url:    { type: String, default: null, trim: true, maxlength: 1000 },  // Poster image link
  storage_key:   { type: String, default: null, trim: true, maxlength: 500 },    // Cloudinary public_id
  is_external:   { type: Boolean, default: false },  // true if streaming URL (YouTube, Vimeo, etc.)

  // Media metadata
  mime_type:    { type: String, default: null, trim: true, maxlength: 100 },
  file_size:    { type: Number, default: null },  // bytes
  width:        { type: Number, default: null },
  height:       { type: Number, default: null },
  duration_sec: { type: Number, default: null },  // for videos

  // Processing state
  processing_status: {
    type: String,
    enum: ['PENDING', 'READY', 'FAILED'],
    default: 'READY',
  },

  // Accessibility, display & positioning
  alt_text:    { type: String, default: null, trim: true, maxlength: 300 },
  caption:     { type: String, default: null, trim: true, maxlength: 500 },
  focal_point: { type: String, default: 'center', trim: true },
  sort_order:  { type: Number, default: 0 },
  is_primary:  { type: Boolean, default: false },  // Primary media for this device type

  deleted_at: { type: Date, default: null },
}, {
  collection: 'industry_content_media',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ content_id: 1, device_type: 1, media_type: 1, deleted_at: 1 });
schema.index({ content_id: 1, is_primary: 1 });
schema.index({ processing_status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('industry_content_media', schema);
