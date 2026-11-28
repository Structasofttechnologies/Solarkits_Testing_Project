import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaGlobeAsia,
  FaMapMarkedAlt,
  FaFileExport,
  FaFilter,
  FaSyncAlt,
  FaTimes,
  FaBuilding,
  FaCheckCircle,
  FaArrowRight
} from 'react-icons/fa';
import LeadGeoMapVisualizer from '../components/LeadGeoMapVisualizer';
import {
  leadMarketingHttp,
  extractError,
  SEGMENT_LABELS,
  SEGMENT_BADGE_COLORS,
  downloadLeadMarketingReport
} from '../services/leadMarketingApi';

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'previous_month', label: 'Previous Month' },
  { id: 'financial_year', label: 'Financial Year' }
];

export default function GeographicalLeadMapPage() {
  const [meta, setMeta] = useState({
    subgroups: [],
    countries: [],
    states: [],
    districts: [],
    clusters: [],
    bdes: [],
    settings: { lead_statuses: [] }
  });

  const [filters, setFilters] = useState({
    primary_segment_key: 'ALL',
    subgroup_id: '',
    country_name: 'ALL',
    state_name: 'ALL',
    district_name: 'ALL',
    cluster_name: 'ALL',
    assigned_bde_id: 'ALL',
    lead_status: 'ALL',
    date_preset: 'all'
  });

  const [mapMode, setMapMode] = useState('india'); // 'world' | 'india' | 'district'
  const [activeTab, setActiveTab] = useState('states'); // 'states' | 'countries' | 'districts' | 'clusters' | 'leads'
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [leadModalInfo, setLeadModalInfo] = useState(null);

  useEffect(() => {
    leadMarketingHttp
      .get('/meta')
      .then((res) => {
        if (res.data?.success && res.data?.data) setMeta(res.data.data);
      })
      .catch(() => {});
  }, []);

  const fetchGeoMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') qs.append(k, v);
      });
      const res = await leadMarketingHttp.get(`/geo-map?${qs.toString()}`);
      if (res.data?.success) setGeoData(res.data.data);
    } catch (err) {
      setError(extractError(err, 'Failed to load geographical lead analytics'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchGeoMap();
  }, [fetchGeoMap]);

  const availableSubgroups = useMemo(() => {
    if (filters.primary_segment_key === 'ALL') return meta.subgroups;
    return meta.subgroups.filter((sg) => sg.primary_segment_key === filters.primary_segment_key);
  }, [meta.subgroups, filters.primary_segment_key]);

  const cascadingDistricts = useMemo(() => {
    if (!filters.state_name || filters.state_name === 'ALL') return meta.districts;
    const stObj = meta.states.find((s) => s.name?.toLowerCase() === filters.state_name.toLowerCase());
    if (!stObj) return meta.districts;
    return meta.districts.filter((d) => String(d.state_id) === String(stObj._id));
  }, [filters.state_name, meta.states, meta.districts]);

  const selectedStateStats = useMemo(() => {
    if (!geoData?.states || filters.state_name === 'ALL') return null;
    return geoData.states.find(
      (s) => s.name?.toLowerCase() === filters.state_name.toLowerCase()
    ) || {
      name: filters.state_name,
      unique_leads: 0,
      franchisee_leads: 0,
      epc_signup_leads: 0,
      epc_sales_leads: 0,
      active_leads: 0,
      inactive_leads: 0,
      registered_epcs: 0,
      converted_franchisees: 0,
      buyer_epcs: 0,
      subgroups: {}
    };
  }, [geoData, filters.state_name]);

  const handleResetFilters = () => {
    setFilters({
      primary_segment_key: 'ALL',
      subgroup_id: '',
      country_name: 'ALL',
      state_name: 'ALL',
      district_name: 'ALL',
      cluster_name: 'ALL',
      assigned_bde_id: 'ALL',
      lead_status: 'ALL',
      date_preset: 'all'
    });
    setMapMode('india');
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      await downloadLeadMarketingReport('geo_wise', format, filters);
    } catch (err) {
      setError(extractError(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const openDistrictLeadModal = (title, matchingPredicate) => {
    const allLeads = geoData?.filtered_leads || [];
    const matched = matchingPredicate ? allLeads.filter(matchingPredicate) : allLeads;
    setLeadModalInfo({ title, leads: matched });
  };

  const countriesList = geoData?.countries || [];
  const statesList = geoData?.states || [];
  const districtsList = geoData?.districts || [];
  const clustersList = geoData?.clusters || [];
  const filteredLeads = geoData?.filtered_leads || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaGlobeAsia className="text-teal-600" />
            <span>07 · Geographical Lead Map</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interactive Country → India State → District → SolarKits Cluster distribution with de-duplicated unique lead totals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer"
          >
            <FaSyncAlt /> Reset Filters
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('xlsx')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-60"
          >
            <FaFileExport /> Export Geo Excel
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleExport('pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer disabled:opacity-60"
          >
            <FaFileExport /> Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
          <FaFilter className="text-teal-600" /> Geographical &amp; Segmentation Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <select
            value={filters.primary_segment_key}
            onChange={(e) => setFilters((f) => ({ ...f, primary_segment_key: e.target.value, subgroup_id: '' }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Primary Segments</option>
            <option value="franchisee_leads">Franchisee Leads</option>
            <option value="epc_signup_leads">EPC Signup Leads</option>
            <option value="epc_sales_leads">EPC Sales Leads</option>
          </select>

          <select
            value={filters.subgroup_id}
            onChange={(e) => setFilters((f) => ({ ...f, subgroup_id: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="">All Sub-Groups</option>
            {availableSubgroups.map((sg) => (
              <option key={sg._id} value={sg._id}>{sg.name}</option>
            ))}
          </select>

          <select
            value={filters.country_name}
            onChange={(e) => {
              const cn = e.target.value;
              setFilters((f) => ({ ...f, country_name: cn, state_name: 'ALL', district_name: 'ALL' }));
              if (cn === 'ALL' || cn.toLowerCase() === 'india') setMapMode('india');
              else setMapMode('world');
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Countries</option>
            {meta.countries.map((c) => (
              <option key={c._id || c.name} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            value={filters.state_name}
            onChange={(e) => {
              const st = e.target.value;
              setFilters((f) => ({ ...f, state_name: st, district_name: 'ALL' }));
              if (st !== 'ALL') setMapMode('district');
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All States</option>
            {meta.states.map((s) => (
              <option key={s._id || s.name} value={s.name}>{s.name}</option>
            ))}
          </select>

          <select
            value={filters.district_name}
            onChange={(e) => setFilters((f) => ({ ...f, district_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Districts</option>
            {cascadingDistricts.map((d) => (
              <option key={d._id || d.name} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={filters.cluster_name}
            onChange={(e) => setFilters((f) => ({ ...f, cluster_name: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All SolarKits Clusters</option>
            {meta.clusters.map((cl) => {
              const label = cl.cluster_name || cl.name;
              return <option key={cl._id || label} value={label}>{label}</option>;
            })}
          </select>

          <select
            value={filters.assigned_bde_id}
            onChange={(e) => setFilters((f) => ({ ...f, assigned_bde_id: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Assigned BDEs</option>
            {meta.bdes.map((b) => (
              <option key={b._id} value={b._id}>{b.full_name || b.name || b.email}</option>
            ))}
          </select>

          <select
            value={filters.lead_status}
            onChange={(e) => setFilters((f) => ({ ...f, lead_status: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="ALL">All Lead Statuses</option>
            {(meta.settings?.lead_statuses || []).map((st) => {
              const name = typeof st === 'string' ? st : st.name;
              return <option key={name} value={name}>{name}</option>;
            })}
          </select>

          <select
            value={filters.date_preset}
            onChange={(e) => setFilters((f) => ({ ...f, date_preset: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            {DATE_PRESETS.map((dp) => (
              <option key={dp.id} value={dp.id}>{dp.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => openDistrictLeadModal('Currently Filtered Marketing Leads', null)}
            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
          >
            View Leads ({filteredLeads.length}) <FaArrowRight />
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Unique Leads', val: geoData?.total_unique_leads ?? 0, sub: 'De-duplicated Master' },
          { label: 'Countries Reached', val: countriesList.length, sub: 'Global Distribution' },
          { label: 'States Covered', val: statesList.length, sub: 'Active Lead Footprint' },
          { label: 'Districts Covered', val: districtsList.length, sub: 'Granular Regions' },
          { label: 'Clusters Active', val: (geoData?.cluster_masters || []).length || clustersList.length, sub: 'Live Franchisee Clusters' }
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : Number(card.val).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* LEFT: State Summary & Ranking | RIGHT: Interactive Geo Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 xl:order-2 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'world', label: 'World View' },
                { id: 'india', label: 'India State Map' },
                { id: 'district', label: filters.state_name !== 'ALL' ? `${filters.state_name} Districts` : 'All India Districts' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMapMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    mapMode === m.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {filters.state_name !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, state_name: 'ALL', district_name: 'ALL' }));
                  setMapMode('india');
                }}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
              >
                ← Back to All States
              </button>
            )}
          </div>

          <LeadGeoMapVisualizer
            countriesData={countriesList}
            statesData={statesList}
            districtsData={districtsList}
            districtClusterMap={geoData?.district_cluster_map || {}}
            mode={mapMode}
            selectedStateName={filters.state_name !== 'ALL' ? filters.state_name : ''}
            selectedSegment={filters.primary_segment_key}
            onSelectCountry={(countryName) => {
              if (!countryName) return;
              setFilters((f) => ({ ...f, country_name: countryName, state_name: 'ALL', district_name: 'ALL' }));
              if (countryName.toLowerCase() === 'india') setMapMode('india');
            }}
            onSelectState={(stateName) => {
              if (!stateName) return;
              setFilters((f) => ({ ...f, state_name: stateName, district_name: 'ALL' }));
            }}
            onSelectDistrict={(districtName, stateName) => {
              if (!districtName) return;
              setFilters((f) => ({
                ...f,
                state_name: stateName || f.state_name,
                district_name: districtName
              }));
              openDistrictLeadModal(
                `${districtName}${stateName ? `, ${stateName}` : ''} — Leads`,
                (l) =>
                  String(l.district_name || '').toLowerCase() === String(districtName).toLowerCase() &&
                  (!stateName || String(l.state_name || '').toLowerCase() === String(stateName).toLowerCase())
              );
            }}
          />
        </div>

        {/* Left Side State Summary & Quick State Leaderboard */}
        <div className="xl:col-span-5 xl:order-1 space-y-4">
          {selectedStateStats ? (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-amber-400/60 dark:border-amber-600/60 space-y-4 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Selected State Intelligence</span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <FaMapMarkedAlt className="text-amber-500" />
                    <span>{selectedStateStats.name}</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMapMode('district')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  Zoom Districts
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="text-slate-500">Unique Leads</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">{selectedStateStats.unique_leads}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/30">
                  <div className="text-violet-600 dark:text-violet-300">Franchisee Leads</div>
                  <div className="text-lg font-black">{selectedStateStats.franchisee_leads}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-blue-600 dark:text-blue-300">EPC Signup Leads</div>
                  <div className="text-lg font-black">{selectedStateStats.epc_signup_leads}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                  <div className="text-emerald-600 dark:text-emerald-300">EPC Sales Leads</div>
                  <div className="text-lg font-black">{selectedStateStats.epc_sales_leads}</div>
                </div>
              </div>

              <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active / Inactive Leads</span>
                  <span className="font-bold">{selectedStateStats.active_leads} / {selectedStateStats.inactive_leads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Converted Franchisees</span>
                  <span className="font-bold text-violet-600">{selectedStateStats.converted_franchisees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Registered EPCs</span>
                  <span className="font-bold text-blue-600">{selectedStateStats.registered_epcs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Buyer EPCs</span>
                  <span className="font-bold text-emerald-600">{selectedStateStats.buyer_epcs}</span>
                </div>
              </div>

              {selectedStateStats.subgroups && Object.keys(selectedStateStats.subgroups).length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Top Sub-Groups in State</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedStateStats.subgroups)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([sgName, cnt]) => (
                        <span key={sgName} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold">
                          {sgName}: {cnt}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  openDistrictLeadModal(
                    `${selectedStateStats.name} — Matching Leads`,
                    (l) => String(l.state_name || '').toLowerCase() === String(selectedStateStats.name).toLowerCase()
                  )
                }
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-teal-600 hover:opacity-90 text-white text-xs font-bold cursor-pointer"
              >
                Inspect State Leads ({selectedStateStats.unique_leads})
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Tip: Click Any Region on the Map</div>
              Click a country in <strong>World View</strong> or any state in <strong>India State Map</strong> to view its segment summary, registered EPCs, buyers, and drill into district-level leads.
            </div>
          )}

          {/* Top States Ranking */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Top States by Unique Leads</div>
            {statesList.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">No state geo data available for active filters.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {statesList.slice(0, 12).map((st) => (
                  <button
                    key={st.name}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, state_name: st.name, district_name: 'ALL' }))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                      filters.state_name.toLowerCase() === st.name.toLowerCase()
                        ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{st.name}</span>
                    <span className="font-black text-teal-700 dark:text-teal-400 ml-2">{st.unique_leads}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geo Drilldown Data Tables */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold">
          {[
            { id: 'states', label: `State Distribution (${statesList.length})` },
            { id: 'districts', label: `District Distribution (${districtsList.length})` },
            { id: 'clusters', label: `Cluster Breakdown (${clustersList.length})` },
            { id: 'countries', label: `Country Distribution (${countriesList.length})` },
            { id: 'leads', label: `Filtered Leads (${filteredLeads.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab !== 'leads' ? (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Region / Cluster</th>
                  {activeTab === 'districts' || activeTab === 'clusters' ? <th className="px-4 py-3">State</th> : null}
                  <th className="px-4 py-3 text-right">Unique Leads</th>
                  <th className="px-4 py-3 text-right">Franchisee</th>
                  <th className="px-4 py-3 text-right">EPC Signup</th>
                  <th className="px-4 py-3 text-right">EPC Sales</th>
                  <th className="px-4 py-3 text-right">Registered EPCs</th>
                  <th className="px-4 py-3 text-right">Converted Franch.</th>
                  <th className="px-4 py-3 text-right">Buyers</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {(activeTab === 'states'
                  ? statesList
                  : activeTab === 'districts'
                    ? districtsList
                    : activeTab === 'clusters'
                      ? clustersList
                      : countriesList
                ).map((row) => (
                  <tr key={`${activeTab}-${row.state_name || ''}-${row.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{row.name}</td>
                    {(activeTab === 'districts' || activeTab === 'clusters') && (
                      <td className="px-4 py-2.5 text-slate-500">{row.state_name || '—'}</td>
                    )}
                    <td className="px-4 py-2.5 text-right font-black text-teal-700 dark:text-teal-400">{row.unique_leads}</td>
                    <td className="px-4 py-2.5 text-right">{row.franchisee_leads}</td>
                    <td className="px-4 py-2.5 text-right">{row.epc_signup_leads}</td>
                    <td className="px-4 py-2.5 text-right">{row.epc_sales_leads}</td>
                    <td className="px-4 py-2.5 text-right">{row.registered_epcs}</td>
                    <td className="px-4 py-2.5 text-right">{row.converted_franchisees}</td>
                    <td className="px-4 py-2.5 text-right">{row.buyer_epcs}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeTab === 'states') {
                            setFilters((f) => ({ ...f, state_name: row.name, district_name: 'ALL' }));
                            setMapMode('district');
                          } else if (activeTab === 'districts') {
                            setFilters((f) => ({ ...f, state_name: row.state_name || f.state_name, district_name: row.name }));
                          } else if (activeTab === 'clusters') {
                            setFilters((f) => ({ ...f, cluster_name: row.name }));
                          } else {
                            setFilters((f) => ({ ...f, country_name: row.name }));
                          }
                        }}
                        className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                      >
                        Drilldown →
                      </button>
                    </td>
                  </tr>
                ))}
                {((activeTab === 'states' && statesList.length === 0) ||
                  (activeTab === 'districts' && districtsList.length === 0) ||
                  (activeTab === 'clusters' && clustersList.length === 0) ||
                  (activeTab === 'countries' && countriesList.length === 0)) && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      No matching regional lead records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Company / Contact</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Country / State / District</th>
                  <th className="px-4 py-3">Cluster</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredLeads.slice(0, 100).map((lead) => (
                  <tr key={lead._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{lead.lead_id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{lead.company_name}</div>
                      <div className="text-[11px] text-slate-400">{lead.contact_person || lead.email || lead.mobile_number}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${SEGMENT_BADGE_COLORS[lead.primary_segment_key] || ''}`}>
                        {SEGMENT_LABELS[lead.primary_segment_key] || lead.primary_segment_key}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {[lead.country_name, lead.state_name, lead.district_name].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-2.5">{lead.cluster_name || '—'}</td>
                    <td className="px-4 py-2.5 font-semibold">{lead.lead_status}</td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No leads matched these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for District / State Lead Inspection */}
      {leadModalInfo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaBuilding className="text-teal-600" />
                  <span>{leadModalInfo.title}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {leadModalInfo.leads.length} matched unique leads
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadModalInfo(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/70 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5">Lead ID</th>
                    <th className="px-4 py-2.5">Company</th>
                    <th className="px-4 py-2.5">Email / Mobile</th>
                    <th className="px-4 py-2.5">Segment</th>
                    <th className="px-4 py-2.5">Sub-Groups</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Milestone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {leadModalInfo.leads.map((l) => (
                    <tr key={l._id}>
                      <td className="px-4 py-2.5 font-mono font-bold">{l.lead_id}</td>
                      <td className="px-4 py-2.5 font-bold">{l.company_name}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        <div>{l.email || '—'}</div>
                        <div>{l.mobile_number || ''}</div>
                      </td>
                      <td className="px-4 py-2.5">{SEGMENT_LABELS[l.primary_segment_key] || l.primary_segment_key}</td>
                      <td className="px-4 py-2.5">{(l.subgroup_names || []).join(', ') || '—'}</td>
                      <td className="px-4 py-2.5">{l.lead_status}</td>
                      <td className="px-4 py-2.5 text-emerald-600 font-bold">
                        {l.milestones?.epc_sales_converted?.has_order
                          ? 'Buyer EPC'
                          : l.milestones?.epc_registered?.is_registered
                            ? 'Registered EPC'
                            : l.milestones?.franchisee_converted?.is_converted
                              ? 'Converted Franchisee'
                              : <FaCheckCircle className="inline text-slate-300" />}
                      </td>
                    </tr>
                  ))}
                  {leadModalInfo.leads.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No leads found in this region.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
