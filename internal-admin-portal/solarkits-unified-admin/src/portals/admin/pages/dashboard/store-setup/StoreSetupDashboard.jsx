import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Users, 
  ArrowRight, 
  TrendingUp, 
  RotateCw, 
  Eye, 
  Calendar 
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function StoreSetupDashboard({ onViewAll, onViewDetail }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await storeSetupApi.getDashboardStats();
      if (res?.status === 'success') {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch store setup stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Stores in Pipeline',
      value: stats?.total_stores || 0,
      icon: Store,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      label: 'In Setup Progress',
      value: (stats?.in_progress || 0) + (stats?.employee_assigned || 0),
      icon: Clock,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    {
      label: 'Due Soon (≤ 5 Days)',
      value: stats?.due_soon || 0,
      icon: Clock,
      color: 'bg-orange-50 text-orange-600 border-orange-100',
    },
    {
      label: 'Overdue / Delayed',
      value: stats?.delayed || 0,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600 border-red-100',
    },
    {
      label: 'Delay Approval Pending',
      value: stats?.delay_approval_pending || 0,
      icon: AlertTriangle,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
    },
    {
      label: 'Verification Pending',
      value: stats?.admin_verification_pending || 0,
      icon: ShieldCheck,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    },
    {
      label: 'Correction Required',
      value: stats?.correction_required || 0,
      icon: AlertTriangle,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      label: 'Operations Live',
      value: stats?.operations_started || 0,
      icon: Zap,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Alert Banner if delays exist */}
      {(stats?.delayed > 0 || stats?.delay_approval_pending > 0) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Action Required: {stats?.delayed || 0} Delayed Setups & {stats?.delay_approval_pending || 0} Extension Requests Pending
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                Review timeline extension requests or follow up with state coordinators to maintain expansion momentum.
              </p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            Review Delayed Stores
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:translate-y-[-2px]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                <div className={`p-2 rounded-xl border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Setups Table & Quick Progress */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Store Setups</h3>
            <p className="text-xs text-slate-500">Live physical store execution status & progress tracking</p>
          </div>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-bold transition-colors"
          >
            View All Stores
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3 px-4">Setup ID & Franchisee</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Assigned Employee</th>
                <th className="py-3 px-4">Assigned BDE</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recent_setups?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No store setups initialized yet. Store setups trigger automatically when franchise agreement is signed and fee payment is confirmed.
                  </td>
                </tr>
              ) : (
                stats?.recent_setups?.map((setup) => {
                  return (
                    <tr key={setup._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{setup.franchisee_name}</div>
                        <div className="text-xs text-amber-600 font-mono font-bold mt-0.5">{setup.store_setup_id}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {setup.district_name ? `${setup.district_name}, ${setup.state_name}` : 'Regional State'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        {setup.assigned_employee_name ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{setup.assigned_employee_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {setup.current_bde_id?.full_name || 'Direct Lead'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-32">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                            <span>{setup.completed_activities || 0}/{setup.total_activities || 16}</span>
                            <span className="font-bold text-slate-800">{setup.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                setup.progress_percentage === 100
                                  ? 'bg-emerald-500'
                                  : setup.delay_days > 0
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${setup.progress_percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={setup.status} delayDays={setup.delay_days} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onViewDetail(setup._id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, delayDays }) {
  const configs = {
    not_started: { label: 'Not Started', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    employee_assigned: { label: 'Employee Assigned', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    on_track: { label: 'On Track', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    due_soon: { label: 'Due Soon', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    delayed: { label: `Delayed (${delayDays || 0}d)`, bg: 'bg-red-50 text-red-700 border-red-200' },
    delay_approval_pending: { label: 'Extension Pending', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    delay_approved: { label: 'Extension Approved', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    delay_rejected: { label: 'Extension Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    setup_completed: { label: 'Setup Completed', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    admin_verification_pending: { label: 'Verification Pending', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    correction_required: { label: 'Correction Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    admin_verified: { label: 'Admin Verified', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    operations_started: { label: 'Operations Live', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' },
    cancelled: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-500 border-slate-200' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${c.bg}`}>
      {c.label}
    </span>
  );
}
