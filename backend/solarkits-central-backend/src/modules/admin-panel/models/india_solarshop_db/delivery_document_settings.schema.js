const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * delivery_document_settings.schema.js
 * Central Settings Schema for Dynamic Delivery Documents & Dual Verification (OTP + Manual Photo).
 * Supports Global Default, State-Wise, or Warehouse-Wise overrides.
 *
 * Collection: delivery_document_settings
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
    is_active: {
      type: Boolean,
      default: true,
    },

    // ── Document 1: Delivery Schedule & Dispatch Plan (System Auto-Generated) ────
    doc_schedule: {
      is_enabled: { type: Boolean, default: true },
      is_mandatory: { type: Boolean, default: true },
      title: { type: String, default: 'Delivery Schedule & Dispatch Order' },
      code: { type: String, default: 'DEL_DOC_SCHEDULE' },
      party_type: { type: String, default: 'system' },
      generation_trigger: {
        type: String,
        enum: ['ready_for_dispatch', 'dispatched', 'vehicle_assigned'],
        default: 'dispatched',
      },
      auto_generate_pdf: { type: Boolean, default: true },
      include_qr_code: { type: Boolean, default: true },
      include_item_specifications: { type: Boolean, default: true },
      header_title: { type: String, default: 'SOLARKITS DISPATCH & DELIVERY SCHEDULE' },
      terms_and_conditions: [{
        type: String,
      }],
    },

    // ── Document 2: Driver Delivery Acceptance & LR Bilty (Driver/Transporter) ───
    doc_driver_acceptance: {
      is_enabled: { type: Boolean, default: true },
      is_mandatory: { type: Boolean, default: true },
      title: { type: String, default: 'Driver Delivery Acceptance & LR Bilty Form' },
      code: { type: String, default: 'DEL_DOC_DRIVER_ACCEPTANCE' },
      party_type: { type: String, default: 'driver' },
      stage_trigger: {
        type: String,
        enum: ['loading', 'dispatched'],
        default: 'loading',
      },
      require_driver_license: { type: Boolean, default: true },
      require_odometer_start: { type: Boolean, default: true },
      require_vehicle_fitment_check: { type: Boolean, default: true },
      require_seal_number: { type: Boolean, default: true },
      declaration_text: {
        type: String,
        default: 'I hereby declare that I have physically inspected and safely loaded all solar kits, panels, inverters, and BOS items listed herein in sound condition and accept full transit custody.',
      },
    },

    // ── Document 3: Proof of Delivery (POD) & Receiving Acknowledgment (Buyer/EPC) ─
    doc_pod: {
      is_enabled: { type: Boolean, default: true },
      is_mandatory: { type: Boolean, default: true },
      title: { type: String, default: 'Proof of Delivery (POD) & Receiving Acknowledgment' },
      code: { type: String, default: 'DEL_DOC_POD' },
      party_type: { type: String, default: 'buyer' },
      stage_trigger: {
        type: String,
        enum: ['reached_destination', 'delivered'],
        default: 'delivered',
      },
      // Dual Verification Controls (OTP + Manual Photo Fallback)
      allow_otp_verification: { type: Boolean, default: true },
      allow_manual_photo_verification: { type: Boolean, default: true },
      default_verification_mode: {
        type: String,
        enum: ['either', 'otp', 'manual_photo'],
        default: 'either',
      },
      require_site_cargo_photo: { type: Boolean, default: true },
      require_signed_paper_photo: { type: Boolean, default: true },
      require_receiver_stamp: { type: Boolean, default: false },
      otp_bypass_reasons: [{
        type: String,
      }],
      acknowledgment_text: {
        type: String,
        default: 'We hereby acknowledge receipt of the consignment in stated quantity and outer packing condition. Physical inspection report attached.',
      },
    },

    // ── Document 4: Material Inspection & Handover Checklist (Joint Verification) ─
    doc_inspection_handover: {
      is_enabled: { type: Boolean, default: true },
      is_mandatory: { type: Boolean, default: true },
      title: { type: String, default: 'Material Inspection & Handover Checklist' },
      code: { type: String, default: 'DEL_DOC_INSPECTION_HANDOVER' },
      party_type: { type: String, default: 'joint' },
      stage_trigger: {
        type: String,
        enum: ['unloading', 'delivered'],
        default: 'delivered',
      },
      check_panel_cracks: { type: Boolean, default: true },
      check_panel_count: { type: Boolean, default: true },
      check_inverter_serial: { type: Boolean, default: true },
      check_inverter_seal: { type: Boolean, default: true },
      check_bos_cables_earthing: { type: Boolean, default: true },
      check_structure_hdg: { type: Boolean, default: true },
      allow_damage_shortage_logging: { type: Boolean, default: true },
      require_damage_photos: { type: Boolean, default: true },
      disclaimer_text: {
        type: String,
        default: 'Any transit damages or component shortages must be logged on this inspection checklist at the time of unloading and signed by both the consignee and the driver.',
      },
    },

    // ── Global Branding & Contact ──────────────────────────────────────────
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
    support_phone: {
      type: String,
      default: '+91 92748 63608',
      trim: true,
    },
    support_email: {
      type: String,
      default: 'support@solarkits.in',
      trim: true,
    },
    logo_url: {
      type: String,
      default: '',
    },
    signatory_name: {
      type: String,
      default: 'Authorized Logistics Officer',
    },
    signatory_designation: {
      type: String,
      default: 'Supply Chain & Logistics Lead',
    },

    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'cms_users',
      default: null,
    },
  },
  {
    collection: 'delivery_document_settings',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = db.model('delivery_document_settings', schema);
