const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const entrySchema = new mongoose.Schema({
  head_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'accounting_heads', required: true },
  head_code:    { type: String, required: true },
  head_name:    { type: String, required: true },
  category:     { type: String },
  ledger_type:  { type: String, enum: ['Income', 'Expense', 'Asset', 'Liability', 'Equity'] },
  entry_type:   { type: String, enum: ['Debit', 'Credit'], required: true },
  amount:       { type: Number, required: true, min: 0.01 },
  narration:    { type: String, default: '' }
}, { _id: false });

const s = new mongoose.Schema({
  voucher_number:     { type: String, required: true, unique: true, index: true },
  voucher_type:       { 
    type: String, 
    required: true, 
    enum: ['Journal', 'Payment', 'Receipt', 'Contra', 'Sales', 'Purchase', 'Credit Note', 'Debit Note'] 
  },
  voucher_date:       { type: Date, default: Date.now },
  financial_year:     { type: String, default: '2026-2027' },
  narration:          { type: String, required: true },
  
  entries:            [entrySchema],
  total_amount:       { type: Number, required: true }, // Total debits (equals credits)
  
  payment_mode:       { 
    type: String, 
    enum: ['Bank Transfer', 'NEFT/RTGS', 'Cash', 'Cheque', 'UPI', 'ICICI E-Collection', 'Internal Ledger', 'None'], 
    default: 'None' 
  },
  bank_reference:     { type: String, default: null }, // UTR, Cheque No, Ref ID

  // Transaction Linking (prompt requirement: orders, invoices, suppliers, warehouses)
  order_id:           { type: mongoose.Schema.Types.ObjectId, default: null },
  order_number:       { type: String, default: null },
  invoice_id:         { type: mongoose.Schema.Types.ObjectId, default: null },
  invoice_number:     { type: String, default: null },
  supplier_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers', default: null },
  supplier_name:      { type: String, default: null },
  warehouse_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'company_warehouses', default: null },
  warehouse_name:     { type: String, default: null },
  
  state_name:         { type: String, default: 'All India' },
  cluster_name:       { type: String, default: 'All Clusters' },
  cost_centre:        { type: String, default: 'Headquarters' },
  department:         { type: String, default: 'Accounts & Finance' },
  
  supporting_documents: [{ type: String }],
  status:             { type: String, enum: ['Posted', 'Draft', 'Cancelled'], default: 'Posted' },
  cancelled_reason:   { type: String, default: null },
  cancelled_at:       { type: Date, default: null },
  
  created_by: {
    user_id:          { type: mongoose.Schema.Types.ObjectId, default: null },
    name:             { type: String, default: 'Admin Account' },
    role:             { type: String, default: 'Account Executive' }
  },
  
  created_at:         { type: Date, default: Date.now },
  updated_at:         { type: Date, default: Date.now }
}, { collection: 'accounting_vouchers', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });

module.exports = db.model('accounting_vouchers', s);
