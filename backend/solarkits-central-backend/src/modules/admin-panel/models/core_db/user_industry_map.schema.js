const mongoose = require('mongoose');
const { solarkits_core_db } = require('../../config/databases');

/**
 * user_industry_maps — Links resellers and EPC buyers to approved industry types.
 * Controls which industries a user can select and see content for.
 * Managed by Super Admin via the Industry Content Management section.
 *
 * Collection: user_industry_maps
 */
const schema = new mongoose.Schema({
  user_type: {
    type: String,
    enum: ['RESELLER', 'EPC'],
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // ref is polymorphic: 'resellers' for RESELLER, 'epc_accounts' for EPC
  },
  industry_type_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'sys_industry_types',
    required: true,
  },

  approval_status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REVOKED'],
    default: 'APPROVED',
  },

  // Audit
  assigned_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  assigned_date: { type: Date, default: Date.now },
  revoked_by:    { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  revoked_at:    { type: Date, default: null },

  deleted_at: { type: Date, default: null },
}, {
  collection: 'user_industry_maps',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Unique active assignment per user+industry combination
schema.index({ user_type: 1, user_id: 1, industry_type_id: 1 }, { unique: true });
schema.index({ user_type: 1, user_id: 1, approval_status: 1, deleted_at: 1 });
schema.index({ industry_type_id: 1, approval_status: 1, deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = solarkits_core_db.model('user_industry_maps', schema);
