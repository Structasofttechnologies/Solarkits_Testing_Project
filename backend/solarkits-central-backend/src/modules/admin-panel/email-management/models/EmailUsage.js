const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    provider: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'gmail_smtp', 'resend'],
      required: true,
      index: true
    },
    purpose: { type: String, default: 'all' },
    total_sent: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    complained: { type: Number, default: 0 }
  },
  {
    collection: 'email_usage',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

schema.index({ date: 1, provider: 1 }, { unique: true });

schema.virtual('id').get(function () {
  return this._id;
});

const getModel = () => {
  const targetDb = db || mongoose;
  if (targetDb.models && targetDb.models['email_usage']) {
    return targetDb.models['email_usage'];
  }
  return targetDb.model('email_usage', schema);
};

module.exports = getModel();
