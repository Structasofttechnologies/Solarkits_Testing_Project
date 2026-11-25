const mongoose = require('mongoose');
const { india_solarshop_db: db } = require('../../config/databases');

const s = new mongoose.Schema({
  head_code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Sales Revenue',
      'Purchase Accounts',
      'Direct Expenses',
      'Indirect Expenses',
      'Employee Expenses',
      'Warehouse Expenses',
      'Financial Expenses',
      'Tax Accounts',
      'Other Income',
      'Current Assets',
      'Fixed Assets',
      'Current Liabilities',
      'Non-Current Liabilities',
      'Equity & Capital'
    ]
  },
  parent_group: { type: String, default: 'General' },
  ledger_type: {
    type: String,
    required: true,
    enum: ['Income', 'Expense', 'Asset', 'Liability', 'Equity']
  },
  gst_applicable: { type: Boolean, default: false },
  gst_rate: { type: Number, default: 0 }, // 0, 5, 12, 18, 28
  tax_treatment: { type: String, default: 'Standard Taxable' }, // Regular, Reverse Charge, Exempt, Zero Rated
  tds_applicable: { type: Boolean, default: false },
  tds_section: { type: String, default: null }, // 194C, 194J, 194I, 194H, etc.

  // Geographical & Organisational Mapping
  state_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_states', default: null },
  state_name: { type: String, default: 'All India' },
  cluster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'sys_filter_clusters', default: null },
  cluster_name: { type: String, default: 'All Clusters' },
  cost_centre: { type: String, default: 'Headquarters' },
  department: { type: String, default: 'Accounts & Finance' },

  // Balances
  opening_balance: {
    amount: { type: Number, default: 0 },
    type: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' }
  },
  current_balance: {
    amount: { type: Number, default: 0 },
    type: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' }
  },
  total_debits: { type: Number, default: 0 },
  total_credits: { type: Number, default: 0 },

  financial_year: { type: String, default: '2026-2027' },
  is_active: { type: Boolean, default: true },
  is_system_head: { type: Boolean, default: false },
  notes: { type: String, default: null },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'accounting_heads', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: { virtuals: true }, toObject: { virtuals: true } });

s.virtual('id').get(function () { return this._id; });
s.virtual('head_name').get(function () { return this.name; });

const AccountingHead = db.model('accounting_heads', s);

module.exports = AccountingHead;
module.exports.AccountingHead = AccountingHead;
