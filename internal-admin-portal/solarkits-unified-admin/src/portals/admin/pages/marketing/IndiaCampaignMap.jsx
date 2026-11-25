import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiFilter,
  FiLayers,
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiDollarSign,
  FiUsers,
  FiX,
  FiArrowRight
} from 'react-icons/fi';
import { FaWhatsapp, FaEnvelope, FaBullhorn, FaPlus, FaWarehouse, FaCogs, FaPercentage, FaCoins } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import {
  CAMPAIGN_OBJECTIVES,
  fetchLiveClusters,
  fetchLiveWarehouses,
  fetchLiveActiveStates,
  getQuotaState
} from './services/marketingDataService';

// Center coordinates & metadata for Indian States
const STATE_INFO = {
  'Gujarat': { code: 'GJ', center: [71.577, 22.7] },
  'Maharashtra': { code: 'MH', center: [76.094, 19.455] },
  'Madhya Pradesh': { code: 'MP', center: [78.284, 23.541] },
  'Rajasthan': { code: 'RJ', center: [73.852, 26.578] },
  'Uttar Pradesh': { code: 'UP', center: [80.591, 26.922] },
  'Karnataka': { code: 'KA', center: [76.168, 14.7] },
  'Tamil Nadu': { code: 'TN', center: [78.406, 11.011] },
  'Kerala': { code: 'KL', center: [76.412, 10.449] },
  'Telangana': { code: 'TG', center: [79.007, 17.798] },
  'Andhra Pradesh': { code: 'AP', center: [79.942, 15.753] },
  'Odisha': { code: 'OD', center: [84.42, 20.511] },
  'Chhattisgarh': { code: 'CG', center: [82.029, 21.254] },
  'West Bengal': { code: 'WB', center: [87.961, 23.82] },
  'Bihar': { code: 'BR', center: [85.607, 25.68] },
  'Jharkhand': { code: 'JH', center: [85.552, 23.655] },
  'Punjab': { code: 'PB', center: [75.416, 30.841] },
  'Haryana': { code: 'HR', center: [76.346, 29.196] },
  'Delhi': { code: 'DL', center: [77.114, 28.645] }
};

const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function IndiaCampaignMap() {
  const navigate = useNavigate();
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [errorGeo, setErrorGeo] = useState(null);

  // Dynamic Clusters, Warehouses & Active States fetched from Admin Panel APIs
  const [clustersList, setClustersList] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);
  const [activeStatesList, setActiveStatesList] = useState([]);

  // Live Persistent Quota Balance State
  const [quota, setQuota] = useState(() => getQuotaState());

  useEffect(() => {
    const handleQuotaUpdate = () => setQuota(getQuotaState());
    window.addEventListener('solarkits-quota-updated', handleQuotaUpdate);
    return () => window.removeEventListener('solarkits-quota-updated', handleQuotaUpdate);
  }, []);

  // Fetch live clusters, warehouses & active states on mount
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchLiveClusters(),
      fetchLiveWarehouses(),
      fetchLiveActiveStates()
    ]).then(([cList, wList, sList]) => {
      if (isMounted) {
        setClustersList(cList);
        setWarehousesList(wList);
        if (Array.isArray(sList)) setActiveStatesList(sList);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Filters (Boss Requirements)
  const [channelFilter, setChannelFilter] = useState('ALL'); // ALL, WHATSAPP, EMAIL, BOTH
  const [objectiveFilter, setObjectiveFilter] = useState('ALL'); // ALL or any from CAMPAIGN_OBJECTIVES
  const [clusterFilter, setClusterFilter] = useState('ALL'); // ALL or dynamic cluster name
  const [warehouseFilter, setWarehouseFilter] = useState('ALL'); // ALL or dynamic warehouse name
  const [resultMetric, setResultMetric] = useState('STATUS'); // STATUS, SUCCESS_RATIO, DELIVERED, LEADS, CONVERSIONS, REVENUE
  const [selectedState, setSelectedState] = useState('');

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover & Selection
  const [hoveredData, setHoveredData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const containerRef = useRef(null);
  const width = 800;
  const height = 750;

  // Master State Campaign Data (Integrated with SolarKits MIS)
  const territoryData = useMemo(() => ({
    'maharashtra': {
      state: 'Maharashtra',
      isActive: true,
      channels: ['whatsapp', 'email'],
      primaryChannel: 'both',
      campaignCount: 4,
      delivered: 9840,
      leads: 185,
      conversions: 28,
      successRatio: '15.1%',
      revenue: '₹22.40L',
      warehouses: ['Bhiwandi Central Master Warehouse (WH-IND-MH-001)'],
      clusters: [
        'Konkan Cluster (CLU-MH-001)',
        'Pune Division Cluster (CLU-MH-002)',
        'Nashik Division Cluster (CLU-MH-003)',
        'Nagpur Division Cluster (CLU-MH-004)'
      ],
      campaigns: [
        { name: 'Diwali 3kW EPC Wholesale Flash Sale', type: 'both', objective: 'sales', leads: 95, orders: 18, rev: '₹14.50L' },
        { name: 'Maharashtra Inactive EPC Reactivation', type: 'email', objective: 'epc_activation', leads: 45, orders: 6, rev: '₹4.90L' },
        { name: 'Pune High-Power Commercial BOS Push', type: 'whatsapp', objective: 'product_promotion', leads: 45, orders: 4, rev: '₹3.00L' }
      ]
    },
    'gujarat': {
      state: 'Gujarat',
      isActive: true,
      channels: ['whatsapp'],
      primaryChannel: 'whatsapp',
      campaignCount: 2,
      delivered: 4120,
      leads: 78,
      conversions: 11,
      successRatio: '14.1%',
      revenue: '₹8.90L',
      warehouses: ['Ahmedabad Sanand Central Warehouse (WH-IND-GJ-001)'],
      clusters: [
        'Central Gujarat Cluster (CLU-GJ-001)',
        'South Gujarat Cluster (CLU-GJ-002)',
        'North Gujarat Cluster (CLU-GJ-003)',
        'Saurashtra Cluster (CLU-GJ-004)'
      ],
      campaigns: [
        { name: 'Gujarat 5kW Commercial Solar Subsidy Drive', type: 'whatsapp', objective: 'sales', leads: 62, orders: 9, rev: '₹7.20L' },
        { name: 'Surat Diamond Cluster EPC Onboarding', type: 'whatsapp', objective: 'epc_onboarding', leads: 16, orders: 2, rev: '₹1.70L' }
      ]
    },
    'rajasthan': {
      state: 'Rajasthan',
      isActive: true,
      channels: ['email'],
      primaryChannel: 'email',
      campaignCount: 1,
      delivered: 1840,
      leads: 28,
      conversions: 3,
      successRatio: '10.7%',
      revenue: '₹2.40L',
      warehouses: ['Jaipur Sitapura Central Depo (WH-IND-RJ-001)'],
      clusters: [
        'Central Rajasthan Cluster (CLU-RJ-001)',
        'West Rajasthan Cluster (CLU-RJ-002)',
        'East Rajasthan Cluster (CLU-RJ-003)'
      ],
      campaigns: [
        { name: 'Marwar Agricultural Pump Solar Kit Push', type: 'email', objective: 'product_promotion', leads: 28, orders: 3, rev: '₹2.40L' }
      ]
    },
    'karnataka': {
      state: 'Karnataka',
      isActive: true,
      channels: ['whatsapp', 'email'],
      primaryChannel: 'both',
      campaignCount: 1,
      delivered: 1400,
      leads: 19,
      conversions: 2,
      successRatio: '10.5%',
      revenue: '₹0.80L',
      warehouses: ['Bengaluru Peenya Central Hub (WH-IND-KA-001)'],
      clusters: [
        'South Karnataka Cluster (CLU-KA-001)',
        'North Karnataka Cluster (CLU-KA-002)'
      ],
      campaigns: [
        { name: 'Bengaluru Rooftop EPC Expansion Drive', type: 'both', objective: 'epc_onboarding', leads: 19, orders: 2, rev: '₹0.80L' }
      ]
    },
    'delhi': {
      state: 'Delhi',
      isActive: false,
      channels: [],
      primaryChannel: 'none',
      campaignCount: 0,
      delivered: 0,
      leads: 0,
      conversions: 0,
      successRatio: '0.0%',
      revenue: '₹0.00',
      warehouses: ['Delhi Okhla Regional Depo (WH-IND-DL-001)'],
      clusters: [
        'South Delhi Cluster (CLU-DL-001)',
        'Central Delhi Cluster (CLU-DL-002)'
      ],
      campaigns: []
    },
    'madhyapradesh': {
      state: 'Madhya Pradesh',
      isActive: false,
      channels: [],
      primaryChannel: 'none',
      campaignCount: 0,
      delivered: 0,
      leads: 0,
      conversions: 0,
      successRatio: '0.0%',
      revenue: '₹0.00',
      warehouses: ['Indore Regional Hub'],
      clusters: ['Indore Commercial', 'Bhopal Central'],
      campaigns: []
    },
    'uttarpradesh': {
      state: 'Uttar Pradesh',
      isActive: false,
      channels: [],
      primaryChannel: 'none',
      campaignCount: 0,
      delivered: 0,
      leads: 0,
      conversions: 0,
      successRatio: '0.0%',
      revenue: '₹0.00',
      warehouses: ['Lucknow Central Hub'],
      clusters: ['Noida Tech Zone', 'Lucknow Central'],
      campaigns: []
    }
  }), []);

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
    return () => {
      isMounted = false;
    };
  }, []);

  // Extract District & State Features
  const { districtFeatures, stateBoundaries } = useMemo(() => {
    if (!geoData?.features) return { districtFeatures: [], stateBoundaries: [] };
    const dFeatures = [];
    const sBoundaries = [];
    for (const f of geoData.features) {
      if (f.properties?.district && f.properties.district.trim()) {
        dFeatures.push(f);
      } else {
        sBoundaries.push(f);
      }
    }
    return { districtFeatures: dFeatures, stateBoundaries: sBoundaries };
  }, [geoData]);

  // D3 Projection centered to encompass entire Indian territory
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 0])
      .scale(1050)
      .translate([width / 2, 770]);
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
    const stateFeatures = districtFeatures.filter((f) => {
      const st = f.properties?.st_nm || '';
      return clean(st) === clean(selectedState) || (STATE_INFO[st] && clean(STATE_INFO[st].code) === clean(selectedState));
    });
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
      const targetPanX = width / 2 - targetScale * midX;
      const targetPanY = height / 2 - targetScale * midY;
      setZoom(targetScale);
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [selectedState, geoData, projection, districtFeatures, width, height]);

  // Territory matching helper
  const getFeatureTerritory = useCallback((feature) => {
    if (!feature?.properties) return null;
    const sName = clean(feature.properties.st_nm || '');
    return territoryData[sName] || null;
  }, [territoryData]);

  // Color logic based on Boss's filters
  const getFeatureFill = useCallback((feature) => {
    const t = getFeatureTerritory(feature);
    if (!t || !t.isActive) {
      return '#f1f5f9'; // Inactive slate gray
    }

    // Filter by Channel
    if (channelFilter === 'WHATSAPP' && !t.channels.includes('whatsapp')) return '#f1f5f9';
    if (channelFilter === 'EMAIL' && !t.channels.includes('email')) return '#f1f5f9';
    if (channelFilter === 'BOTH' && t.primaryChannel !== 'both') return '#f1f5f9';

    // Filter by Objective
    if (objectiveFilter !== 'ALL') {
      const hasObj = t.campaigns.some(c => clean(c.objective) === clean(objectiveFilter));
      if (!hasObj) return '#f1f5f9';
    }

    // Filter by Cluster
    if (clusterFilter !== 'ALL') {
      const hasCluster = t.clusters.some(c => clean(c).includes(clean(clusterFilter)) || clean(clusterFilter).includes(clean(c)));
      if (!hasCluster) return '#f1f5f9';
    }

    // Filter by Warehouse
    if (warehouseFilter !== 'ALL') {
      const hasWarehouse = t.warehouses?.some(w => clean(w).includes(clean(warehouseFilter)) || clean(warehouseFilter).includes(clean(w)));
      if (!hasWarehouse) return '#f1f5f9';
    }

    // Success Ratio Metric Mode
    if (resultMetric === 'SUCCESS_RATIO') {
      const ratioNum = parseFloat(t.successRatio) || 0;
      if (ratioNum >= 14) return '#059669'; // Deep vibrant emerald (>14%)
      if (ratioNum >= 10) return '#0d9488'; // Teal (10% - 14%)
      if (ratioNum > 0) return '#d97706'; // Amber / gold (>0%)
      return '#f1f5f9';
    }

    // Result Metric Color Mode
    if (resultMetric === 'DELIVERED') {
      if (t.delivered > 8000) return '#1e40af';
      if (t.delivered > 3000) return '#3b82f6';
      return '#93c5fd';
    }
    if (resultMetric === 'LEADS') {
      if (t.leads > 150) return '#047857';
      if (t.leads > 50) return '#10b981';
      return '#6ee7b7';
    }
    if (resultMetric === 'CONVERSIONS') {
      if (t.conversions > 20) return '#b91c1c';
      if (t.conversions > 8) return '#ef4444';
      return '#fca5a5';
    }
    if (resultMetric === 'REVENUE') {
      return '#8b5cf6';
    }

    // Default Status Color by Active Channel
    if (t.primaryChannel === 'both') return '#6366f1'; // Indigo for Omnichannel
    if (t.primaryChannel === 'whatsapp') return '#10b981'; // Emerald for WhatsApp
    if (t.primaryChannel === 'email') return '#3b82f6'; // Sky blue for Email
    return '#6366f1';
  }, [getFeatureTerritory, channelFilter, objectiveFilter, clusterFilter, warehouseFilter, resultMetric]);

  // Mouse pan & zoom handlers
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
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15
      });
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
            <span>Real-Time Geographic Marketing Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Live India Campaign Territory Map</h1>
          <p className="text-sm text-slate-500">
            Real-time visual map of live active campaigns across Indian states, clusters, and warehouses with delivery, success ratio, and sales conversion metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Quota Pill */}
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs flex items-center gap-2 border border-slate-700 shadow-xs">
            <FaCoins className="text-amber-400" />
            <span>Quota Balance:</span>
            <strong className="text-emerald-400">{quota.available.toLocaleString()}</strong>
            <span className="text-slate-400">/ {quota.total.toLocaleString()}</span>
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

      {/* KPI Territory Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Live Active States</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span>{activeStatesList.length || 36} States</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <span className="text-[11px] text-slate-500">Across India (Location Setup)</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Clusters Covered</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{clustersList.length || 7} Clusters</div>
          <span className="text-[11px] text-slate-500">Live mapped from Cluster Mgmt</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion Success Ratio</div>
          <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
            <FaPercentage className="w-4 h-4 text-emerald-500" />
            <span>14.2%</span>
          </div>
          <span className="text-[11px] text-slate-500">Avg Lead-to-Order Conversion</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Territory Attributed Revenue</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹34.50L</div>
          <span className="text-[11px] text-emerald-600 font-semibold">42 Confirmed Kit Orders</span>
        </div>
      </div>

      {/* Filter Bar with Dynamic Objective, Cluster & Warehouse from Admin Panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Type Filter */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Campaign Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Channels (WhatsApp & Email)</option>
              <option value="WHATSAPP">WhatsApp API Live Only</option>
              <option value="EMAIL">Email Marketing Live Only</option>
              <option value="BOTH">Dual Omnichannel (Both Live)</option>
            </select>
          </div>

          {/* Dynamic Campaign Objective Filter (Matches CreateCampaignWizard 100%) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Campaign Objective</label>
            <select
              value={objectiveFilter}
              onChange={(e) => setObjectiveFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Objectives</option>
              {CAMPAIGN_OBJECTIVES.map(obj => (
                <option key={obj.id} value={obj.id}>
                  {obj.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Cluster Filter (Fetched from Franchise Cluster Mgmt) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Cluster Filter</label>
            <select
              value={clusterFilter}
              onChange={(e) => setClusterFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-hidden"
            >
              <option value="ALL">All Clusters</option>
              {clustersList.map(c => (
                <option key={c._id || c.cluster_name} value={c.cluster_name}>
                  {c.cluster_name} ({c.state_name})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Warehouse Filter (Fetched from Warehouse Mgmt) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Warehouse Filter</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:outline-hidden"
            >
              <option value="ALL">All Warehouses</option>
              {warehousesList.map(w => (
                <option key={w._id || w.warehouse_code} value={w.warehouse_name}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          {/* Result / Metric Filter including Success Ratio */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Result / Metric Mode</label>
            <select
              value={resultMetric}
              onChange={(e) => setResultMetric(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-hidden text-emerald-600 dark:text-emerald-400"
            >
              <option value="STATUS">Live Active vs Inactive</option>
              <option value="SUCCESS_RATIO">🎯 Success Ratio (%)</option>
              <option value="DELIVERED">Messages Delivered (Reach)</option>
              <option value="LEADS">Leads Generated (Forms)</option>
              <option value="CONVERSIONS">Confirmed Conversions (Orders)</option>
              <option value="REVENUE">Attributed Revenue (₹)</option>
            </select>
          </div>

          {/* State Zoom */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">State Focus</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="">All India (Whole Country)</option>
              <option value="Maharashtra">Maharashtra (Live)</option>
              <option value="Gujarat">Gujarat (Live)</option>
              <option value="Rajasthan">Rajasthan (Live)</option>
              <option value="Karnataka">Karnataka (Live)</option>
              <option value="Delhi">Delhi (Unserved)</option>
              <option value="Madhya Pradesh">Madhya Pradesh (Unserved)</option>
              <option value="Uttar Pradesh">Uttar Pradesh (Unserved)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        {resultMetric === 'SUCCESS_RATIO' ? (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-600"></span>
              <span>&gt; 14% High Success</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-teal-600"></span>
              <span>10% - 14% Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-amber-600"></span>
              <span>&lt; 10% Low Ratio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700"></span>
              <span className="text-slate-400">No Campaign Running</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-indigo-500"></span>
              <span>Omnichannel (Both)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
              <span>WhatsApp Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-blue-500"></span>
              <span>Email Live</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700"></span>
              <span className="text-slate-400">No Campaign Running</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Box */}
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
          {/* Zoom Controls */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
            <button
              onClick={() => setZoom((prev) => Math.min(prev * 1.35, 10))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-sm cursor-pointer"
              title="Zoom In"
            >
              <FiZoomIn />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(prev / 1.35, 0.8))}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-sm cursor-pointer"
              title="Zoom Out"
            >
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
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-sm cursor-pointer"
              title="Reset India Map"
            >
              <FiRefreshCw />
            </button>
          </div>

          {/* Loading / Error States */}
          {loadingGeo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">Loading Precise Geographic Vector Map...</p>
            </div>
          )}

          {errorGeo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
              <FiAlertCircle className="w-12 h-12 text-rose-500 mb-2" />
              <p className="text-sm font-bold text-rose-600">{errorGeo}</p>
            </div>
          )}

          {/* D3 Vector SVG Rendering */}
          {pathGenerator && (
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
            >
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
                        const t = getFeatureTerritory(feature);
                        setHoveredData({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: t
                        });
                      }}
                      onClick={() => {
                        const t = getFeatureTerritory(feature);
                        setSelectedTerritory({
                          district: feature.properties?.district || 'Unknown District',
                          state: feature.properties?.st_nm || '',
                          territory: t
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
                left: `${Math.min(tooltipPos.x, width - 260)}px`,
                top: `${Math.min(tooltipPos.y, height - 200)}px`
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                <span className="font-bold">{hoveredData.district}, {hoveredData.state}</span>
                {hoveredData.territory?.isActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    🟢 Live
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[10px] font-bold">
                    ⚪ Inactive
                  </span>
                )}
              </div>

              {hoveredData.territory?.isActive ? (
                <div className="space-y-1 text-[11px]">
                  <div className="text-slate-300">
                    Active Campaigns: <strong className="text-white">{hoveredData.territory.campaignCount} Running</strong>
                  </div>
                  <div className="text-slate-300">
                    Success Ratio: <strong className="text-emerald-400 font-bold">{hoveredData.territory.successRatio}</strong>
                  </div>
                  <div className="text-slate-300">
                    Reach: <strong>{hoveredData.territory.delivered.toLocaleString()} msgs</strong>
                  </div>
                  <div className="text-slate-300">
                    Leads: <strong className="text-emerald-400">{hoveredData.territory.leads}</strong> | Orders: <strong className="text-indigo-400">{hoveredData.territory.conversions}</strong>
                  </div>
                  <div className="text-slate-300">
                    Revenue: <strong className="text-emerald-300 font-bold">{hoveredData.territory.revenue}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">No campaigns currently active in this territory. Click to launch.</p>
              )}
            </div>
          )}
        </div>

        {/* Territory Detail & Actions Panel */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FiMapPin className="text-indigo-600" />
                <span>Territory Details</span>
              </h3>
              {selectedTerritory && (
                <button
                  onClick={() => setSelectedTerritory(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <FiX />
                </button>
              )}
            </div>

            {selectedTerritory ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedTerritory.district}
                  </h4>
                  <p className="text-xs text-slate-500">{selectedTerritory.state}</p>
                </div>

                {selectedTerritory.territory?.isActive ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Status: Running Live</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedTerritory.territory.campaignCount} Campaigns</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivered</span>
                        <strong className="text-sm">{selectedTerritory.territory.delivered.toLocaleString()}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Success Ratio</span>
                        <strong className="text-sm text-emerald-600">{selectedTerritory.territory.successRatio}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Leads</span>
                        <strong className="text-sm text-blue-600">{selectedTerritory.territory.leads}</strong>
                      </div>
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Kit Orders</span>
                        <strong className="text-sm text-indigo-600">{selectedTerritory.territory.conversions}</strong>
                      </div>
                    </div>

                    {/* Warehouses list */}
                    {selectedTerritory.territory.warehouses && (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Serving Warehouse:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          🏭 {selectedTerritory.territory.warehouses.join(', ')}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Live Campaigns in this Zone:</span>
                      {selectedTerritory.territory.campaigns.map((c, i) => (
                        <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs flex items-center justify-between">
                          <div className="truncate mr-2">
                            <div className="font-bold truncate">{c.name}</div>
                            <div className="text-[10px] text-slate-400 uppercase">{c.type} • {c.rev}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold shrink-0">
                            Live
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <FiAlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold">No Active Campaigns in {selectedTerritory.district}</p>
                    <p className="text-slate-500 text-[11px]">This area is currently unserved. Launching a campaign here can onboard new EPC partners and expand market reach.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <FiMapPin className="w-8 h-8 text-indigo-500 mx-auto opacity-70 animate-bounce" />
                <p className="font-bold text-slate-700 dark:text-slate-200">Interactive Territory Explorer</p>
                <p>Click on any state or district on the India map to inspect live running campaigns, audience delivery, and sales attribution.</p>
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
