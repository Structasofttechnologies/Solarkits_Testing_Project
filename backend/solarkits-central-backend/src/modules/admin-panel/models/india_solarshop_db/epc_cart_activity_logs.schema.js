const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * epc_cart_activity_logs
 *
 * Tracks individual Add-to-Cart attempts, successes, and failures
 * made by EPC buyers to calculate Buying Behavior and Cart Engagement analytics.
 */
const schema = new mongoose.Schema(
  {
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      required: true,
      index: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'products',
      default: null,
    },
    kit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'pc_combo_kits',
      default: null,
    },
    capacity: {
      type: String,
      default: null,
      trim: true,
    },
    item_name: {
      type: String,
      default: null,
      trim: true,
    },
    action_type: {
      type: String,
      enum: ['attempt', 'success', 'failure'],
      default: 'attempt',
    },
    is_success: {
      type: Boolean,
      default: true,
    },
    failure_reason: {
      type: String,
      default: null,
      trim: true,
    },
    source_page: {
      type: String,
      default: 'catalogue',
      trim: true,
    },
    idempotency_key: {
      type: String,
      default: null,
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'epc_cart_activity_logs',
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ account_id: 1, created_at: -1 });
schema.index({ idempotency_key: 1 }, { sparse: true });

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('epc_cart_activity_logs', schema);

