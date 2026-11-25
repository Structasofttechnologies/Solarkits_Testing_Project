const mongoose = require('mongoose');
const { BulkKitSetting } = require('../../../models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, Cluster } = require('../../../models/geolocation_db');
const { CompanyWarehouse } = require('../../../models/company_warehouse_db');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isCountryIndia = async (countryId) => {
    if (!countryId) return false;
    try {
        const country = await GeoLevel0.findOne({ _id: countryId, deleted_at: null });
        return country && country.name.toLowerCase() === 'india';
    } catch (e) {
        console.error("Error in isCountryIndia:", e);
        return false;
    }
};

const sanitizeTiers = (rawTiers) => {
    if (!Array.isArray(rawTiers)) return [];
    return rawTiers
        .map((t) => ({
            quantity: Number(t.quantity),
            margin: t.margin === '' || t.margin === null || t.margin === undefined
                ? 0
                : Number(t.margin),
        }))
        .filter((t) => !isNaN(t.quantity) && t.quantity > 0);
};

/**
 * GET /solarshop/india/bulk-kit-settings
 * List bulk kit settings filtered by country / state / cluster (India only).
 */
const get_bulk_kit_settings_india = async (req, res) => {
    try {
        const { country_id, state_id, cluster_id, warehouse_id } = req.query;
        const query = { deleted_at: null };

        if (country_id) {
            if (!isValidObjectId(country_id)) {
                return res.status(400).json({ status: 'error', message: 'Invalid country_id.' });
            }
            const isIndia = await isCountryIndia(country_id);
            if (!isIndia) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot retrieve non-India country configurations from the India database.',
                });
            }
            query.country_id = country_id;
        }
        if (state_id) query.state_id = state_id;
        if (cluster_id) query.cluster_id = cluster_id;
        if (warehouse_id) query.warehouse_id = warehouse_id;

        const settings = await BulkKitSetting.find(query).lean();
        const data = settings.map((s) => ({ ...s, id: s._id }));

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_bulk_kit_settings_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * GET /solarshop/india/bulk-kit-settings/warehouse/:warehouseId
 */
const get_warehouse_bulk_settings_india = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        if (!warehouseId || !isValidObjectId(warehouseId)) {
            return res.status(400).json({ status: 'error', message: 'Valid Warehouse ID is required.' });
        }

        const settings = await BulkKitSetting.find({
            warehouse_id: warehouseId,
            deleted_at: null,
        }).lean();

        const data = settings.map((s) => ({ ...s, id: s._id }));
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_warehouse_bulk_settings_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/india/bulk-kit-settings/save
 */
const save_bulk_kit_settings_india = async (req, res) => {
    try {
        const {
            country_id,
            state_id,
            cluster_id,
            warehouse_id,
            combo_kit_id,
            is_bulk_enabled = false,
            kits_per_bulk = null,
            apply_to_variants = false,
            bulk_tiers = [],
            allowed_quantities = [],
        } = req.body;

        if (!country_id || !state_id || !warehouse_id || !combo_kit_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: country_id, state_id, warehouse_id, combo_kit_id.',
            });
        }

        for (const field of ['country_id', 'state_id', 'warehouse_id', 'combo_kit_id']) {
            if (!isValidObjectId(req.body[field])) {
                return res.status(400).json({ status: 'error', message: `Invalid ${field}.` });
            }
        }
        if (cluster_id && !isValidObjectId(cluster_id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid cluster_id.' });
        }

        const isIndia = await isCountryIndia(country_id);
        if (!isIndia) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot save non-India country configurations in the India database.',
            });
        }

        const warehouse = await CompanyWarehouse.findOne({
            _id: warehouse_id,
            deleted_at: null,
        });
        if (!warehouse) {
            return res.status(400).json({ status: 'error', message: 'Selected warehouse does not exist.' });
        }

        let cleanTiers = sanitizeTiers(bulk_tiers);
        if (cleanTiers.length === 0 && Array.isArray(allowed_quantities) && allowed_quantities.length > 0) {
            cleanTiers = allowed_quantities
                .map((q) => ({ quantity: Number(q), margin: 0 }))
                .filter((t) => !isNaN(t.quantity) && t.quantity > 0);
        }

        if (is_bulk_enabled) {
            const kpb = Number(kits_per_bulk);
            if (!kpb || kpb <= 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'A valid kits_per_bulk value is required when bulk is enabled.',
                });
            }
            if (cleanTiers.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'At least one bulk tier is required when bulk is enabled.',
                });
            }
            for (let i = 1; i < cleanTiers.length; i++) {
                if (cleanTiers[i].margin > cleanTiers[i - 1].margin) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Margin for ${cleanTiers[i].quantity} bulks (${cleanTiers[i].margin}%) cannot exceed margin for ${cleanTiers[i - 1].quantity} bulks (${cleanTiers[i - 1].margin}%).`,
                    });
                }
            }
        }

        const filter = { warehouse_id, combo_kit_id, deleted_at: null };
        const update = {
            country_id,
            state_id,
            cluster_id,
            warehouse_id,
            combo_kit_id,
            is_bulk_enabled: !!is_bulk_enabled,
            kits_per_bulk: is_bulk_enabled ? Number(kits_per_bulk) || null : null,
            apply_to_variants: !!apply_to_variants,
            bulk_tiers: cleanTiers,
            allowed_quantities: cleanTiers.map((t) => t.quantity),
            is_active: true,
            updated_at: new Date(),
        };

        const result = await BulkKitSetting.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });

        res.status(200).json({
            status: 'success',
            message: 'Bulk kit settings saved successfully.',
            data: { ...result.toObject(), id: result._id },
        });
    } catch (error) {
        console.error("Error in save_bulk_kit_settings_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

/**
 * POST /solarshop/india/bulk-kit-settings/delete
 */
const delete_bulk_kit_settings_india = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ status: 'error', message: 'Valid bulk kit setting ID is required.' });
        }

        const setting = await BulkKitSetting.findById(id);
        if (!setting || setting.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Bulk kit setting not found.' });
        }

        setting.deleted_at = new Date();
        setting.is_active = false;
        setting.updated_at = new Date();
        await setting.save();

        res.status(200).json({ status: 'success', message: 'Bulk kit setting deleted successfully.' });
    } catch (error) {
        console.error("Error in delete_bulk_kit_settings_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    get_bulk_kit_settings_india,
    get_warehouse_bulk_settings_india,
    save_bulk_kit_settings_india,
    delete_bulk_kit_settings_india,
};
