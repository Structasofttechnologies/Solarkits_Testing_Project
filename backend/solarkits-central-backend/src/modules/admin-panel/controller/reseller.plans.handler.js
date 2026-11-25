/**
 * reseller.plans.handler.js
 *
 * Admin CRUD for Reseller Plans (reseller_plans collection).
 * Phase 2 — Reseller Management System
 *
 * Pattern: { status: "success"|"error", data, message }
 */

const mongoose = require('mongoose');
const { ResellerPlan, ResellerPlanSubscription, FranchiseeCommissionRule, FranchiseeSubtype, WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');
const {
  ProjectType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectSubcategoryType,
  ProjectRange,
  IndustryType,
  WarehouseComboKit,
} = require('../models/core_db');
const { logAudit } = require('../utils/audit.service');

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

const VALID_ORDER_TYPES = ['loose_order', 'combine_po_order', 'po_order'];
const normalizeOrderTypes = (val) => {
  if (!val) return ['po_order'];
  let arr = [];
  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === 'string') {
    if (val === 'both') return ['po_order', 'loose_order'];
    arr = val.split(',').map((s) => s.trim());
  }
  const filtered = arr.filter((t) => VALID_ORDER_TYPES.includes(t));
  return filtered.length > 0 ? filtered : ['po_order'];
};

const VALID_QUOTE_PERMISSIONS = ['po_quote', 'loose_quote', 'trial_quote'];
const normalizeQuotePermissions = (val) => {
  if (!val) return ['po_quote', 'loose_quote'];
  let arr = [];
  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === 'string') {
    arr = val.split(',').map((s) => s.trim());
  }
  const filtered = arr.filter((t) => VALID_QUOTE_PERMISSIONS.includes(t));
  return filtered.length > 0 ? filtered : ['po_quote'];
};

// ─── 1. LIST ──────────────────────────────────────────────────────────────────
/**
 * GET /admin-api/resellers/plans/list
 */
const list_reseller_plans = async (req, res) => {
  try {
    const { territory_level, active_only, store_category } = req.query;
    const query = { deleted_at: null };

    if (territory_level && ['district', 'state', 'country'].includes(territory_level)) {
      query.territory_level = territory_level;
    }
    if (store_category && ['company_store', 'franchisee_store'].includes(store_category)) {
      query.store_category = store_category;
    }
    if (active_only === 'true') query.is_active = true;

    const rows = await ResellerPlan.find(query)
      .populate({ path: 'franchisee_subtype_id', model: FranchiseeSubtype, select: 'name slug is_active' })
      .populate({ path: 'allowed_industry_type_ids', model: IndustryType, select: 'name code slug icon cover_image' })
      .populate({ path: 'allowed_project_type_ids', model: ProjectType, select: 'name' })
      .populate({ path: 'allowed_category_ids', model: ProjectCategory, select: 'name' })
      .populate({ path: 'allowed_subcategory_ids', model: ProjectSubcategory, select: 'name' })
      .sort({ sort_order: 1, name: 1 })
      .lean();

    // Hybrid Combo Kit Population (pc_comobo_kit & pc_combo_kits)
    let kitsCore = [];
    let kitsIndia = [];
    try {
      kitsCore = await WarehouseComboKit.find({ deleted_at: null }).select('name kit_name capacity kit_code selling_price_cached').lean();
    } catch (e) {}
    try {
      kitsIndia = await IndiaComboKit.find({ deleted_at: null }).select('name kit_name capacity kit_code selling_price_cached').lean();
    } catch (e) {}

    const allKitsMap = new Map();
    [...kitsCore, ...kitsIndia].forEach((k) => allKitsMap.set(String(k._id), k));

    const data = rows.map((r) => {
      const projectTypesDisplay = Array.isArray(r.allowed_project_type_ids) && r.allowed_project_type_ids.length > 0
        ? r.allowed_project_type_ids.map((pt) => (pt && pt.name ? pt.name : pt)).join(', ')
        : (r.moq_project_type || 'All Project Types');

      const allowedIndustryTypeIds = (r.allowed_industry_type_ids || [])
        .map((i) => (i && i._id ? String(i._id) : String(i)))
        .filter((id) => id && id !== 'null' && id !== 'undefined');

      const rawKitIds = (r.allowed_combo_kit_ids || [])
        .map((k) => (k && k._id ? String(k._id) : String(k)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && id.length === 24);

      const populatedKits = rawKitIds.map((id) => {
        const k = allKitsMap.get(id);
        if (!k) return null;
        return {
          id: String(k._id),
          _id: k._id,
          name: k.name || k.kit_name || 'Combo Kit',
          capacity: k.capacity || 0,
          kit_code: k.kit_code || '',
          selling_price_cached: k.selling_price_cached || 0,
        };
      }).filter(Boolean);

      const comboKitsDisplay = populatedKits.length > 0
        ? populatedKits.map((ck) => ck.name).join(', ')
        : 'All Admin Combo Kits';

      const allowedComboKitIds = populatedKits.map((ck) => String(ck.id));
      const allowedCategoryIds = (r.allowed_category_ids || [])
        .map((c) => (c && c._id ? String(c._id) : String(c)))
        .filter((id) => id && id !== 'null' && id !== 'undefined');
      const allowedSubcategoryIds = (r.allowed_subcategory_ids || [])
        .map((s) => (s && s._id ? String(s._id) : String(s)))
        .filter((id) => id && id !== 'null' && id !== 'undefined');
      const allowedProjectTypeIds = (r.allowed_project_type_ids || [])
        .map((p) => (p && p._id ? String(p._id) : String(p)))
        .filter((id) => id && id !== 'null' && id !== 'undefined');

      return {
        id:                        r._id,
        name:                      r.name,
        slug:                      r.slug,
        territory_level:           r.territory_level,
        one_time_fee:              r.one_time_fee,
        currency:                  r.currency,
        validity_value:            r.validity_value,
        validity_unit:             r.validity_unit,
        allowed_territories_count: r.allowed_territories_count,
        renewal_rules:             r.renewal_rules,
        
        // Allowed Scope & Products Assignment
        allowed_industry_types:    r.allowed_industry_type_ids || [],
        allowed_industry_type_ids: allowedIndustryTypeIds,
        industry_types_count:      allowedIndustryTypeIds.length,
        allowed_categories:        r.allowed_category_ids || [],
        allowed_category_ids:      allowedCategoryIds,
        categories_count:          allowedCategoryIds.length,
        allowed_subcategories:     r.allowed_subcategory_ids || [],
        allowed_subcategory_ids:   allowedSubcategoryIds,
        allowed_project_types:     r.allowed_project_type_ids || [],
        allowed_project_type_ids:  allowedProjectTypeIds,
        allowed_combo_kits:        populatedKits,
        allowed_combo_kit_ids:     allowedComboKitIds,
        combo_kits_count:          allowedComboKitIds.length,

        project_types_display:     projectTypesDisplay,
        combo_kits_display:        comboKitsDisplay,

        // ─── 1. Warehouse Requirements ─────────────────────────────────────────
        warehouse_required:        r.warehouse_required ?? false,
        warehouse_count:           r.warehouse_count ?? 0,
        warehouse_space_sqft:      r.warehouse_space_sqft ?? 0,

        // ─── 2. MOQ & Capacity Specifications ──────────────────────────────────
        moq_capacity_kw:          r.moq_capacity_kw ?? 10000,
        moq_kits_count:           r.moq_kits_count ?? 1,
        moq_project_type:         projectTypesDisplay,
        moq_description:          r.moq_description || null,

        // ─── 3. Order Type Support ─────────────────────────────────────────────
        order_type_allowed:       normalizeOrderTypes(r.order_type_allowed),
        quote_permissions:        normalizeQuotePermissions(r.quote_permissions),

        // ─── 4. Company Fixed Franchisee Margins & Commissions ──────────────────
        default_dealer_margin:      r.default_dealer_margin ?? 5,
        commission_method:          r.commission_method || 'PERCENTAGE',
        default_commission_rate:    r.default_commission_rate ?? 8,
        fixed_amount_per_kit_paise: r.fixed_amount_per_kit_paise || 0,
        min_eligible_quantity:      r.min_eligible_quantity || 0,
        max_commission_paise:       r.max_commission_paise || null,

        // ─── 5. Store Management Fields ────────────────────────────────────────
        store_category:            r.store_category || 'franchisee_store',
        franchisee_subtype_id:     r.franchisee_subtype_id || null,
        commission_enabled:        r.commission_enabled !== undefined ? Boolean(r.commission_enabled) : (r.store_category !== 'company_store'),
        setup_cost_enabled:        r.setup_cost_enabled !== undefined ? Boolean(r.setup_cost_enabled) : (r.one_time_fee > 0),
        setup_cost_amount:         r.setup_cost_amount != null ? Number(r.setup_cost_amount) : (r.one_time_fee || 0),
        epc_onboarding_scope:      r.epc_onboarding_scope || r.territory_level || 'district',
        bde_assignment_mandatory:  r.bde_assignment_mandatory ?? (r.store_category === 'company_store'),
        order_type_allocation:     normalizeOrderTypes(r.order_type_allowed),

        description:               r.description,
        sort_order:                r.sort_order,
        is_active:                 r.is_active,
        created_at:                r.created_at,
      };
    });

    return res.json({ status: 'success', data });
  } catch (error) {
    console.error('[reseller.plans] list_reseller_plans error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 2. ADD ───────────────────────────────────────────────────────────────────
/**
 * POST /admin-api/resellers/plans/add
 */
const add_reseller_plan = async (req, res) => {
  try {
    const {
      name,
      territory_level,
      one_time_fee,
      currency,
      validity_value,
      validity_unit,
      allowed_territories_count,
      renewal_rules,
      allowed_project_type_ids,
      allowed_industry_type_ids,
      allowed_category_ids,
      allowed_subcategory_ids,
      allowed_combo_kit_ids,
      warehouse_required,
      warehouse_count,
      warehouse_space_sqft,
      moq_capacity_kw,
      moq_kits_count,
      moq_project_type,
      moq_description,
      order_type_allowed,
      quote_permissions,
      description,
      sort_order,
      // Store Management fields
      store_category,
      franchisee_subtype_id,
      commission_enabled,
      setup_cost_enabled,
      setup_cost_amount,
      epc_onboarding_scope,
      bde_assignment_mandatory,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'name is required' });
    }
    if (!territory_level || !['district', 'state', 'country'].includes(territory_level)) {
      return res.status(400).json({ status: 'error', message: 'territory_level must be district, state, or country' });
    }

    const slug = slugify(name);

    const existing = await ResellerPlan.findOne({
      $or: [{ slug }, { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }],
      deleted_at: null,
    });
    if (existing) {
      return res.status(409).json({ status: 'error', message: `Plan "${existing.name}" already exists` });
    }

    const parsedStoreCategory = ['company_store', 'franchisee_store'].includes(store_category)
      ? store_category
      : 'franchisee_store';

    const parsedCommissionEnabled = commission_enabled !== undefined
      ? Boolean(commission_enabled)
      : (parsedStoreCategory === 'company_store' ? false : true);

    const doc = await ResellerPlan.create({
      name:                      name.trim(),
      slug,
      territory_level,
      one_time_fee:              one_time_fee != null ? Number(one_time_fee) : 0,
      currency:                  currency ? currency.trim().toUpperCase() : 'INR',
      validity_value:            validity_value != null ? Number(validity_value) : 1,
      validity_unit:             validity_unit || 'years',
      allowed_territories_count: allowed_territories_count != null ? Number(allowed_territories_count) : 1,
      renewal_rules:             renewal_rules || { auto_renew: false, grace_period_days: 15 },
      allowed_project_type_ids:  Array.isArray(allowed_project_type_ids) ? allowed_project_type_ids : [],
      allowed_industry_type_ids: Array.isArray(allowed_industry_type_ids) ? allowed_industry_type_ids : [],
      allowed_category_ids:      Array.isArray(allowed_category_ids) ? allowed_category_ids : [],
      allowed_subcategory_ids:   Array.isArray(allowed_subcategory_ids) ? allowed_subcategory_ids : [],
      allowed_combo_kit_ids:     Array.isArray(allowed_combo_kit_ids) ? allowed_combo_kit_ids : [],
      
      // 1. Warehouse Requirements
      warehouse_required:        Boolean(warehouse_required),
      warehouse_count:           warehouse_count != null ? Math.max(0, Number(warehouse_count)) : 0,
      warehouse_space_sqft:      warehouse_space_sqft != null ? Math.max(0, Number(warehouse_space_sqft)) : 0,

      // 2. MOQ & Capacity Specifications
      moq_capacity_kw:          moq_capacity_kw != null ? Math.max(0, Number(moq_capacity_kw)) : 10000,
      moq_kits_count:           moq_kits_count != null ? Math.max(0, Number(moq_kits_count)) : 1,
      moq_project_type:         moq_project_type ? moq_project_type.trim() : 'All Kit Types (Residential / Commercial / Industrial)',
      moq_description:          moq_description ? moq_description.trim() : null,

      // 3. Order Type Support
      order_type_allowed:       normalizeOrderTypes(order_type_allowed),
      quote_permissions:        normalizeQuotePermissions(quote_permissions),

      // 4. Fixed Dealer Margin & Commission
      default_dealer_margin:      req.body.default_dealer_margin != null ? Number(req.body.default_dealer_margin) : 5,
      commission_method:          ['PERCENTAGE', 'FIXED_PER_KIT'].includes(req.body.commission_method) ? req.body.commission_method : 'PERCENTAGE',
      default_commission_rate:    req.body.default_commission_rate != null ? Number(req.body.default_commission_rate) : 8,
      fixed_amount_per_kit_paise: req.body.fixed_amount_per_kit_paise != null ? Math.round(Number(req.body.fixed_amount_per_kit_paise)) : 0,
      min_eligible_quantity:      req.body.min_eligible_quantity != null ? Number(req.body.min_eligible_quantity) : 0,
      max_commission_paise:       req.body.max_commission_paise != null ? Math.round(Number(req.body.max_commission_paise)) : null,

      // 5. Store Management — Store Type Configuration
      store_category:            parsedStoreCategory,
      franchisee_subtype_id:     franchisee_subtype_id && mongoose.Types.ObjectId.isValid(franchisee_subtype_id) ? franchisee_subtype_id : null,
      commission_enabled:        parsedCommissionEnabled,
      setup_cost_enabled:        setup_cost_enabled !== undefined ? Boolean(setup_cost_enabled) : true,
      setup_cost_amount:         setup_cost_amount != null ? Math.max(0, Number(setup_cost_amount)) : (one_time_fee != null ? Number(one_time_fee) : 0),
      epc_onboarding_scope:      ['country', 'state', 'district'].includes(epc_onboarding_scope) ? epc_onboarding_scope : (territory_level || 'district'),
      bde_assignment_mandatory:  Boolean(bde_assignment_mandatory),

      description:               description ? description.trim() : null,
      sort_order:                sort_order != null ? Number(sort_order) : 0,
      created_by:                req.user?.id || null,
      updated_by:                req.user?.id || null,
    });

    // Auto-create/sync corresponding FranchiseeCommissionRule ONLY if commission is enabled
    if (doc.commission_enabled) {
      try {
        await FranchiseeCommissionRule.findOneAndUpdate(
          { plan_id: doc._id, deleted_at: null },
          {
            plan_id:                    doc._id,
            commission_method:          doc.commission_method,
            commission_percentage:      doc.commission_method === 'PERCENTAGE' ? doc.default_commission_rate : null,
            fixed_amount_per_kit_paise: doc.commission_method === 'FIXED_PER_KIT' ? doc.fixed_amount_per_kit_paise : null,
            min_eligible_quantity:      doc.min_eligible_quantity || 0,
            max_commission_paise:       doc.max_commission_paise || null,
            calculation_stage:          'RETURN_PERIOD_COMPLETED',
            settlement_rule:            'MONTHLY_BATCH',
            is_active:                  true,
            effective_from:             new Date(),
            created_by:                 req.user?.id || null,
            updated_by:                 req.user?.id || null,
          },
          { upsert: true, new: true }
        );
      } catch (commSyncErr) {
        console.warn('[reseller.plans] Auto-sync FranchiseeCommissionRule warning:', commSyncErr.message);
      }
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PLAN_CREATE',
      entity_type: 'reseller_plans',
      entity_id: doc._id,
      after_snapshot: doc.toObject(),
      req,
    });

    return res.status(201).json({ status: 'success', data: { id: doc._id, name: doc.name, slug: doc.slug } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ status: 'error', message: 'Plan name or slug already exists' });
    }
    console.error('[reseller.plans] add_reseller_plan error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 3. UPDATE ────────────────────────────────────────────────────────────────
/**
 * PUT /admin-api/resellers/plans/update
 */
const update_reseller_plan = async (req, res) => {
  try {
    const { id, name, ...fields } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid id is required' });
    }

    const doc = await ResellerPlan.findOne({ _id: id, deleted_at: null });
    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Reseller plan not found' });
    }

    const beforeSnapshot = doc.toObject();
    const updateData = {};

    if (name && name.trim()) {
      const newSlug = slugify(name.trim());
      const conflict = await ResellerPlan.findOne({
        _id: { $ne: id },
        $or: [{ slug: newSlug }, { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } }],
        deleted_at: null,
      });
      if (conflict) {
        return res.status(409).json({ status: 'error', message: `Another plan already has the name "${conflict.name}"` });
      }
      updateData.name = name.trim();
      updateData.slug = newSlug;
    }

    if (fields.territory_level && ['district', 'state', 'country'].includes(fields.territory_level)) {
      updateData.territory_level = fields.territory_level;
    }
    if (fields.one_time_fee != null) updateData.one_time_fee = Number(fields.one_time_fee);
    if (fields.validity_value != null) updateData.validity_value = Number(fields.validity_value);
    if (fields.validity_unit && ['months', 'years'].includes(fields.validity_unit)) {
      updateData.validity_unit = fields.validity_unit;
    }
    if (fields.allowed_territories_count != null) {
      updateData.allowed_territories_count = Number(fields.allowed_territories_count);
    }
    if (Array.isArray(fields.allowed_project_type_ids)) {
      updateData.allowed_project_type_ids = fields.allowed_project_type_ids
        .map((id) => (id && id._id ? String(id._id) : String(id)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (Array.isArray(fields.allowed_industry_type_ids)) {
      updateData.allowed_industry_type_ids = fields.allowed_industry_type_ids
        .map((id) => (id && id._id ? String(id._id) : String(id)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (Array.isArray(fields.allowed_category_ids)) {
      updateData.allowed_category_ids = fields.allowed_category_ids
        .map((id) => (id && id._id ? String(id._id) : String(id)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (Array.isArray(fields.allowed_subcategory_ids)) {
      updateData.allowed_subcategory_ids = fields.allowed_subcategory_ids
        .map((id) => (id && id._id ? String(id._id) : String(id)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (Array.isArray(fields.allowed_combo_kit_ids)) {
      updateData.allowed_combo_kit_ids = fields.allowed_combo_kit_ids
        .map((id) => (id && id._id ? String(id._id) : String(id)))
        .filter((id) => id && id !== 'null' && id !== 'undefined' && mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }

    // 1. Warehouse Requirements
    if (fields.warehouse_required !== undefined) updateData.warehouse_required = Boolean(fields.warehouse_required);
    if (fields.warehouse_count != null) updateData.warehouse_count = Math.max(0, Number(fields.warehouse_count));
    if (fields.warehouse_space_sqft != null) updateData.warehouse_space_sqft = Math.max(0, Number(fields.warehouse_space_sqft));

    // 2. MOQ & Capacity Specifications
    if (fields.moq_capacity_kw != null) updateData.moq_capacity_kw = Math.max(0, Number(fields.moq_capacity_kw));
    if (fields.moq_kits_count != null) updateData.moq_kits_count = Math.max(0, Number(fields.moq_kits_count));
    if (fields.moq_project_type !== undefined) updateData.moq_project_type = fields.moq_project_type ? fields.moq_project_type.trim() : 'All Kit Types (Residential / Commercial / Industrial)';
    if (fields.moq_description !== undefined) updateData.moq_description = fields.moq_description ? fields.moq_description.trim() : null;

    // 3. Order Type Support
    if (fields.order_type_allowed !== undefined) {
      updateData.order_type_allowed = normalizeOrderTypes(fields.order_type_allowed);
    }
    if (fields.quote_permissions !== undefined) {
      updateData.quote_permissions = normalizeQuotePermissions(fields.quote_permissions);
    }

    // 4. Fixed Dealer Margin & Commission
    if (fields.default_dealer_margin != null) updateData.default_dealer_margin = Math.max(0, Number(fields.default_dealer_margin));
    if (fields.commission_method && ['PERCENTAGE', 'FIXED_PER_KIT'].includes(fields.commission_method)) {
      updateData.commission_method = fields.commission_method;
    }
    if (fields.default_commission_rate != null) updateData.default_commission_rate = Math.max(0, Number(fields.default_commission_rate));
    if (fields.fixed_amount_per_kit_paise != null) updateData.fixed_amount_per_kit_paise = Math.max(0, Math.round(Number(fields.fixed_amount_per_kit_paise)));
    if (fields.min_eligible_quantity != null) updateData.min_eligible_quantity = Math.max(0, Number(fields.min_eligible_quantity));
    if (fields.max_commission_paise !== undefined) {
      updateData.max_commission_paise = fields.max_commission_paise != null ? Math.max(0, Math.round(Number(fields.max_commission_paise))) : null;
    }

    // 5. Store Management — Store Type Configuration
    if (fields.store_category && ['company_store', 'franchisee_store'].includes(fields.store_category)) {
      updateData.store_category = fields.store_category;
    }
    if (fields.franchisee_subtype_id !== undefined) {
      updateData.franchisee_subtype_id = fields.franchisee_subtype_id && mongoose.Types.ObjectId.isValid(fields.franchisee_subtype_id)
        ? new mongoose.Types.ObjectId(fields.franchisee_subtype_id)
        : null;
    }
    if (fields.commission_enabled !== undefined) {
      updateData.commission_enabled = Boolean(fields.commission_enabled);
    }
    if (fields.setup_cost_enabled !== undefined) {
      updateData.setup_cost_enabled = Boolean(fields.setup_cost_enabled);
    }
    if (fields.setup_cost_amount != null) {
      updateData.setup_cost_amount = Math.max(0, Number(fields.setup_cost_amount));
    }
    if (fields.epc_onboarding_scope && ['country', 'state', 'district'].includes(fields.epc_onboarding_scope)) {
      updateData.epc_onboarding_scope = fields.epc_onboarding_scope;
    }
    if (fields.bde_assignment_mandatory !== undefined) {
      updateData.bde_assignment_mandatory = Boolean(fields.bde_assignment_mandatory);
    }

    if (fields.description !== undefined) updateData.description = fields.description ? fields.description.trim() : null;
    if (fields.sort_order != null) updateData.sort_order = Number(fields.sort_order);
    updateData.updated_by = req.user?.id || null;

    const result = await ResellerPlan.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    // If commission is disabled, deactivate corresponding FranchiseeCommissionRule
    if (updateData.commission_enabled === false) {
      try {
        await FranchiseeCommissionRule.updateMany(
          { plan_id: id, deleted_at: null },
          { $set: { is_active: false, updated_by: req.user?.id || null } }
        );
      } catch (commErr) {
        console.warn('[reseller.plans] Deactivate FranchiseeCommissionRule warning:', commErr.message);
      }
    }

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PLAN_UPDATE',
      entity_type: 'reseller_plans',
      entity_id: id,
      before_snapshot: beforeSnapshot,
      after_snapshot: result,
      req,
    });

    return res.json({ status: 'success', data: { id: result._id, name: result.name } });
  } catch (error) {
    console.error('[reseller.plans] update_reseller_plan error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 4. TOGGLE STATUS ────────────────────────────────────────────────────────
/**
 * PUT /admin-api/resellers/plans/toggle-status
 */
const toggle_reseller_plan_status = async (req, res) => {
  try {
    const { id, is_active } = req.body;

    if (!id || typeof is_active !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'Valid id and boolean is_active required' });
    }

    const doc = await ResellerPlan.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Plan not found' });

    doc.is_active = is_active;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: is_active ? 'RESELLER_PLAN_ACTIVATE' : 'RESELLER_PLAN_DEACTIVATE',
      entity_type: 'reseller_plans',
      entity_id: id,
      after_snapshot: { is_active: doc.is_active },
      req,
    });

    return res.json({ status: 'success', message: `Plan "${doc.name}" is now ${is_active ? 'active' : 'inactive'}` });
  } catch (error) {
    console.error('[reseller.plans] toggle_reseller_plan_status error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 5. SOFT DELETE ───────────────────────────────────────────────────────────
/**
 * DELETE /admin-api/resellers/plans/delete
 */
const delete_reseller_plan = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

    const doc = await ResellerPlan.findOne({ _id: id, deleted_at: null });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Plan not found' });

    // Block deletion if active subscriptions exist
    const activeSubCount = await ResellerPlanSubscription.countDocuments({ plan_id: id, status: 'active' });
    if (activeSubCount > 0) {
      return res.status(409).json({
        status: 'error',
        message: `Cannot delete: Plan "${doc.name}" has ${activeSubCount} active reseller subscription(s). Deactivate the plan instead.`,
      });
    }

    doc.deleted_at = new Date();
    doc.is_active = false;
    doc.updated_by = req.user?.id || null;
    await doc.save();

    await logAudit({
      actor_type: 'cms_user',
      actor_id: req.user?.id,
      action: 'RESELLER_PLAN_DELETE',
      entity_type: 'reseller_plans',
      entity_id: id,
      req,
    });

    return res.json({ status: 'success', message: `Plan "${doc.name}" deleted` });
  } catch (error) {
    console.error('[reseller.plans] delete_reseller_plan error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ─── 6. GET PLAN CONFIG OPTIONS (Project Types & Admin Created Combo Kits) ─────
/**
 * GET /admin-api/resellers/plans/config-options
 */
const get_plan_config_options = async (req, res) => {
  try {
    const [projectTypes, categories, subcategories, subcategoryTypes, projectRanges, industryTypes, kitsCore, subtypes] = await Promise.all([
      ProjectType.find({ deleted_at: null }).sort({ name: 1 }).lean(),
      ProjectCategory.find({ deleted_at: null, is_active: { $ne: false } }).sort({ sort_order: 1, name: 1 }).lean(),
      ProjectSubcategory.find({ deleted_at: null, is_active: { $ne: false } }).sort({ name: 1 }).lean(),
      ProjectSubcategoryType.find({ deleted_at: null, is_active: { $ne: false } })
        .populate('type', 'name')
        .populate('subcategory', 'name')
        .lean(),
      ProjectRange.find({ deleted_at: null, is_active: { $ne: false } })
        .populate('unit_id', 'symbol name')
        .lean(),
      IndustryType.find({ deleted_at: null, is_active: { $ne: false } }).sort({ name: 1 }).lean(),
      WarehouseComboKit.find({ deleted_at: null, is_active: { $ne: false } })
        .populate({
          path: 'solar_kit_id',
          select: 'name category_id subcategory_id type_id',
          populate: [
            { path: 'category_id', select: 'name industry_type_id' },
            { path: 'subcategory_id', select: 'name' },
            { path: 'type_id', populate: { path: 'type', model: 'sys_filter_types', select: 'name' } },
          ],
        })
        .populate({
          path: 'project_range_id',
          select: 'min_value max_value unit_id',
          populate: { path: 'unit_id', select: 'symbol name' },
        })
        .sort({ name: 1 })
        .lean(),
      FranchiseeSubtype.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean(),
    ]);

    let kitsIndia = [];
    if (IndiaComboKit) {
      try {
        kitsIndia = await IndiaComboKit.find({ deleted_at: null, is_active: { $ne: false } })
          .populate({
            path: 'solar_kit_id',
            select: 'name category_id subcategory_id type_id',
            populate: [
              { path: 'category_id', select: 'name industry_type_id' },
              { path: 'subcategory_id', select: 'name' },
              { path: 'type_id', populate: { path: 'type', model: 'sys_filter_types', select: 'name' } },
            ],
          })
          .populate({
            path: 'project_range_id',
            select: 'min_value max_value unit_id',
            populate: { path: 'unit_id', select: 'symbol name' },
          })
          .sort({ name: 1 })
          .lean();
      } catch (e) {
        // fallback
      }
    }

    const kitsMap = new Map();
    [...kitsCore, ...kitsIndia].forEach((k) => kitsMap.set(String(k._id), k));
    const rawComboKits = Array.from(kitsMap.values());

    const comboKits = rawComboKits.map((k) => {
      const sk = k.solar_kit_id || {};
      const cat = sk.category_id || {};
      const sub = sk.subcategory_id || {};
      const typeObj = sk.type_id || {};
      const pr = k.project_range_id || {};

      const industryTypeId = cat.industry_type_id ? String(cat.industry_type_id) : null;
      const categoryId = cat._id ? String(cat._id) : (sk.category_id ? String(sk.category_id) : null);
      const subcategoryId = sub._id ? String(sub._id) : (sk.subcategory_id ? String(sk.subcategory_id) : null);
      const systemTypeId = typeObj._id ? String(typeObj._id) : (sk.type_id ? String(sk.type_id) : null);
      const projectRangeId = pr._id ? String(pr._id) : (k.project_range_id ? String(k.project_range_id) : null);

      return {
        id:                   k._id,
        name:                 k.name || k.kit_name || 'Combo Kit',
        kit_code:             k.kit_code || '',
        capacity:             k.capacity || 0,
        capacity_kw:          k.capacity || 0,
        base_price_cached:    k.base_price_cached || 0,
        selling_price_cached: k.selling_price_cached || 0,
        kit_image:            k.kit_image || null,
        industry_type_id:     industryTypeId,
        category_id:          categoryId,
        category_name:        cat.name || '',
        subcategory_id:       subcategoryId,
        subcategory_name:     sub.name || '',
        system_type_id:       systemTypeId,
        system_type_name:     typeObj.type?.name || '',
        project_range_id:     projectRangeId,
        project_range_label:  pr.min_value !== undefined ? `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}` : '',
        description:          k.description || sk.description || '',
      };
    });

    // Compute category and kit counts per industry type
    const enrichedIndustryTypes = industryTypes.map((i) => {
      const iIdStr = String(i._id);
      const matchingCats = categories.filter((c) => c.industry_type_id && String(c.industry_type_id) === iIdStr);
      const matchingKits = comboKits.filter((k) => k.industry_type_id === iIdStr);

      return {
        id:             i._id,
        name:           i.name,
        code:           i.code || '',
        slug:           i.slug || '',
        icon:           i.icon || null,
        cover_image:    i.cover_image || null,
        description:    i.description || '',
        category_count: matchingCats.length,
        kit_count:      matchingKits.length,
      };
    });

    return res.json({
      status: 'success',
      data: {
        industry_types: enrichedIndustryTypes,
        project_types:  projectTypes.map((t) => ({ id: t._id, name: t.name })),
        categories:     categories.map((c) => ({ id: c._id, name: c.name, industry_type_id: c.industry_type_id })),
        subcategories:  subcategories.map((sc) => ({ id: sc._id, name: sc.name, category_id: sc.category })),
        system_types:   subcategoryTypes.map((st) => ({
          id:             st._id,
          subcategory_id: st.subcategory?._id || st.subcategory,
          type_id:        st.type?._id || st.type,
          name:           st.type?.name || 'System Type',
        })),
        project_ranges: projectRanges.map((pr) => ({
          id:                  pr._id,
          subcategory_type_id: pr.subcategory_type,
          min_value:           pr.min_value,
          max_value:           pr.max_value,
          unit_symbol:         pr.unit_id?.symbol || 'kW',
          label:               `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}`,
        })),
        combo_kits: comboKits,
        subtypes: (subtypes || []).map((s) => ({ id: s._id, name: s.name, slug: s.slug })),
      },
    });
  } catch (error) {
    console.error('[reseller.plans] get_plan_config_options error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to load configuration options' });
  }
};

module.exports = {
  list_reseller_plans,
  add_reseller_plan,
  update_reseller_plan,
  toggle_reseller_plan_status,
  delete_reseller_plan,
  get_plan_config_options,
};
