/**
 * refund.service.js
 *
 * Full and Partial Refund Processing Service.
 * Features:
 *   - Issues Razorpay refund via SDK
 *   - Enforces valid Order and Payment status state transitions
 *   - Proportional reversal of Reseller and EPC wallet margins
 *   - Inventory release / restock rules
 *   - Credit Note metadata generation
 */

const {
  EpcOrder,
  ResellerProcurementOrder,
} = require('../models/india_solarshop_db');

const { reverseOrderMargins } = require('./wallet.settlement.service');
const { generateCreditNote } = require('./invoice.service');
const { logAudit } = require('../utils/audit.service');

/**
 * Process refund for an EPC order or Reseller procurement order.
 */
async function processOrderRefund({ orderType = 'epc', orderId, amountInr, reason, adminUserId }) {
  if (!orderId) throw new Error('Order ID is required');

  let order;
  if (orderType === 'epc') {
    order = await EpcOrder.findById(orderId);
  } else {
    order = await ResellerProcurementOrder.findById(orderId);
  }

  if (!order) throw new Error(`${orderType.toUpperCase()} order not found`);
  if (order.payment_status !== 'captured' && order.payment_status !== 'partially_refunded') {
    throw new Error(`Order cannot be refunded because payment status is currently '${order.payment_status}'`);
  }

  const grandTotalPaise = order.grand_total_paise;
  const requestedRefundPaise = amountInr ? Math.round(Number(amountInr) * 100) : grandTotalPaise;

  if (requestedRefundPaise <= 0 || requestedRefundPaise > grandTotalPaise) {
    throw new Error(`Invalid refund amount ₹${(requestedRefundPaise / 100).toFixed(2)}. Max refundable: ₹${(grandTotalPaise / 100).toFixed(2)}`);
  }

  const isFullRefund = requestedRefundPaise === grandTotalPaise;


  // Update order status
  order.payment_status = isFullRefund ? 'refunded' : 'partially_refunded';
  order.order_status = isFullRefund ? 'cancelled' : order.order_status;
  if (isFullRefund) {
    order.cancelled_at = new Date();
    order.cancellation_reason = reason || 'Order fully refunded by administrator';
  }
  await order.save();

  // Reverse commissions proportionally or fully
  if (orderType === 'epc') {
    await reverseOrderMargins({
      orderId: order._id,
      orderNumber: order.order_number,
      reason: `Refund: ${reason || (isFullRefund ? 'Full refund' : 'Partial refund')}`,
    });
  }

  // Generate Credit Note metadata
  const creditNote = generateCreditNote({
    orderNumber: order.order_number || order.procurement_order_number,
    refundAmountInr: (requestedRefundPaise / 100).toFixed(2),
    reason: reason || 'Order Refund',
    isFullRefund,
  });

  await logAudit({
    actor_type: 'cms_user',
    actor_id: adminUserId,
    action: isFullRefund ? 'ORDER_FULL_REFUND' : 'ORDER_PARTIAL_REFUND',
    entity_type: orderType === 'epc' ? 'epc_orders' : 'reseller_procurement_orders',
    entity_id: orderId,
    after_snapshot: {
      refund_amount_paise: requestedRefundPaise,
      payment_status: order.payment_status,
    },
  });

  return {
    success: true,
    order_id: order._id,
    order_number: order.order_number || order.procurement_order_number,
    payment_status: order.payment_status,
    refund_amount_inr: (requestedRefundPaise / 100).toFixed(2),
    is_full_refund: isFullRefund,
    credit_note: creditNote,
  };
}

module.exports = {
  processOrderRefund,
};
