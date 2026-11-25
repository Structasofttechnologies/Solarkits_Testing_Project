/**
 * product.authorization.service.js
 *
 * Product Authorization Evaluator & 5-Level Catalog Filter Engine.
 * Phase 4 — Reseller Management System
 * Phase R5 — District Product Rules, Project Type Scoping, Industry Type Scoping & 5-Level Precedence.
 *
 * Evaluation rules (in order of priority):
 *   1. Explicit Admin Reseller Override (`ResellerProductAuthorization` with `source === 'admin_override'`)
 *      -> Explicit Blacklist (is_authorized: false) => BLOCKED
 *      -> Explicit Whitelist (is_authorized: true)  => AUTHORIZED
 *   2. District Product Rule (`DistrictProductRule` matching reseller's active district territories)
 *      -> Blacklist => BLOCKED
 *      -> Whitelist => AUTHORIZED
 *   3. Active Plan Subscription Scope (allowed_category_ids, allowed_project_type_ids)
 *      -> Outside scope => BLOCKED
 *   4. Reseller Plan Authorization (`ResellerProductAuthorization` with `source === 'plan_default'`)
 *      -> Whitelist/Blacklist rules derived from plan defaults
 *   5. Default Catalog Access => AUTHORIZED unless restricted above
 */

const {
  Reseller,
  ResellerTerritory,
  ResellerProductAuthorization,
  DistrictProductRule,
  ResellerPlanSubscription,
} = require('../models/india_solarshop_db');

/**
 * Evaluate authorization for a single catalog item (product, kit, category, or subcategory).
 *
 * @param {string|ObjectId} resellerId
 * @param {object} item - { category_id, subcategory_id, product_id, kit_id, project_type_id, industry_type_id, district_id }
 * @returns {Promise<object>} { is_authorized: boolean, source: string, reason: string }
 */
async function evaluateResellerProductAuthorization(resellerId, item = {}) {
  const reseller = await Reseller.findOne({ _id: resellerId, deleted_at: null }).lean();
  if (!reseller || reseller.activation_status !== 'active') {
    return { is_authorized: false, source: 'none', reason: 'Reseller account is not active' };
  }

  // Fetch explicit product authorization rules for this reseller
  const resellerRules = await ResellerProductAuthorization.find({
    reseller_id: resellerId,
    status: 'active',
  }).lean();

  // ── Level 1: Explicit Admin Reseller Overrides ──────────────────────────────
  const adminOverrides = resellerRules.filter((r) => r.source === 'admin_override');

  // Check Level 1 Blacklist
  for (const r of adminOverrides) {
    if (r.is_authorized === false) {
      if (r.scope_type === 'kit' && item.kit_id && String(r.kit_id) === String(item.kit_id)) {
        return { is_authorized: false, source: 'admin_override', reason: 'Kit is explicitly restricted by admin blacklist override' };
      }
      if (r.scope_type === 'product' && item.product_id && String(r.product_id) === String(item.product_id)) {
        return { is_authorized: false, source: 'admin_override', reason: 'Product is explicitly restricted by admin blacklist override' };
      }
      if (r.scope_type === 'subcategory' && item.subcategory_id && String(r.subcategory_id) === String(item.subcategory_id)) {
        return { is_authorized: false, source: 'admin_override', reason: 'Subcategory is restricted by admin blacklist override' };
      }
      if (r.scope_type === 'category' && item.category_id && String(r.category_id) === String(item.category_id)) {
        return { is_authorized: false, source: 'admin_override', reason: 'Category is restricted by admin blacklist override' };
      }
    }
  }

  // Check Level 1 Whitelist
  for (const r of adminOverrides) {
    if (r.is_authorized === true) {
      if (r.scope_type === 'all') {
        return { is_authorized: true, source: 'admin_override', reason: 'Reseller authorized for all catalog items via admin override' };
      }
      if (r.scope_type === 'kit' && item.kit_id && String(r.kit_id) === String(item.kit_id)) {
        return { is_authorized: true, source: 'admin_override', reason: 'Kit authorized by explicit admin whitelist override' };
      }
      if (r.scope_type === 'product' && item.product_id && String(r.product_id) === String(item.product_id)) {
        return { is_authorized: true, source: 'admin_override', reason: 'Product authorized by explicit admin whitelist override' };
      }
      if (r.scope_type === 'subcategory' && item.subcategory_id && String(r.subcategory_id) === String(item.subcategory_id)) {
        return { is_authorized: true, source: 'admin_override', reason: 'Subcategory authorized by explicit admin whitelist override' };
      }
      if (r.scope_type === 'category' && item.category_id && String(r.category_id) === String(item.category_id)) {
        return { is_authorized: true, source: 'admin_override', reason: 'Category authorized by explicit admin whitelist override' };
      }
    }
  }

  // ── Level 2: District Product Rules ─────────────────────────────────────────
  // Find reseller's active district territories
  const activeTerritories = await ResellerTerritory.find({
    reseller_id: resellerId,
    territory_level: 'district',
    status: 'active',
  }).lean();

  const districtIds = activeTerritories.map((t) => t.district_id).filter(Boolean);
  if (item.district_id) districtIds.push(item.district_id);

  if (districtIds.length > 0) {
    const districtRules = await DistrictProductRule.find({
      district_id: { $in: districtIds },
      status: 'active',
    }).lean();

    // Level 2 Blacklist
    for (const dr of districtRules) {
      if (dr.is_authorized === false) {
        if (dr.scope_type === 'kit' && item.kit_id && String(dr.kit_id) === String(item.kit_id)) {
          return { is_authorized: false, source: 'district_rule', reason: 'Kit is restricted by district product rule' };
        }
        if (dr.scope_type === 'product' && item.product_id && String(dr.product_id) === String(item.product_id)) {
          return { is_authorized: false, source: 'district_rule', reason: 'Product is restricted by district product rule' };
        }
        if (dr.scope_type === 'category' && item.category_id && String(dr.category_id) === String(item.category_id)) {
          return { is_authorized: false, source: 'district_rule', reason: 'Category is restricted by district product rule' };
        }
      }
    }

    // Level 2 Whitelist
    for (const dr of districtRules) {
      if (dr.is_authorized === true) {
        if (dr.scope_type === 'kit' && item.kit_id && String(dr.kit_id) === String(item.kit_id)) {
          return { is_authorized: true, source: 'district_rule', reason: 'Kit is authorized by district product rule' };
        }
        if (dr.scope_type === 'product' && item.product_id && String(dr.product_id) === String(item.product_id)) {
          return { is_authorized: true, source: 'district_rule', reason: 'Product is authorized by district product rule' };
        }
        if (dr.scope_type === 'category' && item.category_id && String(dr.category_id) === String(item.category_id)) {
          return { is_authorized: true, source: 'district_rule', reason: 'Category is authorized by district product rule' };
        }
      }
    }
  }

  // ── Level 3: Active Plan Subscription Scope ────────────────────────────────
  const activeSub = await ResellerPlanSubscription.findOne({ reseller_id: resellerId, status: 'active' })
    .populate('plan_id')
    .lean();

  if (activeSub?.plan_id) {
    const plan = activeSub.plan_id;
    const allowedCats = (plan.allowed_category_ids || []).map(String);
    const allowedProjectTypes = (plan.allowed_project_type_ids || []).map(String);

    if (allowedCats.length > 0 && item.category_id && !allowedCats.includes(String(item.category_id))) {
      return { is_authorized: false, source: 'plan_default', reason: 'Category is outside plan subscription scope' };
    }
    if (allowedProjectTypes.length > 0 && item.project_type_id && !allowedProjectTypes.includes(String(item.project_type_id))) {
      return { is_authorized: false, source: 'plan_default', reason: 'Project type is outside plan subscription scope' };
    }
  }

  // ── Level 4: Reseller Plan Default Rules ────────────────────────────────────
  const planDefaultRules = resellerRules.filter((r) => r.source === 'plan_default');
  for (const r of planDefaultRules) {
    if (r.is_authorized === true) {
      if (r.scope_type === 'all') return { is_authorized: true, source: 'plan_default', reason: 'Authorized under plan defaults' };
      if (r.scope_type === 'category' && item.category_id && String(r.category_id) === String(item.category_id)) {
        return { is_authorized: true, source: 'plan_default', reason: 'Category authorized under plan defaults' };
      }
    }
  }

  // ── Level 5: Default Fallback Access ────────────────────────────────────────
  return { is_authorized: true, source: 'default', reason: 'Authorized by default catalog access' };
}

/**
 * Filter an array of catalog items for a reseller.
 */
async function filterCatalogForReseller(resellerId, items = []) {
  if (!items || !items.length) return [];

  const results = [];
  for (const item of items) {
    const check = await evaluateResellerProductAuthorization(resellerId, {
      category_id:      item.category_id || item.category || item.project_category,
      subcategory_id:   item.subcategory_id || item.subcategory || item.project_subcategory,
      product_id:       item.product_id || item._id,
      kit_id:           item.kit_id || item._id,
      project_type_id:  item.project_type_id,
      industry_type_id: item.industry_type_id,
      district_id:      item.district_id,
    });

    if (check.is_authorized) {
      results.push(item);
    }
  }
  return results;
}

module.exports = {
  evaluateResellerProductAuthorization,
  filterCatalogForReseller,
};
