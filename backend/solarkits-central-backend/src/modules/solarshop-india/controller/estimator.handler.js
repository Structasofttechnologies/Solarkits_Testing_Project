/**
 * estimator.handler.js — Controller for Know My Margin (KMM) EPC and Franchisee portal.
 *
 * Implements:
 *   - Hierarchy & eligibility filtering
 *   - BOM item matching with location-based rates
 *   - Authoritative calculation engine invocation
 *   - Side-by-side solution comparison
 *   - Estimate CRUD (save, list, get, update, delete, recalculate)
 *   - Estimate to Quote conversion
 *   - Dashboard statistics
 */

'use strict';

const mongoose = require('mongoose');
const {
  ProjectBomItem,
  EstimatorSettings,
  EpcMarginEstimate,
  EpcQuote,
  QuoteSettings,
  EpcAccount,
  Reseller,
} = require('../../admin-panel/models/india_solarshop_db');

const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
} = require('../../admin-panel/models/core_db');

const CoreComboKit = require('../models/india_core_db/combo_kits.schema');
const IndiaComboKit = require('../models/india_solarshop_db/combo_kits.schema');
const SolarKit = require('../models/india_core_db/solar_kits.schema');
const { calculateMarginEstimate, round2 } = require('../utils/kmm.calculation.service');

// Helper to extract authenticated user / EPC account ID from JWT payload
function getAuthUserId(req) {
  return req.user?.account_id || req.user?.id || req.user?._id || req.user?.userId;
}

// Helper to get active estimator settings
async function getSettings() {
  let settings = await EstimatorSettings.findOne().lean();
  if (!settings) {
    settings = (await EstimatorSettings.create({})).toObject();
  }
  return settings;
}

// Helper to generate sequential estimate number: SK-EST-2026-000001
async function getNextEstimateNumber(prefix = 'SK-EST') {
  const year = new Date().getFullYear();
  const doc = await EstimatorSettings.findOneAndUpdate(
    {},
    { $inc: { estimate_number_sequence: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(doc.estimate_number_sequence || 1).padStart(6, '0');
  const cleanPrefix = (doc.estimate_number_prefix || prefix).trim().toUpperCase();
  return `${cleanPrefix}-${year}-${seq}`;
}

// Helper to get quote sequence number
async function getNextQuoteNumber(prefix = 'SK-QT') {
  const year = new Date().getFullYear();
  const doc = await QuoteSettings.findOneAndUpdate(
    {},
    { $inc: { quote_number_sequence: 1 } },
    { new: true, upsert: true }
  );
  const seq = String(doc.quote_number_sequence || 1).padStart(6, '0');
  const cleanPrefix = (doc.quote_number_prefix || prefix).trim().toUpperCase();
  return `${cleanPrefix}-${year}-${seq}`;
}

/* ── Step 1: Eligible Industry Types ─────────────────────────────────────── */
exports.get_eligible_industries = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.is_enabled || !settings.enabled_for_epc) {
      return res.status(403).json({
        success: false,
        message: 'Know My Margin Estimator is currently disabled by Admin.',
      });
    }

    const query = { deleted_at: null, is_active: true };
    if (Array.isArray(settings.eligible_industry_types) && settings.eligible_industry_types.length > 0) {
      query._id = { $in: settings.eligible_industry_types };
    }

    const industries = await IndustryType.find(query)
      .sort({ sort_order: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: industries || [] });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_industries:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch industry types' });
  }
};

/* ── Step 2: Eligible Project Categories / Types ─────────────────────────── */
exports.get_eligible_project_types = async (req, res) => {
  try {
    const { industry_type_id } = req.query;
    const query = { deleted_at: null, is_active: true };

    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) {
      query.industry_type_id = industry_type_id;
    }

    const categories = await ProjectCategory.find(query)
      .sort({ sort_order: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: categories || [] });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_project_types:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch project categories' });
  }
};

/* ── Step 3: Eligible Project Subcategories ──────────────────────────────── */
exports.get_eligible_sub_types = async (req, res) => {
  try {
    const { project_category_id } = req.query;
    const query = { deleted_at: null, is_active: true };

    if (project_category_id && mongoose.Types.ObjectId.isValid(project_category_id)) {
      query.category = project_category_id;
    }

    const subcategories = await ProjectSubcategory.find(query)
      .sort({ sort_order: 1, name: 1 })
      .lean();

    return res.json({ success: true, data: subcategories || [] });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_sub_types:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch project subcategories' });
  }
};

/* ── Step 4: Eligible Solutions (ComboKits) ──────────────────────────────── */
/* ── Step 4: Eligible Solutions (ComboKits) ──────────────────────────────── */
exports.get_eligible_solutions = async (req, res) => {
  try {
    const {
      industry_type_id,
      project_category_id,
      project_subcategory_id,
      industry_type_name,
      category_name,
      sub_category_name,
      system_type_name,
      project_range_name,
      district_id,
      min_capacity,
      max_capacity,
      search,
    } = req.query;

    const [
      coreKits,
      indiaKits,
      solarKits,
      categories,
      subcategories,
      typeMaps,
      types,
      ranges,
      industries,
    ] = await Promise.all([
      CoreComboKit.find({ deleted_at: null }).lean().catch(() => []),
      IndiaComboKit.find({ deleted_at: null }).lean().catch(() => []),
      SolarKit.find({ deleted_at: null }).lean().catch(() => []),
      ProjectCategory.find({ deleted_at: null }).lean().catch(() => []),
      ProjectSubcategory.find({ deleted_at: null }).lean().catch(() => []),
      ProjectSubcategoryType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectRange.find({ deleted_at: null }).populate('unit_id').lean().catch(() => []),
      IndustryType.find({ deleted_at: null }).lean().catch(() => []),
    ]);

    const allKits = [...(coreKits || []), ...(indiaKits || [])];
    const seenIds = new Set();
    let formatted = [];

    allKits.forEach((k) => {
      const idStr = String(k._id);
      if (seenIds.has(idStr)) return;
      seenIds.add(idStr);

      const sk = solarKits.find((s) => String(s._id) === String(k.solar_kit_id)) || {};
      const cat = categories.find((c) => String(c._id) === String(sk.category_id || k.category_id)) || {};
      const ind = industries.find((i) => String(i._id) === String(cat.industry_type_id)) || {};
      const sub = subcategories.find((s) => String(s._id) === String(sk.subcategory_id || k.subcategory_id)) || {};
      const tm = typeMaps.find((t) => String(t._id) === String(sk.type_id || k.type_id)) || {};
      const typeObj = types.find((t) => String(t._id) === String(tm.type)) || {};
      const pr = ranges.find((r) => String(r._id) === String(k.project_range_id)) || {};

      const capacity = Number(k.capacity || k.capacity_kw || k.capacityKW || 0);
      let price = Number(k.selling_price_cached || k.selling_price || k.customer_price || k.base_price || 0);

      formatted.push({
        _id: k._id,
        id: idStr,
        name: k.name || `Solar Kit ${capacity} kW`,
        sku: k.sku || `SK-KIT-${idStr.slice(-6).toUpperCase()}`,
        brand_name: k.brand_name || k.brand || 'Solarkits Certified',
        capacity_kw: capacity,
        capacityKW: capacity,
        selling_price: price,
        base_price: Number(k.base_price_cached || k.base_price || price),
        max_margin: Number(k.max_margin || 0),
        image: k.kit_image || k.image || (k.images && k.images[0]) || null,
        description: k.description || null,
        specifications: k.specifications || [],
        base_components: k.base_components || [],
        variants: k.variants || [],
        industryType: ind.name || k.industryType || k.industry_type_name || null,
        industry_type_id: ind._id || k.industry_type_id || null,
        category: cat.name || k.category || null,
        project_category_id: cat._id || k.project_category_id || null,
        subCategory: sub.name || k.subCategory || k.usageType || null,
        project_subcategory_id: sub._id || k.project_subcategory_id || null,
        projectType: typeObj.name || k.projectType || k.systemType || null,
        projectRange:
          pr.range_label ||
          (pr.min_value !== undefined
            ? `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}`
            : k.projectRange || null),
      });
    });

    // Filtering
    let filtered = formatted;

    if (industry_type_id && mongoose.Types.ObjectId.isValid(industry_type_id)) {
      filtered = filtered.filter((k) => String(k.industry_type_id) === String(industry_type_id));
    }
    if (project_category_id && mongoose.Types.ObjectId.isValid(project_category_id)) {
      filtered = filtered.filter((k) => String(k.project_category_id) === String(project_category_id));
    }
    if (project_subcategory_id && mongoose.Types.ObjectId.isValid(project_subcategory_id)) {
      filtered = filtered.filter((k) => String(k.project_subcategory_id) === String(project_subcategory_id));
    }

    // Quick Filters by name
    if (industry_type_name && industry_type_name !== 'all') {
      const sel = industry_type_name.toLowerCase();
      filtered = filtered.filter((k) => {
        const ind = (k.industryType || '').toLowerCase();
        return ind === sel || ind.includes(sel) || sel.includes(ind);
      });
    }

    if (category_name && category_name !== 'all') {
      const sel = category_name.toLowerCase();
      filtered = filtered.filter((k) => (k.category || '').toLowerCase() === sel);
    }

    if (sub_category_name && sub_category_name !== 'all') {
      const sel = sub_category_name.toLowerCase();
      filtered = filtered.filter((k) => (k.subCategory || '').toLowerCase() === sel);
    }

    if (system_type_name && system_type_name !== 'all') {
      const sel = system_type_name.toLowerCase();
      filtered = filtered.filter((k) => (k.projectType || '').toLowerCase() === sel);
    }

    if (project_range_name && project_range_name !== 'all') {
      const sel = project_range_name.toLowerCase();
      filtered = filtered.filter((k) => (k.projectRange || '').toLowerCase() === sel);
    }

    if (min_capacity) {
      filtered = filtered.filter((k) => k.capacity_kw >= Number(min_capacity));
    }
    if (max_capacity) {
      filtered = filtered.filter((k) => k.capacity_kw <= Number(max_capacity));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((k) => {
        return (
          (k.name || '').toLowerCase().includes(q) ||
          (k.sku || '').toLowerCase().includes(q) ||
          (k.description || '').toLowerCase().includes(q)
        );
      });
    }

    return res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_solutions:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch solutions' });
  }
};

/* ── Step 5: Eligible Project BOM Items ─────────────────────────────────── */
exports.get_eligible_boms = async (req, res) => {
  try {
    const {
      industry_type_id,
      project_category_id,
      project_subcategory_id,
      industry_type_name,
      category_name,
      sub_category_name,
      system_type_name,
      project_range_name,
      kit_id,
      state_id,
      district_id,
      pincode,
    } = req.query;

    const query = {
      $or: [
        { deleted_at: null },
        { deleted_at: { $exists: false } }
      ],
      is_active: { $ne: false },
    };

    let bomDocs = await ProjectBomItem.find(query)
      .sort({ display_order: 1, name: 1 })
      .lean();

    // Comprehensive Kit & Quick-Filter matching
    bomDocs = bomDocs.filter(item => {
      // 1. If this BOM item specifies explicit eligible_kit_ids, kit_id MUST be included
      if (Array.isArray(item.eligible_kit_ids) && item.eligible_kit_ids.length > 0) {
        if (!kit_id) return false;
        const matchesKit = item.eligible_kit_ids.some(kId => String(kId) === String(kit_id));
        if (!matchesKit) return false;
      }

      // 2. Industry Type matching (if configured on BOM item)
      if (item.industry_type_id && industry_type_id) {
        if (String(item.industry_type_id) !== String(industry_type_id)) return false;
      } else if (item.industry_type_name && industry_type_name && item.industry_type_name !== 'all') {
        const itemInd = item.industry_type_name.toLowerCase();
        const kitInd = industry_type_name.toLowerCase();
        if (itemInd !== kitInd && !kitInd.includes(itemInd) && !itemInd.includes(kitInd)) return false;
      }

      // 3. Category matching (if configured on BOM item)
      if (item.project_category_id && project_category_id) {
        if (String(item.project_category_id) !== String(project_category_id)) return false;
      } else if (item.category_name && category_name && item.category_name !== 'all') {
        if (item.category_name.toLowerCase() !== category_name.toLowerCase()) return false;
      }

      // 4. Sub Category matching (if configured on BOM item)
      if (item.project_subcategory_id && project_subcategory_id) {
        if (String(item.project_subcategory_id) !== String(project_subcategory_id)) return false;
      } else if (item.subcategory_name && sub_category_name && item.subcategory_name !== 'all') {
        if (item.subcategory_name.toLowerCase() !== sub_category_name.toLowerCase()) return false;
      }

      // 5. System Type matching (if configured on BOM item)
      if (item.system_type_name && system_type_name && item.system_type_name !== 'all') {
        if (item.system_type_name.toLowerCase() !== system_type_name.toLowerCase()) return false;
      }

      // 6. Project Range matching (if configured on BOM item)
      if (item.project_range_name && project_range_name && item.project_range_name !== 'all') {
        if (item.project_range_name.toLowerCase() !== project_range_name.toLowerCase()) return false;
      }

      return true;
    });

    const settings = await getSettings();

    // Mask admin rate if show_bom_rates_to_epc is false
    const location = { state_id, district_id, pincode };
    const items = bomDocs.map(doc => {
      const clone = { ...doc };
      if (!settings.show_bom_rates_to_epc) {
        delete clone.admin_rate;
        delete clone.location_rates;
      }
      return clone;
    });

    return res.json({
      success: true,
      data: items,
      allow_optional_selection: settings.allow_optional_bom_selection,
      show_rates: settings.show_bom_rates_to_epc,
    });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_boms:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch BOM items' });
  }
};

/* ── Step 6: Allowed GST Options & Settings ──────────────────────────────── */
exports.get_eligible_gst = async (req, res) => {
  try {
    const settings = await getSettings();
    return res.json({
      success: true,
      data: {
        gst_calculation_method: settings.gst_calculation_method || 'on_cost_plus_margin',
        default_gst_rate: settings.default_gst_rate !== undefined ? settings.default_gst_rate : 18,
        allowed_gst_options: settings.allowed_gst_options || [0, 5, 12, 13.8, 18],
        allowed_margin_types: settings.allowed_margin_types || 'both',
        min_margin: 0,
        max_margin: 10000000,
        min_margin_percentage: 0,
        max_margin_percentage: 100,
      },
    });
  } catch (err) {
    console.error('[estimator.handler] get_eligible_gst:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch GST settings' });
  }
};

/* ── Step 7: Authoritative Margin Calculation ────────────────────────────── */
exports.calculate = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.is_enabled) {
      return res.status(403).json({ success: false, message: 'Estimator is currently disabled.' });
    }

    const {
      kit,
      quantity = 1,
      bom_items = [],
      location = {},
      delivery = {},
      margin = { type: 'amount', value: 0 },
      gst_settings = {},
    } = req.body;

    if (!kit || (!kit.selling_price && kit.selling_price !== 0)) {
      return res.status(400).json({ success: false, message: 'Kit information with selling_price is required' });
    }

    // Validate margin against Admin constraints
    const marginType = margin.type === 'percentage' ? 'percentage' : 'amount';
    const marginVal = Number(margin.value || 0);

    if (settings.allowed_margin_types !== 'both' && marginType !== settings.allowed_margin_types) {
      return res.status(400).json({
        success: false,
        message: `Only ${settings.allowed_margin_types} margin input is permitted by Admin`,
      });
    }

    if (marginVal < 0) {
      return res.status(400).json({ success: false, message: 'Margin cannot be negative' });
    }

    // Validate margin against Kit-specific max_margin (configured by Admin via Quick Filters)
    const kitMaxMargin = Number(kit.max_margin || 0);
    if (kitMaxMargin > 0) {
      const kitBasePrice = Number(kit.selling_price || kit.base_price || 0);
      const effectiveMarginAmt = marginType === 'percentage'
        ? Math.round((kitBasePrice * marginVal) / 100)
        : marginVal;

      if (effectiveMarginAmt > kitMaxMargin) {
        return res.status(400).json({
          success: false,
          message: `Margin cannot exceed the maximum allowed limit of ₹${kitMaxMargin.toLocaleString('en-IN')} for this kit`,
        });
      }
    }

    // If optional selection is not allowed, ensure mandatory items are present
    let itemsToCompute = bom_items;
    if (!settings.allow_optional_bom_selection) {
      // Fetch mandatory BOMs from DB if not provided
      const mandatoryBoms = await ProjectBomItem.find({
        deleted_at: null,
        is_active: true,
        is_mandatory: true,
      }).lean();
      // Ensure all mandatory items are included
      const providedIds = new Set(bom_items.map(b => String(b._id || b.bom_id)));
      mandatoryBoms.forEach(mb => {
        if (!providedIds.has(String(mb._id))) {
          itemsToCompute.push(mb);
        }
      });
    }

    // Use admin-configured GST method if not specified or override
    const effectiveGstSettings = {
      method: settings.gst_calculation_method || 'on_cost_plus_margin',
      rate: gst_settings.rate !== undefined ? Number(gst_settings.rate) : (settings.default_gst_rate || 18),
    };

    const result = calculateMarginEstimate({
      kit,
      quantity,
      bom_items: itemsToCompute,
      location,
      delivery,
      margin: { type: marginType, value: marginVal },
      gst_settings: effectiveGstSettings,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[estimator.handler] calculate error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Calculation failed' });
  }
};

/* ── Step 8: Compare Solutions Side-by-Side ──────────────────────────────── */
exports.compare_solutions = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.allow_comparison) {
      return res.status(403).json({ success: false, message: 'Solution comparison is disabled by Admin.' });
    }

    const { solutions = [], margin = { type: 'amount', value: 0 }, gst_settings = {}, location = {}, delivery = {} } = req.body;
    const maxCount = settings.max_comparison_count || 3;

    if (!Array.isArray(solutions) || solutions.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 solutions are required for comparison' });
    }

    if (solutions.length > maxCount) {
      return res.status(400).json({ success: false, message: `Maximum ${maxCount} solutions can be compared at once` });
    }

    const effectiveGstSettings = {
      method: settings.gst_calculation_method || 'on_cost_plus_margin',
      rate: gst_settings.rate !== undefined ? Number(gst_settings.rate) : (settings.default_gst_rate || 18),
    };

    const results = solutions.map((item, idx) => {
      const calculation = calculateMarginEstimate({
        kit: item.kit,
        quantity: item.quantity || 1,
        bom_items: item.bom_items || [],
        location,
        delivery,
        margin,
        gst_settings: effectiveGstSettings,
      });

      return {
        solution_index: idx,
        solution_id: item.kit?._id,
        solution_name: item.kit?.name,
        brand_name: item.kit?.brand_name,
        capacity_kw: item.kit?.capacity_kw,
        calculation,
      };
    });

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[estimator.handler] compare_solutions error:', err.message);
    return res.status(500).json({ success: false, message: 'Comparison failed' });
  }
};

/* ── Saved Estimates CRUD ─────────────────────────────────────────────────── */

exports.save_estimate = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.allow_save_estimates) {
      return res.status(403).json({ success: false, message: 'Saving estimates is currently disabled.' });
    }

    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to save estimates' });
    }

    const body = req.body;
    const {
      title,
      solution,
      quantity = 1,
      bom_items = [],
      location = {},
      delivery = {},
      margin = { type: 'amount', value: 0 },
      gst_settings = {},
      industry_type_snapshot,
      project_type_snapshot,
      project_sub_type_snapshot,
      notes,
    } = body;

    if (!solution || !solution._id) {
      return res.status(400).json({ success: false, message: 'Selected solution / kit is required' });
    }

    // Lookup EPC user account
    const epcUser = await EpcAccount.findById(userId).lean();
    const epcSnapshot = epcUser ? {
      company_name: epcUser.name || 'EPC Partner',
      contact_person: epcUser.contact_person || epcUser.name,
      email: epcUser.email,
      mobile: epcUser.whatsapp || epcUser.mobile,
    } : null;

    // Lookup Franchisee if linked
    let franchiseeSnapshot = null;
    let franchiseeId = null;
    if (epcUser?.onboarded_by_reseller_id) {
      franchiseeId = epcUser.onboarded_by_reseller_id;
      const resDoc = await Reseller.findById(franchiseeId).select('business_name email mobile').lean();
      if (resDoc) {
        franchiseeSnapshot = {
          business_name: resDoc.business_name,
          email: resDoc.email,
          mobile: resDoc.mobile,
        };
      }
    }

    // Run authoritative calculation
    const effectiveGstSettings = {
      method: settings.gst_calculation_method || 'on_cost_plus_margin',
      rate: gst_settings.rate !== undefined ? Number(gst_settings.rate) : (settings.default_gst_rate || 18),
    };

    const calcResult = calculateMarginEstimate({
      kit: solution,
      quantity,
      bom_items,
      location,
      delivery,
      margin,
      gst_settings: effectiveGstSettings,
    });

    const estimateNumber = await getNextEstimateNumber(settings.estimate_number_prefix);
    const validityDays = settings.estimate_validity_days || 30;
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    const doc = {
      estimate_number: estimateNumber,
      title: title || `Estimate for ${solution.name || 'Solar Kit'}`,
      status: 'saved',
      epc_id: userId,
      epc_snapshot: epcSnapshot,
      franchisee_id: franchiseeId,
      franchisee_snapshot: franchiseeSnapshot,
      created_by: userId,
      created_by_role: 'epc',

      industry_type_snapshot,
      project_type_snapshot,
      project_sub_type_snapshot,

      solution_id: solution._id,
      solution_type: solution.type || 'combo_kit',
      solution_snapshot: {
        _id: solution._id,
        name: solution.name,
        sku: solution.sku,
        brand_name: solution.brand_name,
        capacity_kw: solution.capacity_kw,
        base_components: solution.base_components,
      },
      kit_capacity_kw: calcResult.kit_capacity_kw,
      quantity: calcResult.quantity,
      total_kw: calcResult.total_kw,
      kit_unit_price: calcResult.kit_unit_price,
      kit_total_price: calcResult.kit_total_price,

      bom_snapshot: calcResult.bom_items,
      bom_total_cost: calcResult.bom_total_cost,

      delivery_snapshot: { ...location, ...delivery },
      gst_calculation_method: calcResult.gst_calculation_method,
      gst_rate: calcResult.gst_rate,
      gst_snapshot: {
        taxable_base: calcResult.taxable_base,
        gst_amount: calcResult.gst_amount,
        rate: calcResult.gst_rate,
      },

      margin_input_type: calcResult.margin_input_type,
      margin_percentage: calcResult.margin_percentage,
      margin_amount: calcResult.margin_amount,

      project_cost_before_gst: calcResult.project_cost_before_gst,
      gst_amount: calcResult.gst_amount,
      total_project_cost: calcResult.total_project_cost,
      estimated_customer_price: calcResult.estimated_customer_price,
      profit_amount: calcResult.profit_amount,

      valid_until: validUntil,
      notes: notes || null,
    };

    const savedDoc = await EpcMarginEstimate.create(doc);

    return res.status(201).json({
      success: true,
      message: 'Estimate saved successfully',
      data: savedDoc,
    });
  } catch (err) {
    console.error('[estimator.handler] save_estimate error:', err.message);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save estimate' });
  }
};

exports.list_my_estimates = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = { epc_id: userId, deleted_at: null };

    if (status) filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { estimate_number: { $regex: q, $options: 'i' } },
        { title: { $regex: q, $options: 'i' } },
        { 'solution_snapshot.name': { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [items, total] = await Promise.all([
      EpcMarginEstimate.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      EpcMarginEstimate.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[estimator.handler] list_my_estimates:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch estimates' });
  }
};

exports.get_estimate_detail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid estimate ID' });
    }

    const estimate = await EpcMarginEstimate.findOne({
      _id: id,
      epc_id: userId,
      deleted_at: null,
    }).lean();

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    return res.json({ success: true, data: estimate });
  } catch (err) {
    console.error('[estimator.handler] get_estimate_detail:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch estimate' });
  }
};

exports.update_estimate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);

    const estimate = await EpcMarginEstimate.findOne({
      _id: id,
      epc_id: userId,
      deleted_at: null,
    });

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    if (estimate.status === 'quote_generated') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update estimate after quote has already been generated',
      });
    }

    const { title, notes, margin } = req.body;
    if (title) estimate.title = title.trim();
    if (notes !== undefined) estimate.notes = notes;

    // Recalculate if margin is updated
    if (margin && margin.value !== undefined) {
      const settings = await getSettings();
      const calcResult = calculateMarginEstimate({
        kit: {
          selling_price: estimate.kit_unit_price,
          capacity_kw: estimate.kit_capacity_kw,
        },
        quantity: estimate.quantity,
        bom_items: estimate.bom_snapshot,
        delivery: { delivery_cost: estimate.delivery_snapshot?.delivery_cost || 0 },
        margin: {
          type: margin.type || estimate.margin_input_type,
          value: Number(margin.value),
        },
        gst_settings: {
          method: estimate.gst_calculation_method,
          rate: estimate.gst_rate,
        },
      });

      estimate.margin_input_type = calcResult.margin_input_type;
      estimate.margin_percentage = calcResult.margin_percentage;
      estimate.margin_amount = calcResult.margin_amount;
      estimate.gst_amount = calcResult.gst_amount;
      estimate.project_cost_before_gst = calcResult.project_cost_before_gst;
      estimate.estimated_customer_price = calcResult.estimated_customer_price;
      estimate.profit_amount = calcResult.profit_amount;
    }

    await estimate.save();

    return res.json({
      success: true,
      message: 'Estimate updated successfully',
      data: estimate,
    });
  } catch (err) {
    console.error('[estimator.handler] update_estimate:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update estimate' });
  }
};

exports.delete_estimate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);

    const estimate = await EpcMarginEstimate.findOne({
      _id: id,
      epc_id: userId,
      deleted_at: null,
    });

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    if (estimate.status === 'quote_generated') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an estimate that has already been converted into a quote',
      });
    }

    estimate.deleted_at = new Date();
    await estimate.save();

    return res.json({ success: true, message: 'Estimate deleted successfully' });
  } catch (err) {
    console.error('[estimator.handler] delete_estimate:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete estimate' });
  }
};

exports.recalculate_estimate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getAuthUserId(req);

    const estimate = await EpcMarginEstimate.findOne({
      _id: id,
      epc_id: userId,
      deleted_at: null,
    }).lean();

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    // Fetch live kit price from DB
    const liveKit = await ComboKit.findById(estimate.solution_id).lean();
    const kitUnitPrice = liveKit ? Number(liveKit.selling_price || estimate.kit_unit_price) : estimate.kit_unit_price;

    // Fetch live BOM rates for items
    const bomIds = (estimate.bom_snapshot || []).map(b => b.bom_id).filter(Boolean);
    const liveBoms = await ProjectBomItem.find({ _id: { $in: bomIds }, deleted_at: null }).lean();
    const liveBomMap = new Map(liveBoms.map(b => [String(b._id), b]));

    const updatedBomItems = (estimate.bom_snapshot || []).map(item => {
      const live = liveBomMap.get(String(item.bom_id));
      if (live) {
        return {
          ...live,
          quantity: item.multiplier_or_qty,
        };
      }
      return item;
    });

    const settings = await getSettings();
    const recalculated = calculateMarginEstimate({
      kit: {
        selling_price: kitUnitPrice,
        capacity_kw: estimate.kit_capacity_kw,
      },
      quantity: estimate.quantity,
      bom_items: updatedBomItems,
      delivery: { delivery_cost: estimate.delivery_snapshot?.delivery_cost || 0 },
      margin: {
        type: estimate.margin_input_type,
        value: estimate.margin_amount,
      },
      gst_settings: {
        method: settings.gst_calculation_method || estimate.gst_calculation_method,
        rate: estimate.gst_rate,
      },
    });

    return res.json({
      success: true,
      data: {
        saved_estimate: estimate,
        current_rates_calculation: recalculated,
        price_difference: round2(recalculated.estimated_customer_price - estimate.estimated_customer_price),
      },
    });
  } catch (err) {
    console.error('[estimator.handler] recalculate_estimate:', err.message);
    return res.status(500).json({ success: false, message: 'Recalculation failed' });
  }
};

/* ── Estimate to Quote Conversion ─────────────────────────────────────────── */

exports.generate_quote_from_estimate = async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings.allow_generate_quotes) {
      return res.status(403).json({ success: false, message: 'Quote generation from estimates is disabled.' });
    }

    const { id } = req.params;
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required to generate quote' });
    }

    const query = {
      _id: id,
      deleted_at: null,
    };
    if (userId) {
      query.epc_id = userId;
    }

    const estimate = await EpcMarginEstimate.findOne(query);

    if (!estimate) {
      return res.status(404).json({ success: false, message: 'Estimate not found' });
    }

    if (estimate.status === 'quote_generated' && estimate.quote_id) {
      return res.status(400).json({
        success: false,
        message: 'A quote has already been generated from this estimate',
        quote_id: estimate.quote_id,
      });
    }

    // Generate formal quote number: SK-QT-YYYY-XXXXXX
    const quoteNumber = await getNextQuoteNumber();
    const quoteSettingsDoc = await QuoteSettings.findOne().lean();
    const validityDays = quoteSettingsDoc?.quote_validity_days || 15;
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    // Build items array for epc_quotes
    const quoteItems = [
      {
        item_type: 'combo_kit',
        product_id: estimate.solution_id,
        name: estimate.solution_snapshot?.name || 'Solar Combo Kit',
        sku: estimate.solution_snapshot?.sku || 'SK-KIT',
        quantity: estimate.quantity || 1,
        capacity_kw: estimate.kit_capacity_kw || 0,
        unit_price_paise: Math.round(estimate.kit_unit_price * 100),
        total_price_paise: Math.round(estimate.kit_total_price * 100),
      },
    ];

    // Add BOM items to quote items
    (estimate.bom_snapshot || []).forEach(b => {
      quoteItems.push({
        item_type: 'bom_item',
        product_id: b.bom_id,
        name: `BOM: ${b.name}`,
        sku: b.code,
        quantity: b.multiplier_or_qty || 1,
        unit_price_paise: Math.round(b.applied_rate * 100),
        total_price_paise: Math.round(b.amount * 100),
      });
    });

    const validEpcId = mongoose.Types.ObjectId.isValid(userId) ? userId : new mongoose.Types.ObjectId();
    const validComboKitId = mongoose.Types.ObjectId.isValid(estimate.solution_id)
      ? estimate.solution_id
      : new mongoose.Types.ObjectId();

    const newQuote = await EpcQuote.create({
      quote_number: quoteNumber,
      status: 'generated',
      quote_source: 'epc_self_service',
      estimate_id: estimate._id,
      created_by: validEpcId,
      created_by_role: 'epc',
      epc_id: validEpcId,
      epc_snapshot: estimate.epc_snapshot,
      franchisee_id: estimate.franchisee_id || null,
      franchisee_snapshot: estimate.franchisee_snapshot || null,

      // Required fields by EpcQuote schema
      combo_kit_id: validComboKitId,
      combo_kit_snapshot: estimate.solution_snapshot || null,
      kit_capacity_kw: estimate.kit_capacity_kw || 0,
      quantity: estimate.quantity || 1,
      total_kw: estimate.total_kw || (estimate.kit_capacity_kw || 0) * (estimate.quantity || 1),
      delivery_type: 'district',
      territory: {
        district_id: mongoose.Types.ObjectId.isValid(estimate.delivery_snapshot?.district_id) ? estimate.delivery_snapshot?.district_id : null,
        district_name: estimate.delivery_snapshot?.district_name || null,
      },

      industry_type_snapshot: estimate.industry_type_snapshot || null,
      project_type_snapshot: estimate.project_type_snapshot || null,

      price_per_kit_paise: Math.round(estimate.kit_unit_price * 100),
      product_subtotal_paise: Math.round(estimate.kit_total_price * 100),
      delivery_charges_paise: Math.round((estimate.delivery_snapshot?.delivery_cost || 0) * 100),
      taxable_amount_paise: Math.round(estimate.project_cost_before_gst * 100),
      gst_rate: estimate.gst_rate || 0,
      gst_amount_paise: Math.round(estimate.gst_amount * 100),
      total_amount_paise: Math.round(estimate.estimated_customer_price * 100),

      items: quoteItems,
      financials: {
        kit_total_paise: Math.round(estimate.kit_total_price * 100),
        bom_total_paise: Math.round(estimate.bom_total_cost * 100),
        delivery_total_paise: Math.round((estimate.delivery_snapshot?.delivery_cost || 0) * 100),
        subtotal_paise: Math.round(estimate.project_cost_before_gst * 100),
        margin_paise: Math.round(estimate.margin_amount * 100),
        gst_rate: estimate.gst_rate,
        gst_amount_paise: Math.round(estimate.gst_amount * 100),
        total_customer_price_paise: Math.round(estimate.estimated_customer_price * 100),
      },
      valid_from: new Date(),
      valid_until: expiresAt,
      notes: `Generated from Margin Estimate ${estimate.estimate_number}`,
    });

    // Update estimate
    estimate.status = 'quote_generated';
    estimate.quote_id = newQuote._id;
    await estimate.save();

    return res.status(201).json({
      success: true,
      message: 'Quote generated successfully from estimate',
      data: {
        quote_id: newQuote._id,
        quote_number: newQuote.quote_number,
        estimate_id: estimate._id,
      },
    });
  } catch (err) {
    console.error('[estimator.handler] generate_quote_from_estimate error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Quote generation failed' });
  }
};

/* ── Dashboard Stats ──────────────────────────────────────────────────────── */

exports.get_estimates_dashboard_stats = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const epcObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const [total, saved, converted, pipelineAgg] = await Promise.all([
      EpcMarginEstimate.countDocuments({ epc_id: userId, deleted_at: null }),
      EpcMarginEstimate.countDocuments({ epc_id: userId, status: 'saved', deleted_at: null }),
      EpcMarginEstimate.countDocuments({ epc_id: userId, status: 'quote_generated', deleted_at: null }),
      EpcMarginEstimate.aggregate([
        { $match: { epc_id: epcObjectId, deleted_at: null } },
        {
          $group: {
            _id: null,
            total_estimated_value: { $sum: '$estimated_customer_price' },
            total_project_cost: { $sum: '$total_project_cost' },
            total_profit: { $sum: '$profit_amount' },
            total_kw: { $sum: '$total_kw' },
          },
        },
      ]),
    ]);

    const stats = pipelineAgg[0] || {
      total_estimated_value: 0,
      total_project_cost: 0,
      total_profit: 0,
      total_kw: 0,
    };

    return res.json({
      success: true,
      data: {
        total_estimates: total,
        active_saved: saved,
        quotes_generated: converted,
        total_estimated_value: round2(stats.total_estimated_value),
        total_project_cost: round2(stats.total_project_cost),
        total_profit: round2(stats.total_profit),
        total_kw: round2(stats.total_kw),
      },
    });
  } catch (err) {
    console.error('[estimator.handler] get_estimates_dashboard_stats:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};
