const mongoose = require('mongoose');
const { WarehouseComboKit: ComboKit, SolarKit, Brand, ProductTemplate, ProductSku, ProjectRange, ProductSubtype, WarehouseKitActivation } = require('../models/core_db');
const ComboKitIndia = ComboKit;
const { GeoLevel0, GeoLevel1, GeoLevel2, Cluster } = require('../models/geolocation_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { delete_uploaded_files } = require('../utils/upload.files');
const { sendAdminNotification } = require('../services/admin.notification.service');
const { getCombinedKitDatasheetData, generateCombinedDatasheetPdf } = require('../utils/datasheet.generator');

const parseJSON = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return defaultVal;
    }
};

const normalizeObjectIds = (values = []) => {
    const flattened = Array.isArray(values)
        ? values.flatMap(v => Array.isArray(v) ? v : [v])
        : [values];

    return [...new Set(flattened.filter(Boolean))]
        .filter(mongoose.Types.ObjectId.isValid)
        .map(v => new mongoose.Types.ObjectId(v));
};

const areIdsEqual = (id1, id2) => {
    if (!id1 && !id2) return true;
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
};

const areBrandIdsEqual = (arr1 = [], arr2 = []) => {
    const clean1 = Array.isArray(arr1) ? arr1 : [];
    const clean2 = Array.isArray(arr2) ? arr2 : [];
    if (clean1.length !== clean2.length) return false;
    const sorted1 = clean1.map(id => id.toString()).sort();
    const sorted2 = clean2.map(id => id.toString()).sort();
    return sorted1.every((val, index) => val === sorted2[index]);
};

const didBaseComponentsChange = (existing = [], newMapped = []) => {
    const extArr = Array.isArray(existing) ? existing : [];
    const newArr = Array.isArray(newMapped) ? newMapped : [];
    if (extArr.length !== newArr.length) return true;
    for (let i = 0; i < extArr.length; i++) {
        const ext = extArr[i];
        const nmp = newArr[i];
        if (
            !areIdsEqual(ext.template_id, nmp.template_id) ||
            !areIdsEqual(ext.subtype_id, nmp.subtype_id) ||
            !areIdsEqual(ext.brand_id, nmp.brand_id) ||
            !areIdsEqual(ext.sku_id, nmp.sku_id) ||
            Number(ext.quantity || 1) !== Number(nmp.quantity || 1) ||
            !areBrandIdsEqual(ext.brand_ids, nmp.brand_ids)
        ) {
            return true;
        }
    }
    return false;
};

const didBosKitsChange = (existing = [], newMapped = []) => {
    const extArr = Array.isArray(existing) ? existing : [];
    const newArr = Array.isArray(newMapped) ? newMapped : [];
    if (extArr.length !== newArr.length) return true;
    for (let i = 0; i < extArr.length; i++) {
        const ext = extArr[i];
        const nmp = newArr[i];
        if (
            (ext.name || '').trim() !== (nmp.name || '').trim() ||
            !areIdsEqual(ext.brand_id, nmp.brand_id) ||
            !areIdsEqual(ext.sku_id, nmp.sku_id) ||
            Number(ext.quantity || 1) !== Number(nmp.quantity || 1) ||
            !areBrandIdsEqual(ext.brand_ids, nmp.brand_ids) ||
            !areBrandIdsEqual(ext.template_ids, nmp.template_ids) ||
            !areBrandIdsEqual(ext.subtype_ids, nmp.subtype_ids)
        ) {
            return true;
        }
    }
    return false;
};

const cleanId = (val) => {
    if (!val) return null;
    if (typeof val === 'object') {
        const id = val._id || val.id || val.value;
        return (id && mongoose.Types.ObjectId.isValid(id)) ? new mongoose.Types.ObjectId(id) : null;
    }
    if (typeof val === 'string' && mongoose.Types.ObjectId.isValid(val)) {
        return new mongoose.Types.ObjectId(val);
    }
    return null;
};

const isCountryIndia = async (countryId) => {
    if (!countryId) return false;
    try {
        if (typeof countryId === 'string' && countryId.toLowerCase() === 'india') return true;
        if (typeof countryId === 'object' && countryId.name?.toLowerCase() === 'india') return true;
        const rawId = typeof countryId === 'object' ? (countryId.id || countryId._id) : countryId;
        if (!rawId) return false;
        if (typeof rawId === 'string' && rawId.toLowerCase() === 'india') return true;

        const queryId = mongoose.Types.ObjectId.isValid(rawId) ? new mongoose.Types.ObjectId(rawId) : rawId;
        const country = await GeoLevel0.findOne({ _id: queryId, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] });
        if (country && country.name?.toLowerCase() === 'india') return true;

        const countryIndia = await GeoLevel0.findOne({ name: /india/i, $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] });
        if (countryIndia && String(countryIndia._id) === String(rawId)) return true;

        return false;
    } catch (e) {
        console.error("Error in isCountryIndia:", e);
        return false;
    }
};

const create_combo_kit = async (req, res) => {
    try {
        const { name, description, solar_kit_id, project_range_id, capacity, inverter_tolerance, inverter_mode, country_id, variant_id, brand_id } = req.body;
        const variant_ids = parseJSON(req.body.variant_ids, []);
        const targetVariantIds = variant_ids.length > 0 
            ? variant_ids.map(id => id.id || id._id || id)
            : (variant_id ? [variant_id] : []);
        const order_quantities = parseJSON(req.body.order_quantities, []);
        const loose_order_quantities = parseJSON(req.body.loose_order_quantities, []);
        const allow_trial_kit = req.body.allow_trial_kit === 'true' || req.body.allow_trial_kit === true;
        const trial_kit_quantity = parseInt(req.body.trial_kit_quantity, 10) || 10;
        const trial_kit_max_orders_per_buyer = req.body.trial_kit_max_orders_per_buyer !== undefined ? Math.max(0, parseInt(req.body.trial_kit_max_orders_per_buyer, 10) || 0) : 1;
        const base_components = parseJSON(req.body.base_components, []);
        const bos_kits = parseJSON(req.body.bos_kits, []);
        const solarKitIds = parseJSON(req.body.solar_kit_ids, []);
        const targetSolarKitIds = solarKitIds.length > 0 ? solarKitIds : (solar_kit_id ? [solar_kit_id] : []);

        if (!name || targetSolarKitIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Missing combo kit name or solar kit definition.' });
        }

        if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (isIndia) {
                return res.status(400).json({ status: 'error', message: 'India country configurations must be saved in the India database.' });
            }
        }

        // Process file uploads
        let kit_image = null;
        const bos_images = {};

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.fieldname === 'kit_image') {
                    kit_image = file.path;
                } else if (file.fieldname.startsWith('bos_kit_image_')) {
                    const idx = file.fieldname.replace('bos_kit_image_', '');
                    bos_images[idx] = file.path;
                }
            }
        }

        if (!kit_image) {
            return res.status(400).json({ status: 'error', message: 'Combo kit cover image is required.' });
        }

        // Map base components
        const mappedBaseComponents = base_components.map(bc => ({
            template_id: cleanId(bc.template_id) || bc.template_id,
            subtype_id: cleanId(bc.subtype_id),
            brand_id: cleanId(bc.brand_id),
            brand_ids: (bc.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bc.sku_id),
            quantity: parseFloat(bc.quantity) || 1
        }));

        // Map BOS kits and assign images
        const mappedBosKits = bos_kits.map((bk, idx) => ({
            name: bk.name,
            brand_id: cleanId(bk.brand_id),
            brand_ids: (bk.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bk.sku_id),
            quantity: parseFloat(bk.quantity) || 1,
            image: bos_images[idx] || bk.image || null,
            template_ids: (bk.template_ids || []).map(cleanId).filter(Boolean),
            subtype_ids: (bk.subtype_ids || []).map(cleanId).filter(Boolean)
        }));

        if (mappedBosKits.some(bk => !bk.image)) {
            const filesToClean = [];
            if (kit_image) filesToClean.push({ path: kit_image });
            Object.values(bos_images).forEach(p => filesToClean.push({ path: p }));
            if (filesToClean.length > 0) delete_uploaded_files(filesToClean);

            return res.status(400).json({ status: 'error', message: 'All BOS kit components must have an image.' });
        }

        const is_custom = req.body.is_custom === 'true' || req.body.is_custom === true || false;
        const createdKits = [];
        for (const skId of targetSolarKitIds) {
            // Check if name already exists for this country
            const nameDup = await ComboKit.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                country_id: country_id || null,
                is_custom,
                deleted_at: null
            });
            if (nameDup) {
                if (targetSolarKitIds.length === 1) {
                    return res.status(400).json({ status: 'error', message: 'A kit with this name already exists for this country.' });
                }
                continue;
            }

            // Note: Multiple combo kits can share the same solar kit — no uniqueness check on solar_kit_id

            const newKit = new ComboKit({
                name,
                description: description || null,
                country_id: country_id || null,
                solar_kit_id: skId,
                brand_id: brand_id || null,
                project_range_id: project_range_id || null,
                capacity: capacity || 0,
                inverter_tolerance: inverter_tolerance || 10,
                inverter_mode: inverter_mode || 'single',
                kit_image,
                variant_id: targetVariantIds[0] || null,
                variant_ids: targetVariantIds,
                order_quantities: (order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b),
                loose_order_quantities: (loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b),
                allow_trial_kit,
                trial_kit_quantity,
                trial_kit_max_orders_per_buyer,
                base_components: mappedBaseComponents,
                bos_kits: mappedBosKits,
                is_custom
            });

            await newKit.save();
            createdKits.push(newKit);

            sendAdminNotification({
                title: `New Combo Kit Created: ${newKit.name}`,
                message: `Combo Kit "${newKit.name}" (${newKit.capacity || 0}kW) created. Company Margin & Warehouse Kit Activation required to display in store.`,
                category: 'configuration',
                priority: 'high',
                action_url: '/admin-panel/solar-shop/company-margin',
                metadata: { combo_kit_id: newKit._id, kit_name: newKit.name }
            }).catch(err => console.warn('[ComboKit Notification Warning]:', err.message));
        }

        res.status(201).json({ status: 'success', message: 'Combo Kit configured successfully.', data: createdKits });
    } catch (error) {
        console.error("Error in create_combo_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_combo_kits = async (req, res) => {
    try {
        const is_custom = req.query.is_custom === 'true' || req.query.is_custom === true;
        const country_id = req.query.country_id;
        const query = { deleted_at: null, is_custom };
         if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (isIndia) {
                return res.status(400).json({ status: 'error', message: 'Use India endpoint to retrieve India configurations.' });
            }
            query.country_id = country_id;
        }

        const cluster_id = req.query.cluster_id;
        if (cluster_id) {
            const districts = await GeoLevel2.find({ cluster: cluster_id, deleted_at: null }).select('_id').lean();
            const districtIds = districts.map(d => d._id);
            const warehouses = await CompanyWarehouse.find({ level_2: { $in: districtIds }, is_active: true, deleted_at: null }).select('_id').lean();
            const warehouseIds = warehouses.map(w => w._id);
            const { WarehouseKitActivation } = require('../models/core_db');
            const activations = await WarehouseKitActivation.find({ warehouse_id: { $in: warehouseIds }, is_active: true, deleted_at: null }).select('combo_kit_id').lean();
            const activeKitIds = activations.map(a => a.combo_kit_id).filter(Boolean);
            query._id = { $in: activeKitIds };
        }
        const kits = await ComboKit.find(query)
            .populate('brand_id', 'brand_name logo')
            .populate({
                path: 'solar_kit_id',
                populate: [
                    { path: 'category_id' },
                    { path: 'subcategory_id' },
                    {
                        path: 'type_id',
                        populate: {
                            path: 'type',
                            model: 'sys_filter_types'
                        }
                    }
                ]
            })
            .populate('project_range_id')
            .populate({
                path: 'base_components.template_id',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate('base_components.subtype_id', 'name')
            .populate('base_components.brand_id', 'brand_name logo')
            .populate('base_components.brand_ids', 'brand_name logo')
            .populate({
                path: 'base_components.sku_id',
                select: 'sku_code product_id',
                populate: {
                    path: 'product_id',
                    select: 'name image'
                }
            })
            .populate('bos_kits.brand_id', 'brand_name logo')
            .populate('bos_kits.brand_ids', 'brand_name logo')
            .populate({
                path: 'bos_kits.sku_id',
                select: 'sku_code product_id',
                populate: {
                    path: 'product_id',
                    select: 'name image'
                }
            })
            .populate({
                path: 'bos_kits.template_ids',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate('bos_kits.subtype_ids', 'name');

        const countryIds = normalizeObjectIds(kits.map(k => k.country_id));
        const countries = await GeoLevel0.find({ _id: { $in: countryIds } });
        const countryMap = Object.fromEntries(countries.map(c => [c._id.toString(), c.name]));

        const variantIds = [];
        kits.forEach(k => {
            if (k.variant_id) variantIds.push(k.variant_id);
            if (k.variant_ids && Array.isArray(k.variant_ids)) {
                k.variant_ids.forEach(id => {
                    if (id) variantIds.push(id);
                });
            }
        });
        const uniqueVariantIds = [...new Set(variantIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
        const { ComboKitVariant } = require('../models/core_db');
        const activeVariants = await ComboKitVariant.find({
            deleted_at: null,
            'variants._id': { $in: uniqueVariantIds }
        }).lean();
        const variantMap = {};
        for (const av of activeVariants) {
            for (const v of av.variants || []) {
                if (v._id) {
                    variantMap[v._id.toString()] = {
                        id: v._id,
                        name: v.name,
                        additional_price: v.additional_price,
                        worth_price: v.worth_price,
                        additional_features: v.additional_features
                    };
                }
            }
        }

        const results = kits.map(k => {
            const obj = k.toObject({ virtuals: true });
            obj.country_name = countryMap[k.country_id?.toString()] || 'Unknown Country';
            obj.variant = k.variant_id ? (variantMap[k.variant_id.toString()] || null) : null;
            obj.variants = [];
            if (k.variant_ids && k.variant_ids.length > 0) {
                obj.variants = k.variant_ids.map(id => variantMap[id.toString()]).filter(Boolean);
            } else if (k.variant_id) {
                const v = variantMap[k.variant_id.toString()];
                if (v) obj.variants = [v];
            }
            return obj;
        });

        res.status(200).json({ status: 'success', data: results });
    } catch (error) {
        console.error("Error in get_combo_kits:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const update_combo_kit = async (req, res) => {
    try {
        const { id, name, description, solar_kit_id, project_range_id, capacity, inverter_tolerance, inverter_mode, country_id, variant_id, brand_id } = req.body;
        const base_components = parseJSON(req.body.base_components, []);
        const bos_kits = parseJSON(req.body.bos_kits, []);

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Combo Kit ID.' });
        }

        const existingKit = await ComboKit.findById(id);
        if (!existingKit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        const targetSolarKitId = solar_kit_id || existingKit.solar_kit_id;
        const targetCountryId = country_id || existingKit.country_id;

        if (targetCountryId) {
            const isIndia = await isCountryIndia(targetCountryId);
            if (isIndia) {
                return res.status(400).json({ status: 'error', message: 'India country configurations must be saved in the India database.' });
            }
        }
        const is_custom = req.body.is_custom !== undefined ? (req.body.is_custom === 'true' || req.body.is_custom === true) : existingKit.is_custom;

        // Check if name already exists in target country
        if (name) {
            const nameDup = await ComboKit.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                country_id: targetCountryId ? new mongoose.Types.ObjectId(targetCountryId) : null,
                is_custom,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
                deleted_at: null
            });
            if (nameDup) {
                return res.status(400).json({ status: 'error', message: 'A combo kit with this name already exists.' });
            }
        }

        // Note: Multiple combo kits can share the same solar kit — no uniqueness check on solar_kit_id

        // Process file uploads
        let kit_image = existingKit.kit_image;
        const bos_images = {};

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.fieldname === 'kit_image') {
                    kit_image = file.path;
                } else if (file.fieldname.startsWith('bos_kit_image_')) {
                    const idx = file.fieldname.replace('bos_kit_image_', '');
                    bos_images[idx] = file.path;
                }
            }
        }

        if (!kit_image) {
            return res.status(400).json({ status: 'error', message: 'Combo kit cover image is required.' });
        }

        if (kit_image !== existingKit.kit_image && existingKit.kit_image) {
            delete_uploaded_files([{ path: existingKit.kit_image }]);
        }

        // Map base components
        const mappedBaseComponents = base_components.map(bc => ({
            template_id: cleanId(bc.template_id) || bc.template_id,
            subtype_id: cleanId(bc.subtype_id),
            brand_id: cleanId(bc.brand_id),
            brand_ids: (bc.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bc.sku_id),
            quantity: parseFloat(bc.quantity) || 1
        }));

        // Map BOS kits and assign new or existing images
        const mappedBosKits = bos_kits.map((bk, idx) => ({
            name: bk.name,
            brand_id: cleanId(bk.brand_id),
            brand_ids: (bk.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bk.sku_id),
            quantity: parseFloat(bk.quantity) || 1,
            image: bos_images[idx] || bk.image || existingKit.bos_kits?.[idx]?.image || null,
            template_ids: (bk.template_ids || []).map(cleanId).filter(Boolean),
            subtype_ids: (bk.subtype_ids || []).map(cleanId).filter(Boolean)
        }));

        if (mappedBosKits.some(bk => !bk.image)) {
            const filesToClean = [];
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => {
                    if (f.path !== existingKit.kit_image) {
                        filesToClean.push({ path: f.path });
                    }
                });
            }
            if (filesToClean.length > 0) delete_uploaded_files(filesToClean);

            return res.status(400).json({ status: 'error', message: 'All BOS kit components must have an image.' });
        }

        // Delete old BOS images that are replaced/removed
        const oldBosImages = (existingKit.bos_kits || []).map(bk => bk.image).filter(Boolean);
        const newBosImages = mappedBosKits.map(bk => bk.image).filter(Boolean);
        const removedBosImages = oldBosImages.filter(img => !newBosImages.includes(img));
        if (removedBosImages.length > 0) {
            delete_uploaded_files(removedBosImages.map(img => ({ path: img })));
        }

        const baseChanged = didBaseComponentsChange(existingKit.base_components, mappedBaseComponents);
        const bosChanged = didBosKitsChange(existingKit.bos_kits, mappedBosKits);

        existingKit.name = name || existingKit.name;
        existingKit.description = description !== undefined ? description : existingKit.description;
        existingKit.country_id = country_id !== undefined ? country_id : existingKit.country_id;
        existingKit.solar_kit_id = targetSolarKitId;
        existingKit.brand_id = brand_id !== undefined ? (brand_id || null) : existingKit.brand_id;
        existingKit.project_range_id = project_range_id !== undefined ? (project_range_id || null) : existingKit.project_range_id;
        if (req.body.variant_ids !== undefined) {
            const variant_ids = parseJSON(req.body.variant_ids, []);
            const targetVariantIds = variant_ids.map(id => id.id || id._id || id);
            existingKit.variant_ids = targetVariantIds;
            existingKit.variant_id = targetVariantIds[0] || null;
        } else if (variant_id !== undefined) {
            existingKit.variant_id = variant_id || null;
            existingKit.variant_ids = variant_id ? [variant_id] : [];
        }
        if (req.body.order_quantities !== undefined) {
            const order_quantities = parseJSON(req.body.order_quantities, []);
            existingKit.order_quantities = (order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
        }
        if (req.body.loose_order_quantities !== undefined) {
            const loose_order_quantities = parseJSON(req.body.loose_order_quantities, []);
            existingKit.loose_order_quantities = (loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
        }
        if (req.body.allow_trial_kit !== undefined) {
            existingKit.allow_trial_kit = req.body.allow_trial_kit === 'true' || req.body.allow_trial_kit === true;
        }
        if (req.body.trial_kit_quantity !== undefined) {
            existingKit.trial_kit_quantity = parseInt(req.body.trial_kit_quantity, 10) || 10;
        }
        if (req.body.trial_kit_max_orders_per_buyer !== undefined) {
            existingKit.trial_kit_max_orders_per_buyer = Math.max(0, parseInt(req.body.trial_kit_max_orders_per_buyer, 10) || 0);
        }
        existingKit.capacity = capacity !== undefined ? capacity : existingKit.capacity;
        existingKit.inverter_tolerance = inverter_tolerance !== undefined ? inverter_tolerance : existingKit.inverter_tolerance;
        existingKit.inverter_mode = inverter_mode !== undefined ? inverter_mode : existingKit.inverter_mode;
        existingKit.kit_image = kit_image;
        existingKit.base_components = mappedBaseComponents;
        existingKit.bos_kits = mappedBosKits;
        if (req.body.is_custom !== undefined) {
            existingKit.is_custom = req.body.is_custom === 'true' || req.body.is_custom === true;
        }

        if (baseChanged || bosChanged) {
            // Deactivate from all warehouses
            await WarehouseKitActivation.updateMany(
                { combo_kit_id: id, deleted_at: null },
                { $set: { is_combokit_active: false, is_customize_kit_active: false, updated_at: new Date() } }
            );

            // Also auto-deactivate bulk kit settings
            const query = {
                combo_kit_id: new mongoose.Types.ObjectId(id),
                deleted_at: null,
            };
            const update = {
                $set: {
                    is_bulk_enabled: false,
                    updated_at: new Date(),
                }
            };
            try {
                const { BulkKitSetting } = require('../models/core_db');
                await BulkKitSetting.updateMany(query, update);
            } catch (e) {
                console.error("Error auto-deactivating bulk kit settings in core_db:", e);
            }
            try {
                const { BulkKitSetting: IndiaBulkKitSetting } = require('../models/india_solarshop_db');
                await IndiaBulkKitSetting.updateMany(query, update);
            } catch (e) {
                console.error("Error auto-deactivating bulk kit settings in india_solarshop_db:", e);
            }
        }

        await existingKit.save();

        res.status(200).json({ status: 'success', message: 'Combo Kit updated successfully.', data: existingKit });
    } catch (error) {
        console.error("Error in update_combo_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const delete_combo_kit = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Combo Kit ID.' });
        }

        const { WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');
        let kit = await ComboKit.findById(id);
        if (!kit) {
            kit = await IndiaComboKit.findById(id);
        }
        if (!kit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        kit.deleted_at = new Date();
        await kit.save();

        try {
            const rawDb = mongoose.connection.db;
            if (rawDb) {
                await rawDb.collection('pc_combo_kits').updateOne(
                    { _id: kit._id },
                    { $set: { deleted_at: kit.deleted_at } }
                );
            }
            const { WarehouseKitActivation } = require('../models/core_db');
            const { KitDeliveryCostRule, ComboKitWeightMaster } = require('../models/india_solarshop_db');
            await Promise.allSettled([
                WarehouseKitActivation.updateMany({ combo_kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at, is_active: false, is_combokit_active: false } }),
                KitDeliveryCostRule.updateMany({ kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at, is_active: false } }),
                ComboKitWeightMaster.updateMany({ kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at } }),
            ]);
        } catch (e) {
            console.warn('[delete_combo_kit] Cascade delete warning:', e.message);
        }

        res.status(200).json({ status: 'success', message: 'Combo Kit deleted successfully.' });
    } catch (error) {
        console.error("Error in delete_combo_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const create_combo_kit_india = async (req, res) => {
    try {
        const { name, description, solar_kit_id, project_range_id, capacity, inverter_tolerance, inverter_mode, country_id, variant_id, brand_id } = req.body;
        const variant_ids = parseJSON(req.body.variant_ids, []);
        const targetVariantIds = variant_ids.length > 0 
            ? variant_ids.map(id => id.id || id._id || id)
            : (variant_id ? [variant_id] : []);
        const order_quantities = parseJSON(req.body.order_quantities, []);
        const loose_order_quantities = parseJSON(req.body.loose_order_quantities, []);
        const allow_trial_kit = req.body.allow_trial_kit === 'true' || req.body.allow_trial_kit === true;
        const trial_kit_quantity = parseInt(req.body.trial_kit_quantity, 10) || 10;
        const trial_kit_max_orders_per_buyer = req.body.trial_kit_max_orders_per_buyer !== undefined ? Math.max(0, parseInt(req.body.trial_kit_max_orders_per_buyer, 10) || 0) : 1;
        const base_components = parseJSON(req.body.base_components, []);
        const bos_kits = parseJSON(req.body.bos_kits, []);
        const solarKitIds = parseJSON(req.body.solar_kit_ids, []);
        const targetSolarKitIds = solarKitIds.length > 0 ? solarKitIds : (solar_kit_id ? [solar_kit_id] : []);

        if (!name || targetSolarKitIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Missing combo kit name or solar kit definition.' });
        }

        if (!country_id) {
            return res.status(400).json({ status: 'error', message: 'Missing country ID.' });
        }
        const isIndia = await isCountryIndia(country_id);
        if (!isIndia) {
            return res.status(400).json({ status: 'error', message: 'Cannot save non-India country configurations in the India database.' });
        }

        // Process file uploads
        let kit_image = null;
        const bos_images = {};

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.fieldname === 'kit_image') {
                    kit_image = file.path;
                } else if (file.fieldname.startsWith('bos_kit_image_')) {
                    const idx = file.fieldname.replace('bos_kit_image_', '');
                    bos_images[idx] = file.path;
                }
            }
        }

        if (!kit_image) {
            return res.status(400).json({ status: 'error', message: 'Combo kit cover image is required.' });
        }

        // Map base components
        const mappedBaseComponents = base_components.map(bc => ({
            template_id: cleanId(bc.template_id) || bc.template_id,
            subtype_id: cleanId(bc.subtype_id),
            brand_id: cleanId(bc.brand_id),
            brand_ids: (bc.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bc.sku_id),
            quantity: parseFloat(bc.quantity) || 1
        }));

        // Map BOS kits and assign images
        const mappedBosKits = bos_kits.map((bk, idx) => ({
            name: bk.name,
            brand_id: cleanId(bk.brand_id),
            brand_ids: (bk.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bk.sku_id),
            quantity: parseFloat(bk.quantity) || 1,
            image: bos_images[idx] || bk.image || null,
            template_ids: (bk.template_ids || []).map(cleanId).filter(Boolean),
            subtype_ids: (bk.subtype_ids || []).map(cleanId).filter(Boolean)
        }));

        if (mappedBosKits.some(bk => !bk.image)) {
            const filesToClean = [];
            if (kit_image) filesToClean.push({ path: kit_image });
            Object.values(bos_images).forEach(p => filesToClean.push({ path: p }));
            if (filesToClean.length > 0) delete_uploaded_files(filesToClean);

            return res.status(400).json({ status: 'error', message: 'All BOS kit components must have an image.' });
        }

        const is_custom = req.body.is_custom === 'true' || req.body.is_custom === true || false;
        const createdKits = [];
        for (const skId of targetSolarKitIds) {
            // Check duplicate name
            const nameDup = await ComboKitIndia.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                country_id: country_id || null,
                is_custom,
                deleted_at: null
            });
            if (nameDup) {
                if (targetSolarKitIds.length === 1) {
                    return res.status(400).json({ status: 'error', message: 'A kit with this name already exists.' });
                }
                continue;
            }

            // Note: Multiple combo kits can share the same solar kit — no uniqueness check on solar_kit_id

            const newKit = new ComboKitIndia({
                name,
                description: description || null,
                country_id: country_id || null,
                solar_kit_id: skId,
                brand_id: brand_id || null,
                project_range_id: project_range_id || null,
                capacity: capacity || 0,
                inverter_tolerance: inverter_tolerance || 10,
                inverter_mode: inverter_mode || 'single',
                kit_image,
                variant_id: targetVariantIds[0] || null,
                variant_ids: targetVariantIds,
                order_quantities: (order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b),
                loose_order_quantities: (loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b),
                allow_trial_kit,
                trial_kit_quantity,
                trial_kit_max_orders_per_buyer,
                base_components: mappedBaseComponents,
                bos_kits: mappedBosKits,
                is_custom
            });

            await newKit.save();
            createdKits.push(newKit);

            sendAdminNotification({
                title: `New Combo Kit Created: ${newKit.name}`,
                message: `Combo Kit "${newKit.name}" (${newKit.capacity || 0}kW) created. Company Margin & Warehouse Kit Activation required to display in store.`,
                category: 'configuration',
                priority: 'high',
                action_url: '/admin-panel/solar-shop/company-margin',
                metadata: { combo_kit_id: newKit._id, kit_name: newKit.name }
            }).catch(err => console.warn('[ComboKit Notification Warning]:', err.message));
        }

        res.status(201).json({ status: 'success', message: 'Combo Kit configured successfully.', data: createdKits });
    } catch (error) {
        console.error("Error in create_combo_kit_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_combo_kits_india = async (req, res) => {
    try {
        const is_custom = req.query.is_custom === 'true' || req.query.is_custom === true;
        const country_id = req.query.country_id;
        const query = { deleted_at: null, is_custom };
        if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (!isIndia) {
                return res.status(400).json({ status: 'error', message: 'Cannot retrieve non-India country configurations from the India database.' });
            }
            query.country_id = country_id;
        }

        const cluster_id = req.query.cluster_id;
        if (cluster_id) {
            const districts = await GeoLevel2.find({ cluster: cluster_id, deleted_at: null }).select('_id').lean();
            const districtIds = districts.map(d => d._id);
            const warehouses = await CompanyWarehouse.find({ level_2: { $in: districtIds }, is_active: true, deleted_at: null }).select('_id').lean();
            const warehouseIds = warehouses.map(w => w._id);
            const { WarehouseKitActivation } = require('../models/core_db');
            const activations = await WarehouseKitActivation.find({ warehouse_id: { $in: warehouseIds }, is_active: true, deleted_at: null }).select('combo_kit_id').lean();
            const activeKitIds = activations.map(a => a.combo_kit_id).filter(Boolean);
            query._id = { $in: activeKitIds };
        }
        const { WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');
        const kitsCore = await ComboKit.find(query).lean();
        const kitsIndia = await IndiaComboKit.find(query).lean();
        const kitsMap = new Map();
        [...kitsCore, ...kitsIndia].forEach(k => kitsMap.set(k._id.toString(), k));
        const kits = Array.from(kitsMap.values());

        // Fetch cross-database references from solarkits_core_db
        const solarKitIds = normalizeObjectIds(kits.map(k => k.solar_kit_id));
        const projectRangeIds = normalizeObjectIds(kits.map(k => k.project_range_id));
        const brandIds = normalizeObjectIds([
            ...kits.map(k => k.brand_id),
            ...kits.flatMap(k => (k.base_components || []).map(bc => bc.brand_id)),
            ...kits.flatMap(k => (k.base_components || []).flatMap(bc => bc.brand_ids || [])),
            ...kits.flatMap(k => (k.bos_kits || []).map(bk => bk.brand_id)),
            ...kits.flatMap(k => (k.bos_kits || []).flatMap(bk => bk.brand_ids || []))
        ]);
        const templateIds = normalizeObjectIds([
            ...kits.flatMap(k => (k.base_components || []).map(bc => bc.template_id)),
            ...kits.flatMap(k => (k.bos_kits || []).flatMap(bk => bk.template_ids || []))
        ]);
        const skuIds = normalizeObjectIds([
            ...kits.flatMap(k => (k.base_components || []).map(bc => bc.sku_id)),
            ...kits.flatMap(k => (k.bos_kits || []).map(bk => bk.sku_id))
        ]);
        const subtypeIds = normalizeObjectIds([
            ...kits.flatMap(k => (k.base_components || []).map(bc => bc.subtype_id)),
            ...kits.flatMap(k => (k.bos_kits || []).flatMap(bk => bk.subtype_ids || []))
        ]);

        const [solarKits, brands, templates, skus, projectRanges, subtypes] = await Promise.all([
            SolarKit.find({ _id: { $in: solarKitIds } })
                .populate('category_id')
                .populate('subcategory_id')
                .populate({
                    path: 'type_id',
                    populate: {
                        path: 'type',
                        model: 'sys_filter_types'
                    }
                })
                .populate({
                    path: 'base_template_ids',
                    populate: { path: 'qty_unit_id' }
                })
                .populate({
                    path: 'bos_template_ids',
                    populate: { path: 'qty_unit_id' }
                })
                .lean(),
            Brand.find({ _id: { $in: brandIds } }).lean(),
            ProductTemplate.find({ _id: { $in: templateIds } }).populate('qty_unit_id').lean(),
            ProductSku.find({ _id: { $in: skuIds } }).populate('product_id', 'name image').lean(),
            ProjectRange.find({ _id: { $in: projectRangeIds } }).populate('unit_id').lean(),
            ProductSubtype.find({ _id: { $in: subtypeIds } }).lean()
        ]);

        const solarKitMap = Object.fromEntries(solarKits.map(s => [s._id.toString(), s]));
        const brandMap = Object.fromEntries(brands.map(b => [b._id.toString(), b]));
        const templateMap = Object.fromEntries(templates.map(t => [t._id.toString(), t]));
        const skuMap = Object.fromEntries(skus.map(s => [s._id.toString(), s]));
        const projectRangeMap = Object.fromEntries(projectRanges.map(pr => [pr._id.toString(), pr]));
        const subtypeMap = Object.fromEntries(subtypes.map(st => [st._id.toString(), st]));

        // Fetch country names manually
        const countryIds = normalizeObjectIds(kits.map(k => k.country_id));
        const countries = await GeoLevel0.find({ _id: { $in: countryIds } });
        const countryMap = Object.fromEntries(countries.map(c => [c._id.toString(), c.name]));

        const variantIds = [];
        kits.forEach(k => {
            if (k.variant_id) variantIds.push(k.variant_id);
            if (k.variant_ids && Array.isArray(k.variant_ids)) {
                k.variant_ids.forEach(id => {
                    if (id) variantIds.push(id);
                });
            }
        });
        const uniqueVariantIds = [...new Set(variantIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
        const { ComboKitVariant: IndiaComboKitVariant } = require('../models/india_solarshop_db');
        const activeVariants = await IndiaComboKitVariant.find({
            deleted_at: null,
            'variants._id': { $in: uniqueVariantIds }
        }).lean();
        const variantMap = {};
        for (const av of activeVariants) {
            for (const v of av.variants || []) {
                if (v._id) {
                    variantMap[v._id.toString()] = {
                        id: v._id,
                        name: v.name,
                        additional_price: v.additional_price,
                        worth_price: v.worth_price,
                        additional_features: v.additional_features
                    };
                }
            }
        }

        const results = kits.map(k => {
            const country_name = countryMap[k.country_id?.toString()] || 'Unknown Country';
            const solarKitObj = solarKitMap[k.solar_kit_id?.toString()] || null;
            const projectRangeObj = projectRangeMap[k.project_range_id?.toString()] || null;

            const baseComponentsPopulated = (k.base_components || []).map(bc => ({
                template_id: templateMap[bc.template_id?.toString()] || null,
                subtype_id: subtypeMap[bc.subtype_id?.toString()] || null,
                brand_id: brandMap[bc.brand_id?.toString()] || null,
                brand_ids: (bc.brand_ids || []).map(bid => brandMap[bid.toString()] || null).filter(Boolean),
                sku_id: skuMap[bc.sku_id?.toString()] || null,
                quantity: bc.quantity || 1
            }));
            const bosKitsPopulated = (k.bos_kits || []).map(bk => ({
                name: bk.name,
                brand_id: brandMap[bk.brand_id?.toString()] || null,
                brand_ids: (bk.brand_ids || []).map(bid => brandMap[bid.toString()] || null).filter(Boolean),
                sku_id: skuMap[bk.sku_id?.toString()] || null,
                quantity: bk.quantity || 1,
                image: bk.image || null,
                template_ids: (bk.template_ids || []).map(tid => templateMap[tid.toString()] || null),
                subtype_ids: (bk.subtype_ids || []).map(sid => subtypeMap[sid.toString()] || null)
            }));

            const variantsPopulated = [];
            if (k.variant_ids && k.variant_ids.length > 0) {
                k.variant_ids.forEach(id => {
                    const v = variantMap[id.toString()];
                    if (v) variantsPopulated.push(v);
                });
            } else if (k.variant_id) {
                const v = variantMap[k.variant_id.toString()];
                if (v) variantsPopulated.push(v);
            }

            return {
                ...k,
                id: k._id,
                brand_id: brandMap[k.brand_id?.toString()] || null,
                country_name,
                solar_kit_id: solarKitObj,
                project_range_id: projectRangeObj,
                base_components: baseComponentsPopulated,
                bos_kits: bosKitsPopulated,
                variant: k.variant_id ? (variantMap[k.variant_id.toString()] || null) : null,
                variants: variantsPopulated
            };
        });

        res.status(200).json({ status: 'success', data: results });
    } catch (error) {
        console.error("Error in get_combo_kits_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const update_combo_kit_india = async (req, res) => {
    try {
        const { id, name, description, solar_kit_id, project_range_id, capacity, inverter_tolerance, inverter_mode, country_id, variant_id, brand_id } = req.body;
        const base_components = parseJSON(req.body.base_components, []);
        const bos_kits = parseJSON(req.body.bos_kits, []);

        if (!id) {
            console.log("Validation Failed: Missing Combo Kit ID.");
            return res.status(400).json({ status: 'error', message: 'Missing Combo Kit ID.' });
        }

        const { WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');
        let existingKit = await ComboKitIndia.findById(id);
        if (!existingKit) {
            existingKit = await IndiaComboKit.findById(id);
        }
        if (!existingKit) {
            console.log("Validation Failed: Combo Kit not found for ID:", id);
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        const targetSolarKitId = solar_kit_id || existingKit.solar_kit_id;
        const targetCountryId = country_id || existingKit.country_id;

        if (!targetCountryId) {
            console.log("Validation Failed: Missing country ID.");
            return res.status(400).json({ status: 'error', message: 'Missing country ID.' });
        }
        const isIndia = await isCountryIndia(targetCountryId);
        if (!isIndia) {
            console.log("Validation Failed: country is not India:", targetCountryId);
            return res.status(400).json({ status: 'error', message: 'Cannot save non-India country configurations in the India database.' });
        }
        const is_custom = req.body.is_custom !== undefined ? (req.body.is_custom === 'true' || req.body.is_custom === true) : existingKit.is_custom;

        // Check if name already exists in target country
        if (name) {
            const nameDup = await ComboKitIndia.findOne({
                name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
                country_id: targetCountryId ? new mongoose.Types.ObjectId(targetCountryId) : null,
                is_custom,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
                deleted_at: null
            });
            if (nameDup) {
                console.log("Validation Failed: duplicate name found:", name);
                return res.status(400).json({ status: 'error', message: 'A kit with this name already exists.' });
            }
        }

        // Note: Multiple combo kits can share the same solar kit — no uniqueness check on solar_kit_id

        // Process file uploads
        let kit_image = existingKit.kit_image;
        const bos_images = {};

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.fieldname === 'kit_image') {
                    kit_image = file.path;
                } else if (file.fieldname.startsWith('bos_kit_image_')) {
                    const idx = file.fieldname.replace('bos_kit_image_', '');
                    bos_images[idx] = file.path;
                }
            }
        }

        if (!kit_image) {
            return res.status(400).json({ status: 'error', message: 'Combo kit cover image is required.' });
        }

        if (kit_image !== existingKit.kit_image && existingKit.kit_image) {
            delete_uploaded_files([{ path: existingKit.kit_image }]);
        }

        // Map base components
        const mappedBaseComponents = base_components.map(bc => ({
            template_id: cleanId(bc.template_id) || bc.template_id,
            subtype_id: cleanId(bc.subtype_id),
            brand_id: cleanId(bc.brand_id),
            brand_ids: (bc.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bc.sku_id),
            quantity: parseFloat(bc.quantity) || 1
        }));

        // Map BOS kits and assign new or existing images
        const mappedBosKits = bos_kits.map((bk, idx) => ({
            name: bk.name,
            brand_id: cleanId(bk.brand_id),
            brand_ids: (bk.brand_ids || []).map(cleanId).filter(Boolean),
            sku_id: cleanId(bk.sku_id),
            quantity: parseFloat(bk.quantity) || 1,
            image: bos_images[idx] || bk.image || existingKit.bos_kits?.[idx]?.image || null,
            template_ids: (bk.template_ids || []).map(cleanId).filter(Boolean),
            subtype_ids: (bk.subtype_ids || []).map(cleanId).filter(Boolean)
        }));

        if (mappedBosKits.some(bk => !bk.image)) {
            const filesToClean = [];
            if (req.files && req.files.length > 0) {
                req.files.forEach(f => {
                    if (f.path !== existingKit.kit_image) {
                        filesToClean.push({ path: f.path });
                    }
                });
            }
            if (filesToClean.length > 0) delete_uploaded_files(filesToClean);

            return res.status(400).json({ status: 'error', message: 'All BOS kit components must have an image.' });
        }

        // Delete old BOS images that are replaced/removed
        const oldBosImages = (existingKit.bos_kits || []).map(bk => bk.image).filter(Boolean);
        const newBosImages = mappedBosKits.map(bk => bk.image).filter(Boolean);
        const removedBosImages = oldBosImages.filter(img => !newBosImages.includes(img));
        if (removedBosImages.length > 0) {
            delete_uploaded_files(removedBosImages.map(img => ({ path: img })));
        }

        const baseChanged = didBaseComponentsChange(existingKit.base_components, mappedBaseComponents);
        const bosChanged = didBosKitsChange(existingKit.bos_kits, mappedBosKits);

        existingKit.name = name || existingKit.name;
        existingKit.description = description !== undefined ? description : existingKit.description;
        existingKit.country_id = country_id !== undefined ? country_id : existingKit.country_id;
        existingKit.solar_kit_id = solar_kit_id || existingKit.solar_kit_id;
        existingKit.brand_id = brand_id !== undefined ? (brand_id || null) : existingKit.brand_id;
        existingKit.project_range_id = project_range_id !== undefined ? (project_range_id || null) : existingKit.project_range_id;
        const variant_ids = parseJSON(req.body.variant_ids, null);
        if (variant_ids !== null) {
            const targetVariantIds = variant_ids.map(id => id.id || id._id || id);
            existingKit.variant_ids = targetVariantIds;
            existingKit.variant_id = targetVariantIds[0] || null;
        } else if (variant_id !== undefined) {
            existingKit.variant_id = variant_id || null;
            existingKit.variant_ids = variant_id ? [variant_id] : [];
        }
        if (req.body.order_quantities !== undefined) {
            const order_quantities = parseJSON(req.body.order_quantities, []);
            existingKit.order_quantities = (order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
        }
        if (req.body.loose_order_quantities !== undefined) {
            const loose_order_quantities = parseJSON(req.body.loose_order_quantities, []);
            existingKit.loose_order_quantities = (loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
        }
        if (req.body.allow_trial_kit !== undefined) {
            existingKit.allow_trial_kit = req.body.allow_trial_kit === 'true' || req.body.allow_trial_kit === true;
        }
        if (req.body.trial_kit_quantity !== undefined) {
            existingKit.trial_kit_quantity = parseInt(req.body.trial_kit_quantity, 10) || 10;
        }
        if (req.body.trial_kit_max_orders_per_buyer !== undefined) {
            existingKit.trial_kit_max_orders_per_buyer = Math.max(0, parseInt(req.body.trial_kit_max_orders_per_buyer, 10) || 0);
        }
        existingKit.capacity = capacity !== undefined ? capacity : existingKit.capacity;
        existingKit.inverter_tolerance = inverter_tolerance !== undefined ? inverter_tolerance : existingKit.inverter_tolerance;
        existingKit.inverter_mode = inverter_mode !== undefined ? inverter_mode : existingKit.inverter_mode;
        existingKit.kit_image = kit_image;
        existingKit.base_components = mappedBaseComponents;
        existingKit.bos_kits = mappedBosKits;
        if (req.body.is_custom !== undefined) {
            existingKit.is_custom = req.body.is_custom === 'true' || req.body.is_custom === true;
        }

        if (baseChanged || bosChanged) {
            // Deactivate from all warehouses
            await WarehouseKitActivation.updateMany(
                { combo_kit_id: id, deleted_at: null },
                { $set: { is_combokit_active: false, is_customize_kit_active: false, updated_at: new Date() } }
            );

            // Also auto-deactivate bulk kit settings
            const query = {
                combo_kit_id: new mongoose.Types.ObjectId(id),
                deleted_at: null,
            };
            const update = {
                $set: {
                    is_bulk_enabled: false,
                    updated_at: new Date(),
                }
            };
            try {
                const { BulkKitSetting } = require('../models/core_db');
                await BulkKitSetting.updateMany(query, update);
            } catch (e) {
                console.error("Error auto-deactivating bulk kit settings in core_db:", e);
            }
            try {
                const { BulkKitSetting: IndiaBulkKitSetting } = require('../models/india_solarshop_db');
                await IndiaBulkKitSetting.updateMany(query, update);
            } catch (e) {
                console.error("Error auto-deactivating bulk kit settings in india_solarshop_db:", e);
            }
        }

        await existingKit.save();

        if (req.body.order_quantities !== undefined || req.body.loose_order_quantities !== undefined || req.body.allow_trial_kit !== undefined || req.body.trial_kit_quantity !== undefined || req.body.trial_kit_max_orders_per_buyer !== undefined) {
            try {
                const otherModel = existingKit.constructor.modelName === 'pc_combo_kits' ? ComboKitIndia : IndiaComboKit;
                const syncData = {};
                if (req.body.order_quantities !== undefined) syncData.order_quantities = (existingKit.order_quantities || []);
                if (req.body.loose_order_quantities !== undefined) syncData.loose_order_quantities = (existingKit.loose_order_quantities || []);
                if (req.body.allow_trial_kit !== undefined) syncData.allow_trial_kit = existingKit.allow_trial_kit;
                if (req.body.trial_kit_quantity !== undefined) syncData.trial_kit_quantity = existingKit.trial_kit_quantity;
                if (req.body.trial_kit_max_orders_per_buyer !== undefined) syncData.trial_kit_max_orders_per_buyer = existingKit.trial_kit_max_orders_per_buyer;
                await otherModel.updateMany(
                    { name: { $regex: new RegExp(`^${existingKit.name.trim()}$`, 'i') }, deleted_at: null },
                    { $set: syncData }
                );
            } catch (e) {
                console.warn('Dual-sync order_quantities/trial_kit error:', e.message);
            }
        }

        res.status(200).json({ status: 'success', message: 'Combo Kit updated successfully.', data: existingKit });
    } catch (error) {
        console.error("Error in update_combo_kit_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const delete_combo_kit_india = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Combo Kit ID.' });
        }

        const { WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');
        let kit = await ComboKit.findById(id);
        if (!kit) {
            kit = await IndiaComboKit.findById(id);
        }
        if (!kit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        kit.deleted_at = new Date();
        await kit.save();

        try {
            const rawDb = mongoose.connection.db;
            if (rawDb) {
                await rawDb.collection('pc_combo_kits').updateOne(
                    { _id: kit._id },
                    { $set: { deleted_at: kit.deleted_at } }
                );
            }
            const { WarehouseKitActivation } = require('../models/core_db');
            const { KitDeliveryCostRule, ComboKitWeightMaster } = require('../models/india_solarshop_db');
            await Promise.allSettled([
                WarehouseKitActivation.updateMany({ combo_kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at, is_active: false, is_combokit_active: false } }),
                KitDeliveryCostRule.updateMany({ kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at, is_active: false } }),
                ComboKitWeightMaster.updateMany({ kit_id: kit._id }, { $set: { deleted_at: kit.deleted_at } }),
            ]);
        } catch (e) {
            console.warn('[delete_combo_kit_india] Cascade delete warning:', e.message);
        }

        res.status(200).json({ status: 'success', message: 'Combo Kit deleted successfully.' });
    } catch (error) {
        console.error("Error in delete_combo_kit_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_combo_kit_status = async (req, res) => {
    try {
        const { id } = req.params;
        const { warehouse_id } = req.query;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Combo Kit ID.' });
        }

        // Try to find the kit in both core and India databases
        let kit = await ComboKit.findById(id).lean();
        let isIndia = false;
        if (!kit) {
            kit = await ComboKitIndia.findById(id).lean();
            isIndia = true;
        }
        if (!kit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        // Extract all SKU IDs from base_components and bos_kits
        const skuIds = [
            ...(kit.base_components || []).map(bc => bc.sku_id).filter(Boolean),
            ...(kit.bos_kits || []).map(bk => bk.sku_id).filter(Boolean)
        ];

        if (skuIds.length === 0) {
            return res.json({
                status: 'success',
                data: {
                    is_active: false,
                    reason: 'No SKUs configured in this kit.',
                    total_skus: 0,
                    priced_skus: 0,
                    missing_prices: [],
                    has_margins: false
                }
            });
        }

        // Check SKU prices
        const skuPriceQuery = { sku_id: { $in: skuIds } };
        if (warehouse_id) {
            skuPriceQuery.warehouse_id = warehouse_id;
        }

        const pricedSkus = await ProductSkuPrice.find(skuPriceQuery)
            .distinct('sku_id')
            .lean();

        const pricedSkuSet = new Set(pricedSkus.map(s => s.toString()));
        const missingPrices = skuIds.filter(skuId => !pricedSkuSet.has(skuId.toString()));

        // Check company margins
        const marginQuery = { combo_kit_id: id, deleted_at: null };
        if (warehouse_id) {
            marginQuery.warehouse_id = warehouse_id;
        }

        const CompanyMarginModel = require('../models/core_db').CompanyMargin;
        const marginCount = await CompanyMarginModel.countDocuments(marginQuery);
        const hasMargins = marginCount > 0;

        // Compute active status
        const isActive = missingPrices.length === 0 && hasMargins;

        return res.json({
            status: 'success',
            data: {
                is_active: isActive,
                total_skus: skuIds.length,
                priced_skus: skuIds.length - missingPrices.length,
                missing_prices: missingPrices,
                has_margins: hasMargins,
                reason: !hasMargins
                    ? 'Company margins not configured.'
                    : missingPrices.length > 0
                    ? `${missingPrices.length} SKU(s) missing prices.`
                    : 'All conditions met.'
            }
        });
    } catch (error) {
        console.error("Error in get_combo_kit_status:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const upload_combokit_datasheet = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Combo Kit ID is required.' });
        }

        let uploadedUrl = null;
        if (req.files && req.files.length > 0) {
            const datasheetFile = req.files.find(f => f.fieldname === 'datasheet') || req.files[0];
            if (datasheetFile) {
                uploadedUrl = datasheetFile.path;
            }
        } else if (req.body.datasheet) {
            uploadedUrl = req.body.datasheet;
        }

        if (!uploadedUrl) {
            return res.status(400).json({ status: 'error', message: 'No datasheet file was provided.' });
        }

        const objId = new mongoose.Types.ObjectId(id);
        const rawDb = mongoose.connection.db;

        const existingDoc = await rawDb.collection('pc_comobo_kit').findOne({ _id: objId })
            || await rawDb.collection('pc_combo_kits').findOne({ _id: objId });

        if (!existingDoc) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        const oldDatasheet = existingDoc.datasheet;

        await rawDb.collection('pc_comobo_kit').updateOne(
            { _id: objId },
            { $set: { datasheet: uploadedUrl } }
        );
        await rawDb.collection('pc_combo_kits').updateOne(
            { _id: objId },
            { $set: { datasheet: uploadedUrl } }
        ).catch(() => {});

        if (oldDatasheet && oldDatasheet !== uploadedUrl) {
            delete_uploaded_files([{ path: oldDatasheet }]).catch(() => {});
        }

        return res.status(200).json({
            status: 'success',
            message: 'Datasheet uploaded and attached to combo kit successfully!',
            data: {
                id,
                datasheet: uploadedUrl
            }
        });
    } catch (error) {
        console.error("Error in upload_combokit_datasheet:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const remove_combokit_datasheet = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Combo Kit ID is required.' });
        }

        const objId = new mongoose.Types.ObjectId(id);
        const rawDb = mongoose.connection.db;

        const existingDoc = await rawDb.collection('pc_comobo_kit').findOne({ _id: objId })
            || await rawDb.collection('pc_combo_kits').findOne({ _id: objId });

        if (!existingDoc) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found.' });
        }

        const oldDatasheet = existingDoc.datasheet;

        await rawDb.collection('pc_comobo_kit').updateOne(
            { _id: objId },
            { $set: { datasheet: null } }
        );
        await rawDb.collection('pc_combo_kits').updateOne(
            { _id: objId },
            { $set: { datasheet: null } }
        ).catch(() => {});

        if (oldDatasheet) {
            delete_uploaded_files([{ path: oldDatasheet }]).catch(() => {});
        }

        return res.status(200).json({
            status: 'success',
            message: 'Datasheet removed from combo kit successfully!',
            data: {
                id,
                datasheet: null
            }
        });
    } catch (error) {
        console.error("Error in remove_combokit_datasheet:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_combined_datasheet = async (req, res) => {
    try {
        const kitId = req.params.id || req.query.id;
        if (!kitId) {
            return res.status(400).json({ status: 'error', message: 'Combo Kit ID is required.' });
        }
        const data = await getCombinedKitDatasheetData(kitId);
        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_combined_datasheet:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const download_combined_datasheet_pdf = async (req, res) => {
    try {
        const kitId = req.params.id || req.query.id;
        if (!kitId) {
            return res.status(400).json({ status: 'error', message: 'Combo Kit ID is required.' });
        }
        const data = await getCombinedKitDatasheetData(kitId);
        await generateCombinedDatasheetPdf(data, res);
    } catch (error) {
        console.error("Error in download_combined_datasheet_pdf:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Failed to generate datasheet PDF' });
    }
};

module.exports = {
    create_combo_kit,
    get_combo_kits,
    update_combo_kit,
    delete_combo_kit,
    create_combo_kit_india,
    get_combo_kits_india,
    update_combo_kit_india,
    delete_combo_kit_india,
    get_combo_kit_status,
    upload_combokit_datasheet,
    remove_combokit_datasheet,
    get_combined_datasheet,
    download_combined_datasheet_pdf
};
