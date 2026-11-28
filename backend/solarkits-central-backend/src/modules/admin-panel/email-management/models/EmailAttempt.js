const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    email_log_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'email_logs',
      required: true,
      index: true
    },
    attempt_number: { type: Number, required: true },
    provider: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'gmail_smtp', 'resend'],
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'in_progress'],
      required: true
    },
    error: { type: String, default: null },
    duration_ms: { type: Number, default: 0 },
    response_data: { type: mongoose.Schema.Types.Mixed, default: {} },
    dispatched_at: { type: Date, default: Date.now }
  },
  {
    collection: 'email_attempts',
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
  if (targetDb.models && targetDb.models['email_attempts']) {
    return targetDb.models['email_attempts'];
  }
  return targetDb.model('email_attempts', schema);
};

module.exports = getModel();
