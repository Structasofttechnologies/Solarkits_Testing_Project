/**
 * po.refund.service.js
 *
 * Full lifecycle management for Purchase Order (PO) Token Refund Requests:
 * - Eligibility validation & penalty calculation
 * - Customer / Franchisee refund request creation
 * - Admin / Accounts approval queue
 * - Payout processing with UTR / bank reference
 * - Rejection tracking with mandatory reason and audit history
 */

const mongoose = require('mongoose');
const { FpoOrder, PoRefundRequest } = require('../models/india_solarshop_db');
const { calculatePoPenalty } = require('./po.penalty.service');
const { logAudit } = require('../utils/audit.service');

/**
 * Submit a Token Refund Request for an eligible or expired PO.
 */
async function createPoRefundRequest({
  po_id,
  requester_id,
  requester_role = 'FRANCHISEE',
  requester_name = null,
  requester_phone = null,
  requester_email = null,
  bank_details = {},
  req = null,
}) {
  if (!po_id) throw new Error('PO Order ID is required');
  const po = await FpoOrder.findById(po_id);
  if (!po) throw new Error(`PO Order "${po_id}" not found`);

  // Verify ownership if not admin
  if (requester_role === 'FRANCHISEE' && po.franchisee_id) {
    if (String(po.franchisee_id) !== String(requester_id)) {
      throw new Error('Unauthorized: You can only request refunds for your own Purchase Orders.');
    }
  } else if (requester_role === 'SOLAR_EPC' && po.epc_id) {
    if (String(po.epc_id) !== String(requester_id)) {
      throw new Error('Unauthorized: You can only request refunds for your own Purchase Orders.');
    }
  }

  // Prevent duplicate active requests
  const existingPending = await PoRefundRequest.findOne({
    po_id: po._id,
    status: { $in: ['PENDING', 'APPROVED'] },
  });
  if (existingPending) {
    throw new Error(`A refund request is already in progress (${existingPending.status}) for PO ${po.po_number}.`);
  }

  // Financial & Quota metrics
  const committedQty = Number(po.total_booked_quantity || po.total_quantity || po.items?.[0]?.quantity || 0);
  const purchasedQty = Number(po.fulfilled_quantity || 0);
  const tokenPaidPaise = Number(po.token_paid_paise || po.token_amount_paise || 0);
  const tokenAdjustedPaise = Number(po.token_adjusted_total_paise || 0);
  const unitPricePaise = Number(po.items?.[0]?.unit_price_paise || 4500000);

  if (tokenPaidPaise <= 0) {
    throw new Error('No token deposit found on this Purchase Order to refund.');
  }

  const penaltyCalc = calculatePoPenalty({
    committedQty,
    purchasedQty,
    tokenPaidPaise,
    tokenAdjustedPaise,
    unitPricePaise,
    penaltyRuleSnapshot: po.penalty_rule_snapshot || po.po_settings_snapshot,
  });

  if (penaltyCalc.refundablePaise <= 0) {
    throw new Error(
      `Zero refundable balance available after accounting for adjusted token and applicable penalty of ₹${(penaltyCalc.penaltyPaise / 100).toLocaleString('en-IN')}.`
    );
  }

  const refundDoc = await PoRefundRequest.create({
    po_id: po._id,
    po_number: po.po_number,
    requester_id,
    requester_role,
    requester_name: requester_name || po.customer_details?.name || 'Authorized Partner',
    requester_phone: requester_phone || po.customer_details?.phone || null,
    requester_email: requester_email || po.customer_details?.email || null,
    committed_quantity: committedQty,
    purchased_quantity: purchasedQty,
    unpurchased_quantity: penaltyCalc.unpurchasedQty,
    token_paid_paise: tokenPaidPaise,
    token_adjusted_paise: tokenAdjustedPaise,
    penalty_paise: penaltyCalc.penaltyPaise,
    penalty_reason: penaltyCalc.penaltyReason,
    refundable_amount_paise: penaltyCalc.refundablePaise,
    bank_details: {
      account_name:   bank_details.account_name   || null,
      bank_name:      bank_details.bank_name      || null,
      account_number: bank_details.account_number || null,
      ifsc_code:      bank_details.ifsc_code      || null,
      upi_id:         bank_details.upi_id         || null,
    },
    status: 'PENDING',
    audit_history: [
      {
        action: 'REFUND_REQUESTED',
        actor_type: requester_role === 'ADMIN' ? 'cms_user' : 'reseller',
        actor_id: requester_id,
        actor_name: requester_name,
        note: `Requested refund of ₹${(penaltyCalc.refundablePaise / 100).toLocaleString('en-IN')} (Penalty: ₹${(penaltyCalc.penaltyPaise / 100).toLocaleString('en-IN')})`,
        timestamp: new Date(),
      },
    ],
  });

  // Update PO state
  po.settlement_status = 'REFUND_REQUESTED';
  po.refund_request_id = refundDoc._id;
  po.unpurchased_quantity = penaltyCalc.unpurchasedQty;
  po.applicable_penalty_paise = penaltyCalc.penaltyPaise;
  po.refundable_token_paise = penaltyCalc.refundablePaise;
  po.token_balance_paise = penaltyCalc.refundablePaise;
  po.refund_request_snapshot = {
    request_id: refundDoc._id,
    status: 'PENDING',
    requested_at: refundDoc.created_at,
    refundable_amount_paise: penaltyCalc.refundablePaise,
    penalty_paise: penaltyCalc.penaltyPaise,
  };
  await po.save();

  await logAudit({
    actor_type: requester_role === 'ADMIN' ? 'cms_user' : 'reseller',
    actor_id: requester_id,
    action: 'PO_REFUND_REQUEST_CREATED',
    entity_type: 'fpo_orders',
    entity_id: po._id,
    after_snapshot: {
      refund_request_id: refundDoc._id,
      refundable_amount_paise: penaltyCalc.refundablePaise,
      penalty_paise: penaltyCalc.penaltyPaise,
    },
    req,
  });

  return refundDoc;
}

/**
 * List PO Refund Requests for Admin / Accounts approval queue.
 */
async function listPoRefundRequests({ status = null, page = 1, limit = 50, search = '' } = {}) {
  const query = {};
  if (status && status !== 'ALL') {
    query.status = status;
  }
  if (search) {
    const rx = new RegExp(search.trim(), 'i');
    query.$or = [
      { po_number: rx },
      { requester_name: rx },
      { requester_phone: rx },
      { 'bank_details.account_number': rx },
    ];
  }

  const total = await PoRefundRequest.countDocuments(query);
  const requests = await PoRefundRequest.find(query)
    .populate({
      path: 'po_id',
      select: 'po_number items total_booked_quantity fulfilled_quantity status expires_at lock_expires_at franchisee_id customer_details created_by_role',
      populate: [
        { path: 'franchisee_id', select: 'business_name mobile email contact_person' },
      ],
    })
    .sort({ created_at: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  return {
    total,
    page: Number(page),
    limit: Number(limit),
    requests,
  };
}

/**
 * Approve or Process a PO Token Refund Request.
 */
async function approvePoRefundRequest({
  request_id,
  admin_user_id,
  admin_name = 'Admin',
  approval_notes = null,
  payment_method = 'bank_transfer',
  payment_reference = null, // UTR
  req = null,
}) {
  const request = await PoRefundRequest.findById(request_id);
  if (!request) throw new Error(`Refund Request "${request_id}" not found`);

  if (!['PENDING', 'APPROVED'].includes(request.status)) {
    throw new Error(`Cannot process refund in status "${request.status}"`);
  }

  const now = new Date();
  const isProcessed = Boolean(payment_reference && payment_reference.trim());

  request.status = isProcessed ? 'PROCESSED' : 'APPROVED';
  request.approved_by = admin_user_id;
  request.approved_at = now;
  request.approval_notes = approval_notes || 'Approved by Accounts & Admin team';

  if (isProcessed) {
    request.payment_method = payment_method;
    request.payment_reference = payment_reference.trim().toUpperCase();
    request.processed_by = admin_user_id;
    request.processed_at = now;
  }

  request.audit_history.push({
    action: isProcessed ? 'REFUND_PROCESSED' : 'REFUND_APPROVED',
    actor_type: 'cms_user',
    actor_id: admin_user_id,
    actor_name: admin_name,
    note: isProcessed
      ? `Refund processed via ${payment_method}. UTR: ${request.payment_reference}`
      : `Refund approved for payout: ₹${(request.refundable_amount_paise / 100).toLocaleString('en-IN')}`,
    timestamp: now,
  });

  await request.save();

  // Sync state to parent PO Order
  const po = await FpoOrder.findById(request.po_id);
  if (po) {
    po.settlement_status = isProcessed ? 'REFUND_PROCESSED' : 'REFUND_APPROVED';
    if (isProcessed) {
      po.token_payment_status = 'ADJUSTED';
      po.token_balance_paise = 0;
      if (po.status !== 'COMPLETED') {
        po.status = 'COMPLETED';
      }
    }
    po.refund_request_snapshot = {
      request_id: request._id,
      status: request.status,
      approved_at: request.approved_at,
      payment_reference: request.payment_reference,
      refundable_amount_paise: request.refundable_amount_paise,
    };

    po.status_history.push({
      status: po.status,
      changed_by: admin_user_id,
      actor_type: 'cms_user',
      note: isProcessed
        ? `Token refund settled via ${payment_method}. UTR: ${request.payment_reference}`
        : 'Token refund request approved by Admin.',
      changed_at: now,
    });
    await po.save();
  }

  await logAudit({
    actor_type: 'cms_user',
    actor_id: admin_user_id,
    action: isProcessed ? 'PO_REFUND_PROCESSED' : 'PO_REFUND_APPROVED',
    entity_type: 'po_refund_requests',
    entity_id: request._id,
    after_snapshot: {
      status: request.status,
      payment_reference: request.payment_reference,
      refundable_amount_paise: request.refundable_amount_paise,
    },
    req,
  });

  return request;
}

/**
 * Reject a PO Token Refund Request with mandatory reason.
 */
async function rejectPoRefundRequest({
  request_id,
  admin_user_id,
  admin_name = 'Admin',
  rejection_reason,
  req = null,
}) {
  if (!rejection_reason || !rejection_reason.trim()) {
    throw new Error('Rejection reason is mandatory when rejecting a refund request.');
  }

  const request = await PoRefundRequest.findById(request_id);
  if (!request) throw new Error(`Refund Request "${request_id}" not found`);

  if (request.status !== 'PENDING') {
    throw new Error(`Cannot reject refund request in status "${request.status}"`);
  }

  const now = new Date();
  request.status = 'REJECTED';
  request.rejection_reason = rejection_reason.trim();
  request.rejected_by = admin_user_id;
  request.rejected_at = now;

  request.audit_history.push({
    action: 'REFUND_REJECTED',
    actor_type: 'cms_user',
    actor_id: admin_user_id,
    actor_name: admin_name,
    note: `Rejected: ${rejection_reason.trim()}`,
    timestamp: now,
  });

  await request.save();

  // Update parent PO Order
  const po = await FpoOrder.findById(request.po_id);
  if (po) {
    po.settlement_status = 'REFUND_REJECTED';
    po.refund_request_snapshot = {
      request_id: request._id,
      status: 'REJECTED',
      rejection_reason: request.rejection_reason,
      rejected_at: request.rejected_at,
    };

    po.status_history.push({
      status: po.status,
      changed_by: admin_user_id,
      actor_type: 'cms_user',
      note: `Refund request rejected: ${request.rejection_reason}`,
      changed_at: now,
    });
    await po.save();
  }

  await logAudit({
    actor_type: 'cms_user',
    actor_id: admin_user_id,
    action: 'PO_REFUND_REJECTED',
    entity_type: 'po_refund_requests',
    entity_id: request._id,
    after_snapshot: {
      status: request.status,
      rejection_reason: request.rejection_reason,
    },
    req,
  });

  return request;
}

module.exports = {
  createPoRefundRequest,
  listPoRefundRequests,
  approvePoRefundRequest,
  rejectPoRefundRequest,
};
