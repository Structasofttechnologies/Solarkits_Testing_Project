import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
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
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

export default function FranchiseeGoalSettings() {
  const dispatch = useDispatch();
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
  const [annualEpcGoal, setAnnualEpcGoal] = useState(100);
  const [annualLiveEpcGoal, setAnnualLiveEpcGoal] = useState(60);
  const [liveEpcCriteriaDays, setLiveEpcCriteriaDays] = useState(90);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [revisionReason, setRevisionReason] = useState('');

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
            setSelectedClusterId(res.data.data[0]._id);
          }
        }
      })
      .catch((err) => console.error('Error fetching clusters:', err));
  }, []);

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
        setAnnualEpcGoal(d.annual_epc_goal || 100);
        setAnnualLiveEpcGoal(d.annual_live_epc_goal || 60);
        setLiveEpcCriteriaDays(d.live_epc_criteria_days || 90);
        setMonthlyGoals(d.monthly_kit_goals || []);
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
  const handleQuickDistribute = (totalKits, totalRev) => {
    const perMonthKits = Math.round(Number(totalKits || 0) / 12);
    const perMonthRev = Math.round(Number(totalRev || 0) / 12);
    const updated = monthlyGoals.map((m) => ({
      ...m,
      target_kits_quantity: perMonthKits,
      target_revenue: perMonthRev,
      target_po_kits: Math.round(perMonthKits * 0.8),
      target_loose_orders: Math.round(perMonthKits * 0.2),
    }));
    setMonthlyGoals(updated);
  };

  // Save / Revise Goals
  const handleSaveGoals = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        cluster_id: selectedClusterId,
        financial_year: financialYear,
        annual_epc_goal: Number(annualEpcGoal),
        annual_live_epc_goal: Number(annualLiveEpcGoal),
        live_epc_criteria_days: Number(liveEpcCriteriaDays),
        monthly_kit_goals: monthlyGoals,
        reason: revisionReason.trim() || 'Admin updated target goals',
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FiTarget size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Franchisee Goal Settings</h1>
            <p className="text-xs font-semibold text-slate-500">
              Configure annual EPC onboarding targets, active live EPCs, and monthly kit sales & revenue goals
            </p>
          </div>
        </div>

        {/* Cluster & FY Selectors */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
          >
            <option value="2026-27">FY 2026–27</option>
            <option value="2025-26">FY 2025–26</option>
            <option value="2027-28">FY 2027–28</option>
          </select>

          <select
            value={selectedClusterId}
            onChange={(e) => setSelectedClusterId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 min-w-[200px]"
          >
            {clusters.map((c) => (
              <option key={c._id} value={c._id}>
                {c.cluster_name} ({c.cluster_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center bg-white rounded-2xl border border-slate-200">
          <Loader text="Loading Goal Configuration & Real-Time Actuals..." />
        </div>
      ) : (
        <form onSubmit={handleSaveGoals} className="space-y-6">
          {/* Cluster Status Summary Bar */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Targeted Territory</div>
              <div className="text-lg font-black">{currentCluster?.cluster_name || 'Selected Cluster'}</div>
              <div className="text-xs text-slate-300 font-medium">
                {currentCluster?.state_name} • Franchisee:{' '}
                <span className="font-bold text-orange-400">
                  {currentCluster?.assigned_franchisee_id?.business_name || 'Open Territory'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(goalData?.revisions || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRevisionsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <FiClock size={14} /> Revisions ({goalData.revisions.length})
                </button>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm"
              >
                <FiSave size={15} /> {saving ? 'Saving...' : 'Save & Publish Goals'}
              </Button>
            </div>
          </div>

          {/* ── Section 4.1: Annual EPC Onboarding Goal Cards ─────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total EPC Onboarding Goal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-500">Annual EPC Onboarding Goal</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={annualEpcGoal}
                  onChange={(e) => setAnnualEpcGoal(e.target.value)}
                  className="w-28 px-3 py-1.5 text-xl font-black bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
                <span className="text-xs font-bold text-slate-500">Approved EPCs</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 pt-1">
                Actual Onboarded:{' '}
                <span className="font-extrabold text-blue-600">{goalData?.actual_epc_onboarded || 0}</span>
                <span className="ml-1 text-[11px] text-slate-400">
                  ({goalData?.epc_achievement_pct || 0}% Achieved)
                </span>
              </div>
            </div>

            {/* Annual Live EPC Goal */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-500">Annual Live EPC Goal</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={annualLiveEpcGoal}
                  onChange={(e) => setAnnualLiveEpcGoal(e.target.value)}
                  className="w-28 px-3 py-1.5 text-xl font-black bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
                <span className="text-xs font-bold text-slate-500">Active EPCs</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 pt-1">
                Actual Live EPCs:{' '}
                <span className="font-extrabold text-emerald-600">{goalData?.actual_live_epcs || 0}</span>
                <span className="ml-1 text-[11px] text-slate-400">
                  ({goalData?.live_epc_achievement_pct || 0}% Achieved)
                </span>
              </div>
            </div>

            {/* Live EPC Criteria Settings */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-500">Live Activity Threshold</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={liveEpcCriteriaDays}
                  onChange={(e) => setLiveEpcCriteriaDays(e.target.value)}
                  className="w-24 px-3 py-1.5 text-lg font-black bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                />
                <span className="text-xs font-bold text-slate-500">Days</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium pt-1">
                EPC active if qualifying login or purchase occurred within window
              </p>
            </div>

            {/* Quick Goal Helper */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase text-slate-500">Quick Month Allocation</span>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleQuickDistribute(1200, 60000000)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  100 Kits / ₹50L/mo
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDistribute(1800, 90000000)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  150 Kits / ₹75L/mo
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Applies equal quota across 12 months</p>
            </div>
          </div>

          {/* ── Section 4.2: Monthly Kit Sales Goal (12 Months Table) ─────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Monthly Kit Sales & Revenue Targets (12 Months)</h3>
                <p className="text-xs text-slate-500">
                  Configure seasonal kit quotas and revenue goals. Actual figures auto-calculated from net confirmed orders.
                </p>
              </div>
              <div className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                Annual Kit Target:{' '}
                {monthlyGoals.reduce((sum, m) => sum + Number(m.target_kits_quantity || 0), 0)} Kits
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
                    <th className="px-4 py-3.5 text-center">Achievement %</th>
                    <th className="px-4 py-3.5">Target Revenue (₹)</th>
                    <th className="px-4 py-3.5">Actual Revenue (₹)</th>
                    <th className="px-4 py-3.5">PO / Loose Split</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyGoals.map((m, idx) => {
                    const actualKits = Number(m.actual_kit_sales || 0);
                    const targetKits = Number(m.target_kits_quantity || 0);
                    const pendingKits = Math.max(0, targetKits - actualKits);
                    const achPct = targetKits > 0 ? Math.round((actualKits / targetKits) * 100) : 0;

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

                        {/* Achievement % */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                              achPct >= 100
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
                          ₹{Number(m.actual_revenue || 0).toLocaleString('en-IN')}
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
