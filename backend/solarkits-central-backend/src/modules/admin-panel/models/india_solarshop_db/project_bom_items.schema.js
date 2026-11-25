const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * project_bom_items — Admin-managed Bill of Materials (BOM) items for Know My Margin estimation.
 *
 * Defines extra project costs (structures, civil work, cables, net metering, installation, transport, etc.)
 * configured per Industry Type, Project Category, Project Sub-Category, Kit, or Location.
 *
 * Rate types:
 * - fixed: rate is a flat fee for the whole project
 * - per_kw: rate multiplied by total project capacity (kW)
 * - per_kit: rate multiplied by number of kits
 * - quantity_based: rate multiplied by item quantity entered/configured
 * - location_based: rate determined by state/district/pincode from location_rates[]
 *
 * Collection: project_bom_items
 */

const locationRateSchema = new mongoose.Schema(
  {
    state_id:      { type: mongoose.Schema.Types.ObjectId, default: null },
    state_name:    { type: String, default: null, trim: true },
    district_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    district_name: { type: String, default: null, trim: true },
    pincode:       { type: String, default: null, trim: true },
    rate:          { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const schema = new mongoose.Schema(
  {
    // ── Item Information ───────────────────────────────────────────────────────
    name:        { type: String, required: true, trim: true, maxlength: 250 },
    code:        { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: null, trim: true, maxlength: 2000 },

    // ── Hierarchy Filters (null = applies universally) ────────────────────────
    industry_type_id:       { type: mongoose.Schema.Types.ObjectId, default: null, index: true, set: v => (!v || v === '' ? null : v) },
    project_category_id:    { type: mongoose.Schema.Types.ObjectId, default: null, index: true, set: v => (!v || v === '' ? null : v) },
    project_subcategory_id: { type: mongoose.Schema.Types.ObjectId, default: null, index: true, set: v => (!v || v === '' ? null : v) },
    industry_type_name:     { type: String, default: null, trim: true },
    category_name:          { type: String, default: null, trim: true },
    subcategory_name:       { type: String, default: null, trim: true },
    system_type_name:       { type: String, default: null, trim: true },
    project_range_name:     { type: String, default: null, trim: true },
    apply_to_all_matching:  { type: Boolean, default: true },

    // ── Rate & Pricing ────────────────────────────────────────────────────────
    rate_type: {
      type: String,
      enum: ['fixed', 'per_kw', 'per_kit', 'quantity_based', 'location_based'],
      required: true,
      default: 'fixed',
    },
    admin_rate:       { type: Number, default: 0, min: 0 }, // in ₹
    unit:             { type: String, default: 'Nos', trim: true },
    default_quantity: { type: Number, default: 1, min: 0 },

    // ── Rules & Flags ─────────────────────────────────────────────────────────
    is_mandatory:       { type: Boolean, default: true },
    is_included_in_kit: { type: Boolean, default: false },
    gst_applicable:     { type: Boolean, default: true },
    gst_rate:           { type: Number, default: 18, min: 0, max: 100 },
    visible_to_epc:     { type: Boolean, default: true },

    // ── Location & Specific Eligibility ───────────────────────────────────────
    location_rates:              [locationRateSchema],
    eligible_kit_ids:            [{ type: mongoose.Schema.Types.Mixed, default: null }],
    eligible_customized_kit_ids: [{ type: mongoose.Schema.Types.ObjectId, default: null }],
    applicable_states:           [{ type: String, trim: true }],
    applicable_districts:        [{ type: String, trim: true }],
    applicable_regions:          [{ type: String, trim: true }],
    applicable_warehouses:       [{ type: mongoose.Schema.Types.ObjectId, default: null }],

    // ── Validity & Ordering ───────────────────────────────────────────────────
    effective_from: { type: Date, default: Date.now },
    effective_to:   { type: Date, default: null },
    is_active:      { type: Boolean, default: true },
    display_order:  { type: Number, default: 0 },

    // ── Audit ─────────────────────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'project_bom_items',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ is_active: 1, deleted_at: 1, display_order: 1 });
schema.index({ industry_type_id: 1, project_category_id: 1, project_subcategory_id: 1 });
schema.index({ code: 1, deleted_at: 1 });

module.exports = india_solarshop_db.model('project_bom_items', schema);
