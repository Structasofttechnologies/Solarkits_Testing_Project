const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * boskit_tax_rules — Configurable GST / tax rate rules.
 *
 * Supports product-level, category-level, and global GST rates.
 * The TaxEngine service reads this to apply the correct rate.
 *
 * Collection: boskit_tax_rules
 */

const schema = new mongoose.Schema({
  rule_name:   { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: null, trim: true, maxlength: 500 },

  // ── Scope ─────────────────────────────────────────────────────────────────
  scope: {
    type: String,
    enum: ['global', 'category', 'product', 'kit'],
    required: true,
    default: 'product',
  },
  category_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  product_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },

  // ── Tax Components ────────────────────────────────────────────────────────
  cgst_pct:  { type: Number, default: 0, min: 0, max: 100 },
  sgst_pct:  { type: Number, default: 0, min: 0, max: 100 },
  igst_pct:  { type: Number, default: 0, min: 0, max: 100 },
  cess_pct:  { type: Number, default: 0, min: 0, max: 100 },

  // Derived total for quick calculation
  total_gst_pct: { type: Number, required: true, default: 18, min: 0, max: 100 },

  // ── HSN Code ─────────────────────────────────────────────────────────────
  hsn_code:  { type: String, default: null, trim: true, maxlength: 20 },

  // ── Effective Dates ───────────────────────────────────────────────────────
  effective_from: { type: Date, default: Date.now },
  effective_to:   { type: Date, default: null },
  status:         { type: String, enum: ['active', 'inactive'], default: 'active' },
  priority:       { type: Number, default: 100 },

  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
}, {
  collection: 'boskit_tax_rules',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ scope: 1, status: 1 });
schema.index({ product_id: 1, status: 1 });
schema.index({ category_id: 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('boskit_tax_rules', schema);
