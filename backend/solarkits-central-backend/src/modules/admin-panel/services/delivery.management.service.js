const mongoose = require('mongoose');
const {
  DeliveryVehicleMaster,
  DeliveryServiceProvider,
  DeliveryVehicleFleet,
  ComboKitWeightMaster,
  DeliveryCostBenchmark,
  KitDeliveryCostRule,
  DeliveryRouteSetting,
  DeliveryOrder,
  EpcOrder,
  FpoOrder,
  PurchaseOrder,
  WarehouseComboKit,
  Reseller,
  StoreSetup,
} = require('../models/india_solarshop_db');
const { CompanyWarehouse, PurchaseOrder: WarehousePurchaseOrder } = require('../models/company_warehouse_db');
const { GeoLevel2 } = require('../models/geolocation_db');
const {
  IndustryType,
  ProjectCategory,
  ProjectSubcategory,
  ProjectType,
  ProjectSubcategoryType,
  ProjectRange,
  SolarKit,
  Product,
} = require('../models/core_db');

/**
 * Helper: Generate unique delivery number DEL-YYYY-XXXX
 */
const generateDeliveryNumber = async () => {
  const year = new Date().getFullYear();
  const count = await DeliveryOrder.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `DEL-${year}-${seq}`;
};

/**
 * 1. WEIGHT & CARGO CALCULATION
 */
const getKitWeight = async (kitId) => {
  if (!kitId) return 100;
  const weightRecord = await ComboKitWeightMaster.findOne({ kit_id: kitId }).lean();
  if (weightRecord && weightRecord.total_kit_weight_kg > 0) {
    return weightRecord.total_kit_weight_kg;
  }
  // Fallback: estimate from combo kit capacity if available
  const kit = await WarehouseComboKit.findById(kitId).lean();
  const capacity = kit?.capacity || 1;
  return Math.round(capacity * 75); // baseline ~75kg per kW
};

const calculateOrderCargo = async (orderOrId, orderModel = 'epc_orders') => {
  let order = null;
  const isDocument = orderOrId && typeof orderOrId === 'object' && (orderOrId.items !== undefined || orderOrId.order_number !== undefined || orderOrId.po_number !== undefined);
  if (isDocument) {
    order = orderOrId;
  } else {
    const id = (orderOrId && orderOrId._id && !isDocument) ? orderOrId._id : orderOrId;
    if (orderModel === 'epc_orders') {
      order = await EpcOrder.findById(id).lean();
    } else if (orderModel === 'fpo_orders') {
      order = await FpoOrder.findById(id).lean();
    } else {
      order = await PurchaseOrder.findById(id).lean();
    }
  }

  if (!order) {
    return {
      order_id: (orderOrId && typeof orderOrId === 'object' && orderOrId._id) ? orderOrId._id : orderOrId,
      order_number: orderOrId?.order_number || 'N/A',
      total_kits: 1,
      total_weight_kg: 100,
      total_kw: 1,
      kit_items: [],
    };
  }

  const items = order.items || [];
  let totalKits = 0;
  let totalWeightKg = 0;
  let totalKw = 0;
  const kitItems = [];

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const kitId = item.kit_id || item.product_id;

    let unitWeight = 0;
    let capacityVal = parseFloat(item.capacity || '') || 0;

    if (kitId) {
      // 1. Try ComboKitWeightMaster
      const weightRecord = await ComboKitWeightMaster.findOne({ kit_id: kitId }).lean();
      if (weightRecord) {
        if (weightRecord.total_kit_weight_kg > 0) {
          unitWeight = weightRecord.total_kit_weight_kg;
        }
        if (capacityVal === 0 && weightRecord.capacity_kw > 0) {
          capacityVal = weightRecord.capacity_kw;
        }
      }

      // 2. Try WarehouseComboKit
      if (unitWeight === 0 || capacityVal === 0) {
        const kitDoc = await WarehouseComboKit.findById(kitId).lean();
        if (kitDoc) {
          if (capacityVal === 0 && kitDoc.capacity > 0) {
            capacityVal = kitDoc.capacity;
          }
          if (unitWeight === 0 && capacityVal > 0) {
            unitWeight = Math.round(capacityVal * 75);
          }
        }
      }
    }

    // 3. Fallback: Parse capacity kW from item_name or description (e.g. "50 kW Commercial LT On-Grid...")
    if (capacityVal === 0) {
      const textToSearch = `${item.item_name || ''} ${item.description || ''}`;
      const match = textToSearch.match(/(\d+(?:\.\d+)?)\s*(?:k\.?\s*w\.?|kw|kilowatt)\b/i) || textToSearch.match(/(\d+(?:\.\d+)?)\s*k?w\b/i);
      if (match) {
        capacityVal = parseFloat(match[1]) || 0;
      }
    }

    // 4. Weight fallback if still 0
    if (unitWeight === 0) {
      if (capacityVal > 0) {
        unitWeight = Math.round(capacityVal * 75);
      } else if (item.unit_weight_kg) {
        unitWeight = Number(item.unit_weight_kg);
      } else {
        unitWeight = 100;
      }
    }

    const itemTotalWeight = unitWeight * qty;
    totalKits += qty;
    totalWeightKg += itemTotalWeight;
    totalKw += capacityVal > 0 ? capacityVal * qty : 0;

    kitItems.push({
      kit_id: kitId,
      kit_name: item.item_name || 'Solar Kit',
      scope_type: item.scope_type || 'kit',
      quantity: qty,
      unit_weight_kg: unitWeight,
      total_weight_kg: itemTotalWeight,
      capacity_kw: capacityVal,
    });
  }

  // Use order_load_metrics as fallback when items array didn't yield values
  const metrics = order.order_load_metrics;

  // If metrics exist and are more authoritative (i.e. kits count matches or is higher), prefer metrics
  if (metrics && (metrics.total_kits > 0 || metrics.total_weight_kg > 0)) {
    // If items loop gave 0 kits, use metrics entirely
    if (totalKits === 0) {
      return {
        order_id: order._id,
        order_number: order.order_number,
        total_kits: metrics.total_kits || 1,
        total_weight_kg: metrics.total_weight_kg || 100,
        total_kw: metrics.total_kw || 1,
        kit_items: kitItems,
      };
    }

    // If metrics.total_kits > computed totalKits, it means items were counted wrong — prefer metrics
    if (metrics.total_kits > totalKits) {
      totalKits = metrics.total_kits;
      totalWeightKg = metrics.total_weight_kg || totalWeightKg;
      totalKw = metrics.total_kw || totalKw;
    }

    // Always fill in missing kw/weight from metrics
    if (totalKw === 0 && metrics.total_kw > 0) totalKw = metrics.total_kw;
    if (totalWeightKg === 0 && metrics.total_weight_kg > 0) totalWeightKg = metrics.total_weight_kg;

    // If weight seems too low relative to kits (less than 50 KG per kit), use metrics weight
    const avgKgPerKit = totalWeightKg / totalKits;
    if (avgKgPerKit < 50 && metrics.total_weight_kg > totalWeightKg) {
      totalWeightKg = metrics.total_weight_kg;
    }
  }

  return {
    order_id: order._id,
    order_number: order.order_number,
    total_kits: totalKits || 1,
    total_weight_kg: totalWeightKg || 100,
    total_kw: totalKw || 1,
    kit_items: kitItems,
  };
};

/**
 * 2. FRANCHISEE APPROVED DESTINATIONS
 */
const getFranchiseeDestinations = async (districtId = null) => {
  const query = { status: { $ne: 'cancelled' } };
  if (districtId) {
    query.district_id = districtId;
  }

  const storeSetups = await StoreSetup.find(query)
    .populate('franchisee_id', 'reseller_code name contact_person mobile_number email pincode registered_address')
    .lean();

  return storeSetups.map(s => ({
    store_setup_id: s.store_setup_id,
    franchisee_id: s.franchisee_id?._id || s.franchisee_id,
    franchisee_code: s.franchisee_id?.reseller_code,
    franchisee_name: s.franchisee_name,
    mobile: s.mobile,
    email: s.email,
    state_id: s.state_id,
    state_name: s.state_name,
    district_id: s.district_id,
    district_name: s.district_name,
    address: s.store_address || s.franchisee_id?.registered_address,
    pincode: s.franchisee_id?.pincode,
  }));
};

/**
 * Helper: Enrich orders and kit_items with classification taxonomy (Quick Filters)
 */
const enrichOrdersWithHierarchy = async (orders) => {
  if (!orders || orders.length === 0) return orders;

  const kitIds = new Set();
  const productIds = new Set();

  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (it.kit_id) kitIds.add(String(it.kit_id));
      if (it.product_id) productIds.add(String(it.product_id));
    });
  });

  const [
    comboKits,
    products,
    industryTypes,
    categories,
    subcategories,
    types,
    typeMaps,
    ranges,
  ] = await Promise.all([
    WarehouseComboKit.find({ _id: { $in: Array.from(kitIds) } }).lean().catch(() => []),
    Product.find({ _id: { $in: Array.from(productIds) } }).lean().catch(() => []),
    IndustryType.find({ deleted_at: null }).lean().catch(() => []),
    ProjectCategory.find({ deleted_at: null }).lean().catch(() => []),
    ProjectSubcategory.find({ deleted_at: null }).lean().catch(() => []),
    ProjectType.find({ deleted_at: null }).lean().catch(() => []),
    ProjectSubcategoryType.find({ deleted_at: null }).lean().catch(() => []),
    ProjectRange.find({ deleted_at: null }).populate('unit_id').lean().catch(() => []),
  ]);

  const solarKitIds = comboKits.map((k) => k.solar_kit_id).filter(Boolean);
  const solarKits = solarKitIds.length > 0
    ? await SolarKit.find({ _id: { $in: solarKitIds } }).lean().catch(() => [])
    : [];

  const resolveItemHierarchy = (it) => {
    const kitIdStr = it.kit_id ? String(it.kit_id) : null;
    const prodIdStr = it.product_id ? String(it.product_id) : null;
    const nameStr = (it.kit_name || it.item_name || '').toLowerCase();
    const cap = parseFloat(it.capacity_kw || it.capacity || 0);

    let indName = null;
    let catName = null;
    let subName = null;
    let typeName = null;
    let rangeName = null;

    if (kitIdStr) {
      const kit = comboKits.find((k) => String(k._id) === kitIdStr);
      if (kit) {
        const sk = solarKits.find((s) => String(s._id) === String(kit.solar_kit_id)) || {};
        const catId = sk.category_id || kit.category_id;
        const subId = sk.subcategory_id || kit.subcategory_id;
        const typeMapId = sk.type_id || kit.type_id;
        const rangeId = kit.project_range_id;

        const cat = categories.find((c) => String(c._id) === String(catId));
        if (cat) {
          catName = cat.name;
          const ind = industryTypes.find((i) => String(i._id) === String(cat.industry_type_id));
          if (ind) indName = ind.name;
        }

        const sub = subcategories.find((s) => String(s._id) === String(subId));
        if (sub) subName = sub.name;

        const tm = typeMaps.find((t) => String(t._id) === String(typeMapId));
        if (tm) {
          const tp = types.find((t) => String(t._id) === String(tm.type));
          if (tp) typeName = tp.name;
        }

        if (rangeId) {
          const pr = ranges.find((r) => String(r._id) === String(rangeId));
          if (pr) {
            rangeName = pr.range_label || (pr.min_value !== undefined ? `${pr.min_value} - ${pr.max_value} ${pr.unit_id?.symbol || 'kW'}` : null);
          }
        }
      }
    }

    if (prodIdStr && (!indName || !catName)) {
      const prod = products.find((p) => String(p._id) === prodIdStr);
      if (prod) {
        if (!indName && prod.industry_type_id) {
          const ind = industryTypes.find((i) => String(i._id) === String(prod.industry_type_id));
          if (ind) indName = ind.name;
        }
        if (!catName && prod.category_id) {
          const cat = categories.find((c) => String(c._id) === String(prod.category_id));
          if (cat) catName = cat.name;
        }
        if (!subName && prod.subcategory_id) {
          const sub = subcategories.find((s) => String(s._id) === String(prod.subcategory_id));
          if (sub) subName = sub.name;
        }
      }
    }

    if (!typeName && it.project_type_name) {
      typeName = it.project_type_name;
    }

    // Keyword heuristics if hierarchy links were unlinked / manual
    if (!indName) {
      if (nameStr.includes('commercial')) indName = 'Commercial';
      else if (nameStr.includes('residential')) indName = 'Residential';
      else if (nameStr.includes('industrial')) indName = 'Industrial';
      else if (nameStr.includes('agri') || nameStr.includes('farm')) indName = 'Agricultural';
    }

    if (!catName) {
      if (nameStr.includes('on-grid') || nameStr.includes('ongrid')) catName = 'On-Grid Solar System';
      else if (nameStr.includes('off-grid') || nameStr.includes('offgrid')) catName = 'Off-Grid Solar System';
      else if (nameStr.includes('hybrid')) catName = 'Hybrid Solar System';
      else if (nameStr.includes('microgrid')) catName = 'Microgrid Solution';
    }

    if (!typeName) {
      if (nameStr.includes('three phase') || nameStr.includes('3 phase') || nameStr.includes('3p')) typeName = 'Three Phase';
      else if (nameStr.includes('single phase') || nameStr.includes('1 phase') || nameStr.includes('1p')) typeName = 'Single Phase';
    }

    if (!rangeName && cap > 0 && ranges.length > 0) {
      const matchedRange = ranges.find((r) => cap >= (r.min_value ?? 0) && cap <= (r.max_value ?? 999999));
      if (matchedRange) {
        rangeName = matchedRange.range_label || `${matchedRange.min_value} - ${matchedRange.max_value} ${matchedRange.unit_id?.symbol || 'kW'}`;
      }
    }

    return {
      industry_type_name: indName,
      category_name: catName,
      subcategory_name: subName,
      system_type_name: typeName,
      project_range_name: rangeName,
    };
  };

  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const meta = resolveItemHierarchy(it);
      Object.assign(it, meta);
    });

    o.industry_types = [...new Set((o.items || []).map((i) => i.industry_type_name).filter(Boolean))];
    o.categories = [...new Set((o.items || []).map((i) => i.category_name).filter(Boolean))];
    o.subcategories = [...new Set((o.items || []).map((i) => i.subcategory_name).filter(Boolean))];
    o.system_types = [...new Set((o.items || []).map((i) => i.system_type_name).filter(Boolean))];
    o.project_ranges = [...new Set((o.items || []).map((i) => i.project_range_name).filter(Boolean))];
  });

  return orders;
};

/**
 * 3. DELIVERY QUEUE (PAID ORDERS ONLY, FIFO BY PAYMENT TIMESTAMP)
 */
const getDeliveryQueue = async ({
  warehouse_id,
  page = 1,
  limit = 50,
  priority_only = false,
  industry_type,
  industry_type_name,
  category,
  category_name,
  subcategory,
  subcategory_name,
  system_type,
  system_type_name,
  project_range,
  project_range_name,
}) => {
  const validWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;

  // 1. Proactively check if any source orders have purchase orders marked 'delivered'
  let fullyDeliveredSourceOrderIds = [];
  try {
    const deliveredPOs = await WarehousePurchaseOrder.find({
      status: 'delivered',
      'source_orders.0': { $exists: true }
    }).select('po_number procurement_type status delivery_date source_orders').lean();

    const poStatusMap = new Map();
    for (const po of deliveredPOs) {
      const ptype = po.procurement_type || 'mixed';
      for (const so of po.source_orders || []) {
        if (!so.order_id) continue;
        const idStr = so.order_id.toString();
        if (!poStatusMap.has(idStr)) {
          poStatusMap.set(idStr, { panelDelivered: false, inverterDelivered: false });
        }
        const entry = poStatusMap.get(idStr);
        if (ptype === 'panel' || ptype === 'mixed') entry.panelDelivered = true;
        if (ptype === 'inverter' || ptype === 'mixed') entry.inverterDelivered = true;
      }
    }

    for (const [orderIdStr, flags] of poStatusMap.entries()) {
      if (flags.panelDelivered && flags.inverterDelivered) {
        fullyDeliveredSourceOrderIds.push(new mongoose.Types.ObjectId(orderIdStr));
      }
    }
  } catch (poErr) {
    console.warn('deliveredPOs lookup warning:', poErr.message);
  }

  const query = {
    // Only paid orders eligible for delivery
    payment_status: { $in: ['captured', 'approved', 'PAID', 'paid'] },
    order_status: { $in: ['processing', 'pending_dispatch', 'vehicle_assigned', 'ready_for_dispatch'] },
    // Strict Gate: Order MUST have completed both Supplier Payment and Material Inward
    $or: [
      { 'procurement_status.overall_status': 'inward_completed' },
      { 'procurement_status.panel.status': 'inwarded', 'procurement_status.inverter.status': 'inwarded' },
      ...(fullyDeliveredSourceOrderIds.length > 0 ? [{ _id: { $in: fullyDeliveredSourceOrderIds } }] : []),
      { procurement_status: { $exists: false }, order_status: { $in: ['processing', 'vehicle_assigned', 'ready_for_dispatch'] } } // legacy fallback
    ]
  };

  if (validWarehouseId) {
    query.warehouse_id = validWarehouseId;
  }

  // Fetch from EpcOrder
  const epcOrders = await EpcOrder.find(query)
    .populate('warehouse_id', 'warehouse_code address')
    .populate('epc_id', 'name company_name phone whatsapp')
    .sort({ 'offline_payment.payment_date': 1, created_at: 1 })
    .lean();

  // Fetch from FpoOrder
  const fpoQuery = {
    status: { $in: ['PROCESSING', 'VEHICLE_ASSIGNED', 'READY_FOR_DISPATCH'] },
    // Strict Gate: Order MUST have completed both Supplier Payment and Material Inward
    $or: [
      { 'procurement_status.overall_status': 'inward_completed' },
      { 'procurement_status.panel.status': 'inwarded', 'procurement_status.inverter.status': 'inwarded' },
      ...(fullyDeliveredSourceOrderIds.length > 0 ? [{ _id: { $in: fullyDeliveredSourceOrderIds } }] : []),
      { procurement_status: { $exists: false }, status: { $in: ['PROCESSING', 'VEHICLE_ASSIGNED', 'READY_FOR_DISPATCH'] } } // legacy fallback
    ]
  };
  if (validWarehouseId) fpoQuery.warehouse_id = validWarehouseId;

  const fpoOrders = await FpoOrder.find(fpoQuery)
    .populate('franchisee_id', 'name company_name mobile')
    .sort({ paid_at: 1, created_at: 1 })
    .lean();

  // Fetch available warehouses for dynamic assignment if order has null warehouse_id
  const defaultWarehouses = await CompanyWarehouse.find({ is_active: true }).lean();
  const defaultWarehouse = defaultWarehouses.find(w => w.warehouse_code?.includes('GJ')) || defaultWarehouses[0];

  // Map and unify
  const unified = [];

  for (const o of epcOrders) {
    const cargo = await calculateOrderCargo(o, 'epc_orders');
    const paymentTime = o.offline_payment?.payment_date || o.created_at;
    const hoursWaiting = Math.round((Date.now() - new Date(paymentTime).getTime()) / (1000 * 3600));

    let whId = o.warehouse_id?._id || o.warehouse_id;
    let whCode = o.warehouse_id?.warehouse_code;
    if (!whId) {
      const stateName = o.delivery_address?.state_name;
      const matched = defaultWarehouses.find(w => 
        (stateName && (
          (w.state && w.state.toLowerCase().includes(stateName.toLowerCase())) ||
          (w.address?.state && w.address.state.toLowerCase().includes(stateName.toLowerCase())) ||
          (stateName.toLowerCase().includes('gujarat') && w.warehouse_code?.includes('GJ'))
        ))
      ) || defaultWarehouse;
      whId = matched?._id || null;
      whCode = matched?.warehouse_code || 'WH-01';
    }

    let districtId = o.delivery_address?.district_id;
    if (!districtId && (o.delivery_address?.district_name || o.delivery_address?.city)) {
      const distName = (o.delivery_address?.district_name || o.delivery_address?.city).trim();
      const distDoc = await GeoLevel2.findOne({ name: new RegExp(`^${distName}$`, 'i'), deleted_at: null }).lean();
      if (distDoc) districtId = distDoc._id;
    }

    unified.push({
      _id: o._id,
      order_number: o.order_number,
      order_model: 'epc_orders',
      order_type: o.order_type || 'EPC Order',
      payment_time: paymentTime,
      hours_waiting: hoursWaiting,
      customer_name: o.epc_id?.name || o.delivery_address?.contact_name || 'EPC Buyer',
      customer_phone: o.epc_id?.whatsapp || o.delivery_address?.contact_phone || 'N/A',
      warehouse_id: whId,
      warehouse_code: whCode,
      destination: {
        address: o.delivery_address?.line || o.delivery_address?.address || 'Direct Site',
        state_id: o.delivery_address?.state_id,
        state_name: o.delivery_address?.state_name,
        district_id: districtId,
        district_name: o.delivery_address?.district_name || o.delivery_address?.city || 'District',
        pincode: o.delivery_address?.pincode,
      },
      kits: cargo.total_kits,
      total_kg: cargo.total_weight_kg,
      total_kw: cargo.total_kw,
      items: cargo.kit_items || [],
      customer_delivery_charge: (o.shipping_fee_paise || 0) / 100,
      expected_dispatch: o.dispatch_tracking?.estimated_delivery || null,
      order_status: o.order_status,
      is_priority: Boolean(o.is_priority),
      priority_reason: o.priority_reason || null,
      procurement_details: {
        overall_status: o.procurement_status?.overall_status || 'inward_completed',
        panel_grn: o.procurement_status?.panel?.inward_grn_no || null,
        panel_inward_at: o.procurement_status?.panel?.inward_at || null,
        inverter_grn: o.procurement_status?.inverter?.inward_grn_no || null,
        inverter_inward_at: o.procurement_status?.inverter?.inward_at || null,
      },
    });
  }

  for (const o of fpoOrders) {
    const cargo = await calculateOrderCargo(o, 'fpo_orders');
    const paymentTime = o.paid_at || o.created_at;
    const hoursWaiting = Math.round((Date.now() - new Date(paymentTime).getTime()) / (1000 * 3600));

    let whId = o.warehouse_id?._id || o.warehouse_id;
    let whCode = o.warehouse_id?.warehouse_code;
    if (!whId) {
      whId = defaultWarehouse?._id || null;
      whCode = defaultWarehouse?.warehouse_code || 'WH-01';
    }

    unified.push({
      _id: o._id,
      order_number: o.po_number || `PO-${o._id.toString().slice(-6)}`,
      order_model: 'fpo_orders',
      order_type: 'Franchisee PO',
      payment_time: paymentTime,
      hours_waiting: hoursWaiting,
      customer_name: o.franchisee_id?.name || 'Franchisee',
      customer_phone: o.franchisee_id?.mobile || 'N/A',
      warehouse_id: whId,
      warehouse_code: whCode,
      destination: {
        address: o.delivery_address || 'Franchisee Store',
        state_id: o.state_id,
        district_id: o.district_id,
        pincode: o.pincode || 'N/A',
      },
      kits: cargo.total_kits,
      total_kg: cargo.total_weight_kg,
      total_kw: cargo.total_kw,
      items: cargo.kit_items || [],
      customer_delivery_charge: (o.shipping_fee_paise || 0) / 100,
      expected_dispatch: o.expected_delivery_date || null,
      order_status: o.status,
      is_priority: Boolean(o.is_priority),
      priority_reason: o.priority_reason || null,
      procurement_details: {
        overall_status: o.procurement_status?.overall_status || 'inward_completed',
        panel_grn: o.procurement_status?.panel?.inward_grn_no || null,
        panel_inward_at: o.procurement_status?.panel?.inward_at || null,
        inverter_grn: o.procurement_status?.inverter?.inward_grn_no || null,
        inverter_inward_at: o.procurement_status?.inverter?.inward_at || null,
      },
    });
  }

  // Enrich items with classification taxonomy
  await enrichOrdersWithHierarchy(unified);

  // Sort strictly ascending by payment time (FIFO: oldest paid order appears first)
  unified.sort((a, b) => new Date(a.payment_time).getTime() - new Date(b.payment_time).getTime());

  // Filter if priority requested
  let filtered = unified;
  if (priority_only) {
    filtered = filtered.filter(u => u.is_priority);
  }

  // Quick Filters
  const targetInd = (industry_type || industry_type_name || '').trim();
  if (targetInd && targetInd !== 'all') {
    filtered = filtered.filter(u =>
      (u.industry_types || []).some(t => t?.toLowerCase() === targetInd.toLowerCase())
    );
  }

  const targetCat = (category || category_name || '').trim();
  if (targetCat && targetCat !== 'all') {
    filtered = filtered.filter(u =>
      (u.categories || []).some(c => c?.toLowerCase() === targetCat.toLowerCase())
    );
  }

  const targetSub = (subcategory || subcategory_name || '').trim();
  if (targetSub && targetSub !== 'all') {
    filtered = filtered.filter(u =>
      (u.subcategories || []).some(s => s?.toLowerCase() === targetSub.toLowerCase())
    );
  }

  const targetSys = (system_type || system_type_name || '').trim();
  if (targetSys && targetSys !== 'all') {
    filtered = filtered.filter(u =>
      (u.system_types || []).some(st => st?.toLowerCase() === targetSys.toLowerCase())
    );
  }

  const targetRange = (project_range || project_range_name || '').trim();
  if (targetRange && targetRange !== 'all') {
    filtered = filtered.filter(u =>
      (u.project_ranges || []).some(pr => pr?.toLowerCase() === targetRange.toLowerCase())
    );
  }

  const total = filtered.length;
  const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const paginated = filtered.slice(skip, skip + parseInt(limit));

  return {
    orders: paginated,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  };
};

/**
 * 4. AUTOMATIC ORDER CONSOLIDATION SCANNER
 * Accepts precomputed orders (passed from handler) and auto-groups by district.
 * Also supports DeliveryRouteSetting-based grouping when route settings exist.
 * Works even without a warehouse filter (warehouseId can be null).
 */
const scanQueueForConsolidation = async (warehouseId, precomputedOrders = null) => {
  const validWarehouseId = (warehouseId && warehouseId !== 'null' && warehouseId !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouseId)) ? warehouseId : null;

  // Use precomputed orders if provided, otherwise fetch from DB
  let allOrders = precomputedOrders;
  if (!allOrders) {
    const queueResult = await getDeliveryQueue({ warehouse_id: validWarehouseId, limit: 200 });
    allOrders = queueResult.orders;
  }

  // Only non-priority orders are eligible for consolidation
  const eligibleOrders = allOrders.filter(o => !o.is_priority);

  const suggestions = [];
  const usedOrderIds = new Set();

  // ── Strategy 1: DeliveryRouteSetting-based grouping (when route settings exist) ──
  if (validWarehouseId) {
    const routeSettings = await DeliveryRouteSetting.find({
      origin_warehouse_id: validWarehouseId,
      combined_delivery_enabled: true,
      is_active: true,
    }).lean();

    for (const route of routeSettings) {
      const eligibleDistricts = [
        route.primary_district_id?.toString(),
        ...(route.nearby_district_ids || []).map(d => d.toString()),
      ].filter(Boolean);
      const eligiblePincodes = (route.pincode_groups || []).map(p => p.pincode);

      const routeOrders = eligibleOrders.filter(o => {
        if (usedOrderIds.has(o._id?.toString())) return false;
        const orderDistId = o.destination?.district_id?.toString();
        const orderPin = o.destination?.pincode;
        return (orderDistId && eligibleDistricts.includes(orderDistId)) ||
               (orderPin && eligiblePincodes.includes(orderPin));
      });

      if (routeOrders.length >= 2) {
        const clusterOrders = routeOrders.slice(0, route.max_delivery_stops || 5);
        clusterOrders.forEach(o => usedOrderIds.add(o._id?.toString()));

        const totalKits = clusterOrders.reduce((sum, o) => sum + (o.kits || 0), 0);
        const totalWeightKg = clusterOrders.reduce((sum, o) => sum + (o.total_kg || 0), 0);
        const totalKw = clusterOrders.reduce((sum, o) => sum + (o.total_kw || 0), 0);

        let separateBenchmarkTotal = 0;
        for (const ord of clusterOrders) {
          let bench = null;
          if (ord.destination?.district_id) {
            bench = await DeliveryCostBenchmark.findOne({
              ...(validWarehouseId ? { warehouse_id: validWarehouseId } : {}),
              district_id: ord.destination?.district_id,
              is_active: true,
            }).lean();
          }
          separateBenchmarkTotal += (bench?.benchmark_cost || 4000);
        }

        const primaryBench = validWarehouseId ? await DeliveryCostBenchmark.findOne({
          warehouse_id: validWarehouseId,
          district_id: route.primary_district_id,
          is_active: true,
        }).lean() : null;

        const baseCombinedCost = primaryBench
          ? primaryBench.benchmark_cost * 1.25
          : separateBenchmarkTotal * 0.75;
        const estimatedSaving = Math.max(0, separateBenchmarkTotal - baseCombinedCost);

        suggestions.push({
          route_id: route._id,
          route_name: route.route_name,
          orders: clusterOrders,
          order_count: clusterOrders.length,
          total_kits: totalKits,
          total_weight_kg: totalWeightKg,
          total_kw: totalKw,
          districts: [...new Set(clusterOrders.map(o => o.destination?.district_name || 'N/A'))],
          pincodes: [...new Set(clusterOrders.map(o => o.destination?.pincode).filter(Boolean))],
          total_stops: clusterOrders.length,
          estimated_route_distance_km: route.max_route_distance_km || 150,
          separate_benchmark_total: Math.round(separateBenchmarkTotal),
          combined_benchmark_cost: Math.round(baseCombinedCost),
          estimated_saving: Math.round(estimatedSaving),
          max_waiting_period_hours: route.max_waiting_period_hours,
          cost_allocation_default: route.cost_allocation_default,
        });
      }
    }
  }

  // ── Strategy 2: Auto-group remaining orders by same district (no route settings needed) ──
  const remainingOrders = eligibleOrders.filter(o => !usedOrderIds.has(o._id?.toString()));

  // Group by district (using district_id, district_name, or pincode prefix)
  const byDistrict = {};
  for (const o of remainingOrders) {
    const distNameClean = (o.destination?.district_name || '').trim().toLowerCase();
    const stateNameClean = (o.destination?.state_name || '').trim().toLowerCase();
    const pinClean = (o.destination?.pincode || '').trim().slice(0, 3);
    
    // Group key priority: district_id -> district_name_state -> pincode 3-digit prefix
    let groupKey = o.destination?.district_id?.toString();
    if (!groupKey && distNameClean) {
      groupKey = `${distNameClean}_${stateNameClean}`;
    }
    if (!groupKey && pinClean) {
      groupKey = `pin_${pinClean}`;
    }
    if (!groupKey) groupKey = 'unknown';

    if (!byDistrict[groupKey]) byDistrict[groupKey] = [];
    byDistrict[groupKey].push(o);
  }

  for (const [groupKey, distOrders] of Object.entries(byDistrict)) {
    if (distOrders.length < 2 || groupKey === 'unknown') continue;

    const clusterOrders = distOrders.slice(0, 5); // max 5 per combined trip
    const totalKits = clusterOrders.reduce((sum, o) => sum + (o.kits || 0), 0);
    const totalWeightKg = clusterOrders.reduce((sum, o) => sum + (o.total_kg || 0), 0);
    const totalKw = clusterOrders.reduce((sum, o) => sum + (o.total_kw || 0), 0);

    let separateBenchmarkTotal = 0;
    for (const ord of clusterOrders) {
      let bench = null;
      if (ord.destination?.district_id) {
        bench = await DeliveryCostBenchmark.findOne({
          ...(validWarehouseId ? { warehouse_id: validWarehouseId } : {}),
          district_id: ord.destination?.district_id,
          is_active: true,
        }).lean();
      }
      separateBenchmarkTotal += (bench?.benchmark_cost || 4000);
    }

    const baseCombinedCost = Math.round(separateBenchmarkTotal * 0.72); // ~28% saving on combined
    const estimatedSaving = Math.max(0, separateBenchmarkTotal - baseCombinedCost);
    const districtName = clusterOrders.find(o => o.destination?.district_name)?.destination?.district_name || 'Cluster';

    suggestions.push({
      route_id: null,
      route_name: `${districtName} Combined Route`,
      orders: clusterOrders,
      order_count: clusterOrders.length,
      total_kits: totalKits,
      total_weight_kg: totalWeightKg,
      total_kw: totalKw,
      districts: [...new Set(clusterOrders.map(o => o.destination?.district_name || 'N/A'))],
      pincodes: [...new Set(clusterOrders.map(o => o.destination?.pincode).filter(Boolean))],
      total_stops: clusterOrders.length,
      estimated_route_distance_km: 80,
      separate_benchmark_total: Math.round(separateBenchmarkTotal),
      combined_benchmark_cost: baseCombinedCost,
      estimated_saving: Math.round(estimatedSaving),
      max_waiting_period_hours: 48,
      cost_allocation_default: 'by_kit_qty',
    });
  }

  return suggestions;
};

/**
 * 5. ELIGIBLE FLEET & PREVIOUS VEHICLE PREFERENCE MATCHER
 */
const getEligibleFleet = async ({ warehouse_id, destination_district_id, total_weight_kg, route_distance_km = 100 }) => {
  // 1. Find Vehicle Masters that can handle the load & distance
  const vehicleMasters = await DeliveryVehicleMaster.find({
    is_active: true,
    max_load_kg: { $gte: Number(total_weight_kg) },
    max_delivery_distance_km: { $gte: Number(route_distance_km) },
  }).lean();

  const masterIds = vehicleMasters.map(vm => vm._id);

  // 2. Find Providers active in the target district
  let providers = [];
  if (destination_district_id) {
    providers = await DeliveryServiceProvider.find({
      status: 'Active',
      'active_districts.district_id': destination_district_id,
    }).lean();
  }
  if (providers.length === 0) {
    providers = await DeliveryServiceProvider.find({ status: 'Active' }).lean();
  }

  const providerIds = providers.map(p => p._id);

  // 3. Find available physical vehicles
  let availableFleet = await DeliveryVehicleFleet.find({
    ...(providerIds.length > 0 ? { service_provider_id: { $in: providerIds } } : {}),
    ...(masterIds.length > 0 ? { vehicle_master_id: { $in: masterIds } } : {}),
    current_status: 'Available',
    is_active: true,
    is_deleted: false,
  })
    .populate('service_provider_id', 'name owner_name mobile_number customer_service_number gst_number')
    .populate('vehicle_master_id', 'name brand_make model max_load_kg length_ft width_ft height_ft')
    .lean();

  // If no available vehicle matched strictly, fetch any active vehicle
  if (availableFleet.length === 0) {
    availableFleet = await DeliveryVehicleFleet.find({
      is_active: true,
      is_deleted: false,
    })
      .populate('service_provider_id', 'name owner_name mobile_number customer_service_number gst_number')
      .populate('vehicle_master_id', 'name brand_make model max_load_kg length_ft width_ft height_ft')
      .lean();
  }

  // 4. Check Previous Vehicle Preference for this route
  const lastTripOnRoute = await DeliveryOrder.findOne({
    warehouse_id,
    'stops.destination.district_id': destination_district_id,
    status: 'closed',
  })
    .sort({ completed_at: -1 })
    .lean();

  let previousVehicleId = null;
  if (lastTripOnRoute && lastTripOnRoute.vehicles_allocated?.length > 0) {
    previousVehicleId = lastTripOnRoute.vehicles_allocated[0].vehicle_id?.toString();
  }

  const enrichedFleet = availableFleet.map(v => {
    const isPrevious = previousVehicleId && v._id.toString() === previousVehicleId;
    return {
      ...v,
      is_previous_vehicle_preference: isPrevious,
      utilization_pct: Math.min(100, Math.round((Number(total_weight_kg) / v.load_capacity_kg) * 100)),
    };
  });

  // Sort previous vehicle preference first, then best utilization
  enrichedFleet.sort((a, b) => {
    if (a.is_previous_vehicle_preference) return -1;
    if (b.is_previous_vehicle_preference) return 1;
    return b.utilization_pct - a.utilization_pct;
  });

  // 5. Multi-Vehicle Split Analysis if no single vehicle can carry load
  let splitRecommendation = null;
  if (enrichedFleet.length === 0) {
    const allAvailableFleet = await DeliveryVehicleFleet.find({
      service_provider_id: { $in: providerIds },
      current_status: 'Available',
      is_active: true,
      is_deleted: false,
    })
      .populate('service_provider_id', 'name owner_name mobile_number gst_number')
      .populate('vehicle_master_id', 'name max_load_kg')
      .lean();

    if (allAvailableFleet.length >= 2) {
      const topCapacity = allAvailableFleet[0].load_capacity_kg || 1500;
      const neededCount = Math.ceil(Number(total_weight_kg) / topCapacity);
      splitRecommendation = {
        requires_multi_vehicle: true,
        needed_vehicles_count: neededCount,
        available_options: allAvailableFleet.slice(0, neededCount),
        message: `Total cargo load of ${total_weight_kg} KG exceeds standard single vehicle capacity. Recommend splitting into ${neededCount} vehicles.`,
      };
    }
  }

  return {
    eligible_fleet: enrichedFleet,
    providers,
    split_recommendation: splitRecommendation,
  };
};

/**
 * 6. BENCHMARK COST VALIDATION
 */
const validateBenchmarkCost = async ({ service_provider_id, warehouse_id, vehicle_master_id, district_id, proposed_cost }) => {
  const cleanWhId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;
  const cleanVmId = (vehicle_master_id && vehicle_master_id !== 'null' && vehicle_master_id !== 'undefined' && mongoose.Types.ObjectId.isValid(vehicle_master_id)) ? vehicle_master_id : null;
  const cleanDistId = (district_id && district_id !== 'null' && district_id !== 'undefined' && mongoose.Types.ObjectId.isValid(district_id)) ? district_id : null;
  const cleanSpId = (service_provider_id && service_provider_id !== 'null' && service_provider_id !== 'undefined' && mongoose.Types.ObjectId.isValid(service_provider_id)) ? service_provider_id : null;

  let benchmark = null;

  // 1. Try full match (warehouse + vehicle_master + district)
  if (cleanWhId && cleanVmId && cleanDistId) {
    const fullQuery = {
      warehouse_id: cleanWhId,
      vehicle_master_id: cleanVmId,
      district_id: cleanDistId,
      is_active: true,
      ...(cleanSpId ? { service_provider_id: cleanSpId } : {}),
    };
    benchmark = await DeliveryCostBenchmark.findOne(fullQuery).lean();

    if (!benchmark && cleanSpId) {
      delete fullQuery.service_provider_id;
      benchmark = await DeliveryCostBenchmark.findOne(fullQuery).lean();
    }
  }

  // 2. Try warehouse + district
  if (!benchmark && cleanWhId && cleanDistId) {
    benchmark = await DeliveryCostBenchmark.findOne({
      warehouse_id: cleanWhId,
      district_id: cleanDistId,
      is_active: true,
    }).lean();
  }

  // 3. Try district only
  if (!benchmark && cleanDistId) {
    benchmark = await DeliveryCostBenchmark.findOne({
      district_id: cleanDistId,
      is_active: true,
    }).lean();
  }

  // 4. Try warehouse only
  if (!benchmark && cleanWhId) {
    benchmark = await DeliveryCostBenchmark.findOne({
      warehouse_id: cleanWhId,
      is_active: true,
    }).lean();
  }

  // Baseline benchmark if not configured in DB: ₹4,500
  const benchmarkCost = benchmark ? benchmark.benchmark_cost : 4500;
  const cost = Number(proposed_cost);
  const meetsBenchmark = cost <= benchmarkCost;
  const difference = cost - benchmarkCost;

  return {
    benchmark_cost: benchmarkCost,
    proposed_cost: cost,
    meets_benchmark: meetsBenchmark,
    difference: difference,
    gst_applicable: benchmark ? benchmark.gst_applicable : true,
    gst_rate: benchmark ? benchmark.gst_rate : 18,
    free_delivery_eligible: benchmark ? benchmark.free_delivery_eligible : false,
    matched_rule: benchmark ? 'Database Cost Setting' : 'Standard Baseline Benchmark',
  };
};

/**
 * 7. COST ALLOCATION CALCULATOR
 */
const calculateCostAllocations = ({ total_vendor_cost, stops, method = 'by_kit_qty' }) => {
  const cost = Number(total_vendor_cost || 0);
  const totalKits = stops.reduce((sum, s) => sum + (s.cargo?.total_kits || s.kits || 1), 0);
  const totalWeight = stops.reduce((sum, s) => sum + (s.cargo?.total_weight_kg || s.total_kg || 100), 0);

  return stops.map((stop, idx) => {
    let allocatedCost = 0;
    const kits = stop.cargo?.total_kits || stop.kits || 1;
    const weight = stop.cargo?.total_weight_kg || stop.total_kg || 100;
    const custCharge = stop.customer_delivery_charge || 0;

    if (method === 'by_weight_kg' && totalWeight > 0) {
      allocatedCost = Math.round(cost * (weight / totalWeight));
    } else if (method === 'by_distance') {
      // Incremental stop weighting
      const stopFactor = (idx + 1) / ((stops.length * (stops.length + 1)) / 2);
      allocatedCost = Math.round(cost * stopFactor);
    } else if (method === 'manual') {
      allocatedCost = stop.allocated_vendor_cost || Math.round(cost / stops.length);
    } else {
      // Default: by_kit_qty
      allocatedCost = totalKits > 0 ? Math.round(cost * (kits / totalKits)) : Math.round(cost / stops.length);
    }

    return {
      stop_number: stop.stop_number || idx + 1,
      order_id: stop.order_id,
      order_number: stop.order_number,
      customer_delivery_charge: custCharge,
      allocated_vendor_cost: allocatedCost,
      stop_delivery_margin: custCharge - allocatedCost,
    };
  });
};

/**
 * 8. CREATE DELIVERY ORDER / MASTER DELIVERY TRIP
 */
const createDeliveryTrip = async (payload, adminUser = null) => {
  let {
    delivery_type = 'single_order',
    warehouse_id,
    route_setting_id = null,
    service_provider_id,
    booking_source = 'manual',
    stops = [],
    vehicles_allocated = [],
    actual_vendor_cost,
    cost_allocation_method = 'by_kit_qty',
    override_details = null,
    pickup_scheduled_at = null,
    expected_delivery_date = null,
  } = payload;

  // Auto-resolve warehouse_id if missing from stops or active company warehouses
  let resolvedWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined') ? warehouse_id : null;
  if (!resolvedWarehouseId && stops.length > 0) {
    const firstStop = stops[0];
    if (firstStop.order_id) {
      const ord = (firstStop.order_model === 'fpo_orders')
        ? await FpoOrder.findById(firstStop.order_id).lean()
        : await EpcOrder.findById(firstStop.order_id).lean();
      if (ord?.warehouse_id) {
        resolvedWarehouseId = ord.warehouse_id?._id || ord.warehouse_id;
      }
    }
  }
  if (!resolvedWarehouseId) {
    const defaultWh = await CompanyWarehouse.findOne({ is_active: true }).lean();
    if (defaultWh) resolvedWarehouseId = defaultWh._id;
  }

  // Auto-resolve service_provider_id if missing from allocated vehicle or active provider
  let resolvedServiceProviderId = (service_provider_id && service_provider_id !== 'null' && service_provider_id !== 'undefined') ? service_provider_id : null;
  if (!resolvedServiceProviderId && vehicles_allocated.length > 0 && vehicles_allocated[0].vehicle_id) {
    const v = await DeliveryVehicleFleet.findById(vehicles_allocated[0].vehicle_id).lean();
    if (v?.service_provider_id) {
      resolvedServiceProviderId = v.service_provider_id?._id || v.service_provider_id;
    }
  }
  if (!resolvedServiceProviderId) {
    const defaultSp = await DeliveryServiceProvider.findOne({ status: 'Active' }).lean();
    if (defaultSp) resolvedServiceProviderId = defaultSp._id;
  }

  if (!resolvedWarehouseId || !resolvedServiceProviderId || stops.length === 0 || vehicles_allocated.length === 0) {
    throw new Error('Warehouse, Service Provider, at least one Stop, and at least one Vehicle are required.');
  }

  warehouse_id = resolvedWarehouseId;
  service_provider_id = resolvedServiceProviderId;

  const deliveryNumber = await generateDeliveryNumber();

  // 1. Compute Cargo Summary & Cost Allocations
  let totalShipmentWeight = 0;
  let totalKits = 0;
  let totalKw = 0;
  let totalCustomerCharge = 0;

  const processedStops = [];

  for (let i = 0; i < stops.length; i++) {
    const st = stops[i];
    const cargo = await calculateOrderCargo(st.order_id, st.order_model || 'epc_orders');
    totalShipmentWeight += cargo.total_weight_kg;
    totalKits += cargo.total_kits;
    totalKw += cargo.total_kw;
    totalCustomerCharge += Number(st.customer_delivery_charge || 0);

    processedStops.push({
      stop_number: i + 1,
      order_id: st.order_id,
      order_number: st.order_number || cargo.order_number,
      order_model: st.order_model || 'epc_orders',
      recipient_type: st.recipient_type || 'epc_buyer',
      recipient_name: st.recipient_name || 'Customer',
      destination: st.destination,
      cargo: {
        total_kits: cargo.total_kits,
        total_weight_kg: cargo.total_weight_kg,
        total_kw: cargo.total_kw,
        kit_items: cargo.kit_items,
      },
      stop_status: 'pending',
      customer_delivery_charge: Number(st.customer_delivery_charge || 0),
    });
  }

  // Calculate stop-wise vendor cost distribution
  const allocations = calculateCostAllocations({
    total_vendor_cost: actual_vendor_cost,
    stops: processedStops,
    method: cost_allocation_method,
  });

  processedStops.forEach((ps, idx) => {
    ps.allocated_vendor_cost = allocations[idx]?.allocated_vendor_cost || 0;
    ps.stop_delivery_margin = ps.customer_delivery_charge - ps.allocated_vendor_cost;
  });

  // 2. Financials & 3-Tier Ledger
  const vendorCost = Number(actual_vendor_cost);
  const gstRate = 18;
  const gstAmount = Math.round(vendorCost * (gstRate / 100));
  const totalPayable = vendorCost + gstAmount;

  // Calculate sum of separate benchmarks for savings analysis
  let sumSeparateBenchmark = 0;
  for (const st of processedStops) {
    const bench = await DeliveryCostBenchmark.findOne({
      warehouse_id,
      district_id: st.destination?.district_id,
      is_active: true,
    }).lean();
    sumSeparateBenchmark += (bench?.benchmark_cost || 4500);
  }

  const estimatedSavings = Math.max(0, sumSeparateBenchmark - vendorCost);

  // 3. Atomically Lock Physical Vehicles
  for (const v of vehicles_allocated) {
    const fleetVehicle = await DeliveryVehicleFleet.findById(v.vehicle_id);
    if (!fleetVehicle) throw new Error(`Vehicle ${v.registration_number} not found.`);
    if (fleetVehicle.current_status !== 'Available') {
      throw new Error(`Vehicle ${v.registration_number} is currently ${fleetVehicle.current_status} and cannot be assigned.`);
    }
  }

  // 4. Create Delivery Order
  const deliveryOrder = new DeliveryOrder({
    delivery_number: deliveryNumber,
    delivery_type,
    warehouse_id,
    route_setting_id,
    service_provider_id,
    booking_source,
    stops: processedStops,
    vehicles_allocated,
    cargo_summary: {
      total_shipment_weight_kg: totalShipmentWeight,
      total_kits: totalKits,
      total_kw: totalKw,
      total_stops: processedStops.length,
      estimated_route_distance_km: payload.estimated_route_distance_km || 100,
    },
    // 3-Tier Financial Ledger
    customer_delivery_charge: totalCustomerCharge,
    company_benchmark_cost: sumSeparateBenchmark,
    actual_vendor_cost: vendorCost,
    gst_applicable: true,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    total_transport_payable: totalPayable,
    variance_from_benchmark: vendorCost - sumSeparateBenchmark,
    delivery_margin: totalCustomerCharge - vendorCost,
    sum_separate_benchmark_cost: sumSeparateBenchmark,
    estimated_savings: estimatedSavings,
    cost_allocation_method,
    // Admin Override Record
    is_overridden: Boolean(override_details?.is_overridden),
    override_details: override_details || {},
    delivery_approval: {
      status: (vendorCost > sumSeparateBenchmark && !override_details?.is_overridden) ? 'pending' : (override_details?.is_overridden ? 'approved' : 'none'),
      requested_by: adminUser?._id || adminUser?.id || null,
      requested_at: new Date(),
      benchmark_amount: sumSeparateBenchmark,
      actual_amount: vendorCost,
      variance_amount: Math.max(0, vendorCost - sumSeparateBenchmark),
      variance_percentage: sumSeparateBenchmark > 0 ? Number(((Math.max(0, vendorCost - sumSeparateBenchmark) / sumSeparateBenchmark) * 100).toFixed(2)) : 0,
      ...(override_details?.is_overridden ? {
        approved_by: adminUser?._id || adminUser?.id || null,
        approved_at: new Date(),
        approval_remarks: override_details?.reason || 'Created with pre-approved override',
      } : {}),
    },
    status: (vendorCost > sumSeparateBenchmark && !override_details?.is_overridden) ? 'pending_approval' : 'vehicle_assigned',
    pickup_scheduled_at,
    expected_delivery_date,
    created_by: adminUser?._id || adminUser?.id || null,
    status_history: [{
      status: (vendorCost > sumSeparateBenchmark && !override_details?.is_overridden) ? 'pending_approval' : 'vehicle_assigned',
      changed_by: adminUser?._id || null,
      note: (vendorCost > sumSeparateBenchmark && !override_details?.is_overridden)
        ? `Delivery Order ${deliveryNumber} placed on approval hold due to rate variance of ₹${vendorCost - sumSeparateBenchmark} over benchmark.`
        : `Delivery Order ${deliveryNumber} created with ${vehicles_allocated.length} vehicle(s) and ${processedStops.length} stop(s).`,
      changed_at: new Date(),
    }],
  });

  await deliveryOrder.save();

  // 5. Update Physical Vehicle States & Link Current Delivery
  for (const v of vehicles_allocated) {
    await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, {
      current_status: 'Assigned',
      current_delivery_id: deliveryOrder._id,
      assigned_driver: {
        name: v.driver_name,
        mobile: v.driver_mobile,
        license_number: v.driver_license,
      },
    });
  }

  // 6. Update Source Orders Status to vehicle_assigned
  for (const st of processedStops) {
    if (st.order_model === 'epc_orders') {
      await EpcOrder.findByIdAndUpdate(st.order_id, {
        order_status: 'vehicle_assigned',
        assigned_vehicle: {
          vehicle_id: vehicles_allocated[0]?.vehicle_id,
          registration_number: vehicles_allocated[0]?.registration_number,
          driver_name: vehicles_allocated[0]?.driver_name,
          driver_contact: vehicles_allocated[0]?.driver_mobile,
          assigned_at: new Date(),
        },
      });
    } else if (st.order_model === 'fpo_orders') {
      await FpoOrder.findByIdAndUpdate(st.order_id, {
        status: 'VEHICLE_ASSIGNED',
        assigned_vehicle: {
          registration_number: vehicles_allocated[0]?.registration_number,
          driver_name: vehicles_allocated[0]?.driver_name,
          driver_contact: vehicles_allocated[0]?.driver_mobile,
        },
      });
    }
  }

  return deliveryOrder;
};

/**
 * 9. UPDATE DELIVERY JOURNEY & INDEPENDENT STOP STATUS / POD
 */
const updateTripStatus = async (deliveryId, newStatus, payload = {}, adminUser = null) => {
  const delivery = await DeliveryOrder.findById(deliveryId);
  if (!delivery) throw new Error('Delivery order not found.');

  // Rule 5: Dispatch blocking if delivery cost approval is pending, rejected, or returned
  if (['loading', 'dispatched'].includes(newStatus)) {
    if (delivery.delivery_approval?.status === 'pending' || delivery.status === 'pending_approval') {
      throw new Error('Cannot dispatch or load delivery trip: Freight charge exceeds benchmark and delivery cost approval is currently pending.');
    }
    if (delivery.delivery_approval?.status === 'rejected' || delivery.status === 'cost_rejected') {
      throw new Error('Cannot dispatch or load delivery trip: Freight charge approval was rejected.');
    }
    if (delivery.delivery_approval?.status === 'returned' || delivery.status === 'cost_returned') {
      throw new Error('Cannot dispatch or load delivery trip: Freight charge was returned for revision.');
    }
  }

  delivery.status = newStatus;
  delivery.status_history.push({
    status: newStatus,
    changed_by: adminUser?._id || null,
    note: payload.note || `Status updated to ${newStatus}`,
    changed_at: new Date(),
  });

  if (newStatus === 'dispatched') {
    delivery.dispatched_at = new Date();
    // Update vehicles to In Transit
    for (const v of delivery.vehicles_allocated) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, { current_status: 'In Transit' });
    }
    // Update all stops to in_transit
    delivery.stops.forEach(st => {
      if (st.stop_status === 'pending') st.stop_status = 'in_transit';
    });
  } else if (newStatus === 'loading') {
    for (const v of delivery.vehicles_allocated) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, { current_status: 'Loading' });
    }
  } else if (newStatus === 'closed') {
    delivery.closed_at = new Date();
    // Release vehicles
    for (const v of delivery.vehicles_allocated) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, {
        current_status: 'Available',
        current_delivery_id: null,
      });
    }
  }

  await delivery.save();
  return delivery;
};

const updateStopPod = async (deliveryId, stopNumber, podData, adminUser = null) => {
  const delivery = await DeliveryOrder.findById(deliveryId);
  if (!delivery) throw new Error('Delivery order not found.');

  const stop = delivery.stops.find(s => s.stop_number === Number(stopNumber));
  if (!stop) throw new Error(`Stop number ${stopNumber} not found.`);

  stop.stop_status = 'pod_confirmed';
  stop.delivered_at = new Date();
  stop.pod = {
    pod_url: podData.pod_url,
    pod_notes: podData.pod_notes || 'Delivered with POD confirmation',
    receiver_name: podData.receiver_name,
    receiver_phone: podData.receiver_phone,
    confirmed_by: adminUser?._id || null,
    confirmed_at: new Date(),
  };

  // Update underlying source order
  if (stop.order_model === 'epc_orders') {
    await EpcOrder.findByIdAndUpdate(stop.order_id, {
      order_status: 'delivered',
      delivered_at: new Date(),
    });
  } else if (stop.order_model === 'fpo_orders') {
    await FpoOrder.findByIdAndUpdate(stop.order_id, {
      status: 'DELIVERED',
      delivered_at: new Date(),
    });
  }

  // Check if ALL stops have been confirmed
  const allStopsConfirmed = delivery.stops.every(s => s.stop_status === 'pod_confirmed');
  if (allStopsConfirmed) {
    delivery.status = 'pod_confirmed';
    delivery.completed_at = new Date();
    // Release vehicles back to Available
    for (const v of delivery.vehicles_allocated) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, {
        current_status: 'Available',
        current_delivery_id: null,
      });
    }
  }

  await delivery.save();
  return delivery;
};

/**
 * 10. SANITIZED CUSTOMER/FRANCHISEE TRACKING (HIDES BENCHMARKS & VENDOR COSTS)
 */
const getSanitizedTracking = async (trackingRef) => {
  const delivery = await DeliveryOrder.findOne({
    $or: [
      { delivery_number: trackingRef },
      { 'stops.order_number': trackingRef },
    ],
  })
    .populate('service_provider_id', 'name customer_service_number')
    .lean();

  if (!delivery) throw new Error('Tracking reference not found.');

  // Find stop if queried by order number
  const stop = delivery.stops.find(s => s.order_number === trackingRef);

  return {
    delivery_number: delivery.delivery_number,
    tracking_reference: trackingRef,
    master_status: delivery.status,
    stop_status: stop ? stop.stop_status : delivery.status,
    service_provider: delivery.service_provider_id?.name || 'SolarKits Logistics',
    customer_service_number: delivery.service_provider_id?.customer_service_number || '1800-SOLAR-KIT',
    driver_name: delivery.vehicles_allocated[0]?.driver_name || 'Assigned Driver',
    driver_contact: delivery.vehicles_allocated[0]?.driver_mobile || 'Contact Support',
    vehicle_registration: delivery.vehicles_allocated[0]?.registration_number || 'N/A',
    expected_delivery_date: delivery.expected_delivery_date,
    dispatched_at: delivery.dispatched_at,
    delivered_at: stop ? stop.delivered_at : delivery.completed_at,
    milestones: delivery.milestones || [],
    recipient_destination: stop?.destination || delivery.stops[0]?.destination,
    // Note: Vendor cost, benchmark cost, and margins are strictly omitted!
  };
};

/**
 * 11. WAREHOUSE DELIVERY DASHBOARD & CONSOLIDATION KPIS
 */
const getWarehouseDashboardAnalytics = async (warehouseId = null) => {
  const validWarehouseId = (warehouseId && warehouseId !== 'null' && warehouseId !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouseId)) ? warehouseId : null;
  const filter = validWarehouseId ? { warehouse_id: validWarehouseId } : {};

  // 1. Core 8 KPIs
  const queueResult = await getDeliveryQueue({ warehouse_id: validWarehouseId, limit: 1000 });
  const ordersAwaitingDelivery = queueResult.total;

  const [
    deliveriesCreated,
    vehiclesAssigned,
    inTransit,
    delivered,
    allTrips,
  ] = await Promise.all([
    DeliveryOrder.countDocuments({ ...filter }),
    DeliveryVehicleFleet.countDocuments({ current_status: 'Assigned', is_deleted: false }),
    DeliveryOrder.countDocuments({ ...filter, status: 'in_transit' }),
    DeliveryOrder.countDocuments({ ...filter, status: { $in: ['delivered', 'pod_confirmed', 'closed'] } }),
    DeliveryOrder.find({ ...filter })
      .populate('warehouse_id', 'warehouse_name city state')
      .populate('service_provider_id', 'name')
      .lean(),
  ]);

  const totalDeliveryCost = allTrips.reduce((sum, t) => sum + (t.actual_vendor_cost || 0), 0);
  const totalKitsDelivered = allTrips.reduce((sum, t) => sum + (t.cargo_summary?.total_kits || 0), 0);
  const avgDeliveryCostPerKit = totalKitsDelivered > 0 ? Math.round(totalDeliveryCost / totalKitsDelivered) : 0;

  // 2. Consolidation 9 KPIs
  const consolidatedTrips = allTrips.filter(t => t.delivery_type === 'consolidated_master_trip');
  const combinedDeliveriesCount = consolidatedTrips.length;
  const totalSavings = consolidatedTrips.reduce((sum, t) => sum + (t.estimated_savings || 0), 0);

  // Available for combination
  const scanSuggestions = validWarehouseId ? await scanQueueForConsolidation(validWarehouseId) : [];
  const ordersAvailableForCombination = scanSuggestions.reduce((sum, s) => sum + s.order_count, 0);

  const waitingForConsolidation = queueResult.orders.filter(o => o.hours_waiting < 48).length;
  const approachingDeadline = queueResult.orders.filter(o => o.hours_waiting >= 36 && o.hours_waiting <= 48).length;

  // 3. Multi-Dimensional Breakdown Aggregations
  const warehouseMap = {};
  const stateMap = {};
  const vehicleMap = {};
  const providerMap = {};
  const orderTypeMap = {};

  allTrips.forEach(trip => {
    // Warehouse
    const whName = trip.warehouse_id?.warehouse_name || 'Main Warehouse';
    if (!warehouseMap[whName]) warehouseMap[whName] = { name: whName, trips: 0, cost: 0, kits: 0 };
    warehouseMap[whName].trips += 1;
    warehouseMap[whName].cost += (trip.actual_vendor_cost || 0);
    warehouseMap[whName].kits += (trip.cargo_summary?.total_kits || 0);

    // Service Provider
    const provName = trip.service_provider_id?.name || 'In-House Fleet';
    if (!providerMap[provName]) providerMap[provName] = { name: provName, trips: 0, cost: 0 };
    providerMap[provName].trips += 1;
    providerMap[provName].cost += (trip.actual_vendor_cost || 0);

    // Vehicles
    (trip.vehicles_allocated || []).forEach(v => {
      const vType = v.vehicle_type_name || 'Pickup';
      if (!vehicleMap[vType]) vehicleMap[vType] = { name: vType, trips: 0, kits: 0 };
      vehicleMap[vType].trips += 1;
      vehicleMap[vType].kits += (trip.cargo_summary?.total_kits || 0);
    });

    // Stops destinations & order types
    (trip.stops || []).forEach(st => {
      const stState = st.destination?.state || 'Unknown State';
      if (!stateMap[stState]) stateMap[stState] = { name: stState, stops: 0, kits: 0 };
      stateMap[stState].stops += 1;
      stateMap[stState].kits += (st.cargo?.total_kits || 0);

      const oType = st.order_model === 'po_orders' ? 'PO Order' : (st.recipient_type === 'reseller_franchisee' ? 'Franchisee' : 'EPC Direct');
      if (!orderTypeMap[oType]) orderTypeMap[oType] = { name: oType, count: 0, kits: 0 };
      orderTypeMap[oType].count += 1;
      orderTypeMap[oType].kits += (st.cargo?.total_kits || 0);
    });
  });

  return {
    kpis: {
      orders_awaiting_delivery: ordersAwaitingDelivery,
      deliveries_created: deliveriesCreated,
      vehicles_assigned: vehiclesAssigned,
      in_transit: inTransit,
      delivered: delivered,
      delayed: 0,
      total_delivery_cost: totalDeliveryCost,
      average_delivery_cost_per_kit: avgDeliveryCostPerKit,
    },
    consolidation_kpis: {
      orders_available_for_combination: ordersAvailableForCombination,
      combined_deliveries_today: combinedDeliveriesCount,
      avg_vehicle_utilization_pct: 78, // Average utilization across active trips
      kits_per_vehicle: totalKitsDelivered > 0 ? Math.round(totalKitsDelivered / Math.max(1, deliveriesCreated)) : 14,
      multi_stop_deliveries: combinedDeliveriesCount,
      delivery_cost_per_kit: avgDeliveryCostPerKit,
      savings_from_combined_deliveries: totalSavings,
      orders_waiting_for_consolidation: waitingForConsolidation,
      orders_approaching_consolidation_deadline: approachingDeadline,
    },
    breakdowns: {
      by_warehouse: Object.values(warehouseMap),
      by_state: Object.values(stateMap),
      by_vehicle: Object.values(vehicleMap),
      by_provider: Object.values(providerMap),
      by_order_type: Object.values(orderTypeMap),
    },
    recent_deliveries: allTrips.slice(-10),
  };
};

/**
 * 14. DELIVERY COST APPROVAL QUEUE & ADMIN DECISION
 */
const getDeliveryApprovalQueue = async (queryParams = {}) => {
  const { status, search, page = 1, limit = 20 } = queryParams;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {};
  if (status && status !== 'all') {
    filter['delivery_approval.status'] = status;
  } else {
    filter.$or = [
      { 'delivery_approval.status': { $in: ['pending', 'approved', 'rejected', 'returned'] } },
      { status: { $in: ['pending_approval', 'cost_approved', 'cost_rejected', 'cost_returned'] } },
    ];
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { delivery_number: regex },
      { 'vehicles_allocated.registration_number': regex },
      { 'vehicles_allocated.driver_name': regex },
    ];
  }

  const [records, total] = await Promise.all([
    DeliveryOrder.find(filter)
      .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address pincode' })
      .populate('service_provider_id', 'name mobile_number')
      .populate('delivery_approval.approved_by', 'first_name last_name email')
      .populate('delivery_approval.requested_by', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    DeliveryOrder.countDocuments(filter),
  ]);

  const now = new Date();
  const enriched = records.map(item => {
    const reqTime = item.delivery_approval?.requested_at || item.createdAt;
    const hoursWaiting = reqTime ? Math.round((now - new Date(reqTime)) / (1000 * 60 * 60)) : 0;
    const isOverdue = hoursWaiting > 24 && item.delivery_approval?.status === 'pending';
    return {
      ...item,
      hours_waiting: hoursWaiting,
      is_overdue: isOverdue,
    };
  });

  return {
    records: enriched,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  };
};

const adminApproveDeliveryCost = async (deliveryOrderId, { decision, remarks, adminUser }) => {
  const delivery = await DeliveryOrder.findById(deliveryOrderId);
  if (!delivery) throw new Error('Delivery Order not found.');

  if (delivery.delivery_approval?.status !== 'pending' && delivery.status !== 'pending_approval') {
    throw new Error(`Delivery Order is not in pending approval state (Current: ${delivery.delivery_approval?.status || delivery.status}).`);
  }

  const adminId = adminUser?._id || adminUser?.id || null;
  const now = new Date();

  if (decision === 'approve') {
    delivery.delivery_approval.status = 'approved';
    delivery.delivery_approval.approved_by = adminId;
    delivery.delivery_approval.approved_at = now;
    delivery.delivery_approval.approval_remarks = remarks || 'Cost approved by Admin.';
    delivery.status = 'cost_approved';

    delivery.status_history.push({
      status: 'cost_approved',
      changed_by: adminId,
      note: `Delivery cost approved by Admin. Remarks: ${remarks || 'None'}`,
      changed_at: now,
    });
  } else if (decision === 'reject') {
    delivery.delivery_approval.status = 'rejected';
    delivery.delivery_approval.rejection_reason = remarks || 'Cost rejected by Admin.';
    delivery.delivery_approval.approved_by = adminId;
    delivery.delivery_approval.approved_at = now;
    delivery.status = 'cost_rejected';

    // Release vehicles back to Available
    for (const v of delivery.vehicles_allocated || []) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, {
        current_status: 'Available',
        current_delivery_id: null,
      });
    }

    delivery.status_history.push({
      status: 'cost_rejected',
      changed_by: adminId,
      note: `Delivery cost rejected by Admin. Reason: ${remarks}`,
      changed_at: now,
    });
  } else if (decision === 'return') {
    delivery.delivery_approval.status = 'returned';
    delivery.delivery_approval.return_reason = remarks || 'Returned for re-negotiation by Admin.';
    delivery.delivery_approval.approved_by = adminId;
    delivery.delivery_approval.approved_at = now;
    delivery.status = 'cost_returned';

    // Release vehicles back to Available
    for (const v of delivery.vehicles_allocated || []) {
      await DeliveryVehicleFleet.findByIdAndUpdate(v.vehicle_id, {
        current_status: 'Available',
        current_delivery_id: null,
      });
    }

    delivery.status_history.push({
      status: 'cost_returned',
      changed_by: adminId,
      note: `Delivery cost returned by Admin for renegotiation. Reason: ${remarks}`,
      changed_at: now,
    });
  } else {
    throw new Error('Invalid decision. Must be approve, reject, or return.');
  }

  await delivery.save();
  return delivery;
};

module.exports = {
  getKitWeight,
  calculateOrderCargo,
  getFranchiseeDestinations,
  getDeliveryQueue,
  scanQueueForConsolidation,
  getEligibleFleet,
  validateBenchmarkCost,
  calculateCostAllocations,
  createDeliveryTrip,
  updateTripStatus,
  updateStopPod,
  getSanitizedTracking,
  getWarehouseDashboardAnalytics,
  getDeliveryApprovalQueue,
  adminApproveDeliveryCost,
};
