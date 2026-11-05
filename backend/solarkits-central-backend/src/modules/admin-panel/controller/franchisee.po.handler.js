/**
 * franchisee.po.handler.js
 *
 * HTTP controller for the Franchisee PO lifecycle.
 * Wraps franchisee.po.service.js with request parsing and error handling.
 *
 * Permission code: FPO_ORDER
 * Prefix: /admin-api/franchisee/po
 */

const mongoose = require('mongoose');
const { FpoOrder } = require('../models/india_solarshop_db');
const {
  createPoDraft,
  submitPo,
  approvePo,
  rejectPo,
  confirmPayment,
  dispatchPo,
  deliverPo,
  cancelPo,
  returnItems,
  advancePoStage,
  assignVehicleToPo,
} = require('../services/franchisee.po.service');

// ── LIST ──────────────────────────────────────────────────────────────────────
const list_po_orders = async (req, res) => {
  try {
    const { franchisee_id, status, plan_id, state_id, district_id, from_date, to_date, page = 1, limit = 20, include_children } = req.query;
    const query = { deleted_at: null };

    if (!include_children || include_children === 'false') {
      query.parent_po_id = null;
    }

    if (franchisee_id) query.franchisee_id = franchisee_id;
    if (status) query.status = { $in: status.split(',') };
    if (plan_id) query.plan_id = plan_id;
    if (state_id) query.state_id = state_id;
    if (district_id) query.district_id = district_id;
    if (from_date || to_date) {
      query.created_at = {};
      if (from_date) query.created_at.$gte = new Date(from_date);
      if (to_date) query.created_at.$lte = new Date(to_date);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      FpoOrder.find(query)
        .populate('franchisee_id', 'business_name mobile email contact_person')
        .populate('plan_id', 'name territory_level')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FpoOrder.countDocuments(query),
    ]);

    // Enrich order items with complete combo kit details & images
    await enrichOrdersWithKits(orders);

    // Fetch and link child repeat orders for all parent POs
    const poIds = orders.map((o) => o._id);
    if (poIds.length > 0) {
      const childOrders = await FpoOrder.find({
        parent_po_id: { $in: poIds },
        deleted_at: null,
      })
        .populate('franchisee_id', 'business_name name mobile email contact_person')
        .populate('epc_id', 'name company_name email whatsapp gstin')
        .sort({ created_at: -1 })
        .lean();

      if (childOrders.length > 0) {
        await enrichOrdersWithKits(childOrders);
      }

      const childMap = new Map();
      childOrders.forEach((co) => {
        const pId = co.parent_po_id?.toString();
        if (!childMap.has(pId)) childMap.set(pId, []);
        childMap.get(pId).push(co);
      });

      orders.forEach((o) => {
        o.linked_repeat_orders = childMap.get(o._id.toString()) || [];
      });
    }

    return res.json({
      status: 'success',
      data: orders,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('[po.handler] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// Helper: Robust numeric kW parser for capacity
const parseKw = (val, name = '') => {
  if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
  if (val != null) {
    const s = String(val).replace(/kw/ig, '').trim();
    const match = s.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const p = parseFloat(match[1]);
      if (!isNaN(p) && p > 0) return p;
    }
  }
  if (name) {
    const kwMatch = String(name).match(/(\d+(?:\.\d+)?)\s*(?:k\.?\s*w\.?|kw|kilowatt)/i);
    if (kwMatch) {
      const p = parseFloat(kwMatch[1]);
      if (!isNaN(p) && p > 0) return p;
    }
    const anyMatch = String(name).match(/(\d+(?:\.\d+)?)/);
    if (anyMatch) {
      const p = parseFloat(anyMatch[1]);
      if (!isNaN(p) && p > 0) return p;
    }
  }
  return 3;
};

// Helper: Enrich FPO Order items with ComboKit specifications, hardware & images
const enrichOrdersWithKits = async (orders) => {
  try {
    if (!orders || orders.length === 0) return orders;
    const kitIds = [];
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.kit_id) {
          try {
            kitIds.push(new mongoose.Types.ObjectId(item.kit_id.toString()));
          } catch (_) {
            kitIds.push(item.kit_id);
          }
        }
      });
    });

    if (kitIds.length === 0) return orders;

    const rawDb = mongoose.connection.db;
    if (!rawDb) return orders;

    // Fetch from MongoDB collections (checking pc_comobo_kit and pc_combo_kits)
    let kits = await rawDb.collection('pc_comobo_kit').find({ _id: { $in: kitIds } }).toArray().catch(() => []);
    if (!kits || kits.length === 0) {
      kits = await rawDb.collection('pc_combo_kits').find({ _id: { $in: kitIds } }).toArray().catch(() => []);
    }

    const kitMap = new Map();
    const brandIds = [];
    const templateIds = [];

    kits.forEach(k => {
      kitMap.set(k._id.toString(), k);
      if (k.brand_id) brandIds.push(new mongoose.Types.ObjectId(k.brand_id.toString()));
      (k.base_components || []).forEach(b => {
        if (b.template_id) templateIds.push(new mongoose.Types.ObjectId(b.template_id.toString()));
      });
    });

    // Fetch brands and product templates for rich specification breakdown
    const [brands, templates] = await Promise.all([
      brandIds.length > 0
        ? rawDb.collection('brands').find({ _id: { $in: brandIds } }).toArray().catch(() => [])
        : [],
      templateIds.length > 0
        ? rawDb.collection('pc_product_templates').find({ _id: { $in: templateIds } }).toArray().catch(() => [])
        : []
    ]);

    const brandMap = new Map();
    brands.forEach(b => brandMap.set(b._id.toString(), b));

    const templateMap = new Map();
    templates.forEach(t => templateMap.set(t._id.toString(), t.name));

    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.kit_id && kitMap.has(item.kit_id.toString())) {
          const k = kitMap.get(item.kit_id.toString());
          const brand = k.brand_id ? brandMap.get(k.brand_id.toString()) : null;

          const parsedCapacity = parseKw(k.capacity || k.capacity_kw || item.capacity, k.name || item.item_name);

          item.kit_image = k.kit_image || (k.images && k.images[0]) || null;
          item.capacity = parsedCapacity;
          item.capacity_kw = parsedCapacity;
          item.description = k.description || 'High-Efficiency Solar System with Single-Phase String Inverter and BOS Kit';
          item.brand_name = brand?.brand_name || 'Tata Power Solar';
          item.brand_logo = brand?.logo || null;
          item.inverter_mode = k.inverter_mode || 'single';
          item.total_system_capacity_kw = parsedCapacity * (Number(item.quantity) || 1);

          // Resolve hardware components with human-readable template names
          item.resolved_components = (k.base_components || []).map(b => ({
            name: templateMap.get(b.template_id?.toString()) || 'Component',
            quantity_per_kit: b.quantity || 1,
            total_quantity: (b.quantity || 1) * (item.quantity || 1),
            spec: (templateMap.get(b.template_id?.toString()) || '').toLowerCase().includes('panel')
              ? 'Mono PERC High-Efficiency Solar PV Modules'
              : 'On-Grid String Inverter with MPPT'
          }));

          item.resolved_bos_kits = (k.bos_kits || []).map(b => ({
            name: b.name || 'BOS Protection Kit',
            quantity_per_kit: b.quantity || 1,
            total_quantity: (b.quantity || 1) * (item.quantity || 1),
            image: b.image || null
          }));
        } else {
          // Fallback enrichment for kits not matching kitMap
          const parsedCapacity = parseKw(item.capacity || item.capacity_kw, item.item_name);
          item.capacity = parsedCapacity;
          item.capacity_kw = parsedCapacity;
          if (!item.brand_name) item.brand_name = 'Tata Power Solar';
          item.total_system_capacity_kw = parsedCapacity * (Number(item.quantity) || 1);
        }
      });
    });

    // Enrich with dynamic franchisee commission from Franchisee Commission Settings
    try {
      const { resolveVariationCommission } = require('../services/franchisee.commission.service');
      for (const o of orders) {
        const resellerId = o.franchisee_id?._id || o.franchisee_id;
        const primaryItem = o.items?.[0];
        const bookedQty = o.total_booked_quantity || o.total_quantity || primaryItem?.quantity || 1;
        const kitId = primaryItem?.kit_id || primaryItem?.combo_kit_id;

        let commPaise = o.total_commission_paise || 0;

        // If order doesn't have total_commission_paise stored or it is 0, resolve from Franchisee Commission Settings
        if ((!commPaise || commPaise === 0) && resellerId && kitId) {
          const varCommPaise = await resolveVariationCommission({
            reseller_id: resellerId,
            combo_kit_id: kitId,
            quantity: bookedQty,
            order_type: 'po',
          });
          if (varCommPaise !== null && varCommPaise >= 0) {
            commPaise = varCommPaise;
          }
        }

        o.franchisee_commission_paise = commPaise;
        o.franchisee_commission_amount = commPaise > 0 ? (commPaise / 100) : 0;
        o.commission_per_kit = (commPaise > 0 && bookedQty > 0) ? Math.round((commPaise / 100) / bookedQty) : 0;
        o.commission_tier_quantity = bookedQty;
      }
    } catch (commErr) {
      console.warn('[po.handler] commission enrichment error:', commErr.message);
    }

    return orders;
  } catch (err) {
    console.warn('[po.handler] enrichOrdersWithKits error:', err.message);
    return orders;
  }
};

// ── GET SINGLE ────────────────────────────────────────────────────────────────
const get_po_order = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ status: 'error', message: 'Invalid PO id' });

    const order = await FpoOrder.findOne({ _id: id, deleted_at: null })
      .populate('franchisee_id', 'business_name mobile email address contact_person')
      .populate('plan_id', 'name territory_level')
      .lean();

    if (!order) return res.status(404).json({ status: 'error', message: 'PO not found' });

    await enrichOrdersWithKits([order]);

    const childOrders = await FpoOrder.find({
      parent_po_id: order._id,
      deleted_at: null,
    })
      .populate('franchisee_id', 'business_name name mobile email contact_person')
      .populate('epc_id', 'name company_name email whatsapp gstin')
      .sort({ created_at: -1 })
      .lean();
    if (childOrders && childOrders.length > 0) {
      await enrichOrdersWithKits(childOrders);
    }
    order.linked_repeat_orders = childOrders || [];

    return res.json({ status: 'success', data: order });
  } catch (error) {
    console.error('[po.handler] get error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── CREATE DRAFT ──────────────────────────────────────────────────────────────
const create_draft = async (req, res) => {
  try {
    const { franchisee_id, items, idempotency_key, payment_terms } = req.body;
    if (!franchisee_id) return res.status(400).json({ status: 'error', message: 'franchisee_id is required' });

    const result = await createPoDraft({
      franchisee_id,
      items,
      idempotency_key,
      payment_terms,
      actor_id: req.user?.id,
      req,
    });

    if (result.already_exists) {
      return res.status(200).json({ status: 'success', message: 'PO draft already exists (idempotent)', data: result.order });
    }
    return res.status(201).json({ status: 'success', message: `Draft PO ${result.order.po_number} created`, data: result.order });
  } catch (error) {
    console.error('[po.handler] create_draft error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── SUBMIT ────────────────────────────────────────────────────────────────────
const submit_po = async (req, res) => {
  try {
    const { po_id, franchisee_id } = req.body;
    if (!po_id) return res.status(400).json({ status: 'error', message: 'po_id is required' });

    const order = await submitPo({ po_id, franchisee_id, actor_id: req.user?.id, req });
    return res.json({ status: 'success', message: `PO ${order.po_number} submitted`, data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] submit error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── APPROVE ───────────────────────────────────────────────────────────────────
const approve_po = async (req, res) => {
  try {
    const { po_id, notes } = req.body;
    if (!po_id) return res.status(400).json({ status: 'error', message: 'po_id is required' });

    const order = await approvePo({ po_id, admin_id: req.user?.id, notes, req });
    return res.json({ status: 'success', message: `PO approved`, data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] approve error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── REJECT ────────────────────────────────────────────────────────────────────
const reject_po = async (req, res) => {
  try {
    const { po_id, reason } = req.body;
    if (!po_id || !reason) return res.status(400).json({ status: 'error', message: 'po_id and reason are required' });

    const order = await rejectPo({ po_id, admin_id: req.user?.id, reason, req });
    return res.json({ status: 'success', message: `PO rejected`, data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] reject error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── CONFIRM PAYMENT ───────────────────────────────────────────────────────────
const confirm_payment = async (req, res) => {
  try {
    const po_id = req.body.po_id || req.body.order_id;
    const { payment_reference, razorpay_payment_id, milestone_number } = req.body;
    if (!po_id) return res.status(400).json({ status: 'error', message: 'po_id or order_id is required' });

    const order = await confirmPayment({ po_id, payment_reference, razorpay_payment_id, milestone_number, admin_id: req.user?.id, req });
    return res.json({ status: 'success', message: 'Payment confirmed', data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] confirm_payment error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── DISPATCH ──────────────────────────────────────────────────────────────────
const dispatch_po = async (req, res) => {
  try {
    const { po_id } = req.body;
    if (!po_id) return res.status(400).json({ status: 'error', message: 'po_id is required' });

    const order = await dispatchPo({ po_id, admin_id: req.user?.id, req });
    return res.json({ status: 'success', message: 'PO dispatched', data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] dispatch error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── DELIVER ───────────────────────────────────────────────────────────────────
const deliver_po = async (req, res) => {
  try {
    const { po_id, delivered_items } = req.body;
    if (!po_id) return res.status(400).json({ status: 'error', message: 'po_id is required' });

    const order = await deliverPo({ po_id, delivered_items, admin_id: req.user?.id, req });
    return res.json({ status: 'success', message: 'PO delivered. Goal and commission updated.', data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] deliver error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── CANCEL ────────────────────────────────────────────────────────────────────
const cancel_po = async (req, res) => {
  try {
    const { po_id, reason } = req.body;
    if (!po_id || !reason) return res.status(400).json({ status: 'error', message: 'po_id and reason are required' });

    const order = await cancelPo({ po_id, reason, cancelled_by: req.user?.id, req });
    return res.json({ status: 'success', message: 'PO cancelled', data: { id: order._id, status: order.status } });
  } catch (error) {
    console.error('[po.handler] cancel error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── RETURN ITEMS ──────────────────────────────────────────────────────────────
const process_returns = async (req, res) => {
  try {
    const { po_id, return_items, reason } = req.body;
    if (!po_id || !return_items || !reason) {
      return res.status(400).json({ status: 'error', message: 'po_id, return_items, and reason are required' });
    }

    const order = await returnItems({ po_id, return_items, reason, actor_id: req.user?.id, req });
    return res.json({ status: 'success', message: 'Returns processed. Goal and commission adjusted.', data: { id: order._id } });
  } catch (error) {
    console.error('[po.handler] returns error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── LIST PENDING EPC RECEIPTS ──────────────────────────────────────────────────
/**
 * GET /admin-api/franchisee/po/pending-receipts
 * Returns all FPO orders that have at least one EPC allocation with payment_status = 'RECEIPT_SUBMITTED'
 */
const list_pending_epc_receipts = async (req, res) => {
  try {
    const { franchisee_id, page = 1, limit = 20 } = req.query;
    const query = {
      'items.epc_allocations.payment_status': 'RECEIPT_SUBMITTED',
      deleted_at: null,
    };
    if (franchisee_id) query.franchisee_id = franchisee_id;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      FpoOrder.find(query)
        .populate('franchisee_id', 'business_name mobile email')
        .populate('plan_id', 'name territory_level')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FpoOrder.countDocuments(query),
    ]);

    return res.json({
      status: 'success',
      data: orders,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('[po.handler] list_pending_epc_receipts error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADMIN: VERIFY EPC PAYMENT RECEIPT ─────────────────────────────────────────
/**
 * POST /admin-api/franchisee/po/verify-epc-receipt
 * Body: { po_id, epc_buyer_id, action: 'verify'|'reject', rejection_note? }
 * - Verifies or rejects an EPC buyer's payment receipt
 * - If all allocations become VERIFIED → auto-transitions PO to PAID
 */
const verify_epc_receipt = async (req, res) => {
  try {
    const po_id = req.body.po_id || req.body.order_id;
    const { epc_buyer_id, action = 'verify', rejection_note } = req.body;
    if (!po_id || !epc_buyer_id) {
      return res.status(400).json({ status: 'error', message: 'po_id (or order_id) and epc_buyer_id are required' });
    }

    const order = await FpoOrder.findOne({ _id: po_id, deleted_at: null });
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'PO not found' });
    }

    let updated = false;
    order.items.forEach(item => {
      (item.epc_allocations || []).forEach(alloc => {
        if (alloc.epc_buyer_id && alloc.epc_buyer_id.toString() === epc_buyer_id.toString()) {
          if (action === 'reject') {
            alloc.payment_status = 'PENDING';
            alloc.payment_notes = rejection_note || 'Receipt rejected by admin. Please re-upload.';
            alloc.payment_receipt_url = null;
          } else {
            alloc.payment_status = 'VERIFIED';
            alloc.paid_at = new Date();
            alloc.payment_notes = null;
          }
          updated = true;
        }
      });
    });

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'EPC allocation not found in this PO' });
    }

    // Auto-transition to PAID if all allocations are now VERIFIED
    if (action !== 'reject') {
      const allAllocations = order.items.flatMap(item => item.epc_allocations || []);
      const allVerified = allAllocations.length > 0 &&
        allAllocations.every(a => a.payment_status === 'VERIFIED');

      if (allVerified) {
        if (['SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'].includes(order.status)) {
          order.status = 'AWAITING_PAYMENT';
          await order.save();
        }

        if (['AWAITING_PAYMENT', 'PARTIALLY_PAID'].includes(order.status)) {
          await order.save();
          const updated_order = await confirmPayment({
            po_id: order._id,
            payment_reference: 'ADMIN_EPC_RECEIPTS_VERIFIED',
            admin_id: req.user?.id,
            req,
          });
          return res.json({
            status: 'success',
            message: 'All EPC receipts verified. PO status updated to PAID.',
            data: { id: updated_order._id, status: updated_order.status },
            all_verified: true,
          });
        }
      }
    }

    await order.save();
    return res.json({
      status: 'success',
      message: action === 'reject'
        ? 'Receipt rejected. EPC buyer will be notified to re-upload.'
        : 'EPC payment receipt verified.',
      all_verified: false,
    });
  } catch (error) {
    console.error('[po.handler] verify_epc_receipt error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// ── 8-STAGE LIFECYCLE ADVANCEMENT ─────────────────────────────────────────────
const advance_stage = async (req, res) => {
  try {
    const po_id = req.params.id || req.body.po_id;
    const stage = req.params.stage || req.body.stage;
    if (!po_id || !stage) {
      return res.status(400).json({ status: 'error', message: 'po_id and stage are required' });
    }

    const order = await advancePoStage({
      po_id,
      new_stage: stage,
      extra_data: req.body || {},
      actor_id: req.user?.id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: `PO Order moved to ${String(stage).toUpperCase()}.`,
      data: {
        id: order._id,
        status: order.status,
        dispatch_tracking: order.dispatch_tracking,
        milestones: order.milestones,
      },
    });
  } catch (error) {
    console.error('[po.handler] advance_stage error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const assign_vehicle = async (req, res) => {
  try {
    const po_id = req.params.id || req.body.po_id;
    const { vehicle_id, driver, is_recommended, override_reason } = req.body;
    if (!po_id || !vehicle_id) {
      return res.status(400).json({ status: 'error', message: 'po_id and vehicle_id are required' });
    }

    const order = await assignVehicleToPo({
      po_id,
      vehicle_id,
      driver,
      is_recommended,
      override_reason,
      actor_id: req.user?.id,
      req,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Vehicle assigned to PO Order successfully.',
      data: {
        id: order._id,
        status: order.status,
        assigned_vehicle: order.assigned_vehicle,
      },
    });
  } catch (error) {
    console.error('[po.handler] assign_vehicle error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const list_refund_requests = async (req, res) => {
  try {
    const { status, page, limit, search } = req.query;
    const { listPoRefundRequests } = require('../services/po.refund.service');
    const result = await listPoRefundRequests({ status, page, limit, search });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('[po.handler] list_refund_requests error:', error.message);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const approve_refund_request = async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes, payment_method, payment_reference } = req.body;
    const { approvePoRefundRequest } = require('../services/po.refund.service');
    const result = await approvePoRefundRequest({
      request_id: id,
      admin_user_id: req.user?.id || req.user?._id,
      admin_name: req.user?.name || req.user?.username || 'Admin',
      approval_notes,
      payment_method: payment_method || 'bank_transfer',
      payment_reference: payment_reference || null,
      req,
    });
    return res.status(200).json({
      status: 'success',
      message: payment_reference ? 'Refund processed and marked settled successfully!' : 'Refund request approved.',
      data: result,
    });
  } catch (error) {
    console.error('[po.handler] approve_refund_request error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const reject_refund_request = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const { rejectPoRefundRequest } = require('../services/po.refund.service');
    const result = await rejectPoRefundRequest({
      request_id: id,
      admin_user_id: req.user?.id || req.user?._id,
      admin_name: req.user?.name || req.user?.username || 'Admin',
      rejection_reason,
      req,
    });
    return res.status(200).json({
      status: 'success',
      message: 'Refund request rejected.',
      data: result,
    });
  } catch (error) {
    console.error('[po.handler] reject_refund_request error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

const settle_po_expiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const { settleExpiredPo } = require('../services/po.penalty.service');
    const result = await settleExpiredPo(id, {
      actor_id: req.user?.id || req.user?._id,
      actor_type: 'cms_user',
      note: note || 'Manually settled and expired by Admin',
      req,
    });
    return res.status(200).json({
      status: 'success',
      message: 'PO marked expired and penalty settlement calculated successfully.',
      data: result,
    });
  } catch (error) {
    console.error('[po.handler] settle_po_expiry error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  list_po_orders,
  get_po_order,
  create_draft,
  submit_po,
  approve_po,
  reject_po,
  confirm_payment,
  dispatch_po,
  deliver_po,
  cancel_po,
  process_returns,
  list_pending_epc_receipts,
  verify_epc_receipt,
  advance_stage,
  assign_vehicle,
  list_refund_requests,
  approve_refund_request,
  reject_refund_request,
  settle_po_expiry,
};
