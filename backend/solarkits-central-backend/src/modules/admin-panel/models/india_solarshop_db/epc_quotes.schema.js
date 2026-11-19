const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * epc_quotes — EPC Quotation documents created by Franchisee or BDE.
 *
 * ─── Key design decisions ──────────────────────────────────────────────────────
 * • All monetary values in integer Paise (₹1 = 100 paise). Display /100 in UI.
 * • All snapshot fields are frozen at time of generation (status → 'generated').
 *   Revising a quote creates a NEW document; the original is marked 'revised'.
 * • quote_number is globally incrementing (never resets by year).
 *   Format: SK-QT-2026-000001 (year = generation year, sequence = global counter).
 * • idempotency_key prevents duplicate generation on network retry.
 * • converted_order_type supports BOTH 'epc_order' and 'fpo_order'.
 *
 * Collection: epc_quotes
 */

const shareHistorySchema = new mongoose.Schema(
  {
    method:    { type: String, enum: ['email', 'whatsapp', 'link_copy', 'manual'], required: true },
    recipient: { type: String, default: null },
    sent_by:   { type: mongoose.Schema.Types.ObjectId, default: null },
    sent_at:   { type: Date, default: Date.now },
    notes:     { type: String, default: null },
  },
  { _id: true }
);

const VALID_STATUSES = [
  'draft',
  'generated',
  'sent',
  'viewed',
  'follow_up_pending',
  'interested',
  'negotiation',
  'order_expected',
  'converted',
  'expired',
  'lost',
  'revised',
];

const schema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────
    quote_number:    { type: String, default: null, trim: true, uppercase: true, index: true },
    revision_number: { type: Number, default: 0, min: 0 },
    original_quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_quotes',
      default: null,
    },
    estimate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_margin_estimates',
      default: null,
    },
    items: { type: Array, default: [] },
    financials: { type: Object, default: null },

    status: {
      type: String,
      enum: VALID_STATUSES,
      default: 'draft',
    },

    quote_source: {
      type: String,
      enum: ['bde_direct', 'franchisee_generated', 'bde_for_franchisee', 'admin_generated', 'epc_self_service'],
      default: 'franchisee_generated',
    },

    // ── Trial Kit Proposal Flags ──────────────────────────────────────────────
    is_trial_kit: { type: Boolean, default: false, index: true },
    quote_type: {
      type: String,
      enum: ['standard', 'trial_kit'],
      default: 'standard',
      index: true,
    },
    trial_kit_quantity: { type: Number, default: null },

    // ── Creator ───────────────────────────────────────────────────────────────
    created_by:      { type: mongoose.Schema.Types.ObjectId, required: true },
    created_by_role: { type: String, enum: ['reseller', 'bde', 'cms_user', 'epc'], required: true },

    // ── BDE Attribution ───────────────────────────────────────────────────────
    bde_id: { type: mongoose.Schema.Types.ObjectId, ref: 'bde_profiles', default: null },
    bde_snapshot: { type: Object, default: null },
    // bde_snapshot shape: { bde_id_code, full_name, mobile, email }

    // ── Franchisee Attribution ────────────────────────────────────────────────
    franchisee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'resellers', default: null },
    franchisee_snapshot: { type: Object, default: null },
    // franchisee_snapshot shape: { business_name, gst_number, mobile, email, address, plan_name }

    // ── EPC Buyer ─────────────────────────────────────────────────────────────
    epc_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', required: true },
    epc_snapshot: { type: Object, default: null },
    // epc_snapshot shape: { company_name, gstin, gstin_legal_name, contact_person,
    //                        mobile, email, address, state_name, district_name, pincode }

    // ── Territory ─────────────────────────────────────────────────────────────
    territory: {
      state_id:      { type: mongoose.Schema.Types.ObjectId, default: null },
      state_name:    { type: String, default: null, trim: true },
      district_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
      district_name: { type: String, default: null, trim: true },
      pincode:       { type: String, default: null, trim: true },
    },

    // ── Delivery ─────────────────────────────────────────────────────────────
    delivery_type: {
      type: String,
      enum: ['epc_location', 'district', 'pincode', 'franchisee_warehouse'],
      required: true,
    },
    delivery_address_snapshot: { type: Object, default: null },
    // shape: { address_line, pincode, district_name, state_name, contact_person, mobile }

    // ── Warehouse ─────────────────────────────────────────────────────────────
    warehouse_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'company_warehouses',
      default: null,
    },
    warehouse_snapshot: { type: Object, default: null },
    // shape: { warehouse_code, address, pincode, state_name, district_name }

    // ── Classification ────────────────────────────────────────────────────────
    industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },
    industry_type_snapshot: { type: Object, default: null },

    project_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types', default: null },
    project_type_snapshot: { type: Object, default: null },

    // ── ComboKit ──────────────────────────────────────────────────────────────
    combo_kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', required: true },
    combo_kit_snapshot: { type: Object, default: null },
    // shape: { name, code, kit_capacity_kw, panel_brand, inverter_brand,
    //           bos_details, base_components, description, kit_image_url,
    //           warehouse_id, warehouse_code }

    kit_capacity_kw: { type: Number, min: 0, default: 0 },
    quantity:        { type: Number, min: 1, required: true },
    total_kw:        { type: Number, min: 0, default: 0 },

    // ── Warranty ──────────────────────────────────────────────────────────────
    warranty_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'quote_warranty_options',
      default: null,
    },
    warranty_snapshot: { type: Object, default: null },
    // shape: { name, duration_months, covered_products, terms, pricing_mode,
    //           price_per_kit_paise, price_pct }

    // ── Prices (integer Paise — immutable after generation) ───────────────────
    price_per_kit_paise:    { type: Number, default: 0, min: 0 },
    product_subtotal_paise: { type: Number, default: 0, min: 0 },
    warranty_charges_paise: { type: Number, default: 0, min: 0 },
    delivery_charges_paise: { type: Number, default: 0, min: 0 },
    discount_paise:         { type: Number, default: 0, min: 0 },
    taxable_amount_paise:   { type: Number, default: 0, min: 0 },
    gst_rate:               { type: Number, default: 0 },    // e.g. 13.8
    gst_amount_paise:       { type: Number, default: 0, min: 0 },
    total_amount_paise:     { type: Number, default: 0, min: 0 },
    currency:               { type: String, default: 'INR', uppercase: true },

    // ── Validity ──────────────────────────────────────────────────────────────
    valid_from:  { type: Date, default: null },
    valid_until: { type: Date, default: null, index: true },

    // ── Terms (frozen at generation) ──────────────────────────────────────────
    terms_snapshot: { type: Object, default: null },
    // shape: { payment_terms, delivery_terms, warranty_terms, terms_and_conditions }

    // ── Order Conversion ─────────────────────────────────────────────────────
    converted_order_id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    converted_order_type: {
      type: String,
      enum: ['epc_order', 'fpo_order', null],
      default: null,
    },
    converted_at: { type: Date, default: null },

    // ── Idempotency ───────────────────────────────────────────────────────────
    idempotency_key: { type: String, default: null, trim: true },

    // ── Sharing History ───────────────────────────────────────────────────────
    share_history: { type: [shareHistorySchema], default: [] },

    // ── Internal Flags ────────────────────────────────────────────────────────
    pdf_generated_at:  { type: Date, default: null },
    last_viewed_at:    { type: Date, default: null },
    view_count:        { type: Number, default: 0 },

    // ── Rejection / Loss ─────────────────────────────────────────────────────
    lost_reason:       { type: String, default: null, trim: true, maxlength: 500 },
    lost_at:           { type: Date, default: null },

    // ── Audit ─────────────────────────────────────────────────────────────────
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'epc_quotes',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
schema.index({ franchisee_id: 1, status: 1, created_at: -1 });
schema.index({ bde_id: 1, status: 1, created_at: -1 });
schema.index({ epc_id: 1, created_at: -1 });
schema.index({ epc_id: 1, is_trial_kit: 1, status: 1 });
schema.index({ original_quote_id: 1 });
schema.index({ idempotency_key: 1 }, { sparse: true });
schema.index({ converted_order_id: 1 }, { sparse: true });
schema.index({ 'territory.district_id': 1, status: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_quotes', schema);
module.exports.VALID_STATUSES = VALID_STATUSES;
