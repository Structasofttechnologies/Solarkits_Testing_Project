const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * quote_settings — Admin-managed global configuration for the EPC Quotation module.
 *
 * Single document — use findOneAndUpdate with upsert: true.
 * quote_number_sequence is atomically incremented (never resets).
 *
 * Collection: quote_settings
 */

const deliveryModeSchema = new mongoose.Schema(
  {
    mode:       { type: String, enum: ['epc_location', 'district', 'pincode', 'franchisee_warehouse'], required: true },
    label:      { type: String, default: null },
    is_enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const followUpModeSchema = new mongoose.Schema(
  {
    mode:       { type: String, required: true },
    label:      { type: String, default: null },
    is_enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const followUpStatusSchema = new mongoose.Schema(
  {
    status:     { type: String, required: true },
    label:      { type: String, default: null },
    is_enabled: { type: Boolean, default: true },
    color:      { type: String, default: null }, // hex color for badge
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    // ── Quote Numbering ───────────────────────────────────────────────────────
    // Format: {prefix}-{year}-{padded_sequence}  e.g. SK-QT-2026-000001
    quote_number_prefix:   { type: String, default: 'SK-QT', trim: true, uppercase: true },
    quote_number_sequence: { type: Number, default: 0, min: 0 }, // atomic increment

    // ── Validity ─────────────────────────────────────────────────────────────
    quote_validity_days: { type: Number, default: 15, min: 1 },

    // ── GST ──────────────────────────────────────────────────────────────────
    // If set, this overrides solarshop_settings.gst_rate for quotations.
    gst_rate:  { type: Number, default: null }, // null = use solarshop_settings
    currency:  { type: String, default: 'INR', uppercase: true },

    // ── Delivery Modes ────────────────────────────────────────────────────────
    delivery_modes: {
      type: [deliveryModeSchema],
      default: [
        { mode: 'epc_location',       label: 'EPC Site / Address', is_enabled: true },
        { mode: 'district',           label: 'District Delivery', is_enabled: true },
        { mode: 'pincode',            label: 'Specific Pincode', is_enabled: true },
        { mode: 'franchisee_warehouse', label: 'Franchisee Warehouse', is_enabled: true },
      ],
    },

    // ── Payment Terms Options ─────────────────────────────────────────────────
    payment_terms_options: {
      type: [String],
      default: [
        '100% advance payment before dispatch',
        '50% advance, 50% before dispatch',
        'Pay before dispatch',
        '30-day credit (subject to approval)',
        'Manual / Offline payment',
      ],
    },

    // ── Default Terms Text ────────────────────────────────────────────────────
    delivery_terms_text: {
      type: String,
      default: 'Delivery within 7–14 business days from confirmation of order and receipt of advance payment.',
    },
    warranty_terms_text: {
      type: String,
      default: 'Solar panels carry a 25-year performance warranty. Inverters and BOS carry a manufacturer warranty as specified.',
    },
    default_terms_and_conditions: {
      type: String,
      default: 'This quotation is valid for the period specified. Prices are subject to change without prior notice after expiry. GST as applicable. Delivery charges may vary based on final delivery address.',
    },

    // ── Follow-up Configuration ────────────────────────────────────────────────
    default_follow_up_days: { type: Number, default: 3, min: 0 },

    follow_up_modes: {
      type: [followUpModeSchema],
      default: [
        { mode: 'call',       label: 'Phone Call',    is_enabled: true },
        { mode: 'whatsapp',   label: 'WhatsApp',      is_enabled: true },
        { mode: 'email',      label: 'Email',         is_enabled: true },
        { mode: 'meeting',    label: 'Meeting',       is_enabled: true },
        { mode: 'site_visit', label: 'Site Visit',    is_enabled: true },
        { mode: 'other',      label: 'Other',         is_enabled: true },
      ],
    },

    follow_up_statuses: {
      type: [followUpStatusSchema],
      default: [
        { status: 'scheduled',      label: 'Scheduled',       is_enabled: true, color: '#6366f1' },
        { status: 'completed',      label: 'Completed',       is_enabled: true, color: '#22c55e' },
        { status: 'rescheduled',    label: 'Rescheduled',     is_enabled: true, color: '#f59e0b' },
        { status: 'interested',     label: 'Interested',      is_enabled: true, color: '#3b82f6' },
        { status: 'negotiation',    label: 'In Negotiation',  is_enabled: true, color: '#8b5cf6' },
        { status: 'order_expected', label: 'Order Expected',  is_enabled: true, color: '#0ea5e9' },
        { status: 'converted',      label: 'Converted',       is_enabled: true, color: '#16a34a' },
        { status: 'lost',           label: 'Lost',            is_enabled: true, color: '#ef4444' },
        { status: 'not_reachable',  label: 'Not Reachable',   is_enabled: true, color: '#94a3b8' },
        { status: 'not_interested', label: 'Not Interested',  is_enabled: true, color: '#dc2626' },
        { status: 'overdue',        label: 'Overdue',         is_enabled: true, color: '#f97316' },
      ],
    },

    // ── Conversion Settings ────────────────────────────────────────────────────
    allow_duplicate_conversion:     { type: Boolean, default: false },
    allow_revised_quote_conversion: { type: Boolean, default: true },
    allow_expired_quote_conversion: { type: Boolean, default: false },

    // ── Discount Settings ──────────────────────────────────────────────────────
    allow_manual_discount:   { type: Boolean, default: false },
    max_discount_pct:        { type: Number, default: 0, min: 0, max: 100 },

    // ── PDF Quotation Theme & Template Styling ────────────────────────────────
    pdf_theme: {
      primary_color:          { type: String, default: '#ea580c' },
      secondary_color:        { type: String, default: '#0f172a' },
      accent_color:           { type: String, default: '#0284c7' },
      light_bg_color:         { type: String, default: '#f8fafc' },
      border_color:           { type: String, default: '#e2e8f0' },
      company_name:           { type: String, default: 'SolarKits India' },
      company_tagline:        { type: String, default: "India's Premier Solar ComboKit Distribution Platform" },
      commercial_notes_title: { type: String, default: 'COMMERCIAL & STATUTORY NOTES' },
      commercial_notes: {
        type: [String],
        default: [
          'Prices quoted are in Indian Rupees (INR) and valid up to the expiration date.',
          'Dispatched directly through authorized distribution hubs with transit insurance.',
          'Refer to Page 2 for Detailed Technical Bill of Materials (BOM) & Equipment Specifications.',
          'Standard statutory warranty coverage applies as detailed in technical specifications.',
        ],
      },
      bom_page_title:         { type: String, default: 'TECHNICAL SPECIFICATIONS & BILL OF MATERIALS (BOM)' },
      footer_text:            { type: String, default: 'SolarKits India • Confidential Commercial Proposal • All Rights Reserved' },
    },

    // ── Admin ─────────────────────────────────────────────────────────────────
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
  },
  {
    collection: 'quote_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('quote_settings', schema);
