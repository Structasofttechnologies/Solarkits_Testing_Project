import { useState, useEffect } from "react";
import { useOutletContext, Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import IndustryMediaShowcase from "../components/industry/IndustryMediaShowcase";
import {
  FiZap,
  FiShield,
  FiUsers,
  FiArrowUpRight,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiPackage,
  FiShoppingBag,
  FiLayers,
  FiMapPin,
  FiTarget,
  FiTrendingUp,
  FiArrowRight,
  FiBox,
  FiDollarSign,
} from "react-icons/fi";

export default function DashboardHome() {
  const { reseller, refreshUser } = useOutletContext();
  const [searchParams] = useSearchParams();
  const isOnboardingQuery = searchParams.get("onboarding") === "true";

  const [buyers, setBuyers] = useState([]);
  const [territory, setTerritory] = useState(null);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [clusterInfo, setClusterInfo] = useState(null);

  // Fetch buyers, territories, cluster info, subscription & target goals
  const fetchDashboardData = () => {
    api.get('/india/v1/reseller/epc-buyers/list')
      .then((res) => {
        if (res.data?.status === "success") setBuyers(res.data.data || []);
      })
      .catch(() => { });

    api.get('/india/v1/franchise-clusters/my-cluster-info')
      .then((res) => {
        if (res.data?.status === "success") setClusterInfo(res.data.data);
      })
      .catch(() => { });

    api.get('/india/v1/reseller/territories')
      .then((res) => {
        if (res.data?.status === "success" && res.data.data?.length > 0) {
          setTerritory(res.data.data[0]);
        }
      })
      .catch(() => { });

    api.get('/india/v1/reseller/auth/me')
      .then((res) => {
        if (res.data?.status === "success") {
          setActiveSubscription(res.data.active_subscription || null);
        }
      })
      .catch(() => { });

    api.get('/india/v1/reseller/goals/my-goal')
      .then((res) => {
        if (res.data?.status === "success" && res.data.data) {
          setGoalData(res.data.data);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Goal Tracking metrics resolution (Cluster Goal Setting + Target Progress)
  // 3. EPC Onboarding Goal (Day 90 Target: 50 Approved EPCs)
  const epcTarget = goalData?.epc_onboarding?.target
    || goalData?.annual_epc_goal?.total_epc_target
    || (typeof clusterInfo?.goal?.annual_epc_goal === 'number' ? clusterInfo.goal.annual_epc_goal : clusterInfo?.goal?.annual_epc_goal?.total_epc_target)
    || 50;
  const epcOnboardDays = goalData?.epc_onboarding?.timeframe_days
    || goalData?.annual_epc_goal?.epc_onboard_days
    || clusterInfo?.goal?.epc_onboard_days
    || 90;
  const epcActual = goalData?.epc_onboarding?.actual
    ?? goalData?.annual_epc_goal?.actual_epcs_onboarded
    ?? 0;
  const epcAchPct = goalData?.epc_onboarding?.achievement_pct
    ?? goalData?.annual_epc_goal?.achievement_pct
    ?? (epcTarget > 0 ? Math.round((epcActual / epcTarget) * 100) : 0);
  const epcPending = Math.max(0, epcTarget - epcActual);

  // 4. EPC Active Goal - Yearly
  const liveTarget = goalData?.epc_active?.target
    || goalData?.live_epc_goal?.live_epc_target
    || (typeof clusterInfo?.goal?.annual_live_epc_goal === 'number' ? clusterInfo.goal.annual_live_epc_goal : clusterInfo?.goal?.live_epc_goal?.live_epc_target)
    || 60;
  const liveActual = goalData?.epc_active?.actual
    ?? goalData?.live_epc_goal?.actual_live_epcs
    ?? 0;
  const liveAchPct = goalData?.epc_active?.achievement_pct
    ?? goalData?.live_epc_goal?.achievement_pct
    ?? (liveTarget > 0 ? Math.round((liveActual / liveTarget) * 100) : 0);
  const livePending = Math.max(0, liveTarget - liveActual);
  const liveCriteriaDays = goalData?.epc_active?.criteria_days || goalData?.live_epc_goal?.criteria_days || clusterInfo?.goal?.live_epc_criteria_days || 90;

  const fyLabel = goalData?.financial_year || clusterInfo?.goal?.financial_year || "FY 2026-27";
  const clusterCode = goalData?.cluster?.code || clusterInfo?.cluster?.cluster_code || clusterInfo?.cluster?.code || null;
  const clusterName = goalData?.cluster?.name || clusterInfo?.cluster?.cluster_name || clusterInfo?.cluster?.name || territory?.location_name || null;

  // 1. Monthly Sell Kit Target
  const monthlyKitTarget = goalData?.monthly_kits?.target || goalData?.monthly_goal || 100;
  const kitsFulfilled = goalData?.monthly_kits?.actual ?? goalData?.eligible_kits ?? 0;
  const kitsPending = goalData?.monthly_kits?.pending ?? (goalData?.balance_kits != null ? goalData.balance_kits : Math.max(0, monthlyKitTarget - kitsFulfilled));
  const kitAchPct = goalData?.monthly_kits?.achievement_pct ?? goalData?.achievement_pct ?? (monthlyKitTarget > 0 ? Math.round((kitsFulfilled / monthlyKitTarget) * 100) : 0);

  // 2. Yearly Sell Kit Target
  const annualKitsTargetTotal = goalData?.yearly_kits?.target || goalData?.annual_kits_target || (monthlyKitTarget * 12);
  const annualKitsActual = goalData?.yearly_kits?.actual ?? goalData?.annual_kits_actual ?? 0;
  const annualKitsPending = goalData?.yearly_kits?.pending ?? Math.max(0, annualKitsTargetTotal - annualKitsActual);
  const annualKitsAchPct = goalData?.yearly_kits?.achievement_pct ?? goalData?.annual_kits_achievement_pct ?? (annualKitsTargetTotal > 0 ? Math.round((annualKitsActual / annualKitsTargetTotal) * 100) : 0);

  // 5. Yearly PO Orders Goal (e.g. Year me 50 PO orders create karna hai)
  const poOrdersTarget = goalData?.po_orders?.target || goalData?.annual_po_orders_goal || clusterInfo?.goal?.annual_po_orders_goal || 50;
  const poOrdersActual = goalData?.po_orders?.actual ?? goalData?.actual_po_orders_count ?? 0;
  const poOrdersPending = goalData?.po_orders?.pending ?? Math.max(0, poOrdersTarget - poOrdersActual);
  const poOrdersAchPct = goalData?.po_orders?.achievement_pct ?? goalData?.po_orders_achievement_pct ?? (poOrdersTarget > 0 ? Math.round((poOrdersActual / poOrdersTarget) * 100) : 0);

  const daysRemaining = goalData?.days_remaining != null ? goalData.days_remaining : 15;

  return (
    <div className="space-y-8 max-w-7xl mx-auto transition-opacity duration-300">

      {/* ── 0. Onboarding Success Alert (if just onboarded) ─────────────────── */}
      {isOnboardingQuery && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black shrink-0">
              <FiCheckCircle size={28} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                🎉 Franchise Partnership Confirmed & Active!
              </h3>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                Your exclusive territory license is secured. Complete your business KYC below to begin procurement and onboarding regional EPC buyers.
              </p>
            </div>
          </div>
          {territory?.location_name && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-xs font-black shrink-0 border border-white/30">
              <FiMapPin size={14} />
              <span>{territory.location_name}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 1. Commerce-first Welcome Banner ─────────────────────────────────── */}
      <div className="rounded-3xl p-6 sm:p-8 border shadow-xs overflow-hidden relative" style={{ background: "var(--gradient-primary)", borderColor: "var(--color-border)" }}>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-xs font-black text-white/70 uppercase tracking-wider">Franchisee Portal</div>
              {territory?.location_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  📍 {territory.location_name}
                </span>
              )}
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
              Welcome back, {reseller?.contact_person || reseller?.business_name || "Partner"}!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              {reseller?.kyc_status === "verified"
                ? "Your account is verified. Browse turnkey solar kits, download marketing creatives, and manage orders."
                : "Complete your KYC verification to unlock wholesale ordering & customized franchise listings."}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to="/catalog"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-white text-blue-900 hover:bg-blue-50 shadow-sm transition-all whitespace-nowrap active:scale-95"
            >
              <FiPackage size={14} /> Browse Catalog
            </Link>
            <Link
              to="/orders"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-all whitespace-nowrap active:scale-95"
            >
              <FiShoppingBag size={14} /> My Orders
            </Link>
            <Link
              to="/storefront-listings"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-white/15 text-white hover:bg-white/25 border border-white/20 transition-all whitespace-nowrap active:scale-95"
            >
              <FiLayers size={14} /> My Listings
            </Link>
          </div>
        </div>
      </div>

      {/* ── Franchise Cluster & BDE Dedicated Banner ── */}
      {(() => {
        const clusters = clusterInfo?.clusters || (clusterInfo?.cluster ? [clusterInfo.cluster] : []);
        if (clusters.length === 0) return null;

        return (
          <div className="space-y-3">
            {clusters.map((clu, cluIdx) => {
              const distCount = (clu.districts || clu.district_ids || clu.district_names || []).length;
              const distNames = (clu.districts || clu.district_ids || clu.district_names || []).map((d) => (typeof d === 'string' ? d : d.name)).slice(0, 8);
              return (
                <div
                  key={clu._id || clu.cluster_code || cluIdx}
                  className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0 border border-indigo-100 mt-0.5">
                      <FiLayers size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                          Cluster: {clu.cluster_name} ({clu.cluster_code})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {clu.is_shared_territory_allowed ? "Shared Territory" : "Exclusive Territory"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {distCount} Districts Covered
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Districts: <span className="font-bold text-slate-800">{distNames.join(", ")}{distCount > 8 ? ` +${distCount - 8} more` : ""}</span>
                        {clusterInfo.agreement?.agreement_end_date && (
                          <span className="ml-2 text-slate-400">
                            • Agreement Valid: {new Date(clusterInfo.agreement.agreement_end_date).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {clu.primary_bde_id && (
                    <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 text-xs">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                        <FiUsers size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] font-extrabold uppercase text-slate-400">Assigned BDE</div>
                        <div className="font-black text-slate-900">{clu.primary_bde_id.name}</div>
                        {clu.primary_bde_id.phone && (
                          <div className="text-[11px] font-semibold text-blue-600">{clu.primary_bde_id.phone}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── 3. EPC Onboarding & 4. EPC Active Yearly Goals ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: 3. EPC Onboarding Goal (Day 90 Target) */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                <FiUsers size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  3. EPC Onboarding Goal ({epcOnboardDays} Days)
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Target: {epcTarget} EPCs in {epcOnboardDays} Days</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${epcAchPct >= 100
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : epcAchPct >= 50
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              }`}>
              {epcAchPct}% Achieved
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Onboarding Target</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {epcTarget}
              </div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5">Approved EPCs</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Actual Onboarded</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {epcActual}
              </div>
              <div className="text-[9px] text-emerald-600/80 font-bold mt-0.5">Verified EPCs</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Remaining</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {epcPending}
              </div>
              <div className="text-[9px] text-amber-600/80 font-bold mt-0.5">Pending EPCs</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Day {epcOnboardDays} Onboarding Progress</span>
              <span>{epcActual} / {epcTarget} EPCs</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(epcAchPct, epcActual > 0 ? 3 : 0), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: 4. EPC Active - Yearly Goal */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center font-black">
                <FiZap size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  4. EPC Active - Yearly
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{liveCriteriaDays}-Day Active Threshold</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${liveAchPct >= 100
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : liveAchPct >= 50
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
              }`}>
              {liveAchPct}% Live
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Target</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {liveTarget}
              </div>
              <div className="text-[9px] text-slate-400 font-bold mt-0.5">Active Target</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Actual Live</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {liveActual}
              </div>
              <div className="text-[9px] text-emerald-600/80 font-bold mt-0.5">Active Buyers</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Remaining</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {livePending}
              </div>
              <div className="text-[9px] text-amber-600/80 font-bold mt-0.5">To Activate</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500">
              <span>Active EPCs within {liveCriteriaDays} days</span>
              <span>{liveActual} / {liveTarget} EPCs</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(liveAchPct, liveActual > 0 ? 3 : 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Franchise Cluster Kit Sales & PO Orders Performance Widget ── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/25 shrink-0">
              <FiTarget size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Cluster Kit Sales & PO Orders Goal Performance
                </h2>
                {clusterCode && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {clusterCode}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${kitAchPct >= 100
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : kitAchPct >= 70
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                  {kitAchPct >= 100
                    ? "🎯 Kit Goal Achieved"
                    : kitAchPct >= 70
                      ? "⚡ On Track"
                      : "🎯 Active Quota"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {goalData?.period || "Current Calendar Month"} territory targets
                {clusterName ? ` • Cluster: ${clusterName}` : ""}
                {` • Annual Commitment: ${annualKitsTargetTotal.toLocaleString('en-IN')} Kits / Year & ${poOrdersTarget} PO Orders`}
              </p>
            </div>
          </div>

          <Link
            to="/po-orders"
            className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
          >
            <FiPackage size={15} />
            <span>Create PO Order</span>
            <FiArrowRight size={14} />
          </Link>
        </div>

        {/* 6 Metric Tiles: Kit Quotas (Monthly & Yearly) + PO Orders Goal */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {/* Tile 1: Monthly Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiTarget className="text-blue-600" size={12} /> Monthly Target
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
              {monthlyKitTarget} <span className="text-[10px] font-bold text-slate-400">Kits</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">1. Monthly Quota</div>
          </div>

          {/* Tile 2: Monthly Kits Sold */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <FiCheckCircle className="text-emerald-600" size={12} /> Kits Sold
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
              {kitsFulfilled} <span className="text-[10px] font-bold text-emerald-700/60">Kits</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
              {kitAchPct}% Fulfilled
            </div>
          </div>

          {/* Tile 3: Monthly Kits Left */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <FiBox className="text-amber-600" size={12} /> Kits Left
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
              {kitsPending} <span className="text-[10px] font-bold text-amber-700/60">Kits</span>
            </div>
            <div className="text-[10px] font-bold text-amber-600 mt-0.5">To Monthly Goal</div>
          </div>

          {/* Tile 4: Yearly Kit Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
            <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <FiLayers className="text-indigo-600" size={12} /> Yearly Kits
            </div>
            <div className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-1.5 truncate">
              {annualKitsTargetTotal.toLocaleString('en-IN')} <span className="text-[10px] font-bold text-indigo-400">Kits</span>
            </div>
            <div className="text-[10px] font-semibold text-indigo-600/80 mt-0.5">2. Annual Quota</div>
          </div>

          {/* Tile 5: Yearly PO Orders Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
            <div className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <FiShoppingBag className="text-purple-600" size={12} /> Yearly PO Goal
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1.5 truncate">
              {poOrdersTarget} <span className="text-[10px] font-bold text-purple-400">POs</span>
            </div>
            <div className="text-[10px] font-bold text-purple-600 mt-0.5">
              5. Yearly Target
            </div>
          </div>

          {/* Tile 6: Actual PO Orders Created */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40">
            <div className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
              <FiCheckCircle className="text-teal-600" size={12} /> POs Created
            </div>
            <div className="text-xl font-black text-teal-700 dark:text-teal-300 mt-1.5">
              {poOrdersActual} <span className="text-[10px] font-bold text-teal-700/60">Orders</span>
            </div>
            <div className="text-[10px] font-bold text-teal-600 mt-0.5">{poOrdersAchPct}% of Goal</div>
          </div>
        </div>

        {/* Dual Progress Bars: Monthly Kit Volume & Yearly PO Orders Goal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Monthly Kit Volume Progress */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FiPackage className="text-blue-600" size={13} />
                1. Monthly Kit Sales Progress: {kitAchPct}% Complete
              </span>
              <span>{kitsFulfilled} / {monthlyKitTarget} Kits</span>
            </div>
            <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${kitAchPct >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : kitAchPct >= 50
                      ? "bg-gradient-to-r from-blue-600 to-cyan-400"
                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                  }`}
                style={{ width: `${Math.min(Math.max(kitAchPct, kitsFulfilled > 0 ? 4 : 0), 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
              <span>🚀 Net confirmed kit orders this cycle</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {kitsPending > 0 ? `${kitsPending} kits to reach 100%` : "Monthly Target Achieved!"}
              </span>
            </div>
          </div>

          {/* Yearly PO Orders Goal Progress */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FiShoppingBag className="text-purple-600" size={13} />
                5. Yearly PO Orders Goal: {poOrdersAchPct}% Complete
              </span>
              <span>{poOrdersActual} / {poOrdersTarget} PO Orders</span>
            </div>
            <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${poOrdersAchPct >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : poOrdersAchPct >= 50
                      ? "bg-gradient-to-r from-purple-600 to-indigo-500"
                      : "bg-gradient-to-r from-amber-500 to-orange-400"
                  }`}
                style={{ width: `${Math.min(Math.max(poOrdersAchPct, poOrdersActual > 0 ? 4 : 0), 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
              <span>📦 Year me {poOrdersTarget} PO orders create karna hai</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {poOrdersPending > 0 ? `${poOrdersPending} PO orders remaining` : "Annual PO Goal Achieved!"}
              </span>
            </div>
          </div>
        </div>

        {/* Annual Cluster Commitment Rollup Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-blue-300 shrink-0">
              <FiTarget size={18} />
            </div>
            <div>
              <div className="text-xs font-black tracking-wide text-white flex items-center gap-2">
                <span>Annual Cluster Performance Commitments ({fyLabel})</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  All 5 Core Goals Configured
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Cluster benchmarks configured during territory setup, synchronized across all franchisee dashboards.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-right">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Yearly Kits</div>
              <div className="text-sm font-black text-white">{annualKitsTargetTotal.toLocaleString('en-IN')} Kits</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Yearly PO Orders</div>
              <div className="text-sm font-black text-purple-300">{poOrdersTarget} Orders</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">EPC Onboarding</div>
              <div className="text-sm font-black text-blue-300">{epcTarget} in {epcOnboardDays}d</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Active EPCs</div>
              <div className="text-sm font-black text-emerald-400">{liveTarget} Active</div>
            </div>
          </div>
        </div>
      </div>



      {/* ── 1. Industry Media Showcase (Selector -> Hero -> FilterBar -> Gallery -> Lightbox) ── */}
      <IndustryMediaShowcase
        role="RESELLER"
        user={reseller}
        storageKey="reseller_selected_industry_id"
      />

      {/* ── 2. KYC Status Notice ───────────────────────────────────────────── */}
      {reseller?.kyc_status === "verified" ? (
        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
              <FiCheckCircle size={26} />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900 flex items-center gap-2">
                🎉 Account KYC Verified & Completed!
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">Verified Partner</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                Your business identity documents have been approved by Admin. Wholesale ordering & sub-account onboarding are 100% unlocked!
              </div>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-200/80 text-emerald-900 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 border border-emerald-300">
            <FiCheckCircle size={16} className="text-emerald-700" /> Account Verified & Active
          </div>
        </div>
      ) : reseller?.kyc_status === "submitted" ? (
        <div className="p-6 rounded-2xl bg-blue-50 border-2 border-blue-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30">
              <FiClock size={26} />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900">KYC Submitted — Pending Admin Review</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Your documents have been submitted successfully. Admin team is reviewing your application.</div>
            </div>
          </div>
          <Link to="/kyc" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer">
            Track Application Status →
          </Link>
        </div>
      ) : reseller?.kyc_status === "resubmission_required" || reseller?.kyc_status === "rejected" ? (
        <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/30">
              <FiAlertCircle size={26} />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900">Action Required: KYC Corrections Needed</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Admin requested corrections on your submitted documents. Please re-upload updated files.</div>
            </div>
          </div>
          <Link to="/kyc" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer">
            Re-upload Documents →
          </Link>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <FiAlertCircle size={26} />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900">KYC Verification Required</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Please upload your mandatory GST and PAN verification documents to unlock sub-account onboarding.</div>
            </div>
          </div>
          <Link to="/kyc" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer">
            Complete KYC Now →
          </Link>
        </div>
      )}





    </div>

  );
}
