const { 
    ComboKitVariant: CoreComboKitVariant, 
    WarehouseComboKit: CoreComboKit,
    ProjectCategory,
    ProjectSubcategory,
    ProjectSubcategoryType,
    ProjectRange,
    ProjectType,
    Unit
} = require('../models/core_db');
const { ComboKitVariant: IndiaComboKitVariant, WarehouseComboKit: IndiaComboKit } = require('../models/india_solarshop_db');

const mongoose = require('mongoose');
const parseJSON = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return defaultVal;
    }
};

const normalizeFeatures = (features) => {
    if (!Array.isArray(features)) return [];
    return features.map(f => {
        if (typeof f === 'object' && f !== null) {
            return {
                name: (f.name || '').trim(),
                description: (f.description || '').trim(),
                price: Number(f.price || 0),
                is_free: !!f.is_free
            };
        }
        return {
            name: String(f).trim(),
            description: '',
            price: 0,
            is_free: true
        };
    }).filter(f => f.name);
};

const validateVariants = (variants) => {
    if (!Array.isArray(variants) || variants.length < 1) {
        throw new Error('You must assign at least one variant.');
    }
    for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.name || !v.name.trim()) {
            throw new Error(`Variant #${i + 1} is missing a Name.`);
        }
        if (v.additional_price == null || isNaN(Number(v.additional_price))) {
            throw new Error(`Variant #${i + 1} has an invalid or missing Upgrade Price.`);
        }
        if (v.worth_price == null || isNaN(Number(v.worth_price))) {
            throw new Error(`Variant #${i + 1} has an invalid or missing Retail Worth.`);
        }
        if (Number(v.additional_price) > Number(v.worth_price)) {
            throw new Error(`Variant "${v.name}" error: Upgrade Price (Additional Price) cannot be greater than Retail Worth (Worth Price).`);
        }
    }
};

// Generic creator
const createConfig = async (req, res, Model) => {
    try {
        const { country_id, category_id, subcategory_id, type_id, project_range_id } = req.body;
        const variants = parseJSON(req.body.variants, []);

        if (!country_id || !category_id || !subcategory_id || !type_id || !project_range_id) {
            return res.status(400).json({ status: 'error', message: 'Missing required configuration fields.' });
        }

        try {
            validateVariants(variants);
        } catch (err) {
            return res.status(400).json({ status: 'error', message: err.message });
        }

        // Check duplicate active configuration
        const dup = await Model.findOne({
            country_id,
            category_id,
            subcategory_id,
            type_id,
            project_range_id,
            deleted_at: null
        });

        if (dup) {
            return res.status(400).json({ status: 'error', message: 'A variant configuration already exists for this combination.' });
        }

        const newConfig = new Model({
            country_id,
            category_id,
            subcategory_id,
            type_id,
            project_range_id,
            variants: variants.map(v => ({
                combo_kit_id: v.combo_kit_id || null,
                name: v.name.trim(),
                color: v.color ? v.color.trim() : null,
                additional_price: Number(v.additional_price),
                worth_price: Number(v.worth_price),
                additional_features: normalizeFeatures(v.additional_features)
            }))
        });

        await newConfig.save();
        return res.status(200).json({ status: 'success', data: newConfig });
    } catch (error) {
        console.error("Error in createConfig:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

// Generic list retriever
const getConfigs = async (req, res, Model) => {
    try {
        const { country_id } = req.query;
        const query = { deleted_at: null };
        if (country_id) {
            query.country_id = country_id;
        }

        const comboKitModel = Model === CoreComboKitVariant ? CoreComboKit : IndiaComboKit;

        const configs = await Model.find(query)
            .populate({ path: 'category_id', model: ProjectCategory, select: 'name' })
            .populate({ path: 'subcategory_id', model: ProjectSubcategory, select: 'name' })
            .populate({
                path: 'type_id',
                model: ProjectSubcategoryType,
                populate: {
                    path: 'type',
                    model: ProjectType,
                    select: 'name'
                }
            })
            .populate({
                path: 'project_range_id',
                model: ProjectRange,
                populate: {
                    path: 'unit_id',
                    model: Unit,
                    select: 'symbol'
                }
            })
            .populate({
                path: 'variants.combo_kit_id',
                model: comboKitModel,
                select: 'name base_price_cached selling_price_cached'
            })
            .sort({ created_at: -1 });

        return res.status(200).json({ status: 'success', data: configs });
    } catch (error) {
        console.error("Error in getConfigs:", error);
        try {
            require('fs').writeFileSync(require('path').join(__dirname, '../../get_configs_error.txt'), error.stack || error.message);
        } catch(e) {}
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

// Generic updater
const updateConfig = async (req, res, Model) => {
    try {
        const { id, country_id, category_id, subcategory_id, type_id, project_range_id } = req.body;
        const variants = parseJSON(req.body.variants, []);

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Configuration ID.' });
        }

        const config = await Model.findById(id);
        if (!config || config.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Configuration not found.' });
        }

        try {
            validateVariants(variants);
        } catch (err) {
            return res.status(400).json({ status: 'error', message: err.message });
        }

        // Check duplicate active configuration excluding current ID
        const dup = await Model.findOne({
            _id: { $ne: new mongoose.Types.ObjectId(id) },
            country_id: country_id || config.country_id,
            category_id: category_id || config.category_id,
            subcategory_id: subcategory_id || config.subcategory_id,
            type_id: type_id || config.type_id,
            project_range_id: project_range_id || config.project_range_id,
            deleted_at: null
        });

        if (dup) {
            return res.status(400).json({ status: 'error', message: 'Another variant configuration already exists for this combination.' });
        }

        if (country_id) config.country_id = country_id;
        if (category_id) config.category_id = category_id;
        if (subcategory_id) config.subcategory_id = subcategory_id;
        if (type_id) config.type_id = type_id;
        if (project_range_id) config.project_range_id = project_range_id;
        
        config.variants = variants.map(v => {
            const variantObj = {
                combo_kit_id: v.combo_kit_id || null,
                name: v.name.trim(),
                color: v.color ? v.color.trim() : null,
                additional_price: Number(v.additional_price),
                worth_price: Number(v.worth_price),
                additional_features: normalizeFeatures(v.additional_features)
            };
            const existingId = v._id || v.id;
            if (existingId && mongoose.Types.ObjectId.isValid(existingId)) {
                variantObj._id = new mongoose.Types.ObjectId(existingId);
            }
            return variantObj;
        });
        config.updated_at = Date.now();

        await config.save();
        return res.status(200).json({ status: 'success', data: config });
    } catch (error) {
        console.error("Error in updateConfig:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

// Generic deleter (soft delete)
const deleteConfig = async (req, res, Model) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing Configuration ID.' });
        }

        const config = await Model.findById(id);
        if (!config || config.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Configuration not found.' });
        }

        config.deleted_at = Date.now();
        await config.save();

        return res.status(200).json({ status: 'success', message: 'Configuration deleted successfully.' });
    } catch (error) {
        console.error("Error in deleteConfig:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

// Export implementations for Core and India Databases
module.exports = {
    create_config: (req, res) => createConfig(req, res, CoreComboKitVariant),
    get_configs: (req, res) => getConfigs(req, res, CoreComboKitVariant),
    update_config: (req, res) => updateConfig(req, res, CoreComboKitVariant),
    delete_config: (req, res) => deleteConfig(req, res, CoreComboKitVariant),

    create_config_india: (req, res) => createConfig(req, res, IndiaComboKitVariant),
    get_configs_india: (req, res) => getConfigs(req, res, IndiaComboKitVariant),
    update_config_india: (req, res) => updateConfig(req, res, IndiaComboKitVariant),
    delete_config_india: (req, res) => deleteConfig(req, res, IndiaComboKitVariant)
};
