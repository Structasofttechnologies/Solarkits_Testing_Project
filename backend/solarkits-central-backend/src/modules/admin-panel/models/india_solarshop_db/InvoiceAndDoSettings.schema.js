const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * InvoiceAndDoSettings — Dynamic Invoice & Delivery Order Settings
 *
 * Supports global default, state-wise, or warehouse-wise invoice templates,
 * numbering formats, generation timing, branding, and Delivery Order (DO) series.
 *
 * Collection: invoice_and_do_settings
 */
const schema = new mongoose.Schema(
  {
    scope_type: {
      type: String,
      enum: ['global', 'state', 'warehouse'],
      default: 'global',
      index: true,
    },
    scope_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    scope_name: {
      type: String,
      default: 'All India (Global Default)',
    },

    // ── Invoice Configuration ───────────────────────────────────────────────
    invoice_prefix: {
      type: String,
      default: 'SK',
      trim: true,
    },
    invoice_suffix: {
      type: String,
      default: '',
      trim: true,
    },
    financial_year_format: {
      type: String,
      enum: ['YYYY-YY', 'YYYY-YYYY', 'YY-YY', 'NONE'],
      default: 'YYYY-YY', // e.g. 2026-27
    },
    current_invoice_sequence: {
      type: Number,
      default: 1000,
      min: 1,
    },
    sequence_padding: {
      type: Number,
      default: 4, // e.g. 0001
      min: 3,
      max: 6,
    },
    invoice_generation_trigger: {
      type: String,
      enum: ['order_confirmed', 'payment_received', 'warehouse_dispatch', 'delivery_confirmed', 'manual'],
      default: 'warehouse_dispatch',
    },
    allow_manual_regeneration: {
      type: Boolean,
      default: true,
    },
    prevent_duplicate_numbers: {
      type: Boolean,
      default: true,
    },

    // ── Branding & Header Details ───────────────────────────────────────────
    company_name: {
      type: String,
      default: 'SolarKits Energy Private Limited',
      trim: true,
    },
    trade_name: {
      type: String,
      default: 'SolarKits India',
      trim: true,
    },
    gstin: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    cin: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    pan: {
      type: String,
      default: '',
      uppercase: true,
      trim: true,
    },
    logo_url: {
      type: String,
      default: '',
    },
    billing_address: {
      type: String,
      default: 'Headquarters: SolarKits Industrial Tech Hub, Sector 62, Noida, UP - 201301',
    },
    state_name: {
      type: String,
      default: 'Uttar Pradesh',
    },
    state_code: {
      type: String,
      default: '09',
    },
    support_phone: {
      type: String,
      default: '+91 98765 43210',
    },
    support_email: {
      type: String,
      default: 'billing@solarkits.com',
    },
    terms_and_conditions: {
      type: [String],
      default: [
        'Goods once sold and dispatched will be accepted back only in accordance with SolarKits Replacement Policy.',
        'All disputes are subject to local state/district jurisdiction.',
        'Warranty on solar modules, inverters, and BOS components is provided by the respective OEMs as per their terms.',
        'Interest @ 18% per annum will be charged on payments delayed beyond the agreed payment credit period.'
      ],
    },

    // ── Delivery Order (DO) Configuration ───────────────────────────────────
    do_prefix: {
      type: String,
      default: 'DO',
      trim: true,
    },
    do_numbering_format: {
      type: String,
      default: '{PREFIX}-{WH}-{YYMM}-{SEQ}', // e.g. DO-MW01-2611-0100
    },
    current_do_sequence: {
      type: Number,
      default: 100,
      min: 1,
    },
    do_sequence_padding: {
      type: Number,
      default: 4,
      min: 3,
      max: 6,
    },
    auto_generate_do_on_payment: {
      type: Boolean,
      default: true,
    },
    require_cluster_staff_assignment: {
      type: Boolean,
      default: true, // Gate: Requires at least 1 staff member assigned to the cluster before DO dispatch
    },
    prevent_duplicate_do: {
      type: Boolean,
      default: true,
    },

    // ── Auditing & User Tracking ────────────────────────────────────────────
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cms_users',
      default: null,
    },
    updated_by_name: {
      type: String,
      default: 'Super Admin',
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'invoice_and_do_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Ensure unique configuration per scope (one global, or one per state, or one per warehouse)
schema.index({ scope_type: 1, scope_id: 1 }, { unique: true });

module.exports = india_solarshop_db.model('InvoiceAndDoSettings', schema);
