const mongoose = require('mongoose');
const { WarehouseKitActivation, WarehouseComboKit, ProductSku, ProductSkuPrice, BulkKitSetting, SolarKit, CompanyMargin: CompanyMarginCore, WarehouseClusterMapping, RegionalCluster } = require('../../models/core_db');
const { CompanyWarehouse } = require('../../models/company_warehouse_db');
const { GeoLevel0, GeoLevel2 } = require('../../models/geolocation_db');
const { BulkKitSetting: IndiaBulkKitSetting, CompanyMargin: CompanyMarginIndia } = require('../../models/india_solarshop_db');
const { buildMarginGstConfig } = require('./warehouse_kit_activation.helpers');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Get all SKU IDs referenced in a combo kit (base_components + bos_kits).
 */
const getKitSkuIds = (kit) => {
    const skuIds = [];
    if (kit.base_components && Array.isArray(kit.base_components)) {
        kit.base_components.forEach(bc => {
            if (bc.sku_id) skuIds.push(bc.sku_id.toString());
        });
    }
    if (kit.bos_kits && Array.isArray(kit.bos_kits)) {
        kit.bos_kits.forEach(bk => {
            if (bk.sku_id) skuIds.push(bk.sku_id.toString());
        });
    }
    return [...new Set(skuIds)];
};

/**
 * Find a combo kit by ID in either core_db or india_solarshop_db.
 * Returns { kit, isIndia, exists } — exists is true if found in either DB.
 */
const findComboKitAnywhere = async (comboKitId) => {
    const objectId = new mongoose.Types.ObjectId(comboKitId);
    const kit = await WarehouseComboKit.findOne({ _id: objectId, deleted_at: null }).lean();
    if (kit) return { kit, isIndia: false, exists: true };
    return { kit: null, isIndia: false, exists: false };
};

/**
 * Check if all SKUs in a combo kit have prices set for a given warehouse.
 * Returns detailed info including product/template/subtype for missing SKUs.
 */
const checkAllSkusHavePrices = async (kit, warehouseId) => {
    const skuIds = getKitSkuIds(kit);
    if (skuIds.length === 0) return { allPriced: true, totalSkus: 0, pricedCount: 0, missingSkuDetails: [], missingSkuIds: [] };

    // Resolve warehouse and cluster
    const warehouse = await CompanyWarehouse.findById(warehouseId).lean();
    if (!warehouse) return { allPriced: false, totalSkus: skuIds.length, pricedCount: 0, missingSkuDetails: [], missingSkuIds: skuIds };

    const district = await GeoLevel2.findById(warehouse.level_2).lean();
    if (!district || !district.cluster) return { allPriced: false, totalSkus: skuIds.length, pricedCount: 0, missingSkuDetails: [], missingSkuIds: skuIds };
    const clusterId = district.cluster;

    const skuObjectIds = skuIds.map(id => new mongoose.Types.ObjectId(id));

    const [pricedSkuDocs, allSkus] = await Promise.all([
        ProductSkuPrice.find({
            sku_id: { $in: skuObjectIds },
            cluster_id: clusterId,
        }).lean(),
        ProductSku.find({ _id: { $in: skuObjectIds } })
            .populate({
                path: 'product_id',
                select: 'name image template_id subtype_id',
                populate: [
                    { path: 'template_id', select: 'name' },
                    { path: 'subtype_id', select: 'name' }
                ]
            })
            .lean(),
    ]);

    const pricedSkuIds = new Set(pricedSkuDocs.map(p => p.sku_id.toString()));
    const allPriced = skuIds.every(id => pricedSkuIds.has(id));

    const skuDetailsMap = {};
    allSkus.forEach(sku => {
        skuDetailsMap[sku._id.toString()] = {
            sku_code: sku.sku_code,
            product_name: sku.product_id?.name || 'Unknown',
            product_image: sku.product_id?.image || null,
            template_name: sku.product_id?.template_id?.name || null,
            subtype_name: sku.product_id?.subtype_id?.name || null,
        };
    });

    const missingSkuDetails = skuIds
        .filter(id => !pricedSkuIds.has(id))
        .map(id => ({
            sku_id: id,
            ...(skuDetailsMap[id] || { sku_code: 'Unknown' }),
        }));

    return {
        allPriced,
        missingSkuIds: missingSkuDetails.map(s => s.sku_id),
        missingSkuDetails,
        totalSkus: skuIds.length,
        pricedCount: pricedSkuDocs.length,
    };
};

/**
 * Automatically deactivate bulk kit settings for a given warehouse+combo_kit when combo kit is deactivated.
 * Also attempts to update India bulk kit settings if applicable.
 */
const autoDeactivateBulkKit = async (warehouseId, comboKitId) => {
    const query = {
        warehouse_id: new mongoose.Types.ObjectId(warehouseId),
        combo_kit_id: new mongoose.Types.ObjectId(comboKitId),
        deleted_at: null,
    };
    const update = {
        $set: {
            is_bulk_enabled: false,
            updated_at: new Date(),
        }
    };
    try { await BulkKitSetting.updateMany(query, update); } catch (e) { /* ignore */ }
    try { await IndiaBulkKitSetting.updateMany(query, update); } catch (e) { /* ignore */ }
};

/**
 * Helper to check if company margin is configured for a kit in a warehouse.
 * Supports cross-database collections (India vs core).
 */
const checkCompanyMarginIsSet = async (comboKitId, warehouseId) => {
    try {
        const comboKitObjectId = new mongoose.Types.ObjectId(comboKitId);
        const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);

        // Check core_db first
        const marginCore = await CompanyMarginCore.findOne({
            combo_kit_id: comboKitObjectId,
            warehouse_id: warehouseObjectId,
            deleted_at: null
        }).lean();
        if (marginCore) return true;

        // Check india_solarshop_db
        const marginIndia = await CompanyMarginIndia.findOne({
            combo_kit_id: comboKitObjectId,
            warehouse_id: warehouseObjectId,
            deleted_at: null
        }).lean();
        if (marginIndia) return true;
    } catch (e) { /* ignore */ }

    return false;
};

/**
 * Get the configured GST rate from the relevant company margin record.
 */
const getCompanyMarginGstConfig = async (comboKitId, warehouseId) => {
    try {
        const comboKitObjectId = new mongoose.Types.ObjectId(comboKitId);
        const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);

        const marginCore = await CompanyMarginCore.findOne({
            combo_kit_id: comboKitObjectId,
            warehouse_id: warehouseObjectId,
            deleted_at: null,
        }).lean();
        if (marginCore) return buildMarginGstConfig(marginCore);

        const marginIndia = await CompanyMarginIndia.findOne({
            combo_kit_id: comboKitObjectId,
            warehouse_id: warehouseObjectId,
            deleted_at: null,
        }).lean();
        if (marginIndia) return buildMarginGstConfig(marginIndia);
    } catch (e) {
        // ignore and fall back
    }

    return { isConfigured: false, gst_rate: null };
};

/**
 * GET /solarshop/warehouse-kit-activations
 * List all warehouse kit activations, manually populating combo_kit_id to support India cross-db collections.
 */
const get_warehouse_kit_activations = async (req, res) => {
    try {
        const { warehouse_id, country_id, kit_type } = req.query;
        const query = { deleted_at: null };

        if (warehouse_id) {
            if (!isValidObjectId(warehouse_id)) {
                return res.status(400).json({ status: 'error', message: 'Invalid warehouse_id.' });
            }
            query.warehouse_id = warehouse_id;
        }

        let activations = await WarehouseKitActivation.find(query).lean();

        // Manually populate warehouse_id — CompanyWarehouse lives on a separate
        // DB connection (company_warehouse_db) so cross-connection .populate() fails.
        const warehouseIds = [...new Set(activations.map(a => a.warehouse_id?.toString()).filter(Boolean))];
        const warehouseDocs = await CompanyWarehouse.find({ _id: { $in: warehouseIds } })
            .select('warehouse_code address level_1 order_fulfillment_types order_fulfillment_config')
            .lean();
        const warehouseMap = {};
        warehouseDocs.forEach(w => {
            warehouseMap[w._id.toString()] = {
                ...w,
                order_fulfillment_types: w.order_fulfillment_types && w.order_fulfillment_types.length > 0
                    ? w.order_fulfillment_types
                    : ['po_order', 'loose_order', 'trial_order']
            };
        });
        activations = activations.map(a => ({
            ...a,
            warehouse_id: warehouseMap[a.warehouse_id?.toString()] || a.warehouse_id,
        }));

        // Manually populate combo_kit_id for cross-database collections (India support)
        const populatedActivations = [];
        for (const a of activations) {
            const comboKitId = a.combo_kit_id;
            if (!comboKitId) continue;

            const { kit, exists } = await findComboKitAnywhere(comboKitId);
            if (!exists || !kit) continue;

            // Populate solar_kit_id name
            if (kit.solar_kit_id) {
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

            populatedActivations.push({
                ...a,
                combo_kit_id: kit
            });
        }

        let filteredActivations = populatedActivations;

        // If country_id filter is applied
        if (country_id) {
            if (!isValidObjectId(country_id)) {
                return res.status(400).json({ status: 'error', message: 'Invalid country_id.' });
            }
            filteredActivations = filteredActivations.filter(a => {
                const kitCountry = a.combo_kit_id?.country_id?.toString();
                return kitCountry === country_id;
            });
        }

        // If kit_type filter is applied (combo / customize / all)
        if (kit_type) {
            if (kit_type === 'combo') {
                filteredActivations = filteredActivations.filter(a => a.combo_kit_id && !a.combo_kit_id.is_custom);
            } else if (kit_type === 'customize') {
                filteredActivations = filteredActivations.filter(a => a.combo_kit_id && a.combo_kit_id.is_custom);
            }
        }

        // Enrich each activation with SKU price status info and margin status info
        const data = [];
        for (const a of filteredActivations) {
            const kit = a.combo_kit_id;
            let skuPriceInfo = null;
            let isMarginConfigured = false;
            let gstConfig = { isConfigured: false, gst_rate: null };
            if (kit && a.warehouse_id) {
                const whId = a.warehouse_id._id || a.warehouse_id;
                skuPriceInfo = await checkAllSkusHavePrices(kit, whId);
                isMarginConfigured = await checkCompanyMarginIsSet(kit._id, whId);
                gstConfig = await getCompanyMarginGstConfig(kit._id, whId);
            }
            data.push({
                ...a,
                id: a._id,
                sku_price_info: skuPriceInfo,
                is_margin_configured: isMarginConfigured,
                is_gst_configured: gstConfig.isConfigured,
                gst_rate: gstConfig.gst_rate,
            });
        }

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_warehouse_kit_activations:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * GET /solarshop/warehouse-kit-activations/warehouse/:warehouseId
 * List activations for a specific warehouse with kit details grouped.
 * Manually populates combo_kit_id to support cross-database (India) collections.
 * Returns activations for all kits in the country to ensure price status is visible.
 */
const get_warehouse_activations = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        if (!warehouseId || !isValidObjectId(warehouseId)) {
            return res.status(400).json({ status: 'error', message: 'Valid Warehouse ID is required.' });
        }

        const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);

        // Fetch warehouse details to know its country
        const warehouse = await CompanyWarehouse.findOne({ _id: warehouseObjectId, deleted_at: null }).lean();
        if (!warehouse) {
            return res.status(404).json({ status: 'error', message: 'Warehouse not found.' });
        }

        const countryId = warehouse.level_0;
        const countryObj = await GeoLevel0.findOne({ _id: countryId, deleted_at: null }).lean();
        const isIndia = countryObj && countryObj.name?.toLowerCase() === 'india';

        // Resolve clusterId
        let clusterId = null;
        if (warehouse.level_2) {
            const district = await GeoLevel2.findById(warehouse.level_2).lean();
            if (district) clusterId = district.cluster;
        }

        // Fetch all combo/custom kits for this country from core DB ComboKit
        const kits = await WarehouseComboKit.find({
            country_id: countryId,
            deleted_at: null,
            is_active: true
        }).lean();

        // Collect all unique solar_kit_ids & SKU ids
        const solarKitIds = [...new Set(kits.map(k => k.solar_kit_id?.toString()).filter(Boolean))].map(id => new mongoose.Types.ObjectId(id));
        const allSkuIdStrings = [];
        kits.forEach(k => {
            getKitSkuIds(k).forEach(id => allSkuIdStrings.push(id));
        });
        const uniqueSkuIds = [...new Set(allSkuIdStrings)].map(id => new mongoose.Types.ObjectId(id));

        const MarginModel = isIndia ? CompanyMarginIndia : CompanyMarginCore;

        // Parallel batch fetch all dependent collections
        const [solarKitDocs, pricedSkuDocs, allSkuDocs, marginDocs, activations] = await Promise.all([
            solarKitIds.length > 0 ? SolarKit.find({ _id: { $in: solarKitIds } })
                .populate('category_id')
                .populate('subcategory_id')
                .populate({
                    path: 'type_id',
                    populate: { path: 'type', model: 'sys_filter_types' }
                }).lean() : [],
            (clusterId && uniqueSkuIds.length > 0) ? ProductSkuPrice.find({ sku_id: { $in: uniqueSkuIds }, cluster_id: clusterId }).lean() : [],
            uniqueSkuIds.length > 0 ? ProductSku.find({ _id: { $in: uniqueSkuIds } })
                .populate({
                    path: 'product_id',
                    select: 'name image template_id subtype_id',
                    populate: [
                        { path: 'template_id', select: 'name' },
                        { path: 'subtype_id', select: 'name' }
                    ]
                }).lean() : [],
            MarginModel.find({ warehouse_id: warehouseObjectId, is_active: true, deleted_at: null }).lean(),
            WarehouseKitActivation.find({ warehouse_id: warehouseObjectId, deleted_at: null }).lean(),
            WarehouseClusterMapping.findOne({
                $or: [{ warehouse_id: warehouseObjectId }, { warehouse_code: warehouse.warehouse_code }],
                deleted_at: null,
                status: 'Active'
            }).lean()
        ]);

        // Build lookup maps
        const solarKitsMap = {};
        solarKitDocs.forEach(sk => { solarKitsMap[sk._id.toString()] = sk; });

        const pricedSkuIds = new Set(pricedSkuDocs.map(p => p.sku_id.toString()));

        const skuDetailsMap = {};
        allSkuDocs.forEach(sku => {
            skuDetailsMap[sku._id.toString()] = {
                sku_code: sku.sku_code,
                product_name: sku.product_id?.name || 'Unknown',
                product_image: sku.product_id?.image || null,
                template_name: sku.product_id?.template_id?.name || null,
                subtype_name: sku.product_id?.subtype_id?.name || null,
            };
        });

        const marginsMap = {};
        marginDocs.forEach(m => {
            const kitId = m.combo_kit_id?.toString();
            if (kitId) marginsMap[kitId] = m;
        });

        const activationsMap = {};
        activations.forEach(a => {
            const kitId = a.combo_kit_id?.toString();
            if (kitId) activationsMap[kitId] = a;
        });

        // Enrich all kits with high-performance memory lookups
        const enrichedComboKits = [];
        const enrichedCustomizeKits = [];

        for (const kit of kits) {
            if (kit.solar_kit_id) {
                const sIdStr = kit.solar_kit_id.toString();
                if (solarKitsMap[sIdStr]) {
                    kit.solar_kit_id = solarKitsMap[sIdStr];
                }
            }

            const kitId = kit._id.toString();
            const activation = activationsMap[kitId] || {
                warehouse_id: warehouseObjectId,
                combo_kit_id: kit,
                is_combokit_active: false,
                is_customize_kit_active: false,
                is_active: false
            };

            const kitSkuIds = getKitSkuIds(kit);
            const missingSkuDetails = kitSkuIds
                .filter(id => !pricedSkuIds.has(id))
                .map(id => ({
                    sku_id: id,
                    ...(skuDetailsMap[id] || { sku_code: 'Unknown' })
                }));

            const skuPriceInfo = {
                allPriced: kitSkuIds.length === 0 || kitSkuIds.every(id => pricedSkuIds.has(id)),
                missingSkuIds: missingSkuDetails.map(s => s.sku_id),
                missingSkuDetails,
                totalSkus: kitSkuIds.length,
                pricedCount: kitSkuIds.filter(id => pricedSkuIds.has(id)).length
            };

            const marginDoc = marginsMap[kitId];
            const isMarginConfigured = !!marginDoc;
            const gstRate = marginDoc?.gst_rate;
            const isGstConfigured = gstRate !== undefined && gstRate !== null && !isNaN(Number(gstRate)) && Number(gstRate) > 0;

            const enrichedItem = {
                ...activation,
                id: activation._id || null,
                combo_kit_id: kit,
                allowed_order_types: activation.allowed_order_types || warehouse.order_fulfillment_types || ['po_order', 'loose_order', 'trial_order'],
                sku_price_info: skuPriceInfo,
                is_margin_configured: isMarginConfigured,
                is_gst_configured: isGstConfigured,
                gst_rate: isGstConfigured ? Number(gstRate) : null,
            };

            if (kit.is_custom) {
                enrichedCustomizeKits.push(enrichedItem);
            } else {
                enrichedComboKits.push(enrichedItem);
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                warehouse: {
                    id: (warehouse._id || warehouse.id)?.toString(),
                    warehouse_code: warehouse.warehouse_code,
                    address: warehouse.address,
                    state: warehouse.state,
                    cluster: clusterMapping ? clusterMapping.cluster_name : null,
                    cluster_name: clusterMapping ? clusterMapping.cluster_name : null,
                    cluster_id: clusterMapping ? clusterMapping.cluster_id?.toString() : null,
                    fulfillment_states: clusterMapping ? (clusterMapping.states || []) : [],
                    is_cluster_mapped: Boolean(clusterMapping),
                    order_fulfillment_types: warehouse.order_fulfillment_types && warehouse.order_fulfillment_types.length > 0
                        ? warehouse.order_fulfillment_types
                        : ['po_order', 'loose_order', 'trial_order'],
                    order_fulfillment_config: warehouse.order_fulfillment_config || null
                },
                combo_kits: enrichedComboKits,
                customize_kits: enrichedCustomizeKits,
            }
        });
    } catch (error) {
        console.error("Error in get_warehouse_activations:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/warehouse-kit-activations/save
 * Create or update warehouse kit activation for a warehouse + combo_kit pair.
 * Business Rules:
 * 1. By default all kits are inactive.
 * 2. Combo kit can be activated only if ALL SKUs have prices set in this warehouse.
 * 3. Bulk kit can be activated only if that kit is active in this warehouse.
 * 4. If combo kit is deactivated, auto-deactivate from bulk kit.
 */
const save_warehouse_kit_activation = async (req, res) => {
    try {
        const {
            warehouse_id,
            combo_kit_id,
            kit_type,
            is_combokit_active = false,
            is_customize_kit_active = false,
            max_permitted_stock,
            minimum_stock_alert,
            maximum_stock_holding,
            procurement_source,
            assembly_permission,
            dispatch_permission,
            delivery_districts
        } = req.body;

        if (!warehouse_id || !combo_kit_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: warehouse_id, combo_kit_id.',
            });
        }

        if (!isValidObjectId(warehouse_id) || !isValidObjectId(combo_kit_id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid warehouse_id or combo_kit_id.' });
        }

        // Verify warehouse exists
        const warehouse = await CompanyWarehouse.findOne({ _id: warehouse_id, deleted_at: null });
        if (!warehouse) {
            return res.status(400).json({ status: 'error', message: 'Selected warehouse does not exist.' });
        }

        let effective_combokit_active = !!is_combokit_active;
        let effective_customize_kit_active = !!is_customize_kit_active;

        // Rule 6.3: Warehouse must be Active before kits can be activated
        if ((effective_combokit_active || effective_customize_kit_active) && !warehouse.is_active) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot activate kit. The selected warehouse must be Active before kits can be enabled for storage or dispatch.'
            });
        }

        // Verify combo kit exists (check both core and India DBs)
        const { kit, isIndia, exists } = await findComboKitAnywhere(combo_kit_id);
        if (!exists) {
            return res.status(400).json({ status: 'error', message: 'Selected combo kit does not exist.' });
        }

        const is_custom = kit.is_custom || false;

        // --- Business Rule: Combo Kit Activation ---
        if ((effective_combokit_active && !is_custom) || (effective_customize_kit_active && is_custom)) {
            const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
            if (!marginSet) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate kit. Company margins are not configured for this kit in this warehouse.',
                });
            }

            const gstConfig = await getCompanyMarginGstConfig(combo_kit_id, warehouse_id);
            if (!gstConfig.isConfigured) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate kit. GST rate is not configured for this kit margin. Please set it in the margin configuration first.',
                });
            }
        }

        if (effective_combokit_active && !is_custom) {
            // For non-custom combo kits, check all SKUs have prices in this warehouse
            const skuCheck = await checkAllSkusHavePrices(kit, warehouse_id);
            if (!skuCheck.allPriced) {
                return res.status(400).json({
                    status: 'error',
                    message: `Cannot activate combo kit. ${skuCheck.missingSkuIds.length} SKU(s) are missing price configuration in this cluster. ${skuCheck.pricedCount}/${skuCheck.totalSkus} SKUs priced.`,
                    data: { sku_price_info: skuCheck }
                });
            }

            // Check company margin is configured
            const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
            if (!marginSet) {
                return res.status(400).json({
                    status: 'error',
                    message: `Cannot activate combo kit. Company margins are not configured for this kit in this warehouse.`,
                });
            }
        }

        // --- Business Rule: Customize Kit Activation ---
        if (effective_customize_kit_active && is_custom) {
            // Check company margin is configured
            const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
            if (!marginSet) {
                return res.status(400).json({
                    status: 'error',
                    message: `Cannot activate customize kit. Company margins are not configured for this kit in this warehouse.`,
                });
            }
        }

        // --- Business Rule: Deactivate combo kit → auto-deactivate bulk kit ---
        const filter = { warehouse_id, combo_kit_id, deleted_at: null };

        // Check existing activation if any
        const existingActivation = await WarehouseKitActivation.findOne(filter);
        const wasCombokitActiveBefore = existingActivation ? existingActivation.is_combokit_active : false;

        // If deactivating combo kit, auto-deactivate bulk kit
        if (wasCombokitActiveBefore && !effective_combokit_active && !is_custom) {
            await autoDeactivateBulkKit(warehouse_id, combo_kit_id);
        }

        const update = {
            warehouse_id,
            combo_kit_id,
            kit_id: combo_kit_id,
            kit_type: kit_type || (is_custom ? 'customize_kit' : 'combo_kit'),
            kit_name: kit.name || 'Solar Kit',
            is_combokit_active: effective_combokit_active,
            is_customize_kit_active: !!is_customize_kit_active,
            is_active: effective_combokit_active || effective_customize_kit_active,
            max_permitted_stock: max_permitted_stock !== undefined ? Number(max_permitted_stock) : (existingActivation?.max_permitted_stock || 0),
            minimum_stock_alert: minimum_stock_alert !== undefined ? Number(minimum_stock_alert) : (existingActivation?.minimum_stock_alert || 0),
            maximum_stock_holding: maximum_stock_holding !== undefined ? Number(maximum_stock_holding) : (existingActivation?.maximum_stock_holding || 0),
            procurement_source: procurement_source || existingActivation?.procurement_source || 'company_stock',
            assembly_permission: assembly_permission !== undefined ? Boolean(assembly_permission) : (existingActivation?.assembly_permission ?? true),
            dispatch_permission: dispatch_permission !== undefined ? Boolean(dispatch_permission) : (existingActivation?.dispatch_permission ?? true),
            delivery_districts: delivery_districts || existingActivation?.delivery_districts || (warehouse.serviceable_districts || []),
            is_store_display: req.body.is_store_display !== undefined ? Boolean(req.body.is_store_display) : (existingActivation?.is_store_display ?? true),
            display_start_date: req.body.display_start_date || existingActivation?.display_start_date || null,
            display_end_date: req.body.display_end_date !== undefined ? req.body.display_end_date : (existingActivation?.display_end_date || null),
            always_display: req.body.always_display !== undefined ? Boolean(req.body.always_display) : (existingActivation?.always_display ?? true),
            restricted_clusters: Array.isArray(req.body.restricted_clusters) ? req.body.restricted_clusters : (existingActivation?.restricted_clusters || ['all']),
            restricted_states: Array.isArray(req.body.restricted_states) ? req.body.restricted_states : (existingActivation?.restricted_states || ['all']),
            restricted_industry_types: Array.isArray(req.body.restricted_industry_types) ? req.body.restricted_industry_types : (existingActivation?.restricted_industry_types || ['all']),
            restricted_project_types: Array.isArray(req.body.restricted_project_types) ? req.body.restricted_project_types : (existingActivation?.restricted_project_types || ['all']),
            updated_at: new Date(),
        };

        const result = await WarehouseKitActivation.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });

        // Return enriched data with SKU price info
        const skuPriceInfo = await checkAllSkusHavePrices(kit, warehouse_id);

        res.status(200).json({
            status: 'success',
            message: 'Warehouse kit activation saved successfully.',
            data: { ...result.toObject(), id: result._id, sku_price_info: skuPriceInfo },
        });
    } catch (error) {
        console.error("Error in save_warehouse_kit_activation:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/warehouse-kit-activations/bulk-save
 * Bulk save/update multiple warehouse kit activations at once.
 * Applies all business rules for each activation.
 */
const bulk_save_warehouse_kit_activations = async (req, res) => {
    try {
        const { activations } = req.body;

        if (!Array.isArray(activations) || activations.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'activations array is required with at least one item.',
            });
        }

        const results = [];
        const errors = [];

        for (const item of activations) {
            const { warehouse_id, combo_kit_id, is_combokit_active, is_customize_kit_active } = item;

            if (!warehouse_id || !combo_kit_id || !isValidObjectId(warehouse_id) || !isValidObjectId(combo_kit_id)) {
                errors.push({ item, message: 'Invalid warehouse_id or combo_kit_id.' });
                continue;
            }

            try {
                const effective_combokit_active = !!is_combokit_active;
                const efficient_customize_kit_active = !!is_customize_kit_active;

                // Verify the kit exists (check both core and India DBs)
                const { kit, exists } = await findComboKitAnywhere(combo_kit_id);
                if (!kit || !exists) {
                    errors.push({ item, message: 'Combo kit not found or deleted.' });
                    continue;
                }

                const is_custom = kit.is_custom || false;

                if ((effective_combokit_active && !is_custom) || (efficient_customize_kit_active && is_custom)) {
                    const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
                    if (!marginSet) {
                        errors.push({
                            item,
                            message: 'Company margins are not configured for this kit in this warehouse.',
                        });
                        continue;
                    }

                    const gstConfig = await getCompanyMarginGstConfig(combo_kit_id, warehouse_id);
                    if (!gstConfig.isConfigured) {
                        errors.push({
                            item,
                            message: 'GST rate is not configured for this kit margin. Please set it in the margin configuration first.',
                        });
                        continue;
                    }
                }

                // Business Rule: Check SKU prices and margins for combo kit activation
                if (effective_combokit_active && !is_custom) {
                    const skuCheck = await checkAllSkusHavePrices(kit, warehouse_id);
                    if (!skuCheck.allPriced) {
                        errors.push({
                            item,
                            message: `SKU prices not configured: ${skuCheck.missingSkuIds.length} SKU(s) missing prices. ${skuCheck.pricedCount}/${skuCheck.totalSkus} priced.`,
                        });
                        continue;
                    }

                    const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
                    if (!marginSet) {
                        errors.push({
                            item,
                            message: `Company margins not configured for this combo kit in this warehouse.`,
                        });
                        continue;
                    }
                }

                // Business Rule: Check margins for customize kit activation
                if (efficient_customize_kit_active && is_custom) {
                    const marginSet = await checkCompanyMarginIsSet(combo_kit_id, warehouse_id);
                    if (!marginSet) {
                        errors.push({
                            item,
                            message: `Company margins not configured for this customize kit in this warehouse.`,
                        });
                        continue;
                    }
                }

                // Check existing activation before update
                const filter = { warehouse_id, combo_kit_id, deleted_at: null };
                const existingActivation = await WarehouseKitActivation.findOne(filter);
                const wasCombokitActiveBefore = existingActivation ? existingActivation.is_combokit_active : false;

                // Business Rule: Deactivate combo → auto-deactivate bulk
                if (wasCombokitActiveBefore && !effective_combokit_active && !is_custom) {
                    await autoDeactivateBulkKit(warehouse_id, combo_kit_id);
                }

                const update = {
                    warehouse_id,
                    combo_kit_id,
                    kit_id: combo_kit_id,
                    kit_type: item.kit_type || (is_custom ? 'customize_kit' : 'combo_kit'),
                    kit_name: kit.name || 'Solar Kit',
                    is_combokit_active: effective_combokit_active,
                    is_customize_kit_active: efficient_customize_kit_active,
                    is_active: effective_combokit_active || efficient_customize_kit_active,
                    updated_at: new Date(),
                };

                if (item.max_permitted_stock !== undefined) update.max_permitted_stock = Number(item.max_permitted_stock);
                if (item.minimum_stock_alert !== undefined) update.minimum_stock_alert = Number(item.minimum_stock_alert);
                if (item.maximum_stock_holding !== undefined) update.maximum_stock_holding = Number(item.maximum_stock_holding);
                if (item.procurement_source) update.procurement_source = item.procurement_source;
                if (item.assembly_permission !== undefined) update.assembly_permission = Boolean(item.assembly_permission);
                if (item.dispatch_permission !== undefined) update.dispatch_permission = Boolean(item.dispatch_permission);
                if (Array.isArray(item.delivery_districts)) update.delivery_districts = item.delivery_districts;

                if (Array.isArray(item.allowed_order_types)) {
                    update.allowed_order_types = item.allowed_order_types;
                }

                if (item.is_store_display !== undefined) update.is_store_display = Boolean(item.is_store_display);
                if (item.display_start_date) update.display_start_date = item.display_start_date;
                if (item.display_end_date !== undefined) update.display_end_date = item.display_end_date;
                if (item.always_display !== undefined) update.always_display = Boolean(item.always_display);
                if (Array.isArray(item.restricted_clusters)) update.restricted_clusters = item.restricted_clusters;
                if (Array.isArray(item.restricted_states)) update.restricted_states = item.restricted_states;
                if (Array.isArray(item.restricted_industry_types)) update.restricted_industry_types = item.restricted_industry_types;
                if (Array.isArray(item.restricted_project_types)) update.restricted_project_types = item.restricted_project_types;

                const result = await WarehouseKitActivation.findOneAndUpdate(filter, update, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                });
                results.push({ ...result.toObject(), id: result._id });
            } catch (err) {
                errors.push({ item, message: err.message });
            }
        }

        res.status(200).json({
            status: 'success',
            message: `Processed ${results.length} activations successfully.${errors.length > 0 ? ` ${errors.length} failed.` : ''}`,
            data: { results, errors },
        });
    } catch (error) {
        console.error("Error in bulk_save_warehouse_kit_activations:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/warehouse-kit-activations/toggle
 * Toggle the active/inactive status of combo kit or customize kit for a warehouse.
 * Applies business rules for combo kit activation.
 */
const toggle_kit_activation = async (req, res) => {
    try {
        const { id, field } = req.body;

        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ status: 'error', message: 'Valid activation ID is required.' });
        }

        if (!field || !['is_combokit_active', 'is_customize_kit_active'].includes(field)) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid field is required: is_combokit_active or is_customize_kit_active.',
            });
        }

        const activation = await WarehouseKitActivation.findById(id);
        if (!activation || activation.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Warehouse kit activation not found.' });
        }

        const newValue = !activation[field];
        const warehouseId = activation.warehouse_id;
        const comboKitId = activation.combo_kit_id;

        // Rule 6.3: Warehouse must be Active before kits can be enabled
        if (newValue) {
            const wh = await CompanyWarehouse.findById(warehouseId).lean();
            if (!wh || !wh.is_active) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate kit. The warehouse must be Active before kits can be enabled for storage or dispatch.'
                });
            }
        }

        // Business Rule: Activating combo kit → check SKU prices and margins
        if (field === 'is_combokit_active' && newValue) {
            const marginSet = await checkCompanyMarginIsSet(comboKitId, warehouseId);
            if (!marginSet) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate combo kit. Company margins are not configured for this kit in this warehouse.',
                });
            }

            const gstConfig = await getCompanyMarginGstConfig(comboKitId, warehouseId);
            if (!gstConfig.isConfigured) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate combo kit. GST rate is not configured for this kit margin. Please set it in the margin configuration first.',
                });
            }

            // Check if it's a custom kit or regular combo kit
            const kit = await WarehouseComboKit.findOne({ _id: comboKitId, deleted_at: null });
            if (kit && !kit.is_custom) {
                const skuCheck = await checkAllSkusHavePrices(kit, warehouseId);
                if (!skuCheck.allPriced) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Cannot activate combo kit. ${skuCheck.missingSkuIds.length} SKU(s) are missing price configuration in this cluster. ${skuCheck.pricedCount}/${skuCheck.totalSkus} SKUs priced.`,
                        data: { sku_price_info: skuCheck }
                    });
                }

                const marginSet = await checkCompanyMarginIsSet(comboKitId, warehouseId);
                if (!marginSet) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Cannot activate combo kit. Company margins are not configured for this kit in this warehouse.`,
                    });
                }
            }
        }

        // Business Rule: Activating customize kit → check margins
        if (field === 'is_customize_kit_active' && newValue) {
            const marginSet = await checkCompanyMarginIsSet(comboKitId, warehouseId);
            if (!marginSet) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate customize kit. Company margins are not configured for this kit in this warehouse.',
                });
            }

            const gstConfig = await getCompanyMarginGstConfig(comboKitId, warehouseId);
            if (!gstConfig.isConfigured) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot activate customize kit. GST rate is not configured for this kit margin. Please set it in the margin configuration first.',
                });
            }

            const kit = await findComboKitAnywhere(comboKitId);
            if (kit && kit.kit?.is_custom) {
                const marginSet = await checkCompanyMarginIsSet(comboKitId, warehouseId);
                if (!marginSet) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Cannot activate customize kit. Company margins are not configured for this kit in this warehouse.`,
                    });
                }
            }
        }

        // Business Rule: Deactivating combo kit → auto-deactivate bulk
        if (field === 'is_combokit_active' && !newValue) {
            if (activation.is_combokit_active === true) {
                await autoDeactivateBulkKit(activation.warehouse_id, activation.combo_kit_id);
            }
        }

        activation[field] = newValue;
        activation.is_active = Boolean(activation.is_combokit_active || activation.is_customize_kit_active);
        activation.updated_at = new Date();
        await activation.save();

        // Enrich response with SKU price info
        let skuPriceInfo = null;
        if (field === 'is_combokit_active') {
            const kit = await WarehouseComboKit.findOne({ _id: activation.combo_kit_id, deleted_at: null });
            if (kit) {
                skuPriceInfo = await checkAllSkusHavePrices(kit, activation.warehouse_id);
            }
        }

        res.status(200).json({
            status: 'success',
            message: `${field === 'is_combokit_active' ? 'Combo kit' : 'Customize kit'} activation status toggled successfully.`,
            data: { ...activation.toObject(), id: activation._id, sku_price_info: skuPriceInfo },
        });
    } catch (error) {
        console.error("Error in toggle_kit_activation:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/warehouse-kit-activations/delete
 * Soft-delete a warehouse kit activation. Auto-deactivates bulk kit as well.
 */
const delete_warehouse_kit_activation = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ status: 'error', message: 'Valid activation ID is required.' });
        }

        const activation = await WarehouseKitActivation.findById(id);
        if (!activation || activation.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Warehouse kit activation not found.' });
        }

        // Auto-deactivate bulk kit for this combo kit in this warehouse
        await autoDeactivateBulkKit(activation.warehouse_id, activation.combo_kit_id);

        activation.deleted_at = new Date();
        activation.is_active = false;
        activation.is_combokit_active = false;
        activation.is_customize_kit_active = false;
        activation.updated_at = new Date();
        await activation.save();

        res.status(200).json({ status: 'success', message: 'Warehouse kit activation deleted successfully. Bulk kit settings also deactivated.' });
    } catch (error) {
        console.error("Error in delete_warehouse_kit_activation:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    get_warehouse_kit_activations,
    get_warehouse_activations,
    save_warehouse_kit_activation,
    bulk_save_warehouse_kit_activations,
    toggle_kit_activation,
    delete_warehouse_kit_activation,
};