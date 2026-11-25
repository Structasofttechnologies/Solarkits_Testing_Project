const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_distributor_dealer_maps — Distributor ↔ Dealer relationship record.
 *
 * Tracks the active mapping between a distributor and their dealers,
 * along with pricing permissions granted by the distributor.
 *
 * Collection: boskit_distributor_dealer_maps
 */

const schema = new mongoose.Schema({
  distributor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_distributors',
    required: true,
  },
  dealer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'boskit_dealers',
    required: true,
  },

  // ── Permissions granted to dealer by distributor ──────────────────────────
  // (Admin can restrict what distributor can grant)
  can_change_dealer_price:       { type: Boolean, default: false },
  can_see_mrp:                   { type: Boolean, default: true },
  can_place_orders:              { type: Boolean, default: true },
  uses_admin_price_slabs_only:   { type: Boolean, default: true }, // true = distributor cannot set free price

  // ── Relationship Status ───────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'suspended', 'terminated'],
    default: 'active',
  },
  effective_date: { type: Date, default: Date.now },
  terminated_at:  { type: Date, default: null },
  termination_reason: { type: String, default: null, trim: true, maxlength: 1000 },

  // ── Audit ────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
}, {
  collection: 'boskit_distributor_dealer_maps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ distributor_id: 1, dealer_id: 1 }, { unique: true });
schema.index({ distributor_id: 1, status: 1 });
schema.index({ dealer_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_distributor_dealer_maps', schema);
