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
      {clusterInfo?.cluster && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shrink-0 border border-indigo-100">
              <FiLayers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                  Cluster: {clusterInfo.cluster.cluster_name} ({clusterInfo.cluster.cluster_code})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {clusterInfo.cluster.is_shared_territory_allowed ? "Shared Territory" : "Exclusive Territory"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {clusterInfo.cluster.district_ids?.length || 0} districts assigned • Agreement:{" "}
                <span className="font-bold text-slate-800 capitalize">
                  {clusterInfo.agreement?.agreement_status?.replace(/_/g, " ") || "Active"}
                </span>
                {clusterInfo.agreement?.agreement_end_date && (
                  <span> (Valid until {new Date(clusterInfo.agreement.agreement_end_date).toLocaleDateString("en-IN")})</span>
                )}
              </p>
            </div>
          </div>

          {clusterInfo.cluster.primary_bde_id && (
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 text-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                <FiUsers size={15} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Assigned BDE</div>
                <div className="font-black text-slate-900">{clusterInfo.cluster.primary_bde_id.name}</div>
                {clusterInfo.cluster.primary_bde_id.phone && (
                  <div className="text-[11px] font-semibold text-blue-600">{clusterInfo.cluster.primary_bde_id.phone}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Annual EPC Onboarding & Live EPC Goals (Section 4) ── */}
      {clusterInfo?.goal && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Annual EPC Onboarding Goal */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <FiUsers className="text-blue-600" size={15} />
                Annual EPC Onboarding Goal ({clusterInfo.goal.financial_year})
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700">
                {clusterInfo.goal.annual_epc_goal?.achievement_pct || 0}% Achieved
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400">Target Goal</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {clusterInfo.goal.annual_epc_goal?.total_epc_target || 0}
                </div>
                <div className="text-[9px] text-slate-400 font-bold">Registered EPCs</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700">Actual Approved</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {clusterInfo.goal.annual_epc_goal?.actual_epcs_onboarded || 0}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold">Onboarded</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700">Remaining</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">
                  {Math.max((clusterInfo.goal.annual_epc_goal?.total_epc_target || 0) - (clusterInfo.goal.annual_epc_goal?.actual_epcs_onboarded || 0), 0)}
                </div>
                <div className="text-[9px] text-amber-600 font-bold">Pending</div>
              </div>
            </div>
          </div>

          {/* Live Active EPC Goal */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider">
                <FiZap className="text-amber-500" size={15} />
                Live Active EPC Goal (90-Day Active)
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700">
                {clusterInfo.goal.live_epc_goal?.achievement_pct || 0}% Achieved
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400">Live Target</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {clusterInfo.goal.live_epc_goal?.live_epc_target || 0}
                </div>
                <div className="text-[9px] text-slate-400 font-bold">Active EPCs</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-700">Actual Live</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {clusterInfo.goal.live_epc_goal?.actual_live_epcs || 0}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold">Qualifying Orders</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="text-[10px] font-bold text-amber-700">Remaining</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">
                  {Math.max((clusterInfo.goal.live_epc_goal?.live_epc_target || 0) - (clusterInfo.goal.live_epc_goal?.actual_live_epcs || 0), 0)}
                </div>
                <div className="text-[9px] text-amber-600 font-bold">Pending Active</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Franchise Monthly Kit Target & Goal Progress Widget ───────────── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/40 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/25 shrink-0">
              <FiTarget size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Monthly Kit Sales Target & Goal
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${(goalData?.achievement_pct || 0) >= 100
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : (goalData?.achievement_pct || 0) >= 70
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
                {goalData?.period || "Current Calendar Month"} territory commitment • Orders placed and fulfilled dynamically reduce your remaining goal
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

        {/* 4 Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FiTarget className="text-blue-600" size={13} /> Monthly Target
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {goalData?.monthly_goal || 100} <span className="text-xs font-bold text-slate-400">Kits</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">Plan Territory Goal</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
            <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiCheckCircle className="text-emerald-600" size={13} /> Achieved / Fulfilled
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
              {goalData?.eligible_kits || 0} <span className="text-xs font-bold text-emerald-700/60">Kits</span>
            </div>
            <div className="text-[10px] font-bold text-emerald-600 mt-1">
              {goalData?.achievement_pct || 0}% Completed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiBox className="text-amber-600" size={13} /> Remaining Target
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
              {goalData?.balance_kits != null ? goalData.balance_kits : (100 - (goalData?.eligible_kits || 0))} <span className="text-xs font-bold text-amber-700/60">Kits</span>
            </div>
            <div className="text-[10px] font-bold text-amber-600 mt-1">Kits Left to Target</div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
            <div className="text-[11px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <FiClock className="text-purple-600" size={13} /> Cycle Timeline
            </div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1.5">
              {goalData?.days_remaining != null ? goalData.days_remaining : 15} <span className="text-xs font-bold text-purple-700/60">Days</span>
            </div>
            <div className="text-[10px] font-bold text-purple-600 mt-1">Remaining in Month</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
            <span>Progress: {goalData?.achievement_pct || 0}% Complete</span>
            <span>{goalData?.eligible_kits || 0} / {goalData?.monthly_goal || 100} Solar Combo Kits</span>
          </div>
          <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${(goalData?.achievement_pct || 0) >= 100
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50"
                : (goalData?.achievement_pct || 0) >= 50
                  ? "bg-gradient-to-r from-blue-600 to-cyan-400 shadow-sm shadow-blue-500/50"
                  : "bg-gradient-to-r from-amber-500 to-orange-400 shadow-sm shadow-amber-500/50"
                }`}
              style={{ width: `${Math.min(Math.max(goalData?.achievement_pct || 0, 4), 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>🚀 PO order placements and deliveries continuously fulfill this monthly goal.</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {goalData?.balance_kits || (100 - (goalData?.eligible_kits || 0))} kits to reach 100%
            </span>
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
