import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiTarget,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiEdit,
  FiLayers,
  FiUsers,
  FiPackage,
  FiDollarSign,
  FiSave,
  FiX,
  FiPlus,
  FiZap,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

export default function FranchiseeGoalSettings() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Current Financial Year determination (Apr-Mar)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const initialFY =
    currentMonth >= 4
      ? `${currentYear}-${String(currentYear + 1).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`;

  const [financialYear, setFinancialYear] = useState(initialFY);
  const [clusters, setClusters] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Goal Data
  const [goalData, setGoalData] = useState(null);

  // Form editable states
  const [annualEpcGoal, setAnnualEpcGoal] = useState(50);
  const [epcOnboardDays, setEpcOnboardDays] = useState(90);
  const [annualLiveEpcGoal, setAnnualLiveEpcGoal] = useState(60);
  const [liveEpcCriteriaDays, setLiveEpcCriteriaDays] = useState(90);
  const [annualPoOrdersGoal, setAnnualPoOrdersGoal] = useState(50);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [revisionReason, setRevisionReason] = useState('');

  // Bulk / Uniform monthly setting state
  const [bulkMonthlyKits, setBulkMonthlyKits] = useState(100);
  const [bulkMonthlyRev, setBulkMonthlyRev] = useState(0);

  // Revisions Modal
  const [isRevisionsOpen, setIsRevisionsOpen] = useState(false);

  // Month names for table
  const MONTH_NAMES = [
    '',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Fetch Clusters
  useEffect(() => {
    axios
      .get(`${API_URL}/franchise-clusters/list`, authHeaderObj())
      .then((res) => {
        if (res.data?.data) {
          setClusters(res.data.data);
          if (res.data.data.length > 0) {
            const urlClusterId = searchParams.get('cluster_id');
            const found = res.data.data.find((c) => c._id === urlClusterId);
            setSelectedClusterId(found ? found._id : res.data.data[0]._id);
          }
        }
      })
      .catch((err) => console.error('Error fetching clusters:', err));
  }, [searchParams]);

  // Fetch Goal whenever cluster or FY changes
  useEffect(() => {
    if (!selectedClusterId) return;
    fetchClusterGoal();
  }, [selectedClusterId, financialYear]);

  const fetchClusterGoal = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/franchise-clusters/goals/cluster/${selectedClusterId}?financial_year=${financialYear}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        const d = res.data.data;
        setGoalData(d);
        setAnnualEpcGoal(d.annual_epc_goal || 50);
        setEpcOnboardDays(d.epc_onboard_days || 90);
        setAnnualLiveEpcGoal(d.annual_live_epc_goal || 60);
        setLiveEpcCriteriaDays(d.live_epc_criteria_days || 90);
        setAnnualPoOrdersGoal(d.annual_po_orders_goal || 50);
        setMonthlyGoals(d.monthly_kit_goals || []);

        if (d.monthly_kit_goals && d.monthly_kit_goals.length > 0) {
          setBulkMonthlyKits(d.monthly_kits_target || d.monthly_kit_goals[0].target_kits_quantity || 100);
          setBulkMonthlyRev(d.monthly_kit_goals[0].target_revenue || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching cluster goal:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load goals for cluster', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Update specific month target
  const handleMonthlyChange = (idx, field, value) => {
    const updated = [...monthlyGoals];
    updated[idx] = {
      ...updated[idx],
      [field]: Number(value || 0),
    };
    setMonthlyGoals(updated);
  };

  // Quick Distribute Quantity to all 12 months equally
  const handleApplyUniformMonthly = (kits) => {
    const k = Number(kits !== undefined ? kits : bulkMonthlyKits || 0);
    setBulkMonthlyKits(k);

    const updated = monthlyGoals.map((m) => ({
      ...m,
      target_kits_quantity: k,
      target_revenue: 0,
      target_po_kits: 0,
      target_loose_orders: 0,
    }));
    setMonthlyGoals(updated);
    dispatch(
      setAlert({
        title: 'Uniform Quota Applied',
        message: `${k} Kits/month (${(k * 12).toLocaleString('en-IN')} Kits/year) applied across all 12 months. Remember to click Save.`,
        type: 'info',
      })
    );
  };

  // Calculate overall totals across 12 months
  const totals = useMemo(() => {
    let targetKits = 0;
    let actualKits = 0;
    let targetRevenue = 0;
    let actualRevenue = 0;

    for (const m of monthlyGoals) {
      targetKits += Number(m.target_kits_quantity || 0);
      actualKits += Number(m.actual_kit_sales || 0);
      targetRevenue += Number(m.target_revenue || 0);
      actualRevenue += Number(m.actual_revenue || 0);
    }

    const kitsAchPct = targetKits > 0 ? Math.round((actualKits / targetKits) * 100) : 0;
    const revAchPct = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

    return {
      targetKits,
      actualKits,
      pendingKits: Math.max(0, targetKits - actualKits),
      kitsAchPct,
      targetRevenue,
      actualRevenue,
      pendingRevenue: Math.max(0, targetRevenue - actualRevenue),
      revAchPct,
    };
  }, [monthlyGoals]);

  // Save / Revise Goals
  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        cluster_id: selectedClusterId,
        financial_year: financialYear,
        monthly_kits_target: Number(bulkMonthlyKits || 100),
        annual_kits_target: Number(totals.targetKits || (bulkMonthlyKits * 12)),
        annual_epc_goal: Number(annualEpcGoal),
        epc_onboard_days: Number(epcOnboardDays || 90),
        annual_live_epc_goal: Number(annualLiveEpcGoal),
        live_epc_criteria_days: Number(liveEpcCriteriaDays),
        annual_po_orders_goal: Number(annualPoOrdersGoal || 50),
        monthly_kit_goals: monthlyGoals,
        reason: revisionReason.trim() || 'Admin updated target goals from Goal Tracking',
      };

      await axios.post(`${API_URL}/franchise-clusters/goals/set`, payload, authHeaderObj());
      dispatch(setAlert({ title: 'Saved', message: 'Cluster goals updated successfully', type: 'success' }));
      setRevisionReason('');
      fetchClusterGoal();
    } catch (err) {
      console.error('Error saving cluster goals:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  // Selected Cluster Document
  const currentCluster = useMemo(() => {
    return clusters.find((c) => c._id === selectedClusterId);
  }, [clusters, selectedClusterId]);

  return (
    <div className="space-y-6">
      {/* ── Page Header: Franchise Goal Tracking ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <FiTrendingUp size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Franchise Goal Tracking</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Live Actuals vs Targets
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Real-time performance tracking for EPC onboarding, active live EPCs, and monthly kit sales & revenue against targets
            </p>
          </div>
        </div>

        {/* Cluster & FY Selectors */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">FY:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2026-27">FY 2026–27</option>
              <option value="2025-26">FY 2025–26</option>
              <option value="2027-28">FY 2027–28</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Cluster:</span>
            <select
              value={selectedClusterId}
              onChange={(e) => {
                setSelectedClusterId(e.target.value);
                setSearchParams({ tab: 'goals', cluster_id: e.target.value });
              }}
              className="bg-transparent text-xs font-black text-slate-800 min-w-[180px] focus:outline-none cursor-pointer"
            >
              {clusters.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.cluster_name} ({c.cluster_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-slate-200">
          <Loader text="Loading Goal Tracking & Real-Time Performance Actuals..." />
        </div>
      ) : (
        <form onSubmit={handleSaveGoals} className="space-y-6">
          {/* Cluster Status Summary Bar */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Targeted Territory & Assigned Franchisee
              </div>
              <div className="text-xl font-black flex items-center gap-2 mt-0.5">
                <span>{currentCluster?.cluster_name || 'Selected Cluster'}</span>
                <span className="text-xs font-mono font-bold text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                  {currentCluster?.cluster_code}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium mt-1">
                {currentCluster?.state_name} • Franchisee Store:{' '}
                <span className="font-bold text-orange-400">
                  {currentCluster?.assigned_franchisee_id?.business_name || 'Open Territory / Unallocated'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(goalData?.revisions || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRevisionsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <FiClock size={14} /> Revisions History ({goalData.revisions.length})
                </button>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm"
              >
                <FiSave size={15} /> {saving ? 'Saving...' : 'Save & Publish Goals'}
              </Button>
            </div>
          </div>

          {/* ── Section 1: Real-Time Performance & Goal Tracking Cards ───────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total EPC Onboarding Goal Tracking */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500">1. EPC Onboarding Goal ({epcOnboardDays} Days)</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${(goalData?.epc_achievement_pct || 0) >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : (goalData?.epc_achievement_pct || 0) >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                  >
                    {goalData?.epc_achievement_pct || 0}% Achieved
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    value={annualEpcGoal}
                    onChange={(e) => setAnnualEpcGoal(e.target.value)}
                    className="w-24 px-2.5 py-1 text-lg font-black bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  />
                  <span className="text-xs font-bold text-slate-500">Target EPCs</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                  Timeframe: {epcOnboardDays} Days (Day 90 me 50 EPC)
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 flex justify-between items-center">
                  <span>Actual Onboarded:</span>
                  <span className="font-black text-blue-600 text-sm">{goalData?.actual_epc_onboarded || 0} EPCs</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goalData?.epc_achievement_pct || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Annual Live EPC Goal Tracking */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500">2. Annual Live EPC Goal</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${(goalData?.live_epc_achievement_pct || 0) >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : (goalData?.live_epc_achievement_pct || 0) >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                  >
                    {goalData?.live_epc_achievement_pct || 0}% Achieved
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    value={annualLiveEpcGoal}
                    onChange={(e) => setAnnualLiveEpcGoal(e.target.value)}
                    className="w-24 px-2.5 py-1 text-lg font-black bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  />
                  <span className="text-xs font-bold text-slate-500">Active EPCs</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                  Threshold: {liveEpcCriteriaDays} Days Window
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 flex justify-between items-center">
                  <span>Actual Live EPCs:</span>
                  <span className="font-black text-emerald-600 text-sm">{goalData?.actual_live_epcs || 0} EPCs</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goalData?.live_epc_achievement_pct || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Annual Kit Sales Progress */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500">3. Annual Kit Sales</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totals.kitsAchPct >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : totals.kitsAchPct >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                  >
                    {totals.kitsAchPct}% Achieved
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">
                    {totals.targetKits.toLocaleString('en-IN')} <span className="text-xs font-bold text-slate-500">Target Kits</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Pending: <span className="font-bold text-slate-700">{totals.pendingKits.toLocaleString('en-IN')} Kits</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 flex justify-between items-center">
                  <span>Actual Kits Sold:</span>
                  <span className="font-black text-orange-600 text-sm">{totals.actualKits.toLocaleString('en-IN')} Kits</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${totals.kitsAchPct >= 100 ? 'bg-emerald-500' : totals.kitsAchPct >= 70 ? 'bg-amber-500' : 'bg-orange-500'
                      }`}
                    style={{ width: `${Math.min(100, totals.kitsAchPct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Yearly PO Orders Goal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500">4. Yearly PO Orders Goal</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${(goalData?.po_orders_achievement_pct || 0) >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : (goalData?.po_orders_achievement_pct || 0) >= 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                  >
                    {goalData?.po_orders_achievement_pct || 0}% Achieved
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    value={annualPoOrdersGoal}
                    onChange={(e) => setAnnualPoOrdersGoal(e.target.value)}
                    className="w-24 px-2.5 py-1 text-lg font-black bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
                  />
                  <span className="text-xs font-bold text-slate-500">Target PO Orders</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-1">
                  Year me {annualPoOrdersGoal} PO orders create karna hai
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 flex justify-between items-center">
                  <span>Actual POs Created:</span>
                  <span className="font-black text-purple-700 text-sm">
                    {goalData?.actual_po_orders_count || 0} Orders
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${(goalData?.po_orders_achievement_pct || 0) >= 100 ? 'bg-emerald-500' : (goalData?.po_orders_achievement_pct || 0) >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                    style={{ width: `${Math.min(100, goalData?.po_orders_achievement_pct || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Quick Uniform Monthly Quota Allocation ───────────── */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <FiZap size={14} />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 uppercase">
                    Uniform Monthly Quota Allocation (Applies to all 12 Months)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Ek month ka quota set karke "Apply" karein — yeh automatic 12 months me replicate ho jayega.
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleApplyUniformMonthly(100)}
                  className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors"
                >
                  100 Kits/mo (1,200/yr)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUniformMonthly(150)}
                  className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors"
                >
                  150 Kits/mo (1,800/yr)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyUniformMonthly(200)}
                  className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs transition-colors"
                >
                  200 Kits/mo (2,400/yr)
                </button>
              </div>
            </div>

            {/* Custom Uniform Inputs */}
            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600">Monthly Kits:</label>
                <input
                  type="number"
                  min="0"
                  value={bulkMonthlyKits}
                  onChange={(e) => setBulkMonthlyKits(Number(e.target.value))}
                  className="w-28 px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-black text-xs text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={() => handleApplyUniformMonthly(bulkMonthlyKits)}
                className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all"
              >
                Apply to All 12 Months
              </button>

              <div className="ml-auto text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                Annual Kit Target: <span className="font-black text-slate-800">{(bulkMonthlyKits * 12).toLocaleString('en-IN')} Kits / Year</span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Monthly Kit Sales & Revenue Targets (12 Months Table) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Monthly Kit Sales & Revenue Performance Tracking (12 Months)
                </h3>
                <p className="text-xs text-slate-500">
                  Track month-by-month targets vs actual kits sold and revenue realized from net confirmed orders.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="font-black text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
                  Annual Target: {totals.targetKits.toLocaleString('en-IN')} Kits
                </div>
                <div className="font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  Annual Revenue: ₹{totals.targetRevenue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Month</th>
                    <th className="px-4 py-3.5">Target Kits</th>
                    <th className="px-4 py-3.5">Actual Kits Sold</th>
                    <th className="px-4 py-3.5">Pending Target</th>
                    <th className="px-4 py-3.5 text-center">Kit Ach. %</th>
                    <th className="px-4 py-3.5">Target Revenue (₹)</th>
                    <th className="px-4 py-3.5">Actual Revenue (₹)</th>
                    <th className="px-4 py-3.5 text-center">Rev Ach. %</th>
                    <th className="px-4 py-3.5">PO / Loose Split</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyGoals.map((m, idx) => {
                    const actualKits = Number(m.actual_kit_sales || 0);
                    const targetKits = Number(m.target_kits_quantity || 0);
                    const pendingKits = Math.max(0, targetKits - actualKits);
                    const achPct = targetKits > 0 ? Math.round((actualKits / targetKits) * 100) : 0;

                    const actualRev = Number(m.actual_revenue || 0);
                    const targetRev = Number(m.target_revenue || 0);
                    const revAchPct = targetRev > 0 ? Math.round((actualRev / targetRev) * 100) : 0;

                    const isAchieved = targetKits > 0 && actualKits >= targetKits;
                    const isInProgress = actualKits > 0 || actualRev > 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* Month & Year */}
                        <td className="px-4 py-3.5 font-bold text-slate-800">
                          {MONTH_NAMES[m.month]} {m.year}
                        </td>

                        {/* Target Kits (Editable) */}
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="0"
                            value={m.target_kits_quantity}
                            onChange={(e) => handleMonthlyChange(idx, 'target_kits_quantity', e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:bg-white"
                          />
                        </td>

                        {/* Actual Kits Sold */}
                        <td className="px-4 py-3.5 font-extrabold text-blue-600">
                          {actualKits} Kits
                        </td>

                        {/* Pending Target */}
                        <td className="px-4 py-3.5 font-bold text-slate-500">
                          {pendingKits} Kits
                        </td>

                        {/* Kit Achievement % */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${achPct >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : achPct >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {achPct}%
                          </span>
                        </td>

                        {/* Target Revenue (Editable) */}
                        <td className="px-4 py-3.5">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={m.target_revenue}
                            onChange={(e) => handleMonthlyChange(idx, 'target_revenue', e.target.value)}
                            className="w-32 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md font-bold text-slate-900 focus:bg-white"
                          />
                        </td>

                        {/* Actual Revenue */}
                        <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                          ₹{actualRev.toLocaleString('en-IN')}
                        </td>

                        {/* Revenue Achievement % */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${revAchPct >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : revAchPct >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                          >
                            {revAchPct}%
                          </span>
                        </td>

                        {/* PO / Loose Quota Split (Editable) */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold">
                            <span>PO:</span>
                            <input
                              type="number"
                              min="0"
                              value={m.target_po_kits || 0}
                              onChange={(e) => handleMonthlyChange(idx, 'target_po_kits', e.target.value)}
                              className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
                            />
                            <span>Loose:</span>
                            <input
                              type="number"
                              min="0"
                              value={m.target_loose_orders || 0}
                              onChange={(e) => handleMonthlyChange(idx, 'target_loose_orders', e.target.value)}
                              className="w-14 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800"
                            />
                          </div>
                        </td>

                        {/* Performance Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${isAchieved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isInProgress
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                          >
                            {isAchieved ? 'Achieved' : isInProgress ? 'In Progress' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revision Reason input */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Revision Note / Effective Date Reason
              </label>
              <input
                type="text"
                placeholder="Specify reason for target modifications (e.g. Seasonal solar policy updates, new franchise setup)..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="mt-5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs shrink-0"
            >
              {saving ? 'Publishing...' : 'Save & Publish Targets'}
            </Button>
          </div>
        </form>
      )}

      {/* ── REVISIONS HISTORY MODAL ────────────────────────────────────────── */}
      {isRevisionsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">Goal Revisions History</h3>
              <button onClick={() => setIsRevisionsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
              {(goalData?.revisions || []).map((rev, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Revision #{i + 1}</span>
                    <span className="text-[10px] text-slate-400">{new Date(rev.revised_at).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-600">
                    Previous Goals: {rev.previous_annual_epc_goal} EPCs / {rev.previous_annual_live_epc_goal} Live EPCs
                  </div>
                  {rev.reason && <div className="text-slate-500 italic">Reason: {rev.reason}</div>}
                </div>
              ))}
            </div>
            <Button onClick={() => setIsRevisionsOpen(false)} className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
