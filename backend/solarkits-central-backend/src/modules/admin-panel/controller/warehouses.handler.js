const {
  CompanyWarehouse, CompanyWarehouseValidationSection,
  CompanyWarehouseValidationField, CompanyWarehouseFieldValidation,
  CompanyWarehouseFieldDependency, CompanyWarehouseFieldStatus,
  WarehouseRole, WarehouseUser, CompanyWarehouseFieldData,
  ThirdPartyLogisticsVendor, WarehouseStock, WarehouseStockReconciliation
} = require("../models/company_warehouse_db");
const { WAREHOUSE_VALIDATION_STATUSES } = require("../models/company_warehouse_db/constants");
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require("../models/geolocation_db");
const { CompanyCustomersType, WarehouseKitActivation, WarehouseClusterMapping, RegionalCluster } = require("../models/core_db");
const { company_warehouse_db } = require("../config/databases");
const mongoose = require('mongoose');
const {
  evaluateCompanyWarehouseChecklist,
  calculateWarehouseDashboardKPIs,
  buildWarehouseMapMarkers
} = require('../services/warehouse.activation.service');

// Valid warehouse types
const VALID_WAREHOUSE_TYPES = ['company', '3pl', 'master', 'sub'];

/**
 * Adds a new warehouse.
 * Logic: Validates geolocation names, checks for duplicates, generates code, and inserts warehouse.
 */
const add_warehouse = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const {
      country, state, district, address, pincode, lat, lng,
      customers_types, warehouse_type, warehouse_name, vendor_id,
      categorized_images, warehouse_area_sqft, max_weight_capacity_kg,
      max_volume_cbf, max_pallet_capacity, storage_type, facilities,
      operating_hours, operational_permissions, serviceable_districts,
      commercial_settings, manager_name, manager_email, manager_phone, manager_phone_code
    } = req.body;

    if (!country || !state || !district || !address || !lat || !lng) {
      const missing = [
        !country && 'country',
        !state && 'state',
        !district && 'district',
        !address && 'address',
        !lat && 'lat',
        !lng && 'lng'
      ].filter(Boolean).join(', ');
      return res.status(400).json({ status: "error", message: `Missing required fields: ${missing}` });
    }

    // ---------- Validate warehouse type ----------
    if (!warehouse_type || !VALID_WAREHOUSE_TYPES.includes(warehouse_type)) {
      return res.status(400).json({ status: "error", message: `Warehouse type is required. Must be 'company' or '3pl'. Received: '${warehouse_type}'` });
    }

    // ---------- 3PL Vendor Validation ----------
    if (warehouse_type === '3pl') {
      if (!vendor_id) {
        return res.status(400).json({ status: "error", message: "3PL Warehouse requires an approved 3PL Vendor selection (vendor_id is required)." });
      }
      const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: vendor_id, deleted_at: null }).session(session);
      if (!vendor) {
        return res.status(400).json({ status: "error", message: "Selected 3PL Vendor does not exist." });
      }
      if (vendor.status !== 'approved') {
        return res.status(400).json({ status: "error", message: `Cannot register warehouse under vendor '${vendor.company_name}'. Vendor status is '${vendor.status}', but must be 'approved'.` });
      }
    }

    // ---------- Validate geolocation ----------
    const country_row = await GeoLevel0.findOne({
      name: { $regex: new RegExp(`^${country.trim()}$`, 'i') },
      is_active: true,
      deleted_at: null
    });
    if (!country_row) throw new Error(`Invalid country: '${country}'.`);

    const state_row = await GeoLevel1.findOne({
      name: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      level_0: country_row._id,
      is_active: true,
      deleted_at: null
    });
    if (!state_row) throw new Error(`Invalid state: '${state}'.`);

    const district_row = await GeoLevel2.findOne({
      name: { $regex: new RegExp(`^${district.trim()}$`, 'i') },
      level_1: state_row._id,
      is_active: true,
      deleted_at: null
    });
    if (!district_row) throw new Error(`Invalid district: '${district}'.`);

    // ---------- Duplicate check in district ----------
    const dupOr = [{ address: address.trim() }];
    if (warehouse_name && warehouse_name.trim()) {
      dupOr.push({ warehouse_name: new RegExp(`^${warehouse_name.trim()}$`, 'i') });
    }
    const duplicateWarehouse = await CompanyWarehouse.findOne({
      level_2: district_row._id,
      deleted_at: null,
      $or: dupOr
    }).session(session);

    if (duplicateWarehouse) {
      throw new Error("A warehouse with this name or exact physical address is already registered in this district.");
    }

    // ---------- Generate Code ----------
    const typeTag = warehouse_type === '3pl' ? '3PL_' : '';
    const prefix = `${country.slice(0, 3).toUpperCase()}_${state.slice(0, 3).toUpperCase()}_${typeTag}`;
    const last = await CompanyWarehouse.findOne({ warehouse_code: new RegExp(`^${prefix}`) })
      .sort({ warehouse_code: -1 })
      .session(session);

    let next_num = "001";
    if (last) {
      const parts = last.warehouse_code.split("_");
      const lastNumStr = parts[parts.length - 1];
      const parsedNum = parseInt(lastNumStr, 10);
      if (!isNaN(parsedNum)) {
        next_num = String(parsedNum + 1).padStart(3, "0");
      }
    }
    const warehouse_code = prefix + next_num;

    const initialStatus = (manager_name && manager_email && manager_phone) ? 2 : 1;
    const initialStatusCode = warehouse_type === '3pl' ? 'pending_inspection' : (initialStatus === 2 ? 'pending_setup' : 'draft');

    // Parse images array if provided
    let imagesString = null;
    if (categorized_images) {
      const allImgs = [
        categorized_images.front_exterior || categorized_images.exterior,
        categorized_images.main_storage || categorized_images.storage,
        categorized_images.product_racks || categorized_images.racks,
        categorized_images.loading_unloading || categorized_images.loading_area,
        categorized_images.office_security || categorized_images.security,
        ...(categorized_images.additional_images || [])
      ].flat().filter(Boolean);
      if (allImgs.length > 0) imagesString = JSON.stringify(allImgs);
    }

    // ---------- Insert Warehouse ----------
    const [newWarehouse] = await CompanyWarehouse.create([{
      warehouse_name: warehouse_name ? warehouse_name.trim() : `${warehouse_type === '3pl' ? '3PL ' : ''}Warehouse ${warehouse_code}`,
      warehouse_code,
      warehouse_type,
      vendor_id: warehouse_type === '3pl' ? vendor_id : null,
      status: initialStatus, // 1: Pending Validation Setup, 2: Awaiting Information
      status_code: initialStatusCode,
      level_0: country_row._id,
      level_1: state_row._id,
      level_2: district_row._id,
      address,
      pincode: pincode || null,
      lat,
      lng,
      images: imagesString,
      categorized_images: categorized_images || {},
      warehouse_area_sqft: Number(warehouse_area_sqft) || 0,
      max_weight_capacity_kg: Number(max_weight_capacity_kg) || 0,
      max_volume_cbf: Number(max_volume_cbf) || 0,
      max_pallet_capacity: Number(max_pallet_capacity) || 0,
      storage_type: storage_type || 'indoor',
      facilities: facilities || {},
      operating_hours: operating_hours || { working_days: 'Monday - Saturday', open_time: '09:00', close_time: '19:00' },
      operational_permissions: operational_permissions || { inward: false, outward: false, storage: false, dispatch: false, kit_assembly: false },
      serviceable_districts: serviceable_districts || [district_row._id],
      commercial_settings: commercial_settings || {},
      company_setup_checklist: {
        basic_details: { status: true, completed_at: new Date() },
        address_and_pin: { status: true, completed_at: new Date() }
      },
      is_active: false,
      customer_types: customers_types || []
    }], { session });

    // ---------- Create Warehouse Manager if provided ----------
    if (manager_name && manager_email && manager_phone) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager_email.trim())) {
        throw new Error("Invalid manager email format.");
      }
      if (manager_phone.trim().length < 8) {
        throw new Error("Invalid manager phone length.");
      }

      // Check unique email/phone in WarehouseUser
      const duplicateEmail = await WarehouseUser.findOne({ email: manager_email.trim().toLowerCase() }).session(session);
      if (duplicateEmail) {
        throw new Error("A warehouse manager with this email already exists.");
      }
      const duplicatePhone = await WarehouseUser.findOne({ phone: manager_phone.trim() }).session(session);
      if (duplicatePhone) {
        throw new Error("A warehouse manager with this phone number already exists.");
      }

      let managerRole = await WarehouseRole.findOne({ name: 'manager' }).session(session);
      if (!managerRole) {
        const [newRole] = await WarehouseRole.create([{ name: 'manager' }], { session });
        managerRole = newRole;
      }

      await WarehouseUser.create([{
        name: manager_name.trim(),
        email: manager_email.trim().toLowerCase(),
        phone: manager_phone.trim(),
        phone_code: (manager_phone_code || "+91").trim(),
        role_id: managerRole._id,
        warehouse_id: newWarehouse._id,
        is_verified: false,
        is_active: true
      }], { session });
    }

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message: `${warehouse_type === '3pl' ? '3PL' : 'Company'} warehouse added successfully.` });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

const extractWarehouseImages = (row) => {
  let images = [];
  if (Array.isArray(row.images)) {
    images = row.images.flat().filter(Boolean);
  } else if (typeof row.images === 'string') {
    const trimmed = row.images.trim();
    if (trimmed.startsWith('[')) {
      try { images = JSON.parse(trimmed).flat().filter(Boolean); } catch { images = []; }
    } else if (trimmed.includes(',')) {
      images = trimmed.split(',').map(i => i.trim()).filter(Boolean);
    } else if (trimmed) {
      images = [trimmed];
    }
  }

  // If images empty, try categorized_images
  if (images.length === 0 && row.categorized_images) {
    const cat = row.categorized_images;
    const catImgs = [
      cat.front_exterior || cat.exterior,
      cat.main_storage || cat.storage,
      cat.product_racks || cat.racks,
      cat.loading_unloading || cat.loading_area,
      cat.office_security || cat.security,
      ...(Array.isArray(cat.additional_images) ? cat.additional_images : [])
    ].flat().filter(Boolean);
    if (catImgs.length > 0) images = catImgs;
  }

  // If still empty, provide high-quality fallback warehouse images based on facility type
  if (images.length === 0) {
    if (row.warehouse_type === '3pl') {
      images = [
        "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80"
      ];
    } else {
      images = [
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1592833159057-651427788523?w=800&auto=format&fit=crop&q=80"
      ];
    }
  }

  return images;
};

/**
 * Fetches all warehouses.
 * Optimized with bulk fetching to handle scalability (N+1 avoidance).
 */
const get_warehouses = async (req, res) => {
  try {
    const query = { deleted_at: null };
    if (req.query.country_id && isValidObjectId(req.query.country_id)) {
      query.level_0 = req.query.country_id;
    }
    const rows = await CompanyWarehouse.find(query).sort({ created_at: -1 }).lean();
    if (!rows.length) {
      return res.status(200).json({ status: "success", message: "Warehouses fetched successfully.", warehouses: [] });
    }

    // Collect IDs for bulk lookup
    const level0_ids = [...new Set(rows.map(r => r.level_0).filter(Boolean))];
    const level1_ids = [...new Set(rows.map(r => r.level_1).filter(Boolean))];
    const level2_ids = [...new Set(rows.map(r => r.level_2).filter(Boolean))];

    // Bulk Geolocation Lookup with lean queries
    const [countries, states, districts] = await Promise.all([
      GeoLevel0.find({ _id: { $in: level0_ids } }).lean(),
      GeoLevel1.find({ _id: { $in: level1_ids } }).lean(),
      GeoLevel2.find({ _id: { $in: level2_ids } }).populate('cluster').lean()
    ]);

    const geoMap = {
      l0: Object.fromEntries(countries.map(c => [c._id.toString(), c.name])),
      l1: Object.fromEntries(states.map(s => [s._id.toString(), s.name])),
      l2: Object.fromEntries(districts.map(d => [d._id.toString(), d.name])),
      l2Cluster: Object.fromEntries(districts.map(d => [d._id.toString(), d.cluster ? { id: (d.cluster._id || d.cluster.id || d.cluster).toString(), name: d.cluster.name } : null]))
    };

    // Bulk Customer Details Lookup
    const allTypeIds = [...new Set(rows.flatMap(r => r.customer_types || []))];
    const type_rows = await CompanyCustomersType.find({ _id: { $in: allTypeIds } }).lean();
    const typeMap = Object.fromEntries(type_rows.map(t => [t._id.toString(), t.type_name]));

    // Bulk WarehouseUser, FieldStatus, and FieldData Lookup with lean queries
    const warehouse_ids = rows.map(r => r._id);
    const vendor_ids = [...new Set(rows.map(r => r.vendor_id).filter(Boolean))];

    const [warehouseUsers, allStatuses, allSavedData, vendorsList, kitAgg, clusterMappings] = await Promise.all([
      WarehouseUser.find({ warehouse_id: { $in: warehouse_ids } }).lean(),
      CompanyWarehouseFieldStatus.find({ warehouse_id: { $in: warehouse_ids }, is_enabled: true }).lean(),
      CompanyWarehouseFieldData.find({ warehouse_id: { $in: warehouse_ids } }).lean(),
      vendor_ids.length > 0 ? ThirdPartyLogisticsVendor.find({ _id: { $in: vendor_ids } }).lean() : [],
      WarehouseKitActivation.aggregate([
        { $match: { warehouse_id: { $in: warehouse_ids }, is_active: true, deleted_at: null } },
        { $group: { _id: '$warehouse_id', count: { $sum: 1 } } }
      ]),
      WarehouseClusterMapping.find({ deleted_at: null, status: 'Active' }).lean()
    ]);

    const vendorMap = Object.fromEntries(vendorsList.map(v => [v._id.toString(), v]));
    const kitCountMap = Object.fromEntries(kitAgg.map(k => [k._id.toString(), k.count]));

    // Build warehouse routing map by warehouse_id and warehouse_code
    const routingMapById = {};
    const routingMapByCode = {};
    (clusterMappings || []).forEach(m => {
      if (m.warehouse_id) routingMapById[m.warehouse_id.toString()] = m;
      if (m.warehouse_code) routingMapByCode[m.warehouse_code.trim().toUpperCase()] = m;
    });

    const userMap = Object.fromEntries(warehouseUsers.map(u => [u.warehouse_id.toString(), u]));

    // warehouse_id -> array of enabled field_ids
    const enabledFieldsMap = {};
    allStatuses.forEach(s => {
      const whId = s.warehouse_id.toString();
      if (!enabledFieldsMap[whId]) enabledFieldsMap[whId] = [];
      enabledFieldsMap[whId].push(s.field_id.toString());
    });

    // warehouse_id -> map of field_id -> value
    const savedValuesMap = {};
    allSavedData.forEach(d => {
      const whId = d.warehouse_id.toString();
      if (!savedValuesMap[whId]) savedValuesMap[whId] = {};
      savedValuesMap[whId][d.field_id.toString()] = d.value;
    });

    const warehouses = rows.map(row => {
      // Parse images using unified extractor
      const images = extractWarehouseImages(row);

      const status_info = WAREHOUSE_VALIDATION_STATUSES[row.status] || {};

      const customer_types = (row.customer_types || []).map(id => ({
        id: id,
        type_name: typeMap[id.toString()] || "Unknown"
      }));

      const manager_user = userMap[row._id.toString()];
      const manager = manager_user ? {
        name: manager_user.name,
        email: manager_user.email,
        phone: manager_user.phone,
        phone_code: manager_user.phone_code || "+91",
        is_verified: manager_user.is_verified
      } : null;

      const enabledFieldIds = enabledFieldsMap[row._id.toString()] || [];
      const savedValues = savedValuesMap[row._id.toString()] || {};
      let percentage = 0;
      if (enabledFieldIds.length > 0) {
        let filledFieldsCount = 0;
        enabledFieldIds.forEach(fid => {
          const val = savedValues[fid];
          if (val !== null && val !== undefined) {
            const valStr = String(val).trim();
            if (valStr !== '' && valStr !== '[]' && valStr !== '{}') {
              filledFieldsCount++;
            }
          }
        });
        // Account for the fixed images field
        const totalFields = enabledFieldIds.length + 1;
        let imagesFilled = false;
        if (row.images) {
          try {
            const imgArr = JSON.parse(row.images);
            if (Array.isArray(imgArr) && imgArr.length > 0) imagesFilled = true;
          } catch (e) {
            if (String(row.images).trim()) imagesFilled = true;
          }
        }
        if (imagesFilled) filledFieldsCount++;
        percentage = Math.round((filledFieldsCount / totalFields) * 100);
      }

      const matchedVendor = vendorMap[row.vendor_id?.toString()] || null;

      return {
        id: (row._id || row.id)?.toString(),
        _id: (row._id || row.id)?.toString(),
        warehouse_name: row.warehouse_name || row.warehouse_code,
        warehouse_code: row.warehouse_code,
        warehouse_type: row.warehouse_type || null,
        vendor_id: row.vendor_id || null,
        vendor_name: matchedVendor?.company_name || null,
        vendor: matchedVendor ? {
          id: matchedVendor._id.toString(),
          vendor_code: matchedVendor.vendor_code,
          company_name: matchedVendor.company_name,
          contact_person: matchedVendor.contact_person
        } : null,
        active_kits_count: kitCountMap[row._id.toString()] || 0,
        images,
        categorized_images: row.categorized_images || null,
        warehouse_area_sqft: row.warehouse_area_sqft || 0,
        max_weight_capacity_kg: row.max_weight_capacity_kg || 0,
        max_pallet_capacity: row.max_pallet_capacity || 0,
        max_volume_cbf: row.max_volume_cbf || 0,
        max_kit_capacity: row.max_kit_capacity || 0,
        storage_type: row.storage_type || 'indoor',
        facilities: row.facilities || {},
        operating_hours: row.operating_hours || {},
        operational_permissions: row.operational_permissions || {},
        serviceable_districts: row.serviceable_districts || [],
        inspection_details: row.inspection_details || {},
        commercial_settings: row.commercial_settings || {},
        company_setup_checklist: row.company_setup_checklist || {},
        status_code: row.status_code || (row.is_active ? 'active' : 'draft'),
        effective_date: row.effective_date || null,
        address: row.address,
        pincode: row.pincode,
        lat: row.lat,
        lng: row.lng,
        status_id: row.status,
        status: status_info.label || null,
        is_active: row.is_active ? 1 : 0,
        country: geoMap.l0[row.level_0?.toString()] || null,
        country_name: geoMap.l0[row.level_0?.toString()] || null,
        state: geoMap.l1[row.level_1?.toString()] || null,
        state_name: geoMap.l1[row.level_1?.toString()] || null,
        district: geoMap.l2[row.level_2?.toString()] || null,
        district_name: geoMap.l2[row.level_2?.toString()] || null,
        cluster: (routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()])?.cluster_name || (geoMap.l2Cluster[row.level_2?.toString()] || null)?.name || null,
        cluster_name: (routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()])?.cluster_name || (geoMap.l2Cluster[row.level_2?.toString()] || null)?.name || null,
        cluster_id: (routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()])?.cluster_id?.toString() || (geoMap.l2Cluster[row.level_2?.toString()] || null)?.id || null,
        fulfillment_states: (routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()])?.states || [],
        is_cluster_mapped: Boolean(routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()]),
        routing_mapping: (routingMapById[(row._id || row.id)?.toString()] || routingMapByCode[(row.warehouse_code || '').trim().toUpperCase()]) || null,
        country_id: row.level_0,
        state_id: row.level_1,
        district_id: row.level_2,
        customer_types,
        manager,
        due_date: row.due_date,
        rejection_reason: row.rejection_reason || null,
        profile_completion_percentage: percentage,
        order_fulfillment_types: Array.isArray(row.order_fulfillment_types)
          ? row.order_fulfillment_types
          : ['po_order', 'loose_order', 'trial_order'],
        order_fulfillment_config: row.order_fulfillment_config || {
          po_order: { is_active: true, max_daily_capacity: 50 },
          loose_order: { is_active: true, max_daily_capacity: 100 },
          trial_order: { is_active: true, max_daily_capacity: 20 },
        }
      };
    });

    return res.status(200).json({ status: "success", message: "Warehouses fetched successfully.", warehouses });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Internal server error", error: error.message });
  }
};

/**
 * Fetches a single warehouse.
 */
const get_warehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await CompanyWarehouse.findOne({ _id: id, deleted_at: null });
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found" });

    // Fetch geolocation names, manager, vendor, active kits count, and cluster routing mapping
    const [country_row, state_row, district_row, manager_user, vendor_row, activeKitsCount, clusterMapping] = await Promise.all([
      GeoLevel0.findById(warehouse.level_0),
      GeoLevel1.findById(warehouse.level_1),
      GeoLevel2.findById(warehouse.level_2).populate('cluster'),
      WarehouseUser.findOne({ warehouse_id: id }),
      warehouse.vendor_id ? ThirdPartyLogisticsVendor.findById(warehouse.vendor_id).lean() : null,
      WarehouseKitActivation.countDocuments({ warehouse_id: id, is_active: true, deleted_at: null }),
      WarehouseClusterMapping.findOne({
        $or: [
          { warehouse_id: id },
          { warehouse_code: warehouse.warehouse_code }
        ],
        deleted_at: null,
        status: 'Active'
      }).lean()
    ]);

    const manager = manager_user ? {
      name: manager_user.name,
      email: manager_user.email,
      phone: manager_user.phone,
      phone_code: manager_user.phone_code || "+91",
      is_verified: manager_user.is_verified
    } : null;

    // Calculate profile completion percentage
    const enabledStatuses = await CompanyWarehouseFieldStatus.find({ warehouse_id: id, is_enabled: true });
    const enabledFieldIds = enabledStatuses.map(s => s.field_id);
    let percentage = 0;
    if (enabledFieldIds.length > 0) {
      const savedData = await CompanyWarehouseFieldData.find({
        warehouse_id: id,
        field_id: { $in: enabledFieldIds }
      });
      let filledFieldsCount = savedData.filter(d => {
        if (d.value === null || d.value === undefined) return false;
        const valStr = String(d.value).trim();
        return valStr !== '' && valStr !== '[]' && valStr !== '{}';
      }).length;

      // Account for the fixed images field
      const totalFields = enabledFieldIds.length + 1;
      let imagesFilled = false;
      if (warehouse.images) {
        try {
          const imgArr = JSON.parse(warehouse.images);
          if (Array.isArray(imgArr) && imgArr.length > 0) imagesFilled = true;
        } catch (e) {
          if (String(warehouse.images).trim()) imagesFilled = true;
        }
      }
      if (imagesFilled) filledFieldsCount++;
      percentage = Math.round((filledFieldsCount / totalFields) * 100);
    }

    // Parse images using unified extractor
    const images = extractWarehouseImages(warehouse);

    return res.status(200).json({
      status: "success",
      message: "Warehouse fetched successfully.",
      warehouse: {
        id: (warehouse._id || warehouse.id)?.toString(),
        _id: (warehouse._id || warehouse.id)?.toString(),
        warehouse_name: warehouse.warehouse_name || warehouse.warehouse_code,
        warehouse_code: warehouse.warehouse_code,
        warehouse_type: warehouse.warehouse_type || null,
        vendor_id: warehouse.vendor_id || null,
        vendor_name: vendor_row?.company_name || null,
        vendor: vendor_row ? {
          id: vendor_row._id.toString(),
          vendor_code: vendor_row.vendor_code,
          company_name: vendor_row.company_name,
          contact_person: vendor_row.contact_person
        } : null,
        active_kits_count: activeKitsCount,
        images,
        categorized_images: warehouse.categorized_images || null,
        warehouse_area_sqft: warehouse.warehouse_area_sqft || 0,
        max_weight_capacity_kg: warehouse.max_weight_capacity_kg || 0,
        max_pallet_capacity: warehouse.max_pallet_capacity || 0,
        max_volume_cbf: warehouse.max_volume_cbf || 0,
        max_kit_capacity: warehouse.max_kit_capacity || 0,
        storage_type: warehouse.storage_type || 'indoor',
        facilities: warehouse.facilities || {},
        operating_hours: warehouse.operating_hours || {},
        operational_permissions: warehouse.operational_permissions || {},
        serviceable_districts: warehouse.serviceable_districts || [],
        inspection_details: warehouse.inspection_details || {},
        commercial_settings: warehouse.commercial_settings || {},
        company_setup_checklist: warehouse.company_setup_checklist || {},
        status_code: warehouse.status_code || (warehouse.is_active ? 'active' : 'draft'),
        effective_date: warehouse.effective_date || null,
        address: warehouse.address,
        pincode: warehouse.pincode,
        lat: warehouse.lat,
        lng: warehouse.lng,
        status_id: warehouse.status,
        is_active: warehouse.is_active ? 1 : 0,
        country: country_row ? country_row.name : "",
        state: state_row ? state_row.name : "",
        district: district_row ? district_row.name : "",
        cluster: clusterMapping ? clusterMapping.cluster_name : (district_row && district_row.cluster ? district_row.cluster.name : ""),
        cluster_name: clusterMapping ? clusterMapping.cluster_name : (district_row && district_row.cluster ? district_row.cluster.name : ""),
        cluster_id: clusterMapping ? clusterMapping.cluster_id?.toString() : (district_row && district_row.cluster ? district_row.cluster._id : null),
        fulfillment_states: clusterMapping ? (clusterMapping.states || []) : [],
        is_cluster_mapped: Boolean(clusterMapping),
        routing_mapping: clusterMapping || null,
        customer_types: warehouse.customer_types || [],
        manager,
        due_date: warehouse.due_date,
        rejection_reason: warehouse.rejection_reason || null,
        profile_completion_percentage: percentage,
        order_fulfillment_types: Array.isArray(warehouse.order_fulfillment_types)
          ? warehouse.order_fulfillment_types
          : ['po_order', 'loose_order', 'trial_order'],
        order_fulfillment_config: warehouse.order_fulfillment_config || {
          po_order: { is_active: true, max_daily_capacity: 50 },
          loose_order: { is_active: true, max_daily_capacity: 100 },
          trial_order: { is_active: true, max_daily_capacity: 20 },
        }
      },
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch warehouse", error: err.message });
  }
};

/**
 * Fetches validation sections for a warehouse with field counts and statuses.
 */
const add_warehouse_validation_section = async (req, res) => {
  try {
    const { name, code, order } = req.body;
    if (!name || !code) {
      return res.status(400).json({ status: "error", message: "Section name and code are required." });
    }

    const existingSection = await CompanyWarehouseValidationSection.findOne({ code, deleted_at: null });
    if (existingSection) {
      return res.status(400).json({ status: "error", message: "A section with this code already exists." });
    }

    const maxOrderSection = await CompanyWarehouseValidationSection.findOne({ deleted_at: null }).sort({ order: -1 });
    const nextOrder = order !== undefined ? order : (maxOrderSection ? maxOrderSection.order + 1 : 1);

    const newSection = new CompanyWarehouseValidationSection({
      name,
      code,
      order: nextOrder
    });

    await newSection.save();

    return res.status(201).json({ status: "success", message: "Validation section created successfully.", section: newSection });
  } catch (err) {
    console.error("Error creating validation section:", err);
    return res.status(500).json({ status: "error", message: "Failed to create validation section." });
  }
};

const get_warehouse_validation_sections = async (req, res) => {
  try {
    const { warehouse_id } = req.params;
    const warehouse = await CompanyWarehouse.findById(warehouse_id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found" });

    const [sections, fields, statuses] = await Promise.all([
      CompanyWarehouseValidationSection.find({ deleted_at: null }).sort({ _id: 1 }),
      CompanyWarehouseValidationField.find({ deleted_at: null }),
      CompanyWarehouseFieldStatus.find({ warehouse_id: warehouse._id })
    ]);

    const result = sections.map(s => {
      const section_fields = fields.filter(f => f.section_id.toString() === s.id.toString());
      const fieldIds = section_fields.map(f => f.id.toString());
      const enabled_fields = statuses.filter(fs => fieldIds.includes(fs.field_id.toString()) && fs.is_enabled === true).length;

      return {
        id: s.id,
        name: s.name,
        total_fields: section_fields.length,
        enabled_fields: enabled_fields,
        disabled_fields: section_fields.length - enabled_fields
      };
    });

    return res.status(200).json({ status: "success", message: "Warehouse validation sections fetched successfully.", sections: result });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch warehouse validaton sections." });
  }
};

/**
 * Fetches a single validation section with its fields and their current statuses/validations.
 */
const get_warehouse_validation_section = async (req, res) => {
  try {
    const { id, warehouse_id } = req.params;
    const section = await CompanyWarehouseValidationSection.findById(id);
    if (!section) return res.status(404).json({ status: "error", message: "Warehouse validation section not found." });

    const fields = await CompanyWarehouseValidationField.find({ section_id: id, deleted_at: null });
    const fieldIds = fields.map(f => f._id);

    const [validations, dependencies, statuses, fieldData] = await Promise.all([
      CompanyWarehouseFieldValidation.find({ field_id: { $in: fieldIds } }),
      CompanyWarehouseFieldDependency.find({ child_field_id: { $in: fieldIds } }).populate('parent_field_id'),
      CompanyWarehouseFieldStatus.find({ warehouse_id, field_id: { $in: fieldIds } }),
      CompanyWarehouseFieldData.find({ warehouse_id, field_id: { $in: fieldIds } })
    ]);

    const fields_with_validations = fields.map(field => {
      const field_validations = validations.filter(v => v.field_id.toString() === field._id.toString());
      const field_dependency = dependencies.find(d => d.child_field_id.toString() === field._id.toString());
      const field_status = statuses.find(fs => fs.field_id.toString() === field._id.toString());

      return {
        id: field.id,
        name: field.name,
        label: field.label,
        field_type: field.field_type,
        options: field.options ? JSON.parse(field.options) : null,
        validations: field_validations.map(v => ({
          validation_type: v.validation_type,
          validation_value: v.validation_value,
          error_message: v.error_message
        })),
        dependency: field_dependency ? {
          is_dependent: true,
          parent_field: {
            id: field_dependency.parent_field_id._id,
            name: field_dependency.parent_field_id.name,
            label: field_dependency.parent_field_id.label,
          },
          dependency_type: field_dependency.dependency_type,
          parent_value_condition: field_dependency.parent_value,
        } : { is_dependent: false },
        is_enabled: field_status ? field_status.is_enabled : false,
        min_files: field_status ? field_status.min_files : null,
        max_files: field_status ? field_status.max_files : null,
        value: fieldData.find(d => d.field_id.toString() === field._id.toString())?.value || null
      };
    });

    return res.status(200).json({
      status: "success",
      message: "Warehouse validation section fetched successfully.",
      section: { id: section._id, name: section.name },
      fields: fields_with_validations
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch warehouse validation section." });
  }
}

/**
 * Adds a validation field to a section.
 */
const add_warehouse_validation_field = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const { section, field } = req.body;
    if (!section || !field || !field.name || !field.field_type) {
      return res.status(400).json({ status: "error", message: "Missing required fields." });
    }

    const valid_types = ["single_line_input", "multi_line_input", "number", "email", "date", "file", "dropdown", "multi_select_dropdown", "checkbox", "yesno"];
    if (!valid_types.includes(field.field_type)) {
      return res.status(400).json({ status: "error", message: "Invalid field type." });
    }

    const field_name = field.name.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/\s+/g, '_').toLowerCase();
    const field_code = field_name + '_' + Date.now().toString(36);
    let options = null;
    if (["dropdown", "multi_select_dropdown", "checkbox"].includes(field.field_type) && Array.isArray(field.options)) {
      options = JSON.stringify(field.options.map(opt => ({
        text: opt.text,
        value: opt.value.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/\s+/g, '_').toLowerCase()
      })));
    }

    const [newField] = await CompanyWarehouseValidationField.create([{
      name: field_name, code: field_code, label: field.label, field_type: field.field_type, section_id: section, options
    }], { session });

    if (field.validations?.length) {
      const v_data = field.validations.map(v => ({
        field_id: newField._id, validation_type: v.validation_type, validation_value: v.validation_value, error_message: v.error_message
      }));
      await CompanyWarehouseFieldValidation.create(v_data, { session });
    }

    if (field.dependency) {
      const { parent_field, dependency_type, parent_value } = field.dependency;
      await CompanyWarehouseFieldDependency.create([{
        parent_field_id: parent_field, child_field_id: newField._id, dependency_type, parent_value
      }], { session });
    }

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message: "Warehouse validation field added successfully." });
  } catch (err) {
    await session.abortTransaction();
    console.error("ADD FIELD ERROR:", err);
    return res.status(500).json({ status: "error", message: err.message || "Failed to add warehouse validation field." });
  } finally {
    session.endSession();
  }
};

/**
 * Sets statuses for multiple validation fields in a warehouse.
 * Handles dependencies, cascades, and validation logic.
 */
const set_warehouse_validation_field_statuses = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const { warehouse_id, statuses, field_id, due_date } = req.body;
    let updates = Array.isArray(statuses) ? statuses : [];
    if (field_id !== undefined) {
      updates.push({ field_id, is_enabled: req.body.is_enabled, min_files: req.body.min_files, max_files: req.body.max_files });
    }

    if (!warehouse_id || updates.length === 0) {
      return res.status(400).json({ status: "error", message: "warehouse_id and status updates are required." });
    }

    for (const update of updates) {
      const { field_id: f_id, is_enabled, min_files, max_files } = update;
      if (f_id === undefined) throw new Error("Each status must have a field_id.");

      const has_min = min_files !== null && min_files !== undefined;
      const has_max = max_files !== null && max_files !== undefined;
      if (has_min !== has_max) throw new Error("min_files and max_files must be provided together or be null.");
      if (has_min && (min_files < 0 || max_files < 1 || min_files > max_files)) throw new Error("Invalid file range.");

      let final_enabled = is_enabled;
      if (final_enabled === undefined) {
        const cur = await CompanyWarehouseFieldStatus.findOne({ warehouse_id, field_id: f_id }).session(session);
        final_enabled = cur ? cur.is_enabled : false;
      }

      if (final_enabled === true) {
        const dep = await CompanyWarehouseFieldDependency.findOne({ child_field_id: f_id }).populate('parent_field_id').session(session);
        if (dep) {
          const p_in_req = updates.find(s => s.field_id.toString() === dep.parent_field_id._id.toString());
          let p_enabled = false;
          if (p_in_req) {
            p_enabled = p_in_req.is_enabled !== undefined ? !!p_in_req.is_enabled : false;
          } else {
            const p_status = await CompanyWarehouseFieldStatus.findOne({ warehouse_id, field_id: dep.parent_field_id._id }).session(session);
            p_enabled = p_status ? p_status.is_enabled : false;
          }
          if (!p_enabled) throw new Error(`Cannot enable field because its parent ('${dep.parent_field_id.name}') is not enabled.`);
        }
      } else {
        const children = await CompanyWarehouseFieldDependency.find({ parent_field_id: f_id }).session(session);
        if (children.length > 0) {
          await CompanyWarehouseFieldStatus.updateMany(
            { warehouse_id, field_id: { $in: children.map(c => c.child_field_id) } },
            { $set: { is_enabled: false } }
          ).session(session);
        }
      }

      if (has_min) {
        const validations = await CompanyWarehouseFieldValidation.find({ field_id: f_id, validation_type: { $in: ['min_files', 'max_files'] } }).session(session);
        const g_min = validations.find(v => v.validation_type === 'min_files')?.validation_value;
        const g_max = validations.find(v => v.validation_type === 'max_files')?.validation_value;
        if (g_max !== undefined && min_files > parseInt(g_max)) throw new Error(`Conflict with general max_files (${g_max}).`);
        if (g_min !== undefined && max_files < parseInt(g_min)) throw new Error(`Conflict with general min_files (${g_min}).`);
      }

      await CompanyWarehouseFieldStatus.findOneAndUpdate(
        { warehouse_id, field_id: f_id },
        { is_enabled: !!final_enabled, min_files: min_files ?? null, max_files: max_files ?? null },
        { upsert: true, session }
      );
    }

    // If validations were changed and the warehouse status is 3 (In Review), 4 (Verified), or 5 (Rejected),
    // set its status back to 2 (Awaiting Information) but NOT deactivate it
    const warehouse = await CompanyWarehouse.findById(warehouse_id).session(session);
    if (warehouse) {
      if (warehouse.status !== 1 && warehouse.status !== 2) {
        warehouse.status = 2; // Awaiting Information
      }
      if (due_date) {
        const parsedDueDate = new Date(due_date);
        if (isNaN(parsedDueDate.getTime())) {
          throw new Error("Invalid due date format.");
        }
        const diffTime = parsedDueDate.getTime() - Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (diffTime <= oneDayMs) {
          throw new Error("Due date must be a future date and more than 1 day (24 hours) from now.");
        }
        warehouse.due_date = parsedDueDate;
      }
      await warehouse.save({ session });
    }

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message: "Warehouse field statuses updated successfully." });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Fetches warehouses by district ID.
 */
const get_warehouses_by_district = async (req, res) => {
  try {
    const { district_id } = req.params;
    if (!district_id) {
      return res.status(400).json({ status: "error", message: "District ID is required." });
    }

    const districtIds = district_id.split(',').map(id => id.trim()).filter(Boolean);
    const rows = await CompanyWarehouse.find({ level_2: { $in: districtIds }, deleted_at: null }).sort({ created_at: -1 });
    if (!rows.length) {
      return res.status(200).json({ status: "success", message: "No warehouses found for the specified district(s).", warehouses: [] });
    }

    // Collect IDs for bulk lookup
    const level0_ids = [...new Set(rows.map(r => r.level_0).filter(Boolean))];
    const level1_ids = [...new Set(rows.map(r => r.level_1).filter(Boolean))];
    const level2_ids = [...new Set(rows.map(r => r.level_2).filter(Boolean))];

    // Bulk Geolocation Lookup
    const [countries, states, districts] = await Promise.all([
      GeoLevel0.find({ _id: { $in: level0_ids } }),
      GeoLevel1.find({ _id: { $in: level1_ids } }),
      GeoLevel2.find({ _id: { $in: level2_ids } }).populate('cluster')
    ]);

    const geoMap = {
      l0: Object.fromEntries(countries.map(c => [c._id.toString(), c.name])),
      l1: Object.fromEntries(states.map(s => [s._id.toString(), s.name])),
      l2: Object.fromEntries(districts.map(d => [d._id.toString(), d.name])),
      l2Cluster: Object.fromEntries(districts.map(d => [d._id.toString(), d.cluster ? { id: d.cluster._id.toString(), name: d.cluster.name } : null]))
    };

    // Bulk Customer Details Lookup
    const allTypeIds = [...new Set(rows.flatMap(r => r.customer_types || []))];
    const type_rows = await CompanyCustomersType.find({ _id: { $in: allTypeIds } });
    const typeMap = Object.fromEntries(type_rows.map(t => [t._id.toString(), t.type_name]));

    // Bulk WarehouseUser, FieldStatus, and FieldData Lookup
    const warehouse_ids = rows.map(r => r._id);
    const [warehouseUsers, allStatuses, allSavedData] = await Promise.all([
      WarehouseUser.find({ warehouse_id: { $in: warehouse_ids } }),
      CompanyWarehouseFieldStatus.find({ warehouse_id: { $in: warehouse_ids }, is_enabled: true }),
      CompanyWarehouseFieldData.find({ warehouse_id: { $in: warehouse_ids } })
    ]);

    const userMap = Object.fromEntries(warehouseUsers.map(u => [u.warehouse_id.toString(), u]));

    // warehouse_id -> array of enabled field_ids
    const enabledFieldsMap = {};
    allStatuses.forEach(s => {
      const whId = s.warehouse_id.toString();
      if (!enabledFieldsMap[whId]) enabledFieldsMap[whId] = [];
      enabledFieldsMap[whId].push(s.field_id.toString());
    });

    // warehouse_id -> map of field_id -> value
    const savedValuesMap = {};
    allSavedData.forEach(d => {
      const whId = d.warehouse_id.toString();
      if (!savedValuesMap[whId]) savedValuesMap[whId] = {};
      savedValuesMap[whId][d.field_id.toString()] = d.value;
    });

    const warehouses = rows.map(row => {
      // Parse images using unified extractor
      const images = extractWarehouseImages(row);

      const status_info = WAREHOUSE_VALIDATION_STATUSES[row.status] || {};

      const customer_types = (row.customer_types || []).map(id => ({
        id: id,
        type_name: typeMap[id.toString()] || "Unknown"
      }));

      const manager_user = userMap[row._id.toString()];
      const manager = manager_user ? {
        name: manager_user.name,
        email: manager_user.email,
        phone: manager_user.phone,
        phone_code: manager_user.phone_code || "+91",
        is_verified: manager_user.is_verified
      } : null;

      const enabledFieldIds = enabledFieldsMap[row._id.toString()] || [];
      const savedValues = savedValuesMap[row._id.toString()] || {};
      let percentage = 0;
      if (enabledFieldIds.length > 0) {
        let filledFieldsCount = 0;
        enabledFieldIds.forEach(fid => {
          const val = savedValues[fid];
          if (val !== null && val !== undefined) {
            const valStr = String(val).trim();
            if (valStr !== '' && valStr !== '[]' && valStr !== '{}') {
              filledFieldsCount++;
            }
          }
        });
        // Account for the fixed images field
        const totalFields = enabledFieldIds.length + 1;
        let imagesFilled = false;
        if (row.images) {
          try {
            const imgArr = JSON.parse(row.images);
            if (Array.isArray(imgArr) && imgArr.length > 0) imagesFilled = true;
          } catch (e) {
            if (String(row.images).trim()) imagesFilled = true;
          }
        }
        if (imagesFilled) filledFieldsCount++;
        percentage = Math.round((filledFieldsCount / totalFields) * 100);
      }

      return {
        id: row.id,
        warehouse_code: row.warehouse_code,
        warehouse_type: row.warehouse_type || null,
        images,
        address: row.address,
        pincode: row.pincode,
        lat: row.lat,
        lng: row.lng,
        status_id: row.status,
        status: status_info.label || null,
        is_active: row.is_active ? 1 : 0,
        country: geoMap.l0[row.level_0?.toString()] || null,
        state: geoMap.l1[row.level_1?.toString()] || null,
        district: geoMap.l2[row.level_2?.toString()] || null,
        cluster: (geoMap.l2Cluster[row.level_2?.toString()] || null)?.name || null,
        cluster_id: (geoMap.l2Cluster[row.level_2?.toString()] || null)?.id || null,
        country_id: row.level_0,
        state_id: row.level_1,
        district_id: row.level_2,
        customer_types,
        manager,
        due_date: row.due_date,
        rejection_reason: row.rejection_reason || null,
        profile_completion_percentage: percentage
      };
    });

    return res.status(200).json({ status: "success", message: "Warehouses fetched successfully.", warehouses });
  } catch (error) {
    console.error("Error in get_warehouses_by_district:", error);
    return res.status(500).json({ status: "error", message: "Internal server error", error: error.message });
  }
};

/**
 * Updates an existing warehouse details (address, pincode, coordinates, district, customer types, type).
 * Allowed only if status is WH_V_001 (1).
 */
const update_warehouse = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const {
      country, state, district, address, pincode, lat, lng,
      customers_types, warehouse_type, warehouse_name, vendor_id,
      categorized_images, warehouse_area_sqft, max_weight_capacity_kg,
      max_volume_cbf, max_pallet_capacity, storage_type, facilities,
      operating_hours, operational_permissions, serviceable_districts,
      commercial_settings, manager_name, manager_email, manager_phone, manager_phone_code
    } = req.body;

    if (!country || !state || !district || !address || !lat || !lng) {
      const missing = [
        !country && 'country',
        !state && 'state',
        !district && 'district',
        !address && 'address',
        !lat && 'lat',
        !lng && 'lng'
      ].filter(Boolean).join(', ');
      return res.status(400).json({ status: "error", message: `Missing required fields: ${missing}` });
    }

    // ---------- Validate warehouse type ----------
    if (!warehouse_type || !VALID_WAREHOUSE_TYPES.includes(warehouse_type)) {
      return res.status(400).json({ status: "error", message: `Warehouse type is required. Must be 'company' or '3pl'. Received: '${warehouse_type}'` });
    }

    // ---------- 3PL Vendor Validation ----------
    if (warehouse_type === '3pl') {
      if (!vendor_id) {
        return res.status(400).json({ status: "error", message: "3PL Warehouse requires an approved 3PL Vendor selection (vendor_id is required)." });
      }
      const vendor = await ThirdPartyLogisticsVendor.findOne({ _id: vendor_id, deleted_at: null }).session(session);
      if (!vendor) {
        return res.status(400).json({ status: "error", message: "Selected 3PL Vendor does not exist." });
      }
      if (vendor.status !== 'approved') {
        return res.status(400).json({ status: "error", message: `Cannot link warehouse to vendor '${vendor.company_name}'. Vendor status is '${vendor.status}', but must be 'approved'.` });
      }
    }

    const warehouse = await CompanyWarehouse.findOne({ _id: id, deleted_at: null }).session(session);
    if (!warehouse) {
      return res.status(404).json({ status: "error", message: "Warehouse not found." });
    }

    // ---------- Check status (Allow update if Pending Validation Setup or Draft) ----------
    if (warehouse.status !== 1 && warehouse.status_code !== 'draft' && warehouse.status_code !== 'pending_setup' && warehouse.status_code !== 'pending_inspection') {
      return res.status(400).json({ status: "error", message: "Warehouse details can only be updated when status is Pending Setup or Draft." });
    }

    // ---------- Validate geolocation ----------
    const country_row = await GeoLevel0.findOne({
      name: { $regex: new RegExp(`^${country.trim()}$`, 'i') },
      is_active: true,
      deleted_at: null
    });
    if (!country_row) throw new Error(`Invalid country: '${country}'.`);

    const state_row = await GeoLevel1.findOne({
      name: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      level_0: country_row._id,
      is_active: true,
      deleted_at: null
    });
    if (!state_row) throw new Error(`Invalid state: '${state}'.`);

    const district_row = await GeoLevel2.findOne({
      name: { $regex: new RegExp(`^${district.trim()}$`, 'i') },
      level_1: state_row._id,
      is_active: true,
      deleted_at: null
    });
    if (!district_row) throw new Error(`Invalid district: '${district}'.`);

    // ---------- Duplicate check in district ----------
    const dupOr = [{ address: address.trim() }];
    if (warehouse_name && warehouse_name.trim()) {
      dupOr.push({ warehouse_name: new RegExp(`^${warehouse_name.trim()}$`, 'i') });
    }
    const duplicateWarehouse = await CompanyWarehouse.findOne({
      level_2: district_row._id,
      _id: { $ne: id },
      deleted_at: null,
      $or: dupOr
    }).session(session);

    if (duplicateWarehouse) {
      throw new Error("A warehouse with this name or exact physical address is already registered in this district.");
    }

    // ---------- Regenerate warehouse code if country or state changes ----------
    let warehouse_code = warehouse.warehouse_code;
    if (warehouse.level_0.toString() !== country_row._id.toString() || warehouse.level_1.toString() !== state_row._id.toString()) {
      const typeTag = warehouse_type === '3pl' ? '3PL_' : '';
      const prefix = `${country.slice(0, 3).toUpperCase()}_${state.slice(0, 3).toUpperCase()}_${typeTag}`;
      const last = await CompanyWarehouse.findOne({ warehouse_code: new RegExp(`^${prefix}`), _id: { $ne: id } })
        .sort({ warehouse_code: -1 })
        .session(session);

      let next_num = "001";
      if (last) {
        const parts = last.warehouse_code.split("_");
        const lastNumStr = parts[parts.length - 1];
        const parsedNum = parseInt(lastNumStr, 10);
        if (!isNaN(parsedNum)) {
          next_num = String(parsedNum + 1).padStart(3, "0");
        }
      }
      warehouse_code = prefix + next_num;
    }

    // Parse images array if provided
    if (categorized_images) {
      const allImgs = [
        categorized_images.front_exterior || categorized_images.exterior,
        categorized_images.main_storage || categorized_images.storage,
        categorized_images.product_racks || categorized_images.racks,
        categorized_images.loading_unloading || categorized_images.loading_area,
        categorized_images.office_security || categorized_images.security,
        ...(categorized_images.additional_images || [])
      ].flat().filter(Boolean);
      if (allImgs.length > 0) warehouse.images = JSON.stringify(allImgs);
      warehouse.categorized_images = categorized_images;
    }

    // ---------- Update Warehouse Master Fields ----------
    if (warehouse_name) warehouse.warehouse_name = warehouse_name.trim();
    warehouse.warehouse_code = warehouse_code;
    warehouse.warehouse_type = warehouse_type;
    warehouse.vendor_id = warehouse_type === '3pl' ? vendor_id : null;
    warehouse.level_0 = country_row._id;
    warehouse.level_1 = state_row._id;
    warehouse.level_2 = district_row._id;
    warehouse.address = address;
    warehouse.pincode = pincode || null;
    warehouse.lat = lat;
    warehouse.lng = lng;
    warehouse.customer_types = customers_types || [];
    if (warehouse_area_sqft !== undefined) warehouse.warehouse_area_sqft = Number(warehouse_area_sqft) || 0;
    if (max_weight_capacity_kg !== undefined) warehouse.max_weight_capacity_kg = Number(max_weight_capacity_kg) || 0;
    if (max_volume_cbf !== undefined) warehouse.max_volume_cbf = Number(max_volume_cbf) || 0;
    if (max_pallet_capacity !== undefined) warehouse.max_pallet_capacity = Number(max_pallet_capacity) || 0;
    if (storage_type) warehouse.storage_type = storage_type;
    if (facilities) warehouse.facilities = facilities;
    if (operating_hours) warehouse.operating_hours = operating_hours;
    if (operational_permissions) warehouse.operational_permissions = operational_permissions;
    if (serviceable_districts) warehouse.serviceable_districts = serviceable_districts;
    if (commercial_settings) warehouse.commercial_settings = commercial_settings;

    // ---------- Create/Update Warehouse Manager if provided ----------
    if (manager_name && manager_email && manager_phone) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manager_email.trim())) {
        throw new Error("Invalid manager email format.");
      }
      if (manager_phone.trim().length < 8) {
        throw new Error("Invalid manager phone length.");
      }

      // Check unique email/phone in WarehouseUser for other warehouses
      const duplicateEmail = await WarehouseUser.findOne({
        email: manager_email.trim().toLowerCase(),
        warehouse_id: { $ne: id }
      }).session(session);
      if (duplicateEmail) {
        throw new Error("A warehouse manager with this email already exists.");
      }
      const duplicatePhone = await WarehouseUser.findOne({
        phone: manager_phone.trim(),
        warehouse_id: { $ne: id }
      }).session(session);
      if (duplicatePhone) {
        throw new Error("A warehouse manager with this phone number already exists.");
      }

      let managerRole = await WarehouseRole.findOne({ name: 'manager' }).session(session);
      if (!managerRole) {
        const [newRole] = await WarehouseRole.create([{ name: 'manager' }], { session });
        managerRole = newRole;
      }

      const existingUser = await WarehouseUser.findOne({ warehouse_id: id }).session(session);
      if (existingUser) {
        if (existingUser.email !== manager_email.trim().toLowerCase() ||
          existingUser.phone !== manager_phone.trim() ||
          existingUser.phone_code !== (manager_phone_code || "+91").trim()) {
          existingUser.is_verified = false;
          existingUser.passcode = null;
        }
        existingUser.name = manager_name.trim();
        existingUser.email = manager_email.trim().toLowerCase();
        existingUser.phone = manager_phone.trim();
        existingUser.phone_code = (manager_phone_code || "+91").trim();
        existingUser.role_id = managerRole._id;
        existingUser.is_active = true;
        await existingUser.save({ session });
      } else {
        await WarehouseUser.create([{
          name: manager_name.trim(),
          email: manager_email.trim().toLowerCase(),
          phone: manager_phone.trim(),
          phone_code: (manager_phone_code || "+91").trim(),
          role_id: managerRole._id,
          warehouse_id: id,
          is_verified: false,
          is_active: true
        }], { session });
      }

      if (warehouse.status === 1) {
        warehouse.status = 2;
      }
    }

    await warehouse.save({ session });

    await session.commitTransaction();
    return res.status(200).json({ status: "success", message: `${warehouse_type === '3pl' ? '3PL' : 'Company'} warehouse updated successfully.` });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Manually changes the validation status of a warehouse.
 * If status is set to 2 (Awaiting Information), also deactivates the warehouse.
 */
const change_warehouse_validation_status = async (req, res) => {
  const session = await company_warehouse_db.startSession();
  session.startTransaction();
  try {
    const { warehouse_id, status, rejection_reason, due_date } = req.body;
    if (!warehouse_id || status === undefined) {
      return res.status(400).json({ status: "error", message: "warehouse_id and status are required." });
    }

    const warehouse = await CompanyWarehouse.findById(warehouse_id).session(session);
    if (!warehouse) {
      return res.status(404).json({ status: "error", message: "Warehouse not found." });
    }

    warehouse.status = Number(status);
    if (Number(status) === 5 && rejection_reason) {
      warehouse.rejection_reason = rejection_reason;
    } else if (Number(status) !== 5) {
      warehouse.rejection_reason = null;
    }

    if (due_date) {
      const parsedDueDate = new Date(due_date);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ status: "error", message: "Invalid due date format." });
      }
      const diffTime = parsedDueDate.getTime() - Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      if (diffTime <= oneDayMs) {
        return res.status(400).json({ status: "error", message: "Due date must be a future date and more than 1 day (24 hours) from now." });
      }
      warehouse.due_date = parsedDueDate;
    } else if (Number(status) === 4 || Number(status) === 3) {
      warehouse.due_date = null;
    }

    if (Number(status) === 4) {
      warehouse.is_active = true;
    }

    await warehouse.save({ session });
    await session.commitTransaction();

    return res.status(200).json({ status: "success", message: "Warehouse validation status updated successfully.", warehouse });
  } catch (err) {
    await session.abortTransaction();
    return res.status(500).json({ status: "error", message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Updates order fulfillment capabilities for a warehouse.
 * Supported types: 'po_order', 'loose_order', 'trial_order'
 */
const update_warehouse_order_fulfillment_types = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_fulfillment_types, order_fulfillment_config } = req.body;

    if (!Array.isArray(order_fulfillment_types)) {
      return res.status(400).json({
        status: "error",
        message: "order_fulfillment_types must be an array of strings (po_order, loose_order, trial_order)."
      });
    }

    const validTypes = ['po_order', 'loose_order', 'trial_order'];
    const sanitizedTypes = order_fulfillment_types.filter(t => validTypes.includes(t));

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({ status: "error", message: "Warehouse not found." });
    }

    const configToSet = (order_fulfillment_config && typeof order_fulfillment_config === 'object')
      ? {
        po_order: order_fulfillment_config.po_order || warehouse.order_fulfillment_config?.po_order || { is_active: sanitizedTypes.includes('po_order') },
        loose_order: order_fulfillment_config.loose_order || warehouse.order_fulfillment_config?.loose_order || { is_active: sanitizedTypes.includes('loose_order') },
        trial_order: order_fulfillment_config.trial_order || warehouse.order_fulfillment_config?.trial_order || { is_active: sanitizedTypes.includes('trial_order') },
      }
      : {
        po_order: { is_active: sanitizedTypes.includes('po_order'), max_daily_capacity: 50 },
        loose_order: { is_active: sanitizedTypes.includes('loose_order'), max_daily_capacity: 100 },
        trial_order: { is_active: sanitizedTypes.includes('trial_order'), max_daily_capacity: 20 },
      };

    // Direct update to MongoDB to guarantee immediate persistence
    await CompanyWarehouse.updateOne(
      { _id: id },
      {
        $set: {
          order_fulfillment_types: sanitizedTypes,
          order_fulfillment_config: configToSet
        }
      }
    );

    return res.status(200).json({
      status: "success",
      message: "Warehouse order fulfillment capabilities updated successfully.",
      warehouse: {
        id: (warehouse._id || warehouse.id)?.toString(),
        warehouse_code: warehouse.warehouse_code,
        order_fulfillment_types: sanitizedTypes,
        order_fulfillment_config: configToSet
      }
    });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to update order fulfillment types: " + err.message });
  }
};

/**
 * GET /warehouses/dashboard/metrics
 * 10 KPI Summary Cards
 */
const get_warehouse_dashboard_metrics = async (req, res) => {
  try {
    const metrics = await calculateWarehouseDashboardKPIs();
    return res.status(200).json({ status: "success", metrics });
  } catch (error) {
    console.error("Error in get_warehouse_dashboard_metrics:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * GET /warehouses/map-markers
 * Color-coded marker data for interactive map view
 */
const get_warehouse_map_markers = async (req, res) => {
  try {
    const markers = await buildWarehouseMapMarkers();
    return res.status(200).json({ status: "success", markers });
  } catch (error) {
    console.error("Error in get_warehouse_map_markers:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * GET /warehouses/:id/checklist
 * Detailed 10-gate audit progress for Company Warehouse
 */
const get_company_warehouse_checklist = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await evaluateCompanyWarehouseChecklist(id);
    return res.status(200).json({ status: "success", audit });
  } catch (error) {
    console.error("Error in get_company_warehouse_checklist:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /warehouses/:id/submit-activation
 * Validates 10-gate readiness
 */
const submit_company_warehouse_activation = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await evaluateCompanyWarehouseChecklist(id);

    if (!audit.can_activate) {
      return res.status(400).json({
        status: "error",
        message: `Warehouse activation cannot proceed. ${audit.missing_gates.length} mandatory configuration gate(s) are incomplete.`,
        missing_gates: audit.missing_gates,
        completed_count: audit.completed_count
      });
    }

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    warehouse.status_code = 'pending_activation';
    warehouse.status = 3; // In Review
    await warehouse.save();

    return res.status(200).json({
      status: "success",
      message: "All 10 configuration gates passed successfully! Warehouse submitted for activation approval.",
      audit
    });
  } catch (error) {
    console.error("Error in submit_company_warehouse_activation:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /warehouses/:id/approve-activation
 * Final Admin approval activating warehouse and operational permissions
 */
const approve_company_warehouse_activation = async (req, res) => {
  try {
    const { id } = req.params;
    const audit = await evaluateCompanyWarehouseChecklist(id);

    if (!audit.can_activate) {
      return res.status(400).json({
        status: "error",
        message: "Cannot approve warehouse activation. Mandatory configuration gates are incomplete.",
        missing_gates: audit.missing_gates
      });
    }

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    warehouse.is_active = true;
    warehouse.status_code = 'active';
    warehouse.status = 4; // Verified
    warehouse.effective_date = new Date();
    warehouse.operational_permissions = {
      inward: true,
      outward: true,
      storage: true,
      dispatch: true,
      kit_assembly: true
    };
    await warehouse.save();

    return res.status(200).json({
      status: "success",
      message: `Warehouse '${warehouse.warehouse_name || warehouse.warehouse_code}' activated successfully.`,
      warehouse
    });
  } catch (error) {
    console.error("Error in approve_company_warehouse_activation:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /warehouses/:id/toggle-gate
 * Manually toggle or verify a specific gate in the 10-gate checklist
 */
const toggle_company_warehouse_gate = async (req, res) => {
  try {
    const { id } = req.params;
    const { gate_key, status } = req.body;

    if (!gate_key) {
      return res.status(400).json({ status: "error", message: "Gate key is required." });
    }

    const warehouse = await CompanyWarehouse.findById(id).lean();
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    const currentStatus = Boolean(warehouse.company_setup_checklist?.[gate_key]?.status);
    const newStatus = status !== undefined ? Boolean(status) : !currentStatus;

    await CompanyWarehouse.updateOne(
      { _id: id },
      {
        $set: {
          [`company_setup_checklist.${gate_key}`]: {
            status: newStatus,
            completed_at: newStatus ? new Date() : null
          }
        }
      }
    );

    const audit = await evaluateCompanyWarehouseChecklist(id);

    return res.status(200).json({
      status: "success",
      message: `Gate '${gate_key}' ${newStatus ? 'marked as verified' : 'unverified'} successfully.`,
      audit
    });
  } catch (error) {
    console.error("Error in toggle_company_warehouse_gate:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /warehouses/:id/inspection
 * Records physical or virtual 3PL warehouse inspection and updates facility specs & photographs
 */
const record_3pl_inspection = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inspector_name,
      inspection_date,
      inspection_type,
      inspection_remarks,
      inspection_report_url,
      result,
      // Admin editable facility specs
      warehouse_area_sqft,
      max_weight_capacity_kg,
      max_volume_cbf,
      max_pallet_capacity,
      storage_type,
      facilities,
      categorized_images,
      warehouse_name
    } = req.body;

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    // Update facility details if provided by Admin
    if (warehouse_name && warehouse_name.trim()) warehouse.warehouse_name = warehouse_name.trim();
    if (warehouse_area_sqft !== undefined) warehouse.warehouse_area_sqft = Number(warehouse_area_sqft) || 0;
    if (max_weight_capacity_kg !== undefined) warehouse.max_weight_capacity_kg = Number(max_weight_capacity_kg) || 0;
    if (max_volume_cbf !== undefined) warehouse.max_volume_cbf = Number(max_volume_cbf) || 0;
    if (max_pallet_capacity !== undefined) warehouse.max_pallet_capacity = Number(max_pallet_capacity) || 0;
    if (storage_type) warehouse.storage_type = storage_type;
    if (facilities) {
      warehouse.facilities = {
        ...(warehouse.facilities?.toObject ? warehouse.facilities.toObject() : warehouse.facilities),
        ...facilities
      };
    }

    // Update categorized images
    if (categorized_images) {
      const allImgs = [
        categorized_images.front_exterior || categorized_images.exterior,
        categorized_images.main_storage || categorized_images.storage,
        categorized_images.product_racks || categorized_images.racks,
        categorized_images.loading_unloading || categorized_images.loading_area,
        categorized_images.office_security || categorized_images.security,
        ...(categorized_images.additional_images || [])
      ].flat().filter(Boolean);
      if (allImgs.length > 0) warehouse.images = JSON.stringify(allImgs);
      warehouse.categorized_images = categorized_images;
    }

    // Update inspection details
    const existingInspection = warehouse.inspection_details || {};
    let inspectionStatus = existingInspection.status || 'pending';

    if (result === 'passed') {
      inspectionStatus = 'passed';
      warehouse.status_code = 'active';
      warehouse.status = 4; // Verified
      warehouse.is_active = true;
      warehouse.effective_date = new Date();
      warehouse.operational_permissions = {
        inward: true,
        outward: true,
        storage: true,
        dispatch: true,
        kit_assembly: true
      };
      if (!warehouse.company_setup_checklist) warehouse.company_setup_checklist = {};
      warehouse.company_setup_checklist.images_and_docs = { status: true, completed_at: new Date() };
      warehouse.company_setup_checklist.storage_capacity = { status: true, completed_at: new Date() };
      warehouse.company_setup_checklist.inward_outward_workflow = { status: true, completed_at: new Date() };
      warehouse.markModified('company_setup_checklist');
    } else if (result === 'failed') {
      inspectionStatus = 'failed';
      warehouse.status_code = 'pending_inspection';
      warehouse.status = 5; // Rejected
      warehouse.rejection_reason = inspection_remarks;
      warehouse.is_active = false;
    } else if (result === 're_inspection_required') {
      inspectionStatus = 're_inspection_required';
      warehouse.status_code = 'pending_inspection';
      warehouse.is_active = false;
    }
    // If result === 'update_only', keep inspectionStatus as is (admin saving facility specs/photos draft)

    warehouse.inspection_details = {
      status: inspectionStatus,
      inspector_name: inspector_name || existingInspection.inspector_name || 'Admin Operations Lead',
      inspection_date: inspection_date ? new Date(inspection_date) : (existingInspection.inspection_date || new Date()),
      inspection_type: inspection_type || existingInspection.inspection_type || 'physical',
      inspection_remarks: inspection_remarks !== undefined ? inspection_remarks : (existingInspection.inspection_remarks || ''),
      inspection_report_url: inspection_report_url !== undefined ? inspection_report_url : (existingInspection.inspection_report_url || null)
    };

    await warehouse.save();

    const responseMsg = result === 'passed'
      ? "3PL warehouse inspected, verified, and activated successfully!"
      : result === 'update_only'
        ? "3PL facility details and photographs updated successfully."
        : `Inspection recorded successfully. Result: ${result}.`;

    return res.status(200).json({
      status: "success",
      message: responseMsg,
      inspection: warehouse.inspection_details,
      warehouse
    });
  } catch (error) {
    console.error("Error in record_3pl_inspection:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * POST /warehouses/:id/approve-3pl
 * Approves 3PL warehouse after passed inspection
 */
const approve_3pl_warehouse = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    if (warehouse.inspection_details?.status !== 'passed') {
      return res.status(400).json({
        status: "error",
        message: "Cannot approve 3PL warehouse. Warehouse inspection must be recorded as 'passed' first."
      });
    }

    warehouse.status_code = 'approved';
    await warehouse.save();

    return res.status(200).json({
      status: "success",
      message: "3PL warehouse approved successfully. Ready for commercial & kit activation.",
      warehouse
    });
  } catch (error) {
    console.error("Error in approve_3pl_warehouse:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * PUT /warehouses/:id/commercials
 * Sets 3PL commercial rates and SLA
 */
const update_3pl_commercials = async (req, res) => {
  try {
    const { id } = req.params;
    const { commercial_settings } = req.body;

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    warehouse.commercial_settings = {
      ...warehouse.commercial_settings?.toObject(),
      ...commercial_settings
    };

    await warehouse.save();

    return res.status(200).json({
      status: "success",
      message: "3PL commercial settings updated successfully.",
      commercial_settings: warehouse.commercial_settings
    });
  } catch (error) {
    console.error("Error in update_3pl_commercials:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * PATCH /warehouses/:id/toggle-status
 * Soft suspend / reactivate warehouse
 */
const toggle_warehouse_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'suspend' | 'activate'

    const warehouse = await CompanyWarehouse.findById(id);
    if (!warehouse) return res.status(404).json({ status: "error", message: "Warehouse not found." });

    if (action === 'suspend') {
      warehouse.is_active = false;
      warehouse.status_code = 'suspended';
      warehouse.rejection_reason = reason || 'Suspended by Administrator';
      warehouse.operational_permissions = {
        inward: false,
        outward: false,
        storage: false,
        dispatch: false,
        kit_assembly: false
      };
    } else if (action === 'activate') {
      warehouse.is_active = true;
      warehouse.status_code = 'active';
      warehouse.rejection_reason = null;
      warehouse.operational_permissions = {
        inward: true,
        outward: true,
        storage: true,
        dispatch: true,
        kit_assembly: true
      };
    }

    await warehouse.save();

    return res.status(200).json({
      status: "success",
      message: `Warehouse status changed to '${warehouse.status_code}'.`,
      warehouse
    });
  } catch (error) {
    console.error("Error in toggle_warehouse_status:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

module.exports = {
  add_warehouse,
  get_warehouses,
  get_warehouse,
  update_warehouse,
  get_warehouse_validation_sections,
  add_warehouse_validation_section,
  get_warehouse_validation_section,
  add_warehouse_validation_field,
  set_warehouse_validation_field_statuses,
  get_warehouses_by_district,
  change_warehouse_validation_status,
  update_warehouse_order_fulfillment_types,
  get_warehouse_dashboard_metrics,
  get_warehouse_map_markers,
  get_company_warehouse_checklist,
  submit_company_warehouse_activation,
  approve_company_warehouse_activation,
  toggle_company_warehouse_gate,
  record_3pl_inspection,
  approve_3pl_warehouse,
  update_3pl_commercials,
  toggle_warehouse_status
};