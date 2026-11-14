/**
 * store.management.onboarding.handler.js
 *
 * Store Management Module — Onboarding Engine & Lifecycle State Machine
 * Handles:
 *  - Store Creation (Company Store & Franchisee Store)
 *  - 8-stage Onboarding State Machine & Transitions
 *  - Hold & Rejection workflows with reason tracking
 *  - Activation gate checks (Agreement, Accounts Payment, Setup Verification, Warehouse Allocation)
 *  - Immutable Store Status History Logging
 *  - Pipeline Stats & Onboarding Queue
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
  Reseller,
  ResellerType,
  ResellerPlan,
  ResellerPlanSubscription,
  FranchiseeSubtype,
  FranchiseeCluster,
  StoreSetup,
  StoreStatusHistory,
  CompanyStoreBdeAssignment,
  BDEProfile,
} = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { ensureStoreSetupChecklist } = require('../services/store.setup.service');

// Valid Onboarding Lifecycle Stages
const LIFECYCLE_STAGES = [
  'store_created',
  'agreement_pending',
  'agreement_signed',
  'payment_pending',
  'payment_verification_pending',
  'payment_verified',
  'setup_verification_pending',
  'active',
  'on_hold',
  'rejected',
];

// Helper: Generate Store Setup ID (ST-YYYY-XXXX)
const generateStoreSetupId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `ST-${currentYear}-`;
  const lastSetup = await StoreSetup.findOne({
    store_setup_id: { $regex: `^${prefix}` },
  })
    .sort({ store_setup_id: -1 })
    .lean();

  let nextNum = 1;
  if (lastSetup && lastSetup.store_setup_id) {
    const parts = lastSetup.store_setup_id.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }
  }
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

// ─── 1. CREATE STORE ──────────────────────────────────────────────────────────
const create_store = async (req, res) => {
  try {
    const {
      business_name,
      mobile,
      email,
      contact_person,
      gst_number,
      pan_number,
      aadhaar_masked,
      store_category = 'franchisee_store',
      franchisee_subtype_id,
      plan_id,
      cluster_id,
      reseller_type_id,
      address = {},
      commercial_mode = 'commission',
      company_store_bde_id,
      bde_id,
      warehouse_id,
      password,
      security_pin,
    } = req.body;

    const actorId = req.user?.id || req.user?._id || null;

    // 1. Validation: Required fields
    if (!business_name || !mobile || !email || !plan_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Business name, mobile, email, and plan are mandatory.',
      });
    }

    if (!['company_store', 'franchisee_store'].includes(store_category)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid store category. Must be company_store or franchisee_store.',
      });
    }

    // 2. Uniqueness check for mobile & email
    const existing = await Reseller.findOne({
      $or: [{ mobile: mobile.trim() }, { email: email.trim().toLowerCase() }],
      deleted_at: null,
    }).lean();

    if (existing) {
      const field = existing.mobile === mobile.trim() ? 'Mobile number' : 'Email address';
      return res.status(409).json({
        status: 'error',
        message: `${field} is already registered to another store.`,
      });
    }

    // 3. Validate Plan
    if (!mongoose.Types.ObjectId.isValid(plan_id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid plan_id provided.' });
    }
    const plan = await ResellerPlan.findById(plan_id).lean();
    if (!plan || !plan.is_active || plan.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Selected plan not found or inactive.' });
    }

    // Plan category match verification
    if (plan.store_category && plan.store_category !== store_category) {
      return res.status(400).json({
        status: 'error',
        message: `Plan category (${plan.store_category}) does not match selected store category (${store_category}).`,
      });
    }

    // 4. Validate BDE rules
    let assignedCompanyBdeId = null;
    let assignedFranchiseeBdeId = null;
    const bdeCandidate = company_store_bde_id || bde_id;

    if (store_category === 'company_store') {
      if (plan.bde_assignment_mandatory && !bdeCandidate) {
        return res.status(400).json({
          status: 'error',
          message: 'Direct BDE assignment is mandatory for this Company Store plan.',
        });
      }
      if (bdeCandidate) {
        if (!mongoose.Types.ObjectId.isValid(bdeCandidate)) {
          return res.status(400).json({ status: 'error', message: 'Invalid company_store_bde_id.' });
        }
        const bde = await BDEProfile.findById(bdeCandidate).lean();
        if (!bde || bde.deleted_at || (bde.status && ['inactive', 'suspended'].includes(bde.status))) {
          return res.status(404).json({ status: 'error', message: 'Assigned BDE not found or inactive.' });
        }
        assignedCompanyBdeId = bde._id;
      }
    } else if (store_category === 'franchisee_store' && bde_id) {
      if (mongoose.Types.ObjectId.isValid(bde_id)) {
        const bde = await BDEProfile.findById(bde_id).lean();
        if (bde && !bde.deleted_at && !(bde.status && ['inactive', 'suspended'].includes(bde.status))) {
          assignedFranchiseeBdeId = bde._id;
        }
      }
    }

    // 5. Validate Subtype if provided
    let subtypeId = null;
    if (franchisee_subtype_id) {
      if (!mongoose.Types.ObjectId.isValid(franchisee_subtype_id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid franchisee_subtype_id.' });
      }
      const subtype = await FranchiseeSubtype.findById(franchisee_subtype_id).lean();
      if (!subtype || !subtype.is_active || subtype.deleted_at) {
        return res.status(404).json({ status: 'error', message: 'Selected franchisee subtype not found.' });
      }
      subtypeId = subtype._id;
    } else if (plan.franchisee_subtype_id) {
      subtypeId = plan.franchisee_subtype_id;
    }

    // 6. Resolve ResellerType
    let targetResellerTypeId = reseller_type_id;
    if (!targetResellerTypeId || !mongoose.Types.ObjectId.isValid(targetResellerTypeId)) {
      const defaultType = await ResellerType.findOne({
        is_active: true,
        deleted_at: null,
      }).lean();
      if (!defaultType) {
        return res.status(500).json({
          status: 'error',
          message: 'No active Reseller Type configured in the system.',
        });
      }
      targetResellerTypeId = defaultType._id;
    }

    // 7. Validate Warehouse if provided
    let validWarehouseId = null;
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      const wh = await CompanyWarehouse.findById(warehouse_id).lean();
      if (wh && wh.is_active && !wh.deleted_at) {
        validWarehouseId = wh._id;
      }
    }

    // 8. Hash password and security PIN
    const rawPassword = password || 'Store@1234';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const rawPin = security_pin || '1234';
    const pinHash = await bcrypt.hash(rawPin, 10);

    // 8.5 Resolve Cluster & Setup Fee (Cluster-Wise Pricing Model)
    let validCluster = null;
    let clusterFee = 0;
    if (cluster_id && mongoose.Types.ObjectId.isValid(cluster_id)) {
      validCluster = await FranchiseeCluster.findById(cluster_id);
      if (validCluster && validCluster.is_active && !validCluster.deleted_at) {
        clusterFee = Number(validCluster.total_payable || validCluster.setup_fee || 0);
      }
    }

    const isCompanyStore = store_category === 'company_store';
    const computedFeeAmount = isCompanyStore ? 0 : (clusterFee > 0 ? clusterFee : Number(plan.setup_cost_amount || 0));
    const initialStatus = 'store_created';
    const feeStatus = isCompanyStore ? 'verified' : (computedFeeAmount > 0 ? 'pending_payment' : 'verified');

    // 9. Create Reseller
    const newReseller = await Reseller.create({
      business_name: business_name.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      security_pin_hash: pinHash,
      is_pin_set: true,
      pin_set_at: new Date(),
      contact_person: contact_person ? contact_person.trim() : null,
      gst_number: gst_number ? gst_number.trim().toUpperCase() : null,
      pan_number: pan_number ? pan_number.trim().toUpperCase() : null,
      aadhaar_masked: aadhaar_masked ? aadhaar_masked.trim() : null,
      commercial_mode: commercial_mode || plan.commercial_mode || 'commission',
      store_category,
      franchisee_subtype_id: subtypeId,
      reseller_type_id: targetResellerTypeId,
      reseller_lifecycle_status: initialStatus,
      activation_status: 'pending',
      fee_payment_status: feeStatus,
      fee_payment_amount: computedFeeAmount,
      bde_id: assignedCompanyBdeId || assignedFranchiseeBdeId || (validCluster?.primary_bde_id || null),
      company_store_bde_id: assignedCompanyBdeId || assignedFranchiseeBdeId || null,
      company_store_bde_assigned_at: (assignedCompanyBdeId || assignedFranchiseeBdeId) ? new Date() : null,
      company_store_bde_assigned_by: (assignedCompanyBdeId || assignedFranchiseeBdeId) ? actorId : null,
      address: {
        line: address.line || null,
        country_id: address.country_id || null,
        state_id: address.state_id || (validCluster?.state_id || null),
        district_id: address.district_id || (validCluster?.district_ids?.[0] || null),
        city: address.city || null,
        pincode: address.pincode || null,
      },
      created_by: actorId,
    });

    // If cluster was assigned, bind reseller to cluster and update cluster status
    if (validCluster) {
      validCluster.assigned_franchisee_id = newReseller._id;
      validCluster.status = 'allotted';
      validCluster.effective_date = new Date();
      await validCluster.save();
    }

    // 10. Create Plan Subscription
    // Calculate expiry_date from plan validity
    const subscriptionStartDate = new Date();
    const subscriptionExpiryDate = new Date(subscriptionStartDate);
    const validityValue = plan.validity_value || 1;
    const validityUnit = plan.validity_unit || 'years';
    if (validityUnit === 'days') {
      subscriptionExpiryDate.setDate(subscriptionExpiryDate.getDate() + validityValue);
    } else if (validityUnit === 'months') {
      subscriptionExpiryDate.setMonth(subscriptionExpiryDate.getMonth() + validityValue);
    } else {
      // default: years
      subscriptionExpiryDate.setFullYear(subscriptionExpiryDate.getFullYear() + validityValue);
    }
    const subscriptionAmountPaid = plan.setup_cost_enabled ? (plan.setup_cost_amount || 0) : 0;

    const subscription = await ResellerPlanSubscription.create({
      reseller_id: newReseller._id,
      plan_id: plan._id,
      start_date: subscriptionStartDate,
      expiry_date: subscriptionExpiryDate,
      amount_paid: subscriptionAmountPaid,
      currency: 'INR',
      payment_method: 'offline_manual',
      payment_status: plan.setup_cost_enabled ? 'pending_payment' : 'verified',
      status: plan.setup_cost_enabled ? 'pending_payment' : 'active',
    });

    newReseller.plan_subscription_id = subscription._id;

    // 11. Create StoreSetup Master Record
    const storeSetupId = await generateStoreSetupId();
    const allowedDays = 30;
    const now = new Date();
    const completionDate = new Date(now.getTime() + (allowedDays * 24 * 60 * 60 * 1000));

    const newStoreSetup = await StoreSetup.create({
      store_setup_id: storeSetupId,
      franchisee_id: newReseller._id,
      store_type: store_category,
      original_bde_id: assignedCompanyBdeId || assignedFranchiseeBdeId || null,
      current_bde_id: assignedCompanyBdeId || assignedFranchiseeBdeId || null,
      franchisee_name: newReseller.business_name,
      gst_number: newReseller.gst_number || null,
      mobile: newReseller.mobile,
      email: newReseller.email,
      country_name: 'India',
      state_id: address.state_id || null,
      district_id: address.district_id || null,
      store_address: address.line || null,
      plan_id: plan._id,
      plan_name: plan.name,
      fee_amount: plan.setup_cost_enabled ? (plan.setup_cost_amount || 0) : 0,
      setup_start_date: now,
      allowed_setup_days: allowedDays,
      original_completion_date: completionDate,
      status: 'not_started',
      warehouse_id: validWarehouseId,
      warehouse_allocated: !!validWarehouseId,
      warehouse_allocation_verified: false,
      warehouse_allocated_at: validWarehouseId ? now : null,
      warehouse_allocated_by: validWarehouseId ? actorId : null,
      payment_verified_by_accounts: !plan.setup_cost_enabled,
      created_by: actorId,
    });

    newReseller.store_setup_id = newStoreSetup._id;
    await newReseller.save();

    // Auto-generate Master Checklist Snapshot for this newly created Store Setup
    await ensureStoreSetupChecklist(newStoreSetup._id, newReseller._id);

    // 12. Record Initial Store Status History
    await StoreStatusHistory.create({
      store_id: newReseller._id,
      reseller_id: newReseller._id,
      store_setup_id: newStoreSetup._id,
      from_status: null,
      to_status: initialStatus,
      actor_type: 'admin',
      actor_id: actorId,
      remarks: `Store initialized in Store Management as ${store_category === 'company_store' ? 'Company Store' : 'Franchisee Store'}. Plan: ${plan.name}`,
      metadata: {
        store_category,
        plan_id: plan._id,
        plan_name: plan.name,
        setup_cost_enabled: plan.setup_cost_enabled,
        setup_cost_amount: plan.setup_cost_amount,
        commission_enabled: plan.commission_enabled,
        warehouse_id: validWarehouseId,
      },
    });

    // 13. If Company Store BDE assigned, record in CompanyStoreBdeAssignment
    if (assignedCompanyBdeId) {
      await CompanyStoreBdeAssignment.create({
        store_id: newReseller._id,
        bde_id: assignedCompanyBdeId,
        assigned_by: actorId,
        effective_from: now,
        is_active: true,
        remarks: 'Initial BDE assignment on Company Store creation.',
      });
    }

    return res.status(201).json({
      status: 'success',
      data: {
        store: {
          id: newReseller._id,
          business_name: newReseller.business_name,
          mobile: newReseller.mobile,
          email: newReseller.email,
          store_category: newReseller.store_category,
          reseller_lifecycle_status: newReseller.reseller_lifecycle_status,
          activation_status: newReseller.activation_status,
          plan_name: plan.name,
        },
        store_setup: {
          id: newStoreSetup._id,
          store_setup_id: newStoreSetup.store_setup_id,
          warehouse_allocated: newStoreSetup.warehouse_allocated,
          warehouse_id: newStoreSetup.warehouse_id,
        },
      },
      message: 'Store created successfully.',
    });
  } catch (error) {
    console.error('[store.management.onboarding] create_store error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to create store.' });
  }
};

// ─── 2. ADVANCE ONBOARDING STATUS ─────────────────────────────────────────────
const advance_status = async (req, res) => {
  try {
    const { store_id, target_status, remarks, metadata = {} } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    if (!target_status || !LIFECYCLE_STAGES.includes(target_status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid target_status. Must be one of: ${LIFECYCLE_STAGES.join(', ')}`,
      });
    }

    const store = await Reseller.findById(store_id).populate('plan_subscription_id');
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    const currentStatus = store.reseller_lifecycle_status || 'draft';
    let storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });
    if (!storeSetup && store.store_setup_id) {
      storeSetup = await StoreSetup.findById(store.store_setup_id);
    }

    // Load Plan to check business rules
    let plan = null;
    if (store.plan_subscription_id?.plan_id) {
      plan = await ResellerPlan.findById(store.plan_subscription_id.plan_id).lean();
    }

    // ── GUARD CHECKS ──
    // 1. Payment Verification Check
    if (
      ['payment_verified', 'setup_verification_pending', 'active'].includes(target_status) &&
      plan?.setup_cost_enabled === true &&
      store.fee_payment_status !== 'verified' &&
      target_status !== 'payment_verified'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot advance: Setup fee payment must be verified by Accounts first.',
      });
    }

    // 2. Active Activation Checks
    if (target_status === 'active') {
      // Gate A: Agreement check for Franchisee Stores
      if (store.store_category === 'franchisee_store' && store.agreement_status !== 'signed') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot activate store: Franchise Agreement has not been signed.',
        });
      }

      // Gate B: Accounts payment verification check
      if (plan?.setup_cost_enabled === true && store.fee_payment_status !== 'verified') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot activate store: Setup fee payment has not been verified by Accounts.',
        });
      }

      // Gate C: Warehouse Allocation and Verification
      if (!storeSetup || !storeSetup.warehouse_id || !storeSetup.warehouse_allocated) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot activate store: Physical Warehouse must be allocated before starting operations.',
        });
      }

      if (!storeSetup.warehouse_allocation_verified) {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot activate store: Allocated warehouse must be verified by admin before starting operations.',
        });
      }
    }

    // Update Store Lifecycle Status
    store.reseller_lifecycle_status = target_status;

    if (target_status === 'active') {
      store.activation_status = 'active';
      store.is_operational = true;
      store.operations_started_at = new Date();
      if (storeSetup) {
        storeSetup.status = 'operations_started';
        storeSetup.operations_start_date = new Date();
        await storeSetup.save();
      }
    } else if (target_status === 'payment_verified') {
      store.fee_payment_status = 'verified';
      store.fee_payment_verified_at = new Date();
      store.fee_payment_verified_by = actorId;
      if (storeSetup) {
        storeSetup.payment_verified_by_accounts = true;
        storeSetup.payment_accounts_verified_at = new Date();
        storeSetup.payment_accounts_verified_by = actorId;
        await storeSetup.save();
      }
    } else if (target_status === 'setup_verification_pending') {
      if (storeSetup && storeSetup.status === 'not_started') {
        storeSetup.status = 'in_progress';
        await storeSetup.save();
      }
    }

    await store.save();

    // Record immutable audit history
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: currentStatus,
      to_status: target_status,
      actor_type: 'admin',
      actor_id: actorId,
      remarks: remarks || `Onboarding status transitioned from ${currentStatus} to ${target_status}.`,
      metadata,
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        from_status: currentStatus,
        to_status: target_status,
        activation_status: store.activation_status,
        is_operational: store.is_operational,
      },
      message: `Status updated to ${target_status} successfully.`,
    });
  } catch (error) {
    console.error('[store.management.onboarding] advance_status error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update status.' });
  }
};

// ─── 3. HOLD OR REJECT STORE ──────────────────────────────────────────────────
const reject_or_hold_store = async (req, res) => {
  try {
    const { store_id, action, reason } = req.body;
    const actorId = req.user?.id || req.user?._id || null;

    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id is required.' });
    }

    if (!['hold', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be hold or reject.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ status: 'error', message: 'Reason is required for hold or rejection.' });
    }

    const store = await Reseller.findById(store_id);
    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    const currentStatus = store.reseller_lifecycle_status || 'draft';
    const targetStatus = action === 'hold' ? 'on_hold' : 'rejected';

    store.reseller_lifecycle_status = targetStatus;
    if (action === 'hold') {
      store.onboarding_hold_reason = reason.trim();
    } else {
      store.onboarding_rejection_reason = reason.trim();
      store.activation_status = 'suspended';
    }

    await store.save();

    let storeSetup = await StoreSetup.findOne({ franchisee_id: store._id });
    if (!storeSetup && store.store_setup_id) {
      storeSetup = await StoreSetup.findById(store.store_setup_id);
    }
    if (action === 'reject' && storeSetup) {
      storeSetup.status = 'cancelled';
      await storeSetup.save();
    }

    // Record audit history
    await StoreStatusHistory.create({
      store_id: store._id,
      reseller_id: store._id,
      store_setup_id: storeSetup?._id || null,
      from_status: currentStatus,
      to_status: targetStatus,
      actor_type: 'admin',
      actor_id: actorId,
      remarks: `Store put on ${action === 'hold' ? 'Hold' : 'Rejected'}. Reason: ${reason.trim()}`,
      metadata: { action, reason: reason.trim() },
    });

    return res.json({
      status: 'success',
      data: {
        store_id: store._id,
        reseller_lifecycle_status: targetStatus,
        reason: reason.trim(),
      },
      message: `Store ${action === 'hold' ? 'placed on hold' : 'rejected'} successfully.`,
    });
  } catch (error) {
    console.error('[store.management.onboarding] reject_or_hold_store error:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Operation failed.' });
  }
};

// ─── 4. ACTIVATE STORE (FINAL GATED CHECK) ────────────────────────────────────
const activate_store = async (req, res) => {
  // Delegate directly to advance_status with target_status = 'active'
  req.body.target_status = 'active';
  return advance_status(req, res);
};

// ─── 5. GET STATUS HISTORY (IMMUTABLE AUDIT LOG) ──────────────────────────────
const get_status_history = async (req, res) => {
  try {
    const { store_id } = req.params;
    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id parameter required.' });
    }

    const history = await StoreStatusHistory.find({
      $or: [{ store_id }, { reseller_id: store_id }],
    })
      .populate('actor_id', 'name email')
      .populate('changed_by', 'name email')
      .sort({ created_at: -1 })
      .lean();

    const data = history.map((h) => ({
      id: h._id,
      from_status: h.from_status,
      to_status: h.to_status,
      actor_type: h.actor_type || h.changed_by_role || 'admin',
      actor_name: h.actor_id?.name || h.changed_by?.name || 'System Admin',
      actor_email: h.actor_id?.email || h.changed_by?.email || null,
      remarks: h.remarks || h.reason,
      metadata: h.metadata,
      created_at: h.created_at,
    }));

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[store.management.onboarding] get_status_history error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch status history.' });
  }
};

// ─── 6. GET ONBOARDING QUEUE (PAGINATED & FILTERED) ───────────────────────────
const get_onboarding_queue = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, store_category, state_id, search } = req.query;
    const query = { deleted_at: null };

    if (status && status !== 'all') {
      query.reseller_lifecycle_status = status;
    }
    if (store_category && ['company_store', 'franchisee_store'].includes(store_category)) {
      query.store_category = store_category;
    }
    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      query['address.state_id'] = state_id;
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
        .populate('franchisee_subtype_id', 'name slug badge_color category_level')
        .populate('company_store_bde_id', 'full_name bde_id mobile_number email name employee_id mobile')
        .populate('bde_id', 'full_name bde_id mobile_number email name employee_id mobile')
        .populate({
          path: 'plan_subscription_id',
          populate: { path: 'plan_id', select: 'name store_category commission_enabled setup_cost_enabled setup_cost_amount epc_onboarding_scope' },
        })
        .populate({
          path: 'store_setup_id',
          populate: [
            { path: 'current_bde_id', select: 'full_name bde_id mobile_number email name employee_id mobile' },
            { path: 'warehouse_id', select: 'warehouse_code address pincode' },
          ],
        })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Reseller.countDocuments(query),
    ]);

    // Fallback lookup: find StoreSetup by franchisee_id for rows without store_setup_id
    const unlinkedStoreIds = rows.filter((r) => !r.store_setup_id).map((r) => r._id);
    const unlinkedSetupsMap = {};
    if (unlinkedStoreIds.length > 0) {
      const foundSetups = await StoreSetup.find({ franchisee_id: { $in: unlinkedStoreIds } })
        .populate('current_bde_id', 'full_name bde_id mobile_number email name employee_id mobile')
        .populate('warehouse_id', 'warehouse_code address pincode')
        .lean();
      foundSetups.forEach((s) => {
        unlinkedSetupsMap[String(s.franchisee_id)] = s;
      });
    }

    const data = rows.map((r) => {
      const plan = r.plan_subscription_id?.plan_id;
      const setup = r.store_setup_id || unlinkedSetupsMap[String(r._id)] || null;
      return {
        id: r._id,
        business_name: r.business_name,
        contact_person: r.contact_person,
        mobile: r.mobile,
        email: r.email,
        gst_number: r.gst_number,
        store_category: r.store_category || 'franchisee_store',
        franchisee_subtype: r.franchisee_subtype_id ? {
          id: r.franchisee_subtype_id._id,
          name: r.franchisee_subtype_id.name,
          badge_color: r.franchisee_subtype_id.badge_color,
        } : null,
        reseller_lifecycle_status: r.reseller_lifecycle_status || 'draft',
        activation_status: r.activation_status,
        is_operational: r.is_operational || false,
        agreement_status: r.agreement_status,
        fee_payment_status: r.fee_payment_status,
        fee_payment_amount: r.fee_payment_amount,
        fee_payment_utr: r.fee_payment_utr,
        plan: plan ? {
          id: plan._id,
          name: plan.name,
          store_category: plan.store_category,
          commission_enabled: plan.commission_enabled,
          setup_cost_enabled: plan.setup_cost_enabled,
          setup_cost_amount: plan.setup_cost_amount,
          epc_onboarding_scope: plan.epc_onboarding_scope,
        } : null,
        bde: (() => {
          const bdeDoc = r.company_store_bde_id || r.bde_id || setup?.current_bde_id;
          if (!bdeDoc) return null;
          const bdeName = bdeDoc.full_name || bdeDoc.name || 'BDE Assigned';
          const bdeEmpId = bdeDoc.bde_id || bdeDoc.employee_id || '';
          const bdeMobile = bdeDoc.mobile_number || bdeDoc.mobile || '';
          return {
            id: bdeDoc._id,
            name: bdeName,
            full_name: bdeName,
            employee_id: bdeEmpId,
            bde_id: bdeEmpId,
            mobile: bdeMobile,
            email: bdeDoc.email || '',
          };
        })(),
        store_setup: setup ? {
          id: setup._id,
          store_setup_id: setup.store_setup_id,
          status: setup.status,
          warehouse_allocated: setup.warehouse_allocated,
          warehouse_allocation_verified: setup.warehouse_allocation_verified,
          warehouse_id: setup.warehouse_id?._id || setup.warehouse_id,
          warehouse_details: setup.warehouse_id,
          payment_verified_by_accounts: setup.payment_verified_by_accounts,
        } : null,
        address: r.address,
        onboarding_hold_reason: r.onboarding_hold_reason,
        onboarding_rejection_reason: r.onboarding_rejection_reason,
        created_at: r.created_at,
      };
    });

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
    console.error('[store.management.onboarding] get_onboarding_queue error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch onboarding queue.' });
  }
};

// ─── 7. GET PIPELINE STATS (FUNNEL COUNTERS) ──────────────────────────────────
const get_pipeline_stats = async (req, res) => {
  try {
    const pipeline = [
      { $match: { deleted_at: null } },
      {
        $group: {
          _id: {
            status: '$reseller_lifecycle_status',
            category: '$store_category',
          },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Reseller.aggregate(pipeline);

    const stats = {
      total: 0,
      company_stores: 0,
      franchisee_stores: 0,
      by_status: {
        store_created: 0,
        agreement_pending: 0,
        agreement_signed: 0,
        payment_pending: 0,
        payment_verification_pending: 0,
        payment_verified: 0,
        setup_verification_pending: 0,
        active: 0,
        on_hold: 0,
        rejected: 0,
      },
    };

    results.forEach((item) => {
      const status = item._id.status || 'draft';
      const category = item._id.category || 'franchisee_store';
      const count = item.count;

      stats.total += count;
      if (category === 'company_store') {
        stats.company_stores += count;
      } else {
        stats.franchisee_stores += count;
      }

      if (stats.by_status[status] !== undefined) {
        stats.by_status[status] += count;
      }
    });

    return res.json({ status: 'success', data: stats });
  } catch (error) {
    console.error('[store.management.onboarding] get_pipeline_stats error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch pipeline stats.' });
  }
};

// ─── 8. GET STORE DETAILS (SINGLE VIEW) ───────────────────────────────────────
const get_store_details = async (req, res) => {
  try {
    const { store_id } = req.params;
    if (!store_id || !mongoose.Types.ObjectId.isValid(store_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid store_id required.' });
    }

    const store = await Reseller.findById(store_id)
      .populate('reseller_type_id')
      .populate('franchisee_subtype_id')
      .populate('company_store_bde_id')
      .populate('bde_id')
      .populate({
        path: 'plan_subscription_id',
        populate: { path: 'plan_id' },
      })
      .populate('store_setup_id')
      .lean();

    if (!store || store.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Store not found.' });
    }

    let warehouse = null;
    if (store.store_setup_id?.warehouse_id) {
      warehouse = await CompanyWarehouse.findById(store.store_setup_id.warehouse_id).lean();
    }

    return res.json({
      status: 'success',
      data: {
        store,
        warehouse,
      },
    });
  } catch (error) {
    console.error('[store.management.onboarding] get_store_details error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch store details.' });
  }
};

module.exports = {
  create_store,
  advance_status,
  reject_or_hold_store,
  activate_store,
  get_status_history,
  get_onboarding_queue,
  get_pipeline_stats,
  get_store_details,
};
