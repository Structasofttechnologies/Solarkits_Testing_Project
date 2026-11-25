const mongoose = require('mongoose');
const { OrderSetting, WarehouseKitActivation, WarehouseComboKit, SolarKit } = require('../../models/core_db');
const { CompanyWarehouse } = require('../../models/company_warehouse_db');
const { GeoLevel2 } = require('../../models/geolocation_db');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Helper to find a combo kit in either core_db or india_solarshop_db and populate solar_kit_id.
 */
const findAndPopulateComboKit = async (comboKitId) => {
  const objectId = new mongoose.Types.ObjectId(comboKitId);
  let kit = await WarehouseComboKit.findOne({ _id: objectId, deleted_at: null }).lean();
  if (!kit) {
    try {
      const { WarehouseComboKit: IndiaComboKit } = require('../../models/india_solarshop_db');
      kit = await IndiaComboKit.findOne({ _id: objectId, deleted_at: null }).lean();
    } catch (e) {}
  }

  if (kit && kit.solar_kit_id) {
    const solarKit = await SolarKit.findById(kit.solar_kit_id)
      .populate('category_id')
      .populate('subcategory_id')
      .populate({
        path: 'type_id',
        populate: {
          path: 'type',
          model: 'sys_filter_types'
        }
      })
      .lean();
    kit.solar_kit_id = solarKit;
  }

  if (kit && kit.project_range_id) {
    try {
      const { ProjectRange } = require('../../models/core_db');
      const pr = await ProjectRange.findById(kit.project_range_id).lean();
      if (pr) kit.project_range_id = pr;
    } catch (e) {}
  }

  return kit;
};

/**
 * GET /solarshop/order-settings
 * Query parameters: district_id, kit_type (combo / customize / bulk)
 */
const get_order_settings = async (req, res) => {
  try {
    const { district_id, kit_type } = req.query;

    if (!district_id || !kit_type) {
      return res.status(400).json({
        status: 'error',
        message: 'Both district_id and kit_type query parameters are required.'
      });
    }

    if (!['combo', 'customize', 'bulk'].includes(kit_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid kit_type. Must be one of: combo, customize, bulk.'
      });
    }

    if (!isValidObjectId(district_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid district_id.'
      });
    }

    // 1. Fetch warehouses in this district
    const warehouses = await CompanyWarehouse.find({
      level_2: new mongoose.Types.ObjectId(district_id),
      deleted_at: null
    }).select('_id warehouse_code').lean();

    let targetWarehouseIds = warehouses.map(w => w._id);
    let loadedFromMaster = false;
    let masterWarehouseCode = null;

    // 1b. Rule: If district has no warehouse, load Master warehouse of the cluster
    if (targetWarehouseIds.length === 0) {
      const district = await GeoLevel2.findById(district_id).lean();
      if (district && district.cluster) {
        // Find all districts belonging to this cluster
        const clusterDistrictIds = await GeoLevel2.find({
          cluster: district.cluster,
          deleted_at: null
        }).distinct('_id');

        // Find Master warehouse in this cluster
        const masterWarehouse = await CompanyWarehouse.findOne({
          level_2: { $in: clusterDistrictIds },
          warehouse_type: 'master',
          deleted_at: null
        }).lean();

        if (masterWarehouse) {
          targetWarehouseIds = [masterWarehouse._id];
          loadedFromMaster = true;
          masterWarehouseCode = masterWarehouse.warehouse_code;
        }
      }
    }

    if (targetWarehouseIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        loaded_from_master: false,
        master_warehouse_code: null,
        data: []
      });
    }

    // 2. Fetch active kit activations in these target warehouses
    const activations = await WarehouseKitActivation.find({
      warehouse_id: { $in: targetWarehouseIds },
      deleted_at: null
    }).lean();

    if (activations.length === 0) {
      return res.status(200).json({
        status: 'success',
        loaded_from_master: loadedFromMaster,
        master_warehouse_code: masterWarehouseCode,
        data: []
      });
    }

    // Filter unique combo kit IDs
    const comboKitIds = [...new Set(activations.map(a => a.combo_kit_id?.toString()).filter(Boolean))];

    // 3. Load combo kit details & filter by kit_type
    const filteredKits = [];
    for (const kitId of comboKitIds) {
      const kit = await findAndPopulateComboKit(kitId);
      if (!kit) continue;

      const isCustom = !!kit.is_custom;

      // Filter by type:
      if (kit_type === 'combo' && isCustom) continue;
      if (kit_type === 'customize' && !isCustom) continue;

      filteredKits.push(kit);
    }

    if (filteredKits.length === 0) {
      return res.status(200).json({
        status: 'success',
        loaded_from_master: loadedFromMaster,
        master_warehouse_code: masterWarehouseCode,
        data: []
      });
    }

    // 4. Fetch existing saved OrderSettings for this district + kit_type
    const matchingKitIds = filteredKits.map(k => k._id);
    const savedSettings = await OrderSetting.find({
      district_id: new mongoose.Types.ObjectId(district_id),
      kit_type,
      combo_kit_id: { $in: matchingKitIds },
      deleted_at: null
    }).lean();

    const settingsMap = {};
    savedSettings.forEach(s => {
      settingsMap[s.combo_kit_id.toString()] = s;
    });

    // 5. Build enriched response list
    const resultData = filteredKits.map(kit => {
      const kitIdStr = kit._id.toString();
      const saved = settingsMap[kitIdStr];

      return {
        combo_kit_id: kitIdStr,
        combo_kit_code: kit.combo_kit_code || kit.name,
        name: kit.solar_kit_id?.name || kit.name || 'Unknown Kit',
        category: kit.solar_kit_id?.category_id?.name || 'N/A',
        subcategory: kit.solar_kit_id?.subcategory_id?.name || 'N/A',
        is_custom: !!kit.is_custom,
        sub_warehouse_active: saved ? !!saved.sub_warehouse_active : false,
        master_warehouse_active: saved ? !!saved.master_warehouse_active : false,
        nearest_supplier_active: saved ? !!saved.nearest_supplier_active : false,
        in_cluster_supplier_active: saved ? !!saved.in_cluster_supplier_active : false,
        settings_id: saved ? saved._id.toString() : null,
        solar_kit_id: kit.solar_kit_id,
        project_range_id: kit.project_range_id,
        industry_type_id: kit.solar_kit_id?.category_id?.industry_type_id?._id || kit.solar_kit_id?.category_id?.industry_type_id || null,
        category_id: kit.solar_kit_id?.category_id?._id || kit.solar_kit_id?.category_id?.id || null,
        subcategory_id: kit.solar_kit_id?.subcategory_id?._id || kit.solar_kit_id?.subcategory_id?.id || null,
        type_id: kit.solar_kit_id?.type_id?.subcategory_type_id || kit.solar_kit_id?.type_id?._id || kit.solar_kit_id?.type_id?.id || null,
        type_name: kit.solar_kit_id?.type_id?.type?.name || kit.solar_kit_id?.type_id?.name || null,
      };
    });

    res.status(200).json({
      status: 'success',
      loaded_from_master: loadedFromMaster,
      master_warehouse_code: masterWarehouseCode,
      data: resultData
    });

  } catch (error) {
    console.error("Error in get_order_settings:", error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

/**
 * POST /solarshop/order-settings/save
 */
const save_order_settings = async (req, res) => {
  try {
    const {
      country_id,
      state_id,
      cluster_id,
      district_id,
      kit_type,
      settings
    } = req.body;

    if (!country_id || !state_id || !cluster_id || !district_id || !kit_type) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required location scope or kit_type parameter.'
      });
    }

    if (!['combo', 'customize', 'bulk'].includes(kit_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid kit_type.'
      });
    }

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'settings array is required and must not be empty.'
      });
    }

    // 1. Validate all items
    for (const item of settings) {
      const {
        combo_kit_id,
        sub_warehouse_active,
        master_warehouse_active,
        nearest_supplier_active,
        in_cluster_supplier_active
      } = item;

      if (!combo_kit_id || !isValidObjectId(combo_kit_id)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid combo_kit_id: ${combo_kit_id}`
        });
      }

      // Check dependency logic:
      if (kit_type === 'combo' || kit_type === 'customize') {
        if (!sub_warehouse_active && nearest_supplier_active) {
          return res.status(400).json({
            status: 'error',
            message: `Dependency error: Nearest Supplier cannot be active if Sub Warehouse is inactive.`
          });
        }
        if (!nearest_supplier_active && in_cluster_supplier_active) {
          return res.status(400).json({
            status: 'error',
            message: `Dependency error: In-Cluster Supplier cannot be active if Nearest Supplier is inactive.`
          });
        }
      } else if (kit_type === 'bulk') {
        if (!sub_warehouse_active && master_warehouse_active) {
          return res.status(400).json({
            status: 'error',
            message: `Dependency error: Master Warehouse cannot be active if Sub Warehouse is inactive.`
          });
        }
        if (!master_warehouse_active && nearest_supplier_active) {
          return res.status(400).json({
            status: 'error',
            message: `Dependency error: Nearest Supplier cannot be active if Master Warehouse is inactive.`
          });
        }
        if (!nearest_supplier_active && in_cluster_supplier_active) {
          return res.status(400).json({
            status: 'error',
            message: `Dependency error: In-Cluster Supplier cannot be active if Nearest Supplier is inactive.`
          });
        }
      }
    }

    // 2. Perform upsert operations
    const savedResults = [];
    for (const item of settings) {
      const {
        combo_kit_id,
        sub_warehouse_active,
        master_warehouse_active,
        nearest_supplier_active,
        in_cluster_supplier_active
      } = item;

      const filter = {
        district_id: new mongoose.Types.ObjectId(district_id),
        combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id),
        kit_type,
        deleted_at: null
      };

      const update = {
        country_id: new mongoose.Types.ObjectId(country_id),
        state_id: new mongoose.Types.ObjectId(state_id),
        cluster_id: new mongoose.Types.ObjectId(cluster_id),
        district_id: new mongoose.Types.ObjectId(district_id),
        combo_kit_id: new mongoose.Types.ObjectId(combo_kit_id),
        kit_type,
        sub_warehouse_active: !!sub_warehouse_active,
        master_warehouse_active: !!master_warehouse_active,
        nearest_supplier_active: !!nearest_supplier_active,
        in_cluster_supplier_active: !!in_cluster_supplier_active,
        is_active: true,
        updated_at: new Date()
      };

      const doc = await OrderSetting.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });
      savedResults.push(doc);
    }

    res.status(200).json({
      status: 'success',
      message: 'Order management settings saved successfully.',
      count: savedResults.length
    });

  } catch (error) {
    console.error("Error in save_order_settings:", error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  get_order_settings,
  save_order_settings
};
