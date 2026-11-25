/**
 * franchisee.po.settings.handler.js
 *
 * Admin CRUD for Franchisee Plan PO Settings (franchisee_plan_po_settings collection).
 * Permission code: FPO_SETTINGS
 * Prefix: /admin-api/franchisee/po-settings
 */

const mongoose = require('mongoose');
const { FranchiseePlanPoSetting, ResellerPlan, WarehouseComboKit } = require('../models/india_solarshop_db');
const { ProjectType, IndustryType, ProjectCategory, ProjectSubcategory } = require('../models/core_db');
const { logAudit } = require('../utils/audit.service');

// ── LIST ──────────────────────────────────────────────────────────────────────
const list_po_settings = async (req, res) => {
  try {
    const { plan_id, active_only } = req.query;
    const query = { deleted_at: null };
    if (plan_id) query.plan_id = plan_id;
    if (active_only === 'true') query.is_active = true;

    const rows = await FranchiseePlanPoSetting.find(query)
      .populate('plan_id', 'name territory_level')
      .populate({ path: 'allowed_project_type_ids', model: ProjectType, select: 'name' })
      .populate({ path: 'allowed_combo_kit_ids', model: WarehouseComboKit, select: 'name capacity capacity_kw kit_code' })
      .populate({ path: 'allowed_industry_type_ids', model: IndustryType, select: 'name' })
      .populate({ path: 'allowed_category_ids', model: ProjectCategory, select: 'name' })
      .populate({ path: 'allowed_subcategory_ids', model: ProjectSubcategory, select: 'name' })
      .sort({ created_at: -1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[po.settings] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADD ───────────────────────────────────────────────────────────────────────
const add_po_settings = async (req, res) => {
  try {
    const { plan_id, po_enabled, min_po_quantity, max_po_quantity, allow_mixed_project_types, max_line_items,
      allowed_industry_type_ids, allowed_project_type_ids, allowed_category_ids, allowed_subcategory_ids,
      allowed_combo_kit_ids, allowed_product_ids,
      allowed_territory_levels, po_validity_days, requires_approval,
      token_booking_enabled, token_type, token_value, min_token_amount, po_lock_days,
      token_settlement_rule, default_penalty_type, default_penalty_rate, penalty_rules,
      payment_terms, advance_percentage,
      credit_period_eligible, credit_period_days, cancellation_rules, amendment_rules,
      contributes_to_monthly_target, effective_from, effective_until } = req.body;

    if (!plan_id || !mongoose.Types.ObjectId.isValid(plan_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid plan_id is required' });
    }
    if (!effective_from) {
      return res.status(400).json({ status: 'error', message: 'effective_from date is required' });
    }

    const plan = await ResellerPlan.findOne({ _id: plan_id, deleted_at: null }).lean();
    if (!plan) return res.status(404).json({ status: 'error', message: 'Reseller plan not found' });

    // Validate that combo kits are not already assigned to another PO setting under the same plan
    if (Array.isArray(allowed_combo_kit_ids) && allowed_combo_kit_ids.length > 0) {
      const duplicateDoc = await FranchiseePlanPoSetting.findOne({
        plan_id,
        deleted_at: null,
        allowed_combo_kit_ids: { $in: allowed_combo_kit_ids },
      }).populate({ path: 'allowed_combo_kit_ids', model: WarehouseComboKit, select: 'name kit_code' }).lean();

      if (duplicateDoc) {
        const conflictedKit = (duplicateDoc.allowed_combo_kit_ids || []).find((k) =>
          allowed_combo_kit_ids.map(String).includes(String(k._id || k.id || k))
        );
        return res.status(400).json({
          status: 'error',
          message: `The product/combo kit "${conflictedKit?.name || 'Selected product'}" is already configured in another PO setting for this plan. Each product can only have one active PO setting per plan.`,
        });
      }
    }

    let normalizedPenaltyType = default_penalty_type;
    if (default_penalty_type === 'PERCENTAGE') normalizedPenaltyType = 'PERCENTAGE_OF_TOKEN';
    else if (default_penalty_type === 'FIXED_PER_KIT') normalizedPenaltyType = 'FLAT_PER_UNPURCHASED_KIT';
    else if (default_penalty_type === 'FULL_FORFEIT') normalizedPenaltyType = 'PERCENTAGE_OF_TOKEN';
    if (!['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'].includes(normalizedPenaltyType)) {
      normalizedPenaltyType = 'FLAT_PER_UNPURCHASED_KIT';
    }

    const doc = await FranchiseePlanPoSetting.create({
      plan_id,
      po_enabled: Boolean(po_enabled),
      min_po_quantity: min_po_quantity != null ? Number(min_po_quantity) : 1,
      max_po_quantity: max_po_quantity != null ? Number(max_po_quantity) : null,
      allow_mixed_project_types: allow_mixed_project_types !== false,
      max_line_items: max_line_items != null ? Number(max_line_items) : 50,
      allowed_industry_type_ids: Array.isArray(allowed_industry_type_ids) ? allowed_industry_type_ids : [],
      allowed_project_type_ids: Array.isArray(allowed_project_type_ids) ? allowed_project_type_ids : [],
      allowed_category_ids: Array.isArray(allowed_category_ids) ? allowed_category_ids : [],
      allowed_subcategory_ids: Array.isArray(allowed_subcategory_ids) ? allowed_subcategory_ids : [],
      allowed_combo_kit_ids: Array.isArray(allowed_combo_kit_ids) ? allowed_combo_kit_ids : [],
      allowed_product_ids: Array.isArray(allowed_product_ids) ? allowed_product_ids : [],
      allowed_territory_levels: Array.isArray(allowed_territory_levels) ? allowed_territory_levels : [],
      po_validity_days: po_validity_days != null ? Number(po_validity_days) : (po_lock_days != null ? Number(po_lock_days) : 30),
      token_booking_enabled: token_booking_enabled !== false,
      token_type: ['FIXED_AMOUNT', 'PERCENTAGE'].includes(token_type) ? token_type : 'FIXED_AMOUNT',
      token_value: token_value != null ? Number(token_value) : 50000,
      min_token_amount: min_token_amount != null ? Number(min_token_amount) : 10000,
      po_lock_days: po_lock_days != null ? Number(po_lock_days) : (po_validity_days != null ? Number(po_validity_days) : 30),
      token_settlement_rule: ['PRO_RATA', 'FINAL_ORDER', 'UPFRONT'].includes(token_settlement_rule) ? token_settlement_rule : 'PRO_RATA',
      default_penalty_type: normalizedPenaltyType,
      default_penalty_rate: default_penalty_rate != null ? Number(default_penalty_rate) : 500,
      penalty_rules: Array.isArray(penalty_rules) ? penalty_rules : [],
      requires_approval: requires_approval !== false,
      payment_terms: payment_terms || 'FULL_ADVANCE',
      advance_percentage: advance_percentage != null ? Number(advance_percentage) : null,
      credit_period_eligible: Boolean(credit_period_eligible),
      credit_period_days: credit_period_days != null ? Number(credit_period_days) : 0,
      cancellation_rules: cancellation_rules || {},
      amendment_rules: amendment_rules || {},
      po_contract: req.body.po_contract || undefined,
      contributes_to_monthly_target: contributes_to_monthly_target !== false,
      effective_from: new Date(effective_from),
      effective_until: effective_until ? new Date(effective_until) : null,
      created_by: req.user?.id,
      updated_by: req.user?.id,
    });

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_SETTINGS_CREATE', entity_type: 'franchisee_plan_po_settings', entity_id: doc._id, after_snapshot: doc.toObject(), req });

    return res.status(201).json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ status: 'error', message: 'PO settings already exist for this plan and effective date. Use the update endpoint.' });
    console.error('[po.settings] add error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
const update_po_settings = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await FranchiseePlanPoSetting.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'PO settings not found' });

    // Validate that combo kits are not already assigned to another PO setting under the same plan
    if (Array.isArray(fields.allowed_combo_kit_ids) && fields.allowed_combo_kit_ids.length > 0) {
      const duplicateDoc = await FranchiseePlanPoSetting.findOne({
        plan_id: doc.plan_id,
        _id: { $ne: doc._id },
        deleted_at: null,
        allowed_combo_kit_ids: { $in: fields.allowed_combo_kit_ids },
      }).populate({ path: 'allowed_combo_kit_ids', model: WarehouseComboKit, select: 'name kit_code' }).lean();

      if (duplicateDoc) {
        const conflictedKit = (duplicateDoc.allowed_combo_kit_ids || []).find((k) =>
          fields.allowed_combo_kit_ids.map(String).includes(String(k._id || k.id || k))
        );
        return res.status(400).json({
          status: 'error',
          message: `The product/combo kit "${conflictedKit?.name || 'Selected product'}" is already configured in another PO setting for this plan. Each product can only have one active PO setting per plan.`,
        });
      }
    }

    if (fields.default_penalty_type) {
      let pt = fields.default_penalty_type;
      if (pt === 'PERCENTAGE') pt = 'PERCENTAGE_OF_TOKEN';
      else if (pt === 'FIXED_PER_KIT') pt = 'FLAT_PER_UNPURCHASED_KIT';
      else if (pt === 'FULL_FORFEIT') pt = 'PERCENTAGE_OF_TOKEN';
      if (['FLAT_PER_UNPURCHASED_KIT', 'PERCENTAGE_OF_TOKEN', 'PERCENTAGE_OF_UNPURCHASED_VALUE'].includes(pt)) {
        fields.default_penalty_type = pt;
      } else {
        fields.default_penalty_type = 'FLAT_PER_UNPURCHASED_KIT';
      }
    }
    if (fields.token_settlement_rule && !['PRO_RATA', 'FINAL_ORDER', 'UPFRONT'].includes(fields.token_settlement_rule)) {
      fields.token_settlement_rule = 'PRO_RATA';
    }
    if (fields.token_type && !['FIXED_AMOUNT', 'PERCENTAGE'].includes(fields.token_type)) {
      fields.token_type = 'FIXED_AMOUNT';
    }
    if (fields.token_value !== undefined && fields.token_value !== null && !isNaN(Number(fields.token_value))) {
      fields.token_value = Number(fields.token_value);
    }
    if (fields.token_booking_enabled !== undefined) {
      fields.token_booking_enabled = Boolean(fields.token_booking_enabled);
    }
    if (fields.po_lock_days !== undefined && fields.po_lock_days !== null && !isNaN(Number(fields.po_lock_days))) {
      fields.po_lock_days = Number(fields.po_lock_days);
    }

    const before = doc.toObject();
    const allowed = ['po_enabled', 'min_po_quantity', 'max_po_quantity', 'allow_mixed_project_types',
      'max_line_items', 'allowed_industry_type_ids', 'allowed_project_type_ids', 'allowed_category_ids',
      'allowed_subcategory_ids', 'allowed_combo_kit_ids',
      'allowed_product_ids', 'allowed_territory_levels', 'po_validity_days', 'requires_approval',
      'token_booking_enabled', 'token_type', 'token_value', 'min_token_amount', 'po_lock_days',
      'token_settlement_rule', 'default_penalty_type', 'default_penalty_rate', 'penalty_rules',
      'payment_terms', 'advance_percentage', 'credit_period_eligible', 'credit_period_days',
      'cancellation_rules', 'amendment_rules', 'po_contract', 'contributes_to_monthly_target', 'effective_from', 'effective_until', 'is_active'];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        doc[key] = fields[key];
      }
    }
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_SETTINGS_UPDATE', entity_type: 'franchisee_plan_po_settings', entity_id: id, before_snapshot: before, after_snapshot: doc.toObject(), req });

    return res.json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    console.error('[po.settings] update error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── TOGGLE STATUS ─────────────────────────────────────────────────────────────
const toggle_po_settings_status = async (req, res) => {
  try {
    const { id, is_active } = req.body;
    if (!id || typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'id and boolean is_active required' });
    }
    const doc = await FranchiseePlanPoSetting.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'PO settings not found' });
    doc.is_active = is_active;
    doc.updated_by = req.user?.id;
    await doc.save();
    return res.json({ status: 'success', message: `PO settings ${is_active ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('[po.settings] toggle error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── SOFT DELETE ───────────────────────────────────────────────────────────────
const delete_po_settings = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
    const doc = await FranchiseePlanPoSetting.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'PO settings not found' });
    doc.deleted_at = new Date();
    doc.is_active = false;
    doc.updated_by = req.user?.id;
    await doc.save();
    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_SETTINGS_DELETE', entity_type: 'franchisee_plan_po_settings', entity_id: id, req });
    return res.json({ status: 'success', message: 'PO settings deleted' });
  } catch (error) {
    console.error('[po.settings] delete error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── PO ORDER CONTRACT: GET PLAN CONTRACT ──────────────────────────────────────
const DEFAULT_CONTRACT_CLAUSES = [
  {
    title: "1. Scope of Supply & Quantity Commitment",
    body: "The Solar EPC Contractor agrees to procure, lift, and take delivery of the committed quantity of {{quantity}} SolarKits combo kit(s) under Purchase Order {{po_number}}. The Franchise Partner agrees to supply and allocate the agreed specifications strictly in accordance with SolarKits standards.",
    is_mandatory: true
  },
  {
    title: "2. Token Commitment Deposit",
    body: "The EPC Contractor agrees to pay a mandatory token commitment deposit of ₹{{token_amount}} to secure and lock the inventory. This deposit shall be verified and credited against final purchase invoices or pro-rata dispatches as per plan policy.",
    is_mandatory: true
  },
  {
    title: "3. Order Lock-in & Validity Period",
    body: "This Purchase Order commitment and inventory reservation shall remain firm and valid for a period of {{validity_days}} calendar days from the date of contract execution. Committed kit prices are protected during this validity window.",
    is_mandatory: true
  },
  {
    title: "4. Penalty for Unpurchased Kits & Forfeiture",
    body: "In the event that the EPC Contractor fails to lift the committed kits within {{validity_days}} days, the Franchise Partner and SolarKits reserve the right to apply unpurchased kit penalties or adjust the token deposit as per plan rules.",
    is_mandatory: true
  },
  {
    title: "5. Dispatch, Logistics & Material Handling",
    body: "Upon payment clearance of the balance amount, materials will be dispatched to the designated delivery destination. Transit insurance and dispatch handover will follow SolarKits operational standard operating procedures.",
    is_mandatory: true
  },
  {
    title: "6. Electronic Signature & Mobile OTP Verification",
    body: "This Contract is executed digitally. Mobile OTP verification to the EPC's registered mobile number constitutes an authenticated, legally binding digital signature under the Information Technology Act.",
    is_mandatory: true
  }
];

const get_plan_po_contract = async (req, res) => {
  try {
    const { plan_id } = req.query;
    if (!plan_id) return res.status(400).json({ status: 'error', message: 'plan_id is required' });

    let setting = await FranchiseePlanPoSetting.findOne({ plan_id, deleted_at: null }).lean();
    const contract = setting?.po_contract || {};

    const responseData = {
      plan_id,
      is_contract_required: contract.is_contract_required !== undefined ? contract.is_contract_required : true,
      contract_title: contract.contract_title || "SolarKits EPC Purchase Order & Supply Commitment Agreement",
      contract_version: contract.contract_version || "1.0",
      validity_days: contract.validity_days || setting?.po_validity_days || 30,
      require_mobile_otp: contract.require_mobile_otp !== undefined ? contract.require_mobile_otp : true,
      terms_introduction: contract.terms_introduction || "This Purchase Order Contract is entered into between the Authorized SolarKits Franchise Partner and the Assigned Solar EPC Contractor for supply commitment and token deposit under the terms set forth below.",
      clauses: Array.isArray(contract.clauses) && contract.clauses.length > 0 ? contract.clauses : DEFAULT_CONTRACT_CLAUSES,
      penalty_clauses_summary: contract.penalty_clauses_summary || `Default penalty type: ${setting?.default_penalty_type || 'FLAT_PER_UNPURCHASED_KIT'}, Rate: ₹${setting?.default_penalty_rate || 500}`,
      cancellation_terms: contract.cancellation_terms || "Cancellations before payment are permitted. Token deposit adjustments apply after cancellation window.",
      updated_at: contract.updated_at || setting?.updated_at || null,
      setting_id: setting?._id || null,
    };

    return res.json({ status: 'success', data: responseData });
  } catch (error) {
    console.error('[po.settings] get_plan_po_contract error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch contract settings' });
  }
};

// ── PO ORDER CONTRACT: SAVE PLAN CONTRACT ─────────────────────────────────────
const save_plan_po_contract = async (req, res) => {
  try {
    const {
      plan_id,
      is_contract_required,
      contract_title,
      contract_version,
      validity_days,
      require_mobile_otp,
      terms_introduction,
      clauses,
      penalty_clauses_summary,
      cancellation_terms
    } = req.body;

    if (!plan_id) return res.status(400).json({ status: 'error', message: 'plan_id is required' });

    let setting = await FranchiseePlanPoSetting.findOne({ plan_id, deleted_at: null });

    const poContractData = {
      is_contract_required: is_contract_required !== false,
      contract_title: (contract_title || "").trim() || "SolarKits EPC Purchase Order & Supply Commitment Agreement",
      contract_version: (contract_version || "1.0").trim(),
      validity_days: validity_days != null ? Number(validity_days) : 30,
      require_mobile_otp: require_mobile_otp !== false,
      terms_introduction: (terms_introduction || "").trim() || "This Purchase Order Contract is entered into between the Authorized SolarKits Franchise Partner and the Assigned Solar EPC Contractor.",
      clauses: Array.isArray(clauses) && clauses.length > 0 ? clauses : DEFAULT_CONTRACT_CLAUSES,
      penalty_clauses_summary: penalty_clauses_summary || null,
      cancellation_terms: cancellation_terms || null,
      updated_at: new Date()
    };

    if (setting) {
      setting.po_contract = poContractData;
      setting.updated_by = req.user?.id;
      await setting.save();
    } else {
      setting = await FranchiseePlanPoSetting.create({
        plan_id,
        po_enabled: true,
        po_validity_days: poContractData.validity_days,
        po_contract: poContractData,
        created_by: req.user?.id,
        updated_by: req.user?.id,
        effective_from: new Date(),
      });
    }

    return res.json({
      status: 'success',
      message: 'PO contract settings saved successfully',
      data: setting.po_contract
    });
  } catch (error) {
    console.error('[po.settings] save_plan_po_contract error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to save PO contract settings' });
  }
};

module.exports = {
  list_po_settings,
  add_po_settings,
  update_po_settings,
  toggle_po_settings_status,
  delete_po_settings,
  get_plan_po_contract,
  save_plan_po_contract,
  DEFAULT_CONTRACT_CLAUSES,
};
