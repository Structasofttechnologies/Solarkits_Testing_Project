const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  Reseller,
  BDEProfile,
  FranchiseeAgreement,
  FranchiseeClusterGoal,
  ResellerTerritory,
  FranchiseLead,
} = require('../models/india_solarshop_db');
const { CmsUser } = require('../models/user_db');
const { GeoLevel1, GeoLevel2, Level1, Level2 } = require('../models/geolocation_db');
const { invalidateGoalCache } = require('../services/franchisee.goal.service');
const StateLevel = GeoLevel1 || Level1;
const DistrictLevel = GeoLevel2 || Level2;

let verifyToken = null;
try {
  verifyToken = require('../../../utils/jwtKeyProvider').verifyToken;
} catch (e) {
  try {
    verifyToken = require('../../solarshop-india/utils/jsonwebtoken').decode_token;
  } catch (e2) { }
}

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
  } catch (e) { }

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
 * Synchronizes Cluster Performance Goal Settings.
 * Auto-populates 12 months (April - March) based on baseline monthly target if not provided.
 */
const syncClusterGoalConfig = async (cluster, goalConfig, userId) => {
  if (!goalConfig) return;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const defaultFY = currentMonth >= 4
    ? `${currentYear}-${String(currentYear + 1).slice(2)}`
    : `${currentYear - 1}-${String(currentYear).slice(2)}`;
  const fy = goalConfig.financial_year || defaultFY;

  const monthlyKitTarget = Number(goalConfig.monthly_kits_target ?? goalConfig.monthly_kit_target ?? 100);
  const annualKitsTarget = Number(goalConfig.annual_kits_target ?? (monthlyKitTarget * 12));
  const epcOnboardGoal = Number(goalConfig.annual_epc_goal ?? 50);
  const epcOnboardDays = Number(goalConfig.epc_onboard_days ?? 90);
  const liveEpcGoal = Number(goalConfig.annual_live_epc_goal ?? 60);
  const liveEpcDays = Number(goalConfig.live_epc_criteria_days ?? 90);
  const annualPoOrdersGoal = Number(goalConfig.annual_po_orders_goal ?? 50);

  let monthlyGoals = goalConfig.monthly_kit_goals;
  if (!Array.isArray(monthlyGoals) || monthlyGoals.length === 0) {
    const [startYr] = fy.split('-').map(Number);
    monthlyGoals = [];
    for (let i = 0; i < 12; i++) {
      const m = ((3 + i) % 12) + 1; // 4 to 12, then 1 to 3
      const y = m >= 4 ? startYr : startYr + 1;
      monthlyGoals.push({
        month: m,
        year: y,
        target_kits_quantity: monthlyKitTarget,
        target_revenue: Number(goalConfig.monthly_revenue_target || 0),
        target_po_kits: Number(goalConfig.target_po_kits || Math.round(monthlyKitTarget * 0.8)),
        target_loose_orders: Number(goalConfig.target_loose_orders || 0),
      });
    }
  }

  const existingGoal = await FranchiseeClusterGoal.findOne({
    cluster_id: cluster._id,
    financial_year: fy,
    deleted_at: null,
  });

  if (existingGoal) {
    existingGoal.revisions.push({
      revised_at: new Date(),
      revised_by: userId || null,
      effective_date: new Date(),
      reason: goalConfig.reason || 'Updated during cluster update',
      previous_annual_epc_goal: existingGoal.annual_epc_goal,
      previous_annual_live_epc_goal: existingGoal.annual_live_epc_goal,
      previous_epc_onboard_days: existingGoal.epc_onboard_days,
      previous_monthly_kits_target: existingGoal.monthly_kits_target,
      previous_annual_kits_target: existingGoal.annual_kits_target,
      previous_annual_po_orders_goal: existingGoal.annual_po_orders_goal,
      previous_monthly_goals: existingGoal.monthly_kit_goals,
    });

    existingGoal.monthly_kits_target = monthlyKitTarget;
    existingGoal.annual_kits_target = annualKitsTarget;
    existingGoal.annual_epc_goal = epcOnboardGoal;
    existingGoal.epc_onboard_days = epcOnboardDays;
    existingGoal.annual_live_epc_goal = liveEpcGoal;
    existingGoal.live_epc_criteria_days = liveEpcDays;
    existingGoal.annual_po_orders_goal = annualPoOrdersGoal;
    existingGoal.monthly_kit_goals = monthlyGoals;
    existingGoal.franchisee_id = cluster.assigned_franchisee_id || null;
    existingGoal.updated_by = userId || null;
    await existingGoal.save();
  } else {
    const newGoal = new FranchiseeClusterGoal({
      cluster_id: cluster._id,
      franchisee_id: cluster.assigned_franchisee_id || null,
      financial_year: fy,
      monthly_kits_target: monthlyKitTarget,
      annual_kits_target: annualKitsTarget,
      annual_epc_goal: epcOnboardGoal,
      epc_onboard_days: epcOnboardDays,
      annual_live_epc_goal: liveEpcGoal,
      live_epc_criteria_days: liveEpcDays,
      annual_po_orders_goal: annualPoOrdersGoal,
      monthly_kit_goals: monthlyGoals,
      created_by: userId || null,
    });
    await newGoal.save();
  }

  if (cluster.assigned_franchisee_id) {
    try {
      invalidateGoalCache(cluster.assigned_franchisee_id);
    } catch (e) {
      console.warn('Cache invalidate warning:', e);
    }
  }
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
      color_code,
      goal_config,
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

    // Warehouse-First Prerequisite: A regional warehouse must exist for this state before creating clusters
    const { CompanyWarehouse } = require('../models/company_warehouse_db');
    const existingWarehouse = await CompanyWarehouse.findOne({
      level_1: state_id,
      deleted_at: null,
    }).lean();

    if (!existingWarehouse) {
      return res.status(400).json({
        status: 'error',
        message: `A regional warehouse must be established for ${state_name} before creating clusters. Please create a warehouse for this state first.`
      });
    }

    // Auto-inherit warehouse staff if warehouse already has staff assigned
    const warehouseStaff = existingWarehouse.assigned_staff_users || [];
    const isStaffed = warehouseStaff.length > 0;

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
      color_code: color_code || '#2563eb',
      assigned_franchisee_id: assigned_franchisee_id || null,
      primary_bde_id: primary_bde_id || null,
      support_bde_ids: Array.isArray(support_bde_ids) ? support_bde_ids : [],
      assigned_staff_users: warehouseStaff,
      staffing_status: isStaffed ? 'staffed' : 'unassigned',
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

    // Automatically link new cluster to the regional warehouse mapping
    try {
      const { WarehouseClusterMapping } = require('../models/core_db');
      await WarehouseClusterMapping.updateMany(
        {
          $or: [
            { warehouse_id: existingWarehouse._id },
            { warehouse_code: existingWarehouse.warehouse_code }
          ],
          deleted_at: null
        },
        {
          $addToSet: {
            franchise_cluster_ids: cluster._id,
            franchise_clusters: {
              cluster_id: cluster._id,
              cluster_code: cluster.cluster_code,
              cluster_name: cluster.cluster_name,
              state_name: cluster.state_name,
              district_names: cluster.district_names
            }
          }
        }
      );
    } catch (mapErr) {
      console.warn('Note: Mapping sync on cluster creation:', mapErr.message);
    }

    if (goal_config) {
      try {
        await syncClusterGoalConfig(cluster, goal_config, req.user?._id);
      } catch (gErr) {
        console.error('Error syncing goal config on create:', gErr);
      }
    }

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
    const { state_id, state_name, status, assigned_franchisee_id, primary_bde_id, search } = req.query;

    const query = { deleted_at: null };

    if (state_id) query.state_id = state_id;
    if (state_name) {
      query.state_name = { $regex: new RegExp(`^${state_name.trim()}$`, 'i') };
    }
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
      .populate('assigned_staff_users', 'name email phone role_id department_name warehouse_name')
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

    // Attach current FY goal configuration if available
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const defaultFY = currentMonth >= 4
      ? `${currentYear}-${String(currentYear + 1).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`;
    const fy = req.query.financial_year || defaultFY;

    const goal = await FranchiseeClusterGoal.findOne({
      cluster_id: id,
      financial_year: fy,
      deleted_at: null,
    }).lean();

    cluster.goal_config = goal || null;

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
      color_code,
      reason, // Required if active franchisee exists and territory changes
      goal_config,
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
    if (color_code) cluster.color_code = color_code;
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

    if (goal_config) {
      try {
        await syncClusterGoalConfig(cluster, goal_config, req.user?._id);
      } catch (gErr) {
        console.error('Error syncing goal config on update:', gErr);
      }
    }

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
 * 8. Get Cluster Info for Logged-in Franchisee (Supports Multi-Cluster & Reseller Tokens)
 */
exports.get_my_cluster_info = async (req, res) => {
  try {
    let franchiseeId = req.query.franchisee_id || req.user?._id || req.user?.id || req.reseller?._id;

    // Resolve franchisee from Bearer token if not already attached
    if (!franchiseeId && req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        if (verifyToken) {
          const decoded = verifyToken(token);
          if (decoded && (decoded.id || decoded._id)) {
            franchiseeId = decoded.id || decoded._id;
          }
        }
      } catch (tokenErr) {
        console.warn('[get_my_cluster_info] Token verify warning:', tokenErr.message);
      }
    }

    if (!franchiseeId && req.cookies?.reseller_access_token && verifyToken) {
      try {
        const decoded = verifyToken(req.cookies.reseller_access_token);
        if (decoded && (decoded.id || decoded._id)) {
          franchiseeId = decoded.id || decoded._id;
        }
      } catch (cErr) { }
    }

    if (!franchiseeId) {
      return res.status(400).json({ status: 'error', message: 'Franchisee identifier is required.' });
    }

    // 1. Find directly assigned clusters
    let clusters = await FranchiseeCluster.find({
      assigned_franchisee_id: franchiseeId,
      deleted_at: null,
      is_active: true,
    })
      .populate('state_id', 'name iso2')
      .populate('district_ids', 'name code')
      .populate('primary_bde_id', 'name email phone mobile employee_id')
      .populate('support_bde_ids', 'name email phone mobile employee_id')
      .lean();

    // 2. Also check if the franchisee has active territories in ResellerTerritory
    const activeTerritories = await ResellerTerritory.find({
      reseller_id: franchiseeId,
      status: 'active',
    }).lean();

    const districtIds = activeTerritories.map((t) => t.district_id).filter(Boolean);
    const stateIds = activeTerritories.map((t) => t.state_id).filter(Boolean);

    // If clusters found so far do not cover all territory districts, find matching clusters
    if (districtIds.length > 0) {
      const existingClusterIds = new Set(clusters.map((c) => String(c._id)));
      const territoryClusters = await FranchiseeCluster.find({
        _id: { $nin: Array.from(existingClusterIds) },
        district_ids: { $in: districtIds },
        deleted_at: null,
        is_active: true,
      })
        .populate('state_id', 'name iso2')
        .populate('district_ids', 'name code')
        .populate('primary_bde_id', 'name email phone mobile employee_id')
        .populate('support_bde_ids', 'name email phone mobile employee_id')
        .lean();

      if (territoryClusters.length > 0) {
        clusters = clusters.concat(territoryClusters);
      }
    } else if (clusters.length === 0 && stateIds.length > 0) {
      const stateClusters = await FranchiseeCluster.find({
        state_id: { $in: stateIds },
        deleted_at: null,
        is_active: true,
      })
        .populate('state_id', 'name iso2')
        .populate('district_ids', 'name code')
        .populate('primary_bde_id', 'name email phone mobile employee_id')
        .populate('support_bde_ids', 'name email phone mobile employee_id')
        .lean();
      clusters = stateClusters;
    }

    // Format clusters and map setup_fee_config -> fee_structure
    const formattedClusters = clusters.map((c) => {
      const cfg = c.setup_fee_config || {};
      return {
        ...c,
        fee_structure: {
          franchisee_setup_fee: cfg.setup_fee || 0,
          renewal_fee: cfg.renewal_fee || 0,
          security_deposit: cfg.security_deposit || 0,
          total_payable: cfg.total_payable || 0,
          payment_status: c.payment_status || 'paid',
          agreement_duration_years: cfg.agreement_duration_years || 2,
        },
        state: c.state_id || { name: c.state_name },
        districts: c.district_ids || [],
      };
    });

    // 3. Find agreements
    const agreements = await FranchiseeAgreement.find({
      franchisee_id: franchiseeId,
      agreement_status: { $in: ['active', 'expiring_soon', 'renewal_pending'] },
      deleted_at: null,
    })
      .sort({ agreement_start_date: -1 })
      .lean();

    // 4. Find goals for all clusters
    const clusterIds = formattedClusters.map((c) => c._id);
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const defaultFY = `${currentYear}-${String(nextYear).slice(-2)}`;
    const requestedFY = req.query.financial_year || defaultFY;

    let goals = [];
    if (clusterIds.length > 0) {
      goals = await FranchiseeClusterGoal.find({
        cluster_id: { $in: clusterIds },
        deleted_at: null,
      }).lean();
    }

    const primaryGoal =
      goals.find(
        (g) =>
          g.financial_year === requestedFY ||
          g.financial_year === `FY ${requestedFY}` ||
          g.financial_year === requestedFY.replace(/^FY\s*/, '')
      ) ||
      goals[0] ||
      null;

    return res.status(200).json({
      status: 'success',
      data: {
        clusters: formattedClusters,
        cluster: formattedClusters[0] || null,
        agreements,
        agreement: agreements[0] || null,
        goals,
        goal: primaryGoal,
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
 * Enhanced to automatically look up applicant's chosen cluster, fees, and territory
 */
exports.get_resellers_list = async (req, res) => {
  try {
    const resellers = await Reseller.find({
      deleted_at: null,
      $or: [{ is_active: true }, { is_active: { $exists: false } }],
    })
      .select('business_name store_name mobile email store_category kyc_status reseller_lifecycle_status cluster_id address')
      .sort({ business_name: 1 })
      .lean();

    const resellerIds = resellers.map((r) => r._id);

    // 1. Find any cluster where assigned_franchisee_id is this reseller
    const assignedClusters = await FranchiseeCluster.find({
      assigned_franchisee_id: { $in: resellerIds },
      deleted_at: null,
    }).lean();
    const assignedClusterMap = {};
    for (const c of assignedClusters) {
      if (c.assigned_franchisee_id) {
        assignedClusterMap[String(c.assigned_franchisee_id)] = c;
      }
    }

    // 2. Find any FranchiseLead linked by converted_reseller_id or mobile/email
    const leads = await FranchiseLead.find({
      $or: [
        { converted_reseller_id: { $in: resellerIds } },
        { mobile_number: { $in: resellers.map((r) => r.mobile).filter(Boolean) } },
        { email: { $in: resellers.map((r) => r.email).filter(Boolean) } },
      ],
      deleted_at: null,
    })
      .populate('cluster_id')
      .sort({ created_at: -1 })
      .lean();

    const leadByResellerId = {};
    const leadByMobile = {};
    const leadByEmail = {};
    for (const l of leads) {
      if (l.converted_reseller_id && !leadByResellerId[String(l.converted_reseller_id)]) {
        leadByResellerId[String(l.converted_reseller_id)] = l;
      }
      if (l.mobile_number && !leadByMobile[l.mobile_number]) {
        leadByMobile[l.mobile_number] = l;
      }
      if (l.email && !leadByEmail[l.email.toLowerCase()]) {
        leadByEmail[l.email.toLowerCase()] = l;
      }
    }

    // 3. Collect cluster IDs directly on Reseller if any
    const directClusterIds = resellers.map((r) => r.cluster_id).filter(Boolean);
    const directClusters =
      directClusterIds.length > 0
        ? await FranchiseeCluster.find({ _id: { $in: directClusterIds }, deleted_at: null }).lean()
        : [];
    const directClusterMap = {};
    for (const c of directClusters) {
      directClusterMap[String(c._id)] = c;
    }

    const formatted = resellers.map((r) => {
      const rId = String(r._id);
      const lead =
        leadByResellerId[rId] ||
        (r.mobile && leadByMobile[r.mobile]) ||
        (r.email && leadByEmail[r.email.toLowerCase()]) ||
        null;
      const cluster =
        assignedClusterMap[rId] ||
        (r.cluster_id && directClusterMap[String(r.cluster_id)]) ||
        (lead && lead.cluster_id) ||
        null;

      const clusterId = cluster?._id || lead?.cluster_id?._id || lead?.cluster_id || r.cluster_id || null;
      const clusterName = cluster?.cluster_name || lead?.cluster_name || null;
      const clusterCode = cluster?.cluster_code || lead?.cluster_code || null;
      const clusterDistricts = cluster?.district_names || lead?.cluster_districts || [];
      const setupFee = cluster?.setup_fee_config?.setup_fee ?? 100000;
      const renewalFee = cluster?.setup_fee_config?.renewal_fee ?? 10000;
      const assignedBdeId = cluster?.assigned_bde_id || cluster?.primary_bde_id || lead?.bde_id || null;

      return {
        _id: r._id,
        id: r._id,
        business_name: r.business_name || r.store_name || 'Franchisee Partner',
        name: r.business_name || r.store_name || 'Franchisee Partner',
        mobile: r.mobile || '',
        email: r.email || '',
        store_category: r.store_category || 'district_store',
        kyc_status: r.kyc_status,
        reseller_lifecycle_status: r.reseller_lifecycle_status,
        cluster_id: clusterId,
        cluster_name: clusterName,
        cluster_code: clusterCode,
        cluster_districts: clusterDistricts,
        cluster_setup_fee: setupFee,
        cluster_renewal_fee: renewalFee,
        cluster_assigned_bde_id: assignedBdeId,
        city: r.address?.city || lead?.district || '',
        state: r.address?.state || lead?.state || '',
      };
    });

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

/**
 * 8. Assign Staff / Handling Users to Franchisee Cluster
 */
exports.assign_staff_to_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_ids, warehouse_id, warehouse_name } = req.body;
    const idsToAdd = (user_ids && Array.isArray(user_ids) ? user_ids : (user_id ? [user_id] : [])).map(String);

    if (idsToAdd.length === 0) {
      return res.status(400).json({ status: 'error', message: 'user_id or user_ids is required.' });
    }

    const cluster = await FranchiseeCluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    const existingStaff = (cluster.assigned_staff_users || []).map(String);
    const mergedStaff = Array.from(new Set([...existingStaff, ...idsToAdd]));

    cluster.assigned_staff_users = mergedStaff;
    cluster.staffing_status = mergedStaff.length > 0 ? 'staffed' : 'unassigned';
    await cluster.save();

    // Also update CmsUser records with cluster & warehouse metadata
    const userUpdates = {
      cluster_id: cluster._id,
      cluster_name: cluster.cluster_name,
      state_name: cluster.state_name
    };
    if (warehouse_id) userUpdates.warehouse_id = warehouse_id;
    if (warehouse_name) userUpdates.warehouse_name = warehouse_name;

    await CmsUser.updateMany(
      { _id: { $in: idsToAdd } },
      { $set: userUpdates }
    );

    return res.status(200).json({
      status: 'success',
      message: `Staff assigned to cluster ${cluster.cluster_name} successfully.`,
      data: cluster,
    });
  } catch (err) {
    console.error('Error in assign_staff_to_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 9. Unassign Staff User from Franchisee Cluster
 */
exports.unassign_staff_from_cluster = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ status: 'error', message: 'user_id is required.' });
    }

    const cluster = await FranchiseeCluster.findById(id);
    if (!cluster) {
      return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
    }

    cluster.assigned_staff_users = (cluster.assigned_staff_users || []).filter(u => String(u) !== String(user_id));
    cluster.staffing_status = cluster.assigned_staff_users.length > 0 ? 'staffed' : 'unassigned';
    await cluster.save();

    await CmsUser.updateOne(
      { _id: user_id },
      { $unset: { cluster_id: "", cluster_name: "" } }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Staff user unassigned successfully.',
      data: cluster,
    });
  } catch (err) {
    console.error('Error in unassign_staff_from_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 10. Get Unstaffed Clusters (Clusters needing staff assignment)
 */
exports.get_unstaffed_clusters = async (req, res) => {
  try {
    const unstaffed = await FranchiseeCluster.find({
      $or: [
        { staffing_status: 'unassigned' },
        { assigned_staff_users: { $size: 0 } },
        { assigned_staff_users: { $exists: false } }
      ],
      is_active: true,
      deleted_at: null
    })
    .select('cluster_name cluster_code state_name district_names created_at setup_fee_config status')
    .sort({ created_at: -1 })
    .lean();

    return res.status(200).json({
      status: 'success',
      count: unstaffed.length,
      data: unstaffed
    });
  } catch (err) {
    console.error('Error in get_unstaffed_clusters:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
