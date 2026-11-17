const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const entrySchema = new mongoose.Schema({
  head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'accounting_heads', default: null },
  head_code: { type: String, default: '' },
  head_name: { type: String, default: '' },
  category: { type: String },
  ledger_type: { type: String },
  entry_type: { type: String },
  type: { type: String },
  amount: { type: Number, default: 0 },
  debit_amount: { type: Number, default: 0 },
  credit_amount: { type: Number, default: 0 },
  narration: { type: String, default: '' }
}, { _id: false, strict: false });

const s = new mongoose.Schema({
  voucher_number: { type: String, required: true, unique: true, index: true },
  voucher_type: {
    type: String,
    required: true
  },
  voucher_date: { type: Date, default: Date.now },
  financial_year: { type: String, default: '2026-2027' },
  narration: { type: String, default: '' },

  entries: [entrySchema],
  total_amount: { type: Number, required: true }, // Total debits (equals credits)

  payment_mode: {
    type: String,
    default: 'None'
  },
  bank_reference: { type: String, default: null }, // UTR, Cheque No, Ref ID

  // Transaction Linking (prompt requirement: orders, invoices, suppliers, warehouses)
  reference_number: { type: String, default: null },
  entity_type: { type: String, default: null },
  entity_name: { type: String, default: null },
  entity_gstin: { type: String, default: null },
  order_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  order_number: { type: String, default: null },
  invoice_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  invoice_number: { type: String, default: null },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', default: null },
  supplier_name: { type: String, default: null },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
  warehouse_name: { type: String, default: null },

  state: { type: String, default: null },
  state_name: { type: String, default: 'All India' },
  cluster_name: { type: String, default: 'All Clusters' },
  cost_centre: { type: String, default: 'Headquarters' },
  department: { type: String, default: 'Accounts & Finance' },

  supporting_documents: [{ type: String }],
  status: { type: String, default: 'Posted' },
  cancelled_reason: { type: String, default: null },
  cancelled_at: { type: Date, default: null },

  created_by: { type: mongoose.Schema.Types.Mixed },
  approved_by: { type: mongoose.Schema.Types.Mixed },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'accounting_vouchers', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true }, strict: false });

s.virtual('id').get(function () { return this._id; });

const AccountingVoucher = db.model('accounting_vouchers', s);

module.exports = AccountingVoucher;
module.exports.AccountingVoucher = AccountingVoucher;
