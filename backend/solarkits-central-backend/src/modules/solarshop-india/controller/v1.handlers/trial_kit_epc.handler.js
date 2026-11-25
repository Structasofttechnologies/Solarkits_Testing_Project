const mongoose = require('mongoose');
const {
  TrialKitInventory,
  TrialKitStockHistory,
  TrialKitOrder,
  EpcAccount,
  EpcOrder
} = require('../../../admin-panel/models/india_solarshop_db');
const { WarehouseComboKit: ComboKit, SolarKit, Brand } = require('../../../admin-panel/models/core_db');
const { CompanyWarehouse } = require('../../../warehouse-panel/models/company_warehouse_db');

/**
 * 1. GET TRIAL KIT AVAILABILITY FOR LOGGED-IN EPC (Section 3 & 4)
 * Strict One Trial Kit Per EPC GST Number Rule
 * Dynamic Configured Combo Kits from pc_comobo_kit in Card Format
 */
exports.get_availability = async (req, res) => {
  try {
    const accountId = req.user?.account_id || req.user?.id || req.user?._id;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const epc = await EpcAccount.findById(accountId).lean();
    if (!epc) {
      return res.status(404).json({ success: false, message: 'EPC account not found.' });
    }

    let gstin = (epc.gstin || epc.registered_whatsapp || '').trim().toUpperCase();
    if (!gstin && epc.company_id) {
      try {
        const rawDb = mongoose.connection.db;
        if (rawDb) {
          const cGst = await rawDb.collection('epc_company_gst').findOne({ company_id: epc.company_id, deleted_at: null });
          if (cGst?.gst_number) gstin = cGst.gst_number.trim().toUpperCase();
        }
      } catch (e) {
        console.warn('Error resolving company GST in get_availability:', e.message);
      }
    }

    // Query active configured combo kits
    const configuredKits = await ComboKit.find({ deleted_at: null, is_custom: false })
      .populate('solar_kit_id', 'name capacity')
      .populate('base_components.brand_id', 'brand_name name logo')
      .populate('base_components.brand_ids', 'brand_name name logo')
      .populate('bos_kits.brand_id', 'brand_name name logo')
      .populate('bos_kits.brand_ids', 'brand_name name logo')
      .sort({ capacity: 1, name: 1 })
      .lean();

    // Query all orders matching this GSTIN or EPC Account across all accounts
    let orderedKitIds = [];
    let orderedKitTypes = [];
    const queryConds = [{ epc_id: epc._id }];
    if (gstin) {
      queryConds.push({ gst_number: { $regex: new RegExp(`^${gstin}$`, 'i') } });
    }
    const activeOrders = await TrialKitOrder.find({
      $or: queryConds,
      order_status: { $nin: ['cancelled'] }
    }).select('combo_kit_id kit_type order_status order_number').lean();

    orderedKitIds = activeOrders.map(o => o.combo_kit_id?.toString()).filter(Boolean);
    orderedKitTypes = activeOrders.map(o => (o.kit_type || '').replace(/\s*\(trial.*?\)/i, '').trim().toLowerCase());

    // Get aggregated stock across warehouses for each combo kit / kit type
    const allInventories = await TrialKitInventory.find({ status: 'active' }).lean();

    // Evaluate availability and restriction status for each configured combo kit
    const kits = configuredKits.map(kit => {
      const kitIdStr = kit._id.toString();
      const isAlreadyOrdered =
        orderedKitIds.includes(kitIdStr) ||
        orderedKitTypes.includes((kit.name || '').trim().toLowerCase()) ||
        orderedKitTypes.includes(kit.name);

      // Extract brands
      const brandSet = new Set();
      kit.base_components?.forEach(b => {
        if (b.brand_id?.brand_name) brandSet.add(b.brand_id.brand_name);
        else if (b.brand_id?.name) brandSet.add(b.brand_id.name);
        b.brand_ids?.forEach(bi => {
          if (bi?.brand_name) brandSet.add(bi.brand_name);
          else if (bi?.name) brandSet.add(bi.name);
        });
      });
      kit.bos_kits?.forEach(b => {
        if (b.brand_id?.brand_name) brandSet.add(b.brand_id.brand_name);
        else if (b.brand_id?.name) brandSet.add(b.brand_id.name);
        b.brand_ids?.forEach(bi => {
          if (bi?.brand_name) brandSet.add(bi.brand_name);
          else if (bi?.name) brandSet.add(bi.name);
        });
      });
      const brandsList = Array.from(brandSet);

      // Find stock allocations for this kit
      const matchingInvs = allInventories.filter(inv =>
        (inv.combo_kit_id && inv.combo_kit_id.toString() === kitIdStr) ||
        (inv.kit_type === kit.name)
      );

      const totalAvailable = matchingInvs.reduce((acc, curr) => acc + (curr.available_stock || 0), 0);
      const eligibleWarehouses = matchingInvs
        .filter(inv => inv.available_stock > 0)
        .map(inv => ({
          warehouse_id: inv.warehouse_id,
          warehouse_name: inv.warehouse_name,
          available_stock: inv.available_stock
        }));

      const hasStock = totalAvailable > 0;

      let status = 'out_of_stock';
      let status_label = 'Out of Stock';
      let status_message = 'OUT OF STOCK — Trial kit unavailable – please contact your BDE';
      let is_orderable = false;

      if (isAlreadyOrdered) {
        status = 'already_ordered';
        status_label = 'Already Ordered';
        status_message = 'Already ordered under your GSTIN. One trial kit per GST number restriction applies.';
        is_orderable = false;
      } else if (hasStock) {
        status = 'available';
        status_label = 'Available';
        status_message = 'In Stock — Ready for trial dispatch';
        is_orderable = true;
      }

      return {
        _id: kit._id,
        combo_kit_id: kit._id,
        kit_type: kit.name,
        name: kit.name,
        capacity: kit.capacity ? `${kit.capacity} kW` : `${kit.capacity || 0} kW`,
        kit_image: kit.kit_image,
        blueprint_name: kit.solar_kit_id?.name || `${kit.capacity || 0} kW Residential Solar Kit`,
        description: kit.description || `${kit.name} — Benchmarking & testing kit`,
        configured_brands: brandsList,
        trial_moq: kit.trial_kit_quantity || 1,
        trial_limit: kit.trial_kit_max_orders_per_buyer || 1,
        status,
        status_label,
        status_message,
        is_orderable,
        available_stock: totalAvailable,
        eligible_warehouses: eligibleWarehouses
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        epc_gstin: gstin || null,
        kits
      }
    });
  } catch (err) {
    console.error('❌ Error checking trial kit availability:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. PLACE TRIAL KIT ORDER (Section 1, 3 & 4)
 * Mandatory:
 * - Atomic stock deduction (must not allow order without stock confirmation).
 * - Strict one trial kit per EPC GST number.
 */
exports.place_order = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const accountId = req.user?.account_id || req.user?.id || req.user?._id;
    const { combo_kit_id, kit_type, warehouse_id, shipping_address } = req.body;

    if (!kit_type && !combo_kit_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Kit selection is required.' });
    }

    const epc = await EpcAccount.findById(accountId).session(session);
    if (!epc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'EPC account not found.' });
    }

    let resolvedKitType = kit_type;
    let comboKitDoc = null;
    if (combo_kit_id) {
      comboKitDoc = await ComboKit.findById(combo_kit_id).session(session);
      if (comboKitDoc) resolvedKitType = comboKitDoc.name;
    }

    const gstin = (epc.gstin || shipping_address?.gst_number || '').trim().toUpperCase();
    if (!gstin) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'A valid GST number is required to order a trial kit. Please update your profile or provide GSTIN.'
      });
    }

    // ── Restriction Check: One Trial Kit per GST Number (Section 4) ────────────
    const existingOrderQuery = {
      gst_number: gstin,
      $or: [
        { order_status: { $in: ['confirmed', 'dispatched', 'delivered'] } },
        { order_status: 'cancelled', 'cancellation.restriction_released': { $ne: true } }
      ]
    };

    if (combo_kit_id) {
      existingOrderQuery.$and = [
        {
          $or: [
            { combo_kit_id: combo_kit_id },
            { kit_type: resolvedKitType }
          ]
        }
      ];
    } else {
      existingOrderQuery.kit_type = resolvedKitType;
    }

    const existingOrder = await TrialKitOrder.findOne(existingOrderQuery).session(session);

    if (existingOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `GST number ${gstin} has already ordered a ${resolvedKitType}. Only one trial kit per kit type is permitted per GST number.`
      });
    }

    // ── Warehouse Stock Selection & Confirmation (Section 1 & 3) ──────────────
    let targetInventory = null;

    const invMatch = { available_stock: { $gte: 1 } };
    if (combo_kit_id) {
      invMatch.$or = [
        { combo_kit_id: combo_kit_id },
        { kit_type: resolvedKitType }
      ];
    } else {
      invMatch.kit_type = resolvedKitType;
    }

    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      invMatch.warehouse_id = warehouse_id;
      targetInventory = await TrialKitInventory.findOne(invMatch).session(session);
    } else {
      targetInventory = await TrialKitInventory.findOne(invMatch).sort({ available_stock: -1 }).session(session);
    }

    if (!targetInventory) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Trial kit unavailable – ${resolvedKitType} is out of stock. Please contact your BDE.`
      });
    }

    // ── Atomic Stock Deduction & Reservation ───────────────────────────────────
    const prevStock = targetInventory.available_stock;
    targetInventory.available_stock -= 1;
    targetInventory.reserved_stock += 1;
    targetInventory.ordered_quantity += 1;
    if (combo_kit_id && !targetInventory.combo_kit_id) {
      targetInventory.combo_kit_id = combo_kit_id;
    }
    await targetInventory.save({ session });

    // ── Generate Unique Order Number ───────────────────────────────────────────
    const orderCount = await TrialKitOrder.countDocuments().session(session);
    const orderSeq = String(orderCount + 1).padStart(6, '0');
    const orderNumber = `TK-${new Date().getFullYear()}-${orderSeq}`;

    // ── Create Trial Kit Order ─────────────────────────────────────────────────
    const finalAddress = {
      address: shipping_address?.address || epc.address || '',
      state: shipping_address?.state || epc.state_name || '',
      district: shipping_address?.district || epc.district_name || '',
      pincode: shipping_address?.pincode || epc.pincode || '',
      contact_name: shipping_address?.contact_name || epc.name || epc.company_name || 'EPC Contact',
      phone: shipping_address?.phone || epc.registered_whatsapp || epc.phone || '',
      gst_number: gstin
    };

    const assignedBdeId = epc.assigned_bde_id || epc.onboarded_by_bde_id || null;
    let assignedBdeName = epc.assigned_bde_name || '';
    if (assignedBdeId && !assignedBdeName) {
      try {
        const BDEProfile = require('../../../admin-panel/models/india_solarshop_db/bde_profiles.schema');
        const bdeDoc = await BDEProfile.findById(assignedBdeId).lean();
        if (bdeDoc) assignedBdeName = bdeDoc.full_name || bdeDoc.name || '';
      } catch (e) {
        // Continue with empty name if lookup fails
      }
    }

    const rawIntent = req.body.future_intent || null;
    let futureIntentDoc = null;
    if (rawIntent) {
      const lQty = Number(rawIntent.loose_quantity || 0);
      const pQty = Number(rawIntent.po_quantity || 0);
      const expQty = Number(rawIntent.expected_quantity || (lQty + pQty) || 0);
      futureIntentDoc = {
        future_purchase_mode: rawIntent.future_purchase_mode || (pQty > 0 && lQty > 0 ? 'both' : (pQty > 0 ? 'bulk_po' : 'loose')),
        expected_quantity: expQty,
        loose_quantity: lQty,
        po_quantity: pQty,
        estimated_timeline: rawIntent.estimated_timeline || '',
        remarks: rawIntent.remarks || '',
        submitted_at: new Date()
      };
    }

    const newOrder = new TrialKitOrder({
      order_number: orderNumber,
      epc_id: epc._id,
      epc_name: epc.name || epc.company_name || 'EPC Customer',
      epc_company_name: epc.company_name || epc.name || '',
      gst_number: gstin,
      combo_kit_id: combo_kit_id || null,
      kit_type: resolvedKitType,
      warehouse_id: targetInventory.warehouse_id,
      warehouse_name: targetInventory.warehouse_name,
      bde_id: assignedBdeId,
      bde_name: assignedBdeName,
      order_status: 'confirmed',
      shipping_address: finalAddress,
      future_intent: futureIntentDoc,
      funnel: {
        current_stage: 'trial_kit_delivered',
        stage_history: [{
          stage: 'trial_kit_delivered',
          entered_at: new Date(),
          remarks: 'Trial kit order placed and confirmed.'
        }]
      }
    });

    await newOrder.save({ session });

    // Record Stock History Audit Log
    await TrialKitStockHistory.create([{
      trial_kit_inventory_id: targetInventory._id,
      combo_kit_id: combo_kit_id || null,
      kit_type: resolvedKitType,
      warehouse_id: targetInventory.warehouse_id,
      warehouse_name: targetInventory.warehouse_name,
      adjustment_type: 'order_deduction',
      quantity_change: -1,
      previous_available_stock: prevStock,
      new_available_stock: targetInventory.available_stock,
      user_name: epc.name || epc.company_name || 'EPC Customer',
      user_id: epc._id,
      user_role: 'epc',
      remarks: `Stock deducted for Trial Kit Order #${orderNumber}`
    }], { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: `Trial kit order #${orderNumber} placed successfully. Stock allocated from ${targetInventory.warehouse_name}.`,
      data: newOrder
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error placing trial kit order:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. GET OWN TRIAL KIT ORDERS (EPC Login)
 */
exports.get_my_orders = async (req, res) => {
  try {
    const accountId = req.user?.account_id || req.user?.id || req.user?._id;
    const orders = await TrialKitOrder.find({ epc_id: accountId })
      .populate('warehouse_id', 'warehouse_name warehouse_code')
      .populate('bde_id', 'full_name mobile')
      .sort({ order_date: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('❌ Error fetching EPC trial kit orders:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. SUBMIT TRIAL KIT FEEDBACK (Section 5)
 * Exactly 8 Fields Specified in Document:
 * 1. Trial kit received confirmation
 * 2. Product quality rating
 * 3. Installation/testing experience
 * 4. Inverter and module performance feedback
 * 5. Any technical issue or complaint
 * 6. Future purchase requirement
 * 7. Expected monthly kit purchase quantity
 * 8. Next follow-up date
 */
exports.submit_feedback = async (req, res) => {
  try {
    const accountId = req.user?.account_id || req.user?.id || req.user?._id;
    const { id } = req.params;
    const {
      trial_kit_received_confirmation,
      product_quality_rating,
      installation_testing_experience,
      inverter_module_performance,
      technical_issue_complaint,
      future_purchase_requirement,
      expected_monthly_kit_purchase_quantity,
      next_followup_date
    } = req.body;

    let order = await TrialKitOrder.findOne({ _id: id, epc_id: accountId });
    let epcOrder = null;

    if (!order) {
      epcOrder = await EpcOrder.findOne({ _id: id, epc_id: accountId });
      if (epcOrder) {
        order = await TrialKitOrder.findOne({ order_number: epcOrder.order_number });
      }
    }

    if (!order && !epcOrder) {
      return res.status(404).json({ success: false, message: 'Trial kit order not found.' });
    }

    const orderStatus = order?.order_status || epcOrder?.order_status || epcOrder?.status;
    if (orderStatus !== 'delivered' && orderStatus !== 'completed') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted after delivery confirmation.' });
    }

    const feedbackPayload = {
      feedback_status: 'submitted',
      trial_kit_received_confirmation: Boolean(trial_kit_received_confirmation),
      product_quality_rating: Number(product_quality_rating) || 5,
      installation_testing_experience: installation_testing_experience || '',
      inverter_module_performance: inverter_module_performance || '',
      technical_issue_complaint: technical_issue_complaint || '',
      future_purchase_requirement: future_purchase_requirement || '',
      expected_monthly_kit_purchase_quantity: Number(expected_monthly_kit_purchase_quantity) || 0,
      next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
      submitted_at: new Date()
    };

    if (order) {
      order.feedback = feedbackPayload;
      if (order.funnel) {
        order.funnel.current_stage = 'feedback_received';
        order.funnel.stage_updated_at = new Date();
      }
      await order.save();
    }

    if (epcOrder) {
      epcOrder.trial_feedback = feedbackPayload;
      await epcOrder.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback successfully submitted. Thank you for testing SolarKits Trial Kit!',
      data: order || epcOrder
    });
  } catch (err) {
    console.error('❌ Error submitting feedback:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
