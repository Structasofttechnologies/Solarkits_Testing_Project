const mongoose = require('mongoose');

const expenseEntrySchema = new mongoose.Schema({
  expense_number: { type: String, required: true, unique: true }, // e.g. EXP-2026-0001
  accounting_head_id: { type: mongoose.Schema.Types.ObjectId, ref: 'accounting_heads', required: true },
  accounting_head_name: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'Direct Expenses',
      'Indirect Expenses',
      'Employee Expenses',
      'Warehouse Expenses',
      'Financial Expenses',
      'Transportation & Logistics',
      'Office & Admin',
      'Other Expenses'
    ],
    required: true
  },
  expense_date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  
  // GST Details
  is_gst_applicable: { type: Boolean, default: false },
  vendor_gstin: { type: String },
  gst_rate: { type: Number, default: 0 },
  cgst_amount: { type: Number, default: 0 },
  sgst_amount: { type: Number, default: 0 },
  igst_amount: { type: Number, default: 0 },
  itc_eligible: { type: Boolean, default: false },
  total_with_tax: { type: Number, required: true },

  // TDS Details
  is_tds_applicable: { type: Boolean, default: false },
  tds_section: { type: String }, // e.g. "194C - Contractor", "194I - Rent", "194J - Professional"
  tds_rate: { type: Number, default: 0 },
  tds_deducted: { type: Number, default: 0 },
  net_payable_amount: { type: Number, required: true },

  vendor_name: { type: String, required: true },
  payment_mode: {
    type: String,
    enum: ['BANK_TRANSFER', 'NEFT_RTGS', 'UPI', 'CHEQUE', 'PETTY_CASH', 'CREDIT_CARD'],
    default: 'BANK_TRANSFER'
  },

  // State, District, Cluster, Warehouse, Department mapping
  state: { type: String },
  district: { type: String },
  cluster_name: { type: String },
  warehouse_name: { type: String },
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouses' },
  department: { type: String, default: 'Operations' },

  // Workflow Approval Status
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED_TO_LEDGER', 'PAID'],
    default: 'SUBMITTED'
  },
  
  submitted_by: { type: String },
  approved_by: { type: String },
  approval_date: { type: Date },
  rejection_reason: { type: String },
  
  // Ledger posting
  ledger_voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'accounting_vouchers' },
  payment_reference: { type: String },
  payment_date: { type: Date },

  invoice_attachments: [{
    file_name: { type: String },
    file_url: { type: String }
  }],
  remarks: { type: String }
}, { timestamps: true });

module.exports = {
  ExpenseEntry: mongoose.model('expense_entries', expenseEntrySchema)
};
