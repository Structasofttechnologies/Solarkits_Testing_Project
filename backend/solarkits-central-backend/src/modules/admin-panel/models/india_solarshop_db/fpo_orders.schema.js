const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

/**
 * fpo_orders — Full-featured Franchisee Purchase Orders.
 *
 * Replaces the legacy reseller_procurement_orders schema for new PO flows.
 * Legacy collection is untouched for backward compatibility.
 *
 * Status transition map (enforced in franchisee.po.service.js):
 *   DRAFT → SUBMITTED → PENDING_APPROVAL → CHANGES_REQUESTED → APPROVED
 *         → AWAITING_PAYMENT → PARTIALLY_PAID → PAID
 *         → STOCK_ALLOCATED → PROCESSING → PARTIALLY_DISPATCHED → DISPATCHED
 *         → PARTIALLY_DELIVERED → DELIVERED → COMPLETED
 *   (any active status) → CANCELLED
 *   DRAFT → EXPIRED (via TTL job after po_validity_days)
 *
 * All monetary values in integer Paise (1 INR = 100 Paise).
 *
 * Collection: fpo_orders
 */

const VALID_STATUSES = [
  'DRAFT',
  'PENDING_ALLOCATION',
  'AWAITING_TOKEN_PAYMENT',
  'PO_STARTED',
  'VALIDATING',
  'VALIDATED',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'AWAITING_PAYMENT',
  'PARTIALLY_PAID',
  'PAID',
  'CONFIRMED',
  'STOCK_ALLOCATED',
  'PROCESSING',
  'VEHICLE_ASSIGNED',
  'READY_FOR_DISPATCH',
  'PARTIALLY_DISPATCHED',
  'DISPATCHED',
  'IN_TRANSIT',
  'REACHED_DESTINATION',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
];

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: VALID_STATUSES, required: true },
    changed_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    actor_type: {
      type: String,
      enum: ['cms_user', 'reseller', 'epc_partner', 'epc_buyer', 'epc', 'bde', 'admin', 'system'],
      default: 'system',
    },
    note: { type: String, default: null, maxlength: 1000 },
    changed_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const moqSnapshotSchema = new mongoose.Schema(
  {
    moq: { type: Number, default: null },
    increment_quantity: { type: Number, default: null },
    max_quantity: { type: Number, default: null },
    rule_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: false }
);

const epcContractSchema = new mongoose.Schema(
  {
    contract_number:    { type: String, default: null },
    status:             { type: String, enum: ['PENDING_SIGNATURE', 'OTP_SENT', 'SIGNED', 'EXPIRED'], default: 'PENDING_SIGNATURE' },
    contract_snapshot:  { type: Object, default: null },
    signer_name:        { type: String, default: null },
    signer_designation: { type: String, default: 'Authorized Signatory' },
    signer_phone:       { type: String, default: null },
    signed_at:          { type: Date, default: null },
    signed_ip:          { type: String, default: null },
    otp_verified_at:    { type: Date, default: null },
    otp_reference:      { type: String, default: null },
    pdf_storage_url:    { type: String, default: null },
  },
  { _id: false }
);

const epcAllocationSchema = new mongoose.Schema(
  {
    epc_buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'reseller_epc_buyers', default: null },
    company_name: { type: String, default: null },
    buyer_name: { type: String, default: null },
    gstin: { type: String, default: null },
    allocated_quantity: { type: Number, required: true, min: 1 },
    fulfilled_quantity: { type: Number, default: 0, min: 0 },
    remaining_quantity: { type: Number, default: null },
    token_amount_paise: { type: Number, default: 0 },
    token_paid_paise: { type: Number, default: 0 },
    payment_status: { type: String, enum: ['PENDING', 'PAID', 'RECEIPT_SUBMITTED', 'VERIFIED'], default: 'PENDING' },
    payment_utr: { type: String, default: null },
    payment_receipt_url: { type: String, default: null },
    payment_notes: { type: String, default: null },
    paid_at: { type: Date, default: null },
    contract: { type: epcContractSchema, default: () => ({}) },
  },
  { _id: true }
);

const poItemSchema = new mongoose.Schema(
  {
    project_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_types', default: null },
    project_type_name: { type: String, default: null },
    kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', default: null },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'products', default: null },
    item_name: { type: String, required: true },
    item_code: { type: String, default: null },

    // Ordered quantity
    quantity: { type: Number, required: true, min: 1 },

    // EPC Buyer Quantity Allocations
    epc_allocations: [epcAllocationSchema],

    // Snapshots at time of PO creation (immutable after submission)
    moq_snapshot: { type: moqSnapshotSchema, default: null },
    unit_price_paise: { type: Number, required: true, min: 0 },
    gst_rate: { type: Number, default: 0 },
    tax_paise: { type: Number, required: true, min: 0 },
    total_price_paise: { type: Number, required: true, min: 0 },

    // Commission snapshot (captured at submission)
    commission_method: { type: String, enum: ['PERCENTAGE', 'FIXED_PER_KIT'], default: null },
    commission_snapshot: { type: Number, default: 0 }, // paise per kit OR percentage * 100

    // Contribution flags
    contributes_to_target: { type: Boolean, default: true },

    // Post-delivery adjustments
    returned_quantity: { type: Number, default: 0, min: 0 },
    cancelled_quantity: { type: Number, default: 0, min: 0 },
    delivered_quantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const schema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    po_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    idempotency_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    order_type: {
      type: String,
      enum: ['po_order', 'loose_order', 'loose_kit_order', 'bulk_po'],
      default: 'po_order',
    },
    // ── PO Classification (Single PO vs Combine PO) ───────────────────────────
    po_category: {
      type: String,
      enum: ['SINGLE_PO', 'COMBINE_PO'],
      default: 'SINGLE_PO',
    },
    // ── Token Amount Booking & Quota Fields (for PO Orders) ───────────────────
    is_token_booking:      { type: Boolean, default: false },
    token_amount_paise:    { type: Number, default: 0 },
    token_paid_paise:      { type: Number, default: 0 },
    token_payment_status:  { type: String, enum: ['PENDING', 'PAID', 'ADJUSTED'], default: 'PENDING' },
    token_settlement_mode: { type: String, enum: ['PRO_RATA', 'FINAL_ORDER', 'UPFRONT'], default: 'PRO_RATA' },
    token_adjusted_total_paise: { type: Number, default: 0, min: 0 },
    token_balance_paise:   { type: Number, default: 0, min: 0 },
    total_booked_quantity: { type: Number, default: 0 },
    fulfilled_quantity:    { type: Number, default: 0 },
    remaining_quantity:    { type: Number, default: 0 },
    lock_expires_at:       { type: Date, default: null },
    linked_loose_order_ids:[{ type: mongoose.Schema.Types.ObjectId, ref: 'fpo_orders' }],

    // ── Loose Order PO Linkage & Final Settlement (for Loose Orders) ───────────
    parent_po_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'fpo_orders', default: null },
    is_final_po_settlement:{ type: Boolean, default: false },
    token_adjusted_paise:  { type: Number, default: 0 },
    net_payable_paise:     { type: Number, default: 0 },

    // ── Expiry, Penalty & Settlement Lifecycle ─────────────────────────────────
    penalty_rule_snapshot:    { type: Object, default: null },
    applicable_penalty_paise: { type: Number, default: 0, min: 0 },
    unpurchased_quantity:     { type: Number, default: 0, min: 0 },
    refundable_token_paise:   { type: Number, default: 0, min: 0 },
    settlement_status: {
      type: String,
      enum: [
        'ACTIVE',
        'EXPIRED_PENDING_SETTLEMENT',
        'SETTLED',
        'REFUND_REQUESTED',
        'REFUND_APPROVED',
        'REFUND_PROCESSED',
        'REFUND_REJECTED',
      ],
      default: 'ACTIVE',
    },
    refund_request_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'po_refund_requests', default: null },
    refund_request_snapshot: { type: Object, default: null },

    destination_type: {
      type: String,
      enum: ['hub_stock', 'epc_allocation', 'warehouse', 'direct'],
      default: 'hub_stock',
    },
    destination_address: { type: String, default: null },
    destination_pincode: { type: String, default: null },
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
    fulfillment_mode: {
      type: String,
      enum: ['direct_site', 'epc_warehouse', 'franchisee_warehouse', null],
      default: 'direct_site',
    },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
    warehouse_code: { type: String, default: null },
    is_official_order_generated: {
      type: Boolean,
      default: false,
      index: true,
    },
    payment_status: {
      type: String,
      default: 'pending',
      index: true,
    },
    offline_payment: {
      payment_method: { type: String, default: null },
      payment_mode: { type: String, enum: ['bank_transfer', 'neft', 'rtgs', 'imps', 'upi', 'cheque', 'other', 'online', null], default: 'bank_transfer' },
      utr_number: { type: String, default: null, trim: true, uppercase: true },
      amount_paid: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      sender_bank_name: { type: String, default: null },
      receipt_url: { type: String, default: null },
      receipt_filename: { type: String, default: null },
      receiving_account_reference: { type: String, default: 'HDFC Bank - Current A/c 50200088991122', trim: true },
      verification_status: { type: String, enum: ['pending', 'submitted_for_approval', 'returned', 'approved', 'rejected'], default: 'pending' },
      verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      verified_at: { type: Date, default: null },
      accounts_remarks: { type: String, default: null, trim: true },
      returned_reason: { type: String, default: null, trim: true },
      rejection_reason: { type: String, default: null, trim: true },
      resubmitted_count: { type: Number, default: 0 },
      notes: { type: String, default: null },
      admin_approval_status: { type: String, enum: ['pending', 'approved', 'returned', 'rejected'], default: 'pending' },
      admin_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      admin_approved_at: { type: Date, default: null },
      admin_remarks: { type: String, default: null, trim: true },
    },
    payment_gateway_used: {
      type: String,
      enum: ['icici_ecollection', 'offline_utr', 'bank_transfer', 'offline_bank_transfer', null],
      default: null,
    },
    offline_payment_m2: {
      payment_method: { type: String, default: null },
      payment_mode: { type: String, default: null },
      utr_number: { type: String, default: null, trim: true, uppercase: true },
      amount_paid: { type: Number, default: 0 },
      payment_date: { type: Date, default: null },
      sender_bank_name: { type: String, default: null },
      receipt_url: { type: String, default: null },
      receipt_filename: { type: String, default: null },
      receiving_account_reference: { type: String, default: null },
      verification_status: { type: String, enum: ['pending', 'submitted_for_approval', 'returned', 'approved', 'rejected'], default: 'pending' },
      verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      verified_at: { type: Date, default: null },
      accounts_remarks: { type: String, default: null, trim: true },
      returned_reason: { type: String, default: null, trim: true },
      rejection_reason: { type: String, default: null, trim: true },
      admin_approval_status: { type: String, enum: ['pending', 'approved', 'returned', 'rejected'], default: 'pending' },
      admin_approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      admin_approved_at: { type: Date, default: null },
      admin_remarks: { type: String, default: null, trim: true },
    },
    follow_up: { type: mongoose.Schema.Types.Mixed, default: {} },
    payment_tracking: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Audit Trail of All Verification & Approval Events
    audit_trail: [{
      action:         { type: String, required: true },
      performed_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      performer_name: { type: String, default: 'System' },
      role:           { type: String, default: 'Accounts' },
      timestamp:      { type: Date, default: Date.now },
      notes:          { type: String, default: null },
      details:        { type: mongoose.Schema.Types.Mixed, default: {} },
    }],

    // ── Ownership & Creator Attribution ───────────────────────────────────────
    franchisee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
    },
    reseller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'resellers',
      default: null,
    },
    epc_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'epc_accounts',
      default: null,
    },
    customer_type: {
      type: String,
      enum: ['FRANCHISEE', 'SOLAR_EPC'],
      default: 'FRANCHISEE',
    },
    customer_details: {
      name:         { type: String, default: null },
      company_name: { type: String, default: null },
      gstin:        { type: String, default: null },
      phone:        { type: String, default: null },
      email:        { type: String, default: null },
      address:      { type: String, default: null },
      state:        { type: String, default: null },
      district:     { type: String, default: null },
    },
    created_by_role: {
      type: String,
      enum: ['FRANCHISEE', 'BDE', 'SOLAR_EPC', 'ADMIN', 'SYSTEM'],
      default: 'FRANCHISEE',
    },
    creator_name: { type: String, default: null },
    creator_code: { type: String, default: null },

    // ── Plan Snapshot (immutable after submission) ─────────────────────────────
    plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'reseller_plans',
      default: null,
    },
    plan_snapshot: { type: Object, default: null }, // Full plan object at creation time
    po_settings_snapshot: { type: Object, default: null }, // PO settings at creation time

    // ── Territory ─────────────────────────────────────────────────────────────
    territory_snapshot: { type: Object, default: null },
    state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_2', default: null },

    // ── Classification ────────────────────────────────────────────────────────
    industry_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_industry_types', default: null },

    // ── Line Items ────────────────────────────────────────────────────────────
    items: [poItemSchema],

    // ── Financials (integer Paise) ─────────────────────────────────────────────
    subtotal_paise: { type: Number, required: true, min: 0 },
    tax_total_paise: { type: Number, required: true, min: 0 },
    shipping_fee_paise: { type: Number, default: 0, min: 0 },
    discount_paise: { type: Number, default: 0, min: 0 },
    grand_total_paise: { type: Number, required: true, min: 0 },

    // ── Payment ───────────────────────────────────────────────────────────────
    payment_terms: {
      type: String,
      enum: [
        'FULL_ADVANCE',
        'PARTIAL_ADVANCE',
        'PAY_BEFORE_DISPATCH',
        'CREDIT_PERIOD',
        'MANUAL_OFFLINE_PAYMENT',
      ],
      default: 'FULL_ADVANCE',
    },
    advance_percentage: { type: Number, default: 0 },
    advance_paid_paise: { type: Number, default: 0, min: 0 },
    payment_reference: { type: String, default: null },
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },

    // ── Status & History ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: 'DRAFT',
    },
    status_history: [statusHistorySchema],

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

    // ── Approval ─────────────────────────────────────────────────────────────
    requires_approval: { type: Boolean, default: true },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    approved_at: { type: Date, default: null },
    rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    rejected_at: { type: Date, default: null },
    approval_notes: { type: String, default: null, maxlength: 2000 },

    // ── Dispatch & Delivery ────────────────────────────────────────────────────
    dispatch_date: { type: Date, default: null },
    delivery_date: { type: Date, default: null },
    expected_delivery_date: { type: Date, default: null },

    assigned_vehicle: {
      vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_delivery_vehicles', default: null },
      vehicle_name: { type: String, default: null },
      vehicle_type: { type: String, default: null },
      registration_number: { type: String, default: null },
      driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_delivery_drivers', default: null },
      driver_name: { type: String, default: null },
      driver_contact: { type: String, default: null },
      is_recommended: { type: Boolean, default: true },
      override_reason: { type: String, default: null },
      assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      assigned_at: { type: Date, default: null },
    },
    dispatch_tracking: {
      courier_name: { type: String, default: null },
      tracking_number: { type: String, default: null },
      tracking_url: { type: String, default: null },
      dispatched_at: { type: Date, default: null },
      estimated_delivery: { type: String, default: null },
      dispatched_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
      dispatch_notes: { type: String, default: null },
    },
    milestones: [
      {
        status: { type: String, required: true },
        description: { type: String, default: null },
        recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
        recorded_at: { type: Date, default: Date.now },
      },
    ],

    // ── Expiry ────────────────────────────────────────────────────────────────
    expires_at: { type: Date, default: null },

    // ── Price Lock (for PO Drawdowns / Reorders) ──────────────────────────────
    // When an EPC places a drawdown order against an active parent PO, the price is LOCKED
    // to the unit_price_paise captured at PO creation time. Market price changes are ignored
    // for the entire duration of the PO validity (lock_expires_at).
    price_lock: {
      is_locked:          { type: Boolean, default: false },
      locked_price_paise: { type: Number,  default: null },
      lock_source_po:     { type: String,  default: null },
      lock_source_po_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'fpo_orders', default: null },
      locked_at:          { type: Date,    default: null },
      lock_expires_at:    { type: Date,    default: null },
    },

    // ── Payment Milestones for PO Drawdowns ──────────────────────────────────
    // Mirrors epc_orders.payment_milestones so order journey is IDENTICAL whether
    // EPC places a direct order or a drawdown under a PO.
    // Milestone 1 = Advance (30%), Milestone 2 = Final (70%) before dispatch.
    payment_milestones: {
      configured_milestone_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'product_payment_milestones', default: null },
      total_order_amount:         { type: Number, default: 0 },
      advance_percentage:         { type: Number, default: 30 },
      advance_amount:             { type: Number, default: 0 },
      remaining_percentage:       { type: Number, default: 70 },
      remaining_amount:           { type: Number, default: 0 },
      current_milestone_due:      { type: Number, default: 1 },
      milestone_verification_status: {
        type: String,
        enum: ['awaiting_advance', 'advance_verified', 'advance_verified_balance_pending', 'awaiting_final_payment', 'final_payment_pending_verification', 'fully_paid', 'rejected', 'pending_verification', 'approved'],
        default: 'awaiting_advance',
      },
      milestones: [{
        milestone_number:    { type: Number, required: true },
        title:               { type: String, required: true },
        percentage:          { type: Number, required: true },
        amount:              { type: Number, required: true },
        stage:               { type: String, required: true },
        tat_days:            { type: Number, default: 2 },
        payment_status:      { type: String, enum: ['unpaid', 'pending_verification', 'verified', 'approved', 'rejected'], default: 'unpaid' },
        utr_number:          { type: String, default: null, trim: true, uppercase: true },
        amount_paid:         { type: Number, default: 0 },
        payment_date:        { type: Date,   default: null },
        receipt_url:         { type: String, default: null },
        receipt_filename:    { type: String, default: null },
        sender_bank_name:    { type: String, default: null, trim: true },
        account_holder_name: { type: String, default: null, trim: true },
        verified_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
        verified_at:         { type: Date,   default: null },
        rejection_reason:    { type: String, default: null, trim: true },
        notes:               { type: String, default: null },
      }],
    },

    // ── PO Origin Tag (for Accounts/Warehouse display) ────────────────────────
    // Populated when this order is a drawdown placed by an EPC against a parent PO.
    // Accounts and warehouse portals display 'PO Order — by EPC XYZ' using this.
    po_origin: {
      is_po_drawdown:   { type: Boolean, default: false },
      parent_po_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'fpo_orders', default: null },
      parent_po_number: { type: String,  default: null },
      epc_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'epc_accounts', default: null },
      epc_name:         { type: String,  default: null },
      epc_company:      { type: String,  default: null },
    },

    // ── Online Order Flag (state-specific) ────────────────────────────────────
    // Set at checkout from SolarShopSettings.online_order_allowed_state_ids.
    // true  → online milestone flow (ICICI ePay / Razorpay gateway)
    // false → standard offline milestone flow
    is_online_order:       { type: Boolean, default: false },
    online_order_state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', default: null },

    // ── Commission ────────────────────────────────────────────────────────────
    commission_rule_id: { type: mongoose.Schema.Types.ObjectId, ref: 'franchisee_commission_rules', default: null },
    commission_rule_snapshot: { type: Object, default: null },
    commission_posted: { type: Boolean, default: false },
    commission_ledger_id: { type: mongoose.Schema.Types.ObjectId, ref: 'fpo_commission_ledgers', default: null },
    total_commission_paise: { type: Number, default: 0 },
    commission_status: {
      type: String,
      enum: ['Pending', 'Paid', 'On Hold', 'Failed'],
      default: 'Pending',
    },
    commission_utr: { type: String, default: null, trim: true },
    commission_paid_date: { type: Date, default: null },
    commission_notes: { type: String, default: null },
    payment_utr: { type: String, default: null, trim: true },

    // ── Goal ─────────────────────────────────────────────────────────────────
    goal_counted: { type: Boolean, default: false },
    goal_counted_qty: { type: Number, default: 0 },

    // ── Cancellation / Return ─────────────────────────────────────────────────
    cancellation_reason: { type: String, default: null, maxlength: 2000 },
    amendment_reason: { type: String, default: null, maxlength: 2000 },
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    cancelled_at: { type: Date, default: null },

    // ── Audit ─────────────────────────────────────────────────────────────────
    created_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, default: null },
    deleted_at: { type: Date, default: null },
  },
  {
    collection: 'fpo_orders',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.index({ franchisee_id: 1, status: 1, created_at: -1 });
schema.index({ plan_id: 1, status: 1 });
schema.index({ state_id: 1, status: 1 });
schema.index({ district_id: 1, status: 1 });
schema.index({ expires_at: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { status: 'DRAFT' } });
schema.index({ created_at: -1 });

schema.virtual('id').get(function () { return this._id; });
schema.virtual('VALID_STATUSES').get(() => VALID_STATUSES);

module.exports = india_solarshop_db.model('fpo_orders', schema);
module.exports.VALID_STATUSES = VALID_STATUSES;