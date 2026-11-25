const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * audit_logs — Central audit log collection for all sensitive reseller & financial actions.
 *
 * Append-only. Never update or delete audit log entries.
 *
 * actor_type values:
 *   cms_user  — Super Admin / CMS staff action
 *   reseller  — Reseller self-service action
 *   epc_buyer — EPC buyer action
 *   system    — Automated scheduler / webhook / background job
 *
 * Phase R1: Added `metadata` and `reason` fields; expanded actor_type coverage.
 *
 * Collection: audit_logs
 */
const schema = new mongoose.Schema({
  actor_type: {
    type: String,
    // Phase R1: 'epc_buyer' was already in enum; keeping all four values.
    // Phase BOSKIT: Added 'boskit_distributor' and 'boskit_dealer' — backward-compatible.
    enum: [
      'cms_user',
      'reseller',
      'epc_buyer',
      'epc_partner',
      'epc',
      'system',
      'boskit_distributor',
      'boskit_dealer',
      'bde',
      'admin',
    ],
    required: true,
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  action: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 150,
    // Naming convention: ENTITY_VERB  e.g. RESELLER_REGISTER, KYC_VERIFY,
    // TERRITORY_ASSIGN, EPC_TRANSFER_REQUEST, SETTLEMENT_APPROVE, ORDER_STATUS_CHANGE
  },
  entity_type: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    // Collection name, e.g. 'resellers', 'reseller_kyc', 'reseller_territories'
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  before_snapshot: { type: Object, default: null },
  after_snapshot:  { type: Object, default: null },

  // Phase R1: Free-text reason for override / adjustment / transfer actions.
  // Required by policy for specific high-risk actions (enforced at service layer).
  reason: { type: String, default: null, trim: true, maxlength: 2000 },

  // Phase R1: Structured extra context — e.g. { district_id, old_reseller_id, new_reseller_id }.
  // Kept as freeform Object so future phases can attach domain-specific data without
  // modifying the schema again.
  metadata: { type: Object, default: null },

  ip_address: { type: String, default: null, trim: true },
  user_agent: { type: String, default: null, trim: true },
}, {
  collection: 'audit_logs',
  timestamps: { createdAt: 'created_at', updatedAt: false }, // Immutable — no updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Existing indexes — untouched
schema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
schema.index({ actor_type: 1, actor_id: 1, created_at: -1 });
schema.index({ action: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('audit_logs', schema);
