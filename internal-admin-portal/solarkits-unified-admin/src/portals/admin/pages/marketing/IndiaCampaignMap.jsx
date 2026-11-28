import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiMapPin,
  FiAlertCircle,
  FiX,
  FiArrowRight,
  FiSliders
} from 'react-icons/fi';
import { FaPlus, FaCoins } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  CAMPAIGN_OBJECTIVES,
  fetchLiveClusters,
  fetchLiveWarehouses,
  fetchLiveActiveStates,
  fetchLiveQueueStatus,
  fetchMarketingTerritoryMap
} from './services/marketingDataService';
import {
  MAP_COLOR_PALETTES,
  loadSavedPaletteId,
  savePaletteId,
  loadSavedCustomStateColors,
  saveCustomStateColors,
  buildStateColorMap,
  getStateFallbackColor,
  normalizeGeoKey
} from '../../../../utils/mapColorPalettes';

const clean = (s) => normalizeGeoKey(s);

const SVG_WIDTH = 760;
const SVG_HEIGHT = 680;

const formatInr = (val) => {
  const num = Number(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

export default function IndiaCampaignMap({ embedded = false }) {
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
  const [queueStatus, setQueueStatus] = useState(null);

  // Cascading Filters + Left-side Drilldown Tab
  const [leftTab, setLeftTab] = useState('states'); // 'states' | 'clusters' | 'districts'
  const [selectedState, setSelectedState] = useState('');
  const [clusterFilter, setClusterFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [epcTypeFilter, setEpcTypeFilter] = useState('ALL'); // 'ALL' | 'Registered EPC' | 'Verified EPC' | 'Buyer EPC'
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [objectiveFilter, setObjectiveFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [resultMetric, setResultMetric] = useState('STATE_CLUSTERS');

  // Dynamic State Color Palette & Customizer
  const [paletteId, setPaletteId] = useState(() => loadSavedPaletteId());
  const [customStateColors, setCustomStateColors] = useState(() => loadSavedCustomStateColors());
  const [showColorTools, setShowColorTools] = useState(false);
  const [pickState, setPickState] = useState('');

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

  const loadLiveTerritory = useCallback(async () => {
    setLoadingMapData(true);
    try {
      const [tData, cList, wList, sList, qStat] = await Promise.all([
        fetchMarketingTerritoryMap({
          type: channelFilter !== 'ALL' ? channelFilter.toLowerCase() : undefined,
          objective: objectiveFilter !== 'ALL' ? objectiveFilter : undefined
        }),
        fetchLiveClusters(true).catch(() => []),
        fetchLiveWarehouses().catch(() => []),
        fetchLiveActiveStates().catch(() => []),
        fetchLiveQueueStatus().catch(() => null)
      ]);
      if (tData) setMapPayload(tData);
      if (Array.isArray(cList)) setClustersList(cList);
      if (Array.isArray(wList)) setWarehousesList(wList);
      if (Array.isArray(sList)) setActiveStatesList(sList);
      if (qStat) setQueueStatus(qStat);
    } catch (err) {
      console.error('Failed loading live India campaign map:', err.message);
    } finally {
      setLoadingMapData(false);
    }
  }, [channelFilter, objectiveFilter]);

  useEffect(() => {
    loadLiveTerritory();
  }, [loadLiveTerritory]);

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

  // Fit entire India cleanly inside SVG_WIDTH x SVG_HEIGHT with zero top gap or bottom clip
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData?.features?.length) return { projection: null, pathGenerator: null };
    const fullCollection = { type: 'FeatureCollection', features: geoData.features };
    const proj = d3Geo.geoMercator().fitExtent([[18, 18], [SVG_WIDTH - 18, SVG_HEIGHT - 18]], fullCollection);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // Smooth Zoom to State or District when selected
  useEffect(() => {
    if (!geoData || !projection) return;
    if (!selectedState && districtFilter === 'ALL') {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const targetFeatures = districtFilter !== 'ALL'
      ? districtFeatures.filter(
          (f) =>
            clean(f.properties?.district || '') === clean(districtFilter) &&
            (!selectedState || clean(f.properties?.st_nm || '') === clean(selectedState))
        )
      : districtFeatures.filter((f) => clean(f.properties?.st_nm || '') === clean(selectedState));

    if (targetFeatures.length > 0) {
      const bounds = d3Geo.geoBounds({ type: 'FeatureCollection', features: targetFeatures });
      const p0 = projection(bounds[0]);
      const p1 = projection(bounds[1]);
      if (!p0 || !p1) return;
      const x0 = Math.min(p0[0], p1[0]);
      const x1 = Math.max(p0[0], p1[0]);
      const y0 = Math.min(p0[1], p1[1]);
      const y1 = Math.max(p0[1], p1[1]);
      const dx = Math.max(10, Math.abs(x1 - x0));
      const dy = Math.max(10, Math.abs(y1 - y0));
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      const targetScale = Math.min(6, Math.max(1.8, 0.78 / Math.max(dx / SVG_WIDTH, dy / SVG_HEIGHT)));
      setZoom(targetScale);
      setPan({ x: SVG_WIDTH / 2 - targetScale * midX, y: SVG_HEIGHT / 2 - targetScale * midY });
    }
  }, [selectedState, districtFilter, geoData, projection, districtFeatures]);

  // Normalize API state, cluster & district lookups
  const {
    territoryByStateToken,
    districtStatsLookup,
    allStateRows,
    allClusterRows,
    allDistrictRows,
    allStateNames
  } = useMemo(() => {
    const sMap = new Map();
    const rawStates = mapPayload?.states || {};
    const stRows = [];
    const cluRows = [];

    Object.values(rawStates).forEach((st) => {
      const totalLeadsCombined = (st.leads || 0) + (st.segment_leads_uploaded || 0);
      const totalRevCombined = (st.revenue || 0) + (st.segment_revenue_inr || 0) + (st.platform_revenue_inr || 0);
      const convCombined = (st.conversions || 0) + (st.platform_buyer_epcs || 0);
      const ratioVal = totalLeadsCombined > 0
        ? ((convCombined / totalLeadsCombined) * 100).toFixed(1)
        : st.platform_total_epcs > 0
          ? (((st.platform_buyer_epcs || 0) / st.platform_total_epcs) * 100).toFixed(1)
          : '0.0';

      const whMatches = warehousesList
        .filter((w) => clean(w.state_name || w.state) === clean(st.state_name))
        .map((w) => w.warehouse_name || w.name)
        .filter(Boolean);

      const enriched = {
        state: st.state_name,
        isActive: Boolean(
          st.has_active ||
          st.campaign_count > 0 ||
          st.platform_total_epcs > 0 ||
          (st.cluster_details || []).length > 0
        ),
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
        platform_total_epcs: st.platform_total_epcs || st.epc_count || 0,
        platform_registered_epcs: st.platform_registered_epcs || 0,
        platform_verified_epcs: st.platform_verified_epcs || 0,
        platform_buyer_epcs: st.platform_buyer_epcs || 0,
        platform_orders: st.platform_orders || 0,
        platform_revenue_inr: st.platform_revenue_inr || 0,
        segment_leads_uploaded: st.segment_leads_uploaded || 0,
        segment_registered: st.segment_registered || 0,
        segment_verified: st.segment_verified || 0,
        segment_buyers: st.segment_buyers || 0,
        post_campaign_conversions: st.post_campaign_conversions || 0
      };

      sMap.set(clean(st.state_name), enriched);
      if (enriched.platform_total_epcs > 0 || enriched.cluster_details.length > 0 || enriched.campaignCount > 0) {
        stRows.push(enriched);
      }
      for (const clu of st.cluster_details || []) {
        const totalE = clu.platform_total_epcs || 0;
        const buyerE = clu.platform_buyer_epcs || 0;
        cluRows.push({
          ...clu,
          state_name: st.state_name,
          conv_pct: totalE > 0 ? ((buyerE / totalE) * 100).toFixed(1) : '0.0'
        });
      }
    });

    const dMap = new Map();
    const dRows = [];
    for (const d of mapPayload?.districts_lookup || []) {
      const k = `${clean(d.state_name)}::${clean(d.district_name)}`;
      dMap.set(k, d);
      dRows.push(d);
    }

    const stNamesSet = new Set(allStateNamesFromGeo(geoData, rawStates));
    stRows.sort((a, b) => b.platform_total_epcs - a.platform_total_epcs || b.cluster_details.length - a.cluster_details.length);
    cluRows.sort((a, b) => (b.platform_total_epcs || 0) - (a.platform_total_epcs || 0) || String(a.cluster_name).localeCompare(b.cluster_name));
    dRows.sort((a, b) => (b.platform_total_epcs || 0) - (a.platform_total_epcs || 0));

    return {
      territoryByStateToken: sMap,
      districtStatsLookup: dMap,
      allStateRows: stRows,
      allClusterRows: cluRows,
      allDistrictRows: dRows,
      allStateNames: Array.from(stNamesSet).sort((a, b) => a.localeCompare(b))
    };
  }, [mapPayload, warehousesList, geoData]);

  // Cascading Dropdown Options & Filtered Table Rows
  const epcCountForType = useCallback((row) => {
    if (!row) return 0;
    if (epcTypeFilter === 'Registered EPC') return Number(row.platform_registered_epcs || 0);
    if (epcTypeFilter === 'Verified EPC') return Number(row.platform_verified_epcs || 0);
    if (epcTypeFilter === 'Buyer EPC') return Number(row.platform_buyer_epcs || 0);
    return Number(row.platform_total_epcs || 0);
  }, [epcTypeFilter]);

  const cascadedClustersOptions = useMemo(() => {
    if (!selectedState) return clustersList;
    return clustersList.filter((c) => clean(c.state_name) === clean(selectedState));
  }, [clustersList, selectedState]);

  const cascadedDistrictsOptions = useMemo(() => {
    return allDistrictRows.filter((d) => {
      if (selectedState && clean(d.state_name) !== clean(selectedState)) return false;
      if (clusterFilter !== 'ALL' && clean(d.cluster_name) !== clean(clusterFilter)) return false;
      return true;
    });
  }, [allDistrictRows, selectedState, clusterFilter]);

  const visibleStateRows = useMemo(() => {
    return allStateRows.filter((st) => {
      if (selectedState && clean(st.state) !== clean(selectedState)) return false;
      if (epcTypeFilter !== 'ALL' && epcCountForType(st) === 0) return false;
      return true;
    });
  }, [allStateRows, selectedState, epcTypeFilter, epcCountForType]);

  const visibleClusterRows = useMemo(() => {
    return allClusterRows.filter((cl) => {
      if (selectedState && clean(cl.state_name) !== clean(selectedState)) return false;
      if (clusterFilter !== 'ALL' && clean(cl.cluster_name) !== clean(clusterFilter)) return false;
      if (epcTypeFilter !== 'ALL' && epcCountForType(cl) === 0) return false;
      return true;
    });
  }, [allClusterRows, selectedState, clusterFilter, epcTypeFilter, epcCountForType]);

  const visibleDistrictRows = useMemo(() => {
    return allDistrictRows.filter((d) => {
      if (selectedState && clean(d.state_name) !== clean(selectedState)) return false;
      if (clusterFilter !== 'ALL' && clean(d.cluster_name) !== clean(clusterFilter)) return false;
      if (districtFilter !== 'ALL' && clean(d.district_name) !== clean(districtFilter)) return false;
      if (epcTypeFilter !== 'ALL' && epcCountForType(d) === 0) return false;
      return true;
    });
  }, [allDistrictRows, selectedState, clusterFilter, districtFilter, epcTypeFilter, epcCountForType]);

  useEffect(() => {
    if (!pickState && allStateNames.length > 0) setPickState(allStateNames[0]);
  }, [pickState, allStateNames]);

  const stateColorMap = useMemo(
    () => buildStateColorMap(allStateNames, paletteId, customStateColors),
    [allStateNames, paletteId, customStateColors]
  );

  const resolveStateColor = useCallback(
    (stName) => {
      if (!stName) return '#E2E8F0';
      return (
        stateColorMap.get(clean(stName)) ||
        stateColorMap.get(String(stName).toLowerCase()) ||
        getStateFallbackColor(stName, paletteId, customStateColors)
      );
    },
    [stateColorMap, paletteId, customStateColors]
  );

  const getFeatureTerritory = useCallback(
    (feature) => {
      if (!feature?.properties) return null;
      const stName = feature.properties.st_nm || '';
      const distName = feature.properties.district || '';
      const stNode = territoryByStateToken.get(clean(stName)) || null;
      const distNode = districtStatsLookup.get(`${clean(stName)}::${clean(distName)}`) || null;
      const clusterNode =
        distNode?.cluster_name && stNode?.cluster_details
          ? stNode.cluster_details.find((cd) => cd.cluster_code === distNode.cluster_code || cd.cluster_name === distNode.cluster_name) || null
          : null;
      return { stNode, distNode, clusterNode };
    },
    [territoryByStateToken, districtStatsLookup]
  );

  const getFeatureStyle = useCallback(
    (feature) => {
      const stName = feature?.properties?.st_nm || '';
      const distName = feature?.properties?.district || '';
      const { stNode: t, distNode } = getFeatureTerritory(feature) || {};
      const stateColor = resolveStateColor(stName);

      if (selectedState && clean(stName) !== clean(selectedState)) {
        return { fill: stateColor, fillOpacity: 0.14 };
      }

      if (clusterFilter !== 'ALL') {
        const matchesCluster = distNode?.cluster_name && clean(distNode.cluster_name) === clean(clusterFilter);
        if (!matchesCluster) return { fill: stateColor, fillOpacity: 0.16 };
      }

      if (districtFilter !== 'ALL' && clean(distName) !== clean(districtFilter)) {
        return { fill: stateColor, fillOpacity: 0.18 };
      }

      if (warehouseFilter !== 'ALL') {
        const hasWh = t?.warehouses?.some((w) => clean(w).includes(clean(warehouseFilter)) || clean(warehouseFilter).includes(clean(w)));
        if (!hasWh) return { fill: '#f1f5f9', fillOpacity: 0.5 };
      }

      if (channelFilter === 'WHATSAPP' && !(t?.channels || []).includes('whatsapp')) return { fill: '#f1f5f9', fillOpacity: 0.5 };
      if (channelFilter === 'EMAIL' && !(t?.channels || []).includes('email')) return { fill: '#f1f5f9', fillOpacity: 0.5 };
      if (channelFilter === 'BOTH' && t?.primaryChannel !== 'both') return { fill: '#f1f5f9', fillOpacity: 0.5 };

      if (objectiveFilter !== 'ALL') {
        const hasObj = (t?.campaigns || []).some((c) => clean(c.objective) === clean(objectiveFilter));
        if (!hasObj) return { fill: '#f1f5f9', fillOpacity: 0.5 };
      }

      if (epcTypeFilter !== 'ALL') {
        const distTypeCount = epcCountForType(distNode);
        const stateTypeCount = epcCountForType(t);
        if (distTypeCount === 0 && stateTypeCount === 0) {
          return { fill: stateColor, fillOpacity: 0.15 };
        }
      }

      if (resultMetric === 'STATE_CLUSTERS') {
        const distVal = epcCountForType(distNode);
        const stVal = epcCountForType(t);
        const hasEpcOrCluster = distVal > 0 || Boolean(distNode?.cluster_name) || stVal > 0;
        return {
          fill: stateColor,
          fillOpacity: distVal > 0 ? 0.94 : distNode?.cluster_name ? 0.72 : hasEpcOrCluster ? 0.42 : 0.25
        };
      }

      if (!t || (!t.isActive && !distNode)) return { fill: '#f1f5f9', fillOpacity: 0.8 };
      if (resultMetric === 'SUCCESS_RATIO') {
        const ratioNum = parseFloat(t.successRatio) || 0;
        return { fill: ratioNum >= 14 ? '#059669' : ratioNum > 0 ? '#0d9488' : '#cbd5e1', fillOpacity: 0.92 };
      }
      if (resultMetric === 'LEADS') {
        const val = epcCountForType(distNode) + (t.leads || 0);
        return { fill: val > 0 ? '#10b981' : '#cbd5e1', fillOpacity: 0.92 };
      }
      if (resultMetric === 'CONVERSIONS') {
        const val = (distNode?.platform_buyer_epcs || 0) + (t.platform_buyer_epcs || 0);
        return { fill: val > 0 ? '#ef4444' : '#cbd5e1', fillOpacity: 0.92 };
      }
      if (resultMetric === 'REVENUE') return { fill: t.revenueNum > 0 ? '#8b5cf6' : '#cbd5e1', fillOpacity: 0.92 };

      return { fill: stateColor, fillOpacity: 0.85 };
    },
    [
      getFeatureTerritory,
      resolveStateColor,
      selectedState,
      clusterFilter,
      districtFilter,
      warehouseFilter,
      channelFilter,
      objectiveFilter,
      epcTypeFilter,
      epcCountForType,
      resultMetric
    ]
  );

  // Dynamic Filtered Summary KPIs (reflects State / Cluster / District / EPC Type filters)
  const filteredSummary = useMemo(() => {
    const sourceRows = selectedState || clusterFilter !== 'ALL' || districtFilter !== 'ALL'
      ? visibleDistrictRows.length > 0 && (clusterFilter !== 'ALL' || districtFilter !== 'ALL')
        ? visibleDistrictRows
        : visibleClusterRows.length > 0 && selectedState
          ? visibleClusterRows
          : visibleStateRows
      : null;

    if (!sourceRows) {
      return mapPayload?.summary?.platform_totals || {};
    }
    return {
      total_epcs: sourceRows.reduce((a, r) => a + Number(r.platform_total_epcs || 0), 0),
      registered_epcs: sourceRows.reduce((a, r) => a + Number(r.platform_registered_epcs || 0), 0),
      verified_epcs: sourceRows.reduce((a, r) => a + Number(r.platform_verified_epcs || 0), 0),
      buyer_epcs: sourceRows.reduce((a, r) => a + Number(r.platform_buyer_epcs || 0), 0),
      total_orders: sourceRows.reduce((a, r) => a + Number(r.platform_orders || 0), 0),
      total_clusters: visibleClusterRows.length,
      total_states: visibleStateRows.length
    };
  }, [mapPayload, selectedState, clusterFilter, districtFilter, visibleDistrictRows, visibleClusterRows, visibleStateRows]);

  const dynamicStatesDropdown = useMemo(() => {
    const names = new Set();
    activeStatesList.forEach((s) => names.add(s.name || s));
    Object.keys(mapPayload?.states || {}).forEach((k) => names.add(k));
    return Array.from(names).filter(Boolean).sort();
  }, [activeStatesList, mapPayload]);

  const selectStateDrill = (stName) => {
    setSelectedState(stName);
    setClusterFilter('ALL');
    setDistrictFilter('ALL');
    if (stName) setLeftTab('clusters');
    else setLeftTab('states');
  };

  const selectClusterDrill = (cluName, stateHint = '') => {
    if (stateHint) setSelectedState(stateHint);
    setClusterFilter(cluName);
    setDistrictFilter('ALL');
    if (cluName !== 'ALL') setLeftTab('districts');
  };

  const resetAllGeoFilters = () => {
    setSelectedState('');
    setClusterFilter('ALL');
    setDistrictFilter('ALL');
    setEpcTypeFilter('ALL');
    setChannelFilter('ALL');
    setObjectiveFilter('ALL');
    setWarehouseFilter('ALL');
    setSelectedTerritory(null);
    setLeftTab('states');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
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

  const handleStateColorPick = (stateName, hex) => {
    if (!stateName) return;
    const next = { ...customStateColors, [stateName]: hex, [clean(stateName)]: hex };
    setCustomStateColors(next);
    saveCustomStateColors(next);
  };

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100 w-full mx-auto">
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <FiMapPin className="w-3.5 h-3.5" />
              <span>100% Live Database EPC &amp; Cluster Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Live India EPC &amp; Cluster Map</h1>
            <p className="text-sm text-slate-500">
              State → Live Franchise Cluster Management → District EPC visibility across Registered, Verified, and Buyer tiers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 border border-slate-700 shadow-xs">
              <FaCoins className="text-amber-400" />
              <span>Dispatch Queue:</span>
              <strong className="text-emerald-400">{queueStatus?.stats?.totalSent || 0} Sent</strong>
              <span className="text-slate-400">/ {queueStatus?.pendingInQueue || 0} Pending</span>
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
      )}

      {/* Platform EPC Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform Total EPCs</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {(filteredSummary.total_epcs || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">
            {selectedState ? `In ${selectedState}` : `Across ${filteredSummary.total_states || visibleStateRows.length} States`}
          </span>
        </div>

        <div className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border shadow-xs cursor-pointer transition ${epcTypeFilter === 'Registered EPC' ? 'border-amber-500 ring-2 ring-amber-400/30' : 'border-amber-200 dark:border-amber-800/60'}`}
          onClick={() => setEpcTypeFilter((t) => (t === 'Registered EPC' ? 'ALL' : 'Registered EPC'))}
        >
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Registered EPCs</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">
            {(filteredSummary.registered_epcs || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">Signup Completed</span>
        </div>

        <div className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border shadow-xs cursor-pointer transition ${epcTypeFilter === 'Verified EPC' ? 'border-blue-500 ring-2 ring-blue-400/30' : 'border-blue-200 dark:border-blue-800/60'}`}
          onClick={() => setEpcTypeFilter((t) => (t === 'Verified EPC' ? 'ALL' : 'Verified EPC'))}
        >
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Verified EPCs</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">
            {(filteredSummary.verified_epcs || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">GSTIN / KYC Approved</span>
        </div>

        <div className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border shadow-xs cursor-pointer transition ${epcTypeFilter === 'Buyer EPC' ? 'border-emerald-500 ring-2 ring-emerald-400/30' : 'border-emerald-200 dark:border-emerald-800/60'}`}
          onClick={() => setEpcTypeFilter((t) => (t === 'Buyer EPC' ? 'ALL' : 'Buyer EPC'))}
        >
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Buyer EPCs</div>
          <div className="text-xl font-black text-emerald-600 mt-0.5">
            {(filteredSummary.buyer_epcs || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500">{filteredSummary.total_orders || 0} Confirmed Orders</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Live Clusters</div>
          <div className="text-xl font-black text-indigo-600 mt-0.5">
            {visibleClusterRows.length}
          </div>
          <span className="text-[11px] text-slate-500">
            {selectedState ? `In ${selectedState}` : 'From Cluster Management'}
          </span>
        </div>
      </div>

      {/* Cascading Filters + Dynamic State Color Palette Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">State Filter</label>
            <select
              value={selectedState}
              onChange={(e) => selectStateDrill(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="">All States ({dynamicStatesDropdown.length})</option>
              {dynamicStatesDropdown.map((stName) => (
                <option key={stName} value={stName}>{stName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Cluster Filter</label>
            <select
              value={clusterFilter}
              onChange={(e) => selectClusterDrill(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-indigo-600"
            >
              <option value="ALL">All Clusters ({cascadedClustersOptions.length})</option>
              {cascadedClustersOptions.map((c) => (
                <option key={c._id || c.cluster_name} value={c.cluster_name}>
                  {c.cluster_name} ({c.state_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">District Filter</label>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                if (e.target.value !== 'ALL') setLeftTab('districts');
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="ALL">All Districts ({cascadedDistrictsOptions.length})</option>
              {cascadedDistrictsOptions.map((d) => (
                <option key={`${d.state_name}::${d.district_name}`} value={d.district_name}>
                  {d.district_name} ({d.state_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">EPC Type Filter</label>
            <select
              value={epcTypeFilter}
              onChange={(e) => setEpcTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-emerald-700 dark:text-emerald-400"
            >
              <option value="ALL">All EPC Types</option>
              <option value="Registered EPC">Registered EPCs Only</option>
              <option value="Verified EPC">Verified EPCs Only</option>
              <option value="Buyer EPC">Buyer EPCs Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="BOTH">Dual</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Color Mode</label>
            <select
              value={resultMetric}
              onChange={(e) => setResultMetric(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-teal-600"
            >
              <option value="STATE_CLUSTERS">Unique State / Cluster Color</option>
              <option value="LEADS">Platform EPC Volume</option>
              <option value="CONVERSIONS">Buyer EPC Concentration</option>
              <option value="SUCCESS_RATIO">Success Ratio (%)</option>
              <option value="REVENUE">Attributed Revenue</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Color Palette</label>
            <select
              value={paletteId}
              onChange={(e) => {
                setPaletteId(e.target.value);
                savePaletteId(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            >
              {MAP_COLOR_PALETTES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowColorTools((s) => !s)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold cursor-pointer"
            >
              <FiSliders /> {showColorTools ? 'Hide Color Picker' : 'Customize State Color'}
            </button>
            <select
              value={objectiveFilter}
              onChange={(e) => setObjectiveFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="ALL">All Objectives</option>
              {CAMPAIGN_OBJECTIVES.map((obj) => (
                <option key={obj.id} value={obj.id}>{obj.label}</option>
              ))}
            </select>
          </div>

          {(selectedState || clusterFilter !== 'ALL' || districtFilter !== 'ALL' || epcTypeFilter !== 'ALL' || channelFilter !== 'ALL' || objectiveFilter !== 'ALL') && (
            <button
              type="button"
              onClick={resetAllGeoFilters}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              ✕ Reset All Geo &amp; EPC Filters
            </button>
          )}
        </div>

        {showColorTools && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-500">Pick State Color (Applies to all clusters inside State):</span>
            <select
              value={pickState}
              onChange={(e) => setPickState(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              {allStateNames.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <input
              type="color"
              value={resolveStateColor(pickState)}
              onChange={(e) => handleStateColorPick(pickState, e.target.value)}
              className="w-8 h-7 rounded border border-slate-300 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => {
                setCustomStateColors({});
                saveCustomStateColors({});
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer"
            >
              Reset Custom Colors
            </button>
          </div>
        )}
      </div>

      {/* REQUIRED SPLIT: LEFT = Tables & State->Cluster->District Drilldown | RIGHT = Full-Height India Map */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT PANEL */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            {/* Breadcrumb Drilldown Trail */}
            <div className="px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
              <div className="flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <button type="button" onClick={resetAllGeoFilters} className="text-indigo-600 hover:underline cursor-pointer">
                  All India
                </button>
                {selectedState && (
                  <>
                    <span>›</span>
                    <button
                      type="button"
                      onClick={() => selectStateDrill(selectedState)}
                      className="text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                    >
                      {selectedState}
                    </button>
                  </>
                )}
                {clusterFilter !== 'ALL' && (
                  <>
                    <span>›</span>
                    <span className="text-emerald-600">{clusterFilter}</span>
                  </>
                )}
                {districtFilter !== 'ALL' && (
                  <>
                    <span>›</span>
                    <span className="text-amber-600">{districtFilter}</span>
                  </>
                )}
              </div>
              {epcTypeFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px]">
                  {epcTypeFilter}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'states', label: `States (${visibleStateRows.length})` },
                  { id: 'clusters', label: `${selectedState ? `${selectedState} Clusters` : 'Clusters'} (${visibleClusterRows.length})` },
                  { id: 'districts', label: `Districts (${visibleDistrictRows.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLeftTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl cursor-pointer transition ${
                      leftTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto max-h-[430px]">
              {leftTab === 'states' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">State (Click to view its Clusters)</th>
                      <th className="px-3 py-2.5 text-right">Clusters</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right text-amber-600">Reg</th>
                      <th className="px-3 py-2.5 text-right text-blue-600">Ver</th>
                      <th className="px-3 py-2.5 text-right text-emerald-600">Buyer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleStateRows.map((st) => (
                      <tr
                        key={st.state}
                        onClick={() => selectStateDrill(st.state)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                          clean(selectedState) === clean(st.state) ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: resolveStateColor(st.state) }} />
                          <span className="truncate">{st.state}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{st.cluster_details.length}</td>
                        <td className="px-3 py-2 text-right font-black">{st.platform_total_epcs}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-bold">{st.platform_registered_epcs}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-bold">{st.platform_verified_epcs}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-black">{st.platform_buyer_epcs}</td>
                      </tr>
                    ))}
                    {visibleStateRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">No live state EPC data matched active filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {leftTab === 'clusters' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">Cluster Performance</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right text-amber-600">Reg</th>
                      <th className="px-3 py-2.5 text-right text-blue-600">Ver</th>
                      <th className="px-3 py-2.5 text-right text-emerald-600">Buyer</th>
                      <th className="px-3 py-2.5 text-right">Orders / %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleClusterRows.map((cl) => (
                      <tr
                        key={cl.cluster_code || cl.cluster_name}
                        onClick={() => selectClusterDrill(cl.cluster_name, cl.state_name)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                          clean(clusterFilter) === clean(cl.cluster_name) ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-bold flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: resolveStateColor(cl.state_name) }} />
                            <span>{cl.cluster_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {cl.state_name} • {cl.cluster_code} • {(cl.districts || []).length} Districts
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-black">{cl.platform_total_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-bold">{cl.platform_registered_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-bold">{cl.platform_verified_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-black">{cl.platform_buyer_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-[11px]">
                          <div className="font-bold">{cl.platform_orders || 0} ord</div>
                          <div className="text-[10px] text-indigo-600 font-bold">{cl.conv_pct}%</div>
                        </td>
                      </tr>
                    ))}
                    {visibleClusterRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                          {selectedState ? `No active clusters configured under ${selectedState} matching filters.` : 'No clusters matched active filters.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {leftTab === 'districts' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5">District / Cluster</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right text-amber-600">Reg</th>
                      <th className="px-3 py-2.5 text-right text-blue-600">Ver</th>
                      <th className="px-3 py-2.5 text-right text-emerald-600">Buyer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {visibleDistrictRows.slice(0, 150).map((d) => (
                      <tr
                        key={`${d.state_name}::${d.district_name}`}
                        onClick={() => {
                          if (d.state_name) setSelectedState(d.state_name);
                          setDistrictFilter(d.district_name);
                        }}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                          clean(districtFilter) === clean(d.district_name) ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-bold flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: resolveStateColor(d.state_name) }} />
                            <span>{d.district_name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.state_name} {d.cluster_name ? `• ${d.cluster_name}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-black">{d.platform_total_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-amber-600 font-bold">{d.platform_registered_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-bold">{d.platform_verified_epcs || 0}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-black">{d.platform_buyer_epcs || 0}</td>
                      </tr>
                    ))}
                    {visibleDistrictRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-slate-400">No districts matched active filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Selected Territory Inspection Box */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FiMapPin className="text-indigo-600" />
                <span>{selectedTerritory ? `${selectedTerritory.district}, ${selectedTerritory.state}` : 'Clicked Territory Inspector'}</span>
              </h3>
              {selectedTerritory && (
                <button onClick={() => setSelectedTerritory(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <FiX />
                </button>
              )}
            </div>

            {selectedTerritory ? (
              <div className="space-y-3 text-xs">
                {selectedTerritory.districtStats && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="font-bold text-indigo-600">
                      Cluster: {selectedTerritory.districtStats.cluster_name || 'Outside Cluster'}
                      {selectedTerritory.districtStats.cluster_code ? ` (${selectedTerritory.districtStats.cluster_code})` : ''}
                    </div>
                    <div>
                      District EPCs: <strong>{selectedTerritory.districtStats.platform_total_epcs || 0}</strong>{' '}
                      (Reg: <strong className="text-amber-600">{selectedTerritory.districtStats.platform_registered_epcs || 0}</strong> •{' '}
                      Ver: <strong className="text-blue-600">{selectedTerritory.districtStats.platform_verified_epcs || 0}</strong> •{' '}
                      Buyers: <strong className="text-emerald-600">{selectedTerritory.districtStats.platform_buyer_epcs || 0}</strong>)
                    </div>
                  </div>
                )}

                {selectedTerritory.territory && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                      <span className="text-[10px] text-amber-700 font-bold block">State Registered</span>
                      <strong className="text-sm">{selectedTerritory.territory.platform_registered_epcs}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                      <span className="text-[10px] text-blue-700 font-bold block">State Verified</span>
                      <strong className="text-sm">{selectedTerritory.territory.platform_verified_epcs}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                      <span className="text-[10px] text-emerald-700 font-bold block">State Buyers</span>
                      <strong className="text-sm">{selectedTerritory.territory.platform_buyer_epcs}</strong>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => navigate('/marketing-panel/create-campaign')}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Target This Territory</span>
                  <FiArrowRight />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click any State in the Left table to isolate &amp; inspect only that State&apos;s Clusters, or hover/click anywhere on the Right India Map.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Edge-to-Edge Framed Interactive India Map */}
        <div
          ref={containerRef}
          className="xl:col-span-7 relative h-[680px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden select-none cursor-grab active:cursor-grabbing"
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
              onClick={resetAllGeoFilters}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer"
              title="Reset Map & Filters"
            >
              <FiRefreshCw />
            </button>
          </div>

          {(loadingGeo || loadingMapData) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 dark:bg-slate-800/75 backdrop-blur-xs">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">Loading Live EPC &amp; Cluster Telemetry...</p>
            </div>
          )}

          {errorGeo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <FiAlertCircle className="w-12 h-12 text-rose-500 mb-2" />
              <p className="text-sm font-bold text-rose-600">{errorGeo}</p>
            </div>
          )}

          {pathGenerator && (
            <svg className="w-full h-full" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {districtFeatures.map((feature, idx) => {
                  const style = getFeatureStyle(feature);
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
                      fill={style.fill}
                      fillOpacity={style.fillOpacity}
                      stroke={isSelected ? '#1e1b4b' : isHovered ? '#0f172a' : '#64748b'}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.45}
                      className="transition-colors duration-150 cursor-pointer"
                      onMouseEnter={() => {
                        const { stNode, distNode, clusterNode } = getFeatureTerritory(feature) || {};
                        setHoveredData({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: stNode,
                          districtStats: distNode,
                          clusterStats: clusterNode
                        });
                      }}
                      onClick={() => {
                        const { stNode, distNode, clusterNode } = getFeatureTerritory(feature) || {};
                        setSelectedTerritory({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: stNode,
                          districtStats: distNode,
                          clusterStats: clusterNode
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
                    stroke="#334155"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="pointer-events-none"
                  />
                ))}
              </g>
            </svg>
          )}

          {/* Full Platform Hover Tooltip: District + Cluster + State EPC Breakdown */}
          {hoveredData && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs max-w-xs space-y-1.5 backdrop-blur-md"
              style={{
                left: `${Math.min(tooltipPos.x, SVG_WIDTH - 290)}px`,
                top: `${Math.min(tooltipPos.y, SVG_HEIGHT - 240)}px`
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                <span className="font-bold">{hoveredData.district}, {hoveredData.state}</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  {hoveredData.districtStats?.cluster_name || 'Direct Region'}
                </span>
              </div>

              {hoveredData.districtStats && (
                <div className="text-[11px] space-y-0.5 border-b border-slate-700 pb-1.5">
                  <div className="text-amber-300 font-bold">District EPCs: {hoveredData.districtStats.platform_total_epcs || 0}</div>
                  <div className="text-[10px] text-slate-300">
                    Reg: <strong className="text-amber-400">{hoveredData.districtStats.platform_registered_epcs || 0}</strong> •{' '}
                    Ver: <strong className="text-blue-400">{hoveredData.districtStats.platform_verified_epcs || 0}</strong> •{' '}
                    Buyers: <strong className="text-emerald-400">{hoveredData.districtStats.platform_buyer_epcs || 0}</strong>
                  </div>
                </div>
              )}

              {hoveredData.clusterStats && (
                <div className="text-[11px] space-y-0.5 border-b border-slate-700 pb-1.5">
                  <div className="text-teal-300 font-bold">
                    Cluster ({hoveredData.clusterStats.cluster_code}): {hoveredData.clusterStats.platform_total_epcs || 0} EPCs
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Reg: {hoveredData.clusterStats.platform_registered_epcs || 0} •{' '}
                    Ver: {hoveredData.clusterStats.platform_verified_epcs || 0} •{' '}
                    Buyers: {hoveredData.clusterStats.platform_buyer_epcs || 0}
                  </div>
                </div>
              )}

              {hoveredData.territory ? (
                <div className="space-y-0.5 text-[11px]">
                  <div className="font-bold text-slate-200">
                    {hoveredData.state} Totals: {hoveredData.territory.platform_total_epcs} EPCs ({hoveredData.territory.cluster_details?.length || 0} Clusters)
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Reg: <strong className="text-amber-400">{hoveredData.territory.platform_registered_epcs}</strong> •{' '}
                    Ver: <strong className="text-blue-400">{hoveredData.territory.platform_verified_epcs}</strong> •{' '}
                    Buyers: <strong className="text-emerald-400">{hoveredData.territory.platform_buyer_epcs}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Campaigns: {hoveredData.territory.campaignCount} • Rev: {hoveredData.territory.revenue}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No EPCs registered in this area yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function allStateNamesFromGeo(geoData, rawStates) {
  const s = new Set(Object.keys(rawStates || {}));
  for (const feat of geoData?.features || []) {
    if (feat.properties?.st_nm) s.add(feat.properties.st_nm);
  }
  return s;
}
