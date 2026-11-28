const mongoose = require('mongoose');
const { GovtTenderKit, WarehouseComboKit } = require('../models/india_solarshop_db');
let GeoLevel1 = null;
try {
  GeoLevel1 = require('../models/geolocation_db').GeoLevel1;
} catch (e) {}

/**
 * GET /admin-api/govt-tender-configs
 * Returns all configured government tender kits, filterable by state, status, search.
 */
const get_govt_tender_configs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      state_id = '',
      status = 'all',
      sort_by = 'priority',
      sort_order = 'asc'
    } = req.query;

    const query = { deleted_at: null };

    if (state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      query.state_id = new mongoose.Types.ObjectId(state_id);
    }

    if (status === 'active') {
      query.is_active = true;
    } else if (status === 'inactive') {
      query.is_active = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    if (sort_by === 'priority') {
      sortObj.priority = sort_order === 'desc' ? -1 : 1;
    } else if (sort_by === 'created_at') {
      sortObj.created_at = sort_order === 'desc' ? -1 : 1;
    } else {
      sortObj.created_at = -1;
    }

    const [total, docs] = await Promise.all([
      GovtTenderKit.countDocuments(query),
      GovtTenderKit.find(query)
        .populate({
          path: 'combo_kit_id',
          model: WarehouseComboKit,
          select: 'name description capacity kit_image image_url product_image is_active'
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    // Apply client search if provided
    let items = docs.map(doc => {
      const kit = doc.combo_kit_id || {};
      return {
        _id: doc._id,
        id: doc._id,
        state_id: doc.state_id,
        state_name: doc.state_name || 'All India',
        combo_kit_id: kit._id || doc.combo_kit_id,
        combo_kit_name: kit.name || kit.title || 'Combo Kit',
        capacity: kit.capacity || kit.system_capacity || kit.capacityKW || 0,
        display_name: doc.display_name || kit.name || 'Govt Tender Kit',
        tagline: doc.tagline || 'Specially Configured for Government Projects',
        tender_description: doc.tender_description,
        product_image: doc.product_image || kit.product_image || kit.kit_image || kit.image_url,
        product_video: doc.product_video,
        display_tag: doc.display_tag || 'Govt. Tender',
        secondary_tag: doc.secondary_tag || 'Bulk Supply',
        has_dcr_option: doc.has_dcr_option ?? true,
        priority: doc.priority || 1,
        is_active: doc.is_active,
        notes: doc.notes,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(i =>
        i.display_name.toLowerCase().includes(q) ||
        i.combo_kit_name.toLowerCase().includes(q) ||
        i.state_name.toLowerCase().includes(q) ||
        (i.tagline && i.tagline.toLowerCase().includes(q))
      );
    }

    // Stats
    const totalCount = await GovtTenderKit.countDocuments({ deleted_at: null });
    const totalActive = await GovtTenderKit.countDocuments({ deleted_at: null, is_active: true });
    const distinctStates = await GovtTenderKit.distinct('state_id', { deleted_at: null, is_active: true });

    return res.status(200).json({
      status: 'success',
      data: items,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        stats: {
          totalActive,
          distinctStatesCount: distinctStates.length,
          totalCount
        }
      }
    });
  } catch (error) {
    console.error('[govt_tender_kits.get_govt_tender_configs error]:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch government tender kit configs.' });
  }
};

/**
 * POST /admin-api/govt-tender-configs
 * Create or reactivate a Govt Tender configuration for a state & kit.
 */
const create_govt_tender_config = async (req, res) => {
  try {
    const {
      state_id,
      combo_kit_id,
      combo_kit_ids,
      display_name,
      tagline,
      tender_description,
      product_image,
      product_video,
      display_tag = 'Govt. Tender',
      secondary_tag = 'Bulk Supply',
      has_dcr_option = true,
      priority = 1,
      is_active = true,
      notes = null
    } = req.body;

    if (!state_id || !mongoose.Types.ObjectId.isValid(state_id)) {
      return res.status(400).json({ status: 'error', message: 'Valid State ID is required.' });
    }

    // Support both single combo_kit_id and multiple combo_kit_ids
    const rawKitIds = Array.isArray(combo_kit_ids) && combo_kit_ids.length > 0
      ? combo_kit_ids
      : (combo_kit_id ? [combo_kit_id] : []);

    const validKitIds = rawKitIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));

    if (validKitIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one valid Combo Kit ID is required.' });
    }

    // 1. Resolve State name
    let stateName = req.body.state_name || 'Selected State';
    try {
      if (GeoLevel1) {
        const stateDoc = await GeoLevel1.findById(state_id).lean();
        if (stateDoc && stateDoc.name) {
          stateName = stateDoc.name;
        }
      }
    } catch (e) {}

    const savedConfigs = [];

    // 2. Loop through each kit ID and create or update configuration
    for (const kitId of validKitIds) {
      const kitDoc = await WarehouseComboKit.findById(kitId).lean();
      if (!kitDoc) continue;

      const defaultDisplayName = `${kitDoc.capacity || kitDoc.capacityKW || ''} kW ${stateName} Govt Tender Kit`.trim();

      const existing = await GovtTenderKit.findOne({
        state_id: new mongoose.Types.ObjectId(state_id),
        combo_kit_id: new mongoose.Types.ObjectId(kitId)
      });

      if (existing) {
        existing.display_name = (display_name && validKitIds.length === 1) ? display_name.trim() : defaultDisplayName;
        existing.tagline = (tagline && tagline.trim()) || 'Specially Configured for Government Projects';
        existing.tender_description = tender_description || existing.tender_description;
        existing.product_image = product_image || existing.product_image || kitDoc.product_image || kitDoc.kit_image || kitDoc.image_url;
        existing.product_video = product_video !== undefined ? product_video : existing.product_video;
        existing.display_tag = (display_tag || 'Govt. Tender').trim();
        existing.secondary_tag = (secondary_tag || 'Bulk Supply').trim();
        existing.has_dcr_option = has_dcr_option !== undefined ? Boolean(has_dcr_option) : true;
        existing.priority = Math.max(1, parseInt(priority, 10) || 1);
        existing.is_active = is_active === true || is_active === 'true';
        existing.notes = notes || existing.notes;
        existing.state_name = stateName;
        existing.deleted_at = null; // Un-delete if soft-deleted
        existing.updated_at = new Date();
        await existing.save();
        savedConfigs.push(existing);
      } else {
        const newConfig = new GovtTenderKit({
          state_id: new mongoose.Types.ObjectId(state_id),
          state_name: stateName,
          combo_kit_id: new mongoose.Types.ObjectId(kitId),
          display_name: (display_name && validKitIds.length === 1) ? display_name.trim() : defaultDisplayName,
          tagline: (tagline && tagline.trim()) || 'Specially Configured for Government Projects',
          tender_description: tender_description || null,
          product_image: product_image || kitDoc.product_image || kitDoc.kit_image || kitDoc.image_url || null,
          product_video: product_video || null,
          display_tag: (display_tag || 'Govt. Tender').trim(),
          secondary_tag: (secondary_tag || 'Bulk Supply').trim(),
          has_dcr_option: has_dcr_option !== undefined ? Boolean(has_dcr_option) : true,
          priority: Math.max(1, parseInt(priority, 10) || 1),
          is_active: is_active === true || is_active === 'true',
          notes: notes || null,
          created_at: new Date(),
          updated_at: new Date()
        });
        await newConfig.save();
        savedConfigs.push(newConfig);
      }
    }

    return res.status(201).json({
      status: 'success',
      message: `${savedConfigs.length} Government Tender Kit(s) configured successfully for ${stateName}.`,
      data: savedConfigs.length === 1 ? savedConfigs[0] : savedConfigs
    });
  } catch (error) {
    console.error('[govt_tender_kits.create_govt_tender_config error]:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to save configuration.' });
  }
};

/**
 * PUT /admin-api/govt-tender-configs/:id
 * Update an existing config.
 */
const update_govt_tender_config = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid config ID is required.' });
    }

    const config = await GovtTenderKit.findById(id);
    if (!config || config.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Configuration record not found.' });
    }

    const {
      display_name,
      tagline,
      tender_description,
      product_image,
      product_video,
      display_tag,
      secondary_tag,
      has_dcr_option,
      priority,
      is_active,
      notes
    } = req.body;

    if (display_name !== undefined) config.display_name = display_name?.trim();
    if (tagline !== undefined) config.tagline = tagline?.trim();
    if (tender_description !== undefined) config.tender_description = tender_description;
    if (product_image !== undefined) config.product_image = product_image;
    if (product_video !== undefined) config.product_video = product_video;
    if (display_tag !== undefined) config.display_tag = display_tag?.trim();
    if (secondary_tag !== undefined) config.secondary_tag = secondary_tag?.trim();
    if (has_dcr_option !== undefined) config.has_dcr_option = Boolean(has_dcr_option);
    if (priority !== undefined) config.priority = Math.max(1, parseInt(priority, 10) || 1);
    if (is_active !== undefined) config.is_active = Boolean(is_active);
    if (notes !== undefined) config.notes = notes;

    config.updated_at = new Date();
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: 'Government Tender Kit configuration updated.',
      data: config
    });
  } catch (error) {
    console.error('[govt_tender_kits.update_govt_tender_config error]:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to update configuration.' });
  }
};

/**
 * PATCH /admin-api/govt-tender-configs/:id/toggle-status
 * Quick toggle active / inactive.
 */
const toggle_govt_tender_status = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid config ID is required.' });
    }

    const config = await GovtTenderKit.findById(id);
    if (!config || config.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Configuration record not found.' });
    }

    config.is_active = !config.is_active;
    config.updated_at = new Date();
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: `Status changed to ${config.is_active ? 'Active' : 'Inactive'}.`,
      is_active: config.is_active,
      data: config
    });
  } catch (error) {
    console.error('[govt_tender_kits.toggle_govt_tender_status error]:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to toggle status.' });
  }
};

/**
 * DELETE /admin-api/govt-tender-configs/:id
 * Soft delete config record.
 */
const delete_govt_tender_config = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Valid config ID is required.' });
    }

    const config = await GovtTenderKit.findById(id);
    if (!config || config.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Configuration record not found.' });
    }

    config.deleted_at = new Date();
    config.is_active = false;
    await config.save();

    return res.status(200).json({
      status: 'success',
      message: 'Government Tender Kit configuration removed.'
    });
  } catch (error) {
    console.error('[govt_tender_kits.delete_govt_tender_config error]:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Failed to delete configuration.' });
  }
};

module.exports = {
  get_govt_tender_configs,
  create_govt_tender_config,
  update_govt_tender_config,
  toggle_govt_tender_status,
  delete_govt_tender_config
};
