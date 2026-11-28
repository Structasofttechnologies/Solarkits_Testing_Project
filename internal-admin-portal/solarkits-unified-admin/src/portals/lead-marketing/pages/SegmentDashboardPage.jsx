import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaStore,
  FaUserPlus,
  FaShoppingCart,
  FaSyncAlt,
  FaFileExport,
  FaFileUpload,
  FaEnvelopeOpenText
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';
import LeadMarketingBulkUploadModal from '../components/LeadMarketingBulkUploadModal';

const SEGMENT_ICON = {
  franchisee_leads: FaStore,
  epc_signup_leads: FaUserPlus,
  epc_sales_leads: FaShoppingCart
};

export default function SegmentDashboardPage({ segmentKey }) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ subgroups: [], settings: { lead_statuses: [] }, states: [], bdes: [], countries: [] });
  const [data, setData] = useState({ kpis: {}, subgroup_breakdown: [], leads: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  const [filters, setFilters] = useState({
    subgroup_id: '',
    lead_status: 'ALL',
    assigned_bde_id: 'ALL',
    country_name: 'ALL',
    state_name: 'ALL',
    date_preset: 'all'
  });

  useEffect(() => {
    leadMarketingHttp.get('/meta').then((r) => {
      if (r.data?.success) setMeta(r.data.data);
    }).catch(() => {});
  }, []);

  const loadSegmentData = useCallback(async (sync = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (sync) qs.append('sync', 'true');
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') qs.append(k, v);
      });
      const res = await leadMarketingHttp.get(`/dashboards/segment/${segmentKey}?${qs.toString()}`);
      if (res.data?.success) setData(res.data.data);
    } catch (err) {
      setError(extractError(err, 'Failed loading segment dashboard'));
    } finally {
      setLoading(false);
    }
  }, [segmentKey, filters]);

  useEffect(() => {
    loadSegmentData(false);
  }, [loadSegmentData]);

  const Icon = SEGMENT_ICON[segmentKey] || FaStore;
  const kpiEntries = Object.entries(data.kpis || {}).map(([k, v]) => ({
    key: k,
    label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: v
  }));

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Icon className="text-teal-600" /> {SEGMENT_LABELS[segmentKey] || segmentKey} Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live segment KPIs, sub-group counts, BDE/geography filters &amp; verified platform conversions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadSegmentData(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaSyncAlt /> Sync Live Conversions
          </button>
          <button
            type="button"
            onClick={() => downloadLeadMarketingReport('segment_wise', 'xlsx', { ...filters, primary_segment_key: segmentKey })}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaFileExport /> Export Excel
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaFileUpload /> Bulk Upload Leads
          </button>
          <button
            type="button"
            onClick={() => navigate(`/lead-marketing-panel/campaigns?segment=${segmentKey}`)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaEnvelopeOpenText /> Launch Email Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">{error}</div>
      )}

      {/* Dynamic Segment KPI Grid (FRD 6.1 / 6.2 / 6.3) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiEntries.map((item) => (
          <div key={item.key} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10.5px] font-bold uppercase text-slate-400">{item.label}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
        <select value={filters.subgroup_id} onChange={(e) => setFilters((p) => ({ ...p, subgroup_id: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="">All Sub-Groups</option>
          {(meta.subgroups || []).filter((sg) => sg.primary_segment_key === segmentKey).map((sg) => (
            <option key={sg._id} value={sg._id}>{sg.name}</option>
          ))}
        </select>
        <select value={filters.lead_status} onChange={(e) => setFilters((p) => ({ ...p, lead_status: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="ALL">All Statuses</option>
          {(meta.settings?.lead_statuses || []).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters.assigned_bde_id} onChange={(e) => setFilters((p) => ({ ...p, assigned_bde_id: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="ALL">All BDEs</option>
          {(meta.bdes || []).map((b) => <option key={b._id} value={b._id}>{b.full_name}</option>)}
        </select>
        <select value={filters.country_name} onChange={(e) => setFilters((p) => ({ ...p, country_name: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="ALL">All Countries</option>
          {(meta.countries || []).map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filters.state_name} onChange={(e) => setFilters((p) => ({ ...p, state_name: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="ALL">All States</option>
          {(meta.states || []).map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters.date_preset} onChange={(e) => setFilters((p) => ({ ...p, date_preset: e.target.value }))} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="current_month">Current Month</option>
          <option value="financial_year">Financial Year</option>
        </select>
      </div>

      {/* Sub-Group Distribution Pills */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="text-xs font-extrabold uppercase text-slate-500">Sub-Group Breakdown</div>
        <div className="flex flex-wrap gap-2">
          {(data.subgroup_breakdown || []).map((sg) => (
            <button
              key={sg._id}
              type="button"
              onClick={() => setFilters((p) => ({ ...p, subgroup_id: p.subgroup_id === sg._id ? '' : sg._id }))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-2 ${
                filters.subgroup_id === sg._id
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{sg.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[10px]">{sg.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Segment Lead Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="py-2.5 px-3">Lead ID</th>
              <th className="py-2.5 px-3">Company</th>
              <th className="py-2.5 px-3">Contact / Email / Mobile</th>
              <th className="py-2.5 px-3">Sub-Groups</th>
              <th className="py-2.5 px-3">Geography / Cluster</th>
              <th className="py-2.5 px-3">BDE</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {(data.leads || []).map((l) => (
              <tr key={l._id}>
                <td className="py-2.5 px-3 font-mono font-bold text-[11px]">{l.lead_id}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{l.company_name}</td>
                <td className="py-2.5 px-3 text-[11px]">
                  <div>{l.contact_person || '—'}</div>
                  <div className="text-slate-500">{l.email || l.mobile_number}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex flex-wrap gap-1">
                    {(l.subgroup_names || []).map((n) => (
                      <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold">{n}</span>
                    ))}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-[11px]">{[l.district_name, l.state_name, l.cluster_name].filter(Boolean).join(', ')}</td>
                <td className="py-2.5 px-3">{l.assigned_bde_name || 'Unassigned'}</td>
                <td className="py-2.5 px-3 font-semibold">{l.lead_status}</td>
              </tr>
            ))}
            {(data.leads || []).length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {loading ? 'Loading segment database...' : 'No leads in this segment matching current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadMarketingBulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        meta={meta}
        defaultSegmentKey={segmentKey}
        onImportSuccess={() => loadSegmentData(false)}
      />
    </div>
  );
}
