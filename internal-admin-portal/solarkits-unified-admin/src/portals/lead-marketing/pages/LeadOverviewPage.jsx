import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaChartLine,
  FaUsers,
  FaStore,
  FaUserPlus,
  FaShoppingCart,
  FaEnvelopeOpenText,
  FaRupeeSign,
  FaSyncAlt,
  FaFileUpload,
  FaPlus,
  FaArrowRight,
  FaGlobeAsia
} from 'react-icons/fa';
import LeadGeoMapVisualizer from '../components/LeadGeoMapVisualizer';
import CampaignLifecycleButtons from '../../admin/pages/marketing/CampaignLifecycleButtons';
import { leadMarketingHttp, extractError, SEGMENT_LABELS, SEGMENT_BADGE_COLORS } from '../services/leadMarketingApi';
import { normalizeGeoKey } from '../../../utils/mapColorPalettes';

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'financial_year', label: 'Financial Year' }
];

export default function LeadOverviewPage() {
  const navigate = useNavigate();
  const [datePreset, setDatePreset] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [data, setData] = useState(null);

  // Dashboard Campaign Filter & Action State
  const [campStatusFilter, setCampStatusFilter] = useState('all');
  const [actingCampId, setActingCampId] = useState('');

  // Cascading Geo Map & Table Drilldown Filters
  const [geoTab, setGeoTab] = useState('states'); // 'states' | 'clusters' | 'districts'
  const [mapMode, setMapMode] = useState('india'); // 'india' | 'district'
  const [selectedState, setSelectedState] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedLeadSegment, setSelectedLeadSegment] = useState('ALL'); // 'ALL' | 'franchisee_leads' | 'epc_signup_leads' | 'epc_sales_leads'

  const loadOverview = useCallback(async (runSync = false) => {
    if (runSync) setSyncing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await leadMarketingHttp.get(`/dashboards/overview?date_preset=${datePreset}${runSync ? '&sync=true' : ''}`);
      if (res.data?.success) setData(res.data.data);
    } catch (err) {
      setError(extractError(err, 'Failed loading lead overview analytics'));
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [datePreset]);

  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  const handleCampaignAction = async (campId, action) => {
    if (action === 'edit') {
      navigate(`/lead-marketing-panel/campaigns?edit=${campId}`);
      return;
    }
    if (action === 'rerun' && !window.confirm('Reset and rerun this Lead campaign now?')) return;
    setActingCampId(campId);
    setBanner(null);
    try {
      const res = await leadMarketingHttp.post(`/campaigns/${campId}/${action}`);
      if (action === 'draft') {
        navigate(`/lead-marketing-panel/campaigns?edit=${campId}`);
        return;
      }
      if (res.data?.success) {
        setBanner({ type: 'success', text: res.data.message || `Campaign ${action} executed.` });
        await loadOverview(false);
      }
    } catch (err) {
      setBanner({ type: 'error', text: extractError(err, `Failed to ${action} campaign`) });
    } finally {
      setActingCampId('');
    }
  };

  const s = data?.summary || {};
  const campStatusCounts = s.campaign_status_counts || {};
  const segMap = new Map((data?.segment_counts || []).map((x) => [x._id, x]));
  const geoOv = data?.geo_overview || { states: [], districts: [], clusters: [], district_cluster_map: {} };

  const metricForRow = useCallback((row) => {
    if (!row) return 0;
    if (selectedLeadSegment !== 'ALL' && row[selectedLeadSegment] !== undefined) {
      return Number(row[selectedLeadSegment] || 0);
    }
    return Number(row.unique_leads || 0);
  }, [selectedLeadSegment]);

  // Cascading Options
  const stateOptions = useMemo(
    () => (geoOv.states || []).map((st) => st.name).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [geoOv.states]
  );

  const clusterOptions = useMemo(() => {
    return (geoOv.clusters || []).filter(
      (c) => !selectedState || normalizeGeoKey(c.state_name) === normalizeGeoKey(selectedState)
    );
  }, [geoOv.clusters, selectedState]);

  const districtOptions = useMemo(() => {
    return (geoOv.districts || []).filter((d) => {
      if (selectedState && normalizeGeoKey(d.state_name) !== normalizeGeoKey(selectedState)) return false;
      if (selectedCluster && normalizeGeoKey(d.cluster_name) !== normalizeGeoKey(selectedCluster)) return false;
      return true;
    });
  }, [geoOv.districts, selectedState, selectedCluster]);

  // Filtered Left-Side Tables (Strictly scoped by State -> Cluster -> District -> Segment Type)
  const visibleStates = useMemo(() => {
    return (geoOv.states || []).filter((st) => {
      if (selectedState && normalizeGeoKey(st.name) !== normalizeGeoKey(selectedState)) return false;
      if (selectedLeadSegment !== 'ALL' && metricForRow(st) === 0) return false;
      return true;
    });
  }, [geoOv.states, selectedState, selectedLeadSegment, metricForRow]);

  const visibleClusters = useMemo(() => {
    return (geoOv.clusters || []).filter((cl) => {
      if (selectedState && normalizeGeoKey(cl.state_name) !== normalizeGeoKey(selectedState)) return false;
      if (selectedCluster && normalizeGeoKey(cl.name) !== normalizeGeoKey(selectedCluster)) return false;
      if (selectedLeadSegment !== 'ALL' && metricForRow(cl) === 0) return false;
      return true;
    });
  }, [geoOv.clusters, selectedState, selectedCluster, selectedLeadSegment, metricForRow]);

  const visibleDistricts = useMemo(() => {
    return (geoOv.districts || []).filter((d) => {
      if (selectedState && normalizeGeoKey(d.state_name) !== normalizeGeoKey(selectedState)) return false;
      if (selectedCluster && normalizeGeoKey(d.cluster_name) !== normalizeGeoKey(selectedCluster)) return false;
      if (selectedDistrict && normalizeGeoKey(d.name) !== normalizeGeoKey(selectedDistrict)) return false;
      if (selectedLeadSegment !== 'ALL' && metricForRow(d) === 0) return false;
      return true;
    });
  }, [geoOv.districts, selectedState, selectedCluster, selectedDistrict, selectedLeadSegment, metricForRow]);

  const activeTableRows = geoTab === 'states' ? visibleStates : geoTab === 'clusters' ? visibleClusters : visibleDistricts;

  const selectStateDrill = (stName) => {
    setSelectedState(stName);
    setSelectedCluster('');
    setSelectedDistrict('');
    if (stName) {
      setGeoTab('clusters');
      setMapMode('district');
    } else {
      setGeoTab('states');
      setMapMode('india');
    }
  };

  const selectClusterDrill = (cluName, stateHint = '') => {
    if (stateHint) setSelectedState(stateHint);
    setSelectedCluster(cluName);
    setSelectedDistrict('');
    if (cluName) {
      setGeoTab('districts');
      setMapMode('district');
    }
  };

  const resetGeoFilters = () => {
    setSelectedState('');
    setSelectedCluster('');
    setSelectedDistrict('');
    setSelectedLeadSegment('ALL');
    setGeoTab('states');
    setMapMode('india');
  };

  const visibleCampaigns = useMemo(() => {
    const list = data?.recent_campaigns || [];
    if (campStatusFilter === 'all') return list;
    return list.filter((c) => c.status === campStatusFilter);
  }, [data, campStatusFilter]);

  const segmentCards = [
    {
      key: 'franchisee_leads',
      title: 'Franchisee Leads',
      path: '/lead-marketing-panel/franchisee-leads',
      icon: FaStore,
      color: 'text-violet-600',
      border: 'border-violet-200 dark:border-violet-800',
      conversionText: `${s.franchisee_converted ?? 0} Converted Franchisees`
    },
    {
      key: 'epc_signup_leads',
      title: 'EPC Signup Leads',
      path: '/lead-marketing-panel/epc-signup-leads',
      icon: FaUserPlus,
      color: 'text-blue-600',
      border: 'border-blue-200 dark:border-blue-800',
      conversionText: `${s.epc_registered ?? 0} Registered EPCs`
    },
    {
      key: 'epc_sales_leads',
      title: 'EPC Sales Leads',
      path: '/lead-marketing-panel/epc-sales-leads',
      icon: FaShoppingCart,
      color: 'text-emerald-600',
      border: 'border-emerald-200 dark:border-emerald-800',
      conversionText: `${s.commercial_orders ?? 0} Commercial Orders`
    }
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-1.5">
            <FaChartLine /> Live MongoDB Intelligence
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Lead Marketing Overview Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized view across Franchisee, EPC Signup &amp; EPC Sales leads, live email campaigns, Cluster Management &amp; real conversions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadOverview(true)}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaSyncAlt className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing Orders/EPCs...' : 'Sync Live Conversions'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/lead-marketing-panel/upload')}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaFileUpload /> Upload Excel / CSV
          </button>
          <button
            type="button"
            onClick={() => navigate('/lead-marketing-panel/campaigns')}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FaPlus /> New Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          {error}
        </div>
      )}

      {banner && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold ${banner.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
        >
          {banner.text}
        </div>
      )}

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase text-slate-400">Unique Leads</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(s.total_leads ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{s.total_subgroups ?? 0} Sub-groups • {s.active_clusters_count ?? 0} Clusters</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase text-slate-400">Campaigns</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{s.total_campaigns ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {campStatusCounts.running ?? 0} Run • {campStatusCounts.paused ?? 0} Paused • {s.completed_campaigns ?? 0} Done
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase text-slate-400">Emails Delivered</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(s.emails_delivered ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-sky-600 font-semibold mt-1">
            Open {s.open_rate ?? 0}% • Click {s.click_rate ?? 0}%
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase text-slate-400">Pending Follow-ups</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {(s.pending_followups ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">New / Follow-up Required</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-bold uppercase text-slate-400">Converted Leads</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {(s.unique_converted_leads ?? 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">Ratio: {s.overall_conversion_ratio ?? 0}%</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700">
          <div className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <FaRupeeSign /> Order Value
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            ₹{((s.total_revenue_inr ?? 0) / 100000).toFixed(2)}L
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {s.commercial_orders ?? 0} Orders • {s.total_converted_kw ?? 0} kW
          </div>
        </div>
      </div>

      {/* 3 Primary Segment Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {segmentCards.map((card) => {
          const stat = segMap.get(card.key) || { total: 0, active: 0, interested: 0 };
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              onClick={() => navigate(card.path)}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-800 border ${card.border} shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{card.title}</h3>
                    <span className="text-[11px] text-slate-500">{stat.active} Active • {stat.interested} Interested</span>
                  </div>
                </div>
                <FaArrowRight className="text-slate-400 text-xs" />
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {Number(stat.total || 0).toLocaleString('en-IN')}
                </div>
                <span className={`text-xs font-bold ${card.color}`}>{card.conversionText}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE GEOGRAPHICAL DISTRIBUTION: Cascading Filters + LEFT Tables + RIGHT Map */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FaGlobeAsia className="text-teal-600" />
              <span>Lead Footprint Across States, Clusters &amp; Districts</span>
            </h2>
            <p className="text-xs text-slate-500">
              Select a State to inspect only its Clusters &amp; Districts (Left Table) and highlight them on the Interactive Map (Right).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'india', label: 'India State Map' },
                { id: 'district', label: selectedState ? `${selectedState} Districts` : 'District View' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMapMode(m.id)}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${mapMode === m.id ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/lead-marketing-panel/geo-map')}
              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:underline cursor-pointer"
            >
              Full Geo Map →
            </button>
          </div>
        </div>

        {/* Cascading State -> Cluster -> District -> Lead Type Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <select
            value={selectedState}
            onChange={(e) => selectStateDrill(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-semibold"
          >
            <option value="">All States ({stateOptions.length})</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={selectedCluster}
            onChange={(e) => selectClusterDrill(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-teal-700 dark:text-teal-300"
          >
            <option value="">{selectedState ? `All ${selectedState} Clusters (${clusterOptions.length})` : `All Clusters (${clusterOptions.length})`}</option>
            {clusterOptions.map((cl) => (
              <option key={cl.cluster_code || cl.name} value={cl.name}>
                {cl.name} ({cl.state_name})
              </option>
            ))}
          </select>

          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              if (e.target.value) setGeoTab('districts');
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-semibold"
          >
            <option value="">All Districts ({districtOptions.length})</option>
            {districtOptions.map((d) => (
              <option key={`${d.state_name}::${d.name}`} value={d.name}>
                {d.name} ({d.state_name})
              </option>
            ))}
          </select>

          <select
            value={selectedLeadSegment}
            onChange={(e) => setSelectedLeadSegment(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-indigo-700 dark:text-indigo-300"
          >
            <option value="ALL">All Lead / EPC Segments</option>
            <option value="franchisee_leads">Franchisee Leads</option>
            <option value="epc_signup_leads">EPC Signup Leads</option>
            <option value="epc_sales_leads">EPC Sales Leads</option>
          </select>

          <button
            type="button"
            onClick={resetGeoFilters}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            Reset Geo &amp; Segment Filters
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* LEFT: Drilldown Tables */}
          <div className="xl:col-span-5 xl:order-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
            {/* Breadcrumb Trail */}
            <div className="px-3.5 py-2 bg-teal-50/70 dark:bg-teal-950/30 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              <button type="button" onClick={resetGeoFilters} className="text-teal-700 dark:text-teal-300 hover:underline cursor-pointer">
                All India
              </button>
              {selectedState && (
                <>
                  <span>›</span>
                  <button type="button" onClick={() => selectStateDrill(selectedState)} className="text-teal-700 dark:text-teal-300 hover:underline cursor-pointer">
                    {selectedState}
                  </button>
                </>
              )}
              {selectedCluster && (
                <>
                  <span>›</span>
                  <span className="text-indigo-600">{selectedCluster}</span>
                </>
              )}
              {selectedDistrict && (
                <>
                  <span>›</span>
                  <span className="text-amber-600">{selectedDistrict}</span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-bold">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'states', label: `States (${visibleStates.length})` },
                  { id: 'clusters', label: `${selectedState ? `${selectedState} Clusters` : 'Clusters'} (${visibleClusters.length})` },
                  { id: 'districts', label: `Districts (${visibleDistricts.length})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGeoTab(t.id)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${geoTab === t.id ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto max-h-[520px] flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">{geoTab === 'states' ? 'State' : geoTab === 'clusters' ? 'Cluster Performance' : 'District / Cluster'}</th>
                    <th className="px-3 py-2.5 text-right">{selectedLeadSegment === 'ALL' ? 'Leads' : 'Matched'}</th>
                    <th className="px-3 py-2.5 text-right">Franch.</th>
                    <th className="px-3 py-2.5 text-right">Signup</th>
                    <th className="px-3 py-2.5 text-right">Sales</th>
                    <th className="px-3 py-2.5 text-right">Conv %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeTableRows.slice(0, 140).map((row, idx) => (
                    <tr
                      key={`${geoTab}-${row.state_name || ''}-${row.name}-${idx}`}
                      onClick={() => {
                        if (geoTab === 'states') {
                          selectStateDrill(row.name);
                        } else if (geoTab === 'clusters') {
                          selectClusterDrill(row.name, row.state_name);
                        } else {
                          if (row.state_name) setSelectedState(row.state_name);
                          setSelectedDistrict(row.name);
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30"
                    >
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-900 dark:text-white">{row.name}</div>
                        {(row.state_name || row.cluster_name || row.cluster_code) && (
                          <div className="text-[10px] text-slate-400">
                            {[row.state_name, row.cluster_name, row.cluster_code].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-teal-700 dark:text-teal-400">{metricForRow(row)}</td>
                      <td className="px-3 py-2 text-right">{row.franchisee_leads || 0}</td>
                      <td className="px-3 py-2 text-right">{row.epc_signup_leads || 0}</td>
                      <td className="px-3 py-2 text-right">{row.epc_sales_leads || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">
                        {row.converted_leads || 0} ({row.conversion_ratio ?? 0}%)
                      </td>
                    </tr>
                  ))}
                  {activeTableRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                        {loading ? 'Loading live geographical data...' : 'No regional records matched active filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Interactive Map */}
          <div className="xl:col-span-7 xl:order-2">
            <LeadGeoMapVisualizer
              statesData={geoOv.states || []}
              districtsData={geoOv.districts || []}
              districtClusterMap={geoOv.district_cluster_map || {}}
              mode={mapMode}
              selectedStateName={selectedState}
              selectedClusterName={selectedCluster}
              selectedDistrictName={selectedDistrict}
              selectedSegment={selectedLeadSegment}
              onSelectState={(st) => selectStateDrill(st)}
              onSelectDistrict={(d, st) => {
                if (st) setSelectedState(st);
                setSelectedDistrict(d);
              }}
            />
          </div>
        </div>
      </div>

      {/* Campaign Lifecycle & Status Control Section */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FaEnvelopeOpenText className="text-indigo-600" /> Lead Campaigns &amp; Live Status Controls
            </h3>
            <p className="text-[11px] text-slate-500">Start, pause, resume, stop/cancel, draft, or rerun any campaign directly with real-time admin alerts.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/lead-marketing-panel/campaigns')}
            className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            Open Full Campaign Manager →
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          {[
            { id: 'all', label: `All (${s.total_campaigns ?? 0})` },
            { id: 'running', label: `Running (${campStatusCounts.running ?? 0})` },
            { id: 'scheduled', label: `Scheduled (${campStatusCounts.scheduled ?? 0})` },
            { id: 'paused', label: `Paused (${campStatusCounts.paused ?? 0})` },
            { id: 'draft', label: `Draft (${campStatusCounts.draft ?? 0})` },
            { id: 'completed', label: `Completed (${campStatusCounts.completed ?? 0})` },
            { id: 'cancelled', label: `Stopped / Cancelled (${campStatusCounts.cancelled ?? 0})` }
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setCampStatusFilter(st.id)}
              className={`px-3 py-1 rounded-full border cursor-pointer transition ${campStatusFilter === st.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="py-2.5 px-3">Campaign</th>
                <th className="py-2.5 px-3">Segments</th>
                <th className="py-2.5 px-3 text-right">Targeted / Delivered</th>
                <th className="py-2.5 px-3 text-right">Opens / Clicks</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Lifecycle Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {visibleCampaigns.map((c) => (
                <tr key={c._id}>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{c.campaign_name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{c.campaign_code}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px]">
                    {(c.target_primary_segments || []).map((k) => SEGMENT_LABELS[k] || k).join(', ') || 'All Segments'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    {c.delivered_count || 0} / {c.total_target_leads || 0}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {c.unique_opens_count || 0} / {c.unique_clicks_count || 0}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${c.status === 'running'
                        ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                        : c.status === 'completed'
                          ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                          : c.status === 'paused'
                            ? 'bg-amber-100 text-amber-700'
                            : c.status === 'cancelled' || c.status === 'failed'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <CampaignLifecycleButtons
                        campaignId={c._id}
                        status={c.status}
                        disabled={actingCampId === c._id}
                        onAction={handleCampaignAction}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {visibleCampaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No lead campaigns matched this status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Central Leads Table */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FaUsers className="text-teal-600" /> Latest Central Lead Records
          </h3>
          <button
            type="button"
            onClick={() => navigate('/lead-marketing-panel/leads')}
            className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
          >
            View All Leads
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Lead ID</th>
                <th className="py-2 px-3">Company &amp; Contact</th>
                <th className="py-2 px-3">Primary Segment</th>
                <th className="py-2 px-3">Geo / Cluster</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(data?.recent_leads || []).map((l) => (
                <tr key={l._id}>
                  <td className="py-2 px-3 font-mono font-bold text-[11px]">{l.lead_id}</td>
                  <td className="py-2 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">{l.company_name}</div>
                    <div className="text-[10px] text-slate-500">{l.contact_person || l.email || l.mobile_number}</div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEGMENT_BADGE_COLORS[l.primary_segment_key] || ''}`}>
                      {SEGMENT_LABELS[l.primary_segment_key] || l.primary_segment_key}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px]">
                    {[l.district_name, l.cluster_name, l.state_name].filter(Boolean).join(', ')}
                  </td>
                  <td className="py-2 px-3 font-semibold">{l.lead_status}</td>
                  <td className="py-2 px-3 text-slate-500">{l.lead_source}</td>
                </tr>
              ))}
              {(data?.recent_leads || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No leads in Central Lead Database yet. Upload via <strong>Dynamic Lead Upload</strong> or add manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
