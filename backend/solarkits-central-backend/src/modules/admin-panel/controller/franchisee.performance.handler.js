/**
 * franchisee.performance.handler.js
 *
 * Unified performance analytics handler:
 * 1. Admin analytics endpoints for legacy Franchisee Performance Tracker (Permission code: FPO_ANALYTICS, Prefix: /admin-api/franchisee/performance)
 * 2. Section 5 Franchisee Cluster Performance Dashboard (Prefix: /admin-api/franchise-clusters/performance/dashboard)
 */

const mongoose = require('mongoose');
const {
  FranchiseeCluster,
  Reseller,
  BDEProfile,
  FranchiseeAgreement,
  FranchiseeClusterGoal,
  SolarKitsServiceTicket,
  EpcAccount,
  FpoOrder,
  FranchiseeTargetProgress,
  FranchiseeAlert,
} = require('../models/india_solarshop_db');
const { GeoLevel1, GeoLevel2, Level1, Level2 } = require('../models/geolocation_db');
const { getPerformanceAnalytics } = require('../services/franchisee.goal.service');
const { evaluateAlerts, evaluatePoAlerts } = require('../services/franchisee.alert.service');

// ── 1. PERFORMANCE TRACKER (Legacy Admin Analytics) ──────────────────────────
const get_performance_tracker = async (req, res) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear(), state_id, district_id, plan_id, performance_status } = req.query;

    const rows = await getPerformanceAnalytics({
      month: Number(month), year: Number(year), state_id, district_id, plan_id, performance_status,
    });

    // Summary cards
    const total       = rows.length;
    const achieved    = rows.filter((r) => ['ACHIEVED', 'EXCEEDED'].includes(r.performance_status)).length;
    const on_track    = rows.filter((r) => r.performance_status === 'ON_TRACK').length;
    const behind      = rows.filter((r) => ['BEHIND', 'LOW_PERFORMANCE'].includes(r.performance_status)).length;
    const no_orders   = rows.filter((r) => r.performance_status === 'NOT_STARTED').length;
    const no_target   = rows.filter((r) => r.performance_status === 'NO_TARGET').length;
    const total_target = rows.reduce((s, r) => s + (r.target_quantity || 0), 0);
    const total_eligible = rows.reduce((s, r) => s + (r.eligible_quantity || 0), 0);
    const avg_achievement = total > 0
      ? Math.round((rows.reduce((s, r) => s + (r.achievement_pct || 0), 0) / total) * 100) / 100
      : 0;

    return res.json({
      status: 'success',
      data: {
        summary: { total, achieved, on_track, behind, no_orders, no_target, total_target, total_eligible, avg_achievement },
        franchisees: rows,
        period: { month: Number(month), year: Number(year) },
      },
    });
  } catch (error) {
    console.error('[performance] get_performance_tracker error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 2. LOCATION ANALYTICS (Legacy) ───────────────────────────────────────────
const get_location_analytics = async (req, res) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear() } = req.query;

    const rows = await FranchiseeTargetProgress.find({
      target_month: Number(month),
      target_year:  Number(year),
    })
      .populate({
        path: 'franchisee_id',
        select: 'business_name address activation_status reseller_lifecycle_status',
      })
      .lean();

    // Group by state
    const stateMap = {};
    for (const r of rows) {
      const f = r.franchisee_id;
      if (!f?.address?.state_id) continue;
      const sid = String(f.address.state_id);
      if (!stateMap[sid]) stateMap[sid] = { state_id: sid, count: 0, total_target: 0, total_eligible: 0, franchisees: [] };
      stateMap[sid].count++;
      stateMap[sid].total_target   += r.target_quantity || 0;
      stateMap[sid].total_eligible += r.eligible_quantity || 0;
      stateMap[sid].franchisees.push({
        id:              f._id,
        name:            f.business_name,
        eligible_kits:   r.eligible_quantity,
        achievement_pct: r.achievement_pct,
        performance_status: r.performance_status,
      });
    }

    const states = Object.values(stateMap).map((s) => ({
      ...s,
      avg_achievement: s.count > 0
        ? Math.round((s.franchisees.reduce((sum, f) => sum + (f.achievement_pct || 0), 0) / s.count) * 100) / 100
        : 0,
      low_performing: s.franchisees.filter((f) => ['BEHIND', 'LOW_PERFORMANCE', 'NOT_STARTED'].includes(f.performance_status)).length,
      top_performers: s.franchisees.sort((a, b) => b.eligible_kits - a.eligible_kits).slice(0, 3),
    }));

    return res.json({
      status: 'success',
      data:   { states, period: { month: Number(month), year: Number(year) } },
    });
  } catch (error) {
    console.error('[performance] get_location_analytics error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 3. SINGLE FRANCHISEE PERFORMANCE (Legacy) ────────────────────────────────
const get_franchisee_performance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ status: 'error', message: 'Invalid franchisee ID' });

    const now = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    // Last 6 months of progress
    const periods = [];
    for (let i = 0; i < 6; i++) {
      const m = ((month - 1 - i + 12) % 12) + 1;
      const y = month - 1 - i < 0 ? year - 1 : year;
      periods.push({ target_month: m, target_year: y });
    }

    const [history, alerts, recentPos] = await Promise.all([
      FranchiseeTargetProgress.find({ franchisee_id: id, $or: periods }).sort({ target_year: -1, target_month: -1 }).lean(),
      FranchiseeAlert.find({ franchisee_id: id, status: 'PENDING' }).sort({ created_at: -1 }).limit(10).lean(),
      FpoOrder.find({ franchisee_id: id, deleted_at: null }).sort({ created_at: -1 }).limit(5).select('po_number status grand_total_paise created_at total_commission_paise').lean(),
    ]);

    const current = history.find((h) => h.target_month === month && h.target_year === year);
    const prev    = history.find((h) => h.target_month === (month === 1 ? 12 : month - 1));

    const mom_change = (current?.eligible_quantity && prev?.eligible_quantity && prev.eligible_quantity > 0)
      ? Math.round(((current.eligible_quantity - prev.eligible_quantity) / prev.eligible_quantity) * 10000) / 100
      : null;

    return res.json({
      status: 'success',
      data: {
        franchisee_id:   id,
        current_month:   current || null,
        previous_month:  prev    || null,
        mom_change_pct:  mom_change,
        history,
        pending_alerts:  alerts,
        recent_pos:      recentPos,
      },
    });
  } catch (error) {
    console.error('[performance] get_franchisee_performance error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 4. ALERTS (Legacy) ────────────────────────────────────────────────────────
const get_alerts = async (req, res) => {
  try {
    const { status, alert_type, franchisee_id, month, year, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (alert_type) query.alert_type = alert_type;
    if (franchisee_id) query.franchisee_id = franchisee_id;
    if (month) query.period_month = Number(month);
    if (year)  query.period_year  = Number(year);

    const skip = (Number(page) - 1) * Number(limit);
    const [alerts, total] = await Promise.all([
      FranchiseeAlert.find(query)
        .populate('franchisee_id', 'business_name mobile')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FranchiseeAlert.countDocuments(query),
    ]);

    return res.json({
      status: 'success',
      data: alerts,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('[performance] get_alerts error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 5. RESOLVE ALERT (Legacy) ─────────────────────────────────────────────────
const resolve_alert = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

    const alert = await FranchiseeAlert.findByIdAndUpdate(id, {
      $set: { status: 'RESOLVED', resolved_at: new Date(), resolved_by: req.user?.id },
    }, { new: true });

    if (!alert) return res.status(404).json({ status: 'error', message: 'Alert not found' });
    return res.json({ status: 'success', data: alert });
  } catch (error) {
    console.error('[performance] resolve_alert error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 6. RUN ALERT EVALUATION (Legacy) ──────────────────────────────────────────
const run_alert_evaluation = async (req, res) => {
  try {
    const { franchisee_id, month, year } = req.body;
    if (!franchisee_id || !month || !year) {
      return res.status(400).json({ status: 'error', message: 'franchisee_id, month, year required' });
    }

    const results = await evaluateAlerts({ franchisee_id, month: Number(month), year: Number(year) });
    const poAlerts = await evaluatePoAlerts();

    return res.json({
      status: 'success',
      data: { performance_alerts: results, po_alerts: poAlerts, total_created: results.length + poAlerts.length },
    });
  } catch (error) {
    console.error('[performance] run_alert_evaluation error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 7. EXPORT CSV (Legacy) ────────────────────────────────────────────────────
const export_performance_csv = async (req, res) => {
  try {
    const now = new Date();
    const { month = now.getMonth() + 1, year = now.getFullYear(), state_id, plan_id } = req.query;

    const rows = await getPerformanceAnalytics({ month: Number(month), year: Number(year), state_id, plan_id });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="franchisee_performance_${year}_${month}.csv"`);

    const headers = ['Business Name', 'Mobile', 'Plan', 'State', 'Target', 'Eligible Kits', 'Balance', 'Achievement %', 'Status'];
    const lines = [headers.join(',')];

    for (const r of rows) {
      const f = r.franchisee_id || {};
      lines.push([
        `"${f.business_name || ''}"`,
        f.mobile || '',
        `"${f.plan_subscription_id?.plan_id?.name || ''}"`,
        f.address?.state_id || '',
        r.target_quantity || 0,
        r.eligible_quantity || 0,
        r.balance_quantity || 0,
        r.achievement_pct || 0,
        r.performance_status || '',
      ].join(','));
    }

    return res.send(lines.join('\n'));
  } catch (error) {
    console.error('[performance] export_performance_csv error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

// ── 8. SECTION 5: FRANCHISEE CLUSTER PERFORMANCE DASHBOARD ───────────────────
const get_performance_dashboard = async (req, res) => {
  try {
    const {
      financial_year,
      month,
      state_id,
      district_id,
      cluster_id,
      franchisee_id,
      bde_id,
    } = req.query;

    const currentYear = new Date().getFullYear();
    const currentMonth = Number(month) || (new Date().getMonth() + 1);
    const defaultFY = currentMonth >= 4 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;
    const fy = financial_year || defaultFY;

    // Filter clusters
    const clusterQuery = { deleted_at: null, is_active: true };
    if (state_id) clusterQuery.state_id = state_id;
    if (district_id) clusterQuery.district_ids = district_id;
    if (cluster_id) clusterQuery._id = cluster_id;
    if (franchisee_id) clusterQuery.assigned_franchisee_id = franchisee_id;
    if (bde_id) clusterQuery.$or = [{ primary_bde_id: bde_id }, { support_bde_ids: bde_id }];

    const clusters = await FranchiseeCluster.find(clusterQuery)
      .populate('state_id', 'name')
      .populate('assigned_franchisee_id', 'business_name mobile email store_category gst_number reseller_lifecycle_status')
      .populate('primary_bde_id', 'full_name mobile_number email bde_id')
      .lean();

    // Overall KPI Counters
    let totalFranchiseesCount = 0;
    let activeFranchiseesCount = 0;
    let aggregateEpcGoal = 0;
    let aggregateEpcActual = 0;
    let aggregateLiveEpcGoal = 0;
    let aggregateLiveEpcActual = 0;
    let aggregateMonthlyKitGoal = 0;
    let aggregateMonthlyKitActual = 0;
    let aggregateAnnualRevenue = 0;

    const validStatuses = ['CONFIRMED', 'PAID', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'COMPLETED'];
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const performanceRows = [];

    for (const clu of clusters) {
      const franchisee = clu.assigned_franchisee_id;
      if (franchisee) {
        totalFranchiseesCount++;
        if (franchisee.reseller_lifecycle_status === 'active' || clu.status === 'allotted') {
          activeFranchiseesCount++;
        }
      }

      // Fetch goals for this cluster and FY
      const goal = await FranchiseeClusterGoal.findOne({
        cluster_id: clu._id,
        financial_year: fy,
        deleted_at: null,
      }).lean();

      const epcGoal = goal?.annual_epc_goal || 0;
      const liveEpcGoal = goal?.annual_live_epc_goal || 0;

      const currentMonthGoal = (goal?.monthly_kit_goals || []).find(m => m.month === currentMonth);
      const monthlyKitGoal = currentMonthGoal?.target_kits_quantity || 0;
      const monthlyRevenueGoal = currentMonthGoal?.target_revenue || 0;

      aggregateEpcGoal += epcGoal;
      aggregateLiveEpcGoal += liveEpcGoal;
      aggregateMonthlyKitGoal += monthlyKitGoal;

      let epcActual = 0;
      let liveEpcActual = 0;
      let actualKitsThisMonth = 0;
      let actualRevenueThisMonth = 0;
      let annualKitsActual = 0;
      let annualRevenueActual = 0;

      if (franchisee) {
        // EPC counts
        const approvedEpcs = await EpcAccount.find({
          $or: [
            { onboarded_by_reseller_id: franchisee._id },
            { primary_reseller_id: franchisee._id },
            { districts: { $in: clu.district_ids } },
          ],
          status: 'approved',
          deleted_at: null,
        }).lean();

        epcActual = approvedEpcs.length;
        liveEpcActual = approvedEpcs.filter(
          e => e.last_activity_at && new Date(e.last_activity_at) >= ninetyDaysAgo
        ).length;

        aggregateEpcActual += epcActual;
        aggregateLiveEpcActual += liveEpcActual;

        // Monthly orders
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

        const monthlyOrders = await FpoOrder.find({
          reseller_id: franchisee._id,
          status: { $in: validStatuses },
          created_at: { $gte: startOfMonth, $lte: endOfMonth },
        }).lean();

        for (const ord of monthlyOrders) {
          actualKitsThisMonth += Number(ord.total_kits_count || ord.total_quantity || 1);
          actualRevenueThisMonth += Number((ord.total_amount_paise || 0) / 100);
        }

        aggregateMonthlyKitActual += actualKitsThisMonth;

        // Annual orders
        const allOrders = await FpoOrder.find({
          reseller_id: franchisee._id,
          status: { $in: validStatuses },
        }).lean();

        for (const ord of allOrders) {
          annualKitsActual += Number(ord.total_kits_count || ord.total_quantity || 1);
          annualRevenueActual += Number((ord.total_amount_paise || 0) / 100);
        }

        aggregateAnnualRevenue += annualRevenueActual;
      }

      const achievementPct = monthlyKitGoal > 0 ? Math.round((actualKitsThisMonth / monthlyKitGoal) * 100) : 0;
      const epcAchievementPct = epcGoal > 0 ? Math.round((epcActual / epcGoal) * 100) : 0;
      const liveAchievementPct = liveEpcGoal > 0 ? Math.round((liveEpcActual / liveEpcGoal) * 100) : 0;

      performanceRows.push({
        cluster_id: clu._id,
        cluster_name: clu.cluster_name,
        cluster_code: clu.cluster_code,
        state_name: clu.state_name,
        franchisee_id: franchisee?._id || null,
        franchisee_name: franchisee?.business_name || 'Unassigned',
        bde_name: clu.primary_bde_id?.full_name || 'Unassigned',
        epc_goal: epcGoal,
        epc_actual: epcActual,
        epc_achievement_pct: epcAchievementPct,
        live_epc_goal: liveEpcGoal,
        live_epc_actual: liveEpcActual,
        live_epc_achievement_pct: liveAchievementPct,
        monthly_kit_goal: monthlyKitGoal,
        actual_kits: actualKitsThisMonth,
        monthly_kit_achievement_pct: achievementPct,
        monthly_revenue_goal: monthlyRevenueGoal,
        actual_revenue_this_month: actualRevenueThisMonth,
        annual_kits_actual: annualKitsActual,
        annual_revenue_actual: annualRevenueActual,
      });
    }

    // Sort to extract Top & Low performers
    const sortedByAchievement = [...performanceRows].sort(
      (a, b) => b.monthly_kit_achievement_pct - a.monthly_kit_achievement_pct
    );
    const topPerformers = sortedByAchievement.slice(0, 5);
    const lowPerformers = [...sortedByAchievement].reverse().slice(0, 5);

    // Count pending agreement renewals
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const pendingRenewalsCount = await FranchiseeAgreement.countDocuments({
      status: { $in: ['expiring_soon', 'expired', 'renewal_pending'] },
      end_date: { $lte: thirtyDaysFromNow },
      deleted_at: null,
    });

    // Count open tickets
    const openTicketsCount = await SolarKitsServiceTicket.countDocuments({
      ticket_status: { $in: ['open', 'assigned', 'in_progress', 'waiting', 'raised', 'under_review'] },
      deleted_at: null,
    });

    return res.status(200).json({
      status: 'success',
      financial_year: fy,
      month: currentMonth,
      kpis: {
        total_franchisees: totalFranchiseesCount,
        active_franchisees: activeFranchiseesCount,
        epc_goal: aggregateEpcGoal,
        epc_actual: aggregateEpcActual,
        epc_achievement_pct: aggregateEpcGoal > 0 ? Math.round((aggregateEpcActual / aggregateEpcGoal) * 100) : 0,
        live_epc_goal: aggregateLiveEpcGoal,
        live_epc_actual: aggregateLiveEpcActual,
        live_epc_achievement_pct: aggregateLiveEpcGoal > 0 ? Math.round((aggregateLiveEpcActual / aggregateLiveEpcGoal) * 100) : 0,
        monthly_kit_goal: aggregateMonthlyKitGoal,
        monthly_kit_actual: aggregateMonthlyKitActual,
        kit_achievement_pct: aggregateMonthlyKitGoal > 0 ? Math.round((aggregateMonthlyKitActual / aggregateMonthlyKitGoal) * 100) : 0,
        total_revenue: aggregateAnnualRevenue,
        pending_renewals: pendingRenewalsCount,
        open_tickets: openTicketsCount,
      },
      table: performanceRows,
      top_performers: topPerformers,
      low_performers: lowPerformers,
    });
  } catch (err) {
    console.error('Error in get_performance_dashboard:', err);
    return res.status(500).json({ status: 'error', message: err.message || 'Internal server error.' });
  }
};

module.exports = {
  get_performance_tracker,
  get_location_analytics,
  get_franchisee_performance,
  get_alerts,
  resolve_alert,
  run_alert_evaluation,
  export_performance_csv,
  get_performance_dashboard,
};
