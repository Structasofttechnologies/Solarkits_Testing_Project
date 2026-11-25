const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  WarehouseComboKit,
  KitClusterAuthorization
} = require('../../models/india_solarshop_db');
const {
  WarehouseClusterMapping,
  WarehouseKitActivation
} = require('../../models/core_db');
const { CompanyWarehouse } = require('../../../warehouse-panel/models/company_warehouse_db');
const { GeoLevel1, GeoLevel2 } = require('../../models/geolocation_db');

/**
 * 1. GET /filter-options
 * Returns cascading filter masters: States (with active clusters),
 * Franchise Clusters, and associated Districts.
 */
exports.get_filter_options = async (req, res) => {
  try {
    const [states, clusters, districts] = await Promise.all([
      GeoLevel1.find({
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
        $or: [{ is_active: true }, { is_active: { $exists: false } }]
      }).sort({ name: 1 }).lean(),

      FranchiseeCluster.find({
        deleted_at: null,
        $or: [{ is_active: true }, { is_active: { $exists: false } }]
      }).sort({ cluster_code: 1, cluster_name: 1 }).lean(),

      GeoLevel2.find({
        deleted_at: null,
        $or: [{ is_active: true }, { is_active: { $exists: false } }]
      }).select('_id name level_1 cluster').lean()
    ]);

    // Map clusters by state name / state id
    const clustersByStateName = {};
    const clustersByStateId = {};
    const allClustersFormatted = [];

    clusters.forEach(fc => {
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

      allClustersFormatted.push(fcData);

      if (stateNameKey) {
        if (!clustersByStateName[stateNameKey]) clustersByStateName[stateNameKey] = [];
        clustersByStateName[stateNameKey].push(fcData);
      }
      if (stateIdKey) {
        if (!clustersByStateId[stateIdKey]) clustersByStateId[stateIdKey] = [];
        clustersByStateId[stateIdKey].push(fcData);
      }
    });

    // Format states and filter only those with active franchise clusters
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
    }).filter(s => s.cluster_count > 0);

    return res.status(200).json({
      status: 'success',
      data: {
        states: formattedStates,
        clusters: allClustersFormatted,
        districts: districts.map(d => ({
          id: d._id.toString(),
          name: d.name,
          state_id: d.level_1 ? d.level_1.toString() : null,
          cluster_id: d.cluster ? d.cluster.toString() : null
        }))
      }
    });
  } catch (err) {
    console.error('[kit_cluster_auth] Error in get_filter_options:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 2. GET /cluster-kits
 * Resolves active warehouse kits for the selected State & Franchise Cluster,
 * and attaches their KitClusterAuthorization visibility state (ON / OFF).
 */
exports.get_cluster_kits = async (req, res) => {
  try {
    const { state_id, state_name, cluster_id, district_id } = req.query;

    if (!cluster_id && !state_name && !state_id) {
      return res.status(400).json({
        status: 'error',
        message: 'At least cluster_id or state_name/state_id is required'
      });
    }

    let resolvedStateName = state_name || '';
    if (!resolvedStateName && state_id && mongoose.Types.ObjectId.isValid(state_id)) {
      const stDoc = await GeoLevel1.findById(state_id).lean();
      if (stDoc) resolvedStateName = stDoc.name;
    }

    // 1. Find mapped fulfillment warehouses for this cluster or state
    let mappingQuery = { status: 'Active', deleted_at: null };
    let candidateMappings = [];

    if (cluster_id && mongoose.Types.ObjectId.isValid(cluster_id)) {
      candidateMappings = await WarehouseClusterMapping.find({
        ...mappingQuery,
        franchise_cluster_ids: new mongoose.Types.ObjectId(cluster_id)
      }).lean();
    }

    // Fallback to state level mapping if no specific cluster mapping found
    if (candidateMappings.length === 0 && resolvedStateName) {
      candidateMappings = await WarehouseClusterMapping.find({
        ...mappingQuery,
        states: { $regex: new RegExp(`^${resolvedStateName.trim()}$`, 'i') }
      }).lean();
    }

    // If still no mappings, look up all active company warehouses in that state
    let warehouseIds = [];
    const warehouseInfoMap = {};

    if (candidateMappings.length > 0) {
      candidateMappings.forEach(m => {
        if (m.warehouse_id) {
          const wIdStr = m.warehouse_id.toString();
          warehouseIds.push(m.warehouse_id);
          warehouseInfoMap[wIdStr] = {
            id: wIdStr,
            code: m.warehouse_code,
            name: m.warehouse_name
          };
        }
      });
    }

    // Also include company warehouses that have the warehouse_code from candidateMappings
    const mappingCodes = candidateMappings.map(m => m.warehouse_code).filter(Boolean);
    if (mappingCodes.length > 0) {
      const cwDocs = await CompanyWarehouse.find({
        warehouse_code: { $in: mappingCodes },
        deleted_at: null
      }).lean();

      cwDocs.forEach(cw => {
        const cwIdStr = cw._id.toString();
        warehouseIds.push(cw._id);
        warehouseInfoMap[cwIdStr] = {
          id: cwIdStr,
          code: cw.warehouse_code,
          name: cw.warehouse_name || cw.name || cw.warehouse_code
        };
      });
    }

    // Ensure unique ObjectId instances
    const uniqueWhIds = Array.from(new Set(warehouseIds.map(id => id.toString()))).map(id => new mongoose.Types.ObjectId(id));

    if (uniqueWhIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          kits: [],
          warehouses: [],
          total_count: 0,
          authorized_count: 0,
          restricted_count: 0,
          message: 'No fulfillment warehouses mapped to this cluster/state.'
        }
      });
    }

    // 2. Query WarehouseKitActivation for these warehouses
    const activations = await WarehouseKitActivation.find({
      warehouse_id: { $in: uniqueWhIds },
      is_combokit_active: true,
      is_active: true,
      deleted_at: null
    }).lean();

    if (!activations || activations.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          kits: [],
          warehouses: Object.values(warehouseInfoMap),
          total_count: 0,
          authorized_count: 0,
          restricted_count: 0,
          message: 'Warehouses are mapped, but no kits are currently activated under Warehouse Kit Activations.'
        }
      });
    }

    // Extract activated kit IDs
    const activatedKitIdSet = new Set(activations.map(a => (a.combo_kit_id?._id || a.combo_kit_id)?.toString()).filter(Boolean));
    const activatedKitObjectIds = Array.from(activatedKitIdSet).map(id => new mongoose.Types.ObjectId(id));

    // 3. Fetch Kit Blueprint details from WarehouseComboKit (india_solarshop_db) and CoreComboKit
    const CoreComboKit = require('../../../solarshop-india/models/india_core_db/combo_kits.schema');

    const [shopKits, coreKits] = await Promise.all([
      WarehouseComboKit.find({ _id: { $in: activatedKitObjectIds }, deleted_at: null }).lean().catch(() => []),
      CoreComboKit.find({ _id: { $in: activatedKitObjectIds }, deleted_at: null }).lean().catch(() => [])
    ]);

    const kitMap = new Map();
    [...shopKits, ...coreKits].forEach(k => {
      if (k && k._id) {
        kitMap.set(k._id.toString(), k);
      }
    });

    // 4. Fetch existing KitClusterAuthorization records for this cluster
    let authQuery = { deleted_at: null };
    if (cluster_id && mongoose.Types.ObjectId.isValid(cluster_id)) {
      authQuery.cluster_id = new mongoose.Types.ObjectId(cluster_id);
    }
    if (district_id && mongoose.Types.ObjectId.isValid(district_id)) {
      authQuery.district_id = new mongoose.Types.ObjectId(district_id);
    }

    const authDocs = await KitClusterAuthorization.find(authQuery).lean();
    const authMap = new Map();
    authDocs.forEach(ad => {
      const kIdStr = ad.combo_kit_id?.toString();
      if (kIdStr) {
        authMap.set(kIdStr, ad);
      }
    });

    // 5. Build enriched list of kits with live toggle state
    let authorizedCount = 0;
    let restrictedCount = 0;

    const enrichedKits = Array.from(activatedKitIdSet).map(kitIdStr => {
      const kitDoc = kitMap.get(kitIdStr) || {};
      const authDoc = authMap.get(kitIdStr);

      // Default: If active in warehouse and no explicit suppression, it is AUTHORIZED (true)
      const isAuthorized = authDoc ? Boolean(authDoc.is_authorized) : true;
      if (isAuthorized) authorizedCount++;
      else restrictedCount++;

      // Find which warehouses activate this kit
      const activatingWhs = activations
        .filter(a => (a.combo_kit_id?._id || a.combo_kit_id)?.toString() === kitIdStr)
        .map(a => {
          const wIdStr = a.warehouse_id?.toString();
          return warehouseInfoMap[wIdStr] || { id: wIdStr, code: 'WH', name: 'Warehouse' };
        });

      return {
        id: kitIdStr,
        combo_kit_id: kitIdStr,
        kit_name: kitDoc.kit_name || kitDoc.name || 'Solar Combo Kit',
        kit_code: kitDoc.kit_code || kitDoc.sku_code || 'KIT-DCR',
        capacity: kitDoc.capacity || kitDoc.capacity_kw || 1,
        capacity_kw: kitDoc.capacity_kw || kitDoc.capacity || 1,
        system_type: kitDoc.system_type || 'On-Grid',
        project_range: kitDoc.project_range || kitDoc.projectRange || 'Residential',
        image: kitDoc.kit_image || kitDoc.image || null,
        base_price: kitDoc.base_price_cached || kitDoc.base_price || 0,
        selling_price: kitDoc.selling_price_cached || kitDoc.price || kitDoc.base_price_cached || 0,
        warehouses: activatingWhs,
        is_authorized: isAuthorized,
        auth_rule_id: authDoc?._id?.toString() || null,
        notes: authDoc?.notes || null,
        updated_at: authDoc?.updated_at || null
      };
    });

    return res.status(200).json({
      status: 'success',
      data: {
        kits: enrichedKits,
        warehouses: Object.values(warehouseInfoMap),
        total_count: enrichedKits.length,
        authorized_count: authorizedCount,
        restricted_count: restrictedCount
      }
    });
  } catch (err) {
    console.error('[kit_cluster_auth] Error in get_cluster_kits:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 3. POST /toggle-auth
 * Toggles kit authorization (ON / OFF) for a given State & Franchise Cluster.
 */
exports.toggle_kit_auth = async (req, res) => {
  try {
    const {
      state_id,
      state_name,
      cluster_id,
      cluster_code,
      cluster_name,
      district_id,
      district_name,
      combo_kit_id,
      is_authorized,
      notes
    } = req.body;

    if (!cluster_id || !combo_kit_id) {
      return res.status(400).json({
        status: 'error',
        message: 'cluster_id and combo_kit_id are required.'
      });
    }

    const targetClusterId = new mongoose.Types.ObjectId(cluster_id);
    const targetKitId = new mongoose.Types.ObjectId(combo_kit_id);
    const targetDistrictId = district_id && mongoose.Types.ObjectId.isValid(district_id)
      ? new mongoose.Types.ObjectId(district_id)
      : null;

    // Resolve Cluster details if missing
    let cCode = cluster_code;
    let cName = cluster_name;
    let sName = state_name;
    let sId = state_id && mongoose.Types.ObjectId.isValid(state_id) ? new mongoose.Types.ObjectId(state_id) : null;

    if (!cCode || !cName || !sName || !sId) {
      const cDoc = await FranchiseeCluster.findById(targetClusterId).lean();
      if (cDoc) {
        cCode = cCode || cDoc.cluster_code;
        cName = cName || cDoc.cluster_name;
        sName = sName || cDoc.state_name;
        sId = sId || (cDoc.state_id ? new mongoose.Types.ObjectId(cDoc.state_id) : null);
      }
    }

    if (!sId) {
      // Find state by name
      const sDoc = await GeoLevel1.findOne({ name: { $regex: new RegExp(`^${(sName || '').trim()}$`, 'i') } }).lean();
      if (sDoc) sId = sDoc._id;
    }

    const filter = {
      cluster_id: targetClusterId,
      combo_kit_id: targetKitId,
      district_id: targetDistrictId,
      deleted_at: null
    };

    const update = {
      $set: {
        state_id: sId,
        state_name: sName || 'India',
        cluster_code: cCode || 'CLU',
        cluster_name: cName || 'Franchise Cluster',
        district_name: district_name || null,
        is_authorized: Boolean(is_authorized),
        notes: notes || null,
        updated_by: req.user?._id || null
      }
    };

    const doc = await KitClusterAuthorization.findOneAndUpdate(
      filter,
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      status: 'success',
      message: `Kit ${is_authorized ? 'authorized (visible)' : 'deauthorized (hidden)'} for ${cName}`,
      data: doc
    });
  } catch (err) {
    console.error('[kit_cluster_auth] Error in toggle_kit_auth:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 4. POST /bulk-toggle-auth
 * Authorizes or deauthorizes all kits in a selected cluster.
 */
exports.bulk_toggle_auth = async (req, res) => {
  try {
    const {
      state_id,
      state_name,
      cluster_id,
      cluster_code,
      cluster_name,
      district_id,
      district_name,
      is_authorized,
      combo_kit_ids
    } = req.body;

    if (!cluster_id) {
      return res.status(400).json({ status: 'error', message: 'cluster_id is required.' });
    }

    const targetClusterId = new mongoose.Types.ObjectId(cluster_id);
    let kitIds = Array.isArray(combo_kit_ids) && combo_kit_ids.length > 0 ? combo_kit_ids : [];

    // If combo_kit_ids not sent, resolve all activated kits for this cluster
    if (kitIds.length === 0) {
      const mappings = await WarehouseClusterMapping.find({
        status: 'Active',
        deleted_at: null,
        $or: [
          { franchise_cluster_ids: targetClusterId },
          { states: { $regex: new RegExp(`^${(state_name || '').trim()}$`, 'i') } }
        ]
      }).lean();

      const whIds = mappings.map(m => m.warehouse_id).filter(Boolean);
      const acts = await WarehouseKitActivation.find({
        warehouse_id: { $in: whIds },
        is_combokit_active: true,
        is_active: true,
        deleted_at: null
      }).lean();

      kitIds = Array.from(new Set(acts.map(a => (a.combo_kit_id?._id || a.combo_kit_id)?.toString()).filter(Boolean)));
    }

    if (kitIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No kits found to update.',
        count: 0
      });
    }

    // Resolve Cluster details
    let cCode = cluster_code;
    let cName = cluster_name;
    let sName = state_name;
    let sId = state_id && mongoose.Types.ObjectId.isValid(state_id) ? new mongoose.Types.ObjectId(state_id) : null;

    if (!cCode || !cName || !sName || !sId) {
      const cDoc = await FranchiseeCluster.findById(targetClusterId).lean();
      if (cDoc) {
        cCode = cCode || cDoc.cluster_code;
        cName = cName || cDoc.cluster_name;
        sName = sName || cDoc.state_name;
        sId = sId || (cDoc.state_id ? new mongoose.Types.ObjectId(cDoc.state_id) : null);
      }
    }

    const targetDistrictId = district_id && mongoose.Types.ObjectId.isValid(district_id)
      ? new mongoose.Types.ObjectId(district_id)
      : null;

    const operations = kitIds.map(kId => {
      const kitObjectId = new mongoose.Types.ObjectId(kId);
      return {
        updateOne: {
          filter: {
            cluster_id: targetClusterId,
            combo_kit_id: kitObjectId,
            district_id: targetDistrictId,
            deleted_at: null
          },
          update: {
            $set: {
              state_id: sId,
              state_name: sName || 'India',
              cluster_code: cCode || 'CLU',
              cluster_name: cName || 'Franchise Cluster',
              district_name: district_name || null,
              is_authorized: Boolean(is_authorized),
              updated_by: req.user?._id || null
            }
          },
          upsert: true
        }
      };
    });

    await KitClusterAuthorization.bulkWrite(operations);

    return res.status(200).json({
      status: 'success',
      message: `Successfully set ${kitIds.length} kits to ${is_authorized ? 'Authorized' : 'Deauthorized'} for ${cName}`,
      count: kitIds.length
    });
  } catch (err) {
    console.error('[kit_cluster_auth] Error in bulk_toggle_auth:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * 5. GET /map-coverage-summary
 * Returns cluster-wise stats (total kits, authorized kits, coverage status)
 * for rendering visual thematic colors on the map.
 */
exports.get_map_coverage_summary = async (req, res) => {
  try {
    const clusters = await FranchiseeCluster.find({
      deleted_at: null,
      $or: [{ is_active: true }, { is_active: { $exists: false } }]
    }).lean();

    const mappings = await WarehouseClusterMapping.find({
      status: 'Active',
      deleted_at: null
    }).lean();

    const activations = await WarehouseKitActivation.find({
      is_combokit_active: true,
      is_active: true,
      deleted_at: null
    }).lean();

    // Map warehouse_id to activated kit IDs
    const whKitsMap = {};
    activations.forEach(a => {
      const wIdStr = a.warehouse_id?.toString();
      const kIdStr = (a.combo_kit_id?._id || a.combo_kit_id)?.toString();
      if (wIdStr && kIdStr) {
        if (!whKitsMap[wIdStr]) whKitsMap[wIdStr] = new Set();
        whKitsMap[wIdStr].add(kIdStr);
      }
    });

    // Fetch all authorization overrides
    const authDocs = await KitClusterAuthorization.find({ deleted_at: null }).lean();
    const clusterAuthMap = {};
    authDocs.forEach(ad => {
      const cIdStr = ad.cluster_id?.toString();
      const kIdStr = ad.combo_kit_id?.toString();
      if (cIdStr && kIdStr) {
        if (!clusterAuthMap[cIdStr]) clusterAuthMap[cIdStr] = {};
        clusterAuthMap[cIdStr][kIdStr] = ad.is_authorized;
      }
    });

    const summary = clusters.map(fc => {
      const fcIdStr = fc._id.toString();

      // Find mapped warehouses for this cluster
      const mappedWhIds = [];
      mappings.forEach(m => {
        const matchesCluster = (m.franchise_cluster_ids || []).some(id => id.toString() === fcIdStr);
        const matchesState = (m.states || []).some(s => s.toLowerCase() === (fc.state_name || '').toLowerCase());
        if (matchesCluster || matchesState) {
          if (m.warehouse_id) mappedWhIds.push(m.warehouse_id.toString());
        }
      });

      // Collect all activated kits in these warehouses
      const clusterKitIds = new Set();
      mappedWhIds.forEach(wId => {
        if (whKitsMap[wId]) {
          whKitsMap[wId].forEach(kId => clusterKitIds.add(kId));
        }
      });

      const totalKits = clusterKitIds.size;
      let authorizedCount = 0;
      let restrictedCount = 0;

      clusterKitIds.forEach(kId => {
        const authStatus = clusterAuthMap[fcIdStr]?.[kId];
        // Default is true if no explicit suppression
        if (authStatus === false) restrictedCount++;
        else authorizedCount++;
      });

      let status = 'unconfigured';
      let color = '#94a3b8'; // Slate

      if (totalKits > 0) {
        if (restrictedCount === 0) {
          status = 'full';
          color = '#10b981'; // Emerald Green (All authorized)
        } else if (authorizedCount === 0) {
          status = 'restricted';
          color = '#f43f5e'; // Rose (All hidden)
        } else {
          status = 'partial';
          color = '#f59e0b'; // Amber (Partial)
        }
      }

      return {
        cluster_id: fcIdStr,
        cluster_code: fc.cluster_code,
        cluster_name: fc.cluster_name,
        state_id: fc.state_id ? fc.state_id.toString() : null,
        state_name: fc.state_name,
        district_names: fc.district_names || [],
        total_kits: totalKits,
        authorized_kits: authorizedCount,
        restricted_kits: restrictedCount,
        coverage_status: status,
        color: color
      };
    });

    return res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (err) {
    console.error('[kit_cluster_auth] Error in get_map_coverage_summary:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
