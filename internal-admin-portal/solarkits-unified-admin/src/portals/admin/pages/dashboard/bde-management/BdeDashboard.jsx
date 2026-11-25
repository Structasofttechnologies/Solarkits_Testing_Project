import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUserTie,
  FaUserCheck,
  FaUserClock,
  FaUserSlash,
  FaMapMarkedAlt,
  FaPlus,
  FaBullseye,
  FaHistory,
  FaArrowRight,
  FaShieldAlt,
  FaTrophy,
  FaChartLine,
  FaBoxes,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';

export default function BdeDashboard({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchPerformanceDashboard();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await bdeApi.getDashboardStats(moduleUniqueId);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load BDE dashboard stats', err);
    }
  };

  const fetchPerformanceDashboard = async () => {
    try {
      setLoading(true);
      const res = await bdeApi.getPerformanceDashboard({}, moduleUniqueId);
      if (res.status === 'success') {
        setPerformanceData(res.data || []);
        setLeaderboard(res.leaderboard || null);
      }
    } catch (err) {
      console.error('Failed to load BDE performance dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats && performanceData.length === 0) return <Loader text="Loading BDE Dashboard..." />;

  const statCards = [
    {
      title: 'Total BDEs',
      value: stats?.total_bdes || 0,
      icon: <FaUserTie className="text-2xl text-[#0575B8]" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      textColor: 'text-[#0575B8]',
    },
    {
      title: 'Active BDEs',
      value: stats?.active_bdes || 0,
      icon: <FaUserCheck className="text-2xl text-emerald-600" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      title: 'KYC Pending',
      value: stats?.kyc_pending_bdes || 0,
      icon: <FaUserClock className="text-2xl text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      textColor: 'text-amber-700',
    },
    {
      title: 'Suspended / Inactive',
      value: (stats?.suspended_bdes || 0) + (stats?.inactive_bdes || 0),
      icon: <FaUserSlash className="text-2xl text-rose-600" />,
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      textColor: 'text-rose-700',
    },
    {
      title: 'Active Territories',
      value: stats?.active_territories_count || 0,
      icon: <FaMapMarkedAlt className="text-2xl text-indigo-600" />,
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      textColor: 'text-indigo-700',
    },
  ];

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50 via-slate-50 to-white border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-[#0575B8] rounded-full text-xs font-bold uppercase tracking-wider mb-1">
              <FaShieldAlt /> SolarKits BDE Subsystem
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              BDE Executive Management & Performance Evaluation
            </h1>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">
              Track field Business Development Executives, EPC lead conversion, GST onboarding targets, and franchisee network kit ordering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/admin-panel/bde-management/create')}
              className="px-5 py-2.5 bg-[#0575B8] hover:bg-[#045D93] text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <FaPlus /> Create New BDE
            </button>
            <button
              onClick={() => navigate('/admin-panel/bde-management/all')}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              View All BDEs <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`p-5 rounded-3xl bg-white border ${card.border} shadow-sm hover:shadow-md transition flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">{card.title}</span>
              <div className={`p-2.5 rounded-2xl ${card.bg}`}>{card.icon}</div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-black ${card.textColor}`}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* REQUIREMENT 9 & 11: BDE PERFORMANCE DASHBOARD & LEADERBOARD EVALUATION */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <FaTrophy />
              </span>
              <h2 className="text-lg font-black text-slate-900">BDE Performance Evaluation & Ranking Leaderboard</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comprehensive evaluation of EPC lead generation, onboardings, assigned franchisees, and territory kit orders.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200">
              Top: {leaderboard?.top_performers?.length || 0}
            </span>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 font-bold rounded-xl border border-teal-200">
              Average: {leaderboard?.average_performers?.length || 0}
            </span>
            <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-xl border border-rose-200">
              Under: {leaderboard?.under_performers?.length || 0}
            </span>
          </div>
        </div>

        {/* Evaluation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-center">Rank</th>
                <th className="px-4 py-3.5">BDE Executive / Territory</th>
                <th className="px-4 py-3.5 text-center">EPC Leads (Gen/Goal)</th>
                <th className="px-4 py-3.5 text-center">EPCs Onboarded</th>
                <th className="px-4 py-3.5 text-center">Conversion %</th>
                <th className="px-4 py-3.5 text-center">Franchisees (Live/Goal)</th>
                <th className="px-4 py-3.5 text-center">Territory Kits Ordered</th>
                <th className="px-4 py-3.5 text-right">Territory Achievement</th>
                <th className="px-4 py-3.5 text-center">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {performanceData.length > 0 ? (
                performanceData.map((p, idx) => (
                  <tr key={p.bde_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900 font-black'
                            : idx === 2
                            ? 'bg-amber-700 text-white font-black'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-[11px] text-[#0575B8] font-bold">{p.bde_code}</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{p.full_name}</div>
                      <div className="text-slate-500 text-[11px] flex items-center gap-1">
                        <FaMapMarkedAlt className="text-slate-400 text-[10px]" />
                        <span>{p.state_name || 'Assigned Territory'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-blue-700 text-sm">{p.epc_leads_generated}</span>
                      <span className="text-slate-400 text-[11px] ml-1">/ {p.epc_lead_goal}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-teal-700 text-sm">{p.epc_onboarding_completed}</span>
                      <span className="text-slate-400 text-[11px] ml-1">/ {p.epc_onboarding_goal}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {p.epc_conversion_pct}%
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-slate-900">{p.franchisees_onboarded}</span>
                      <span className="text-[11px] text-emerald-600 font-semibold ml-1">
                        ({p.operational_franchisees} Live)
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-black text-emerald-700 text-sm">{p.total_actual_kits_ordered} Kits</span>
                      <span className="text-slate-400 text-[11px] block">
                        ₹{Math.round(p.total_network_sales_value || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-black text-slate-900 text-sm">{p.assigned_territory_achievement_pct}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-block ${
                          p.rank_tier === 'Top Performer'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : p.rank_tier === 'Average Performer'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {p.rank_tier}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                    No active BDE evaluation records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/admin-panel/bde-management/territory-assignment')}
          className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-[#0575B8] hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition">
              <FaMapMarkedAlt className="text-xl" />
            </div>
            <FaArrowRight className="text-slate-400 group-hover:text-[#0575B8] transition" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Territory & District Management</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Assign and reallocate states, multiple districts, and priorities to active BDEs.
          </p>
        </div>

        <div
          onClick={() => navigate('/admin-panel/bde-management/goal-assignment')}
          className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-[#0575B8] hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition">
              <FaBullseye className="text-xl" />
            </div>
            <FaArrowRight className="text-slate-400 group-hover:text-[#0575B8] transition" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Target & Goal Assignment</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Assign monthly/quarterly franchisee signup goals, EPC onboarding targets, and network kit goals.
          </p>
        </div>

        <div
          onClick={() => navigate('/admin-panel/bde-management/activity-history')}
          className="p-6 bg-white rounded-3xl border border-slate-200 hover:border-[#0575B8] hover:shadow-md cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-50 text-[#0575B8] rounded-2xl group-hover:scale-105 transition">
              <FaHistory className="text-xl" />
            </div>
            <FaArrowRight className="text-slate-400 group-hover:text-[#0575B8] transition" />
          </div>
          <h3 className="text-base font-bold text-slate-900">BDE Activity & Audit Logs</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            View full historical event log of territory changes, KYC approvals, and status transitions.
          </p>
        </div>
      </div>
    </div>
  );
}
