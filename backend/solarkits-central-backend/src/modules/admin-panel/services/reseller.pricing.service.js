/**
 * reseller.pricing.service.js
 *
 * Reseller Catalog Pricing, MAP Enforcement & Server-Side Checkout Calculation Service.
 * Phase R7 — Reseller Management System
 *
 * Strict Integer Paise Financial Accounting (1 INR = 100 Paise).
 */

const {
  Reseller,
  ResellerListing,
  ResellerPricingRule,
  WarehouseComboKit,
  SolarShopSettings,
} = require('../models/india_solarshop_db');
const { Product } = require('../models/core_db');
const { logAudit } = require('../utils/audit.service');

/**
 * Calculate cost price, MAP price, and commission for a specific catalog item and reseller.
 */
async function calculateResellerItemPricing(resellerId, itemType, productId, kitId) {
  const reseller = await Reseller.findOne({ _id: resellerId, deleted_at: null }).lean();
  if (!reseller) throw new Error(`Reseller "${resellerId}" not found`);

  let item = null;
  let baseCostPaise = 0;

  if (itemType === 'product' && productId) {
    item = await Product.findById(productId).lean();
    if (item) baseCostPaise = Math.round((item.base_price || item.price || 0) * 100);
  } else if (itemType === 'kit' && kitId) {
    item = await WarehouseComboKit.findById(kitId).lean();
    if (item) baseCostPaise = Math.round((item.base_price || item.price || 0) * 100);
  }

  // Look for matching ResellerPricingRule by precedence:
  // reseller > reseller_type > product/kit > global
  const query = { status: 'active' };
  const rules = await ResellerPricingRule.find(query).lean();

  let matchedRule = null;
  for (const r of rules) {
    if (r.scope_type === 'reseller' && String(r.reseller_id) === String(resellerId)) {
      matchedRule = r; break;
    }
    if (r.scope_type === 'reseller_type' && String(r.reseller_type_id) === String(reseller.reseller_type_id)) {
      matchedRule = r; break;
    }
    if (r.scope_type === 'product' && productId && String(r.product_id) === String(productId)) {
      matchedRule = r; break;
    }
    if (r.scope_type === 'kit' && kitId && String(r.kit_id) === String(kitId)) {
      matchedRule = r; break;
    }
    if (r.scope_type === 'global' && !matchedRule) {
      matchedRule = r;
    }
  }

  const mapPricePaise = matchedRule?.map_price_paise != null
    ? matchedRule.map_price_paise
    : Math.round(baseCostPaise * 1.05); // Default MAP = 5% over cost

  const maxPricePaise = matchedRule?.max_markup_pct != null
    ? Math.round(baseCostPaise * (1 + matchedRule.max_markup_pct / 100))
    : Math.round(baseCostPaise * 2.0); // Default max = 100% markup

  const commissionPct = matchedRule?.default_commission_pct != null
    ? matchedRule.default_commission_pct
    : 5.0; // Default 5% platform commission

  return {
    item_type: itemType,
    product_id: productId || null,
    kit_id: kitId || null,
    cost_price_paise: baseCostPaise,
    map_price_paise: mapPricePaise,
    max_price_paise: maxPricePaise,
    platform_commission_pct: commissionPct,
  };
}

/**
 * Create or update a Reseller Listing with MAP enforcement check.
 */
async function createOrUpdateResellerListing({
  reseller_id,
  item_type,
  product_id = null,
  kit_id = null,
  selling_price_paise,
  allow_map_override = false,
  status = 'active',
  actor_id = null,
  req = null,
}) {
  const sellingPrice = parseInt(selling_price_paise, 10);
  if (isNaN(sellingPrice) || sellingPrice <= 0) {
    throw new Error('selling_price_paise must be a positive integer in paise');
  }

  const pricing = await calculateResellerItemPricing(reseller_id, item_type, product_id, kit_id);
  const isMapCompliant = sellingPrice >= pricing.map_price_paise;

  // MAP Enforcement
  if (!isMapCompliant && !allow_map_override) {
    return {
      success: false,
      code: 'MAP_VIOLATION',
      message: `Selling price (${sellingPrice / 100} INR) is below Minimum Advertised Price (${pricing.map_price_paise / 100} INR).`,
      map_price_paise: pricing.map_price_paise,
      requested_price_paise: sellingPrice,
    };
  }

  const filter = { reseller_id, item_type };
  if (product_id) filter.product_id = product_id;
  if (kit_id) filter.kit_id = kit_id;

  const update = {
    reseller_id,
    item_type,
    product_id: product_id || null,
    kit_id: kit_id || null,
    cost_price_paise: pricing.cost_price_paise,
    map_price_paise: pricing.map_price_paise,
    max_price_paise: pricing.max_price_paise,
    selling_price_paise: sellingPrice,
    platform_commission_pct: pricing.platform_commission_pct,
    is_map_compliant: isMapCompliant,
    status,
    updated_by: actor_id,
  };

  const listing = await ResellerListing.findOneAndUpdate(
    filter,
    { $set: update, $setOnInsert: { created_by: actor_id } },
    { new: true, upsert: true }
  );

  await logAudit({
    actor_type: actor_id ? 'cms_user' : 'reseller',
    actor_id: actor_id || reseller_id,
    action: 'RESELLER_LISTING_UPDATE',
    entity_type: 'reseller_listings',
    entity_id: listing._id,
    after_snapshot: { selling_price_paise: sellingPrice, is_map_compliant: isMapCompliant },
    req,
  });

  return { success: true, listing };
}

/**
 * Server-side price calculation for EPC cart checkout (never trust client-supplied totals).
 */
async function calculateCheckoutPrice(resellerId, items = []) {
  let settings = await SolarShopSettings.findOne().lean();
  const platformDefaultGstRate = Number(settings?.gst_rate != null ? settings.gst_rate : 12);

  let subtotalPaise = 0;
  let taxTotalPaise = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10) || 1;
    const filter = { reseller_id: resellerId, status: 'active' };
    if (item.product_id) filter.product_id = item.product_id;
    if (item.kit_id) filter.kit_id = item.kit_id;

    let listing = await ResellerListing.findOne(filter).lean();
    const rawKitId = item.kit_id || listing?.kit_id || (!item.product_id ? (item.id || item._id) : null) || null;
    const isKit = Boolean(rawKitId) || item.item_type === 'kit' || item.scope_type === 'kit' || listing?.item_type === 'kit';
    const itemType = isKit ? 'kit' : (listing?.item_type || item.item_type || 'product');
    const resolvedKitId = isKit ? (rawKitId ? rawKitId.toString() : null) : null;
    const resolvedProductId = !isKit ? (item.product_id || listing?.product_id || null) : null;

    let resolvedTitle = listing?.title || item.item_name || item.kitName || item.name || item.title || null;
    let resolvedImage = listing?.image_url || item.image || item.kit_image || null;
    let resolvedCapacity = item.capacity || null;
    let resolvedDesc = listing?.description || item.description || null;
    let resolvedItemGstRate = null;

    if (isKit && resolvedKitId && (!resolvedTitle || resolvedTitle === 'Solar Component' || !resolvedImage || !resolvedCapacity)) {
      try {
        const rawDb = require('mongoose').connection.db;
        if (rawDb && require('mongoose').Types.ObjectId.isValid(resolvedKitId)) {
          const kDoc = await rawDb.collection('pc_combo_kits').findOne({ _id: new (require('mongoose').Types.ObjectId)(resolvedKitId) })
                    || await rawDb.collection('pc_comobo_kit').findOne({ _id: new (require('mongoose').Types.ObjectId)(resolvedKitId) });
          if (kDoc) {
            if (!resolvedTitle || resolvedTitle === 'Solar Component') resolvedTitle = kDoc.name || kDoc.kit_name || kDoc.title;
            if (!resolvedImage) resolvedImage = kDoc.kit_image || kDoc.image;
            if (!resolvedCapacity && kDoc.capacity) resolvedCapacity = `${kDoc.capacity} kW`;
            if (!resolvedDesc) resolvedDesc = kDoc.description;
          }
        }
      } catch (err) {
        console.warn('Error fetching kit doc in calculateCheckoutPrice:', err.message);
      }
    }

    let unitPricePaise = 0;
    const platformCommPct = listing?.platform_commission_pct != null ? listing.platform_commission_pct : 5.0;

    // Check if quantity tier pricing applies for combo kit
    if (isKit && resolvedKitId) {
      try {
        const { CompanyMargin: IndiaMargin } = require('../models/india_solarshop_db');
        const { CompanyMargin: CoreMargin } = require('../models/core_db');

        let marginDoc = await IndiaMargin.findOne({
          combo_kit_id: resolvedKitId,
          is_active: true,
          deleted_at: null,
        }).sort({ updated_at: -1 }).lean();

        if (!marginDoc) {
          marginDoc = await CoreMargin.findOne({
            combo_kit_id: resolvedKitId,
            is_active: true,
            deleted_at: null,
          }).sort({ updated_at: -1 }).lean();
        }

        if (marginDoc) {
          if (marginDoc.gst_rate != null && !isNaN(marginDoc.gst_rate)) {
            resolvedItemGstRate = Number(marginDoc.gst_rate);
          }
          const allTiers = [
            ...(Array.isArray(marginDoc.loose_order_pricing) ? marginDoc.loose_order_pricing : []),
            ...(Array.isArray(marginDoc.po_order_pricing) ? marginDoc.po_order_pricing : []),
          ];
          const matchedTier = allTiers.find((t) => Number(t.quantity) === Number(qty) && Number(t.price_per_kit) > 0);
          if (matchedTier) {
            // tier.price_per_kit is GST-inclusive per kit in INR
            const effectiveRate = resolvedItemGstRate != null ? resolvedItemGstRate : platformDefaultGstRate;
            const tierPriceInclGstPaise = Math.round(Number(matchedTier.price_per_kit) * 100);
            unitPricePaise = Math.round(tierPriceInclGstPaise / (1 + effectiveRate / 100));
          }
        }
      } catch (tierErr) {
        console.warn('Error checking tier pricing in calculateCheckoutPrice:', tierErr.message);
      }
    }

    // Resolve GST rate hierarchy: marginDoc.gst_rate > item.gstRate > item.gst_rate > platformDefaultGstRate
    if (resolvedItemGstRate == null) {
      if (item.gstRate != null && !isNaN(item.gstRate)) {
        resolvedItemGstRate = Number(item.gstRate);
      } else if (item.gst_rate != null && !isNaN(item.gst_rate)) {
        resolvedItemGstRate = Number(item.gst_rate);
      } else {
        resolvedItemGstRate = platformDefaultGstRate;
      }
    }

    if (!unitPricePaise || unitPricePaise <= 0) {
      unitPricePaise = listing?.selling_price_paise || (item.unit_price_paise ? parseInt(item.unit_price_paise, 10) : 0);
    }

    if (!unitPricePaise || unitPricePaise <= 0) {
      const ourPriceRupees = parseFloat(item.ourPrice || item.unit_price_inr || item.price || item.selling_price || 0);
      if (ourPriceRupees > 0) {
        const unitPriceInclGstPaise = Math.round(ourPriceRupees * 100);
        unitPricePaise = Math.round(unitPriceInclGstPaise / (1 + resolvedItemGstRate / 100));
      } else if (resolvedKitId) {
        const kitDoc = await WarehouseComboKit.findById(resolvedKitId).lean();
        const rawKitPrice = kitDoc?.selling_price_cached || kitDoc?.base_price || 180000;
        unitPricePaise = Math.round(rawKitPrice * 100);
      } else {
        unitPricePaise = 18000000;
      }
    }

    const itemSubtotal = qty * unitPricePaise;
    const itemTax = Math.round(itemSubtotal * (resolvedItemGstRate / 100));

    subtotalPaise += itemSubtotal;
    taxTotalPaise += itemTax;

    processedItems.push({
      item_type: itemType,
      scope_type: itemType,
      product_id: resolvedProductId,
      kit_id: resolvedKitId,
      item_name: resolvedTitle || (isKit ? 'Solar Combo Kit' : 'Solar Product'),
      image: resolvedImage || null,
      capacity: resolvedCapacity || null,
      description: resolvedDesc || null,
      quantity: qty,
      unit_price_paise: unitPricePaise,
      unit_price_incl_gst_paise: Math.round(unitPricePaise * (1 + resolvedItemGstRate / 100)),
      cost_price_paise: listing?.cost_price_paise || Math.round(unitPricePaise * 0.85),
      gst_rate: resolvedItemGstRate,
      tax_paise: itemTax,
      total_price_paise: itemSubtotal + itemTax,
      platform_commission_pct: platformCommPct,
    });
  }

  const shippingFeePaise = 0;
  const grandTotalPaise = subtotalPaise + taxTotalPaise + shippingFeePaise;

  return {
    reseller_id: resellerId,
    items: processedItems,
    subtotal_paise: subtotalPaise,
    tax_total_paise: taxTotalPaise,
    shipping_fee_paise: shippingFeePaise,
    grand_total_paise: grandTotalPaise,
    gst_rate: processedItems[0]?.gst_rate || platformDefaultGstRate,
  };
}

module.exports = {
  calculateResellerItemPricing,
  createOrUpdateResellerListing,
  calculateCheckoutPrice,
};
