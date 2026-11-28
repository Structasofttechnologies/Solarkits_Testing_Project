const mongoose = require('mongoose');
const { CompanyMargin } = require('../../../models/india_solarshop_db');
const { GeoLevel0, GeoLevel1, Cluster } = require('../../../models/geolocation_db');
const { CompanyWarehouse } = require('../../../models/company_warehouse_db');
const { recalculateKitPricesForMargin } = require('../../../services/kit_pricing.service');

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

const get_company_margins_india = async (req, res) => {
    try {
        const { country_id, state_id, cluster_id } = req.query;
        const query = { deleted_at: null };

        if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (!isIndia) {
                return res.status(400).json({ status: 'error', message: 'Cannot retrieve non-India country configurations from the India database.' });
            }
            query.country_id = country_id;
        }

        if (state_id) query.state_id = state_id;
        if (cluster_id) query.cluster_id = cluster_id;

        const margins = await CompanyMargin.find(query).lean();

        // Fetch geolocations manually from geolocation_db connection
        const countryIds = [...new Set(margins.map(m => m.country_id?.toString()).filter(Boolean))];
        const stateIds = [...new Set(margins.map(m => m.state_id?.toString()).filter(Boolean))];
        const clusterIds = [...new Set(margins.map(m => m.cluster_id?.toString()).filter(Boolean))];

        const [countries, states, clusters] = await Promise.all([
            GeoLevel0.find({ _id: { $in: countryIds } }).lean(),
            GeoLevel1.find({ _id: { $in: stateIds } }).lean(),
            Cluster.find({ _id: { $in: clusterIds } }).lean()
        ]);

        const countryMap = Object.fromEntries(countries.map(c => [c._id.toString(), c.name]));
        const stateMap = Object.fromEntries(states.map(s => [s._id.toString(), s.name]));
        const clusterMap = Object.fromEntries(clusters.map(cl => [cl._id.toString(), cl.name]));

        // Fetch warehouses manually from company_warehouse_db connection
        const warehouseIds = [...new Set(margins.map(m => m.warehouse_id?.toString()).filter(Boolean))];
        const warehouses = await CompanyWarehouse.find({ _id: { $in: warehouseIds } }).lean();
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w._id.toString(), w]));

        const data = margins.map(m => {
            const wh = m.warehouse_id ? warehouseMap[m.warehouse_id.toString()] : null;
            return {
                ...m,
                id: m._id,
                country_name: countryMap[m.country_id?.toString()] || 'Unknown Country',
                state_name: stateMap[m.state_id?.toString()] || 'Unknown State',
                cluster_name: clusterMap[m.cluster_id?.toString()] || 'Unknown Cluster',
                warehouse: wh ? {
                    id: wh._id.toString(),
                    warehouse_code: wh.warehouse_code,
                    address: wh.address,
                    pincode: wh.pincode
                } : null
            };
        });

        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_company_margins_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_warehouse_margin_india = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        if (!warehouseId) {
            return res.status(400).json({ status: 'error', message: 'Warehouse ID is required.' });
        }

        const margins = await CompanyMargin.find({ warehouse_id: warehouseId, deleted_at: null }).lean();
        const data = margins.map(m => ({ ...m, id: m._id }));
        res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_warehouse_margin_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const create_company_margin_india = async (req, res) => {
    try {
        const { country_id, state_id, cluster_id, warehouse_id, combo_kit_id, standard_margin, showcase_margin, discounted_margin, po_discounted_margin, gst_rate, is_po_active } = req.body;

        if (!country_id || !state_id || !cluster_id || !warehouse_id || !combo_kit_id) {
            return res.status(400).json({ status: 'error', message: 'Missing required geolocation, warehouse, or combo kit fields.' });
        }

        const isIndia = await isCountryIndia(country_id);
        if (!isIndia) {
            return res.status(400).json({ status: 'error', message: 'Cannot save non-India country configurations in the India database.' });
        }

        // Validate warehouse exists
        const warehouse = await CompanyWarehouse.findOne({ _id: warehouse_id, deleted_at: null });
        if (!warehouse) {
            return res.status(400).json({ status: 'error', message: 'Selected warehouse does not exist.' });
        }

        // Upsert configuration
        const filter = { warehouse_id, combo_kit_id, deleted_at: null };
        const update = {
            country_id,
            state_id,
            cluster_id,
            warehouse_id,
            combo_kit_id,
            is_active: true
        };


        if (showcase_margin !== undefined) {
            update.showcase_margin = Number(showcase_margin);
        }
        if (standard_margin !== undefined) {
            update.standard_margin = Number(standard_margin);
        }
        if (po_discounted_margin !== undefined) {
            update.po_discounted_margin = Number(po_discounted_margin);
        }
        if (gst_rate !== undefined) {
            update.gst_rate = gst_rate === "" || gst_rate === null ? null : Number(gst_rate);
        }
        if (is_po_active !== undefined) {
            update.is_po_active = is_po_active;
        }
        if (req.body.loose_order_pricing !== undefined) {
            update.loose_order_pricing = Array.isArray(req.body.loose_order_pricing)
                ? req.body.loose_order_pricing.map(item => ({
                    quantity: Number(item.quantity),
                    price_per_kit: Number(item.price_per_kit),
                    discount_amount: Number(item.discount_amount || 0),
                    margin_amount: Number(item.margin_amount || 0),
                    margin_percent: Number(item.margin_percent || 0),
                    base_price: Number(item.base_price || 0)
                })).filter(item => !isNaN(item.quantity) && item.quantity > 0 && !isNaN(item.price_per_kit) && item.price_per_kit >= 0)
                : [];
        }
        if (req.body.po_order_pricing !== undefined) {
            update.po_order_pricing = Array.isArray(req.body.po_order_pricing)
                ? req.body.po_order_pricing.map(item => ({
                    quantity: Number(item.quantity),
                    price_per_kit: Number(item.price_per_kit),
                    discount_amount: Number(item.discount_amount || 0),
                    margin_amount: Number(item.margin_amount || 0),
                    margin_percent: Number(item.margin_percent || 0),
                    base_price: Number(item.base_price || 0)
                })).filter(item => !isNaN(item.quantity) && item.quantity > 0 && !isNaN(item.price_per_kit) && item.price_per_kit >= 0)
                : [];
        }

        // Validate relative values of margins (if they are being updated/set)
        const existingDoc = await CompanyMargin.findOne({ warehouse_id, combo_kit_id, deleted_at: null }).lean();

        const currentShowcase = update.showcase_margin !== undefined ? update.showcase_margin : (existingDoc ? existingDoc.showcase_margin : 0);
        const currentStandard = update.standard_margin !== undefined ? update.standard_margin : (existingDoc ? existingDoc.standard_margin : 0);
        const currentPoDiscounted = update.po_discounted_margin !== undefined ? update.po_discounted_margin : (existingDoc ? existingDoc.po_discounted_margin : 0);

        if (currentStandard > currentShowcase) {
            return res.status(400).json({ status: 'error', message: 'Standerd margin cannot be greater than showcase margin.' });
        }
        if (currentPoDiscounted > currentStandard) {
            return res.status(400).json({ status: 'error', message: 'PO discounted margin cannot be greater than standard margin.' });
        }

        const result = await CompanyMargin.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        });

        // Trigger pricing recalculation asynchronously
        recalculateKitPricesForMargin(combo_kit_id, warehouse_id).catch(err => {
            console.error('[create_company_margin_india] Error triggering price recalculation:', err);
        });

        res.status(200).json({ status: 'success', message: 'Warehouse kit margin saved successfully.', data: result });
    } catch (error) {
        console.error("Error in create_company_margin_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const delete_company_margin_india = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Missing margin configuration ID.' });
        }

        const margin = await CompanyMargin.findById(id);
        if (!margin || margin.deleted_at) {
            return res.status(404).json({ status: 'error', message: 'Margin configuration not found.' });
        }

        margin.deleted_at = new Date();
        await margin.save();

        // Trigger pricing recalculation asynchronously
        recalculateKitPricesForMargin(margin.combo_kit_id, margin.warehouse_id).catch(err => {
            console.error('[delete_company_margin_india] Error triggering price recalculation:', err);
        });

        res.status(200).json({ status: 'success', message: 'Margin configuration deleted successfully.' });
    } catch (error) {
        console.error("Error in delete_company_margin_india:", error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    get_company_margins_india,
    get_warehouse_margin_india,
    create_company_margin_india,
    delete_company_margin_india
};
