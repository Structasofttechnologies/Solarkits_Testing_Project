'use strict';

const mongoose = require('mongoose');
const PricingEngine = require('../../services/pricing_engine');
const { logBoskitAudit } = require('../../utils/audit_logger');
const { sendOTP } = require('../../../solarshop-india/utils/nodemailer');

/**
 * Helper to ensure a valid ObjectId
 */
const toObjectId = (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return new mongoose.Types.ObjectId();
};

/**
 * 1. Get Cart with Live Pricing Calculation
 */
const get_cart = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.query.buyer_id || req.query.session_id;
    const buyerType = req.user?.role === 'dealer' ? 'dealer' : 'distributor';
    const destState = req.query.dest_state || 'GJ';

    const BoskitCart = mongoose.model('boskit_carts');
    let cart = null;

    if (buyerId && mongoose.Types.ObjectId.isValid(buyerId)) {
      cart = await BoskitCart.findOne({ entity_id: toObjectId(buyerId) }).lean();
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(200).json({
        status: 'success',
        success: true,
        cart: {
          items: [],
          summary: {
            subtotal_inr: 0,
            total_discount_inr: 0,
            net_taxable_inr: 0,
            total_tax_inr: 0,
            grand_total_inr: 0,
            items_count: 0,
          },
        },
      });
    }

    // Recalculate with PricingEngine
    const pricing = await PricingEngine.calculate({
      items: cart.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      buyer_type: buyerType,
      origin_state_code: 'GJ',
      destination_state_code: destState,
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      cart: {
        id: cart._id,
        items: pricing.items,
        summary: {
          ...pricing.summary,
          items_count: pricing.items.reduce((acc, i) => acc + i.quantity, 0),
        },
        moq_passed: pricing.moq_passed,
        moq_errors: pricing.moq_errors,
      },
    });
  } catch (error) {
    console.error('[get_cart Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch cart: ' + error.message,
    });
  }
};

/**
 * 2. Add Item or Update Quantity in Cart
 */
const add_to_cart = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.body.buyer_id || req.body.session_id;
    const buyerType = req.user?.role === 'dealer' ? 'dealer' : 'distributor';
    const { product_id, quantity = 1, item_name = 'Solar Equipment Component' } = req.body;

    if (!product_id) {
      return res.status(400).json({ status: 'error', success: false, message: 'product_id is required.' });
    }

    const entityId = toObjectId(buyerId);
    const Product = mongoose.model('products');
    const prodDoc = await Product.findById(product_id).lean();

    const BoskitCart = mongoose.model('boskit_carts');
    let cart = await BoskitCart.findOne({ entity_id: entityId });

    if (!cart) {
      cart = new BoskitCart({
        entity_type: buyerType,
        entity_id: entityId,
        items: [
          {
            scope_type: 'product',
            product_id: toObjectId(product_id),
            item_name: prodDoc?.name || item_name,
            item_sku: prodDoc?.sku || `SKU-${product_id.toString().slice(-4)}`,
            quantity: Math.max(1, parseInt(quantity, 10)),
          },
        ],
      });
    } else {
      const existingIdx = cart.items.findIndex((i) => i.product_id?.toString() === product_id.toString());
      if (existingIdx > -1) {
        cart.items[existingIdx].quantity += Math.max(1, parseInt(quantity, 10));
      } else {
        cart.items.push({
          scope_type: 'product',
          product_id: toObjectId(product_id),
          item_name: prodDoc?.name || item_name,
          item_sku: prodDoc?.sku || `SKU-${product_id.toString().slice(-4)}`,
          quantity: Math.max(1, parseInt(quantity, 10)),
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Item added to cart successfully.',
      items_count: cart.items.reduce((acc, i) => acc + i.quantity, 0),
    });
  } catch (error) {
    console.error('[add_to_cart Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to add item to cart: ' + error.message,
    });
  }
};

/**
 * 3. Remove Item from Cart
 */
const remove_from_cart = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.body.buyer_id || req.body.session_id;
    const { product_id } = req.body;

    const entityId = toObjectId(buyerId);
    const BoskitCart = mongoose.model('boskit_carts');
    const cart = await BoskitCart.findOne({ entity_id: entityId });

    if (cart) {
      cart.items = cart.items.filter((i) => i.product_id?.toString() !== product_id?.toString());
      await cart.save();
    }

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Item removed from cart.',
    });
  } catch (error) {
    console.error('[remove_from_cart Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to remove item: ' + error.message,
    });
  }
};

/**
 * 4. Create B2B Solar Equipment Order (Checkout)
 */
const create_order = async (req, res) => {
  try {
    const buyerId = req.user?.id || req.body.buyer_id || new mongoose.Types.ObjectId();
    const buyerType = req.user?.role === 'dealer' ? 'dealer' : (req.body.buyer_type || 'distributor');
    const {
      items = [],
      shipping_address = {},
      billing_address = {},
      gst_number,
      payment_method = 'neft_rtgs',
      distributor_id,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        success: false,
        message: 'Cannot place empty order. Items list is required.',
      });
    }

    const destStateCode = shipping_address.state_code || 'GJ';

    // Pricing calculation
    const pricing = await PricingEngine.calculate({
      items,
      buyer_type: buyerType,
      origin_state_code: 'GJ',
      destination_state_code: destStateCode,
    });

    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitInvoice = mongoose.model('boskit_invoices');
    const BoskitCart = mongoose.model('boskit_carts');

    const year = new Date().getFullYear();
    const seq = Date.now().toString().slice(-6);
    const orderNumber = `BK-${year}-${seq}`;
    const invoiceNumber = `BKI-${year}-${seq}`;

    const entityId = toObjectId(buyerId);

    // 1. Create Order Record conforming to boskit_orders.schema.js
    const [order] = await BoskitOrder.create([
      {
        order_number: orderNumber,
        buyer_type: buyerType,
        buyer_id: entityId,
        distributor_id: distributor_id && mongoose.Types.ObjectId.isValid(distributor_id) ? toObjectId(distributor_id) : null,
        items: pricing.items.map((i) => ({
          scope_type: 'product',
          product_id: toObjectId(i.product_id),
          item_name: i.product_name,
          item_sku: i.sku,
          quantity: i.quantity,
          price_snapshot: {
            base_mrp_paise: i.unit_mrp_paise,
            rule_id: i.applied_rule_id ? toObjectId(i.applied_rule_id) : null,
            rule_scope: i.applied_rule_scope || 'product_default',
            discount_type: i.discount_type || 'percentage',
            discount_value: i.discount_value || 0,
            price_before_gst_paise: i.unit_base_price_paise,
            gst_pct: i.gst_rate_percent,
            gst_amount_paise: Math.round(i.total_tax_paise / (i.quantity || 1)),
            unit_price_paise: i.unit_base_price_paise,
            moq: i.moq,
            moq_met: i.moq_met,
            pricing_explanation: `Rule ${i.applied_rule_name} (${i.applied_rule_scope}): -₹${Math.round(i.unit_discount_paise / 100)}`,
          },
          line_total_paise: i.line_grand_total_paise,
        })),
        subtotal_paise: pricing.summary.subtotal_paise,
        tax_total_paise: pricing.summary.total_tax_paise,
        shipping_fee_paise: pricing.summary.shipping_paise,
        discount_total_paise: pricing.summary.total_discount_paise,
        grand_total_paise: pricing.summary.grand_total_paise,
        delivery_address: {
          line: shipping_address.line || 'Commercial Industrial Depot',
          city: shipping_address.city || 'Ahmedabad',
          pincode: shipping_address.pincode || '380001',
          contact_name: shipping_address.contact_name || 'Warehouse Manager',
          contact_phone: shipping_address.contact_phone || '9876500001',
        },
        billing_gst_number: gst_number || '24AAACC1206D1ZM',
        billing_name: billing_address.name || 'Commercial Enterprise Ltd',
        billing_address: billing_address.line || shipping_address.line || 'Commercial Depot, Ahmedabad',
        order_status: 'confirmed',
        status_history: [
          {
            status: 'confirmed',
            actor_type: buyerType === 'dealer' ? 'boskit_dealer' : 'boskit_distributor',
            actor_id: entityId,
            comment: `Order placed via ${payment_method.toUpperCase()}`,
          },
        ],
      },
    ]);

    // 2. Create Invoice Record conforming to boskit_invoices.schema.js
    await BoskitInvoice.create({
      order_id: order._id,
      order_number: orderNumber,
      invoice_number: invoiceNumber,
      buyer_type: buyerType,
      buyer_id: entityId,
      invoice_snapshot: {
        subtotal_paise: pricing.summary.subtotal_paise,
        net_taxable_paise: pricing.summary.net_taxable_paise,
        cgst_paise: pricing.summary.cgst_paise,
        sgst_paise: pricing.summary.sgst_paise,
        igst_paise: pricing.summary.igst_paise,
        total_tax_paise: pricing.summary.total_tax_paise,
        grand_total_paise: pricing.summary.grand_total_paise,
        items: pricing.items,
        gstin: gst_number || '24AAACC1206D1ZM',
      },
      status: 'generated',
      generated_at: new Date(),
    });

    // 3. Clear Cart
    await BoskitCart.deleteOne({ entity_id: entityId });

    logBoskitAudit({
      actor_type: buyerType === 'dealer' ? 'boskit_dealer' : 'boskit_distributor',
      actor_id: entityId,
      action: 'ORDER_CREATED',
      entity_type: 'boskit_orders',
      entity_id: order._id,
      req,
    });

    return res.status(201).json({
      status: 'success',
      success: true,
      message: 'B2B Equipment Order placed successfully!',
      order: {
        id: order._id,
        order_number: orderNumber,
        invoice_number: invoiceNumber,
        grand_total_inr: Math.round(pricing.summary.grand_total_paise / 100),
        status: order.order_status,
        items_count: pricing.items.length,
        created_at: order.created_at,
      },
    });
  } catch (error) {
    console.error('[create_order Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Order creation failed: ' + error.message,
    });
  }
};

/**
 * 5. Get Order Details & Tax Invoice Snapshot
 */
const get_order_detail = async (req, res) => {
  try {
    const { id } = req.params;

    const BoskitOrder = mongoose.model('boskit_orders');
    const BoskitInvoice = mongoose.model('boskit_invoices');

    const order = await BoskitOrder.findById(id).lean();
    if (!order) {
      return res.status(404).json({ status: 'error', success: false, message: 'Order not found.' });
    }

    const invoice = await BoskitInvoice.findOne({ order_id: order._id }).lean();

    return res.status(200).json({
      status: 'success',
      success: true,
      order: {
        id: order._id,
        order_number: order.order_number,
        buyer_type: order.buyer_type,
        grand_total_inr: Math.round((order.grand_total_paise || 0) / 100),
        subtotal_inr: Math.round((order.subtotal_paise || 0) / 100),
        total_discount_inr: Math.round((order.discount_total_paise || 0) / 100),
        total_tax_inr: Math.round((order.tax_total_paise || 0) / 100),
        shipping_fee_inr: Math.round((order.shipping_fee_paise || 0) / 100),
        order_status: order.order_status,
        delivery_address: order.delivery_address,
        billing_gst_number: order.billing_gst_number,
        billing_name: order.billing_name,
        invoice_number: invoice?.invoice_number || `BKI-${order._id.toString().slice(-5)}`,
        items: (order.items || []).map((i) => ({
          product_name: i.item_name,
          sku: i.item_sku,
          quantity: i.quantity,
          line_total_inr: Math.round((i.line_total_paise || 0) / 100),
        })),
        created_at: order.created_at,
      },
    });
  } catch (error) {
    console.error('[get_order_detail Error]:', error);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: 'Failed to fetch order detail: ' + error.message,
    });
  }
};

module.exports = {
  get_cart,
  add_to_cart,
  remove_from_cart,
  create_order,
  get_order_detail,
};
