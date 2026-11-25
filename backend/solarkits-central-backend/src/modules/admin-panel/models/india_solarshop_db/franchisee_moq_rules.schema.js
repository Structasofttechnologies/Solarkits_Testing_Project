const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * franchisee_moq_rules — Project-type-wise Minimum Order Quantity and Increment rules.
 *
 * Applies per industry_type × project_type × plan combination.
 * No project types are hardcoded — all types are loaded dynamically from sys_filter_types.
 *
 * Validation formula for a selected quantity Q:
 *   Q >= moq
 *   AND (Q - moq) % increment_quantity === 0
 *   AND (max_quantity === null OR Q <= max_quantity)
 *
 * If increment_quantity === 1, any integer >= moq is valid.
 *
 * Priority (higher = evaluated first). Use this to create plan-specific overrides
 * over global defaults.
 *
 * Collection: franchisee_moq_rules
 */
const schema = new mongoose.Schema(
  {
    // ── Scope & Hierarchy ───────────────────────────────────────────────────
    // 1. Industry Type
    industry_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_industry_types',
      default: null,
    },
    // 2. Project Category
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_categories',
      default: null,
    },
    // 3. Sub-Category
    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_subcategories',
      default: null,
    },
    // 4. System Type / Subcategory Type
    system_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_subcategory_types',
      default: null,
    },
    // Legacy / Type reference
    project_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_types',
      default: null,
    },
    // 5. Capacity Range
    project_range_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'sys_filter_ranges',
      default: null,
    },
    // 6. Selected Product / Combo Kit
    combo_kit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'pc_comobo_kit',
      default: null,
    },
    // 7. Plan (null = Global / All Plans)
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reseller_plans',
      default: null,
    },

    // ── Quantity Rules ────────────────────────────────────────────────────────
    moq: {
      type: Number,
      required: true,
      min: 1,
    },
    increment_quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    max_quantity: {
      type: Number,
      min: 1,
      default: null, // null = unlimited
    },
    po_quantity_limit: {
      type: Number,
      min: 1,
      default: null, // null = no separate PO limit
    },

    // ── Priority ──────────────────────────────────────────────────────────────
    // Higher priority wins. Plan-specific rules should have higher priority than global rules.
    priority: { type: Number, default: 0 },

    // ── Effective Period ──────────────────────────────────────────────────────
    valid_from:  { type: Date, required: true },
    valid_until: { type: Date, default: null },

    // ── Status & Audit ────────────────────────────────────────────────────────
    is_active:  { type: Boolean, default: true },
    deleted_at: { type: Date, default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'franchisee_moq_rules',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Prevent overlapping rules for same plan + project_type + valid_from
schema.index(
  { plan_id: 1, project_type_id: 1, valid_from: 1 },
  { unique: true, partialFilterExpression: { deleted_at: null } }
);
schema.index({ project_type_id: 1, is_active: 1 });
schema.index({ plan_id: 1, is_active: 1 });
schema.index({ priority: -1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('franchisee_moq_rules', schema);
