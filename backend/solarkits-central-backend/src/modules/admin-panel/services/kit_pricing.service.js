const mongoose = require('mongoose');
const { WarehouseComboKit: ComboKit, WarehouseKitActivation, ProductSkuPrice, CompanyMargin: CompanyMarginCore } = require('../models/core_db');
const { CompanyMargin: CompanyMarginIndia } = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { GeoLevel2, GeoLevel0 } = require('../models/geolocation_db');

/**
 * Computes base price and selling price for a given combo kit and warehouse, and updates the cache.
 * @param {string|ObjectId} combo_kit_id 
 * @param {string|ObjectId} warehouse_id 
 * @param {boolean} isIndia 
 */
const computeKitPrices = async (combo_kit_id, warehouse_id, isIndia = false) => {
    try {
        const comboKitId = new mongoose.Types.ObjectId(combo_kit_id);
        const warehouseId = new mongoose.Types.ObjectId(warehouse_id);

        // 1. Fetch the combo kit definition from core DB ComboKit
        const kit = await ComboKit.findOne({ _id: comboKitId, deleted_at: null });
        if (!kit) {
            console.log(`[computeKitPrices] Combo kit ${comboKitId} not found or deleted.`);
            return null;
        }

        // 2. Gather all unique SKU IDs in the combo kit
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

        // 3. Fetch SKU prices for this warehouse's cluster
        const warehouse = await CompanyWarehouse.findById(warehouseId).lean();
        if (!warehouse) {
            console.log(`[computeKitPrices] Warehouse ${warehouseId} not found.`);
            return null;
        }

        const district = await GeoLevel2.findById(warehouse.level_2).lean();
        if (!district || !district.cluster) {
            console.log(`[computeKitPrices] Cluster not found for warehouse ${warehouseId} (district: ${warehouse.level_2})`);
            return null;
        }
        const clusterId = district.cluster;

        const priceMap = {};
        if (uniqueSkuIds.length > 0) {
            const pricingRecords = await ProductSkuPrice.find({
                sku_id: { $in: uniqueSkuIds },
                cluster_id: clusterId
            }).lean();

            pricingRecords.forEach(record => {
                if (record.sku_id) {
                    priceMap[record.sku_id.toString()] = record.price || 0;
                }
            });
        }

        // 4. Calculate total base price
        let totalBasePrice = 0;
        if (kit.base_components && Array.isArray(kit.base_components)) {
            kit.base_components.forEach(bc => {
                if (bc.sku_id) {
                    const price = priceMap[bc.sku_id.toString()] || 0;
                    totalBasePrice += price * (bc.quantity || 1);
                }
            });
        }
        if (kit.bos_kits && Array.isArray(kit.bos_kits)) {
            kit.bos_kits.forEach(bk => {
                if (bk.sku_id) {
                    const price = priceMap[bk.sku_id.toString()] || 0;
                    totalBasePrice += price * (bk.quantity || 1);
                }
            });
        }

        // 5. Fetch Company Margin for this kit and warehouse
        const marginModel = isIndia ? CompanyMarginIndia : CompanyMarginCore;
        const marginDoc = await marginModel.findOne({
            combo_kit_id: comboKitId,
            warehouse_id: warehouseId,
            deleted_at: null
        }).lean();

        const standardMargin = marginDoc ? (marginDoc.standard_margin || 0) : 0;

        // 6. Calculate selling price applying the standard margin markup
        const sellingPrice = totalBasePrice * (1 + (standardMargin / 100));

        // 7. Update Cache on the Combo Kit Document itself
        await ComboKit.updateOne(
            { _id: comboKitId },
            {
                $set: {
                    base_price_cached: totalBasePrice,
                    selling_price_cached: sellingPrice
                }
            }
        );

        // 8. Update Cache on the Activation Document
        await WarehouseKitActivation.updateOne(
            { combo_kit_id: comboKitId, warehouse_id: warehouseId, deleted_at: null },
            {
                $set: {
                    base_price_cached: totalBasePrice,
                    selling_price_cached: sellingPrice,
                    updated_at: new Date()
                }
            }
        );

        console.log(`[computeKitPrices] Recalculated prices for Kit: ${kit.name} in Warehouse: ${warehouseId}. Base: ${totalBasePrice}, Selling: ${sellingPrice} (Margin: ${standardMargin}%)`);

        return {
            base_price: totalBasePrice,
            selling_price: sellingPrice,
            standard_margin: standardMargin
        };
    } catch (error) {
        console.error('[computeKitPrices] Error calculating prices:', error);
        return null;
    }
};

/**
 * Recalculate kit prices for all combo kits referencing a specific SKU in a warehouse.
 * @param {string|ObjectId} sku_id 
 * @param {string|ObjectId} warehouse_id 
 */
const recalculateKitPricesForSku = async (sku_id, warehouse_id) => {
    try {
        const skuId = new mongoose.Types.ObjectId(sku_id);
        const warehouseId = new mongoose.Types.ObjectId(warehouse_id);

        const warehouse = await CompanyWarehouse.findById(warehouseId).lean();
        if (!warehouse) return;

        const countryId = warehouse.level_0;
        const countryObj = await GeoLevel0.findOne({ _id: countryId, deleted_at: null }).lean();
        const isIndia = countryObj && countryObj.name?.toLowerCase() === 'india';

        // Find kits referencing this SKU
        const kits = await ComboKit.find({
            $or: [
                { 'base_components.sku_id': skuId },
                { 'bos_kits.sku_id': skuId }
            ],
            deleted_at: null
        }).select('_id').lean();

        for (const kit of kits) {
            await computeKitPrices(kit._id, warehouseId, isIndia);
        }
    } catch (error) {
        console.error('[recalculateKitPricesForSku] Error in SKU trigger:', error);
    }
};

/**
 * Recalculate kit prices when a margin configuration changes.
 * @param {string|ObjectId} combo_kit_id 
 * @param {string|ObjectId} warehouse_id 
 */
const recalculateKitPricesForMargin = async (combo_kit_id, warehouse_id) => {
    try {
        const comboKitId = new mongoose.Types.ObjectId(combo_kit_id);
        const warehouseId = new mongoose.Types.ObjectId(warehouse_id);

        const warehouse = await CompanyWarehouse.findById(warehouseId).lean();
        if (!warehouse) return;

        const countryId = warehouse.level_0;
        const countryObj = await GeoLevel0.findOne({ _id: countryId, deleted_at: null }).lean();
        const isIndia = countryObj && countryObj.name?.toLowerCase() === 'india';

        await computeKitPrices(comboKitId, warehouseId, isIndia);
    } catch (error) {
        console.error('[recalculateKitPricesForMargin] Error in Margin trigger:', error);
    }
};

module.exports = {
    computeKitPrices,
    recalculateKitPricesForSku,
    recalculateKitPricesForMargin
};
