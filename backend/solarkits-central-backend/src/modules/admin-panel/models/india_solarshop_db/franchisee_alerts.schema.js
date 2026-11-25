const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_alerts — Individual alert instances generated for franchisee performance events.
 *
 * Protected by idempotency_key to prevent duplicate alerts for the same
 * franchisee + period + condition.
 *
 * Collection: franchisee_alerts
 */
const schema = new mongoose.Schema(
  {
    // ── Alert Classification ──────────────────────────────────────────────────
    alert_type: {
      type: String,
      enum: [
        'NO_ORDERS_THIS_MONTH',
        'BELOW_MONTHLY_TARGET',
        'BELOW_HISTORICAL_AVERAGE',
        'LIKELY_TO_MISS_GOAL',
        'INACTIVE_DAYS_EXCEEDED',
        'PO_PENDING_APPROVAL',
        'PO_NEARING_EXPIRY',
        'PO_UNPAID',
        'GOAL_ACHIEVED',
        'GOAL_EXCEEDED',
      ],
      required: true,
    },

    // ── Context ───────────────────────────────────────────────────────────────
    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      required: true,
    },
    fpo_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'fpo_orders',
      default: null,
    },
    period_month: { type: Number, min: 1, max: 12, default: null },
    period_year:  { type: Number, default: null },

    // ── Values at Time of Alert ───────────────────────────────────────────────
    threshold_value: { type: Number, default: null },
    actual_value:    { type: Number, default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
    },
    notified_via:  [{ type: String, enum: ['inapp', 'email', 'whatsapp', 'sms'] }],
    resolved_at:   { type: Date, default: null },
    resolved_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },

    // ── Idempotency ───────────────────────────────────────────────────────────
    // Format: ALERT-{alert_type}-{franchisee_id}-{period_month}-{period_year}
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    collection: 'franchisee_alerts',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ franchisee_id: 1, status: 1, created_at: -1 });
schema.index({ alert_type: 1, status: 1 });
schema.index({ period_year: 1, period_month: 1, alert_type: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_alerts', schema);
