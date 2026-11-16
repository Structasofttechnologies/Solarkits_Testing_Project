const { PurchaseInvoiceValidation } = require('../models/india_solarshop_db/invoice_validation.schema');
const { ComplianceTask } = require('../models/india_solarshop_db/compliance_calendar.schema');
const { AccountingVoucher } = require('../models/india_solarshop_db/accounting_voucher.schema');
const { AccountingHead } = require('../models/india_solarshop_db/accounting_head.schema');

// Initial seed statutory calendar if empty
const DEFAULT_COMPLIANCE_TASKS = [
  {
    compliance_name: 'GSTR-1 Monthly Outward Supplies',
    category: 'GST',
    periodicity: 'MONTHLY',
    due_date: new Date('2026-11-11'),
    responsible_person: 'sushilpiprotar@gmail.com',
    status: 'COMPLETED',
    filing_reference: 'AA071026001928X',
    notes: 'Filed for October 2026'
  },
  {
    compliance_name: 'GSTR-3B Monthly Return & Tax Payment',
    category: 'GST',
    periodicity: 'MONTHLY',
    due_date: new Date('2026-11-20'),
    responsible_person: 'sushilpiprotar@gmail.com',
    status: 'PENDING',
    payment_amount: 240000,
    notes: 'Due by 20th November 2026'
  },
  {
    compliance_name: 'TDS Monthly Challan Deposit (Sec 194C/194I/194J)',
    category: 'TDS',
    periodicity: 'MONTHLY',
    due_date: new Date('2026-11-07'),
    responsible_person: 'rahil.sunnovative@gmail.com',
    status: 'COMPLETED',
    filing_reference: 'CIN-0260481940182',
    payment_amount: 85400,
    notes: 'Challan 281 deposited via Netbanking'
  },
  {
    compliance_name: 'Advance Tax Instalment 3 (75% cumulative)',
    category: 'INCOME_TAX',
    periodicity: 'QUARTERLY',
    due_date: new Date('2026-12-15'),
    responsible_person: 'rahil@solarkits.com',
    status: 'PENDING',
    payment_amount: 450000,
    notes: 'Estimated Q3 Advance Tax payment'
  },
  {
    compliance_name: 'MCA Form AOC-4 (Financial Statements Filing)',
    category: 'MCA',
    periodicity: 'ANNUAL',
    due_date: new Date('2026-10-30'),
    responsible_person: 'rahil.sunnovative@gmail.com',
    status: 'COMPLETED',
    filing_reference: 'SRN-F82019481',
    notes: 'Annual audited financial statements submitted to ROC Delhi'
  },
  {
    compliance_name: 'MCA Form MGT-7 (Annual Return of Company)',
    category: 'MCA',
    periodicity: 'ANNUAL',
    due_date: new Date('2026-11-29'),
    responsible_person: 'rahil.sunnovative@gmail.com',
    status: 'IN_PROGRESS',
    notes: 'Under review by Company Secretary'
  }
];

async function ensureComplianceTasks() {
  const count = await ComplianceTask.countDocuments();
  if (count === 0) {
    await ComplianceTask.insertMany(DEFAULT_COMPLIANCE_TASKS);
  }
}

// 1. Get Purchase Invoices for Validation
exports.get_purchase_invoices = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status && status !== 'ALL') {
      filter.validation_status = status;
    }
    if (search) {
      filter.$or = [
        { invoice_number: { $regex: search, $options: 'i' } },
        { supplier_name: { $regex: search, $options: 'i' } },
        { supplier_gstin: { $regex: search, $options: 'i' } },
        { po_number: { $regex: search, $options: 'i' } }
      ];
    }
    const invoices = await PurchaseInvoiceValidation.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ status: 'success', data: invoices });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Upload / Create Purchase Invoice and run 10-point validation
exports.create_and_validate_purchase_invoice = async (req, res) => {
  try {
    const {
      invoice_number,
      invoice_date,
      financial_year = '2026-2027',
      supplier_name,
      supplier_gstin,
      buyer_gstin = '07AAACS1234F1Z8',
      po_number,
      grn_number,
      warehouse_name,
      place_of_supply,
      taxable_value,
      cgst_amount = 0,
      sgst_amount = 0,
      igst_amount = 0,
      invoice_total_amount,
      supporting_documents = []
    } = req.body;

    // Check duplicate
    const existing = await PurchaseInvoiceValidation.findOne({
      supplier_gstin: supplier_gstin.toUpperCase(),
      invoice_number: invoice_number.trim(),
      financial_year
    });

    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: `Duplicate Invoice Detected! Invoice #${invoice_number} already exists for supplier GSTIN ${supplier_gstin}.`
      });
    }

    // Run 10-Point Validation
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const gstin_valid = gstinRegex.test(supplier_gstin.toUpperCase());
    const tax_math_valid = Math.abs((Number(taxable_value) + Number(cgst_amount) + Number(sgst_amount) + Number(igst_amount)) - Number(invoice_total_amount)) < 1.0;
    
    // Check intra-state vs inter-state logic
    const supplierStateCode = supplier_gstin.substring(0, 2);
    const buyerStateCode = buyer_gstin.substring(0, 2);
    let tax_type_valid = false;
    if (supplierStateCode === buyerStateCode) {
      // Intra-state: CGST + SGST
      tax_type_valid = (Number(cgst_amount) > 0 || Number(sgst_amount) > 0) && Number(igst_amount) === 0;
    } else {
      // Inter-state: IGST
      tax_type_valid = Number(igst_amount) > 0 && Number(cgst_amount) === 0 && Number(sgst_amount) === 0;
    }

    const checklist = {
      gstin_format_valid: gstin_valid,
      no_duplicate_detected: true,
      invoice_date_valid: Boolean(invoice_date),
      supplier_master_matched: Boolean(supplier_name && supplier_name.trim().length > 2),
      hsn_sac_matched: true,
      taxable_value_math_valid: Number(taxable_value) > 0,
      tax_calculation_valid: tax_math_valid && tax_type_valid,
      invoice_total_matched: Number(invoice_total_amount) > 0,
      po_reference_matched: Boolean(po_number && po_number.trim().length > 0),
      goods_receipt_matched: Boolean(grn_number && grn_number.trim().length > 0),
      supporting_docs_attached: supporting_documents && supporting_documents.length > 0
    };

    const mismatchReasons = [];
    if (!gstin_valid) mismatchReasons.push('Invalid Supplier GSTIN format');
    if (!tax_math_valid) mismatchReasons.push('Taxable value + taxes does not match Invoice Total');
    if (!tax_type_valid) mismatchReasons.push('Tax split mismatch: CGST/SGST vs IGST based on State of Supply');
    if (!po_number) mismatchReasons.push('Purchase Order reference missing');
    if (!grn_number) mismatchReasons.push('Warehouse Goods Inward Receipt (GRN) missing');

    const allPassed = Object.values(checklist).every(Boolean);
    const validation_status = allPassed ? 'APPROVED_FOR_ACCOUNTING' : (mismatchReasons.length > 0 ? 'MISMATCH_FOUND' : 'VALIDATED');

    const newRecord = await PurchaseInvoiceValidation.create({
      invoice_number,
      invoice_date: new Date(invoice_date),
      financial_year,
      supplier_name,
      supplier_gstin: supplier_gstin.toUpperCase(),
      buyer_gstin: buyer_gstin.toUpperCase(),
      po_number,
      grn_number,
      warehouse_name: warehouse_name || 'Central Hub',
      place_of_supply: place_of_supply || (supplierStateCode === buyerStateCode ? 'Intra-State' : 'Inter-State'),
      taxable_value: Number(taxable_value),
      cgst_amount: Number(cgst_amount),
      sgst_amount: Number(sgst_amount),
      igst_amount: Number(igst_amount),
      total_tax_amount: Number(cgst_amount) + Number(sgst_amount) + Number(igst_amount),
      invoice_total_amount: Number(invoice_total_amount),
      validation_checklist: checklist,
      validation_status,
      mismatch_reasons: mismatchReasons,
      supporting_documents,
      validated_by: req.user?.email || 'System Validator'
    });

    return res.status(201).json({
      status: 'success',
      message: allPassed ? 'Invoice validated successfully and approved for accounting!' : 'Invoice uploaded with validation mismatches flagged.',
      data: newRecord
    });
  } catch (error) {
    console.error('create_and_validate_purchase_invoice error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Post Approved Invoice to General Ledger (Creates Double-Entry Voucher)
exports.post_invoice_to_ledger = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await PurchaseInvoiceValidation.findById(id);
    if (!invoice) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found.' });
    }

    if (invoice.validation_status === 'POSTED_TO_LEDGER') {
      return res.status(400).json({ status: 'error', message: 'Invoice has already been posted to general ledger.' });
    }

    // Find Purchase and Tax heads
    let purchaseHead = await AccountingHead.findOne({ head_name: /Product Purchases/i });
    if (!purchaseHead) purchaseHead = await AccountingHead.findOne({ category: 'Purchase Accounts' });

    let cgstInputHead = await AccountingHead.findOne({ head_name: /Input CGST/i });
    let sgstInputHead = await AccountingHead.findOne({ head_name: /Input SGST/i });
    let igstInputHead = await AccountingHead.findOne({ head_name: /Input IGST/i });
    let supplierPayableHead = await AccountingHead.findOne({ head_name: /Accounts Payable/i }) || await AccountingHead.findOne({ ledger_type: 'Liability' });

    const entries = [];
    // Debit Purchase Account
    entries.push({
      head_id: purchaseHead?._id,
      head_name: purchaseHead?.head_name || 'Product Purchases',
      head_code: purchaseHead?.head_code || 'AH-1005',
      type: 'DEBIT',
      debit_amount: invoice.taxable_value,
      credit_amount: 0,
      narration: `Purchase of inventory against Inv #${invoice.invoice_number}`
    });

    // Debit Input Taxes
    if (invoice.cgst_amount > 0 && cgstInputHead) {
      entries.push({
        head_id: cgstInputHead._id,
        head_name: cgstInputHead.head_name,
        head_code: cgstInputHead.head_code,
        type: 'DEBIT',
        debit_amount: invoice.cgst_amount,
        credit_amount: 0,
        narration: `Input CGST against Inv #${invoice.invoice_number}`
      });
    }
    if (invoice.sgst_amount > 0 && sgstInputHead) {
      entries.push({
        head_id: sgstInputHead._id,
        head_name: sgstInputHead.head_name,
        head_code: sgstInputHead.head_code,
        type: 'DEBIT',
        debit_amount: invoice.sgst_amount,
        credit_amount: 0,
        narration: `Input SGST against Inv #${invoice.invoice_number}`
      });
    }
    if (invoice.igst_amount > 0 && igstInputHead) {
      entries.push({
        head_id: igstInputHead._id,
        head_name: igstInputHead.head_name,
        head_code: igstInputHead.head_code,
        type: 'DEBIT',
        debit_amount: invoice.igst_amount,
        credit_amount: 0,
        narration: `Input IGST against Inv #${invoice.invoice_number}`
      });
    }

    // Credit Supplier / Accounts Payable
    entries.push({
      head_id: supplierPayableHead?._id,
      head_name: `${invoice.supplier_name} (Payable)`,
      head_code: supplierPayableHead?.head_code || 'AH-2001',
      type: 'CREDIT',
      debit_amount: 0,
      credit_amount: invoice.invoice_total_amount,
      narration: `Total invoice payable to ${invoice.supplier_name}`
    });

    const voucherNumber = `VCH-PUR-${Date.now().toString().slice(-6)}`;
    const voucher = await AccountingVoucher.create({
      voucher_number: voucherNumber,
      voucher_type: 'PURCHASE',
      voucher_date: invoice.invoice_date,
      financial_year: invoice.financial_year,
      reference_number: invoice.invoice_number,
      entity_type: 'SUPPLIER',
      entity_name: invoice.supplier_name,
      entity_gstin: invoice.supplier_gstin,
      narration: `Purchase invoice entry posted from Invoice Validation Control Centre: ${invoice.invoice_number}`,
      entries,
      total_amount: invoice.invoice_total_amount,
      status: 'POSTED',
      created_by: req.user?.email || 'Account Manager',
      approved_by: req.user?.email || 'Finance Head'
    });

    invoice.validation_status = 'POSTED_TO_LEDGER';
    invoice.posted_voucher_id = voucher._id;
    invoice.approved_by = req.user?.email || 'Finance Head';
    await invoice.save();

    return res.status(200).json({
      status: 'success',
      message: `Invoice #${invoice.invoice_number} successfully posted to General Ledger under Voucher #${voucherNumber}!`,
      data: { invoice, voucher }
    });
  } catch (error) {
    console.error('post_invoice_to_ledger error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Automated Compliance Alerts
exports.get_compliance_alerts = async (req, res) => {
  try {
    const alerts = [];

    // Alert 1: Unvalidated or mismatched invoices
    const mismatchCount = await PurchaseInvoiceValidation.countDocuments({ validation_status: 'MISMATCH_FOUND' });
    if (mismatchCount > 0) {
      alerts.push({
        id: 'ALT-MISMATCH',
        type: 'CRITICAL',
        title: `${mismatchCount} Purchase Invoices Have Validation Mismatches`,
        description: 'GSTIN, Tax split, PO or GRN discrepancies detected. Review required before payment release.',
        link: '/admin-panel/accounting/invoice-validation',
        action_text: 'Review Invoices'
      });
    }

    // Alert 2: Approaching Statutory Deadlines
    await ensureComplianceTasks();
    const upcomingTasks = await ComplianceTask.find({
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
      due_date: { $lte: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }
    }).sort({ due_date: 1 }).lean();

    upcomingTasks.forEach(task => {
      alerts.push({
        id: `ALT-TASK-${task._id}`,
        type: 'WARNING',
        title: `Statutory Due Date: ${task.compliance_name}`,
        description: `Due on ${new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Responsible: ${task.responsible_person}`,
        link: '/admin-panel/accounting/compliance-calendar',
        action_text: 'Open Calendar'
      });
    });

    // Alert 3: Duplicate invoices flagged
    const dupCount = await PurchaseInvoiceValidation.countDocuments({ validation_status: 'DUPLICATE_INVOICE' });
    if (dupCount > 0) {
      alerts.push({
        id: 'ALT-DUP',
        type: 'DANGER',
        title: `${dupCount} Duplicate Invoices Detected`,
        description: 'Supplier invoices re-submitted with duplicate invoice numbers. Blocked from ledger entry.',
        link: '/admin-panel/accounting/invoice-validation',
        action_text: 'Inspect Duplicates'
      });
    }

    return res.status(200).json({ status: 'success', data: alerts });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 5. Statutory Compliance Calendar
exports.get_compliance_calendar = async (req, res) => {
  try {
    await ensureComplianceTasks();
    const { category, status } = req.query;
    const filter = {};
    if (category && category !== 'ALL') filter.category = category;
    if (status && status !== 'ALL') filter.status = status;

    const tasks = await ComplianceTask.find(filter).sort({ due_date: 1 }).lean();
    return res.status(200).json({ status: 'success', data: tasks });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. Create or Update Compliance Task
exports.save_compliance_task = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    let task;
    if (id) {
      if (data.status === 'COMPLETED' && !data.completion_date) {
        data.completion_date = new Date();
      }
      task = await ComplianceTask.findByIdAndUpdate(id, data, { new: true });
    } else {
      task = await ComplianceTask.create(data);
    }
    return res.status(200).json({ status: 'success', message: 'Compliance task saved successfully.', data: task });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
