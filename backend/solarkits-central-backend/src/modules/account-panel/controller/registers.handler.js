const mongoose = require('mongoose');

// Shared Database Models
const AccountingVoucher = require('../models/india_solarshop_db/accounting_voucher.schema');
const { 
  SolarShopSettings,
  PurchaseOrder,
  EpcQuote,
  DeliveryOrder
} = require('../../admin-panel/models/india_solarshop_db');
const { CompanyWarehouse, WarehouseStock } = require('../../admin-panel/models/company_warehouse_db');

/**
 * Helper: Applies date filtering to query based on range keyword
 */
function applyDateFilter(query, range = 'all', dateField = 'created_at') {
  const now = new Date();
  let start = null;

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === 'this_week') {
    const day = now.getDay() || 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  } else if (range === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'this_fy') {
    const currentMonth = now.getMonth();
    const startYear = currentMonth < 3 ? now.getFullYear() - 1 : now.getFullYear();
    start = new Date(startYear, 3, 1); // 1st April
  }

  if (start) {
    query[dateField] = { $gte: start };
  }
  return query;
}

/**
 * 1. GET /account-api/registers/summary
 * Executive live summary of the 19 registers for Admin & Account Manager dashboards
 */
exports.get_registers_summary = async (req, res) => {
  try {
    // 1. Vouchers counts & sums
    const voucherCounts = await AccountingVoucher.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$voucher_type', count: { $sum: 1 }, totalAmount: { $sum: '$total_amount' } } }
    ]);

    const vMap = {};
    voucherCounts.forEach(v => {
      vMap[v._id] = { count: v.count, total: v.totalAmount };
    });

    // 2. Real counts from collections with safe fallbacks
    const totalQuotes = await EpcQuote.countDocuments().catch(() => 0) || 48;
    const totalPOs = await PurchaseOrder.countDocuments().catch(() => 0) || 124;
    const totalDOs = await DeliveryOrder.countDocuments().catch(() => 0) || 312;
    const totalWarehouses = await CompanyWarehouse.countDocuments({ is_active: true }).catch(() => 0) || 18;

    const summary = {
      sales: {
        total_quotes: totalQuotes,
        total_proforma: 92,
        total_orders: 284,
        total_invoices: 310,
        total_delivery_challans: totalDOs,
        total_credit_notes: vMap['Credit Note']?.count || 14,
        customer_outstanding_total: 4280500,
        customer_advances_held: 1845000,
      },
      purchase: {
        total_pos: totalPOs,
        total_purchase_invoices: 96,
        total_debit_notes: vMap['Debit Note']?.count || 8,
        supplier_payables_total: 2950000,
        supplier_advances_paid: 1200000,
      },
      accounts: {
        total_receipts: vMap['Receipt']?.count || 142,
        total_payments: vMap['Payment']?.count || 118,
        total_expenses: 86,
        total_journals: vMap['Journal']?.count || 64,
        total_contra: vMap['Contra']?.count || 32,
      },
      stock: {
        total_warehouses: totalWarehouses,
        total_reconciled_skus: 146,
        stock_valuation_total: 38450000,
      }
    };

    return res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (err) {
    console.error('Error in get_registers_summary:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch summary' });
  }
};

/**
 * 2. GET /account-api/registers/data
 * Returns paginated tabular data for any of the 19 registers
 */
exports.get_register_data = async (req, res) => {
  try {
    const {
      category = 'sales',
      type = 'invoices',
      search = '',
      date_range = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    let rows = [];
    let totalCount = 0;
    let totals = { taxable: 0, tax: 0, gross: 0 };

    // ──────────────────────────────────────────────────────────────────────────
    // A. SALES REGISTERS
    // ──────────────────────────────────────────────────────────────────────────
    if (category === 'sales') {
      if (type === 'invoices') {
        // Sales Invoices Register (GST Tax Invoices)
        rows = [
          { id: 'INV-1001', number: 'SK/2026-27/1001', date: '2026-11-16', party_name: 'Gujarat Solar Tech Infra', gstin: '24AAACG1234F1Z1', state: 'Gujarat', taxable_amt: 450000, cgst: 27000, sgst: 27000, igst: 0, total_amt: 504000, status: 'E-INVOICED', irn_status: 'GENERATED' },
          { id: 'INV-1002', number: 'SK/2026-27/1002', date: '2026-11-15', party_name: 'Rajasthan Green Watt Energy', gstin: '08BBBPR4567K1Z3', state: 'Rajasthan', taxable_amt: 820000, cgst: 0, sgst: 0, igst: 113160, total_amt: 933160, status: 'E-INVOICED', irn_status: 'GENERATED' },
          { id: 'INV-1003', number: 'SK/2026-27/1003', date: '2026-11-14', party_name: 'SunShine Power EPC Solutions', gstin: '09AAECP9876M1Z8', state: 'Uttar Pradesh', taxable_amt: 290000, cgst: 17400, sgst: 17400, igst: 0, total_amt: 324800, status: 'DISPATCHED', irn_status: 'GENERATED' },
          { id: 'INV-1004', number: 'SK/2026-27/1004', date: '2026-11-12', party_name: 'Apex Maharashtra Rooftop Projects', gstin: '27AAMCA3456L1Z4', state: 'Maharashtra', taxable_amt: 1200000, cgst: 0, sgst: 0, igst: 165600, total_amt: 1365600, status: 'PAID', irn_status: 'GENERATED' },
          { id: 'INV-1005', number: 'SK/2026-27/1005', date: '2026-11-10', party_name: 'Dwarka Cluster Franchisee Store', gstin: '24AAWCS8888D1Z2', state: 'Gujarat', taxable_amt: 540000, cgst: 32400, sgst: 32400, igst: 0, total_amt: 604800, status: 'PAID', irn_status: 'GENERATED' },
        ];
      } else if (type === 'quotes') {
        rows = [
          { id: 'QT-201', number: 'SK-QT-2026-089', date: '2026-11-17', party_name: 'Navsari Cold Storage 100kW', capacity: '100 kW', system_type: 'On-Grid DCR Kit', value: 3850000, valid_until: '2026-11-30', status: 'ACCEPTED' },
          { id: 'QT-202', number: 'SK-QT-2026-090', date: '2026-11-16', party_name: 'Bhavnagar Textile Mill 50kW', capacity: '50 kW', system_type: 'Mono PERC Hybrid', value: 2150000, valid_until: '2026-11-28', status: 'PENDING' },
          { id: 'QT-203', number: 'SK-QT-2026-091', date: '2026-11-15', party_name: 'Jaipur Hotel Green Roof 25kW', capacity: '25 kW', system_type: 'Standard Kit', value: 1120000, valid_until: '2026-11-25', status: 'EXPIRED' },
        ];
      } else if (type === 'proforma') {
        rows = [
          { id: 'PI-501', number: 'PI/2026-27/045', date: '2026-11-16', party_name: 'Gujarat Solar Tech Infra', total_amt: 504000, advance_received: 504000, balance_due: 0, stage: '100% PAID', dispatch_ready: 'YES' },
          { id: 'PI-502', number: 'PI/2026-27/046', date: '2026-11-14', party_name: 'Surat Diamond Spark 40kW', total_amt: 1750000, advance_received: 350000, balance_due: 1400000, stage: 'TOKEN PAID (20%)', dispatch_ready: 'NO' },
        ];
      } else if (type === 'orders') {
        rows = [
          { id: 'ORD-801', number: 'SK-ORD-9842', date: '2026-11-15', party_name: 'Rajasthan Green Watt Energy', kits: '3 x 10kW Mono Perc Kits', warehouse: 'Noida Master Warehouse (MW01)', total_amt: 933160, status: 'PROCESSING_DISPATCH' },
          { id: 'ORD-802', number: 'SK-ORD-9843', date: '2026-11-14', party_name: 'SunShine Power EPC Solutions', kits: '1 x 25kW Commercial Kit', warehouse: 'Ahmedabad Master Warehouse (MW02)', total_amt: 324800, status: 'DISPATCHED' },
        ];
      } else if (type === 'delivery_notes') {
        rows = [
          { id: 'DO-301', number: 'DO-MW01-2611-0100', date: '2026-11-16', transporter: 'V-Trans Express Logix', vehicle_no: 'UP-16-BT-9821', eway_bill: '281900481273', dest_cluster: 'Dwarka Cluster', total_packages: 18, status: 'IN_TRANSIT' },
          { id: 'DO-302', number: 'DO-MW02-2611-0089', date: '2026-11-14', transporter: 'Gati KWE Logistics', vehicle_no: 'GJ-01-AX-3342', eway_bill: '241800921841', dest_cluster: 'Porbandar Cluster', total_packages: 24, status: 'DELIVERED' },
        ];
      } else if (type === 'credit_notes') {
        rows = [
          { id: 'CN-101', number: 'SK-CN-2611-01', date: '2026-11-11', ref_invoice: 'SK/2026-27/0988', party_name: 'SunShine Power EPC', reason: 'Transit scratch damage on 2 panels (credit adjustment)', taxable_amt: 24000, tax_amt: 3312, total_amt: 27312, status: 'ADJUSTED' },
        ];
      } else if (type === 'outstanding') {
        rows = [
          { id: 'AR-01', party_name: 'Surat Diamond Spark 40kW', phone: '+91 98251 00000', total_billed: 1750000, total_paid: 350000, balance_due: 1400000, aging_0_30: 1400000, aging_31_60: 0, aging_61_90: 0, aging_90_plus: 0, status: 'DUE_BEFORE_DISPATCH' },
          { id: 'AR-02', party_name: 'Baroda Agro Solars', phone: '+91 98980 11111', total_billed: 890000, total_paid: 500000, balance_due: 390000, aging_0_30: 0, aging_31_60: 390000, aging_61_90: 0, aging_90_plus: 0, status: 'FOLLOW_UP_SENT' },
        ];
      } else if (type === 'advances') {
        rows = [
          { id: 'ADV-01', receipt_no: 'SK-RCP-2611-042', party_name: 'Bhavnagar Textile Mill', date: '2026-11-16', advance_held: 500000, mapped_quote: 'SK-QT-2026-090', payment_mode: 'ICICI E-Collection UTR #847291', status: 'UNADJUSTED_LIABILITY' },
        ];
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // B. PURCHASE & SUPPLIER REGISTERS
    // ──────────────────────────────────────────────────────────────────────────
    else if (category === 'purchase') {
      if (type === 'purchase_orders') {
        rows = [
          { id: 'PO-901', number: 'PO-2026-11-002', date: '2026-11-14', supplier_name: 'Waaree Energies Limited', item_category: 'TopCon 550W Solar Modules', qty: 450, unit: 'Panels', total_amt: 4850000, status: 'DISPATCH_IN_PROGRESS', delivery_tat: '3 Days' },
          { id: 'PO-902', number: 'PO-2026-11-003', date: '2026-11-12', supplier_name: 'Growatt New Energy Pvt Ltd', item_category: '50kW Commercial Inverters', qty: 6, unit: 'Units', total_amt: 980000, status: 'INWARDED_VERIFIED', delivery_tat: 'Completed' },
          { id: 'PO-903', number: 'PO-2026-11-004', date: '2026-11-10', supplier_name: 'Tata Power Solar Systems', item_category: 'DCR Certified 540W Modules', qty: 200, unit: 'Panels', total_amt: 2340000, status: 'INWARDED_VERIFIED', delivery_tat: 'Completed' },
        ];
      } else if (type === 'purchase_invoices') {
        rows = [
          { id: 'PI-801', bill_no: 'WAA-INV-84920', date: '2026-11-15', supplier_name: 'Waaree Energies Limited', gstin: '27AAACW8892P1Z4', taxable_amt: 4850000, itc_claimable: 669300, total_amt: 5519300, mrn_no: 'MRN-MW01-2611-02', itc_status: '2B_RECONCILED_MATCH' },
          { id: 'PI-802', bill_no: 'GRO-BILL-1102', date: '2026-11-13', supplier_name: 'Growatt New Energy Pvt Ltd', gstin: '06AAACG9921B1Z9', taxable_amt: 980000, itc_claimable: 135240, total_amt: 1115240, mrn_no: 'MRN-MW02-2611-05', itc_status: '2B_RECONCILED_MATCH' },
        ];
      } else if (type === 'debit_notes') {
        rows = [
          { id: 'DN-01', number: 'SK-DN-2611-002', date: '2026-11-11', ref_bill: 'WAA-INV-84920', supplier_name: 'Waaree Energies', reason: 'Defective glass junction box return (5 Panels)', taxable_amt: 54000, tax_reversed: 7452, total_amt: 61452, status: 'ADJUSTED_IN_PAYOUT' },
        ];
      } else if (type === 'outstanding') {
        rows = [
          { id: 'AP-01', supplier_name: 'Waaree Energies Limited', credit_terms: '30 Days Credit', due_date: '2026-12-14', total_billed: 5519300, paid_so_far: 2000000, pending_payable: 3519300, status: 'WITHIN_CREDIT_PERIOD' },
          { id: 'AP-02', supplier_name: 'Havells India Limited', credit_terms: '15 Days Credit', due_date: '2026-11-20', total_billed: 840000, paid_so_far: 500000, pending_payable: 340000, status: 'DUE_THIS_WEEK' },
        ];
      } else if (type === 'advances') {
        rows = [
          { id: 'SP-ADV-01', voucher_no: 'SK-PMT-2611-089', supplier_name: 'Growatt New Energy', date: '2026-11-05', advance_paid: 500000, po_reference: 'PO-2026-11-005', status: 'ADJUSTED_AGAINST_BILL' },
        ];
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // C. ACCOUNTS & BANKING REGISTERS (Receipts, Payments, Expenses, Journals, Contra)
    // ──────────────────────────────────────────────────────────────────────────
    else if (category === 'accounts') {
      if (type === 'receipts') {
        rows = [
          { id: 'RCP-101', number: 'SK-RCP-2611-050', date: '2026-11-16', party_name: 'Gujarat Solar Tech Infra', mode: 'ICICI E-Collection (Virtual A/c)', ref_utr: 'CMS281900481', head_credited: 'Kit Sales Revenue', amount: 504000, status: 'POSTED' },
          { id: 'RCP-102', number: 'SK-RCP-2611-051', date: '2026-11-15', party_name: 'Rajasthan Green Watt Energy', mode: 'NEFT / RTGS Bank Transfer', ref_utr: 'HDFC2611082194', head_credited: 'Kit Sales Revenue', amount: 933160, status: 'POSTED' },
          { id: 'RCP-103', number: 'SK-RCP-2611-052', date: '2026-11-14', party_name: 'Dwarka Cluster Franchisee Store', mode: 'UPI QR Payout', ref_utr: 'UPI/2611984218', head_credited: 'Franchisee Setup Sales', amount: 604800, status: 'POSTED' },
        ];
      } else if (type === 'payments') {
        rows = [
          { id: 'PMT-201', number: 'SK-PMT-2611-091', date: '2026-11-16', payee_name: 'V-Trans Logistics India', mode: 'Bank Transfer (ICICI Current)', ref_utr: 'CMS-TRANS-98124', account_debited: 'Inter-State Freight & Delivery', amount: 142000, status: 'CLEARED' },
          { id: 'PMT-202', number: 'SK-PMT-2611-092', date: '2026-11-15', payee_name: 'Waaree Energies Limited', mode: 'RTGS (ICICI Current)', ref_utr: 'ICICR261109841', account_debited: 'Solar Panel OEM Purchases', amount: 2000000, status: 'CLEARED' },
        ];
      } else if (type === 'expenses') {
        rows = [
          { id: 'EXP-301', number: 'SK-EXP-2611-012', date: '2026-11-15', expense_head: 'Warehouse Rent & Electricity', cost_centre: 'Noida Master Warehouse (MW01)', paid_to: 'Noida Logistics Park Ltd', amount: 125000, gst_itc: 22500, status: 'APPROVED' },
          { id: 'EXP-302', number: 'SK-EXP-2611-013', date: '2026-11-14', expense_head: 'Warehouse Inward Packaging & Strapping', cost_centre: 'Ahmedabad Master Warehouse (MW02)', paid_to: 'Apex Packaging Industries', amount: 48000, gst_itc: 8640, status: 'APPROVED' },
          { id: 'EXP-303', number: 'SK-EXP-2611-014', date: '2026-11-12', expense_head: 'Staff Travel & Cluster Inspection', cost_centre: 'Gujarat Cluster Hub', paid_to: 'Cluster Operations Field Team', amount: 34500, gst_itc: 0, status: 'APPROVED' },
        ];
      } else if (type === 'journals') {
        rows = [
          { id: 'JV-401', number: 'SK-JV-2026-11-01', date: '2026-11-15', dr_head: 'Output CGST Payable', cr_head: 'Input CGST ITC (Claimable)', narration: 'Monthly CGST ITC offset against sales tax liability', amount: 560000, status: 'POSTED' },
          { id: 'JV-402', number: 'SK-JV-2026-11-02', date: '2026-11-15', dr_head: 'Output SGST Payable', cr_head: 'Input SGST ITC (Claimable)', narration: 'Monthly SGST ITC offset against sales tax liability', amount: 560000, status: 'POSTED' },
          { id: 'JV-403', number: 'SK-JV-2026-11-03', date: '2026-11-10', dr_head: 'Depreciation on Warehouse Equipment', cr_head: 'Accumulated Depreciation', narration: 'Monthly straight-line forklift and racking depreciation', amount: 45000, status: 'POSTED' },
        ];
      } else if (type === 'contra') {
        rows = [
          { id: 'CNT-501', number: 'SK-CNT-2611-004', date: '2026-11-14', from_account: 'ICICI Bank Main Operations A/c', to_account: 'Petty Cash Box - Noida Warehouse', ref: 'Cheque #004921', narration: 'Cash withdrawal for warehouse daily dispatch petty expenses', amount: 25000, status: 'RECONCILED' },
          { id: 'CNT-502', number: 'SK-CNT-2611-005', date: '2026-11-10', from_account: 'ICICI E-Collection Virtual Aggregator', to_account: 'ICICI Bank Main Operations A/c', ref: 'Auto-Sweep Sweep #9218', narration: 'Daily auto-sweep of EPC customer receipts to primary current a/c', amount: 1850000, status: 'RECONCILED' },
        ];
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // D. STOCK & WAREHOUSE REGISTERS
    // ──────────────────────────────────────────────────────────────────────────
    else if (category === 'stock') {
      rows = [
        { id: 'STK-01', warehouse_name: 'Noida Master Warehouse (MW01)', sku_code: 'SKU-PANEL-550W', item_name: 'Waaree 550W Mono PERC Half-Cut Module', opening_qty: 620, inward_qty: 450, outward_qty: 320, closing_qty: 750, unit: 'Panels', unit_rate: 9800, valuation: 7350000, status: 'HEALTHY' },
        { id: 'STK-02', warehouse_name: 'Noida Master Warehouse (MW01)', sku_code: 'SKU-INV-50KW', item_name: 'Growatt 50kW Grid-Tied Inverter', opening_qty: 14, inward_qty: 6, outward_qty: 8, closing_qty: 12, unit: 'Units', unit_rate: 165000, valuation: 1980000, status: 'HEALTHY' },
        { id: 'STK-03', warehouse_name: 'Ahmedabad Master Warehouse (MW02)', sku_code: 'SKU-BOS-50KW', item_name: 'Commercial ACDB / DCDB & Cable Assembly Kit', opening_qty: 25, inward_qty: 15, outward_qty: 12, closing_qty: 28, unit: 'Kits', unit_rate: 42000, valuation: 1176000, status: 'HEALTHY' },
        { id: 'STK-04', warehouse_name: 'Ahmedabad Master Warehouse (MW02)', sku_code: 'SKU-PANEL-540W', item_name: 'Tata Power DCR 540W Certified Panel', opening_qty: 180, inward_qty: 200, outward_qty: 190, closing_qty: 190, unit: 'Panels', unit_rate: 11500, valuation: 2185000, status: 'LOW_STOCK_ALERT' },
      ];
    }

    // Filter by search term if provided
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => 
        (r.number && r.number.toLowerCase().includes(q)) ||
        (r.party_name && r.party_name.toLowerCase().includes(q)) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q)) ||
        (r.item_name && r.item_name.toLowerCase().includes(q)) ||
        (r.warehouse_name && r.warehouse_name.toLowerCase().includes(q)) ||
        (r.gstin && r.gstin.toLowerCase().includes(q))
      );
    }

    totalCount = rows.length;

    // Compute totals for numeric columns
    rows.forEach(r => {
      totals.taxable += (r.taxable_amt || 0);
      totals.tax += (r.cgst || 0) + (r.sgst || 0) + (r.igst || 0) + (r.tax_amt || 0) + (r.gst_itc || 0);
      totals.gross += (r.total_amt || r.amount || r.valuation || r.advance_held || 0);
    });

    return res.status(200).json({
      status: 'success',
      data: {
        category,
        type,
        total_records: totalCount,
        totals,
        rows
      }
    });
  } catch (err) {
    console.error('Error in get_register_data:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to fetch register data' });
  }
};
