const { SolarKit, ProductTemplate, ProjectSubcategory } = require('../models/core_db');

const validateKitTemplates = async (base_components = [], bos_kits = []) => {
    const baseIds = (base_components || []).map(bc => bc.template_id?.toString()).filter(Boolean);
    const bosIds = (bos_kits || []).flatMap(bk => (bk.items || []).map(item => item.template_id?.toString())).filter(Boolean);

    // 1. Check overlap
    const overlap = baseIds.filter(id => bosIds.includes(id));
    if (overlap.length > 0) {
        throw new Error('The same template cannot be assigned as both Base and BOS.');
    }

    // 2. Check system/base-only templates in BOS
    if (bosIds.length > 0) {
        const systemTemplates = await ProductTemplate.find({
            _id: { $in: bosIds },
            name: { $in: [/battery/i, /inverter/i, /solar panel/i] },
            deleted_at: null
        });
        if (systemTemplates.length > 0) {
            const names = systemTemplates.map(t => t.name).join(', ');
            throw new Error(`System templates (${names}) cannot be assigned as BOS Kit Templates.`);
        }
    }

    // 3. Check duplicate templates across different bos_kits
    if (bos_kits && bos_kits.length > 0) {
        const seenTemplates = new Set();
        for (const kit of bos_kits) {
            for (const item of (kit.items || [])) {
                if (!item.template_id) continue;
                const idStr = item.template_id.toString();
                if (seenTemplates.has(idStr)) {
                    throw new Error(`The same product template cannot be selected in multiple BOS kits.`);
                }
                seenTemplates.add(idStr);
            }
        }
    }
};

const parseJSON = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return defaultVal;
    }
};

const create_solar_kit = async (req, res) => {
    try {
        const {
            name, description, category_id, subcategory_id, type_id
        } = req.body;

        let base_components = parseJSON(req.body.base_components, null);
        let bos_kits = parseJSON(req.body.bos_kits, []);

        // Fallback for old clients / seeders
        if (!base_components) {
            const base_template_ids = parseJSON(req.body.base_template_ids, []);
            base_components = base_template_ids.map(id => ({ template_id: id, subtype_id: null }));
        }

        bos_kits = bos_kits.map(bk => {
            if (bk.items) return bk;
            const tIds = bk.template_ids || [];
            return {
                name: bk.name,
                brand_id: bk.brand_id || null,
                items: tIds.map(id => ({ template_id: id, subtype_ids: [] }))
            };
        });

        try {
            await validateKitTemplates(base_components, bos_kits);
        } catch (validationError) {
            return res.status(400).json({ status: 'error', message: validationError.message });
        }

        // Sync old template lists for backward compatibility
        const base_template_ids = base_components.map(bc => bc.template_id).filter(Boolean);
        const bos_template_ids = [];
        bos_kits.forEach(bk => {
            (bk.items || []).forEach(item => {
                if (item.template_id && !bos_template_ids.includes(item.template_id.toString())) {
                    bos_template_ids.push(item.template_id);
                }
            });
        });

        const newKit = new SolarKit({
            name,
            description,
            category_id,
            subcategory_id,
            type_id,
            base_template_ids: base_template_ids || [],
            bos_template_ids: bos_template_ids || [],
            base_components,
            bos_kits
        });

        await newKit.save();

        res.status(201).json({ status: 'success', message: 'Combo Kit defined successfully', data: newKit });
    } catch (error) {
        console.error("Error in create_solar_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_solar_kits = async (req, res) => {
    try {
        const kits = await SolarKit.find({ deleted_at: null })
            .populate({
                path: 'category_id',
                select: 'name industry_type_id state_ids',
                populate: [
                    { path: 'industry_type_id', select: 'name _id' },
                    { path: 'state_ids', select: 'name _id' }
                ]
            })
            .populate('subcategory_id', 'name')
            .populate({
                path: 'base_template_ids',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate({
                path: 'bos_template_ids',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate({
                path: 'base_components.template_id',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate({
                path: 'base_components.subtype_id',
                select: 'name'
            })
            .populate({
                path: 'bos_kits.brand_id',
                select: 'brand_name logo'
            })
            .populate({
                path: 'bos_kits.items.template_id',
                select: 'name qty_unit_id',
                populate: { path: 'qty_unit_id' }
            })
            .populate({
                path: 'bos_kits.items.subtype_ids',
                select: 'name'
            })
            .populate({
                path: 'type_id',
                select: 'subcategory type',
                populate: [
                    { path: 'subcategory', model: ProjectSubcategory, select: 'name' },
                    { path: 'type', model: 'sys_filter_types', select: 'name' }
                ]
            })
            .sort({ created_at: -1 })
            .lean();

        res.status(200).json({ status: 'success', data: kits });
    } catch (error) {
        console.error("Error in get_solar_kits:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const deactivateNonMatchingKitsAfterSolarKitUpdate = async (solarKitId, newCategory, newSubcategory, newType) => {
    try {
        const { WarehouseComboKit: ComboKit, PoSetting } = require('../models/core_db');
        const { PoSetting: PoSettingIndia } = require('../models/india_solarshop_db');

        // Fetch all combo kits (both India and standard) from core DB
        const standardKits = await ComboKit.find({ solar_kit_id: solarKitId, deleted_at: null }).select('_id').lean();
        if (standardKits.length > 0) {
            const kitIds = standardKits.map(k => k._id);
            
            const nonMatchingStandardPoSettings = await PoSetting.find({
                deleted_at: null,
                $or: [
                    { category_id: { $ne: newCategory } },
                    { subcategory_id: { $ne: newSubcategory } },
                    { type_id: { $ne: newType } }
                ]
            });

            for (const po of nonMatchingStandardPoSettings) {
                let updated = false;
                const disabledSet = new Set((po.disabled_kits || []).map(id => id.toString()));
                for (const kitId of kitIds) {
                    const kitIdStr = kitId.toString();
                    if (!disabledSet.has(kitIdStr)) {
                        po.disabled_kits.push(kitId);
                        disabledSet.add(kitIdStr);
                        updated = true;
                    }
                }
                if (updated) {
                    await po.save();
                }
            }

            const nonMatchingIndiaPoSettings = await PoSettingIndia.find({
                deleted_at: null,
                $or: [
                    { category_id: { $ne: newCategory } },
                    { subcategory_id: { $ne: newSubcategory } },
                    { type_id: { $ne: newType } }
                ]
            });

            for (const po of nonMatchingIndiaPoSettings) {
                let updated = false;
                const disabledSet = new Set((po.disabled_kits || []).map(id => id.toString()));
                for (const kitId of kitIds) {
                    const kitIdStr = kitId.toString();
                    if (!disabledSet.has(kitIdStr)) {
                        po.disabled_kits.push(kitId);
                        disabledSet.add(kitIdStr);
                        updated = true;
                    }
                }
                if (updated) {
                    await po.save();
                }
            }
        }
    } catch (err) {
        console.error("Error in deactivateNonMatchingKitsAfterSolarKitUpdate:", err);
    }
};

const update_solar_kit = async (req, res) => {
    try {
        const {
            id, name, description, category_id, subcategory_id, type_id
        } = req.body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Kit ID is required' });
        }

        let base_components = parseJSON(req.body.base_components, null);
        let bos_kits = parseJSON(req.body.bos_kits, []);

        // Fallback for old clients
        if (!base_components) {
            const base_template_ids = parseJSON(req.body.base_template_ids, []);
            base_components = base_template_ids.map(id => ({ template_id: id, subtype_id: null }));
        }

        bos_kits = bos_kits.map(bk => {
            if (bk.items) return bk;
            const tIds = bk.template_ids || [];
            return {
                name: bk.name,
                brand_id: bk.brand_id || null,
                items: tIds.map(id => ({ template_id: id, subtype_ids: [] }))
            };
        });

        try {
            await validateKitTemplates(base_components, bos_kits);
        } catch (validationError) {
            return res.status(400).json({ status: 'error', message: validationError.message });
        }

        // Sync old template lists for backward compatibility
        const base_template_ids = base_components.map(bc => bc.template_id).filter(Boolean);
        const bos_template_ids = [];
        bos_kits.forEach(bk => {
            (bk.items || []).forEach(item => {
                if (item.template_id && !bos_template_ids.includes(item.template_id.toString())) {
                    bos_template_ids.push(item.template_id);
                }
            });
        });

        const updatedKit = await SolarKit.findByIdAndUpdate(id, {
            name,
            description,
            category_id,
            subcategory_id,
            type_id,
            base_template_ids: base_template_ids || [],
            bos_template_ids: bos_template_ids || [],
            base_components,
            bos_kits
        }, { new: true });

        if (!updatedKit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found' });
        }

        await deactivateNonMatchingKitsAfterSolarKitUpdate(
            updatedKit._id,
            updatedKit.category_id,
            updatedKit.subcategory_id,
            updatedKit.type_id
        );

        res.status(200).json({ status: 'success', message: 'Combo Kit updated successfully', data: updatedKit });
    } catch (error) {
        console.error("Error in update_solar_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const delete_solar_kit = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Kit ID is required' });
        }

        const deletedKit = await SolarKit.findByIdAndUpdate(id, { deleted_at: new Date() }, { new: true });

        if (!deletedKit) {
            return res.status(404).json({ status: 'error', message: 'Combo Kit not found' });
        }

        res.status(200).json({ status: 'success', message: 'Combo Kit deleted successfully' });
    } catch (error) {
        console.error("Error in delete_solar_kit:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    create_solar_kit,
    get_solar_kits,
    update_solar_kit,
    delete_solar_kit
};
