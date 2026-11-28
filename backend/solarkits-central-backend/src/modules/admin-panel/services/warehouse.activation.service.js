const mongoose = require('mongoose');
const {
  CompanyWarehouse,
  WarehouseUser,
  WarehouseStock,
  ThirdPartyLogisticsVendor,
  WarehouseStockReconciliation
} = require('../models/company_warehouse_db');
const {
  WarehouseKitActivation,
  WarehouseKitPartnerMapping
} = require('../models/core_db');
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');

/**
 * 10-Gate Audit for Company Warehouse Activation
 */
async function evaluateCompanyWarehouseChecklist(warehouseId) {
  if (!mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new Error('Invalid warehouse ID format.');
  }

  const warehouse = await CompanyWarehouse.findOne({ _id: warehouseId, deleted_at: null }).lean();
  if (!warehouse) throw new Error('Warehouse not found.');

  const [managerUser, stockCount, kitCount, partnerMappingCount] = await Promise.all([
    WarehouseUser.findOne({ warehouse_id: warehouseId }).lean(),
    WarehouseStock.countDocuments({ warehouse_id: warehouseId }),
    WarehouseKitActivation.countDocuments({ warehouse_id: warehouseId, is_active: true, deleted_at: null }),
    WarehouseKitPartnerMapping.countDocuments({ warehouse_id: warehouseId })
  ]);

  const checklistState = warehouse.company_setup_checklist || {};

  let countrySlug = 'india';
  if (warehouse.level_0) {
    try {
      const countryDoc = await GeoLevel0.findById(warehouse.level_0).lean();
      if (countryDoc?.name) countrySlug = countryDoc.name.toLowerCase();
    } catch {
      // fallback to india
    }
  }

  // Gate 1: Basic Details
  const gate1Passed = Boolean((warehouse.warehouse_code && warehouse.address && warehouse.pincode) || checklistState.basic_details?.status);

  // Gate 2: Location Pin & GPS Coordinates
  const latNum = Number(warehouse.lat);
  const lngNum = Number(warehouse.lng);
  const gate2Passed = Boolean(
    (!isNaN(latNum) && latNum !== 0 && !isNaN(lngNum) && lngNum !== 0) ||
    checklistState.address_and_pin?.status
  );

  // Gate 3: Warehouse Images Uploaded
  let hasImages = false;
  const catImages = warehouse.categorized_images || {};
  if (
    (Array.isArray(catImages.exterior) && catImages.exterior.length > 0) ||
    (Array.isArray(catImages.storage) && catImages.storage.length > 0) ||
    (Array.isArray(catImages.racks) && catImages.racks.length > 0) ||
    catImages.front_exterior || catImages.main_storage
  ) {
    hasImages = true;
  } else if (warehouse.images) {
    try {
      const parsed = typeof warehouse.images === 'string' ? JSON.parse(warehouse.images) : warehouse.images;
      hasImages = Array.isArray(parsed) ? parsed.length > 0 : Boolean(String(warehouse.images).trim());
    } catch {
      hasImages = Boolean(String(warehouse.images).trim());
    }
  }
  const gate3Passed = Boolean(hasImages || checklistState.images_and_docs?.status);

  // Gate 4: Storage Capacity Configured
  const gate4Passed = Boolean(
    warehouse.max_weight_capacity_kg > 0 ||
    warehouse.max_pallet_capacity > 0 ||
    warehouse.warehouse_area_sqft > 0 ||
    warehouse.max_kit_capacity > 0 ||
    checklistState.storage_capacity?.status
  );

  // Gate 5: Warehouse Manager & Accountant Assigned
  const managerInfo = warehouse.manager || managerUser;
  const hasTwoRoleStaff = Boolean(
    (warehouse.assigned_staff?.manager_id || (managerInfo && managerInfo.name)) &&
    warehouse.assigned_staff?.accountant_id
  );
  const gate5Passed = Boolean(
    hasTwoRoleStaff ||
    (managerInfo && managerInfo.name && (managerInfo.phone || managerInfo.email)) ||
    (managerUser && managerUser.name) ||
    checklistState.manager_assigned?.status
  );

  // Gate 6: Inventory & SKU Mapping Completed
  const gate6Passed = Boolean(stockCount > 0 || checklistState.inventory_sku_mapping?.status);

  // Gate 7: Supplier Mapping Configured
  const gate7Passed = Boolean(partnerMappingCount > 0 || checklistState.supplier_mapping?.status);

  // Gate 8: Kit Activation Settings Completed
  const gate8Passed = Boolean(kitCount > 0 || checklistState.kit_activation_settings?.status);

  // Gate 9: Inward & Outward Workflow Configured
  const gate9Passed = Boolean(
    warehouse.operational_permissions?.inward ||
    warehouse.operational_permissions?.outward ||
    checklistState.inward_outward_workflow?.status
  );

  // Gate 10: Accounting & Cost Centre Mapped
  const gate10Passed = Boolean(checklistState.accounting_cost_centre?.status);

  const gates = [
    {
      gate_id: 1,
      key: 'basic_details',
      name: 'Basic Warehouse Details',
      description: 'Name, auto-generated code, verified postal address and pincode',
      is_completed: gate1Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=basic`
    },
    {
      gate_id: 2,
      key: 'address_and_pin',
      name: 'Address & Interactive Location Pin',
      description: 'Verified GPS coordinates (Latitude & Longitude) on the interactive map',
      is_completed: gate2Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=basic`
    },
    {
      gate_id: 3,
      key: 'images_and_docs',
      name: 'Warehouse Images & Compliance Documents',
      description: 'Front exterior, main storage area, and loading dock photographs',
      is_completed: gate3Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=images`
    },
    {
      gate_id: 4,
      key: 'storage_capacity',
      name: 'Storage Area & Maximum Capacity Setup',
      description: 'Sq. ft. area, maximum weight payload (kg), volume, or pallet limits',
      is_completed: gate4Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=capacity`
    },
    {
      gate_id: 5,
      key: 'manager_assigned',
      name: 'Warehouse Manager & Key Staff Assignment',
      description: 'Assigned responsible manager with verified mobile and operational email',
      is_completed: gate5Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=basic`
    },
    {
      gate_id: 6,
      key: 'inventory_sku_mapping',
      name: 'Inventory & SKU Mapping',
      description: 'Stock locations, opening balance, and solar component SKU initialization',
      is_completed: gate6Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/solar-shop/${countrySlug}/warehouse-kit-activations/${warehouseId}`
    },
    {
      gate_id: 7,
      key: 'supplier_mapping',
      name: 'Approved Supplier & OEM Partner Mapping',
      description: 'Regional OEM partner and certified supplier procurement linkages',
      is_completed: gate7Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/solar-shop/${countrySlug}/order-management-settings/admin-supplier-settings`
    },
    {
      gate_id: 8,
      key: 'kit_activation_settings',
      name: 'Kit-Wise Activation & Thresholds',
      description: 'Eligible kits enabled with minimum/maximum stock thresholds',
      is_completed: gate8Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/solar-shop/${countrySlug}/warehouse-kit-activations/${warehouseId}`
    },
    {
      gate_id: 9,
      key: 'inward_outward_workflow',
      name: 'Inward & Outward Workflow Configuration',
      description: 'Operational hours, receiving protocol, picking, and dispatch rules',
      is_completed: gate9Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=permissions`
    },
    {
      gate_id: 10,
      key: 'accounting_cost_centre',
      name: 'Accounting Mapping & Cost Centre Linkage',
      description: 'Billing entity, cost centre code, and warehouse expense ledger mapped',
      is_completed: gate10Passed,
      can_manual_verify: true,
      action_url: `/admin-panel/operations/company-warehouses/edit-warehouse/${warehouseId}?tab=permissions`
    }
  ];

  const completedCount = gates.filter(g => g.is_completed).length;
  const missing_gates = gates.filter(g => !g.is_completed);

  return {
    warehouse_id: warehouseId,
    warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
    warehouse_code: warehouse.warehouse_code,
    warehouse_type: warehouse.warehouse_type,
    is_active: warehouse.is_active,
    status_code: warehouse.status_code || (warehouse.is_active ? 'active' : 'draft'),
    completed_count: completedCount,
    total_gates: 10,
    completion_percentage: Math.round((completedCount / 10) * 100),
    can_activate: completedCount === 10,
    gates,
    missing_gates,
    missingGates: missing_gates
  };
}

/**
 * Computes 10 KPI Summary Cards for the Unified Warehouse Dashboard
 */
async function calculateWarehouseDashboardKPIs(filter = {}) {
  const baseQuery = { deleted_at: null, ...filter };

  const [
    allWarehouses,
    activeKitCount,
    inactiveKitCount,
    stockAgg,
    discrepancyCount
  ] = await Promise.all([
    CompanyWarehouse.find(baseQuery).select('_id warehouse_type is_active status status_code inspection_details').lean(),
    WarehouseKitActivation.countDocuments({ is_active: true, deleted_at: null }),
    WarehouseKitActivation.countDocuments({ is_active: false, deleted_at: null }),
    WarehouseStock.aggregate([{ $group: { _id: null, total_qty: { $sum: '$qty' } } }]),
    WarehouseStockReconciliation.countDocuments({ reconciliation_status: { $in: ['investigating', 'disputed'] } })
  ]);

  const total = allWarehouses.length;
  const companyCount = allWarehouses.filter(w => w.warehouse_type === 'company').length;
  const tplCount = allWarehouses.filter(w => w.warehouse_type === '3pl').length;
  const activeCount = allWarehouses.filter(w => w.is_active).length;
  const pendingActivation = allWarehouses.filter(w => w.warehouse_type === 'company' && !w.is_active).length;
  const pendingInspection = allWarehouses.filter(w => w.warehouse_type === '3pl' && (w.inspection_details?.status === 'pending' || !w.is_active)).length;
  const totalInventoryUnits = stockAgg[0]?.total_qty || 0;

  return {
    total_warehouses: total,
    company_warehouses: companyCount,
    tpl_warehouses: tplCount,
    active_warehouses: activeCount,
    pending_activation: pendingActivation,
    pending_inspection: pendingInspection,
    active_kit_mappings: activeKitCount,
    inactive_kit_mappings: inactiveKitCount,
    total_inventory_units: totalInventoryUnits,
    stock_discrepancies: discrepancyCount
  };
}

/**
 * Builds Geo-Map Markers for All Warehouses
 */
async function buildWarehouseMapMarkers() {
  const rows = await CompanyWarehouse.find({
    deleted_at: null,
    lat: { $ne: null, $exists: true },
    lng: { $ne: null, $exists: true }
  })
    .populate('vendor_id', 'company_name vendor_code contact_person')
    .lean();

  const warehouseIds = rows.map(r => r._id);
  const kitCounts = await WarehouseKitActivation.aggregate([
    { $match: { warehouse_id: { $in: warehouseIds }, is_active: true, deleted_at: null } },
    { $group: { _id: '$warehouse_id', count: { $sum: 1 } } }
  ]);
  const kitMap = Object.fromEntries(kitCounts.map(k => [k._id.toString(), k.count]));

  // Geolocation labels
  const stateIds = [...new Set(rows.map(r => r.level_1).filter(Boolean))];
  const districtIds = [...new Set(rows.map(r => r.level_2).filter(Boolean))];
  const [states, districts] = await Promise.all([
    GeoLevel1.find({ _id: { $in: stateIds } }).select('_id name').lean(),
    GeoLevel2.find({ _id: { $in: districtIds } }).select('_id name').lean()
  ]);
  const stateMap = Object.fromEntries(states.map(s => [s._id.toString(), s.name]));
  const districtMap = Object.fromEntries(districts.map(d => [d._id.toString(), d.name]));

  return rows.map(row => {
    let markerType = 'inactive';
    if (row.is_active) {
      markerType = row.warehouse_type === '3pl' ? '3pl_active' : 'company_active';
    } else if (row.warehouse_type === '3pl') {
      markerType = 'pending_inspection';
    } else {
      markerType = 'pending_activation';
    }

    let thumbnail = row.categorized_images?.front_exterior || row.categorized_images?.main_storage;
    if (!thumbnail && row.images) {
      try {
        const parsed = JSON.parse(row.images);
        if (Array.isArray(parsed) && parsed.length > 0) thumbnail = parsed[0];
      } catch {
        thumbnail = row.images;
      }
    }

    return {
      id: row._id.toString(),
      warehouse_name: row.warehouse_name || row.warehouse_code,
      warehouse_code: row.warehouse_code,
      warehouse_type: row.warehouse_type,
      vendor_name: row.vendor_id?.company_name || null,
      lat: row.lat,
      lng: row.lng,
      address: row.address,
      pincode: row.pincode,
      state: stateMap[row.level_1?.toString()] || '',
      district: districtMap[row.level_2?.toString()] || '',
      marker_type: markerType,
      is_active: row.is_active,
      status_code: row.status_code || (row.is_active ? 'active' : 'draft'),
      active_kits_count: kitMap[row._id.toString()] || 0,
      max_weight_capacity_kg: row.max_weight_capacity_kg || 0,
      warehouse_area_sqft: row.warehouse_area_sqft || 0,
      thumbnail
    };
  });
}

module.exports = {
  evaluateCompanyWarehouseChecklist,
  calculateWarehouseDashboardKPIs,
  buildWarehouseMapMarkers
};
