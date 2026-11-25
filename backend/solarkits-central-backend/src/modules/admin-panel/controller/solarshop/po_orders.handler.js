const mongoose = require('mongoose');
const { PurchaseOrder, WarehouseComboKit, CompanyMargin, ProductSkuPrice } = require('../../models/core_db');
const { GeoLevel0 } = require('../../models/geolocation_db');
const { CompanyWarehouse } = require('../../models/company_warehouse_db');
const { computeKitPrices } = require('../../services/kit_pricing.service');

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

const create_po_order = async (req, res) => {
    try {
        const { country_id, state_id, cluster_id, warehouse_id, combo_kit_id } = req.body;

        if (!country_id || !state_id || !cluster_id || !warehouse_id || !combo_kit_id) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: country_id, state_id, cluster_id, warehouse_id, and combo_kit_id are required.' });
        }

        const isIndia = await isCountryIndia(country_id);
        if (isIndia) {
            return res.status(400).json({ status: 'error', message: 'India PO orders must be placed using the India API endpoint.' });
        }

        // 1. Fetch the combo kit
        const kit = await WarehouseComboKit.findOne({ _id: combo_kit_id, deleted_at: null });
        if (!kit) {
            return res.status(404).json({ status: 'error', message: 'Combo kit not found or deleted.' });
        }

        // 2. Fetch the company margins for this combo kit and warehouse
        const marginDoc = await CompanyMargin.findOne({
            combo_kit_id,
            warehouse_id,
            deleted_at: null
        }).lean();

        const standard_margin_snapshot = marginDoc ? (marginDoc.standard_margin || 0) : 0;
        const showcase_margin_snapshot = marginDoc ? (marginDoc.showcase_margin || 0) : 0;
        const po_discounted_margin_snapshot = marginDoc ? (marginDoc.po_discounted_margin || 0) : 0;

        // 3. Gather unique SKUs in the kit
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
        const uniqueSkuIds = [...new Set(skuIds)].map(id => new mongoose.Types.ObjectId(id));

        // 4. Fetch the SKU prices for this warehouse
        const priceMap = {};
        if (uniqueSkuIds.length > 0) {
            const pricingRecords = await ProductSkuPrice.find({
                sku_id: { $in: uniqueSkuIds },
                warehouse_id
            }).lean();

            pricingRecords.forEach(record => {
                if (record.sku_id) {
                    priceMap[record.sku_id.toString()] = record.price || 0;
                }
            });
        }

        // Build sku_prices_snapshot
        const sku_prices_snapshot = uniqueSkuIds.map(skuId => ({
            sku_id: skuId,
            price: priceMap[skuId.toString()] || 0
        }));

        // 5. Calculate base price snapshot
        let base_price_snapshot = 0;
        if (kit.base_components && Array.isArray(kit.base_components)) {
            kit.base_components.forEach(bc => {
                if (bc.sku_id) {
                    const price = priceMap[bc.sku_id.toString()] || 0;
                    base_price_snapshot += price * (bc.quantity || 1);
                }
            });
        }
        if (kit.bos_kits && Array.isArray(kit.bos_kits)) {
            kit.bos_kits.forEach(bk => {
                if (bk.sku_id) {
                    const price = priceMap[bk.sku_id.toString()] || 0;
                    base_price_snapshot += price * (bk.quantity || 1);
                }
            });
        }

        // Calculate selling price snapshot applying standard margin
        const selling_price_snapshot = base_price_snapshot * (1 + (standard_margin_snapshot / 100));

        // 6. Save the purchase order
        const newPo = new PurchaseOrder({
            country_id,
            state_id,
            cluster_id,
            warehouse_id,
            combo_kit_id,
            base_price_snapshot,
            selling_price_snapshot,
            standard_margin_snapshot,
            showcase_margin_snapshot,
            po_discounted_margin_snapshot,
            sku_prices_snapshot,
            status: 'pending'
        });

        await newPo.save();

        // 7. Trigger cached pricing calculation to make sure ComboKit/Activation caches are updated
        computeKitPrices(combo_kit_id, warehouse_id, false).catch(err => {
            console.error('[create_po_order] Async cache update error:', err);
        });

        return res.status(201).json({
            status: 'success',
            message: 'Purchase Order created and prices snapshotted successfully.',
            data: newPo
        });
    } catch (error) {
        console.error("Error in create_po_order:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

const get_po_orders = async (req, res) => {
    try {
        const { country_id, state_id, cluster_id, warehouse_id, combo_kit_id } = req.query;
        const query = {};

        if (country_id) {
            const isIndia = await isCountryIndia(country_id);
            if (isIndia) {
                return res.status(400).json({ status: 'error', message: 'Use India endpoint to retrieve India purchase orders.' });
            }
            query.country_id = country_id;
        }
        if (state_id) query.state_id = state_id;
        if (cluster_id) query.cluster_id = cluster_id;
        if (warehouse_id) query.warehouse_id = warehouse_id;
        if (combo_kit_id) query.combo_kit_id = combo_kit_id;

        const pos = await PurchaseOrder.find(query)
            .populate('country_id')
            .populate('state_id')
            .populate('cluster_id')
            .populate('combo_kit_id')
            .populate('sku_prices_snapshot.sku_id')
            .lean();

        // Fetch warehouses manually from company_warehouse_db connection
        const warehouseIds = [...new Set(pos.map(p => p.warehouse_id?.toString()).filter(Boolean))];
        const warehouses = await CompanyWarehouse.find({ _id: { $in: warehouseIds } }).lean();
        const warehouseMap = Object.fromEntries(warehouses.map(w => [w._id.toString(), w]));

        const data = pos.map(p => {
            const wh = p.warehouse_id ? warehouseMap[p.warehouse_id.toString()] : null;
            return {
                ...p,
                id: p._id,
                country_name: p.country_id?.name || 'Unknown Country',
                state_name: p.state_id?.name || 'Unknown State',
                cluster_name: p.cluster_id?.name || 'Unknown Cluster',
                combo_kit_name: p.combo_kit_id?.name || 'Unknown Kit',
                warehouse: wh ? {
                    id: wh._id.toString(),
                    warehouse_code: wh.warehouse_code,
                    address: wh.address,
                    pincode: wh.pincode
                } : null
            };
        });

        return res.status(200).json({ status: 'success', data });
    } catch (error) {
        console.error("Error in get_po_orders:", error);
        return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
};

module.exports = {
    create_po_order,
    get_po_orders
};
