/**
 * invoice.service.js
 *
 * Tax-compliant Invoice & Credit Note Generation Service.
 * Formats structured invoice JSON with unique sequential numbers,
 * itemized GST breakdowns (CGST/SGST vs IGST), seller & buyer GSTINs.
 */

function generateSequentialInvoiceNumber(prefix = 'INV', counter = Date.now()) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(counter).slice(-6);
  return `${prefix}-${dateStr}-${seq}`;
}

function generateInvoiceData({ order, sellerInfo = {}, buyerInfo = {} }) {
  if (!order) throw new Error('Order data is required for invoice generation');

  const isIntraState = sellerInfo.state_id && buyerInfo.state_id &&
    sellerInfo.state_id.toString() === buyerInfo.state_id.toString();

  const subtotalPaise = order.subtotal_paise || Math.round((order.selling_price_snapshot || order.base_price_snapshot || 0) * 100);
  const taxTotalPaise = order.tax_total_paise || 0;
  const shippingFeePaise = order.shipping_fee_paise || 0;
  const grandTotalPaise = order.grand_total_paise || (subtotalPaise + taxTotalPaise + shippingFeePaise);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isIntraState) {
    cgstPaise = Math.round(taxTotalPaise / 2);
    sgstPaise = taxTotalPaise - cgstPaise;
  } else {
    igstPaise = taxTotalPaise;
  }

  const invoiceNumber = generateSequentialInvoiceNumber('INV', order.order_number || order.procurement_order_number || order._id);

  return {
    invoice_number: invoiceNumber,
    order_number: order.order_number || order.procurement_order_number || String(order._id),
    invoice_date: new Date().toISOString(),
    seller: {
      name: sellerInfo.name || 'SolarKits India Private Limited',
      address: sellerInfo.address || 'Corporate Office, Solar Tech Park, India',
      gstin: sellerInfo.gstin || '24AAACS1234F1Z5',
      state_name: sellerInfo.state_name || 'Gujarat',
    },
    buyer: {
      name: buyerInfo.name || buyerInfo.business_name || 'Valued Customer',
      address: buyerInfo.address || order.delivery_address?.line || 'Delivery Address Registered',
      gstin: buyerInfo.gstin || 'UNREGISTERED',
      state_name: buyerInfo.state_name || order.delivery_address?.state_name || 'India',
    },
    line_items: (order.items || []).map((item, idx) => ({
      index: idx + 1,
      item_name: item.item_name || 'Solar Equipment Kit',
      quantity: item.quantity || 1,
      unit_price_inr: ((item.unit_price_paise || 0) / 100).toFixed(2),
      taxable_value_inr: (((item.unit_price_paise || 0) * (item.quantity || 1)) / 100).toFixed(2),
      gst_rate: `${item.gst_rate != null ? item.gst_rate : 12}%`,
      total_price_inr: ((item.total_price_paise || 0) / 100).toFixed(2),
    })),
    totals: {
      subtotal_inr: (subtotalPaise / 100).toFixed(2),
      cgst_inr: (cgstPaise / 100).toFixed(2),
      sgst_inr: (sgstPaise / 100).toFixed(2),
      igst_inr: (igstPaise / 100).toFixed(2),
      tax_total_inr: (taxTotalPaise / 100).toFixed(2),
      shipping_fee_inr: (shippingFeePaise / 100).toFixed(2),
      grand_total_inr: (grandTotalPaise / 100).toFixed(2),
    },
    payment_reference: order.payment_reference || 'N/A',
    payment_status: order.payment_status || 'captured',
  };
}

function generateCreditNote({ orderNumber, refundAmountInr, reason, isFullRefund }) {
  const creditNoteNumber = generateSequentialInvoiceNumber('CN', Date.now());
  return {
    credit_note_number: creditNoteNumber,
    original_order_number: orderNumber,
    credit_note_date: new Date().toISOString(),
    refund_amount_inr: refundAmountInr,
    type: isFullRefund ? 'Full Return & Refund Credit Note' : 'Partial Adjustment Credit Note',
    reason: reason || 'Customer Refund Approved',
  };
}

module.exports = {
  generateSequentialInvoiceNumber,
  generateInvoiceData,
  generateCreditNote,
};
