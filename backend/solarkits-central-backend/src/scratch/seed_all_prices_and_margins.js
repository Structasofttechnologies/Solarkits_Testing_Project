const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { ProductSku, ProductSkuPrice, WarehouseComboKit, CompanyMargin: CompanyMarginCore, WarehouseKitActivation } = require('../modules/admin-panel/models/core_db');
const { CompanyWarehouse } = require('../modules/admin-panel/models/company_warehouse_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../modules/admin-panel/models/geolocation_db');
const { CompanyMargin: CompanyMarginIndia } = require('../modules/admin-panel/models/india_solarshop_db');

async function seedPricesAndMargins() {
    try {
        console.log('Connecting to MongoDB...');
        await new Promise(r => setTimeout(r, 1000));

        // 1. Fetch Geolocation details
        const indiaGeo = await GeoLevel0.findOne({ name: { $regex: /india/i } }).lean();
        const countryId = indiaGeo ? indiaGeo._id : new mongoose.Types.ObjectId("690edf337aaa2d9abd00c618");

        const states = await GeoLevel1.find({}).lean();
        const districts = await GeoLevel2.find({}).lean();

        // Collect all distinct cluster IDs from districts or database
        const clusterIdsSet = new Set();
        const districtClusterMap = {};
        districts.forEach(d => {
            if (d.cluster) {
                const cId = d.cluster._id ? d.cluster._id.toString() : d.cluster.toString();
                clusterIdsSet.add(cId);
                districtClusterMap[d._id.toString()] = cId;
            }
        });

        // Ensure at least fallback cluster exists
        const allClusters = [...clusterIdsSet];
        if (allClusters.length === 0) {
            allClusters.push("691177487ccd8c040dafc4e5");
        }

        console.log(`Found ${districts.length} districts and ${allClusters.length} distinct clusters.`);

        // 2. Fetch Warehouses
        const warehouses = await CompanyWarehouse.find({ deleted_at: null }).lean();
        console.log(`Found ${warehouses.length} warehouses.`);

        // 3. Fetch all SKUs
        const allSkus = await ProductSku.find({ deleted_at: null }).populate('product_id').lean();
        console.log(`Found ${allSkus.length} product SKUs.`);

        // Seed Benchmark Prices for all SKUs in all clusters
        let priceCount = 0;
        for (const clusterIdStr of allClusters) {
            const clusterId = new mongoose.Types.ObjectId(clusterIdStr);
            const stateId = states[0] ? states[0]._id : countryId;

            for (const sku of allSkus) {
                const skuCode = (sku.sku_code || '').toUpperCase();
                const pName = (sku.product_id?.name || '').toLowerCase();

                let estimatedPrice = 25000;
                // Benchmark market prices in India
                if (skuCode.includes('540W') || pName.includes('540w')) {
                    estimatedPrice = 13500;
                } else if (skuCode.includes('550W') || pName.includes('550w')) {
                    estimatedPrice = 14200;
                } else if (skuCode.includes('330W') || pName.includes('330w')) {
                    estimatedPrice = 7800;
                } else if (skuCode.includes('3KW') || pName.includes('3kw')) {
                    estimatedPrice = 26500;
                } else if (skuCode.includes('5KW') || pName.includes('5kw')) {
                    estimatedPrice = 42000;
                } else if (skuCode.includes('10KW') || pName.includes('10kw')) {
                    estimatedPrice = 82000;
                } else if (skuCode.includes('50KW') || pName.includes('50kw')) {
                    estimatedPrice = 220000;
                } else if (pName.includes('panel') || pName.includes('module')) {
                    estimatedPrice = 12000;
                } else if (pName.includes('inverter')) {
                    estimatedPrice = 32000;
                }

                await ProductSkuPrice.findOneAndUpdate(
                    { sku_id: sku._id, cluster_id: clusterId },
                    {
                        sku_id: sku._id,
                        country_id: countryId,
                        state_id: stateId,
                        cluster_id: clusterId,
                        price: estimatedPrice,
                        price_per_watt: 24,
                        currency_code: 'INR'
                    },
                    { upsert: true, new: true }
                );
                priceCount++;
            }
        }
        console.log(`Seeded/Updated ${priceCount} SKU benchmark prices across clusters.`);

        // 4. Fetch Combo Kits
        const kits = await WarehouseComboKit.find({ deleted_at: null }).lean();
        console.log(`Found ${kits.length} combo kits.`);

        // 5. Seed Company Margins & Kit Activations for each warehouse & kit
        let marginCount = 0;
        let activationCount = 0;

        for (const wh of warehouses) {
            const whCountryId = wh.level_0 || countryId;
            const whStateId = wh.level_1 || (states[0] ? states[0]._id : countryId);
            const whDistrictId = wh.level_2 ? wh.level_2.toString() : null;
            const whClusterIdStr = (whDistrictId && districtClusterMap[whDistrictId]) || allClusters[0];
            const whClusterId = new mongoose.Types.ObjectId(whClusterIdStr);

            for (const kit of kits) {
                // Upsert Margin in India DB
                await CompanyMarginIndia.findOneAndUpdate(
                    { warehouse_id: wh._id, combo_kit_id: kit._id },
                    {
                        country_id: whCountryId,
                        state_id: whStateId,
                        cluster_id: whClusterId,
                        warehouse_id: wh._id,
                        combo_kit_id: kit._id,
                        showcase_margin: 25,
                        standard_margin: 15,
                        po_discounted_margin: 10,
                        gst_rate: 13.8,
                        is_po_active: true,
                        is_active: true,
                        deleted_at: null
                    },
                    { upsert: true, new: true }
                );

                // Upsert Margin in Core DB
                await CompanyMarginCore.findOneAndUpdate(
                    { warehouse_id: wh._id, combo_kit_id: kit._id },
                    {
                        country_id: whCountryId,
                        state_id: whStateId,
                        cluster_id: whClusterId,
                        warehouse_id: wh._id,
                        combo_kit_id: kit._id,
                        showcase_margin: 25,
                        standard_margin: 15,
                        po_discounted_margin: 10,
                        gst_rate: 13.8,
                        is_po_active: true,
                        is_active: true,
                        deleted_at: null
                    },
                    { upsert: true, new: true }
                );
                marginCount++;

                // Activate Kit for Warehouse
                await WarehouseKitActivation.findOneAndUpdate(
                    { warehouse_id: wh._id, combo_kit_id: kit._id },
                    {
                        warehouse_id: wh._id,
                        combo_kit_id: kit._id,
                        is_combokit_active: true,
                        is_customize_kit_active: true,
                        is_active: true,
                        deleted_at: null
                    },
                    { upsert: true, new: true }
                );
                activationCount++;
            }
        }

        console.log(`Successfully seeded ${marginCount} company margins (15% standard, 25% showcase, 13.8% GST).`);
        console.log(`Successfully activated ${activationCount} warehouse kit activations!`);
        console.log('SEEDING COMPLETE! All kits unlocked and active.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding prices & margins:', err);
        process.exit(1);
    }
}

seedPricesAndMargins();
