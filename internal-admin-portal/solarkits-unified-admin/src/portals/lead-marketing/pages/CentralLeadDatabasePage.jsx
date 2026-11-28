import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaDatabase,
  FaSearch,
  FaPlus,
  FaFileExport,
  FaFileUpload,
  FaCheck,
  FaTimes,
  FaUserTie,
  FaBan,
  FaPowerOff,
  FaCodeBranch,
  FaPhoneAlt,
  FaEnvelope
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  SEGMENT_BADGE_COLORS,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';
import LeadMarketingBulkUploadModal from '../components/LeadMarketingBulkUploadModal';

export default function CentralLeadDatabasePage() {
  const [meta, setMeta] = useState({
    primary_segments: [],
    subgroups: [],
    settings: { lead_statuses: [], lead_sources: [] },
    custom_fields: [],
    countries: [],
    states: [],
    districts: [],
    clusters: [],
    bdes: []
  });

  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    primary_segment_key: 'ALL',
    subgroup_id: '',
    country_name: 'ALL',
    state_name: 'ALL',
    district_name: 'ALL',
    cluster_name: 'ALL',
    lead_status: 'ALL',
    assigned_bde_id: 'ALL',
    is_active: ''
  });

  // Bulk Action Controls
  const [bulkAction, setBulkAction] = useState('assign_bde');
  const [bulkValue, setBulkValue] = useState('');

  // Add Lead Modal & Dynamic Bulk Upload Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [newLead, setNewLead] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    country_code: '+91',
    mobile_number: '',
    country_name: 'India',
    state_name: '',
    district_name: '',
    cluster_name: '',
    primary_segment_key: 'franchisee_leads',
    subgroup_ids: [],
    lead_source: 'manual',
    gst_number: '',
    assigned_bde_id: '',
    lead_status: 'New',
    remarks: '',
    custom_fields: {}
  });
  const [savingLead, setSavingLead] = useState(false);

  // Lead Profile Drawer
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);
  const [activityForm, setActivityForm] = useState({
    activity_type: 'call',
    notes: '',
    outcome: '',
    next_followup_at: '',
    new_status: ''
  });
  const [mergeTargetId, setMergeTargetId] = useState('');

  useEffect(() => {
    leadMarketingHttp.get('/meta').then((r) => {
      if (r.data?.success && r.data?.data) setMeta(r.data.data);
    }).catch(() => { });
  }, []);

  const loadLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '50' });
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') qs.append(k, v);
      });
      const res = await leadMarketingHttp.get(`/leads?${qs.toString()}`);
      if (res.data?.success) {
        setLeads(res.data.data.leads || []);
        setPagination(res.data.data.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed to fetch central lead database') });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => loadLeads(1), 200);
    return () => clearTimeout(t);
  }, [loadLeads]);

  const filteredDistricts = useMemo(() => {
    if (!filters.state_name || filters.state_name === 'ALL') return meta.districts;
    const stObj = meta.states.find((s) => s.name?.toLowerCase() === filters.state_name.toLowerCase());
    if (!stObj) return meta.districts;
    return meta.districts.filter((d) => String(d.state_id) === String(stObj._id));
  }, [filters.state_name, meta.states, meta.districts]);

  const newLeadSubgroups = useMemo(
    () => meta.subgroups.filter((sg) => sg.primary_segment_key === newLead.primary_segment_key),
    [meta.subgroups, newLead.primary_segment_key]
  );

  const openLeadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await leadMarketingHttp.get(`/leads/${id}`);
      if (res.data?.success) {
        setActiveDetail(res.data.data);
        setActivityForm({ activity_type: 'call', notes: '', outcome: '', next_followup_at: '', new_status: res.data.data.lead.lead_status || 'New' });
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err) });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setSavingLead(true);
    setBanner(null);
    try {
      const res = await leadMarketingHttp.post('/leads', newLead);
      if (res.data?.success) {
        setShowAddModal(false);
        setNewLead((p) => ({ ...p, company_name: '', contact_person: '', email: '', mobile_number: '', gst_number: '', remarks: '', subgroup_ids: [] }));
        setBanner({ type: 'success', text: `Created lead ${res.data.data.lead_id} (${res.data.data.company_name})` });
        loadLeads(1);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, 'Failed creating lead') });
    } finally {
      setSavingLead(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await leadMarketingHttp.post('/leads/bulk-action', {
        lead_ids: selectedIds,
        action: bulkAction,
        value: bulkValue
      });
      setBanner({ type: 'success', text: `Bulk action applied to ${res.data?.modified_count ?? selectedIds.length} lead(s).` });
      setSelectedIds([]);
      loadLeads(pagination.page);
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err) });
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    if (!activeDetail?.lead?._id) return;
    try {
      await leadMarketingHttp.post(`/leads/${activeDetail.lead._id}/activities`, activityForm);
      await openLeadDetail(activeDetail.lead._id);
      loadLeads(pagination.page);
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err) });
    }
  };

  const handleMerge = async () => {
    if (!activeDetail?.lead?._id || !mergeTargetId) return;
    try {
      await leadMarketingHttp.post(`/leads/${activeDetail.lead._id}/merge`, { duplicate_lead_id: mergeTargetId });
      setBanner({ type: 'success', text: 'Duplicate lead merged cleanly retaining source & campaign histories.' });
      setMergeTargetId('');
      await openLeadDetail(activeDetail.lead._id);
      loadLeads(pagination.page);
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err) });
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaDatabase className="text-teal-600" /> Central Lead Database
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified master repository with unique Lead IDs, multi-segment tagging, BDE assignment, duplicate merge history &amp; suppression controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadLeadMarketingReport('lead_master', 'xlsx', filters)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <FaFileExport /> Export Filtered Excel
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FaFileUpload /> Bulk Upload Leads
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaPlus /> Add Lead
          </button>
        </div>
      </div>

      {banner && (
        <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${banner.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer"><FaTimes /></button>
        </div>
      )}

      {/* Search & Multi-Filter Matrix */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <FaSearch className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search Company, Contact, Email, Mobile, GST, or Lead ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
            />
          </div>
          <select
            value={filters.primary_segment_key}
            onChange={(e) => setFilters((p) => ({ ...p, primary_segment_key: e.target.value, subgroup_id: '' }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Primary Segments</option>
            {meta.primary_segments.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </select>
          <select
            value={filters.subgroup_id}
            onChange={(e) => setFilters((p) => ({ ...p, subgroup_id: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="">All Sub-Groups</option>
            {meta.subgroups
              .filter((sg) => filters.primary_segment_key === 'ALL' || sg.primary_segment_key === filters.primary_segment_key)
              .map((sg) => <option key={sg._id} value={sg._id}>{sg.name}</option>)}
          </select>
          <select
            value={filters.lead_status}
            onChange={(e) => setFilters((p) => ({ ...p, lead_status: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Lead Statuses</option>
            {(meta.settings?.lead_statuses || []).map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <select
            value={filters.country_name}
            onChange={(e) => setFilters((p) => ({ ...p, country_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Countries</option>
            {meta.countries.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
          </select>
          <select
            value={filters.state_name}
            onChange={(e) => setFilters((p) => ({ ...p, state_name: e.target.value, district_name: 'ALL' }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All States</option>
            {meta.states.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
          <select
            value={filters.district_name}
            onChange={(e) => setFilters((p) => ({ ...p, district_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Districts</option>
            {filteredDistricts.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
          </select>
          <select
            value={filters.cluster_name}
            onChange={(e) => setFilters((p) => ({ ...p, cluster_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Solarkits Clusters</option>
            {meta.clusters.map((cl) => <option key={cl._id} value={cl.cluster_name}>{cl.cluster_name}</option>)}
          </select>
          <select
            value={filters.assigned_bde_id}
            onChange={(e) => setFilters((p) => ({ ...p, assigned_bde_id: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All BDE Owners</option>
            <option value="UNASSIGNED">Unassigned Only</option>
            {meta.bdes.map((b) => <option key={b._id} value={b._id}>{b.full_name}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold">{selectedIds.length} Lead(s) Selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => { setBulkAction(e.target.value); setBulkValue(''); }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white"
            >
              <option value="assign_bde">Assign BDE</option>
              <option value="update_status">Update Status</option>
              <option value="change_segment">Switch Primary Segment</option>
              <option value="enable">Enable Leads</option>
              <option value="disable">Disable Leads</option>
              <option value="unsubscribe">Unsubscribe / Suppress</option>
            </select>
            {bulkAction === 'assign_bde' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">-- Choose BDE --</option>
                {meta.bdes.map((b) => <option key={b._id} value={b._id}>{b.full_name}</option>)}
              </select>
            )}
            {bulkAction === 'update_status' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">-- Choose Status --</option>
                {(meta.settings?.lead_statuses || []).map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
              </select>
            )}
            {bulkAction === 'change_segment' && (
              <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white">
                <option value="">-- Segment --</option>
                {meta.primary_segments.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            )}
            <button type="button" onClick={handleBulkAction} className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold cursor-pointer">
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Leads Master Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {loading ? 'Loading leads...' : `${pagination.total.toLocaleString('en-IN')} Total Matching Leads`}
          </span>
          <span className="text-slate-400">Page {pagination.page} of {pagination.totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3">
                  <input
                    type="checkbox"
                    checked={leads.length > 0 && selectedIds.length === leads.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? leads.map((l) => l._id) : [])}
                  />
                </th>
                <th className="py-2.5 px-3">Lead ID</th>
                <th className="py-2.5 px-3">Company / Contact</th>
                <th className="py-2.5 px-3">Email &amp; Phone</th>
                <th className="py-2.5 px-3">Segment &amp; Sub-Groups</th>
                <th className="py-2.5 px-3">Geography / Cluster</th>
                <th className="py-2.5 px-3">BDE &amp; Status</th>
                <th className="py-2.5 px-3">Milestones</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {leads.map((lead) => (
                <tr key={lead._id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 ${!lead.is_active ? 'opacity-60' : ''}`}>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead._id)}
                      onChange={(e) => setSelectedIds((p) => e.target.checked ? [...p, lead._id] : p.filter((x) => x !== lead._id))}
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[11px]">{lead.lead_id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{lead.company_name}</div>
                    <div className="text-[11px] text-slate-500">{lead.contact_person || '—'} {lead.gst_number && `• GST: ${lead.gst_number}`}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    <div className="font-mono">{lead.email || '—'}</div>
                    <div className="font-mono text-slate-500">{lead.mobile_number ? `${lead.country_code || '+91'} ${lead.mobile_number}` : '—'}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEGMENT_BADGE_COLORS[lead.primary_segment_key] || ''}`}>
                      {SEGMENT_LABELS[lead.primary_segment_key] || lead.primary_segment_key}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(lead.subgroup_names || []).map((sg) => (
                        <span key={sg} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9.5px] font-semibold">
                          {sg}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    <div>{[lead.district_name, lead.state_name].filter(Boolean).join(', ') || '—'}</div>
                    <div className="text-[10px] text-slate-500">{lead.country_name} {lead.cluster_name && `• ${lead.cluster_name}`}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{lead.lead_status}</div>
                    <div className="text-[10px] text-slate-500">{lead.assigned_bde_name || 'Unassigned'}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[10px] space-y-0.5">
                    {lead.milestones?.franchisee_converted?.is_converted && (
                      <div className="text-violet-600 font-bold">✓ Franchise Converted</div>
                    )}
                    {lead.milestones?.epc_registered?.is_registered && (
                      <div className="text-blue-600 font-bold">✓ Registered EPC</div>
                    )}
                    {lead.milestones?.epc_sales_converted?.has_order && (
                      <div className="text-emerald-600 font-bold">
                        ✓ {lead.milestones.epc_sales_converted.total_orders} Order(s)
                      </div>
                    )}
                    {lead.is_unsubscribed && <div className="text-rose-600 font-bold">Suppressed</div>}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => openLeadDetail(lead._id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-teal-600 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No leads matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2 text-xs">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadLeads(pagination.page - 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadLeads(pagination.page + 1)}
              className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateLead} className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black">Add Marketing Lead (Unique Lead ID Auto-Generated)</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="cursor-pointer"><FaTimes /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1">Company Name *</label>
                <input required value={newLead.company_name} onChange={(e) => setNewLead((p) => ({ ...p, company_name: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Contact Person</label>
                <input value={newLead.contact_person} onChange={(e) => setNewLead((p) => ({ ...p, contact_person: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Email ID</label>
                <input type="email" value={newLead.email} onChange={(e) => setNewLead((p) => ({ ...p, email: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
              </div>
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="font-bold block mb-1">Code</label>
                  <input value={newLead.country_code} onChange={(e) => setNewLead((p) => ({ ...p, country_code: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                </div>
                <div className="flex-1">
                  <label className="font-bold block mb-1">Mobile Number</label>
                  <input value={newLead.mobile_number} onChange={(e) => setNewLead((p) => ({ ...p, mobile_number: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Primary Segment *</label>
                <select value={newLead.primary_segment_key} onChange={(e) => setNewLead((p) => ({ ...p, primary_segment_key: e.target.value, subgroup_ids: [] }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold">
                  {meta.primary_segments.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Lead Source</label>
                <select value={newLead.lead_source} onChange={(e) => setNewLead((p) => ({ ...p, lead_source: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {(meta.settings?.lead_sources || []).map((ls) => <option key={ls.key} value={ls.key}>{ls.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Country</label>
                <select value={newLead.country_name} onChange={(e) => setNewLead((p) => ({ ...p, country_name: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {meta.countries.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">State</label>
                <select value={newLead.state_name} onChange={(e) => setNewLead((p) => ({ ...p, state_name: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <option value="">Select State</option>
                  {meta.states.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">District</label>
                <input value={newLead.district_name} onChange={(e) => setNewLead((p) => ({ ...p, district_name: e.target.value }))} placeholder="District name" className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
              </div>
              <div>
                <label className="font-bold block mb-1">Solarkits Cluster</label>
                <select value={newLead.cluster_name} onChange={(e) => setNewLead((p) => ({ ...p, cluster_name: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <option value="">Auto-resolve from district</option>
                  {meta.clusters.map((cl) => <option key={cl._id} value={cl.cluster_name}>{cl.cluster_name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">GST Number</label>
                <input value={newLead.gst_number} onChange={(e) => setNewLead((p) => ({ ...p, gst_number: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 uppercase font-mono" />
              </div>
              <div>
                <label className="font-bold block mb-1">Assigned BDE</label>
                <select value={newLead.assigned_bde_id} onChange={(e) => setNewLead((p) => ({ ...p, assigned_bde_id: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <option value="">Unassigned</option>
                  {meta.bdes.map((b) => <option key={b._id} value={b._id}>{b.full_name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1.5">Sub-Groups (Multi-Select Tags)</label>
              <div className="flex flex-wrap gap-1.5">
                {newLeadSubgroups.map((sg) => {
                  const checked = newLead.subgroup_ids.includes(sg._id);
                  return (
                    <button
                      key={sg._id}
                      type="button"
                      onClick={() => setNewLead((p) => ({
                        ...p,
                        subgroup_ids: checked ? p.subgroup_ids.filter((x) => x !== sg._id) : [...p.subgroup_ids, sg._id]
                      }))}
                      className={`px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${checked ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}
                    >
                      {checked && <FaCheck className="inline mr-1 text-[9px]" />}{sg.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-bold block mb-1">Remarks</label>
              <textarea rows={2} value={newLead.remarks} onChange={(e) => setNewLead((p) => ({ ...p, remarks: e.target.value }))} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={savingLead} className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer">
                {savingLead ? 'Saving...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slide-Over Lead 360 Drawer */}
      {(activeDetail || detailLoading) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 h-full overflow-y-auto p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-mono font-bold text-teal-600">{activeDetail?.lead?.lead_id}</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeDetail?.lead?.company_name}</h3>
              </div>
              <button type="button" onClick={() => setActiveDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer"><FaTimes /></button>
            </div>

            {activeDetail?.lead && (
              <>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div><span className="text-slate-400">Contact:</span> <strong>{activeDetail.lead.contact_person || '—'}</strong></div>
                  <div><span className="text-slate-400">Email:</span> <strong>{activeDetail.lead.email || '—'}</strong></div>
                  <div><span className="text-slate-400">Mobile:</span> <strong>{activeDetail.lead.mobile_number || '—'}</strong></div>
                  <div><span className="text-slate-400">GSTIN:</span> <strong>{activeDetail.lead.gst_number || '—'}</strong></div>
                  <div><span className="text-slate-400">Segment:</span> <strong>{SEGMENT_LABELS[activeDetail.lead.primary_segment_key]}</strong></div>
                  <div><span className="text-slate-400">BDE:</span> <strong>{activeDetail.lead.assigned_bde_name || 'Unassigned'}</strong></div>
                  <div className="col-span-2"><span className="text-slate-400">Geography:</span> <strong>{[activeDetail.lead.district_name, activeDetail.lead.state_name, activeDetail.lead.country_name, activeDetail.lead.cluster_name, activeDetail.lead.pincode].filter(Boolean).join(' • ')}</strong></div>
                  {activeDetail.lead.address_line && (
                    <div className="col-span-2"><span className="text-slate-400">Address:</span> <strong>{activeDetail.lead.address_line}</strong></div>
                  )}
                </div>

                {activeDetail.lead.custom_fields && Object.keys(activeDetail.lead.custom_fields).length > 0 && (
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-1.5">
                    <div className="font-bold text-indigo-800 dark:text-indigo-300">Dynamic &amp; Custom Fields</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(activeDetail.lead.custom_fields).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-slate-500">{k.replace(/_/g, ' ')}:</span>{' '}
                          <strong className="text-slate-900 dark:text-white">{String(v || '—')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await leadMarketingHttp.put(`/leads/${activeDetail.lead._id}`, { is_active: !activeDetail.lead.is_active });
                      openLeadDetail(activeDetail.lead._id);
                      loadLeads(pagination.page);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaPowerOff /> {activeDetail.lead.is_active ? 'Disable Lead' : 'Enable Lead'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await leadMarketingHttp.put(`/leads/${activeDetail.lead._id}`, { is_unsubscribed: !activeDetail.lead.is_unsubscribed });
                      openLeadDetail(activeDetail.lead._id);
                      loadLeads(pagination.page);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaBan /> {activeDetail.lead.is_unsubscribed ? 'Remove Suppression' : 'Suppress / Unsubscribe'}
                  </button>
                </div>

                {/* Log BDE Activity */}
                <form onSubmit={handleLogActivity} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="font-extrabold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <FaPhoneAlt className="text-teal-600" /> Log Follow-up Activity
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={activityForm.activity_type} onChange={(e) => setActivityForm((p) => ({ ...p, activity_type: e.target.value }))} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <option value="call">Phone Call</option>
                      <option value="meeting">Meeting</option>
                      <option value="proposal_shared">Proposal Shared</option>
                      <option value="quotation_shared">Quotation Shared</option>
                      <option value="note">Internal Note</option>
                    </select>
                    <select value={activityForm.new_status} onChange={(e) => setActivityForm((p) => ({ ...p, new_status: e.target.value }))} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      {(meta.settings?.lead_statuses || []).map((st) => <option key={st.name} value={st.name}>{st.name}</option>)}
                    </select>
                    <input type="date" value={activityForm.next_followup_at} onChange={(e) => setActivityForm((p) => ({ ...p, next_followup_at: e.target.value }))} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                  </div>
                  <div className="flex gap-2">
                    <input value={activityForm.notes} onChange={(e) => setActivityForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Follow-up notes..." className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900" />
                    <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold cursor-pointer">Save</button>
                  </div>
                </form>

                {/* Merge Duplicate */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="font-extrabold flex items-center gap-1.5"><FaCodeBranch className="text-amber-600" /> Merge Another Duplicate Lead Into This Record</div>
                  <div className="flex gap-2">
                    <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <option value="">Select duplicate lead from current page to merge...</option>
                      {leads.filter((x) => x._id !== activeDetail.lead._id).map((x) => (
                        <option key={x._id} value={x._id}>{x.lead_id} - {x.company_name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleMerge} className="px-3 py-2 rounded-lg bg-amber-600 text-white font-bold cursor-pointer">Merge</button>
                  </div>
                  {(activeDetail.lead.merge_history || []).length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      Merged: {activeDetail.lead.merge_history.map((m) => m.merged_from_lead_id).join(', ')}
                    </div>
                  )}
                </div>

                {/* Source History & Campaign Participation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold">Multi-Sheet Source History ({(activeDetail.lead.source_histories || []).length})</div>
                    {(activeDetail.lead.source_histories || []).map((sh, i) => (
                      <div key={i} className="text-[10.5px] bg-slate-50 dark:bg-slate-900 p-2 rounded">
                        <strong>{sh.source}</strong> • {sh.file_name || 'CRM'} {sh.sheet_name && `(${sh.sheet_name})`}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="font-bold flex items-center gap-1"><FaEnvelope className="text-indigo-500" /> Campaign Participation ({(activeDetail.campaign_history || []).length})</div>
                    {(activeDetail.campaign_history || []).map((ch) => (
                      <div key={ch._id} className="text-[10.5px] bg-slate-50 dark:bg-slate-900 p-2 rounded">
                        <strong>{ch.campaign_id?.campaign_name || 'Campaign'}</strong> • {ch.status} • Opens: {ch.open_count || 0} • Clicks: {ch.click_count || 0}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-2">
                  <div className="font-extrabold">Complete Activity History ({(activeDetail.activities || []).length})</div>
                  {(activeDetail.activities || []).map((act) => (
                    <div key={act._id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex justify-between">
                      <div>
                        <span className="font-bold uppercase text-[10px] text-teal-600">{act.activity_type}</span> — {act.notes}
                        <div className="text-[10px] text-slate-400">By {act.actor_name}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{new Date(act.occurred_at).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* BDE-Style Dynamic Bulk Upload Modal */}
      <LeadMarketingBulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        meta={meta}
        defaultSegmentKey={filters.primary_segment_key !== 'ALL' ? filters.primary_segment_key : 'franchisee_leads'}
        onImportSuccess={(res) => {
          setBanner({
            type: 'success',
            text: res?.message || 'Bulk leads imported into Central Lead Database.',
          });
          loadLeads(1);
        }}
      />
    </div>
  );
}
