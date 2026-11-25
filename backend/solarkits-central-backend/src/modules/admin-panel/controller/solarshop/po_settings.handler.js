const { PoSetting, Unit } = require('../../models/core_db');
const { GeoLevel0 } = require('../../models/geolocation_db');
const { CompanyWarehouse } = require('../../models/company_warehouse_db');

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

const get_po_settings = async (req, res) => {
    try {
        const { country_id, warehouse_id } = req.query;
        const query = { deleted_at: null };
        if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (isIndia) {
                return res.status(400).json({ status: 'error', message: 'Use India endpoint to retrieve India configurations.' });
            }
            query.country_id = country_id;
        }
        if (warehouse_id) {
            query.warehouse_id = warehouse_id;
        }

        const settings = await PoSetting.find(query)
            .populate('country_id')
            .populate('state_id')
            .populate('cluster_id')
            .populate('order_size_unit_id')
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
                path: 'project_range_id',
                populate: { path: 'unit_id' }
            })
            .lean();

        const kwUnitObj = await Unit.findOne({ symbol: 'kW', deleted_at: null }).lean();

        // Fetch warehouses manually from company_warehouse_db connection
        const warehouseIds = [...new Set(settings.map(s => s.warehouse_id?.toString()).filter(Boolean))];
        const warehouses = await CompanyWarehouse.find({ _id: { $in: warehouseIds } }).lean();
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w._id.toString(), w]));

        const data = settings.map(s => {
            const unit = s.order_size_unit_id || kwUnitObj;
            const wh = s.warehouse_id ? warehouseMap[s.warehouse_id.toString()] : null;
            const range = s.project_range_id;
            return {
                ...s,
                id: s._id,
                country_name: s.country_id?.name || 'Unknown Country',
                state_name: s.state_id?.name || 'Unknown State',
                cluster_name: s.cluster_id?.name || 'Unknown Cluster',
                category_name: s.category_id?.name || '—',
                subcategory_name: s.subcategory_id?.name || '—',
                type_name: s.type_id?.type?.name || s.type_id?.name || '—',
                range_label: range ? `${range.min_value} - ${range.max_value} ${range.unit_id?.symbol || 'kW'}` : null,
                warehouse: wh ? {
                    id: wh._id.toString(),
                    warehouse_code: wh.warehouse_code,
                    address: wh.address,
                    pincode: wh.pincode
                } : null,
                order_size_unit: unit ? { id: unit._id, name: unit.name, symbol: unit.symbol } : { symbol: 'kW' }
            };
        });

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_po_settings:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const create_po_setting = async (req, res) => {
    try {
        const { 
            country_id, 
            state_id, 
            cluster_id, 
            warehouse_id, 
            name, 
            subscription_rate, 
            order_size, 
            order_size_unit_id, 
            po_validity_type = 'days', 
            po_validity_days, 
            po_validity_date,
            category_id,
            subcategory_id,
            type_id,
            project_range_id,
            disabled_kits
        } = req.body;

        if (!country_id || !state_id || !cluster_id || !warehouse_id || !name || subscription_rate === undefined || order_size === undefined || !order_size_unit_id || !category_id || !subcategory_id || !type_id) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: country_id, state_id, cluster_id, warehouse_id, name, subscription_rate, order_size, order_size_unit_id, category_id, subcategory_id, type_id.' });
        }

        if (po_validity_type === 'days') {
            if (po_validity_days === undefined || po_validity_days === null || po_validity_days <= 0) {
                return res.status(400).json({ status: 'error', message: 'po_validity_days is required and must be greater than 0 when validity type is days.' });
            }
        } else if (po_validity_type === 'monthly_date') {
            if (po_validity_date === undefined || po_validity_date === null || po_validity_date < 1 || po_validity_date > 31) {
                return res.status(400).json({ status: 'error', message: 'po_validity_date is required and must be between 1 and 31 when validity type is monthly_date.' });
            }
        } else {
            return res.status(400).json({ status: 'error', message: 'Invalid po_validity_type. Must be "days" or "monthly_date".' });
        }

        const isIndia = await isCountryIndia(country_id);
        if (isIndia) {
            return res.status(400).json({ status: 'error', message: 'India country configurations must be saved in the India database.' });
        }

        // Validate unit is in Power group and is NOT Watt (W)
        const unit = await Unit.findById(order_size_unit_id);
        if (!unit || unit.deleted_at) {
            return res.status(400).json({ status: 'error', message: 'Invalid unit selected.' });
        }
        if (unit.symbol === 'W' || unit.name.toLowerCase() === 'watt') {
            return res.status(400).json({ status: 'error', message: 'Watt (W) unit is not allowed for order size limits.' });
        }

        // Validate warehouse exists
        const warehouse = await CompanyWarehouse.findOne({ _id: warehouse_id, deleted_at: null });
        if (!warehouse) {
            return res.status(400).json({ status: 'error', message: 'Selected warehouse does not exist.' });
        }

        // Check if config with same name already exists for this warehouse
        const trimmedName = name.trim();
        const existing = await PoSetting.findOne({ 
            warehouse_id, 
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }, 
            deleted_at: null 
        });
        if (existing) {
            return res.status(400).json({ status: 'error', message: 'A PO configuration with this name already exists for this warehouse.' });
        }

        const newSetting = new PoSetting({
            country_id,
            state_id,
            cluster_id,
            warehouse_id,
            name: trimmedName,
            subscription_rate,
            order_size,
            order_size_unit_id,
            po_validity_type,
            po_validity_days: po_validity_type === 'days' ? po_validity_days : null,
            po_validity_date: po_validity_type === 'monthly_date' ? po_validity_date : null,
            category_id,
            subcategory_id,
            type_id,
            project_range_id: project_range_id || null,
            disabled_kits: Array.isArray(disabled_kits) ? disabled_kits : []
        });

        await newSetting.save();
        res.status(201).json({ status: 'success', message: 'PO configuration created successfully.', data: newSetting });
    } catch (error) {
        console.error("Error in create_po_setting:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const update_po_setting = async (req, res) => {
    try {
        const { 
            id, 
            name, 
            subscription_rate, 
            order_size, 
            order_size_unit_id, 
            po_validity_type, 
            po_validity_days, 
            po_validity_date, 
            is_active, 
            disabled_kits,
            category_id,
            subcategory_id,
            type_id,
            project_range_id
        } = req.body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing PO configuration ID.' });
        }

        const setting = await PoSetting.findById(id);
        if (!setting || setting.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'PO configuration not found.' });
        }

        if (name !== undefined) {
            const trimmedName = name.trim();
            if (!trimmedName) {
                return res.status(400).json({ status: 'error', message: 'Name cannot be empty.' });
            }
            const duplicate = await PoSetting.findOne({
                _id: { $ne: id },
                warehouse_id: setting.warehouse_id,
                name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
                deleted_at: null
            });
            if (duplicate) {
                return res.status(400).json({ status: 'error', message: 'Another PO configuration with this name already exists for this warehouse.' });
            }
            setting.name = trimmedName;
        }

        if (subscription_rate !== undefined) setting.subscription_rate = subscription_rate;
        if (order_size !== undefined) setting.order_size = order_size;
        if (order_size_unit_id !== undefined) {
            if (!order_size_unit_id) {
                return res.status(400).json({ status: 'error', message: 'Order size unit is required.' });
            }
            const unitObj = await Unit.findById(order_size_unit_id);
            if (!unitObj || unitObj.deleted_at) {
                return res.status(400).json({ status: 'error', message: 'Invalid unit selected.' });
            }
            if (unitObj.symbol === 'W' || unitObj.name.toLowerCase() === 'watt') {
                return res.status(400).json({ status: 'error', message: 'Watt (W) unit is not allowed for order size limits.' });
            }
            setting.order_size_unit_id = order_size_unit_id;
        }

        if (po_validity_type !== undefined) {
            if (po_validity_type === 'days') {
                if (po_validity_days === undefined || po_validity_days === null || po_validity_days <= 0) {
                    return res.status(400).json({ status: 'error', message: 'po_validity_days is required and must be greater than 0 when validity type is days.' });
                }
                setting.po_validity_type = 'days';
                setting.po_validity_days = po_validity_days;
                setting.po_validity_date = null;
            } else if (po_validity_type === 'monthly_date') {
                if (po_validity_date === undefined || po_validity_date === null || po_validity_date < 1 || po_validity_date > 31) {
                    return res.status(400).json({ status: 'error', message: 'po_validity_date is required and must be between 1 and 31 when validity type is monthly_date.' });
                }
                setting.po_validity_type = 'monthly_date';
                setting.po_validity_days = null;
                setting.po_validity_date = po_validity_date;
            } else {
                return res.status(400).json({ status: 'error', message: 'Invalid po_validity_type. Must be "days" or "monthly_date".' });
            }
        } else {
            const currentType = setting.po_validity_type || 'days';
            if (currentType === 'days') {
                if (po_validity_days !== undefined) {
                    if (po_validity_days === null || po_validity_days <= 0) {
                        return res.status(400).json({ status: 'error', message: 'po_validity_days must be greater than 0.' });
                    }
                    setting.po_validity_days = po_validity_days;
                }
            } else if (currentType === 'monthly_date') {
                if (po_validity_date !== undefined) {
                    if (po_validity_date === null || po_validity_date < 1 || po_validity_date > 31) {
                        return res.status(400).json({ status: 'error', message: 'po_validity_date must be between 1 and 31.' });
                    }
                    setting.po_validity_date = po_validity_date;
                }
            }
        }

        if (category_id !== undefined) {
            if (!category_id) return res.status(400).json({ status: 'error', message: 'Category ID is required.' });
            setting.category_id = category_id;
        }
        if (subcategory_id !== undefined) {
            if (!subcategory_id) return res.status(400).json({ status: 'error', message: 'Sub-Category ID is required.' });
            setting.subcategory_id = subcategory_id;
        }
        if (type_id !== undefined) {
            if (!type_id) return res.status(400).json({ status: 'error', message: 'System Type ID is required.' });
            setting.type_id = type_id;
        }
        if (project_range_id !== undefined) {
            setting.project_range_id = project_range_id || null;
        }

        if (is_active !== undefined) setting.is_active = is_active;
        if (disabled_kits !== undefined) {
            if (!Array.isArray(disabled_kits)) {
                return res.status(400).json({ status: 'error', message: 'disabled_kits must be an array.' });
            }
            setting.disabled_kits = disabled_kits;
        }

        await setting.save();
        res.status(200).json({ status: 'success', message: 'PO configuration updated successfully.', data: setting });
    } catch (error) {
        console.error("Error in update_po_setting:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const delete_po_setting = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing PO configuration ID.' });
        }

        const setting = await PoSetting.findById(id);
        if (!setting || setting.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'PO configuration not found.' });
        }

        setting.deleted_at = new Date();
        await setting.save();

        res.status(200).json({ status: 'success', message: 'PO configuration deleted successfully.' });
    } catch (error) {
        console.error("Error in delete_po_setting:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    get_po_settings,
    create_po_setting,
    update_po_setting,
    delete_po_setting
};
