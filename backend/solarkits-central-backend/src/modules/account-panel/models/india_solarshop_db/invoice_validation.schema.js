const mongoose = require('mongoose');

const purchaseInvoiceValidationSchema = new mongoose.Schema({
  invoice_number: { type: String, required: true, trim: true },
  invoice_date: { type: Date, required: true },
  financial_year: { type: String, required: true, default: '2026-2027' },
  supplier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'suppliers' },
  supplier_name: { type: String, required: true },
  supplier_gstin: { type: String, required: true, uppercase: true, trim: true },
  buyer_gstin: { type: String, required: true, uppercase: true, trim: true },
  po_number: { type: String, trim: true },
  po_id: { type: mongoose.Schema.Types.ObjectId, ref: 'purchase_orders' },
  grn_number: { type: String, trim: true }, // Goods Receipt Note / Inward Number
  warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'warehouses' },
  warehouse_name: { type: String },
  place_of_supply: { type: String, required: true },
  taxable_value: { type: Number, required: true, default: 0 },
  cgst_amount: { type: Number, default: 0 },
  sgst_amount: { type: Number, default: 0 },
  igst_amount: { type: Number, default: 0 },
  total_tax_amount: { type: Number, default: 0 },
  invoice_total_amount: { type: Number, required: true, default: 0 },
  
  // 10-Point Validation Results
  validation_checklist: {
    gstin_format_valid: { type: Boolean, default: false },
    no_duplicate_detected: { type: Boolean, default: false },
    invoice_date_valid: { type: Boolean, default: false },
    supplier_master_matched: { type: Boolean, default: false },
    hsn_sac_matched: { type: Boolean, default: false },
    taxable_value_math_valid: { type: Boolean, default: false },
    tax_calculation_valid: { type: Boolean, default: false },
    invoice_total_matched: { type: Boolean, default: false },
    po_reference_matched: { type: Boolean, default: false },
    goods_receipt_matched: { type: Boolean, default: false },
    supporting_docs_attached: { type: Boolean, default: false }
  },

  // Lifecycle Status according to Boss specification
  validation_status: {
    type: String,
    enum: [
      'UPLOADED',
      'VALIDATION_PENDING',
      'VALIDATED',
      'MISMATCH_FOUND',
      'DUPLICATE_INVOICE',
      'AWAITING_SUPPLIER_CORRECTION',
      'APPROVED_FOR_ACCOUNTING',
      'ITC_ELIGIBLE',
      'ITC_INELIGIBLE',
      'POSTED_TO_LEDGER'
    ],
    default: 'UPLOADED'
  },

  mismatch_reasons: [{ type: String }],
  supporting_documents: [{
    file_name: { type: String },
    file_url: { type: String },
    uploaded_at: { type: Date, default: Date.now }
  }],
  posted_voucher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'accounting_vouchers' },
  validated_by: { type: String },
  approved_by: { type: String },
  validation_remarks: { type: String }
}, { timestamps: true });

// Ensure unique invoice number per supplier
purchaseInvoiceValidationSchema.index({ supplier_gstin: 1, invoice_number: 1, financial_year: 1 }, { unique: true });

module.exports = {
  PurchaseInvoiceValidation: mongoose.model('purchase_invoice_validations', purchaseInvoiceValidationSchema)
};
