const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributor_plan_assignments — Per-distributor plan subscription history.
 *
 * Tracks each plan subscription, renewal, upgrade, downgrade, and migration.
 * References an immutable plan_version_id and stores a full plan_snapshot.
 * Plan edits never alter active subscription terms.
 *
 * Collection: boskit_distributor_plan_assignments
 */

const schema = new mongoose.Schema({
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributor_plans',
    required: true,
  },
  plan_version_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_plan_versions',
    required: true,
  },

  // ── Immutable Entitlement Snapshot ─────────────────────────────────────────
  plan_snapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // ── Assignment Type ───────────────────────────────────────────────────────
  assignment_type: {
    type: String,
    enum: ['new', 'renewal', 'upgrade', 'downgrade', 'admin_override', 'migration'],
    default: 'new',
  },

  // ── Dates ─────────────────────────────────────────────────────────────────
  start_date:        { type: Date, required: true, default: Date.now },
  expiry_date:       { type: Date, required: true },
  grace_expiry_date: { type: Date, default: null },

  // ── Payment ───────────────────────────────────────────────────────────────
  amount_paid_paise:  { type: Number, required: true, min: 0 },
  currency:           { type: String, default: 'INR' },
  payment_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'boskit_payments', default: null },
  payment_reference:  { type: String, default: null, trim: true },

  // ── Status ────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'grace', 'suspended', 'superseded'],
    default: 'active',
  },

  // ── Chain Reference ───────────────────────────────────────────────────────
  renewed_from_assignment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributor_plan_assignments',
    default: null,
  },

  // ── Audit ────────────────────────────────────────────────────────────────
  assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  notes:       { type: String, default: null, trim: true, maxlength: 1000 },
}, {
  collection: 'boskit_distributor_plan_assignments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1, status: 1 });
schema.index({ expiry_date: 1, status: 1 });
schema.index({ plan_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributor_plan_assignments', schema);
