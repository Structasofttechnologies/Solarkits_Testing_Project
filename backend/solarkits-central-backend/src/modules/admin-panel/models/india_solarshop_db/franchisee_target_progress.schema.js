const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_target_progress — Live goal-achievement progress per franchisee per month.
 *
 * Recalculated by franchisee.goal.service.recalculateProgress() whenever:
 *   - A PO is delivered
 *   - A return is processed
 *   - A cancellation is processed
 *   - An admin triggers manual recalculation
 *
 * Calculation:
 *   eligible_quantity = delivered_quantity - cancelled_quantity - returned_quantity
 *   balance_quantity  = max(target_quantity - eligible_quantity, 0)
 *   achievement_pct   = (eligible_quantity / target_quantity) * 100   [0 when target = 0]
 *
 * Collection: franchisee_target_progress
 */
const schema = new mongoose.Schema(
  {
    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      required: true,
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'franchisee_kit_targets',
      default: null, // null = no target configured for this month
    },

    // ── Period ────────────────────────────────────────────────────────────────
    target_month: { type: Number, required: true, min: 1, max: 12 },
    target_year:  { type: Number, required: true, min: 2020 },

    // ── Quantities ────────────────────────────────────────────────────────────
    target_quantity:    { type: Number, default: 0, min: 0 },
    ordered_quantity:   { type: Number, default: 0, min: 0 },
    approved_quantity:  { type: Number, default: 0, min: 0 },
    paid_quantity:      { type: Number, default: 0, min: 0 },
    dispatched_quantity:{ type: Number, default: 0, min: 0 },
    delivered_quantity: { type: Number, default: 0, min: 0 },
    cancelled_quantity: { type: Number, default: 0, min: 0 },
    returned_quantity:  { type: Number, default: 0, min: 0 },
    eligible_quantity:  { type: Number, default: 0, min: 0 },
    balance_quantity:   { type: Number, default: 0, min: 0 },
    calculation_stage:  { type: String, default: 'DELIVERED_QUANTITY' },

    // ── Achievement ───────────────────────────────────────────────────────────
    achievement_pct: { type: Number, default: 0, min: 0 },

    // ── Performance Classification ────────────────────────────────────────────
    performance_status: {
      type: String,
      enum: [
        'NO_TARGET',
        'NOT_STARTED',
        'LOW_PERFORMANCE',
        'BEHIND',
        'ON_TRACK',
        'ACHIEVED',
        'EXCEEDED',
        'EXPIRED',
      ],
      default: 'NO_TARGET',
    },

    // ── Metadata ─────────────────────────────────────────────────────────────
    last_calculated_at: { type: Date, default: null },
  },
  {
    collection: 'franchisee_target_progress',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// One progress record per franchisee per month
schema.index(
  { franchisee_id: 1, target_year: 1, target_month: 1 },
  { unique: true }
);
schema.index({ performance_status: 1 });
schema.index({ target_year: 1, target_month: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_target_progress', schema);
