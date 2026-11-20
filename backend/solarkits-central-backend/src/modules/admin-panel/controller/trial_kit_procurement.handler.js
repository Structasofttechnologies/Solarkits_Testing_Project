const mongoose = require('mongoose');
const {
  TrialKitProcurement,
  TrialKitInventory,
  TrialKitStockHistory,
  WarehouseComboKit
} = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../../warehouse-panel/models/company_warehouse_db');

/**
 * Helper: Generate unique Procurement Number (TK-PR-YYYY-XXXXX)
 */
async function generateProcurementNumber() {
  const year = new Date().getFullYear();
  const count = await TrialKitProcurement.countDocuments({});
  let seq = count + 1;
  let prNumber = `TK-PR-${year}-${String(seq).padStart(5, '0')}`;
  while (await TrialKitProcurement.findOne({ procurement_number: prNumber })) {
    seq++;
    prNumber = `TK-PR-${year}-${String(seq).padStart(5, '0')}`;
  }
  return prNumber;
}

/**
 * Helper: Generate unique GRN Number (GRN-TK-YYYY-XXXXX)
 */
async function generateGrnNumber() {
  const year = new Date().getFullYear();
  const count = await TrialKitProcurement.countDocuments({});
  let seq = count + 1;
  let grnNumber = `GRN-TK-${year}-${String(seq).padStart(5, '0')}`;
  while (await TrialKitProcurement.findOne({ grn_number: grnNumber })) {
    seq++;
    grnNumber = `GRN-TK-${year}-${String(seq).padStart(5, '0')}`;
  }
  return grnNumber;
}

/**
 * 1. STAGE 1: Warehouse Manager raises Trial Kit Inward Request
 * POST /trial-kits/procurement/request
 */
exports.request_inward = async (req, res) => {
  try {
    const {
      combo_kit_id,
      warehouse_id,
      inward_quantity,
      vendor_name,
      vendor_contact,
      invoice_challan_number,
      invoice_challan_date,
      courier_transport_details,
      warehouse_inspection_status,
      warehouse_remarks,
      warehouse_documents
    } = req.body;

    if (!combo_kit_id || !warehouse_id || !inward_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Combo Kit, Target Warehouse, and Inward Quantity are required.'
      });
    }

    const qty = parseInt(inward_quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Inward quantity must be a positive integer.'
      });
    }

    // Verify Combo Kit
    const comboKit = await WarehouseComboKit.findById(combo_kit_id).lean();
    if (!comboKit) {
      return res.status(404).json({ success: false, message: 'Configured Combo Kit not found.' });
    }

    // Verify Warehouse
    const warehouse = await CompanyWarehouse.findById(warehouse_id).lean();
    if (!warehouse) {
      return res.status(404).json({ success: false, message: 'Warehouse not found.' });
    }

    const procurement_number = await generateProcurementNumber();
    const grn_number = await generateGrnNumber();

    const requesterName = req.user?.name || req.user?.email || 'Warehouse Manager';
    const requesterRole = req.user?.is_warehouse_user ? 'warehouse' : (req.user?.role?.toLowerCase().includes('account') ? 'account' : 'admin');

    const effectiveVendorName = vendor_name ? vendor_name.trim() : 'Pending Accounts Sourcing';
    const effectiveChallanNo = invoice_challan_number ? invoice_challan_number.trim() : grn_number;

    const newProcurement = new TrialKitProcurement({
      procurement_number,
      grn_number,
      combo_kit_id,
      kit_type: comboKit.name,
      blueprint_name: comboKit.blueprint_name || comboKit.name,
      capacity: comboKit.capacity || 0,
      warehouse_id,
      warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
      warehouse_code: warehouse.warehouse_code || '',
      inward_quantity: qty,
      vendor_name: effectiveVendorName,
      vendor_contact: vendor_contact ? vendor_contact.trim() : '',
      invoice_challan_number: effectiveChallanNo,
      invoice_challan_date: invoice_challan_date ? new Date(invoice_challan_date) : new Date(),
      courier_transport_details: courier_transport_details || {},
      warehouse_inspection_status: warehouse_inspection_status || 'passed',
      warehouse_remarks: warehouse_remarks || 'Warehouse inward indent raised.',
      warehouse_documents: Array.isArray(warehouse_documents) ? warehouse_documents : (warehouse_documents ? [warehouse_documents] : []),
      requested_by: {
        user_id: req.user?.id || req.user?._id || null,
        name: requesterName,
        email: req.user?.email || '',
        role: requesterRole
      },
      requested_at: new Date(),
      status: 'inward_requested',
      payment_status: 'unpaid',
      admin_approval_status: 'pending_payment'
    });

    await newProcurement.save();

    return res.status(201).json({
      success: true,
      message: `Inward request ${procurement_number} created successfully. Sent to Accounts for procurement payment.`,
      data: newProcurement
    });
  } catch (err) {
    console.error('❌ Error creating trial kit inward request:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. List Trial Kit Procurements with filtering & search
 * GET /trial-kits/procurement/list
 */
exports.list_procurements = async (req, res) => {
  try {
    const {
      status,
      warehouse_id,
      combo_kit_id,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (warehouse_id && warehouse_id !== 'all') {
      filter.warehouse_id = warehouse_id;
    }

    if (combo_kit_id && combo_kit_id !== 'all') {
      filter.combo_kit_id = combo_kit_id;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { procurement_number: { $regex: q, $options: 'i' } },
        { grn_number: { $regex: q, $options: 'i' } },
        { kit_type: { $regex: q, $options: 'i' } },
        { vendor_name: { $regex: q, $options: 'i' } },
        { invoice_challan_number: { $regex: q, $options: 'i' } },
        { 'payment_details.transaction_utr_no': { $regex: q, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      TrialKitProcurement.find(filter)
        .populate('combo_kit_id', 'name capacity kit_image')
        .populate('warehouse_id', 'warehouse_name warehouse_code city state')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TrialKitProcurement.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('❌ Error listing trial kit procurements:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Get single procurement detailed 3-way match dossier
 * GET /trial-kits/procurement/:id
 */
exports.get_procurement_details = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await TrialKitProcurement.findById(id)
      .populate('combo_kit_id')
      .populate('warehouse_id')
      .populate('stock_history_id')
      .lean();

    if (!item) {
      return res.status(404).json({ success: false, message: 'Procurement record not found.' });
    }

    return res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error('❌ Error getting trial kit procurement details:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. STAGE 2: Accounts Manager records procurement payment
 * POST /trial-kits/procurement/:id/record-payment
 */
exports.record_payment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      unit_cost_price_inr,
      gst_rate_percent = 13.8,
      payment_mode = 'bank_transfer_neft_rtgs',
      transaction_utr_no,
      payment_date,
      company_bank_account,
      vendor_bank_account,
      payment_receipt_url,
      accounts_remarks
    } = req.body;

    const procurement = await TrialKitProcurement.findById(id);
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Procurement record not found.' });
    }

    if (procurement.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Procurement is already approved and closed.' });
    }

    const unitPrice = parseFloat(unit_cost_price_inr);
    if (isNaN(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Valid unit cost price (INR) is required.' });
    }

    if (!transaction_utr_no || !transaction_utr_no.trim()) {
      return res.status(400).json({ success: false, message: 'Bank Transaction UTR / Reference Number is required.' });
    }

    const gstRate = parseFloat(gst_rate_percent) || 0;
    const subtotal = Math.round(procurement.inward_quantity * unitPrice * 100) / 100;
    const gstAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;
    const totalPayable = Math.round((subtotal + gstAmount) * 100) / 100;

    const payerName = req.user?.name || req.user?.email || 'Accounts Manager';

    procurement.unit_cost_price_inr = unitPrice;
    procurement.subtotal_amount_inr = subtotal;
    procurement.gst_rate_percent = gstRate;
    procurement.gst_amount_inr = gstAmount;
    procurement.total_payable_amount_inr = totalPayable;

    procurement.payment_status = 'payment_recorded';
    procurement.admin_approval_status = 'pending_approval';
    procurement.status = 'payment_recorded';

    procurement.payment_details = {
      payment_mode: payment_mode || 'bank_transfer_neft_rtgs',
      transaction_utr_no: transaction_utr_no.trim(),
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      company_bank_account: company_bank_account || '',
      vendor_bank_account: vendor_bank_account || '',
      payment_receipt_url: payment_receipt_url || '',
      accounts_remarks: accounts_remarks || '',
      paid_by: {
        user_id: req.user?.id || req.user?._id || null,
        name: payerName,
        email: req.user?.email || ''
      },
      paid_at: new Date()
    };

    await procurement.save();

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${totalPayable.toLocaleString('en-IN')} recorded successfully. Submitted for Admin Approval.`,
      data: procurement
    });
  } catch (err) {
    console.error('❌ Error recording trial kit payment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. STAGE 3: Admin Approves Procurement & Releases Stock
 * POST /trial-kits/procurement/:id/approve
 */
exports.admin_approve_procurement = async (req, res) => {
  let session = null;
  let useSession = false;

  try {
    // Try to initiate mongoose session for transactions (supports replica sets)
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useSession = true;
    } catch (sessionErr) {
      // Standalone MongoDB fallback without replica set
      session = null;
      useSession = false;
    }

    const { id } = req.params;
    const { admin_notes } = req.body;

    const query = TrialKitProcurement.findById(id);
    if (useSession) query.session(session);
    const procurement = await query;

    if (!procurement) {
      if (useSession) await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Procurement record not found.' });
    }

    if (procurement.status === 'approved' && procurement.stock_inward_synced) {
      if (useSession) await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'This procurement is already approved and stock has been synced.' });
    }

    if (procurement.status !== 'payment_recorded') {
      if (useSession) await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot approve procurement in status '${procurement.status}'. Accounts payment must be recorded first.`
      });
    }

    // 1. Locate or create warehouse inventory
    const invQuery = TrialKitInventory.findOne({
      combo_kit_id: procurement.combo_kit_id,
      warehouse_id: procurement.warehouse_id
    });
    if (useSession) invQuery.session(session);
    let inventory = await invQuery;

    if (!inventory) {
      // Fallback matching by kit_type name if legacy record
      const fallbackQuery = TrialKitInventory.findOne({
        kit_type: procurement.kit_type,
        warehouse_id: procurement.warehouse_id
      });
      if (useSession) fallbackQuery.session(session);
      inventory = await fallbackQuery;
    }

    if (!inventory) {
      inventory = new TrialKitInventory({
        combo_kit_id: procurement.combo_kit_id,
        kit_type: procurement.kit_type,
        warehouse_id: procurement.warehouse_id,
        warehouse_name: procurement.warehouse_name,
        available_stock: 0,
        unit_cost_price_inr: procurement.unit_cost_price_inr || 0
      });
    }

    const prevStock = inventory.available_stock || 0;
    inventory.available_stock = prevStock + procurement.inward_quantity;
    if (procurement.unit_cost_price_inr > 0) {
      inventory.unit_cost_price_inr = procurement.unit_cost_price_inr;
    }
    if (!inventory.combo_kit_id && procurement.combo_kit_id) {
      inventory.combo_kit_id = procurement.combo_kit_id;
    }

    if (useSession) {
      await inventory.save({ session });
    } else {
      await inventory.save();
    }

    // 2. Append immutable TrialKitStockHistory
    const approverName = req.user?.name || req.user?.email || 'Admin User';
    const historyData = {
      trial_kit_inventory_id: inventory._id,
      combo_kit_id: procurement.combo_kit_id,
      kit_type: procurement.kit_type,
      warehouse_id: procurement.warehouse_id,
      warehouse_name: procurement.warehouse_name,
      adjustment_type: 'procurement_inward',
      procurement_id: procurement._id,
      utr_number: procurement.payment_details?.transaction_utr_no || '',
      quantity_change: procurement.inward_quantity,
      previous_available_stock: prevStock,
      new_available_stock: inventory.available_stock,
      user_name: approverName,
      user_id: req.user?.id || req.user?._id || null,
      user_role: 'admin',
      remarks: `Procurement Approved [${procurement.procurement_number}]: +${procurement.inward_quantity} units inwarded from ${procurement.vendor_name}. UTR: ${procurement.payment_details?.transaction_utr_no || 'N/A'}`
    };

    let historyDoc = null;
    if (useSession) {
      const created = await TrialKitStockHistory.create([historyData], { session });
      historyDoc = created[0];
    } else {
      historyDoc = await TrialKitStockHistory.create(historyData);
    }

    // 3. Update Procurement Record
    procurement.status = 'approved';
    procurement.admin_approval_status = 'approved';
    procurement.payment_status = 'approved';
    procurement.stock_inward_synced = true;
    procurement.stock_history_id = historyDoc._id;
    procurement.admin_decision = {
      approved_by: {
        user_id: req.user?.id || req.user?._id || null,
        name: approverName,
        email: req.user?.email || ''
      },
      approved_at: new Date(),
      rejection_reason: '',
      admin_notes: admin_notes || 'Approved and stock credited to warehouse inventory'
    };

    if (useSession) {
      await procurement.save({ session });
      await session.commitTransaction();
    } else {
      await procurement.save();
    }

    return res.status(200).json({
      success: true,
      message: `Procurement approved successfully! +${procurement.inward_quantity} units credited to ${procurement.warehouse_name}. New available stock: ${inventory.available_stock}.`,
      data: {
        procurement,
        inventory
      }
    });
  } catch (err) {
    if (useSession && session) {
      await session.abortTransaction();
    }
    console.error('❌ Error approving trial kit procurement:', err);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * 6. Admin or Accounts Rejection
 * POST /trial-kits/procurement/:id/reject
 */
exports.admin_reject_procurement = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, admin_notes } = req.body;

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }

    const procurement = await TrialKitProcurement.findById(id);
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Procurement record not found.' });
    }

    if (procurement.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot reject an already approved and inwarded procurement.' });
    }

    const rejecterName = req.user?.name || req.user?.email || 'Admin User';

    procurement.status = 'rejected';
    procurement.admin_approval_status = 'rejected';
    procurement.payment_status = 'rejected';
    procurement.admin_decision = {
      approved_by: {
        user_id: req.user?.id || req.user?._id || null,
        name: rejecterName,
        email: req.user?.email || ''
      },
      approved_at: new Date(),
      rejection_reason: rejection_reason.trim(),
      admin_notes: admin_notes || ''
    };

    await procurement.save();

    return res.status(200).json({
      success: true,
      message: `Procurement rejected: ${rejection_reason}`,
      data: procurement
    });
  } catch (err) {
    console.error('❌ Error rejecting trial kit procurement:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. Live Badge Counts for Sidebars & Dashboards
 * GET /trial-kits/procurement/badge-counts
 */
exports.get_procurement_badge_counts = async (req, res) => {
  try {
    const [pendingAccounts, pendingAdmin, approvedTotal] = await Promise.all([
      TrialKitProcurement.countDocuments({ status: 'inward_requested' }),
      TrialKitProcurement.countDocuments({ status: 'payment_recorded' }),
      TrialKitProcurement.countDocuments({ status: 'approved' })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        pending_accounts: pendingAccounts,
        pending_admin: pendingAdmin,
        approved_total: approvedTotal,
        total_pipeline: pendingAccounts + pendingAdmin
      }
    });
  } catch (err) {
    console.error('❌ Error fetching procurement badge counts:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
