/**
 * franchisee.moq.rules.handler.js
 *
 * Admin CRUD for Franchisee MOQ & Increment Rules (franchisee_moq_rules collection).
 * Also provides a quantity validation endpoint for the frontend.
 *
 * Permission code: FPO_MOQ
 * Prefix: /admin-api/franchisee/moq-rules
 */

const mongoose = require('mongoose');
const { FranchiseeMoqRule, ResellerPlan } = require('../models/india_solarshop_db');
const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectSubcategoryType,
  ProjectType,
  ProjectRange,
  WarehouseComboKit
} = require('../models/core_db');
const { resolveEffectiveMoqRule, resolveEffectivePoSettings, validateQuantity } = require('../services/franchisee.moq.service');
const { logAudit } = require('../utils/audit.service');

// ── LIST ──────────────────────────────────────────────────────────────────────
const list_moq_rules = async (req, res) => {
  try {
    const { plan_id, project_type_id, industry_type_id, combo_kit_id, active_only } = req.query;
    const query = { deleted_at: null };
    if (plan_id) query.plan_id = plan_id;
    if (project_type_id) query.project_type_id = project_type_id;
    if (industry_type_id) query.industry_type_id = industry_type_id;
    if (combo_kit_id) query.combo_kit_id = combo_kit_id;
    if (active_only === 'true') query.is_active = true;

    const rows = await FranchiseeMoqRule.find(query)
      .populate({ path: 'plan_id', model: ResellerPlan, select: 'name' })
      .populate({ path: 'industry_type_id', model: IndustryType, select: 'name' })
      .populate({ path: 'category_id', model: ProjectCategory, select: 'name' })
      .populate({ path: 'subcategory_id', model: ProjectSubcategory, select: 'name' })
      .populate({ path: 'system_type_id', model: ProjectSubcategoryType, select: 'name' })
      .populate({ path: 'project_type_id', model: ProjectType, select: 'name' })
      .populate({ path: 'project_range_id', model: ProjectRange, select: 'label min_value max_value unit_symbol' })
      .populate({ path: 'combo_kit_id', model: WarehouseComboKit, select: 'name kit_name total_capacity_kw sku capacity' })
      .sort({ priority: -1, created_at: 1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[moq.rules] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADD ───────────────────────────────────────────────────────────────────────
const add_moq_rule = async (req, res) => {
  try {
    const {
      industry_type_id, category_id, subcategory_id, system_type_id,
      project_range_id, combo_kit_id, project_type_id, plan_id,
      moq, increment_quantity, max_quantity, po_quantity_limit,
      priority, valid_from, valid_until
    } = req.body;

    if (moq == null || Number(moq) < 1) {
      return res.status(400).json({ status: 'error', message: 'moq must be >= 1' });
    }
    if (increment_quantity != null && Number(increment_quantity) < 1) {
      return res.status(400).json({ status: 'error', message: 'increment_quantity must be >= 1' });
    }
    if (!valid_from) {
      return res.status(400).json({ status: 'error', message: 'valid_from is required' });
    }

    const doc = await FranchiseeMoqRule.create({
      industry_type_id: industry_type_id || null,
      category_id:      category_id      || null,
      subcategory_id:   subcategory_id   || null,
      system_type_id:   system_type_id   || null,
      project_range_id: project_range_id || null,
      combo_kit_id:     combo_kit_id     || null,
      project_type_id:  project_type_id  || system_type_id || null,
      plan_id:          plan_id          || null,
      moq:              Number(moq),
      increment_quantity: increment_quantity != null ? Number(increment_quantity) : 1,
      max_quantity:     max_quantity != null ? Number(max_quantity) : null,
      po_quantity_limit: po_quantity_limit != null ? Number(po_quantity_limit) : null,
      priority:         priority != null ? Number(priority) : 0,
      valid_from:       new Date(valid_from),
      valid_until:      valid_until ? new Date(valid_until) : null,
      created_by:       req.user?.id,
      updated_by:       req.user?.id,
    });

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_MOQ_RULE_CREATE', entity_type: 'franchisee_moq_rules', entity_id: doc._id, after_snapshot: doc.toObject(), req });

    return res.status(201).json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ status: 'error', message: 'An MOQ rule already exists for this configuration + valid_from combination.' });
    console.error('[moq.rules] add error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
const update_moq_rule = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }
    const doc = await FranchiseeMoqRule.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'MOQ rule not found' });

    const before = doc.toObject();
    const editable = [
      'industry_type_id', 'category_id', 'subcategory_id', 'system_type_id',
      'project_range_id', 'combo_kit_id', 'project_type_id', 'plan_id',
      'moq', 'increment_quantity', 'max_quantity', 'po_quantity_limit',
      'priority', 'valid_from', 'valid_until', 'is_active'
    ];

    for (const key of editable) {
      if (fields[key] !== undefined) doc[key] = fields[key] || null;
    }
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_MOQ_RULE_UPDATE', entity_type: 'franchisee_moq_rules', entity_id: id, before_snapshot: before, after_snapshot: doc.toObject(), req });

    return res.json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    console.error('[moq.rules] update error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── SOFT DELETE ───────────────────────────────────────────────────────────────
const delete_moq_rule = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
    const doc = await FranchiseeMoqRule.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'MOQ rule not found' });
    doc.deleted_at = new Date();
    doc.is_active = false;
    doc.updated_by = req.user?.id;
    await doc.save();
    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_MOQ_RULE_DELETE', entity_type: 'franchisee_moq_rules', entity_id: id, req });
    return res.json({ status: 'success', message: 'MOQ rule deleted' });
  } catch (error) {
    console.error('[moq.rules] delete error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── VALIDATE QUANTITY (for frontend live validation) ──────────────────────────
/**
 * POST /admin-api/franchisee/moq-rules/validate-quantity
 * Body: { plan_id, project_type_id, industry_type_id, quantity, project_type_name }
 */
const validate_quantity = async (req, res) => {
  try {
    const { plan_id, project_type_id, industry_type_id, quantity, project_type_name } = req.body;

    if (!plan_id) return res.status(400).json({ status: 'error', message: 'plan_id is required' });
    if (quantity == null) return res.status(400).json({ status: 'error', message: 'quantity is required' });

    const moq_rule = await resolveEffectiveMoqRule({ plan_id, project_type_id, industry_type_id });
    const po_settings = await resolveEffectivePoSettings(plan_id);

    const result = validateQuantity({ quantity: Number(quantity), moq_rule, po_settings, project_type_name });

    return res.json({
      status: 'success',
      data: {
        ...result,
        moq_rule:    moq_rule    ? { moq: moq_rule.moq, increment: moq_rule.increment_quantity, max: moq_rule.max_quantity } : null,
        po_settings: po_settings ? { min: po_settings.min_po_quantity, max: po_settings.max_po_quantity } : null,
      },
    });
  } catch (error) {
    console.error('[moq.rules] validate_quantity error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = { list_moq_rules, add_moq_rule, update_moq_rule, delete_moq_rule, validate_quantity };
