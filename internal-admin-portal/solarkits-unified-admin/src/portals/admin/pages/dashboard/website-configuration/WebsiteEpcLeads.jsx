import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiCheckCircle,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiPhone,
  FiMapPin,
  FiLayers,
  FiCalendar,
  FiExternalLink,
  FiAlertCircle,
  FiCheckSquare,
  FiSquare,
  FiSend,
} from 'react-icons/fi';
import { authHeaderObj } from '../../../app/authHeader';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  headers: {
    ...authHeaderObj(),
    'Content-Type': 'application/json',
  },
});

export default function WebsiteEpcLeads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({
    total_leads: 0,
    unassigned_count: 0,
    assigned_count: 0,
    converted_count: 0,
  });
  const [availableStates, setAvailableStates] = useState([]);
  const [availableBdes, setAvailableBdes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bdeFilter, setBdeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  // Multi-Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [targetBdeId, setTargetBdeId] = useState('');

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Leads from Backend
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
      });
      if (search.trim()) params.append('search', search.trim());
      if (stateFilter !== 'all') params.append('state_name', stateFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (bdeFilter !== 'all') params.append('bde_id', bdeFilter);

      const res = await axios.get(`${API_BASE}/website-leads/list?${params.toString()}`, getHeaders());
      if (res.data?.success) {
        setLeads(res.data.leads || []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.pagination) setPagination(res.data.pagination);
        if (res.data.available_states) setAvailableStates(res.data.available_states);
        if (res.data.available_bdes) setAvailableBdes(res.data.available_bdes);
      }
    } catch (err) {
      console.error('Error fetching website leads:', err);
      showToast(err.response?.data?.message || 'Failed to load website leads', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, statusFilter, bdeFilter, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle Select All
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = leads.map((l) => l._id);
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds([]);
    }
  };

  // Handle Toggle Single Row
  const handleToggleSelect = (id) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Assign Selected Leads to BDE
  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0) {
      showToast('Please select at least one lead to assign', 'error');
      return;
    }
    if (!targetBdeId) {
      showToast('Please select a BDE from the dropdown', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/website-leads/bulk-assign`,
        {
          lead_ids: selectedLeadIds,
          bde_id: targetBdeId,
        },
        getHeaders()
      );

      if (res.data?.success) {
        showToast(res.data.message || `Successfully assigned ${selectedLeadIds.length} leads!`, 'success');
        setSelectedLeadIds([]);
        setTargetBdeId('');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error bulk assigning leads:', err);
      showToast(err.response?.data?.message || 'Failed to assign leads', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Single Lead BDE Assignment or Status Change
  const handleUpdateLead = async (leadId, updatePayload) => {
    try {
      const res = await axios.patch(`${API_BASE}/website-leads/${leadId}`, updatePayload, getHeaders());
      if (res.data?.success) {
        showToast('Lead updated successfully', 'success');
        fetchLeads();
      }
    } catch (err) {
      console.error('Error updating lead:', err);
      showToast(err.response?.data?.message || 'Failed to update lead', 'error');
    }
  };

  const isAllSelected = useMemo(() => {
    return leads.length > 0 && leads.every((l) => selectedLeadIds.includes(l._id));
  }, [leads, selectedLeadIds]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white shadow-rose-600/30'
              : 'bg-emerald-600 text-white shadow-emerald-600/30'
          }`}
        >
          {toast.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-sm">
              <FiLayers className="text-amber-300" />
              Website EPC Lead Acquisition Engine
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              Website EPC Leads & Bulk Kit Inquiries
            </h1>
            <p className="mt-1 text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Real-time B2B bulk kit inquiries submitted by EPC contractors from the Solar Store banner. Multi-select and assign directly to active regional BDEs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all backdrop-blur-md cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total EPC Leads
            </span>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/50 p-2 text-blue-600 dark:text-blue-400">
              <FiUsers className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.total_leads}
            </span>
            <span className="text-xs font-medium text-slate-500">Website queries</span>
          </div>
        </div>

        {/* Unassigned Leads */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Awaiting BDE
            </span>
            <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2 text-amber-600 dark:text-amber-400">
              <FiUserX className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {stats.unassigned_count}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Pending Assignment</span>
          </div>
        </div>

        {/* Assigned Leads */}
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Assigned to BDE
            </span>
            <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/50 p-2 text-indigo-600 dark:text-indigo-400">
              <FiUserCheck className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {stats.assigned_count}
            </span>
            <span className="text-xs font-medium text-indigo-600">Under follow-up</span>
          </div>
        </div>

        {/* Converted / Contacted */}
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Converted
            </span>
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/50 p-2 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="text-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {stats.converted_count}
            </span>
            <span className="text-xs font-medium text-emerald-600">Deals closed</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (appears when 1 or more leads are checked) */}
      {selectedLeadIds.length > 0 && (
        <div className="sticky top-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-4 text-white shadow-2xl border border-indigo-500/30">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-sm font-black text-white">
              {selectedLeadIds.length}
            </span>
            <div>
              <span className="font-bold text-sm">
                {selectedLeadIds.length} Lead{selectedLeadIds.length > 1 ? 's' : ''} Selected
              </span>
              <p className="text-xs text-slate-300">
                Choose a BDE to assign these leads in bulk.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={targetBdeId}
              onChange={(e) => setTargetBdeId(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              <option value="" className="text-slate-900">
                -- Select BDE to Assign --
              </option>
              {availableBdes.map((bde) => (
                <option key={bde._id} value={bde._id} className="text-slate-900">
                  {bde.full_name} ({bde.bde_id}) - {bde.mobile_number}
                </option>
              ))}
            </select>

            <button
              onClick={handleBulkAssign}
              disabled={actionLoading || !targetBdeId}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Assigning...
                </>
              ) : (
                <>
                  <FiSend className="text-xs" />
                  ⚡ Assign Selected Leads
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedLeadIds([])}
              className="rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <FiSearch className="absolute left-3.5 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Contractor Name, Phone, Lead ID..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* State Filter */}
          <div>
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All States (Scope)</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="unassigned">⚠️ Unassigned / New</option>
              <option value="assigned">⚡ Assigned to BDE</option>
              <option value="contacted">📞 Contacted</option>
              <option value="in_progress">🔄 In Progress</option>
              <option value="converted">✅ Converted</option>
              <option value="rejected">❌ Closed / Rejected</option>
            </select>
          </div>

          {/* Assigned BDE Filter */}
          <div>
            <select
              value={bdeFilter}
              onChange={(e) => {
                setBdeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Assigned BDEs</option>
              <option value="unassigned">⚠️ Unassigned</option>
              {availableBdes.map((bde) => (
                <option key={bde._id} value={bde._id}>
                  {bde.full_name} ({bde.bde_id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Lead ID & Time</th>
                <th className="py-3.5 px-4">Contractor / EPC Info</th>
                <th className="py-3.5 px-4">Target Region</th>
                <th className="py-3.5 px-4">Kit Requirement</th>
                <th className="py-3.5 px-4">Assigned BDE</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      Loading website EPC leads...
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiLayers className="text-3xl text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">No website EPC leads found.</p>
                      <p className="text-xs text-slate-400">
                        Inquiries submitted from the Solar Store website bottom banner will appear here automatically.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead._id);
                  const isUnassigned = !lead.assigned_bde_id && lead.status === 'new';

                  return (
                    <tr
                      key={lead._id}
                      className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(lead._id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Lead ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {lead.lead_id}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                          <FiCalendar className="text-[9px]" />
                          {new Date(lead.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Contractor / EPC Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {lead.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <a
                            href={`tel:+91${lead.phone}`}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <FiPhone className="text-[10px]" /> +91 {lead.phone}
                          </a>
                          <a
                            href={`https://wa.me/91${lead.phone}?text=Hello%20${encodeURIComponent(
                              lead.name
                            )},%20thank%20you%20for%20your%20bulk%20solar%20kits%20inquiry%20on%20SolarKits!`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </td>

                      {/* Region (State & Pincode) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <FiMapPin className="text-amber-500 shrink-0 text-xs" />
                          <span>{lead.state_name}</span>
                        </div>
                        {lead.pincode && (
                          <div className="mt-0.5 text-[10px] font-mono text-slate-400 pl-4">
                            PIN: {lead.pincode}
                          </div>
                        )}
                      </td>

                      {/* Kit Requirement */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {lead.project_type || 'Bulk Solar Kits'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {lead.estimated_quantity || 'Bulk Order'}
                        </div>
                      </td>

                      {/* Assigned BDE */}
                      <td className="py-3.5 px-4">
                        {lead.assigned_bde_id ? (
                          <div>
                            <div className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                              <FiUserCheck className="text-xs" />
                              {lead.assigned_bde_name || lead.assigned_bde_id.full_name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {lead.assigned_bde_phone || lead.assigned_bde_id.mobile_number}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <FiAlertCircle className="text-[9px]" /> Awaiting BDE
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLead(lead._id, { status: e.target.value })}
                          className={`rounded-lg px-2 py-1 text-[11px] font-bold outline-none border cursor-pointer ${
                            lead.status === 'new'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : lead.status === 'assigned'
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              : lead.status === 'contacted'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                              : lead.status === 'converted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <option value="new">New / Pending</option>
                          <option value="assigned">Assigned</option>
                          <option value="contacted">Contacted</option>
                          <option value="in_progress">In Progress</option>
                          <option value="converted">Converted ✅</option>
                          <option value="rejected">Closed / Rejected</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <select
                          value={lead.assigned_bde_id?._id || ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              handleUpdateLead(lead._id, { assigned_bde_id: 'unassign' });
                            } else {
                              handleUpdateLead(lead._id, { assigned_bde_id: e.target.value });
                            }
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">{lead.assigned_bde_id ? 'Change BDE' : '+ Assign BDE'}</option>
                          {availableBdes.map((bde) => (
                            <option key={bde._id} value={bde._id}>
                              {bde.full_name} ({bde.bde_id})
                            </option>
                          ))}
                        </select>
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
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
            <span>
              Showing page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{pagination.pages}</strong> ({pagination.total} leads)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
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
