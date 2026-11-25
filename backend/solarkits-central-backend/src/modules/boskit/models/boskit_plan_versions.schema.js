const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_plan_versions — Immutable snapshots of a plan at the time of publishing.
 *
 * When a plan is created or updated and published, a new version is snapshotted here.
 * Subscriptions reference version_id, so plan edits never alter active subscription terms.
 *
 * Collection: boskit_plan_versions
 */

const schema = new mongoose.Schema({
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributor_plans',
    required: true,
  },
  version_number: { type: Number, required: true, min: 1 },

  // ── Full snapshot of plan fields at time of publish ───────────────────────
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true },

  published_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  published_at: { type: Date, default: Date.now },
}, {
  collection: 'boskit_plan_versions',
  timestamps: { createdAt: 'created_at', updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ plan_id: 1, version_number: 1 }, { unique: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_plan_versions', schema);
