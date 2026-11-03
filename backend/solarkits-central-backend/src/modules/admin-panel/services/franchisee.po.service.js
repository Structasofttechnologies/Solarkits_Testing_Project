/**
 * franchisee.po.service.js
 *
 * Complete lifecycle management for Franchisee Purchase Orders (fpo_orders collection).
 *
 * Valid status transitions:
 *   DRAFT → SUBMITTED
 *   SUBMITTED → PENDING_APPROVAL | APPROVED | REJECTED
 *   PENDING_APPROVAL → CHANGES_REQUESTED | APPROVED | REJECTED
 *   CHANGES_REQUESTED → SUBMITTED
 *   APPROVED → AWAITING_PAYMENT
 *   AWAITING_PAYMENT → PARTIALLY_PAID | PAID
 *   PARTIALLY_PAID → PAID
 *   PAID → STOCK_ALLOCATED
 *   STOCK_ALLOCATED → PROCESSING
 *   PROCESSING → PARTIALLY_DISPATCHED | DISPATCHED
 *   PARTIALLY_DISPATCHED → DISPATCHED
 *   DISPATCHED → PARTIALLY_DELIVERED | DELIVERED
 *   PARTIALLY_DELIVERED → DELIVERED
 *   DELIVERED → COMPLETED
 *   any (except COMPLETED/EXPIRED) → CANCELLED
 */

const mongoose = require('mongoose');
const {
  FpoOrder,
  Reseller,
  ResellerPlanSubscription,
  FranchiseePlanPoSetting,
} = require('../models/india_solarshop_db');
const { resolveEffectivePoSettings, validatePoItems, resolveEffectiveMoqRule } = require('./franchisee.moq.service');
const { resolveCommissionRule } = require('./franchisee.commission.service');
const { recalculateProgress } = require('./franchisee.goal.service');
const { postCommission, reverseCommission } = require('./franchisee.commission.service');
const { logAudit } = require('../utils/audit.service');

// ── Allowed status transitions ────────────────────────────────────────────────
const ALLOWED_TRANSITIONS = {
  DRAFT: ['PENDING_ALLOCATION', 'AWAITING_TOKEN_PAYMENT', 'PO_STARTED', 'VALIDATED', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED', 'EXPIRED'],
  PENDING_ALLOCATION: ['AWAITING_TOKEN_PAYMENT', 'PO_STARTED', 'VALIDATED', 'DRAFT', 'CANCELLED', 'EXPIRED'],
  AWAITING_TOKEN_PAYMENT: ['PO_STARTED', 'VALIDATED', 'PAID', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED', 'EXPIRED'],
  PO_STARTED: ['VALIDATING', 'VALIDATED', 'CONFIRMED', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
  VALIDATING: ['VALIDATED', 'CHANGES_REQUESTED', 'CANCELLED'],
  VALIDATED: ['CONFIRMED', 'STOCK_ALLOCATED', 'PROCESSING', 'PAID', 'COMPLETED', 'CANCELLED'],
  SUBMITTED: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'PAID', 'CONFIRMED', 'CANCELLED'],
  PENDING_APPROVAL: ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CONFIRMED', 'CANCELLED'],
  CHANGES_REQUESTED: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['AWAITING_PAYMENT', 'PO_STARTED', 'VALIDATED', 'CONFIRMED', 'PAID', 'PROCESSING', 'CANCELLED'],
  REJECTED: [],
  AWAITING_PAYMENT: ['PARTIALLY_PAID', 'PAID', 'PO_STARTED', 'VALIDATED', 'CONFIRMED', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'PO_STARTED', 'VALIDATED', 'CONFIRMED', 'CANCELLED'],
  PAID: ['PO_STARTED', 'VALIDATED', 'CONFIRMED', 'STOCK_ALLOCATED', 'PROCESSING', 'VEHICLE_ASSIGNED', 'COMPLETED', 'CANCELLED'],
  CONFIRMED: ['VALIDATED', 'STOCK_ALLOCATED', 'PROCESSING', 'VEHICLE_ASSIGNED', 'COMPLETED', 'CANCELLED'],
  STOCK_ALLOCATED: ['PROCESSING', 'VEHICLE_ASSIGNED', 'CANCELLED'],
  PROCESSING: ['VEHICLE_ASSIGNED', 'READY_FOR_DISPATCH', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED'],
  VEHICLE_ASSIGNED: ['READY_FOR_DISPATCH', 'PROCESSING', 'DISPATCHED', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'CANCELLED'],
  PARTIALLY_DISPATCHED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT', 'REACHED_DESTINATION', 'PARTIALLY_DELIVERED', 'DELIVERED'],
  IN_TRANSIT: ['IN_TRANSIT', 'REACHED_DESTINATION', 'DELIVERED'],
  REACHED_DESTINATION: ['DELIVERED', 'COMPLETED'],
  PARTIALLY_DELIVERED: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function assertTransition(currentStatus, targetStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${targetStatus}. Allowed from ${currentStatus}: ${allowed.join(', ') || 'none'}`
    );
  }
}

/**
 * Generate a unique PO number.
 * Format: FPO-YYYYMM-XXXXX (e.g. FPO-202608-00001)
 */
async function generatePoNumber() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `FPO-${ym}-`;
  const last = await FpoOrder.findOne({ po_number: { $regex: `^${prefix}` } })
    .sort({ po_number: -1 })
    .select('po_number')
    .lean();
  const seq = last ? parseInt(last.po_number.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

// ── 1. CREATE DRAFT ───────────────────────────────────────────────────────────
/**
 * Create a PO draft after full eligibility and quantity validation.
 *
 * @param {object} params
 * @param {string|ObjectId} params.franchisee_id
 * @param {Array}  params.items - [{kit_id|product_id, project_type_id, industry_type_id, item_name, quantity, unit_price_paise, gst_rate}]
 * @param {string} [params.idempotency_key] - caller-provided dedup key
 * @param {string} [params.payment_terms]
 * @param {string|ObjectId} [params.actor_id]
 * @param {object} [params.req]
 */
async function createPoDraft({
  franchisee_id = null,
  epc_id = null,
  created_by_role = 'FRANCHISEE',
  creator_name = null,
  creator_code = null,
  customer_details = null,
  items = [],
  target_committed_quantity = 0,
  idempotency_key,
  payment_terms,
  order_type = 'po_order',
  po_category = 'SINGLE_PO',
  is_token_booking = false,
  token_amount_paise: custom_token_amount_paise = null,
  parent_po_id = null,
  destination_type = 'hub_stock',
  destination_address = null,
  destination_pincode = null,
  offline_payment = null,
  actor_id,
  req,
}) {
  // Idempotency check
  if (idempotency_key) {
    const existing = await FpoOrder.findOne({ idempotency_key }).lean();
    if (existing) {
      return { created: false, already_exists: true, order: existing };
    }
  }

  let franchisee = null;
  let subscription = null;
  let plan_id = null;
  let custDetails = customer_details || {};

  if (franchisee_id) {
    franchisee = await Reseller.findOne({ _id: franchisee_id, deleted_at: null }).lean();
    if (!franchisee) throw new Error('Franchisee account not found.');
    if (franchisee.activation_status !== 'active') throw new Error('Franchisee account is not active.');
    if (!['kyc_verified', 'agreement_pending', 'territory_pending', 'active'].includes(franchisee.reseller_lifecycle_status)) {
      throw new Error('Franchisee KYC and onboarding must be completed before placing PO orders.');
    }

    // Active plan subscription
    subscription = await ResellerPlanSubscription.findOne({
      reseller_id: franchisee_id,
      status: 'active',
    })
      .populate('plan_id')
      .sort({ start_date: -1 })
      .lean();
    if (!subscription) throw new Error('No active plan subscription found for this franchisee.');

    const activePlan = subscription.plan_id;
    plan_id = activePlan?._id || subscription.plan_id;

    // Enforce Store Type Order Fulfillment Rules
    const rawAllowed = activePlan?.order_type_allowed;
    const allowedTypes = Array.isArray(rawAllowed)
      ? rawAllowed
      : typeof rawAllowed === 'string'
      ? (rawAllowed === 'both' ? ['po_order', 'loose_order'] : rawAllowed.split(',').map((s) => s.trim()))
      : ['po_order'];

    const allowsPo = allowedTypes.includes('po_order');
    const allowsCombinePo = allowedTypes.includes('combine_po_order');

    if (created_by_role !== 'BDE') {
      if (!allowsPo && !allowsCombinePo) {
        throw new Error('Your Store Type only permits Loose Orders. Purchase Orders cannot be placed under this plan.');
      }
      if (po_category === 'COMBINE_PO' && !allowsCombinePo) {
        throw new Error('Your Store Type does not permit Combine PO Orders.');
      }
      if (po_category !== 'COMBINE_PO' && !allowsPo) {
        throw new Error('Your Store Type does not permit standard Single PO Orders.');
      }
    }

    custDetails = {
      name: franchisee.contact_person || franchisee.name || custDetails.name,
      company_name: franchisee.business_name || custDetails.company_name,
      gstin: franchisee.gstin || custDetails.gstin,
      phone: franchisee.mobile || custDetails.phone,
      email: franchisee.email || custDetails.email,
      address: franchisee.registered_address || destination_address || custDetails.address,
      state: franchisee.state || custDetails.state,
      district: franchisee.district || custDetails.district,
    };
  } else if (epc_id) {
    const { EpcAccount } = require('../models/india_solarshop_db');
    const epc = await EpcAccount.findOne({ _id: epc_id, deleted_at: null }).lean();
    if (!epc) throw new Error('Solar EPC account not found.');
    custDetails = {
      name: epc.name || epc.contact_person || custDetails.name,
      company_name: epc.company_name || custDetails.company_name,
      gstin: epc.gstin || custDetails.gstin,
      phone: epc.whatsapp || epc.mobile || custDetails.phone,
      email: epc.email || custDetails.email,
      address: epc.address || destination_address || custDetails.address,
      state: epc.state || custDetails.state,
      district: epc.district || custDetails.district,
    };
  }

  // PO settings check
  let allPlanPoSettings = [];
  if (plan_id) {
    allPlanPoSettings = await FranchiseePlanPoSetting.find({
      plan_id,
      is_active: true,
      po_enabled: true,
      deleted_at: null,
    }).lean();
  }

  const defaultPoSetting = {
    po_validity_days: 30,
    po_lock_days: 30,
    min_po_quantity: 1,
    max_line_items: 50,
    token_booking_enabled: true,
    token_type: 'FIXED_AMOUNT',
    token_value: 50000,
    token_settlement_rule: 'PRO_RATA',
    default_penalty_type: 'FLAT_PER_UNPURCHASED_KIT',
    default_penalty_rate: 500,
    penalty_rules: [],
  };

  // Resolve specific PO setting for the ordered kit, with fallback to plan-wide default
  const orderedKitId = items[0]?.kit_id || items[0]?.combo_kit_id;
  let specificPoSetting = null;
  if (orderedKitId && allPlanPoSettings.length > 0) {
    const targetKitStr = String(orderedKitId);
    specificPoSetting = allPlanPoSettings.find((s) =>
      Array.isArray(s.allowed_combo_kit_ids) &&
      s.allowed_combo_kit_ids.some((id) => String(id._id || id.id || id) === targetKitStr)
    );
  }
  const planDefaultPoSetting = allPlanPoSettings.find((s) =>
    !s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0
  );
  const po_settings = specificPoSetting || planDefaultPoSetting || (allPlanPoSettings.length > 0 ? allPlanPoSettings[0] : defaultPoSetting);

  // Validate that items are authorized under the plan's PO settings and category allocations
  const authorizedKitIds = new Set();
  if (subscription?.plan_id) {
    const allIndustryIds = new Set([
      ...(subscription.plan_id?.allowed_industry_type_ids || []).map(String),
      ...allPlanPoSettings.flatMap((s) => (s.allowed_industry_type_ids || []).map(String)),
    ]);
    const allCategoryIds = new Set([
      ...(subscription.plan_id?.allowed_category_ids || []).map(String),
      ...allPlanPoSettings.flatMap((s) => (s.allowed_category_ids || []).map(String)),
    ]);
    const allSubcatIds = new Set([
      ...(subscription.plan_id?.allowed_subcategory_ids || []).map(String),
      ...allPlanPoSettings.flatMap((s) => (s.allowed_subcategory_ids || []).map(String)),
    ]);
    const allProjectTypeIds = new Set([
      ...(subscription.plan_id?.allowed_project_type_ids || []).map(String),
      ...allPlanPoSettings.flatMap((s) => (s.allowed_project_type_ids || []).map(String)),
    ]);

    allPlanPoSettings.forEach((s) => {
      (s.allowed_combo_kit_ids || []).forEach((id) => authorizedKitIds.add(String(id)));
    });
    (subscription.plan_id?.allowed_combo_kit_ids || []).forEach((id) => authorizedKitIds.add(String(id)));

    if (allIndustryIds.size > 0) {
      const { ProjectCategory } = require('../models/core_db');
      const cats = await ProjectCategory.find({
        industry_type_id: { $in: Array.from(allIndustryIds) },
        deleted_at: null,
      }).select('_id').lean();
      cats.forEach((c) => allCategoryIds.add(String(c._id)));
    }

    if (allCategoryIds.size > 0 || allSubcatIds.size > 0 || allProjectTypeIds.size > 0) {
      const { SolarKit } = require('../models/core_db');
      const { WarehouseComboKit } = require('../models/india_solarshop_db');
      const conds = [];
      if (allCategoryIds.size > 0) conds.push({ category_id: { $in: Array.from(allCategoryIds) } });
      if (allSubcatIds.size > 0) conds.push({ subcategory_id: { $in: Array.from(allSubcatIds) } });
      if (allProjectTypeIds.size > 0) conds.push({ type_id: { $in: Array.from(allProjectTypeIds) } });

      const matchedDefs = await SolarKit.find({ $or: conds, deleted_at: null }).select('_id').lean();
      const defIds = matchedDefs.map((d) => d._id);
      if (defIds.length > 0) {
        const matchingKits = await WarehouseComboKit.find({ solar_kit_id: { $in: defIds }, is_active: { $ne: false }, deleted_at: null }).select('_id').lean();
        matchingKits.forEach((k) => authorizedKitIds.add(String(k._id)));
      }
    }
  }

    // ── Early Resolution of Linked Parent PO (for Drawdowns / Reorders against PO) ────
    const isPoOrder = (order_type === 'po_order' || order_type === 'bulk_po');
    let parentPoDoc = null;
    let is_final_po_settlement = false;
    let token_adjusted_paise = 0;
    let net_payable_paise = 0;

    if (!isPoOrder && parent_po_id) {
      if (franchisee_id) {
        parentPoDoc = await FpoOrder.findOne({ _id: parent_po_id, franchisee_id, deleted_at: null });
      } else if (epc_id) {
        parentPoDoc = await FpoOrder.findOne({
          _id: parent_po_id,
          deleted_at: null,
          $or: [
            { epc_id: epc_id },
            { 'items.epc_allocations.epc_buyer_id': epc_id },
          ],
        });
      } else {
        parentPoDoc = await FpoOrder.findOne({ _id: parent_po_id, deleted_at: null });
      }

      if (!parentPoDoc) {
        throw new Error('Linked parent PO order not found or unauthorized.');
      }

      // 1. Strict Expiry & Status Validations
      if (parentPoDoc.status === 'EXPIRED') {
        throw new Error(`Cannot reorder against PO ${parentPoDoc.po_number}: This Purchase Order is already EXPIRED.`);
      }
      if (['CANCELLED', 'REJECTED', 'COMPLETED'].includes(parentPoDoc.status)) {
        throw new Error(`Cannot reorder against PO ${parentPoDoc.po_number}: PO status is ${parentPoDoc.status}.`);
      }

      const now = new Date();
      const poExpiryDate = parentPoDoc.lock_expires_at || parentPoDoc.expires_at;
      if (poExpiryDate && now > new Date(poExpiryDate)) {
        throw new Error(
          `Cannot reorder against PO ${parentPoDoc.po_number}: The PO validity expired on ${new Date(poExpiryDate).toLocaleDateString('en-IN')}. Please settle or request a refund.`
        );
      }
    }

    const hasItems = Array.isArray(items) && items.length > 0;
    let subtotal_paise = 0;
    let tax_total_paise = 0;
    const builtItems = [];
    let totalItemQty = 0;

    if (hasItems) {
      if (authorizedKitIds.size > 0 && created_by_role !== 'BDE') {
        for (const item of items) {
          if (item.kit_id && mongoose.Types.ObjectId.isValid(item.kit_id) && !authorizedKitIds.has(String(item.kit_id))) {
            throw new Error(`The selected product "${item.item_name || 'Solar Kit'}" is not assigned for Purchase Orders under your franchise plan.`);
          }
        }
      }

      if (po_settings.max_line_items && items.length > po_settings.max_line_items) {
        throw new Error(`Your plan allows a maximum of ${po_settings.max_line_items} line items per PO.`);
      }

      let validationResults = [];
      if (!parent_po_id && created_by_role !== 'BDE') {
        validationResults = await validatePoItems(items, plan_id, po_settings);
        const failures = validationResults.filter((r) => !r.valid);
        if (failures.length > 0) {
          throw new Error(failures.map((f) => `Item "${f.item_name}": ${f.reason}`).join('; '));
        }
      }

      // Build line items with snapshots
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const moq_rule = validationResults[i]?.moq_rule;

        // ── Strictly Enforce Immutable Locked Price from Parent PO ─────────────
        let effectiveUnitPricePaise = item.unit_price_paise || 0;
        let effectiveGstRate = item.gst_rate || 0;
        let effectiveKitId = (item.kit_id && mongoose.Types.ObjectId.isValid(item.kit_id)) ? item.kit_id : null;
        let effectiveProductId = (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) ? item.product_id : null;
        let effectiveItemName = item.item_name;

        if (parentPoDoc && Array.isArray(parentPoDoc.items) && parentPoDoc.items.length > 0) {
          const parentItem = parentPoDoc.items[0];
          effectiveUnitPricePaise = parentItem.unit_price_paise;
          if (parentItem.gst_rate != null) effectiveGstRate = parentItem.gst_rate;
          if (parentItem.kit_id) effectiveKitId = parentItem.kit_id;
          if (parentItem.product_id) effectiveProductId = parentItem.product_id;
          if (parentItem.item_name) effectiveItemName = parentItem.item_name;
        }

        const tax_paise = Math.round((effectiveUnitPricePaise || 0) * item.quantity * ((effectiveGstRate || 0) / 100));
        const total_price_paise = (effectiveUnitPricePaise || 0) * item.quantity + tax_paise;

        subtotal_paise += (effectiveUnitPricePaise || 0) * item.quantity;
        tax_total_paise += tax_paise;

        // Commission snapshot
        let commission_method = null;
        let commission_snapshot = 0;
        if (plan_id) {
          const commissionRule = await resolveCommissionRule(plan_id);
          if (commissionRule) {
            commission_method = commissionRule.commission_method;
            commission_snapshot = commissionRule.commission_method === 'FIXED_PER_KIT'
              ? (commissionRule.fixed_amount_per_kit_paise || 0)
              : (commissionRule.commission_percentage || 0) * 100;
          }
        }

        const validKitId = (item.kit_id && mongoose.Types.ObjectId.isValid(item.kit_id)) ? item.kit_id : null;
        const validProjTypeId = (item.project_type_id && mongoose.Types.ObjectId.isValid(item.project_type_id)) ? item.project_type_id : null;
        const validProductId = (item.product_id && mongoose.Types.ObjectId.isValid(item.product_id)) ? item.product_id : null;

        builtItems.push({
          project_type_id: validProjTypeId,
          project_type_name: item.project_type_name || null,
          kit_id: effectiveKitId,
          product_id: effectiveProductId,
          item_name: effectiveItemName,
          item_code: item.item_code || null,
          quantity: item.quantity,
          epc_allocations: Array.isArray(item.epc_allocations) ? item.epc_allocations : [],
          moq_snapshot: moq_rule ? {
            moq: moq_rule.moq,
            increment_quantity: moq_rule.increment_quantity,
            max_quantity: moq_rule.max_quantity,
            rule_id: moq_rule._id,
          } : null,
          unit_price_paise: effectiveUnitPricePaise,
          gst_rate: effectiveGstRate,
          tax_paise,
          total_price_paise,
          commission_method,
          commission_snapshot,
          contributes_to_target: po_settings.contributes_to_monthly_target !== false,
          returned_quantity: 0,
          cancelled_quantity: 0,
          delivered_quantity: 0,
        });
      }
      totalItemQty = builtItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    } else {
      totalItemQty = Number(target_committed_quantity) || 0;
    }

    const grand_total_paise = subtotal_paise + tax_total_paise;
    const po_number = await generatePoNumber();
    const ikey = idempotency_key || `${franchisee_id || epc_id || 'PO'}-${Date.now()}`;

    const commissionRule = plan_id ? await resolveCommissionRule(plan_id) : null;

    const po_validity_days = po_settings.po_validity_days || 30;
    const expires_at = new Date(Date.now() + po_validity_days * 24 * 60 * 60 * 1000);

    // ── Dynamic Token Amount Calculation & Quota Handling ───────────────────────
    let token_amount_paise = 0;
    let token_paid_paise = 0;
    let token_payment_status = 'PENDING';
    let total_booked_quantity = 0;
    let remaining_quantity = 0;
    let lock_expires_at = null;

    if (isPoOrder) {
      total_booked_quantity = totalItemQty;
      remaining_quantity = totalItemQty;
      const lockDays = Number(po_settings.po_lock_days || po_settings.po_validity_days || 30);
      lock_expires_at = new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000);

      if (custom_token_amount_paise != null && Number(custom_token_amount_paise) >= 0) {
        token_amount_paise = Number(custom_token_amount_paise);
      } else if (po_settings.token_booking_enabled !== false) {
        if (po_settings.token_type === 'PERCENTAGE') {
          const pct = Number(po_settings.token_value) || 10;
          token_amount_paise = Math.round(grand_total_paise * (pct / 100));
        } else {
          // FIXED_AMOUNT (default)
          const fixedAmt = Number(po_settings.token_value) || 50000;
          token_amount_paise = Math.round(fixedAmt * 100);
        }
        // Floor/Cap
        if (token_amount_paise > grand_total_paise) token_amount_paise = grand_total_paise;
      } else {
        token_amount_paise = grand_total_paise;
      }

      if (offline_payment) {
        token_paid_paise = offline_payment.amount_paid ? Math.round(offline_payment.amount_paid * 100) : token_amount_paise;
        token_payment_status = token_paid_paise >= token_amount_paise ? 'PAID' : 'PENDING';
      }
    }

    // ── Loose Order PO Linkage & Admin-Configured Token Settlement ────────────────
    net_payable_paise = grand_total_paise;

    if (!isPoOrder && parentPoDoc) {
      // 2. Quota Availability Check
      const currentRemaining = parentPoDoc.remaining_quantity != null ? parentPoDoc.remaining_quantity : (parentPoDoc.total_booked_quantity || 0);
      if (totalItemQty > currentRemaining) {
        throw new Error(`Insufficient PO quota! Remaining quota in PO ${parentPoDoc.po_number} is ${currentRemaining} kits, but you requested ${totalItemQty} kits.`);
      }

      // 3. Admin-Configured Token Settlement Modes (Pro-rata vs Final Order vs Upfront)
      const totalCommitted = Number(parentPoDoc.total_booked_quantity || parentPoDoc.items?.[0]?.quantity || 100);
      const totalTokenPaid = Number(parentPoDoc.token_amount_paise || parentPoDoc.token_paid_paise || 0);
      const adjustedSoFar = Number(parentPoDoc.token_adjusted_total_paise || 0);
      const availableToken = Math.max(0, totalTokenPaid - adjustedSoFar);
      const settlementMode = parentPoDoc.token_settlement_mode || 'PRO_RATA';

      let tokenToAdjust = 0;
      const isClosingOrder = (totalItemQty === currentRemaining);

      if (isClosingOrder) {
        is_final_po_settlement = true;
        tokenToAdjust = Math.min(availableToken, grand_total_paise);
      } else if (settlementMode === 'PRO_RATA') {
        const tokenPerKit = totalCommitted > 0 ? Math.floor(totalTokenPaid / totalCommitted) : 0;
        tokenToAdjust = Math.min(availableToken, totalItemQty * tokenPerKit, grand_total_paise);
      } else if (settlementMode === 'UPFRONT') {
        tokenToAdjust = Math.min(availableToken, grand_total_paise);
      } else {
        // FINAL_ORDER only
        tokenToAdjust = 0;
      }

      token_adjusted_paise = tokenToAdjust;
      net_payable_paise = Math.max(0, grand_total_paise - tokenToAdjust);
    }

    const penaltyRuleSnapshot = {
      token_settlement_rule: po_settings.token_settlement_rule || 'PRO_RATA',
      default_penalty_type: po_settings.default_penalty_type || 'FLAT_PER_UNPURCHASED_KIT',
      default_penalty_rate: Number(po_settings.default_penalty_rate ?? 500),
      penalty_rules: po_settings.penalty_rules || [],
    };

    const order = await FpoOrder.create({
      po_number,
      idempotency_key: ikey,
      franchisee_id: franchisee_id || parentPoDoc?.franchisee_id || null,
      epc_id: epc_id || null,
      customer_type: epc_id ? 'SOLAR_EPC' : 'FRANCHISEE',
      customer_details: custDetails,
      created_by_role: created_by_role || (epc_id ? 'SOLAR_EPC' : 'FRANCHISEE'),
      creator_name: creator_name || custDetails.name || null,
      creator_code: creator_code || null,

      plan_id: plan_id || parentPoDoc?.plan_id || null,
      plan_snapshot: subscription,
      po_settings_snapshot: po_settings,
      penalty_rule_snapshot: penaltyRuleSnapshot,
      token_settlement_mode: po_settings.token_settlement_rule || 'PRO_RATA',
      industry_type_id: items[0]?.industry_type_id || null,
      order_type,
      po_category: po_category || 'SINGLE_PO',
      destination_type,
      destination_address,
      destination_pincode,
      offline_payment: offline_payment ? {
        ...offline_payment,
        receipt_url: offline_payment.receipt_url || offline_payment.payment_receipt_url || null,
        payment_receipt_url: offline_payment.payment_receipt_url || offline_payment.receipt_url || null,
      } : null,
      payment_receipt_url: offline_payment?.receipt_url || offline_payment?.payment_receipt_url || null,
      payment_reference: offline_payment?.utr_number || null,
      payment_utr: offline_payment?.utr_number || null,
      items: builtItems,
      subtotal_paise,
      tax_total_paise,
      grand_total_paise,
      payment_terms: payment_terms || po_settings.payment_terms || 'FULL_ADVANCE',
      advance_percentage: po_settings.advance_percentage || 0,

      // Token & Quota fields
      is_token_booking: isPoOrder ? Boolean(is_token_booking || po_settings.token_booking_enabled !== false) : false,
      token_amount_paise,
      token_paid_paise,
      token_payment_status,
      token_adjusted_total_paise: 0,
      token_balance_paise: token_paid_paise,
      total_booked_quantity,
      remaining_quantity,
      fulfilled_quantity: 0,
      lock_expires_at,

      // Loose order linked fields
      parent_po_id: parentPoDoc ? parentPoDoc._id : null,
      is_final_po_settlement,
      token_adjusted_paise,
      net_payable_paise,

      settlement_status: 'ACTIVE',
      status: !hasItems ? 'PENDING_ALLOCATION' : (isPoOrder ? (token_payment_status === 'PAID' ? 'PO_STARTED' : 'AWAITING_TOKEN_PAYMENT') : 'DRAFT'),
      status_history: [{
        status: !hasItems ? 'PENDING_ALLOCATION' : (isPoOrder ? (token_payment_status === 'PAID' ? 'PO_STARTED' : 'AWAITING_TOKEN_PAYMENT') : 'DRAFT'),
        changed_by: actor_id,
        actor_type: actor_id ? (created_by_role === 'ADMIN' ? 'cms_user' : (created_by_role === 'SOLAR_EPC' || epc_id ? 'epc_partner' : (created_by_role === 'BDE' ? 'bde' : 'reseller'))) : 'system',
        note: !hasItems ? 'PO Order container created. Awaiting product allocation.' : (isPoOrder && token_payment_status === 'PAID' ? 'PO created and token paid. PO Started.' : 'PO Draft Created'),
        changed_at: new Date()
      }],
      requires_approval: po_settings.requires_approval !== false,
      commission_rule_id: commissionRule?._id || null,
      commission_rule_snapshot: commissionRule || null,
      expires_at,
      created_by: actor_id,
      updated_by: actor_id,
    });

    // If a parent PO was consumed by this repeat order, atomically update its quota & token balance
    if (parentPoDoc) {
      const prevAdjusted = Number(parentPoDoc.token_adjusted_total_paise || 0);
      const newAdjusted = prevAdjusted + token_adjusted_paise;
      const totalToken = Number(parentPoDoc.token_amount_paise || parentPoDoc.token_paid_paise || 0);

      parentPoDoc.fulfilled_quantity = (parentPoDoc.fulfilled_quantity || 0) + totalItemQty;
      parentPoDoc.remaining_quantity = Math.max(0, (parentPoDoc.remaining_quantity != null ? parentPoDoc.remaining_quantity : (parentPoDoc.total_booked_quantity || 0)) - totalItemQty);
      parentPoDoc.token_adjusted_total_paise = newAdjusted;
      parentPoDoc.token_balance_paise = Math.max(0, totalToken - newAdjusted);

      if (!Array.isArray(parentPoDoc.linked_loose_order_ids)) {
        parentPoDoc.linked_loose_order_ids = [];
      }
      parentPoDoc.linked_loose_order_ids.push(order._id);

      if (parentPoDoc.remaining_quantity === 0) {
        parentPoDoc.token_payment_status = 'ADJUSTED';
        parentPoDoc.status = 'COMPLETED';
        parentPoDoc.settlement_status = 'SETTLED';
      }
      await parentPoDoc.save();
    }

    const now = new Date();
    if (franchisee_id) {
      recalculateProgress({ franchisee_id, month: now.getMonth() + 1, year: now.getFullYear(), req }).catch(() => { });
    }

    return { created: true, already_exists: false, order };
  }

  // ── 2. TRANSITION STATUS ──────────────────────────────────────────────────────
  async function _transitionStatus(po_id, targetStatus, { changed_by, actor_type = 'cms_user', note = null, extra_update = {} }) {
    const order = await FpoOrder.findById(po_id);
    if (!order) throw new Error(`PO "${po_id}" not found`);

    assertTransition(order.status, targetStatus);

    const now = new Date();
    order.status = targetStatus;
    const validChangedBy = (changed_by && mongoose.Types.ObjectId.isValid(changed_by)) ? changed_by : null;
    order.status_history.push({ status: targetStatus, changed_by: validChangedBy, actor_type, note, changed_at: now });
    order.updated_by = validChangedBy;

    Object.assign(order, extra_update);
    await order.save();

    recalculateProgress({ franchisee_id: order.franchisee_id, month: now.getMonth() + 1, year: now.getFullYear() }).catch(() => { });

    return order;
  }

  // ── 3. SUBMIT PO ─────────────────────────────────────────────────────────────
  async function submitPo({ po_id, franchisee_id, epc_id, actor_id, req }) {
    const query = { _id: po_id, deleted_at: null };
    if (franchisee_id) {
      query.franchisee_id = franchisee_id;
    } else if (epc_id) {
      query.$or = [
        { epc_id: epc_id },
        { 'items.epc_allocations.epc_buyer_id': epc_id },
      ];
    }
    const order = await FpoOrder.findOne(query).lean();
    if (!order) throw new Error('PO not found or access denied.');

    const target = order.requires_approval ? 'PENDING_APPROVAL' : 'APPROVED';
    const isEpc = order.customer_type === 'SOLAR_EPC' || order.epc_id || epc_id;
    const actorRole = isEpc ? 'epc_partner' : (order.created_by_role === 'ADMIN' ? 'cms_user' : 'reseller');
    const noteText = isEpc ? 'PO submitted by EPC buyer' : 'PO submitted by franchisee';

    const updated = await _transitionStatus(po_id, target, {
      changed_by: actor_id, actor_type: actorRole, note: noteText,
    });

    await logAudit({ actor_type: actorRole, actor_id, action: 'FPO_SUBMITTED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: target }, req });
    return updated;
  }

  // ── 4. APPROVE PO ────────────────────────────────────────────────────────────
  async function approvePo({ po_id, admin_id, notes, req }) {
    const updated = await _transitionStatus(po_id, 'APPROVED', {
      changed_by: admin_id, actor_type: 'cms_user', note: notes || 'Approved by admin',
      extra_update: { approved_by: admin_id, approved_at: new Date(), approval_notes: notes || null },
    });

    const awaiting = await _transitionStatus(po_id, 'AWAITING_PAYMENT', {
      changed_by: admin_id, actor_type: 'cms_user', note: 'Moved to awaiting payment',
    });

    await logAudit({ actor_type: 'cms_user', actor_id: admin_id, action: 'FPO_APPROVED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: 'AWAITING_PAYMENT' }, req });
    return awaiting;
  }

  // ── 5. REJECT PO ─────────────────────────────────────────────────────────────
  async function rejectPo({ po_id, admin_id, reason, req }) {
    const updated = await _transitionStatus(po_id, 'REJECTED', {
      changed_by: admin_id, actor_type: 'cms_user', note: reason,
      extra_update: { rejected_by: admin_id, rejected_at: new Date(), approval_notes: reason },
    });

    await logAudit({ actor_type: 'cms_user', actor_id: admin_id, action: 'FPO_REJECTED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: 'REJECTED', reason }, req });
    return updated;
  }

  // ── 6. CONFIRM PAYMENT ───────────────────────────────────────────────────────
  async function confirmPayment({ po_id, order_id, payment_reference, razorpay_payment_id, admin_id, req }) {
    const targetId = po_id || order_id;
    const orderDoc = await FpoOrder.findById(targetId);
    if (!orderDoc) throw new Error(`PO "${targetId}" not found`);

    const ref = payment_reference || razorpay_payment_id;
    const isParentTokenPay = (orderDoc.order_type === 'po_order' || orderDoc.order_type === 'bulk_po') &&
      ['AWAITING_TOKEN_PAYMENT', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PO_STARTED'].includes(orderDoc.status);

    let updated;
    if (isParentTokenPay) {
      // Parent PO Token Payment Verification: validates quota lock & activates repeat ordering
      const tokenPaidAmt = orderDoc.token_amount_paise || orderDoc.token_paid_paise || 0;
      updated = await _transitionStatus(targetId, 'VALIDATED', {
        changed_by: admin_id,
        actor_type: 'cms_user',
        note: `Token deposit payment verified by Accounts: ${ref || 'Verified'}`,
        extra_update: {
          token_payment_status: 'PAID',
          token_paid_paise: tokenPaidAmt,
          token_balance_paise: tokenPaidAmt,
          payment_reference: ref || null,
          payment_utr: ref || null,
          payment_confirmed_at: new Date(),
        },
      });
    } else {
      // Standard / Loose Kit repeat order payment confirmation
      updated = await _transitionStatus(targetId, 'PAID', {
        changed_by: admin_id,
        actor_type: 'cms_user',
        note: `Payment confirmed by Accounts: ${ref || 'Verified'}`,
        extra_update: {
          payment_reference: ref || null,
          payment_utr: ref || null,
          payment_status: 'paid',
          'offline_payment.verification_status': 'approved',
          'offline_payment.admin_approval_status': 'approved',
          'offline_payment.verified_by': admin_id,
          'offline_payment.verified_at': new Date(),
          razorpay_payment_id: razorpay_payment_id || null,
          payment_confirmed_at: new Date(),
        },
      });

      // If this is a child repeat order, atomically sync parent PO quota and token escrow
      if (orderDoc.parent_po_id) {
        const parentPo = await FpoOrder.findById(orderDoc.parent_po_id);
        if (parentPo) {
          const qtyOrdered = orderDoc.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || orderDoc.total_quantity || 1;
          const tokenAdj = Number(orderDoc.token_adjusted_paise || 0);

          if (!Array.isArray(parentPo.linked_loose_order_ids)) {
            parentPo.linked_loose_order_ids = [];
          }
          if (!parentPo.linked_loose_order_ids.some((id) => id.toString() === orderDoc._id.toString())) {
            parentPo.linked_loose_order_ids.push(orderDoc._id);
            parentPo.fulfilled_quantity = (parentPo.fulfilled_quantity || 0) + qtyOrdered;
            parentPo.remaining_quantity = Math.max(0, (parentPo.total_booked_quantity || 0) - parentPo.fulfilled_quantity);
            parentPo.token_adjusted_total_paise = (parentPo.token_adjusted_total_paise || 0) + tokenAdj;
            const totalToken = Number(parentPo.token_paid_paise || parentPo.token_amount_paise || 0);
            parentPo.token_balance_paise = Math.max(0, totalToken - parentPo.token_adjusted_total_paise);
          }

          if (parentPo.remaining_quantity === 0) {
            parentPo.token_payment_status = 'ADJUSTED';
            parentPo.status = 'COMPLETED';
            parentPo.settlement_status = 'SETTLED';
          }
          await parentPo.save();
        }
      }
    }

    // Post commission immediately upon payment confirmation (credits wallet & updates accounts tracking)
    await postCommission({ fpo_order_id: targetId, actor_id: admin_id, req }).catch((err) => {
      console.error('[franchisee.po.service] commission post error on confirmPayment (non-fatal):', err.message);
    });

    await logAudit({
      actor_type: 'cms_user',
      actor_id: admin_id,
      action: 'FPO_PAYMENT_CONFIRMED',
      entity_type: 'fpo_orders',
      entity_id: po_id,
      after_snapshot: { status: updated.status },
      req,
    });
    return updated;
  }

  // ── 7. DISPATCH PO ────────────────────────────────────────────────────────────
  async function dispatchPo({ po_id, admin_id, req }) {
    const updated = await _transitionStatus(po_id, 'DISPATCHED', {
      changed_by: admin_id, actor_type: 'cms_user', note: 'Order dispatched',
      extra_update: { dispatch_date: new Date() },
    });

    await logAudit({ actor_type: 'cms_user', actor_id: admin_id, action: 'FPO_DISPATCHED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: 'DISPATCHED' }, req });
    return updated;
  }

  // ── 8. DELIVER PO ─────────────────────────────────────────────────────────────
  async function deliverPo({ po_id, delivered_items, admin_id, req }) {
    const order = await FpoOrder.findById(po_id);
    if (!order) throw new Error(`PO "${po_id}" not found`);

    // Update delivered quantities per line item
    if (Array.isArray(delivered_items) && delivered_items.length > 0) {
      for (const d of delivered_items) {
        const item = order.items.id(d.item_id);
        if (item) item.delivered_quantity = Math.min(d.delivered_quantity, item.quantity);
      }
    } else {
      // Full delivery assumed
      order.items.forEach((item) => { item.delivered_quantity = item.quantity; });
    }

    order.delivery_date = new Date();
    order.goal_counted = true;
    order.goal_counted_qty = order.items.reduce((s, i) => s + (i.delivered_quantity || 0), 0);
    await _transitionStatus(po_id, 'DELIVERED', {
      changed_by: admin_id, actor_type: 'cms_user', note: 'Order delivered',
      extra_update: { delivery_date: new Date(), goal_counted: true },
    });
    await order.save();

    // Trigger goal progress recalculation
    const now = new Date();
    await recalculateProgress({
      franchisee_id: order.franchisee_id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      actor_id: admin_id,
      req,
    });

    // Post commission if applicable
    await postCommission({ fpo_order_id: po_id, actor_id: admin_id, req }).catch((err) => {
      console.error('[franchisee.po.service] commission post error (non-fatal):', err.message);
    });

    await logAudit({ actor_type: 'cms_user', actor_id: admin_id, action: 'FPO_DELIVERED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: 'DELIVERED' }, req });
    return order;
  }

  // ── 9. CANCEL PO ──────────────────────────────────────────────────────────────
  async function cancelPo({ po_id, reason, cancelled_by, actor_type = 'cms_user', req }) {
    const order = await FpoOrder.findById(po_id).lean();
    if (!order) throw new Error(`PO "${po_id}" not found`);

    const updated = await _transitionStatus(po_id, 'CANCELLED', {
      changed_by: cancelled_by, actor_type, note: reason,
      extra_update: { cancellation_reason: reason, cancelled_by, cancelled_at: new Date() },
    });

    // Reverse commission if already posted
    if (order.commission_posted) {
      const totalQty = order.items.reduce((s, i) => s + (i.delivered_quantity || i.quantity), 0);
      await reverseCommission({ fpo_order_id: po_id, returned_kit_quantity: totalQty, reason: `PO Cancelled: ${reason}`, actor_id: cancelled_by, req }).catch(() => { });
    }

    // Recalculate goal
    const now = new Date();
    await recalculateProgress({ franchisee_id: order.franchisee_id, month: now.getMonth() + 1, year: now.getFullYear(), req }).catch(() => { });

    await logAudit({ actor_type, actor_id: cancelled_by, action: 'FPO_CANCELLED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { status: 'CANCELLED', reason }, req });
    return updated;
  }

  // ── 10. RETURN ITEMS ──────────────────────────────────────────────────────────
  async function returnItems({ po_id, return_items, reason, actor_id, req }) {
    const order = await FpoOrder.findById(po_id);
    if (!order) throw new Error(`PO "${po_id}" not found`);

    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new Error('Returns can only be processed for delivered orders.');
    }

    let totalReturned = 0;
    for (const r of return_items) {
      const item = order.items.id(r.item_id);
      if (!item) continue;
      const maxReturnable = (item.delivered_quantity || item.quantity) - (item.returned_quantity || 0);
      const returnQty = Math.min(r.quantity, maxReturnable);
      item.returned_quantity = (item.returned_quantity || 0) + returnQty;
      totalReturned += returnQty;
    }

    order.updated_by = actor_id;
    await order.save();

    // Reverse commission proportionally
    if (order.commission_posted && totalReturned > 0) {
      await reverseCommission({ fpo_order_id: po_id, returned_kit_quantity: totalReturned, reason, actor_id, req }).catch(() => { });
    }

    // Recalculate goal
    const now = new Date();
    await recalculateProgress({ franchisee_id: order.franchisee_id, month: now.getMonth() + 1, year: now.getFullYear(), req }).catch(() => { });

    await logAudit({ actor_type: 'cms_user', actor_id, action: 'FPO_RETURN_PROCESSED', entity_type: 'fpo_orders', entity_id: po_id, after_snapshot: { return_items, totalReturned, reason }, req });
    return order;
  }

  // ── 10. ADVANCE 8-STAGE LIFECYCLE ─────────────────────────────────────────────
  /**
   * Advance an FPO order through the 8-stage lifecycle.
   * Stages:
   *   CONFIRMED → PROCESSING → VEHICLE_ASSIGNED → READY_FOR_DISPATCH
   *             → DISPATCHED → IN_TRANSIT → REACHED_DESTINATION → DELIVERED
   */
  async function advancePoStage({ po_id, new_stage, extra_data = {}, actor_id, req }) {
    const order = await FpoOrder.findById(po_id);
    if (!order) throw new Error(`PO "${po_id}" not found`);

    const upperStage = String(new_stage).toUpperCase();
    assertTransition(order.status, upperStage);

    if (upperStage === 'DISPATCHED' && extra_data.dispatch_data) {
      order.dispatch_tracking = {
        courier_name: extra_data.dispatch_data.courier_name || 'Company Fleet',
        tracking_number: extra_data.dispatch_data.tracking_number || null,
        tracking_url: extra_data.dispatch_data.tracking_url || null,
        dispatched_at: new Date(),
        estimated_delivery: extra_data.dispatch_data.estimated_delivery || null,
        dispatched_by: actor_id,
        dispatch_notes: extra_data.dispatch_data.dispatch_notes || null,
      };
      order.dispatch_date = new Date();
    }

    if (upperStage === 'IN_TRANSIT') {
      const mStatus = extra_data.milestone?.status || extra_data.milestone_status || extra_data.status || 'En Route';
      const mDesc = extra_data.milestone?.description || extra_data.description || null;
      order.milestones = order.milestones || [];
      order.milestones.push({
        status: mStatus,
        description: mDesc,
        recorded_by: actor_id,
        recorded_at: new Date(),
      });
    }

    if (upperStage === 'DELIVERED') {
      order.delivery_date = new Date();
      (order.items || []).forEach((it) => {
        it.delivered_quantity = it.quantity;
      });
      // Trigger commission and goals if not yet posted
      if (!order.commission_posted) {
        await postCommission({ fpo_order: order, actor_id, req }).catch(() => { });
      }
      const now = new Date();
      await recalculateProgress({ franchisee_id: order.franchisee_id, month: now.getMonth() + 1, year: now.getFullYear(), req }).catch(() => { });
    }

    order.status = upperStage;
    order.status_history = order.status_history || [];
    order.status_history.push({
      status: upperStage,
      changed_by: actor_id,
      actor_type: 'cms_user',
      note: extra_data.note || `Stage updated to ${upperStage}`,
      changed_at: new Date(),
    });
    order.updated_by = actor_id;
    await order.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id,
      action: `FPO_STAGE_${upperStage}`,
      entity_type: 'fpo_orders',
      entity_id: order._id,
      after_snapshot: { status: upperStage, order_number: order.po_number },
      req,
    });

    return order;
  }

  // ── 11. ASSIGN VEHICLE (STAGE 3) ──────────────────────────────────────────────
  async function assignVehicleToPo({ po_id, vehicle_id, driver, is_recommended, override_reason, actor_id, req }) {
    const order = await FpoOrder.findById(po_id);
    if (!order) throw new Error(`PO "${po_id}" not found`);

    const { DeliveryVehicle } = require('../../warehouse-panel/models/company_warehouse_db');
    const vehicle = await DeliveryVehicle.findById(vehicle_id).populate('assigned_driver_id').lean();
    if (!vehicle) throw new Error('Vehicle not found');

    order.assigned_vehicle = {
      vehicle_id: vehicle._id || vehicle.id,
      vehicle_name: vehicle.name,
      vehicle_type: vehicle.vehicle_type || 'Commercial Fleet',
      registration_number: vehicle.registration_number,
      driver_id: driver?.driver_id || vehicle.assigned_driver_id?._id || null,
      driver_name: driver?.driver_name || vehicle.assigned_driver_id?.name || null,
      driver_contact: driver?.driver_contact || vehicle.assigned_driver_id?.contact || null,
      is_recommended: is_recommended !== false,
      override_reason: is_recommended === false ? (override_reason || null) : null,
      assigned_by: actor_id,
      assigned_at: new Date(),
    };

    const allowedPrior = ['APPROVED', 'PAID', 'CONFIRMED', 'STOCK_ALLOCATED', 'PROCESSING', 'VEHICLE_ASSIGNED'];
    if (allowedPrior.includes(order.status)) {
      order.status = 'VEHICLE_ASSIGNED';
      order.status_history = order.status_history || [];
      order.status_history.push({
        status: 'VEHICLE_ASSIGNED',
        changed_by: actor_id,
        actor_type: 'cms_user',
        note: `Vehicle "${vehicle.registration_number}" assigned to order`,
        changed_at: new Date(),
      });
    }

    order.updated_by = actor_id;
    await order.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id,
      action: 'FPO_VEHICLE_ASSIGNED',
      entity_type: 'fpo_orders',
      entity_id: order._id,
      after_snapshot: { status: order.status, assigned_vehicle: order.assigned_vehicle },
      req,
    });

    return order;
  }

  // ── 13. ALLOCATE PRODUCTS & EPC PARTNERS TO PO ──────────────────────────────
  async function allocatePoProducts({
      po_id,
      franchisee_id,
      items,
      actor_id,
      req,
    }) {
      const query = { _id: po_id, deleted_at: null };
      if (franchisee_id) query.franchisee_id = franchisee_id;
      const order = await FpoOrder.findOne(query);
      if (!order) throw new Error('PO Order not found or unauthorized.');

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('At least one item must be allocated.');
      }

      // Active plan & settings
      const fid = franchisee_id || order.franchisee_id;
      const subscription = await ResellerPlanSubscription.findOne({
        reseller_id: fid,
        status: 'active',
      }).sort({ start_date: -1 }).lean();

      const plan_id = subscription?.plan_id;
      let allPlanPoSettings = [];
      if (plan_id) {
        allPlanPoSettings = await FranchiseePlanPoSetting.find({
          plan_id,
          is_active: true,
          po_enabled: true,
          deleted_at: null,
        }).lean();
      }
      const allocatedKitId = items[0]?.kit_id || items[0]?.combo_kit_id || order.items?.[0]?.kit_id;
      let specificPoSetting = null;
      if (allocatedKitId && allPlanPoSettings.length > 0) {
        const targetKitStr = String(allocatedKitId);
        specificPoSetting = allPlanPoSettings.find((s) =>
          Array.isArray(s.allowed_combo_kit_ids) &&
          s.allowed_combo_kit_ids.some((id) => String(id._id || id.id || id) === targetKitStr)
        );
      }
      const planDefaultPoSetting = allPlanPoSettings.find((s) =>
        !s.allowed_combo_kit_ids || s.allowed_combo_kit_ids.length === 0
      );
      const po_settings = specificPoSetting || planDefaultPoSetting || (allPlanPoSettings.length > 0 ? allPlanPoSettings[0] : (order.po_settings_snapshot || {}));

      const validationResults = await validatePoItems(items, plan_id, po_settings);
      const failures = validationResults.filter((r) => !r.valid);
      if (failures.length > 0) {
        throw new Error(failures.map((f) => `Item "${f.item_name}": ${f.reason}`).join('; '));
      }

      let subtotal_paise = 0;
      let tax_total_paise = 0;
      const builtItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const moq_rule = validationResults[i]?.moq_rule;

        // ── Strictly Preserve Locked Unit Price & GST Rate from PO Creation ─────────
        const existingItem = order.items?.[i] || order.items?.[0];
        const lockedUnitPricePaise = (existingItem?.unit_price_paise != null && Number(existingItem.unit_price_paise) > 0)
          ? Number(existingItem.unit_price_paise)
          : (Number(item.unit_price_paise) || 0);

        const lockedGstRate = (existingItem?.gst_rate != null)
          ? Number(existingItem.gst_rate)
          : (Number(item.gst_rate) || 0);

        const lockedKitId = existingItem?.kit_id || item.kit_id || null;
        const lockedProductId = existingItem?.product_id || item.product_id || null;
        const lockedItemName = existingItem?.item_name || item.item_name || 'Solar Kit';

        const tax_paise = Math.round(lockedUnitPricePaise * item.quantity * (lockedGstRate / 100));
        const total_price_paise = (lockedUnitPricePaise * item.quantity) + tax_paise;

        subtotal_paise += lockedUnitPricePaise * item.quantity;
        tax_total_paise += tax_paise;

        let commission_method = null;
        let commission_snapshot = 0;
        if (plan_id) {
          const commissionRule = await resolveCommissionRule(plan_id);
          if (commissionRule) {
            commission_method = commissionRule.commission_method;
            commission_snapshot = commissionRule.commission_method === 'FIXED_PER_KIT'
              ? (commissionRule.fixed_amount_per_kit_paise || 0)
              : (commissionRule.commission_percentage || 0) * 100;
          }
        }
        builtItems.push({
          project_type_id: item.project_type_id || null,
          project_type_name: item.project_type_name || null,
          kit_id: lockedKitId,
          product_id: lockedProductId,
          item_name: lockedItemName,
          item_code: item.item_code || null,
          quantity: item.quantity,
          epc_allocations: Array.isArray(item.epc_allocations) ? item.epc_allocations : [],
          moq_snapshot: moq_rule ? {
            moq: moq_rule.moq,
            increment_quantity: moq_rule.increment_quantity,
            max_quantity: moq_rule.max_quantity,
            rule_id: moq_rule._id,
          } : null,
          unit_price_paise: lockedUnitPricePaise,
          gst_rate: lockedGstRate,
          tax_paise,
          total_price_paise,
          commission_method,
          commission_snapshot,
          contributes_to_target: po_settings.contributes_to_monthly_target !== false,
          returned_quantity: 0,
          cancelled_quantity: 0,
          delivered_quantity: 0,
        });
      }

      const grand_total_paise = subtotal_paise + tax_total_paise;
      const totalItemQty = builtItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);

      // Dynamic Token calculation
      let token_amount_paise = 0;
      if (items[0]?.token_rate_paise != null && Number(items[0].token_rate_paise) > 0) {
        token_amount_paise = Number(items[0].token_rate_paise);
      } else if (order.token_amount_paise != null && Number(order.token_amount_paise) > 0) {
        token_amount_paise = Number(order.token_amount_paise);
      } else if (po_settings.token_booking_enabled !== false) {
        if (po_settings.token_type === 'PERCENTAGE') {
          const pct = Number(po_settings.token_value) || 10;
          token_amount_paise = Math.round(grand_total_paise * (pct / 100));
        } else {
          const fixedAmt = Number(po_settings.token_value) || 50000;
          token_amount_paise = Math.round(fixedAmt * 100);
        }
        if (token_amount_paise > grand_total_paise) token_amount_paise = grand_total_paise;
      } else {
        token_amount_paise = grand_total_paise;
      }

      // Allocate per-EPC token amounts proportionally
      builtItems.forEach((it) => {
        if (Array.isArray(it.epc_allocations) && it.epc_allocations.length > 0) {
          it.epc_allocations.forEach((alloc) => {
            const shareRatio = totalItemQty > 0 ? (alloc.allocated_quantity / totalItemQty) : 0;
            alloc.token_amount_paise = Math.round(shareRatio * token_amount_paise);
            alloc.token_payment_status = alloc.token_payment_status || 'PENDING';
          });
        }
      });

      // Preserve existing lock_expires_at if already valid and active, otherwise set from lockDays
      const lockDays = Number(po_settings.po_lock_days || po_settings.po_validity_days || 30);
      if (!order.lock_expires_at || new Date(order.lock_expires_at) < new Date()) {
        order.lock_expires_at = new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000);
      }

      if (order.po_category === 'SINGLE_PO') {
        if (builtItems[0]?.epc_allocations?.length === 1) {
          order.epc_id = builtItems[0].epc_allocations[0].epc_buyer_id;
        } else {
          order.epc_id = null;
        }
      }

      order.items = builtItems;
      order.subtotal_paise = subtotal_paise;
      order.tax_total_paise = tax_total_paise;
      order.grand_total_paise = grand_total_paise;
      order.total_booked_quantity = totalItemQty;
      order.remaining_quantity = totalItemQty;
      order.token_amount_paise = token_amount_paise;

      // Check if token was already paid (e.g. at PO creation or advance escrow)
      const isTokenAlreadyPaid = Boolean(order.token_paid_paise && Number(order.token_paid_paise) > 0 && Number(order.token_paid_paise) >= token_amount_paise);
      order.token_payment_status = isTokenAlreadyPaid ? 'PAID' : (Number(order.token_paid_paise) > 0 ? 'PARTIALLY_PAID' : 'PENDING');
      order.token_balance_paise = order.token_paid_paise || 0;

      if (isTokenAlreadyPaid) {
        builtItems.forEach((it) => {
          if (Array.isArray(it.epc_allocations)) {
            it.epc_allocations.forEach((alloc) => {
              alloc.payment_status = 'PAID';
              alloc.token_paid_paise = alloc.token_amount_paise;
              alloc.paid_at = alloc.paid_at || new Date();
            });
          }
        });
      }

      const nextStatus = isTokenAlreadyPaid ? 'PO_STARTED' : 'AWAITING_TOKEN_PAYMENT';
      order.status = nextStatus;
      order.status_history.push({
        status: nextStatus,
        changed_by: actor_id,
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'cms_user'),
        note: isTokenAlreadyPaid
          ? 'Products and EPC partner allocated. Token already paid — PO Started!'
          : 'Products and EPC partners allocated. Awaiting token payment.',
        changed_at: new Date(),
      });
      order.updated_by = actor_id;
      await order.save();

      await logAudit({
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'cms_user'),
        actor_id,
        action: 'FPO_PRODUCTS_ALLOCATED',
        entity_type: 'fpo_orders',
        entity_id: order._id,
        after_snapshot: { status: 'AWAITING_TOKEN_PAYMENT', total_qty: totalItemQty, token_amount_paise },
        req,
      });

      return order;
    }

    // ── 14. RECORD EPC TOKEN PAYMENT ─────────────────────────────────────────────
    async function recordEpcTokenPayment({
      po_id,
      franchisee_id,
      epc_buyer_id,
      payment_method = 'offline_bank_transfer',
      utr_number,
      amount_paid_inr,
      payment_date,
      sender_bank_name,
      payment_receipt_url,
      actor_id,
      req,
    }) {
      const query = { _id: po_id, deleted_at: null };
      if (franchisee_id) query.franchisee_id = franchisee_id;
      const order = await FpoOrder.findOne(query);
      if (!order) throw new Error('PO Order not found.');

      const amountPaise = amount_paid_inr ? Math.round(Number(amount_paid_inr) * 100) : (order.token_amount_paise || 5000000);

      if (epc_buyer_id && order.items) {
        order.items.forEach((item) => {
          if (Array.isArray(item.epc_allocations)) {
            item.epc_allocations.forEach((alloc) => {
              const matchesEpc =
                String(alloc.epc_buyer_id) === String(epc_buyer_id) ||
                String(alloc._id) === String(epc_buyer_id) ||
                (alloc.epc_buyer_id && alloc.epc_buyer_id._id && String(alloc.epc_buyer_id._id) === String(epc_buyer_id)) ||
                (item.epc_allocations.length === 1);
              if (matchesEpc) {
                alloc.payment_status = 'PAID';
                alloc.token_paid_paise = alloc.token_amount_paise || amountPaise;
                alloc.payment_utr = utr_number || null;
                alloc.payment_receipt_url = payment_receipt_url || null;
                alloc.paid_at = new Date();
              }
            });
          }
        });
      }

      order.token_paid_paise = (order.token_paid_paise || 0) + amountPaise;
      order.token_balance_paise = order.token_paid_paise;
      order.payment_reference = utr_number || order.payment_reference;
      order.payment_utr = utr_number || order.payment_utr;
      order.offline_payment = {
        payment_method,
        utr_number: utr_number || 'OFFLINE_VERIFIED',
        amount_paid: amount_paid_inr || (amountPaise / 100),
        payment_date: payment_date || new Date().toISOString().slice(0, 10),
        sender_bank_name: sender_bank_name || 'Bank Transfer',
      };

      const isFullTokenPaid = (order.token_paid_paise >= order.token_amount_paise);
      if (isFullTokenPaid) {
        order.token_payment_status = 'PAID';
      }

      // Token payment enables PO start
      order.status = 'PO_STARTED';
      order.status_history.push({
        status: 'PO_STARTED',
        changed_by: actor_id,
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'system'),
        note: `Token payment recorded (${utr_number || 'Confirmed'}). PO Started!`,
        changed_at: new Date(),
      });
      order.updated_by = actor_id;
      await order.save();

      await logAudit({
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'system'),
        actor_id,
        action: 'FPO_TOKEN_PAID_STARTED',
        entity_type: 'fpo_orders',
        entity_id: order._id,
        after_snapshot: { status: 'PO_STARTED', token_paid_paise: order.token_paid_paise },
        req,
      });

      return order;
    }

    // ── 15. VALIDATE PO ──────────────────────────────────────────────────────────
    async function validatePo({
      po_id,
      franchisee_id,
      actor_id,
      notes,
      req,
    }) {
      const query = { _id: po_id, deleted_at: null };
      if (franchisee_id) query.franchisee_id = franchisee_id;
      const order = await FpoOrder.findOne(query);
      if (!order) throw new Error('PO Order not found.');

      order.status = 'VALIDATED';
      order.status_history.push({
        status: 'VALIDATED',
        changed_by: actor_id,
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'cms_user'),
        note: notes || 'PO Validated. Quota and price lock active.',
        changed_at: new Date(),
      });
      order.updated_by = actor_id;
      await order.save();

      await logAudit({
        actor_type: franchisee_id ? 'reseller' : (order.epc_id ? 'epc_partner' : 'cms_user'),
        actor_id,
        action: 'FPO_VALIDATED',
        entity_type: 'fpo_orders',
        entity_id: order._id,
        after_snapshot: { status: 'VALIDATED' },
        req,
      });

      return order;
    }

    module.exports = {
      createPoDraft,
      submitPo,
      approvePo,
      rejectPo,
      confirmPayment,
      dispatchPo,
      deliverPo,
      cancelPo,
      returnItems,
      generatePoNumber,
      advancePoStage,
      assignVehicleToPo,
      allocatePoProducts,
      recordEpcTokenPayment,
      validatePo,
      ALLOWED_TRANSITIONS,
    }
