const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_notifications — In-app notification queue for BOSKIT entities.
 *
 * Tracks all notification events. Read/unread state per recipient.
 * Email/SMS/WhatsApp deliveries are logged separately in notification_deliveries (future).
 *
 * Collection: boskit_notifications
 */

const schema = new mongoose.Schema({
  // ── Recipient ─────────────────────────────────────────────────────────────
  recipient_type: {
    type: String,
    enum: ['boskit_distributor', 'boskit_dealer', 'cms_user'],
    required: true,
  },
  recipient_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // ── Notification Content ──────────────────────────────────────────────────
  event_type: {
    type: String,
    required: true,
    trim: true,
    // e.g. 'application_submitted', 'gst_verification_result', 'application_approved',
    //      'application_rejected', 'account_activated', 'dealer_added',
    //      'order_placed', 'payment_success', 'payment_failure',
    //      'order_status_changed', 'plan_expiry', 'kyc_rejected'
  },
  title:    { type: String, required: true, trim: true, maxlength: 300 },
  message:  { type: String, required: true, trim: true, maxlength: 2000 },
  icon:     { type: String, default: null, trim: true }, // icon name or URL
  action_url: { type: String, default: null, trim: true }, // deep link URL

  // ── Linked Entity ─────────────────────────────────────────────────────────
  entity_type: { type: String, default: null, trim: true }, // 'boskit_orders', 'boskit_distributor_applications', etc.
  entity_id:   { type: mongoose.Schema.Types.ObjectId, default: null },

  // ── Channel Delivery Status ───────────────────────────────────────────────
  channels: {
    in_app: {
      sent:    { type: Boolean, default: true },
      read:    { type: Boolean, default: false },
      read_at: { type: Date, default: null },
    },
    email: {
      sent:      { type: Boolean, default: false },
      sent_at:   { type: Date, default: null },
      failed:    { type: Boolean, default: false },
      failure_reason: { type: String, default: null },
    },
    sms: {
      sent:      { type: Boolean, default: false },
      sent_at:   { type: Date, default: null },
      failed:    { type: Boolean, default: false },
    },
    whatsapp: {
      sent:      { type: Boolean, default: false },
      sent_at:   { type: Date, default: null },
      failed:    { type: Boolean, default: false },
    },
  },

  // ── Priority ──────────────────────────────────────────────────────────────
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
}, {
  collection: 'boskit_notifications',
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ recipient_type: 1, recipient_id: 1, 'channels.in_app.read': 1, created_at: -1 });
schema.index({ event_type: 1, created_at: -1 });
schema.index({ entity_type: 1, entity_id: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_notifications', schema);
