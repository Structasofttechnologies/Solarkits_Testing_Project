const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * solarkits_service_tickets — Service / Kit Item Replacement Ticket
 *
 * Raised by Franchisee (reseller) or EPC Buyer (epc_accounts) for
 * individual items supplied as part of a delivered kit order.
 *
 * Ticket number format: SKT-{YEAR}-{6-digit-sequence}
 * Example: SKT-2026-000001
 *
 * Ticket Status Journey:
 *   raised → under_review → approved → replacement_processing
 *         → dispatched → delivered → closed
 *         OR
 *   raised → under_review → rejected
 *
 * Collection: solarkits_service_tickets
 */

// ── Status History Entry ─────────────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  actor_type: { type: String, enum: ['reseller', 'epc_buyer', 'epc_partner', 'admin', 'system'], required: true },
  actor_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  actor_name: { type: String, default: null },
  comment: { type: String, default: null, trim: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ── Proof File Entry ─────────────────────────────────────────────────────────
const proofFileSchema = new mongoose.Schema({
  file_url: { type: String, required: true },
  file_name: { type: String, default: null },
  file_type: { type: String, default: null }, // 'image', 'video', 'document'
  uploaded_at: { type: Date, default: Date.now },
}, { _id: false });

// ── Main Schema ──────────────────────────────────────────────────────────────
const schema = new mongoose.Schema({
  // ── Ticket Identification ─────────────────────────────────────────────────
  ticket_number: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    // Format: SKT-2026-000001
  },

  // ── Who Raised ───────────────────────────────────────────────────────────
  raised_by_type: {
    type: String,
    enum: ['reseller', 'epc_buyer', 'epc_partner'],
    required: true,
  },
  raised_by_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // refs: resellers OR epc_accounts
  },
  raised_by_name: { type: String, default: null },   // snapshot for display

  // ── Franchisee Cluster & BDE Auto-Linking ────────────────────────────────
  cluster_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'franchisee_clusters',
    default: null,
    index: true,
  },
  cluster_name: { type: String, default: null },
  assigned_bde_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'bde_profiles',
    default: null,
    index: true,
  },
  assigned_bde_name: { type: String, default: null },

  // ── Ticket Classification & Priority ─────────────────────────────────────
  ticket_type: {
    type: String,
    enum: ['business_support', 'product', 'replacement', 'delivery', 'payment'],
    default: 'replacement',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  assigned_department: {
    type: String,
    enum: ['account', 'admin', 'delivery', 'support'],
    default: 'support',
    index: true,
  },
  resolution_tat_hours: {
    type: Number,
    default: 48,
  },
  tat_deadline: {
    type: Date,
    default: null,
  },
  is_overdue: {
    type: Boolean,
    default: false,
    index: true,
  },

  // ── Order Reference ──────────────────────────────────────────────────────
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    // refs: purchase_orders or request_orders
  },
  order_number: { type: String, default: null, trim: true },
  invoice_number: { type: String, default: null, trim: true },

  // ── Kit Details ──────────────────────────────────────────────────────────
  kit_id: { type: mongoose.Schema.Types.ObjectId, ref: 'pc_combo_kits', default: null },
  kit_name: { type: String, default: null, trim: true },
  kit_capacity: { type: String, default: null, trim: true }, // e.g. "5kW", "10kW"

  // ── Item Requiring Replacement (Optional for general support/payment) ───
  item_name: { type: String, default: 'General Support Request', trim: true, maxlength: 300 },
  item_serial_number: { type: String, default: null, trim: true, maxlength: 100 },

  // ── Issue Classification ─────────────────────────────────────────────────
  issue_category: {
    type: String,
    enum: ['physical_damage', 'non_functional', 'missing_part', 'wrong_item', 'installation_issue', 'other', 'business_support', 'billing_payment', 'delivery_delay'],
    default: 'other',
  },
  problem_description: { type: String, required: true, trim: true, maxlength: 3000 },

  // ── Installation & Project Details ───────────────────────────────────────
  installation_date: { type: Date, default: null },
  installation_address: {
    line: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
    pincode: { type: String, default: null, trim: true },
  },
  project_details: { type: String, default: null, trim: true, maxlength: 1000 },

  // ── Warranty ─────────────────────────────────────────────────────────────
  warranty_status: {
    type: String,
    enum: ['under_warranty', 'out_of_warranty', 'unknown'],
    default: 'unknown',
  },

  // ── Proof Files ──────────────────────────────────────────────────────────
  proof_files: [proofFileSchema],

  // ── Ticket Status ────────────────────────────────────────────────────────
  ticket_status: {
    type: String,
    enum: [
      'raised',
      'open',
      'assigned',
      'under_review',
      'in_progress',
      'waiting',
      'approved',
      'rejected',
      'replacement_processing',
      'dispatched',
      'delivered',
      'resolved',
      'closed',
    ],
    default: 'open',
  },
  status_history: [statusHistorySchema],

  // ── Admin Section ────────────────────────────────────────────────────────
  admin_notes: { type: String, default: null, trim: true, maxlength: 2000 },
  rejection_reason: { type: String, default: null, trim: true, maxlength: 1000 },
  reviewed_by_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // CMS admin user

  // ── Replacement Dispatch Info ────────────────────────────────────────────
  replacement_item_details: { type: String, default: null, trim: true, maxlength: 500 },
  tracking_number: { type: String, default: null, trim: true },
  shipping_carrier: { type: String, default: null, trim: true },
  dispatched_at: { type: Date, default: null },
  delivered_at: { type: Date, default: null },

  // ── Resolution ───────────────────────────────────────────────────────────
  resolution_confirmed_at: { type: Date, default: null },
  closed_at: { type: Date, default: null },

  // ── Soft Delete ──────────────────────────────────────────────────────────
  deleted_at: { type: Date, default: null },

}, {
  collection: 'solarkits_service_tickets',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────────────────────────
schema.index({ ticket_number: 1 }, { unique: true });
schema.index({ raised_by_type: 1, raised_by_id: 1, created_at: -1 });
schema.index({ ticket_status: 1, created_at: -1 });
schema.index({ order_id: 1, item_name: 1 });
schema.index({ deleted_at: 1 });

schema.virtual('id').get(function () { return this._id; });

module.exports = db.model('solarkits_service_tickets', schema);
