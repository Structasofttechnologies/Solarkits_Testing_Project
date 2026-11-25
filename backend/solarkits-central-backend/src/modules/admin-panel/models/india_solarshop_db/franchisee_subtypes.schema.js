const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_subtypes — Configurable franchisee categories managed by Admin.
 *
 * Allows Admin to define store subtypes (e.g. "Solar Distributor", "Retail Partner")
 * without requiring code changes. Linked to reseller_plans and resellers.
 *
 * Collection: franchisee_subtypes
 */
const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  slug: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    unique: true,
  },
  description: {
    type: String,
    default: null,
    trim: true,
    maxlength: 1000,
  },
  is_active:  { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 },
  deleted_at: { type: Date, default: null },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'franchisee_subtypes',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON:   { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ is_active: 1, sort_order: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_subtypes', schema);
