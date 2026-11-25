/**
 * franchisee.kit.targets.handler.js
 *
 * Admin CRUD for Franchisee Kit Targets (franchisee_kit_targets collection).
 * Permission code: FPO_TARGET
 * Prefix: /admin-api/franchisee/kit-targets
 */

const mongoose = require('mongoose');
const { FranchiseeKitTarget, FranchiseeTargetProgress, Reseller, ResellerPlan } = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const { resolveEffectiveTarget, recalculateProgress } = require('../services/franchisee.goal.service');
const { logAudit } = require('../utils/audit.service');

const VALID_TARGET_TYPES = ['GLOBAL', 'PLAN', 'STATE', 'DISTRICT', 'FRANCHISEE', 'INDUSTRY', 'PROJECT_TYPE'];

// ── LIST ──────────────────────────────────────────────────────────────────────
const list_kit_targets = async (req, res) => {
  try {
    const { target_type, target_month, target_year, plan_id, franchisee_id, active_only } = req.query;
    const query = { deleted_at: null };
    if (target_type) query.target_type = target_type;
    if (target_month) query.target_month = Number(target_month);
    if (target_year)  query.target_year  = Number(target_year);
    if (plan_id)      query.plan_id      = plan_id;
    if (franchisee_id) query.franchisee_id = franchisee_id;
    if (active_only === 'true') query.is_active = true;

    const rows = await FranchiseeKitTarget.find(query)
      .populate({ path: 'franchisee_id', model: Reseller, select: 'business_name mobile' })
      .populate({ path: 'plan_id', model: ResellerPlan, select: 'name' })
      .populate({ path: 'state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'district_id', model: GeoLevel2, select: 'name' })
      .sort({ target_year: -1, target_month: -1, target_type: 1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[kit.targets] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADD ───────────────────────────────────────────────────────────────────────
const add_kit_target = async (req, res) => {
  try {
    const {
      target_type, franchisee_id, plan_id, state_id, district_id, industry_type_id,
      project_type_id, target_quantity, calculation_stage, target_month, target_year,
      is_recurring, carry_forward_enabled, grace_period_days, effective_from, effective_until,
    } = req.body;

    if (!VALID_TARGET_TYPES.includes(target_type)) {
      return res.status(400).json({ status: 'error', message: `target_type must be one of: ${VALID_TARGET_TYPES.join(', ')}` });
    }
    if (target_quantity == null || Number(target_quantity) < 0) {
      return res.status(400).json({ status: 'error', message: 'target_quantity must be >= 0' });
    }
    if (!target_month || !target_year) {
      return res.status(400).json({ status: 'error', message: 'target_month and target_year are required' });
    }

    const doc = await FranchiseeKitTarget.create({
      target_type,
      franchisee_id:    franchisee_id    || null,
      plan_id:          plan_id          || null,
      state_id:         state_id         || null,
      district_id:      district_id      || null,
      industry_type_id: industry_type_id || null,
      project_type_id:  project_type_id  || null,
      target_quantity:  Number(target_quantity),
      calculation_stage: calculation_stage || 'DELIVERED_QUANTITY',
      target_month:     Number(target_month),
      target_year:      Number(target_year),
      is_recurring:     Boolean(is_recurring),
      carry_forward_enabled: Boolean(carry_forward_enabled),
      grace_period_days: grace_period_days != null ? Number(grace_period_days) : 0,
      effective_from:   effective_from ? new Date(effective_from) : null,
      effective_until:  effective_until ? new Date(effective_until) : null,
      created_by:       req.user?.id,
      updated_by:       req.user?.id,
    });

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_KIT_TARGET_CREATE', entity_type: 'franchisee_kit_targets', entity_id: doc._id, after_snapshot: doc.toObject(), req });

    return res.status(201).json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ status: 'error', message: 'A target of this type already exists for the same scope and period.' });
    console.error('[kit.targets] add error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
const update_kit_target = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }
    const doc = await FranchiseeKitTarget.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Kit target not found' });

    const before = doc.toObject();
    const editable = ['target_quantity', 'calculation_stage', 'is_recurring', 'carry_forward_enabled',
      'grace_period_days', 'effective_from', 'effective_until', 'is_active'];

    for (const key of editable) {
      if (fields[key] !== undefined) doc[key] = fields[key];
    }
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_KIT_TARGET_UPDATE', entity_type: 'franchisee_kit_targets', entity_id: id, before_snapshot: before, after_snapshot: doc.toObject(), req });

    return res.json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    console.error('[kit.targets] update error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── SOFT DELETE ───────────────────────────────────────────────────────────────
const delete_kit_target = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
    const doc = await FranchiseeKitTarget.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Kit target not found' });
    doc.deleted_at = new Date();
    doc.is_active  = false;
    doc.updated_by = req.user?.id;
    await doc.save();
    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_KIT_TARGET_DELETE', entity_type: 'franchisee_kit_targets', entity_id: id, req });
    return res.json({ status: 'success', message: 'Kit target deleted' });
  } catch (error) {
    console.error('[kit.targets] delete error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── RESOLVE EFFECTIVE TARGET FOR FRANCHISEE ───────────────────────────────────
const get_effective_target = async (req, res) => {
  try {
    const { franchisee_id, month, year } = req.query;
    if (!franchisee_id || !month || !year) {
      return res.status(400).json({ status: 'error', message: 'franchisee_id, month, and year are required' });
    }
    const target = await resolveEffectiveTarget({ franchisee_id, month: Number(month), year: Number(year) });
    return res.json({ status: 'success', data: target });
  } catch (error) {
    console.error('[kit.targets] get_effective_target error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADMIN: TRIGGER RECALCULATION ──────────────────────────────────────────────
const trigger_recalculation = async (req, res) => {
  try {
    const { franchisee_id, month, year } = req.body;
    if (!franchisee_id || !month || !year) {
      return res.status(400).json({ status: 'error', message: 'franchisee_id, month, and year are required' });
    }
    const progress = await recalculateProgress({ franchisee_id, month: Number(month), year: Number(year), actor_id: req.user?.id, req });
    return res.json({ status: 'success', data: progress });
  } catch (error) {
    console.error('[kit.targets] trigger_recalculation error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── LIST PROGRESS ─────────────────────────────────────────────────────────────
const list_progress = async (req, res) => {
  try {
    const { month, year, performance_status, franchisee_id } = req.query;
    const query = {};
    if (month) query.target_month = Number(month);
    if (year)  query.target_year  = Number(year);
    if (performance_status) query.performance_status = performance_status;
    if (franchisee_id) query.franchisee_id = franchisee_id;

    const rows = await FranchiseeTargetProgress.find(query)
      .populate('franchisee_id', 'business_name mobile email address')
      .sort({ achievement_pct: -1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[kit.targets] list_progress error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_kit_targets,
  add_kit_target,
  update_kit_target,
  delete_kit_target,
  get_effective_target,
  trigger_recalculation,
  list_progress,
};
