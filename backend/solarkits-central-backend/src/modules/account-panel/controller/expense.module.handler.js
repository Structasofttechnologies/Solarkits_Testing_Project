const { ExpenseEntry } = require('../models/india_solarshop_db/expense_management.schema');
const { AccountingHead } = require('../models/india_solarshop_db/accounting_head.schema');
const { AccountingVoucher } = require('../models/india_solarshop_db/accounting_voucher.schema');

// 1. Get Expenses with Filtering
exports.get_expenses = async (req, res) => {
  try {
    const { status, category, warehouse_name, state, search } = req.query;
    const filter = {};

    if (status && status !== 'ALL') filter.status = status;
    if (category && category !== 'ALL') filter.category = category;
    if (warehouse_name && warehouse_name !== 'ALL') filter.warehouse_name = warehouse_name;
    if (state && state !== 'ALL') filter.state = state;
    if (search) {
      filter.$or = [
        { expense_number: { $regex: search, $options: 'i' } },
        { vendor_name: { $regex: search, $options: 'i' } },
        { accounting_head_name: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await ExpenseEntry.find(filter).sort({ expense_date: -1, createdAt: -1 }).lean();
    return res.status(200).json({ status: 'success', data: expenses });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Create New Expense Entry
exports.create_expense = async (req, res) => {
  try {
    const {
      accounting_head_id,
      category,
      expense_date,
      amount,
      is_gst_applicable = false,
      vendor_gstin,
      gst_rate = 0,
      cgst_amount = 0,
      sgst_amount = 0,
      igst_amount = 0,
      itc_eligible = false,
      is_tds_applicable = false,
      tds_section,
      tds_rate = 0,
      tds_deducted = 0,
      vendor_name,
      payment_mode = 'BANK_TRANSFER',
      state,
      district,
      cluster_name,
      warehouse_name,
      department = 'Operations',
      invoice_attachments = [],
      remarks
    } = req.body;

    const head = await AccountingHead.findById(accounting_head_id);
    if (!head) {
      return res.status(400).json({ status: 'error', message: 'Valid Accounting Head is required.' });
    }

    const baseAmount = Number(amount) || 0;
    const taxTotal = Number(cgst_amount) + Number(sgst_amount) + Number(igst_amount);
    const totalWithTax = baseAmount + taxTotal;
    const tdsAmount = Number(tds_deducted) || 0;
    const netPayable = totalWithTax - tdsAmount;

    const count = await ExpenseEntry.countDocuments();
    const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const newExpense = await ExpenseEntry.create({
      expense_number: expenseNumber,
      accounting_head_id: head._id,
      accounting_head_name: head.head_name,
      category: category || head.category,
      expense_date: expense_date ? new Date(expense_date) : new Date(),
      amount: baseAmount,
      is_gst_applicable,
      vendor_gstin,
      gst_rate: Number(gst_rate),
      cgst_amount: Number(cgst_amount),
      sgst_amount: Number(sgst_amount),
      igst_amount: Number(igst_amount),
      itc_eligible,
      total_with_tax: totalWithTax,
      is_tds_applicable,
      tds_section,
      tds_rate: Number(tds_rate),
      tds_deducted: tdsAmount,
      net_payable_amount: netPayable,
      vendor_name,
      payment_mode,
      state,
      district,
      cluster_name,
      warehouse_name,
      department,
      status: 'SUBMITTED',
      submitted_by: req.user?.email || 'Account Manager',
      invoice_attachments,
      remarks
    });

    return res.status(201).json({
      status: 'success',
      message: `Expense #${expenseNumber} created and submitted for approval!`,
      data: newExpense
    });
  } catch (error) {
    console.error('create_expense error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Approve Expense & Auto-Post to Ledger (Double-Entry Voucher)
exports.approve_expense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseEntry.findById(id);
    if (!expense) {
      return res.status(404).json({ status: 'error', message: 'Expense entry not found.' });
    }

    if (expense.status === 'APPROVED' || expense.status === 'POSTED_TO_LEDGER') {
      return res.status(400).json({ status: 'error', message: 'Expense is already approved.' });
    }

    // Auto-create journal voucher in double-entry ledger
    const entries = [];
    // Debit Expense Head
    entries.push({
      head_id: expense.accounting_head_id,
      head_name: expense.accounting_head_name,
      type: 'DEBIT',
      debit_amount: expense.amount,
      credit_amount: 0,
      narration: `Expense: ${expense.expense_number} - ${expense.remarks || expense.category}`
    });

    // Debit Input GST if applicable & ITC eligible
    if (expense.is_gst_applicable && expense.itc_eligible) {
      if (expense.cgst_amount > 0) {
        entries.push({
          head_name: 'Input CGST',
          type: 'DEBIT',
          debit_amount: expense.cgst_amount,
          credit_amount: 0,
          narration: `ITC CGST on expense ${expense.expense_number}`
        });
      }
      if (expense.sgst_amount > 0) {
        entries.push({
          head_name: 'Input SGST',
          type: 'DEBIT',
          debit_amount: expense.sgst_amount,
          credit_amount: 0,
          narration: `ITC SGST on expense ${expense.expense_number}`
        });
      }
      if (expense.igst_amount > 0) {
        entries.push({
          head_name: 'Input IGST',
          type: 'DEBIT',
          debit_amount: expense.igst_amount,
          credit_amount: 0,
          narration: `ITC IGST on expense ${expense.expense_number}`
        });
      }
    }

    // Credit TDS Payable if TDS deducted
    if (expense.is_tds_applicable && expense.tds_deducted > 0) {
      entries.push({
        head_name: `TDS Payable (${expense.tds_section || 'Statutory'})`,
        type: 'CREDIT',
        debit_amount: 0,
        credit_amount: expense.tds_deducted,
        narration: `TDS deducted at source on expense ${expense.expense_number}`
      });
    }

    // Credit Vendor Payable or Cash/Bank
    const creditHead = expense.payment_mode === 'PETTY_CASH' ? 'Cash in Hand' : 'HDFC Bank Operating A/c';
    entries.push({
      head_name: creditHead,
      type: 'CREDIT',
      debit_amount: 0,
      credit_amount: expense.net_payable_amount,
      narration: `Payment/Payable to ${expense.vendor_name} via ${expense.payment_mode}`
    });

    const voucherNumber = `VCH-EXP-${Date.now().toString().slice(-6)}`;
    const voucher = await AccountingVoucher.create({
      voucher_number: voucherNumber,
      voucher_type: expense.payment_mode === 'PETTY_CASH' ? 'PAYMENT' : 'JOURNAL',
      voucher_date: expense.expense_date,
      financial_year: '2026-2027',
      reference_number: expense.expense_number,
      entity_type: 'VENDOR',
      entity_name: expense.vendor_name,
      narration: `Approved expense entry ${expense.expense_number} - ${expense.accounting_head_name}`,
      entries,
      total_amount: expense.total_with_tax,
      status: 'POSTED',
      created_by: req.user?.email || 'Account Manager',
      approved_by: req.user?.email || 'Finance Head'
    });

    expense.status = 'APPROVED';
    expense.approved_by = req.user?.email || 'Finance Head';
    expense.approval_date = new Date();
    expense.ledger_voucher_id = voucher._id;
    await expense.save();

    return res.status(200).json({
      status: 'success',
      message: `Expense #${expense.expense_number} approved and posted to General Ledger (Voucher #${voucherNumber})!`,
      data: { expense, voucher }
    });
  } catch (error) {
    console.error('approve_expense error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Reject Expense
exports.reject_expense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const expense = await ExpenseEntry.findById(id);
    if (!expense) return res.status(404).json({ status: 'error', message: 'Expense not found.' });

    expense.status = 'REJECTED';
    expense.rejection_reason = reason || 'Rejected by Finance Head';
    await expense.save();

    return res.status(200).json({ status: 'success', message: 'Expense entry marked as rejected.', data: expense });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 5. Mark Expense as Paid
exports.pay_expense = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_reference, payment_date } = req.body;
    const expense = await ExpenseEntry.findById(id);
    if (!expense) return res.status(404).json({ status: 'error', message: 'Expense not found.' });

    expense.status = 'PAID';
    expense.payment_reference = payment_reference || `TXN-${Date.now().toString().slice(-8)}`;
    expense.payment_date = payment_date ? new Date(payment_date) : new Date();
    await expense.save();

    return res.status(200).json({ status: 'success', message: 'Expense marked as PAID.', data: expense });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. Expense Reports & Multi-dimensional Analytics
exports.get_expense_reports = async (req, res) => {
  try {
    const expenses = await ExpenseEntry.find().lean();

    const categoryBreakdown = {};
    const warehouseBreakdown = {};
    const stateBreakdown = {};
    let totalExpense = 0;
    let totalTax = 0;
    let totalTds = 0;

    expenses.forEach(e => {
      totalExpense += e.amount || 0;
      totalTax += (e.cgst_amount || 0) + (e.sgst_amount || 0) + (e.igst_amount || 0);
      totalTds += e.tds_deducted || 0;

      // Category
      const cat = e.category || 'Other Expenses';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (e.amount || 0);

      // Warehouse
      const wh = e.warehouse_name || 'Central Corporate';
      warehouseBreakdown[wh] = (warehouseBreakdown[wh] || 0) + (e.amount || 0);

      // State
      const st = e.state || 'All India';
      stateBreakdown[st] = (stateBreakdown[st] || 0) + (e.amount || 0);
    });

    return res.status(200).json({
      status: 'success',
      data: {
        total_expenses: Math.round(totalExpense),
        total_gst_paid: Math.round(totalTax),
        total_tds_deducted: Math.round(totalTds),
        category_breakdown: Object.entries(categoryBreakdown).map(([category, amount]) => ({ category, amount: Math.round(amount) })),
        warehouse_breakdown: Object.entries(warehouseBreakdown).map(([warehouse, amount]) => ({ warehouse, amount: Math.round(amount) })),
        state_breakdown: Object.entries(stateBreakdown).map(([state, amount]) => ({ state, amount: Math.round(amount) })),
        budget_vs_actual: [
          { department: 'Logistics & Warehousing', budget: 1500000, actual: 1240000, variance: 260000, status: 'Under Budget' },
          { department: 'Sales & BDE Commissions', budget: 800000, actual: 720000, variance: 80000, status: 'Under Budget' },
          { department: 'Office & Administration', budget: 500000, actual: 480000, variance: 20000, status: 'On Track' },
          { department: 'Marketing & Promotions', budget: 600000, actual: 650000, variance: -50000, status: 'Over Budget' }
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
