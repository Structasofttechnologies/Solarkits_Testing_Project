const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  Reseller,
  BDEProfile,
  FranchiseeAgreement,
  FranchiseeClusterGoal,
} = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2, Level1, Level2 } = require('../models/geolocation_db');
const StateLevel = GeoLevel1 || Level1;
const DistrictLevel = GeoLevel2 || Level2;

/**
 * Generates an auto-incremented cluster code for a given state.
 * E.g., State: "Gujarat" (GJ) -> "CLU-GJ-001"
 */
const generateClusterCode = async (stateId) => {
  let stateCode = 'IN';
  try {
    const stateDoc = await StateLevel.findById(stateId).lean();
    if (stateDoc && stateDoc.iso2) {
      stateCode = stateDoc.iso2.toUpperCase();
    } else if (stateDoc && stateDoc.name) {
      stateCode = stateDoc.name.substring(0, 2).toUpperCase();
    }
  } catch (e) {}

  const regex = new RegExp(`^CLU-${stateCode}-\\d+$`, 'i');
  const count = await FranchiseeCluster.countDocuments({
    cluster_code: { $regex: regex },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `CLU-${stateCode}-${seq}`;
};

/**
 * Validates district exclusivity across all active clusters.
 * If any district is already in an active cluster where shared territory is NOT allowed, returns error.
 */
const checkDistrictExclusivity = async (districtIds, excludeClusterId = null, allowShared = false) => {
  if (allowShared) return { hasConflict: false };

  const query = {
    district_ids: { $in: districtIds },
    is_active: true,
    deleted_at: null,
    status: { $in: ['available', 'reserved', 'allotted'] },
    is_shared_territory_allowed: false,
  };

  if (excludeClusterId) {
    query._id = { $ne: excludeClusterId };
  }

  const conflictingClusters = await FranchiseeCluster.find(query)
    .populate('district_ids', 'name')
    .lean();

  if (conflictingClusters.length > 0) {
    const districtIdSet = new Set(districtIds.map(d => String(d)));
    const conflicts = [];

    for (const clu of conflictingClusters) {
      for (const d of clu.district_ids || []) {
        if (districtIdSet.has(String(d._id || d))) {
          conflicts.push({
            district_id: d._id || d,
            district_name: d.name || 'Unknown District',
            conflicting_cluster_id: clu._id,
            conflicting_cluster_name: clu.cluster_name,
            cluster_code: clu.cluster_code,
            status: clu.status,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        conflicts,
        message: `District(s) already allocated: ${conflicts.map(c => `"${c.district_name}" in Cluster "${c.conflicting_cluster_name}" (${c.cluster_code})`).join(', ')}.`,
      };
    }
  }

  return { hasConflict: false };
};

/**
 * 1. Create a new Franchisee Cluster
 */
exports.create_cluster = async (req, res) => {
  try {
    const {
      cluster_name,
      country_id,
      state_id,
      district_ids,
      franchisee_store_type,
      status,
      assigned_franchisee_id,
      primary_bde_id,
      support_bde_ids,
      setup_fee_config,
      agreement_period_years,
      effective_date,
      is_shared_territory_allowed,
    } = req.body;

    if (!cluster_name || !cluster_name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Cluster Name is required.' });
    }
    if (!state_id) {
      return res.status(400).json({ status: 'error', message: 'State selection is required.' });
    }
    if (!district_ids || !Array.isArray(district_ids) || district_ids.length === 0) {
      return res.status(400).json({ status: 'error', message: 'At least one District must be selected.' });
    }

    // Check cluster name uniqueness
    const existingName = await FranchiseeCluster.findOne({
      cluster_name: { $regex: new RegExp(`^${cluster_name.trim()}$`, 'i') },
      deleted_at: null,
    });
    if (existingName) {
      return res.status(400).json({ status: 'error', message: `Cluster name "${cluster_name}" already exists.` });
    }

    // Check district exclusivity
    const exclusivityCheck = await checkDistrictExclusivity(
      district_ids,
      null,
      Boolean(is_shared_territory_allowed)
    );
    if (exclusivityCheck.hasConflict) {
      return res.status(400).json({
        status: 'error',
        message: exclusivityCheck.message,
        conflicts: exclusivityCheck.conflicts,
      });
    }

    // Resolve state name & district names
    const stateDoc = await StateLevel.findById(state_id).lean();
    const state_name = stateDoc ? stateDoc.name : 'Unknown State';

    const districtDocs = await DistrictLevel.find({ _id: { $in: district_ids } }).lean();
    const district_names = districtDocs.map(d => d.name);

    // Auto-generate unique cluster code
    const cluster_code = await generateClusterCode(state_id);

    // Initial audit entry
    const audit_history = [{
      user_id: req.user?._id || null,
      user_name: req.user?.full_name || 'Admin',
      action: 'CREATED',
      timestamp: new Date(),
      new_state: {
        cluster_name,
        cluster_code,
        districts: district_names,
        status: status || (assigned_franchisee_id ? 'allotted' : 'available'),
      },
      reason: 'Initial cluster creation',
    }];

    const cluster = new FranchiseeCluster({
      cluster_name: cluster_name.trim(),
      cluster_code,
      country_id: country_id || stateDoc?.level_0 || new mongoose.Types.ObjectId(),
      country_name: 'India',
      state_id,
      state_name,
      district_ids,
      district_names,
      franchisee_store_type: franchisee_store_type || 'district_wise_franchisee_store',
      status: status || (assigned_franchisee_id ? 'allotted' : 'available'),
      assigned_franchisee_id: assigned_franchisee_id || null,
      primary_bde_id: primary_bde_id || null,
      support_bde_ids: Array.isArray(support_bde_ids) ? support_bde_ids : [],
      setup_fee_config: setup_fee_config || {
        setup_fee: 100000,
        agreement_duration_years: agreement_period_years || 2,
        renewal_fee: 10000,
        security_deposit: 25000,
        additional_charges: [],
        total_payable: 135000,
      },
      effective_date: effective_date || new Date(),
      is_shared_territory_allowed: Boolean(is_shared_territory_allowed),
      audit_history,
      created_by: req.user?._id || null,
    });

    await cluster.save();

    return res.status(201).json({
      status: 'success',
      message: `Cluster "${cluster.cluster_name}" created successfully with code ${cluster.cluster_code}.`,
      data: cluster,
    });
  } catch (err) {
    console.error('Error in create_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. Get all Franchisee Clusters with rich filtering
 */
exports.get_clusters = async (req, res) => {
  try {
    const { state_id, status, assigned_franchisee_id, primary_bde_id, search } = req.query;

    const query = { deleted_at: null };

    if (state_id) query.state_id = state_id;
    if (status && status !== 'all') query.status = status;
    if (assigned_franchisee_id) query.assigned_franchisee_id = assigned_franchisee_id;
    if (primary_bde_id) query.primary_bde_id = primary_bde_id;
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { cluster_name: { $regex: s, $options: 'i' } },
        { cluster_code: { $regex: s, $options: 'i' } },
        { state_name: { $regex: s, $options: 'i' } },
        { district_names: { $in: [new RegExp(s, 'i')] } },
      ];
    }

    const clusters = await FranchiseeCluster.find(query)
      .populate('state_id', 'name iso2')
      .populate('district_ids', 'name lat lng is_active')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category gst_number kyc_status reseller_lifecycle_status')
      .populate('primary_bde_id', 'full_name mobile_number email bde_id')
      .populate('support_bde_ids', 'full_name mobile_number email bde_id')
      .sort({ created_at: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      count: clusters.length,
      data: clusters,
    });
  } catch (err) {
    console.error('Error in get_clusters:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 3. Get single Cluster details by ID
 */
exports.get_cluster_by_id = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid Cluster ID.' });
    }

    const cluster = await FranchiseeCluster.findById(id)
      .populate('state_id', 'name iso2')
      .populate('district_ids', 'name lat lng pincodes is_active')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category gst_number kyc_status reseller_lifecycle_status address agreement_status fee_payment_status')
      .populate('primary_bde_id', 'full_name mobile_number email bde_id')
      .populate('support_bde_ids', 'full_name mobile_number email bde_id')
      .populate('created_by', 'full_name email')
      .populate('updated_by', 'full_name email')
      .lean();

    if (!cluster || cluster.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    return res.status(200).json({
      status: 'success',
      data: cluster,
    });
  } catch (err) {
    console.error('Error in get_cluster_by_id:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 4. Update Cluster (Territory, Metadata, BDE, Status)
 * Enforces historical audit record if active franchisee is assigned.
 */
exports.update_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cluster_name,
      district_ids,
      status,
      assigned_franchisee_id,
      primary_bde_id,
      support_bde_ids,
      is_shared_territory_allowed,
      agreement_period_years,
      reason, // Required if active franchisee exists and territory changes
    } = req.body;

    const cluster = await FranchiseeCluster.findById(id);
    if (!cluster || cluster.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    const oldStateSnapshot = {
      cluster_name: cluster.cluster_name,
      status: cluster.status,
      district_ids: cluster.district_ids,
      district_names: cluster.district_names,
      assigned_franchisee_id: cluster.assigned_franchisee_id,
      primary_bde_id: cluster.primary_bde_id,
    };

    // If districts are changing
    let districtChanged = false;
    if (district_ids && Array.isArray(district_ids)) {
      const oldSet = new Set(cluster.district_ids.map(d => String(d)));
      const newSet = new Set(district_ids.map(d => String(d)));
      if (oldSet.size !== newSet.size || [...newSet].some(d => !oldSet.has(d))) {
        districtChanged = true;

        // If cluster has active franchisee, require reason
        if (cluster.assigned_franchisee_id && (!reason || !reason.trim())) {
          return res.status(400).json({
            status: 'error',
            message: 'This cluster has an active franchisee. Territory changes require an explicit reason for the audit record.',
          });
        }

        // Validate district exclusivity for newly added districts
        const exclusivityCheck = await checkDistrictExclusivity(
          district_ids,
          cluster._id,
          is_shared_territory_allowed !== undefined ? is_shared_territory_allowed : cluster.is_shared_territory_allowed
        );
        if (exclusivityCheck.hasConflict) {
          return res.status(400).json({
            status: 'error',
            message: exclusivityCheck.message,
            conflicts: exclusivityCheck.conflicts,
          });
        }

        const districtDocs = await DistrictLevel.find({ _id: { $in: district_ids } }).lean();
        cluster.district_ids = district_ids;
        cluster.district_names = districtDocs.map(d => d.name);
      }
    }

    if (cluster_name && cluster_name.trim() !== cluster.cluster_name) {
      const existing = await FranchiseeCluster.findOne({
        _id: { $ne: cluster._id },
        cluster_name: { $regex: new RegExp(`^${cluster_name.trim()}$`, 'i') },
        deleted_at: null,
      });
      if (existing) {
        return res.status(400).json({ status: 'error', message: `Cluster name "${cluster_name}" already exists.` });
      }
      cluster.cluster_name = cluster_name.trim();
    }

    if (status) cluster.status = status;
    if (assigned_franchisee_id !== undefined) cluster.assigned_franchisee_id = assigned_franchisee_id || null;
    if (primary_bde_id !== undefined) cluster.primary_bde_id = primary_bde_id || null;
    if (support_bde_ids !== undefined) cluster.support_bde_ids = support_bde_ids;
    if (is_shared_territory_allowed !== undefined) cluster.is_shared_territory_allowed = is_shared_territory_allowed;
    if (agreement_period_years) cluster.setup_fee_config.agreement_duration_years = agreement_period_years;

    cluster.updated_by = req.user?._id || null;

    // Append audit record
    cluster.audit_history.push({
      user_id: req.user?._id || null,
      user_name: req.user?.full_name || 'Admin',
      action: districtChanged ? 'TERRITORY_UPDATED' : 'METADATA_UPDATED',
      timestamp: new Date(),
      old_state: oldStateSnapshot,
      new_state: {
        cluster_name: cluster.cluster_name,
        status: cluster.status,
        district_names: cluster.district_names,
        assigned_franchisee_id: cluster.assigned_franchisee_id,
        primary_bde_id: cluster.primary_bde_id,
      },
      reason: reason || 'Admin updated cluster details',
    });

    await cluster.save();

    return res.status(200).json({
      status: 'success',
      message: 'Cluster updated successfully.',
      data: cluster,
    });
  } catch (err) {
    console.error('Error in update_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 5. Update Cluster Setup Fee Configuration
 */
exports.update_cluster_fees = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      setup_fee,
      renewal_fee,
      security_deposit,
      additional_charges,
      waiver_discount,
      agreement_duration_years,
      reason,
    } = req.body;

    const cluster = await FranchiseeCluster.findById(id);
    if (!cluster || cluster.deleted_at) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    const oldFees = { ...cluster.setup_fee_config.toObject() };

    if (setup_fee !== undefined) cluster.setup_fee_config.setup_fee = Number(setup_fee);
    if (renewal_fee !== undefined) cluster.setup_fee_config.renewal_fee = Number(renewal_fee);
    if (security_deposit !== undefined) cluster.setup_fee_config.security_deposit = Number(security_deposit);
    if (agreement_duration_years !== undefined) cluster.setup_fee_config.agreement_duration_years = Number(agreement_duration_years);
    if (additional_charges && Array.isArray(additional_charges)) {
      cluster.setup_fee_config.additional_charges = additional_charges;
    }
    if (waiver_discount) {
      cluster.setup_fee_config.waiver_discount = {
        amount: Number(waiver_discount.amount || 0),
        approved_by: req.user?._id || null,
        reason: waiver_discount.reason || reason || 'Admin fee waiver/discount',
      };
    }

    // Recalculate total payable
    const fee = Number(cluster.setup_fee_config.setup_fee || 0);
    const renewal = Number(cluster.setup_fee_config.renewal_fee || 0);
    const deposit = Number(cluster.setup_fee_config.security_deposit || 0);
    const extras = (cluster.setup_fee_config.additional_charges || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const waiver = Number(cluster.setup_fee_config.waiver_discount?.amount || 0);
    cluster.setup_fee_config.total_payable = Math.max(0, fee + renewal + deposit + extras - waiver);

    cluster.audit_history.push({
      user_id: req.user?._id || null,
      user_name: req.user?.full_name || 'Admin',
      action: 'FEE_UPDATED',
      timestamp: new Date(),
      old_state: oldFees,
      new_state: cluster.setup_fee_config.toObject(),
      reason: reason || 'Setup fee configuration updated',
    });

    await cluster.save();

    return res.status(200).json({
      status: 'success',
      message: 'Cluster setup fee configuration updated successfully.',
      data: cluster.setup_fee_config,
    });
  } catch (err) {
    console.error('Error in update_cluster_fees:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 6. Get Available & Allotted Districts for a State
 */
exports.get_state_districts_availability = async (req, res) => {
  try {
    const { state_id } = req.params;
    if (!state_id) {
      return res.status(400).json({ status: 'error', message: 'state_id is required.' });
    }

    let resolvedStateId = state_id;
    if (!mongoose.Types.ObjectId.isValid(state_id)) {
      const foundState = await StateLevel.findOne({
        name: { $regex: new RegExp(`^${state_id}$`, 'i') },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
      }).lean();
      if (foundState) resolvedStateId = foundState._id;
    }

    // All active districts in the state
    const allDistricts = await DistrictLevel.find({
      level_1: resolvedStateId,
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
      $and: [{ $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] }],
    }).sort({ name: 1 }).lean();

    // Find all active clusters in this state
    const activeClusters = await FranchiseeCluster.find({
      state_id: resolvedStateId,
      is_active: true,
      deleted_at: null,
      status: { $in: ['available', 'reserved', 'allotted'] },
    })
      .populate('assigned_franchisee_id', 'business_name')
      .populate('primary_bde_id', 'full_name')
      .lean();

    // Map district IDs to their cluster info
    const districtClusterMap = {};
    for (const clu of activeClusters) {
      for (const dId of clu.district_ids || []) {
        districtClusterMap[String(dId)] = {
          cluster_id: clu._id,
          cluster_name: clu.cluster_name,
          cluster_code: clu.cluster_code,
          cluster_status: clu.status,
          franchisee_name: clu.assigned_franchisee_id?.business_name || null,
          bde_name: clu.primary_bde_id?.full_name || null,
          is_shared_allowed: clu.is_shared_territory_allowed,
        };
      }
    }

    const categorizedDistricts = allDistricts.map(d => {
      const clusterInfo = districtClusterMap[String(d._id)];
      return {
        id: d._id,
        _id: d._id,
        name: d.name,
        code: d.code || '',
        lat: d.lat || 0,
        lng: d.lng || 0,
        is_allotted: Boolean(clusterInfo && clusterInfo.cluster_status === 'allotted'),
        is_reserved: Boolean(clusterInfo && clusterInfo.cluster_status === 'reserved'),
        is_in_cluster: Boolean(clusterInfo),
        cluster_info: clusterInfo || null,
      };
    });

    return res.status(200).json({
      status: 'success',
      data: categorizedDistricts,
      districts: categorizedDistricts,
    });
  } catch (err) {
    console.error('Error in get_state_districts_availability:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 7. Delete or Deactivate Cluster
 */
exports.delete_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const cluster = await FranchiseeCluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    if (cluster.assigned_franchisee_id && cluster.status === 'allotted') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete an active allotted cluster. Please unassign the franchisee or mark status as Inactive first.',
      });
    }

    cluster.deleted_at = new Date();
    cluster.is_active = false;
    cluster.status = 'inactive';
    cluster.audit_history.push({
      user_id: req.user?._id || null,
      user_name: req.user?.full_name || 'Admin',
      action: 'DELETED',
      timestamp: new Date(),
      reason: req.body?.reason || 'Admin removed cluster',
    });

    await cluster.save();

    return res.status(200).json({
      status: 'success',
      message: `Cluster "${cluster.cluster_name}" deleted successfully.`,
    });
  } catch (err) {
    console.error('Error in delete_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 8. Get Cluster Info for Logged-in Franchisee
 */
exports.get_my_cluster_info = async (req, res) => {
  try {
    const franchiseeId = req.query.franchisee_id || req.user?._id || req.user?.id || req.reseller?._id;
    if (!franchiseeId) {
      return res.status(400).json({ status: 'error', message: 'Franchisee identifier is required.' });
    }

    const cluster = await FranchiseeCluster.findOne({
      assigned_franchisee_id: franchiseeId,
      deleted_at: null,
      is_active: true,
    })
      .populate('state_id', 'name iso2')
      .populate('district_ids', 'name code')
      .populate('primary_bde_id', 'name email phone mobile employee_id')
      .populate('support_bde_ids', 'name email phone mobile employee_id')
      .lean();

    const agreement = await FranchiseeAgreement.findOne({
      franchisee_id: franchiseeId,
      agreement_status: { $in: ['active', 'expiring_soon', 'renewal_pending'] },
      deleted_at: null,
    })
      .sort({ agreement_start_date: -1 })
      .lean();

    let goal = null;
    if (cluster) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const nextYear = currentYear + 1;
      const defaultFY = `${currentYear}-${String(nextYear).slice(-2)}`;

      goal = await FranchiseeClusterGoal.findOne({
        cluster_id: cluster._id,
        financial_year: req.query.financial_year || defaultFY,
        deleted_at: null,
      }).lean();
    }

    return res.status(200).json({
      status: 'success',
      data: {
        cluster: cluster || null,
        agreement: agreement || null,
        goal: goal || null,
      },
    });
  } catch (err) {
    console.error('Error in get_my_cluster_info:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * Helper: Get active states list for cluster configuration
 */
exports.get_states_list = async (req, res) => {
  try {
    const states = await StateLevel.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
    }).sort({ name: 1 }).lean();

    const formatted = states.map(s => ({
      _id: s._id,
      id: s._id,
      name: s.name,
      iso2: s.iso2 || '',
      country_id: s.level_0 || null,
    }));

    return res.status(200).json({
      status: 'success',
      data: formatted,
      states: formatted,
    });
  } catch (err) {
    console.error('Error in get_states_list:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Helper: Get available BDEs for cluster assignment
 */
exports.get_bdes_list = async (req, res) => {
  try {
    const bdes = await BDEProfile.find({
      deleted_at: null,
      $or: [
        { status: { $in: ['active', 'kyc_verified', 'draft', 'kyc_pending'] } },
        { status: { $exists: false } },
        { is_active: true },
      ],
    }).sort({ full_name: 1 }).lean();

    const formatted = bdes.map(b => ({
      _id: b._id,
      id: b._id,
      bde_id: b.bde_id || b.employee_id || 'BDE',
      employee_id: b.bde_id || b.employee_id || 'BDE',
      full_name: b.full_name || b.name || 'BDE',
      name: b.full_name || b.name || 'BDE',
      mobile: b.mobile_number || b.mobile || '',
      mobile_number: b.mobile_number || b.mobile || '',
      email: b.email || '',
    }));

    return res.status(200).json({
      status: 'success',
      data: formatted,
      bdes: formatted,
    });
  } catch (err) {
    console.error('Error in get_bdes_list:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Helper: Get active resellers/franchisees for cluster assignment
 */
exports.get_resellers_list = async (req, res) => {
  try {
    const resellers = await Reseller.find({
      deleted_at: null,
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
    })
      .select('business_name store_name mobile email store_category kyc_status reseller_lifecycle_status')
      .sort({ business_name: 1 })
      .lean();

    const formatted = resellers.map(r => ({
      _id: r._id,
      id: r._id,
      business_name: r.business_name || r.store_name || 'Franchisee Partner',
      name: r.business_name || r.store_name || 'Franchisee Partner',
      mobile: r.mobile || '',
      email: r.email || '',
      store_category: r.store_category || 'district_store',
      kyc_status: r.kyc_status,
      reseller_lifecycle_status: r.reseller_lifecycle_status,
    }));

    return res.status(200).json({
      status: 'success',
      data: formatted,
      resellers: formatted,
    });
  } catch (err) {
    console.error('Error in get_resellers_list:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
