const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_settings — Platform-wide singleton configuration for BOSKIT.
 *
 * Only ONE document should exist. Read with findOne().lean() and provide defaults.
 *
 * Contains:
 *   - Order number sequence counter (atomic $inc for race-safety)
 *   - Invoice number sequence counter
 *   - Default GST rate
 *   - Dealer activation policy
 *   - Activation requirements
 *   - Settlement engine config
 *
 * Collection: boskit_settings
 */

const schema = new mongoose.Schema({
  // ── Order Number Sequences (atomic $inc — race-safe) ──────────────────────
  last_order_sequence:   { type: Number, default: 0, min: 0 },
  last_invoice_sequence: { type: Number, default: 0, min: 0 },
  order_prefix:          { type: String, default: 'BK', trim: true, maxlength: 10 },
  invoice_prefix:        { type: String, default: 'BKI', trim: true, maxlength: 10 },

  // ── Checkout ──────────────────────────────────────────────────────────────
  checkout_timer_enabled:  { type: Boolean, default: true },
  checkout_timer_minutes:  { type: Number, default: 20, min: 5 },

  // ── Default Tax ───────────────────────────────────────────────────────────
  default_gst_rate_pct: { type: Number, default: 18, min: 0, max: 100 },

  // ── Dealer Activation Policy ──────────────────────────────────────────────
  // If true: distributor can activate dealer directly without admin approval
  // If false: admin must approve every dealer activation
  dealer_direct_activation_default: { type: Boolean, default: false },

  // ── Distributor Activation Requirements ──────────────────────────────────
  activation_require_gst_verified:       { type: Boolean, default: true },
  activation_require_kyc_approved:       { type: Boolean, default: true },
  activation_require_active_plan:        { type: Boolean, default: false },
  activation_require_territory_assigned: { type: Boolean, default: true },

  // ── Settlement Engine ─────────────────────────────────────────────────────
  settlement_trigger: {
    type: String,
    enum: ['delivery_plus_window', 'manual', 'payment_confirmation'],
    default: 'delivery_plus_window',
  },
  settlement_return_window_days: { type: Number, default: 7, min: 0 },
  platform_commission_pct:       { type: Number, default: 0, min: 0, max: 100 },

  // ── GST Verification Policy ───────────────────────────────────────────────
  gst_reverify_policy: {
    type: String,
    enum: ['onboarding_only', 'periodic', 'per_order'],
    default: 'onboarding_only',
  },
  gst_reverify_days: { type: Number, default: 90, min: 1 },

  // ── Territory Exclusivity ─────────────────────────────────────────────────
  territory_exclusivity_mode: {
    type: String,
    enum: ['strict', 'multi_distributor'],
    default: 'strict',
  },

  updated_at: { type: Date, default: Date.now },
}, {
  collection: 'boskit_settings',
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_settings', schema);
