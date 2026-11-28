const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_campaigns',
      default: null,
      index: true
    },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_templates',
      default: null
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_senders',
      default: null,
      index: true
    },
    epc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      default: null
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'website_epc_leads',
      default: null
    },
    job_id: { type: String, default: null, trim: true },
    source_type: {
      type: String,
      enum: ['campaign', 'sender_test', 'template_test', 'campaign_test', 'queue_retry', 'test', 'manual'],
      default: 'campaign'
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp'],
      required: true,
      index: true
    },
    provider: { type: String, default: null, trim: true },
    recipient_name: { type: String, default: null, trim: true },
    recipient_email: { type: String, default: null, trim: true, lowercase: true },
    recipient_phone: { type: String, default: null, trim: true },
    subject_or_template: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'skipped_unsubscribed', 'simulated'],
      required: true,
      index: true
    },
    simulated: { type: Boolean, default: false },
    message_id: { type: String, default: null, trim: true },
    error_code: { type: String, default: null, trim: true },
    error_message: { type: String, default: null, trim: true },
    provider_response: { type: mongoose.Schema.Types.Mixed, default: null },
    attempt: { type: Number, default: 1 },
    dispatched_at: { type: Date, default: Date.now, index: true }
  },
  {
    collection: 'marketing_delivery_logs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ campaign_id: 1, created_at: -1 });
schema.index({ status: 1, created_at: -1 });

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_delivery_logs', schema);
