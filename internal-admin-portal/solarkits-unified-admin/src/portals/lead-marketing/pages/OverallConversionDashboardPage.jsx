import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  FaTrophy,
  FaSyncAlt,
  FaFileExport,
  FaCalendarAlt,
  FaArrowRight
} from 'react-icons/fa';
import LeadGeoMapVisualizer from '../components/LeadGeoMapVisualizer';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'financial_year', label: 'Financial Year' },
  { id: 'custom', label: 'Custom Range' }
];

const SEGMENT_TABS = [
  { id: '', label: 'All Segments Combined' },
  { id: 'franchisee_leads', label: 'Franchisee Leads' },
  { id: 'epc_signup_leads', label: 'EPC Signup Leads' },
  { id: 'epc_sales_leads', label: 'EPC Sales Leads' }
];

export default function OverallConversionDashboardPage() {
  const navigate = useNavigate();
  const [attributionModel, setAttributionModel] = useState('last_touch');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [mapMode, setMapMode] = useState('india');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const loadOverall = useCallback(
    async (runSync = false) => {
      if (runSync) setSyncing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ attribution_model: attributionModel });
        if (datePreset && datePreset !== 'custom') qs.append('date_preset', datePreset);
        if (datePreset === 'custom' && startDate) qs.append('start_date', startDate);
        if (datePreset === 'custom' && endDate) qs.append('end_date', endDate);
        if (segmentFilter) qs.append('primary_segment_key', segmentFilter);
        if (runSync) qs.append('sync', 'true');

        const res = await leadMarketingHttp.get(`/analytics/overall?${qs.toString()}`);
        if (res.data?.success) setData(res.data.data);
      } catch (err) {
        setError(extractError(err, 'Failed loading overall conversion analytics'));
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [attributionModel, datePreset, startDate, endDate, segmentFilter]
  );

  useEffect(() => {
    loadOverall(false);
  }, [loadOverall]);

  const k = data?.kpis || {};
  const comparison = data?.segment_comparison || [];
  const campaignAttribution = data?.campaign_attribution || [];
  const geoCountries = data?.geo_comparison?.countries || [];
  const geoStates = data?.geo_comparison?.states || [];

  const handleExport = async (format) => {
    try {
      await downloadLeadMarketingReport('combined_performance', format, {
        attribution_model: attributionModel,
        primary_segment_key: segmentFilter,
        date_preset: datePreset
      });
    } catch (err) {
      setError(extractError(err, 'Export failed'));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaTrophy className="text-amber-500" />
            <span>11 · Overall Conversion &amp; Attribution Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Unified leadership view reconciling Franchisee onboarding, EPC Registrations, and Commercial SolarKits Orders without double-counting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl font-bold">
            <button
              type="button"
              onClick={() => setAttributionModel('last_touch')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${attributionModel === 'last_touch' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
            >
              Last-Touch Credit
            </button>
            <button
              type="button"
              onClick={() => setAttributionModel('first_touch')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${attributionModel === 'first_touch' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
            >
              First-Touch Credit
            </button>
          </div>

          <button
            type="button"
            disabled={syncing}
            onClick={() => loadOverall(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-60"
          >
            <FaSyncAlt className={syncing ? 'animate-spin' : ''} /> Sync Live Orders
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
          >
            <FaFileExport /> Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
          >
            <FaFileExport /> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filter Strip */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-1.5 font-bold">
          {SEGMENT_TABS.map((t) => (
            <button
              key={t.id || 'all'}
              type="button"
              onClick={() => setSegmentFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                segmentFilter === t.id
                  ? 'bg-slate-900 dark:bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FaCalendarAlt className="text-slate-400" />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            {DATE_PRESETS.map((dp) => (
              <option key={dp.id} value={dp.id}>{dp.label}</option>
            ))}
          </select>
          {datePreset === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
              />
            </>
          )}
        </div>
      </div>

      {/* All 14 FRD KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Unique Leads', val: k.total_unique_leads ?? 0 },
          { label: 'Active Sub-Groups', val: k.total_subgroups ?? 0 },
          { label: 'Campaigns Created', val: k.total_campaigns_created ?? 0 },
          { label: 'Campaigns Completed', val: k.total_campaigns_completed ?? 0 },
          { label: 'Emails Sent', val: k.total_emails_sent ?? 0 },
          { label: 'Emails Delivered', val: k.total_delivered ?? 0 },
          { label: 'Unique Engaged Leads', val: k.total_unique_engagement ?? 0 },
          { label: 'Inquiries Generated', val: k.total_inquiries ?? 0 },
          { label: 'Quotations Generated', val: k.total_quotations ?? 0 },
          { label: 'Unique Converted Leads', val: k.total_unique_converted_leads ?? 0, highlight: 'emerald' },
          { label: 'Commercial Orders', val: k.total_commercial_orders ?? 0, highlight: 'teal' },
          { label: 'Total Sales Value', val: `₹${Number(k.total_sales_value_inr ?? 0).toLocaleString('en-IN')}`, raw: true, highlight: 'emerald' },
          { label: 'Converted Capacity', val: `${k.total_converted_kw ?? 0} kW`, raw: true },
          { label: 'Overall Conv. Ratio', val: `${k.overall_conversion_ratio ?? 0}%`, raw: true, highlight: 'amber' }
        ].map((card) => (
          <div
            key={card.label}
            className={`p-3.5 rounded-2xl border ${
              card.highlight === 'emerald'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : card.highlight === 'teal'
                  ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
                  : card.highlight === 'amber'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="text-[10px] font-bold uppercase text-slate-500">{card.label}</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-1 truncate">
              {loading ? '—' : card.raw ? card.val : Number(card.val).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>

      {/* 3-Segment Comparison Table + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm">
            Primary Marketing Segment Conversion Comparison
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3 text-right">Total Leads</th>
                  <th className="px-4 py-3 text-right">Campaigns</th>
                  <th className="px-4 py-3 text-right">Interested</th>
                  <th className="px-4 py-3 text-right">Follow-ups</th>
                  <th className="px-4 py-3 text-right">Converted</th>
                  <th className="px-4 py-3 text-right">Conv. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {comparison.map((row) => (
                  <tr key={row.primary_segment_key}>
                    <td className="px-4 py-3 font-bold">
                      {SEGMENT_LABELS[row.primary_segment_key] || row.primary_segment_key}
                      <div className="text-[10px] text-slate-400">Milestone: {row.conversion_label}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-black">{row.total_leads}</td>
                    <td className="px-4 py-3 text-right">{row.campaigns_sent}</td>
                    <td className="px-4 py-3 text-right">{row.interested_leads}</td>
                    <td className="px-4 py-3 text-right">{row.followups}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">{row.converted_count}</td>
                    <td className="px-4 py-3 text-right font-bold">{row.conversion_ratio}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-black mb-3">Segment Volume vs Conversions</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparison.map((c) => ({
                  name: SEGMENT_LABELS[c.primary_segment_key] || c.primary_segment_key,
                  Leads: c.total_leads,
                  Interested: c.interested_leads,
                  Converted: c.converted_count
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Leads" fill="#0F766E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Interested" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Converted" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* LEFT: State Revenue Leaderboard | RIGHT: Combined Geo Conversion Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 xl:order-2 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Combined Conversion Geo Footprint</h3>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
              {['world', 'india'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMapMode(m)}
                  className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer ${mapMode === m ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <LeadGeoMapVisualizer
            countriesData={geoCountries}
            statesData={geoStates}
            mode={mapMode}
          />
        </div>

        <div className="xl:col-span-6 xl:order-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black text-sm">
            Top Performing States &amp; Revenue
          </div>
          <div className="overflow-auto max-h-[460px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5 text-right">Unique Leads</th>
                  <th className="px-4 py-2.5 text-right">Converted</th>
                  <th className="px-4 py-2.5 text-right">Commercial Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {geoStates.map((st) => (
                  <tr key={st.name}>
                    <td className="px-4 py-2.5 font-bold">{st.name}</td>
                    <td className="px-4 py-2.5 text-right">{st.leads}</td>
                    <td className="px-4 py-2.5 text-right font-black text-emerald-600">{st.converted}</td>
                    <td className="px-4 py-2.5 text-right font-bold">₹{Number(st.revenue_inr || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {geoStates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No state conversion data in selected window.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Attributed Campaign Performance Leaderboard */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="font-black text-sm">
            Campaign Attribution Leaderboard ({attributionModel === 'first_touch' ? 'First-Touch Model' : 'Last-Touch Model'})
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3 text-right">Target Leads</th>
                <th className="px-4 py-3 text-right">Delivered</th>
                <th className="px-4 py-3 text-right">Unique Opens</th>
                <th className="px-4 py-3 text-right">Unique Clicks</th>
                <th className="px-4 py-3 text-right">Attributed Leads</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Revenue (₹)</th>
                <th className="px-4 py-3 text-right">Ratio %</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {campaignAttribution.map((cm) => (
                <tr key={cm._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[10px] text-teal-600 mr-1.5">{cm.campaign_code}</span>
                    <span className="font-bold">{cm.campaign_name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{cm.target_leads}</td>
                  <td className="px-4 py-2.5 text-right">{cm.delivered}</td>
                  <td className="px-4 py-2.5 text-right">{cm.unique_opens}</td>
                  <td className="px-4 py-2.5 text-right">{cm.unique_clicks}</td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-600">{cm.attributed_converted_leads}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{cm.attributed_orders}</td>
                  <td className="px-4 py-2.5 text-right font-black">₹{Number(cm.attributed_revenue_inr || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2.5 text-right font-bold">{cm.conversion_ratio}%</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/lead-marketing-panel/campaign-analytics?id=${cm._id}`)}
                      className="inline-flex items-center gap-1 text-teal-600 font-bold hover:underline cursor-pointer"
                    >
                      Open <FaArrowRight />
                    </button>
                  </td>
                </tr>
              ))}
              {campaignAttribution.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">No campaigns recorded for selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
