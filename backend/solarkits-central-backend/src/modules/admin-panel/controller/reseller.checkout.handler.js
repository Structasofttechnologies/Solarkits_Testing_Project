/**
 * reseller.checkout.handler.js
 *
 * Handler for Dual-Mode Reseller Checkout validation, EPC Order Creation & Stock Holds.
 * Phase 6 & Phase R8 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { PurchaseOrder, EpcOrder, FpoOrder, Reseller } = require('../models/india_solarshop_db');
const {
  validateResellerCheckoutGuards,
  calculateDualModeOrderPricing,
} = require('../utils/reseller.checkout.service');
const {
  processEpcCheckout,
  confirmEpcOrderPayment,
} = require('../services/epc.order.service');
const {
  updateOrderStage,
  assignVehicleToOrder,
} = require('../services/epc.offline.checkout.service');

// ─── 1. VALIDATE CHECKOUT ─────────────────────────────────────────────────────
/**
 * POST /api/india/v1/reseller/checkout/validate
 * Body: { location: { country_id, state_id, district_id }, items: [...], selling_price, base_price }
 */
const validate_checkout = async (req, res) => {
  try {
    const resellerId = req.reseller._id;
    const { location, items, base_price, selling_price } = req.body;

    // 1. Guard Check
    const guards = await validateResellerCheckoutGuards({
      resellerId,
      location: location || {},
      items: items || [],
    });

    if (!guards.is_valid) {
      return res.status(422).json({
        status: 'error',
        message: 'Checkout validation failed',
        errors: guards.errors,
      });
    }

    // 2. Dual-mode Price Calculation
    const pricing = await calculateDualModeOrderPricing({
      resellerId,
      basePrice: base_price || 0,
      sellingPrice: selling_price || 0,
    });

    return res.json({
      status: 'success',
      message: 'Checkout validation successful',
      data: {
        is_valid: true,
        pricing,
        reseller: {
          id:              guards.reseller._id,
          business_name:   guards.reseller.business_name,
          commercial_mode: guards.reseller.commercial_mode,
        },
      },
    });
  } catch (error) {
    console.error('[reseller.checkout] validate_checkout error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 2. CREATE EPC ORDER (Territory Routing & 15-min Stock Hold) ─────────────
/**
 * POST /api/india/v1/epc/checkout/create
 * Body: { items: [...], delivery_address: {...}, payment_reference? }
 */
const create_epc_order = async (req, res) => {
  try {
    const epcId = req.epc_buyer?._id || req.body.epc_id;
    if (!epcId || !mongoose.Types.ObjectId.isValid(epcId)) {
      return res.status(400).json({ status: 'error', message: 'Valid epc_id is required' });
    }

    const result = await processEpcCheckout({
      epc_id: epcId,
      items: req.body.items,
      delivery_address: req.body.delivery_address || {},
      payment_reference: req.body.payment_reference || null,
      actor_id: epcId,
      req,
    });

    return res.status(201).json({
      status: 'success',
      message: `EPC order ${result.order.order_number} created and stock reserved (15-min hold)`,
      data: result,
    });
  } catch (error) {
    console.error('[reseller.checkout] create_epc_order error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 3. CONFIRM EPC ORDER PAYMENT (Convert Hold to Sales Out) ────────────────
/**
 * POST /api/india/v1/epc/checkout/confirm
 * Body: { order_id, payment_reference }
 */
const confirm_epc_payment = async (req, res) => {
  try {
    const { order_id, payment_reference } = req.body;
    if (!order_id || !mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid order_id is required' });
    }

    const order = await confirmEpcOrderPayment(order_id, payment_reference, req.user?.id || req.epc_buyer?._id || null, req);

    return res.json({
      status: 'success',
      message: `Payment confirmed for EPC order ${order.order_number}`,
      data: order,
    });
  } catch (error) {
    console.error('[reseller.checkout] confirm_epc_payment error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 4. ADMIN LIST RESELLER ORDERS ────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/orders/list
 * Query: ?reseller_id=...&commercial_mode=...&status=...
 */
const list_reseller_orders = async (req, res) => {
  try {
    const { reseller_id, commercial_mode, status } = req.query;
    const query = { reseller_id: { $ne: null } };

    if (reseller_id && mongoose.Types.ObjectId.isValid(reseller_id)) {
      query.reseller_id = reseller_id;
    }
    if (commercial_mode && ['commission', 'dealer'].includes(commercial_mode)) {
      query.reseller_commercial_mode = commercial_mode;
    }
    if (status) query.status = status;

    const rows = await PurchaseOrder.find(query)
      .populate('reseller_id', 'business_name email mobile gst_number commercial_mode')
      .populate('country_id', 'name iso2')
      .populate('state_id', 'name state_code')
      .populate('warehouse_id', 'name warehouse_code')
      .sort({ created_at: -1 })
      .lean();

    const data = rows.map((r) => ({
      id:                         r._id,
      reseller:                   r.reseller_id,
      commercial_mode:            r.reseller_commercial_mode,
      selling_price_snapshot:     r.selling_price_snapshot,
      base_price_snapshot:        r.base_price_snapshot,
      reseller_commission_rate:   r.reseller_commission_rate,
      reseller_commission_amount: r.reseller_commission_amount,
      dealer_discount_amount:     r.dealer_discount_amount,
      dealer_invoice_number:      r.dealer_invoice_number,
      status:                     r.status,
      country:                    r.country_id,
      state:                      r.state_id,
      warehouse:                  r.warehouse_id,
      created_at:                 r.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.checkout] list_reseller_orders error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. LIST FRANCHISEE PO ORDERS (Live FPO orders for Reseller Workspace) ───
/**
 * GET /admin-api/reseller-mgmt/orders/po-orders
 */
const list_fpo_orders = async (req, res) => {
  try {
    const { franchisee_id, status, search, page = 1, limit = 50 } = req.query;
    // Always filter parent_po_id: null so child repeat drawdowns do not appear as independent top-level PO cards
    const query = { deleted_at: null, parent_po_id: null };

    if (franchisee_id && mongoose.Types.ObjectId.isValid(franchisee_id)) {
      query.franchisee_id = franchisee_id;
    }
    if (status && status !== 'ALL') {
      query.status = { $in: status.split(',') };
    }
    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { po_number: { $regex: q, $options: 'i' } },
        { 'reseller_snapshot.company_name': { $regex: q, $options: 'i' } },
        { 'reseller_snapshot.name': { $regex: q, $options: 'i' } },
        { 'items.item_name': { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      FpoOrder.find(query)
        .populate('franchisee_id', 'business_name name mobile email gst_number contact_person bank_details address')
        .populate('plan_id', 'name territory_level')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FpoOrder.countDocuments(query),
    ]);

    // Fetch and link child repeat orders / drawdowns for all Master POs
    const poIds = orders.map((o) => o._id);
    let childOrders = [];
    if (poIds.length > 0) {
      childOrders = await FpoOrder.find({
        parent_po_id: { $in: poIds },
        deleted_at: null,
      })
        .populate('franchisee_id', 'business_name name mobile email contact_person')
        .populate('epc_id', 'name company_name email whatsapp gstin')
        .sort({ created_at: -1 })
        .lean();
    }

    const childMap = new Map();
    childOrders.forEach((co) => {
      const pId = co.parent_po_id?.toString();
      if (!childMap.has(pId)) childMap.set(pId, []);
      childMap.get(pId).push(co);
    });

    const formatted = orders.map((o) => {
      const partner = o.franchisee_id || {};
      const allocations = (o.items || []).flatMap((it) => it.epc_allocations || []);
      const totalKits = o.total_kit_quantity || (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const myChildOrders = childMap.get(o._id.toString()) || [];

      const totalBooked = o.total_booked_quantity || totalKits;
      const fulfilled = o.fulfilled_quantity || 0;
      const remaining = o.remaining_quantity != null ? o.remaining_quantity : Math.max(0, totalBooked - fulfilled);

      const tokenAmountPaise = o.token_amount_paise || 0;
      const tokenPaidPaise = o.token_paid_paise || (tokenAmountPaise > 0 && ['PAID', 'VALIDATED', 'COMPLETED', 'PO_STARTED'].includes(o.status) ? tokenAmountPaise : 0);
      const tokenAdjustedPaise = o.token_adjusted_total_paise || myChildOrders.reduce((acc, c) => acc + (c.token_adjusted_paise || 0), 0);
      const tokenBalancePaise = Math.max(0, tokenPaidPaise - tokenAdjustedPaise);

      const formattedChildOrders = myChildOrders.map((c) => ({
        _id: c._id,
        id: c._id,
        order_number: c.po_number || `ORD-${String(c._id).slice(-8).toUpperCase()}`,
        po_number: c.po_number,
        created_at: c.created_at,
        quantity: c.total_kit_quantity || (c.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0),
        item_name: c.items?.[0]?.item_name || 'Solar Kit',
        token_adjusted_inr: Math.round(c.token_adjusted_paise || 0) / 100,
        net_payable_inr: Math.round(c.net_payable_paise || c.grand_total_paise || 0) / 100,
        grand_total_inr: Math.round(c.grand_total_paise || 0) / 100,
        payment_status: c.payment_status || (c.status === 'PAID' ? 'PAID' : c.status === 'DRAFT' ? 'PENDING' : c.status),
        payment_utr: c.payment_utr || c.payment_reference || c.offline_payment?.utr_number || '—',
        status: c.status,
        epc_name: c.epc_id?.company_name || c.epc_id?.name || o.items?.[0]?.epc_allocations?.[0]?.company_name || 'EPC Contractor',
        payment_receipt_url: c.payment_receipt_url || c.offline_payment?.receipt_url || null,
      }));

      return {
        _id: o._id,
        id: o._id,
        order_type: 'fpo_order',
        po_number: o.po_number,
        franchisee: {
          _id: partner._id || o.franchisee_id,
          business_name: partner.business_name || o.reseller_snapshot?.company_name || 'Gujarat SolarTech Enterprises',
          name: partner.name || o.reseller_snapshot?.name || 'Partner Admin',
          mobile: partner.mobile || o.reseller_snapshot?.phone || 'N/A',
          email: partner.email || o.reseller_snapshot?.email || 'N/A',
          gst_number: partner.gst_number || 'N/A',
          bank_details: partner.bank_details || null,
        },
        plan: o.plan_id ? { name: o.plan_id.name, territory_level: o.plan_id.territory_level } : null,
        status: o.status,
        payment_type: o.payment_type || 'FULL_PAYMENT',
        payment_reference: o.payment_reference || null,
        total_kit_quantity: totalKits,
        total_booked_quantity: totalBooked,
        fulfilled_quantity: fulfilled,
        remaining_quantity: remaining,
        token_amount_inr: Math.round(tokenAmountPaise) / 100,
        token_paid_inr: Math.round(tokenPaidPaise) / 100,
        token_adjusted_inr: Math.round(tokenAdjustedPaise) / 100,
        token_balance_inr: Math.round(tokenBalancePaise) / 100,
        token_payment_status: o.token_payment_status || (['PAID', 'VALIDATED', 'COMPLETED', 'PO_STARTED'].includes(o.status) ? 'PAID' : 'PENDING'),
        linked_repeat_orders: formattedChildOrders,
        repeat_orders_count: formattedChildOrders.length,
        subtotal_paise: o.subtotal_paise || 0,
        subtotal_inr: Math.round(o.subtotal_paise || 0) / 100,
        tax_total_paise: o.tax_total_paise || o.total_tax_paise || 0,
        tax_total_inr: Math.round(o.tax_total_paise || o.total_tax_paise || 0) / 100,
        grand_total_paise: o.grand_total_paise || 0,
        grand_total_inr: Math.round(o.grand_total_paise || 0) / 100,
        items: (o.items || []).map((it) => ({
          item_name: it.item_name,
          item_code: it.item_code,
          quantity: it.quantity,
          unit_price_inr: Math.round(it.unit_price_paise || 0) / 100,
          total_price_inr: Math.round(it.total_price_paise || 0) / 100,
          gst_rate: it.gst_rate,
          epc_allocations: (it.epc_allocations || []).map((a) => ({
            epc_buyer_id: a.epc_buyer_id,
            buyer_name: a.buyer_name || a.company_name,
            company_name: a.company_name,
            gstin: a.gstin,
            allocated_quantity: a.allocated_quantity,
            payment_status: a.payment_status || 'PENDING',
            contract: a.contract || null,
            payment_receipt_url: a.payment_receipt_url || null,
            paid_at: a.paid_at || null,
            payment_notes: a.payment_notes || null,
          })),
        })),
        allocations_count: allocations.length,
        allocations_verified_count: allocations.filter((a) => a.payment_status === 'VERIFIED' || a.payment_status === 'PAID').length,
        commission_posted: o.commission_posted || false,
        created_at: o.created_at,
        updated_at: o.updated_at,
      };
    });

    return res.json({
      status: 'success',
      data: formatted,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('[reseller.checkout] list_fpo_orders error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 6. LIST LOOSE ORDERS (Direct EPC & Franchisee-Attributed Loose Orders) ───
/**
 * GET /admin-api/reseller-mgmt/orders/loose-orders
 */
const list_loose_orders = async (req, res) => {
  try {
    const { reseller_id, routing_source, status, search, page = 1, limit = 50 } = req.query;
    const epcQuery = {};
    const fpoQuery = { deleted_at: null, order_type: { $in: ['loose_kit_order', 'loose_order'] } };

    if (reseller_id && mongoose.Types.ObjectId.isValid(reseller_id)) {
      epcQuery.reseller_id = reseller_id;
      fpoQuery.franchisee_id = reseller_id;
    }
    if (routing_source && routing_source !== 'ALL') {
      epcQuery.routing_source = routing_source;
      if (routing_source === 'direct_fallback') {
        fpoQuery._id = null; // FPO loose orders are always franchise attributed
      }
    }
    if (status && status !== 'ALL') {
      const statusList = status.split(',');
      epcQuery.order_status = { $in: statusList.map(s => s.toLowerCase()) };
      fpoQuery.status = { $in: statusList.map(s => s.toUpperCase()) };
    }
    if (search && search.trim()) {
      const q = search.trim();
      epcQuery.$or = [
        { order_number: { $regex: q, $options: 'i' } },
        { 'items.item_name': { $regex: q, $options: 'i' } },
        { payment_utr: { $regex: q, $options: 'i' } },
      ];
      fpoQuery.$or = [
        { po_number: { $regex: q, $options: 'i' } },
        { 'items.item_name': { $regex: q, $options: 'i' } },
        { payment_reference: { $regex: q, $options: 'i' } },
        { payment_utr: { $regex: q, $options: 'i' } },
        { 'offline_payment.utr_number': { $regex: q, $options: 'i' } },
      ];
    }

    const [epcOrders, fpoOrders] = await Promise.all([
      EpcOrder.find(epcQuery)
        .populate('reseller_id', 'business_name name mobile email gst_number')
        .populate('epc_id', 'company_name full_name name email mobile gstin')
        .sort({ created_at: -1 })
        .lean(),
      FpoOrder.find(fpoQuery)
        .populate('franchisee_id', 'business_name name mobile email gst_number address')
        .sort({ created_at: -1 })
        .lean(),
    ]);

    const formattedEpc = epcOrders.map((o) => {
      const partner = o.reseller_id || {};
      const buyer = o.epc_id || {};
      const totalKits = (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const subtotalPaise = o.subtotal_paise || (o.items || []).reduce((acc, it) => acc + (it.total_price_paise || 0), 0);
      const taxPaise = o.tax_total_paise || (o.items || []).reduce((acc, it) => acc + (it.tax_paise || 0), 0);
      const grandTotalPaise = o.grand_total_paise || (subtotalPaise + taxPaise);

      return {
        _id: o._id,
        id: o._id,
        order_type: 'loose_order',
        source_model: 'epc_orders',
        order_number: o.order_number || `ORD-${String(o._id).slice(-8).toUpperCase()}`,
        routing_source: o.routing_source || 'direct_fallback',
        is_franchise_attributed: o.routing_source === 'primary_reseller' || Boolean(o.reseller_id),
        reseller: o.reseller_id ? {
          _id: partner._id,
          business_name: partner.business_name || partner.name || 'Gujarat SolarTech Enterprises',
          mobile: partner.mobile || 'N/A',
          email: partner.email || 'N/A',
        } : null,
        buyer: {
          _id: buyer._id || o.epc_id,
          name: buyer.company_name || buyer.full_name || buyer.name || 'EPC Buyer Partner',
          email: buyer.email || 'N/A',
          mobile: buyer.mobile || 'N/A',
          gstin: buyer.gstin || 'N/A',
        },
        total_kit_quantity: totalKits,
        subtotal_paise: subtotalPaise,
        subtotal_inr: Math.round(subtotalPaise) / 100,
        tax_total_paise: taxPaise,
        tax_total_inr: Math.round(taxPaise) / 100,
        grand_total_paise: grandTotalPaise,
        grand_total_inr: Math.round(grandTotalPaise) / 100,
        reseller_margin_inr: Math.round((o.items || []).reduce((acc, it) => acc + (it.reseller_margin_paise || 0), 0)) / 100,
        status: (o.order_status || o.status || 'CONFIRMED').toUpperCase(),
        payment_status: (o.payment_status || (o.status === 'PAID' || o.status === 'COMPLETED' ? 'PAID' : 'PENDING')).toUpperCase(),
        payment_utr: o.payment_utr || o.payment_reference || null,
        delivery_address: o.delivery_address || null,
        items: (o.items || []).map((it) => ({
          item_name: it.item_name || 'Solar Combo Kit',
          quantity: it.quantity || 1,
          unit_price_inr: Math.round(it.unit_price_paise || 0) / 100,
          total_price_inr: Math.round(it.total_price_paise || 0) / 100,
          gst_rate: it.gst_rate || 13.8,
          reseller_margin_inr: Math.round(it.reseller_margin_paise || 0) / 100,
        })),
        created_at: o.created_at,
        updated_at: o.updated_at,
      };
    });

    const formattedFpo = fpoOrders.map((o) => {
      const partner = o.franchisee_id || {};
      const totalKits = (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
      const subtotalPaise = o.subtotal_paise || (o.items || []).reduce((acc, it) => acc + (it.total_price_paise || 0), 0);
      const taxPaise = o.tax_total_paise || (o.items || []).reduce((acc, it) => acc + (it.tax_paise || 0), 0);
      const grandTotalPaise = o.grand_total_paise || (subtotalPaise + taxPaise);
      const firstAlloc = (o.items || []).flatMap(it => it.epc_allocations || [])[0];

      return {
        _id: o._id,
        id: o._id,
        order_type: 'loose_order',
        source_model: 'fpo_orders',
        order_number: o.po_number || `FPO-${String(o._id).slice(-8).toUpperCase()}`,
        routing_source: 'franchise_portal',
        is_franchise_attributed: true,
        reseller: {
          _id: partner._id,
          business_name: partner.business_name || partner.name || 'Franchise Partner',
          mobile: partner.mobile || 'N/A',
          email: partner.email || 'N/A',
        },
        buyer: firstAlloc ? {
          _id: firstAlloc.epc_buyer_id,
          name: firstAlloc.company_name || firstAlloc.buyer_name || 'Allocated EPC Partner',
          email: partner.email || 'N/A',
          mobile: partner.mobile || 'N/A',
          gstin: firstAlloc.gstin || 'N/A',
        } : {
          _id: partner._id,
          name: partner.business_name || partner.name || 'Regional Franchise Hub',
          email: partner.email || 'N/A',
          mobile: partner.mobile || 'N/A',
          gstin: partner.gst_number || 'N/A',
        },
        total_kit_quantity: totalKits,
        subtotal_paise: subtotalPaise,
        subtotal_inr: Math.round(subtotalPaise) / 100,
        tax_total_paise: taxPaise,
        tax_total_inr: Math.round(taxPaise) / 100,
        grand_total_paise: grandTotalPaise,
        grand_total_inr: Math.round(grandTotalPaise) / 100,
        reseller_margin_inr: 0,
        status: o.status || 'SUBMITTED',
        payment_status: o.status === 'PAID' ? 'PAID' : (o.offline_payment?.utr_number || o.payment_reference ? 'VERIFICATION_PENDING' : 'PENDING'),
        payment_utr: o.offline_payment?.utr_number || o.payment_reference || o.payment_utr || null,
        delivery_address: o.destination_address || 'Franchise Regional Hub Warehouse',
        destination_type: o.destination_type || 'hub_stock',
        destination_pincode: o.destination_pincode || null,
        offline_payment: o.offline_payment || null,
        items: (o.items || []).map((it) => ({
          item_name: it.item_name || 'Solar Combo Kit',
          quantity: it.quantity || 1,
          unit_price_inr: Math.round(it.unit_price_paise || 0) / 100,
          total_price_inr: Math.round(it.total_price_paise || 0) / 100,
          gst_rate: it.gst_rate || 12,
          epc_allocations: it.epc_allocations || [],
        })),
        created_at: o.created_at,
        updated_at: o.updated_at,
      };
    });

    const combined = [...formattedFpo, ...formattedEpc].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    const total = combined.length;
    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const paginated = combined.slice(skip, skip + parseInt(limit));

    return res.json({
      status: 'success',
      data: paginated,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error('[reseller.checkout] list_loose_orders error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 7. GET ORDERS WORKSPACE STATS ────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/orders/stats
 */
const get_orders_stats = async (req, res) => {
  try {
    const [allFpoOrders, epcOrders] = await Promise.all([
      FpoOrder.find({ deleted_at: null }).select('status grand_total_paise total_kit_quantity total_booked_quantity items order_type parent_po_id').lean(),
      EpcOrder.find({}).select('status grand_total_paise routing_source reseller_id items').lean(),
    ]);

    // Only Master POs (parent_po_id is null/undefined)
    const bulkPoOrders = allFpoOrders.filter(o => !o.parent_po_id && o.order_type !== 'loose_kit_order' && o.order_type !== 'loose_order');
    const fpoLooseOrders = allFpoOrders.filter(o => o.parent_po_id != null || o.order_type === 'loose_kit_order' || o.order_type === 'loose_order');

    const po_count = bulkPoOrders.length;
    const po_volume_inr = Math.round(bulkPoOrders.reduce((s, o) => s + (o.grand_total_paise || 0), 0)) / 100;
    const po_kits = bulkPoOrders.reduce((s, o) => s + (o.total_booked_quantity || o.total_kit_quantity || (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)), 0);
    const po_paid_count = bulkPoOrders.filter((o) => o.status === 'PAID' || o.status === 'COMPLETED' || o.status === 'VALIDATED').length;

    const fpo_loose_kits = fpoLooseOrders.reduce((s, o) => s + (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0), 0);
    const epc_loose_kits = epcOrders.reduce((s, o) => s + (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0), 0);

    const fpo_loose_vol = fpoLooseOrders.reduce((s, o) => s + (o.grand_total_paise || 0), 0);
    const epc_loose_vol = epcOrders.reduce((s, o) => s + (o.grand_total_paise || 0), 0);

    const loose_count = epcOrders.length + fpoLooseOrders.length;
    const loose_volume_inr = Math.round(fpo_loose_vol + epc_loose_vol) / 100;
    const loose_kits = fpo_loose_kits + epc_loose_kits;
    const loose_attributed_count = epcOrders.filter((o) => o.reseller_id || o.routing_source === 'primary_reseller').length + fpoLooseOrders.length;

    return res.json({
      status: 'success',
      data: {
        po_count,
        po_volume_inr,
        po_kits,
        po_paid_count,
        loose_count,
        loose_volume_inr,
        loose_kits,
        loose_attributed_count,
        total_orders_count: po_count + loose_count,
        total_volume_inr: po_volume_inr + loose_volume_inr,
      },
    });
  } catch (error) {
    console.error('[reseller.checkout] get_orders_stats error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── Module 1: Order Stage Transitions & Vehicle Assignment ─────────────────
/**
 * POST /admin-api/reseller-mgmt/orders/:id/stage/:stage
 */
const update_order_stage = async (req, res) => {
  try {
    const { id, stage } = req.params;
    const admin_user_id = req.user?._id || req.user?.id || 'admin';
    const { dispatch_data, milestone } = req.body;

    // Check if it's an EpcOrder
    const isEpc = await EpcOrder.findById(id);
    if (isEpc) {
      const updated = await updateOrderStage({
        order_id: id,
        new_status: stage,
        admin_user_id,
        dispatch_data,
        milestone,
        req,
      });
      return res.json({
        status: 'success',
        data: updated,
        message: `Order transitioned to ${stage} successfully.`
      });
    }

    // Check if FpoOrder
    const fpo = await FpoOrder.findById(id);
    if (fpo) {
      fpo.status = stage.toUpperCase();
      if (stage === 'dispatched' && dispatch_data) {
        fpo.dispatch_tracking = {
          tracking_number: dispatch_data.tracking_number,
          courier_name: dispatch_data.courier_name,
          dispatched_at: new Date(),
        };
      }
      if (stage === 'delivered') {
        fpo.delivered_at = new Date();
      }
      await fpo.save();
      return res.json({
        status: 'success',
        data: fpo,
        message: `PO Order transitioned to ${stage} successfully.`
      });
    }

    return res.status(404).json({ status: 'error', message: 'Order not found.' });
  } catch (err) {
    console.error('[update_order_stage] Error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /admin-api/reseller-mgmt/orders/:id/assign-vehicle
 */
const assign_order_vehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicle_id, is_override, override_reason } = req.body;
    const admin_user_id = req.user?._id || req.user?.id || 'admin';

    const order = await assignVehicleToOrder({
      order_id: id,
      vehicle_id,
      admin_user_id,
      is_override,
      override_reason,
      req,
    });

    return res.json({
      status: 'success',
      data: order,
      message: 'Vehicle assigned to order successfully.',
    });
  } catch (err) {
    console.error('[assign_order_vehicle] Error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  validate_checkout,
  create_epc_order,
  confirm_epc_payment,
  list_reseller_orders,
  list_fpo_orders,
  list_loose_orders,
  get_orders_stats,
  update_order_stage,
  assign_order_vehicle,
};
