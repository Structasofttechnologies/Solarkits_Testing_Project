const mongoose = require('mongoose');

const complianceTaskSchema = new mongoose.Schema({
  compliance_name: { type: String, required: true }, // e.g. "GSTR-3B Monthly Return", "TDS Payment Sec 194C", "MCA Annual AOC-4", "Advance Tax Q3"
  category: {
    type: String,
    enum: ['GST', 'TDS', 'INCOME_TAX', 'MCA', 'ROC', 'LABOUR_STATUTORY', 'AUDIT'],
    required: true
  },
  applicable_entity: { type: String, default: 'SOLARKITS INDIA PRIVATE LIMITED' },
  gstin: { type: String },
  financial_year: { type: String, default: '2026-2027' },
  periodicity: { type: String, enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'EVENT_BASED'], default: 'MONTHLY' },
  due_date: { type: Date, required: true },
  responsible_person: { type: String, required: true }, // Assigned user/accountant
  reviewer: { type: String, default: 'Admin / Finance Head' },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'],
    default: 'PENDING'
  },
  filing_reference: { type: String }, // ARN / SRN / Challan BSR / Acknowledgement number
  payment_amount: { type: Number, default: 0 },
  challan_number: { type: String },
  completion_date: { type: Date },
  supporting_documents: [{
    file_name: { type: String },
    file_url: { type: String }
  }],
  notes: { type: String }
}, { timestamps: true });

module.exports = {
  ComplianceTask: mongoose.model('compliance_tasks', complianceTaskSchema)
};
