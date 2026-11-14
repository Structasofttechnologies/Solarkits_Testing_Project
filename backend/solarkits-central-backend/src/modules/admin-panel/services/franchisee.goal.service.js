/**
 * franchisee.goal.service.js
 *
 * Franchisee Kit Order Goal resolution and progress calculation.
 *
 * Target priority cascade (highest to lowest):
 *   1. FRANCHISEE-specific override
 *   2. DISTRICT-level target
 *   3. STATE-level target
 *   4. PLAN-level target
 *   5. GLOBAL monthly target
 *
 * Calculation formula:
 *   eligible_quantity = delivered_quantity - cancelled_quantity - returned_quantity
 *   balance_quantity  = max(target_quantity - eligible_quantity, 0)
 *   achievement_pct   = target_quantity > 0 ? (eligible_quantity / target_quantity) * 100 : 0
 */

const mongoose = require('mongoose');
const {
  FranchiseeKitTarget,
  FranchiseeTargetProgress,
  FranchiseeCluster,
  FranchiseeClusterGoal,
  EpcAccount,
  FpoOrder,
  Reseller,
  ResellerPlanSubscription,
  ResellerTerritory,
} = require('../models/india_solarshop_db');
const { logAudit } = require('../utils/audit.service');

const PERFORMANCE_THRESHOLDS = {
  EXCEEDED:      120,
  ACHIEVED:      100,
  ON_TRACK:       75,
  BEHIND:          1,
  LOW_PERFORMANCE: 0,
};

/**
 * Classify performance status from achievement percentage.
 * Thresholds are currently hardcoded to defaults; they should come from admin config
 * when franchisee_alert_configs is extended with threshold settings.
 */
function classifyPerformance(achievement_pct, target_quantity) {
  if (!target_quantity || target_quantity === 0) return 'NO_TARGET';
  if (achievement_pct === 0) return 'NOT_STARTED';
  if (achievement_pct >= PERFORMANCE_THRESHOLDS.EXCEEDED) return 'EXCEEDED';
  if (achievement_pct >= PERFORMANCE_THRESHOLDS.ACHIEVED) return 'ACHIEVED';
  if (achievement_pct >= PERFORMANCE_THRESHOLDS.ON_TRACK) return 'ON_TRACK';
  if (achievement_pct >= PERFORMANCE_THRESHOLDS.BEHIND) return 'BEHIND';
  return 'LOW_PERFORMANCE';
}

/**
 * Resolve the effective kit target for a franchisee for a given month/year.
 * Follows the priority cascade: FRANCHISEE → DISTRICT → STATE → PLAN → GLOBAL.
 *
 * @param {object} params
 * @param {string|ObjectId} params.franchisee_id
 * @param {number} params.month - 1-12
 * @param {number} params.year
 * @returns {Promise<object|null>} The matching target doc or null
 */
async function resolveEffectiveTarget({ franchisee_id, month, year }) {
  const now = new Date();
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = year || now.getFullYear();

  const baseQuery = {
    is_active:    true,
    deleted_at:   null,
    $or: [
      { is_recurring: true },
      { target_month: currentMonth, target_year: currentYear },
      { target_month: null, target_year: null },
    ],
  };

  // 0. Unified Territory Cluster Goal (Primary Single Source of Truth)
  if (franchisee_id) {
    const cluster = await FranchiseeCluster.findOne({
      assigned_franchisee_id: franchisee_id,
      deleted_at: null,
    }).populate('state_id', 'name').lean();

    if (cluster) {
      const fy = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;
      const clusterGoal = await FranchiseeClusterGoal.findOne({
        cluster_id: cluster._id,
        financial_year: fy,
        deleted_at: null,
      }).lean();

      if (clusterGoal) {
        const mGoal = (clusterGoal.monthly_kit_goals || []).find((m) => m.month === currentMonth);
        return {
          _id: clusterGoal._id,
          target_type: 'CLUSTER',
          cluster_id: cluster._id,
          cluster_code: cluster.code,
          cluster_name: cluster.name,
          target_quantity: mGoal ? mGoal.target_kits_quantity : 100,
          target_revenue: mGoal ? mGoal.target_revenue : 0,
          po_split_kits: mGoal ? mGoal.target_po_kits : 0,
          loose_split_kits: mGoal ? mGoal.target_loose_orders : 0,
          annual_epc_goal: clusterGoal.annual_epc_goal || 100,
          annual_live_epc_goal: clusterGoal.annual_live_epc_goal || 60,
          live_epc_criteria_days: clusterGoal.live_epc_criteria_days || 90,
          calculation_stage: 'DELIVERED_QUANTITY',
        };
      }
    }
  }

  // 1. Franchisee-specific override
  if (franchisee_id) {
    const franchiseeTarget = await FranchiseeKitTarget.findOne({
      ...baseQuery,
      target_type:   'FRANCHISEE',
      franchisee_id: new mongoose.Types.ObjectId(franchisee_id),
    }).lean();
    if (franchiseeTarget) return franchiseeTarget;
  }

  // Fetch territory for state/district lookup
  const territory = await ResellerTerritory.findOne({
    reseller_id: franchisee_id,
    deleted_at: null,
  }).lean();

  // 2. District-level target
  if (territory?.district_id) {
    const districtTarget = await FranchiseeKitTarget.findOne({
      ...baseQuery,
      target_type: 'DISTRICT',
      district_id: territory.district_id,
    }).lean();
    if (districtTarget) return districtTarget;
  }

  // 3. State-level target
  if (territory?.state_id) {
    const stateTarget = await FranchiseeKitTarget.findOne({
      ...baseQuery,
      target_type: 'STATE',
      state_id:    territory.state_id,
    }).lean();
    if (stateTarget) return stateTarget;
  }

  // 4. Plan-level target
  // Check subscription table or reseller doc
  let planId = null;
  const subscription = await ResellerPlanSubscription.findOne({
    reseller_id: franchisee_id,
  })
    .sort({ created_at: -1, start_date: -1 })
    .lean();

  if (subscription?.plan_id) {
    planId = subscription.plan_id;
  } else {
    const resellerDoc = await Reseller.findById(franchisee_id).lean();
    if (resellerDoc?.plan_subscription_id) {
      const sub = await ResellerPlanSubscription.findById(resellerDoc.plan_subscription_id).lean();
      if (sub?.plan_id) planId = sub.plan_id;
    }
  }

  if (planId) {
    const planTarget = await FranchiseeKitTarget.findOne({
      ...baseQuery,
      target_type: 'PLAN',
      plan_id:     planId,
    }).lean();
    if (planTarget) return planTarget;
  }

  // 5. Global fallback
  const globalTarget = await FranchiseeKitTarget.findOne({
    ...baseQuery,
    target_type: 'GLOBAL',
  }).lean();
  if (globalTarget) return globalTarget;

  // 6. First plan target fallback if available
  const anyPlanTarget = await FranchiseeKitTarget.findOne({
    is_active: true,
    deleted_at: null,
  }).lean();

  return anyPlanTarget || null;
}

/**
 * Recalculate and upsert progress for a franchisee for the given month/year.
 *
 * @param {object|string|ObjectId} paramsOrId
 * @param {number} [maybeMonth]
 * @param {number} [maybeYear]
 * @returns {Promise<object>} Updated progress record
 */
async function recalculateProgress(paramsOrId, maybeMonth, maybeYear) {
  let franchisee_id, month, year, actor_id = null, req = null;
  if (typeof paramsOrId === 'object' && paramsOrId !== null && !paramsOrId._bsontype && !(paramsOrId instanceof mongoose.Types.ObjectId)) {
    franchisee_id = paramsOrId.franchisee_id;
    month = paramsOrId.month || (new Date().getMonth() + 1);
    year = paramsOrId.year || new Date().getFullYear();
    actor_id = paramsOrId.actor_id || null;
    req = paramsOrId.req || null;
  } else {
    franchisee_id = paramsOrId;
    month = maybeMonth || (new Date().getMonth() + 1);
    year = maybeYear || new Date().getFullYear();
  }

  if (!franchisee_id) {
    return null;
  }
  const target = await resolveEffectiveTarget({ franchisee_id, month, year });

  // Aggregate quantities from delivered FPO orders in the period
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 1);

  const pipeline = [
    {
      $match: {
        franchisee_id: new mongoose.Types.ObjectId(franchisee_id),
        created_at: { $gte: startDate, $lt: endDate },
        deleted_at: null,
      },
    },
    {
      $group: {
        _id: null,
        ordered_quantity: {
          $sum: {
            $cond: [{ $not: [{ $in: ['$status', ['CANCELLED', 'REJECTED', 'DRAFT']] }] }, { $sum: '$items.quantity' }, 0],
          },
        },
        approved_quantity: {
          $sum: {
            $cond: [{ $in: ['$status', ['APPROVED', 'AWAITING_PAYMENT', 'PARTIALLY_PAID', 'PAID', 'STOCK_ALLOCATED', 'PROCESSING', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED']] }, { $sum: '$items.quantity' }, 0],
          },
        },
        paid_quantity: {
          $sum: {
            $cond: [{ $in: ['$status', ['PAID', 'STOCK_ALLOCATED', 'PROCESSING', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED']] }, { $sum: '$items.quantity' }, 0],
          },
        },
        dispatched_quantity: {
          $sum: {
            $cond: [{ $in: ['$status', ['DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED']] }, { $sum: '$items.quantity' }, 0],
          },
        },
        delivered_quantity: {
          $sum: {
            $cond: [
              { $in: ['$status', ['DELIVERED', 'COMPLETED']] },
              {
                $sum: {
                  $map: {
                    input: '$items',
                    as: 'it',
                    in: {
                      $cond: [
                        { $gt: [{ $ifNull: ['$$it.delivered_quantity', 0] }, 0] },
                        '$$it.delivered_quantity',
                        { $ifNull: ['$$it.quantity', 0] }
                      ]
                    }
                  }
                }
              },
              0
            ],
          },
        },
        cancelled_quantity: { $sum: { $sum: { $ifNull: ['$items.cancelled_quantity', 0] } } },
        returned_quantity:  { $sum: { $sum: { $ifNull: ['$items.returned_quantity', 0] } } },
      },
    },
  ];

  const [agg] = await FpoOrder.aggregate(pipeline);

  const ordered_quantity    = agg?.ordered_quantity    || 0;
  const approved_quantity   = agg?.approved_quantity   || 0;
  const paid_quantity       = agg?.paid_quantity        || 0;
  const dispatched_quantity = agg?.dispatched_quantity  || 0;
  const delivered_quantity  = agg?.delivered_quantity   || 0;
  const cancelled_quantity  = agg?.cancelled_quantity   || 0;
  const returned_quantity   = agg?.returned_quantity    || 0;

  const target_quantity = target?.target_quantity || 0;
  const stage = target?.calculation_stage || 'DELIVERED_QUANTITY';

  let rawStageQty = delivered_quantity;
  if (stage === 'ORDERED_QUANTITY' || stage === 'ORDERED_PO_QUANTITY') {
    rawStageQty = ordered_quantity;
  } else if (stage === 'APPROVED_PO_QUANTITY') {
    rawStageQty = approved_quantity;
  } else if (stage === 'PAID_QUANTITY') {
    rawStageQty = paid_quantity;
  } else if (stage === 'DISPATCHED_QUANTITY') {
    rawStageQty = dispatched_quantity;
  } else {
    rawStageQty = delivered_quantity;
  }

  const eligible_quantity = Math.max(0, rawStageQty - cancelled_quantity - returned_quantity);
  const balance_quantity  = Math.max(0, target_quantity - eligible_quantity);
  const achievement_pct   = target_quantity > 0
    ? Math.round((eligible_quantity / target_quantity) * 10000) / 100 // 2 decimal places
    : 0;

  const performance_status = classifyPerformance(achievement_pct, target_quantity);

  const progressData = {
    franchisee_id,
    target_id:         target?._id || null,
    target_month:      month,
    target_year:       year,
    target_quantity,
    ordered_quantity,
    approved_quantity,
    paid_quantity,
    dispatched_quantity,
    delivered_quantity,
    cancelled_quantity,
    returned_quantity,
    eligible_quantity,
    balance_quantity,
    achievement_pct,
    performance_status,
    calculation_stage: stage,
    last_calculated_at: new Date(),
  };

  const progress = await FranchiseeTargetProgress.findOneAndUpdate(
    { franchisee_id, target_year: year, target_month: month },
    { $set: progressData },
    { upsert: true, new: true }
  );

  return progress;
}

// In-memory cache for franchisee goal widget (TTL: 60s)
const goalWidgetCache = new Map();
const GOAL_WIDGET_CACHE_TTL = 60 * 1000;

function invalidateGoalCache(franchisee_id) {
  if (!franchisee_id) return;
  goalWidgetCache.delete(franchisee_id.toString());
}

/**
 * Get goal widget data for the franchisee dashboard.
 *
 * @param {string|ObjectId} franchisee_id
 * @returns {Promise<object>}
 */
async function getGoalWidget(franchisee_id) {
  const fIdStr = franchisee_id ? franchisee_id.toString() : null;
  if (fIdStr) {
    const cached = goalWidgetCache.get(fIdStr);
    if (cached && Date.now() - cached.timestamp < GOAL_WIDGET_CACHE_TTL) {
      return cached.data;
    }
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Load Cluster & Cluster Goals (Primary Source of Truth)
  const cluster = await FranchiseeCluster.findOne({
    assigned_franchisee_id: franchisee_id,
    deleted_at: null,
  }).populate('state_id', 'name').lean();

  let clusterGoal = null;
  let annualEpcGoal = null;
  let liveEpcGoal = null;
  let clusterInfo = null;

  const currentYear = year;
  const currentMonth = month;
  const fy = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;

  if (cluster) {
    clusterGoal = await FranchiseeClusterGoal.findOne({
      cluster_id: cluster._id,
      financial_year: fy,
      deleted_at: null,
    }).lean();

    // Approved EPCs onboarded for this franchisee or within this cluster
    const approvedEpcs = await EpcAccount.find({
      $or: [
        { onboarded_by_reseller_id: franchisee_id },
        { primary_reseller_id: franchisee_id },
        { districts: { $in: cluster.district_ids || [] } },
      ],
      status: 'approved',
      deleted_at: null,
    }).lean();

    const actualEpcs = approvedEpcs.length;
    const targetEpcs = clusterGoal?.annual_epc_goal || 100;
    const epcAchievedPct = targetEpcs > 0 ? Math.round((actualEpcs / targetEpcs) * 100) : 0;

    const thresholdDays = clusterGoal?.live_epc_criteria_days || 90;
    const cutoffDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
    const liveEpcs = approvedEpcs.filter(
      (e) => e.last_activity_at && new Date(e.last_activity_at) >= cutoffDate
    ).length;
    const targetLiveEpcs = clusterGoal?.annual_live_epc_goal || 60;
    const liveAchievedPct = targetLiveEpcs > 0 ? Math.round((liveEpcs / targetLiveEpcs) * 100) : 0;

    annualEpcGoal = {
      total_epc_target: targetEpcs,
      actual_epcs_onboarded: actualEpcs,
      achievement_pct: epcAchievedPct,
    };

    liveEpcGoal = {
      live_epc_target: targetLiveEpcs,
      actual_live_epcs: liveEpcs,
      achievement_pct: liveAchievedPct,
      criteria_days: thresholdDays,
    };

    clusterInfo = {
      id: cluster._id,
      code: cluster.code,
      name: cluster.name,
      state: cluster.state_id?.name || '',
      districts_count: (cluster.district_ids || []).length,
    };
  }

  // Recalculate dynamically to ensure fresh real-time data
  let progress = await recalculateProgress({ franchisee_id, month, year });
  if (progress && progress.toObject) {
    progress = progress.toObject();
  } else if (!progress) {
    progress = await FranchiseeTargetProgress.findOne({
      franchisee_id,
      target_year: year,
      target_month: month,
    }).lean() || {};
  }

  // Previous month comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevProgress = await FranchiseeTargetProgress.findOne({
    franchisee_id,
    target_year: prevYear,
    target_month: prevMonth,
  }).lean();

  // Days remaining in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' });

  const currentMonthGoal = (clusterGoal?.monthly_kit_goals || []).find((m) => m.month === month);
  const monthlyGoalTarget = currentMonthGoal?.target_kits_quantity || progress.target_quantity || 100;
  const targetRevenue = currentMonthGoal?.target_revenue || 5000000;
  const eligibleKits = progress.eligible_quantity || 0;
  const actualRevenue = progress.actual_revenue || 0;
  const achievementPct = monthlyGoalTarget > 0 ? Math.round((eligibleKits / monthlyGoalTarget) * 100) : 0;
  const balanceKits = Math.max(0, monthlyGoalTarget - eligibleKits);

  const widgetData = {
    period:          `${monthName} ${year}`,
    financial_year:  fy,
    target_month:    month,
    target_year:     year,
    monthly_goal:    monthlyGoalTarget,
    target_revenue:  targetRevenue,
    eligible_kits:   eligibleKits,
    actual_revenue:  actualRevenue,
    balance_kits:    balanceKits,
    achievement_pct: achievementPct,
    po_split_kits:   currentMonthGoal?.target_po_kits || 80,
    loose_split_kits:currentMonthGoal?.target_loose_orders || 20,
    performance_status: classifyPerformance(achievementPct, monthlyGoalTarget),
    days_remaining:  Math.max(0, daysRemaining),
    has_target:      true,
    cluster:         clusterInfo,
    annual_epc_goal: annualEpcGoal,
    live_epc_goal:   liveEpcGoal,
    previous_month: prevProgress ? {
      month:           prevMonth,
      year:            prevYear,
      eligible_kits:   prevProgress.eligible_quantity,
      achievement_pct: prevProgress.achievement_pct,
      performance_status: prevProgress.performance_status,
    } : null,
  };

  if (fIdStr) {
    goalWidgetCache.set(fIdStr, { data: widgetData, timestamp: Date.now() });
  }

  return widgetData;
}

/**
 * Get aggregated performance analytics for all franchisees (admin view).
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {string} [filters.state_id]
 * @param {string} [filters.district_id]
 * @param {string} [filters.plan_id]
 * @param {string} [filters.performance_status]
 * @returns {Promise<Array>}
 */
async function getPerformanceAnalytics({ month, year, state_id, district_id, plan_id, performance_status } = {}) {
  const currentMonth = Number(month) || (new Date().getMonth() + 1);
  const currentYear  = Number(year)  || new Date().getFullYear();

  const matchStage = { target_year: currentYear, target_month: currentMonth };
  if (performance_status) matchStage.performance_status = performance_status;

  const rows = await FranchiseeTargetProgress.find(matchStage)
    .populate({
      path: 'franchisee_id',
      select: 'business_name mobile email address plan_subscription_id reseller_lifecycle_status',
      populate: {
        path: 'plan_subscription_id',
        select: 'plan_id status',
        populate: { path: 'plan_id', select: 'name territory_level' },
      },
    })
    .lean();

  // Filter by state/district/plan on populated data
  return rows.filter((r) => {
    const f = r.franchisee_id;
    if (!f) return false;
    if (state_id && String(f.address?.state_id) !== String(state_id)) return false;
    if (district_id && String(f.address?.district_id) !== String(district_id)) return false;
    if (plan_id && f.plan_subscription_id?.plan_id && String(f.plan_subscription_id.plan_id._id) !== String(plan_id)) return false;
    return true;
  });
}

module.exports = {
  resolveEffectiveTarget,
  recalculateProgress,
  classifyPerformance,
  getGoalWidget,
  invalidateGoalCache,
  getPerformanceAnalytics,
};
