const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['low_quota', 'high_bounce', 'auth_failed', 'high_failure_rate'],
      required: true,
      index: true
    },
    provider: { type: String, required: true, index: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    threshold: { type: Number, default: 0 },
    current_value: { type: Number, default: 0 },
    is_resolved: { type: Boolean, default: false, index: true },
    resolved_at: { type: Date, default: null }
  },
  {
    collection: 'email_alerts',
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
  if (targetDb.models && targetDb.models['email_alerts']) {
    return targetDb.models['email_alerts'];
  }
  return targetDb.model('email_alerts', schema);
};

module.exports = getModel();
