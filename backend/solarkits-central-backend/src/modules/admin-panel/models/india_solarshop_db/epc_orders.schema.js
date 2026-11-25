const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * Line item in EPC Buyer order.
 * Financial totals stored in integer Paise (1 INR = 100 Paise).
 */
const epcOrderItemSchema = new mongoose.Schema({
  scope_type:                { type: String, enum: ['product', 'kit'], required: true },
  product_id:                { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
  kit_id:                    { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_combo_kits', default: null },
  item_name:                 { type: String, required: true },
  image:                     { type: String, default: null },
  capacity:                  { type: String, default: null },
  description:               { type: String, default: null },
  quantity:                  { type: Number, required: true, min: 1 },
  unit_price_paise:          { type: Number, required: true, min: 0 },
  cost_price_paise:          { type: Number, required: true, min: 0 },
  reseller_margin_paise:     { type: Number, required: true, min: 0 },
  platform_commission_paise: { type: Number, required: true, min: 0 },
  gst_rate:                  { type: Number, default: 13.8 },
  tax_paise:                 { type: Number, required: true, min: 0 },
  total_price_paise:         { type: Number, required: true, min: 0 },
  is_trial_kit:              { type: Boolean, default: false },
  trial_kit_quantity:        { type: Number, default: null },
}, { _id: false });

/**
 * epc_orders — Orders placed by EPC Buyers, routed to territory resellers.
 *
 * Collection: epc_orders
 */
const schema = new mongoose.Schema({
  order_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  order_request_id: {
    type: String,
    default: null,
    trim: true,
    index: true,
  },
  is_official_order_generated: {
    type: Boolean,
    default: false,
    index: true,
  },
  is_trial_order: {
    type: Boolean,
    default: false,
    index: true,
  },
  order_type: {
    type: String,
    enum: ['po_order', 'loose_order', 'trial_order'],
    default: 'po_order',
    index: true,
  },
  epc_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    required: true,
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null, // null if direct fallback
  },
  routing_source: {
    type: String,
    enum: ['primary_reseller', 'territory_match', 'direct_fallback', 'bde_direct'],
    default: 'territory_match',
  },
  items: [epcOrderItemSchema],

  // ── Integer Paise Totals ────────────────────────────────────────────────
  subtotal_paise:                 { type: Number, required: true, min: 0 },
  tax_total_paise:                { type: Number, required: true, min: 0 },
  shipping_fee_paise:             { type: Number, default: 0, min: 0 },
  grand_total_paise:              { type: Number, required: true, min: 0 },
  reseller_total_margin_paise:     { type: Number, default: 0, min: 0 },
  platform_total_commission_paise: { type: Number, default: 0, min: 0 },

  order_status: {
    type: String,
    enum: [
      'pending',            // Initial state before payment verification
      'confirmed',          // Stage 1: Payment verified
      'processing',         // Stage 2: Warehouse picking & packing
      'vehicle_assigned',   // Stage 3: Vehicle assigned (recommended or overridden)
      'ready_for_dispatch', // Stage 4: Packing complete, staged for gate exit
      'dispatched',         // Stage 5: Vehicle left warehouse gate
      'in_transit',         // Stage 6: En route, milestone updates
      'reached_destination',// Stage 7: Arrived at delivery location
      'delivered',          // Stage 8: Delivery confirmed
      'allocated',          // Legacy
      'cancelled',          // Order cancelled
    ],
    default: 'pending',
  },
  commission_status: {
    type: String,
    enum: ['Pending', 'Paid', 'On Hold', 'Failed'],
    default: 'Pending',
  },
  commission_utr: { type: String, default: null, trim: true },
  commission_paid_date: { type: Date, default: null },
  commission_notes: { type: String, default: null },
  payment_method: {
    type: String,
    enum: ['offline_bank_transfer', 'bank_transfer', 'icici_ecollection'],
    default: 'offline_bank_transfer',
  },
  // Which payment gateway was actually used for this order
  payment_gateway_used: {
    type: String,
    enum: ['icici_ecollection', 'offline_utr', 'bank_transfer', 'offline_bank_transfer', null],
    default: null,
  },
  payment_status: {
    type: String,
    enum: ['pending', 'pending_verification', 'captured', 'rejected', 'failed', 'refunded'],
    default: 'pending',
  },
  payment_reference: {
    type: String,
    default: null,
    trim: true,
  },
  razorpay_order_id: {
    type: String,
    default: null,
    trim: true,
  },
  fulfillment_source: {
    type: String,
    enum: ['company_warehouse', 'franchise_warehouse', 'direct_fulfillment'],
    default: 'company_warehouse',
  },

  // ── Module 1.1: Fulfillment Mode (chosen by buyer at checkout) ────────────
  fulfillment_mode: {
    type: String,
    enum: ['franchisee_warehouse', 'epc_warehouse', 'direct_site'],
    default: 'direct_site',
  },

  // ── Module 1.1: Order Load Metrics Snapshot ───────────────────────────────
  // Captured at checkout time for vehicle recommendation & warehouse validation.
  order_load_metrics: {
    total_kits:       { type: Number, default: 0 }, // Total kit units ordered
    total_kw:         { type: Number, default: 0 }, // Cumulative solar capacity in kW
    total_weight_kg:  { type: Number, default: 0 }, // Estimated payload weight in kg
  },

  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    default: null,
  },
  fulfillment_bifurcation: {
    assigned_warehouse_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
    assigned_warehouse_code: { type: String, default: null },
    order_type_matched:      { type: String, default: 'po_order' },
    matched_level:           { type: String, enum: ['district', 'cluster', 'state', 'fallback_central', null], default: null },
    matched_reason:          { type: String, default: null },
  },

  // ── Supplier Procurement & Material Inward Lifecycle ─────────────────────
  procurement_status: {
    panel: {
      required:      { type: Boolean, default: true },
      po_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'purchase_orders', default: null },
      po_number:     { type: String, default: null },
      supplier_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', default: null },
      supplier_name: { type: String, default: null },
      supplier_brand:{ type: String, default: null },
      supplier_gst:  { type: String, default: null },
      status:        { type: String, enum: ['pending_payment', 'paid_awaiting_inward', 'inwarded'], default: 'pending_payment' },
      inward_grn_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_inwards', default: null },
      inward_grn_no: { type: String, default: null },
      inward_at:     { type: Date, default: null },
    },
    inverter: {
      required:      { type: Boolean, default: true },
      po_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'purchase_orders', default: null },
      po_number:     { type: String, default: null },
      supplier_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', default: null },
      supplier_name: { type: String, default: null },
      supplier_brand:{ type: String, default: null },
      supplier_gst:  { type: String, default: null },
      status:        { type: String, enum: ['pending_payment', 'paid_awaiting_inward', 'inwarded'], default: 'pending_payment' },
      inward_grn_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouse_inwards', default: null },
      inward_grn_no: { type: String, default: null },
      inward_at:     { type: Date, default: null },
    },
    overall_status: {
      type: String,
      enum: [
        'awaiting_supplier_procurement', // pending payment to panel or inverter supplier
        'awaiting_material_inward',       // suppliers paid, waiting for warehouse inward
        'inward_completed'               // both inwarded, ready for dispatch queue
      ],
      default: 'awaiting_supplier_procurement',
    },
  },

  // ── Offline Bank Transfer & Verification Details ──────────────────────────
  offline_payment: {
    utr_number:                  { type: String, default: null, trim: true, uppercase: true },
    amount_paid:                 { type: Number, default: 0 },
    payment_mode:                { type: String, enum: ['bank_transfer', 'neft', 'rtgs', 'imps', 'upi', 'cheque', 'other', 'online'], default: 'bank_transfer' },
    payment_date:                { type: Date, default: null },
    receipt_url:                 { type: String, default: null },
    receipt_filename:            { type: String, default: null },
    sender_bank_name:            { type: String, default: null, trim: true },
    account_holder_name:         { type: String, default: null, trim: true },
    receiving_account_reference: { type: String, default: 'HDFC Bank - Current A/c 50200088991122', trim: true },
    verification_status:         { type: String, enum: ['pending', 'submitted_for_approval', 'returned', 'approved', 'rejected'], default: 'pending' },
    verified_by:                 { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    verified_at:                 { type: Date, default: null },
    accounts_remarks:            { type: String, default: null, trim: true },
    rejection_reason:            { type: String, default: null, trim: true },
    returned_reason:             { type: String, default: null, trim: true },
    resubmitted_count:           { type: Number, default: 0 },
    notes:                       { type: String, default: null },
    // ── Admin Approval (after Accounts verification) ───────────────────────
    admin_approval_status:       { type: String, enum: ['pending', 'approved', 'returned', 'rejected'], default: 'pending' },
    admin_approved_by:           { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    admin_approved_at:           { type: Date, default: null },
    admin_remarks:               { type: String, default: null, trim: true },
  },

  // ── Audit Trail of All Verification & Approval Events ─────────────────────
  audit_trail: [{
    action:         { type: String, required: true },
    performed_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    performer_name: { type: String, default: 'System' },
    role:           { type: String, enum: ['Accounts', 'Admin', 'Solar EPC', 'System'], default: 'Accounts' },
    timestamp:      { type: Date, default: Date.now },
    notes:          { type: String, default: null },
    details:        { type: mongoose.Schema.Types.Mixed, default: {} },
  }],

  // ── Customer Payment Tracking & Stage Delay Signals ──────────────────────
  payment_tracking: {
    customer_payment_status: {
      type: String,
      enum: [
        'Payment Pending',
        'Payment Initiated',
        'Verification Pending',
        'Awaiting Admin Approval',
        'Partially Paid',
        'Paid',
        'Payment Failed',
        'Overdue',
        'Refund Pending',
        'Refunded',
      ],
      default: 'Verification Pending',
    },
    current_stage: {
      type: String,
      enum: [
        'initial_payment',
        'accounts_verification',
        'admin_approval',
        'advance_payment',
        'production_milestone',
        'delivery_milestone',
        'final_settlement',
        'refund_processing',
      ],
      default: 'accounts_verification',
    },
    stage_entered_at:       { type: Date, default: Date.now },
    configured_tat_days:    { type: Number, default: 2 },
    warning_threshold_days: { type: Number, default: 1 },
    delay_signal:           { type: String, enum: ['green', 'orange', 'red'], default: 'green' },
    days_elapsed:           { type: Number, default: 0 },
    total_verified_amount:  { type: Number, default: 0 },
    outstanding_amount:     { type: Number, default: 0 },
    is_overdue:             { type: Boolean, default: false },
  },

  // ── Product-Wise Payment Milestones Tracking ─────────────────────────────
  payment_milestones: {
    configured_milestone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'product_payment_milestones', default: null },
    total_order_amount:       { type: Number, default: 0 },
    advance_percentage:       { type: Number, default: 30 },
    advance_amount:           { type: Number, default: 0 },
    remaining_percentage:     { type: Number, default: 70 },
    remaining_amount:         { type: Number, default: 0 },
    current_milestone_due:    { type: Number, default: 1 }, // 1 or 2
    milestone_verification_status: {
      type: String,
      enum: ['awaiting_advance', 'advance_verified', 'advance_verified_balance_pending', 'awaiting_final_payment', 'final_payment_pending_verification', 'fully_paid', 'rejected', 'pending_verification', 'approved'],
      default: 'awaiting_advance',
    },
    milestones: [{
      milestone_number:   { type: Number, required: true },
      title:              { type: String, required: true },
      percentage:         { type: Number, required: true },
      amount:             { type: Number, required: true },
      stage:              { type: String, required: true },
      tat_days:           { type: Number, default: 2 },
      payment_status:     { type: String, enum: ['unpaid', 'pending_verification', 'verified', 'approved', 'rejected'], default: 'unpaid' },
      utr_number:         { type: String, default: null, trim: true, uppercase: true },
      amount_paid:        { type: Number, default: 0 },
      payment_date:       { type: Date, default: null },
      receipt_url:        { type: String, default: null },
      receipt_filename:   { type: String, default: null },
      sender_bank_name:   { type: String, default: null, trim: true },
      account_holder_name:{ type: String, default: null, trim: true },
      verified_by:        { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      verified_at:        { type: Date, default: null },
      rejection_reason:   { type: String, default: null, trim: true },
      notes:              { type: String, default: null },
    }],
  },

  // ── Tax Invoice Details ──────────────────────────────────────────────────
  invoice: {
    invoice_number: { type: String, default: null, trim: true },
    invoice_date:   { type: Date, default: null },
    invoice_url:    { type: String, default: null },
    generated_at:   { type: Date, default: null },
  },

  // ── Module 1.2: Assigned Vehicle & Driver ────────────────────────────────
  // Populated at Stage 3 (vehicle_assigned) by the admin or recommendation engine.
  assigned_vehicle: {
    vehicle_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'delivery_vehicles', default: null },
    vehicle_name:         { type: String, default: null, trim: true },
    vehicle_type:         { type: String, default: null, trim: true },
    registration_number:  { type: String, default: null, trim: true },
    driver_id:            { type: mongoose.Schema.Types.ObjectId, ref: 'delivery_drivers', default: null },
    driver_name:          { type: String, default: null, trim: true },
    driver_contact:       { type: String, default: null, trim: true },
    is_recommended:       { type: Boolean, default: true },  // true = auto-recommended; false = admin override
    override_reason:      { type: String, default: null, trim: true }, // Required when is_recommended=false
    overridden_by:        { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    overridden_at:        { type: Date, default: null },
    assigned_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    assigned_at:          { type: Date, default: null },
  },

  // ── Dispatch & Logistics Tracking ────────────────────────────────────────
  dispatch_tracking: {
    courier_name:       { type: String, default: null, trim: true },
    tracking_number:    { type: String, default: null, trim: true },
    tracking_url:       { type: String, default: null, trim: true },
    dispatched_at:      { type: Date, default: null },
    estimated_delivery: { type: Date, default: null },
    dispatched_by:      { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    dispatch_notes:     { type: String, default: null },
  },

  // ── Customer Payment & Follow-up Tracking ────────────────────────────────
  follow_up: {
    status: {
      type: String,
      enum: ['pending', 'contacted', 'promised_to_pay', 'details_sent', 'second_payment_submitted', 'completed'],
      default: 'pending',
    },
    last_contacted_at:     { type: Date, default: null },
    last_contacted_by:     { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    next_follow_up_date:   { type: Date, default: null },
    promised_payment_date: { type: Date, default: null },
    remarks:               { type: String, default: null, trim: true },
    history: [{
      contacted_at:          { type: Date, default: Date.now },
      contacted_by:          { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      contacted_by_name:     { type: String, default: null },
      contact_mode:          { type: String, enum: ['call', 'whatsapp', 'email', 'in_person'], default: 'call' },
      status:                { type: String, default: 'contacted' },
      remarks:               { type: String, default: null },
      promised_payment_date: { type: Date, default: null },
    }],
  },

  // ── Module 1.3: In-Transit Milestone Updates (Stage 6) ───────────────────
  milestones: [{
    status:      { type: String, required: true }, // e.g. 'Left Pune', 'Entered Nashik'
    description: { type: String, default: null },
    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    recorded_at: { type: Date, default: Date.now },
  }],

  is_end_customer_sale: {
    type: Boolean,
    default: true,
  },
  delivery_address: {
    line:          { type: String, default: null },
    state_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    state_name:    { type: String, default: null },
    district_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },
    district_name: { type: String, default: null },
    pincode:       { type: String, default: null },
    contact_name:  { type: String, default: null },
    contact_phone: { type: String, default: null },
  },

  reservation_expires_at: { type: Date, default: null },
  delivered_at:           { type: Date, default: null },
  cancelled_at:           { type: Date, default: null },
  cancellation_reason:    { type: String, default: null },
}, {
  collection: 'epc_orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

schema.index({ reseller_id: 1, order_status: 1 });
schema.index({ epc_id: 1, created_at: -1 });
schema.index({ 'offline_payment.verification_status': 1 });
schema.index({ 'invoice.invoice_number': 1 }, { sparse: true });

schema.virtual('id').get(function () { return this._id; });

module.exports = india_solarshop_db.model('epc_orders', schema);
