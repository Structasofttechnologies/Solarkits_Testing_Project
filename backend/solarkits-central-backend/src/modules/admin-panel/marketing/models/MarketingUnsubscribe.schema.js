const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      default: null,
      trim: true,
      lowercase: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: null
    },
    epc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      default: null
    },
    campaign_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'marketing_campaigns',
      default: null
    },
    channel: {
      type: String,
      enum: ['email', 'whatsapp', 'all'],
      default: 'email'
    },
    source: {
      type: String,
      enum: ['email_footer_click', 'admin_manual', 'user_request', 'complaint'],
      default: 'email_footer_click'
    },
    reason: {
      type: String,
      trim: true,
      default: 'Not interested in solar wholesale offers'
    },
    ip_address: {
      type: String,
      default: null
    },
    user_agent: {
      type: String,
      default: null
    },
    unsubscribed_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    is_active: {
      type: Boolean,
      default: true // true = unsubscribed; false = resubscribed
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Compound index for quick lookup
schema.index({ email: 1, is_active: 1 });

const model = db.model('marketing_unsubscribes', schema);
module.exports = model;
