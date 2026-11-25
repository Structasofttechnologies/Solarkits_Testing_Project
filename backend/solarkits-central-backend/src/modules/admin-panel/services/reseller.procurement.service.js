/**
 * reseller.procurement.service.js
 *
 * Reseller Procurement Order Engine & Double-Entry Stock Movement Ledger Service.
 * Phase R6 — Reseller Management System
 *
 * Strict Integer Paise Financial Accounting (1 INR = 100 Paise).
 */

const mongoose = require('mongoose');
const {
  Reseller,
  ResellerProcurementOrder,
  ResellerInventoryLedger,
  SolarShopSettings,
} = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');


/**
 * Generate a unique B2B procurement order number.
 */
function generateProcurementOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RPO-${dateStr}-${randomSuffix}`;
}

/**
 * Create a new Reseller Procurement Purchase Order.
 *
 * @param {object} params
 * @param {string|ObjectId} params.reseller_id
 * @param {array} params.items - Array of { scope_type, product_id, kit_id, item_name, quantity, unit_price_paise, gst_rate? }
 * @param {string|ObjectId} [params.warehouse_id]
 * @param {string} [params.payment_reference]
 * @param {string|ObjectId} [params.actor_id]
 * @param {object} [params.req]
 */
async function createProcurementOrder({
  reseller_id,
  items = [],
  warehouse_id = null,
  payment_reference = null,
  actor_id = null,
  req = null,
}) {
  const reseller = await Reseller.findOne({ _id: reseller_id, deleted_at: null }).lean();
  if (!reseller) {
    throw new Error(`Reseller with ID "${reseller_id}" not found`);
  }
  if (!items || items.length === 0) {
    throw new Error('Procurement order must contain at least one line item');
  }

  let settings = await SolarShopSettings.findOne().lean();
  const defaultGstRate = settings?.gst_rate || 13.8;

  let subtotalPaise = 0;
  let taxTotalPaise = 0;

  const processedItems = items.map((item) => {
    const qty = parseInt(item.quantity, 10);
    const unitPricePaise = parseInt(item.unit_price_paise, 10);
    const gstRate = item.gst_rate != null ? Number(item.gst_rate) : defaultGstRate;

    if (isNaN(qty) || qty <= 0) throw new Error(`Invalid item quantity: ${item.quantity}`);
    if (isNaN(unitPricePaise) || unitPricePaise < 0) throw new Error(`Invalid unit price: ${item.unit_price_paise}`);

    const itemSubtotal = qty * unitPricePaise;
    const itemTax = Math.round(itemSubtotal * (gstRate / 100));
    const itemTotal = itemSubtotal + itemTax;

    subtotalPaise += itemSubtotal;
    taxTotalPaise += itemTax;

    return {
      scope_type: item.scope_type || (item.product_id ? 'product' : 'kit'),
      product_id: item.product_id || null,
      kit_id: item.kit_id || null,
      item_name: item.item_name || 'Procurement Item',
      quantity: qty,
      unit_price_paise: unitPricePaise,
      gst_rate: gstRate,
      tax_paise: itemTax,
      total_price_paise: itemTotal,
    };
  });

  const shippingFeePaise = 0;
  const grandTotalPaise = subtotalPaise + taxTotalPaise + shippingFeePaise;
  const orderNumber = generateProcurementOrderNumber();

  const order = await ResellerProcurementOrder.create({
    procurement_order_number: orderNumber,
    reseller_id: reseller._id,
    warehouse_id: warehouse_id || null,
    items: processedItems,
    subtotal_paise: subtotalPaise,
    tax_total_paise: taxTotalPaise,
    shipping_fee_paise: shippingFeePaise,
    grand_total_paise: grandTotalPaise,
    order_status: 'submitted',
    payment_status: payment_reference ? 'captured' : 'pending',
    payment_reference: payment_reference || null,
    created_by: actor_id,
  });

  await logAudit({
    actor_type: actor_id ? 'cms_user' : 'reseller',
    actor_id: actor_id || reseller._id,
    action: 'PROCUREMENT_ORDER_CREATE',
    entity_type: 'reseller_procurement_orders',
    entity_id: order._id,
    after_snapshot: { order_number: orderNumber, grand_total_paise: grandTotalPaise, items_count: processedItems.length },
    req,
  });

  return { order };
}

/**
 * Update Procurement Order status & trigger double-entry stock movement when delivered.
 */
async function updateProcurementOrderStatus({
  order_id,
  target_status,
  payment_status = null,
  payment_reference = null,
  cancellation_reason = null,
  actor_id = null,
  req = null,
}) {
  const order = await ResellerProcurementOrder.findById(order_id);
  if (!order) {
    throw new Error(`Procurement order "${order_id}" not found`);
  }

  const previousStatus = order.order_status;
  order.order_status = target_status;
  if (payment_status) order.payment_status = payment_status;
  if (payment_reference) order.payment_reference = payment_reference;
  if (cancellation_reason) order.cancellation_reason = cancellation_reason;
  if (target_status === 'dispatched') order.dispatch_date = new Date();
  if (target_status === 'delivered') order.delivery_date = new Date();

  await order.save();

  // If status moved to 'delivered', add stock to ResellerInventoryLedger
  if (target_status === 'delivered' && previousStatus !== 'delivered') {
    for (const item of order.items) {
      const currentBalance = await calculateCurrentItemStock(order.reseller_id, item.scope_type, item.product_id, item.kit_id);
      const newBalance = currentBalance + item.quantity;

      await ResellerInventoryLedger.create({
        reseller_id: order.reseller_id,
        item_type: item.scope_type,
        product_id: item.product_id || null,
        kit_id: item.kit_id || null,
        movement_type: 'procurement_in',
        quantity: item.quantity,
        balance_after: newBalance,
        unit_cost_paise: item.unit_price_paise,
        total_valuation_paise: item.total_price_paise,
        reference_type: 'procurement_order',
        reference_id: order._id,
        reason: `Delivered Procurement Order ${order.procurement_order_number}`,
        actor_id: actor_id,
      });
    }
  }

  await logAudit({
    actor_type: 'cms_user',
    actor_id: actor_id,
    action: `PROCUREMENT_ORDER_${target_status.toUpperCase()}`,
    entity_type: 'reseller_procurement_orders',
    entity_id: order._id,
    before_snapshot: { order_status: previousStatus },
    after_snapshot: { order_status: target_status, payment_status: order.payment_status },
    req,
  });

  return order;
}

/**
 * Calculate current stock balance for a specific product or kit.
 */
async function calculateCurrentItemStock(resellerId, itemType, productId, kitId) {
  const query = { reseller_id: resellerId, item_type: itemType };
  if (productId) query.product_id = productId;
  if (kitId) query.kit_id = kitId;

  const latestLedger = await ResellerInventoryLedger.findOne(query)
    .sort({ created_at: -1 })
    .lean();

  return latestLedger ? latestLedger.balance_after : 0;
}

/**
 * Fetch total current inventory balance per item for a reseller.
 */
async function getResellerInventoryBalance(resellerId) {
  const ledgers = await ResellerInventoryLedger.aggregate([
    { $match: { reseller_id: new mongoose.Types.ObjectId(String(resellerId)) } },
    { $sort: { created_at: 1 } },
    {
      $group: {
        _id: {
          item_type: '$item_type',
          product_id: '$product_id',
          kit_id: '$kit_id',
        },
        latest_balance: { $last: '$balance_after' },
        last_unit_cost_paise: { $last: '$unit_cost_paise' },
        last_updated: { $last: '$created_at' },
      },
    },
  ]);

  return ledgers.map((l) => ({
    item_type: l._id.item_type,
    product_id: l._id.product_id,
    kit_id: l._id.kit_id,
    current_stock_balance: l.latest_balance,
    last_unit_cost_paise: l.last_unit_cost_paise,
    total_valuation_paise: l.latest_balance * l.last_unit_cost_paise,
    last_updated: l.last_updated,
  }));
}

/**
 * Perform manual inventory adjustment (Add or Deduct stock).
 */
async function adjustResellerInventoryManual({
  reseller_id,
  item_type,
  product_id = null,
  kit_id = null,
  adjustment_type, // 'add' or 'deduct'
  quantity,
  reason,
  actor_id = null,
  req = null,
}) {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) throw new Error('Quantity must be a positive integer');
  if (!['add', 'deduct'].includes(adjustment_type)) throw new Error('adjustment_type must be add or deduct');
  if (!reason || !reason.trim()) throw new Error('Reason is required for manual inventory adjustment');

  const currentStock = await calculateCurrentItemStock(reseller_id, item_type, product_id, kit_id);
  const deltaQty = adjustment_type === 'add' ? qty : -qty;
  const newBalance = currentStock + deltaQty;

  if (newBalance < 0) {
    throw new Error(`Insufficient stock for deduction. Current: ${currentStock}, Requested deduction: ${qty}`);
  }

  const ledger = await ResellerInventoryLedger.create({
    reseller_id,
    item_type,
    product_id: product_id || null,
    kit_id: kit_id || null,
    movement_type: adjustment_type === 'add' ? 'adjustment_add' : 'adjustment_deduct',
    quantity: deltaQty,
    balance_after: newBalance,
    unit_cost_paise: 0,
    total_valuation_paise: 0,
    reference_type: 'manual_adjustment',
    reference_id: null,
    reason: reason.trim(),
    actor_id,
  });

  await logAudit({
    actor_type: 'cms_user',
    actor_id,
    action: `INVENTORY_ADJUST_${adjustment_type.toUpperCase()}`,
    entity_type: 'reseller_inventory_ledgers',
    entity_id: ledger._id,
    after_snapshot: { reseller_id, item_type, product_id, kit_id, deltaQty, newBalance },
    reason: reason.trim(),
    req,
  });

  return { ledger, new_balance: newBalance };
}

module.exports = {
  createProcurementOrder,
  updateProcurementOrderStatus,
  getResellerInventoryBalance,
  adjustResellerInventoryManual,
  calculateCurrentItemStock,
};
