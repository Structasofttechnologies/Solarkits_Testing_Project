const { DeliveryVehicle, DeliveryDriver } = require('../models/company_warehouse_db');

const resolveWarehouseId = async (user, req = null) => {
  if (req?.query?.warehouse_id) return req.query.warehouse_id;
  if (req?.headers?.['x-warehouse-id']) return req.headers['x-warehouse-id'];
  if (user?.warehouse_id) return user.warehouse_id;
  // Fallback if super admin or other roles don't have it
  const { CompanyWarehouse } = require('../models/company_warehouse_db');
  let warehouse = await CompanyWarehouse.findOne({ is_active: true, deleted_at: null }).lean();
  if (!warehouse) {
    warehouse = await CompanyWarehouse.findOne({ deleted_at: null }).lean();
  }
  return warehouse ? warehouse._id : null;
};

// ─── VEHICLE CRUD ─────────────────────────────────────────────────────────────

exports.get_vehicles = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const vehicles = await DeliveryVehicle.find({ warehouse_id, is_deleted: false }).sort({ created_at: -1 });
    return res.status(200).json({ status: "success", data: vehicles });
  } catch (err) {
    console.error("Error in get_vehicles:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch vehicles." });
  }
};

exports.add_vehicle = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const {
      name,
      registration_number,
      capacity_kg,
      base_rate_per_km,
      fuel_type,
      fuel_efficiency_kmpl,
      fuel_price_per_litre,
      // Module 1.2 fields
      vehicle_type,
      max_kits,
      max_kw,
      max_weight_kg,
      serviceable_states,
      serviceable_districts,
      serviceable_pincodes,
      assigned_driver_id,
    } = req.body;

    if (!name || !registration_number || capacity_kg === undefined || base_rate_per_km === undefined || fuel_efficiency_kmpl === undefined || fuel_price_per_litre === undefined) {
      return res.status(400).json({ status: "error", message: "All required fields (name, registration_number, capacity_kg, base_rate_per_km, fuel_efficiency_kmpl, fuel_price_per_litre) must be provided." });
    }

    const vehicle = new DeliveryVehicle({
      warehouse_id,
      name: name.trim(),
      vehicle_type: vehicle_type || 'Custom',
      registration_number: registration_number.trim(),
      capacity_kg: Number(capacity_kg),
      base_rate_per_km: Number(base_rate_per_km),
      fuel_type: fuel_type || 'Diesel',
      fuel_efficiency_kmpl: Number(fuel_efficiency_kmpl),
      fuel_price_per_litre: Number(fuel_price_per_litre),
      // Module 1.2: Logistical limits
      max_kits:       Number(max_kits || 0),
      max_kw:         Number(max_kw || 0),
      max_weight_kg:  Number(max_weight_kg || capacity_kg || 0),
      serviceable_states:    Array.isArray(serviceable_states)    ? serviceable_states    : [],
      serviceable_districts: Array.isArray(serviceable_districts) ? serviceable_districts : [],
      serviceable_pincodes:  Array.isArray(serviceable_pincodes)  ? serviceable_pincodes  : [],
      assigned_driver_id: assigned_driver_id || null,
    });

    await vehicle.save();
    return res.status(201).json({ status: "success", message: "Vehicle added successfully.", data: vehicle });
  } catch (err) {
    console.error("Error in add_vehicle:", err);
    return res.status(500).json({ status: "error", message: "Failed to add vehicle." });
  }
};

exports.update_vehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const updates = req.body;
    const vehicle = await DeliveryVehicle.findOneAndUpdate(
      { _id: id, warehouse_id, is_deleted: false },
      { $set: updates },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ status: "error", message: "Vehicle not found." });
    }

    return res.status(200).json({ status: "success", message: "Vehicle updated successfully.", data: vehicle });
  } catch (err) {
    console.error("Error in update_vehicle:", err);
    return res.status(500).json({ status: "error", message: "Failed to update vehicle." });
  }
};

exports.delete_vehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const vehicle = await DeliveryVehicle.findOneAndUpdate(
      { _id: id, warehouse_id, is_deleted: false },
      { $set: { is_deleted: true, deleted_at: new Date() } },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ status: "error", message: "Vehicle not found." });
    }

    // Also unassign this vehicle from any drivers
    await DeliveryDriver.updateMany({ assigned_vehicle_id: id }, { $set: { assigned_vehicle_id: null } });

    return res.status(200).json({ status: "success", message: "Vehicle deleted successfully." });
  } catch (err) {
    console.error("Error in delete_vehicle:", err);
    return res.status(500).json({ status: "error", message: "Failed to delete vehicle." });
  }
};


// ─── DRIVER CRUD ──────────────────────────────────────────────────────────────

exports.get_drivers = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const drivers = await DeliveryDriver.find({ warehouse_id, is_deleted: false })
      .populate('assigned_vehicle_id')
      .sort({ created_at: -1 });

    return res.status(200).json({ status: "success", data: drivers });
  } catch (err) {
    console.error("Error in get_drivers:", err);
    return res.status(500).json({ status: "error", message: "Failed to fetch drivers." });
  }
};

exports.add_driver = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const { name, contact, license_number, assigned_vehicle_id } = req.body;

    if (!name || !contact || !license_number) {
      return res.status(400).json({ status: "error", message: "Name, contact and license number are required." });
    }

    const driver = new DeliveryDriver({
      warehouse_id,
      name,
      contact,
      license_number,
      assigned_vehicle_id: assigned_vehicle_id || null
    });

    await driver.save();
    
    // Populate before return
    const populated = await DeliveryDriver.findById(driver._id).populate('assigned_vehicle_id');

    return res.status(201).json({ status: "success", message: "Driver added successfully.", data: populated });
  } catch (err) {
    console.error("Error in add_driver:", err);
    return res.status(500).json({ status: "error", message: "Failed to add driver." });
  }
};

exports.update_driver = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const updates = req.body;
    // ensure empty assigned_vehicle_id is mapped to null
    if (updates.assigned_vehicle_id === "") updates.assigned_vehicle_id = null;

    const driver = await DeliveryDriver.findOneAndUpdate(
      { _id: id, warehouse_id, is_deleted: false },
      { $set: updates },
      { new: true }
    ).populate('assigned_vehicle_id');

    if (!driver) {
      return res.status(404).json({ status: "error", message: "Driver not found." });
    }

    return res.status(200).json({ status: "success", message: "Driver updated successfully.", data: driver });
  } catch (err) {
    console.error("Error in update_driver:", err);
    return res.status(500).json({ status: "error", message: "Failed to update driver." });
  }
};

exports.delete_driver = async (req, res) => {
  try {
    const { id } = req.params;
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const driver = await DeliveryDriver.findOneAndUpdate(
      { _id: id, warehouse_id, is_deleted: false },
      { $set: { is_deleted: true, deleted_at: new Date() } },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ status: "error", message: "Driver not found." });
    }

    return res.status(200).json({ status: "success", message: "Driver deleted successfully." });
  } catch (err) {
    console.error("Error in delete_driver:", err);
    return res.status(500).json({ status: "error", message: "Failed to delete driver." });
  }
};

// ─── VEHICLE COMPARISON AND COST METRICS ──────────────────────────────────────

exports.compare_vehicles = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: "error", message: "User is not linked to any warehouse." });
    }

    const vehicles = await DeliveryVehicle.find({ warehouse_id, is_active: true, is_deleted: false }).lean();
    const drivers = await DeliveryDriver.find({ warehouse_id, is_active: true, is_deleted: false }).lean();

    const comparisonData = vehicles.map(v => {
      // Fuel cost per km = fuel_price / efficiency
      const fuelCostPerKm = v.fuel_efficiency_kmpl > 0 ? (v.fuel_price_per_litre / v.fuel_efficiency_kmpl) : 0;
      const totalCostPerKm = v.base_rate_per_km + fuelCostPerKm;
      
      // Find assigned drivers
      const assignedDrivers = drivers.filter(d => String(d.assigned_vehicle_id) === String(v._id));

      return {
        ...v,
        fuel_cost_per_km: parseFloat(fuelCostPerKm.toFixed(2)),
        total_cost_per_km: parseFloat(totalCostPerKm.toFixed(2)),
        drivers: assignedDrivers.map(d => ({ name: d.name, contact: d.contact }))
      };
    });

    // Sort cheapest total cost per km first
    comparisonData.sort((a, b) => a.total_cost_per_km - b.total_cost_per_km);

    return res.status(200).json({ status: "success", data: comparisonData });
  } catch (err) {
    console.error("Error in compare_vehicles:", err);
    return res.status(500).json({ status: "error", message: "Failed to compute cost comparison." });
  }
};

// ─── MODULE 1.2: SMART VEHICLE RECOMMENDATION ENGINE ──────────────────────────

/**
 * GET /warehouse/vehicles/recommend-for-order
 * Query params: total_kits, total_kw, total_weight_kg, district_id
 *
 * Returns the best-fit (closest capacity without exceeding limits) vehicle
 * available in this warehouse for the given order load metrics.
 */
exports.recommend_vehicle_for_order = async (req, res) => {
  try {
    const warehouse_id = await resolveWarehouseId(req.user, req);
    if (!warehouse_id) {
      return res.status(400).json({ status: 'error', message: 'User is not linked to any warehouse.' });
    }

    const {
      total_kits     = 0,
      total_kw       = 0,
      total_weight_kg = 0,
      district_id,
    } = req.query;

    const orderKits   = Number(total_kits);
    const orderKw     = Number(total_kw);
    const orderWeight = Number(total_weight_kg);

    // Fetch all active vehicles for this warehouse
    const vehicles = await DeliveryVehicle
      .find({ warehouse_id, is_active: true, is_deleted: false })
      .populate('assigned_driver_id', 'name contact')
      .lean();

    // Filter: vehicle must satisfy ALL order load constraints AND service the delivery district
    const eligibleVehicles = vehicles.filter(v => {
      // Must meet capacity constraints
      const meetsKits   = v.max_kits   <= 0 || v.max_kits   >= orderKits;
      const meetsKw     = v.max_kw     <= 0 || v.max_kw     >= orderKw;
      const meetsWeight = v.max_weight_kg <= 0 || v.max_weight_kg >= orderWeight;

      // Must service the delivery district (empty = serves all)
      const meetsDistrict = !district_id ||
        !v.serviceable_districts.length ||
        v.serviceable_districts.some(d => String(d) === String(district_id));

      return meetsKits && meetsKw && meetsWeight && meetsDistrict;
    });

    if (eligibleVehicles.length === 0) {
      return res.status(200).json({
        status: 'success',
        recommended: null,
        all_eligible: [],
        message: 'No eligible vehicles found for this order load. Consider assigning manually.',
      });
    }

    // Sort by closest-fit: ascending by max_weight_kg so the least-excess vehicle is first
    eligibleVehicles.sort((a, b) => a.max_weight_kg - b.max_weight_kg);

    const recommended = eligibleVehicles[0];

    // Enrich with driver info
    let driver = null;
    if (recommended.assigned_driver_id) {
      driver = {
        driver_id:      recommended.assigned_driver_id._id || recommended.assigned_driver_id,
        driver_name:    recommended.assigned_driver_id.name || null,
        driver_contact: recommended.assigned_driver_id.contact || null,
      };
    }

    return res.status(200).json({
      status: 'success',
      recommended: {
        ...recommended,
        driver,
      },
      all_eligible: eligibleVehicles,
      message: `Recommended: ${recommended.name} (${recommended.registration_number}) — optimal fit for your order load.`,
    });
  } catch (err) {
    console.error('Error in recommend_vehicle_for_order:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to compute vehicle recommendation.' });
  }
};
