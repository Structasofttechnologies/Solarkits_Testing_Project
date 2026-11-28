import React, { useCallback, useEffect, useState } from 'react';
import {
  FaFileExport,
  FaFileExcel,
  FaFilePdf,
  FaTable,
  FaSyncAlt
} from 'react-icons/fa';
import {
  leadMarketingHttp,
  extractError,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';

const REPORT_TYPES = [
  { id: 'lead_master', name: '01 · Lead Master Report', desc: 'Complete de-duplicated central lead master records & contact details' },
  { id: 'segment_wise', name: '02 · Segment-Wise Lead Report', desc: 'Filtered lead database organized by Primary Marketing Segment' },
  { id: 'subgroup_wise', name: '03 · Sub-Group Lead Report', desc: 'Sub-group tag distribution across Franchisee, Signup & Sales leads' },
  { id: 'geo_wise', name: '04 · Country/State/District/Cluster Report', desc: 'Geographical distribution matched with SolarKits cluster masters' },
  { id: 'bde_allocation', name: '05 · BDE-Wise Lead Allocation Report', desc: 'Sales ownership allocation & conversion percentages per BDE' },
  { id: 'campaign_performance', name: '06 · Campaign Performance Report', desc: 'Delivery, opens, clicks & conversions across email campaigns' },
  { id: 'campaign_geo', name: '07 · Campaign Geographical Report', desc: 'State & district level campaign delivery and conversion breakdown' },
  { id: 'lead_engagement', name: '08 · Lead Engagement Report', desc: 'Recipient opens, clicks, unsubscribe flags & bot-prefetch detection' },
  { id: 'inquiry_quotation', name: '09 · Inquiry & Quotation Report', desc: 'Interested prospects, proposals shared & commercial quotes generated' },
  { id: 'lead_to_order', name: '10 · Lead-to-Order Attribution Report', desc: 'End-to-end commercial orders attributed to first/last-touch campaigns' },
  { id: 'franchisee_conversion', name: '11 · Franchisee Conversion Report', desc: 'Converted franchisee applications & agreements linked to leads' },
  { id: 'epc_registration', name: '12 · EPC Registration Report', desc: 'Verified EPC account signups originating from Lead Marketing campaigns' },
  { id: 'epc_sales_revenue', name: '13 · EPC Sales & Revenue Report', desc: 'Commercial SolarKits order revenue (INR) & capacity (kW)' },
  { id: 'combined_performance', name: '14 · Combined Executive Performance', desc: 'Master leadership roll-up of campaign conversion metrics' }
];

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'financial_year', label: 'Financial Year' }
];

export default function LeadReportsExportPage() {
  const [selectedType, setSelectedType] = useState('lead_master');
  const [meta, setMeta] = useState({
    subgroups: [],
    countries: [],
    states: [],
    districts: [],
    clusters: [],
    bdes: []
  });
  const [filters, setFilters] = useState({
    primary_segment_key: 'ALL',
    subgroup_id: '',
    country_name: 'ALL',
    state_name: 'ALL',
    district_name: 'ALL',
    cluster_name: 'ALL',
    assigned_bde_id: 'ALL',
    date_preset: 'all'
  });

  const [preview, setPreview] = useState({ title: '', columns: [], rows: [], total_rows: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    leadMarketingHttp
      .get('/meta')
      .then((res) => {
        if (res.data?.success && res.data?.data) setMeta(res.data.data);
      })
      .catch(() => {});
  }, []);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ type: selectedType });
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') qs.append(k, v);
      });
      const res = await leadMarketingHttp.get(`/reports/preview?${qs.toString()}`);
      if (res.data?.success) setPreview(res.data.data);
    } catch (err) {
      setError(extractError(err, 'Failed loading report preview'));
    } finally {
      setLoading(false);
    }
  }, [selectedType, filters]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleExport = async (format) => {
    setExporting(true);
    setError(null);
    try {
      await downloadLeadMarketingReport(selectedType, format, filters);
    } catch (err) {
      setError(extractError(err, `Failed downloading ${format.toUpperCase()} report`));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaFileExport className="text-teal-600" />
            <span>13 · Reports &amp; Multi-Format Export Center</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate live database reports across all 14 FRD analytical datasets and download binary Excel (.xlsx) or formatted PDF files.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchPreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-bold cursor-pointer"
          >
            <FaSyncAlt /> Refresh Preview
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <FaFileExcel /> Download Excel (.xlsx)
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <FaFilePdf /> Download PDF (.pdf)
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Report Selector Grid + Filters */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 max-h-[560px] overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
            Select One of 14 Official FRD Reports
          </div>
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => setSelectedType(rt.id)}
              className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                selectedType === rt.id
                  ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-xs'
                  : 'bg-slate-50/70 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/40'
              }`}
            >
              <div className="text-xs font-black text-slate-900 dark:text-white">{rt.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{rt.desc}</div>
            </button>
          ))}
        </div>

        <div className="xl:col-span-8 space-y-4">
          {/* Dynamic Report Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <select
              value={filters.primary_segment_key}
              onChange={(e) => setFilters((f) => ({ ...f, primary_segment_key: e.target.value, subgroup_id: '' }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="ALL">All Primary Segments</option>
              <option value="franchisee_leads">Franchisee Leads</option>
              <option value="epc_signup_leads">EPC Signup Leads</option>
              <option value="epc_sales_leads">EPC Sales Leads</option>
            </select>

            <select
              value={filters.subgroup_id}
              onChange={(e) => setFilters((f) => ({ ...f, subgroup_id: e.target.value }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="">All Sub-Groups</option>
              {meta.subgroups.map((sg) => (
                <option key={sg._id} value={sg._id}>{sg.name}</option>
              ))}
            </select>

            <select
              value={filters.state_name}
              onChange={(e) => setFilters((f) => ({ ...f, state_name: e.target.value, district_name: 'ALL' }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="ALL">All States</option>
              {meta.states.map((s) => (
                <option key={s._id || s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            <select
              value={filters.district_name}
              onChange={(e) => setFilters((f) => ({ ...f, district_name: e.target.value }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="ALL">All Districts</option>
              {meta.districts.map((d) => (
                <option key={d._id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>

            <select
              value={filters.cluster_name}
              onChange={(e) => setFilters((f) => ({ ...f, cluster_name: e.target.value }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="ALL">All Clusters</option>
              {meta.clusters.map((cl) => {
                const lbl = cl.cluster_name || cl.name;
                return <option key={cl._id || lbl} value={lbl}>{lbl}</option>;
              })}
            </select>

            <select
              value={filters.assigned_bde_id}
              onChange={(e) => setFilters((f) => ({ ...f, assigned_bde_id: e.target.value }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="ALL">All BDEs</option>
              {meta.bdes.map((b) => (
                <option key={b._id} value={b._id}>{b.full_name || b.name || b.email}</option>
              ))}
            </select>

            <select
              value={filters.date_preset}
              onChange={(e) => setFilters((f) => ({ ...f, date_preset: e.target.value }))}
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              {DATE_PRESETS.map((dp) => (
                <option key={dp.id} value={dp.id}>{dp.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setFilters({
                  primary_segment_key: 'ALL',
                  subgroup_id: '',
                  country_name: 'ALL',
                  state_name: 'ALL',
                  district_name: 'ALL',
                  cluster_name: 'ALL',
                  assigned_bde_id: 'ALL',
                  date_preset: 'all'
                })
              }
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-600 font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* Live Table Preview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="font-black text-sm flex items-center gap-2">
                <FaTable className="text-teal-600" />
                <span>{preview.title || 'Live Dataset Preview'}</span>
              </div>
              <div className="text-xs font-bold text-slate-500">
                Total Matching Rows: <strong className="text-teal-600">{preview.total_rows ?? 0}</strong> (previewing up to 200)
              </div>
            </div>

            <div className="overflow-auto max-h-[440px]">
              {loading ? (
                <div className="p-10 text-center text-xs text-slate-400">Loading live MongoDB dataset preview...</div>
              ) : (
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                    <tr>
                      {(preview.columns || []).map((col) => (
                        <th key={col} className="px-3.5 py-2.5 font-bold">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {(preview.rows || []).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-slate-700 dark:text-slate-200">
                            {cell !== undefined && cell !== null && cell !== '' ? String(cell) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {(preview.rows || []).length === 0 && (
                      <tr>
                        <td colSpan={Math.max(1, (preview.columns || []).length)} className="px-4 py-10 text-center text-slate-400">
                          No rows returned for this report &amp; filter combination.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
