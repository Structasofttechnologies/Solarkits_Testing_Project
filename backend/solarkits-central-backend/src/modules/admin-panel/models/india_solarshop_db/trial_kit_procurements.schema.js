const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

/**
 * TrialKitProcurement — Multi-stage Inward, Accounts Payment & Admin Approval Ledger.
 * SOLARKITS: Trial Kit Management Ecosystem (Warehouse ➔ Accounts ➔ Admin Approval)
 */
const schema = new mongoose.Schema({
  // Unique Tracking Numbers
  procurement_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true // e.g. "TK-PR-2026-0001"
  },
  grn_number: {
    type: String,
    trim: true,
    uppercase: true // e.g. "GRN-TK-2026-0001"
  },

  // Kit Reference
  combo_kit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'pc_comobo_kit',
    required: true
  },
  kit_type: {
    type: String,
    required: true,
    trim: true
  },
  blueprint_name: {
    type: String,
    trim: true,
    default: ''
  },
  capacity: {
    type: Number,
    default: 0
  },

  // Warehouse Reference
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'company_warehouses',
    required: true
  },
  warehouse_name: {
    type: String,
    trim: true,
    default: ''
  },
  warehouse_code: {
    type: String,
    trim: true,
    default: ''
  },

  // ==========================================
  // STAGE 1: Warehouse Manager Inward Request
  // ==========================================
  inward_quantity: {
    type: Number,
    required: true,
    min: 1
  },
  vendor_name: {
    type: String,
    required: true,
    trim: true
  },
  vendor_contact: {
    type: String,
    trim: true,
    default: ''
  },
  invoice_challan_number: {
    type: String,
    required: true,
    trim: true
  },
  invoice_challan_date: {
    type: Date,
    required: true
  },
  courier_transport_details: {
    transporter_name: { type: String, trim: true, default: '' },
    vehicle_number: { type: String, trim: true, default: '' },
    lr_number: { type: String, trim: true, default: '' },
    driver_name: { type: String, trim: true, default: '' },
    driver_phone: { type: String, trim: true, default: '' }
  },
  warehouse_inspection_status: {
    type: String,
    enum: ['passed', 'partial_damage', 'pending'],
    default: 'passed'
  },
  warehouse_remarks: {
    type: String,
    trim: true,
    default: ''
  },
  warehouse_documents: [{
    type: String,
    trim: true
  }],
  requested_by: {
    user_id: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: 'warehouse' }
  },
  requested_at: {
    type: Date,
    default: Date.now
  },

  // ==========================================
  // STAGE 2: Accounts Manager Procurement & Payment
  // ==========================================
  unit_cost_price_inr: {
    type: Number,
    min: 0,
    default: 0
  },
  subtotal_amount_inr: {
    type: Number,
    min: 0,
    default: 0
  },
  gst_rate_percent: {
    type: Number,
    min: 0,
    default: 13.8 // Default Solar composite rate
  },
  gst_amount_inr: {
    type: Number,
    min: 0,
    default: 0
  },
  total_payable_amount_inr: {
    type: Number,
    min: 0,
    default: 0
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'payment_recorded', 'approved', 'rejected'],
    default: 'unpaid'
  },
  payment_details: {
    payment_mode: {
      type: String,
      enum: ['bank_transfer_neft_rtgs', 'cheque', 'upi', 'cash', 'corporate_card', 'pending'],
      default: 'pending'
    },
    transaction_utr_no: {
      type: String,
      trim: true,
      default: ''
    },
    payment_date: {
      type: Date
    },
    company_bank_account: {
      type: String,
      trim: true,
      default: ''
    },
    vendor_bank_account: {
      type: String,
      trim: true,
      default: ''
    },
    payment_receipt_url: {
      type: String,
      trim: true,
      default: ''
    },
    accounts_remarks: {
      type: String,
      trim: true,
      default: ''
    },
    paid_by: {
      user_id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' }
    },
    paid_at: {
      type: Date
    }
  },

  // ==========================================
  // STAGE 3: Admin Approval & Stock Integration
  // ==========================================
  admin_approval_status: {
    type: String,
    enum: ['pending_payment', 'pending_approval', 'approved', 'rejected'],
    default: 'pending_payment'
  },
  admin_decision: {
    approved_by: {
      user_id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, default: '' }
    },
    approved_at: {
      type: Date
    },
    rejection_reason: {
      type: String,
      trim: true,
      default: ''
    },
    admin_notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  stock_inward_synced: {
    type: Boolean,
    default: false
  },
  stock_history_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trial_kit_stock_histories',
    default: null
  },

  // Lifecycle Status
  status: {
    type: String,
    enum: [
      'inward_requested', // Warehouse raised request, pending accounts payment
      'payment_recorded', // Accounts paid, pending admin approval
      'approved',         // Admin approved & stock incremented
      'rejected',         // Rejected by Admin or Accounts
      'cancelled'         // Cancelled
    ],
    default: 'inward_requested'
  }
}, {
  collection: 'trial_kit_procurements',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

schema.index({ procurement_number: 1 }, { unique: true });
schema.index({ warehouse_id: 1, status: 1 });
schema.index({ combo_kit_id: 1, warehouse_id: 1 });
schema.index({ status: 1, created_at: -1 });

module.exports = db.model('TrialKitProcurement', schema);
