const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_alert_configs — Admin-configurable alert rule definitions.
 *
 * Each config drives a specific alert evaluation in franchisee.alert.service.js.
 * Changing a config only affects future evaluations; past alert records are unmodified.
 *
 * Collection: franchisee_alert_configs
 */
const schema = new mongoose.Schema(
  {
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
      unique: true,
    },

    // ── Threshold ─────────────────────────────────────────────────────────────
    // Interpretation varies by alert_type:
    //   BELOW_MONTHLY_TARGET       → achievement % below this value (e.g. 50 means < 50%)
    //   BELOW_HISTORICAL_AVERAGE   → % deviation below average (e.g. 20 means 20% below avg)
    //   LIKELY_TO_MISS_GOAL        → projected % at month-end
    //   INACTIVE_DAYS_EXCEEDED     → number of days without an order
    //   PO_NEARING_EXPIRY          → days until expiry (e.g. 3 means alert 3 days before)
    //   PO_UNPAID                  → hours PO has been in AWAITING_PAYMENT status
    threshold: { type: Number, default: null },

    // ── Evaluation ────────────────────────────────────────────────────────────
    evaluation_frequency_hours: {
      type: Number,
      default: 24,
      min: 1,
    },
    last_evaluated_at: { type: Date, default: null },

    // ── Recipients ────────────────────────────────────────────────────────────
    recipient_user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'cms_users' }],

    // ── Notification Channels ─────────────────────────────────────────────────
    notify_inapp:    { type: Boolean, default: true },
    notify_email:    { type: Boolean, default: false },
    notify_whatsapp: { type: Boolean, default: false },
    notify_sms:      { type: Boolean, default: false },

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active:  { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'franchisee_alert_configs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ alert_type: 1, is_active: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_alert_configs', schema);
