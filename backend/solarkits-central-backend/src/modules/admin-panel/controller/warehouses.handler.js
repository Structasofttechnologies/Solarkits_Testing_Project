const {
  CompanyWarehouse, CompanyWarehouseValidationSection,
  CompanyWarehouseValidationField, CompanyWarehouseFieldValidation,
  CompanyWarehouseFieldDependency, CompanyWarehouseFieldStatus,
  WarehouseRole, WarehouseUser, CompanyWarehouseFieldData
} = require("../models/company_warehouse_db");
const { WAREHOUSE_VALIDATION_STATUSES } = require("../models/company_warehouse_db/constants");
const { GeoLevel0, GeoLevel1, GeoLevel2 } = require("../models/geolocation_db");
const { CompanyCustomersType } = require("../models/core_db");
const { company_warehouse_db } = require("../config/databases");
const mongoose = require('mongoose');

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
    const { country, state, district, address, pincode, lat, lng, customers_types, warehouse_type, manager_name, manager_email, manager_phone, manager_phone_code } = req.body;
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

    // ---------- District uniqueness check (max 1 warehouse per district) ----------
    const district_warehouse = await CompanyWarehouse.findOne({
      level_2: district_row._id,
      deleted_at: null
    }).session(session);
    if (district_warehouse) {
      throw new Error("This district already has a warehouse. A district can have at most one warehouse.");
    }

    // ---------- Generate Code ----------
    const prefix = `${country.slice(0, 3).toUpperCase()}_${state.slice(0, 3).toUpperCase()}_`;
    const last = await CompanyWarehouse.findOne({ warehouse_code: new RegExp(`^${prefix}`) })
      .sort({ warehouse_code: -1 })
      .session(session);

    let next_num = "001";
    if (last) {
      const parts = last.warehouse_code.split("_");
      next_num = String(parseInt(parts[2]) + 1).padStart(3, "0");
    }
    const warehouse_code = prefix + next_num;

    const initialStatus = (manager_name && manager_email && manager_phone) ? 2 : 1;

    // ---------- Insert Warehouse ----------
    const [newWarehouse] = await CompanyWarehouse.create([{
      warehouse_code,
      warehouse_type,
      status: initialStatus, // 1: Pending Validation Setup, 2: Awaiting Information
      level_0: country_row._id,
      level_1: state_row._id,
      level_2: district_row._id,
      address,
      pincode: pincode || null,
      lat,
      lng,
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
    const [warehouseUsers, allStatuses, allSavedData] = await Promise.all([
      WarehouseUser.find({ warehouse_id: { $in: warehouse_ids } }).lean(),
      CompanyWarehouseFieldStatus.find({ warehouse_id: { $in: warehouse_ids }, is_enabled: true }).lean(),
      CompanyWarehouseFieldData.find({ warehouse_id: { $in: warehouse_ids } }).lean()
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
      // Parse images
      let images = [];
      if (row.images && row.images.startsWith("[")) {
        try { images = JSON.parse(row.images); } catch { images = []; }
      } else if (row.images && row.images.includes(",")) {
        images = row.images.split(",").map(i => i.trim());
      } else if (row.images) {
        images = [row.images];
      }

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
        id: (row._id || row.id)?.toString(),
        _id: (row._id || row.id)?.toString(),
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
        country_name: geoMap.l0[row.level_0?.toString()] || null,
        state: geoMap.l1[row.level_1?.toString()] || null,
        state_name: geoMap.l1[row.level_1?.toString()] || null,
        district: geoMap.l2[row.level_2?.toString()] || null,
        district_name: geoMap.l2[row.level_2?.toString()] || null,
        cluster: (geoMap.l2Cluster[row.level_2?.toString()] || null)?.name || null,
        cluster_name: (geoMap.l2Cluster[row.level_2?.toString()] || null)?.name || null,
        cluster_id: (geoMap.l2Cluster[row.level_2?.toString()] || null)?.id || null,
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

    // Fetch geolocation names
    const [country_row, state_row, district_row, manager_user] = await Promise.all([
      GeoLevel0.findById(warehouse.level_0),
      GeoLevel1.findById(warehouse.level_1),
      GeoLevel2.findById(warehouse.level_2).populate('cluster'),
      WarehouseUser.findOne({ warehouse_id: id })
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

    // Parse images
    let images = [];
    if (warehouse.images && warehouse.images.startsWith("[")) {
      try { images = JSON.parse(warehouse.images); } catch { images = []; }
    } else if (warehouse.images && warehouse.images.includes(",")) {
      images = warehouse.images.split(",").map(i => i.trim());
    } else if (warehouse.images) {
      images = [warehouse.images];
    }

    return res.status(200).json({
      status: "success",
      message: "Warehouse fetched successfully.",
      warehouse: {
        id: (warehouse._id || warehouse.id)?.toString(),
        _id: (warehouse._id || warehouse.id)?.toString(),
        warehouse_code: warehouse.warehouse_code,
        warehouse_type: warehouse.warehouse_type || null,
        images,
        address: warehouse.address,
        pincode: warehouse.pincode,
        lat: warehouse.lat,
        lng: warehouse.lng,
        status_id: warehouse.status,
        is_active: warehouse.is_active ? 1 : 0,
        country: country_row ? country_row.name : "",
        state: state_row ? state_row.name : "",
        district: district_row ? district_row.name : "",
        cluster: district_row && district_row.cluster ? district_row.cluster.name : "",
        cluster_id: district_row && district_row.cluster ? district_row.cluster._id : null,
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
      // Parse images
      let images = [];
      if (row.images && row.images.startsWith("[")) {
        try { images = JSON.parse(row.images); } catch { images = []; }
      } else if (row.images && row.images.includes(",")) {
        images = row.images.split(",").map(i => i.trim());
      } else if (row.images) {
        images = [row.images];
      }

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
    const { country, state, district, address, pincode, lat, lng, customers_types, warehouse_type, manager_name, manager_email, manager_phone, manager_phone_code } = req.body;

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

    const warehouse = await CompanyWarehouse.findOne({ _id: id, deleted_at: null }).session(session);
    if (!warehouse) {
      return res.status(404).json({ status: "error", message: "Warehouse not found." });
    }

    // ---------- Check status (Only allow update if Pending Validation Setup) ----------
    if (warehouse.status !== 1) {
      return res.status(400).json({ status: "error", message: "Warehouse details can only be updated when status is Pending Validation Setup." });
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

    // ---------- District uniqueness check (max 1 warehouse per district) ----------
    const district_warehouse = await CompanyWarehouse.findOne({
      level_2: district_row._id,
      _id: { $ne: id },
      deleted_at: null
    }).session(session);
    if (district_warehouse) {
      throw new Error("This district already has a warehouse. A district can have at most one warehouse.");
    }

    // ---------- Regenerate warehouse code if country or state changes ----------
    let warehouse_code = warehouse.warehouse_code;
    if (warehouse.level_0.toString() !== country_row._id.toString() || warehouse.level_1.toString() !== state_row._id.toString()) {
      const prefix = `${country.slice(0, 3).toUpperCase()}_${state.slice(0, 3).toUpperCase()}_`;
      const last = await CompanyWarehouse.findOne({ warehouse_code: new RegExp(`^${prefix}`), _id: { $ne: id } })
        .sort({ warehouse_code: -1 })
        .session(session);

      let next_num = "001";
      if (last) {
        const parts = last.warehouse_code.split("_");
        next_num = String(parseInt(parts[2]) + 1).padStart(3, "0");
      }
      warehouse_code = prefix + next_num;
    }

    // ---------- Update Warehouse ----------
    warehouse.warehouse_code = warehouse_code;
    warehouse.warehouse_type = warehouse_type;
    warehouse.level_0 = country_row._id;
    warehouse.level_1 = state_row._id;
    warehouse.level_2 = district_row._id;
    warehouse.address = address;
    warehouse.pincode = pincode || null;
    warehouse.lat = lat;
    warehouse.lng = lng;
    warehouse.customer_types = customers_types || [];

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
  update_warehouse_order_fulfillment_types
};