import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setAlert } from '@/features/alert.slice';
import { authHeaderObj } from '@/app/authHeader';
import {
  FiTool,
  FiPlus,
  FiSearch,
  FiFilter,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiUsers,
  FiEye,
  FiEdit3,
  FiSend,
  FiDownload,
  FiX,
  FiPackage,
  FiCreditCard,
  FiTruck,
  FiHelpCircle,
} from 'react-icons/fi';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

export default function FranchiseeTicketsAdmin() {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Ticket Detail / Resolution Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState('');
  const [updatingDepartment, setUpdatingDepartment] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [selectedType, selectedPriority, selectedDepartment, selectedStatus, overdueOnly]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('ticket_type', selectedType);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      if (selectedDepartment !== 'all') params.append('assigned_department', selectedDepartment);
      if (selectedStatus !== 'all') params.append('ticket_status', selectedStatus);
      if (overdueOnly) params.append('is_overdue', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await axios.get(
        `${API_URL}/franchise-clusters/tickets/list?${params.toString()}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        setTickets(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load tickets', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Open Ticket Update Modal
  const handleOpenDetail = (ticket) => {
    setSelectedTicket(ticket);
    setUpdatingStatus(ticket.ticket_status);
    setUpdatingDepartment(ticket.assigned_department || 'support');
    setAdminNotes('');
  };

  // Update Status / Department
  const handleUpdateTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setSubmitting(true);
    try {
      const payload = {
        ticket_status: updatingStatus,
        assigned_department: updatingDepartment,
        admin_notes: adminNotes.trim() || undefined,
      };

      await axios.put(
        `${API_URL}/franchise-clusters/tickets/${selectedTicket._id}`,
        payload,
        authHeaderObj()
      );
      dispatch(setAlert({ title: 'Success', message: 'Ticket updated successfully', type: 'success' }));
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      console.error('Error updating ticket:', err);
      dispatch(setAlert({ title: 'Error', message: err.response?.data?.message || err.message, type: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  // Priority color config
  const priorityConfig = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Status color config
  const statusConfig = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    assigned: 'bg-purple-50 text-purple-700 border-purple-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    waiting: 'bg-slate-100 text-slate-600 border-slate-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-slate-100 text-slate-500 border-slate-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.ticket_number?.toLowerCase().includes(q) ||
        t.problem_description?.toLowerCase().includes(q) ||
        t.raised_by_name?.toLowerCase().includes(q) ||
        t.cluster_name?.toLowerCase().includes(q)
      );
    });
  }, [tickets, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <FiTool size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Franchisee Support & Replacement Tickets</h1>
            <p className="text-xs font-semibold text-slate-500">
              Centralized ticketing workflow for business support, replacement requests, delivery, and payment concerns
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-black uppercase text-slate-400">Total Open Tickets</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{summary.total_open || 0}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Across all franchisees and BDEs</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-black uppercase text-red-600">Overdue SLA / TAT</span>
          <div className="text-2xl font-black text-red-600 mt-1">{summary.overdue_tickets || 0}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Exceeded configured resolution TAT</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-black uppercase text-orange-600">Replacement Requests</span>
          <div className="text-2xl font-black text-orange-600 mt-1">{summary.replacement_requests || 0}</div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Kit item damage or missing parts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-slate-400">Department Workload</span>
            <div className="flex gap-2 text-xs font-bold text-slate-700 mt-1">
              <span>Account: {summary.department_counts?.account || 0}</span>
              <span>Delivery: {summary.department_counts?.delivery || 0}</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Support: {summary.department_counts?.support || 0} • Admin: {summary.department_counts?.admin || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* Type */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="all">All Ticket Types</option>
            <option value="business_support">Business Support</option>
            <option value="product">Product Issue</option>
            <option value="replacement">Replacement Request</option>
            <option value="delivery">Delivery Concern</option>
            <option value="payment">Payment & Billing</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="all">All Priorities</option>
            <option value="critical">🔴 Critical (12h TAT)</option>
            <option value="high">🟠 High (24h TAT)</option>
            <option value="medium">🟡 Medium (48h TAT)</option>
            <option value="low">⚪ Low (72h TAT)</option>
          </select>
        </div>

        {/* Department */}
        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="all">All Departments</option>
            <option value="support">Support Team</option>
            <option value="account">Account Team</option>
            <option value="delivery">Delivery Team</option>
            <option value="admin">Admin Team</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Overdue Toggle */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-red-600">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span>Overdue SLA Only</span>
          </label>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-2 text-slate-400" size={13} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader text="Loading Service & Support Tickets..." />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FiTool size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No Tickets Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Ticket ID & Type</th>
                  <th className="px-5 py-4">Franchisee & Cluster</th>
                  <th className="px-5 py-4">Assigned BDE & Dept</th>
                  <th className="px-5 py-4">Priority & SLA / TAT</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* ID & Type */}
                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900">{t.ticket_number}</div>
                      <div className="text-[11px] font-bold text-slate-500 capitalize mt-0.5">
                        {t.ticket_type?.replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Franchisee & Cluster */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{t.raised_by_name || 'Franchisee'}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        {t.cluster_name ? `Cluster: ${t.cluster_name}` : 'N/A'}
                      </div>
                    </td>

                    {/* BDE & Department */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{t.assigned_bde_name || 'BDE Unassigned'}</div>
                      <div className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block uppercase mt-0.5">
                        {t.assigned_department}
                      </div>
                    </td>

                    {/* Priority & TAT */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-black uppercase border ${
                          priorityConfig[t.priority] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.priority}
                      </span>
                      {t.is_overdue ? (
                        <div className="text-[11px] font-extrabold text-red-600 flex items-center gap-1 mt-1">
                          <FiAlertTriangle size={12} /> Overdue TAT
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-medium mt-1">
                          TAT: {t.resolution_tat_hours || 48}h
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase border ${
                          statusConfig[t.ticket_status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.ticket_status?.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(t)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Manage Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MANAGE TICKET MODAL ────────────────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Ticket #{selectedTicket.ticket_number}
                </h3>
                <p className="text-xs text-slate-500 capitalize">
                  {selectedTicket.ticket_type?.replace(/_/g, ' ')} • Priority: {selectedTicket.priority}
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-800">Franchisee: {selectedTicket.raised_by_name}</div>
              <div className="text-slate-600 font-medium">Description: {selectedTicket.problem_description}</div>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Update Status</label>
                  <select
                    value={updatingStatus}
                    onChange={(e) => setUpdatingStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting on Franchisee</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 uppercase mb-1 font-bold">Assign Department</label>
                  <select
                    value={updatingDepartment}
                    onChange={(e) => setUpdatingDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-800"
                  >
                    <option value="support">Support Team</option>
                    <option value="account">Account Team</option>
                    <option value="delivery">Delivery Team</option>
                    <option value="admin">Admin Team</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 uppercase mb-1 font-bold">Admin / Resolution Notes</label>
                <textarea
                  rows={3}
                  placeholder="Record resolution notes, internal action items or feedback..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 border rounded-lg font-bold text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold"
                >
                  {submitting ? 'Updating...' : 'Update Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
