const mongoose = require('mongoose');
const { india_solarshop_db } = require('../../config/databases');

const auditItemSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor_type: {
      type: String,
      enum: ['reseller', 'epc', 'epc_partner', 'epc_buyer', 'cms_user', 'admin', 'system'],
      default: 'system',
    },
    actor_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    actor_name: { type: String, default: null },
    note: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    po_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'fpo_orders',
      required: true,
      index: true,
    },
    po_number: {
      type: String,
      required: true,
      trim: true,
    },
    requester_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    requester_role: {
      type: String,
      enum: ['FRANCHISEE', 'SOLAR_EPC', 'BDE', 'ADMIN'],
      default: 'FRANCHISEE',
    },
    requester_name: { type: String, default: null },
    requester_phone: { type: String, default: null },
    requester_email: { type: String, default: null },

    // Quota & Kit Commitments
    committed_quantity: { type: Number, required: true, min: 0 },
    purchased_quantity: { type: Number, required: true, min: 0 },
    unpurchased_quantity: { type: Number, required: true, min: 0 },

    // Financials in integer Paise
    token_paid_paise: { type: Number, required: true, min: 0 },
    token_adjusted_paise: { type: Number, default: 0, min: 0 },
    penalty_paise: { type: Number, default: 0, min: 0 },
    penalty_reason: { type: String, default: null },
    refundable_amount_paise: { type: Number, required: true, min: 0 },

    // Bank payout destination
    bank_details: {
      account_name: { type: String, default: null },
      bank_name: { type: String, default: null },
      account_number: { type: String, default: null },
      ifsc_code: { type: String, default: null },
      upi_id: { type: String, default: null },
    },

    // Status & Approval workflow
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PROCESSED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    approval_notes: { type: String, default: null },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    approved_at: { type: Date, default: null },

    rejection_reason: { type: String, default: null },
    rejected_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    rejected_at: { type: Date, default: null },

    // Payout details
    payment_method: {
      type: String,
      enum: ['bank_transfer', 'upi', 'wallet', 'credit_note', 'other'],
      default: 'bank_transfer',
    },
    payment_reference: { type: String, default: null }, // UTR / Transaction ID
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'cms_users', default: null },
    processed_at: { type: Date, default: null },

    audit_history: [auditItemSchema],
  },
  {
    collection: 'po_refund_requests',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

schema.virtual('id').get(function () {
  return this._id;
});

module.exports = india_solarshop_db.model('po_refund_requests', schema);
