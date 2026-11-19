const mongoose = require('mongoose');
const { USER_DB: db } = require('../../config/databases');

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['email', 'whatsapp'], required: true },
    name: { type: String, required: true, trim: true }, // Display label (e.g. "SolarKits Primary Marketing", "Sales Desk WhatsApp")
    is_default: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'connected', 'inactive', 'disconnected', 'verification_pending'],
      default: 'active'
    },

    // ── Email Account Specifics (SMTP / Nodemailer) ──
    sender_name: { type: String, trim: true },
    sender_email: { type: String, trim: true, lowercase: true },
    reply_to_email: { type: String, trim: true, lowercase: true },
    smtp_host: { type: String, trim: true },
    smtp_port: { type: Number, default: 587 },
    smtp_secure: { type: Boolean, default: false },
    smtp_user: { type: String, trim: true },
    smtp_pass: { type: String }, // In real deployment can be encrypted
    email_signature: { type: String, default: '<p>Best Regards,<br><strong>SolarKits India Team</strong></p>' },

    // ── WhatsApp Account Specifics (Meta Cloud API) ──
    wa_business_name: { type: String, trim: true },
    wa_number: { type: String, trim: true }, // e.g. +91 9913421453
    phone_number_id: { type: String, trim: true },
    waba_id: { type: String, trim: true },
    meta_access_token: { type: String },
    api_provider: { type: String, default: 'meta_cloud_api' },
    meta_app_id: { type: String, default: null },

    last_tested_at: { type: Date, default: null },
    last_error: { type: String, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null }
  },
  {
    collection: 'marketing_senders',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('marketing_senders', schema);
