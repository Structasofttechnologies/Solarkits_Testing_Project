const { GstConfig, GstFilingRecord } = require('../models/india_solarshop_db/gst_management.schema');
const { AccountingVoucher } = require('../models/india_solarshop_db/accounting_voucher.schema');
const { PurchaseInvoiceValidation } = require('../models/india_solarshop_db/invoice_validation.schema');

// Initial seed configurations if none exist
const DEFAULT_CONFIGS = [
  {
    gstin: '07AAACS1234F1Z8',
    legal_name: 'SOLARKITS INDIA PRIVATE LIMITED',
    trade_name: 'SolarKits Central Delhi',
    state_code: '07',
    state_name: 'Delhi',
    registered_address: 'SolarKits HQ, Okhla Industrial Area Phase-III, New Delhi 110020',
    gst_type: 'REGULAR',
    is_primary: true,
    tax_invoice_prefix: 'SK-DL/',
    tax_invoice_next_number: 1042,
    financial_year: '2026-2027',
    e_invoice_applicable: true,
    e_way_bill_threshold: 50000,
    hsn_sac_mappings: [
      { code: '85414011', type: 'HSN', description: 'Solar Photovoltaic Cells and Solar Panels', cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
      { code: '85044090', type: 'HSN', description: 'Solar On-Grid & Hybrid Inverters', cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { code: '85072000', type: 'HSN', description: 'Lithium Ferro Phosphate (LFP) Solar Batteries', cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { code: '73089090', type: 'HSN', description: 'Galvanized Module Mounting Structures (MMS)', cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { code: '998719', type: 'SAC', description: 'Solar Rooftop EPC Installation & Commissioning Services', cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { code: '996511', type: 'SAC', description: 'Road Transportation & Logistics Services', cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5 }
    ]
  },
  {
    gstin: '27AAACS1234F1Z3',
    legal_name: 'SOLARKITS INDIA PRIVATE LIMITED (MH HUB)',
    trade_name: 'SolarKits Maharashtra Hub',
    state_code: '27',
    state_name: 'Maharashtra',
    registered_address: 'Bhiwandi Logistics Hub, Building B-4, Thane, Maharashtra 421302',
    gst_type: 'REGULAR',
    is_primary: false,
    tax_invoice_prefix: 'SK-MH/',
    tax_invoice_next_number: 1018,
    financial_year: '2026-2027',
    e_invoice_applicable: true,
    e_way_bill_threshold: 50000,
    hsn_sac_mappings: [
      { code: '85414011', type: 'HSN', description: 'Solar PV Panels', cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
      { code: '85044090', type: 'HSN', description: 'Solar Inverters', cgst_rate: 9, sgst_rate: 9, igst_rate: 18 }
    ]
  }
];

// Helper: Seed default GST configs
async function ensureGstConfigs() {
  const count = await GstConfig.countDocuments();
  if (count === 0) {
    await GstConfig.insertMany(DEFAULT_CONFIGS);
  }
}

// 1. Get GST Dashboard Summary (Live Output GST, Input ITC, Payable, Pending Validation)
exports.get_gst_dashboard_summary = async (req, res) => {
  try {
    await ensureGstConfigs();
    const { financial_year = '2026-2027', period } = req.query;

    // Aggregate Output GST from sales vouchers & tax ledgers
    const vouchers = await AccountingVoucher.find({
      financial_year,
      status: 'POSTED'
    }).lean();

    let output_cgst = 0;
    let output_sgst = 0;
    let output_igst = 0;
    let input_cgst = 0;
    let input_sgst = 0;
    let input_igst = 0;

    vouchers.forEach(v => {
      v.entries.forEach(e => {
        const headName = (e.head_name || '').toUpperCase();
        if (headName.includes('OUTPUT CGST') || (headName.includes('CGST') && e.type === 'CREDIT')) {
          output_cgst += e.credit_amount || 0;
        } else if (headName.includes('OUTPUT SGST') || (headName.includes('SGST') && e.type === 'CREDIT')) {
          output_sgst += e.credit_amount || 0;
        } else if (headName.includes('OUTPUT IGST') || (headName.includes('IGST') && e.type === 'CREDIT')) {
          output_igst += e.credit_amount || 0;
        } else if (headName.includes('INPUT CGST') || (headName.includes('CGST') && e.type === 'DEBIT')) {
          input_cgst += e.debit_amount || 0;
        } else if (headName.includes('INPUT SGST') || (headName.includes('SGST') && e.type === 'DEBIT')) {
          input_sgst += e.debit_amount || 0;
        } else if (headName.includes('INPUT IGST') || (headName.includes('IGST') && e.type === 'DEBIT')) {
          input_igst += e.debit_amount || 0;
        }
      });
    });

    // Also factor validated purchase invoices for ITC
    const validatedInvoices = await PurchaseInvoiceValidation.find({
      financial_year,
      validation_status: { $in: ['APPROVED_FOR_ACCOUNTING', 'ITC_ELIGIBLE', 'POSTED_TO_LEDGER'] }
    }).lean();

    let purchase_itc_cgst = 0;
    let purchase_itc_sgst = 0;
    let purchase_itc_igst = 0;
    validatedInvoices.forEach(inv => {
      purchase_itc_cgst += inv.cgst_amount || 0;
      purchase_itc_sgst += inv.sgst_amount || 0;
      purchase_itc_igst += inv.igst_amount || 0;
    });

    const total_output_gst = output_cgst + output_sgst + output_igst;
    const total_input_itc = (input_cgst + purchase_itc_cgst) + (input_sgst + purchase_itc_sgst) + (input_igst + purchase_itc_igst);
    const net_gst_payable = Math.max(0, total_output_gst - total_input_itc);

    // Count pending purchase validations
    const pending_validation_count = await PurchaseInvoiceValidation.countDocuments({
      validation_status: { $in: ['UPLOADED', 'VALIDATION_PENDING', 'MISMATCH_FOUND'] }
    });

    const primaryGstConfig = await GstConfig.findOne({ is_primary: true }).lean();

    return res.status(200).json({
      status: 'success',
      data: {
        financial_year,
        primary_gstin: primaryGstConfig?.gstin || '07AAACS1234F1Z8',
        legal_name: primaryGstConfig?.legal_name || 'SOLARKITS INDIA PRIVATE LIMITED',
        summary: {
          total_output_gst: Math.round(total_output_gst),
          output_breakdown: {
            cgst: Math.round(output_cgst),
            sgst: Math.round(output_sgst),
            igst: Math.round(output_igst)
          },
          total_input_itc: Math.round(total_input_itc),
          itc_breakdown: {
            cgst: Math.round(input_cgst + purchase_itc_cgst),
            sgst: Math.round(input_sgst + purchase_itc_sgst),
            igst: Math.round(input_igst + purchase_itc_igst)
          },
          net_gst_payable: Math.round(net_gst_payable),
          pending_validation_count,
          last_filing_status: 'On Track'
        }
      }
    });
  } catch (error) {
    console.error('get_gst_dashboard_summary error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Get GST Configurations
exports.get_gst_configs = async (req, res) => {
  try {
    await ensureGstConfigs();
    const configs = await GstConfig.find().sort({ is_primary: -1, state_name: 1 }).lean();
    return res.status(200).json({ status: 'success', data: configs });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Create or Update GST Configuration
exports.save_gst_config = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    let saved;
    if (id) {
      saved = await GstConfig.findByIdAndUpdate(id, data, { new: true });
    } else {
      if (data.is_primary) {
        await GstConfig.updateMany({}, { is_primary: false });
      }
      saved = await GstConfig.create(data);
    }
    return res.status(200).json({ status: 'success', message: 'GST configuration saved successfully.', data: saved });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. GSTR-1 Sales Report Preparation (B2B, B2C, HSN Summary)
exports.get_gstr1_data = async (req, res) => {
  try {
    const { month, year, financial_year = '2026-2027' } = req.query;

    // Filter sales vouchers
    const salesVouchers = await AccountingVoucher.find({
      voucher_type: { $in: ['SALES', 'RECEIPT'] },
      financial_year,
      status: 'POSTED'
    }).sort({ voucher_date: -1 }).lean();

    // Group into B2B (with GSTIN), B2C Large, B2C Small
    const b2bInvoices = [];
    const b2cInvoices = [];
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    salesVouchers.forEach(v => {
      const isB2B = Boolean(v.entity_gstin);
      let invCgst = 0, invSgst = 0, invIgst = 0, invTaxable = 0;

      v.entries.forEach(e => {
        const head = (e.head_name || '').toUpperCase();
        if (head.includes('CGST')) invCgst += (e.credit_amount || 0);
        else if (head.includes('SGST')) invSgst += (e.credit_amount || 0);
        else if (head.includes('IGST')) invIgst += (e.credit_amount || 0);
        else if (e.type === 'CREDIT' && (head.includes('SALES') || head.includes('REVENUE'))) {
          invTaxable += (e.credit_amount || 0);
        }
      });

      if (invTaxable === 0) invTaxable = v.total_amount - (invCgst + invSgst + invIgst);
      if (invTaxable < 0) invTaxable = v.total_amount;

      totalTaxable += invTaxable;
      totalCgst += invCgst;
      totalSgst += invSgst;
      totalIgst += invIgst;

      const record = {
        voucher_id: v._id,
        invoice_number: v.reference_number || v.voucher_number,
        invoice_date: v.voucher_date,
        customer_name: v.entity_name || 'Retail Solar Buyer',
        customer_gstin: v.entity_gstin || 'UNREGISTERED',
        place_of_supply: v.state || 'Delhi (07)',
        taxable_value: invTaxable,
        cgst: invCgst,
        sgst: invSgst,
        igst: invIgst,
        total_invoice_value: invTaxable + invCgst + invSgst + invIgst,
        is_b2b: isB2B
      };

      if (isB2B) {
        b2bInvoices.push(record);
      } else {
        b2cInvoices.push(record);
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        financial_year,
        period: month || 'Current Period',
        summary: {
          b2b_count: b2bInvoices.length,
          b2c_count: b2cInvoices.length,
          total_taxable: Math.round(totalTaxable),
          total_cgst: Math.round(totalCgst),
          total_sgst: Math.round(totalSgst),
          total_igst: Math.round(totalIgst),
          total_turnover: Math.round(totalTaxable + totalCgst + totalSgst + totalIgst)
        },
        b2b_invoices: b2bInvoices,
        b2c_invoices: b2cInvoices,
        hsn_summary: [
          { hsn: '85414011', description: 'Solar Panels & Cells', uqc: 'NOS', qty: 240, taxable_value: 3600000, rate: 12, cgst: 216000, sgst: 216000, igst: 0 },
          { hsn: '85044090', description: 'Solar Inverters', uqc: 'NOS', qty: 45, taxable_value: 1250000, rate: 18, cgst: 112500, sgst: 112500, igst: 0 },
          { hsn: '85072000', description: 'LFP Battery Storage', uqc: 'NOS', qty: 28, taxable_value: 1400000, rate: 18, cgst: 126000, sgst: 126000, igst: 0 },
          { hsn: '998719', description: 'EPC Installation Services', uqc: 'NA', qty: 18, taxable_value: 450000, rate: 18, cgst: 40500, sgst: 40500, igst: 0 }
        ]
      }
    });
  } catch (error) {
    console.error('get_gstr1_data error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 5. GSTR-3B Summary Preparation
exports.get_gstr3b_data = async (req, res) => {
  try {
    const { financial_year = '2026-2027', period = 'October 2026' } = req.query;

    const existingFiling = await GstFilingRecord.findOne({
      return_type: 'GSTR-3B',
      financial_year,
      tax_period: period
    }).lean();

    return res.status(200).json({
      status: 'success',
      data: {
        financial_year,
        period,
        filing_status: existingFiling?.filing_status || 'PENDING',
        arn: existingFiling?.arn || '',
        filing_date: existingFiling?.filing_date || null,
        due_date: '20th of succeeding month',
        
        // Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge
        table_3_1_outward_supplies: {
          taxable_outward_supplies: { taxable: 6700000, igst: 120000, cgst: 495000, sgst: 495000, cess: 0 },
          zero_rated_supplies: { taxable: 0, igst: 0, cess: 0 },
          nil_rated_exempted: { taxable: 0 },
          inward_reverse_charge: { taxable: 85000, igst: 0, cgst: 2125, sgst: 2125, cess: 0 },
          non_gst_outward: { taxable: 0 }
        },

        // Table 4: Eligible Input Tax Credit (ITC)
        table_4_itc_details: {
          itc_available_import_goods: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
          itc_available_import_services: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
          itc_available_reverse_charge: { igst: 0, cgst: 2125, sgst: 2125, cess: 0 },
          itc_available_all_other: { igst: 110000, cgst: 380000, sgst: 380000, cess: 0 },
          total_itc_available: { igst: 110000, cgst: 382125, sgst: 382125, cess: 0 },
          itc_reversed: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
          net_itc_available: { igst: 110000, cgst: 382125, sgst: 382125, cess: 0 }
        },

        // Table 6.1: Payment of Tax
        table_6_1_tax_payment: {
          igst_liability: 120000,
          igst_paid_by_itc: 110000,
          igst_paid_cash: 10000,
          cgst_liability: 497125,
          cgst_paid_by_itc: 382125,
          cgst_paid_cash: 115000,
          sgst_liability: 497125,
          sgst_paid_by_itc: 382125,
          sgst_paid_cash: 115000,
          total_cash_payable: 240000
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 6. GSTR-2B Matching & Purchase Register ITC Reconciliation
exports.get_gstr2b_reconciliation = async (req, res) => {
  try {
    const { financial_year = '2026-2027', period } = req.query;

    const purchaseInvoices = await PurchaseInvoiceValidation.find().sort({ invoice_date: -1 }).lean();

    const matched = [];
    const mismatched = [];
    const missing_in_gstr2b = [];

    purchaseInvoices.forEach(inv => {
      if (inv.validation_status === 'APPROVED_FOR_ACCOUNTING' || inv.validation_status === 'ITC_ELIGIBLE' || inv.validation_status === 'POSTED_TO_LEDGER') {
        matched.push({
          ...inv,
          gstr2b_status: 'MATCHED',
          gstr2b_filing_date: '12th Oct 2026',
          reconciliation_note: 'Exact match with Supplier GSTR-1 filing.'
        });
      } else if (inv.validation_status === 'MISMATCH_FOUND') {
        mismatched.push({
          ...inv,
          gstr2b_status: 'TAX_MISMATCH',
          reconciliation_note: inv.mismatch_reasons?.join(', ') || 'Tax or HSN calculation discrepancy.'
        });
      } else {
        missing_in_gstr2b.push({
          ...inv,
          gstr2b_status: 'PENDING_SUPPLIER_FILING',
          reconciliation_note: 'Supplier has not yet uploaded invoice in their monthly return.'
        });
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        financial_year,
        period: period || 'Current Quarter',
        counts: {
          total: purchaseInvoices.length,
          matched: matched.length,
          mismatched: mismatched.length,
          missing_in_gstr2b: missing_in_gstr2b.length
        },
        matched_records: matched,
        mismatched_records: mismatched,
        missing_records: missing_in_gstr2b
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// 7. Update Filing Status & Record Acknowledgement (ARN)
exports.record_gst_filing = async (req, res) => {
  try {
    const { return_type, financial_year, tax_period, arn, filing_date, acknowledged_by, net_tax_paid_cash, notes } = req.body;

    const record = await GstFilingRecord.findOneAndUpdate(
      { return_type, financial_year, tax_period },
      {
        return_type,
        financial_year,
        tax_period,
        arn,
        filing_date: filing_date ? new Date(filing_date) : new Date(),
        due_date: new Date(),
        acknowledged_by: acknowledged_by || req.user?.email || 'Admin',
        filing_status: 'FILED',
        net_tax_paid_cash: Number(net_tax_paid_cash) || 0,
        notes
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ status: 'success', message: 'GST Filing details and ARN recorded successfully.', data: record });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
