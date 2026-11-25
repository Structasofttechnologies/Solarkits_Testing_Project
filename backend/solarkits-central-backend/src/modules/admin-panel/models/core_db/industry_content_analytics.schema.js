const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * industry_content_analytics — Optional tracking for content impressions, CTA clicks, video events.
 * Auto-expires after 90 days via TTL index on recorded_at.
 * No PII is stored — only user_type and user_id (ObjectId, not email/phone).
 *
 * Collection: industry_content_analytics
 */
const schema = new mongoose.Schema({
  content_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'industry_contents', required: true },
  industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', required: true },

  event_type: {
    type: String,
    enum: ['IMPRESSION', 'VIDEO_START', 'VIDEO_COMPLETE', 'CTA_CLICK'],
    required: true,
  },

  // Who triggered the event (no PII)
  user_type: { type: String, enum: ['RESELLER', 'EPC', 'ANONYMOUS'], default: 'ANONYMOUS' },
  user_id:   { type: mongoose.Schema.Types.ObjectId, default: null },

  // Context
  placement:   { type: String, default: null },
  device_type: { type: String, default: null },

  recorded_at: { type: Date, default: Date.now },
}, {
  collection: 'industry_content_analytics',
  timestamps: false,
});

// TTL: auto-delete records after 90 days
schema.index({ recorded_at: 1 }, { expireAfterSeconds: 7776000 });
schema.index({ content_id: 1, event_type: 1, recorded_at: -1 });
schema.index({ industry_type_id: 1, event_type: 1, recorded_at: -1 });

module.exports = solarkits_core_db.model('industry_content_analytics', schema);
