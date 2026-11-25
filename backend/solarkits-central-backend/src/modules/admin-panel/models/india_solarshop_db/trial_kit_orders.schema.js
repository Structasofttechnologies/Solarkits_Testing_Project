const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * TrialKitOrder — Complete lifecycle of EPC Trial Kit orders.
 * SOLARKITS – Trial Kit Management Module
 * Section 1 (Order Management), Section 4 (GST Restriction),
 * Section 5 (Delivery & Feedback), Section 6 (BDE Sales Funnel).
 */
const schema = new mongoose.Schema({
  order_number: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    uppercase: true 
  },
  epc_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'epc_accounts', 
    required: true 
  },
  epc_name: { 
    type: String, 
    default: '' 
  },
  epc_company_name: { 
    type: String, 
    default: '' 
  },
  // Mandatory: One Trial Kit Per EPC GST Number Rule (Section 4)
  gst_number: { 
    type: String, 
    required: true, 
    trim: true, 
    uppercase: true, 
    maxlength: 20 
  },
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_comobo_kit',
    default: null
  },
  kit_type: { 
    type: String, 
    required: true, 
    trim: true
  },
  warehouse_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'company_warehouses', 
    required: true 
  },
  warehouse_name: { 
    type: String, 
    default: '' 
  },
  bde_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'bde_profiles', 
    default: null 
  },
  bde_name: { 
    type: String, 
    default: '' 
  },
  is_bde_assigned: {
    type: Boolean,
    default: false
  },
  bde_assigned_at: {
    type: Date,
    default: null
  },
  order_status: { 
    type: String, 
    enum: ['confirmed', 'ready_for_warehouse', 'sent_to_warehouse', 'out_for_delivery', 'dispatched', 'delivered', 'cancelled'], 
    default: 'confirmed' 
  },
  order_type: {
    type: String,
    enum: ['offline', 'online'],
    default: 'offline'
  },
  order_origin: {
    type: String,
    enum: ['epc', 'franchisee', 'company'],
    default: 'epc'
  },
  order_category: {
    type: String,
    enum: ['govt_tender', 'industry_kit', 'standard_trial'],
    default: 'industry_kit'
  },
  industry_type: {
    type: String,
    default: 'General Solar'
  },
  project_type: {
    type: String,
    default: 'Rooftop Solar'
  },
  delivery_destination_type: {
    type: String,
    enum: ['all', 'epc', 'franchisee', 'company'],
    default: 'epc'
  },
  is_grouped: {
    type: Boolean,
    default: false
  },
  group_id: {
    type: String,
    default: null
  },
  group_name: {
    type: String,
    default: ''
  },
  grouped_at: {
    type: Date,
    default: null
  },
  grouped_by: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  account_workflow_status: {
    type: String,
    enum: ['pending_account', 'sent_to_warehouse'],
    default: 'pending_account'
  },
  order_date: { 
    type: Date, 
    default: Date.now 
  },
  cost_inr: { 
    type: Number, 
    default: 0 
  },

  // ── Delivery Tracking (Section 5) ──────────────────────────────────────────
  delivery_details: {
    shipping_address: {
      address: { type: String, default: '' },
      state: { type: String, default: '' },
      district: { type: String, default: '' },
      pincode: { type: String, default: '' },
      contact_name: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    courier_name: { type: String, default: '' },
    vehicle_number: { type: String, default: '' },
    driver_name: { type: String, default: '' },
    driver_phone: { type: String, default: '' },
    tracking_number: { type: String, default: '' },
    tracking_url: { type: String, default: '' },
    dispatched_at: { type: Date, default: null },
    dispatched_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    delivered_at: { type: Date, default: null },
    delivered_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    delivery_notes: { type: String, default: '' }
  },

  // ── Cancellation & Stock Reversal (Section 4) ──────────────────────────────
  cancellation: {
    is_cancelled: { type: Boolean, default: false },
    cancelled_at: { type: Date, default: null },
    cancellation_reason: { type: String, default: '' },
    admin_approved: { type: Boolean, default: false },
    admin_approved_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    admin_approved_by_name: { type: String, default: '' },
    admin_approved_at: { type: Date, default: null },
    stock_reversed: { type: Boolean, default: false },
    restriction_released: { type: Boolean, default: false }
  },

  // ── Pre-Order Future Purchase Intent (Submitted by EPC during Trial Kit Checkout) ──
  future_intent: {
    future_purchase_mode: { 
      type: String, 
      enum: ['loose', 'bulk_po', 'both'], 
      default: 'loose' 
    },
    expected_quantity: { type: Number, default: 0 },
    loose_quantity: { type: Number, default: 0 },
    po_quantity: { type: Number, default: 0 },
    estimated_timeline: { type: String, default: '' },
    remarks: { type: String, default: '' },
    submitted_at: { type: Date, default: null }
  },

  // ── Feedback Fields (Section 5) ────────────────────────────────────────────
  feedback: {
    feedback_status: { type: String, enum: ['pending', 'submitted'], default: 'pending' },
    trial_kit_received_confirmation: { type: Boolean, default: null },
    product_quality_rating: { type: Number, min: 1, max: 5, default: null },
    installation_testing_experience: { type: String, default: '' },
    inverter_module_performance: { type: String, default: '' },
    technical_issue_complaint: { type: String, default: '' },
    future_purchase_requirement: { type: String, default: '' },
    expected_monthly_kit_purchase_quantity: { type: Number, default: 0 },
    next_followup_date: { type: Date, default: null },
    submitted_at: { type: Date, default: null }
  },

  // ── BDE Sales Funnel (Section 6) ───────────────────────────────────────────
  funnel: {
    current_stage: { 
      type: String, 
      enum: [
        'trial_kit_delivered',
        'feedback_pending',
        'feedback_received',
        'interested_in_purchase',
        'quotation_generated',
        'order_won',
        'not_converted'
      ],
      default: null 
    },
    stage_updated_at: { type: Date, default: null },
    call_notes: [{
      note: { type: String, required: true },
      next_follow_up_date: { type: Date, default: null },
      created_by_name: { type: String, default: '' },
      created_by_id: { type: mongoose.Schema.Types.ObjectId, default: null },
      created_at: { type: Date, default: Date.now }
    }],
    commercial_quote_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_quotes', default: null },
    commercial_quote_number: { type: String, default: null },
    commercial_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'epc_orders', default: null },
    commercial_order_number: { type: String, default: null },
    commercial_order_value_inr: { type: Number, default: 0 },
    conversion_date: { type: Date, default: null }
  }
}, {
  collection: 'trial_kit_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ gst_number: 1, combo_kit_id: 1 });
schema.index({ gst_number: 1, kit_type: 1 });
schema.index({ epc_id: 1, created_at: -1 });
schema.index({ bde_id: 1, 'funnel.current_stage': 1 });
schema.index({ warehouse_id: 1, order_status: 1 });
schema.index({ order_status: 1, 'feedback.feedback_status': 1 });
schema.index({ account_workflow_status: 1, order_status: 1 });
schema.index({ group_id: 1 });
schema.index({ order_origin: 1, order_type: 1 });
schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('trial_kit_orders', schema);
