const mongoose = require('mongoose');
const {
  TrialKitProcurement,
  TrialKitInventory,
  TrialKitStockHistory,
  WarehouseComboKit
} = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../../warehouse-panel/models/company_warehouse_db');
const Supplier = require('../../account-panel/models/supplier_db/supplier.schema');

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
 * Helper: Resolve Canonical Human-Readable Warehouse Display Name
 */
function resolveWarehouseName(wh) {
  if (!wh) return 'Warehouse';
  const code = (typeof wh === 'string' ? wh : wh.warehouse_code) || '';
  const rawName = (typeof wh === 'string' ? '' : wh.warehouse_name) || '';
  if (rawName && rawName !== code && !rawName.startsWith('IND_')) {
    return rawName;
  }
  if (code === 'IND_GUJ_001') return 'Ahmedabad Central Warehouse';
  if (code === 'IND_GUJ_002') return 'Surat Regional Warehouse';
  if (wh.district_name || wh.city) return `${wh.district_name || wh.city} Warehouse`;
  return rawName || code || 'Warehouse';
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

    const requesterName = req.user?.name || req.user?.email || 'Accounts Manager';
    const requesterRole = req.user?.is_warehouse_user ? 'warehouse' : (req.user?.role?.toLowerCase().includes('account') ? 'account' : (req.user?.role?.toLowerCase().includes('admin') ? 'admin' : 'account'));

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
      warehouse_name: resolveWarehouseName(warehouse),
      warehouse_code: warehouse.warehouse_code || '',
      inward_quantity: qty,
      vendor_name: effectiveVendorName,
      vendor_contact: vendor_contact ? vendor_contact.trim() : '',
      invoice_challan_number: effectiveChallanNo,
      invoice_challan_date: invoice_challan_date ? new Date(invoice_challan_date) : new Date(),
      courier_transport_details: courier_transport_details || {},
      warehouse_inspection_status: warehouse_inspection_status || 'passed',
      warehouse_remarks: warehouse_remarks || 'Trial kit inward indent initiated by Accounts.',
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

    const formattedItems = items.map(p => {
      const canonicalName = resolveWarehouseName(p.warehouse_id || { warehouse_code: p.warehouse_code, warehouse_name: p.warehouse_name });
      return {
        ...p,
        warehouse_name: canonicalName,
        warehouse_display: `${canonicalName} (${p.warehouse_code || ''})`
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedItems,
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

    const canonicalName = resolveWarehouseName(item.warehouse_id || { warehouse_code: item.warehouse_code, warehouse_name: item.warehouse_name });
    const formattedItem = {
      ...item,
      warehouse_name: canonicalName,
      warehouse_display: `${canonicalName} (${item.warehouse_code || ''})`
    };

    return res.status(200).json({ success: true, data: formattedItem });
  } catch (err) {
    console.error('❌ Error getting trial kit procurement details:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Resolve Kit Component Breakdown & Approved Suppliers for Procurement Payment
 * GET /trial-kits/procurement/:id/component-breakdown
 */
exports.get_component_breakdown = async (req, res) => {
  try {
    const { id } = req.params;
    const procurement = await TrialKitProcurement.findById(id).lean();
    if (!procurement) {
      return res.status(404).json({ success: false, message: 'Procurement record not found.' });
    }

    const rawDb = mongoose.connection.db;
    const kit = await rawDb.collection('pc_comobo_kit').findOne({ _id: new mongoose.Types.ObjectId(procurement.combo_kit_id) })
      || await rawDb.collection('pc_combo_kits').findOne({ _id: new mongoose.Types.ObjectId(procurement.combo_kit_id) });

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Combo Kit blueprint not found.' });
    }

    // Warehouse cluster
    let clusterId = null;
    const warehouse = await rawDb.collection('company_warehouses').findOne({ _id: new mongoose.Types.ObjectId(procurement.warehouse_id) });
    if (warehouse?.level_2) {
      const dist = await rawDb.collection('geolocation_level_2').findOne({ _id: new mongoose.Types.ObjectId(warehouse.level_2) });
      if (dist?.cluster) clusterId = dist.cluster;
    }

    const templateIds = (kit.base_components || []).map(b => new mongoose.Types.ObjectId(b.template_id)).filter(Boolean);
    const skuIds = [
      ...(kit.base_components || []).map(b => new mongoose.Types.ObjectId(b.sku_id)),
      ...(kit.bos_kits || []).map(b => new mongoose.Types.ObjectId(b.sku_id))
    ].filter(Boolean);
    const brandIds = [
      kit.brand_id ? new mongoose.Types.ObjectId(kit.brand_id) : null,
      ...(kit.base_components || []).map(b => b.brand_id ? new mongoose.Types.ObjectId(b.brand_id) : null),
      ...(kit.bos_kits || []).map(b => b.brand_id ? new mongoose.Types.ObjectId(b.brand_id) : null)
    ].filter(Boolean);

    const [templates, skus, brands, suppliers] = await Promise.all([
      templateIds.length > 0 ? rawDb.collection('pc_product_templates').find({ _id: { $in: templateIds } }).toArray() : [],
      skuIds.length > 0 ? rawDb.collection('pc_product_skus').find({ _id: { $in: skuIds } }).toArray() : [],
      brandIds.length > 0 ? rawDb.collection('brands').find({ _id: { $in: brandIds } }).toArray() : [],
      Supplier.find({ status: 'approved' }).select('_id company_name brand_name gst_number pan_number phone phone_code').lean()
    ]);

    const templateMap = Object.fromEntries(templates.map(t => [t._id.toString(), t.name]));
    const skuMap = Object.fromEntries(skus.map(s => [s._id.toString(), s]));
    const brandMap = Object.fromEntries(brands.map(b => [b._id.toString(), b.name || b.brand_name]));

    // Query prices
    const priceDocs = await rawDb.collection('pc_product_sku_prices').find({ sku_id: { $in: skuIds } }).toArray();
    const priceMap = {};
    for (const p of priceDocs) {
      const sId = p.sku_id?.toString();
      if (!priceMap[sId] || (clusterId && p.cluster_id?.toString() === clusterId?.toString())) {
        priceMap[sId] = p.price;
      }
    }

    const inwardQty = procurement.inward_quantity || 1;

    let panels = null;
    let inverters = null;
    const bosItems = [];

    for (const bc of kit.base_components || []) {
      const tName = templateMap[bc.template_id?.toString()] || '';
      const isPanel = tName.toLowerCase().includes('panel') || tName.toLowerCase().includes('module');
      const isInverter = tName.toLowerCase().includes('inverter');
      const skuObj = skuMap[bc.sku_id?.toString()] || {};
      const brand = brandMap[bc.brand_id?.toString()] || 'SolarKits OEM';
      const unitCost = priceMap[bc.sku_id?.toString()] || 0;
      const qtyPerKit = bc.quantity || 1;
      const totalQty = qtyPerKit * inwardQty;
      const subtotal = Math.round(unitCost * totalQty * 100) / 100;

      if (isPanel && !panels) {
        const pGstRate = 12; // Statutory GST on Solar PV Panels (HSN 85414011)
        const pGstAmount = Math.round(subtotal * (pGstRate / 100) * 100) / 100;
        panels = {
          group_type: 'panel',
          group_title: `Solar PV Modules (${totalQty} Pcs)`,
          sku_id: bc.sku_id,
          sku_code: skuObj.sku_code || 'PV-MODULE',
          brand_name: brand,
          item_name: `${brand} 500W Bifacial Solar Panel`,
          quantity_per_kit: qtyPerKit,
          total_quantity: totalQty,
          unit_cost_price: unitCost,
          subtotal_amount: subtotal,
          gst_rate_percent: pGstRate,
          gst_amount: pGstAmount,
          total_payable: Math.round((subtotal + pGstAmount) * 100) / 100
        };
      } else if (isInverter && !inverters) {
        const iGstRate = 18; // Statutory GST on Solar Inverters (HSN 85044090)
        const iGstAmount = Math.round(subtotal * (iGstRate / 100) * 100) / 100;
        inverters = {
          group_type: 'inverter',
          group_title: `Solar Inverters (${totalQty} Pcs)`,
          sku_id: bc.sku_id,
          sku_code: skuObj.sku_code || 'INV-1KW',
          brand_name: brand,
          item_name: `${brand} 1kW Solar Inverter`,
          quantity_per_kit: qtyPerKit,
          total_quantity: totalQty,
          unit_cost_price: unitCost,
          subtotal_amount: subtotal,
          gst_rate_percent: iGstRate,
          gst_amount: iGstAmount,
          total_payable: Math.round((subtotal + iGstAmount) * 100) / 100
        };
      }
    }

    let totalBosUnitCost = 0;
    for (const bk of kit.bos_kits || []) {
      const skuObj = skuMap[bk.sku_id?.toString()] || {};
      const brand = brandMap[bk.brand_id?.toString()] || 'SolarKits OEM';
      const unitCost = priceMap[bk.sku_id?.toString()] || 0;
      const qtyPerKit = bk.quantity || 1;
      const totalQty = qtyPerKit * inwardQty;
      const lineUnitCost = Math.round(unitCost * qtyPerKit * 100) / 100;
      const subtotal = Math.round(unitCost * totalQty * 100) / 100;
      totalBosUnitCost += lineUnitCost;

      bosItems.push({
        group_type: 'bos',
        item_name: bk.name || skuObj.sku_code || 'BOS Component',
        sku_id: bk.sku_id,
        sku_code: skuObj.sku_code || '',
        brand_name: brand,
        quantity_per_kit: qtyPerKit,
        total_quantity: totalQty,
        unit_cost_price: unitCost,
        subtotal_amount: subtotal
      });
    }

    const totalBosSubtotal = Math.round(totalBosUnitCost * inwardQty * 100) / 100;
    const bosGstRate = 18; // Statutory GST on BOS Electrical / Cables / Switchgear / Hardware
    const bosGstAmount = Math.round(totalBosSubtotal * (bosGstRate / 100) * 100) / 100;
    const bosGroup = {
      group_type: 'bos',
      group_title: `BOS Balance of System (${bosItems.length} Electrical & Safety Items)`,
      item_name: 'BOS Kits & Electrical Protection Bundle',
      quantity_per_kit: 1,
      total_quantity: inwardQty,
      unit_cost_price: totalBosUnitCost,
      subtotal_amount: totalBosSubtotal,
      gst_rate_percent: bosGstRate,
      gst_amount: bosGstAmount,
      total_payable: Math.round((totalBosSubtotal + bosGstAmount) * 100) / 100,
      items: bosItems
    };

    const totalBaseCost = (panels?.subtotal_amount || 0) + (inverters?.subtotal_amount || 0) + totalBosSubtotal;
    const totalGstAmount = Math.round(((panels?.gst_amount || 0) + (inverters?.gst_amount || 0) + bosGstAmount) * 100) / 100;
    const totalPayable = Math.round((totalBaseCost + totalGstAmount) * 100) / 100;
    const effectiveGstRate = totalBaseCost > 0 ? Math.round((totalGstAmount / totalBaseCost) * 10000) / 100 : 14.22;

    return res.status(200).json({
      success: true,
      data: {
        procurement: {
          _id: procurement._id,
          procurement_number: procurement.procurement_number,
          grn_number: procurement.grn_number,
          kit_type: procurement.kit_type,
          inward_quantity: inwardQty,
          warehouse_name: resolveWarehouseName({ warehouse_code: procurement.warehouse_code, warehouse_name: procurement.warehouse_name }),
          warehouse_code: procurement.warehouse_code,
          vendor_name: procurement.vendor_name,
          invoice_challan_number: procurement.invoice_challan_number,
          supplier_payments: procurement.supplier_payments || []
        },
        breakdown: {
          panels,
          inverters,
          bos: bosGroup
        },
        commercials: {
          total_base_cost: totalBaseCost,
          gst_rate_percent: effectiveGstRate,
          gst_amount: totalGstAmount,
          total_payable_amount: totalPayable,
          unit_cost_per_kit: Math.round((totalBaseCost / inwardQty) * 100) / 100
        },
        approved_suppliers: suppliers
      }
    });
  } catch (err) {
    console.error('❌ Error getting component breakdown:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. STAGE 2: Accounts Manager records procurement payment (Multi-Supplier & Component-Wise)
 * POST /trial-kits/procurement/:id/record-payment
 */
exports.record_payment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplier_payments,
      component_breakdown,
      // Legacy fallback single payment fields:
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

    const payerName = req.user?.name || req.user?.email || 'Accounts Manager';

    if (Array.isArray(supplier_payments) && supplier_payments.length > 0) {
      // Multi-supplier payment processing
      let aggSubtotal = 0;
      let aggGst = 0;
      let aggTotal = 0;
      const utrList = [];

      const sanitizedPayments = supplier_payments.map((sp) => {
        const base = Math.round((Number(sp.base_amount_inr) || 0) * 100) / 100;
        const gRate = Number(sp.gst_rate_percent) !== undefined ? Number(sp.gst_rate_percent) : 13.8;
        const gst = Math.round(base * (gRate / 100) * 100) / 100;
        const tot = Math.round((base + gst) * 100) / 100;
        const utr = (sp.transaction_utr_no || '').trim();

        if (utr) utrList.push(`${sp.group_type?.toUpperCase() || 'GRP'}: ${utr}`);

        aggSubtotal += base;
        aggGst += gst;
        aggTotal += tot;

        return {
          group_type: sp.group_type || 'other',
          group_title: sp.group_title || '',
          supplier_id: sp.supplier_id && mongoose.Types.ObjectId.isValid(sp.supplier_id) ? sp.supplier_id : null,
          supplier_name: sp.supplier_name ? sp.supplier_name.trim() : 'Approved Vendor',
          supplier_brand: sp.supplier_brand ? sp.supplier_brand.trim() : '',
          supplier_gst: sp.supplier_gst ? sp.supplier_gst.trim() : '',
          supplier_phone: sp.supplier_phone ? sp.supplier_phone.trim() : '',
          base_amount_inr: base,
          gst_rate_percent: gRate,
          gst_amount_inr: gst,
          total_payable_inr: tot,
          payment_mode: sp.payment_mode || 'bank_transfer_neft_rtgs',
          transaction_utr_no: utr || `UTR-TK-${Date.now()}`,
          payment_date: sp.payment_date ? new Date(sp.payment_date) : new Date(),
          company_bank_account: sp.company_bank_account || 'HDFC Bank - Current A/C (Solarkits Corp)',
          vendor_bank_account: sp.vendor_bank_account || '',
          payment_receipt_url: sp.payment_receipt_url || '',
          remarks: sp.remarks || '',
          paid_by: {
            user_id: req.user?.id || req.user?._id || null,
            name: payerName,
            email: req.user?.email || ''
          },
          paid_at: new Date()
        };
      });

      procurement.supplier_payments = sanitizedPayments;
      if (Array.isArray(component_breakdown) && component_breakdown.length > 0) {
        procurement.component_breakdown = component_breakdown;
      }

      procurement.subtotal_amount_inr = aggSubtotal;
      procurement.gst_amount_inr = aggGst;
      procurement.total_payable_amount_inr = aggTotal;
      procurement.gst_rate_percent = gst_rate_percent || 13.8;
      procurement.unit_cost_price_inr = procurement.inward_quantity > 0
        ? Math.round((aggSubtotal / procurement.inward_quantity) * 100) / 100
        : aggSubtotal;

      procurement.payment_details = {
        payment_mode: sanitizedPayments[0]?.payment_mode || 'bank_transfer_neft_rtgs',
        transaction_utr_no: utrList.join(' | ') || `UTR-TK-${Date.now()}`,
        payment_date: sanitizedPayments[0]?.payment_date || new Date(),
        company_bank_account: sanitizedPayments[0]?.company_bank_account || 'HDFC Bank - Current A/C (Solarkits Corp)',
        vendor_bank_account: sanitizedPayments[0]?.vendor_bank_account || '',
        payment_receipt_url: sanitizedPayments[0]?.payment_receipt_url || '',
        accounts_remarks: accounts_remarks || `Multi-supplier payment recorded across ${sanitizedPayments.length} suppliers.`,
        paid_by: {
          user_id: req.user?.id || req.user?._id || null,
          name: payerName,
          email: req.user?.email || ''
        },
        paid_at: new Date()
      };
    } else {
      // Legacy single payment fallback
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

      procurement.unit_cost_price_inr = unitPrice;
      procurement.subtotal_amount_inr = subtotal;
      procurement.gst_rate_percent = gstRate;
      procurement.gst_amount_inr = gstAmount;
      procurement.total_payable_amount_inr = totalPayable;

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
    }

    procurement.payment_status = 'payment_recorded';
    procurement.admin_approval_status = 'pending_approval';
    procurement.status = 'payment_recorded';

    await procurement.save();

    return res.status(200).json({
      success: true,
      message: `Payment of ₹${procurement.total_payable_amount_inr.toLocaleString('en-IN')} recorded successfully. Submitted for Admin Approval.`,
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
