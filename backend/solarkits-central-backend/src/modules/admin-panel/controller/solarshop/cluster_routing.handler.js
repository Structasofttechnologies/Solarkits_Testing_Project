const mongoose = require('mongoose');
const {
  RegionalCluster,
  WarehouseClusterMapping,
  WarehouseKitCapability
} = require('../../models/core_db');
const { CompanyWarehouse } = require('../../../warehouse-panel/models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');
const { FranchiseeCluster } = require('../../models/india_solarshop_db');

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
// 2. WAREHOUSE MAPPINGS & COVERAGE API
// ─────────────────────────────────────────────────────────────

/**
 * GET /coverage-options
 * Returns all active States with their nested Franchisee Clusters (districts, codes, names)
 * and available Regional Clusters for multi-state / franchise cluster warehouse mapping.
 */
exports.get_coverage_options = async (req, res) => {
  try {
    // 1. Get all active states (GeoLevel1)
    const states = await GeoLevel1.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
      $or: [{ is_active: true }, { is_active: { $exists: false } }]
    }).sort({ name: 1 }).lean();

    // 2. Get all active Franchisee Clusters
    const franchiseClusters = await FranchiseeCluster.find({
      deleted_at: null,
      $or: [{ is_active: true }, { is_active: { $exists: false } }]
    }).sort({ cluster_code: 1, cluster_name: 1 }).lean();

    // 3. Map franchise clusters by state name / state id
    const clustersByStateName = {};
    const clustersByStateId = {};

    franchiseClusters.forEach(fc => {
      const stateNameKey = (fc.state_name || '').trim().toLowerCase();
      const stateIdKey = fc.state_id ? fc.state_id.toString() : '';

      const fcData = {
        id: fc._id.toString(),
        cluster_id: fc._id.toString(),
        cluster_code: fc.cluster_code,
        cluster_name: fc.cluster_name,
        state_id: fc.state_id ? fc.state_id.toString() : null,
        state_name: fc.state_name,
        district_names: fc.district_names || [],
        district_count: (fc.district_names || []).length,
        status: fc.status || 'available',
        color_code: fc.color_code || '#2563eb'
      };

      if (stateNameKey) {
        if (!clustersByStateName[stateNameKey]) clustersByStateName[stateNameKey] = [];
        clustersByStateName[stateNameKey].push(fcData);
      }
      if (stateIdKey) {
        if (!clustersByStateId[stateIdKey]) clustersByStateId[stateIdKey] = [];
        clustersByStateId[stateIdKey].push(fcData);
      }
    });

    // 4. Construct rich state list with clusters
    const formattedStates = states.map(s => {
      const sName = (s.name || '').trim();
      const sKey = sName.toLowerCase();
      const sIdKey = s._id.toString();
      const stateClusters = clustersByStateName[sKey] || clustersByStateId[sIdKey] || [];

      return {
        id: s._id.toString(),
        name: sName,
        iso2: s.iso2 || '',
        clusters: stateClusters,
        cluster_count: stateClusters.length
      };
    });

    // Only return states that have active franchise clusters
    const statesWithActiveClusters = formattedStates.filter(s => s.cluster_count > 0);

    // 5. Regional clusters
    const regionalClusters = await RegionalCluster.find({ deleted_at: null, status: 'Active' })
      .select('name code states')
      .lean();

    return res.status(200).json({
      status: 'success',
      data: {
        states: statesWithActiveClusters,
        all_states: formattedStates,
        all_franchise_clusters: franchiseClusters.map(fc => ({
          id: fc._id.toString(),
          cluster_id: fc._id.toString(),
          cluster_code: fc.cluster_code,
          cluster_name: fc.cluster_name,
          state_name: fc.state_name,
          state_id: fc.state_id ? fc.state_id.toString() : null,
          district_names: fc.district_names || []
        })),
        regional_clusters: regionalClusters.map(rc => ({
          id: rc._id.toString(),
          name: rc.name,
          code: rc.code,
          states: rc.states || []
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching coverage options:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * GET /mappings
 */
exports.get_mappings = async (req, res) => {
  try {
    const mappings = await WarehouseClusterMapping.find({ deleted_at: null })
      .sort({ created_at: -1 })
      .lean();

    // Map company warehouses to ensure clean canonical warehouse_name
    let whMap = {};
    try {
      const companyWarehouses = await CompanyWarehouse.find({ deleted_at: null })
        .select('warehouse_code warehouse_name name address')
        .lean();
      (companyWarehouses || []).forEach(w => {
        const cName = (w.warehouse_name || w.name || '').trim();
        if (cName) {
          if (w.warehouse_code) whMap[w.warehouse_code] = cName;
          if (w._id) whMap[w._id.toString()] = cName;
        }
      });
    } catch (e) {
      whMap = {};
    }

    const result = mappings.map(m => {
      const canonicalName = whMap[m.warehouse_code] || (m.warehouse_id ? whMap[m.warehouse_id.toString()] : null);
      return {
        ...m,
        id: m._id.toString(),
        warehouse_name: canonicalName || m.warehouse_name,
        cluster_id: m.cluster_id ? m.cluster_id.toString() : null,
        cluster_name: m.cluster_name || (m.states && m.states.length > 0 ? m.states.join(', ') : 'Unassigned'),
        states: m.states || [],
        franchise_cluster_ids: (m.franchise_cluster_ids || []).map(id => id.toString()),
        franchise_clusters: m.franchise_clusters || [],
        effective_from: m.effective_from ? m.effective_from.toISOString().split('T')[0] : ''
      };
    });

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
      cluster_name,
      states,
      state_ids,
      franchise_cluster_ids,
      franchise_clusters,
      kit_types,
      effective_from,
      status
    } = req.body;

    if (!warehouse_name || !warehouse_name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Warehouse name is required.'
      });
    }

    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one state must be assigned.'
      });
    }

    const code = warehouse_code || `WH-${Date.now().toString().slice(-4)}`;
    const effectiveDate = effective_from ? new Date(effective_from) : new Date();

    let resolvedWarehouseId = warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id) ? warehouse_id : null;
    let resolvedWarehouseName = (warehouse_name || '').trim();
    if (code) {
      try {
        const whDoc = await CompanyWarehouse.findOne({ warehouse_code: code, deleted_at: null }).lean();
        if (whDoc) {
          if (!resolvedWarehouseId) resolvedWarehouseId = whDoc._id;
          if (whDoc.warehouse_name || whDoc.name) {
            resolvedWarehouseName = (whDoc.warehouse_name || whDoc.name).trim();
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Resolve regional cluster if provided
    let resolvedClusterId = cluster_id && mongoose.Types.ObjectId.isValid(cluster_id) ? cluster_id : null;
    let resolvedClusterName = cluster_name || null;
    if (resolvedClusterId) {
      try {
        const clusterDoc = await RegionalCluster.findById(resolvedClusterId).lean();
        if (clusterDoc) resolvedClusterName = clusterDoc.name;
      } catch (e) { }
    }

    // Process franchise cluster objects & IDs
    let processedFcIds = [];
    let processedFcList = [];

    if (Array.isArray(franchise_cluster_ids) && franchise_cluster_ids.length > 0) {
      processedFcIds = franchise_cluster_ids.filter(id => id && mongoose.Types.ObjectId.isValid(id));
      const fcDocs = await FranchiseeCluster.find({ _id: { $in: processedFcIds }, deleted_at: null }).lean();
      processedFcList = fcDocs.map(fc => ({
        cluster_id: fc._id,
        cluster_code: fc.cluster_code,
        cluster_name: fc.cluster_name,
        state_name: fc.state_name,
        district_names: fc.district_names || []
      }));
    } else if (Array.isArray(franchise_clusters) && franchise_clusters.length > 0) {
      processedFcList = franchise_clusters.map(fc => ({
        cluster_id: fc.cluster_id || fc.id || fc._id,
        cluster_code: fc.cluster_code || '',
        cluster_name: fc.cluster_name || '',
        state_name: fc.state_name || '',
        district_names: fc.district_names || []
      }));
      processedFcIds = processedFcList.map(fc => fc.cluster_id).filter(id => id && mongoose.Types.ObjectId.isValid(id));
    }

    const cleanedStates = states.map(s => String(s).trim()).filter(Boolean);

    const mapping = await WarehouseClusterMapping.create({
      warehouse_id: resolvedWarehouseId,
      warehouse_code: code,
      warehouse_name: resolvedWarehouseName || warehouse_name.trim(),
      cluster_id: resolvedClusterId,
      cluster_name: resolvedClusterName || (cleanedStates.length > 1 ? `${cleanedStates[0]} +${cleanedStates.length - 1} States` : cleanedStates[0]),
      states: cleanedStates,
      state_ids: Array.isArray(state_ids) ? state_ids.filter(id => id && mongoose.Types.ObjectId.isValid(id)) : [],
      franchise_cluster_ids: processedFcIds,
      franchise_clusters: processedFcList,
      kit_types: Array.isArray(kit_types) && kit_types.length > 0 ? kit_types : ['Combo Kit'],
      effective_from: effectiveDate,
      status: status || 'Active'
    });

    return res.status(201).json({
      status: 'success',
      message: 'Warehouse mapped to states and franchise clusters successfully',
      data: {
        ...mapping.toObject(),
        id: mapping._id.toString(),
        cluster_id: mapping.cluster_id ? mapping.cluster_id.toString() : null,
        states: mapping.states,
        franchise_clusters: mapping.franchise_clusters,
        franchise_cluster_ids: (mapping.franchise_cluster_ids || []).map(id => id.toString()),
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
      warehouse_id,
      cluster_id,
      cluster_name,
      states,
      state_ids,
      franchise_cluster_ids,
      franchise_clusters,
      kit_types,
      effective_from,
      status
    } = req.body;

    const mapping = await WarehouseClusterMapping.findOne({ _id: id, deleted_at: null });
    if (!mapping) {
      return res.status(404).json({ status: 'error', message: 'Mapping not found.' });
    }

    if (warehouse_code) mapping.warehouse_code = warehouse_code.trim();
    if (warehouse_id && mongoose.Types.ObjectId.isValid(warehouse_id)) {
      mapping.warehouse_id = warehouse_id;
    }

    if (mapping.warehouse_code) {
      try {
        const whDoc = await CompanyWarehouse.findOne({ warehouse_code: mapping.warehouse_code, deleted_at: null }).lean();
        if (whDoc) {
          if (!mapping.warehouse_id) mapping.warehouse_id = whDoc._id;
          if (whDoc.warehouse_name || whDoc.name) {
            mapping.warehouse_name = (whDoc.warehouse_name || whDoc.name).trim();
          }
        }
      } catch (e) { }
    } else if (warehouse_name) {
      mapping.warehouse_name = warehouse_name.trim();
    }

    if (cluster_id !== undefined) {
      if (cluster_id && mongoose.Types.ObjectId.isValid(cluster_id)) {
        const cluster = await RegionalCluster.findById(cluster_id);
        if (cluster) {
          mapping.cluster_id = cluster._id;
          mapping.cluster_name = cluster.name;
        }
      } else {
        mapping.cluster_id = null;
        if (cluster_name) mapping.cluster_name = cluster_name;
      }
    }

    if (states && Array.isArray(states)) {
      mapping.states = states.map(s => String(s).trim()).filter(Boolean);
      if (!mapping.cluster_name) {
        mapping.cluster_name = mapping.states.length > 1
          ? `${mapping.states[0]} +${mapping.states.length - 1} States`
          : mapping.states[0] || 'Unassigned';
      }
    }

    if (state_ids && Array.isArray(state_ids)) {
      mapping.state_ids = state_ids.filter(id => id && mongoose.Types.ObjectId.isValid(id));
    }

    // Process franchise cluster updates
    if (franchise_cluster_ids !== undefined) {
      const validFcIds = (franchise_cluster_ids || []).filter(fcId => fcId && mongoose.Types.ObjectId.isValid(fcId));
      mapping.franchise_cluster_ids = validFcIds;
      if (validFcIds.length > 0) {
        const fcDocs = await FranchiseeCluster.find({ _id: { $in: validFcIds }, deleted_at: null }).lean();
        mapping.franchise_clusters = fcDocs.map(fc => ({
          cluster_id: fc._id,
          cluster_code: fc.cluster_code,
          cluster_name: fc.cluster_name,
          state_name: fc.state_name,
          district_names: fc.district_names || []
        }));
      } else {
        mapping.franchise_clusters = [];
      }
    } else if (franchise_clusters !== undefined && Array.isArray(franchise_clusters)) {
      mapping.franchise_clusters = franchise_clusters.map(fc => ({
        cluster_id: fc.cluster_id || fc.id || fc._id,
        cluster_code: fc.cluster_code || '',
        cluster_name: fc.cluster_name || '',
        state_name: fc.state_name || '',
        district_names: fc.district_names || []
      }));
      mapping.franchise_cluster_ids = mapping.franchise_clusters
        .map(fc => fc.cluster_id)
        .filter(id => id && mongoose.Types.ObjectId.isValid(id));
    }

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
        states: mapping.states,
        franchise_clusters: mapping.franchise_clusters,
        franchise_cluster_ids: (mapping.franchise_cluster_ids || []).map(id => id.toString()),
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
          warehouse_name: rw.warehouse_name || rw.name || (rw.address ? `${rw.warehouse_code} (${(rw.warehouse_type || 'wh').toUpperCase()})` : rw.warehouse_code),
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
        warehouse_name: rw.warehouse_name || rw.name || cap.warehouse_name || rw.warehouse_code,
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

    const liveList = (warehouses || []).map((w) => {
      const cleanName = (w.warehouse_name || w.name || '').trim();
      const fallbackName = `${w.level_2?.name || 'Warehouse'} (${(w.warehouse_type || 'wh').toUpperCase()})`;
      const resolvedName = cleanName || fallbackName;

      return {
        id: w._id.toString(),
        warehouse_code: w.warehouse_code,
        warehouse_name: resolvedName,
        display_label: `${resolvedName} [${w.warehouse_code}]`,
        location: `${w.level_2?.name || ''}, ${w.level_1?.name || ''}`.trim().replace(/^,|,$/g, ''),
        address: w.address || '',
        warehouse_type: w.warehouse_type,
      };
    });

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
 * Body: { state: "Gujarat", franchise_cluster_id?: "...", district?: "...", kit_type?: "Combo Kit" | "Customize Kit" | "Bulk Kit" }
 */
exports.resolve_route = async (req, res) => {
  try {
    const { state, franchise_cluster_id, district, district_id, kit_type = 'Combo Kit' } = req.body;
    if (!state && !franchise_cluster_id && !district) {
      return res.status(400).json({ status: 'error', message: 'Delivery state, district, or franchise cluster is required.' });
    }

    let candidateMappings = [];
    let matchedClusterInfo = null;

    // 1. High Priority: Resolve by explicit Franchise Cluster ID
    if (franchise_cluster_id && mongoose.Types.ObjectId.isValid(franchise_cluster_id)) {
      candidateMappings = await WarehouseClusterMapping.find({
        franchise_cluster_ids: new mongoose.Types.ObjectId(franchise_cluster_id),
        status: 'Active',
        deleted_at: null
      }).lean();

      if (candidateMappings.length > 0) {
        const fcDoc = await FranchiseeCluster.findById(franchise_cluster_id).lean();
        if (fcDoc) {
          matchedClusterInfo = {
            id: fcDoc._id.toString(),
            name: fcDoc.cluster_name,
            code: fcDoc.cluster_code,
            type: 'franchise_cluster'
          };
        }
      }
    }

    // 2. High Priority: Resolve by district belonging to a Franchise Cluster
    if (candidateMappings.length === 0 && (district || district_id)) {
      const fcQuery = { deleted_at: null };
      if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
        fcQuery.district_ids = new mongoose.Types.ObjectId(district_id);
      } else if (district) {
        fcQuery.district_names = { $elemMatch: { $regex: new RegExp(`^${district.trim()}$`, 'i') } };
      }

      const fcDoc = await FranchiseeCluster.findOne(fcQuery).lean();
      if (fcDoc) {
        candidateMappings = await WarehouseClusterMapping.find({
          franchise_cluster_ids: fcDoc._id,
          status: 'Active',
          deleted_at: null
        }).lean();

        if (candidateMappings.length > 0) {
          matchedClusterInfo = {
            id: fcDoc._id.toString(),
            name: fcDoc.cluster_name,
            code: fcDoc.cluster_code,
            type: 'franchise_cluster'
          };
        }
      }
    }

    // 3. Fallback: State-level Warehouse Mapping
    if (candidateMappings.length === 0 && state) {
      candidateMappings = await WarehouseClusterMapping.find({
        states: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
        status: 'Active',
        deleted_at: null
      }).lean();

      if (candidateMappings.length > 0) {
        matchedClusterInfo = {
          name: `${state} State Fulfillment`,
          code: state.substring(0, 3).toUpperCase(),
          type: 'state'
        };
      }
    }

    // 4. Fallback: Regional Cluster Lookup
    if (candidateMappings.length === 0 && state) {
      const regionalCluster = await RegionalCluster.findOne({
        states: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
        status: 'Active',
        deleted_at: null
      }).lean();

      if (regionalCluster) {
        candidateMappings = await WarehouseClusterMapping.find({
          cluster_id: regionalCluster._id,
          status: 'Active',
          deleted_at: null
        }).lean();

        if (candidateMappings.length > 0) {
          matchedClusterInfo = {
            id: regionalCluster._id.toString(),
            name: regionalCluster.name,
            code: regionalCluster.code,
            type: 'regional_cluster'
          };
        }
      }
    }

    if (candidateMappings.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `No active warehouse fulfillment mapping found for location (State: ${state || 'N/A'}, Cluster: ${franchise_cluster_id || district || 'N/A'})`
      });
    }

    // 5. Select active fulfillment warehouse
    let candidateWarehouse = null;
    let fallbackWarehouse = null;

    for (const m of candidateMappings) {
      const cap = await WarehouseKitCapability.findOne({
        warehouse_code: m.warehouse_code,
        status: 'Active'
      }).lean();

      if (cap) {
        if (!fallbackWarehouse) fallbackWarehouse = { mapping: m, capability: cap };
        candidateWarehouse = { mapping: m, capability: cap };
        break;
      } else {
        if (!fallbackWarehouse) fallbackWarehouse = { mapping: m, capability: null };
      }
    }

    const selected = candidateWarehouse || fallbackWarehouse || { mapping: candidateMappings[0], capability: null };

    if (!selected) {
      return res.status(404).json({
        status: 'error',
        message: `No capable fulfillment warehouse found for ${kit_type}`
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        cluster: matchedClusterInfo || {
          name: selected.mapping.cluster_name || state,
          code: 'ACTIVE_ROUTING'
        },
        warehouse: {
          code: selected.mapping.warehouse_code,
          name: selected.mapping.warehouse_name,
          daily_capacity: selected.capability?.daily_capacity || 30,
          cutoff_time: selected.capability?.cutoff_time || '17:00'
        }
      }
    });
  } catch (err) {
    console.error('Error resolving route:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
