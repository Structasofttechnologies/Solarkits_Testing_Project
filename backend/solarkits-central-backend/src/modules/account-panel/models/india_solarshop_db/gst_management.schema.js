const mongoose = require('mongoose');

const gstConfigSchema = new mongoose.Schema({
  gstin: { type: String, required: true, uppercase: true, trim: true },
  legal_name: { type: String, required: true },
  trade_name: { type: String },
  state_code: { type: String, required: true },
  state_name: { type: String, required: true },
  registered_address: { type: String },
  gst_type: { type: String, enum: ['REGULAR', 'COMPOSITION', 'SEZ'], default: 'REGULAR' },
  is_primary: { type: Boolean, default: false },
  tax_invoice_prefix: { type: String, default: 'SK-INV/' },
  tax_invoice_next_number: { type: Number, default: 1001 },
  financial_year: { type: String, default: '2026-2027' },
  e_invoice_applicable: { type: Boolean, default: true },
  e_way_bill_threshold: { type: Number, default: 50000 },
  reverse_charge_applicable: { type: Boolean, default: false },
  hsn_sac_mappings: [{
    code: { type: String, required: true },
    type: { type: String, enum: ['HSN', 'SAC'], default: 'HSN' },
    description: { type: String },
    cgst_rate: { type: Number, default: 9 },
    sgst_rate: { type: Number, default: 9 },
    igst_rate: { type: Number, default: 18 },
    cess_rate: { type: Number, default: 0 }
  }],
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const gstFilingRecordSchema = new mongoose.Schema({
  return_type: { type: String, enum: ['GSTR-1', 'GSTR-3B', 'GSTR-2B', 'GSTR-9', 'GSTR-9C'], required: true },
  financial_year: { type: String, required: true },
  tax_period: { type: String, required: true }, // e.g. "October 2026" or "102026"
  filing_status: { type: String, enum: ['PENDING', 'GENERATED', 'VALIDATED', 'FILED', 'OVERDUE'], default: 'PENDING' },
  arn: { type: String },
  filing_date: { type: Date },
  due_date: { type: Date, required: true },
  acknowledged_by: { type: String },
  total_taxable_value: { type: Number, default: 0 },
  total_cgst: { type: Number, default: 0 },
  total_sgst: { type: Number, default: 0 },
  total_igst: { type: Number, default: 0 },
  total_cess: { type: Number, default: 0 },
  total_tax_payable: { type: Number, default: 0 },
  itc_claimed_cgst: { type: Number, default: 0 },
  itc_claimed_sgst: { type: Number, default: 0 },
  itc_claimed_igst: { type: Number, default: 0 },
  net_tax_paid_cash: { type: Number, default: 0 },
  reconciliation_summary: {
    matched_invoices: { type: Number, default: 0 },
    mismatched_invoices: { type: Number, default: 0 },
    missing_in_gstr2b: { type: Number, default: 0 },
    eligible_itc: { type: Number, default: 0 },
    ineligible_itc: { type: Number, default: 0 }
  },
  notes: { type: String }
}, { timestamps: true });

module.exports = {
  GstConfig: mongoose.model('gst_configurations', gstConfigSchema),
  GstFilingRecord: mongoose.model('gst_filing_records', gstFilingRecordSchema)
};
