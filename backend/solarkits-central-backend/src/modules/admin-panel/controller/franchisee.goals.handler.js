const mongoose = require('mongoose');
const {
  FranchiseeClusterGoal,
  FranchiseeCluster,
  Reseller,
  EpcAccount,
  FpoOrder,
  PurchaseOrder,
} = require('../models/india_solarshop_db');

/**
 * Computes actual metrics for a franchisee cluster goal in real-time
 */
const computeGoalActuals = async (goalDoc) => {
  const goalObj = goalDoc.toObject ? goalDoc.toObject() : { ...goalDoc };
  const franchiseeId = goalObj.franchisee_id;
  const clusterId = goalObj.cluster_id;

  let actual_epc_onboarded = 0;
  let actual_live_epcs = 0;
  let epc_achievement_pct = 0;
  let live_epc_achievement_pct = 0;

  // 1. Calculate EPC Actuals
  if (franchiseeId || clusterId) {
    const epcQuery = {
      status: 'approved',
      deleted_at: null,
    };
    if (franchiseeId) {
      epcQuery.$or = [
        { onboarded_by_reseller_id: franchiseeId },
        { primary_reseller_id: franchiseeId },
      ];
    }

    const approvedEpcs = await EpcAccount.find(epcQuery).lean();
    actual_epc_onboarded = approvedEpcs.length;

    const days = goalObj.live_epc_criteria_days || 90;
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    actual_live_epcs = approvedEpcs.filter(
      e => e.last_activity_at && new Date(e.last_activity_at) >= thresholdDate
    ).length;

    if (goalObj.annual_epc_goal > 0) {
      epc_achievement_pct = Math.round((actual_epc_onboarded / goalObj.annual_epc_goal) * 100);
    }
    if (goalObj.annual_live_epc_goal > 0) {
      live_epc_achievement_pct = Math.round((actual_live_epcs / goalObj.annual_live_epc_goal) * 100);
    }
  }

  // 2. Calculate Monthly Kit Sales & Revenue Actuals
  const monthlyBreakdown = [];
  let annualKitsTargetTotal = 0;
  let annualKitsActualTotal = 0;
  let annualRevenueTargetTotal = 0;
  let annualRevenueActualTotal = 0;

  const validStatuses = ['CONFIRMED', 'PAID', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'COMPLETED'];

  for (const mGoal of goalObj.monthly_kit_goals || []) {
    const month = mGoal.month;
    const year = mGoal.year;
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    let actualKits = 0;
    let actualRevenue = 0;

    if (franchiseeId) {
      const orders = await FpoOrder.find({
        reseller_id: franchiseeId,
        status: { $in: validStatuses },
        created_at: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean();

      for (const ord of orders) {
        actualKits += Number(ord.total_kits_count || ord.total_quantity || 1);
        actualRevenue += Number((ord.total_amount_paise || 0) / 100);
      }
    }

    const targetKits = mGoal.target_kits_quantity || 0;
    const targetRev = mGoal.target_revenue || 0;
    const pendingKits = Math.max(0, targetKits - actualKits);
    const achievementPct = targetKits > 0 ? Math.round((actualKits / targetKits) * 100) : 0;

    annualKitsTargetTotal += targetKits;
    annualKitsActualTotal += actualKits;
    annualRevenueTargetTotal += targetRev;
    annualRevenueActualTotal += actualRevenue;

    monthlyBreakdown.push({
      month,
      year,
      target_kits_quantity: targetKits,
      actual_kit_sales: actualKits,
      pending_target: pendingKits,
      achievement_pct: achievementPct,
      target_revenue: targetRev,
      actual_revenue: actualRevenue,
      target_po_kits: mGoal.target_po_kits || 0,
      target_loose_orders: mGoal.target_loose_orders || 0,
      category_targets: mGoal.category_targets || [],
    });
  }

  const annualKitAchievementPct = annualKitsTargetTotal > 0
    ? Math.round((annualKitsActualTotal / annualKitsTargetTotal) * 100)
    : 0;

  return {
    ...goalObj,
    actual_epc_onboarded,
    actual_live_epcs,
    epc_achievement_pct,
    live_epc_achievement_pct,
    monthly_kit_goals: monthlyBreakdown,
    totals: {
      annual_kits_target: annualKitsTargetTotal,
      annual_kits_actual: annualKitsActualTotal,
      annual_kits_achievement_pct: annualKitAchievementPct,
      annual_revenue_target: annualRevenueTargetTotal,
      annual_revenue_actual: annualRevenueActualTotal,
    },
  };
};

/**
 * 1. Get Cluster Goals List by Financial Year
 */
exports.get_goals_list = async (req, res) => {
  try {
    const { financial_year, cluster_id, franchisee_id } = req.query;

    const query = { deleted_at: null };
    if (financial_year) query.financial_year = financial_year;
    if (cluster_id) query.cluster_id = cluster_id;
    if (franchisee_id) query.franchisee_id = franchisee_id;

    const goals = await FranchiseeClusterGoal.find(query)
      .populate('cluster_id', 'cluster_name cluster_code state_name district_names')
      .populate('franchisee_id', 'business_name mobile email store_category')
      .sort({ created_at: -1 });

    const results = [];
    for (const g of goals) {
      const computed = await computeGoalActuals(g);
      results.push(computed);
    }

    return res.status(200).json({
      status: 'success',
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error('Error in get_goals_list:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 2. Get Single Goal Configuration Details
 */
exports.get_goal_by_cluster = async (req, res) => {
  try {
    const { cluster_id } = req.params;
    const { financial_year } = req.query;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultFY = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;
    const fy = financial_year || defaultFY;

    let goal = await FranchiseeClusterGoal.findOne({
      cluster_id,
      financial_year: fy,
      deleted_at: null,
    })
      .populate('cluster_id')
      .populate('franchisee_id');

    if (!goal) {
      // Return default template if not yet configured
      const cluster = await FranchiseeCluster.findById(cluster_id)
        .populate('assigned_franchisee_id')
        .lean();

      if (!cluster) {
        return res.status(404).json({ status: 'error', message: 'Cluster not found.' });
      }

      // Generate 12 default months
      const [startYr] = fy.split('-').map(Number);
      const defaultMonthly = [];
      // Indian Financial Year: April to March
      for (let i = 0; i < 12; i++) {
        const m = ((3 + i) % 12) + 1; // 4 to 12, then 1 to 3
        const y = m >= 4 ? startYr : startYr + 1;
        defaultMonthly.push({
          month: m,
          year: y,
          target_kits_quantity: 100,
          target_revenue: 5000000,
          target_po_kits: 80,
          target_loose_orders: 20,
        });
      }

      return res.status(200).json({
        status: 'success',
        is_default_template: true,
        data: {
          cluster_id: cluster._id,
          cluster_name: cluster.cluster_name,
          cluster_code: cluster.cluster_code,
          franchisee_id: cluster.assigned_franchisee_id?._id || null,
          franchisee_name: cluster.assigned_franchisee_id?.business_name || null,
          financial_year: fy,
          annual_epc_goal: 100,
          annual_live_epc_goal: 60,
          monthly_kit_goals: defaultMonthly,
        },
      });
    }

    const computed = await computeGoalActuals(goal);

    return res.status(200).json({
      status: 'success',
      data: computed,
    });
  } catch (err) {
    console.error('Error in get_goal_by_cluster:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

/**
 * 3. Set or Update Franchisee Cluster Goals
 */
exports.set_cluster_goals = async (req, res) => {
  try {
    const {
      cluster_id,
      franchisee_id,
      financial_year,
      annual_epc_goal,
      annual_live_epc_goal,
      monthly_kit_goals,
      live_epc_criteria_days,
      reason,
    } = req.body;

    if (!cluster_id || !financial_year) {
      return res.status(400).json({ status: 'error', message: 'cluster_id and financial_year are required.' });
    }

    // Resolve franchisee if not provided
    let mappedFranchiseeId = franchisee_id;
    if (!mappedFranchiseeId) {
      const cluster = await FranchiseeCluster.findById(cluster_id).lean();
      mappedFranchiseeId = cluster?.assigned_franchisee_id || null;
    }

    let goal = await FranchiseeClusterGoal.findOne({
      cluster_id,
      financial_year,
      deleted_at: null,
    });

    if (goal) {
      // Log revision
      goal.revisions.push({
        revised_at: new Date(),
        revised_by: req.user?._id || null,
        effective_date: new Date(),
        reason: reason || 'Admin updated goals',
        previous_annual_epc_goal: goal.annual_epc_goal,
        previous_annual_live_epc_goal: goal.annual_live_epc_goal,
        previous_monthly_goals: goal.monthly_kit_goals,
      });

      if (annual_epc_goal !== undefined) goal.annual_epc_goal = Number(annual_epc_goal);
      if (annual_live_epc_goal !== undefined) goal.annual_live_epc_goal = Number(annual_live_epc_goal);
      if (live_epc_criteria_days !== undefined) goal.live_epc_criteria_days = Number(live_epc_criteria_days);
      if (monthly_kit_goals && Array.isArray(monthly_kit_goals)) {
        goal.monthly_kit_goals = monthly_kit_goals;
      }
      if (mappedFranchiseeId) goal.franchisee_id = mappedFranchiseeId;
      goal.updated_by = req.user?._id || null;

      await goal.save();

      return res.status(200).json({
        status: 'success',
        message: 'Franchisee cluster goals updated successfully.',
        data: goal,
      });
    }

    // Create new goal record
    goal = new FranchiseeClusterGoal({
      cluster_id,
      franchisee_id: mappedFranchiseeId,
      financial_year,
      annual_epc_goal: Number(annual_epc_goal || 100),
      annual_live_epc_goal: Number(annual_live_epc_goal || 60),
      live_epc_criteria_days: Number(live_epc_criteria_days || 90),
      monthly_kit_goals: Array.isArray(monthly_kit_goals) ? monthly_kit_goals : [],
      created_by: req.user?._id || null,
    });

    await goal.save();

    return res.status(201).json({
      status: 'success',
      message: 'Franchisee cluster goals configured successfully.',
      data: goal,
    });
  } catch (err) {
    console.error('Error in set_cluster_goals:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};
