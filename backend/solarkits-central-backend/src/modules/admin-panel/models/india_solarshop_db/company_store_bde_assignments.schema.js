const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * company_store_bde_assignments — Full history of BDE assignments for Company Stores.
 *
 * Each row represents one assignment period. When a BDE is reassigned:
 *   - the current record gets effective_until = now, is_current = false
 *   - a new record is created for the new BDE with is_current = true
 *
 * This allows Admin to see the complete assignment chain for any Company Store.
 *
 * Collection: company_store_bde_assignments
 */
const schema = new mongoose.Schema({
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    required: true,
  },
  bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    required: true,
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cms_users',
    required: true,
  },
  effective_from: {
    type: Date,
    required: true,
    default: Date.now,
  },
  // null = still active; set when BDE is reassigned or removed
  effective_until: {
    type: Date,
    default: null,
  },
  reassignment_reason: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  // true for the single current active assignment per store
  is_current: {
    type: Boolean,
    default: true,
  },
}, {
  collection: 'company_store_bde_assignments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ store_id: 1, is_current: 1 });
schema.index({ bde_id: 1, is_current: 1 });
schema.index({ store_id: 1, created_at: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('company_store_bde_assignments', schema);
