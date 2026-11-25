import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Filter,
  RotateCw,
  Eye,
  Users,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import { storeSetupApi } from '../../../api/storeSetupApi';

export default function AllStoreSetups({ onViewDetail }) {
  const [setups, setSetups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [delayFilter, setDelayFilter] = useState('');
  const [operationsFilter, setOperationsFilter] = useState('');

  const fetchSetups = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (delayFilter) params.delay_status = delayFilter;
      if (operationsFilter) params.operations_status = operationsFilter;

      const res = await storeSetupApi.listStoreSetups(params);
      if (res?.status === 'success') {
        setSetups(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to list store setups', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, delayFilter, operationsFilter]);

  useEffect(() => {
    fetchSetups(1);
  }, [fetchSetups]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSetups(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDelayFilter('');
    setOperationsFilter('');
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Franchisee Name, Setup ID (ST-2026-...), GST Number, or Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Quick Filter Selects */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="employee_assigned">Employee Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="due_soon">Due Soon</option>
            <option value="delayed">Delayed</option>
            <option value="delay_approval_pending">Extension Pending</option>
            <option value="setup_completed">Setup Completed</option>
            <option value="admin_verification_pending">Verification Pending</option>
            <option value="correction_required">Correction Required</option>
            <option value="admin_verified">Admin Verified</option>
            <option value="operations_started">Operations Live</option>
          </select>

          <select
            value={delayFilter}
            onChange={(e) => setDelayFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Delay States</option>
            <option value="delayed">Delayed / Overdue Only</option>
            <option value="on_track">On Track Only</option>
          </select>

          <select
            value={operationsFilter}
            onChange={(e) => setOperationsFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Operations States</option>
            <option value="operational">Operations Active</option>
            <option value="in_setup">Under Setup</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-slate-50/80">
                <th className="py-3.5 px-4">Setup ID & Franchisee</th>
                <th className="py-3.5 px-4">Location / Territory</th>
                <th className="py-3.5 px-4">Assigned State Employee</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4">Timeline & Deadlines</th>
                <th className="py-3.5 px-4">Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                    Loading store setups...
                  </td>
                </tr>
              ) : setups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No store setups matching the selected criteria.
                  </td>
                </tr>
              ) : (
                setups.map((setup) => {
                  const deadline = setup.revised_completion_date
                    ? new Date(setup.revised_completion_date)
                    : new Date(setup.original_completion_date);

                  return (
                    <tr key={setup._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{setup.franchisee_name}</div>
                        <div className="text-xs text-amber-600 font-mono font-bold mt-0.5">{setup.store_setup_id}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{setup.plan_name || 'Franchise Partner'}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{setup.district_name || 'Regional District'}</div>
                        <div className="text-slate-400 text-[11px]">{setup.state_name || 'Regional State'}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        {setup.assigned_employee_name ? (
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              <span>{setup.assigned_employee_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">{setup.assigned_employee_email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">{setup.current_bde_id?.full_name || 'Direct / Head Office'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{setup.current_bde_id?.bde_id || ''}</div>
                      </td>

                      <td className="py-4 px-4 text-xs">
                        <div className="text-slate-700 font-medium">
                          Target: {deadline.toLocaleDateString()}
                        </div>
                        {setup.delay_days > 0 ? (
                          <span className="text-red-600 font-bold text-[11px] inline-flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            {setup.delay_days} days overdue
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px] inline-flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            On schedule
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="w-28">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                            <span>{setup.completed_activities || 0}/{setup.total_activities || 16}</span>
                            <span className="font-bold text-slate-800">{setup.progress_percentage || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${setup.progress_percentage === 100
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

                      <td className="py-4 px-4">
                        <StatusBadge status={setup.status} delayDays={setup.delay_days} />
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => onViewDetail(setup._id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between p-4 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing Page <span className="text-slate-900 font-bold">{pagination.page}</span> of{' '}
              <span className="text-slate-900 font-bold">{pagination.pages}</span> ({pagination.total} total store setups)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSetups(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchSetups(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
