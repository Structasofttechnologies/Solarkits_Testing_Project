const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../admin-panel/config/databases');

/**
 * icici_collection_logs — Complete audit log for all ICICI E-Collection transactions.
 * Stores raw packets, decrypted business data, and reconciliation associations.
 */
const schema = new mongoose.Schema({
  api_type: {
    type: String,
    enum: ['MSG_HOLD', 'MIS_POSTING'],
    required: true
  },
  client_code: {
    type: String,
    trim: true
  },
  virtual_account_number: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  mode: {
    type: String,
    enum: ['UPI', 'IMPS', 'NEFT', 'RTGS', 'FT', 'OTHER'],
    default: 'RTGS'
  },
  user_id: {
    type: String,
    trim: true
  },
  utr: {
    type: String,
    trim: true,
    uppercase: true,
    index: true
  },
  sender_remark: {
    type: String,
    default: null
  },
  client_account_no: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amount_paise: {
    type: Number,
    required: true,
    min: 0
  },
  payer_name: {
    type: String,
    default: '-'
  },
  payer_acc_number: {
    type: String,
    default: null
  },
  payer_bank_ifsc: {
    type: String,
    default: null
  },
  payer_payment_date: {
    type: String,
    default: null
  },
  bank_internal_txn_number: {
    type: String,
    index: true,
    default: null
  },
  status: {
    type: String,
    enum: ['accepted', 'rejected', 'credited', 'duplicate', 'failed'],
    required: true
  },
  response_code: {
    type: String,
    default: null
  },
  response_message: {
    type: String,
    default: null
  },

  // Reconciliation Associations
  reconciled_order_type: {
    type: String,
    enum: ['epc_order', 'fpo_order', 'loose_order', 'wallet_recharge', 'unmatched'],
    default: 'unmatched'
  },
  reconciled_order_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  reconciled_order_number: {
    type: String,
    default: null
  },
  epc_account_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'epc_accounts',
    default: null
  },
  reseller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'resellers',
    default: null
  },

  // Debugging & Auditing
  raw_encrypted_request: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  decrypted_payload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  response_sent: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ip_address: {
    type: String,
    default: null
  }
}, {
  collection: 'icici_collection_logs',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.index({ utr: 1, api_type: 1 });
schema.index({ virtual_account_number: 1, created_at: -1 });
schema.index({ epc_account_id: 1, created_at: -1 });

module.exports = db.model('icici_collection_logs', schema);
