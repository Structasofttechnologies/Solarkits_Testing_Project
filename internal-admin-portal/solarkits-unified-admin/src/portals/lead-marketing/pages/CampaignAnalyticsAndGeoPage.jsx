import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  FaBullseye,
  FaMapMarkedAlt,
  FaSyncAlt,
  FaFileExport,
  FaInfoCircle,
  FaPlus
} from 'react-icons/fa';
import LeadGeoMapVisualizer from '../components/LeadGeoMapVisualizer';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';

const FUNNEL_COLORS = ['#0F766E', '#0D9488', '#2563EB', '#4F46E5', '#D97706', '#EA580C', '#16A34A'];

export default function CampaignAnalyticsAndGeoPage({ defaultMode = 'individual' }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlCampaignId = searchParams.get('id') || '';

  const [mode, setMode] = useState(defaultMode);
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(urlCampaignId);
  const [meta, setMeta] = useState({ countries: [], states: [], districts: [], clusters: [] });

  const [subFilters, setSubFilters] = useState({
    primary_segment_key: '',
    country_name: 'ALL',
    state_name: 'ALL',
    district_name: 'ALL',
    cluster_name: 'ALL'
  });

  const [mapMode, setMapMode] = useState('india');
  const [geoTab, setGeoTab] = useState('states'); // 'states' | 'districts' | 'clusters' | 'countries'
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([leadMarketingHttp.get('/campaigns'), leadMarketingHttp.get('/meta')])
      .then(([cmpRes, metaRes]) => {
        const list = cmpRes.data?.data || [];
        setCampaigns(list);
        if (!selectedCampaignId && list.length > 0) {
          setSelectedCampaignId(urlCampaignId || list[0]._id);
        }
        if (metaRes.data?.data) setMeta(metaRes.data.data);
        if (list.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(extractError(err, 'Failed loading campaign list'));
        setLoading(false);
      });
  }, [urlCampaignId, selectedCampaignId]);

  const loadAnalytics = useCallback(
    async (runSync = false) => {
      if (!selectedCampaignId) {
        setLoading(false);
        return;
      }
      if (runSync) setSyncing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (runSync) qs.append('sync', 'true');
        Object.entries(subFilters).forEach(([k, v]) => {
          if (v && v !== 'ALL') qs.append(k, v);
        });
        const res = await leadMarketingHttp.get(`/campaigns/${selectedCampaignId}/analytics?${qs.toString()}`);
        if (res.data?.success) setAnalytics(res.data.data);
      } catch (err) {
        setError(extractError(err, 'Failed fetching individual campaign analytics'));
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [selectedCampaignId, subFilters]
  );

  useEffect(() => {
    if (selectedCampaignId) loadAnalytics(false);
  }, [selectedCampaignId, loadAnalytics]);

  const k = analytics?.kpis || {};
  const geo = analytics?.geo || { countries: [], states: [], districts: [], clusters: [] };
  const funnel = analytics?.funnel || [];
  const recipients = analytics?.recipients || [];
  const attributedConversions = analytics?.attributed_conversions || [];

  const handleExport = async (format) => {
    if (!selectedCampaignId) return;
    try {
      await downloadLeadMarketingReport('campaign_geo', format, { campaign_id: selectedCampaignId, ...subFilters });
    } catch (err) {
      setError(extractError(err, 'Export failed'));
    }
  };

  if (!loading && campaigns.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
        <FaBullseye className="mx-auto text-3xl text-teal-600" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white">No Campaigns Available Yet</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Create your first targeted email campaign to unlock individual funnel analytics, bot-prefetch filtering, and geographical state/district performance maps.
        </p>
        <button
          type="button"
          onClick={() => navigate('/lead-marketing-panel/campaigns')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
        >
          <FaPlus /> Go to Email Campaign Management
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {mode === 'geo_compare' ? <FaMapMarkedAlt className="text-teal-600" /> : <FaBullseye className="text-teal-600" />}
            <span>{mode === 'geo_compare' ? '10 · Campaign Geographical Analytics' : '09 · Individual Campaign Analytics'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Per-campaign 7-stage conversion funnel, click/inquiry attribution &amp; state/district/cluster breakdown.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl font-bold">
            <button
              type="button"
              onClick={() => setMode('individual')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${mode === 'individual' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
            >
              Funnel &amp; KPIs
            </button>
            <button
              type="button"
              onClick={() => setMode('geo_compare')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${mode === 'geo_compare' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
            >
              Geo Breakdown
            </button>
          </div>

          <button
            type="button"
            disabled={syncing}
            onClick={() => loadAnalytics(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-60"
          >
            <FaSyncAlt className={syncing ? 'animate-spin' : ''} /> Sync Live Conversions
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

      {/* Campaign & Geo Selector Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-6 gap-2.5 text-xs">
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Select Campaign</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
          >
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.campaign_code} — {c.campaign_name} ({c.total_target_leads || 0} leads)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Segment Slice</label>
          <select
            value={subFilters.primary_segment_key}
            onChange={(e) => setSubFilters((f) => ({ ...f, primary_segment_key: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="">All Segments</option>
            <option value="franchisee_leads">Franchisee Leads</option>
            <option value="epc_signup_leads">EPC Signup Leads</option>
            <option value="epc_sales_leads">EPC Sales Leads</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">State</label>
          <select
            value={subFilters.state_name}
            onChange={(e) => setSubFilters((f) => ({ ...f, state_name: e.target.value, district_name: 'ALL' }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All States</option>
            {meta.states.map((s) => <option key={s._id || s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">District</label>
          <select
            value={subFilters.district_name}
            onChange={(e) => setSubFilters((f) => ({ ...f, district_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Districts</option>
            {meta.districts.map((d) => <option key={d._id || d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cluster</label>
          <select
            value={subFilters.cluster_name}
            onChange={(e) => setSubFilters((f) => ({ ...f, cluster_name: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
          >
            <option value="ALL">All Clusters</option>
            {meta.clusters.map((cl) => {
              const lbl = cl.cluster_name || cl.name;
              return <option key={cl._id || lbl} value={lbl}>{lbl}</option>;
            })}
          </select>
        </div>
      </div>

      {/* FRD 16.2 Proxy/Prefetch Tracking Notice */}
      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
        <FaInfoCircle className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <strong>Engagement Reliability Note (FRD 16.2):</strong> Modern mail proxies (Apple MPP, Google Image Proxy, corporate scanners) may pre-fetch open pixels.
          Suspected proxy pre-fetches detected for this campaign: <strong>{k.suspected_bot_opens ?? 0}</strong>. Prioritize <strong>Unique Clicks</strong>, <strong>Inquiries</strong>, and <strong>Verified DB Conversions</strong> for true ROI attribution.
        </div>
      </div>

      {/* 11 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Target Leads', val: k.target_leads ?? 0, sub: 'Eligible Recipients' },
          { label: 'Emails Sent', val: k.emails_sent ?? 0, sub: 'Queued & Dispatched' },
          { label: 'Delivered', val: k.delivered ?? 0, sub: `${k.delivery_rate ?? 0}% Delivery Rate` },
          { label: 'Bounced', val: k.bounced ?? 0, sub: 'Delivery Failures' },
          { label: 'Unique Opens', val: k.unique_opens ?? 0, sub: `${k.open_rate ?? 0}% Open Rate` },
          { label: 'Proxy Prefetches', val: k.suspected_bot_opens ?? 0, sub: 'Bot / Scanner Opens' },
          { label: 'Unique Clicks', val: k.unique_clicks ?? 0, sub: `${k.click_rate ?? 0}% CTR` },
          { label: 'Unsubscribed', val: k.unsubscribed ?? 0, sub: 'Opt-Out Count' },
          { label: 'Inquiries Logged', val: k.inquiries ?? 0, sub: `${k.inquiry_rate ?? 0}% Inquiry Rate` },
          { label: 'Quotations Sent', val: k.quotations ?? 0, sub: 'Commercial Quotes' },
          { label: 'Converted Leads', val: k.converted_leads ?? 0, sub: `${k.conversion_ratio ?? 0}% Conversion`, highlight: true }
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`p-4 rounded-2xl border ${
              kpi.highlight
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="text-[11px] font-bold uppercase text-slate-500">{kpi.label}</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : Number(kpi.val).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {mode === 'individual' && (
        /* Funnel + Attribution Summary */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-black mb-4">7-Stage Campaign Conversion Funnel</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {funnel.map((entry, idx) => (
                      <Cell key={entry.stage} fill={FUNNEL_COLORS[idx % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-5 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <h3 className="text-sm font-black">Attributed Commercial &amp; Registration Outcomes</h3>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {attributedConversions.map((conv) => (
                <div key={conv._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{conv.company_name || conv.lead_code}</div>
                    <div className="text-[11px] text-slate-500">
                      {conv.conversion_type} • {conv.source_reference_code || 'Verified'} • {conv.state_name || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    {conv.order_value_inr ? (
                      <div className="font-black text-emerald-600">₹{Number(conv.order_value_inr).toLocaleString('en-IN')}</div>
                    ) : (
                      <div className="font-bold text-teal-600">Converted</div>
                    )}
                    {conv.order_capacity_kw ? <div className="text-[10px] text-slate-400">{conv.order_capacity_kw} kW</div> : null}
                  </div>
                </div>
              ))}
              {attributedConversions.length === 0 && (
                <div className="py-10 text-center text-slate-400">
                  No attributed registrations, franchisee conversions, or orders recorded within this campaign window yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEFT: Breakdown Tables | RIGHT: Campaign Geographical Visual */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-6 xl:order-2 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Campaign Geographical Reach</h3>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
              {['world', 'india', 'district'].map((m) => (
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
            countriesData={geo.countries}
            statesData={geo.states}
            districtsData={geo.districts}
            mode={mapMode}
            selectedStateName={subFilters.state_name !== 'ALL' ? subFilters.state_name : ''}
            onSelectState={(st) => setSubFilters((f) => ({ ...f, state_name: st }))}
            onSelectDistrict={(d, st) => setSubFilters((f) => ({ ...f, district_name: d, state_name: st || f.state_name }))}
          />
        </div>

        <div className="xl:col-span-6 xl:order-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="flex flex-wrap gap-1.5 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold">
            {[
              { id: 'states', label: `States (${geo.states.length})` },
              { id: 'districts', label: `Districts (${geo.districts.length})` },
              { id: 'clusters', label: `Clusters (${geo.clusters.length})` },
              { id: 'countries', label: `Countries (${geo.countries.length})` }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setGeoTab(t.id)}
                className={`px-3 py-1 rounded-lg cursor-pointer ${geoTab === t.id ? 'bg-teal-600 text-white' : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="overflow-auto flex-1 max-h-[480px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px] sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Region</th>
                  <th className="px-4 py-2.5 text-right">Targeted</th>
                  {geoTab !== 'districts' && geoTab !== 'clusters' && <th className="px-4 py-2.5 text-right">Delivered</th>}
                  {geoTab !== 'districts' && geoTab !== 'clusters' && <th className="px-4 py-2.5 text-right">Opens / Clicks</th>}
                  {geoTab === 'clusters' ? (
                    <>
                      <th className="px-4 py-2.5 text-right">Orders</th>
                      <th className="px-4 py-2.5 text-right">Revenue (₹)</th>
                    </>
                  ) : (
                    <th className="px-4 py-2.5 text-right">Converted</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {(geo[geoTab] || []).map((row) => (
                  <tr key={`${geoTab}-${row.state_name || ''}-${row.name}`}>
                    <td className="px-4 py-2.5 font-bold">
                      {row.name}
                      {row.state_name ? <span className="text-[10px] text-slate-400 ml-1">({row.state_name})</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">{row.targeted || 0}</td>
                    {geoTab !== 'districts' && geoTab !== 'clusters' && <td className="px-4 py-2.5 text-right">{row.delivered || 0}</td>}
                    {geoTab !== 'districts' && geoTab !== 'clusters' && (
                      <td className="px-4 py-2.5 text-right">{row.opens || 0} / {row.clicks || 0}</td>
                    )}
                    {geoTab === 'clusters' ? (
                      <>
                        <td className="px-4 py-2.5 text-right">{row.orders || 0}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                          ₹{Number(row.revenue_inr || 0).toLocaleString('en-IN')}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600">{row.converted || 0}</td>
                    )}
                  </tr>
                ))}
                {(geo[geoTab] || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No geographical recipient records for this slice.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Multi-Campaign Geo Comparison Strip when in geo_compare mode */}
      {mode === 'geo_compare' && campaigns.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-sm font-black">
            All Campaigns Geographical Footprint Comparison
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Campaign</th>
                  <th className="px-4 py-2.5">Target States / Clusters</th>
                  <th className="px-4 py-2.5 text-right">Target Leads</th>
                  <th className="px-4 py-2.5 text-right">Delivered</th>
                  <th className="px-4 py-2.5 text-right">Clicks</th>
                  <th className="px-4 py-2.5 text-right">Conversions</th>
                  <th className="px-4 py-2.5 text-right">Inspect Geo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {campaigns.map((c) => (
                  <tr key={c._id} className={c._id === selectedCampaignId ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}>
                    <td className="px-4 py-2.5 font-bold">{c.campaign_code} · {c.campaign_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {[...(c.state_names || []), ...(c.cluster_names || [])].join(', ') || 'All Regions'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold">{c.total_target_leads || 0}</td>
                    <td className="px-4 py-2.5 text-right">{c.delivered_count || 0}</td>
                    <td className="px-4 py-2.5 text-right">{c.unique_clicks_count || 0}</td>
                    <td className="px-4 py-2.5 text-right font-black text-emerald-600">{c.conversions_count || 0}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignId(c._id)}
                        className="text-teal-600 font-bold hover:underline cursor-pointer"
                      >
                        Load Map →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Recipients Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-black">Campaign Recipient Delivery &amp; Engagement Log ({recipients.length})</h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px] sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Company / Email</th>
                <th className="px-4 py-2.5">Primary Segment</th>
                <th className="px-4 py-2.5">Region</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Opens / Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recipients.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-2.5">
                    <div className="font-bold">{r.company_name || r.lead_code}</div>
                    <div className="text-[11px] text-slate-400">{r.email}</div>
                  </td>
                  <td className="px-4 py-2.5">{SEGMENT_LABELS[r.primary_segment_key] || r.primary_segment_key}</td>
                  <td className="px-4 py-2.5 text-slate-500">{[r.state_name, r.district_name].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 font-semibold uppercase">{r.status}</td>
                  <td className="px-4 py-2.5 text-right">
                    {r.open_count || 0} / {r.click_count || 0}
                  </td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No recipients logged for selected filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
