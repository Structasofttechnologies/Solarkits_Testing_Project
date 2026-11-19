/**
 * epc.order.service.js
 *
 * EPC Purchase Flow, Territory Order Routing & Stock Reservation Engine.
 * Phase R8 — Reseller Management System
 *
 * Enforces:
 *   1. Territory-based order routing (Primary Reseller > Active Territory Match > Direct Fallback).
 *   2. Server-side price verification (never trust client-supplied totals).
 *   3. Double-entry stock reservation hold in ResellerInventoryLedger (15-min TTL).
 *   4. Conversion from reservation hold to sales_out upon payment confirmation.
 *   5. Conditional EPC Commission (earned only on sales to end-customers).
 */

const mongoose = require('mongoose');
const {
  EpcAccount,
  Reseller,
  EpcResellerRelationship,
  EpcOrder,
  EpcCheckoutLog,
  ResellerInventoryLedger,
} = require('../models/india_solarshop_db');
const { validateEpcResellerTerritoryMatch } = require('../utils/territory.validator');
const { calculateCheckoutPrice } = require('./reseller.pricing.service');
const { calculateCurrentItemStock } = require('./reseller.procurement.service');
const { logAudit } = require('../utils/audit.service');
const { creditResellerMargin, creditEpcMargin } = require('./wallet.settlement.service');
const { resolveVariationCommission } = require('./franchisee.commission.service');


/**
 * Generate a unique EPC buyer order number.
 */
function generateEpcOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-EPC-${dateStr}-${randomSuffix}`;
}

/**
 * Route an EPC Buyer order to the appropriate reseller based on precedence:
 *   1. Primary Reseller ID stored on EpcAccount / Active EpcResellerRelationship
 *   2. Territory Match based on EPC delivery address
 *   3. Direct Fallback (Company direct fulfillment)
 */
async function routeEpcOrderToReseller(epcId, deliveryAddress = {}) {
  const epc = await EpcAccount.findById(epcId).lean();
  if (!epc) throw new Error(`EPC Account "${epcId}" not found`);

  // 1. Check Primary Reseller / Active Relationship
  if (epc.primary_reseller_id) {
    const activeReseller = await Reseller.findOne({ _id: epc.primary_reseller_id, activation_status: 'active', deleted_at: null }).lean();
    if (activeReseller) {
      return { reseller_id: activeReseller._id, routing_source: 'primary_reseller', reseller: activeReseller };
    }
  }

  const activeRel = await EpcResellerRelationship.findOne({ epc_id: epcId, status: 'active' }).lean();
  if (activeRel?.reseller_id) {
    const activeReseller = await Reseller.findOne({ _id: activeRel.reseller_id, activation_status: 'active', deleted_at: null }).lean();
    if (activeReseller) {
      return { reseller_id: activeReseller._id, routing_source: 'primary_reseller', reseller: activeReseller };
    }
  }

  // 2. Territory Match
  const territoryCheck = await validateEpcResellerTerritoryMatch(null, {
    state_id: deliveryAddress.state_id,
    district_id: deliveryAddress.district_id,
  });

  if (territoryCheck.is_matched && territoryCheck.territory?.reseller_id) {
    const matchedReseller = await Reseller.findOne({ _id: territoryCheck.territory.reseller_id, activation_status: 'active', deleted_at: null }).lean();
    if (matchedReseller) {
      return { reseller_id: matchedReseller._id, routing_source: 'territory_match', reseller: matchedReseller };
    }
  }

  // 3. Direct Fallback
  return { reseller_id: null, routing_source: 'direct_fallback', reseller: null };
}

/**
 * Process EPC cart checkout, reserve stock, and create EPC order.
 */
async function processEpcCheckout({
  epc_id,
  items = [],
  delivery_address = {},
  payment_reference = null,
  is_end_customer_sale = true,
  actor_id = null,
  req = null,
}) {
  if (!items || items.length === 0) {
    throw new Error('Cart must contain at least one item');
  }

  // 1. Route order to reseller
  const route = await routeEpcOrderToReseller(epc_id, delivery_address);
  const targetResellerId = route.reseller_id;

  // 2. Server-side price calculation (ignore client prices)
  let totals = null;
  if (targetResellerId) {
    totals = await calculateCheckoutPrice(targetResellerId, items);
  } else {
    // Direct fallback: no reseller. Compute real amounts using item prices
    // and the platform GST rate. NEVER use hardcoded placeholder paise.
    const { SolarShopSettings, CompanyMargin: IndiaMargin } = require('../models/india_solarshop_db');
    const { CompanyMargin: CoreMargin } = require('../models/core_db');
    const settings = await SolarShopSettings.findOne().lean();
    const platformDefaultGstRate = Number(settings?.gst_rate != null ? settings.gst_rate : 12);

    let subtotalPaise = 0;
    let taxTotalPaise = 0;
    const directItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10) || parseInt(item.qty, 10) || 1;
      const rawKitId = item.kit_id || item.combo_kit_id || (!item.product_id ? (item.id || item._id) : null);
      let resolvedItemGstRate = null;

      // Look up CompanyMargin for kit GST rate if kit
      if (rawKitId) {
        try {
          let marginDoc = await IndiaMargin.findOne({
            combo_kit_id: rawKitId,
            is_active: true,
            deleted_at: null,
          }).sort({ updated_at: -1 }).lean();

          if (!marginDoc && CoreMargin) {
            marginDoc = await CoreMargin.findOne({
              combo_kit_id: rawKitId,
              is_active: true,
              deleted_at: null,
            }).sort({ updated_at: -1 }).lean();
          }

          if (marginDoc && marginDoc.gst_rate != null && !isNaN(marginDoc.gst_rate)) {
            resolvedItemGstRate = Number(marginDoc.gst_rate);
          }
        } catch (mErr) {
          console.warn('Error fetching CompanyMargin in epc.order.service:', mErr.message);
        }
      }

      // Hierarchy: marginDoc.gst_rate > item.gstRate > item.gst_rate > platformDefaultGstRate
      if (resolvedItemGstRate == null) {
        if (item.gstRate != null && !isNaN(item.gstRate)) {
          resolvedItemGstRate = Number(item.gstRate);
        } else if (item.gst_rate != null && !isNaN(item.gst_rate)) {
          resolvedItemGstRate = Number(item.gst_rate);
        } else {
          resolvedItemGstRate = platformDefaultGstRate;
        }
      }

      // ourPrice is the frontend-displayed price in INR (rupees, not paise).
      // Convert to integer paise. We do NOT trust the value for final charging
      // but use it as the base when no reseller listing exists.
      const ourPriceRupees = parseFloat(item.ourPrice || item.unit_price_inr || 0);
      if (ourPriceRupees <= 0) {
        throw new Error(
          `Cannot determine price for item "${item.id || item.kit_id || item.product_id}". ` +
          `No reseller listing found and ourPrice is missing or zero.`
        );
      }

      // ── CRITICAL: ourPrice from the shop API is GST-INCLUSIVE ──
      // Formula in shop.handler.js: standardPrice = base × (1 + margin%) × (1 + gst%)
      // So: ourPrice = baseExclGst × (1 + resolvedItemGstRate/100)
      // Therefore: baseExclGst = ourPrice / (1 + resolvedItemGstRate/100)
      // We store subtotal as base (excl. GST) and tax separately.
      // grand_total = subtotal + tax = ourPrice × qty  ✓
      const unitPriceInclGstPaise = Math.round(ourPriceRupees * 100);  // what EPC pays per kit
      const unitBaseExclGstPaise  = Math.round(unitPriceInclGstPaise / (1 + resolvedItemGstRate / 100));
      const unitTaxPaise          = unitPriceInclGstPaise - unitBaseExclGstPaise;

      const itemBaseSubtotal = qty * unitBaseExclGstPaise;
      const itemTax          = qty * unitTaxPaise;

      subtotalPaise  += itemBaseSubtotal;
      taxTotalPaise  += itemTax;

      directItems.push({
        item_type: item.item_type || (item.kit_id ? 'kit' : 'product'),
        product_id: item.product_id || null,
        kit_id: item.kit_id || item.id || null,
        item_name: item.kitName || item.title || item.name || 'Solar Kit',
        quantity: qty,
        unit_price_paise: unitBaseExclGstPaise,       // base excl. GST (stored for subtotal)
        unit_price_incl_gst_paise: unitPriceInclGstPaise, // what EPC actually pays per kit
        cost_price_paise: Math.round(unitBaseExclGstPaise * 0.85),
        gst_rate: resolvedItemGstRate,
        tax_paise: itemTax,
        total_price_paise: itemBaseSubtotal + itemTax, // = qty × ourPrice (incl. GST)
        platform_commission_pct: 0,
      });
    }

    const effectiveGstRate = directItems.length > 0 ? directItems[0].gst_rate : platformDefaultGstRate;
    const grandTotalPaise = subtotalPaise + taxTotalPaise;
    totals = {
      items: directItems,
      subtotal_paise: subtotalPaise,
      tax_total_paise: taxTotalPaise,
      shipping_fee_paise: 0,
      grand_total_paise: grandTotalPaise,
      gst_rate: effectiveGstRate,
    };
  }

  // 3. Stock Availability & Reservation Hold
  const reservationTTL = 15 * 60 * 1000; // 15 minutes
  const expiresAt = new Date(Date.now() + reservationTTL);

  let fulfillmentSource = 'company_warehouse';
  if (targetResellerId) {
    let allInStock = true;
    for (const item of totals.items) {
      const availableStock = await calculateCurrentItemStock(targetResellerId, item.item_type, item.product_id, item.kit_id);
      if (availableStock < item.quantity) {
        allInStock = false;
        break;
      }
    }
    if (allInStock && totals.items.length > 0) {
      fulfillmentSource = 'franchise_warehouse';
    } else {
      fulfillmentSource = 'company_warehouse';
    }
  }

  // 4. Calculate reseller & EPC margins
  let totalResellerMarginPaise = 0;
  let totalPlatformCommissionPaise = 0;
  const processedItems = [];

  for (const item of totals.items) {
    const costPrice = item.cost_price_paise || Math.round(item.unit_price_paise * 0.85);
    const grossMargin = (item.unit_price_paise - costPrice) * item.quantity;
    const commission = targetResellerId ? Math.round(item.total_price_paise * ((item.platform_commission_pct || 5) / 100)) : 0;
    let netMargin = targetResellerId ? Math.max(0, grossMargin - commission) : 0;

    // Check if tiered variation commission is configured for this franchise & combo kit
    if (targetResellerId && item.kit_id) {
      const variationComm = await resolveVariationCommission({
        reseller_id: targetResellerId,
        combo_kit_id: item.kit_id,
        quantity: item.quantity,
        order_type: 'loose',
      });
      if (variationComm !== null && variationComm >= 0) {
        netMargin = variationComm;
      }
    }

    totalResellerMarginPaise += netMargin;
    totalPlatformCommissionPaise += commission;

    const isKitItem = Boolean(item.kit_id) || item.item_type === 'kit' || item.scope_type === 'kit';
    let itemCapacity = item.capacity || null;
    let itemName = item.item_name || item.name || item.kitName || null;
    let itemImage = item.image || item.kit_image || null;
    let itemDescription = item.description || null;

    if (isKitItem && item.kit_id && (!itemName || itemName === 'Solar Component' || !itemImage || !itemCapacity)) {
      try {
        const rawDb = mongoose.connection.db;
        if (rawDb && mongoose.Types.ObjectId.isValid(item.kit_id)) {
          const kDoc = await rawDb.collection('pc_combo_kits').findOne({ _id: new mongoose.Types.ObjectId(item.kit_id) })
                    || await rawDb.collection('pc_comobo_kit').findOne({ _id: new mongoose.Types.ObjectId(item.kit_id) });
          if (kDoc) {
            if (!itemName || itemName === 'Solar Component') itemName = kDoc.name || kDoc.kit_name || kDoc.title;
            if (!itemImage) itemImage = kDoc.kit_image || kDoc.image;
            if (!itemCapacity && kDoc.capacity) itemCapacity = `${kDoc.capacity} kW`;
            if (!itemDescription) itemDescription = kDoc.description;
          }
        }
      } catch (err) {
        console.warn('Error fetching kit doc in processEpcCheckout:', err.message);
      }
    }

    if (!itemCapacity) {
      const match = `${itemName || ''} ${item.description || ''}`.match(/(\d+(?:\.\d+)?)\s*k?w\b/i);
      if (match) itemCapacity = `${match[1]} kW`;
    }

    processedItems.push({
      scope_type: isKitItem ? 'kit' : (item.item_type || item.scope_type || 'product'),
      product_id: isKitItem ? null : (item.product_id || null),
      kit_id: isKitItem ? (item.kit_id || null) : null,
      item_name: itemName || (isKitItem ? 'Solar Combo Kit' : 'Solar Component'),
      image: itemImage || null,
      capacity: itemCapacity,
      description: itemDescription || null,
      quantity: item.quantity,
      unit_price_paise: item.unit_price_paise,
      cost_price_paise: costPrice,
      reseller_margin_paise: netMargin,
      platform_commission_paise: commission,
      gst_rate: item.gst_rate != null ? item.gst_rate : (totals.gst_rate != null ? totals.gst_rate : 12),
      tax_paise: item.tax_paise,
      total_price_paise: item.total_price_paise,
    });
  }

  const orderNumber = generateEpcOrderNumber();

  // Resolve warehouse via Bifurcation Engine
  const { resolveFulfillmentWarehouse, normalizeOrderType } = require('./warehouse.bifurcation.service');
  const detectedOrderType = normalizeOrderType(null, processedItems);
  const bifurcation = await resolveFulfillmentWarehouse({
    district_id: delivery_address?.district_id,
    state_id: delivery_address?.state_id,
    order_type: detectedOrderType,
    items: processedItems
  });

  // 6. Create EpcOrder
  const epcOrder = await EpcOrder.create({
    order_number: orderNumber,
    order_type: detectedOrderType,
    is_trial_order: detectedOrderType === 'trial_order' || Boolean(processedItems.some(it => it.is_trial_kit)),
    epc_id: epc_id,
    warehouse_id: bifurcation.assigned_warehouse_id,
    fulfillment_bifurcation: {
      assigned_warehouse_id: bifurcation.assigned_warehouse_id,
      assigned_warehouse_code: bifurcation.assigned_warehouse_code,
      order_type_matched: bifurcation.order_type_matched,
      matched_level: bifurcation.matched_level,
      matched_reason: bifurcation.matched_reason
    },
    reseller_id: targetResellerId || null,
    routing_source: route.routing_source,
    fulfillment_source: fulfillmentSource,
    items: processedItems,
    subtotal_paise: totals.subtotal_paise,
    tax_total_paise: totals.tax_total_paise,
    shipping_fee_paise: totals.shipping_fee_paise || 0,
    grand_total_paise: totals.grand_total_paise,
    reseller_total_margin_paise: totalResellerMarginPaise,
    platform_total_commission_paise: totalPlatformCommissionPaise,
    order_status: 'pending',
    payment_status: payment_reference ? 'captured' : 'pending',
    payment_reference: payment_reference || null,
    is_end_customer_sale: Boolean(is_end_customer_sale),
    delivery_address,
    reservation_expires_at: expiresAt,
  });


  // 7. Hold stock reservation in ResellerInventoryLedger ONLY IF fulfilling from franchise warehouse stock
  if (targetResellerId && fulfillmentSource === 'franchise_warehouse') {
    for (const item of processedItems) {
      const currentBalance = await calculateCurrentItemStock(targetResellerId, item.scope_type, item.product_id, item.kit_id);
      if (currentBalance >= item.quantity) {
        await ResellerInventoryLedger.create({
          reseller_id: targetResellerId,
          item_type: item.scope_type,
          product_id: item.product_id || null,
          kit_id: item.kit_id || null,
          movement_type: 'reservation_hold',
          quantity: -item.quantity,
          balance_after: Math.max(0, currentBalance - item.quantity),
          unit_cost_paise: item.unit_price_paise,
          total_valuation_paise: item.total_price_paise,
          reference_type: 'epc_order',
          reference_id: epcOrder._id,
          reason: `15-min stock hold for pending checkout ${orderNumber}`,
          actor_id: actor_id || epc_id,
        });
      }
    }
  }

  // 8. Write EpcCheckoutLog
  await EpcCheckoutLog.create({
    epc_id,
    assigned_reseller_id: targetResellerId,
    routing_source: route.routing_source,
    delivery_address,
    cart_snapshot: items,
    calculated_totals: totals,
    is_valid: true,
    validation_messages: [`Order routed via ${route.routing_source}`],
  });

  await logAudit({
    actor_type: 'epc_buyer',
    actor_id: epc_id,
    action: 'EPC_CHECKOUT_CREATE',
    entity_type: 'epc_orders',
    entity_id: epcOrder._id,
    after_snapshot: { order_number: orderNumber, grand_total_paise: totals.grand_total_paise, reseller_id: targetResellerId },
    req,
  });

  return {
    order: epcOrder,
    reseller_id: targetResellerId,
    routing_source: route.routing_source,
  };
}

/**
 * Confirm payment on EPC Buyer order & deduct inventory as sales_out.
 */
async function confirmEpcOrderPayment(orderId, paymentReference, actor_id = null, req = null) {
  const order = await EpcOrder.findById(orderId);
  if (!order) throw new Error(`EPC Order "${orderId}" not found`);

  order.payment_status = 'captured';
  order.order_status = 'confirmed';
  order.payment_reference = paymentReference || order.payment_reference;
  await order.save();

  if (order.reseller_id && order.fulfillment_source === 'franchise_warehouse') {
    for (const item of order.items) {
      const currentBalance = await calculateCurrentItemStock(order.reseller_id, item.scope_type, item.product_id, item.kit_id);
      await ResellerInventoryLedger.create({
        reseller_id: order.reseller_id,
        item_type: item.scope_type,
        product_id: item.product_id || null,
        kit_id: item.kit_id || null,
        movement_type: 'sales_out',
        quantity: -item.quantity,
        balance_after: Math.max(0, currentBalance), // stock already deducted during hold, converting to sales_out
        unit_cost_paise: item.unit_price_paise,
        total_valuation_paise: item.total_price_paise,
        reference_type: 'epc_order',
        reference_id: order._id,
        reason: `Confirmed payment for EPC Order ${order.order_number}`,
        actor_id: actor_id,
      });
    }
  }

  // ── 3. Credit margins to wallets (idempotent) ───────────────────────────────
  try {
    // Reseller margin credit
    if (order.reseller_id && order.reseller_total_margin_paise > 0) {
      await creditResellerMargin({
        resellerId: order.reseller_id,
        orderId: order._id,
        orderNumber: order.order_number,
        marginPaise: order.reseller_total_margin_paise,
      });
    }

    // EPC margin credit — ONLY IF order is flagged as an end-customer sale
    // (An EPC purchasing for own use must NOT automatically receive a commission)
    if (order.epc_id && order.is_end_customer_sale && order.platform_total_commission_paise > 0) {
      await creditEpcMargin({
        epcAccountId: order.epc_id,
        orderId: order._id,
        orderNumber: order.order_number,
        marginPaise: order.platform_total_commission_paise,
      });
    }
  } catch (walletErr) {
    // Non-fatal: log but don't fail the order confirmation
    console.error(`[epc.order.service] Wallet credit failed for order ${order.order_number}:`, walletErr.message);
  }

  await logAudit({
    actor_type: actor_id ? 'cms_user' : 'epc_buyer',
    actor_id: actor_id || order.epc_id,
    action: 'EPC_ORDER_PAYMENT_CONFIRM',
    entity_type: 'epc_orders',
    entity_id: order._id,
    after_snapshot: { order_number: order.order_number, payment_status: 'captured', order_status: 'confirmed' },
    req,
  });

  return order;
}

module.exports = {
  routeEpcOrderToReseller,
  processEpcCheckout,
  confirmEpcOrderPayment,
};
