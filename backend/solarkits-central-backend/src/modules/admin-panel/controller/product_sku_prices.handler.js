const mongoose = require('mongoose');
const { ProductSku, ProductSkuPrice, ProductAttributeValue } = require('../models/core_db');
const { GeoLevel0, GeoLevel1, GeoLevel2, Cluster } = require('../models/geolocation_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { recalculateKitPricesForSku } = require('../services/kit_pricing.service');

const get_sku_prices = async (req, res) => {
  try {
    let { cluster_id, warehouse_id } = req.query;

    if (!cluster_id && warehouse_id) {
      const wh = await CompanyWarehouse.findById(warehouse_id).lean();
      if (wh && wh.level_2) {
        const district = await GeoLevel2.findById(wh.level_2).lean();
        if (district && district.cluster) {
          cluster_id = district.cluster.toString();
        }
      }
    }

    if (!cluster_id) {
      return res.status(400).json({ status: "error", message: "cluster_id or warehouse_id is required" });
    }

    // Fetch cluster to determine the country/level_0 - support both ObjectId and cluster name
    let cluster = null;
    if (mongoose.Types.ObjectId.isValid(cluster_id) && String(new mongoose.Types.ObjectId(cluster_id)) === String(cluster_id)) {
      cluster = await Cluster.findById(cluster_id).lean();
    }
    if (!cluster) {
      cluster = await Cluster.findOne({ name: cluster_id, deleted_at: null }).lean();
    }
    if (!cluster) {
      return res.status(404).json({ status: "error", message: "Cluster not found" });
    }

    // Fetch state (level_1)
    const state = await GeoLevel1.findById(cluster.level_1).lean();
    if (!state) {
      return res.status(404).json({ status: "error", message: "State for cluster not found" });
    }

    const country = await GeoLevel0.findById(state.level_0).lean();
    const currency_code = country?.currency_code || 'USD';
    const currency_name = country?.currency_name || 'US Dollar';

    // Fetch all active SKUs
    const skus = await ProductSku.find({ deleted_at: null })
      .populate({
        path: 'product_id',
        select: 'name image description template_id subtype_id',
        populate: {
          path: 'template_id',
          select: 'name'
        }
      })
      .lean();

    // Fetch all specifications / attribute values in bulk
    const skuIds = skus.map(s => s._id);
    const productIds = skus.map(s => s.product_id?._id || s.product_id).filter(Boolean);

    const allAttrs = await ProductAttributeValue.find({
      $or: [
        { sku_id: { $in: skuIds } },
        { product_id: { $in: productIds }, sku_id: null }
      ],
      deleted_at: null
    })
      .populate('attribute_id', 'name attribute_type')
      .populate('unit_id', 'symbol conversion_factor')
      .populate({ path: 'value_option_id', select: 'value' })
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

    // Fetch existing pricing for this cluster
    const pricingRecords = await ProductSkuPrice.find({ cluster_id: cluster._id }).lean();
    const priceMap = {};
    const pricePerWattMap = {};
    pricingRecords.forEach(record => {
      if (record.sku_id) {
        priceMap[record.sku_id.toString()] = record.price;
        pricePerWattMap[record.sku_id.toString()] = record.price_per_watt;
      }
    });

    const data = skus.map(sku => {
      // Find capacity attribute
      let capacity_w = 0;
      let capacity_unit = '';
      
      const skuIdStr = sku._id.toString();
      const prodIdStr = sku.product_id?._id?.toString() || sku.product_id?.toString();
      const skuAttrs = skuAttrMap[skuIdStr] || [];
      const prodAttrs = productAttrMap[prodIdStr] || [];
      const attrs = [...skuAttrs, ...prodAttrs];

      const capAttr = attrs.find(a => 
        a.attribute_id?.attribute_type === 'sku' ||
        ['capacity', 'power rating', 'ac capacity', 'pmax', 'power'].includes((a.attribute_id?.name || '').toLowerCase().trim())
      );
      if (capAttr) {
        const rawVal = parseFloat(capAttr.value_number ?? (capAttr.value_option_id ? capAttr.value_option_id.value : capAttr.value_text) ?? 0);
        const factor = capAttr.unit_id?.conversion_factor || 1;
        capacity_w = rawVal * factor;
        capacity_unit = capAttr.unit_id?.symbol || '';
      }

      const isSolar = (sku.product_id?.template_id?.name || '').toLowerCase().includes('solar panel');
      const basePrice = priceMap[sku._id.toString()] !== undefined ? priceMap[sku._id.toString()] : 0;
      let basePricePerWatt = pricePerWattMap[sku._id.toString()] !== undefined ? pricePerWattMap[sku._id.toString()] : 0;
      
      // Fallback for legacy data
      if (isSolar && basePricePerWatt === 0 && basePrice > 0 && capacity_w > 0) {
        basePricePerWatt = basePrice / capacity_w;
      }

      return {
        id: sku._id,
        sku_code: sku.sku_code,
        product_id: sku.product_id?._id || sku.product_id,
        template_id: sku.product_id?.template_id?._id || null,
        template_name: sku.product_id?.template_id?.name || null,
        subtype_id: sku.product_id?.subtype_id || null,
        product_name: sku.product_id?.name || 'Unknown Product',
        product_image: sku.product_id?.image || null,
        price: basePrice,
        price_per_watt: basePricePerWatt,
        capacity_w,
        capacity_unit,
        currency_code,
        currency_name
      };
    });

    return res.status(200).json({
      status: "success",
      country_id: country?._id,
      state_id: state?._id,
      cluster_id: cluster._id,
      cluster_name: cluster.name,
      currency_code,
      currency_name,
      price_map: priceMap,
      price_per_watt_map: pricePerWattMap,
      data
    });
  } catch (err) {
    console.error('Error in get_sku_prices:', err);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch SKU prices",
      error: err.message
    });
  }
};

const set_sku_prices = async (req, res) => {
  try {
    const { country_id, state_id, cluster_id, prices } = req.body;

    if (!cluster_id) {
      return res.status(400).json({
        status: "error",
        message: "cluster_id is required"
      });
    }

    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "prices must be a non-empty array of { sku_id, price }"
      });
    }

    // Resolve cluster to its ObjectId if name or string was passed
    let cluster = null;
    if (mongoose.Types.ObjectId.isValid(cluster_id) && String(new mongoose.Types.ObjectId(cluster_id)) === String(cluster_id)) {
      cluster = await Cluster.findById(cluster_id).lean();
    }
    if (!cluster) {
      cluster = await Cluster.findOne({ name: cluster_id, deleted_at: null }).lean();
    }
    if (!cluster) {
      return res.status(404).json({ status: "error", message: "Cluster not found" });
    }
    const resolvedClusterId = cluster._id;

    // Resolve state (level_1) from cluster, or fallback to state_id
    let state = null;
    if (cluster.level_1) {
      state = await GeoLevel1.findById(cluster.level_1).lean();
    }
    if (!state && state_id) {
      if (mongoose.Types.ObjectId.isValid(state_id) && String(new mongoose.Types.ObjectId(state_id)) === String(state_id)) {
        state = await GeoLevel1.findById(state_id).lean();
      }
      if (!state) {
        state = await GeoLevel1.findOne({ name: state_id, deleted_at: null }).lean();
      }
    }
    const resolvedStateId = state ? state._id : (cluster.level_1 || state_id);

    // Resolve country's currency details from state, or fallback to country_id
    let country = null;
    if (state && state.level_0) {
      country = await GeoLevel0.findById(state.level_0).lean();
    }
    if (!country && country_id) {
      if (mongoose.Types.ObjectId.isValid(country_id) && String(new mongoose.Types.ObjectId(country_id)) === String(country_id)) {
        country = await GeoLevel0.findById(country_id).lean();
      }
      if (!country) {
        country = await GeoLevel0.findOne({ name: country_id, is_active: true, deleted_at: null }).lean();
      }
    }
    if (!country) {
      return res.status(404).json({ status: "error", message: "Country not found" });
    }
    const resolvedCountryId = country._id;
    const currency_code = country.currency_code || 'USD';

    // Perform upserts for each price entry
    const promises = prices.map(async (item) => {
      const skuPrice = Number(item.price); // This is the entered price (per watt for solar, unit price for others)
      let price_per_watt = 0;
      let finalPrice = skuPrice;

      // Check if SKU is a Solar Panel
      const sku = await ProductSku.findById(item.sku_id)
        .populate({
          path: 'product_id',
          populate: { path: 'template_id', select: 'name' }
        })
        .lean();

      if (sku) {
        const isSolar = (sku.product_id?.template_id?.name || '').toLowerCase().includes('solar panel');
        if (isSolar) {
          price_per_watt = skuPrice;

          // Find capacity attribute
          const attrs = await ProductAttributeValue.find({
            $or: [
              { sku_id: sku._id },
              { product_id: sku.product_id?._id || sku.product_id, sku_id: null }
            ],
            deleted_at: null
          })
            .populate('attribute_id', 'name attribute_type')
            .populate('unit_id', 'symbol conversion_factor')
            .populate({ path: 'value_option_id', select: 'value' })
            .lean();

          let capacity_w = 0;
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

      return ProductSkuPrice.findOneAndUpdate(
        { sku_id: item.sku_id, cluster_id: resolvedClusterId },
        {
          $set: {
            country_id: resolvedCountryId,
            state_id: resolvedStateId,
            cluster_id: resolvedClusterId,
            price: isNaN(finalPrice) ? 0 : finalPrice,
            price_per_watt: isNaN(price_per_watt) ? 0 : price_per_watt,
            currency_code
          },
          $unset: {
            warehouse_id: 1
          }
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(promises);

    // Recalculate kit prices for updated SKUs in all warehouses linked to this cluster asynchronously
    // 1. Get districts in this cluster
    const districts = await GeoLevel2.find({ cluster: resolvedClusterId, deleted_at: null }).select('_id').lean();
    const districtIds = districts.map(d => d._id);
    // 2. Find warehouses in these districts
    const warehouses = await CompanyWarehouse.find({ level_2: { $in: districtIds }, deleted_at: null }).select('_id').lean();

    for (const item of prices) {
      if (item.sku_id) {
        for (const warehouse of warehouses) {
          recalculateKitPricesForSku(item.sku_id, warehouse._id).catch(err => {
            console.error(`Error recalculating kit prices for SKU ${item.sku_id} in warehouse ${warehouse._id}:`, err);
          });
        }
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Product SKU prices updated successfully"
    });
  } catch (err) {
    console.error('Error in set_sku_prices:', err);
    return res.status(500).json({
      status: "error",
      message: "Failed to set SKU prices",
      error: err.message
    });
  }
};

module.exports = {
  get_sku_prices,
  set_sku_prices
};
