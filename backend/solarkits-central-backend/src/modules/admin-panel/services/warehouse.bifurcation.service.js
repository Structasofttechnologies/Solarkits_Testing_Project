/**
 * warehouse.bifurcation.service.js
 *
 * "According Order Type Fulfillment" Engine.
 * Responsibilities:
 * 1. Normalize and identify Order Types ('po_order', 'loose_order', 'trial_order').
 * 2. Hierarchical Warehouse Resolution:
 *    - District Level Match -> Cluster Master Match -> State Master Match -> Central Hub Fallback.
 * 3. Match warehouse capabilities (order_fulfillment_types).
 */

const mongoose = require('mongoose');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const WarehouseKitActivation = require('../models/core_db/warehouse_kit_activations.schema');

const VALID_ORDER_TYPES = ['po_order', 'loose_order', 'trial_order'];

/**
 * Normalizes any incoming order type string or item list into one of 3 canonical types:
 * 'po_order' | 'loose_order' | 'trial_order'
 */
function normalizeOrderType(rawType, items = []) {
  if (!rawType && Array.isArray(items)) {
    if (items.some(it => it && (it.is_trial_kit || (it.item_name && /trial/i.test(it.item_name))))) {
      return 'trial_order';
    }
    if (items.some(it => it && (it.order_type === 'loose' || it.is_loose_order || it.order_type === 'loose_kit_order'))) {
      return 'loose_order';
    }
  }

  const str = String(rawType || '').toLowerCase().trim();
  if (str === 'trial_order' || str === 'trial' || str === 'is_trial') {
    return 'trial_order';
  }
  if (str === 'loose_order' || str === 'loose' || str === 'loose_kit_order' || str === 'loose_order_quantities') {
    return 'loose_order';
  }
  if (str === 'po_order' || str === 'bulk_po' || str === 'combine_po_order' || str === 'po') {
    return 'po_order';
  }

  // Check items as fallback
  if (Array.isArray(items) && items.length > 0) {
    if (items.some(it => it && (it.is_trial_kit || (it.item_name && /trial/i.test(it.item_name))))) {
      return 'trial_order';
    }
    if (items.some(it => it && (it.order_type === 'loose' || it.is_loose_order))) {
      return 'loose_order';
    }
  }

  return 'po_order';
}

/**
 * Resolves the optimal warehouse for an order based on order type capability and geolocation.
 *
 * Hierarchy:
 * 1. District Level: Warehouse in exact district supporting order_type
 * 2. Cluster Level: Master or sub warehouse in the same cluster supporting order_type
 * 3. State Level: Master warehouse in the same state supporting order_type
 * 4. Fallback Level: National central master warehouse supporting order_type
 *
 * @param {Object} params
 * @param {string|ObjectId} [params.district_id]
 * @param {string|ObjectId} [params.state_id]
 * @param {string|ObjectId} [params.cluster_id]
 * @param {string} [params.order_type] - 'po_order' | 'loose_order' | 'trial_order'
 * @param {Array} [params.items] - Order items for fallback detection
 * @returns {Promise<Object>} Resolved warehouse and bifurcation metadata snapshot
 */
async function resolveFulfillmentWarehouse({ district_id, state_id, cluster_id, order_type = 'po_order', items = [] }) {
  const normalizedType = normalizeOrderType(order_type, items);

  const capabilityQuery = {
    is_active: true,
    deleted_at: null,
    $or: [
      { order_fulfillment_types: normalizedType },
      { order_fulfillment_types: { $size: 0 } }, // backward compatibility if empty array
      { order_fulfillment_types: { $exists: false } } // backward compatibility if not set
    ]
  };

  let resolvedWh = null;
  let matchedLevel = null;
  let matchedReason = '';

  // ── Step 1: Local District Check ───────────────────────────────────────────
  if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
    resolvedWh = await CompanyWarehouse.findOne({
      level_2: new mongoose.Types.ObjectId(district_id),
      ...capabilityQuery
    }).lean();

    if (resolvedWh) {
      matchedLevel = 'district';
      matchedReason = `Matched local district warehouse (${resolvedWh.warehouse_code}) authorized for ${normalizedType}`;
    }
  }

  // ── Step 2: Cluster Master / Sub Warehouse Check ───────────────────────────
  if (!resolvedWh) {
    let resolvedClusterId = cluster_id;
    if (!resolvedClusterId && district_id && mongoose.Types.ObjectId.isValid(district_id)) {
      try {
        const districtDoc = await GeoLevel2.findById(district_id).lean();
        if (districtDoc && districtDoc.cluster) {
          resolvedClusterId = districtDoc.cluster;
        }
      } catch (err) {
        console.warn('[WarehouseBifurcation] Failed to fetch district cluster:', err.message);
      }
    }

    if (resolvedClusterId) {
      const clusterDistrictIds = await GeoLevel2.find({
        cluster: resolvedClusterId,
        deleted_at: null
      }).distinct('_id');

      if (clusterDistrictIds && clusterDistrictIds.length > 0) {
        // Try master warehouse in cluster first, then any sub warehouse
        resolvedWh = await CompanyWarehouse.findOne({
          level_2: { $in: clusterDistrictIds },
          ...capabilityQuery
        }).sort({ warehouse_type: 1 }).lean();

        if (resolvedWh) {
          matchedLevel = 'cluster';
          matchedReason = `Matched in-cluster warehouse (${resolvedWh.warehouse_code}) authorized for ${normalizedType}`;
        }
      }
    }
  }

  // ── Step 3: State Master Hub Check ────────────────────────────────────────
  if (!resolvedWh && state_id && mongoose.Types.ObjectId.isValid(state_id)) {
    resolvedWh = await CompanyWarehouse.findOne({
      level_1: new mongoose.Types.ObjectId(state_id),
      ...capabilityQuery
    }).sort({ warehouse_type: 1 }).lean();

    if (resolvedWh) {
      matchedLevel = 'state';
      matchedReason = `Matched state-level hub (${resolvedWh.warehouse_code}) authorized for ${normalizedType}`;
    }
  }

  // ── Step 4: Fallback to Central / National Hub with Capability Match ───────
  if (!resolvedWh) {
    resolvedWh = await CompanyWarehouse.findOne({
      ...capabilityQuery
    }).sort({ warehouse_type: 1, created_at: 1 }).lean();

    if (resolvedWh) {
      matchedLevel = 'fallback_central';
      matchedReason = `Assigned Central Hub (${resolvedWh.warehouse_code}) supporting ${normalizedType}`;
    }
  }

  // ── Step 5: Universal Emergency Safe Fallback ──────────────────────────────
  if (!resolvedWh) {
    resolvedWh = await CompanyWarehouse.findOne({
      is_active: true,
      deleted_at: null
    }).sort({ warehouse_type: 1 }).lean();

    if (resolvedWh) {
      matchedLevel = 'fallback_central';
      matchedReason = `Emergency fallback to warehouse (${resolvedWh.warehouse_code}) [Notice: Check warehouse capability configuration]`;
    }
  }

  return {
    warehouse: resolvedWh,
    assigned_warehouse_id: resolvedWh ? (resolvedWh._id || resolvedWh.id) : null,
    assigned_warehouse_code: resolvedWh ? resolvedWh.warehouse_code : null,
    order_type_matched: normalizedType,
    matched_level: matchedLevel,
    matched_reason: matchedReason
  };
}

/**
 * Requirement 8: Serviceability & Order Allocation Engine - Mixed-Kit Order Split Fulfillment
 *
 * Allocates customer orders containing mixed kits across multiple active warehouses.
 * Checks kit activation, stock permission, and delivery serviceability per warehouse.
 * If Warehouse A supplies Kit 1 and Warehouse B supplies Kit 2, splits the order
 * into distinct warehouse consignments under the same parent order number.
 *
 * @param {Object} params
 * @param {string} params.order_id - Parent customer order ObjectId
 * @param {string} params.order_number - Parent order display code (e.g. "SK-2026-ORD-8821")
 * @param {string|ObjectId} [params.destination_district_id] - Delivery destination district
 * @param {string|ObjectId} [params.destination_state_id] - Delivery destination state
 * @param {Array} params.items - Order items [{ kit_id, combo_kit_id, kit_type, quantity, sku, item_name }]
 * @returns {Promise<Object>} Consignment allocation breakdown
 */
async function allocateMixedKitOrderConsignments({
  order_id,
  order_number = 'ORD-001',
  destination_district_id,
  destination_state_id,
  items = []
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      order_id,
      order_number,
      is_split: false,
      consignments_count: 0,
      consignments: [],
      unallocated_items: []
    };
  }

  // 1. Fetch all active warehouses with dispatch permission
  const activeWarehouses = await CompanyWarehouse.find({
    is_active: true,
    deleted_at: null,
    'operational_permissions.dispatch': { $ne: false }
  }).lean();

  if (activeWarehouses.length === 0) {
    return {
      order_id,
      order_number,
      is_split: false,
      consignments_count: 0,
      consignments: [],
      unallocated_items: items,
      error: 'No active warehouses available with dispatch permission'
    };
  }

  const warehouseIds = activeWarehouses.map(w => w._id);

  // 2. Query kit activations across these warehouses with dispatch authorization
  const activations = await WarehouseKitActivation.find({
    warehouse_id: { $in: warehouseIds },
    deleted_at: null,
    dispatch_permission: { $ne: false },
    $or: [
      { is_active: true },
      { is_combokit_active: true },
      { is_customize_kit_active: true }
    ]
  }).lean();

  // Create lookup maps: warehouse_id -> [active kit IDs or SKUs]
  const whKitMap = new Map();
  for (const act of activations) {
    const whIdStr = String(act.warehouse_id);
    if (!whKitMap.has(whIdStr)) {
      whKitMap.set(whIdStr, []);
    }
    whKitMap.get(whIdStr).push({
      combo_kit_id: act.combo_kit_id ? String(act.combo_kit_id) : null,
      kit_id: act.kit_id ? String(act.kit_id) : null,
      kit_sku: act.kit_sku || null,
      delivery_districts: Array.isArray(act.delivery_districts) ? act.delivery_districts.map(String) : []
    });
  }

  const warehouseItemBuckets = new Map(); // warehouse_id -> items array
  const unallocatedItems = [];

  const destDistrictStr = destination_district_id ? String(destination_district_id) : null;
  const destStateStr = destination_state_id ? String(destination_state_id) : null;

  // 3. Match each item to the best servicing warehouse
  for (const item of items) {
    const itemKitId = String(item.combo_kit_id || item.kit_id || item._id || '');
    const itemSku = String(item.sku || item.kit_sku || '').toUpperCase();

    let bestWarehouse = null;
    let bestScore = -1;

    for (const wh of activeWarehouses) {
      const whIdStr = String(wh._id);
      const actsForWh = whKitMap.get(whIdStr) || [];

      // Check if kit is activated in this warehouse
      const matchingAct = actsForWh.find(a =>
        (a.combo_kit_id && a.combo_kit_id === itemKitId) ||
        (a.kit_id && a.kit_id === itemKitId) ||
        (a.kit_sku && itemSku && a.kit_sku === itemSku)
      );

      // If kit is not active in this warehouse, skip
      if (!matchingAct && actsForWh.length > 0) {
        continue;
      }

      // Calculate proximity / serviceability score:
      let score = 1; // base score for kit activation match

      // Score bonus for district level match
      if (destDistrictStr) {
        const whDistrictStr = wh.level_2 ? String(wh.level_2) : null;
        const servesDistrict = matchingAct?.delivery_districts?.includes(destDistrictStr) ||
          (Array.isArray(wh.serviceable_districts) && wh.serviceable_districts.some(d => String(d) === destDistrictStr));

        if (whDistrictStr === destDistrictStr) {
          score += 100; // Exact local facility
        } else if (servesDistrict) {
          score += 50; // Explicitly serviceable district
        }
      }

      // Score bonus for state level match
      if (destStateStr && wh.level_1 && String(wh.level_1) === destStateStr) {
        score += 20;
      }

      // Score bonus for Company-owned facilities over 3PL for margin efficiency
      if (wh.warehouse_type === 'company') {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestWarehouse = wh;
      }
    }

    if (bestWarehouse) {
      const whKey = String(bestWarehouse._id);
      if (!warehouseItemBuckets.has(whKey)) {
        warehouseItemBuckets.set(whKey, {
          warehouse: bestWarehouse,
          items: []
        });
      }
      warehouseItemBuckets.get(whKey).items.push(item);
    } else {
      unallocatedItems.push(item);
    }
  }

  // 4. Construct distinct Consignments under the same Parent Order Number
  const consignments = [];
  let consignmentIndex = 1;

  for (const [whId, { warehouse, items: whItems }] of warehouseItemBuckets.entries()) {
    const consignmentNumber = `${order_number}-C${consignmentIndex}`;
    consignmentIndex++;

    const totalQty = whItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

    consignments.push({
      consignment_number: consignmentNumber,
      order_id,
      order_number,
      warehouse_id: warehouse._id,
      warehouse_code: warehouse.warehouse_code,
      warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
      warehouse_type: warehouse.warehouse_type || 'company',
      vendor_id: warehouse.vendor_id || null,
      destination_district_id,
      destination_state_id,
      items: whItems,
      total_items_count: whItems.length,
      total_quantity: totalQty,
      dispatch_status: 'pending_dispatch',
      allocated_at: new Date()
    });
  }

  return {
    order_id,
    order_number,
    is_split: consignments.length > 1,
    consignments_count: consignments.length,
    consignments,
    unallocated_items: unallocatedItems
  };
}

module.exports = {
  VALID_ORDER_TYPES,
  normalizeOrderType,
  resolveFulfillmentWarehouse,
  allocateMixedKitOrderConsignments
};
