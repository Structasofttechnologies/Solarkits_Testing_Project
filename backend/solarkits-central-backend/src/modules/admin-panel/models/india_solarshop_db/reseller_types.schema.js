const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * reseller_types — Master list of reseller types defining commercial modes.
 *
 * Two primary commercial modes:
 *   - commission: Reseller earns commission on eligible EPC buyer orders
 *   - dealer:     Reseller purchases products at configured margin/dealer pricing
 *
 * Collection: reseller_types
 */
const schema = new mongoose.Schema({
  name:            { type: String, required: true, trim: true, maxlength: 200 },
  slug:            { type: String, required: true, trim: true, lowercase: true, maxlength: 100, unique: true },
  commercial_mode: {
    type: String,
    enum: ['commission', 'dealer'],
    required: true,
  },
  description:     { type: String, default: null, trim: true, maxlength: 1000 },
  sort_order:      { type: Number, default: 0 },
  is_active:       { type: Boolean, default: true },
  deleted_at:      { type: Date, default: null },
  created_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'reseller_types',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ commercial_mode: 1, is_active: 1 });
schema.index({ sort_order: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('reseller_types', schema);
