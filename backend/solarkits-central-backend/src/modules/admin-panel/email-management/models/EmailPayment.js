const mongoose = require('mongoose');
const { USER_DB: db } = require('../../../../config/databases');

const schema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['sender', 'aws_ses', 'smtp', 'resend'],
      required: true,
      index: true
    },
    invoice_number: { type: String, required: true, unique: true, trim: true },
    billing_period: { type: String, required: true }, // e.g. "November 2026"
    amount_invoiced: { type: Number, required: true },
    amount_paid: { type: Number, default: 0 },
    amount_pending: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    payment_status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'partially_paid'],
      default: 'paid',
      index: true
    },
    payment_date: { type: Date, default: null },
    due_date: { type: Date, default: null },
    plan_tier: { type: String, default: 'Pro 50,000 Credits' },
    total_credits: { type: Number, default: 50000 },
    invoice_url: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  {
    collection: 'email_payments',
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
  if (targetDb.models && targetDb.models['email_payments']) {
    return targetDb.models['email_payments'];
  }
  return targetDb.model('email_payments', schema);
};

module.exports = getModel();
