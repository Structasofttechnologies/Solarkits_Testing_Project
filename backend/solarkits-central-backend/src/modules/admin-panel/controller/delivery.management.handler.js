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
  WarehouseComboKit,
  EpcOrder,
  FpoOrder,
} = require('../models/india_solarshop_db');
const { CompanyWarehouse } = require('../models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../models/geolocation_db');
const deliveryService = require('../services/delivery.management.service');
const estimatorHandler = require('./estimator.admin.handler');

// ─── 1. VEHICLE MASTER CRUD ───────────────────────────────────────────────────
exports.get_vehicle_masters = async (req, res) => {
  try {
    const list = await DeliveryVehicleMaster.find({ deleted_at: null }).sort({ created_at: -1 });
    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_vehicle_masters error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_vehicle_master = async (req, res) => {
  try {
    const { name, brand_make, model, length_ft, width_ft, height_ft, max_load_kg, max_delivery_distance_km } = req.body;
    if (!name || !brand_make || !model || !length_ft || !width_ft || !height_ft || !max_load_kg || !max_delivery_distance_km) {
      return res.status(400).json({ status: 'error', message: 'All vehicle master fields are required.' });
    }

    const count = await DeliveryVehicleMaster.countDocuments();
    const vehicle_code = `VEH-${String(count + 1).padStart(3, '0')}`;

    const newMaster = new DeliveryVehicleMaster({
      vehicle_code,
      name: name.trim(),
      brand_make: brand_make.trim(),
      model: model.trim(),
      length_ft: Number(length_ft),
      width_ft: Number(width_ft),
      height_ft: Number(height_ft),
      max_load_kg: Number(max_load_kg),
      max_delivery_distance_km: Number(max_delivery_distance_km),
      status: req.body.status || 'Active',
      created_by: req.user?._id || null,
    });

    await newMaster.save();
    return res.status(201).json({ status: 'success', data: newMaster, message: 'Vehicle Master created successfully.' });
  } catch (err) {
    console.error('create_vehicle_master error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_vehicle_master = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DeliveryVehicleMaster.findByIdAndUpdate(id, { ...req.body, updated_by: req.user?._id }, { new: true });
    if (!updated) return res.status(404).json({ status: 'error', message: 'Vehicle Master not found.' });
    return res.status(200).json({ status: 'success', data: updated, message: 'Vehicle Master updated successfully.' });
  } catch (err) {
    console.error('update_vehicle_master error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.delete_vehicle_master = async (req, res) => {
  try {
    const { id } = req.params;
    await DeliveryVehicleMaster.findByIdAndUpdate(id, { deleted_at: new Date(), is_active: false });
    return res.status(200).json({ status: 'success', message: 'Vehicle Master deleted successfully.' });
  } catch (err) {
    console.error('delete_vehicle_master error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 2. SERVICE PROVIDER CRUD ─────────────────────────────────────────────────
exports.get_service_providers = async (req, res) => {
  try {
    const list = await DeliveryServiceProvider.find({ deleted_at: null }).sort({ created_at: -1 });
    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_service_providers error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_service_provider = async (req, res) => {
  try {
    const { name, owner_name, mobile_number } = req.body;
    if (!name || !owner_name || !mobile_number) {
      return res.status(400).json({ status: 'error', message: 'Name, Owner Contact, and Mobile Number are required.' });
    }

    const count = await DeliveryServiceProvider.countDocuments();
    const provider_code = `TSP-${String(count + 1).padStart(3, '0')}`;

    const newProvider = new DeliveryServiceProvider({
      provider_code,
      ...req.body,
      created_by: req.user?._id || null,
    });

    await newProvider.save();
    return res.status(201).json({ status: 'success', data: newProvider, message: 'Service Provider onboarded successfully.' });
  } catch (err) {
    console.error('create_service_provider error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_service_provider = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DeliveryServiceProvider.findByIdAndUpdate(id, { ...req.body, updated_by: req.user?._id }, { new: true });
    if (!updated) return res.status(404).json({ status: 'error', message: 'Service Provider not found.' });
    return res.status(200).json({ status: 'success', data: updated, message: 'Service Provider updated successfully.' });
  } catch (err) {
    console.error('update_service_provider error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.delete_service_provider = async (req, res) => {
  try {
    const { id } = req.params;
    await DeliveryServiceProvider.findByIdAndUpdate(id, { deleted_at: new Date(), status: 'Inactive' });
    return res.status(200).json({ status: 'success', message: 'Service Provider deactivated.' });
  } catch (err) {
    console.error('delete_service_provider error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 3. PHYSICAL VEHICLE FLEET CRUD ───────────────────────────────────────────
exports.get_fleet_vehicles = async (req, res) => {
  try {
    const { provider_id, status } = req.query;
    const query = { is_deleted: false };
    if (provider_id) query.service_provider_id = provider_id;
    if (status) query.current_status = status;

    const list = await DeliveryVehicleFleet.find(query)
      .populate('service_provider_id', 'name owner_name mobile_number customer_service_number')
      .populate('vehicle_master_id', 'name brand_make model max_load_kg max_delivery_distance_km length_ft width_ft height_ft')
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_fleet_vehicles error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_fleet_vehicle = async (req, res) => {
  try {
    const { service_provider_id, vehicle_master_id, registration_number, load_capacity_kg } = req.body;
    if (!service_provider_id || !vehicle_master_id || !registration_number || !load_capacity_kg) {
      return res.status(400).json({ status: 'error', message: 'Provider, Vehicle Master, Registration #, and Capacity are required.' });
    }

    const regUpper = registration_number.trim().toUpperCase();
    const existing = await DeliveryVehicleFleet.findOne({ registration_number: regUpper, is_deleted: false });
    if (existing) {
      return res.status(400).json({ status: 'error', message: `Vehicle ${regUpper} already registered.` });
    }

    const newVehicle = new DeliveryVehicleFleet({
      ...req.body,
      registration_number: regUpper,
      load_capacity_kg: Number(load_capacity_kg),
      current_status: req.body.current_status || 'Available',
    });

    await newVehicle.save();
    return res.status(201).json({ status: 'success', data: newVehicle, message: 'Physical vehicle registered successfully.' });
  } catch (err) {
    console.error('create_fleet_vehicle error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_fleet_vehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DeliveryVehicleFleet.findByIdAndUpdate(id, req.body, { new: true })
      .populate('service_provider_id', 'name')
      .populate('vehicle_master_id', 'name');

    if (!updated) return res.status(404).json({ status: 'error', message: 'Vehicle not found.' });
    return res.status(200).json({ status: 'success', data: updated, message: 'Vehicle updated successfully.' });
  } catch (err) {
    console.error('update_fleet_vehicle error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 4. COMBOKIT WEIGHT MASTER CRUD & CAPACITY CHART ──────────────────────────
exports.get_combokit_weights = async (req, res) => {
  try {
    const weights = await ComboKitWeightMaster.find({ deleted_at: null })
      .populate({
        path: 'kit_id',
        match: { deleted_at: null },
        select: 'name capacity base_price_cached is_active deleted_at'
      })
      .sort({ created_at: -1 });

    // Filter to only include weights whose corresponding kit is still active (not soft-deleted)
    const activeWeights = weights.filter(w => w.kit_id);

    // Also get active kits that don't have weight records yet
    const existingKitIds = activeWeights.map(w => w.kit_id?._id?.toString() || w.kit_id?.toString()).filter(Boolean);
    const unconfiguredKits = await WarehouseComboKit.find({
      _id: { $nin: existingKitIds },
      is_active: true,
      deleted_at: null,
    }).select('name capacity base_price_cached kit_image').lean();

    return res.status(200).json({
      status: 'success',
      data: activeWeights,
      unconfigured_kits: unconfiguredKits,
    });
  } catch (err) {
    console.error('get_combokit_weights error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.upsert_combokit_weight = async (req, res) => {
  try {
    const { kit_id, solar_modules_weight_kg, inverter_weight_kg, boskit_weight_kg, structure_material_weight_kg, packaging_weight_kg, notes } = req.body;
    if (!kit_id) return res.status(400).json({ status: 'error', message: 'ComboKit ID is required.' });

    const totalWeight = Number(solar_modules_weight_kg || 0) +
      Number(inverter_weight_kg || 0) +
      Number(boskit_weight_kg || 0) +
      Number(structure_material_weight_kg || 0) +
      Number(packaging_weight_kg || 0);

    const kit = await WarehouseComboKit.findById(kit_id).lean();

    const record = await ComboKitWeightMaster.findOneAndUpdate(
      { kit_id },
      {
        kit_id,
        kit_name: kit ? kit.name : 'Solar Kit',
        capacity_kw: kit ? kit.capacity : 1,
        solar_modules_weight_kg: Number(solar_modules_weight_kg || 0),
        inverter_weight_kg: Number(inverter_weight_kg || 0),
        boskit_weight_kg: Number(boskit_weight_kg || 0),
        structure_material_weight_kg: Number(structure_material_weight_kg || 0),
        packaging_weight_kg: Number(packaging_weight_kg || 0),
        total_kit_weight_kg: totalWeight,
        notes: notes || null,
        updated_by: req.user?._id || null,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ status: 'success', data: record, message: 'Kit weight master saved successfully.' });
  } catch (err) {
    console.error('upsert_combokit_weight error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.get_vehicle_capacity_chart = async (req, res) => {
  try {
    const [vehicles, weights] = await Promise.all([
      DeliveryVehicleMaster.find({ is_active: true, deleted_at: null }).lean(),
      ComboKitWeightMaster.find({ deleted_at: null })
        .populate({
          path: 'kit_id',
          match: { deleted_at: null },
          select: 'name capacity deleted_at'
        })
        .lean(),
    ]);

    // Only include kits that are actively configured in the registry
    const activeWeights = weights.filter(w => w.kit_id);

    const chart = vehicles.map(v => {
      const kitCapacities = activeWeights.map(w => {
        const weight = w.total_kit_weight_kg || 100;
        const maxKits = Math.floor(v.max_load_kg / weight);
        return {
          kit_id: w.kit_id?._id || w.kit_id,
          kit_name: w.kit_name,
          capacity_kw: w.capacity_kw,
          unit_weight_kg: weight,
          max_kits_allowed: maxKits,
        };
      });

      return {
        vehicle_master_id: v._id,
        vehicle_name: v.name,
        brand_make: v.brand_make,
        model: v.model,
        max_load_kg: v.max_load_kg,
        kit_capacities: kitCapacities,
      };
    });

    return res.status(200).json({ status: 'success', data: chart });
  } catch (err) {
    console.error('get_vehicle_capacity_chart error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 5. DELIVERY COST BENCHMARK CRUD ──────────────────────────────────────────
exports.get_benchmarks = async (req, res) => {
  try {
    const { warehouse_id, service_provider_id, state_id, vehicle_master_id } = req.query;
    const cleanWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;
    const cleanProviderId = (service_provider_id && service_provider_id !== 'null' && service_provider_id !== 'undefined' && mongoose.Types.ObjectId.isValid(service_provider_id)) ? service_provider_id : null;
    const cleanVehicleId = (vehicle_master_id && vehicle_master_id !== 'null' && vehicle_master_id !== 'undefined' && mongoose.Types.ObjectId.isValid(vehicle_master_id)) ? vehicle_master_id : null;
    const cleanStateId = (state_id && state_id !== 'null' && state_id !== 'undefined' && mongoose.Types.ObjectId.isValid(state_id)) ? state_id : null;

    const query = { deleted_at: null };
    if (cleanWarehouseId) query.warehouse_id = cleanWarehouseId;
    if (cleanProviderId) query.service_provider_id = cleanProviderId;
    if (cleanVehicleId) query.vehicle_master_id = cleanVehicleId;
    if (cleanStateId) query.state_id = cleanStateId;

    const list = await DeliveryCostBenchmark.find(query)
      .populate('service_provider_id', 'name provider_code mobile_number customer_service_number')
      .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address' })
      .populate('vehicle_master_id', 'name brand_make max_load_kg')
      .populate({ path: 'state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'district_id', model: GeoLevel2, select: 'name' })
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_benchmarks error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_benchmark = async (req, res) => {
  try {
    const { service_provider_id, warehouse_id, vehicle_master_id, state_id, district_id, benchmark_cost } = req.body;
    if (!warehouse_id || !vehicle_master_id || !state_id || !district_id || benchmark_cost === undefined) {
      return res.status(400).json({ status: 'error', message: 'Warehouse, Vehicle, State, District, and Benchmark Cost are required.' });
    }

    const filter = {
      service_provider_id: service_provider_id || null,
      warehouse_id,
      vehicle_master_id,
      district_id,
    };

    const record = await DeliveryCostBenchmark.findOneAndUpdate(
      filter,
      { ...req.body, updated_by: req.user?._id },
      { upsert: true, new: true }
    );

    return res.status(201).json({ status: 'success', data: record, message: 'Benchmark cost configured successfully.' });
  } catch (err) {
    console.error('create_benchmark error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.bulk_create_benchmarks = async (req, res) => {
  try {
    const {
      service_provider_id,
      warehouse_id,
      vehicle_master_id,
      state_id,
      gst_applicable = true,
      gst_rate = 18,
      free_delivery_eligible = false,
      effective_date,
      benchmarks = [],
    } = req.body;

    if (!warehouse_id || !vehicle_master_id || !state_id || !Array.isArray(benchmarks) || benchmarks.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Warehouse, Vehicle, State, and non-empty benchmarks list are required.',
      });
    }

    const operations = benchmarks
      .filter((b) => b.district_id && b.benchmark_cost !== undefined && b.benchmark_cost !== null && !isNaN(b.benchmark_cost))
      .map((item) => ({
        updateOne: {
          filter: {
            service_provider_id: service_provider_id || null,
            warehouse_id,
            vehicle_master_id,
            district_id: item.district_id,
          },
          update: {
            $set: {
              service_provider_id: service_provider_id || null,
              warehouse_id,
              vehicle_master_id,
              state_id,
              district_id: item.district_id,
              benchmark_cost: Number(item.benchmark_cost),
              gst_applicable: gst_applicable !== undefined ? Boolean(gst_applicable) : true,
              gst_rate: Number(gst_rate) || 18,
              free_delivery_eligible: Boolean(free_delivery_eligible),
              effective_date: effective_date ? new Date(effective_date) : new Date(),
              is_active: true,
              deleted_at: null,
              updated_by: req.user?._id || null,
            },
            $setOnInsert: {
              created_by: req.user?._id || null,
            },
          },
          upsert: true,
        },
      }));

    if (operations.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No valid district and benchmark cost rows found to save.',
      });
    }

    const bulkResult = await DeliveryCostBenchmark.bulkWrite(operations, { ordered: false });

    return res.status(200).json({
      status: 'success',
      message: `Successfully processed ${operations.length} delivery benchmarks (${bulkResult.upsertedCount || 0} inserted, ${bulkResult.modifiedCount || 0} updated).`,
      data: {
        total_processed: operations.length,
        inserted: bulkResult.upsertedCount || 0,
        updated: bulkResult.modifiedCount || 0,
      },
    });
  } catch (err) {
    console.error('bulk_create_benchmarks error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_benchmark = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      service_provider_id,
      warehouse_id,
      vehicle_master_id,
      state_id,
      district_id,
      benchmark_cost,
      gst_applicable,
      gst_rate,
      free_delivery_eligible,
      effective_date,
    } = req.body;

    const updateData = {
      updated_by: req.user?._id || null,
      updated_at: new Date(),
    };

    if (service_provider_id !== undefined) updateData.service_provider_id = service_provider_id || null;
    if (warehouse_id) updateData.warehouse_id = warehouse_id;
    if (vehicle_master_id) updateData.vehicle_master_id = vehicle_master_id;
    if (state_id) updateData.state_id = state_id;
    if (district_id) updateData.district_id = district_id;
    if (benchmark_cost !== undefined) updateData.benchmark_cost = Number(benchmark_cost);
    if (gst_applicable !== undefined) updateData.gst_applicable = Boolean(gst_applicable);
    if (gst_rate !== undefined) updateData.gst_rate = Number(gst_rate);
    if (free_delivery_eligible !== undefined) updateData.free_delivery_eligible = Boolean(free_delivery_eligible);
    if (effective_date) updateData.effective_date = new Date(effective_date);

    const updated = await DeliveryCostBenchmark.findByIdAndUpdate(id, updateData, { new: true })
      .populate('service_provider_id', 'name provider_code mobile_number customer_service_number')
      .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address' })
      .populate('vehicle_master_id', 'name brand_make max_load_kg')
      .populate({ path: 'state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'district_id', model: GeoLevel2, select: 'name' });

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Benchmark record not found.' });
    }

    return res.status(200).json({ status: 'success', data: updated, message: 'Benchmark cost updated successfully.' });
  } catch (err) {
    console.error('update_benchmark error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.delete_benchmark = async (req, res) => {
  try {
    const { id } = req.params;
    await DeliveryCostBenchmark.findByIdAndUpdate(id, { deleted_at: new Date(), is_active: false });
    return res.status(200).json({ status: 'success', message: 'Benchmark cost deleted.' });
  } catch (err) {
    console.error('delete_benchmark error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.bulk_delete_benchmarks = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Array of benchmark IDs is required.' });
    }

    const result = await DeliveryCostBenchmark.updateMany(
      { _id: { $in: ids } },
      { $set: { deleted_at: new Date(), is_active: false, updated_by: req.user?._id || null } }
    );

    return res.status(200).json({
      status: 'success',
      message: `Successfully deleted ${result.modifiedCount || ids.length} benchmarks.`,
      data: { count: result.modifiedCount || ids.length },
    });
  } catch (err) {
    console.error('bulk_delete_benchmarks error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 6. KIT-WISE DELIVERY COST RULES CRUD ─────────────────────────────────────
exports.get_kit_rules = async (req, res) => {
  try {
    const list = await KitDeliveryCostRule.find({ deleted_at: null })
      .populate({
        path: 'kit_id',
        match: { deleted_at: null },
        select: 'name capacity deleted_at is_active'
      })
      .populate('vehicle_master_id', 'name max_load_kg')
      .sort({ created_at: -1 })
      .lean();

    const activeList = list.filter((r) => r.kit_id && !r.kit_id.deleted_at);

    // Fetch active combokit weights to enrich/fallback shipment_weight_kg
    const allWeights = await ComboKitWeightMaster.find({ deleted_at: null }).lean();
    const weightMap = {};
    for (const w of allWeights) {
      if (w.kit_id) {
        weightMap[w.kit_id.toString()] = w.total_kit_weight_kg || 0;
      }
    }

    const enrichedList = activeList.map((r) => {
      const kitIdStr = r.kit_id?._id?.toString() || r.kit_id?.toString();
      const unitWeight = weightMap[kitIdStr] || 0;
      let shipmentWeight = unitWeight > 0
        ? Math.round(unitWeight * Number(r.number_of_kits || 1))
        : Number(r.shipment_weight_kg || r.total_weight_kg || 0);
      return {
        ...r,
        shipment_weight_kg: shipmentWeight,
        total_weight_kg: shipmentWeight,
      };
    });

    return res.status(200).json({ status: 'success', data: enrichedList });
  } catch (err) {
    console.error('get_kit_rules error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_kit_rule = async (req, res) => {
  try {
    const {
      kit_id,
      order_type,
      number_of_kits,
      vehicle_master_id,
      total_delivery_cost,
      per_kit_delivery_cost,
      shipment_weight_kg,
      total_weight_kg,
    } = req.body;

    if (!kit_id || !order_type || !number_of_kits || !vehicle_master_id || total_delivery_cost === undefined || per_kit_delivery_cost === undefined) {
      return res.status(400).json({ status: 'error', message: 'Kit, Order Type, Qty, Vehicle, Total Delivery Cost, and Per-Kit Cost are required.' });
    }

    let finalShipmentWeight = Number(shipment_weight_kg || total_weight_kg || 0);
    if (!finalShipmentWeight) {
      const kwm = await ComboKitWeightMaster.findOne({ kit_id, deleted_at: null }).lean();
      if (kwm && kwm.total_kit_weight_kg) {
        finalShipmentWeight = Math.round(kwm.total_kit_weight_kg * Number(number_of_kits));
      }
    }

    const newRule = new KitDeliveryCostRule({
      ...req.body,
      shipment_weight_kg: finalShipmentWeight,
      total_weight_kg: finalShipmentWeight,
      created_by: req.user?._id || null,
    });

    await newRule.save();
    return res.status(201).json({ status: 'success', data: newRule, message: 'Kit Delivery Rule created successfully.' });
  } catch (err) {
    console.error('create_kit_rule error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_kit_rule = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      kit_id,
      order_type,
      number_of_kits,
      vehicle_master_id,
      total_delivery_cost,
      per_kit_delivery_cost,
      free_delivery,
      shipment_weight_kg,
      total_weight_kg,
      industry_type_id,
      project_type_id,
      project_subtype_id,
    } = req.body;

    let finalShipmentWeight = shipment_weight_kg !== undefined
      ? Number(shipment_weight_kg)
      : (total_weight_kg !== undefined ? Number(total_weight_kg) : undefined);

    if ((finalShipmentWeight === undefined || finalShipmentWeight === 0) && kit_id) {
      const kwm = await ComboKitWeightMaster.findOne({ kit_id, deleted_at: null }).lean();
      if (kwm && kwm.total_kit_weight_kg) {
        finalShipmentWeight = Math.round(kwm.total_kit_weight_kg * Number(number_of_kits || 1));
      }
    }

    const updateData = {
      ...(kit_id && { kit_id }),
      ...(order_type && { order_type }),
      ...(number_of_kits !== undefined && { number_of_kits: Number(number_of_kits) }),
      ...(vehicle_master_id && { vehicle_master_id }),
      ...(total_delivery_cost !== undefined && { total_delivery_cost: Number(total_delivery_cost) }),
      ...(per_kit_delivery_cost !== undefined && { per_kit_delivery_cost: Number(per_kit_delivery_cost) }),
      ...(free_delivery !== undefined && { free_delivery: Boolean(free_delivery) }),
      ...(finalShipmentWeight !== undefined && {
        shipment_weight_kg: finalShipmentWeight,
        total_weight_kg: finalShipmentWeight,
      }),
      ...(industry_type_id !== undefined && { industry_type_id: industry_type_id || null }),
      ...(project_type_id !== undefined && { project_type_id: project_type_id || null }),
      ...(project_subtype_id !== undefined && { project_subtype_id: project_subtype_id || null }),
      updated_by: req.user?._id || null,
    };

    const updated = await KitDeliveryCostRule.findByIdAndUpdate(id, updateData, { new: true })
      .populate('kit_id', 'name capacity')
      .populate('vehicle_master_id', 'name max_load_kg');

    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'Kit Delivery Rule not found.' });
    }

    return res.status(200).json({ status: 'success', data: updated, message: 'Kit Delivery Rule updated successfully.' });
  } catch (err) {
    console.error('update_kit_rule error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.delete_kit_rule = async (req, res) => {
  try {
    const { id } = req.params;
    await KitDeliveryCostRule.findByIdAndUpdate(id, { deleted_at: new Date(), is_active: false });
    return res.status(200).json({ status: 'success', message: 'Kit Delivery Rule deleted.' });
  } catch (err) {
    console.error('delete_kit_rule error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.bulk_delete_kit_rules = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Array of rule IDs is required.' });
    }

    const result = await KitDeliveryCostRule.updateMany(
      { _id: { $in: ids } },
      { $set: { deleted_at: new Date(), is_active: false, updated_by: req.user?._id || null } }
    );

    return res.status(200).json({
      status: 'success',
      message: `Successfully deleted ${result.modifiedCount || ids.length} rules.`,
      data: { count: result.modifiedCount || ids.length },
    });
  } catch (err) {
    console.error('bulk_delete_kit_rules error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 7. DELIVERY ROUTE & CONSOLIDATION SETTINGS CRUD ─────────────────────────
exports.get_routes = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const cleanWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;
    const query = { deleted_at: null };
    if (cleanWarehouseId) query.origin_warehouse_id = cleanWarehouseId;

    const routes = await DeliveryRouteSetting.find(query)
      .populate({ path: 'origin_warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address' })
      .populate({ path: 'state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'primary_district_id', model: GeoLevel2, select: 'name' })
      .populate({ path: 'nearby_district_ids', model: GeoLevel2, select: 'name' })
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', data: routes });
  } catch (err) {
    console.error('get_routes error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.create_route = async (req, res) => {
  try {
    const { route_name, origin_warehouse_id, state_id, primary_district_id, max_route_distance_km } = req.body;
    if (!route_name || !origin_warehouse_id || !state_id || !primary_district_id || !max_route_distance_km) {
      return res.status(400).json({ status: 'error', message: 'Route Name, Warehouse, State, Primary District, and Max Distance are required.' });
    }

    const newRoute = new DeliveryRouteSetting({
      ...req.body,
      created_by: req.user?._id || null,
    });

    await newRoute.save();
    return res.status(201).json({ status: 'success', data: newRoute, message: 'Delivery Route configured successfully.' });
  } catch (err) {
    console.error('create_route error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_route = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DeliveryRouteSetting.findByIdAndUpdate(id, { ...req.body, updated_by: req.user?._id }, { new: true });
    if (!updated) return res.status(404).json({ status: 'error', message: 'Route not found.' });
    return res.status(200).json({ status: 'success', data: updated, message: 'Delivery Route updated successfully.' });
  } catch (err) {
    console.error('update_route error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.delete_route = async (req, res) => {
  try {
    const { id } = req.params;
    await DeliveryRouteSetting.findByIdAndUpdate(id, { deleted_at: new Date(), is_active: false });
    return res.status(200).json({ status: 'success', message: 'Delivery Route deleted.' });
  } catch (err) {
    console.error('delete_route error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 8. QUEUE & CONSOLIDATION SUGGESTIONS ─────────────────────────────────────
exports.get_delivery_queue = async (req, res) => {
  try {
    const {
      warehouse_id,
      page = 1,
      limit = 50,
      priority_only = false,
      industry_type,
      industry_type_name,
      category,
      category_name,
      sub_category,
      subcategory,
      subcategory_name,
      system_type,
      system_type_name,
      project_range,
      project_range_name,
    } = req.query;
    const cleanWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;

    const result = await deliveryService.getDeliveryQueue({
      warehouse_id: cleanWarehouseId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      priority_only: priority_only === 'true',
      industry_type: industry_type || industry_type_name,
      category: category || category_name,
      subcategory: sub_category || subcategory || subcategory_name,
      system_type: system_type || system_type_name,
      project_range: project_range || project_range_name,
    });

    // Always scan for consolidation suggestions (pass null if no warehouse filter)
    let consolidationSuggestions = [];
    try {
      consolidationSuggestions = await deliveryService.scanQueueForConsolidation(cleanWarehouseId, result.orders);
    } catch (scanErr) {
      console.warn('consolidation scan warning:', scanErr.message);
    }

    return res.status(200).json({
      status: 'success',
      data: result.orders,
      total: result.total,
      page: result.page,
      limit: result.limit,
      consolidation_suggestions: consolidationSuggestions,
    });
  } catch (err) {
    console.error('get_delivery_queue error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.get_hierarchy_options = async (req, res) => {
  try {
    return await estimatorHandler.get_hierarchy_options(req, res);
  } catch (err) {
    console.error('get_hierarchy_options error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_order_priority = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { is_priority, priority_reason, order_model = 'epc_orders' } = req.body;

    if (is_priority && !priority_reason) {
      return res.status(400).json({ status: 'error', message: 'An audit reason is required when changing priority.' });
    }

    if (order_model === 'epc_orders') {
      await EpcOrder.findByIdAndUpdate(orderId, {
        is_priority: Boolean(is_priority),
        priority_reason: priority_reason || null,
        priority_updated_by: req.user?._id,
        priority_updated_at: new Date(),
      });
    } else {
      await FpoOrder.findByIdAndUpdate(orderId, {
        is_priority: Boolean(is_priority),
        priority_reason: priority_reason || null,
      });
    }

    return res.status(200).json({ status: 'success', message: 'Order priority updated successfully.' });
  } catch (err) {
    console.error('update_order_priority error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 9. ELIGIBLE FLEET & BENCHMARK VALIDATION ────────────────────────────────
exports.get_eligible_fleet = async (req, res) => {
  try {
    const { warehouse_id, destination_district_id, total_weight_kg, route_distance_km } = req.query;
    const cleanDistrictId = (destination_district_id && destination_district_id !== 'undefined' && destination_district_id !== 'null') ? destination_district_id : null;
    const weight = Number(total_weight_kg) || 100;
    const distance = Number(route_distance_km) || 100;

    const result = await deliveryService.getEligibleFleet({
      warehouse_id,
      destination_district_id: cleanDistrictId,
      total_weight_kg: weight,
      route_distance_km: distance,
    });

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('get_eligible_fleet error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.validate_benchmark = async (req, res) => {
  try {
    const { warehouse_id, vehicle_master_id, district_id, proposed_cost } = req.body;
    const result = await deliveryService.validateBenchmarkCost({
      warehouse_id,
      vehicle_master_id,
      district_id,
      proposed_cost,
    });

    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('validate_benchmark error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.get_franchisee_destinations = async (req, res) => {
  try {
    const { district_id } = req.query;
    const list = await deliveryService.getFranchiseeDestinations(district_id);
    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_franchisee_destinations error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 10. CREATE DELIVERY ORDER / MASTER TRIP ──────────────────────────────────
exports.create_delivery_order = async (req, res) => {
  try {
    const result = await deliveryService.createDeliveryTrip(req.body, req.user);
    return res.status(201).json({
      status: 'success',
      data: result,
      message: `Delivery Trip ${result.delivery_number} created successfully.`,
    });
  } catch (err) {
    console.error('create_delivery_order error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── 11. TRACKING & POD MANAGEMENT ───────────────────────────────────────────
exports.get_tracking_list = async (req, res) => {
  try {
    const { status, vehicle_reg, state_id, district_id, warehouse_id, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (warehouse_id) query.warehouse_id = warehouse_id;
    if (vehicle_reg) query['vehicles_allocated.registration_number'] = vehicle_reg.trim().toUpperCase();
    if (district_id) query['stops.destination.district_id'] = district_id;
    if (search) {
      query.$or = [
        { delivery_number: { $regex: search, $options: 'i' } },
        { 'stops.order_number': { $regex: search, $options: 'i' } },
      ];
    }

    const list = await DeliveryOrder.find(query)
      .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address' })
      .populate('service_provider_id', 'name mobile_number customer_service_number')
      .populate({ path: 'stops.destination.state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'stops.destination.district_id', model: GeoLevel2, select: 'name' })
      .sort({ created_at: -1 });

    return res.status(200).json({ status: 'success', data: list });
  } catch (err) {
    console.error('get_tracking_list error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.get_trip_details = async (req, res) => {
  try {
    const { id } = req.params;
    const delivery = await DeliveryOrder.findById(id)
      .populate({ path: 'warehouse_id', model: CompanyWarehouse, select: 'warehouse_code address lat lng' })
      .populate('service_provider_id', 'name owner_name mobile_number customer_service_number gst_number')
      .populate('vehicles_allocated.vehicle_master_id', 'name brand_make max_load_kg')
      .populate({ path: 'stops.destination.state_id', model: GeoLevel1, select: 'name' })
      .populate({ path: 'stops.destination.district_id', model: GeoLevel2, select: 'name' });

    if (!delivery) return res.status(404).json({ status: 'error', message: 'Delivery Trip not found.' });
    return res.status(200).json({ status: 'success', data: delivery });
  } catch (err) {
    console.error('get_trip_details error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.update_trip_status = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const updated = await deliveryService.updateTripStatus(id, status, { note }, req.user);
    return res.status(200).json({ status: 'success', data: updated, message: `Trip updated to ${status}` });
  } catch (err) {
    console.error('update_trip_status error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

exports.confirm_stop_pod = async (req, res) => {
  try {
    const { id, stopNumber } = req.params;
    const { pod_url, pod_notes, receiver_name, receiver_phone } = req.body;

    if (!pod_url) {
      return res.status(400).json({ status: 'error', message: 'Proof of Delivery (POD) document/image is required.' });
    }

    const updated = await deliveryService.updateStopPod(id, stopNumber, {
      pod_url,
      pod_notes,
      receiver_name,
      receiver_phone,
    }, req.user);

    return res.status(200).json({
      status: 'success',
      data: updated,
      message: `Stop ${stopNumber} POD confirmed and marked delivered.`,
    });
  } catch (err) {
    console.error('confirm_stop_pod error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

// ─── 12. SANITIZED PUBLIC/CUSTOMER TRACKING ───────────────────────────────────
exports.get_public_tracking = async (req, res) => {
  try {
    const { trackingRef } = req.params;
    const sanitized = await deliveryService.getSanitizedTracking(trackingRef);
    return res.status(200).json({ status: 'success', data: sanitized });
  } catch (err) {
    console.error('get_public_tracking error:', err);
    return res.status(404).json({ status: 'error', message: err.message });
  }
};

// ─── 13. DASHBOARD & KPIS ─────────────────────────────────────────────────────
exports.get_dashboard_analytics = async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    const cleanWarehouseId = (warehouse_id && warehouse_id !== 'null' && warehouse_id !== 'undefined' && mongoose.Types.ObjectId.isValid(warehouse_id)) ? warehouse_id : null;
    const result = await deliveryService.getWarehouseDashboardAnalytics(cleanWarehouseId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('get_dashboard_analytics error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 14. COMPANY WAREHOUSES LIST FOR DELIVERY MODULE ──────────────────────────
exports.get_warehouses_list = async (req, res) => {
  try {
    const list = await CompanyWarehouse.find({ deleted_at: null })
      .populate({ path: 'level_1', model: GeoLevel1, select: 'name' })
      .populate({ path: 'level_2', model: GeoLevel2, select: 'name' })
      .select('_id warehouse_code address pincode level_1 level_2 warehouse_type')
      .lean();

    const formatted = list.map((w) => ({
      _id: w._id,
      id: w._id,
      warehouse_name: w.warehouse_code,
      name: w.warehouse_code,
      address: w.address,
      pincode: w.pincode,
      state: w.level_1?.name || '',
      district: w.level_2?.name || '',
      city: w.level_2?.name || '',
    }));

    return res.status(200).json({ status: 'success', data: formatted });
  } catch (err) {
    console.error('get_warehouses_list error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─── 15. DELIVERY COST APPROVAL QUEUE & ADMIN ACTIONS ─────────────────────────
exports.get_delivery_approval_queue = async (req, res) => {
  try {
    const result = await deliveryService.getDeliveryApprovalQueue(req.query);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    console.error('get_delivery_approval_queue error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.submit_delivery_approval_decision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks } = req.body;

    if (!decision || !['approve', 'reject', 'return'].includes(decision)) {
      return res.status(400).json({ status: 'error', message: 'Valid decision (approve, reject, return) is required.' });
    }
    if ((decision === 'reject' || decision === 'return') && (!remarks || !remarks.trim())) {
      return res.status(400).json({ status: 'error', message: 'Remarks are mandatory when rejecting or returning an approval.' });
    }

    const updated = await deliveryService.adminApproveDeliveryCost(id, {
      decision,
      remarks,
      adminUser: req.user,
    });

    return res.status(200).json({
      status: 'success',
      data: updated,
      message: `Delivery cost ${decision}d successfully.`,
    });
  } catch (err) {
    console.error('submit_delivery_approval_decision error:', err);
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

