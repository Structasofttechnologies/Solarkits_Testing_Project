/**
 * store.management.payment.handler.js
 *
 * Accounts Fee Payment Verification Sub-Module
 * Handles:
 *  - Franchisee fee payment receipt submission (UTR, amount, date, proof)
 *  - Accounts verification with duplicate UTR guard
 *  - Accounts rejection with reason
 *  - Dedicated Accounts Verification Queue
 */

const mongoose = require('mongoose');
const {
  Reseller,
  StoreSetup,
  StoreStatusHistory,
  FranchiseeCluster,
  FranchiseeAgreement,
} = require('../models/india_solarshop_db');

// ─── 1. SUBMIT FEE PAYMENT RECEIPT ───────────────────────────────────────────
const submit_fee_payment = async (req, res) => {
  try {
    const { store_id, utr_number, payment_amount, payment_date, receipt_url, payment_mode = 'bank_transfer', remarks } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    if (!utr_number || !utr_number.trim()) {
      return res.status(400).json({ status: 'error', message: 'UTR / Transaction Reference number is required.' });
    }

    const cleanUtr = utr_number.trim().toUpperCase();

    // Check duplicate UTR across existing verified payments
    const existingUtr = await Reseller.findOne({
      _id: { $ne: store_id },
      fee_payment_utr: cleanUtr,
      fee_payment_status: 'verified',
    }).lean();

    if (existingUtr) {
      return res.status(409).json({
        status: 'error',
        message: `UTR number ${cleanUtr} has already been verified for store: ${existingUtr.business_name}`,
      });
    }

    const store = await Reseller.findById(store_id);
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    const fromStatus = store.reseller_lifecycle_status || 'payment_pending';
    const targetStatus = 'payment_verification_pending';

    store.fee_payment_status = 'receipt_uploaded';
    store.fee_payment_utr = cleanUtr;
    if (payment_amount !== undefined) store.fee_payment_amount = Number(payment_amount);
    store.fee_payment_date = payment_date ? new Date(payment_date) : new Date();
    if (receipt_url) store.fee_payment_receipt_url = receipt_url.trim();
    if (remarks) store.fee_payment_remarks = remarks.trim();
    store.reseller_lifecycle_status = targetStatus;

    await store.save();

    // Synchronize receipt submission on linked cluster (Cluster-Wise Pricing Model)
    await FranchiseeCluster.findOneAndUpdate(
      { assigned_franchisee_id: store._id, deleted_at: null },
      {
        fee_payment_status: 'pending',
        fee_payment_utr: cleanUtr,
        fee_payment_receipt_url: receipt_url ? receipt_url.trim() : null,
      }
    ).catch(() => {});

    const storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });

    // Record audit history
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: fromStatus || 'draft',
      to_status: targetStatus,
      actor_type: 'franchisee',
      actor_id: actorId,
      remarks: `Fee payment receipt submitted. UTR: ${cleanUtr}, Amount: ₹${store.fee_payment_amount || 0}`,
      metadata: {
        utr_number: cleanUtr,
        payment_amount: store.fee_payment_amount,
        payment_mode,
        receipt_url,
      },
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        fee_payment_status: store.fee_payment_status,
        reseller_lifecycle_status: store.reseller_lifecycle_status,
        utr_number: store.fee_payment_utr,
      },
      message: 'Payment details submitted successfully. Sent for Accounts verification.',
    });
  } catch (error) {
    console.error('[store.management.payment] submit_fee_payment error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to submit payment.' });
  }
};

// ─── 2. ACCOUNTS VERIFY PAYMENT ───────────────────────────────────────────────
const verify_fee_payment = async (req, res) => {
  try {
    const { store_id, remarks } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    const store = await Reseller.findById(store_id);
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    if (!store.fee_payment_utr) {
      return res.status(400).json({
        status: 'error',
        message: 'Store has not submitted any payment UTR details to verify.',
      });
    }

    // Duplicate UTR check guard
    const duplicate = await Reseller.findOne({
      _id: { $ne: store._id },
      fee_payment_utr: store.fee_payment_utr,
      fee_payment_status: 'verified',
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        status: 'error',
        message: `Security alert: UTR ${store.fee_payment_utr} is already marked as verified for store: ${duplicate.business_name}`,
      });
    }

    const fromStatus = store.reseller_lifecycle_status;
    const targetStatus = 'payment_verified';
    const now = new Date();

    store.fee_payment_status = 'verified';
    store.fee_payment_verified_at = now;
    store.fee_payment_verified_by = actorId;
    store.reseller_lifecycle_status = targetStatus;
    if (remarks) store.fee_payment_remarks = remarks.trim();

    await store.save();

    // Synchronize FranchiseeCluster & Agreement (Cluster-Wise Single Source of Truth)
    await FranchiseeCluster.findOneAndUpdate(
      { assigned_franchisee_id: store._id, deleted_at: null },
      {
        fee_payment_status: 'paid',
        fee_payment_utr: store.fee_payment_utr,
        fee_payment_verified_at: now,
        fee_payment_verified_by: actorId,
      }
    ).catch(() => {});

    await FranchiseeAgreement.findOneAndUpdate(
      { franchisee_id: store._id, deleted_at: null },
      {
        payment_status: 'paid',
        'payment_details.utr_number': store.fee_payment_utr,
        'payment_details.payment_date': now,
        'payment_details.verified_by': actorId,
      }
    ).catch(() => {});

    // Synchronize StoreSetup
    const storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });
    if (storeSetup) {
      storeSetup.payment_verified_by_accounts = true;
      storeSetup.payment_accounts_verified_at = now;
      storeSetup.payment_accounts_verified_by = actorId;
      storeSetup.payment_confirmation_date = now;
      await storeSetup.save();
    }

    // Record audit history
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: fromStatus || 'draft',
      to_status: targetStatus,
      actor_type: 'accounts',
      actor_id: actorId,
      remarks: `Setup fee payment verified by Accounts team. UTR: ${store.fee_payment_utr}. ${remarks ? `Remarks: ${remarks.trim()}` : ''}`,
      metadata: {
        utr_number: store.fee_payment_utr,
        verified_at: now,
      },
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        fee_payment_status: store.fee_payment_status,
        reseller_lifecycle_status: store.reseller_lifecycle_status,
        fee_payment_verified_at: store.fee_payment_verified_at,
      },
      message: 'Payment successfully verified by Accounts.',
    });
  } catch (error) {
    console.error('[store.management.payment] verify_fee_payment error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to verify payment.' });
  }
};

// ─── 3. ACCOUNTS REJECT PAYMENT ───────────────────────────────────────────────
const reject_fee_payment = async (req, res) => {
  try {
    const { store_id, reason } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ status: 'error', message: 'Rejection reason is required.' });
    }

    const store = await Reseller.findById(store_id);
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    const fromStatus = store.reseller_lifecycle_status;
    const targetStatus = 'payment_pending';

    store.fee_payment_status = 'rejected';
    store.fee_payment_remarks = reason.trim();
    store.reseller_lifecycle_status = targetStatus;

    await store.save();

    // Synchronize rejection on linked cluster (Cluster-Wise Pricing Model)
    await FranchiseeCluster.findOneAndUpdate(
      { assigned_franchisee_id: store._id, deleted_at: null },
      {
        fee_payment_status: 'overdue',
      }
    ).catch(() => {});

    const storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });
    if (storeSetup) {
      storeSetup.payment_verified_by_accounts = false;
      await storeSetup.save();
    }

    // Record audit history
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: fromStatus || 'draft',
      to_status: targetStatus,
      actor_type: 'accounts',
      actor_id: actorId,
      remarks: `Payment verification rejected by Accounts. Reason: ${reason.trim()}`,
      metadata: { reason: reason.trim(), rejected_utr: store.fee_payment_utr },
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        fee_payment_status: store.fee_payment_status,
        reseller_lifecycle_status: store.reseller_lifecycle_status,
      },
      message: 'Payment rejected. Franchisee notified to re-submit valid payment details.',
    });
  } catch (error) {
    console.error('[store.management.payment] reject_fee_payment error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to reject payment.' });
  }
};

// ─── 4. GET ACCOUNTS PAYMENT VERIFICATION QUEUE ──────────────────────────────
const get_payment_queue = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status = 'all', search } = req.query;
    const query = {
      deleted_at: null,
      $or: [
        { fee_payment_status: { $in: ['receipt_uploaded', 'pending_payment', 'verified', 'rejected'] } },
        { reseller_lifecycle_status: { $in: ['payment_pending', 'payment_verification_pending', 'payment_verified'] } },
      ],
    };

    if (status !== 'all') {
      query.fee_payment_status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { business_name: regex },
        { fee_payment_utr: regex },
        { email: regex },
        { mobile: regex },
      ];
    }

    const [rows, total] = await Promise.all([
      Reseller.find(query)
        .populate({
          path: 'plan_subscription_id',
          populate: { path: 'plan_id', select: 'name setup_cost_amount store_category' },
        })
        .populate('store_setup_id')
        .sort({ fee_payment_date: -1, updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reseller.countDocuments(query),
    ]);

    const data = rows.map((r) => ({
      id: r._id,
      business_name: r.business_name,
      mobile: r.mobile,
      email: r.email,
      store_category: r.store_category,
      plan_name: r.plan_subscription_id?.plan_id?.name || 'N/A',
      fee_payment_status: r.fee_payment_status,
      fee_payment_amount: r.fee_payment_amount,
      fee_payment_utr: r.fee_payment_utr,
      fee_payment_date: r.fee_payment_date,
      fee_payment_receipt_url: r.fee_payment_receipt_url,
      fee_payment_verified_at: r.fee_payment_verified_at,
      fee_payment_remarks: r.fee_payment_remarks,
      reseller_lifecycle_status: r.reseller_lifecycle_status,
      store_setup_id: r.store_setup_id?.store_setup_id || null,
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
    console.error('[store.management.payment] get_payment_queue error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch payment queue.' });
  }
};

module.exports = {
  submit_fee_payment,
  verify_fee_payment,
  reject_fee_payment,
  get_payment_queue,
};
