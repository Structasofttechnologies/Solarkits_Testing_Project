/**
 * estimator.admin.handler.js — Admin controller for Know My Margin (KMM).
 *
 * Provides CRUD for:
 *   - Project BOM items (project_bom_items)
 *   - BOM Rate audit history (bom_rate_history)
 *   - Global Estimator settings (estimator_settings)
 */

'use strict';

const mongoose = require('mongoose');
const {
  ProjectBomItem,
  BomRateHistory,
  EstimatorSettings,
} = require('../models/india_solarshop_db');

const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
} = require('../models/core_db');

const CoreComboKit = require('../../solarshop-india/models/india_core_db/combo_kits.schema');
const IndiaComboKit = require('../../solarshop-india/models/india_solarshop_db/combo_kits.schema');
const SolarKit = require('../../solarshop-india/models/india_core_db/solar_kits.schema');

/* ── BOM Items CRUD ──────────────────────────────────────────────────────── */

exports.list_bom_items = async (req, res) => {
  try {
    const {
      industry_type_id,
      industry_type_name,
      category_name,
      subcategory_name,
      system_type_name,
      project_range_name,
      project_category_id,
      project_subcategory_id,
      rate_type,
      is_active,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = { deleted_at: null };

    if (industry_type_id) filter.industry_type_id = industry_type_id;
    if (industry_type_name && industry_type_name !== 'all') filter.industry_type_name = industry_type_name;
    if (category_name && category_name !== 'all') filter.category_name = category_name;
    if (subcategory_name && subcategory_name !== 'all') filter.subcategory_name = subcategory_name;
    if (system_type_name && system_type_name !== 'all') filter.system_type_name = system_type_name;
    if (project_range_name && project_range_name !== 'all') filter.project_range_name = project_range_name;
    if (project_category_id) filter.project_category_id = project_category_id;
    if (project_subcategory_id) filter.project_subcategory_id = project_subcategory_id;
    if (rate_type && rate_type !== 'all') filter.rate_type = rate_type;
    if (is_active !== undefined && is_active !== 'all') filter.is_active = is_active === 'true' || is_active === true;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [items, total] = await Promise.all([
      ProjectBomItem.find(filter)
        .sort({ display_order: 1, created_at: -1 })
        .skip(skip)
        .limit(take)
        .lean(),
      ProjectBomItem.countDocuments(filter),
    ]);

    return res.json({
      status: 'success',
      data: items,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('[estimator.admin] list_bom_items:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch BOM items' });
  }
};

exports.get_bom_item = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid BOM item ID' });
    }

    const item = await ProjectBomItem.findOne({ _id: id, deleted_at: null }).lean();
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'BOM item not found' });
    }

    return res.json({ status: 'success', data: item });
  } catch (err) {
    console.error('[estimator.admin] get_bom_item:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch BOM item' });
  }
};

exports.create_bom_item = async (req, res) => {
  try {
    const body = req.body;

    if (!body.name || !body.code || !body.rate_type) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, code, and rate_type are required fields',
      });
    }

    // Check code uniqueness among active items
    const existing = await ProjectBomItem.findOne({
      code: body.code.trim().toUpperCase(),
      deleted_at: null,
    });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: `BOM item code '${body.code.toUpperCase()}' already exists`,
      });
    }

    const doc = {
      name: body.name.trim(),
      code: body.code.trim().toUpperCase(),
      description: body.description || null,
      industry_type_id: (body.industry_type_id && mongoose.Types.ObjectId.isValid(body.industry_type_id)) ? body.industry_type_id : null,
      project_category_id: (body.project_category_id && mongoose.Types.ObjectId.isValid(body.project_category_id)) ? body.project_category_id : null,
      project_subcategory_id: (body.project_subcategory_id && mongoose.Types.ObjectId.isValid(body.project_subcategory_id)) ? body.project_subcategory_id : null,
      industry_type_name: body.industry_type_name || null,
      category_name: body.category_name || null,
      subcategory_name: body.subcategory_name || null,
      system_type_name: body.system_type_name || null,
      project_range_name: body.project_range_name || null,
      apply_to_all_matching: body.apply_to_all_matching !== undefined ? Boolean(body.apply_to_all_matching) : true,
      eligible_kit_ids: Array.isArray(body.eligible_kit_ids) ? body.eligible_kit_ids : [],
      rate_type: body.rate_type,
      admin_rate: Number(body.admin_rate || 0),
      unit: body.unit || 'Nos',
      default_quantity: Number(body.default_quantity || 1),
      is_mandatory: body.is_mandatory !== undefined ? Boolean(body.is_mandatory) : true,
      is_included_in_kit: Boolean(body.is_included_in_kit),
      gst_applicable: body.gst_applicable !== undefined ? Boolean(body.gst_applicable) : true,
      gst_rate: Number(body.gst_rate !== undefined ? body.gst_rate : 18),
      visible_to_epc: body.visible_to_epc !== undefined ? Boolean(body.visible_to_epc) : true,
      location_rates: Array.isArray(body.location_rates) ? body.location_rates : [],
      eligible_kit_ids: Array.isArray(body.eligible_kit_ids) ? body.eligible_kit_ids : [],
      eligible_customized_kit_ids: Array.isArray(body.eligible_customized_kit_ids) ? body.eligible_customized_kit_ids : [],
      applicable_states: Array.isArray(body.applicable_states) ? body.applicable_states : [],
      applicable_districts: Array.isArray(body.applicable_districts) ? body.applicable_districts : [],
      display_order: Number(body.display_order || 0),
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      created_by: req.user?.id || null,
      updated_by: req.user?.id || null,
    };

    const newItem = await ProjectBomItem.create(doc);

    // Initial audit log entry
    await BomRateHistory.create({
      bom_id: newItem._id,
      old_rate: 0,
      new_rate: newItem.admin_rate,
      rate_type: newItem.rate_type,
      location_rules_snapshot: newItem.location_rates,
      reason: 'Initial creation',
      updated_by: req.user?.id || null,
    });

    return res.status(201).json({
      status: 'success',
      message: 'BOM item created successfully',
      data: newItem,
    });
  } catch (err) {
    console.error('[estimator.admin] create_bom_item:', err.message);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to create BOM item' });
  }
};

exports.update_bom_item = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid BOM item ID' });
    }

    const current = await ProjectBomItem.findOne({ _id: id, deleted_at: null });
    if (!current) {
      return res.status(404).json({ status: 'error', message: 'BOM item not found' });
    }

    const body = req.body;

    // Check code collision if code updated
    if (body.code && body.code.trim().toUpperCase() !== current.code) {
      const codeExists = await ProjectBomItem.findOne({
        code: body.code.trim().toUpperCase(),
        _id: { $ne: id },
        deleted_at: null,
      });
      if (codeExists) {
        return res.status(409).json({
          status: 'error',
          message: `BOM item code '${body.code.toUpperCase()}' already exists`,
        });
      }
    }

    const oldRate = current.admin_rate;
    const newRate = body.admin_rate !== undefined ? Number(body.admin_rate) : oldRate;

    // Record rate change if rate or location_rates modified
    const rateChanged = oldRate !== newRate || body.location_rates !== undefined;
    if (rateChanged) {
      await BomRateHistory.create({
        bom_id: current._id,
        old_rate: oldRate,
        new_rate: newRate,
        rate_type: body.rate_type || current.rate_type,
        location_rules_snapshot: body.location_rates || current.location_rates,
        reason: body.rate_change_reason || 'Admin rate update',
        updated_by: req.user?.id || null,
      });
    }

    // Apply updates
    const updatable = [
      'name', 'code', 'description', 'industry_type_id', 'project_category_id',
      'project_subcategory_id', 'industry_type_name', 'category_name',
      'subcategory_name', 'system_type_name', 'project_range_name',
      'apply_to_all_matching', 'eligible_kit_ids',
      'rate_type', 'admin_rate', 'unit', 'default_quantity',
      'is_mandatory', 'is_included_in_kit', 'gst_applicable', 'gst_rate', 'visible_to_epc',
      'location_rates', 'eligible_customized_kit_ids',
      'applicable_states', 'applicable_districts', 'display_order', 'is_active',
    ];

    updatable.forEach(key => {
      if (body[key] !== undefined) {
        if (key === 'code') current.code = body.code.trim().toUpperCase();
        else if (key === 'name') current.name = body.name.trim();
        else if (key === 'industry_type_id' || key === 'project_category_id' || key === 'project_subcategory_id') {
          current[key] = (body[key] && mongoose.Types.ObjectId.isValid(body[key])) ? body[key] : null;
        } else current[key] = body[key];
      }
    });

    current.updated_by = req.user?.id || null;
    await current.save();

    return res.json({
      status: 'success',
      message: 'BOM item updated successfully',
      data: current,
    });
  } catch (err) {
    console.error('[estimator.admin] update_bom_item:', err.message);
    return res.status(500).json({ status: 'error', message: err.message || 'Failed to update BOM item' });
  }
};

exports.toggle_bom_status = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ProjectBomItem.findOne({ _id: id, deleted_at: null });
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'BOM item not found' });
    }

    item.is_active = !item.is_active;
    item.updated_by = req.user?.id || null;
    await item.save();

    return res.json({
      status: 'success',
      message: `BOM item ${item.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { is_active: item.is_active },
    });
  } catch (err) {
    console.error('[estimator.admin] toggle_bom_status:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to toggle status' });
  }
};

exports.delete_bom_item = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ProjectBomItem.findOne({ _id: id, deleted_at: null });
    if (!item) {
      return res.status(404).json({ status: 'error', message: 'BOM item not found' });
    }

    item.deleted_at = new Date();
    item.updated_by = req.user?.id || null;
    await item.save();

    return res.json({
      status: 'success',
      message: 'BOM item deleted successfully',
    });
  } catch (err) {
    console.error('[estimator.admin] delete_bom_item:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to delete BOM item' });
  }
};

exports.get_bom_rate_history = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await BomRateHistory.find({ bom_id: id })
      .sort({ created_at: -1 })
      .limit(50)
      .lean();

    return res.json({ status: 'success', data: history });
  } catch (err) {
    console.error('[estimator.admin] get_bom_rate_history:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch rate history' });
  }
};

/* ── Estimator Global Settings ───────────────────────────────────────────── */

exports.get_estimator_settings = async (req, res) => {
  try {
    let settings = await EstimatorSettings.findOne().lean();
    if (!settings) {
      settings = (await EstimatorSettings.create({})).toObject();
    }
    return res.json({ status: 'success', data: settings });
  } catch (err) {
    console.error('[estimator.admin] get_estimator_settings:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch estimator settings' });
  }
};

exports.update_estimator_settings = async (req, res) => {
  try {
    const body = req.body;
    const allowed = [
      'is_enabled', 'enabled_for_epc', 'enabled_for_franchisee',
      'allowed_margin_types', 'min_margin', 'max_margin',
      'min_margin_percentage', 'max_margin_percentage',
      'show_bom_rates_to_epc', 'allow_optional_bom_selection',
      'allow_comparison', 'max_comparison_count',
      'allow_save_estimates', 'allow_generate_quotes',
      'gst_calculation_method', 'default_gst_rate', 'allowed_gst_options',
      'estimate_number_prefix', 'estimate_validity_days',
      'eligible_industry_types',
    ];

    const update = {};
    allowed.forEach(f => { if (body[f] !== undefined) update[f] = body[f]; });
    if (req.user?.id) update.updated_by = req.user.id;

    const settings = await EstimatorSettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      status: 'success',
      message: 'Estimator settings updated successfully',
      data: settings,
    });
  } catch (err) {
    console.error('[estimator.admin] update_estimator_settings:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update estimator settings' });
  }
};

/* ── Project Hierarchy Options ───────────────────────────────────────────── */

exports.get_hierarchy_options = async (req, res) => {
  try {
    const [industryTypes, categories, subcategories, types, maps, ranges] = await Promise.all([
      IndustryType.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, name: 1 }).lean().catch(() => []),
      ProjectCategory.find({ deleted_at: null, is_active: true }).sort({ sort_order: 1, _id: 1 }).lean().catch(() => []),
      ProjectSubcategory.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ProjectType.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ProjectSubcategoryType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectRange.find({ deleted_at: null }).populate('unit_id').lean().catch(() => []),
    ]);

    // Build the full shopHierarchy tree just like /india/v1/shop/hierarchy
    const shopHierarchy = (industryTypes || []).map((ind) => {
      const indCats = (categories || []).filter((c) => String(c.industry_type_id || '') === String(ind._id));
      return {
        id: ind._id,
        name: ind.name || "Unnamed Industry",
        slug: ind.slug || null,
        categories: indCats.map((cat) => {
          const catSubs = (subcategories || []).filter((sc) => String(sc.category || '') === String(cat._id));
          return {
            id: cat._id,
            name: cat.name || "Unnamed Category",
            subcategories: catSubs.map((sc) => {
              const subMaps = (maps || []).filter((m) => String(m.subcategory || '') === String(sc._id));
              return {
                id: sc._id,
                name: sc.name || "Unnamed Subcategory",
                mappedTypes: subMaps.map((m) => {
                  const type = (types || []).find((t) => String(t._id) === String(m.type));
                  const typeRanges = (ranges || []).filter((r) => String(r.subcategory_type || '') === String(m._id));
                  return {
                    id: m._id,
                    type_id: type?._id,
                    name: type ? type.name : "Unknown Type",
                    ranges: typeRanges.map((r) => ({
                      id: r._id,
                      min_value: r.min_value ?? 0,
                      max_value: r.max_value ?? 0,
                      unit_symbol: r.unit_id?.symbol || "kW",
                      range_label: `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`,
                    })),
                  };
                }),
              };
            }),
          };
        }),
      };
    });

    return res.json({
      status: 'success',
      data: {
        industries: industryTypes || [],
        categories: categories || [],
        subcategories: subcategories || [],
        types: types || [],
        ranges: ranges || [],
        shopHierarchy,
      },
    });
  } catch (err) {
    console.error('[estimator.admin] get_hierarchy_options:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch hierarchy options' });
  }
};

/* ── Available ComboKits for BOM Assignment ──────────────────────────────── */

exports.get_available_kits = async (req, res) => {
  try {
    const {
      industry_type_name,
      category,
      sub_category,
      system_type,
      project_range,
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

      const cap = Number(k.capacity || k.capacity_kw || k.capacityKW || 0);

      formatted.push({
        _id: k._id,
        id: idStr,
        name: k.name || `Solar Kit ${cap} kW`,
        sku: k.sku || `SK-KIT-${idStr.slice(-6).toUpperCase()}`,
        capacity_kw: cap,
        selling_price: Number(k.selling_price_cached || k.selling_price || k.base_price_cached || 0),
        max_margin: Number(k.max_margin || 0),
        image: k.kit_image || (k.images && k.images[0]) || null,
        description: k.description || null,
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

    // In-memory filter based on search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter((k) => {
        return (
          (k.name || '').toLowerCase().includes(q) ||
          (k.sku || '').toLowerCase().includes(q) ||
          (k.description || '').toLowerCase().includes(q)
        );
      });
    }

    // In-memory filter based on quick filter names
    if (industry_type_name && industry_type_name !== 'all') {
      const sel = industry_type_name.toLowerCase();
      formatted = formatted.filter((k) => {
        const ind = (k.industryType || '').toLowerCase();
        return ind === sel || ind.includes(sel) || sel.includes(ind);
      });
    }

    if (category && category !== 'all') {
      const sel = category.toLowerCase();
      formatted = formatted.filter((k) => (k.category || '').toLowerCase() === sel);
    }

    if (sub_category && sub_category !== 'all') {
      const sel = sub_category.toLowerCase();
      formatted = formatted.filter((k) => (k.subCategory || '').toLowerCase() === sel);
    }

    if (system_type && system_type !== 'all') {
      const sel = system_type.toLowerCase();
      formatted = formatted.filter((k) => (k.projectType || '').toLowerCase() === sel);
    }

    if (project_range && project_range !== 'all') {
      const sel = project_range.toLowerCase();
      formatted = formatted.filter((k) => (k.projectRange || '').toLowerCase() === sel);
    }

    return res.json({
      status: 'success',
      data: formatted,
      total: formatted.length,
    });
  } catch (err) {
    console.error('[estimator.admin] get_available_kits:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch available combo kits' });
  }
};

/* ── Update Kit Maximum Margins ────────────────────────────────────────── */

exports.update_kits_max_margin = async (req, res) => {
  try {
    const { updates, kit_ids, max_margin } = req.body;

    // Mode 1: Bulk update array of kit_ids with uniform max_margin
    if (Array.isArray(kit_ids) && kit_ids.length > 0 && max_margin !== undefined) {
      const targetMargin = Math.max(0, Number(max_margin) || 0);
      const objectIds = kit_ids.filter(id => mongoose.Types.ObjectId.isValid(id));

      await Promise.all([
        IndiaComboKit.updateMany({ _id: { $in: objectIds } }, { $set: { max_margin: targetMargin } }),
        CoreComboKit.updateMany({ _id: { $in: objectIds } }, { $set: { max_margin: targetMargin } }),
      ]);

      return res.json({
        status: 'success',
        message: `Maximum margin ₹${targetMargin.toLocaleString('en-IN')} applied to ${objectIds.length} kits successfully`,
      });
    }

    // Mode 2: Individual updates list [{ id / kit_id, max_margin }, ...]
    if (Array.isArray(updates) && updates.length > 0) {
      const writeOpsIndia = [];
      const writeOpsCore = [];

      updates.forEach((u) => {
        const kId = u.kit_id || u.id || u._id;
        if (!kId || !mongoose.Types.ObjectId.isValid(kId)) return;
        const val = Math.max(0, Number(u.max_margin) || 0);

        writeOpsIndia.push({
          updateOne: {
            filter: { _id: kId },
            update: { $set: { max_margin: val } },
          },
        });
        writeOpsCore.push({
          updateOne: {
            filter: { _id: kId },
            update: { $set: { max_margin: val } },
          },
        });
      });

      if (writeOpsIndia.length > 0) {
        await Promise.all([
          IndiaComboKit.bulkWrite(writeOpsIndia).catch(() => {}),
          CoreComboKit.bulkWrite(writeOpsCore).catch(() => {}),
        ]);
      }

      return res.json({
        status: 'success',
        message: `Updated maximum margins for ${writeOpsIndia.length} kits successfully`,
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload. Provide updates array or kit_ids with max_margin',
    });
  } catch (err) {
    console.error('[estimator.admin] update_kits_max_margin:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to update kit maximum margins' });
  }
};

