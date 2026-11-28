const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'gmail_smtp', 'resend'],
      required: true,
      unique: true,
      index: true
    },
    display_name: { type: String, required: true },
    allocated_limit: { type: Number, default: 10000 },
    used_count: { type: Number, default: 0 },
    remaining_count: { type: Number, default: 10000 },
    reset_period: {
      type: String,
      enum: ['rolling_24h', 'monthly', 'unlimited'],
      default: 'monthly'
    },
    period_start: { type: Date, default: Date.now },
    period_end: { type: Date },
    low_quota_threshold: { type: Number, default: 1000 },
    is_low_quota_alert_sent: { type: Boolean, default: false },
    last_synced_at: { type: Date, default: Date.now }
  },
  {
    collection: 'email_quotas',
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
  if (targetDb.models && targetDb.models['email_quotas']) {
    return targetDb.models['email_quotas'];
  }
  return targetDb.model('email_quotas', schema);
};

module.exports = getModel();
