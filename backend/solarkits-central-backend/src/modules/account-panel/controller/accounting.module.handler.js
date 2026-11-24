const mongoose = require('mongoose');
const AccountingHead = require('../models/india_solarshop_db/accounting_head.schema');
const AccountingVoucher = require('../models/india_solarshop_db/accounting_voucher.schema');

// Pre-defined default Chart of Accounts specified in prompt section 1.1
const DEFAULT_ACCOUNTING_HEADS = [
  // 1. Sales Revenue
  { name: 'Kit Sales', category: 'Sales Revenue', parent_group: 'Operating Revenue', ledger_type: 'Income', gst_applicable: true, gst_rate: 12, tax_treatment: 'Standard Taxable' },
  { name: 'Loose Product Sales', category: 'Sales Revenue', parent_group: 'Operating Revenue', ledger_type: 'Income', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },
  { name: 'Franchisee Sales', category: 'Sales Revenue', parent_group: 'Operating Revenue', ledger_type: 'Income', gst_applicable: true, gst_rate: 12, tax_treatment: 'Standard Taxable' },
  { name: 'EPC Sales', category: 'Sales Revenue', parent_group: 'Operating Revenue', ledger_type: 'Income', gst_applicable: true, gst_rate: 12, tax_treatment: 'Standard Taxable' },

  // 2. Purchase Accounts
  { name: 'Product Purchases', category: 'Purchase Accounts', parent_group: 'Cost of Goods Sold', ledger_type: 'Expense', gst_applicable: true, gst_rate: 12, tax_treatment: 'Regular ITC' },
  { name: 'Supplier Purchases', category: 'Purchase Accounts', parent_group: 'Cost of Goods Sold', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Regular ITC' },
  { name: 'OEM Purchases', category: 'Purchase Accounts', parent_group: 'Cost of Goods Sold', ledger_type: 'Expense', gst_applicable: true, gst_rate: 12, tax_treatment: 'Regular ITC' },

  // 3. Direct Expenses
  { name: 'Transportation', category: 'Direct Expenses', parent_group: 'Direct Logistics', ledger_type: 'Expense', gst_applicable: true, gst_rate: 5, tax_treatment: 'GTA Reverse Charge', tds_applicable: true, tds_section: '194C - Contractor' },
  { name: 'Loading', category: 'Direct Expenses', parent_group: 'Direct Logistics', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'Unloading', category: 'Direct Expenses', parent_group: 'Direct Logistics', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'Packaging', category: 'Direct Expenses', parent_group: 'Direct Logistics', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },

  // 4. Indirect Expenses
  { name: 'Rent', category: 'Indirect Expenses', parent_group: 'Administrative Overheads', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Commercial Rent', tds_applicable: true, tds_section: '194I - Rent' },
  { name: 'Electricity', category: 'Indirect Expenses', parent_group: 'Administrative Overheads', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'Internet', category: 'Indirect Expenses', parent_group: 'Administrative Overheads', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },
  { name: 'Office Expenses', category: 'Indirect Expenses', parent_group: 'Administrative Overheads', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },

  // 5. Employee Expenses
  { name: 'Salaries', category: 'Employee Expenses', parent_group: 'Payroll & HR', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt', tds_applicable: true, tds_section: '192 - Salary' },
  { name: 'Incentives', category: 'Employee Expenses', parent_group: 'Payroll & HR', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'BDE Commission', category: 'Employee Expenses', parent_group: 'Payroll & HR', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt', tds_applicable: true, tds_section: '194H - Commission' },
  { name: 'Travel', category: 'Employee Expenses', parent_group: 'Payroll & HR', ledger_type: 'Expense', gst_applicable: true, gst_rate: 5, tax_treatment: 'Standard Taxable' },

  // 6. Warehouse Expenses
  { name: 'Warehouse Rent', category: 'Warehouse Expenses', parent_group: 'Warehouse Operations', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Commercial Rent', tds_applicable: true, tds_section: '194I - Rent' },
  { name: 'Maintenance', category: 'Warehouse Expenses', parent_group: 'Warehouse Operations', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable', tds_applicable: true, tds_section: '194C - Contractor' },
  { name: 'Labour', category: 'Warehouse Expenses', parent_group: 'Warehouse Operations', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },

  // 7. Financial Expenses
  { name: 'Loan Interest', category: 'Financial Expenses', parent_group: 'Finance Costs', ledger_type: 'Expense', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'Bank Charges', category: 'Financial Expenses', parent_group: 'Finance Costs', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },
  { name: 'Processing Fees', category: 'Financial Expenses', parent_group: 'Finance Costs', ledger_type: 'Expense', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },

  // 8. Tax Accounts
  { name: 'CGST Input Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (ITC)', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Input Tax Credit' },
  { name: 'SGST Input Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (ITC)', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Input Tax Credit' },
  { name: 'IGST Input Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (ITC)', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Input Tax Credit' },
  { name: 'CGST Output Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (Liability)', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'Output Liability' },
  { name: 'SGST Output Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (Liability)', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'Output Liability' },
  { name: 'IGST Output Tax', category: 'Tax Accounts', parent_group: 'Duties & Taxes (Liability)', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'Output Liability' },
  { name: 'TDS Payable', category: 'Tax Accounts', parent_group: 'Statutory Liabilities', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'TDS' },
  { name: 'TCS Payable', category: 'Tax Accounts', parent_group: 'Statutory Liabilities', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'TCS' },

  // 9. Other Income
  { name: 'Interest Income', category: 'Other Income', parent_group: 'Non-Operating Income', ledger_type: 'Income', gst_applicable: false, gst_rate: 0, tax_treatment: 'Exempt' },
  { name: 'Miscellaneous Income', category: 'Other Income', parent_group: 'Non-Operating Income', ledger_type: 'Income', gst_applicable: true, gst_rate: 18, tax_treatment: 'Standard Taxable' },

  // 10. Cash & Bank & Standard Assets / Liabilities
  { name: 'HDFC Current Bank Account', category: 'Current Assets', parent_group: 'Bank Accounts', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'ICICI E-Collection Bank Account', category: 'Current Assets', parent_group: 'Bank Accounts', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'Cash in Hand', category: 'Current Assets', parent_group: 'Cash Accounts', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'Accounts Receivable (Debtors)', category: 'Current Assets', parent_group: 'Sundry Debtors', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'Solar Inventory Stock Asset', category: 'Current Assets', parent_group: 'Stock-in-Hand', ledger_type: 'Asset', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'Accounts Payable (Creditors)', category: 'Current Liabilities', parent_group: 'Sundry Creditors', ledger_type: 'Liability', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
  { name: 'Share Capital / Owner Equity', category: 'Equity & Capital', parent_group: 'Capital Account', ledger_type: 'Equity', gst_applicable: false, gst_rate: 0, tax_treatment: 'Not Applicable' },
];

/**
 * Helper: Generate next unique Head Code (e.g. AH-1001)
 */
async function generateNextHeadCode() {
  const count = await AccountingHead.countDocuments();
  const nextNum = 1001 + count;
  return `AH-${nextNum}`;
}

/**
 * Helper: Generate next Voucher Number (e.g. JV-2026-0001, PV-2026-0001)
 */
async function generateNextVoucherNumber(type = 'Journal') {
  const prefixMap = {
    'Journal': 'JV',
    'Payment': 'PV',
    'Receipt': 'RV',
    'Contra': 'CV',
    'Sales': 'SINV',
    'Purchase': 'PINV',
    'Credit Note': 'CN',
    'Debit Note': 'DN'
  };
  const prefix = prefixMap[type] || 'VOU';
  const year = new Date().getFullYear();
  const count = await AccountingVoucher.countDocuments({ voucher_type: type });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

/**
 * 1. SEED DEFAULT HEADS (Disabled - dummy seeds purged)
 * POST /accounts/accounting/heads/seed
 */
exports.seed_default_heads = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Static dummy head seeding is disabled. Please create dynamic accounting heads via the New Accounting Head modal.',
    count: 0
  });
};

/**
 * 2. LIST ALL ACCOUNTING HEADS
 * GET /accounts/accounting/heads
 */
exports.list_accounting_heads = async (req, res) => {
  try {
    const { category, ledger_type, is_active, search, state_name, financial_year } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (ledger_type) filter.ledger_type = ledger_type;
    if (is_active !== undefined && is_active !== '') filter.is_active = is_active === 'true';
    if (state_name && state_name !== 'All India') filter.state_name = state_name;
    if (financial_year) filter.financial_year = financial_year;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { head_code: { $regex: search, $options: 'i' } },
        { parent_group: { $regex: search, $options: 'i' } }
      ];
    }

    let heads = await AccountingHead.find(filter).sort({ head_code: 1 });

    // Category summary statistics
    const stats = {
      total_heads: heads.length,
      income_heads: heads.filter(h => h.ledger_type === 'Income').length,
      expense_heads: heads.filter(h => h.ledger_type === 'Expense').length,
      asset_heads: heads.filter(h => h.ledger_type === 'Asset').length,
      liability_heads: heads.filter(h => h.ledger_type === 'Liability').length,
      equity_heads: heads.filter(h => h.ledger_type === 'Equity').length
    };

    return res.status(200).json({ status: 'success', data: heads, stats });
  } catch (error) {
    console.error('list_accounting_heads error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 3. CREATE DYNAMIC ACCOUNTING HEAD
 * POST /accounts/accounting/heads
 */
exports.create_accounting_head = async (req, res) => {
  try {
    const {
      name,
      category,
      parent_group,
      ledger_type,
      gst_applicable,
      gst_rate,
      tax_treatment,
      tds_applicable,
      tds_section,
      state_name,
      cluster_name,
      cost_centre,
      department,
      opening_balance,
      financial_year,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Accounting head name is required.' });
    }
    if (!category) {
      return res.status(400).json({ status: 'error', message: 'Category is required.' });
    }
    if (!ledger_type) {
      return res.status(400).json({ status: 'error', message: 'Ledger type (Income/Expense/Asset/Liability/Equity) is required.' });
    }

    // Generate unique code
    const head_code = await generateNextHeadCode();

    const opBal = {
      amount: Number(opening_balance?.amount || 0),
      type: opening_balance?.type || (ledger_type === 'Income' || ledger_type === 'Liability' || ledger_type === 'Equity' ? 'Cr' : 'Dr')
    };

    const newHead = new AccountingHead({
      head_code,
      name: name.trim(),
      category,
      parent_group: parent_group?.trim() || 'General',
      ledger_type,
      gst_applicable: Boolean(gst_applicable),
      gst_rate: Number(gst_rate || 0),
      tax_treatment: tax_treatment || 'Standard Taxable',
      tds_applicable: Boolean(tds_applicable),
      tds_section: tds_applicable ? tds_section : null,
      state_name: state_name || 'All India',
      cluster_name: cluster_name || 'All Clusters',
      cost_centre: cost_centre || 'Headquarters',
      department: department || 'Accounts & Finance',
      opening_balance: opBal,
      current_balance: opBal,
      total_debits: opBal.type === 'Dr' ? opBal.amount : 0,
      total_credits: opBal.type === 'Cr' ? opBal.amount : 0,
      financial_year: financial_year || '2026-2027',
      is_active: true,
      notes: notes || null
    });

    await newHead.save();
    return res.status(201).json({ status: 'success', message: 'Accounting head created successfully.', data: newHead });
  } catch (error) {
    console.error('create_accounting_head error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 4. UPDATE ACCOUNTING HEAD
 * PUT /accounts/accounting/heads/:id
 */
exports.update_accounting_head = async (req, res) => {
  try {
    const { id } = req.params;
    const head = await AccountingHead.findById(id);
    if (!head) {
      return res.status(404).json({ status: 'error', message: 'Accounting head not found.' });
    }

    const {
      name,
      category,
      parent_group,
      ledger_type,
      gst_applicable,
      gst_rate,
      tax_treatment,
      tds_applicable,
      tds_section,
      state_name,
      cluster_name,
      cost_centre,
      department,
      opening_balance,
      is_active,
      notes
    } = req.body;

    if (name) head.name = name.trim();
    if (category) head.category = category;
    if (parent_group) head.parent_group = parent_group.trim();
    if (ledger_type) head.ledger_type = ledger_type;
    if (gst_applicable !== undefined) head.gst_applicable = Boolean(gst_applicable);
    if (gst_rate !== undefined) head.gst_rate = Number(gst_rate);
    if (tax_treatment) head.tax_treatment = tax_treatment;
    if (tds_applicable !== undefined) head.tds_applicable = Boolean(tds_applicable);
    head.tds_section = head.tds_applicable ? tds_section : null;
    if (state_name) head.state_name = state_name;
    if (cluster_name) head.cluster_name = cluster_name;
    if (cost_centre) head.cost_centre = cost_centre;
    if (department) head.department = department;
    if (is_active !== undefined) head.is_active = Boolean(is_active);
    if (notes !== undefined) head.notes = notes;

    if (opening_balance && opening_balance.amount !== undefined) {
      head.opening_balance = {
        amount: Number(opening_balance.amount),
        type: opening_balance.type || 'Dr'
      };
      // Recalculate net current balance
      const opDr = head.opening_balance.type === 'Dr' ? head.opening_balance.amount : 0;
      const opCr = head.opening_balance.type === 'Cr' ? head.opening_balance.amount : 0;
      const netDr = opDr + (head.total_debits || 0);
      const netCr = opCr + (head.total_credits || 0);

      if (['Asset', 'Expense'].includes(head.ledger_type)) {
        const net = netDr - netCr;
        head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Dr' : 'Cr' };
      } else {
        const net = netCr - netDr;
        head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Cr' : 'Dr' };
      }
    }

    head.updated_at = new Date();
    await head.save();

    return res.status(200).json({ status: 'success', message: 'Accounting head updated successfully.', data: head });
  } catch (error) {
    console.error('update_accounting_head error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 5. TOGGLE HEAD STATUS (Activate / Deactivate)
 * PATCH /accounts/accounting/heads/:id/status
 */
exports.toggle_head_status = async (req, res) => {
  try {
    const { id } = req.params;
    const head = await AccountingHead.findById(id);
    if (!head) {
      return res.status(404).json({ status: 'error', message: 'Accounting head not found.' });
    }

    head.is_active = !head.is_active;
    head.updated_at = new Date();
    await head.save();

    return res.status(200).json({
      status: 'success',
      message: `Accounting head ${head.is_active ? 'activated' : 'deactivated'} successfully.`,
      is_active: head.is_active
    });
  } catch (error) {
    console.error('toggle_head_status error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 6. CREATE & POST ACCOUNTING VOUCHER (Double-Entry Bookkeeping)
 * POST /accounts/accounting/vouchers
 */
exports.create_voucher = async (req, res) => {
  try {
    const {
      voucher_type,
      voucher_date,
      narration,
      entries,
      payment_mode,
      bank_reference,
      order_id,
      order_number,
      invoice_id,
      invoice_number,
      supplier_id,
      supplier_name,
      warehouse_id,
      warehouse_name,
      state_name,
      cluster_name,
      cost_centre,
      department,
      supporting_documents
    } = req.body;

    if (!voucher_type) {
      return res.status(400).json({ status: 'error', message: 'Voucher type is required.' });
    }
    if (!narration || !narration.trim()) {
      return res.status(400).json({ status: 'error', message: 'Voucher narration / remarks is required.' });
    }
    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({ status: 'error', message: 'Double-entry requires at least 2 ledger entry lines (Debit and Credit).' });
    }

    // Verify Debits match Credits
    let totalDebit = 0;
    let totalCredit = 0;
    const validatedEntries = [];

    for (const e of entries) {
      const amount = Number(e.amount);
      if (!amount || amount <= 0) {
        return res.status(400).json({ status: 'error', message: `Invalid amount for entry ${e.head_name || 'line'}.` });
      }

      const head = await AccountingHead.findById(e.head_id);
      if (!head) {
        return res.status(400).json({ status: 'error', message: `Accounting head not found for ID: ${e.head_id}` });
      }

      if (e.entry_type === 'Debit') {
        totalDebit += amount;
      } else if (e.entry_type === 'Credit') {
        totalCredit += amount;
      } else {
        return res.status(400).json({ status: 'error', message: 'Entry type must be either Debit or Credit.' });
      }

      validatedEntries.push({
        head_id: head._id,
        head_code: head.head_code,
        head_name: head.name,
        category: head.category,
        ledger_type: head.ledger_type,
        entry_type: e.entry_type,
        amount: Math.round(amount * 100) / 100,
        narration: e.narration || narration
      });
    }

    // Check balance with 2-decimal precision
    const diff = Math.abs(Math.round(totalDebit * 100) - Math.round(totalCredit * 100)) / 100;
    if (diff > 0.01) {
      return res.status(400).json({
        status: 'error',
        message: `Debit total (₹${totalDebit.toFixed(2)}) must equal Credit total (₹${totalCredit.toFixed(2)}). Difference: ₹${diff.toFixed(2)}.`
      });
    }

    const voucher_number = await generateNextVoucherNumber(voucher_type);

    const newVoucher = new AccountingVoucher({
      voucher_number,
      voucher_type,
      voucher_date: voucher_date ? new Date(voucher_date) : new Date(),
      financial_year: '2026-2027',
      narration: narration.trim(),
      entries: validatedEntries,
      total_amount: Math.round(totalDebit * 100) / 100,
      payment_mode: payment_mode || 'None',
      bank_reference: bank_reference || null,
      order_id: order_id || null,
      order_number: order_number || null,
      invoice_id: invoice_id || null,
      invoice_number: invoice_number || null,
      supplier_id: supplier_id || null,
      supplier_name: supplier_name || null,
      warehouse_id: warehouse_id || null,
      warehouse_name: warehouse_name || null,
      state_name: state_name || 'All India',
      cluster_name: cluster_name || 'All Clusters',
      cost_centre: cost_centre || 'Headquarters',
      department: department || 'Accounts & Finance',
      supporting_documents: supporting_documents || [],
      status: 'Posted',
      created_by: {
        user_id: req.user?._id || null,
        name: req.user?.name || req.user?.full_name || 'Admin Account',
        role: req.user?.role || 'Account Executive'
      }
    });

    await newVoucher.save();

    // Atomically update balances on each affected accounting head
    for (const e of validatedEntries) {
      const head = await AccountingHead.findById(e.head_id);
      if (head) {
        if (e.entry_type === 'Debit') {
          head.total_debits = (head.total_debits || 0) + e.amount;
        } else {
          head.total_credits = (head.total_credits || 0) + e.amount;
        }

        const opDr = head.opening_balance.type === 'Dr' ? head.opening_balance.amount : 0;
        const opCr = head.opening_balance.type === 'Cr' ? head.opening_balance.amount : 0;
        const netDr = opDr + (head.total_debits || 0);
        const netCr = opCr + (head.total_credits || 0);

        if (['Asset', 'Expense'].includes(head.ledger_type)) {
          const net = netDr - netCr;
          head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Dr' : 'Cr' };
        } else {
          const net = netCr - netDr;
          head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Cr' : 'Dr' };
        }

        await head.save();
      }
    }

    return res.status(201).json({
      status: 'success',
      message: `Voucher ${voucher_number} posted successfully and ledgers updated.`,
      data: newVoucher
    });
  } catch (error) {
    console.error('create_voucher error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 7. LIST ACCOUNTING VOUCHERS
 * GET /accounts/accounting/vouchers
 */
exports.list_vouchers = async (req, res) => {
  try {
    const { voucher_type, search, from_date, to_date, status, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (voucher_type && voucher_type !== 'All') filter.voucher_type = voucher_type;
    if (status) filter.status = status;

    if (from_date || to_date) {
      filter.voucher_date = {};
      if (from_date) filter.voucher_date.$gte = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        filter.voucher_date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { voucher_number: { $regex: search, $options: 'i' } },
        { narration: { $regex: search, $options: 'i' } },
        { 'entries.head_name': { $regex: search, $options: 'i' } },
        { order_number: { $regex: search, $options: 'i' } },
        { invoice_number: { $regex: search, $options: 'i' } },
        { supplier_name: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [vouchers, total] = await Promise.all([
      AccountingVoucher.find(filter).sort({ voucher_date: -1, created_at: -1 }).skip(skip).limit(Number(limit)),
      AccountingVoucher.countDocuments(filter)
    ]);

    // Summary counts by type
    const summary = {
      total_vouchers: total,
      total_posted_amount: vouchers.reduce((acc, v) => v.status === 'Posted' ? acc + v.total_amount : acc, 0)
    };

    return res.status(200).json({ status: 'success', data: vouchers, total, summary });
  } catch (error) {
    console.error('list_vouchers error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 8. GET VOUCHER DETAIL
 * GET /accounts/accounting/vouchers/:id
 */
exports.get_voucher_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const voucher = await AccountingVoucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ status: 'error', message: 'Voucher not found.' });
    }
    return res.status(200).json({ status: 'success', data: voucher });
  } catch (error) {
    console.error('get_voucher_detail error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 9. CANCEL / VOID VOUCHER
 * POST /accounts/accounting/vouchers/:id/cancel
 */
exports.cancel_voucher = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const voucher = await AccountingVoucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ status: 'error', message: 'Voucher not found.' });
    }
    if (voucher.status === 'Cancelled') {
      return res.status(400).json({ status: 'error', message: 'Voucher is already cancelled.' });
    }

    // Reverse balances on heads
    for (const e of voucher.entries) {
      const head = await AccountingHead.findById(e.head_id);
      if (head) {
        if (e.entry_type === 'Debit') {
          head.total_debits = Math.max(0, (head.total_debits || 0) - e.amount);
        } else {
          head.total_credits = Math.max(0, (head.total_credits || 0) - e.amount);
        }

        const opDr = head.opening_balance.type === 'Dr' ? head.opening_balance.amount : 0;
        const opCr = head.opening_balance.type === 'Cr' ? head.opening_balance.amount : 0;
        const netDr = opDr + (head.total_debits || 0);
        const netCr = opCr + (head.total_credits || 0);

        if (['Asset', 'Expense'].includes(head.ledger_type)) {
          const net = netDr - netCr;
          head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Dr' : 'Cr' };
        } else {
          const net = netCr - netDr;
          head.current_balance = { amount: Math.abs(net), type: net >= 0 ? 'Cr' : 'Dr' };
        }

        await head.save();
      }
    }

    voucher.status = 'Cancelled';
    voucher.cancelled_reason = reason || 'Cancelled by Accounts Admin';
    voucher.cancelled_at = new Date();
    await voucher.save();

    return res.status(200).json({ status: 'success', message: 'Voucher cancelled and ledger entries reversed.', data: voucher });
  } catch (error) {
    console.error('cancel_voucher error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 10. GET LEDGER STATEMENT FOR AN ACCOUNTING HEAD
 * GET /accounts/accounting/ledgers/:head_id
 */
exports.get_ledger_statement = async (req, res) => {
  try {
    const { head_id } = req.params;
    const { from_date, to_date } = req.query;

    const head = await AccountingHead.findById(head_id);
    if (!head) {
      return res.status(404).json({ status: 'error', message: 'Accounting head not found.' });
    }

    const query = {
      'entries.head_id': head._id,
      status: 'Posted'
    };

    if (from_date || to_date) {
      query.voucher_date = {};
      if (from_date) query.voucher_date.$gte = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        query.voucher_date.$lte = end;
      }
    }

    const vouchers = await AccountingVoucher.find(query).sort({ voucher_date: 1, created_at: 1 });

    // Build statement lines with running balance
    let runningBalance = head.opening_balance.amount || 0;
    let runningType = head.opening_balance.type || 'Dr';

    const transactions = [];

    for (const v of vouchers) {
      // Find the specific entry for this head
      const currentEntry = v.entries.find(e => String(e.head_id) === String(head._id));
      if (!currentEntry) continue;

      // Find contra/opposite entry heads for clear accounting display
      const oppositeEntries = v.entries.filter(e => String(e.head_id) !== String(head._id));
      const particulars = oppositeEntries.map(o => `${o.entry_type === 'Credit' ? 'To' : 'By'} ${o.head_name}`).join(', ') || v.narration;

      // Calculate new running balance
      const isDebit = currentEntry.entry_type === 'Debit';
      const amount = currentEntry.amount;

      if (['Asset', 'Expense'].includes(head.ledger_type)) {
        // Normal balance is Debit (+)
        let net = (runningType === 'Dr' ? runningBalance : -runningBalance) + (isDebit ? amount : -amount);
        runningBalance = Math.abs(net);
        runningType = net >= 0 ? 'Dr' : 'Cr';
      } else {
        // Normal balance is Credit (+)
        let net = (runningType === 'Cr' ? runningBalance : -runningBalance) + (isDebit ? -amount : amount);
        runningBalance = Math.abs(net);
        runningType = net >= 0 ? 'Cr' : 'Dr';
      }

      transactions.push({
        voucher_id: v._id,
        voucher_number: v.voucher_number,
        voucher_type: v.voucher_type,
        voucher_date: v.voucher_date,
        particulars,
        narration: v.narration,
        debit: isDebit ? amount : 0,
        credit: !isDebit ? amount : 0,
        running_balance: runningBalance,
        balance_type: runningType,
        order_number: v.order_number,
        invoice_number: v.invoice_number,
        supplier_name: v.supplier_name,
        warehouse_name: v.warehouse_name
      });
    }

    return res.status(200).json({
      status: 'success',
      head,
      opening_balance: head.opening_balance,
      closing_balance: { amount: runningBalance, type: runningType },
      transactions
    });
  } catch (error) {
    console.error('get_ledger_statement error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 11. BANK & CASH BOOK
 * GET /accounts/accounting/bank-cash-book
 */
exports.get_bank_cash_book = async (req, res) => {
  try {
    const { mode, from_date, to_date } = req.query; // 'Bank' or 'Cash' or 'All'

    // Find Bank and Cash heads
    const cashBankHeads = await AccountingHead.find({
      $or: [
        { parent_group: { $in: ['Bank Accounts', 'Cash Accounts'] } },
        { name: { $regex: 'Bank|Cash', $options: 'i' } }
      ]
    });
    const headIds = cashBankHeads.map(h => h._id);

    const filter = {
      'entries.head_id': { $in: headIds },
      status: 'Posted'
    };

    if (from_date || to_date) {
      filter.voucher_date = {};
      if (from_date) filter.voucher_date.$gte = new Date(from_date);
      if (to_date) {
        const end = new Date(to_date);
        end.setHours(23, 59, 59, 999);
        filter.voucher_date.$lte = end;
      }
    }

    const vouchers = await AccountingVoucher.find(filter).sort({ voucher_date: -1 });

    const totalInflow = vouchers.reduce((acc, v) => v.voucher_type === 'Receipt' ? acc + v.total_amount : acc, 0);
    const totalOutflow = vouchers.reduce((acc, v) => v.voucher_type === 'Payment' ? acc + v.total_amount : acc, 0);

    return res.status(200).json({
      status: 'success',
      cash_bank_heads: cashBankHeads,
      total_inflow: totalInflow,
      total_outflow: totalOutflow,
      net_liquidity: totalInflow - totalOutflow,
      entries: vouchers
    });
  } catch (error) {
    console.error('get_bank_cash_book error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 12. TRIAL BALANCE
 * GET /accounts/accounting/trial-balance
 */
exports.get_trial_balance = async (req, res) => {
  try {
    const heads = await AccountingHead.find({ is_active: true }).sort({ category: 1, head_code: 1 });

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = heads.map(h => {
      const opDr = h.opening_balance.type === 'Dr' ? (h.opening_balance.amount || 0) : 0;
      const opCr = h.opening_balance.type === 'Cr' ? (h.opening_balance.amount || 0) : 0;
      const totalDr = opDr + (h.total_debits || 0);
      const totalCr = opCr + (h.total_credits || 0);

      let netDr = 0;
      let netCr = 0;

      if (['Asset', 'Expense'].includes(h.ledger_type)) {
        if (totalDr >= totalCr) {
          netDr = totalDr - totalCr;
        } else {
          netCr = totalCr - totalDr;
        }
      } else {
        if (totalCr >= totalDr) {
          netCr = totalCr - totalDr;
        } else {
          netDr = totalDr - totalCr;
        }
      }

      totalDebit += netDr;
      totalCredit += netCr;

      return {
        _id: h._id,
        head_code: h.head_code,
        name: h.name,
        category: h.category,
        ledger_type: h.ledger_type,
        parent_group: h.parent_group,
        total_dr: Math.round(totalDr * 100) / 100,
        total_cr: Math.round(totalCr * 100) / 100,
        net_debit: Math.round(netDr * 100) / 100,
        net_credit: Math.round(netCr * 100) / 100
      };
    });

    const isBalanced = Math.abs(Math.round(totalDebit * 100) - Math.round(totalCredit * 100)) <= 1;

    return res.status(200).json({
      status: 'success',
      total_debit: Math.round(totalDebit * 100) / 100,
      total_credit: Math.round(totalCredit * 100) / 100,
      difference: Math.abs(totalDebit - totalCredit),
      is_balanced: isBalanced,
      rows
    });
  } catch (error) {
    console.error('get_trial_balance error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 13. PROFIT & LOSS STATEMENT
 * GET /accounts/accounting/profit-loss
 */
exports.get_profit_and_loss = async (req, res) => {
  try {
    const heads = await AccountingHead.find({
      is_active: true,
      ledger_type: { $in: ['Income', 'Expense'] }
    });

    const incomeHeads = heads.filter(h => h.ledger_type === 'Income');
    const expenseHeads = heads.filter(h => h.ledger_type === 'Expense');

    // Categorized breakdown
    const salesRevenue = incomeHeads.filter(h => h.category === 'Sales Revenue');
    const otherIncome = incomeHeads.filter(h => h.category === 'Other Income');

    const purchaseAccounts = expenseHeads.filter(h => h.category === 'Purchase Accounts');
    const directExpenses = expenseHeads.filter(h => h.category === 'Direct Expenses');
    const indirectExpenses = expenseHeads.filter(h => h.category === 'Indirect Expenses');
    const employeeExpenses = expenseHeads.filter(h => h.category === 'Employee Expenses');
    const warehouseExpenses = expenseHeads.filter(h => h.category === 'Warehouse Expenses');
    const financialExpenses = expenseHeads.filter(h => h.category === 'Financial Expenses');

    const sumHead = (list) => list.reduce((sum, h) => sum + (h.current_balance?.amount || 0), 0);

    const totalSales = sumHead(salesRevenue);
    const totalOtherIncome = sumHead(otherIncome);
    const totalRevenue = totalSales + totalOtherIncome;

    const totalPurchases = sumHead(purchaseAccounts);
    const totalDirectExpenses = sumHead(directExpenses);
    const totalCogs = totalPurchases + totalDirectExpenses;

    const grossProfit = totalRevenue - totalCogs;

    const totalIndirect = sumHead(indirectExpenses);
    const totalEmployee = sumHead(employeeExpenses);
    const totalWarehouse = sumHead(warehouseExpenses);
    const totalFinancial = sumHead(financialExpenses);
    const totalOperatingExpenses = totalIndirect + totalEmployee + totalWarehouse + totalFinancial;

    const netProfit = grossProfit - totalOperatingExpenses;

    return res.status(200).json({
      status: 'success',
      total_revenue: totalRevenue,
      gross_profit: grossProfit,
      operating_expenses: totalOperatingExpenses,
      net_profit: netProfit,
      breakdown: {
        sales_revenue: { total: totalSales, items: salesRevenue },
        other_income: { total: totalOtherIncome, items: otherIncome },
        purchases: { total: totalPurchases, items: purchaseAccounts },
        direct_expenses: { total: totalDirectExpenses, items: directExpenses },
        indirect_expenses: { total: totalIndirect, items: indirectExpenses },
        employee_expenses: { total: totalEmployee, items: employeeExpenses },
        warehouse_expenses: { total: totalWarehouse, items: warehouseExpenses },
        financial_expenses: { total: totalFinancial, items: financialExpenses }
      }
    });
  } catch (error) {
    console.error('get_profit_and_loss error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 14. BALANCE SHEET
 * GET /accounts/accounting/balance-sheet
 */
exports.get_balance_sheet = async (req, res) => {
  try {
    const heads = await AccountingHead.find({
      is_active: true,
      ledger_type: { $in: ['Asset', 'Liability', 'Equity'] }
    });

    // Also get Net Profit from Income vs Expense
    const pnlRes = await AccountingHead.find({
      is_active: true,
      ledger_type: { $in: ['Income', 'Expense'] }
    });
    const totIncome = pnlRes.filter(h => h.ledger_type === 'Income').reduce((s, h) => s + (h.current_balance?.amount || 0), 0);
    const totExpense = pnlRes.filter(h => h.ledger_type === 'Expense').reduce((s, h) => s + (h.current_balance?.amount || 0), 0);
    const netRetainedEarnings = totIncome - totExpense;

    const assetHeads = heads.filter(h => h.ledger_type === 'Asset');
    const liabilityHeads = heads.filter(h => h.ledger_type === 'Liability');
    const equityHeads = heads.filter(h => h.ledger_type === 'Equity');

    const totalAssets = assetHeads.reduce((s, h) => s + (h.current_balance?.amount || 0), 0);
    const totalLiabilities = liabilityHeads.reduce((s, h) => s + (h.current_balance?.amount || 0), 0);
    const totalEquity = equityHeads.reduce((s, h) => s + (h.current_balance?.amount || 0), 0) + netRetainedEarnings;

    const totalLiabAndEquity = totalLiabilities + totalEquity;

    return res.status(200).json({
      status: 'success',
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      total_liabilities_and_equity: totalLiabAndEquity,
      is_balanced: Math.abs(totalAssets - totalLiabAndEquity) <= 1,
      breakdown: {
        assets: assetHeads,
        liabilities: liabilityHeads,
        equity: equityHeads,
        retained_earnings: netRetainedEarnings
      }
    });
  } catch (error) {
    console.error('get_balance_sheet error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 15. CASH FLOW STATEMENT
 * GET /accounts/accounting/cash-flow
 */
exports.get_cash_flow = async (req, res) => {
  try {
    const vouchers = await AccountingVoucher.find({ status: 'Posted' }).sort({ voucher_date: -1 });

    let operatingCashInflow = 0;
    let operatingCashOutflow = 0;
    let financingCashInflow = 0;
    let financingCashOutflow = 0;

    for (const v of vouchers) {
      if (['Receipt', 'Sales'].includes(v.voucher_type)) {
        operatingCashInflow += v.total_amount;
      } else if (['Payment', 'Purchase'].includes(v.voucher_type)) {
        operatingCashOutflow += v.total_amount;
      }
    }

    const netOperating = operatingCashInflow - operatingCashOutflow;
    const netCashFlow = netOperating;

    return res.status(200).json({
      status: 'success',
      operating_activities: {
        inflow: operatingCashInflow,
        outflow: operatingCashOutflow,
        net: netOperating
      },
      investing_activities: {
        inflow: 0,
        outflow: 0,
        net: 0
      },
      financing_activities: {
        inflow: financingCashInflow,
        outflow: financingCashOutflow,
        net: financingCashInflow - financingCashOutflow
      },
      net_cash_flow: netCashFlow
    });
  } catch (error) {
    console.error('get_cash_flow error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
