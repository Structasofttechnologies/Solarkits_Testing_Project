const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * razorpay_webhook_logs — Audit schema for incoming Razorpay webhook events.
 * Enforces webhook idempotency via unique index on event_id.
 */
const schema = new mongoose.Schema({
  event_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  event_type: {
    type: String,
    required: true,
    trim: true,
  },
  order_id: {
    type: String,
    default: null,
    trim: true,
  },
  payment_id: {
    type: String,
    default: null,
    trim: true,
  },
  payload: {
    type: Object,
    required: true,
  },
  status: {
    type: String,
    enum: ['received', 'processed', 'ignored', 'failed'],
    default: 'received',
  },
  error_message: {
    type: String,
    default: null,
  },
  processed_at: {
    type: Date,
    default: null,
  },
}, {
  collection: 'razorpay_webhook_logs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ event_type: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('razorpay_webhook_logs', schema);
