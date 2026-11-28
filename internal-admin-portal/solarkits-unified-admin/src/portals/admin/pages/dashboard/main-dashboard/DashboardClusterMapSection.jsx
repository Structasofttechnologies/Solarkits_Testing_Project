import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiLayers,
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiDollarSign,
  FiDownload,
  FiUser,
  FiShield,
  FiAlertCircle,
  FiChevronRight,
  FiX,
  FiEye,
  FiEyeOff,
  FiUsers,
} from 'react-icons/fi';

// State codes and center coordinates for Indian States
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
};

const clean = (s) => (s || '').toLowerCase().replace(/bhoomi/g, 'bhumi').replace(/[^a-z0-9]/g, '');

// Safely calculate geometric centroid for a GeoJSON feature
const getFeatureCentroid = (feat, pathGen, proj) => {
  if (pathGen && typeof pathGen.centroid === 'function') {
    try {
      const c = pathGen.centroid(feat);
      if (c && !isNaN(c[0]) && !isNaN(c[1])) return c;
    } catch (_) {}
  }
  if (!feat?.geometry?.coordinates) return null;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const walk = (coords) => {
    if (Array.isArray(coords) && coords.length > 0 && typeof coords[0][0] === 'number') {
      const pts = (coords.length > 1 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1])
        ? coords.slice(0, -1)
        : coords;
      for (let i = 0; i < pts.length; i++) {
        const p = proj ? proj(pts[i]) : pts[i];
        if (p && !isNaN(p[0]) && !isNaN(p[1])) {
          sumX += p[0];
          sumY += p[1];
          count += 1;
        }
      }
    } else if (Array.isArray(coords)) {
      coords.forEach(walk);
    }
  };
  walk(feat.geometry.coordinates);
  return count > 0 ? [sumX / count, sumY / count] : null;
};

const METRICS = [
  { id: 'revenue', label: 'Revenue (₹)', unit: '₹' },
  { id: 'estimatedDemandKw', label: 'Kit Demand (kW)', unit: ' kW' },
  { id: 'confirmedOrders', label: 'Confirmed Orders', unit: '' },
  { id: 'enquiries', label: 'Enquiries', unit: '' },
  { id: 'activeEpcs', label: 'Active EPCs', unit: '' },
  { id: 'registeredEpcs', label: 'Registered EPCs', unit: '' },
];

// Color palette for franchise clusters
const CLUSTER_PALETTE = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#0d9488', // Teal
  '#d97706', // Amber
  '#4f46e5', // Indigo
  '#65a30d', // Lime
  '#e11d48', // Crimson
  '#0284c7', // Sky
];

export default function DashboardClusterMapSection({ data = {}, onDrillDown }) {
  const clusters = useMemo(() => data.clusters || [], [data.clusters]);
  const summary = useMemo(() => data.summary || {}, [data.summary]);
  const districtClusterMap = useMemo(() => data.districtClusterMap || {}, [data.districtClusterMap]);

  // View & Metric controls
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [mapColorMode, setMapColorMode] = useState('cluster'); // 'cluster' (individual cluster colors) | 'intensity' (metric heat)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showNumbers, setShowNumbers] = useState(true);

  // Interactive Selection
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [hoveredClusterInfo, setHoveredClusterInfo] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // GeoJSON & D3 State
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const width = 800;
  const height = 900;

  // Load GeoJSON on mount
  useEffect(() => {
    fetch('/geojson/india_districts.json')
      .then((res) => res.json())
      .then((json) => {
        setGeoData(json);
        setLoadingGeo(false);
      })
      .catch((err) => {
        console.warn('Cluster Map GeoJSON load error:', err);
        setLoadingGeo(false);
      });
  }, []);

  // Filtered clusters for the overview table
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      const matchState =
        selectedStateFilter === 'all' ||
        clean(c.state) === clean(selectedStateFilter);

      const matchStatus =
        selectedStatusFilter === 'all' ||
        c.status === selectedStatusFilter;

      const q = clean(searchQuery);
      const matchQuery =
        !q ||
        clean(c.name).includes(q) ||
        clean(c.code).includes(q) ||
        clean(c.franchisee).includes(q) ||
        clean(c.bde).includes(q) ||
        (c.districts || []).some((d) => clean(d).includes(q));

      return matchState && matchStatus && matchQuery;
    });
  }, [clusters, selectedStateFilter, selectedStatusFilter, searchQuery]);

  // Unique states represented in clusters
  const clusterStates = useMemo(() => {
    const set = new Set();
    clusters.forEach((c) => {
      if (c.state) set.add(c.state);
    });
    return Array.from(set).sort();
  }, [clusters]);

  // Selected cluster object
  const activeCluster = useMemo(() => {
    if (!selectedClusterId) return null;
    return clusters.find((c) => c.id === selectedClusterId) || null;
  }, [clusters, selectedClusterId]);

  // D3 Mercator Projection
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo.geoMercator().center([82.5, 22.5]).scale(1200).translate([width / 2, height / 2]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // District & State features separation
  const { districtFeatures, stateBoundaries } = useMemo(() => {
    if (!geoData?.features) return { districtFeatures: [], stateBoundaries: [] };
    const dists = [];
    const states = [];
    geoData.features.forEach((f) => {
      if (f.properties?.district && f.properties.district.trim()) dists.push(f);
      else states.push(f);
    });
    return { districtFeatures: dists, stateBoundaries: states };
  }, [geoData]);

  // Compute Cluster Regional EPC Badges
  const clusterEpcBadges = useMemo(() => {
    if (!pathGenerator || !districtFeatures.length) return [];
    const badges = [];

    clusters.forEach((c) => {
      const cluDistClean = new Set((c.districts || []).map(clean));
      const matchingFeatures = districtFeatures.filter((f) => {
        const distMatch = cluDistClean.has(clean(f.properties?.district));
        const stateMatch = !c.state || clean(f.properties?.st_nm) === clean(c.state);
        return distMatch && stateMatch;
      });

      if (matchingFeatures.length > 0) {
        let sumX = 0;
        let sumY = 0;
        let validCount = 0;

        matchingFeatures.forEach((feat) => {
          const pt = getFeatureCentroid(feat, pathGenerator, projection);
          if (pt && !isNaN(pt[0]) && !isNaN(pt[1])) {
            sumX += pt[0];
            sumY += pt[1];
            validCount += 1;
          }
        });

        if (validCount > 0) {
          const cx = sumX / validCount;
          const cy = sumY / validCount;
          const epcCount = Number(c.registeredEpcs || c.activeEpcs) || 0;

          badges.push({
            clusterId: c.id,
            name: c.name,
            code: c.code,
            state: c.state,
            color: c.color || '#2563eb',
            status: c.status,
            epcCount,
            activeEpcs: c.activeEpcs || 0,
            cx,
            cy,
          });
        }
      }
    });

    return badges;
  }, [clusters, districtFeatures, pathGenerator, projection]);

  // Compute District-level EPC Badges within Clusters
  const clusterDistrictEpcBadges = useMemo(() => {
    if (!pathGenerator || !districtFeatures.length) return [];
    const badges = [];

    districtFeatures.forEach((feat) => {
      const dName = feat.properties?.district || '';
      const stName = feat.properties?.st_nm || '';
      const dKey = clean(dName);
      const meta = districtClusterMap[dKey];

      if (meta) {
        if (meta.clusterState && stName && clean(meta.clusterState) !== clean(stName)) {
          return;
        }
        const clu = clusters.find((c) => c.id === meta.clusterId);
        const distMetric = (clu?.districtMetrics || []).find(
          (dm) => clean(dm.district) === dKey
        );
        const count = distMetric?.registeredEpcs || distMetric?.activeEpcs || 0;

        if (count > 0) {
          const pt = getFeatureCentroid(feat, pathGenerator, projection);
          if (pt && !isNaN(pt[0]) && !isNaN(pt[1])) {
            badges.push({
              clusterId: meta.clusterId,
              district: dName,
              count,
              cx: pt[0],
              cy: pt[1],
            });
          }
        }
      }
    });

    return badges;
  }, [districtFeatures, districtClusterMap, clusters, pathGenerator, projection]);

  // Compute maximum metric value across clusters for intensity heat mapping
  const maxClusterMetricValue = useMemo(() => {
    let max = 1;
    clusters.forEach((c) => {
      const v = Number(c[selectedMetric]) || 0;
      if (v > max) max = v;
    });
    return max;
  }, [clusters, selectedMetric]);

  // Dynamic Fill calculation for a district feature
  const getDistrictFill = (districtName) => {
    const key = clean(districtName);
    const clusterMeta = districtClusterMap[key];

    // Non-clustered districts (base neutral background)
    if (!clusterMeta) {
      return '#f8fafc';
    }

    const isCurrentClusterSelected = selectedClusterId && clusterMeta.clusterId === selectedClusterId;
    const isCurrentClusterHovered = hoveredClusterInfo && hoveredClusterInfo.clusterId === clusterMeta.clusterId;

    if (mapColorMode === 'intensity') {
      const val = Number(clusterMeta[selectedMetric === 'revenue' ? 'clusterRevenue' : selectedMetric === 'estimatedDemandKw' ? 'clusterDemandKw' : selectedMetric === 'confirmedOrders' ? 'clusterOrders' : selectedMetric === 'enquiries' ? 'clusterEnquiries' : 'clusterActiveEpcs']) || 0;
      if (val === 0) return '#e2e8f0';
      const ratio = Math.min(1, Math.max(0.2, val / maxClusterMetricValue));
      return `rgba(13, 148, 136, ${ratio * 0.8 + 0.2})`;
    }

    // Cluster Identity Color Mode
    if (clusterMeta.clusterColor) {
      if (isCurrentClusterSelected || isCurrentClusterHovered) {
        return clusterMeta.clusterColor;
      }
      // Status tinting
      if (clusterMeta.clusterStatus === 'allotted') {
        return `${clusterMeta.clusterColor}dd`;
      }
      return `${clusterMeta.clusterColor}77`; // slightly lighter for available
    }

    return '#94a3b8';
  };

  // Zoom & Pan Mouse Handlers
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.35, 12));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.35, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedClusterId(null);
  };

  // Zoom to a specific cluster
  const handleSelectCluster = (clusterId) => {
    if (selectedClusterId === clusterId) {
      setSelectedClusterId(null);
      return;
    }
    setSelectedClusterId(clusterId);

    const clu = clusters.find((c) => c.id === clusterId);
    if (!clu || !clu.districts || clu.districts.length === 0 || !projection) return;

    const cluDistClean = new Set(clu.districts.map(clean));
    const matchingFeatures = districtFeatures.filter((f) =>
      cluDistClean.has(clean(f.properties?.district))
    );

    if (matchingFeatures.length > 0) {
      const bounds = d3Geo.geoBounds({ type: 'FeatureCollection', features: matchingFeatures });
      const [[x0, y0], [x1, y1]] = [projection(bounds[0]), projection(bounds[1])];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      const targetScale = Math.min(8, Math.max(2.5, 0.75 / Math.max(dx / width, dy / height)));
      setZoom(targetScale);
      setPan({ x: width / 2 - targetScale * midX, y: height / 2 - targetScale * midY });
    }
  };

  // Export Clusters Table to CSV
  const handleExportClusterReport = () => {
    if (!clusters || clusters.length === 0) return;
    const csvContent = [
      'Cluster Name,Cluster Code,State,Status,Districts Count,Franchisee Store,Assigned BDE,Setup Fee (INR),Active EPCs,Demand (kW),Confirmed Orders,Revenue (INR)',
      ...clusters.map(
        (c) =>
          `"${c.name}","${c.code}","${c.state}","${c.status}","${c.districtsCount}","${c.franchisee}","${c.bde}","${c.setupFee}","${c.activeEpcs}","${c.estimatedDemandKw}","${c.confirmedOrders}","${c.revenue}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SOLARKITS_Franchise_Cluster_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="section-cluster-geography" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* 1. Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                Franchise Cluster Geography Analytics & Interactive Map
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                12 Regional Clusters
              </span>
            </div>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              District-wise franchisee clusters across India, territory allocation, assigned stores, BDE coverage & regional demand
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-bg-light/80 dark:bg-bg-dark border border-border/60 dark:border-border-dark p-1 rounded-xl">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMetric(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${selectedMetric === m.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark'
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Secondary Filter & Quick KPI Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/30 border border-border/60 dark:border-border-dark">
        {/* Left Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Cluster / District */}
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search cluster, district, BDE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark focus:outline-none focus:ring-1 focus:ring-primary w-52"
            />
          </div>

          {/* State Filter */}
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark font-medium text-text-secondary focus:outline-none"
          >
            <option value="all">All States</option>
            {clusterStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark font-medium text-text-secondary focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="allotted">Allotted Only</option>
            <option value="available">Available Only</option>
          </select>

          {/* Color Mode Switch */}
          <div className="flex items-center gap-1 bg-white dark:bg-card-dark p-0.5 rounded-lg border border-border/80 text-[11px] font-semibold">
            <button
              onClick={() => setMapColorMode('cluster')}
              className={`px-2 py-1 rounded-md transition-colors ${mapColorMode === 'cluster' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              Territory View
            </button>
            <button
              onClick={() => setMapColorMode('intensity')}
              className={`px-2 py-1 rounded-md transition-colors ${mapColorMode === 'intensity' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
            >
              Metric Heat
            </button>
          </div>

          {/* EPC Numbers Toggle Pill */}
          <button
            onClick={() => setShowNumbers((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${showNumbers
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white dark:bg-card-dark text-text-secondary border-border/80 hover:text-text-primary'
              }`}
            title="Toggle Cluster & District EPC Numbers on Map"
          >
            <FiUsers className="w-3.5 h-3.5" />
            <span>EPC Numbers: {showNumbers ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Right Summary Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Allotted: {summary.allottedClusters || 0}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Available: {summary.availableClusters || 0}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] font-bold text-blue-700 dark:text-blue-300">
            Revenue: ₹{((summary.totalRevenue || 0) / 100000).toFixed(2)}L
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            Demand: {summary.totalDemandKw || 0} kW
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Map (Left) & Clusters Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Cluster Map */}
        <div className="lg:col-span-7 border border-border/60 dark:border-border-dark rounded-xl overflow-hidden relative h-[540px] bg-slate-50/50 dark:bg-slate-900/30">
          {/* Zoom Controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 bg-white/95 dark:bg-card-dark/95 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-md">
            <button onClick={handleZoomIn} title="Zoom In" className="p-1.5 rounded-lg hover:bg-bg-light transition-colors">
              <FiZoomIn className="w-4 h-4 text-text-primary dark:text-text-primary-dark" />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out" className="p-1.5 rounded-lg hover:bg-bg-light transition-colors">
              <FiZoomOut className="w-4 h-4 text-text-primary dark:text-text-primary-dark" />
            </button>
            <button onClick={handleReset} title="Reset India View" className="p-1.5 rounded-lg hover:bg-bg-light transition-colors">
              <FiRefreshCw className="w-3.5 h-3.5 text-text-primary dark:text-text-primary-dark" />
            </button>
            <button
              onClick={() => setShowNumbers((prev) => !prev)}
              title={showNumbers ? 'Hide EPC Numbers' : 'Show EPC Numbers'}
              className={`p-1.5 rounded-lg transition-colors ${showNumbers
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'hover:bg-bg-light text-text-secondary'
                }`}
            >
              {showNumbers ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Active Cluster Badge / Instruction Tag */}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
            {activeCluster ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-md">
                <FiLayers className="w-3.5 h-3.5" />
                <span>Cluster: {activeCluster.name}</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                  {activeCluster.districtsCount} Districts
                </span>
                <button onClick={() => setSelectedClusterId(null)} className="ml-1 hover:opacity-80">
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-card-dark/90 border border-border/80 text-[11px] font-semibold text-text-secondary shadow-xs">
                Click any colored cluster region to inspect
              </div>
            )}
          </div>

          {/* Legend Bottom Overlay */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-card-dark/95 backdrop-blur-md px-3 py-2 rounded-xl border border-border/80 shadow-md text-[11px]">
            <div className="font-bold text-text-primary dark:text-text-primary-dark mb-1">Franchise Cluster Coverage</div>
            <div className="flex items-center gap-3 text-text-secondary">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                <span>Allotted Store</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500 opacity-60"></span>
                <span>Open for Allocation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200"></span>
                <span>Unallocated Territory</span>
              </div>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoveredClusterInfo(null);
            }}
          >
            {loadingGeo ? (
              <div className="h-full flex items-center justify-center text-xs font-semibold text-text-secondary">
                Loading Vector Map of India...
              </div>
            ) : (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* District Boundaries */}
                  {districtFeatures.map((feat, idx) => {
                    const stName = feat.properties?.st_nm || '';
                    const distName = feat.properties?.district || '';
                    const distKey = clean(distName);
                    const clusterMeta = districtClusterMap[distKey];

                    const isClusterSelected =
                      selectedClusterId && clusterMeta?.clusterId === selectedClusterId;
                    const isClusterHovered =
                      hoveredClusterInfo && hoveredClusterInfo.clusterId === clusterMeta?.clusterId;

                    const fill = getDistrictFill(distName);

                    let stroke = '#cbd5e1';
                    let strokeWidth = 0.35 / zoom;

                    if (isClusterSelected) {
                      stroke = '#0f172a';
                      strokeWidth = 2 / zoom;
                    } else if (isClusterHovered) {
                      stroke = '#3b82f6';
                      strokeWidth = 1.6 / zoom;
                    } else if (clusterMeta) {
                      stroke = '#94a3b8';
                      strokeWidth = 0.6 / zoom;
                    }

                    return (
                      <path
                        key={`clu-dist-${idx}-${distName}`}
                        d={pathGenerator(feat)}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        className={`transition-colors duration-150 ${clusterMeta ? 'cursor-pointer' : ''}`}
                        onMouseEnter={() => {
                          if (clusterMeta) {
                            setHoveredClusterInfo({
                              district: distName,
                              state: stName,
                              ...clusterMeta,
                            });
                          } else {
                            setHoveredClusterInfo(null);
                          }
                        }}
                        onClick={() => {
                          if (clusterMeta) {
                            handleSelectCluster(clusterMeta.clusterId);
                          }
                        }}
                      />
                    );
                  })}

                  {/* State Outer Boundaries */}
                  {stateBoundaries.map((feat, idx) => (
                    <path
                      key={`clu-st-bound-${idx}`}
                      d={pathGenerator(feat)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={1.2 / zoom}
                      strokeOpacity={0.4}
                      className="pointer-events-none"
                    />
                  ))}

                  {/* State Badges for Context */}
                  {Object.entries(STATE_INFO).map(([stName, info]) => {
                    if (!projection) return null;
                    const [cx, cy] = projection(info.center) || [];
                    if (cx === undefined || cy === undefined) return null;
                    const bW = 20 / Math.max(0.9, zoom * 0.7);
                    const bH = 14 / Math.max(0.9, zoom * 0.7);
                    const fS = Math.max(8, 10 / Math.max(0.85, zoom * 0.65));

                    return (
                      <g key={`clu-code-${stName}`} transform={`translate(${cx}, ${cy})`} className="pointer-events-none select-none">
                        <rect x={-bW / 2} y={-bH / 2} width={bW} height={bH} rx={3 / zoom} fill="#ffffff" stroke="#475569" strokeWidth={0.6 / zoom} opacity={0.85} />
                        <text x={0} y={fS * 0.35} textAnchor="middle" fill="#0f172a" fontSize={fS} fontWeight="bold" className="font-mono">
                          {info.code}
                        </text>
                      </g>
                    );
                  })}

                  {/* Prominent Franchise Cluster EPC Number Badges on Map (Only numbers, no text, no zero clutter) */}
                  {showNumbers && !selectedClusterId &&
                    clusterEpcBadges
                      .filter((b) => b.epcCount > 0)
                      .map((b) => {
                        const isSelected = selectedClusterId === b.clusterId;
                        const isHovered = hoveredClusterInfo?.clusterId === b.clusterId;

                        const pillW = (b.epcCount >= 10 ? 28 : 22) / Math.max(0.75, zoom * 0.7);
                        const pillH = 20 / Math.max(0.75, zoom * 0.7);
                        const fS = Math.max(9, 11 / Math.max(0.75, zoom * 0.7));

                        const strokeColor = isSelected || isHovered ? '#ffffff' : '#10b981';
                        const textColor = '#34d399';

                        return (
                          <g
                            key={`clu-epc-badge-${b.clusterId}`}
                            transform={`translate(${b.cx}, ${b.cy})`}
                            className="cursor-pointer select-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCluster(b.clusterId);
                            }}
                          >
                            <rect
                              x={-pillW / 2}
                              y={-pillH / 2}
                              width={pillW}
                              height={pillH}
                              rx={pillH / 2}
                              fill="#0f172a"
                              stroke={strokeColor}
                              strokeWidth={(isSelected || isHovered ? 2.5 : 1.5) / zoom}
                              opacity={0.96}
                            />
                            <text
                              x={0}
                              y={fS * 0.35}
                              textAnchor="middle"
                              fill={textColor}
                              fontSize={fS}
                              fontWeight="800"
                              className="font-mono tracking-tight"
                            >
                              {b.epcCount}
                            </text>
                          </g>
                        );
                      })}

                  {/* District-level EPC numbers only when a cluster is clicked / selected */}
                  {showNumbers && selectedClusterId &&
                    clusterDistrictEpcBadges
                      .filter((db) => db.clusterId === selectedClusterId && db.count > 0)
                      .map((db) => {
                        const pillW = (db.count >= 10 ? 26 : 20) / Math.max(0.7, zoom * 0.65);
                        const pillH = 18 / Math.max(0.7, zoom * 0.65);
                        const fS = Math.max(8.5, 10 / Math.max(0.7, zoom * 0.65));

                        return (
                          <g
                            key={`clu-dist-epc-${db.clusterId}-${db.district}`}
                            transform={`translate(${db.cx}, ${db.cy})`}
                            className="pointer-events-none select-none"
                          >
                            <rect
                              x={-pillW / 2}
                              y={-pillH / 2}
                              width={pillW}
                              height={pillH}
                              rx={pillH / 2}
                              fill="#1e1b4b"
                              stroke="#818cf8"
                              strokeWidth={1.2 / zoom}
                              opacity={0.96}
                            />
                            <text
                              x={0}
                              y={fS * 0.35}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={fS}
                              fontWeight="800"
                              className="font-mono"
                            >
                              {db.count}
                            </text>
                          </g>
                        );
                      })}
                </g>
              </svg>
            )}
          </div>

          {/* Floating Hover Tooltip */}
          {hoveredClusterInfo && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 text-white rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md border border-slate-700 max-w-xs"
              style={{ top: tooltipPos.y, left: tooltipPos.x }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm text-white">{hoveredClusterInfo.clusterName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${hoveredClusterInfo.clusterStatus === 'allotted'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                    }`}
                >
                  {hoveredClusterInfo.clusterStatus === 'allotted' ? 'Allotted' : 'Available'}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mb-2">
                {hoveredClusterInfo.clusterCode} • {hoveredClusterInfo.district}, {hoveredClusterInfo.clusterState}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Franchisee Store</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {hoveredClusterInfo.franchisee}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned BDE</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {hoveredClusterInfo.bde}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Revenue</span>
                  <span className="font-bold text-emerald-400">
                    ₹{(hoveredClusterInfo.clusterRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Demand</span>
                  <span className="font-bold text-amber-400">
                    {hoveredClusterInfo.clusterDemandKw || 0} kW
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Franchise Clusters Overview Table */}
        <div className="lg:col-span-5 flex flex-col h-[540px] border border-border/60 dark:border-border-dark rounded-xl bg-white dark:bg-card-dark overflow-hidden">
          <div className="p-3.5 border-b border-border/60 dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div>
              <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark uppercase tracking-wider flex items-center gap-1.5">
                <FiLayers className="w-3.5 h-3.5 text-indigo-600" /> All Franchise Clusters Overview
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {filteredClusters.length} of {clusters.length} clusters reporting • Click row to zoom
              </p>
            </div>
            <button
              onClick={handleExportClusterReport}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-bg-light dark:hover:bg-bg-dark rounded-lg transition-colors border border-border/80"
              title="Export Clusters to CSV"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60 dark:divide-border-dark/60 text-xs">
            {filteredClusters.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-text-secondary">
                <FiAlertCircle className="w-6 h-6 mb-2 text-text-secondary/60" />
                <p className="font-semibold text-xs">No matching clusters found</p>
                <p className="text-[11px] text-text-secondary/80 mt-1">
                  Try clearing your search query or status filter.
                </p>
              </div>
            ) : (
              filteredClusters.map((c) => {
                const isSelected = selectedClusterId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCluster(c.id)}
                    className={`p-3 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 ${isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600' : ''
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color || '#2563eb' }}
                          ></span>
                          <span className="font-bold text-text-primary dark:text-text-primary-dark hover:underline">
                            {c.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-secondary font-mono mt-0.5 ml-4">
                          {c.code} • {c.state} ({c.districtsCount} Districts)
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${c.status === 'allotted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                      >
                        {c.status === 'allotted' ? 'Allotted' : 'Available'}
                      </span>
                    </div>

                    {/* Metadata Sub-row */}
                    <div className="grid grid-cols-2 gap-2 my-2 text-[11px] ml-4 text-text-secondary">
                      <div className="truncate">
                        <span className="text-[10px] text-text-secondary/70 block">Franchisee Store:</span>
                        <span className="font-medium text-text-primary dark:text-text-primary-dark truncate block">
                          {c.franchisee}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-text-secondary/70 block">Assigned BDE:</span>
                        <span className="font-medium text-text-primary dark:text-text-primary-dark truncate block">
                          {c.bde}
                        </span>
                      </div>
                    </div>

                    {/* Metric Badges */}
                    <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-border/40 text-[11px] ml-4 font-semibold">
                      <span className="text-text-secondary">
                        EPCs: <strong className="text-text-primary dark:text-text-primary-dark">{c.activeEpcs}</strong>
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {c.estimatedDemandKw} kW
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {c.confirmedOrders} Orders
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{c.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Cluster Districts Detail Expandable Bar */}
          {activeCluster && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-border/80 text-xs">
              <div className="flex items-center justify-between font-bold text-text-primary dark:text-text-primary-dark mb-1">
                <span>Districts in {activeCluster.name}</span>
                <span className="text-[10px] text-text-secondary font-mono">{activeCluster.districtsCount} total</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
                {(activeCluster.districts || []).map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-card-dark border border-border/80 text-text-secondary shadow-2xs"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
