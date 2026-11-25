/**
 * reseller.procurement.handler.js
 *
 * Handler for Reseller Procurement Purchase Orders & Stock Inventory Ledgers.
 * Phase R6 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { ResellerProcurementOrder, ResellerInventoryLedger } = require('../models/india_solarshop_db');
const { WarehouseComboKit } = require('../models/india_solarshop_db');
const { Product } = require('../models/core_db');
const {
  createProcurementOrder,
  updateProcurementOrderStatus,
  getResellerInventoryBalance,
  adjustResellerInventoryManual,
} = require('../services/reseller.procurement.service');

// ─── 1. LIST PROCUREMENT ORDERS ───────────────────────────────────────────────
/**
 * GET /admin-api/reseller-mgmt/procurement/list
 */
const list_procurement_orders = async (req, res) => {
  try {
    const filter = {};
    if (req.reseller?._id) {
      filter.reseller_id = req.reseller._id;
    } else if (req.query.reseller_id) {
      filter.reseller_id = req.query.reseller_id;
    }

    if (req.query.order_status) filter.order_status = req.query.order_status;

    const orders = await ResellerProcurementOrder.find(filter)
      .populate('reseller_id', 'business_name email mobile')
      .populate('warehouse_id', 'name code')
      .sort({ created_at: -1 })
      .lean();

    return res.json({ status: 'success', data: orders });
  } catch (error) {
    console.error('[reseller.procurement] list_procurement_orders error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. CREATE PROCUREMENT ORDER ──────────────────────────────────────────────
/**
 * POST /api/india/v1/reseller/procurement/create OR /admin-api/reseller-mgmt/procurement/create
 * Body: { reseller_id?, items: [...], warehouse_id?, payment_reference? }
 */
const create_order = async (req, res) => {
  try {
    const resellerId = req.reseller?._id || req.body.reseller_id;
    if (!resellerId || !mongoose.Types.ObjectId.isValid(resellerId)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller_id is required' });
    }

    const order = await createProcurementOrder({
      reseller_id: resellerId,
      items: req.body.items,
      warehouse_id: req.body.warehouse_id || null,
      payment_reference: req.body.payment_reference || null,
      actor_id: req.user?.id || req.reseller?._id || null,
      req,
    });

    return res.status(201).json({
      status: 'success',
      message: `Procurement order ${order.procurement_order_number} created successfully`,
      data: order,
    });
  } catch (error) {
    console.error('[reseller.procurement] create_order error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 3. UPDATE PROCUREMENT ORDER STATUS (Admin) ──────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/procurement/status/:id
 * Body: { order_status, payment_status?, payment_reference?, cancellation_reason? }
 */
const update_order_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status, payment_reference, cancellation_reason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid order ID is required' });
    }
    if (!order_status) {
      return res.status(400).json({ status: 'error', message: 'order_status is required' });
    }

    const order = await updateProcurementOrderStatus({
      order_id: id,
      target_status: order_status,
      payment_status,
      payment_reference,
      cancellation_reason,
      actor_id: req.user?.id || null,
      req,
    });

    return res.json({
      status: 'success',
      message: `Procurement order status updated to "${order_status}"`,
      data: order,
    });
  } catch (error) {
    console.error('[reseller.procurement] update_order_status error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 4. GET RESELLER INVENTORY BALANCE ────────────────────────────────────────
/**
 * GET /api/india/v1/reseller/inventory OR /admin-api/reseller-mgmt/inventory/balance/:id
 */
const get_inventory_balance = async (req, res) => {
  try {
    const resellerId = req.reseller?._id || req.params.id || req.query.reseller_id;
    if (!resellerId || !mongoose.Types.ObjectId.isValid(resellerId)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const balances = await getResellerInventoryBalance(resellerId);

    // Populate item names
    const productIds = balances.map((b) => b.product_id).filter(Boolean);
    const kitIds = balances.map((b) => b.kit_id).filter(Boolean);

    const [products, kits] = await Promise.all([
      productIds.length ? Product.find({ _id: { $in: productIds } }).select('name sku_code').lean() : [],
      kitIds.length ? WarehouseComboKit.find({ _id: { $in: kitIds } }).select('kit_name kit_code').lean() : [],
    ]);

    const pMap = products.reduce((acc, p) => { acc[p._id.toString()] = p; return acc; }, {});
    const kMap = kits.reduce((acc, k) => { acc[k._id.toString()] = k; return acc; }, {});

    const enriched = balances.map((b) => ({
      ...b,
      item_details: b.item_type === 'product' && b.product_id ? pMap[b.product_id.toString()] : b.kit_id ? kMap[b.kit_id.toString()] : null,
    }));

    return res.json({ status: 'success', data: enriched });
  } catch (error) {
    console.error('[reseller.procurement] get_inventory_balance error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. MANUAL INVENTORY ADJUSTMENT (Admin) ───────────────────────────────────
/**
 * POST /admin-api/reseller-mgmt/inventory/adjust
 * Body: { reseller_id, item_type, product_id?, kit_id?, adjustment_type ("add"|"deduct"), quantity, reason }
 */
const adjust_inventory = async (req, res) => {
  try {
    const { reseller_id, item_type, product_id, kit_id, adjustment_type, quantity, reason } = req.body;

    if (!reseller_id || !mongoose.Types.ObjectId.isValid(reseller_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller_id is required' });
    }

    const result = await adjustResellerInventoryManual({
      reseller_id,
      item_type,
      product_id,
      kit_id,
      adjustment_type,
      quantity,
      reason,
      actor_id: req.user?.id || null,
      req,
    });

    return res.json({
      status: 'success',
      message: `Inventory adjusted (${adjustment_type} ${quantity}). New balance: ${result.new_balance}`,
      data: result,
    });
  } catch (error) {
    console.error('[reseller.procurement] adjust_inventory error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const { ResellerListing, ResellerProductAuthorization } = require('../models/india_solarshop_db');

// ─── 6. CONFIRM PROCUREMENT PAYMENT ──────────────────────────────────────────
/**
 * POST /api/india/v1/reseller/procurement/confirm-payment
 * Body: { order_id, payment_reference, razorpay_payment_id, razorpay_order_id }
 */
const confirm_procurement_payment = async (req, res) => {
  try {
    const { order_id, payment_reference, razorpay_payment_id, razorpay_order_id } = req.body;
    if (!order_id || !mongoose.Types.ObjectId.isValid(order_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid order_id is required' });
    }

    const order = await ResellerProcurementOrder.findById(order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Procurement order not found' });
    }

    order.payment_status = 'captured';
    order.order_status = 'paid';
    order.payment_reference = payment_reference || razorpay_payment_id || order.payment_reference;
    order.razorpay_order_id = razorpay_order_id || order.razorpay_order_id;
    await order.save();

    // Auto-create/activate resale listings & authorizations for purchased items
    for (const item of order.items) {
      if (item.product_id) {
        await ResellerProductAuthorization.findOneAndUpdate(
          { reseller_id: order.reseller_id, product_id: item.product_id },
          { $set: { authorization_status: 'authorized', approved_at: new Date() } },
          { upsert: true }
        );

        await ResellerListing.findOneAndUpdate(
          { reseller_id: order.reseller_id, product_id: item.product_id },
          {
            $set: {
              is_published: true, // Activated for publishing
              base_cost_paise: item.unit_price_paise,
            },
          },
          { upsert: true }
        );
      }
    }

    return res.json({
      status: 'success',
      message: `Procurement order ${order.procurement_order_number} payment confirmed and resale rights activated`,
      data: order,
    });
  } catch (error) {
    console.error('[reseller.procurement] confirm_procurement_payment error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

module.exports = {
  list_procurement_orders,
  create_order,
  update_order_status,
  get_inventory_balance,
  adjust_inventory,
  confirm_procurement_payment,
};
