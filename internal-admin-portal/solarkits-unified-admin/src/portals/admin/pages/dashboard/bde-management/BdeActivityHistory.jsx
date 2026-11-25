import React, { useState, useEffect } from 'react';
import {
  FaHistory,
  FaSearch,
  FaFilter,
  FaUserTie,
  FaClock,
} from 'react-icons/fa';
import { bdeApi } from '../../../api/bdeApi';
import Loader from '../../../components/Loader';

export default function BdeActivityHistory({ moduleUniqueId = 'ADM_BDE_MGMT' }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    fetchHistory(pagination.page);
  }, [actionFilter]);

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      const res = await bdeApi.getActivityHistory({
        page,
        limit: pagination.limit,
        action: actionFilter || undefined,
      }, moduleUniqueId);

      setActivities(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load BDE activity history', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('KYC_VERIFIED') || action.includes('ACTIVE')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (action.includes('REJECT') || action.includes('SUSPEND')) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (action.includes('TERRITORY')) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (action.includes('GOAL')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (action.includes('LOGIN')) return 'bg-amber-100 text-amber-900 border-amber-300';
    return 'bg-slate-100 text-slate-700 border-slate-300';
  };

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">BDE Activity & Audit History</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            System and administrator event logs for all BDE profile modifications, assignments, and status transitions.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FaFilter className="text-slate-400 text-xs" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter by Action:</span>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:border-[#0575B8] focus:bg-white"
        >
          <option value="">All Actions</option>
          <option value="BDE_CREATED">BDE Created</option>
          <option value="BDE_UPDATED">BDE Updated</option>
          <option value="KYC_SUBMITTED">KYC Submitted</option>
          <option value="KYC_VERIFIED">KYC Verified</option>
          <option value="KYC_REJECTED">KYC Rejected</option>
          <option value="STATUS_CHANGED">Status Changed</option>
          <option value="LOGIN_RESET">Login Reset</option>
          <option value="TERRITORY_ASSIGNED">Territory Assigned</option>
          <option value="PLANS_ASSIGNED">Plans Assigned</option>
          <option value="GOAL_ASSIGNED">Goal Assigned</option>
          <option value="LOGIN_SUCCESS">BDE Login</option>
          <option value="PASSWORD_CHANGED">Password Changed</option>
        </select>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20"><Loader text="Loading activity history..." /></div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-medium">
            No activity logs found for the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((act, i) => (
              <div key={act._id || i} className="p-5 hover:bg-slate-50/70 transition-all flex items-start gap-4 text-xs">
                <div className="p-3 bg-blue-50 text-[#0575B8] rounded-2xl font-bold text-sm shrink-0 shadow-xs">
                  <FaHistory />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] border ${getActionBadgeColor(act.action)}`}>
                        {act.action}
                      </span>
                      {act.bde_id && (
                        <span className="font-bold text-slate-900">
                          {act.bde_id.full_name || act.bde_id.bde_id} ({act.bde_id.bde_id})
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <FaClock className="text-[10px]" />
                      {act.createdAt ? new Date(act.createdAt).toLocaleString() : ''}
                    </span>
                  </div>

                  <p className="text-slate-800 text-sm font-semibold pt-0.5">{act.notes || 'Activity event recorded'}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 font-medium">
                    {act.actor_name && (
                      <span>Actor: <strong className="text-slate-900">{act.actor_name}</strong> ({act.actor_type})</span>
                    )}
                    {act.ip_address && (
                      <span className="font-mono">IP: {act.ip_address}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total logs)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchHistory(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchHistory(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
