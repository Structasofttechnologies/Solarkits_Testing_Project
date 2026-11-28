const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    provider_key: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'gmail_smtp', 'resend'],
      required: true,
      unique: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    is_enabled: { type: Boolean, default: true, index: true },
    is_default: { type: Boolean, default: false, index: true },
    fallback_enabled: { type: Boolean, default: true },
    fallback_provider_key: { type: String, default: null },
    priority: { type: Number, default: 1 },
    credentials: {
      api_key: { type: String, default: '' },
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      region: { type: String, default: 'ap-south-1' },
      access_key_id: { type: String, default: '' },
      secret_access_key: { type: String, default: '' },
      from_email: { type: String, default: 'noreply@solarkits.in' },
      from_name: { type: String, default: 'SolarKits Admin' }
    },
    max_send_rate: { type: Number, default: 14 },
    health_status: {
      type: String,
      enum: ['healthy', 'degraded', 'offline', 'untested'],
      default: 'healthy'
    },
    last_tested_at: { type: Date, default: null },
    last_error: { type: String, default: null }
  },
  {
    collection: 'email_providers',
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
  if (targetDb.models && targetDb.models['email_providers']) {
    return targetDb.models['email_providers'];
  }
  return targetDb.model('email_providers', schema);
};

module.exports = getModel();
