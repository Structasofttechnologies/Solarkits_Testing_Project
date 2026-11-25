const mongoose = require('mongoose');
const SupplierWarehouse = require('../models/supplier_warehouse.schema');
const SupplierSkuPrice = require('../models/supplier_sku_price.schema');

// Core DB Models (registered on the core_db connection)
const ProductTemplate = require('../models/core_db/product_templates.schema');
const ProductSubtype = require('../models/core_db/product_subtypes.schema');
const Brand = require('../models/core_db/brands.schema');
const BrandTemplateMap = require('../models/core_db/brand_template_map.schema');
const Product = require('../models/core_db/products.schema');
const ProductSku = require('../models/core_db/product_skus.schema');
const ProductSkuPrice = require('../models/core_db/product_sku_prices.schema');
const SubtypeAttribute = require('../models/core_db/subtype_attributes.schema');
const Unit = require('../models/core_db/units.schema');
const ProductAttributeValue = require('../models/core_db/product_attribute_values.schema');
const AttributeOption = require('../models/core_db/attribute_options.schema');

// Geolocation Models
const GeoLevel1 = require('../models/geolocation_db/geolocation_level_1.schema');
const GeoLevel2 = require('../models/geolocation_db/geolocation_level_2.schema');
const Cluster = require('../models/geolocation_db/clusters.schema');


const successResponse = (res, message, data = null) => {
    return res.status(200).json({ status: 'success', message, data });
};

const errorResponse = (res, code, message) => {
    return res.status(code).json({ status: 'error', message, data: null });
};

// 1. Fetch templates filtered by product supply type (Primary, Other, Both)
const listTemplates = async (req, res) => {
    try {
        const { type } = req.query; // 'Primary', 'Other', 'Both' (or default)
        
        let query = { deleted_at: null };
        if (type === 'Primary') {
            query.name = { $regex: /solar panel/i };
        } else if (type === 'Other') {
            query.name = { $not: /solar panel/i };
        }
        
        const templates = await ProductTemplate.find(query).sort({ name: 1 }).lean();
        
        // Return templates list
        const formatted = templates.map(t => ({
            id: t._id,
            name: t.name,
            description: t.description
        }));
        
        return successResponse(res, 'Templates fetched successfully', formatted);
    } catch (error) {
        console.error('Error in listTemplates:', error);
        return errorResponse(res, 500, 'Failed to fetch templates');
    }
};

// 2. Fetch brands associated with a set of selected templates
const listBrandsForTemplates = async (req, res) => {
    try {
        const { template_ids } = req.query;
        if (!template_ids) {
            return successResponse(res, 'No templates specified', []);
        }
        
        const ids = template_ids.split(',').map(id => id.trim()).filter(id => mongoose.isValidObjectId(id));
        if (ids.length === 0) {
            return successResponse(res, 'No valid templates specified', []);
        }
        
        // Find mapped brands
        const mappings = await BrandTemplateMap.find({
            template_id: { $in: ids },
            deleted_at: null
        }).lean();
        
        const brandIds = [...new Set(mappings.map(m => m.brand_id.toString()))];
        if (brandIds.length === 0) {
            return successResponse(res, 'No brands mapped to these templates', []);
        }
        
        const brands = await Brand.find({
            _id: { $in: brandIds },
            deleted_at: null
        }).sort({ brand_name: 1 }).lean();
        
        const formatted = brands.map(b => ({
            id: b._id,
            name: b.brand_name,
            logo: b.logo
        }));
        
        return successResponse(res, 'Brands fetched successfully', formatted);
    } catch (error) {
        console.error('Error in listBrandsForTemplates:', error);
        return errorResponse(res, 500, 'Failed to fetch brands');
    }
};

// 3. Get supply configuration of a warehouse
const getSupplyConfig = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        if (!mongoose.isValidObjectId(warehouseId)) {
            return errorResponse(res, 400, 'Invalid warehouse ID');
        }
        
        const warehouse = await SupplierWarehouse.findById(warehouseId)
            .populate({ path: 'supply_templates', model: ProductTemplate })
            .populate({ path: 'supply_brands', model: Brand })
            .lean();
            
        if (!warehouse) {
            return errorResponse(res, 404, 'Warehouse not found');
        }
        
        const config = {
            supply_type: warehouse.supply_type || null,
            supply_templates: (warehouse.supply_templates || []).map(t => ({
                id: t._id,
                name: t.name
            })),
            supply_brands: (warehouse.supply_brands || []).map(b => ({
                id: b._id,
                name: b.brand_name,
                logo: b.logo
            }))
        };
        
        return successResponse(res, 'Supply configuration fetched successfully', config);
    } catch (error) {
        console.error('Error in getSupplyConfig:', error);
        return errorResponse(res, 500, 'Failed to fetch supply configuration');
    }
};

// 4. Update supply configuration of a warehouse
const updateSupplyConfig = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { supply_type, supply_templates, supply_brands } = req.body;
        
        if (!mongoose.isValidObjectId(warehouseId)) {
            return errorResponse(res, 400, 'Invalid warehouse ID');
        }
        
        const warehouse = await SupplierWarehouse.findById(warehouseId);
        if (!warehouse) {
            return errorResponse(res, 404, 'Warehouse not found');
        }
        
        // Ensure arrays and sanitize IDs
        const templateIds = (supply_templates || []).filter(id => mongoose.isValidObjectId(id));
        const brandIds = (supply_brands || []).filter(id => mongoose.isValidObjectId(id));
        
        warehouse.supply_type = supply_type;
        warehouse.supply_templates = templateIds;
        warehouse.supply_brands = brandIds;
        
        await warehouse.save();
        
        return successResponse(res, 'Supply configuration updated successfully');
    } catch (error) {
        console.error('Error in updateSupplyConfig:', error);
        return errorResponse(res, 500, 'Failed to update supply configuration');
    }
};

// Helper to resolve warehouse cluster
const getWarehouseCluster = async (warehouse) => {
    if (!warehouse) return null;
    try {
        const stateDoc = await GeoLevel1.findOne({
            name: { $regex: new RegExp(`^${warehouse.state.trim()}$`, 'i') },
            deleted_at: null
        }).lean();
        
        if (!stateDoc) {
            console.log(`[getWarehouseCluster] State "${warehouse.state}" not found in geolocation_level_1`);
            const fallbackDist = await GeoLevel2.findOne({ cluster: { $ne: null }, deleted_at: null }).lean();
            return fallbackDist ? fallbackDist.cluster : null;
        }
        
        const districts = await GeoLevel2.find({
            level_1: stateDoc._id,
            deleted_at: null
        }).lean();
        
        if (districts.length === 0) {
            console.log(`[getWarehouseCluster] No districts found in state "${warehouse.state}"`);
            const fallbackDist = await GeoLevel2.findOne({ cluster: { $ne: null }, deleted_at: null }).lean();
            return fallbackDist ? fallbackDist.cluster : null;
        }
        
        let matchedDistrict = null;
        const addressUpper = (warehouse.address || '').toUpperCase();
        const nameUpper = (warehouse.name || '').toUpperCase();
        
        for (const dist of districts) {
            const distName = dist.name.toUpperCase();
            if (addressUpper.includes(distName) || nameUpper.includes(distName)) {
                matchedDistrict = dist;
                break;
            }
        }
        
        if (!matchedDistrict) {
            matchedDistrict = districts.find(d => d.cluster);
        }
        
        if (matchedDistrict && matchedDistrict.cluster) {
            return matchedDistrict.cluster;
        }
        
        const fallbackDist = await GeoLevel2.findOne({ cluster: { $ne: null }, deleted_at: null }).lean();
        return fallbackDist ? fallbackDist.cluster : null;
    } catch (err) {
        console.error('[getWarehouseCluster] Error resolving warehouse cluster:', err);
        return null;
    }
};

// 5. Fetch SKUs for the pricing master, filtered by warehouse config and custom filters
const listWarehouseSkus = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { template_id, subtype_id, product_id, brand_id, search } = req.query;
        
        if (!mongoose.isValidObjectId(warehouseId)) {
            return errorResponse(res, 400, 'Invalid warehouse ID');
        }
        
        const warehouse = await SupplierWarehouse.findById(warehouseId).lean();
        if (!warehouse) {
            return errorResponse(res, 404, 'Warehouse not found');
        }
        
        const supplyTemplates = warehouse.supply_templates || [];
        const supplyBrands = warehouse.supply_brands || [];
        
        if (supplyTemplates.length === 0) {
            return successResponse(res, 'No templates configured for this warehouse', { skus: [], subtypes: [], products: [] });
        }
        
        // ── Step A: Build dynamic query for products ─────────────────────────────
        // Restrict products to the warehouse's supply configuration
        const productQuery = {
            template_id: { $in: supplyTemplates },
            deleted_at: null
        };
        
        // Only restrict brand to supplyBrands if supplyBrands has items
        if (supplyBrands.length > 0) {
            productQuery.brand_id = { $in: supplyBrands };
        }
        
        // Apply hierarchy filters
        if (template_id && mongoose.isValidObjectId(template_id)) {
            productQuery.template_id = template_id;
        }
        if (subtype_id && mongoose.isValidObjectId(subtype_id)) {
            productQuery.subtype_id = subtype_id;
        }
        if (product_id && mongoose.isValidObjectId(product_id)) {
            productQuery._id = product_id;
        }
        
        // Apply independent brand filter
        if (brand_id && mongoose.isValidObjectId(brand_id)) {
            productQuery.brand_id = brand_id;
        }
        
        const productsList = await Product.find(productQuery).lean();
        const productIds = productsList.map(p => p._id);
        
        // Fetch all subtypes and products matching the current template selection for frontend filter options
        const subtypesFilterQuery = { template_id: { $in: supplyTemplates }, deleted_at: null };
        if (template_id && mongoose.isValidObjectId(template_id)) {
            subtypesFilterQuery.template_id = template_id;
        }
        const availableSubtypes = await ProductSubtype.find(subtypesFilterQuery).sort({ name: 1 }).lean();
        
        const productsFilterQuery = { template_id: { $in: supplyTemplates }, deleted_at: null };
        if (template_id && mongoose.isValidObjectId(template_id)) {
            productsFilterQuery.template_id = template_id;
        }
        if (subtype_id && mongoose.isValidObjectId(subtype_id)) {
            productsFilterQuery.subtype_id = subtype_id;
        }
        if (supplyBrands.length > 0) {
            productsFilterQuery.brand_id = { $in: supplyBrands };
        }
        const availableProducts = await Product.find(productsFilterQuery).sort({ name: 1 }).lean();
        
        if (productIds.length === 0) {
            return successResponse(res, 'No products match filters', {
                skus: [],
                subtypes: availableSubtypes.map(s => ({ id: s._id, name: s.name, template_id: s.template_id })),
                products: availableProducts.map(p => ({ id: p._id, name: p.name, subtype_id: p.subtype_id, template_id: p.template_id }))
            });
        }
        
        // ── Step B: Query SKUs belonging to matching products ────────────────────
        let skuQuery = {
            product_id: { $in: productIds },
            deleted_at: null
        };
        
        if (search && search.trim() !== '') {
            skuQuery.sku_code = { $regex: new RegExp(search.trim(), 'i') };
        }
        
        const skus = await ProductSku.find(skuQuery)
            .populate({
                path: 'product_id',
                model: Product,
                populate: [
                    { path: 'template_id', model: ProductTemplate },
                    { path: 'subtype_id', model: ProductSubtype },
                    { path: 'brand_id', model: Brand }
                ]
            })
            .populate({
                path: 'attributes.subtype_attribute_id',
                model: SubtypeAttribute
            })
            .populate({
                path: 'attributes.unit_id',
                model: Unit
            })
            .lean();
            
        // ── Step C: Resolve Cluster and Get Benchmark Prices ─────────────────────
        const clusterId = await getWarehouseCluster(warehouse);
        const skuIds = skus.map(s => s._id);
        const skuProductIds = skus.map(s => s.product_id?._id || s.product_id).filter(Boolean);

        // Fetch attributes from ProductAttributeValue
        const allAttrs = await ProductAttributeValue.find({
            $or: [
                { sku_id: { $in: skuIds } },
                { product_id: { $in: skuProductIds }, sku_id: null }
            ],
            deleted_at: null
        })
            .populate({ path: 'attribute_id', model: SubtypeAttribute })
            .populate({ path: 'unit_id', model: Unit })
            .populate({ path: 'value_option_id', model: AttributeOption })
            .lean();

        const skuAttrMap = {};
        const productAttrMap = {};
        allAttrs.forEach(a => {
            if (a.sku_id) {
                const key = a.sku_id.toString();
                if (!skuAttrMap[key]) skuAttrMap[key] = [];
                skuAttrMap[key].push(a);
            } else if (a.product_id) {
                const key = a.product_id.toString();
                if (!productAttrMap[key]) productAttrMap[key] = [];
                productAttrMap[key].push(a);
            }
        });

        let benchmarkPrices = [];
        if (clusterId) {
            benchmarkPrices = await ProductSkuPrice.find({
                cluster_id: clusterId,
                sku_id: { $in: skuIds }
            }).lean();
        }
        
        const benchmarkPriceMap = {};
        const benchmarkPricePerWattMap = {};
        benchmarkPrices.forEach(bp => {
            benchmarkPriceMap[bp.sku_id.toString()] = bp.price;
            benchmarkPricePerWattMap[bp.sku_id.toString()] = bp.price_per_watt || 0;
        });
        
        // ── Step D: Join with supplier SKU prices ──────────────────────────────
        const prices = await SupplierSkuPrice.find({
            warehouse_id: warehouseId,
            sku_id: { $in: skuIds }
        }).lean();
        
        const priceMap = {};
        const pricePerWattMap = {};
        prices.forEach(p => {
            priceMap[p.sku_id.toString()] = p.price;
            pricePerWattMap[p.sku_id.toString()] = p.price_per_watt || 0;
        });
        
        const formattedSkus = skus.map(s => {
            const prod = s.product_id || {};
            const skuIdStr = s._id.toString();
            const prodIdStr = prod._id?.toString() || prod.toString();
            const skuAttrs = skuAttrMap[skuIdStr] || [];
            const prodAttrs = productAttrMap[prodIdStr] || [];
            const combinedAttrs = [...skuAttrs, ...prodAttrs];

            const attrs = combinedAttrs.map(a => ({
                name: a.attribute_id?.name || 'Unknown Attribute',
                value: a.value_number !== null && a.value_number !== undefined
                    ? a.value_number
                    : (a.value_option_id ? a.value_option_id.value : (a.value_text || '—')),
                unit: a.unit_id?.symbol || a.unit_id?.name || ''
            }));
            
            // Calculate capacity_w using unit conversion factor
            let capacity_w = 0;
            let capacity_unit = '';
            
            const capAttr = combinedAttrs.find(a => 
                a.attribute_id?.attribute_type === 'sku' ||
                ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
            );
            if (capAttr) {
                const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
                const factor = capAttr.unit_id?.conversion_factor || 1;
                capacity_w = rawVal * factor;
                capacity_unit = capAttr.unit_id?.symbol || '';
            }

            const isSolar = (prod.template_id?.name || '').toLowerCase().includes('solar panel');

            let skuPrice = priceMap[s._id.toString()] !== undefined ? priceMap[s._id.toString()] : 0;
            let skuPricePerWatt = pricePerWattMap[s._id.toString()] !== undefined ? pricePerWattMap[s._id.toString()] : 0;
            if (isSolar && skuPricePerWatt === 0 && skuPrice > 0 && capacity_w > 0) {
                skuPricePerWatt = skuPrice / capacity_w;
            }

            let bPrice = benchmarkPriceMap[s._id.toString()];
            let bPricePerWatt = benchmarkPricePerWattMap[s._id.toString()] || 0;
            if (isSolar && bPricePerWatt === 0 && bPrice > 0 && capacity_w > 0) {
                bPricePerWatt = bPrice / capacity_w;
            }

            return {
                id: s._id,
                sku_code: s.sku_code,
                image: s.image || prod.image || null,
                attributes: attrs,
                product_id: prod._id || null,
                product_name: prod.name || 'Unknown Product',
                product_description: prod.description || '',
                product_features: prod.features || [],
                template_id: prod.template_id?._id || null,
                template_name: prod.template_id?.name || 'Unknown Template',
                subtype_id: prod.subtype_id?._id || null,
                subtype_name: prod.subtype_id?.name || 'Unknown Subtype',
                brand_id: prod.brand_id?._id || null,
                brand_name: prod.brand_id?.brand_name || 'Generic / Unbranded',
                brand_logo: prod.brand_id?.logo || null,
                price: skuPrice,
                price_per_watt: skuPricePerWatt,
                benchmark_price: bPrice,
                benchmark_price_per_watt: bPricePerWatt,
                capacity_w,
                capacity_unit
            };
        });
        
        // ── Step E: Filter only SKUs with a benchmark price in that cluster ──────
        const filteredSkus = formattedSkus.filter(s => s.benchmark_price !== undefined);
        
        return successResponse(res, 'SKUs and filters fetched successfully', {
            skus: filteredSkus,
            subtypes: availableSubtypes.map(s => ({ id: s._id, name: s.name, template_id: s.template_id })),
            products: availableProducts.map(p => ({ id: p._id, name: p.name, subtype_id: p.subtype_id, template_id: p.template_id }))
        });
    } catch (error) {
        console.error('Error in listWarehouseSkus:', error);
        return errorResponse(res, 500, 'Failed to fetch SKUs');
    }
};

// 6. Set SKU prices for a warehouse
const updateWarehousePrices = async (req, res) => {
    try {
        const { warehouseId } = req.params;
        const { prices } = req.body; // array of { sku_id, price }
        
        if (!mongoose.isValidObjectId(warehouseId)) {
            return errorResponse(res, 400, 'Invalid warehouse ID');
        }
        
        const warehouse = await SupplierWarehouse.findById(warehouseId).lean();
        if (!warehouse) {
            return errorResponse(res, 404, 'Warehouse not found');
        }
        
        if (!prices || !Array.isArray(prices)) {
            return errorResponse(res, 400, 'Invalid prices array');
        }
        
        const promises = prices.map(async (item) => {
            if (!mongoose.isValidObjectId(item.sku_id)) return null;
            const priceVal = Number(item.price);
            if (isNaN(priceVal) || priceVal < 0) return null;
            
            // Fetch SKU details to check if solar panel and get capacity
            const sku = await ProductSku.findById(item.sku_id)
                .populate({
                    path: 'product_id',
                    model: Product,
                    populate: { path: 'template_id', model: ProductTemplate }
                })
                .lean();

            let price_per_watt = 0;
            let finalPrice = priceVal;

            if (sku) {
                const prod = sku.product_id || {};
                const isSolar = (prod.template_id?.name || '').toLowerCase().includes('solar panel');
                if (isSolar) {
                    price_per_watt = priceVal;
                    let capacity_w = 0;

                    const attrs = await ProductAttributeValue.find({
                        $or: [
                            { sku_id: sku._id },
                            { product_id: sku.product_id?._id || sku.product_id, sku_id: null }
                        ],
                        deleted_at: null
                    })
                        .populate({ path: 'attribute_id', model: SubtypeAttribute })
                        .populate({ path: 'unit_id', model: Unit })
                        .populate({ path: 'value_option_id', model: AttributeOption })
                        .lean();

                    const capAttr = attrs.find(a => 
                        a.attribute_id?.attribute_type === 'sku' ||
                        ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
                    );
                    if (capAttr) {
                        const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
                        const factor = capAttr.unit_id?.conversion_factor || 1;
                        capacity_w = rawVal * factor;
                    }
                    if (capacity_w > 0) {
                        finalPrice = price_per_watt * capacity_w;
                    }
                }
            }
            
            return SupplierSkuPrice.updateOne(
                { warehouse_id: warehouseId, sku_id: item.sku_id },
                {
                    $set: {
                        supplier_id: warehouse.supplier_id,
                        price: isNaN(finalPrice) ? 0 : finalPrice,
                        price_per_watt: isNaN(price_per_watt) ? 0 : price_per_watt,
                        is_active: true
                    }
                },
                { upsert: true }
            );
        });
        
        await Promise.all(promises.filter(Boolean));
        
        return successResponse(res, 'Prices updated successfully');
    } catch (error) {
        console.error('Error in updateWarehousePrices:', error);
        return errorResponse(res, 500, 'Failed to update prices');
    }
};

module.exports = {
    listTemplates,
    listBrandsForTemplates,
    getSupplyConfig,
    updateSupplyConfig,
    listWarehouseSkus,
    updateWarehousePrices
};
