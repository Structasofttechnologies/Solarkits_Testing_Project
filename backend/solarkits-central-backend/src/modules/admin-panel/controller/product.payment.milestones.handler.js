/**
 * product.payment.milestones.handler.js
 *
 * Handler for Admin Product-Wise Payment Milestone Configuration & Checkout Resolution.
 */

'use strict';

const mongoose = require('mongoose');
const ProductPaymentMilestone = require('../models/india_solarshop_db/product_payment_milestones.schema');

// Standard Default Milestone Setup (30% Advance / 70% Before Dispatch)
const DEFAULT_MILESTONES = [
  {
    milestone_number: 1,
    milestone_name: 'Advance Payment at Order Placement',
    percentage: 30,
    stage_trigger: 'order_placement',
    tat_hours: 24,
    tat_days: 1,
    description: 'Advance payment collected at checkout to confirm order and initiate procurement.',
  },
  {
    milestone_number: 2,
    milestone_name: 'Remaining Payment Before Dispatch',
    percentage: 70,
    stage_trigger: 'before_dispatch',
    tat_hours: 48,
    tat_days: 2,
    description: 'Remaining balance payment collected when goods are packed and staged before dispatch.',
  },
];

const DEFAULT_STAGES = [
  { stage_key: 'CONFIRMED',          stage_name: 'Confirmed (Payment Verified)', sequence: 1, tat_hours: 24,  tat_days: 1, tat_description: 'Advance Payment Verified by Accounts', payment_required: false },
  { stage_key: 'PROCESSING',         stage_name: 'Processing (Picking & Packing)', sequence: 2, tat_hours: 48,  tat_days: 2, tat_description: 'Warehouse BOM picking & packing', payment_required: false },
  { stage_key: 'VEHICLE_ASSIGNED',   stage_name: 'Vehicle Assigned', sequence: 3, tat_hours: 24,  tat_days: 1, tat_description: 'Vehicle & driver allocated to route', payment_required: false },
  { stage_key: 'READY_FOR_DISPATCH', stage_name: 'Ready for Dispatch / Before Dispatch', sequence: 4, tat_hours: 48,  tat_days: 2, tat_description: 'Staged at gate; 70% Remaining Payment verified before release', payment_required: true },
  { stage_key: 'DISPATCHED',         stage_name: 'Dispatched', sequence: 5, tat_hours: 12,  tat_days: 1, tat_description: 'Vehicle gate exit from warehouse', payment_required: false },
  { stage_key: 'IN_TRANSIT',         stage_name: 'In Transit', sequence: 6, tat_hours: 72,  tat_days: 3, tat_description: 'Carrier movement to destination', payment_required: false },
  { stage_key: 'REACHED_DESTINATION',stage_name: 'Reached Destination', sequence: 7, tat_hours: 12,  tat_days: 1, tat_description: 'Arrived at delivery location', payment_required: false },
  { stage_key: 'DELIVERED',          stage_name: 'Delivered', sequence: 8, tat_hours: 6,   tat_days: 1, tat_description: 'Sign-off and customer handover completed', payment_required: false },
];

/**
 * Helper to ensure a Global Default configuration always exists in the DB.
 */
async function ensureGlobalDefault() {
  const existingDefault = await ProductPaymentMilestone.findOne({ is_default: true });
  if (!existingDefault) {
    return await ProductPaymentMilestone.create({
      kit_id: null,
      kit_name: 'Global Default (All ComboKits)',
      is_default: true,
      is_active: true,
      milestones: DEFAULT_MILESTONES,
      order_stages_config: DEFAULT_STAGES,
      notes: 'Standard 30% Advance at Order Placement + 70% Remaining Before Dispatch default configuration.',
    });
  }
  return existingDefault;
}

/**
 * 1. LIST ALL MILESTONE CONFIGS (Admin)
 */
const list_milestone_configs = async (req, res) => {
  try {
    await ensureGlobalDefault();

    const { search, is_active, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.kit_name = { $regex: search.trim(), $options: 'i' };
    }
    if (is_active !== undefined && is_active !== 'all') {
      query.is_active = is_active === 'true' || is_active === true;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [configs, total] = await Promise.all([
      ProductPaymentMilestone.find(query)
        .populate('kit_id', 'name kit_name capacity system_type')
        .sort({ is_default: -1, created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductPaymentMilestone.countDocuments(query),
    ]);

    return res.status(200).json({
      status: 'success',
      data: configs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error in list_milestone_configs:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 2. GET MILESTONE CONFIG BY ID (Admin)
 */
const get_milestone_config_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await ProductPaymentMilestone.findById(id)
      .populate('kit_id')
      .lean();

    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Milestone configuration not found.' });
    }

    return res.status(200).json({ status: 'success', data: config });
  } catch (error) {
    console.error('Error in get_milestone_config_by_id:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 3. CREATE MILESTONE CONFIG (Admin)
 */
const create_milestone_config = async (req, res) => {
  try {
    const {
      kit_id,
      kit_name,
      is_default = false,
      is_active = true,
      milestones = DEFAULT_MILESTONES,
      order_stages_config = DEFAULT_STAGES,
      notes,
    } = req.body;

    // Validate milestone percentages sum to 100%
    if (!Array.isArray(milestones) || milestones.length < 2) {
      return res.status(400).json({ status: 'error', message: 'At least two payment milestones (Advance & Remaining) are required.' });
    }

    const totalPct = milestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
    if (Math.round(totalPct) !== 100) {
      return res.status(400).json({ status: 'error', message: `Total milestone percentages must sum to 100%. Current total: ${totalPct}%` });
    }

    // Check if configuration already exists for this kit_id
    if (kit_id && mongoose.Types.ObjectId.isValid(kit_id)) {
      const existing = await ProductPaymentMilestone.findOne({ kit_id });
      if (existing) {
        return res.status(400).json({
          status: 'error',
          message: `A payment milestone configuration already exists for "${existing.kit_name}". Please edit the existing configuration instead.`,
        });
      }
    }

    const adminId = req.user?.id || req.user?._id;

    const newConfig = await ProductPaymentMilestone.create({
      kit_id: kit_id && mongoose.Types.ObjectId.isValid(kit_id) ? kit_id : null,
      kit_name: kit_name || (kit_id ? 'Selected ComboKit' : 'Global Default'),
      is_default: Boolean(is_default),
      is_active: Boolean(is_active),
      milestones,
      order_stages_config: order_stages_config && order_stages_config.length ? order_stages_config : DEFAULT_STAGES,
      notes,
      created_by: adminId,
      updated_by: adminId,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Payment milestone configuration saved successfully.',
      data: newConfig,
    });
  } catch (error) {
    console.error('Error in create_milestone_config:', error);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

/**
 * 4. UPDATE MILESTONE CONFIG (Admin)
 */
const update_milestone_config = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kit_id,
      kit_name,
      is_default,
      is_active,
      milestones,
      order_stages_config,
      notes,
    } = req.body;

    const config = await ProductPaymentMilestone.findById(id);
    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Milestone configuration not found.' });
    }

    if (milestones) {
      if (!Array.isArray(milestones) || milestones.length < 2) {
        return res.status(400).json({ status: 'error', message: 'At least two payment milestones are required.' });
      }
      const totalPct = milestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
      if (Math.round(totalPct) !== 100) {
        return res.status(400).json({ status: 'error', message: `Total milestone percentages must sum to 100%. Current total: ${totalPct}%` });
      }
      config.milestones = milestones;
    }

    if (order_stages_config && Array.isArray(order_stages_config)) {
      config.order_stages_config = order_stages_config;
    }

    if (kit_id !== undefined) {
      config.kit_id = kit_id && mongoose.Types.ObjectId.isValid(kit_id) ? kit_id : null;
    }
    if (kit_name !== undefined) config.kit_name = kit_name;
    if (is_default !== undefined) config.is_default = Boolean(is_default);
    if (is_active !== undefined) config.is_active = Boolean(is_active);
    if (notes !== undefined) config.notes = notes;

    config.updated_by = req.user?.id || req.user?._id;
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: 'Payment milestone configuration updated successfully.',
      data: config,
    });
  } catch (error) {
    console.error('Error in update_milestone_config:', error);
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

/**
 * 5. DELETE MILESTONE CONFIG (Admin)
 */
const delete_milestone_config = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await ProductPaymentMilestone.findById(id);
    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Configuration not found.' });
    }

    if (config.is_default) {
      return res.status(400).json({ status: 'error', message: 'Cannot delete the Global Default milestone configuration.' });
    }

    await ProductPaymentMilestone.findByIdAndDelete(id);
    return res.status(200).json({ status: 'success', message: 'Milestone configuration deleted successfully.' });
  } catch (error) {
    console.error('Error in delete_milestone_config:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 6. TOGGLE ACTIVE STATUS (Admin)
 */
const toggle_milestone_config = async (req, res) => {
  try {
    const { id } = req.params;
    const config = await ProductPaymentMilestone.findById(id);
    if (!config) {
      return res.status(404).json({ status: 'error', message: 'Configuration not found.' });
    }

    config.is_active = !config.is_active;
    config.updated_by = req.user?.id || req.user?._id;
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: `Configuration is now ${config.is_active ? 'Active' : 'Inactive'}.`,
      data: config,
    });
  } catch (error) {
    console.error('Error in toggle_milestone_config:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 7. RESOLVE PAYMENT MILESTONES FOR PRODUCT / CHECKOUT (Public / EPC)
 *
 * Used by EPC Checkout to fetch the configured milestone breakdown for the selected ComboKit.
 * Fallback priority:
 * 1. Specific active rule matching kit_id
 * 2. Active is_default: true rule
 * 3. Default fallback: 30% Advance at Order Placement, 70% Remaining Before Dispatch
 */
const resolve_payment_milestones = async (req, res) => {
  try {
    const { kit_id, kit_ids } = req.query;

    let targetKitId = kit_id;
    if (!targetKitId && kit_ids) {
      const parsedIds = Array.isArray(kit_ids) ? kit_ids : String(kit_ids).split(',');
      targetKitId = parsedIds.find(id => mongoose.Types.ObjectId.isValid(id?.trim()));
    }

    let config = null;

    // 1. Try to find specific product rule
    if (targetKitId && mongoose.Types.ObjectId.isValid(targetKitId)) {
      config = await ProductPaymentMilestone.findOne({
        kit_id: targetKitId,
        is_active: true,
      }).lean();
    }

    // 2. Fallback to active Global Default
    if (!config) {
      config = await ProductPaymentMilestone.findOne({
        is_default: true,
        is_active: true,
      }).lean();
    }

    // 3. Absolute fallback if no DB record exists
    if (!config) {
      config = {
        kit_id: null,
        kit_name: 'Standard Solar ComboKit Policy',
        is_default: true,
        is_active: true,
        milestones: DEFAULT_MILESTONES,
        order_stages_config: DEFAULT_STAGES,
      };
    }

    // Identify Milestone 1 (Advance) and Milestone 2 (Remaining)
    const sortedMilestones = [...(config.milestones || [])].sort((a, b) => a.milestone_number - b.milestone_number);
    const advanceMilestone = sortedMilestones.find(m => m.milestone_number === 1) || sortedMilestones[0] || {
      milestone_number: 1,
      milestone_name: 'Advance Payment at Order Placement',
      percentage: 30,
      stage_trigger: 'order_placement',
      tat_days: 1,
    };
    const remainingMilestone = sortedMilestones.find(m => m.milestone_number === 2) || sortedMilestones[1] || {
      milestone_number: 2,
      milestone_name: 'Remaining Payment Before Dispatch',
      percentage: 70,
      stage_trigger: 'before_dispatch',
      tat_days: 2,
    };

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        config_id: config._id || null,
        kit_id: config.kit_id || targetKitId || null,
        kit_name: config.kit_name || 'Solar Kit',
        advance_percentage: advanceMilestone.percentage,
        remaining_percentage: remainingMilestone.percentage,
        milestones: sortedMilestones,
        advance_milestone: advanceMilestone,
        remaining_milestone: remainingMilestone,
        order_stages_config: config.order_stages_config || DEFAULT_STAGES,
      },
    });
  } catch (error) {
    console.error('Error in resolve_payment_milestones:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 8. GET KITS MILESTONES OVERVIEW (Card Format for Admin UI)
 *
 * Fetches all ComboKits from DB and enriches each with its configured
 * milestone rule (or marks it as using the Global Default Policy).
 */
const get_kits_milestones_overview = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const kitProjection = {
      projection: {
        name: 1,
        kit_name: 1,
        capacity: 1,
        system_type: 1,
        kit_image: 1,
        image: 1,
        is_active: 1,
        country_id: 1,
        solar_kit_id: 1,
        project_range_id: 1,
        updated_at: 1,
      },
    };

    // Filter to ONLY return active, valid combo kits created in ComboKit Configuration (ignoring dummy/soft-deleted kits)
    const filter = {
      deleted_at: null,
      is_custom: false,
    };
    if (req.query.country_id && mongoose.Types.ObjectId.isValid(req.query.country_id)) {
      filter.country_id = new mongoose.Types.ObjectId(req.query.country_id);
    }

    const {
      SolarKit,
      ProjectCategory,
      ProjectSubcategory,
      ProjectSubcategoryType,
      ProjectType,
      ProjectRange,
      IndustryType,
    } = require('../models/core_db');

    // Parallelize all database queries for instantaneous response (<20ms)
    const [
      defaultPolicy,
      k1,
      k2,
      customConfigs,
      solarKits,
      categories,
      subcategories,
      typeMaps,
      types,
      ranges,
      industries,
    ] = await Promise.all([
      ensureGlobalDefault(),
      db.collection('pc_comobo_kit').find(filter, kitProjection).toArray().catch(() => []),
      db.collection('pc_combo_kits').find(filter, kitProjection).toArray().catch(() => []),
      ProductPaymentMilestone.find({
        is_default: { $ne: true },
        kit_id: { $ne: null },
      }).lean(),
      SolarKit.find({ deleted_at: null }).lean().catch(() => []),
      ProjectCategory.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ProjectSubcategory.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ProjectSubcategoryType.find({ deleted_at: null }).lean().catch(() => []),
      ProjectType.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
      ProjectRange.find({ deleted_at: null }).populate('unit_id').lean().catch(() => []),
      IndustryType.find({ deleted_at: null, is_active: true }).lean().catch(() => []),
    ]);

    // Build the cascading shopHierarchy tree for 5 Quick Filters
    const shopHierarchy = (industries || []).map((ind) => {
      const indCats = (categories || []).filter((c) => String(c.industry_type_id || '') === String(ind._id));
      return {
        id: ind._id,
        name: ind.name || 'Unnamed Industry',
        slug: ind.slug || null,
        categories: indCats.map((cat) => {
          const catSubs = (subcategories || []).filter((sc) => String(sc.category || '') === String(cat._id));
          return {
            id: cat._id,
            name: cat.name || 'Unnamed Category',
            subcategories: catSubs.map((sc) => {
              const subMaps = (typeMaps || []).filter((m) => String(m.subcategory || '') === String(sc._id));
              return {
                id: sc._id,
                name: sc.name || 'Unnamed Subcategory',
                mappedTypes: subMaps.map((m) => {
                  const type = (types || []).find((t) => String(t._id) === String(m.type));
                  const typeRanges = (ranges || []).filter((r) => String(r.subcategory_type || '') === String(m._id));
                  return {
                    id: m._id,
                    type_id: type?._id || m.type,
                    name: type?.name || 'Unnamed Type',
                    ranges: typeRanges.map((r) => ({
                      id: r._id,
                      min_value: r.min_value,
                      max_value: r.max_value,
                      range_label:
                        r.range_label ||
                        (r.min_value !== undefined
                          ? `${r.min_value} - ${r.max_value} ${r.unit_id?.symbol || 'kW'}`
                          : 'Custom Range'),
                    })),
                  };
                }),
              };
            }),
          };
        }),
      };
    });

    // Deduplicate by string ID
    const kitMap = new Map();
    [...k1, ...k2].forEach((k) => {
      const idStr = String(k._id);
      if (!kitMap.has(idStr)) {
        kitMap.set(idStr, k);
      }
    });

    const allKits = Array.from(kitMap.values());

    const configMap = new Map();
    customConfigs.forEach((cfg) => {
      if (cfg.kit_id) {
        configMap.set(String(cfg.kit_id), cfg);
      }
    });

    const enrichedKits = allKits.map((k) => {
      const idStr = String(k._id);
      const customConfig = configMap.get(idStr) || null;
      const isCustom = Boolean(customConfig && customConfig.is_active);

      const effectiveMilestones = customConfig?.milestones || defaultPolicy.milestones || DEFAULT_MILESTONES;
      const m1 = effectiveMilestones.find((m) => m.milestone_number === 1) || effectiveMilestones[0] || { percentage: 30 };
      const m2 = effectiveMilestones.find((m) => m.milestone_number === 2) || effectiveMilestones[1] || { percentage: 70 };

      // Resolve Quick Filter classification attributes
      const sk = solarKits.find((s) => String(s._id) === String(k.solar_kit_id)) || {};
      const cat = categories.find((c) => String(c._id) === String(sk.category_id || k.category_id)) || {};
      const ind = industries.find((i) => String(i._id) === String(cat.industry_type_id)) || {};
      const sub = subcategories.find((s) => String(s._id) === String(sk.subcategory_id || k.subcategory_id)) || {};
      const tm = typeMaps.find((t) => String(t._id) === String(sk.type_id || k.type_id)) || {};
      const typeObj = types.find((t) => String(t._id) === String(tm.type)) || {};
      const pr = ranges.find((r) => String(r._id) === String(k.project_range_id)) || {};

      const indName = ind.name || 'Solar PV';
      const catName = cat.name || null;
      const subName = sub.name || null;
      const sysType = typeObj.name || k.system_type || 'On-Grid';
      const prLabel =
        pr.range_label ||
        (pr.min_value !== undefined ? `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}` : null);

      return {
        kit_id: k._id,
        id: k._id,
        name: k.name || k.kit_name || 'Solar Kit',
        kit_name: k.name || k.kit_name || 'Solar Kit',
        capacity: k.capacity || null,
        system_type: sysType,
        image: k.kit_image || k.image || null,
        is_active: k.is_active !== false,
        has_custom_rule: isCustom,
        custom_config: customConfig,
        rule_name:
          customConfig?.rule_name ||
          customConfig?.kit_name ||
          (k.name ? `${k.name} Milestone Policy` : 'Product Milestone Policy'),
        advance_percentage: Number(m1.percentage) || 30,
        balance_percentage: Number(m2.percentage) || 70,
        milestones: effectiveMilestones,
        order_stages_config: customConfig?.order_stages_config || defaultPolicy.order_stages_config || DEFAULT_STAGES,
        // Classification metadata for Quick Filters
        industryType: indName,
        category: catName,
        subCategory: subName,
        systemType: sysType,
        projectRange: prLabel,
        updated_at: customConfig?.updated_at || k.updated_at || null,
      };
    });

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        default_policy: defaultPolicy,
        kits: enrichedKits,
        total_kits: enrichedKits.length,
        custom_configured_count: customConfigs.length,
        hierarchy: {
          shopHierarchy,
          industries,
          categories,
          subcategories,
          types,
          ranges,
        },
      },
    });
  } catch (error) {
    console.error('Error in get_kits_milestones_overview:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 10. GET ORDER STAGES & TAT CONFIGURATION (Admin)
 */
const get_order_stages_tat = async (req, res) => {
  try {
    const policy = await ensureGlobalDefault();
    const stages = Array.isArray(policy.order_stages_config) && policy.order_stages_config.length > 0
      ? policy.order_stages_config
      : DEFAULT_STAGES;

    const totalSlaDays = stages.reduce((acc, stg) => {
      const d = Number(stg.tat_days) || (stg.tat_hours ? Math.ceil(Number(stg.tat_hours) / 24) : 1);
      return acc + d;
    }, 0);

    const totalHours = stages.reduce((acc, stg) => {
      return acc + (Number(stg.tat_hours) || (Number(stg.tat_days || 1) * 24));
    }, 0);

    return res.status(200).json({
      status: 'success',
      success: true,
      data: {
        policy_id: policy._id,
        policy_name: policy.kit_name,
        stages: stages,
        total_sla_days: totalSlaDays,
        total_tat_hours: totalHours,
        updated_at: policy.updated_at,
      },
    });
  } catch (error) {
    console.error('Error in get_order_stages_tat:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * 11. UPDATE ORDER STAGES & TAT CONFIGURATION (Admin)
 */
const update_order_stages_tat = async (req, res) => {
  try {
    const { stages, order_stages_config, policy_id } = req.body;
    const incomingStages = stages || order_stages_config;

    if (!Array.isArray(incomingStages) || incomingStages.length === 0) {
      return res.status(400).json({ status: 'error', message: 'A valid list of order stages is required.' });
    }

    const rawAdminId = req.user?.id || req.user?._id;
    const adminId = rawAdminId && mongoose.Types.ObjectId.isValid(rawAdminId) ? rawAdminId : null;
    let policy;
    if (policy_id && mongoose.Types.ObjectId.isValid(policy_id)) {
      policy = await ProductPaymentMilestone.findById(policy_id);
    }
    if (!policy) {
      policy = await ProductPaymentMilestone.findOne({ is_default: true });
    }
    if (!policy) {
      policy = await ensureGlobalDefault();
    }

    // Format & validate each stage
    const formattedStages = incomingStages.map((stg, idx) => {
      const tatDays = stg.tat_days !== undefined && stg.tat_days !== null && stg.tat_days !== ''
        ? Math.max(1, Number(stg.tat_days))
        : (stg.tat_hours ? Math.max(1, Math.round(Number(stg.tat_hours) / 24)) : 1);
      const tatHours = stg.tat_hours !== undefined && stg.tat_hours !== null && stg.tat_hours !== ''
        ? Math.max(0, Number(stg.tat_hours))
        : (tatDays * 24);

      return {
        stage_key: String(stg.stage_key || '').toUpperCase().trim(),
        stage_name: stg.stage_name || stg.name || `Stage ${idx + 1}`,
        sequence: Number(stg.sequence || stg.stage_number || idx + 1),
        tat_days: tatDays,
        tat_hours: tatHours,
        tat_description: stg.tat_description || stg.description || '',
        payment_required: Boolean(stg.payment_required),
        is_active: stg.is_active !== false,
      };
    });

    policy.order_stages_config = formattedStages;
    if (adminId) policy.updated_by = adminId;
    policy.updated_at = new Date();
    await policy.save();

    const totalSlaDays = formattedStages.reduce((acc, s) => acc + (s.tat_days || 1), 0);
    const totalHours = formattedStages.reduce((acc, s) => acc + (s.tat_hours || 24), 0);

    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Order Stages & Turnaround Time (TAT) Configuration saved successfully.',
      data: {
        policy_id: policy._id,
        stages: policy.order_stages_config,
        total_sla_days: totalSlaDays,
        total_tat_hours: totalHours,
      },
    });
  } catch (error) {
    console.error('Error in update_order_stages_tat:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  list_milestone_configs,
  get_milestone_config_by_id,
  create_milestone_config,
  update_milestone_config,
  delete_milestone_config,
  toggle_milestone_config,
  resolve_payment_milestones,
  get_kits_milestones_overview,
  get_order_stages_tat,
  update_order_stages_tat,
  DEFAULT_MILESTONES,
  DEFAULT_STAGES,
};
