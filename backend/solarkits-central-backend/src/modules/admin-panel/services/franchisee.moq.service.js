/**
 * franchisee.moq.service.js
 *
 * Minimum Order Quantity and Order Increment validation for Franchisee POs.
 *
 * Rule resolution hierarchy (highest priority first):
 *   1. Plan-specific + project_type_specific rule
 *   2. Global + project_type_specific rule
 *   3. Plan-specific global rule (no project type)
 *   4. Global catch-all rule
 *
 * Validation formula for quantity Q, MOQ m, increment i:
 *   Q >= m  AND  (Q - m) % i === 0  AND  (max_qty === null OR Q <= max_qty)
 */

const mongoose = require('mongoose');
const { FranchiseeMoqRule, FranchiseePlanPoSetting } = require('../models/india_solarshop_db');

/**
 * Resolve the effective MOQ rule for an order line item or validation query.
 *
 * Checks in hierarchical specificity:
 *   1. Specific Combo Kit / Product + Plan
 *   2. Specific Combo Kit / Product (Global)
 *   3. Specific Range + Plan
 *   4. Specific System / Project Type + Plan
 *   5. Specific Subcategory + Plan
 *   6. Specific Category + Plan
 *   7. Specific Industry + Plan
 *   8. Plan Default
 *   9. Global Default
 *
 * @param {object} params
 * @param {string|ObjectId} [params.plan_id]
 * @param {string|ObjectId} [params.combo_kit_id]
 * @param {string|ObjectId} [params.project_range_id]
 * @param {string|ObjectId} [params.system_type_id]
 * @param {string|ObjectId} [params.project_type_id]
 * @param {string|ObjectId} [params.subcategory_id]
 * @param {string|ObjectId} [params.category_id]
 * @param {string|ObjectId} [params.industry_type_id]
 * @param {Date} [params.asOf] - defaults to now
 * @returns {Promise<object|null>}
 */
async function resolveEffectiveMoqRule({
  plan_id, combo_kit_id, project_range_id, system_type_id,
  project_type_id, subcategory_id, category_id, industry_type_id, asOf
}) {
  const now = asOf || new Date();
  const sysTypeId = system_type_id || project_type_id;

  const query = {
    is_active: true,
    deleted_at: null,
    valid_from: { $lte: now },
    $or: [{ valid_until: null }, { valid_until: { $gte: now } }],
  };

  // Build candidate query: rules that match plan or are global
  query.$and = [
    {
      $or: [
        { plan_id: mongoose.Types.ObjectId.isValid(plan_id) ? new mongoose.Types.ObjectId(plan_id) : null },
        { plan_id: null },
      ],
    },
  ];

  if (combo_kit_id) {
    query.$and.push({
      $or: [
        { combo_kit_id: mongoose.Types.ObjectId.isValid(combo_kit_id) ? new mongoose.Types.ObjectId(combo_kit_id) : null },
        { combo_kit_id: null },
      ],
    });
  }

  if (project_range_id) {
    query.$and.push({
      $or: [
        { project_range_id: mongoose.Types.ObjectId.isValid(project_range_id) ? new mongoose.Types.ObjectId(project_range_id) : null },
        { project_range_id: null },
      ],
    });
  }

  if (sysTypeId) {
    query.$and.push({
      $or: [
        { system_type_id: mongoose.Types.ObjectId.isValid(sysTypeId) ? new mongoose.Types.ObjectId(sysTypeId) : null },
        { project_type_id: mongoose.Types.ObjectId.isValid(sysTypeId) ? new mongoose.Types.ObjectId(sysTypeId) : null },
        { system_type_id: null, project_type_id: null },
      ],
    });
  }

  if (industry_type_id) {
    query.$and.push({
      $or: [
        { industry_type_id: mongoose.Types.ObjectId.isValid(industry_type_id) ? new mongoose.Types.ObjectId(industry_type_id) : null },
        { industry_type_id: null },
      ],
    });
  }

  // Fetch all candidates sorted by priority
  const candidates = await FranchiseeMoqRule.find(query)
    .sort({ priority: -1, created_at: -1 })
    .lean();

  if (!candidates.length) return null;

  // 1. Direct Combo Kit + Plan match
  if (combo_kit_id && plan_id) {
    const m = candidates.find(r => r.combo_kit_id && String(r.combo_kit_id) === String(combo_kit_id) && r.plan_id && String(r.plan_id) === String(plan_id));
    if (m) return m;
  }
  // 2. Direct Combo Kit (Global)
  if (combo_kit_id) {
    const m = candidates.find(r => r.combo_kit_id && String(r.combo_kit_id) === String(combo_kit_id));
    if (m) return m;
  }
  // 3. Project Range + Plan
  if (project_range_id && plan_id) {
    const m = candidates.find(r => r.project_range_id && String(r.project_range_id) === String(project_range_id) && r.plan_id && String(r.plan_id) === String(plan_id));
    if (m) return m;
  }
  // 4. System / Project Type + Plan
  if (sysTypeId && plan_id) {
    const m = candidates.find(r => (r.system_type_id && String(r.system_type_id) === String(sysTypeId) || r.project_type_id && String(r.project_type_id) === String(sysTypeId)) && r.plan_id && String(r.plan_id) === String(plan_id));
    if (m) return m;
  }
  // 5. System / Project Type only
  if (sysTypeId) {
    const m = candidates.find(r => (r.system_type_id && String(r.system_type_id) === String(sysTypeId) || r.project_type_id && String(r.project_type_id) === String(sysTypeId)));
    if (m) return m;
  }
  // 6. Plan only
  if (plan_id) {
    const m = candidates.find(r => r.plan_id && String(r.plan_id) === String(plan_id) && !r.combo_kit_id && !r.system_type_id && !r.project_type_id);
    if (m) return m;
  }

  return candidates[0]; // Global fallback
}

/**
 * Resolve the effective PO settings for a plan.
 *
 * @param {string|ObjectId} plan_id
 * @param {Date} [asOf]
 * @returns {Promise<object|null>}
 */
async function resolveEffectivePoSettings(plan_id, asOf) {
  const now = asOf || new Date();
  return FranchiseePlanPoSetting.findOne({
    plan_id,
    is_active: true,
    deleted_at: null,
    po_enabled: true,
    effective_from: { $lte: now },
    $or: [{ effective_until: null }, { effective_until: { $gte: now } }],
  })
    .sort({ effective_from: -1 })
    .lean();
}

/**
 * Validate a quantity against the MOQ rule and PO settings.
 *
 * @param {object} params
 * @param {number} params.quantity - The quantity to validate
 * @param {object|null} params.moq_rule - Result of resolveEffectiveMoqRule()
 * @param {object|null} params.po_settings - Result of resolveEffectivePoSettings()
 * @param {string} [params.project_type_name] - For user-friendly error messages
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateQuantity({ quantity, moq_rule, po_settings, project_type_name }) {
  const Q = Number(quantity);

  // Positive integer check
  if (!Number.isInteger(Q) || Q <= 0) {
    return { valid: false, reason: 'Quantity must be a positive whole number.' };
  }

  // ── MOQ validation ────────────────────────────────────────────────────────
  if (moq_rule) {
    const { moq, increment_quantity, max_quantity } = moq_rule;
    const typeLabel = project_type_name || 'This product type';

    if (Q < moq) {
      return {
        valid: false,
        reason: `${typeLabel} orders require a minimum of ${moq} kit${moq !== 1 ? 's' : ''}.`,
      };
    }

    const inc = increment_quantity || 1;
    if (inc > 1 && (Q - moq) % inc !== 0) {
      return {
        valid: false,
        reason: `${typeLabel} orders must be placed in increments of ${inc} after the minimum quantity of ${moq}. Valid quantities: ${moq}, ${moq + inc}, ${moq + 2 * inc}...`,
      };
    }

    if (max_quantity !== null && max_quantity !== undefined && Q > max_quantity) {
      return {
        valid: false,
        reason: `${typeLabel} orders cannot exceed ${max_quantity} kit${max_quantity !== 1 ? 's' : ''}.`,
      };
    }

    if (moq_rule.po_quantity_limit !== null && moq_rule.po_quantity_limit !== undefined && Q > moq_rule.po_quantity_limit) {
      return {
        valid: false,
        reason: `The PO quantity limit for ${typeLabel} is ${moq_rule.po_quantity_limit} kit${moq_rule.po_quantity_limit !== 1 ? 's' : ''}.`,
      };
    }
  }

  // ── Plan PO limits validation ─────────────────────────────────────────────
  if (po_settings) {
    const { min_po_quantity, max_po_quantity } = po_settings;

    if (min_po_quantity !== null && min_po_quantity !== undefined && Q < min_po_quantity) {
      return {
        valid: false,
        reason: `The minimum PO quantity for your plan is ${min_po_quantity} kit${min_po_quantity !== 1 ? 's' : ''}.`,
      };
    }

    if (max_po_quantity !== null && max_po_quantity !== undefined && Q > max_po_quantity) {
      return {
        valid: false,
        reason: `Your plan allows a maximum of ${max_po_quantity} kit${max_po_quantity !== 1 ? 's' : ''} per PO.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate all items in a PO simultaneously.
 * Returns an array of per-item validation results.
 *
 * @param {Array<{quantity, project_type_id, industry_type_id, item_name}>} items
 * @param {string|ObjectId} plan_id
 * @param {object|null} po_settings
 * @returns {Promise<Array<{item_index, item_name, valid, reason}>>}
 */
async function validatePoItems(items, plan_id, po_settings) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const moq_rule = await resolveEffectiveMoqRule({
      plan_id,
      project_type_id: item.project_type_id,
      industry_type_id: item.industry_type_id,
    });

    const result = validateQuantity({
      quantity: item.quantity,
      moq_rule,
      po_settings,
      project_type_name: item.item_name || `Item ${i + 1}`,
    });

    results.push({
      item_index: i,
      item_name: item.item_name,
      moq_rule,
      ...result,
    });
  }

  return results;
}

module.exports = {
  resolveEffectiveMoqRule,
  resolveEffectivePoSettings,
  validateQuantity,
  validatePoItems,
};
