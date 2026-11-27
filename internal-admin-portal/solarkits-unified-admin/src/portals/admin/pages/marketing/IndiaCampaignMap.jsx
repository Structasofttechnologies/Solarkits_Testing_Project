import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiMapPin,
  FiAlertCircle,
  FiX,
  FiArrowRight
} from 'react-icons/fi';
import { FaPlus, FaPercentage, FaCoins } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  CAMPAIGN_OBJECTIVES,
  fetchLiveClusters,
  fetchLiveWarehouses,
  fetchLiveActiveStates,
  fetchMarketingTerritoryMap,
  getQuotaState
} from './services/marketingDataService';

const clean = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b(district|dist|region|division|cluster|state)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');

const formatInr = (val) => {
  const num = Number(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

export default function IndiaCampaignMap() {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [loadingMapData, setLoadingMapData] = useState(true);
  const [errorGeo, setErrorGeo] = useState(null);

  // Live DB state
  const [mapPayload, setMapPayload] = useState({ summary: {}, states: {}, districts_lookup: [] });
  const [clustersList, setClustersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [activeStatesList, setActiveStatesList] = useState([]);
  const [quota, setQuota] = useState(() => getQuotaState());

  // Filters
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [objectiveFilter, setObjectiveFilter] = useState('ALL');
  const [clusterFilter, setClusterFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [resultMetric, setResultMetric] = useState('STATUS');
  const [selectedState, setSelectedState] = useState('');

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover & Click Area Details
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const containerRef = useRef(null);
  const width = 800;
  const height = 750;

  useEffect(() => {
    const handleQuotaUpdate = () => setQuota(getQuotaState());
    window.addEventListener('solarkits-quota-updated', handleQuotaUpdate);
    return () => window.removeEventListener('solarkits-quota-updated', handleQuotaUpdate);
  }, []);

  const loadLiveTerritory = useCallback(async () => {
    setLoadingMapData(true);
    try {
      const [tData, cList, wList, sList] = await Promise.all([
        fetchMarketingTerritoryMap({
          type: channelFilter !== 'ALL' ? channelFilter.toLowerCase() : undefined,
          objective: objectiveFilter !== 'ALL' ? objectiveFilter : undefined,
          state: selectedState || undefined
        }),
        fetchLiveClusters().catch(() => []),
        fetchLiveWarehouses().catch(() => []),
        fetchLiveActiveStates().catch(() => [])
      ]);
      if (tData) setMapPayload(tData);
      if (Array.isArray(cList)) setClustersList(cList);
      if (Array.isArray(wList)) setWarehousesList(wList);
      if (Array.isArray(sList)) setActiveStatesList(sList);
    } catch (err) {
      console.error('Failed loading live India campaign map:', err.message);
    } finally {
      setLoadingMapData(false);
    }
  }, [channelFilter, objectiveFilter, selectedState]);

  useEffect(() => {
    loadLiveTerritory();
  }, [loadLiveTerritory]);

  // Fetch GeoJSON
  useEffect(() => {
    let isMounted = true;
    setLoadingGeo(true);
    fetch('/geojson/india_districts.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Indian boundary files');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoData(data);
          setLoadingGeo(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorGeo(err.message);
          setLoadingGeo(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const { districtFeatures, stateBoundaries } = useMemo(() => {
    if (!geoData?.features) return { districtFeatures: [], stateBoundaries: [] };
    const dFeatures = [];
    const sBoundaries = [];
    for (const f of geoData.features) {
      if (f.properties?.district && f.properties.district.trim()) dFeatures.push(f);
      else sBoundaries.push(f);
    }
    return { districtFeatures: dFeatures, stateBoundaries: sBoundaries };
  }, [geoData]);

  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo.geoMercator().center([82.5, 0]).scale(1050).translate([width / 2, 770]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData, width, height]);

  // Auto-focus on selected state
  useEffect(() => {
    if (!geoData || !projection) return;
    if (!selectedState) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const stateFeatures = districtFeatures.filter((f) => clean(f.properties?.st_nm || '') === clean(selectedState));
    if (stateFeatures.length > 0) {
      const bounds = d3Geo.geoBounds({ type: 'FeatureCollection', features: stateFeatures });
      const p0 = projection(bounds[0]);
      const p1 = projection(bounds[1]);
      const x0 = Math.min(p0[0], p1[0]);
      const x1 = Math.max(p0[0], p1[0]);
      const y0 = Math.min(p0[1], p1[1]);
      const y1 = Math.max(p0[1], p1[1]);
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      const targetScale = Math.min(6, Math.max(1.8, 0.85 / Math.max(dx / width, dy / height)));
      setZoom(targetScale);
      setPan({ x: width / 2 - targetScale * midX, y: height / 2 - targetScale * midY });
    }
  }, [selectedState, geoData, projection, districtFeatures, width, height]);

  // Normalize API state & district lookups
  const { territoryByStateToken, districtStatsLookup } = useMemo(() => {
    const sMap = new Map();
    const rawStates = mapPayload?.states || {};
    Object.values(rawStates).forEach((st) => {
      const totalLeadsCombined = (st.leads || 0) + (st.segment_leads_uploaded || 0);
      const totalRevCombined = (st.revenue || 0) + (st.segment_revenue_inr || 0);
      const convCombined = (st.conversions || 0) + (st.segment_buyers || 0);
      const ratioVal = totalLeadsCombined > 0
        ? ((convCombined / totalLeadsCombined) * 100).toFixed(1)
        : (st.segment_conversion_rate_pct ? String(st.segment_conversion_rate_pct) : '0.0');

      const whMatches = warehousesList
        .filter((w) => clean(w.state_name || w.state) === clean(st.state_name))
        .map((w) => w.warehouse_name || w.name)
        .filter(Boolean);

      sMap.set(clean(st.state_name), {
        state: st.state_name,
        isActive: Boolean(st.has_active || st.campaign_count > 0 || st.segment_leads_uploaded > 0),
        channels: st.channels || [],
        primaryChannel: st.campaign_type || 'none',
        campaignCount: st.campaign_count || 0,
        delivered: st.delivered || 0,
        leads: st.leads || 0,
        conversions: st.conversions || 0,
        revenueNum: totalRevCombined,
        revenue: formatInr(totalRevCombined),
        successRatio: `${ratioVal}%`,
        warehouses: whMatches,
        clusters: st.clusters || [],
        cluster_details: st.cluster_details || [],
        campaigns: st.running_campaigns || [],
        segment_leads_uploaded: st.segment_leads_uploaded || 0,
        segment_registered: st.segment_registered || 0,
        segment_verified: st.segment_verified || 0,
        segment_buyers: st.segment_buyers || 0,
        segment_orders: st.segment_orders || 0,
        segment_revenue_inr: st.segment_revenue_inr || 0,
        post_campaign_conversions: st.post_campaign_conversions || 0,
        post_campaign_revenue_inr: st.post_campaign_revenue_inr || 0,
        segments: st.segments || []
      });
    });

    const dMap = new Map();
    for (const d of mapPayload?.districts_lookup || []) {
      dMap.set(`${clean(d.state_name)}::${clean(d.district_name)}`, d);
    }

    return { territoryByStateToken: sMap, districtStatsLookup: dMap };
  }, [mapPayload, warehousesList]);

  const getFeatureTerritory = useCallback(
    (feature) => {
      if (!feature?.properties) return null;
      const stName = feature.properties.st_nm || '';
      const distName = feature.properties.district || '';
      const stNode = territoryByStateToken.get(clean(stName)) || null;
      const distNode = districtStatsLookup.get(`${clean(stName)}::${clean(distName)}`) || null;
      return { stNode, distNode };
    },
    [territoryByStateToken, districtStatsLookup]
  );

  const getFeatureFill = useCallback(
    (feature) => {
      const { stNode: t, distNode } = getFeatureTerritory(feature) || {};
      if (!t || (!t.isActive && !distNode)) {
        return '#f1f5f9';
      }

      if (channelFilter === 'WHATSAPP' && !t.channels.includes('whatsapp')) return '#f1f5f9';
      if (channelFilter === 'EMAIL' && !t.channels.includes('email')) return '#f1f5f9';
      if (channelFilter === 'BOTH' && t.primaryChannel !== 'both') return '#f1f5f9';

      if (objectiveFilter !== 'ALL') {
        const hasObj = t.campaigns.some((c) => clean(c.objective) === clean(objectiveFilter));
        if (!hasObj) return '#f1f5f9';
      }

      if (clusterFilter !== 'ALL') {
        const matchesCluster =
          (distNode?.cluster_name && clean(distNode.cluster_name) === clean(clusterFilter)) ||
          t.clusters.some((c) => clean(c).includes(clean(clusterFilter)) || clean(clusterFilter).includes(clean(c)));
        if (!matchesCluster) return '#f1f5f9';
      }

      if (warehouseFilter !== 'ALL') {
        const hasWarehouse = t.warehouses?.some((w) => clean(w).includes(clean(warehouseFilter)) || clean(warehouseFilter).includes(clean(w)));
        if (!hasWarehouse) return '#f1f5f9';
      }

      if (resultMetric === 'SUCCESS_RATIO') {
        const ratioNum = parseFloat(t.successRatio) || 0;
        if (ratioNum >= 14) return '#059669';
        if (ratioNum > 0) return '#0d9488';
        return '#cbd5e1';
      }
      if (resultMetric === 'DELIVERED') {
        return t.delivered > 0 ? '#3b82f6' : '#cbd5e1';
      }
      if (resultMetric === 'LEADS') {
        const leadsVal = (distNode?.leads_uploaded || 0) + (t.leads || 0) + (t.segment_leads_uploaded || 0);
        return leadsVal > 0 ? '#10b981' : '#cbd5e1';
      }
      if (resultMetric === 'CONVERSIONS') {
        const convVal = (distNode?.buyers_count || 0) + (t.conversions || 0) + (t.segment_buyers || 0);
        return convVal > 0 ? '#ef4444' : '#cbd5e1';
      }
      if (resultMetric === 'REVENUE') {
        return t.revenueNum > 0 ? '#8b5cf6' : '#cbd5e1';
      }

      if (t.primaryChannel === 'both') return '#6366f1';
      if (t.primaryChannel === 'whatsapp') return '#10b981';
      if (t.primaryChannel === 'email') return '#3b82f6';
      if (t.segment_leads_uploaded > 0 || distNode?.leads_uploaded > 0) return '#8b5cf6';
      return '#cbd5e1';
    },
    [getFeatureTerritory, channelFilter, objectiveFilter, clusterFilter, warehouseFilter, resultMetric]
  );

  const summary = mapPayload?.summary || {};
  const dynamicStatesDropdown = useMemo(() => {
    const names = new Set();
    activeStatesList.forEach((s) => names.add(s.name || s));
    Object.keys(mapPayload?.states || {}).forEach((k) => names.add(k));
    return Array.from(names).filter(Boolean).sort();
  }, [activeStatesList, mapPayload]);

  const totalLeadsAll = (summary.total_territory_leads || 0) + (summary.total_segment_leads || 0);
  const totalConvAll = (summary.total_territory_conversions || 0) + (summary.total_segment_buyers || 0);
  const totalRevAll = (summary.total_territory_revenue || 0) + (summary.total_segment_revenue_inr || 0);
  const convRatioAll = totalLeadsAll > 0 ? ((totalConvAll / totalLeadsAll) * 100).toFixed(1) : '0.0';

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 15, y: e.clientY - rect.top + 15 });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.8), 10));
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FiMapPin className="w-3.5 h-3.5" />
            <span>100% Live Database Geographic Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Live India Campaign & Segment Map</h1>
          <p className="text-sm text-slate-500">
            Real-time State, Active Cluster & District tracking for campaigns, Segment Groups, registrations, verifications, and revenue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 border border-slate-700 shadow-xs">
            <FaCoins className="text-amber-400" />
            <span>Quota Balance:</span>
            <strong className="text-emerald-400">{(quota?.available ?? 0).toLocaleString()}</strong>
            <span className="text-slate-400">/ {(quota?.total ?? 0).toLocaleString()}</span>
          </div>

          <button
            onClick={() => navigate('/marketing-panel/create-campaign')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
          >
            <FaPlus />
            <span>Launch Campaign in Territory</span>
          </button>
        </div>
      </div>

      {/* Live Dynamic KPI Territory Banner (Zero static defaults) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active States</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>{summary.total_live_states || 0} Active</span>
          </div>
          <span className="text-[11px] text-slate-500">{activeStatesList.length} Configured States</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Franchisee Clusters</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {summary.total_live_clusters ?? clustersList.length ?? 0} Clusters
          </div>
          <span className="text-[11px] text-slate-500">
            {summary.total_segment_leads || 0} Segment Leads • {summary.total_segment_registered || 0} Reg
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion Ratio</div>
          <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <FaPercentage className="w-4 h-4 text-emerald-500" />
            <span>{convRatioAll}%</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {summary.total_post_campaign_conversions || 0} Post-Campaign Conversions
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attributed Revenue</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{formatInr(totalRevAll)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {totalConvAll} Buyer Conversions
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Campaign Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">WhatsApp Only</option>
              <option value="EMAIL">Email Only</option>
              <option value="BOTH">Dual Omnichannel</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Campaign Objective</label>
            <select
              value={objectiveFilter}
              onChange={(e) => setObjectiveFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Objectives</option>
              {CAMPAIGN_OBJECTIVES.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Cluster Filter</label>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
            >
              <option value="ALL">All Clusters ({clustersList.length})</option>
              {clustersList.map((c) => (
                <option key={c._id || c.cluster_name} value={c.cluster_name}>
                  {c.cluster_name} ({c.state_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Warehouse Filter</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-hidden"
            >
              <option value="ALL">All Warehouses ({warehousesList.length})</option>
              {warehousesList.map((w) => (
                <option key={w._id || w.warehouse_code} value={w.warehouse_name}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Result Mode</label>
            <select
              value={resultMetric}
              onChange={(e) => setResultMetric(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-hidden text-emerald-600 dark:text-emerald-400"
            >
              <option value="STATUS">Live Campaigns & Segments</option>
              <option value="SUCCESS_RATIO">Success Ratio (%)</option>
              <option value="DELIVERED">Messages Delivered</option>
              <option value="LEADS">Segment & Form Leads</option>
              <option value="CONVERSIONS">Buyers & Conversions</option>
              <option value="REVENUE">Attributed Revenue</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">State Focus</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="">All India</option>
              {dynamicStatesDropdown.map((stName) => (
                <option key={stName} value={stName}>{stName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map + Details Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          ref={containerRef}
          className="lg:col-span-2 relative h-[720px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden select-none cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHoveredData(null);
          }}
          onWheel={handleWheel}
        >
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
            <button onClick={() => setZoom((prev) => Math.min(prev * 1.35, 10))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer" title="Zoom In">
              <FiZoomIn />
            </button>
            <button onClick={() => setZoom((prev) => Math.max(prev / 1.35, 0.8))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer" title="Zoom Out">
              <FiZoomOut />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setSelectedState('');
                setClusterFilter('ALL');
                setWarehouseFilter('ALL');
              }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer"
              title="Reset Map"
            >
              <FiRefreshCw />
            </button>
          </div>

          {(loadingGeo || loadingMapData) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 dark:bg-slate-800/75 backdrop-blur-xs">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">Loading Live Territory Telemetry...</p>
            </div>
          )}

          {errorGeo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <FiAlertCircle className="w-12 h-12 text-rose-500 mb-2" />
              <p className="text-sm font-bold text-rose-600">{errorGeo}</p>
            </div>
          )}

          {pathGenerator && (
            <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {districtFeatures.map((feature, idx) => {
                  const fill = getFeatureFill(feature);
                  const isHovered =
                    hoveredData &&
                    hoveredData.district === feature.properties?.district &&
                    hoveredData.state === feature.properties?.st_nm;
                  const isSelected =
                    selectedTerritory &&
                    selectedTerritory.district === feature.properties?.district &&
                    selectedTerritory.state === feature.properties?.st_nm;

                  return (
                    <path
                      key={`d-${idx}`}
                      d={pathGenerator(feature)}
                      fill={fill}
                      stroke={isSelected ? '#1e1b4b' : isHovered ? '#4338ca' : '#cbd5e1'}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.4}
                      className="transition-colors duration-150 cursor-pointer"
                      onMouseEnter={() => {
                        const { stNode, distNode } = getFeatureTerritory(feature) || {};
                        setHoveredData({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: stNode,
                          districtStats: distNode
                        });
                      }}
                      onClick={() => {
                        const { stNode, distNode } = getFeatureTerritory(feature) || {};
                        setSelectedTerritory({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: stNode,
                          districtStats: distNode
                        });
                      }}
                    />
                  );
                })}

                {stateBoundaries.map((boundary, idx) => (
                  <path
                    key={`b-${idx}`}
                    d={pathGenerator(boundary)}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                ))}
              </g>
            </svg>
          )}

          {/* Hover Tooltip */}
          {hoveredData && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs max-w-xs space-y-1.5 backdrop-blur-md"
              style={{
                left: `${Math.min(tooltipPos.x, width - 270)}px`,
                top: `${Math.min(tooltipPos.y, height - 220)}px`
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                <span className="font-bold">{hoveredData.district}, {hoveredData.state}</span>
                {hoveredData.territory?.isActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Live</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold">Inactive</span>
                )}
              </div>

              {hoveredData.districtStats && (
                <div className="text-[11px] space-y-0.5 border-b border-slate-700 pb-1">
                  <p className="text-amber-300 font-bold">
                    {hoveredData.districtStats.cluster_name || 'Outside Cluster'}
                  </p>
                  <p>
                    District: <strong>{hoveredData.districtStats.leads_uploaded}</strong> Leads •{' '}
                    <strong>{hoveredData.districtStats.registered_count}</strong> Reg •{' '}
                    <strong>{hoveredData.districtStats.buyers_count}</strong> Buyers
                  </p>
                </div>
              )}

              {hoveredData.territory ? (
                <div className="space-y-1 text-[11px]">
                  <div className="text-slate-300">
                    State Campaigns: <strong className="text-white">{hoveredData.territory.campaignCount}</strong> • Active Clusters:{' '}
                    <strong className="text-indigo-300">{hoveredData.territory.cluster_details?.length || 0}</strong>
                  </div>
                  <div className="text-slate-300">
                    Segment Leads: <strong className="text-violet-300">{hoveredData.territory.segment_leads_uploaded}</strong> • Reg:{' '}
                    <strong className="text-blue-300">{hoveredData.territory.segment_registered}</strong> • Ver:{' '}
                    <strong className="text-emerald-300">{hoveredData.territory.segment_verified}</strong>
                  </div>
                  <div className="text-slate-300">
                    Campaign Impact Conv: <strong className="text-emerald-400">{hoveredData.territory.post_campaign_conversions}</strong> • Rev:{' '}
                    <strong className="text-emerald-300">{hoveredData.territory.revenue}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No active campaigns or leads mapped in this region yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Side Territory Details Drawer */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="space-y-4 overflow-y-auto max-h-[620px] pr-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FiMapPin className="text-indigo-600" />
                <span>Territory Details</span>
              </h3>
              {selectedTerritory && (
                <button onClick={() => setSelectedTerritory(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <FiX />
                </button>
              )}
            </div>

            {selectedTerritory ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedTerritory.district}</h4>
                  <p className="text-xs text-slate-500">{selectedTerritory.state}</p>
                </div>

                {selectedTerritory.territory ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Campaign Delivered</span>
                        <strong className="text-sm">{selectedTerritory.territory.delivered.toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Segment Uploaded</span>
                        <strong className="text-sm text-indigo-600">{selectedTerritory.territory.segment_leads_uploaded}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Registered / Verified</span>
                        <strong className="text-sm text-blue-600">
                          {selectedTerritory.territory.segment_registered} / {selectedTerritory.territory.segment_verified}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Buyers & Impact</span>
                        <strong className="text-sm text-emerald-600">
                          {selectedTerritory.territory.segment_buyers} ({selectedTerritory.territory.post_campaign_conversions} post-camp)
                        </strong>
                      </div>
                    </div>

                    {/* Active Clusters & Districts inside Clusters */}
                    {selectedTerritory.territory.cluster_details?.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Active Clusters & Districts in {selectedTerritory.state}:
                        </span>
                        {selectedTerritory.territory.cluster_details.map((clu) => (
                          <div key={clu.cluster_code} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: clu.color_code }} />
                                {clu.cluster_name} ({clu.cluster_code})
                              </span>
                              <span className="text-[10px] font-bold text-indigo-600">
                                {clu.leads_uploaded}L • {clu.registered_count}R • {clu.buyers_count}B
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Districts: {(clu.districts || []).join(', ') || 'None'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Segment Groups in this State */}
                    {selectedTerritory.territory.segments?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Segment Groups Impact:</span>
                        {selectedTerritory.territory.segments.map((sg) => (
                          <div key={sg.segment_id} className="p-2 rounded-lg bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-[11px] flex items-center justify-between">
                            <span className="font-bold text-violet-900 dark:text-violet-200">{sg.segment_name}</span>
                            <span className="font-semibold text-violet-700 dark:text-violet-300">
                              {sg.leads_uploaded}L → {sg.registered_count}R → {sg.buyers_count}B
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Running Campaigns */}
                    {selectedTerritory.territory.campaigns?.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campaigns in {selectedTerritory.state}:</span>
                        {selectedTerritory.territory.campaigns.map((c, i) => (
                          <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs flex items-center justify-between">
                            <div className="truncate mr-2">
                              <div className="font-bold truncate">{c.name}</div>
                              <div className="text-[10px] text-slate-400 uppercase">
                                {c.type} • {formatInr(c.revenue)} • {c.leads} Leads
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold shrink-0">
                              {c.status || 'Live'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <FiAlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold">No Active Campaigns or Segments in {selectedTerritory.district}</p>
                    <p className="text-slate-500 text-[11px]">Click below to launch a campaign or upload Segment leads for this state.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <FiMapPin className="w-8 h-8 text-indigo-500 mx-auto opacity-70 animate-bounce" />
                <p className="font-bold text-slate-700 dark:text-slate-200">Interactive Live Territory Explorer</p>
                <p>Click any state or district on the India map to inspect active clusters, districts inside clusters, Segment Group metrics, and campaign impact.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => navigate('/marketing-panel/create-campaign')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <span>Target This Territory Now</span>
              <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
