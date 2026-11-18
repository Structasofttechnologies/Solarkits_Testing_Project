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
  const epcTarget = goalData?.annual_epc_goal?.total_epc_target
    || (typeof clusterInfo?.goal?.annual_epc_goal === 'number' ? clusterInfo.goal.annual_epc_goal : clusterInfo?.goal?.annual_epc_goal?.total_epc_target)
    || 100;
  const epcActual = goalData?.annual_epc_goal?.actual_epcs_onboarded || 0;
  const epcAchPct = goalData?.annual_epc_goal?.achievement_pct != null
    ? goalData.annual_epc_goal.achievement_pct
    : (epcTarget > 0 ? Math.round((epcActual / epcTarget) * 100) : 0);
  const epcPending = Math.max(0, epcTarget - epcActual);

  const liveTarget = goalData?.live_epc_goal?.live_epc_target
    || (typeof clusterInfo?.goal?.annual_live_epc_goal === 'number' ? clusterInfo.goal.annual_live_epc_goal : clusterInfo?.goal?.live_epc_goal?.live_epc_target)
    || 60;
  const liveActual = goalData?.live_epc_goal?.actual_live_epcs || 0;
  const liveAchPct = goalData?.live_epc_goal?.achievement_pct != null
    ? goalData.live_epc_goal.achievement_pct
    : (liveTarget > 0 ? Math.round((liveActual / liveTarget) * 100) : 0);
  const livePending = Math.max(0, liveTarget - liveActual);
  const liveCriteriaDays = goalData?.live_epc_goal?.criteria_days || clusterInfo?.goal?.live_epc_criteria_days || 90;

  const fyLabel = goalData?.financial_year || clusterInfo?.goal?.financial_year || "FY 2026-27";
  const clusterCode = goalData?.cluster?.code || clusterInfo?.cluster?.cluster_code || clusterInfo?.cluster?.code || null;
  const clusterName = goalData?.cluster?.name || clusterInfo?.cluster?.cluster_name || clusterInfo?.cluster?.name || territory?.location_name || null;

  const monthlyKitTarget = goalData?.monthly_goal || 100;
  const kitsFulfilled = goalData?.eligible_kits || 0;
  const kitsPending = goalData?.balance_kits != null ? goalData.balance_kits : Math.max(0, monthlyKitTarget - kitsFulfilled);
  const kitAchPct = goalData?.achievement_pct || (monthlyKitTarget > 0 ? Math.round((kitsFulfilled / monthlyKitTarget) * 100) : 0);

  const monthlyRevTarget = goalData?.target_revenue || 5000000;
  const actualRevRealized = goalData?.actual_revenue || 0;
  const revPending = goalData?.balance_revenue != null ? goalData.balance_revenue : Math.max(0, monthlyRevTarget - actualRevRealized);
  const revAchPct = goalData?.revenue_achievement_pct != null
    ? goalData.revenue_achievement_pct
    : (monthlyRevTarget > 0 ? Math.round((actualRevRealized / monthlyRevTarget) * 100) : 0);

  const annualKitsTargetTotal = goalData?.annual_kits_target || (monthlyKitTarget * 12);
  const annualRevTargetTotal = goalData?.annual_revenue_target || (monthlyRevTarget * 12);
  const poSplitKits = goalData?.po_split_kits || Math.round(monthlyKitTarget * 0.8);
  const looseSplitKits = goalData?.loose_split_kits || Math.round(monthlyKitTarget * 0.2);
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

      {/* ── Annual EPC Onboarding & Live EPC Goals ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Annual EPC Onboarding Goal */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                <FiUsers size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Annual EPC Onboarding Goal
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">{fyLabel} Target</span>
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Goal</div>
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
              <span>Progress towards annual target</span>
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

        {/* Card 2: Annual Live EPC Goal */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center font-black">
                <FiZap size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Annual Live EPC Goal
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

      {/* ── Franchise Monthly Kit Sales & Revenue Target Widget ── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/25 shrink-0">
              <FiTarget size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Monthly Kit Sales & Revenue Target
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
                  {goalData?.performance_status === "ACHIEVED" || goalData?.performance_status === "EXCEEDED"
                    ? "🎯 Goal Achieved"
                    : goalData?.performance_status === "ON_TRACK"
                      ? "⚡ On Track"
                      : goalData?.performance_status === "BEHIND"
                        ? "⏳ In Progress"
                        : "🎯 Active Target"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {goalData?.period || "Current Calendar Month"} territory commitment
                {clusterName ? ` • Cluster: ${clusterName}` : ""}
                {poSplitKits ? ` • Split: PO ${poSplitKits} Kits / Loose ${looseSplitKits} Kits` : ""}
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

        {/* 6 Metric Tiles (Kit Quota + Revenue Target) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {/* Tile 1: Monthly Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FiTarget className="text-blue-600" size={12} /> Monthly Target
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
              {monthlyKitTarget} <span className="text-[10px] font-bold text-slate-400">Kits</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Cluster Kit Quota</div>
          </div>

          {/* Tile 2: Kits Achieved */}
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

          {/* Tile 3: Remaining Kits */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <FiBox className="text-amber-600" size={12} /> Kits Left
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
              {kitsPending} <span className="text-[10px] font-bold text-amber-700/60">Kits</span>
            </div>
            <div className="text-[10px] font-bold text-amber-600 mt-0.5">Kits Left to Goal</div>
          </div>

          {/* Tile 4: Monthly Revenue Target */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40">
            <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <FiDollarSign className="text-indigo-600" size={12} /> Revenue Target
            </div>
            <div className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-1.5 truncate">
              ₹{(monthlyRevTarget).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] font-semibold text-indigo-600/80 mt-0.5">Monthly Billing Target</div>
          </div>

          {/* Tile 5: Revenue Realized */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40">
            <div className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1">
              <FiTrendingUp className="text-teal-600" size={12} /> Realized Rev
            </div>
            <div className="text-xl font-black text-teal-700 dark:text-teal-300 mt-1.5 truncate">
              ₹{(actualRevRealized).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] font-bold text-teal-600 mt-0.5">
              {revAchPct}% Realized
            </div>
          </div>

          {/* Tile 6: Timeline */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
            <div className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <FiClock className="text-purple-600" size={12} /> Cycle Timeline
            </div>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
              {daysRemaining} <span className="text-[10px] font-bold text-purple-700/60">Days</span>
            </div>
            <div className="text-[10px] font-bold text-purple-600 mt-0.5">Remaining in Month</div>
          </div>
        </div>

        {/* Dual Progress Bars: Kit Volume & Revenue Realization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Kit Volume Progress */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FiPackage className="text-blue-600" size={13} />
                Kit Volume Progress: {kitAchPct}% Complete
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
              <span>🚀 PO & loose deliveries fulfill this quota</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {kitsPending} kits to reach 100%
              </span>
            </div>
          </div>

          {/* Revenue Realization Progress */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs font-black text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <FiDollarSign className="text-emerald-600" size={13} />
                Revenue Target Progress: {revAchPct}% Complete
              </span>
              <span>₹{(actualRevRealized).toLocaleString('en-IN')} / ₹{(monthlyRevTarget).toLocaleString('en-IN')}</span>
            </div>
            <div className="h-3 w-full bg-slate-200/70 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${revAchPct >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : revAchPct >= 50
                      ? "bg-gradient-to-r from-emerald-600 to-cyan-500"
                      : "bg-gradient-to-r from-teal-500 to-emerald-400"
                  }`}
                style={{ width: `${Math.min(Math.max(revAchPct, actualRevRealized > 0 ? 4 : 0), 100)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
              <span>💰 Net confirmed order billing this cycle</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {revPending > 0 ? `₹${(revPending).toLocaleString('en-IN')} remaining` : 'Target Exceeded!'}
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
                <span>Annual Cluster Target Commitment ({fyLabel})</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Uniform 12-Month Rollup
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Cluster goal benchmark configured during territory cluster setup, applicable across all 12 operating months.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-right">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Annual Kits Goal</div>
              <div className="text-sm font-black text-white">{annualKitsTargetTotal.toLocaleString('en-IN')} Kits</div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Annual Turnover Goal</div>
              <div className="text-sm font-black text-emerald-400">₹{(annualRevTargetTotal).toLocaleString('en-IN')}</div>
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
