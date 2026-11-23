/**
 * reseller.admin.handler.js
 *
 * Admin controller for managing Reseller accounts & KYC review queue.
 * Phase 2 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const {
  Reseller,
  ResellerKyc,
  ResellerPlan,
  ResellerPlanSubscription,
  ResellerTerritory,
  ResellerAgreement,
  AuditLog,
} = require('../models/india_solarshop_db');
const { CmsUser } = require('../models/user_db');
const { logAudit } = require('../utils/audit.service');
const { evaluateActivationReadiness } = require('../services/reseller.activation.service');
const { performGstVerification } = require('../services/gst.verification.service');
const { listEpcTransferRequests, reviewEpcTransferRequest } = require('../utils/epc.reseller.service');
const { syncGstDerivedTerritoryForReseller } = require('../utils/territory.validator');
const { createStoreSetupForFranchisee } = require('../services/store.setup.service');
const { syncLeadPipelineFromOnboarding } = require('../services/bde.lead.service');

// ─── 1. LIST RESELLERS ────────────────────────────────────────────────────────
/**
 * GET /admin-api/resellers/list
 * Query params: ?page=1&limit=20&search=...&kyc_status=...&activation_status=...&reseller_type_id=...
 */
const list_resellers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { search, kyc_status, activation_status, reseller_type_id, state_id, district_id } = req.query;
    const query = { deleted_at: null };

    if (kyc_status) query.kyc_status = kyc_status;
    if (activation_status) query.activation_status = activation_status;
    if (reseller_type_id && mongoose.Types.ObjectId.isValid(reseller_type_id)) {
      query.reseller_type_id = reseller_type_id;
    }
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      query['address.state_id'] = new mongoose.Types.ObjectId(state_id);
    }
    if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
      query['address.district_id'] = new mongoose.Types.ObjectId(district_id);
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { business_name: regex },
        { email: regex },
        { mobile: regex },
        { gst_number: regex },
      ];
    }

    const [rows, total] = await Promise.all([
      Reseller.find(query)
        .populate('reseller_type_id', 'name slug commercial_mode')
        .populate('address.state_id', 'name state_code')
        .populate('address.district_id', 'name district_code')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reseller.countDocuments(query),
    ]);

    const data = rows.map((r) => ({
      id: r._id,
      business_name: r.business_name,
      contact_person: r.contact_person,
      gst_number: r.gst_number,
      pan_number: r.pan_number,
      aadhaar_masked: r.aadhaar_masked,
      mobile: r.mobile,
      email: r.email,
      commercial_mode: r.commercial_mode,
      reseller_type: r.reseller_type_id ? { id: r.reseller_type_id._id, name: r.reseller_type_id.name, mode: r.reseller_type_id.commercial_mode } : null,
      address: r.address ? {
        ...r.address,
        state_id: r.address.state_id?._id ? String(r.address.state_id._id) : (r.address.state_id ? String(r.address.state_id) : null),
        state_name: r.address.state_id?.name || null,
        district_id: r.address.district_id?._id ? String(r.address.district_id._id) : (r.address.district_id ? String(r.address.district_id) : null),
        district_name: r.address.district_id?.name || null,
      } : null,
      kyc_status: r.kyc_status,
      agreement_status: r.agreement_status,
      fee_payment_status: r.fee_payment_status || 'pending_payment',
      fee_payment_utr: r.fee_payment_utr,
      fee_payment_receipt_url: r.fee_payment_receipt_url,
      activation_status: r.activation_status,
      reseller_lifecycle_status: r.reseller_lifecycle_status || 'draft',
      is_active: r.is_active,
      created_at: r.created_at,
    }));

    return res.json({
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[reseller.admin] list_resellers error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. GET SINGLE RESELLER DETAIL ───────────────────────────────────────────
/**
 * GET /admin-api/resellers/:id
 */
const get_reseller_detail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    await syncGstDerivedTerritoryForReseller(id);

    const [reseller, kyc, subscription, agreement, auditLogs, territories] = await Promise.all([
      Reseller.findOne({ _id: id, deleted_at: null })
        .populate('reseller_type_id', 'name slug commercial_mode description')
        .lean(),
      ResellerKyc.findOne({ reseller_id: id }).lean(),
      ResellerPlanSubscription.findOne({ reseller_id: id }).populate('plan_id').sort({ created_at: -1 }).lean(),
      ResellerAgreement.findOne({ reseller_id: id }).sort({ created_at: -1 }).lean(),
      AuditLog.find({ entity_id: id }).sort({ created_at: -1 }).limit(50).lean(),
      ResellerTerritory.find({ reseller_id: id, status: 'active' })
        .populate('state_id', 'name iso_code')
        .populate('district_id', 'name code')
        .sort({ created_at: -1 })
        .lean(),
    ]);

    if (!reseller) {
      return res.status(404).json({ status: 'error', message: 'Reseller not found' });
    }

    if (kyc && kyc.verified_by) {
      const vUser = await CmsUser.findById(kyc.verified_by).select('name email').lean();
      kyc.verified_by = vUser ? { id: vUser._id, name: vUser.name, email: vUser.email } : null;
    }

    return res.json({
      status: 'success',
      data: {
        reseller: {
          id: reseller._id,
          business_name: reseller.business_name,
          contact_person: reseller.contact_person,
          gst_number: reseller.gst_number,
          gst_legal_name: reseller.gst_legal_name,
          gst_trade_name: reseller.gst_trade_name,
          gst_verified_at: reseller.gst_verified_at,
          pan_number: reseller.pan_number,
          aadhaar_masked: reseller.aadhaar_masked,
          mobile: reseller.mobile,
          email: reseller.email,
          commercial_mode: reseller.commercial_mode,
          reseller_type: reseller.reseller_type_id,
          address: reseller.address,
          kyc_status: reseller.kyc_status,
          agreement_status: reseller.agreement_status,
          agreement_signed_at: reseller.agreement_signed_at || agreement?.signed_at || null,
          agreement_signer_name: reseller.agreement_signer_name || agreement?.signer_name || null,
          fee_payment_status: reseller.fee_payment_status || subscription?.payment_status || 'pending_payment',
          fee_payment_utr: reseller.fee_payment_utr || subscription?.utr_number || null,
          fee_payment_amount: reseller.fee_payment_amount || subscription?.amount_paid || null,
          fee_payment_date: reseller.fee_payment_date || subscription?.payment_date || null,
          fee_payment_receipt_url: reseller.fee_payment_receipt_url || subscription?.receipt_url || null,
          fee_payment_verified_at: reseller.fee_payment_verified_at || subscription?.verified_at || null,
          fee_payment_remarks: reseller.fee_payment_remarks || subscription?.verification_remarks || null,
          activation_status: reseller.activation_status,
          reseller_lifecycle_status: reseller.reseller_lifecycle_status || 'draft',
          is_email_verified: reseller.is_email_verified,
          is_mobile_verified: reseller.is_mobile_verified,
          is_active: reseller.is_active,
          created_at: reseller.created_at,
        },
        kyc: kyc || null,
        agreement: agreement || null,
        active_subscription: subscription || null,
        subscription: subscription || null,
        territories: territories.map((t) => ({
          id: t._id,
          scope_level: t.territory_level,
          territory_level: t.territory_level,
          location_name: t.district_id?.name ? `${t.district_id.name}, ${t.state_id?.name || ''}` : t.state_id?.name || 'Authorized Territory',
          precedence_source: t.source || 'admin_assigned',
          source: t.source || 'admin_assigned',
          override_reason: t.override_reason || null,
          created_at: t.created_at,
        })),
        audit_history: auditLogs.map(l => ({
          id: l._id,
          action: l.action,
          actor_type: l.actor_type,
          actor_id: l.actor_id,
          created_at: l.created_at,
          snapshot: l.after_snapshot,
        })),
      },
    });
  } catch (error) {
    console.error('[reseller.admin] get_reseller_detail error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};


// ─── 3. REVIEW KYC (Verify / Reject / Request Resubmission) ──────────────────
/**
 * PUT /admin-api/resellers/:id/kyc/review
 * Body: { decision: "verify"|"reject"|"resubmit", note?: string }
 */
const review_kyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    if (!decision || !['verify', 'reject', 'resubmit'].includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'decision must be verify, reject, or resubmit' });
    }

    if ((decision === 'reject' || decision === 'resubmit') && (!note || !note.trim())) {
      return res.status(400).json({ status: 'error', message: 'Reason note is required when rejecting or requesting resubmission' });
    }

    const reseller = await Reseller.findOne({ _id: id, deleted_at: null });
    if (!reseller) return res.status(404).json({ status: 'error', message: 'Reseller not found' });

    let kyc = await ResellerKyc.findOne({ reseller_id: id });
    if (!kyc) {
      kyc = await ResellerKyc.create({ reseller_id: id, status: 'draft' });
    }

    const beforeResellerStatus = reseller.kyc_status;
    const beforeKycStatus = kyc.status;

    let targetKycStatus = 'pending';
    let actionCode = 'KYC_REVIEW';

    const validAdminId = req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : null;

    if (decision === 'verify') {
      targetKycStatus = 'verified';
      actionCode = 'KYC_VERIFY';
      kyc.verified_by = validAdminId;
      kyc.verified_at = new Date();
      kyc.rejected_reason = null;
      kyc.resubmission_note = null;

      // Update lifecycle status to kyc_verified
      reseller.reseller_lifecycle_status = 'kyc_verified';
      if (reseller.is_operational) {
        reseller.activation_status = 'active';
      }
      reseller.is_active = true;
    } else if (decision === 'reject') {
      targetKycStatus = 'rejected';
      actionCode = 'KYC_REJECT';
      kyc.rejected_reason = note.trim();
      reseller.reseller_lifecycle_status = 'kyc_rejected';
    } else if (decision === 'resubmit') {
      targetKycStatus = 'resubmission_required';
      actionCode = 'KYC_RESUBMIT_REQUEST';
      kyc.resubmission_note = note.trim();
      reseller.reseller_lifecycle_status = 'kyc_resubmission_required';
    }

    // Update KYC document
    kyc.status = targetKycStatus;
    kyc.history.push({
      status: targetKycStatus,
      actor_type: 'cms_user',
      actor_id: validAdminId,
      note: note ? note.trim() : null,
      timestamp: new Date(),
    });
    await kyc.save();

    // Update Reseller document
    reseller.kyc_status = targetKycStatus;
    reseller.updated_by = validAdminId;
    await reseller.save();

    // Step 2: Sync BDE Lead pipeline
    if (decision === 'verify') {
      syncLeadPipelineFromOnboarding(reseller._id, 'admin_approved').catch((err) => console.error('[BDE Lead Sync Error]', err));
    } else if (decision === 'reject') {
      syncLeadPipelineFromOnboarding(reseller._id, 'rejected', { reason: note }).catch((err) => console.error('[BDE Lead Sync Error]', err));
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: actionCode,
      entity_type: 'resellers',
      entity_id: id,
      before_snapshot: { kyc_status: beforeResellerStatus, kyc_doc_status: beforeKycStatus },
      after_snapshot: { kyc_status: targetKycStatus, note: note ? note.trim() : null },
      req,
    });

    return res.json({
      status: 'success',
      message: `KYC review decision recorded: ${targetKycStatus}`,
      data: {
        reseller_id: id,
        kyc_status: targetKycStatus,
        lifecycle_status: reseller.reseller_lifecycle_status,
      },
    });
  } catch (error) {
    console.error('[reseller.admin] review_kyc error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. GET ACTIVATION READINESS ─────────────────────────────────────────────
/**
 * GET /admin-api/resellers/:id/activation-readiness
 */
const get_activation_readiness = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    const readiness = await evaluateActivationReadiness(id);
    return res.json({ status: 'success', data: readiness });
  } catch (error) {
    console.error('[reseller.admin] get_activation_readiness error:', error.message);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

// ─── 5. CHANGE ACTIVATION STATUS (Activate / Suspend / Terminate) ───────────
/**
 * PUT /admin-api/resellers/:id/activation-status
 * Body: { activation_status: "active"|"suspended"|"terminated", reason?: string }
 */
const change_activation_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { activation_status, reason } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    if (!['active', 'suspended', 'terminated', 'pending'].includes(activation_status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid activation_status' });
    }

    const validAdminId = req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : null;
    const reasonText = reason && reason.trim() ? reason.trim() : `Account ${activation_status} by Admin`;

    const reseller = await Reseller.findOne({ _id: id, deleted_at: null });
    if (!reseller) return res.status(404).json({ status: 'error', message: 'Reseller not found' });

    const beforeStatus = reseller.activation_status;

    // Safety Rule: If activating, evaluate activation readiness via service
    if (activation_status === 'active') {
      const readiness = await evaluateActivationReadiness(id);
      if (!readiness.is_ready_for_activation) {
        return res.status(409).json({
          status: 'error',
          message: `Cannot activate reseller. Missing requirements: ${readiness.missing_requirements.join(', ')}`,
          data: readiness,
        });
      }
    }

    reseller.activation_status = activation_status;
    reseller.is_active = activation_status === 'active';
    if (activation_status === 'active') {
      reseller.reseller_lifecycle_status = 'active';
    } else if (activation_status === 'suspended') {
      reseller.reseller_lifecycle_status = 'suspended';
    } else if (activation_status === 'terminated') {
      reseller.reseller_lifecycle_status = 'terminated';
    }

    reseller.updated_by = validAdminId;
    await reseller.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: validAdminId,
      action: `RESELLER_${activation_status.toUpperCase()}`,
      entity_type: 'resellers',
      entity_id: id,
      before_snapshot: { activation_status: beforeStatus },
      after_snapshot: { activation_status, reason: reasonText },
      reason: reasonText,
      req,
    });

    return res.json({
      status: 'success',
      message: `Reseller activation status updated to "${activation_status}"`,
      data: { id: reseller._id, activation_status: reseller.activation_status, lifecycle_status: reseller.reseller_lifecycle_status },
    });
  } catch (error) {
    console.error('[reseller.admin] change_activation_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 6. ADMIN GST VERIFY ──────────────────────────────────────────────────────
/**
 * POST /admin-api/reseller-mgmt/gst-verify
 * Body: { reseller_id, gstin }
 */
const verify_gstin_admin = async (req, res) => {
  try {
    const { reseller_id, gstin } = req.body;
    if (!gstin) return res.status(400).json({ status: 'error', message: 'gstin is required' });

    const result = await performGstVerification({
      gstin,
      entity_type: 'reseller',
      entity_id: reseller_id || null,
      verified_by: req.user?.id || 'system',
      options: { provider: process.env.QUICKEKYC_PROVIDER || process.env.GST_VERIFY_PROVIDER || 'mock' },
    });

    if (result.is_valid && reseller_id && mongoose.Types.ObjectId.isValid(reseller_id)) {
      await Reseller.findByIdAndUpdate(reseller_id, {
        $set: {
          gst_number: result.gstin,
          gst_legal_name: result.legal_name,
          gst_trade_name: result.trade_name,
          gst_registration_status: result.business_status || 'ACTIVE',
          gst_verified_at: new Date(),
          gst_verification_log_id: result.log_id,
          reseller_lifecycle_status: 'gst_verified',
        },
      });
      await syncGstDerivedTerritoryForReseller(reseller_id);
    }

    return res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[reseller.admin] verify_gstin_admin error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. ASSIGN PLAN TO RESELLER (Admin Manual Subscription) ─────────────────
/**
 * POST /admin-api/resellers/:id/subscription/assign
 * Body: { plan_id, payment_reference?, amount_paid? }
 */
const assign_plan_to_reseller = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id, payment_reference, amount_paid } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }
    if (!plan_id || !mongoose.Types.ObjectId.isValid(plan_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid plan_id is required' });
    }

    const [reseller, plan] = await Promise.all([
      Reseller.findOne({ _id: id, deleted_at: null }),
      ResellerPlan.findOne({ _id: plan_id, deleted_at: null, is_active: true }),
    ]);

    if (!reseller) return res.status(404).json({ status: 'error', message: 'Reseller not found' });
    if (!plan) return res.status(404).json({ status: 'error', message: 'Active plan not found' });

    // Calculate expiry
    const startDate = new Date();
    const expiryDate = new Date(startDate);
    if (plan.validity_unit === 'months') {
      expiryDate.setMonth(expiryDate.getMonth() + plan.validity_value);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + plan.validity_value);
    }

    const graceExpiryDate = new Date(expiryDate);
    const graceDays = plan.renewal_rules?.grace_period_days || 15;
    graceExpiryDate.setDate(graceExpiryDate.getDate() + graceDays);

    // Cancel existing active subscription if any
    await ResellerPlanSubscription.updateMany(
      { reseller_id: id, status: 'active' },
      { $set: { status: 'cancelled' } }
    );

    const subscription = await ResellerPlanSubscription.create({
      reseller_id: id,
      plan_id: plan._id,
      start_date: startDate,
      expiry_date: expiryDate,
      grace_expiry_date: graceExpiryDate,
      amount_paid: amount_paid != null ? Number(amount_paid) : plan.one_time_fee,
      currency: plan.currency,
      payment_reference: payment_reference ? payment_reference.trim() : 'ADMIN_MANUAL_ASSIGNMENT',
      status: 'active',
    });

    reseller.plan_subscription_id = subscription._id;
    reseller.updated_by = req.user?.id || null;
    await reseller.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PLAN_SUBSCRIPTION_ASSIGN',
      entity_type: 'reseller_plan_subscriptions',
      entity_id: subscription._id,
      after_snapshot: subscription.toObject(),
      req,
    });

    return res.status(201).json({
      status: 'success',
      message: `Plan "${plan.name}" successfully assigned to ${reseller.business_name}`,
      data: { subscription_id: subscription._id, plan_id: plan._id, expiry_date: expiryDate },
    });
  } catch (error) {
    console.error('[reseller.admin] assign_plan_to_reseller error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 7. LIST EPC GSTIN CONFLICTS / TRANSFER REQUESTS ─────────────────────────
/**
 * GET /admin-api/reseller-mgmt/epc-conflicts
 * Query params: ?status=pending|approved|rejected
 */
const list_epc_conflicts = async (req, res) => {
  try {
    const rows = await listEpcTransferRequests(req.query);
    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[reseller.admin] list_epc_conflicts error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 8. REVIEW EPC TRANSFER REQUEST ───────────────────────────────────────────
/**
 * PUT /admin-api/reseller-mgmt/epc-transfer/:id
 * Body: { decision: "approved"|"rejected", review_note?: string }
 */
const review_epc_transfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, review_note } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid transfer request ID is required' });
    }
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'decision must be approved or rejected' });
    }

    const result = await reviewEpcTransferRequest(id, req.user?.id || null, decision, review_note);
    return res.json({
      status: 'success',
      message: `EPC transfer request ${decision} successfully`,
      data: result,
    });
  } catch (error) {
    console.error('[reseller.admin] review_epc_transfer error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

const { processOrderRefund } = require('../services/refund.service');
const { RazorpayWebhookLog } = require('../models/india_solarshop_db');

const get_razorpay_status = async (req, res) => {
  try {
    return res.json({
      status: 'success',
      data: {
        configured: false,
        gateway: 'none',
        message: 'Razorpay payment gateway is removed',
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const process_order_refund_admin = async (req, res) => {
  try {
    const { order_type, order_id, amount_inr, reason } = req.body;
    const result = await processOrderRefund({
      orderType: order_type || 'epc',
      orderId: order_id,
      amountInr: amount_inr,
      reason,
      adminUserId: req.user?.id || null,
    });
    return res.json({ status: 'success', data: result });
  } catch (error) {
    console.error('[reseller.admin] process_order_refund_admin error:', error.message);
    return res.status(400).json({ status: 'error', message: error.message || 'Refund failed' });
  }
};

const list_webhook_logs = async (req, res) => {
  try {
    const logs = await RazorpayWebhookLog.find()
      .sort({ created_at: -1 })
      .limit(100)
      .lean();
    return res.json({ status: 'success', data: logs });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

const verify_fee_payment_receipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller ID is required' });
    }

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'decision must be "approve" or "reject"' });
    }

    const reseller = await Reseller.findOne({ _id: id, deleted_at: null });
    if (!reseller) {
      return res.status(404).json({ status: 'error', message: 'Reseller not found' });
    }

    let subscription = await ResellerPlanSubscription.findOne({ reseller_id: id }).sort({ created_at: -1 });

    const adminId = req.user?.id || null;
    const cleanRemarks = remarks ? remarks.trim() : null;

    if (decision === 'approve') {
      if (subscription) {
        subscription.payment_status = 'verified';
        subscription.status = 'active';
        subscription.verified_by = adminId;
        subscription.verified_at = new Date();
        subscription.verification_remarks = cleanRemarks || 'Payment receipt approved by Admin.';
        await subscription.save();
      }

      reseller.fee_payment_status = 'verified';
      reseller.fee_payment_verified_at = new Date();
      reseller.fee_payment_verified_by = adminId;
      reseller.fee_payment_remarks = cleanRemarks || 'Payment receipt verified and approved';
      // Account remains pending & non-operational until BDE completes store setup and Admin launches operations
      reseller.activation_status = 'pending';
      reseller.is_active = true;
      reseller.is_operational = false;
      reseller.reseller_lifecycle_status = 'store_setup_pending';
      await reseller.save();

      // Ensure assigned territories are active
      await ResellerTerritory.updateMany(
        { reseller_id: id },
        { $set: { status: 'active' } }
      );

      // Step 3: Trigger automatic Store Setup creation if agreement is signed
      try {
        const setup = await createStoreSetupForFranchisee(reseller._id, adminId);
        if (setup && !reseller.store_setup_id) {
          reseller.store_setup_id = setup._id;
          await reseller.save();
        }
      } catch (setupErr) {
        console.error('[reseller.admin] Auto store setup creation error:', setupErr);
      }

      // Step 2: Sync BDE Lead stage to fee_paid
      try {
        await syncLeadPipelineFromOnboarding(reseller._id, 'fee_payment_verified');
      } catch (syncErr) {
        console.error('[reseller.admin] BDE Lead sync error on fee payment:', syncErr);
      }

      await logAudit({
        actor_type: 'cms_user',
        actor_id: adminId,
        action: 'RESELLER_FEE_RECEIPT_VERIFIED_ACTIVATED',
        entity_type: 'resellers',
        entity_id: reseller._id,
        after_snapshot: {
          reseller_id: reseller._id,
          fee_payment_status: 'verified',
          activation_status: 'active',
          remarks: cleanRemarks,
        },
        req,
      });

      return res.json({
        status: 'success',
        message: `Fee payment receipt verified successfully! Franchise partner "${reseller.business_name}" is now 100% active.`,
        data: {
          reseller_id: reseller._id,
          fee_payment_status: 'verified',
          activation_status: 'active',
          reseller_lifecycle_status: 'active',
        },
      });
    } else {
      // Reject receipt
      if (subscription) {
        subscription.payment_status = 'rejected';
        subscription.status = 'pending_payment';
        subscription.verified_by = adminId;
        subscription.verified_at = new Date();
        subscription.verification_remarks = cleanRemarks || 'Payment receipt rejected by Admin.';
        await subscription.save();
      }

      reseller.fee_payment_status = 'rejected';
      reseller.fee_payment_remarks = cleanRemarks || 'Payment receipt rejected. Please re-upload valid UTR/receipt document.';
      reseller.reseller_lifecycle_status = 'fee_payment_pending';
      await reseller.save();

      await logAudit({
        actor_type: 'cms_user',
        actor_id: adminId,
        action: 'RESELLER_FEE_RECEIPT_REJECTED',
        entity_type: 'resellers',
        entity_id: reseller._id,
        after_snapshot: {
          reseller_id: reseller._id,
          fee_payment_status: 'rejected',
          remarks: cleanRemarks,
        },
        req,
      });

      return res.json({
        status: 'success',
        message: 'Payment receipt rejected. Partner has been flagged to re-upload receipt.',
        data: {
          reseller_id: reseller._id,
          fee_payment_status: 'rejected',
          reseller_lifecycle_status: 'fee_payment_pending',
        },
      });
    }
  } catch (error) {
    console.error('[reseller.admin] verify_fee_payment_receipt error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

module.exports = {
  list_resellers,
  get_reseller_detail,
  review_kyc,
  get_activation_readiness,
  change_activation_status,
  assign_plan_to_reseller,
  verify_gstin_admin,
  list_epc_conflicts,
  review_epc_transfer,
  get_razorpay_status,
  process_order_refund_admin,
  list_webhook_logs,
  verify_fee_payment_receipt,
};

