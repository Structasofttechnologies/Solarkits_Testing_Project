const mongoose = require('mongoose');
const {
  RegionalCluster,
  WarehouseClusterMapping,
  WarehouseKitCapability
} = require('../../models/core_db');
const { CompanyWarehouse } = require('../../../warehouse-panel/models/company_warehouse_db');
const { GeoLevel1 } = require('../../models/geolocation_db');

// ─────────────────────────────────────────────────────────────
// 1. CLUSTERS API
// ─────────────────────────────────────────────────────────────

/**
 * GET /clusters
 */
exports.get_clusters = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = { deleted_at: null };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { states: { $elemMatch: { $regex: search, $options: 'i' } } }
      ];
    }

    const clusters = await RegionalCluster.find(filter).sort({ created_at: -1 }).lean();

    // Attach count of mapped warehouses
    const clusterIds = clusters.map(c => c._id);
    const mappingCounts = await WarehouseClusterMapping.aggregate([
      { $match: { cluster_id: { $in: clusterIds }, deleted_at: null } },
      { $group: { _id: '$cluster_id', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    mappingCounts.forEach(m => {
      countMap[m._id.toString()] = m.count;
    });

    const result = clusters.map(c => ({
      ...c,
      id: c._id.toString(),
      warehouses_count: countMap[c._id.toString()] || 0
    }));

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    console.error('Error fetching clusters:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /clusters
 */
exports.create_cluster = async (req, res) => {
  try {
    const { name, code, states, status, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Cluster name is required.' });
    }

    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one state must be assigned.' });
    }

    const clusterCode = code && code.trim() ? code.trim().toUpperCase() : `CL-${Date.now().toString().slice(-4)}`;

    const existing = await RegionalCluster.findOne({ code: clusterCode });
    if (existing) {
      if (existing.deleted_at) {
        existing.deleted_at = null;
        existing.name = name.trim();
        existing.states = states.map((s) => s.trim());
        existing.status = status || 'Active';
        existing.description = description || null;
        await existing.save();
        return res.status(201).json({
          status: 'success',
          message: 'Cluster created successfully',
          data: {
            ...existing.toObject(),
            id: existing._id.toString(),
            warehouses_count: 0,
          },
        });
      }
      return res.status(400).json({ status: 'error', message: `Cluster code ${clusterCode} already exists.` });
    }

    const newCluster = await RegionalCluster.create({
      name: name.trim(),
      code: clusterCode,
      states: states.map(s => s.trim()),
      status: status || 'Active',
      description: description || null
    });

    return res.status(201).json({
      status: 'success',
      message: 'Cluster created successfully',
      data: {
        ...newCluster.toObject(),
        id: newCluster._id.toString(),
        warehouses_count: 0
      }
    });
  } catch (err) {
    console.error('Error creating cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /clusters/:id
 */
exports.update_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, states, status, description } = req.body;

    const cluster = await RegionalCluster.findOne({ _id: id, deleted_at: null });
    if (!cluster) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    if (name) cluster.name = name.trim();
    if (code) cluster.code = code.trim().toUpperCase();
    if (states && Array.isArray(states)) cluster.states = states.map(s => s.trim());
    if (status) cluster.status = status;
    if (description !== undefined) cluster.description = description;
    if (req.body.oem_brand_ids !== undefined) {
      cluster.oem_brand_ids = Array.isArray(req.body.oem_brand_ids) ? req.body.oem_brand_ids : [];
    }
    if (req.body.supplier_brand_ids !== undefined) {
      cluster.supplier_brand_ids = Array.isArray(req.body.supplier_brand_ids) ? req.body.supplier_brand_ids : [];
    }

    await cluster.save();

    // If cluster name changed, update corresponding mapping denormalized names
    if (name) {
      await WarehouseClusterMapping.updateMany(
        { cluster_id: cluster._id },
        { $set: { cluster_name: cluster.name } }
      );
    }

    const warehouses_count = await WarehouseClusterMapping.countDocuments({
      cluster_id: cluster._id,
      deleted_at: null
    });

    return res.status(200).json({
      status: 'success',
      message: 'Cluster updated successfully',
      data: {
        ...cluster.toObject(),
        id: cluster._id.toString(),
        warehouses_count
      }
    });
  } catch (err) {
    console.error('Error updating cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * DELETE /clusters/:id
 */
exports.delete_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const cluster = await RegionalCluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    cluster.deleted_at = new Date();
    cluster.status = 'Inactive';
    await cluster.save();

    return res.status(200).json({
      status: 'success',
      message: 'Cluster deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 2. WAREHOUSE MAPPINGS API
// ─────────────────────────────────────────────────────────────

/**
 * GET /mappings
 */
exports.get_mappings = async (req, res) => {
  try {
    const mappings = await WarehouseClusterMapping.find({ deleted_at: null })
      .sort({ created_at: -1 })
      .lean();

    const result = mappings.map(m => ({
      ...m,
      id: m._id.toString(),
      cluster_id: m.cluster_id ? m.cluster_id.toString() : null,
      effective_from: m.effective_from ? m.effective_from.toISOString().split('T')[0] : ''
    }));

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (err) {
    console.error('Error fetching mappings:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * POST /mappings
 */
exports.create_mapping = async (req, res) => {
  try {
    const {
      warehouse_id,
      warehouse_name,
      warehouse_code,
      cluster_id,
      states,
      kit_types,
      effective_from,
      status
    } = req.body;

    if (!warehouse_name || !cluster_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Warehouse name and target cluster are required.'
      });
    }

    const cluster = await RegionalCluster.findById(cluster_id);
    if (!cluster) {
      return res.status(400).json({ status: 'error', message: 'Target cluster not found.' });
    }

    const code = warehouse_code || `WH-${Date.now().toString().slice(-4)}`;
    const effectiveDate = effective_from ? new Date(effective_from) : new Date();

    let resolvedWarehouseId = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;
    if (!resolvedWarehouseId && code) {
      try {
        const whDoc = await CompanyWarehouse.findOne({ warehouse_code: code, deleted_at: null }).lean();
        if (whDoc) resolvedWarehouseId = whDoc._id;
      } catch (e) {
        // ignore
      }
    }

    const mapping = await WarehouseClusterMapping.create({
      warehouse_id: resolvedWarehouseId,
      warehouse_code: code,
      warehouse_name: warehouse_name.trim(),
      cluster_id: cluster._id,
      cluster_name: cluster.name,
      states: Array.isArray(states) && states.length > 0 ? states : cluster.states,
      kit_types: Array.isArray(kit_types) && kit_types.length > 0 ? kit_types : ['Combo Kit'],
      effective_from: effectiveDate,
      status: status || 'Active'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Warehouse mapped to cluster successfully',
      data: {
        ...mapping.toObject(),
        id: mapping._id.toString(),
        cluster_id: mapping.cluster_id.toString(),
        effective_from: mapping.effective_from.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    console.error('Error creating mapping:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /mappings/:id
 */
exports.update_mapping = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      warehouse_name,
      warehouse_code,
      cluster_id,
      states,
      kit_types,
      effective_from,
      status
    } = req.body;

    const mapping = await WarehouseClusterMapping.findOne({ _id: id, deleted_at: null });
    if (!mapping) {
      return res.status(404).json({ status: 'error', message: 'Mapping not found.' });
    }

    if (warehouse_name) mapping.warehouse_name = warehouse_name.trim();
    if (warehouse_code) mapping.warehouse_code = warehouse_code.trim();
    if (cluster_id) {
      const cluster = await RegionalCluster.findById(cluster_id);
      if (cluster) {
        mapping.cluster_id = cluster._id;
        mapping.cluster_name = cluster.name;
      }
    }
    if (states && Array.isArray(states)) mapping.states = states;
    if (kit_types && Array.isArray(kit_types)) mapping.kit_types = kit_types;
    if (effective_from) mapping.effective_from = new Date(effective_from);
    if (status) mapping.status = status;

    await mapping.save();

    return res.status(200).json({
      status: 'success',
      message: 'Mapping updated successfully',
      data: {
        ...mapping.toObject(),
        id: mapping._id.toString(),
        cluster_id: mapping.cluster_id ? mapping.cluster_id.toString() : null,
        effective_from: mapping.effective_from ? mapping.effective_from.toISOString().split('T')[0] : ''
      }
    });
  } catch (err) {
    console.error('Error updating mapping:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * DELETE /mappings/:id
 */
exports.delete_mapping = async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await WarehouseClusterMapping.findById(id);
    if (!mapping) {
      return res.status(404).json({ status: 'error', message: 'Mapping not found.' });
    }

    mapping.deleted_at = new Date();
    mapping.status = 'Inactive';
    await mapping.save();

    return res.status(200).json({
      status: 'success',
      message: 'Mapping deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting mapping:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 3. WAREHOUSE KIT CAPABILITIES API
// ─────────────────────────────────────────────────────────────

/**
 * GET /capabilities
 */
exports.get_capabilities = async (req, res) => {
  try {
    // Only return capabilities for active warehouses present in CompanyWarehouse
    const realWarehouses = await CompanyWarehouse.find({ deleted_at: null }).lean();
    const realWhCodes = realWarehouses.map((rw) => rw.warehouse_code);

    // Clean up any orphaned / dummy capabilities that are not in real CompanyWarehouse
    if (realWhCodes.length > 0) {
      await WarehouseKitCapability.deleteMany({ warehouse_code: { $nin: realWhCodes } });
    } else {
      await WarehouseKitCapability.deleteMany({});
    }

    const existingCapabilities = await WarehouseKitCapability.find({ warehouse_code: { $in: realWhCodes } }).lean();
    const existingMap = new Map(existingCapabilities.map((c) => [c.warehouse_code, c]));

    const result = [];
    for (const rw of realWarehouses) {
      let cap = existingMap.get(rw.warehouse_code);
      if (!cap) {
        const newCap = await WarehouseKitCapability.create({
          warehouse_id: rw.warehouse_code,
          warehouse_code: rw.warehouse_code,
          warehouse_name: rw.name || (rw.address ? `${rw.warehouse_code} (${(rw.warehouse_type || 'wh').toUpperCase()})` : rw.warehouse_code),
          location: rw.address || rw.city || 'India',
          capabilities: {
            combo_kit: true,
            customize_kit: rw.warehouse_type === 'master',
            bulk_kit: rw.warehouse_type === 'master',
          },
          daily_capacity: rw.warehouse_type === 'master' ? 50 : 25,
          cutoff_time: "17:00",
          status: "Active",
        });
        cap = newCap.toObject();
      }
      result.push({
        ...cap,
        id: cap._id.toString(),
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    console.error('Error fetching capabilities:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * PUT /capabilities/:warehouseId
 */
exports.update_capability = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { capabilities, daily_capacity, cutoff_time, status } = req.body;

    let doc = await WarehouseKitCapability.findOne({
      $or: [
        { warehouse_id: warehouseId },
        { warehouse_code: warehouseId },
        ...(mongoose.Types.ObjectId.isValid(warehouseId) ? [{ _id: warehouseId }] : [])
      ]
    });

    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Warehouse capability record not found.' });
    }

    if (capabilities) {
      doc.capabilities = {
        combo_kit: capabilities.combo_kit !== undefined ? Boolean(capabilities.combo_kit) : doc.capabilities.combo_kit,
        customize_kit: capabilities.customize_kit !== undefined ? Boolean(capabilities.customize_kit) : doc.capabilities.customize_kit,
        bulk_kit: capabilities.bulk_kit !== undefined ? Boolean(capabilities.bulk_kit) : doc.capabilities.bulk_kit
      };
    }

    if (daily_capacity !== undefined) doc.daily_capacity = Number(daily_capacity) || doc.daily_capacity;
    if (cutoff_time) doc.cutoff_time = cutoff_time;
    if (status) doc.status = status;

    await doc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Warehouse kit capability updated successfully',
      data: {
        ...doc.toObject(),
        id: doc._id.toString()
      }
    });
  } catch (err) {
    console.error('Error updating capability:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 4. AVAILABLE WAREHOUSES FOR MAPPING MODAL
// ─────────────────────────────────────────────────────────────

/**
 * GET /available-warehouses
 */
exports.get_available_warehouses = async (req, res) => {
  try {
    let warehouses = [];
    try {
      warehouses = await CompanyWarehouse.find({ deleted_at: null })
        .populate('level_1', 'name')
        .populate('level_2', 'name')
        .lean();
    } catch (e) {
      warehouses = [];
    }

    const liveList = (warehouses || []).map((w) => ({
      id: w._id.toString(),
      warehouse_code: w.warehouse_code,
      warehouse_name: `${w.warehouse_code} - ${w.level_2?.name || w.address || 'Warehouse'} (${(w.warehouse_type || 'wh').toUpperCase()})`,
      location: `${w.level_2?.name || ''}, ${w.level_1?.name || ''}`.trim().replace(/^,|,$/g, ''),
      warehouse_type: w.warehouse_type,
    }));

    return res.status(200).json({ status: 'success', data: liveList });
  } catch (err) {
    console.error('Error fetching available warehouses:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// 5. ROUTE RESOLVER (USED BY STORE CHECKOUT / PURCHASE ORDER)
// ─────────────────────────────────────────────────────────────

/**
 * POST /resolve-route
 * Body: { state: "Gujarat", kit_type: "Combo Kit" | "Customize Kit" | "Bulk Kit" }
 */
exports.resolve_route = async (req, res) => {
  try {
    const { state, kit_type = 'Combo Kit' } = req.body;
    if (!state) {
      return res.status(400).json({ status: 'error', message: 'Delivery state is required.' });
    }

    // 1. Find cluster that covers this state
    const cluster = await RegionalCluster.findOne({
      states: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      status: 'Active',
      deleted_at: null
    }).lean();

    if (!cluster) {
      return res.status(404).json({
        status: 'error',
        message: `No active cluster routing found for state: ${state}`
      });
    }

    // 2. Find mapped warehouses for this cluster and state
    const mappings = await WarehouseClusterMapping.find({
      cluster_id: cluster._id,
      states: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      status: 'Active',
      deleted_at: null
    }).lean();

    // 3. Filter by kit capability
    let candidateWarehouse = null;
    let fallbackWarehouse = null;

    for (const m of mappings) {
      const cap = await WarehouseKitCapability.findOne({
        warehouse_code: m.warehouse_code,
        status: 'Active'
      }).lean();

      if (cap) {
        if (!fallbackWarehouse) fallbackWarehouse = { mapping: m, capability: cap };

        const typeKey = kit_type.toLowerCase().includes('bulk')
          ? 'bulk_kit'
          : kit_type.toLowerCase().includes('custom')
            ? 'customize_kit'
            : 'combo_kit';

        if (cap.capabilities && cap.capabilities[typeKey]) {
          candidateWarehouse = { mapping: m, capability: cap };
          break;
        }
      }
    }

    const selected = candidateWarehouse || fallbackWarehouse;

    if (!selected) {
      return res.status(404).json({
        status: 'error',
        message: `No capable fulfillment warehouse found in ${cluster.name} for ${kit_type}`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        cluster: {
          id: cluster._id,
          name: cluster.name,
          code: cluster.code
        },
        warehouse: {
          code: selected.mapping.warehouse_code,
          name: selected.mapping.warehouse_name,
          daily_capacity: selected.capability.daily_capacity,
          cutoff_time: selected.capability.cutoff_time
        }
      }
    });
  } catch (err) {
    console.error('Error resolving route:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
