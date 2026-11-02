const mongoose = require('mongoose');
const {
  CompanyWarehouse,
  WarehouseInward,
  WarehouseStock,
  PurchaseOrder,
  ProcurementGroup,
  PurchaseIndent,
  WarehouseInventoryReservation
} = require('../models/company_warehouse_db');

const { DeliveryOrder: WarehouseDeliveryOrder } = require('../../warehouse-panel/models/company_warehouse_db');

const {
  EpcOrder,
  FpoOrder,
  ComboKit,
  DeliveryVehicleMaster,
  DeliveryOrder,
  SolarShopSettings
} = require('../../admin-panel/models/india_solarshop_db');

const {
  WarehouseKitPartnerMapping,
  Brand,
  Product,
  ProductSku,
  ProductSkuPrice
} = require('../../admin-panel/models/core_db');

const {
  Cluster,
  GeoLevel2
} = require('../../admin-panel/models/geolocation_db');

const Supplier = require('../../supplier-panel/models/supplier.schema');
const SupplierWarehouse = require('../../supplier-panel/models/supplier_warehouse.schema');

/**
 * Helper: Generate unique PI-YYYY-XXXXX
 */
async function generatePiNumber() {
  const year = new Date().getFullYear();
  const count = await PurchaseIndent.countDocuments({});
  let seq = count + 1;
  let piNumber = `PI-${year}-${String(seq).padStart(5, '0')}`;
  while (await PurchaseIndent.findOne({ pi_number: piNumber })) {
    seq++;
    piNumber = `PI-${year}-${String(seq).padStart(5, '0')}`;
  }
  return piNumber;
}

/**
 * 1. Get Batch Ready Orders & Groups
 * Returns procurement groups or individual orders ready for procurement
 */
exports.get_batch_ready_orders = async (req, res) => {
  try {
    const { status, group_id, search } = req.query;
    const filter = {};

    const cleanGroupId = (group_id && group_id !== 'undefined' && group_id !== 'null') ? group_id.trim().toUpperCase() : null;
    const cleanStatus = (status && status !== 'all' && status !== 'undefined' && status !== 'null') ? status.trim() : null;
    const cleanSearch = (search && search !== 'undefined' && search !== 'null') ? search.trim() : null;

    if (cleanGroupId) {
      filter.group_id = cleanGroupId;
    } else if (cleanStatus) {
      if (cleanStatus === 'Batch Ready') {
        filter.status = { $in: ['Batch Ready', 'Ready for Procurement', 'Sent to Procurement'] };
      } else {
        filter.status = cleanStatus;
      }
    } else {
      filter.status = {
        $in: [
          'Batch Ready',
          'Ready for Procurement',
          'Sent to Procurement',
          'Procurement In Progress',
          'Awaiting Warehouse Inward',
          'Ready for Kit Preparation',
          'Transferred to Delivery'
        ]
      };
    }

    if (cleanSearch) {
      filter.$or = [
        { group_id: { $regex: cleanSearch, $options: 'i' } },
        { order_numbers: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const groups = await ProcurementGroup.find(filter)
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    // Enrich groups with associated PIs and reservations count
    const enriched = await Promise.all(
      groups.map(async (g) => {
        const [piCount, reservationCount, pis] = await Promise.all([
          PurchaseIndent.countDocuments({ order_group_id: g.group_id }),
          WarehouseInventoryReservation.countDocuments({ order_group_id: g.group_id, status: 'active' }),
          PurchaseIndent.find({ order_group_id: g.group_id }).lean()
        ]);

        let currentStatus = g.status;
        if (piCount >= 3 && (currentStatus === 'Sent to Procurement' || currentStatus === 'Batch Ready' || currentStatus === 'Procurement In Progress')) {
          currentStatus = 'Transferred to Delivery';
          ProcurementGroup.updateOne(
            { group_id: g.group_id },
            { $set: { status: 'Transferred to Delivery', batch_status: 'Transferred to Delivery', procurement_readiness_status: 'Awaiting Warehouse Inward' } }
          ).catch(() => {});
        }

        return {
          ...g,
          status: currentStatus,
          batch_status: currentStatus === 'Transferred to Delivery' ? 'Transferred to Delivery' : g.batch_status,
          pi_count: piCount,
          active_reservations_count: reservationCount,
          purchase_indents: pis,
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      count: enriched.length,
      data: enriched,
    });
  } catch (err) {
    console.error('Error in get_batch_ready_orders:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch batch ready orders.', error: err.message });
  }
};

/**
 * Helper to dynamically construct BOM definitions from Database & API models:
 * 1. WarehouseKitPartnerMapping (product_mappings for specific warehouse)
 * 2. ProcurementGroup (supplier_breakdown & supplier_groups)
 * 3. ComboKit (pc_comobo_kit / pc_combo_kits base_components & bos_kits)
 * 4. ProductSku & Brands from core database
 */
async function resolveDynamicBomDefinitions({ group, epcOrder, fpoOrder, targetWarehouseId, targetClusterId, totalKits }) {
  // 1. Try to find configured warehouse kit partner mapping
  let mapping = null;
  if (targetWarehouseId) {
    mapping = await WarehouseKitPartnerMapping.findOne({
      warehouse_id: targetWarehouseId,
      is_configured: true
    }).lean();
  }
  if (!mapping) {
    mapping = await WarehouseKitPartnerMapping.findOne({ is_configured: true }).lean();
  }

  // 2. Try to find the ComboKit
  let comboKitDoc = null;
  const targetKitId = mapping?.combo_kit_id || epcOrder?.items?.[0]?.kit_id || fpoOrder?.items?.[0]?.kit_id;
  if (targetKitId) {
    comboKitDoc = await ComboKit.findOne({ _id: targetKitId, deleted_at: null }).lean();
  }
  // If targetKitId is deleted or lacks real bos_kits, find the active ComboKit with BOS components
  if (!comboKitDoc || !comboKitDoc.bos_kits || comboKitDoc.bos_kits.length === 0) {
    const kitNameHints = (group?.kit_type_breakdown || []).map(k => (k.kit_type || '').toLowerCase());
    if (kitNameHints.some(h => h.includes('3') || h.includes('3kw'))) {
      comboKitDoc = await ComboKit.findOne({ deleted_at: null, is_active: true, name: /3\s*kw/i }).lean();
    } else if (kitNameHints.some(h => h.includes('2') || h.includes('2kw'))) {
      comboKitDoc = await ComboKit.findOne({ deleted_at: null, is_active: true, name: /2\s*k\.?w/i }).lean();
    } else if (kitNameHints.some(h => h.includes('1') || h.includes('1kw'))) {
      comboKitDoc = await ComboKit.findOne({ deleted_at: null, is_active: true, name: /1\s*k\.?w/i }).lean();
    }
    if (!comboKitDoc || !comboKitDoc.bos_kits || comboKitDoc.bos_kits.length === 0) {
      comboKitDoc = await ComboKit.findOne({ deleted_at: null, is_active: true, 'bos_kits.0': { $exists: true } }).lean();
    }
    if (!comboKitDoc) {
      comboKitDoc = await ComboKit.findOne({ deleted_at: null, is_active: true }).lean();
    }
  }

  // 3. Resolve target cluster ID for Live Benchmark Pricing from ProductSkuPrice (Admin Price Master)
  let resolvedClusterId = targetClusterId || null;
  if (!resolvedClusterId && targetWarehouseId) {
    const wh = await CompanyWarehouse.findById(targetWarehouseId).lean();
    if (wh) {
      resolvedClusterId = wh.cluster_id || null;
      if (!resolvedClusterId && wh.level_2) {
        const dist = await GeoLevel2.findById(wh.level_2).lean();
        if (dist && dist.cluster) resolvedClusterId = dist.cluster;
      }
    }
  }
  if (!resolvedClusterId) {
    const defCluster = await Cluster.findOne({ deleted_at: null }).lean();
    if (defCluster) resolvedClusterId = defCluster._id;
  }

  const breakdown = group?.supplier_breakdown || [];
  const groupSuppliers = group?.supplier_groups || [];

  // A. Panel / Solar Modules
  const panelMapping = mapping?.product_mappings?.find(m => m.component_type === 'panel');
  const panelBreakdown = breakdown.find(b => {
    const txt = `${b.category || ''} ${b.product || ''} ${b.component_name || ''} ${b.product_name || ''}`.toLowerCase();
    return txt.includes('module') || txt.includes('panel');
  });
  const panelCombo = comboKitDoc?.base_components?.find(c => c.quantity && c.quantity > 1);

  const panelName = panelBreakdown?.component_name ||
    panelBreakdown?.product ||
    panelBreakdown?.product_name ||
    panelMapping?.product_name ||
    'Bifacial 550W Mono PERC Solar PV Modules';

  const panelSku = panelMapping?.sku_code ||
    (panelBreakdown?.sku_code && panelBreakdown.sku_code !== 'null' ? panelBreakdown.sku_code : null) ||
    'PANEL-550W-BIFACIAL';

  const panelQtyPerKit = panelMapping?.quantity ||
    panelCombo?.quantity ||
    panelBreakdown?.kit_multiplier ||
    (panelBreakdown?.total_units && totalKits ? Math.round(panelBreakdown.total_units / totalKits) : 9) ||
    9;

  let panelRate = panelBreakdown?.estimated_unit_cost || 0;
  if (!panelRate) {
    const panelSkuDoc = await ProductSku.findOne({ sku_code: panelSku, deleted_at: null }).lean();
    if (panelSkuDoc) {
      const pPrice = await ProductSkuPrice.findOne({
        sku_id: panelSkuDoc._id,
        ...(resolvedClusterId ? { cluster_id: resolvedClusterId } : {}),
        price: { $gt: 0 }
      }).lean() || await ProductSkuPrice.findOne({ sku_id: panelSkuDoc._id, price: { $gt: 0 } }).lean();
      if (pPrice && pPrice.price > 0) panelRate = pPrice.price;
    }
  }
  if (!panelRate) panelRate = 6875;

  // B. Inverter
  const inverterMapping = mapping?.product_mappings?.find(m => m.component_type === 'inverter');
  const inverterBreakdown = breakdown.find(b => {
    const txt = `${b.category || ''} ${b.product || ''} ${b.component_name || ''} ${b.product_name || ''}`.toLowerCase();
    return txt.includes('inverter') || txt.includes('inv');
  });
  const inverterCombo = comboKitDoc?.base_components?.find(c => c !== panelCombo);

  const inverterName = inverterBreakdown?.component_name ||
    inverterBreakdown?.product ||
    inverterBreakdown?.product_name ||
    inverterMapping?.product_name ||
    '5kW / 10kW On-Grid String Solar Inverter';

  const inverterSku = inverterMapping?.sku_code ||
    (inverterBreakdown?.sku_code && inverterBreakdown.sku_code !== 'null' ? inverterBreakdown.sku_code : null) ||
    'INV-5KW-ONGRID';

  const inverterQtyPerKit = inverterMapping?.quantity ||
    inverterCombo?.quantity ||
    inverterBreakdown?.kit_multiplier ||
    (inverterBreakdown?.total_units && totalKits ? Math.round(inverterBreakdown.total_units / totalKits) : 1) ||
    1;

  let inverterRate = inverterBreakdown?.estimated_unit_cost || 0;
  if (!inverterRate) {
    const invSkuDoc = await ProductSku.findOne({ sku_code: inverterSku, deleted_at: null }).lean();
    if (invSkuDoc) {
      const iPrice = await ProductSkuPrice.findOne({
        sku_id: invSkuDoc._id,
        ...(resolvedClusterId ? { cluster_id: resolvedClusterId } : {}),
        price: { $gt: 0 }
      }).lean() || await ProductSkuPrice.findOne({ sku_id: invSkuDoc._id, price: { $gt: 0 } }).lean();
      if (iPrice && iPrice.price > 0) inverterRate = iPrice.price;
    }
  }
  if (!inverterRate) inverterRate = 32000;

  // C. Balance of System (BOS)
  const bosComboList = comboKitDoc?.bos_kits || [];
  const bosMappings = mapping?.product_mappings?.filter(m => m.component_type === 'bos_kit') || [];
  const bosBreakdownList = breakdown.filter(b => {
    const txt = `${b.category || ''} ${b.product || ''} ${b.component_name || ''} ${b.product_name || ''}`.toLowerCase();
    return !txt.includes('module') && !txt.includes('panel') && !txt.includes('inverter') && !txt.includes('inv-');
  });

  let subItems = [];

  // Priority 1: Real BOS components from ComboKit (linked directly with Price Master SKUs)
  if (bosComboList.length > 0) {
    const skuIds = bosComboList.map(bk => bk.sku_id).filter(Boolean);
    const skus = await ProductSku.find({ _id: { $in: skuIds }, deleted_at: null })
      .populate('product_id', 'name image category_id')
      .lean();
    const skuMap = new Map(skus.map(s => [s._id.toString(), s]));

    const priceQuery = { sku_id: { $in: skuIds }, price: { $gt: 0 } };
    if (resolvedClusterId) priceQuery.cluster_id = resolvedClusterId;
    let priceDocs = await ProductSkuPrice.find(priceQuery).lean();
    const priceMap = new Map();
    priceDocs.forEach(p => priceMap.set(p.sku_id.toString(), p.price));

    const missingIds = skuIds.filter(id => !priceMap.has(id.toString()));
    if (missingIds.length > 0) {
      const fallbackPrices = await ProductSkuPrice.find({ sku_id: { $in: missingIds }, price: { $gt: 0 } }).lean();
      fallbackPrices.forEach(p => {
        if (!priceMap.has(p.sku_id.toString())) {
          priceMap.set(p.sku_id.toString(), p.price);
        }
      });
    }

    subItems = bosComboList.map((bk, idx) => {
      const skuObj = bk.sku_id ? skuMap.get(bk.sku_id.toString()) : null;
      const unitCost = bk.sku_id ? (priceMap.get(bk.sku_id.toString()) || 0) : 0;
      const rawName = skuObj?.product_id?.name || skuObj?.name || bk.name || `BOS Component ${idx + 1}`;
      const skuCode = skuObj?.sku_code || bk.sku_code || `BOS-ITEM-${idx + 1}`;
      const category = bk.name?.includes('—') ? bk.name.split('—')[0].trim() : (skuObj?.category || 'Balance of System (BOS)');
      const qtyPerKit = bk.quantity || 1;

      return {
        sku_id: skuObj?._id || bk.sku_id || null,
        sku_code: skuCode,
        product_name: rawName,
        category: category,
        qty_per_kit: qtyPerKit,
        unit_rate: unitCost,
        benchmark_cost: unitCost,
        unit: 'Pcs'
      };
    });
  } else if (bosMappings.length > 0) {
    const skuCodes = bosMappings.map(m => m.sku_code).filter(Boolean);
    const skus = await ProductSku.find({ sku_code: { $in: skuCodes }, deleted_at: null }).lean();
    const skuCodeMap = new Map(skus.map(s => [s.sku_code, s]));
    const skuIds = skus.map(s => s._id);

    const priceDocs = await ProductSkuPrice.find({ sku_id: { $in: skuIds }, price: { $gt: 0 } }).lean();
    const priceMap = new Map();
    priceDocs.forEach(p => priceMap.set(p.sku_id.toString(), p.price));

    subItems = bosMappings.map((m, idx) => {
      const skuObj = m.sku_code ? skuCodeMap.get(m.sku_code) : null;
      const unitCost = skuObj ? (priceMap.get(skuObj._id.toString()) || 0) : 0;
      return {
        sku_id: skuObj?._id || null,
        sku_code: m.sku_code || `BOS-ITEM-${idx + 1}`,
        product_name: m.product_name,
        category: m.subtype_name || m.template_name || 'Balance of System (BOS)',
        qty_per_kit: m.quantity || 1,
        unit_rate: unitCost,
        benchmark_cost: unitCost,
        unit: 'Pcs'
      };
    });
  } else if (bosBreakdownList.length > 0) {
    const allBosSkus = await ProductSku.find({ deleted_at: null }).lean();
    const allPrices = await ProductSkuPrice.find({ price: { $gt: 0 } }).lean();
    const priceMap = new Map(allPrices.map(p => [p.sku_id.toString(), p.price]));

    subItems = bosBreakdownList.map((b, idx) => {
      const name = b.component_name || b.product || b.product_name || `BOS Component ${idx + 1}`;
      let subSku = b.sku_code && b.sku_code !== 'null' ? b.sku_code : null;
      let subCategory = b.category || 'Balance of System (BOS)';
      const lower = name.toLowerCase();

      let matchedSkus = [];
      if (lower.includes('struct') || lower.includes('mount') || lower.includes('gi')) {
        subCategory = 'Mounting Structure';
        matchedSkus = allBosSkus.filter(s => (s.sku_code || '').includes('CLA') || (s.sku_code || '').includes('SCR') || (s.sku_code || '').includes('WAL') || (s.sku_code || '').includes('PVC'));
        if (!subSku) subSku = matchedSkus[0]?.sku_code || 'BOS-STRUCTURE-KIT';
      } else if (lower.includes('box') || lower.includes('acdb') || lower.includes('dcdb') || lower.includes('protect')) {
        subCategory = 'Protection Box';
        matchedSkus = allBosSkus.filter(s => (s.sku_code || '').includes('AC-') || (s.sku_code || '').includes('DCD-'));
        if (!subSku) subSku = matchedSkus[0]?.sku_code || 'BOS-PROTECTION-BOX';
      } else if (lower.includes('cable') || lower.includes('earth') || lower.includes('wire')) {
        subCategory = 'Cabling & Safety';
        matchedSkus = allBosSkus.filter(s => (s.sku_code || '').includes('CAB-') || (s.sku_code || '').includes('EAR-') || (s.sku_code || '').includes('LIG-') || (s.sku_code || '').includes('WIR-'));
        if (!subSku) subSku = matchedSkus[0]?.sku_code || 'BOS-CABLE-EARTH-KIT';
      } else {
        if (!subSku) subSku = `BOS-COMP-${idx + 1}`;
      }

      let benchmarkCost = 0;
      if (matchedSkus.length > 0) {
        benchmarkCost = matchedSkus.reduce((acc, s) => acc + (priceMap.get(s._id.toString()) || 0), 0);
      }
      if (b.estimated_unit_cost && b.estimated_unit_cost > 0) {
        benchmarkCost = b.estimated_unit_cost;
      }

      const qtyPerKit = b.kit_multiplier ||
        (b.total_units && totalKits ? Math.round(b.total_units / totalKits) : 1) ||
        1;

      return {
        sku_id: matchedSkus[0]?._id || null,
        sku_code: subSku,
        product_name: name,
        category: subCategory,
        qty_per_kit: qtyPerKit,
        unit_rate: benchmarkCost,
        benchmark_cost: benchmarkCost,
        unit: 'Sets'
      };
    });
  }

  const totalBosRate = subItems.reduce((acc, it) => acc + (it.unit_rate || 0) * (it.qty_per_kit || 1), 0);

  return [
    {
      sku_code: panelSku,
      product_name: panelName,
      category: 'Solar Modules',
      component_type: 'panel',
      qty_per_kit: panelQtyPerKit,
      unit_rate: panelRate,
      unit: 'Pcs'
    },
    {
      sku_code: inverterSku,
      product_name: inverterName,
      category: 'Solar Inverters',
      component_type: 'inverter',
      qty_per_kit: inverterQtyPerKit,
      unit_rate: inverterRate,
      unit: 'Pcs'
    },
    {
      sku_code: 'BOS-KIT-COMPLETE',
      product_name: 'Complete Balance of System (BOS) Kit',
      category: 'Balance of System (BOS)',
      component_type: 'bos_kit',
      qty_per_kit: 1,
      unit_rate: totalBosRate,
      unit: 'Sets',
      sub_items: subItems
    }
  ];
}

/**
 * 2. Calculate Product-wise BOM & Warehouse Stock Availability
 * Supplier Quantity = Required Quantity - Valid Reserved Inventory Quantity
 */
exports.calculate_procurement_bom = async (req, res) => {
  try {
    const { group_id, order_id, warehouse_id } = req.body;

    let targetWarehouseId = warehouse_id;
    let totalKits = 1;
    let orderNumbers = [];
    let customerOrderIds = [];
    let kitBreakdown = [];
    let group = null;
    let epc = null;
    let fpo = null;

    if (group_id) {
      group = await ProcurementGroup.findOne({ group_id: group_id.toUpperCase() }).lean();
      if (!group) {
        return res.status(404).json({ status: 'error', message: `Procurement Group #${group_id} not found.` });
      }
      totalKits = group.total_kits || 1;
      orderNumbers = group.order_numbers || [];
      customerOrderIds = group.order_ids || [];
      kitBreakdown = group.kit_type_breakdown || [];

      if (!targetWarehouseId && group.supplier_groups?.[0]?.warehouse_id) {
        targetWarehouseId = group.supplier_groups[0].warehouse_id;
      }
    } else if (order_id) {
      epc = await EpcOrder.findById(order_id).lean();
      if (epc) {
        totalKits = (epc.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
        orderNumbers = [epc.order_number];
        customerOrderIds = [epc._id];
        targetWarehouseId = targetWarehouseId || epc.warehouse_id;
      } else {
        fpo = await FpoOrder.findById(order_id).lean();
        if (fpo) {
          totalKits = (fpo.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
          orderNumbers = [fpo.order_number || fpo.po_number];
          customerOrderIds = [fpo._id];
        }
      }
    }

    // Default warehouse if none specified
    if (!targetWarehouseId) {
      const defWh = await CompanyWarehouse.findOne({ deleted_at: null }).lean();
      targetWarehouseId = defWh ? defWh._id : null;
    }

    const warehouseDoc = targetWarehouseId ? await CompanyWarehouse.findById(targetWarehouseId).lean() : null;

    let targetClusterId = warehouseDoc?.cluster_id || null;
    if (!targetClusterId && warehouseDoc?.level_2) {
      const dist = await GeoLevel2.findById(warehouseDoc.level_2).lean();
      if (dist && dist.cluster) targetClusterId = dist.cluster;
    }
    if (!targetClusterId) {
      const defCluster = await Cluster.findOne({ deleted_at: null }).lean();
      if (defCluster) targetClusterId = defCluster._id;
    }

    // Dynamically resolve BOM definitions from database (WarehouseKitPartnerMapping, ProcurementGroup, ComboKit, Brand)
    const bomDefinitions = await resolveDynamicBomDefinitions({
      group,
      epcOrder: epc,
      fpoOrder: fpo,
      targetWarehouseId,
      targetClusterId,
      totalKits
    });

    // Query active purchase indents for this group or order to detect already-procured items
    const piConditions = [];
    if (group_id) piConditions.push({ order_group_id: group_id.toUpperCase() });
    if (orderNumbers.length > 0) piConditions.push({ customer_order_number: { $in: orderNumbers } });
    if (customerOrderIds.length > 0) piConditions.push({ customer_order_id: { $in: customerOrderIds } });

    const activePIs = piConditions.length > 0
      ? await PurchaseIndent.find({
          $or: piConditions,
          pi_status: { $ne: 'Cancelled' }
        }).lean()
      : [];

    // Query live warehouse stock and existing reservations
    const bomCalculations = await Promise.all(
      bomDefinitions.map(async (def) => {
        const requiredQuantity = def.qty_per_kit * totalKits;
        
        // Sub-items with existing benchmark prices from Admin database
        const calculatedSubItems = await Promise.all((def.sub_items || []).map(async (sub) => {
          let subBenchmark = sub.benchmark_cost || sub.unit_rate || 0;
          try {
            if (sub.sku_id) {
              const skuPrice = await ProductSkuPrice.findOne({
                sku_id: sub.sku_id,
                ...(targetClusterId ? { cluster_id: targetClusterId } : {}),
                price: { $gt: 0 }
              }).lean() || await ProductSkuPrice.findOne({
                sku_id: sub.sku_id,
                price: { $gt: 0 }
              }).lean();

              if (skuPrice && skuPrice.price > 0) {
                subBenchmark = skuPrice.price;
              }
            } else if (sub.sku_code) {
              const skuDoc = await ProductSku.findOne({
                sku_code: { $regex: new RegExp(`^${sub.sku_code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                deleted_at: null
              }).lean();
              if (skuDoc) {
                const skuPrice = await ProductSkuPrice.findOne({
                  sku_id: skuDoc._id,
                  ...(targetClusterId ? { cluster_id: targetClusterId } : {}),
                  price: { $gt: 0 }
                }).lean() || await ProductSkuPrice.findOne({
                  sku_id: skuDoc._id,
                  price: { $gt: 0 }
                }).lean();
                if (skuPrice && skuPrice.price > 0) {
                  subBenchmark = skuPrice.price;
                }
              }
            }
          } catch (e) {
            console.warn("Could not load sub-item ProductSkuPrice:", e.message);
          }

          const resolvedRate = subBenchmark > 0 ? subBenchmark : (sub.unit_rate || 0);

          return {
            sku_id: sub.sku_id || null,
            sku_code: sub.sku_code,
            product_name: sub.product_name,
            category: sub.category,
            qty_per_kit: sub.qty_per_kit,
            required_quantity: sub.qty_per_kit * totalKits,
            unit_rate: resolvedRate,
            benchmark_cost: subBenchmark || resolvedRate,
            unit: sub.unit || 'Pcs',
            subtotal: (sub.qty_per_kit * totalKits) * resolvedRate
          };
        }));

        // Query available warehouse stock
        let availableStock = 0;
        let skuId = null;
        if (targetWarehouseId) {
          const stockEntry = await WarehouseStock.findOne({
            warehouse_id: targetWarehouseId,
            sku_code: { $regex: new RegExp(def.sku_code.split('-')[0], 'i') }
          }).lean();

          if (stockEntry) {
            availableStock = stockEntry.qty || 0;
            skuId = stockEntry.sku_id;
          }
        }

        // Query active reservations across all orders for this warehouse and SKU
        let totalReservedStock = 0;
        let orderReservedQuantity = 0;

        if (targetWarehouseId) {
          const allReservations = await WarehouseInventoryReservation.find({
            warehouse_id: targetWarehouseId,
            sku_code: { $regex: new RegExp(def.sku_code.split('-')[0], 'i') },
            status: 'active'
          }).lean();

          totalReservedStock = allReservations.reduce((acc, r) => acc + (r.reserved_quantity || 0), 0);

          // Reservations specifically for this group / order
          const forThisOrder = allReservations.filter(r =>
            (group_id && r.order_group_id === group_id) ||
            customerOrderIds.some(cid => cid.toString() === r.customer_order_id?.toString())
          );
          orderReservedQuantity = forThisOrder.reduce((acc, r) => acc + (r.reserved_quantity || 0), 0);
        }

        // Calculation:
        // Free eligible stock in warehouse = availableStock - (totalReservedStock - orderReservedQuantity)
        const freeWarehouseStock = Math.max(0, availableStock - Math.max(0, totalReservedStock - orderReservedQuantity));
        
        // Effective warehouse stock applicable to this requirement:
        // Already reserved for this order + currently free stock in warehouse
        const totalWarehouseAvailableForOrder = orderReservedQuantity + freeWarehouseStock;
        const deductedWarehouseStock = Math.min(requiredQuantity, totalWarehouseAvailableForOrder);

        // Supplier Quantity = Required Quantity - Deducted Warehouse Stock (cut automatically)
        const supplierQuantity = Math.max(0, requiredQuantity - deductedWarehouseStock);
        const stockFullyAvailable = totalWarehouseAvailableForOrder >= requiredQuantity;

        // Query existing SKU Benchmark Price configured in Admin panel
        let benchmarkCost = 0;
        if (def.component_type === 'bos_kit' && calculatedSubItems.length > 0) {
          benchmarkCost = calculatedSubItems.reduce((acc, sub) => acc + (sub.benchmark_cost || 0) * (sub.qty_per_kit || 1), 0);
        } else {
          try {
            if (skuId) {
              const skuPrice = await ProductSkuPrice.findOne({
                sku_id: skuId,
                ...(targetClusterId ? { cluster_id: targetClusterId } : {}),
                price: { $gt: 0 }
              }).lean() || await ProductSkuPrice.findOne({
                sku_id: skuId,
                price: { $gt: 0 }
              }).lean();
              if (skuPrice && skuPrice.price > 0) {
                benchmarkCost = skuPrice.price;
              }
            }
            if (!benchmarkCost && def.sku_code) {
              const skuDoc = await ProductSku.findOne({
                sku_code: { $regex: new RegExp(`^${def.sku_code.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                deleted_at: null
              }).lean();
              if (skuDoc) {
                const codePrice = await ProductSkuPrice.findOne({
                  sku_id: skuDoc._id,
                  ...(targetClusterId ? { cluster_id: targetClusterId } : {}),
                  price: { $gt: 0 }
                }).lean() || await ProductSkuPrice.findOne({
                  sku_id: skuDoc._id,
                  price: { $gt: 0 }
                }).lean();
                if (codePrice && codePrice.price > 0) {
                  benchmarkCost = codePrice.price;
                }
              }
            }
          } catch (e) {
            console.warn("Could not load ProductSkuPrice:", e.message);
          }
          if (!benchmarkCost || benchmarkCost <= 0) {
            benchmarkCost = def.unit_rate || (def.component_type === 'panel' ? 6875 : def.component_type === 'inverter' ? 32000 : 0);
          }
        }

        // Lookup eligible suppliers & OEM partners dynamically
        let eligiblePartners = [];

        // 1. From group's allocated supplier_groups
        if (group?.supplier_groups && group.supplier_groups.length > 0) {
          const matchingGroup = group.supplier_groups.find(sg =>
            (sg.items || []).some(it => {
              const nameLower = (it.product_name || '').toLowerCase();
              if (def.component_type === 'panel' && (nameLower.includes('panel') || nameLower.includes('module'))) return true;
              if (def.component_type === 'inverter' && (nameLower.includes('inverter') || nameLower.includes('inv'))) return true;
              if (def.component_type === 'bos_kit' && (nameLower.includes('bos') || nameLower.includes('structure') || nameLower.includes('mounting') || nameLower.includes('protection'))) return true;
              return false;
            })
          );
          if (matchingGroup && matchingGroup.supplier_name) {
            eligiblePartners.push({
              id: matchingGroup.supplier_id || `sup_${def.component_type}`,
              name: matchingGroup.supplier_name,
              is_oem: Boolean(matchingGroup.is_oem),
              type: matchingGroup.is_oem ? 'OEM Partner (SOLARKITS Brand)' : 'Supplier Partner (Own Brand)',
              brand_name: matchingGroup.supplier_name
            });
          }
        }

        // 2. From WarehouseKitPartnerMapping
        if (targetWarehouseId) {
          const mapping = await WarehouseKitPartnerMapping.findOne({
            warehouse_id: targetWarehouseId,
            is_configured: true
          }).lean();

          if (mapping && mapping.product_mappings) {
            const mappedComp = mapping.product_mappings.find(m => m.component_type === def.component_type);
            if (mappedComp) {
              if (mappedComp.oem_partner_id) {
                const oemBrand = await Brand.findById(mappedComp.oem_partner_id).lean();
                if (oemBrand) {
                  eligiblePartners.push({
                    id: oemBrand._id,
                    name: oemBrand.brand_name || oemBrand.company_name,
                    is_oem: true,
                    type: 'OEM Partner (SOLARKITS Brand)',
                    brand_name: 'SOLARKITS'
                  });
                }
              }
              if (mappedComp.supplier_partner_id) {
                const supBrand = await Brand.findById(mappedComp.supplier_partner_id).lean();
                if (supBrand) {
                  eligiblePartners.push({
                    id: supBrand._id,
                    name: supBrand.brand_name || supBrand.company_name,
                    is_oem: false,
                    type: 'Supplier Partner (Own Brand)',
                    brand_name: supBrand.brand_name
                  });
                }
              }
            }
          }
        }

        // Fallback default tier-1 suppliers if mapping not explicitly set
        if (eligiblePartners.length === 0) {
          if (def.component_type === 'panel') {
            eligiblePartners = [
              { id: 'sup_adani', name: 'Adani Solar Tier-1 Partner', is_oem: false, type: 'Supplier (Own Brand)', brand_name: 'Adani Solar' },
              { id: 'oem_solarkits_modules', name: 'SOLARKITS Certified Module Works', is_oem: true, type: 'OEM Partner (SOLARKITS Brand)', brand_name: 'SOLARKITS' }
            ];
          } else if (def.component_type === 'inverter') {
            eligiblePartners = [
              { id: 'sup_growatt', name: 'Growatt Solar Technology Ltd', is_oem: false, type: 'Supplier (Own Brand)', brand_name: 'Growatt' },
              { id: 'oem_solarkits_power', name: 'SOLARKITS OEM Inverter Systems', is_oem: true, type: 'OEM Partner (SOLARKITS Brand)', brand_name: 'SOLARKITS' }
            ];
          } else {
            eligiblePartners = [
              { id: 'sup_schneider', name: 'Schneider / Polycab Solar Components', is_oem: false, type: 'Supplier (Own Brand)', brand_name: 'Polycab / Schneider' },
              { id: 'oem_solarkits_bos', name: 'SOLARKITS Heavy Duty BOS Works', is_oem: true, type: 'OEM Partner (SOLARKITS Brand)', brand_name: 'SOLARKITS' }
            ];
          }
        }

        // Check if a PI has already been generated for this component
        const matchingPIs = activePIs.filter((pi) => {
          if (pi.bom_sku_code && pi.bom_sku_code === def.sku_code) return true;
          if (pi.component_type && pi.component_type === def.component_type) return true;

          const piItems = pi.items || [];
          return piItems.some((it) => {
            if (it.parent_sku_code === def.sku_code) return true;
            if (it.sku_code === def.sku_code) return true;
            if (def.sub_items && def.sub_items.some((sub) => sub.sku_code === it.sku_code)) return true;

            const itSku = (it.sku_code || '').toLowerCase();
            const itName = (it.product_name || '').toLowerCase();
            if (def.component_type === 'panel' && (itSku.includes('panel') || itName.includes('panel') || itName.includes('module'))) return true;
            if (def.component_type === 'inverter' && (itSku.includes('inv') || itName.includes('inverter'))) return true;
            if (def.component_type === 'bos_kit' && (itSku.includes('bos') || itName.includes('bos') || itName.includes('mounting') || itName.includes('structure'))) return true;
            return false;
          });
        });

        const hasPI = matchingPIs.length > 0;
        const piNumbers = matchingPIs.map((p) => p.pi_number);

        return {
          sku_code: def.sku_code,
          sku_id: skuId,
          product_name: def.product_name,
          category: def.category,
          component_type: def.component_type,
          unit: def.unit,
          unit_rate: (benchmarkCost && benchmarkCost > 0) ? benchmarkCost : def.unit_rate,
          benchmark_cost: benchmarkCost,
          required_quantity: requiredQuantity,
          available_stock: availableStock,
          free_warehouse_stock: freeWarehouseStock,
          total_reserved_stock: totalReservedStock,
          inventory_quantity_selected: orderReservedQuantity,
          deducted_warehouse_stock: deductedWarehouseStock,
          supplier_quantity: supplierQuantity,
          stock_fully_available: stockFullyAvailable,
          has_pi: hasPI,
          pi_created: hasPI,
          pi_numbers: piNumbers,
          pi_count: matchingPIs.length,
          eligible_partners: eligiblePartners,
          selected_partner: eligiblePartners[0] || null,
          sub_items: calculatedSubItems,
          destination_warehouse: {
            id: targetWarehouseId,
            name: warehouseDoc?.warehouse_code || 'Central Hub Warehouse',
            code: warehouseDoc?.warehouse_code || 'WH-01'
          },
          procurement_status: hasPI
            ? 'Purchase Indent Created'
            : supplierQuantity === 0
              ? 'Fully Sourced from Inventory'
              : orderReservedQuantity > 0
                ? 'Partially Sourced (Stock + Supplier)'
                : 'Supplier Procurement Required'
        };
      })
    );

    const settingsDoc = await SolarShopSettings.findOne().lean();
    const procurementSettings = settingsDoc?.procurement_settings || {
      production_tat_days: 5,
      supply_tat_days: 3,
      estimated_transport_cost: 0,
    };

    return res.status(200).json({
      status: 'success',
      data: {
        group_id,
        order_numbers: orderNumbers,
        total_kits: totalKits,
        procurement_settings: procurementSettings,
        destination_warehouse: {
          id: targetWarehouseId,
          name: warehouseDoc?.warehouse_code || 'Central Hub Warehouse',
          code: warehouseDoc?.warehouse_code || 'WH-01'
        },
        bom_calculations: bomCalculations
      }
    });
  } catch (err) {
    console.error('Error in calculate_procurement_bom:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to calculate BOM.', error: err.message });
  }
};

/**
 * 3. Reserve Warehouse Inventory Stock
 * Atomically reserves warehouse stock for a customer order
 */
exports.reserve_inventory_stock = async (req, res) => {
  try {
    const {
      warehouse_id,
      sku_code,
      sku_id,
      product_name,
      customer_order_id,
      customer_order_number,
      order_group_id,
      quantity,
      reserved_quantity
    } = req.body;

    const targetQty = Number(quantity || reserved_quantity);

    if (!warehouse_id || !sku_code || !customer_order_number || !targetQty || targetQty <= 0) {
      return res.status(400).json({ status: 'error', message: 'warehouse_id, sku_code, customer_order_number, and quantity are required.' });
    }

    // Verify stock availability
    const stock = await WarehouseStock.findOne({
      warehouse_id,
      sku_code: { $regex: new RegExp(sku_code.split('-')[0], 'i') }
    });

    const currentQty = stock ? (stock.qty || 0) : 1000; // sensible stock default

    // Find active reservations for this SKU in warehouse
    const otherReservations = await WarehouseInventoryReservation.find({
      warehouse_id,
      sku_code: { $regex: new RegExp(sku_code.split('-')[0], 'i') },
      status: 'active',
      customer_order_number: { $ne: customer_order_number }
    });

    const otherReservedTotal = otherReservations.reduce((acc, r) => acc + (r.reserved_quantity || 0), 0);
    const availableForReservation = Math.max(0, currentQty - otherReservedTotal);

    if (quantity > availableForReservation && availableForReservation > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient warehouse stock. Requested: ${quantity}, Available: ${availableForReservation}.`
      });
    }

    // Upsert reservation record
    const reservation = await WarehouseInventoryReservation.findOneAndUpdate(
      {
        warehouse_id,
        sku_code,
        customer_order_number,
      },
      {
        $set: {
          sku_id: sku_id || stock?.sku_id || new mongoose.Types.ObjectId(),
          product_name: product_name || sku_code,
          customer_order_id: customer_order_id || new mongoose.Types.ObjectId(),
          order_group_id: order_group_id || null,
          reserved_quantity: targetQty,
          status: 'active',
          reserved_by: req.user?._id || null,
          reserved_at: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      status: 'success',
      message: `Successfully reserved ${quantity} units of ${sku_code} for Order #${customer_order_number}.`,
      data: reservation
    });
  } catch (err) {
    console.error('Error in reserve_inventory_stock:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to reserve stock.', error: err.message });
  }
};

/**
 * 4. Release Warehouse Inventory Stock
 */
exports.release_inventory_stock = async (req, res) => {
  try {
    const { reservation_id } = req.body;
    if (!reservation_id) {
      return res.status(400).json({ status: 'error', message: 'reservation_id is required.' });
    }

    const reservation = await WarehouseInventoryReservation.findByIdAndUpdate(
      reservation_id,
      { $set: { status: 'released', released_at: new Date() } },
      { new: true }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Inventory reservation released successfully.',
      data: reservation
    });
  } catch (err) {
    console.error('Error in release_inventory_stock:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to release reservation.', error: err.message });
  }
};

/**
 * 5. Create Purchase Indent (PI)
 */
exports.create_purchase_indent = async (req, res) => {
  try {
    const {
      customer_order_id,
      customer_order_number,
      order_group_id,
      bom_sku_code,
      component_type,
      supplier_id,
      supplier_name,
      supplier_brand,
      supplier_gst,
      is_oem_partner,
      destination_warehouse_id,
      destination_warehouse_name,
      items,
      fulfilment,
      payment_terms,
      advance_percentage = 30,
      balance_percentage = 70,
      production_tat_days = 5,
      supply_tat_days = 3
    } = req.body;

    if (!customer_order_number || !supplier_name || !destination_warehouse_id || !items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'customer_order_number, supplier_name, destination_warehouse_id, and items are required.'
      });
    }

    const piNumber = await generatePiNumber();

    // Calculate total value & taxes
    let totalPiValue = 0;
    const processedItems = items.map(it => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.unit_rate) || 0;
      const gstRate = Number(it.gst_rate) || 13.8;
      const subtotal = qty * rate;
      const tax = Math.round((subtotal * gstRate) / 100);
      const total = subtotal + tax;
      totalPiValue += total;

      return {
        sku_id: it.sku_id || null,
        sku_code: it.sku_code || 'SKU-ITEM',
        product_name: it.product_name || 'Solar Product',
        parent_sku_code: it.parent_sku_code || bom_sku_code || null,
        component_type: it.component_type || component_type || null,
        quantity: qty,
        unit_rate: rate,
        gst_rate: gstRate,
        tax_amount: tax,
        total_value: total
      };
    });

    const advPct = Number(advance_percentage) || 30;
    const balPct = Number(balance_percentage) || 70;
    const advanceAmount = Math.round((totalPiValue * advPct) / 100);
    const balanceAmount = totalPiValue - advanceAmount;

    // Resolve supplier warehouse if method is Company Pickup
    const fulfilmentData = {
      method: fulfilment?.method || 'Company Pickup',
      supplier_warehouse_id: fulfilment?.supplier_warehouse_id || null,
      supplier_warehouse_address: fulfilment?.supplier_warehouse_address || null,
      destination_warehouse_id: destination_warehouse_id,
      transport_responsibility: fulfilment?.transport_responsibility || (fulfilment?.method === 'Company Pickup' ? 'Company' : 'Supplier'),
      transport_cost: Number(fulfilment?.transport_cost) || 0,
      expected_pickup_date: fulfilment?.expected_pickup_date ? new Date(fulfilment.expected_pickup_date) : null,
      expected_dispatch_date: fulfilment?.expected_dispatch_date ? new Date(fulfilment.expected_dispatch_date) : null,
      expected_inward_date: fulfilment?.expected_inward_date ? new Date(fulfilment.expected_inward_date) : null,
      supply_status: 'Pending'
    };

    const isAboveBenchmark = Boolean(req.body.is_above_benchmark);
    const benchmarkCost = Number(req.body.benchmark_cost) || 0;
    const totalQuantity = (processedItems || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const avgGst = processedItems?.[0]?.gst_rate != null ? Number(processedItems[0].gst_rate) : 13.8;
    const benchmarkTotalCost = Number(req.body.benchmark_total_cost) || (benchmarkCost > 0 ? Math.round(benchmarkCost * totalQuantity * (1 + avgGst / 100)) : totalPiValue);
    const requiresAdminApproval = isAboveBenchmark;

    const newPI = new PurchaseIndent({
      pi_number: piNumber,
      customer_order_id: customer_order_id || new mongoose.Types.ObjectId(),
      customer_order_number,
      order_group_id: order_group_id || null,
      bom_sku_code: bom_sku_code || null,
      component_type: component_type || null,
      supplier_id: supplier_id && mongoose.Types.ObjectId.isValid(supplier_id) ? supplier_id : new mongoose.Types.ObjectId(),
      supplier_name,
      supplier_brand: supplier_brand || supplier_name,
      supplier_gst: supplier_gst || null,
      is_oem_partner: Boolean(is_oem_partner),
      destination_warehouse_id,
      destination_warehouse_name: destination_warehouse_name || 'Central Hub Warehouse',
      items: processedItems,
      total_pi_value: totalPiValue,
      is_above_benchmark: isAboveBenchmark,
      benchmark_cost: benchmarkCost,
      benchmark_total_cost: benchmarkTotalCost,
      requires_admin_approval: requiresAdminApproval,
      po_approval: {
        status: isAboveBenchmark ? 'pending' : (requiresAdminApproval ? 'pending' : 'approved'),
        approved_by: isAboveBenchmark ? null : (req.user?._id || null),
        approved_by_name: isAboveBenchmark ? null : (req.user?.name || req.user?.email || 'System'),
        approved_at: isAboveBenchmark ? null : new Date(),
        submitted_at: new Date(),
        remarks: isAboveBenchmark 
          ? `Pending Admin PO Approval: Unit rate exceeds benchmark cost (₹${benchmarkCost})`
          : 'Auto-approved within standard benchmark cost'
      },
      fulfilment: fulfilmentData,
      payment: {
        payment_terms: payment_terms || `${advPct}% Advance, ${balPct}% Before Dispatch`,
        advance_percentage: advPct,
        advance_amount: advanceAmount,
        balance_percentage: balPct,
        balance_amount: balanceAmount,
        production_tat_days: Number(production_tat_days) || 5,
        supply_tat_days: Number(supply_tat_days) || 3,
        payment_status: isAboveBenchmark ? 'Awaiting Admin Approval' : 'PI Submitted',
        admin_approval: { 
          status: isAboveBenchmark ? 'pending' : 'approved',
          remarks: isAboveBenchmark ? `Pending Admin Approval: Unit rate exceeds benchmark cost (₹${benchmarkCost})` : 'Auto-approved within benchmark cost'
        },
        actual_payment: {}
      },
      pi_status: isAboveBenchmark ? 'Pending Admin Price Approval' : 'Submitted',
      audit_history: [{
        action: isAboveBenchmark ? 'PI Created - Requires Admin Approval (Rate Exceeds Benchmark)' : 'PI Created and Submitted',
        performed_by: req.user?._id || null,
        performer_name: req.user?.name || req.user?.email || 'Accounts Team',
        role: req.user?.role || 'Accounts',
        timestamp: new Date(),
        remarks: isAboveBenchmark 
          ? `Generated PI #${piNumber} for Order #${customer_order_number}. Flagged for Admin Approval: Entered rate exceeds benchmark limit of ₹${benchmarkCost}.`
          : `Generated Purchase Indent #${piNumber} for Order #${customer_order_number}`
      }],
      created_by: {
        user_id: req.user?._id || null,
        name: req.user?.name || req.user?.email || 'Accounts Manager',
        email: req.user?.email || 'accounts@solarkits.in',
        role: req.user?.role || 'Accounts'
      }
    });

    await newPI.save();

    if (order_group_id) {
      const totalBatchPis = await PurchaseIndent.countDocuments({ order_group_id });
      if (totalBatchPis >= 3) {
        await ProcurementGroup.updateOne(
          { group_id: order_group_id },
          {
            $set: {
              status: 'Transferred to Delivery',
              batch_status: 'Transferred to Delivery',
              procurement_readiness_status: 'Awaiting Warehouse Inward'
            }
          }
        ).catch(() => {});
      } else {
        await ProcurementGroup.updateOne(
          { group_id: order_group_id },
          {
            $set: {
              status: 'Procurement In Progress',
              batch_status: 'Procurement In Progress'
            }
          }
        ).catch(() => {});
      }
    }

    // Link PI to customer order in epc_orders / fpo_orders
    const isEpc = customer_order_number.toUpperCase().includes('EPC');
    const Model = isEpc ? EpcOrder : FpoOrder;
    await Model.updateOne(
      { order_number: customer_order_number },
      {
        $set: {
          'procurement_status.overall_status': 'awaiting_supplier_procurement',
          'procurement_status.latest_pi_number': piNumber,
          'procurement_status.latest_pi_id': newPI._id
        }
      }
    ).catch(() => {});

    return res.status(201).json({
      status: 'success',
      message: `Purchase Indent #${piNumber} successfully generated.`,
      data: newPI
    });
  } catch (err) {
    console.error('Error in create_purchase_indent:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to create Purchase Indent.', error: err.message });
  }
};

/**
 * 6. List Purchase Indents for Order or Batch
 */
exports.list_purchase_indents = async (req, res) => {
  try {
    const { order_number, group_id, pi_status, payment_status } = req.query;
    const filter = {};

    const cleanOrderNum = (order_number && order_number !== 'undefined' && order_number !== 'null') ? order_number.trim() : null;
    const cleanGroupId = (group_id && group_id !== 'undefined' && group_id !== 'null') ? group_id.trim().toUpperCase() : null;
    const cleanPiStatus = (pi_status && pi_status !== 'all' && pi_status !== 'undefined' && pi_status !== 'null') ? pi_status.trim() : null;
    const cleanPayStatus = (payment_status && payment_status !== 'all' && payment_status !== 'undefined' && payment_status !== 'null') ? payment_status.trim() : null;

    if (cleanGroupId && cleanOrderNum) {
      filter.$or = [
        { order_group_id: cleanGroupId },
        { customer_order_number: cleanOrderNum }
      ];
    } else if (cleanGroupId) {
      filter.order_group_id = cleanGroupId;
    } else if (cleanOrderNum) {
      filter.customer_order_number = cleanOrderNum;
    }
    if (cleanPiStatus) filter.pi_status = cleanPiStatus;
    if (cleanPayStatus) filter['payment.payment_status'] = cleanPayStatus;

    const list = await PurchaseIndent.find(filter)
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      count: list.length,
      data: list
    });
  } catch (err) {
    console.error('Error in list_purchase_indents:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch Purchase Indents.', error: err.message });
  }
};

/**
 * 7. Initiate Supplier Payment Request (Accounts)
 */
exports.request_supplier_payment = async (req, res) => {
  try {
    const { pi_id, indent_id, payment_type = 'advance', remarks } = req.body;
    const targetPiId = pi_id || indent_id;

    if (!targetPiId) {
      return res.status(400).json({ status: 'error', message: 'pi_id is required.' });
    }

    const pi = await PurchaseIndent.findById(targetPiId);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    // Rule 2 & Section 3.1: Only an approved PO can proceed to its configured supplier payment workflow
    const isPoApproved = pi.po_approval?.status === 'approved' || pi.po_approval?.status === 'Approved' || (!pi.requires_admin_approval && pi.pi_status === 'Approved');
    if (!isPoApproved) {
      return res.status(400).json({
        status: 'error',
        message: `Payment request cannot be initiated. Purchase Order #${pi.pi_number} is pending Admin PO approval.`
      });
    }

    const isAdvance = payment_type === 'advance';

    if (!isAdvance) {
      // Rule check: 1st payment must be recorded before 2nd payment request
      const hasAdvancePaid = Boolean(pi.payment?.advance_payment?.utr_number || ['Advance Paid', 'Paid'].includes(pi.payment?.payment_status));
      if (!hasAdvancePaid) {
        return res.status(400).json({
          status: 'error',
          message: 'Second payment request cannot be submitted until First (Advance) payment has been recorded with bank UTR.'
        });
      }
    }

    pi.payment.payment_status = isAdvance ? 'Advance Requested' : 'Balance Requested';
    pi.payment.admin_approval = {
      status: 'Awaiting Admin Approval',
      submitted_at: new Date(),
      remarks: remarks || `Payment requested for ${payment_type}`
    };

    if (isAdvance) {
      pi.payment.advance_approval = {
        status: 'pending',
        requested_at: new Date(),
        requested_amount: pi.payment?.advance_amount || Math.round((pi.total_pi_value * (pi.payment?.advance_percentage || 30)) / 100),
        remarks: remarks || 'Advance payment requested by Accounts'
      };
    } else {
      const remainingBal = Math.max(0, pi.total_pi_value - (pi.payment?.total_paid_amount || pi.payment?.advance_payment?.paid_amount || 0));
      pi.payment.balance_approval = {
        status: 'pending',
        requested_at: new Date(),
        requested_amount: pi.payment?.balance_amount || remainingBal,
        remarks: remarks || 'Balance payment requested by Accounts'
      };
    }

    pi.audit_history.push({
      action: `Requested ${isAdvance ? 'Advance (First)' : 'Balance (Second)'} Payment`,
      performed_by: req.user?._id || null,
      performer_name: req.user?.name || req.user?.email || 'Accounts Team',
      role: 'Accounts',
      timestamp: new Date(),
      remarks: remarks || `Payment request for ${payment_type} submitted for Admin approval`
    });

    await pi.save();

    return res.status(200).json({
      status: 'success',
      message: `Payment request for PI #${pi.pi_number} (${isAdvance ? 'First Payment' : 'Second Payment'}) submitted to Admin for approval.`,
      data: pi
    });
  } catch (err) {
    console.error('Error in request_supplier_payment:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to initiate payment request.', error: err.message });
  }
};

/**
 * 8. Admin Payment & PO Approval / Rejection / Return (Admin Login)
 * Separate from actual payment completion!
 */
exports.admin_approve_supplier_payment = async (req, res) => {
  try {
    const { pi_id, indent_id, action, stage, remarks } = req.body; // action: 'approve' | 'reject' | 'return'
    const targetPiId = pi_id || indent_id;
    const normalizedAction = (action || '').toLowerCase();

    if (!targetPiId || !['approve', 'reject', 'return'].includes(normalizedAction)) {
      return res.status(400).json({ status: 'error', message: 'pi_id and valid action (approve, reject, return) are required.' });
    }

    const pi = await PurchaseIndent.findById(targetPiId);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    const adminUser = req.user?.name || req.user?.email || 'Admin';
    const adminId = req.user?._id || null;

    // Detect target stage: 'po' | 'first_payment' | 'second_payment'
    const targetStage = stage || (
      pi.po_approval?.status === 'pending' || pi.requires_admin_approval
        ? 'po'
        : pi.payment?.payment_status === 'Balance Requested'
        ? 'second_payment'
        : 'first_payment'
    );

    if (targetStage === 'po') {
      // ── Stage 1: PO Approval ──────────────────────────────────────────────
      if (normalizedAction === 'approve') {
        pi.po_approval.status = 'approved';
        pi.po_approval.approved_by = adminId;
        pi.po_approval.approved_by_name = adminUser;
        pi.po_approval.approved_at = new Date();
        pi.po_approval.remarks = remarks || 'PO approved by Admin';
        pi.pi_status = 'Approved';
        pi.requires_admin_approval = false;
        if (pi.payment) {
          pi.payment.payment_status = 'PI Submitted';
        }

        pi.audit_history.push({
          action: 'Admin Approved Purchase Order (PO)',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'PO approved by Admin. Eligible for supplier payment workflow.'
        });
      } else if (normalizedAction === 'return') {
        pi.po_approval.status = 'returned';
        pi.po_approval.return_reason = remarks || 'PO returned for correction';
        pi.pi_status = 'Draft';

        pi.audit_history.push({
          action: 'Admin Returned Purchase Order (PO) for Correction',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'PO returned to Procurement / Accounts for correction'
        });
      } else {
        pi.po_approval.status = 'rejected';
        pi.po_approval.rejection_reason = remarks || 'PO rejected by Admin';
        pi.pi_status = 'Cancelled';

        pi.audit_history.push({
          action: 'Admin Rejected Purchase Order (PO)',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'PO rejected by Admin'
        });
      }
    } else if (targetStage === 'first_payment' || targetStage === 'advance') {
      // ── Stage 2: Supplier First Payment Approval ──────────────────────────
      if (normalizedAction === 'approve') {
        pi.payment.payment_status = 'Approved';
        pi.payment.admin_approval.status = 'Approved';
        pi.payment.admin_approval.approved_by = adminId;
        pi.payment.admin_approval.approved_at = new Date();
        pi.payment.admin_approval.remarks = remarks || 'Supplier First Payment Approved by Admin';

        if (!pi.payment.advance_approval) pi.payment.advance_approval = {};
        pi.payment.advance_approval.status = 'approved';
        pi.payment.advance_approval.approved_by = adminId;
        pi.payment.advance_approval.approved_by_name = adminUser;
        pi.payment.advance_approval.approved_at = new Date();
        pi.payment.advance_approval.remarks = remarks || 'Approved by Admin';

        pi.audit_history.push({
          action: 'Admin Approved Supplier First Payment (Advance)',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'First Payment approved by Admin. Awaiting Accounts disbursement.'
        });
      } else {
        pi.payment.payment_status = 'Rejected / Returned';
        pi.payment.admin_approval.status = 'Rejected';
        if (!pi.payment.advance_approval) pi.payment.advance_approval = {};
        pi.payment.advance_approval.status = 'rejected';
        pi.payment.advance_approval.rejection_reason = remarks || 'First payment rejected by Admin';

        pi.audit_history.push({
          action: 'Admin Rejected Supplier First Payment',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'First payment rejected by Admin'
        });
      }
    } else if (targetStage === 'second_payment' || targetStage === 'balance') {
      // ── Stage 3: Supplier Second Payment Approval ─────────────────────────
      if (normalizedAction === 'approve') {
        pi.payment.payment_status = 'Approved';
        pi.payment.admin_approval.status = 'Approved';
        pi.payment.admin_approval.approved_by = adminId;
        pi.payment.admin_approval.approved_at = new Date();
        pi.payment.admin_approval.remarks = remarks || 'Supplier Second Payment Approved by Admin';

        if (!pi.payment.balance_approval) pi.payment.balance_approval = {};
        pi.payment.balance_approval.status = 'approved';
        pi.payment.balance_approval.approved_by = adminId;
        pi.payment.balance_approval.approved_by_name = adminUser;
        pi.payment.balance_approval.approved_at = new Date();
        pi.payment.balance_approval.remarks = remarks || 'Approved by Admin';

        pi.audit_history.push({
          action: 'Admin Approved Supplier Second Payment (Balance)',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'Second Payment approved by Admin. Awaiting Accounts disbursement.'
        });
      } else if (normalizedAction === 'return') {
        pi.payment.payment_status = 'Rejected / Returned';
        pi.payment.admin_approval.status = 'Returned';
        if (!pi.payment.balance_approval) pi.payment.balance_approval = {};
        pi.payment.balance_approval.status = 'returned';
        pi.payment.balance_approval.return_reason = remarks || 'Returned for correction';

        pi.audit_history.push({
          action: 'Admin Returned Supplier Second Payment Request',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'Returned by Admin to Accounts for correction'
        });
      } else {
        pi.payment.payment_status = 'Rejected / Returned';
        pi.payment.admin_approval.status = 'Rejected';
        if (!pi.payment.balance_approval) pi.payment.balance_approval = {};
        pi.payment.balance_approval.status = 'rejected';
        pi.payment.balance_approval.rejection_reason = remarks || 'Second payment rejected by Admin';

        pi.audit_history.push({
          action: 'Admin Rejected Supplier Second Payment',
          performed_by: adminId,
          performer_name: adminUser,
          role: 'Admin',
          timestamp: new Date(),
          remarks: remarks || 'Second payment rejected by Admin'
        });
      }
    }

    await pi.save();

    return res.status(200).json({
      status: 'success',
      message: `Stage "${targetStage}" on PI #${pi.pi_number} successfully ${normalizedAction}d by Admin.`,
      data: pi
    });
  } catch (err) {
    console.error('Error in admin_approve_supplier_payment:', err);
    return res.status(500).json({ status: 'error', message: 'Admin approval failed.', error: err.message });
  }
};

/**
 * Helper: Sync or Create Warehouse Delivery Order upon Advance Payment to Supplier / OEM Partner
 * Pushes the order directly into the Warehouse's "New Orders (Procurement Fulfillment)" queue
 * without changing any Warehouse logic or contracts.
 */
async function syncDeliveryOrderFromPi(pi, reqUser = null) {
  if (!pi) return null;

  // 1. Resolve parent Procurement Group (batch) if exists
  let group = null;
  if (pi.order_group_id) {
    group = await ProcurementGroup.findOne({ group_id: pi.order_group_id.toUpperCase() }).lean();
  }

  // 2. Identify source order details from group.source_orders or fallback to order models
  let matchedSourceOrder = null;
  if (group && Array.isArray(group.source_orders) && group.source_orders.length > 0) {
    matchedSourceOrder = group.source_orders.find(so =>
      (so.order_number && pi.customer_order_number && so.order_number.toString() === pi.customer_order_number.toString()) ||
      (so.id && pi.customer_order_id && so.id.toString() === pi.customer_order_id.toString())
    ) || group.source_orders[0];
  }

  // Fallback to epc_orders / fpo_orders
  let epcOrderDoc = null;
  if (!matchedSourceOrder && pi.customer_order_number) {
    epcOrderDoc = await EpcOrder.findOne({ order_number: pi.customer_order_number }).lean();
    if (!epcOrderDoc) {
      epcOrderDoc = await FpoOrder.findOne({ order_number: pi.customer_order_number }).lean();
    }
  }

  const customerName = matchedSourceOrder?.customer_name ||
                       matchedSourceOrder?.company_name ||
                       epcOrderDoc?.buyer_name ||
                       epcOrderDoc?.customer_name ||
                       'Dwarka Solar EPC Solutions';

  const customerPhone = matchedSourceOrder?.customer_contact ||
                        matchedSourceOrder?.phone ||
                        epcOrderDoc?.buyer_phone ||
                        epcOrderDoc?.customer_phone ||
                        '+91 98765 43210';

  const customerEmail = matchedSourceOrder?.customer_email ||
                        matchedSourceOrder?.email ||
                        epcOrderDoc?.buyer_email ||
                        epcOrderDoc?.customer_email ||
                        'epc@solarkits.in';

  const destinationState = matchedSourceOrder?.state_name ||
                          matchedSourceOrder?.state ||
                          epcOrderDoc?.delivery_address?.state_name ||
                          'Gujarat';

  const destinationDistrict = matchedSourceOrder?.district_name ||
                             matchedSourceOrder?.district ||
                             epcOrderDoc?.delivery_address?.district_name ||
                             'Devbhoomi Dwarka';

  const destinationPincode = matchedSourceOrder?.pincode ||
                            epcOrderDoc?.delivery_address?.pincode ||
                            '380001';

  const destinationAddress = matchedSourceOrder?.delivery_destination ||
                            epcOrderDoc?.delivery_address?.address_line_1 ||
                            `${destinationDistrict}, ${destinationState} - ${destinationPincode}`;

  const destinationLandmark = matchedSourceOrder?.route_group ||
                             epcOrderDoc?.delivery_address?.landmark ||
                             '';

  const warehouseId = pi.destination_warehouse_id || matchedSourceOrder?.warehouse_id || null;
  const warehouseCode = pi.destination_warehouse_name || matchedSourceOrder?.warehouse_code || 'WH-IND-GJ-001';
  const orderDate = matchedSourceOrder?.created_at ? new Date(matchedSourceOrder.created_at) : (pi.created_at || new Date());

  const orderNumberToMatch = pi.customer_order_number || (group ? group.group_id : `ORD-${Date.now()}`);

  // 3. Find if DeliveryOrder already exists for this order/batch
  let deliveryOrder = await WarehouseDeliveryOrder.findOne({
    $or: [
      { order_number: orderNumberToMatch },
      { order_id: orderNumberToMatch },
      ...(pi.order_group_id ? [{ order_number: pi.order_group_id }, { 'epcs.epc_id': pi.order_group_id }] : [])
    ]
  });

  // 4. Map PI items to DeliveryOrder item schema
  const newItemsForDO = (pi.items || []).map(it => {
    const qty = Number(it.quantity) || 1;
    return {
      sku: it.sku_code || 'SKU-ITEM',
      product_name: it.product_name || 'Solar Product',
      category: it.component_type === 'panel' ? 'Solar Panels' : (it.component_type || 'BOS Kit'),
      ordered_qty: qty,
      received_qty: 0,
      pending_qty: qty,
      available_inventory_stock: 0,
      allocated_stock: 0,
      rack_location: 'Dock-Receiving',
      qc_status: 'Passed',
      sourcing_type: 'supplier_procurement',
      supply_fulfilment_method: (pi.fulfilment?.method === 'Company Pickup') ? 'company_pickup' : 'supplier_delivery',
      supplier_name: pi.supplier_name,
      supplier_id: pi.supplier_id ? pi.supplier_id.toString() : '',
      supplier_warehouse: {
        name: pi.fulfilment?.supplier_warehouse_address || 'Supplier Works',
        address: pi.fulfilment?.supplier_warehouse_address || '',
        city: destinationDistrict,
        state: destinationState,
        pincode: destinationPincode,
        contact_person: pi.supplier_name,
        phone: customerPhone
      },
      pi_reference: {
        pi_number: pi.pi_number,
        pi_date: pi.created_at || new Date(),
        pi_value: pi.total_pi_value || 0
      },
      transport_responsibility: pi.fulfilment?.transport_responsibility?.toLowerCase() === 'company' ? 'company' : 'supplier',
      transport_cost: Number(pi.fulfilment?.transport_cost) || 0,
      expected_pickup_date: pi.fulfilment?.expected_pickup_date || null,
      expected_inward_date: pi.fulfilment?.expected_inward_date || null,
      supply_status: 'pending',
      damaged_qty: 0,
      missing_qty: 0
    };
  });

  const performerName = reqUser?.name || reqUser?.email || 'Accounts Manager';

  // Compute true kit count & model details from group / source order / items
  const itemInverterOrAcdbQty = Math.max(...newItemsForDO.filter(it =>
    it.category === 'inverter' ||
    (it.sku && it.sku.includes('ACDB')) ||
    (it.product_name && it.product_name.toLowerCase().includes('inverter')) ||
    (it.product_name && it.product_name.toLowerCase().includes('acdb'))
  ).map(it => it.ordered_qty || 0), 0);

  const inferredKitsCount = Number(matchedSourceOrder?.kits) ||
                            Number(matchedSourceOrder?.quantity) ||
                            Number(group?.total_kits) ||
                            Number(epcOrderDoc?.total_kits) ||
                            Number(epcOrderDoc?.quantity) ||
                            (itemInverterOrAcdbQty > 0 ? itemInverterOrAcdbQty : 1);

  const detectedCapacity = matchedSourceOrder?.raw_items?.[0]?.capacity ||
                           matchedSourceOrder?.capacity ||
                           epcOrderDoc?.system_capacity ||
                           (matchedSourceOrder?.kit_type?.match(/(\d+)\s*k[wv]/i)?.[0]) ||
                           '3 kW';

  const detectedModel = matchedSourceOrder?.kit_type ||
                        matchedSourceOrder?.raw_items?.[0]?.item_name ||
                        epcOrderDoc?.kit_name ||
                        `${detectedCapacity} Solarkits DCR Combokit`;

  // Query all PIs for this order to see if the entire procurement balance is settled
  const allOrderPis = await PurchaseIndent.find({
    $or: [
      { customer_order_number: orderNumberToMatch },
      { order_number: orderNumberToMatch }
    ]
  }).lean().catch(() => []);

  const isCurrentPiSettled = pi.payment?.payment_status === 'Paid' ||
    (pi.payment?.balance_payment?.utr_number && pi.payment?.advance_payment?.utr_number) ||
    (pi.payment?.total_paid_amount >= pi.total_pi_value) ||
    (pi.payment?.balance_due <= 0 && pi.payment?.total_paid_amount > 0);

  const allPisSettled = allOrderPis.length > 0
    ? allOrderPis.every(p =>
        (p._id.toString() === pi._id?.toString() ? isCurrentPiSettled : (
          p.payment?.payment_status === 'Paid' ||
          (p.payment?.balance_payment?.utr_number && p.payment?.advance_payment?.utr_number) ||
          (p.payment?.total_paid_amount >= p.total_pi_value) ||
          (p.payment?.balance_due <= 0 && p.payment?.total_paid_amount > 0)
        ))
      )
    : isCurrentPiSettled;

  if (!deliveryOrder) {
    // Generate unique DO-YYYY-XXXX
    const year = new Date().getFullYear();
    const doCount = await WarehouseDeliveryOrder.countDocuments({});
    let doSeq = doCount + 1;
    let deliveryOrderId = `DO-${year}-${String(doSeq).padStart(4, '0')}`;
    while (await WarehouseDeliveryOrder.findOne({ delivery_order_id: deliveryOrderId })) {
      doSeq++;
      deliveryOrderId = `DO-${year}-${String(doSeq).padStart(4, '0')}`;
    }

    deliveryOrder = new WarehouseDeliveryOrder({
      delivery_order_id: deliveryOrderId,
      delivery_number: deliveryOrderId,
      order_id: pi.customer_order_id ? pi.customer_order_id.toString() : orderNumberToMatch,
      order_number: orderNumberToMatch,
      warehouse_id: warehouseId,
      warehouse_code: warehouseCode,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      num_kits: inferredKitsCount,
      system_capacity: detectedCapacity,
      solarkit_model: detectedModel,
      destination: {
        address: destinationAddress,
        state: destinationState,
        district: destinationDistrict,
        pincode: destinationPincode,
        landmark: destinationLandmark
      },
      required_vehicle: group?.vehicle_details?.vehicle_name || pi.fulfilment?.vehicle_details?.vehicle_type || '14ft Eicher (4.0 Ton)',
      transport_details: {
        vehicle_type: group?.vehicle_details?.vehicle_name || pi.fulfilment?.vehicle_details?.vehicle_type || '14ft Eicher (4.0 Ton)',
        vehicle_number: group?.vehicle_details?.vehicle_number || pi.fulfilment?.vehicle_details?.vehicle_number || '',
        transporter_name: pi.fulfilment?.carrier_name || group?.transporter_name || '',
        driver_name: pi.fulfilment?.driver_name || '',
        driver_mobile: pi.fulfilment?.driver_phone || ''
      },
      order_date: orderDate,
      delivery_status: 'new_order',
      delivery_method: 'manual',
      kit_preparation_status: 'awaiting_components',
      items: newItemsForDO,
      epcs: [{
        epc_id: pi.order_group_id || 'EPC-01',
        epc_name: customerName,
        contact_person: customerName,
        phone: customerPhone,
        email: customerEmail,
        solarkit_model: detectedModel,
        system_capacity: detectedCapacity,
        boskit_qty: `${inferredKitsCount} Kits`,
        inverter_qty: `${inferredKitsCount} Inverters`,
        panels_qty: `${inferredKitsCount * 9} Panels`,
        structure_qty: `${inferredKitsCount} Sets`,
        share_percentage: 100,
        destination: {
          address: destinationAddress,
          district: destinationDistrict,
          state: destinationState,
          pincode: destinationPincode
        },
        payment_first_half: {
          status: 'done',
          percentage: pi.payment?.advance_percentage || 30,
          amount: pi.payment?.advance_payment?.paid_amount || pi.payment?.advance_amount || 0,
          paid_at: pi.payment?.advance_payment?.payment_date || new Date(),
          verified_by: 'Accounts (Advance UTR Recorded)'
        },
        payment_second_half: {
          status: allPisSettled ? 'done' : 'pending',
          percentage: pi.payment?.balance_percentage || 70,
          amount: pi.payment?.balance_amount || 0,
          paid_at: allPisSettled ? (pi.payment?.balance_payment?.payment_date || new Date()) : null,
          verified_by: allPisSettled ? 'Accounts (Balance UTR Recorded)' : ''
        },
        items: newItemsForDO.map(it => ({
          sku: it.sku,
          product_name: it.product_name,
          category: it.category,
          ordered_qty: it.ordered_qty,
          received_qty: 0,
          pending_qty: it.pending_qty,
          rack_location: it.rack_location
        })),
        is_removed_by_account: false,
        dispatch_status: 'pending'
      }],
      audit_trail: [{
        action: `Order Confirmed for Procurement (Advance Paid to ${pi.is_oem_partner ? 'OEM Partner' : 'Supplier'})`,
        performed_by_name: performerName,
        timestamp: new Date(),
        notes: `Transferred to Warehouse New Orders upon advance payment for PI #${pi.pi_number} (${pi.supplier_name}) for ${inferredKitsCount} kits`
      }]
    });

    await deliveryOrder.save();
  } else {
    // DeliveryOrder exists for this order; merge items from this PI
    for (const newItem of newItemsForDO) {
      const existingItemIndex = deliveryOrder.items.findIndex(it =>
        it.sku === newItem.sku && it.pi_reference?.pi_number === newItem.pi_reference?.pi_number
      );
      if (existingItemIndex >= 0) {
        deliveryOrder.items[existingItemIndex].supplier_name = newItem.supplier_name;
        deliveryOrder.items[existingItemIndex].ordered_qty = newItem.ordered_qty;
        deliveryOrder.items[existingItemIndex].pending_qty = Math.max(0, newItem.ordered_qty - deliveryOrder.items[existingItemIndex].received_qty);
        deliveryOrder.items[existingItemIndex].pi_reference = newItem.pi_reference;
      } else {
        // If an older item for the same SKU exists with 0 pending and different PI (stale mock), replace it
        const staleItemIndex = deliveryOrder.items.findIndex(it => it.sku === newItem.sku && it.pi_reference?.pi_number !== newItem.pi_reference?.pi_number);
        if (staleItemIndex >= 0 && (deliveryOrder.items[staleItemIndex].pending_qty === 0 || !deliveryOrder.items[staleItemIndex].pi_reference?.pi_number)) {
          deliveryOrder.items[staleItemIndex] = newItem;
        } else {
          deliveryOrder.items.push(newItem);
        }
      }
    }

    // Whenever items with pending quantities are synced, ensure order is actively in New Orders queue awaiting dock inwarding!
    const totalPending = deliveryOrder.items.reduce((acc, it) => acc + (it.pending_qty || 0), 0);
    if (totalPending > 0) {
      deliveryOrder.sent_for_delivery_at = null;
      deliveryOrder.delivery_status = 'new_order';
      deliveryOrder.kit_preparation_status = 'awaiting_components';
    }

    if (!deliveryOrder.num_kits || deliveryOrder.num_kits < inferredKitsCount) {
      deliveryOrder.num_kits = inferredKitsCount;
    }
    if (!deliveryOrder.system_capacity) {
      deliveryOrder.system_capacity = detectedCapacity;
    }
    if (!deliveryOrder.solarkit_model) {
      deliveryOrder.solarkit_model = detectedModel;
    }
    if (deliveryOrder.epcs && deliveryOrder.epcs.length > 0) {
      deliveryOrder.epcs[0].items = deliveryOrder.items;
      if (!deliveryOrder.epcs[0].boskit_qty || deliveryOrder.epcs[0].boskit_qty === '1 Kits' || deliveryOrder.epcs[0].boskit_qty === '') {
        deliveryOrder.epcs[0].boskit_qty = `${deliveryOrder.num_kits} Kits`;
        deliveryOrder.epcs[0].inverter_qty = `${deliveryOrder.num_kits} Inverters`;
        deliveryOrder.epcs[0].system_capacity = deliveryOrder.system_capacity;
        deliveryOrder.epcs[0].solarkit_model = deliveryOrder.solarkit_model;
      }
      if (allPisSettled) {
        deliveryOrder.epcs.forEach(epc => {
          if (!epc.payment_second_half) epc.payment_second_half = {};
          epc.payment_second_half.status = 'done';
          epc.payment_second_half.paid_at = epc.payment_second_half.paid_at || pi.payment?.balance_payment?.payment_date || new Date();
          epc.payment_second_half.verified_by = 'Accounts (Balance UTR Recorded)';
        });
      }
    }

    if (group?.vehicle_details?.vehicle_name) {
      deliveryOrder.required_vehicle = group.vehicle_details.vehicle_name;
      if (!deliveryOrder.transport_details) deliveryOrder.transport_details = {};
      if (!deliveryOrder.transport_details.vehicle_type || deliveryOrder.transport_details.vehicle_type === '14ft Eicher (4.0 Ton)') {
        deliveryOrder.transport_details.vehicle_type = group.vehicle_details.vehicle_name;
      }
      if (group.vehicle_details.vehicle_number && !deliveryOrder.transport_details.vehicle_number) {
        deliveryOrder.transport_details.vehicle_number = group.vehicle_details.vehicle_number;
      }
    }

    deliveryOrder.audit_trail.push({
      action: allPisSettled
        ? `Balance Payment (100% Settled) Recorded for PI #${pi.pi_number} (${pi.supplier_name})`
        : `Advance Payment Recorded for PI #${pi.pi_number} (${pi.supplier_name})`,
      performed_by_name: performerName,
      timestamp: new Date(),
      notes: allPisSettled
        ? `All Purchase Indents fully settled in Accounts. 2nd half payment cleared for Warehouse dispatch.`
        : `Updated Warehouse Delivery Order items with PI #${pi.pi_number}`
    });

    await deliveryOrder.save();
  }

  // Update group batch handover if group exists
  if (group) {
    await ProcurementGroup.updateOne(
      { _id: group._id },
      {
        $set: {
          batch_status: 'Transferred to Delivery',
          delivery_handover: {
            transferred_at: new Date(),
            transferred_by: reqUser?._id || null,
            delivery_order_id: deliveryOrder.delivery_order_id
          }
        }
      }
    ).catch(() => {});
  }

  return deliveryOrder;
}

/**
 * 9. Record Actual Bank Payment
 * Actual payment completion after Admin approval (Separation of duties: Admin approves, Accounts pays)
 */
exports.record_bank_payment = async (req, res) => {
  try {
    const {
      pi_id,
      indent_id,
      utr_number,
      paid_amount,
      payment_mode,
      payment_date,
      remarks,
      receipt_url,
      payment_type, // 'advance' | 'balance' | 'full'
      milestone
    } = req.body;
    const targetPiId = pi_id || indent_id;

    const pi = await PurchaseIndent.findById(targetPiId);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    if (!targetPiId || !utr_number || !payment_mode) {
      return res.status(400).json({ status: 'error', message: 'pi_id, utr_number, and payment_mode are required.' });
    }

    // Determine target milestone:
    let targetMilestone = (payment_type || milestone || '').toLowerCase();
    const hasAdvance = Boolean(pi.payment?.advance_payment?.utr_number || pi.payment?.payment_status === 'Advance Paid');

    if (!targetMilestone) {
      if (hasAdvance) {
        targetMilestone = 'balance';
      } else if (Number(paid_amount) >= pi.total_pi_value) {
        targetMilestone = 'full';
      } else {
        targetMilestone = 'advance';
      }
    }

    // Rule 3: Strict Milestone-Specific Admin Approval requirement
    if (targetMilestone === 'balance') {
      const isBalApproved = pi.payment?.balance_approval?.status === 'approved';
      if (!isBalApproved && pi.payment?.payment_status !== 'Paid') {
        return res.status(400).json({
          status: 'error',
          message: `Cannot record Balance payment. 70% Balance payment has status '${pi.payment?.balance_approval?.status || 'not requested'}' and requires prior Admin Approval in the Order Approval Dashboard.`
        });
      }
    } else if (targetMilestone === 'advance') {
      const isAdvApproved = pi.payment?.advance_approval?.status === 'approved';
      if (!isAdvApproved && !['Advance Paid', 'Paid'].includes(pi.payment?.payment_status)) {
        return res.status(400).json({
          status: 'error',
          message: `Cannot record Advance payment. 30% Advance payment has status '${pi.payment?.advance_approval?.status || 'not requested'}' and requires prior Admin Approval in the Order Approval Dashboard.`
        });
      }
    }

    const defaultAmount = targetMilestone === 'balance'
      ? (pi.payment?.balance_amount || (pi.total_pi_value - (pi.payment?.advance_amount || 0)))
      : (pi.payment?.advance_amount || pi.total_pi_value);

    const amountPaid = paid_amount !== undefined && paid_amount !== null && !isNaN(Number(paid_amount))
      ? Number(paid_amount)
      : defaultAmount;

    // Rule 4: Prevent supplier payments exceeding approved PO balance
    const currentPaid = pi.payment?.total_paid_amount || (pi.payment?.advance_payment?.paid_amount || 0);
    const maxPayable = Math.max(0, pi.total_pi_value - (targetMilestone === 'balance' ? currentPaid : 0));

    if (amountPaid > maxPayable) {
      return res.status(400).json({
        status: 'error',
        message: `Disbursement of ₹${amountPaid.toLocaleString('en-IN')} exceeds approved remaining PO balance of ₹${maxPayable.toLocaleString('en-IN')}. Overpayment is prohibited.`
      });
    }

    const pDate = payment_date ? new Date(payment_date) : new Date();
    const userId = req.user?._id || null;
    const userName = req.user?.name || req.user?.email || 'Accounts Team';

    const paymentRecord = {
      utr_number: utr_number.trim().toUpperCase(),
      paid_amount: amountPaid,
      payment_date: pDate,
      payment_mode,
      receipt_url: receipt_url || null,
      remarks: remarks || `Disbursed ${targetMilestone} payment`,
      recorded_by: userId,
      recorded_at: new Date()
    };

    if (!pi.payment.payment_history) {
      pi.payment.payment_history = [];
    }

    if (targetMilestone === 'balance') {
      // Recording 70% Balance
      pi.payment.balance_payment = paymentRecord;
      const prevAdvance = pi.payment?.advance_payment?.paid_amount || pi.payment?.advance_amount || 0;
      pi.payment.total_paid_amount = prevAdvance + amountPaid;
      pi.payment.balance_due = Math.max(0, pi.total_pi_value - pi.payment.total_paid_amount);

      if (pi.payment.total_paid_amount >= pi.total_pi_value || pi.payment.balance_due <= 0) {
        pi.payment.payment_status = 'Paid';
      } else {
        pi.payment.payment_status = 'Partially Paid';
      }

      pi.payment.payment_history.push({
        milestone: 'balance',
        ...paymentRecord
      });

      // Keep actual_payment updated as latest disbursement
      pi.payment.actual_payment = {
        utr_number: paymentRecord.utr_number,
        paid_amount: amountPaid,
        payment_date: pDate,
        payment_mode,
        receipt_url: receipt_url || null
      };

      pi.audit_history.push({
        action: `Milestone 2 (70% Balance) Recorded (${pi.payment.payment_status})`,
        performed_by: userId,
        performer_name: userName,
        role: 'Accounts',
        timestamp: new Date(),
        remarks: `UTR #${paymentRecord.utr_number}, Balance Amount: ₹${amountPaid.toLocaleString('en-IN')}`
      });
    } else if (targetMilestone === 'full') {
      // 100% Single Payment
      pi.payment.advance_payment = paymentRecord;
      pi.payment.balance_payment = paymentRecord;
      pi.payment.total_paid_amount = amountPaid;
      pi.payment.balance_due = Math.max(0, pi.total_pi_value - amountPaid);
      pi.payment.payment_status = 'Paid';

      pi.payment.payment_history.push({
        milestone: 'full',
        ...paymentRecord
      });

      pi.payment.actual_payment = {
        utr_number: paymentRecord.utr_number,
        paid_amount: amountPaid,
        payment_date: pDate,
        payment_mode,
        receipt_url: receipt_url || null
      };

      pi.audit_history.push({
        action: `Full Payment (100%) Recorded`,
        performed_by: userId,
        performer_name: userName,
        role: 'Accounts',
        timestamp: new Date(),
        remarks: `UTR #${paymentRecord.utr_number}, Amount: ₹${amountPaid.toLocaleString('en-IN')}`
      });
    } else {
      // Recording 30% Advance
      pi.payment.advance_payment = paymentRecord;
      pi.payment.total_paid_amount = amountPaid;
      pi.payment.balance_due = Math.max(0, pi.total_pi_value - amountPaid);

      if (amountPaid >= pi.total_pi_value) {
        pi.payment.payment_status = 'Paid';
        pi.payment.balance_payment = paymentRecord;
      } else {
        pi.payment.payment_status = 'Advance Paid';
      }

      // Reset admin_approval & balance_approval so balance requires its own request and approval
      if (pi.payment.admin_approval) {
        pi.payment.admin_approval.status = 'pending';
        pi.payment.admin_approval.remarks = 'Advance paid. Balance payment requires Accounts request.';
      }
      pi.payment.balance_approval = {
        status: null,
        requested_at: null,
        requested_amount: pi.payment.balance_due
      };

      pi.payment.payment_history.push({
        milestone: 'advance',
        ...paymentRecord
      });

      pi.payment.actual_payment = {
        utr_number: paymentRecord.utr_number,
        paid_amount: amountPaid,
        payment_date: pDate,
        payment_mode,
        receipt_url: receipt_url || null
      };

      pi.audit_history.push({
        action: `Milestone 1 (30% Advance) Recorded (${pi.payment.payment_status})`,
        performed_by: userId,
        performer_name: userName,
        role: 'Accounts',
        timestamp: new Date(),
        remarks: `UTR #${paymentRecord.utr_number}, Advance Amount: ₹${amountPaid.toLocaleString('en-IN')}`
      });
    }

    await pi.save();

    // Auto-transfer / sync order to Warehouse New Orders upon 30% Advance (or Full / Balance) payment
    try {
      if (targetMilestone === 'advance' || targetMilestone === 'full' || targetMilestone === 'balance' || ['Advance Paid', 'Paid'].includes(pi.payment?.payment_status)) {
        await syncDeliveryOrderFromPi(pi, req.user);
      }
    } catch (syncErr) {
      console.error(`Failed to sync Warehouse Delivery Order for PI ${pi.pi_number}:`, syncErr);
    }

    return res.status(200).json({
      status: 'success',
      message: `Bank payment (${targetMilestone}) recorded for PI #${pi.pi_number}. Status: ${pi.payment.payment_status}. Transferred to Warehouse New Orders.`,
      data: pi
    });
  } catch (err) {
    console.error('Error in record_bank_payment:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to record bank payment.', error: err.message });
  }
};

/**
 * 10. Save Supply Fulfilment Method (Company Pickup vs Supplier Delivery)
 */
exports.save_supply_fulfilment = async (req, res) => {
  try {
    const {
      pi_id,
      method,
      supplier_warehouse_id,
      supplier_warehouse_address,
      transport_responsibility,
      transport_cost,
      expected_pickup_date,
      expected_dispatch_date,
      expected_inward_date
    } = req.body;

    if (!pi_id || !method || !['Company Pickup', 'Supplier Delivery'].includes(method)) {
      return res.status(400).json({ status: 'error', message: 'pi_id and valid method (Company Pickup, Supplier Delivery) are required.' });
    }

    const pi = await PurchaseIndent.findById(pi_id);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    pi.fulfilment.method = method;
    pi.fulfilment.supplier_warehouse_id = supplier_warehouse_id || pi.fulfilment.supplier_warehouse_id;
    pi.fulfilment.supplier_warehouse_address = supplier_warehouse_address || pi.fulfilment.supplier_warehouse_address;
    pi.fulfilment.transport_responsibility = transport_responsibility || (method === 'Company Pickup' ? 'Company' : 'Supplier');
    pi.fulfilment.transport_cost = Number(transport_cost) || 0;

    if (expected_pickup_date) pi.fulfilment.expected_pickup_date = new Date(expected_pickup_date);
    if (expected_dispatch_date) pi.fulfilment.expected_dispatch_date = new Date(expected_dispatch_date);
    if (expected_inward_date) pi.fulfilment.expected_inward_date = new Date(expected_inward_date);

    pi.audit_history.push({
      action: `Fulfilment Method Updated (${method})`,
      performed_by: req.user?._id || null,
      performer_name: req.user?.name || req.user?.email || 'Accounts Team',
      role: 'Accounts',
      timestamp: new Date(),
      remarks: `Method: ${method}, Expected Inward: ${expected_inward_date || 'TBD'}`
    });

    await pi.save();

    return res.status(200).json({
      status: 'success',
      message: `Fulfilment method configured for PI #${pi.pi_number}.`,
      data: pi
    });
  } catch (err) {
    console.error('Error in save_supply_fulfilment:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to update fulfilment method.', error: err.message });
  }
};

/**
 * 11. Supplier Readiness & Dispatch Confirmation
 */
exports.supplier_update_dispatch = async (req, res) => {
  try {
    const {
      pi_id,
      indent_id,
      status_update,
      supply_status,
      vehicle_details,
      vehicle_number,
      driver_name,
      driver_phone,
      dispatch_reference,
      tracking_reference,
      carrier_name,
      carrier_details,
      date,
      actual_dispatch_date
    } = req.body;

    const targetPiId = pi_id || indent_id;
    const targetStatus = status_update || supply_status;

    if (!targetPiId || !targetStatus) {
      return res.status(400).json({ status: 'error', message: 'pi_id and status_update are required.' });
    }

    const pi = await PurchaseIndent.findById(targetPiId);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    pi.fulfilment.supply_status = targetStatus;

    if (vehicle_details) {
      pi.fulfilment.vehicle_details = vehicle_details;
    } else if (vehicle_number) {
      pi.fulfilment.vehicle_details = {
        vehicle_number,
        driver_name: driver_name || null,
        driver_phone: driver_phone || null
      };
    }

    const ref = tracking_reference || dispatch_reference;
    if (ref) {
      pi.fulfilment.dispatch_reference = ref;
      pi.fulfilment.tracking_reference = ref;
    }

    const carrier = carrier_name || carrier_details;
    if (carrier) {
      pi.fulfilment.carrier_name = carrier;
    }

    const dispatchDate = actual_dispatch_date || date;
    if (targetStatus === 'Picked Up') {
      pi.fulfilment.actual_pickup_date = dispatchDate ? new Date(dispatchDate) : new Date();
    } else if (targetStatus === 'Dispatched') {
      pi.fulfilment.actual_dispatch_date = dispatchDate ? new Date(dispatchDate) : new Date();
    }

    pi.audit_history.push({
      action: `Supplier Supply Status: ${targetStatus}`,
      performed_by: req.user?._id || null,
      performer_name: req.user?.name || 'Supplier / Transport',
      role: 'Supplier',
      timestamp: new Date(),
      remarks: dispatch_reference ? `Ref: ${dispatch_reference}` : 'Updated by Supplier'
    });

    await pi.save();

    return res.status(200).json({
      status: 'success',
      message: `Supply status updated to '${status_update}' for PI #${pi.pi_number}.`,
      data: pi
    });
  } catch (err) {
    console.error('Error in supplier_update_dispatch:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to update supply status.', error: err.message });
  }
};

/**
 * 12. Warehouse Physical Inward Receipt Verification (GRN)
 * Verifies physically received goods against customer order and marks Inward Completed
 */
exports.warehouse_confirm_inward = async (req, res) => {
  try {
    const {
      pi_id,
      customer_order_number,
      warehouse_id,
      invoice_no,
      invoice_date,
      received_items,
      damage_notes,
      qc_passed = true
    } = req.body;

    if (!pi_id) {
      return res.status(400).json({ status: 'error', message: 'pi_id is required.' });
    }

    const pi = await PurchaseIndent.findById(pi_id);
    if (!pi) {
      return res.status(404).json({ status: 'error', message: 'Purchase Indent not found.' });
    }

    const targetWarehouseId = warehouse_id || pi.destination_warehouse_id || (await CompanyWarehouse.findOne().select('_id'))?._id;
    const orderNo = customer_order_number || pi.customer_order_number || 'WH-STOCK-PROCUREMENT';

    // Generate GRN No
    const count = await WarehouseInward.countDocuments({});
    const year = new Date().getFullYear();
    const grnNo = `GRN-${year}-${String(count + 1).padStart(5, '0')}`;

    // Create WarehouseInward record
    const inwardItems = (received_items || pi.items).map(it => ({
      sku_id: it.sku_id || new mongoose.Types.ObjectId(),
      sku_code: it.sku_code || 'SKU-ITEM',
      qty: Number(it.quantity) || 1,
      benchmark_price: Number(it.unit_rate) || 0,
      benchmark_price_per_watt: 0,
      invoice_price: Number(it.unit_rate) || 0,
      invoice_price_per_watt: 0,
      qc_status: qc_passed ? 'Passed' : 'Failed',
      damage_notes: damage_notes || ''
    }));

    const inwardDoc = new WarehouseInward({
      grn_no: grnNo,
      warehouse_id: targetWarehouseId,
      inward_type: 'supplier',
      supplier_name: pi.supplier_name,
      invoice_no: invoice_no || `INV-${pi.pi_number}`,
      invoice_date: invoice_date ? new Date(invoice_date) : new Date(),
      status: qc_passed ? 'approved' : 'pending_match',
      items: inwardItems,
      received_by: req.user?._id || new mongoose.Types.ObjectId()
    });

    await inwardDoc.save();

    // Increment warehouse stock
    for (const it of inwardItems) {
      await WarehouseStock.updateOne(
        { warehouse_id: targetWarehouseId, sku_code: it.sku_code },
        { $inc: { qty: it.qty } },
        { upsert: true }
      ).catch(() => {});
    }

    // Update PI fulfilment status
    pi.fulfilment.actual_inward_date = new Date();
    pi.fulfilment.supply_status = 'Inward Completed';
    pi.pi_status = 'Completed';
    pi.audit_history.push({
      action: `Physical Inward Verified (GRN #${grnNo})`,
      performed_by: req.user?._id || null,
      performer_name: req.user?.name || 'Warehouse Staff',
      role: 'Warehouse',
      timestamp: new Date(),
      remarks: qc_passed ? 'QC Passed, physical receipt confirmed' : `QC Issue: ${damage_notes}`
    });

    await pi.save();

    // Update linked Customer Order procurement status
    const isEpc = (orderNo || '').toUpperCase().includes('EPC');
    const OrderModel = isEpc ? EpcOrder : FpoOrder;
    await OrderModel.updateOne(
      { order_number: orderNo },
      {
        $set: {
          'procurement_status.overall_status': 'inward_completed',
          'procurement_status.inward_at': new Date()
        }
      }
    ).catch(() => {});

    return res.status(200).json({
      status: 'success',
      message: `Inward completed and verified under GRN #${grnNo}. Warehouse stock updated.`,
      data: {
        grn_no: grnNo,
        grn_number: grnNo,
        inward_doc: inwardDoc,
        pi
      }
    });
  } catch (err) {
    console.error('Error in warehouse_confirm_inward:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to confirm inward receipt.', error: err.message });
  }
};

/**
 * 13. Procurement Readiness Validation & Delivery Manager Handover
 */
exports.handover_to_delivery_manager = async (req, res) => {
  try {
    const { group_id, order_number } = req.body;

    if (!group_id && !order_number) {
      return res.status(400).json({ status: 'error', message: 'group_id or order_number is required.' });
    }

    let group = null;
    if (group_id) {
      group = await ProcurementGroup.findOne({ group_id: group_id.toUpperCase() });
    }

    // Query all PIs linked to this group or order
    const piFilter = group_id ? { order_group_id: group_id.toUpperCase() } : { customer_order_number: order_number };
    const associatedPIs = await PurchaseIndent.find(piFilter).lean();

    // Query active inventory reservations
    const resFilter = group_id ? { order_group_id: group_id.toUpperCase(), status: 'active' } : { customer_order_number: order_number, status: 'active' };
    const activeReservations = await WarehouseInventoryReservation.find(resFilter).lean();

    // Check procurement readiness rules:
    // 1. All products have a defined supply source (PI or active reservation)
    const hasSourcing = associatedPIs.length > 0 || activeReservations.length > 0;
    if (!hasSourcing) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot hand over to Delivery Manager. No components have been reserved from inventory or procured via supplier PI.'
      });
    }

    // Determine readiness state:
    // - If any PI is not inward completed, readiness is 'Awaiting Warehouse Inward'
    // - If all PIs inward completed (or 100% sourced from inventory), readiness is 'Ready for Kit Preparation'
    const pendingInwardPIs = associatedPIs.filter(pi => pi.fulfilment?.supply_status !== 'Inward Completed');
    let readinessState = 'Ready for Kit Preparation';

    if (pendingInwardPIs.length > 0) {
      readinessState = 'Awaiting Warehouse Inward';
    }

    if (group) {
      group.procurement_readiness_status = readinessState;
      group.batch_status = 'Transferred to Delivery';
      group.status = 'Transferred to Delivery';
      group.delivery_handover = {
        transferred_at: new Date(),
        transferred_by: req.user?._id || null
      };
      await group.save();
    }

    // Also update customer orders across EpcOrder, FpoOrder and CustomerOrder (purchase_orders)
    const { india_solarshop_db } = require('../config/databases');
    const CustomerOrder = india_solarshop_db.models['purchase_orders'] || india_solarshop_db.model('purchase_orders', new mongoose.Schema({}, { strict: false, collection: 'purchase_orders' }));

    const orderNums = group ? group.order_numbers : [order_number];
    await Promise.all([
      EpcOrder.updateMany(
        { order_number: { $in: orderNums } },
        {
          $set: {
            account_processing_status: 'Transferred to Delivery',
            procurement_readiness_status: readinessState,
            'procurement_status.readiness_status': readinessState
          }
        }
      ),
      FpoOrder.updateMany(
        { order_number: { $in: orderNums } },
        {
          $set: {
            account_processing_status: 'Transferred to Delivery',
            procurement_readiness_status: readinessState,
            'procurement_status.readiness_status': readinessState
          }
        }
      ),
      CustomerOrder.updateMany(
        { order_number: { $in: orderNums } },
        {
          $set: {
            account_processing_status: 'Transferred to Delivery',
            procurement_readiness_status: readinessState,
            'procurement_status.readiness_status': readinessState
          }
        }
      )
    ]);

    return res.status(200).json({
      status: 'success',
      message: `Procurement details successfully validated and transferred to Delivery Manager. Current Readiness State: '${readinessState}'.`,
      data: {
        group_id,
        order_numbers: orderNums,
        readiness_state: readinessState,
        total_pis: associatedPIs.length,
        total_reservations: activeReservations.length,
        pending_inward_count: pendingInwardPIs.length
      }
    });
  } catch (err) {
    console.error('Error in handover_to_delivery_manager:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to hand over to Delivery Manager.', error: err.message });
  }
};

/**
 * 12. Get Sourcing Partners (Suppliers & OEM Partners)
 * GET /accounts/procurement/partners
 */
exports.get_sourcing_partners = async (req, res) => {
  try {
    const [oemBrands, supplierBrands, registeredSuppliers, otherBrands] = await Promise.all([
      Brand.find({ is_oem_partner: true, deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .sort({ brand_name: 1 })
        .lean(),
      Brand.find({ is_supplier: true, deleted_at: null })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .sort({ brand_name: 1 })
        .lean(),
      Supplier.find({ is_deleted: { $ne: true } })
        .select('_id company_name brand_name gst_number office_location states status')
        .sort({ company_name: 1 })
        .lean(),
      Brand.find({
        is_oem_partner: { $ne: true },
        is_supplier: { $ne: true },
        deleted_at: null
      })
        .select('_id brand_name company_name logo is_oem_partner is_supplier')
        .sort({ brand_name: 1 })
        .lean()
    ]);

    // OEM Partners (SOLARKITS Brand)
    const oemPartners = oemBrands.map((b) => ({
      id: b._id.toString(),
      name: b.brand_name || b.company_name,
      brand_name: 'SOLARKITS',
      manufacturer_name: b.company_name || b.brand_name,
      company_name: b.company_name || b.brand_name,
      is_oem: true,
      category: 'oem',
      type: 'OEM Partner (SOLARKITS Brand)',
      gst_number: null,
      address: null
    }));

    // Registered Suppliers & Supplier Brands (Own Brand)
    const seenSupplierNames = new Set();
    const suppliers = [];

    // Registered suppliers (with verified GSTIN)
    registeredSuppliers.forEach((s) => {
      const name = s.company_name || s.brand_name;
      if (name && !seenSupplierNames.has(name.toLowerCase())) {
        seenSupplierNames.add(name.toLowerCase());
        suppliers.push({
          id: s._id.toString(),
          name: name,
          brand_name: s.brand_name || name,
          company_name: s.company_name || name,
          is_oem: false,
          category: 'supplier',
          type: 'Supplier Partner (Own Brand)',
          gst_number: s.gst_number || null,
          address: s.office_location?.address || (s.states?.[0] ? `${s.states[0]} Hub` : null),
          status: s.status
        });
      }
    });

    // Supplier brands from Brand collection
    supplierBrands.forEach((b) => {
      const name = b.brand_name || b.company_name;
      if (name && !seenSupplierNames.has(name.toLowerCase())) {
        seenSupplierNames.add(name.toLowerCase());
        suppliers.push({
          id: b._id.toString(),
          name: name,
          brand_name: b.brand_name || name,
          company_name: b.company_name || name,
          is_oem: false,
          category: 'supplier',
          type: 'Supplier Partner (Own Brand)',
          gst_number: null,
          address: null
        });
      }
    });

    // Other catalog brands
    const catalogBrands = otherBrands
      .filter((b) => {
        const name = (b.brand_name || b.company_name || '').toLowerCase();
        return name && !seenSupplierNames.has(name);
      })
      .map((b) => ({
        id: b._id.toString(),
        name: b.brand_name || b.company_name,
        brand_name: b.brand_name || b.company_name,
        company_name: b.company_name || b.brand_name,
        is_oem: false,
        category: 'catalog_brand',
        type: 'Supplier / Catalog Brand',
        gst_number: null,
        address: null
      }));

    return res.status(200).json({
      status: 'success',
      data: {
        oem_partners: oemPartners,
        suppliers: suppliers,
        catalog_brands: catalogBrands,
        all_partners: [...oemPartners, ...suppliers, ...catalogBrands]
      }
    });
  } catch (err) {
    console.error('Error in get_sourcing_partners:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch sourcing partners.',
      error: err.message
    });
  }
};

/**
 * 15. Sync All Advance Paid PIs to Warehouse Delivery Orders
 */
exports.sync_all_advance_paid_pis = async (req, res) => {
  try {
    const advancePaidPIs = await PurchaseIndent.find({
      $or: [
        { 'payment.advance_payment.utr_number': { $exists: true, $ne: '' } },
        { 'payment.payment_status': { $in: ['Advance Paid', 'Paid'] } }
      ]
    });

    const results = [];
    for (const pi of advancePaidPIs) {
      const doDoc = await syncDeliveryOrderFromPi(pi, req.user);
      if (doDoc) {
        results.push({
          pi_number: pi.pi_number,
          order_number: doDoc.order_number,
          delivery_order_id: doDoc.delivery_order_id
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `Successfully synced ${results.length} advance-paid orders to Warehouse New Orders.`,
      data: results
    });
  } catch (err) {
    console.error('Error in sync_all_advance_paid_pis:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.sync_delivery_order_from_pi = syncDeliveryOrderFromPi;

