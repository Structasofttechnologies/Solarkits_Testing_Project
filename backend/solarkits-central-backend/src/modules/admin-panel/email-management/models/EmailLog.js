const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    recipient: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipient_name: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    template_name: { type: String, default: 'custom', index: true },
    purpose: {
      type: String,
      enum: ['transactional', 'otp', 'marketing', 'alert', 'system'],
      default: 'transactional',
      index: true
    },
    provider: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'gmail_smtp', 'resend'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['queued', 'accepted', 'delivered', 'bounced', 'complained', 'failed', 'rejected'],
      default: 'queued',
      index: true
    },
    message_id: { type: String, index: true, sparse: true },
    error_message: { type: String, default: null },
    error_code: { type: String, default: null },
    attempts_count: { type: Number, default: 1 },
    max_attempts: { type: Number, default: 3 },
    is_resend_eligible: { type: Boolean, default: false, index: true },
    is_locked_bounce: { type: Boolean, default: false, index: true },
    bounce_type: {
      type: String,
      enum: ['permanent', 'transient', null],
      default: null
    },
    opened_at: { type: Date, default: null },
    clicked_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
    html_snippet: { type: String, default: '' },
    payload_metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    collection: 'email_logs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

const getModel = () => {
  const targetDb = db || mongoose;
  if (targetDb.models && targetDb.models['email_logs']) {
    return targetDb.models['email_logs'];
  }
  return targetDb.model('email_logs', schema);
};

module.exports = getModel();
