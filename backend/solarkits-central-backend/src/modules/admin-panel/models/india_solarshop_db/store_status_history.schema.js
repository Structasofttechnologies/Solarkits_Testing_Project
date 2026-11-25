const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * store_status_history — Immutable audit trail of every store onboarding status change.
 *
 * Records who changed the status, from what, to what, with a reason and any
 * uploaded document references. Used for compliance, dispute resolution, and
 * the Audit History view in the Admin Panel.
 *
 * Collection: store_status_history
 */
const schema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    index: true,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    index: true,
  },
  store_setup_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'store_setups',
    default: null,
  },
  from_status: {
    type: String,
    default: null,
    trim: true,
  },
  to_status: {
    type: String,
    required: true,
    trim: true,
    default: 'draft',
  },
  actor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    default: null,
  },
  // 'admin' | 'accounts' | 'warehouse' | 'franchisee' | 'system'
  actor_type: {
    type: String,
    enum: ['admin', 'accounts', 'warehouse', 'franchisee', 'system'],
    default: 'admin',
  },
  changed_by_role: {
    type: String,
    enum: ['admin', 'accounts', 'warehouse', 'franchisee', 'system'],
    default: 'admin',
  },
  remarks: {
    type: String,
    default: null,
    trim: true,
    maxlength: 2000,
  },
  reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 2000,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Array of uploaded document URLs attached to this status change
  documents: [{ type: String, trim: true }],
}, {
  collection: 'store_status_history',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

// Synchronize field aliases on validate / save
schema.pre('validate', function (next) {
  if (!this.reseller_id && this.store_id) {
    this.reseller_id = this.store_id;
  }
  if (!this.store_id && this.reseller_id) {
    this.store_id = this.reseller_id;
  }
  if (!this.actor_id && this.changed_by) {
    this.actor_id = this.changed_by;
  }
  if (!this.changed_by && this.actor_id) {
    this.changed_by = this.actor_id;
  }
  if (!this.actor_type && this.changed_by_role) {
    this.actor_type = this.changed_by_role;
  }
  if (!this.changed_by_role && this.actor_type) {
    this.changed_by_role = this.actor_type;
  }
  if (!this.remarks && this.reason) {
    this.remarks = this.reason;
  }
  if (!this.reason && this.remarks) {
    this.reason = this.remarks;
  }
  if (typeof next === 'function') next();
});

schema.pre('save', function (next) {
  if (!this.reseller_id && this.store_id) {
    this.reseller_id = this.store_id;
  }
  if (!this.store_id && this.reseller_id) {
    this.store_id = this.reseller_id;
  }
  if (typeof next === 'function') next();
});

schema.index({ store_id: 1, created_at: -1 });
schema.index({ reseller_id: 1, created_at: -1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('store_status_history', schema);
