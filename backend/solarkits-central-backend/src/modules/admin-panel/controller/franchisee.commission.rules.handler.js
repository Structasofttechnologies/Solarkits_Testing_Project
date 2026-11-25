/**
 * franchisee.commission.rules.handler.js
 *
 * Admin CRUD for Franchisee Commission Rules (franchisee_commission_rules collection).
 * Permission code: FPO_COMM
 * Prefix: /admin-api/franchisee/commission-rules
 */

const mongoose = require('mongoose');
const { FranchiseeCommissionRule, FranchiseeVariationCommission, ResellerPlan, Reseller } = require('../models/india_solarshop_db');
const { WarehouseComboKit } = require('../models/core_db');
const { logAudit } = require('../utils/audit.service');

// ── LIST ──────────────────────────────────────────────────────────────────────
const list_commission_rules = async (req, res) => {
  try {
    const { plan_id, combo_kit_id, active_only } = req.query;
    const query = { deleted_at: null };
    if (plan_id) query.plan_id = plan_id;
    if (combo_kit_id) query.combo_kit_id = combo_kit_id;
    if (active_only === 'true') query.is_active = true;

    const rows = await FranchiseeCommissionRule.find(query)
      .populate({ path: 'plan_id', model: ResellerPlan, select: 'name' })
      .populate({ path: 'combo_kit_id', model: WarehouseComboKit, select: 'name kit_name kit_code capacity' })
      .sort({ effective_from: -1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[commission.rules] list error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── ADD ───────────────────────────────────────────────────────────────────────
const add_commission_rule = async (req, res) => {
  try {
    const {
      plan_id, combo_kit_id, commission_method, commission_percentage, fixed_amount_per_kit_paise,
      min_eligible_quantity, max_commission_paise, applicable_industry_type_ids,
      applicable_project_type_ids, calculation_stage, settlement_rule,
      effective_from, effective_until,
    } = req.body;

    if (!plan_id || !mongoose.Types.ObjectId.isValid(plan_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid plan_id is required' });
    }
    if (!['PERCENTAGE', 'FIXED_PER_KIT'].includes(commission_method)) {
      return res.status(400).json({ status: 'error', message: 'commission_method must be PERCENTAGE or FIXED_PER_KIT' });
    }
    if (commission_method === 'PERCENTAGE' && (commission_percentage == null || commission_percentage < 0 || commission_percentage > 100)) {
      return res.status(400).json({ status: 'error', message: 'commission_percentage (0-100) is required for PERCENTAGE method' });
    }
    if (commission_method === 'FIXED_PER_KIT' && (fixed_amount_per_kit_paise == null || fixed_amount_per_kit_paise < 0)) {
      return res.status(400).json({ status: 'error', message: 'fixed_amount_per_kit_paise >= 0 is required for FIXED_PER_KIT method' });
    }
    if (!effective_from) {
      return res.status(400).json({ status: 'error', message: 'effective_from is required' });
    }

    const plan = await ResellerPlan.findOne({ _id: plan_id, deleted_at: null }).lean();
    if (!plan) return res.status(404).json({ status: 'error', message: 'Reseller plan not found' });

    // Check for overlapping active rule of the same method for the same plan+kit+period
    const overlapQuery = {
      plan_id,
      commission_method,
      is_active: true,
      deleted_at: null,
      effective_from: { $lte: effective_until || new Date('9999-12-31') },
      $or: [{ effective_until: null }, { effective_until: { $gte: effective_from } }],
    };
    if (combo_kit_id) {
      overlapQuery.combo_kit_id = combo_kit_id;
    }

    const overlap = await FranchiseeCommissionRule.findOne(overlapQuery).lean();

    if (overlap) {
      return res.status(409).json({
        status: 'error',
        message: `An active ${commission_method} commission rule already exists for this plan/product in the specified period.`,
      });
    }

    const doc = await FranchiseeCommissionRule.create({
      plan_id,
      combo_kit_id:                   combo_kit_id || null,
      commission_method,
      commission_percentage:          commission_method === 'PERCENTAGE' ? Number(commission_percentage) : null,
      fixed_amount_per_kit_paise:     commission_method === 'FIXED_PER_KIT' ? Math.round(Number(fixed_amount_per_kit_paise)) : null,
      min_eligible_quantity:          min_eligible_quantity != null ? Number(min_eligible_quantity) : 0,
      max_commission_paise:           max_commission_paise != null ? Math.round(Number(max_commission_paise)) : null,
      applicable_industry_type_ids:   Array.isArray(applicable_industry_type_ids) ? applicable_industry_type_ids : [],
      applicable_project_type_ids:    Array.isArray(applicable_project_type_ids) ? applicable_project_type_ids : [],
      calculation_stage:              calculation_stage || 'RETURN_PERIOD_COMPLETED',
      settlement_rule:                settlement_rule || 'MONTHLY_BATCH',
      effective_from:                 new Date(effective_from),
      effective_until:                effective_until ? new Date(effective_until) : null,
      created_by:                     req.user?.id,
      updated_by:                     req.user?.id,
    });

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_COMMISSION_RULE_CREATE', entity_type: 'franchisee_commission_rules', entity_id: doc._id, after_snapshot: doc.toObject(), req });

    return res.status(201).json({ status: 'success', data: { id: doc._id, commission_method, plan_name: plan.name } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ status: 'error', message: 'Commission rule already exists for this plan + method + date combination.' });
    console.error('[commission.rules] add error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
const update_commission_rule = async (req, res) => {
  try {
    const { id, ...fields } = req.body;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await FranchiseeCommissionRule.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Commission rule not found' });

    const before = doc.toObject();
    const editable = ['commission_percentage', 'fixed_amount_per_kit_paise', 'min_eligible_quantity',
      'max_commission_paise', 'applicable_industry_type_ids', 'applicable_project_type_ids', 'combo_kit_id',
      'calculation_stage', 'settlement_rule', 'effective_until', 'is_active'];

    for (const key of editable) {
      if (fields[key] !== undefined) doc[key] = fields[key];
    }
    doc.updated_by = req.user?.id;
    await doc.save();

    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_COMMISSION_RULE_UPDATE', entity_type: 'franchisee_commission_rules', entity_id: id, before_snapshot: before, after_snapshot: doc.toObject(), req });

    return res.json({ status: 'success', data: { id: doc._id } });
  } catch (error) {
    console.error('[commission.rules] update error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── TOGGLE STATUS ─────────────────────────────────────────────────────────────
const toggle_commission_rule_status = async (req, res) => {
  try {
    const { id, is_active } = req.body;
    if (!id || typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'id and boolean is_active required' });
    }
    const doc = await FranchiseeCommissionRule.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Commission rule not found' });
    doc.is_active = is_active;
    doc.updated_by = req.user?.id;
    await doc.save();
    return res.json({ status: 'success', message: `Commission rule ${is_active ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('[commission.rules] toggle error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── SOFT DELETE ───────────────────────────────────────────────────────────────
const delete_commission_rule = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });
    const doc = await FranchiseeCommissionRule.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Commission rule not found' });
    doc.deleted_at = new Date();
    doc.is_active = false;
    await doc.save();
    await logAudit({ actor_type: 'cms_user', actor_id: req.user?.id, action: 'FPO_COMMISSION_RULE_DELETE', entity_type: 'franchisee_commission_rules', entity_id: id, req });
    return res.json({ status: 'success', message: 'Commission rule deleted' });
  } catch (error) {
    console.error('[commission.rules] delete error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── INDIVIDUAL VARIATION COMMISSION RULES: LIST ──────────────────────────────
const get_individual_commission_rules = async (req, res) => {
  try {
    const { reseller_id, combo_kit_id } = req.query;
    if (!reseller_id || !mongoose.Types.ObjectId.isValid(reseller_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller_id is required' });
    }

    const query = { reseller_id, deleted_at: null, is_active: true };
    if (combo_kit_id && mongoose.Types.ObjectId.isValid(combo_kit_id)) {
      query.combo_kit_id = combo_kit_id;
    }

    const rows = await FranchiseeVariationCommission.find(query)
      .populate({ path: 'combo_kit_id', model: WarehouseComboKit, select: 'name kit_name kit_code capacity order_quantities' })
      .sort({ combo_kit_id: 1, order_quantity: 1 })
      .lean();

    return res.json({ status: 'success', data: rows });
  } catch (error) {
    console.error('[commission.rules] get_individual_commission_rules error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── INDIVIDUAL VARIATION COMMISSION RULES: SAVE ──────────────────────────────
const save_individual_commission_rules = async (req, res) => {
  try {
    const { reseller_id, rules } = req.body;
    if (!reseller_id || !mongoose.Types.ObjectId.isValid(reseller_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid reseller_id is required' });
    }

    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ status: 'error', message: 'rules array is required' });
    }

    const reseller = await Reseller.findOne({ _id: reseller_id, deleted_at: null }).lean();
    if (!reseller) {
      return res.status(404).json({ status: 'error', message: 'Franchisee / Reseller not found' });
    }

    const savedDocs = [];
    for (const r of rules) {
      const { combo_kit_id, order_quantity, order_type, commission_amount_paise } = r;
      if (!combo_kit_id || !mongoose.Types.ObjectId.isValid(combo_kit_id)) continue;
      const qty = parseInt(order_quantity, 10);
      if (isNaN(qty) || qty <= 0) continue;
      if (!['po', 'loose'].includes(order_type)) continue;

      const commPaise = Math.max(0, Math.round(Number(commission_amount_paise) || 0));

      const doc = await FranchiseeVariationCommission.findOneAndUpdate(
        {
          reseller_id,
          combo_kit_id,
          order_quantity: qty,
          order_type,
          deleted_at: null,
        },
        {
          $set: {
            commission_amount_paise: commPaise,
            is_active: true,
            updated_by: req.user?.id,
          },
          $setOnInsert: {
            created_by: req.user?.id,
          },
        },
        { upsert: true, new: true }
      );
      savedDocs.push(doc);
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'FPO_VARIATION_COMMISSION_SAVE',
      entity_type: 'franchisee_variation_commissions',
      entity_id: reseller_id,
      after_snapshot: { reseller_id, saved_count: savedDocs.length },
      req,
    });

    return res.json({
      status: 'success',
      message: `Successfully saved ${savedDocs.length} variation commission rule(s).`,
      data: savedDocs,
    });
  } catch (error) {
    console.error('[commission.rules] save_individual_commission_rules error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

module.exports = {
  list_commission_rules,
  add_commission_rule,
  update_commission_rule,
  toggle_commission_rule_status,
  delete_commission_rule,
  get_individual_commission_rules,
  save_individual_commission_rules,
};
