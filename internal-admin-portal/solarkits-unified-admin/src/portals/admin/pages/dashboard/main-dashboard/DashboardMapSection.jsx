import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiMap,
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiAlertTriangle,
  FiExternalLink,
  FiDownload,
  FiFilter,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiUsers,
} from 'react-icons/fi';

// State codes and center coordinates
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
  'Himachal Pradesh': { code: 'HP', center: [77.249, 31.924] },
  'Uttarakhand': { code: 'UK', center: [79.214, 30.156] },
  'Jammu and Kashmir': { code: 'JK', center: [74.86, 33.643] },
  'Ladakh': { code: 'LA', center: [76.807, 34.946] },
  'Assam': { code: 'AS', center: [92.82, 26.359] },
  'Arunachal Pradesh': { code: 'AR', center: [94.668, 28.043] },
  'Meghalaya': { code: 'ML', center: [91.277, 25.54] },
  'Manipur': { code: 'MN', center: [93.872, 24.73] },
  'Mizoram': { code: 'MZ', center: [92.832, 23.31] },
  'Nagaland': { code: 'NL', center: [94.464, 26.06] },
  'Tripura': { code: 'TR', center: [91.747, 23.754] },
  'Sikkim': { code: 'SK', center: [88.474, 27.565] },
  'Goa': { code: 'GA', center: [74.058, 15.364] },
  'Delhi': { code: 'DL', center: [77.114, 28.645] },
  'Chandigarh': { code: 'CH', center: [76.779, 30.725] },
};

const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  { id: 'visitors', label: 'Visitors', unit: '' },
];

export default function DashboardMapSection({ data = [], onDrillDown, onExport }) {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [selectedState, setSelectedState] = useState('');
  const [showNumbers, setShowNumbers] = useState(true);
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);

  // Zoom and Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover Tooltip
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

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
        console.warn('Map GeoJSON fallback:', err);
        setLoadingGeo(false);
      });
  }, []);

  // Map state data index
  const stateDataMap = useMemo(() => {
    const map = new Map();
    (data || []).forEach((st) => {
      map.set(clean(st.state), st);
    });
    return map;
  }, [data]);

  // Max value calculation for color intensity scaling
  const maxMetricValue = useMemo(() => {
    let max = 1;
    (data || []).forEach((st) => {
      const v = Number(st[selectedMetric]) || 0;
      if (v > max) max = v;
    });
    return max;
  }, [data, selectedMetric]);

  // Color generator for metric intensity
  const getIntensityFill = (val) => {
    const v = Number(val) || 0;
    if (v === 0) return '#f1f5f9';
    const ratio = Math.min(1, Math.max(0.15, v / maxMetricValue));
    // High intensity emerald or blue
    if (selectedMetric === 'revenue') {
      return `rgba(13, 148, 136, ${ratio * 0.85 + 0.15})`; // Teal
    }
    if (selectedMetric === 'estimatedDemandKw') {
      return `rgba(249, 115, 22, ${ratio * 0.85 + 0.15})`; // Orange
    }
    if (selectedMetric === 'activeEpcs') {
      return `rgba(16, 185, 129, ${ratio * 0.85 + 0.15})`; // Emerald
    }
    return `rgba(37, 99, 235, ${ratio * 0.85 + 0.15})`; // Blue
  };

  // D3 Projection
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo.geoMercator().center([82.5, 22.5]).scale(1200).translate([width / 2, height / 2]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // Filter district vs state features
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

  // Lookup index for district-wise data
  const districtDataMap = useMemo(() => {
    const map = new Map();
    (data || []).forEach((st) => {
      const distList = st.districtsList || (st.districts ? Object.values(st.districts) : []);
      distList.forEach((d) => {
        const dKey = clean(d.district || d.name);
        if (dKey) {
          const entry = {
            ...d,
            state: st.state,
            totalEpcs: d.registeredEpcs || d.activeEpcs || 0,
            activeEpcs: d.activeEpcs || 0,
          };
          map.set(`${clean(st.state)}_${dKey}`, entry);
          if (!map.has(dKey)) map.set(dKey, entry);
        }
      });
    });
    return map;
  }, [data]);

  // Compute District EPC Badges for map display
  const districtEpcBadges = useMemo(() => {
    if (!pathGenerator || !districtFeatures.length) return [];
    const badges = [];

    districtFeatures.forEach((feat) => {
      const distName = feat.properties?.district || '';
      const stName = feat.properties?.st_nm || '';
      const dKey = clean(distName);
      const compositeKey = `${clean(stName)}_${dKey}`;
      const distInfo = districtDataMap.get(compositeKey) || districtDataMap.get(dKey);
      const epcCount = distInfo?.totalEpcs || 0;

      // Show if district has EPCs, and if state is selected, match state
      if (epcCount > 0) {
        if (!selectedState || clean(stName) === clean(selectedState)) {
          const centroid = getFeatureCentroid(feat, pathGenerator, projection);
          if (centroid && !isNaN(centroid[0]) && !isNaN(centroid[1])) {
            badges.push({
              district: distName,
              state: stName,
              count: epcCount,
              activeCount: distInfo?.activeEpcs || 0,
              cx: centroid[0],
              cy: centroid[1],
            });
          }
        }
      }
    });

    return badges;
  }, [districtFeatures, districtDataMap, selectedState, pathGenerator, projection]);

  // State-level EPC summary for national view
  const stateEpcBadges = useMemo(() => {
    if (!projection) return [];
    const badges = [];

    (data || []).forEach((st) => {
      const epcCount = Number(st.registeredEpcs || st.activeEpcs) || 0;
      const info = STATE_INFO[st.state];
      if (epcCount > 0 && info) {
        const center = projection(info.center);
        if (center && !isNaN(center[0]) && !isNaN(center[1])) {
          badges.push({
            state: st.state,
            code: info.code,
            count: epcCount,
            cx: center[0],
            cy: center[1],
          });
        }
      }
    });

    return badges;
  }, [data, projection]);

  // Mouse pan handlers
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

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.35, 12));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.35, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedState('');
  };

  // State selection and auto-focus
  const selectState = (stateName) => {
    setSelectedState(stateName);
    if (!stateName || !geoData || !projection) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const stateFeatures = districtFeatures.filter(
      (f) => clean(f.properties?.st_nm) === clean(stateName)
    );

    if (stateFeatures.length > 0) {
      const bounds = d3Geo.geoBounds({ type: 'FeatureCollection', features: stateFeatures });
      const [[x0, y0], [x1, y1]] = [projection(bounds[0]), projection(bounds[1])];
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const midX = (x0 + x1) / 2;
      const midY = (y0 + y1) / 2;
      const targetScale = Math.min(6, Math.max(2, 0.85 / Math.max(dx / width, dy / height)));
      setZoom(targetScale);
      setPan({ x: width / 2 - targetScale * midX, y: height / 2 - targetScale * midY });
    }
  };

  // Districts of selected state for table
  const selectedStateObj = (data || []).find((s) => s.state === selectedState);
  const districtRows = selectedStateObj?.districtsList || [];

  return (
    <div id="section-geography" className="bg-white dark:bg-card-dark border border-border/80 dark:border-border-dark rounded-2xl p-5 shadow-xs mb-6 scroll-mt-20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60 dark:border-border-dark/60 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <FiMap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
              Geography Analytics & Interactive India Map
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              State & district drill-down, metric intensity mapping & high-demand low-coverage opportunity detection
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons & EPC Numbers Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNumbers((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              showNumbers
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white dark:bg-card-dark text-text-secondary border-border/80 hover:text-text-primary'
            }`}
            title="Toggle District & State EPC Numbers on Map"
          >
            <FiUsers className="w-3.5 h-3.5" />
            <span>EPC Numbers: {showNumbers ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5 bg-bg-light/80 dark:bg-bg-dark border border-border/60 dark:border-border-dark p-1 rounded-xl">
            {METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedMetric === m.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-secondary hover:text-text-primary dark:hover:text-text-primary-dark'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map & State Drill-down Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive SVG Map Column */}
        <div className="lg:col-span-7 border border-border/60 dark:border-border-dark rounded-xl overflow-hidden relative h-[520px] bg-slate-50/50 dark:bg-slate-900/30">
          {/* Floating Map Zoom Controls */}
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
          </div>

          {/* Active Selection / Opportunity Tag */}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
            {selectedState ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-white text-xs font-bold shadow-md">
                <span>State: {selectedState}</span>
                <button onClick={() => selectState('')} className="ml-1 hover:opacity-80">×</button>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-lg bg-white/90 dark:bg-card-dark/90 border border-border/80 text-[11px] font-semibold text-text-secondary">
                Click any state to view districts
              </div>
            )}
          </div>

          {/* Map Canvas */}
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoveredLocation(null);
            }}
          >
            {loadingGeo ? (
              <div className="h-full flex items-center justify-center text-xs font-semibold text-text-secondary">
                Loading Vector Map of India...
              </div>
            ) : (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Districts */}
                  {districtFeatures.map((feat, idx) => {
                    const stName = feat.properties?.st_nm || '';
                    const distName = feat.properties?.district || '';
                    const stObj = stateDataMap.get(clean(stName));
                    const val = stObj ? stObj[selectedMetric] || 0 : 0;
                    const fill = getIntensityFill(val);

                    const isHovered = hoveredLocation?.district === distName;

                    return (
                      <path
                        key={`dist-${idx}-${distName}`}
                        d={pathGenerator(feat)}
                        fill={fill}
                        stroke={isHovered ? '#0f172a' : '#cbd5e1'}
                        strokeWidth={(isHovered ? 2 : 0.4) / zoom}
                        className="transition-colors duration-150 cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredLocation({
                            state: stName,
                            district: distName,
                            val,
                            stObj,
                          });
                        }}
                        onClick={() => selectState(stName)}
                      />
                    );
                  })}

                  {/* State Outer Boundaries */}
                  {stateBoundaries.map((feat, idx) => (
                    <path
                      key={`st-bound-${idx}`}
                      d={pathGenerator(feat)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={1.2 / zoom}
                      strokeOpacity={0.5}
                      className="pointer-events-none"
                    />
                  ))}

                  {/* State Badges */}
                  {Object.entries(STATE_INFO).map(([stName, info]) => {
                    if (!projection) return null;
                    const [cx, cy] = projection(info.center) || [];
                    if (cx === undefined || cy === undefined) return null;
                    const bW = 20 / Math.max(0.9, zoom * 0.7);
                    const bH = 14 / Math.max(0.9, zoom * 0.7);
                    const fS = Math.max(8, 10 / Math.max(0.85, zoom * 0.65));

                    return (
                      <g key={`code-${stName}`} transform={`translate(${cx}, ${cy})`} className="pointer-events-none select-none">
                        <rect x={-bW / 2} y={-bH / 2} width={bW} height={bH} rx={3 / zoom} fill="#ffffff" stroke="#0f172a" strokeWidth={0.7 / zoom} opacity={0.9} />
                        <text x={0} y={fS * 0.35} textAnchor="middle" fill="#0f172a" fontSize={fS} fontWeight="bold" className="font-mono">
                          {info.code}
                        </text>
                      </g>
                    );
                  })}

                  {/* State-level EPC summary badges on National view (Only number, no text) */}
                  {showNumbers && !selectedState && zoom < 1.6 && stateEpcBadges.map((b) => {
                    const pillW = (b.count >= 10 ? 24 : 18) / Math.max(0.9, zoom * 0.7);
                    const pillH = 15 / Math.max(0.9, zoom * 0.7);
                    const fS = Math.max(8, 9.5 / Math.max(0.85, zoom * 0.65));
                    return (
                      <g key={`st-epc-${b.state}`} transform={`translate(${b.cx}, ${b.cy + 13 / Math.max(0.9, zoom * 0.7)})`} className="pointer-events-none select-none">
                        <rect x={-pillW / 2} y={-pillH / 2} width={pillW} height={pillH} rx={pillH / 2} fill="#065f46" stroke="#34d399" strokeWidth={0.8 / zoom} opacity={0.96} />
                        <text x={0} y={fS * 0.35} textAnchor="middle" fill="#ffffff" fontSize={fS} fontWeight="800" className="font-mono">
                          {b.count}
                        </text>
                      </g>
                    );
                  })}

                  {/* District-wise Total EPC Numbers on Map (Always visible when state selected, zoomed in, or EPC metric) */}
                  {showNumbers && (selectedState || zoom >= 1.6 || selectedMetric === 'activeEpcs' || selectedMetric === 'registeredEpcs') &&
                    districtEpcBadges.map((b) => {
                      const pillW = (b.count >= 10 ? 28 : 22) / Math.max(0.7, zoom * 0.65);
                      const pillH = 16 / Math.max(0.7, zoom * 0.65);
                      const fS = Math.max(8, 10 / Math.max(0.7, zoom * 0.65));

                      return (
                        <g
                          key={`epc-num-${b.state}-${b.district}`}
                          transform={`translate(${b.cx}, ${b.cy})`}
                          className="pointer-events-none select-none"
                        >
                          <rect
                            x={-pillW / 2}
                            y={-pillH / 2}
                            width={pillW}
                            height={pillH}
                            rx={pillH / 2}
                            fill="#0f172a"
                            stroke="#10b981"
                            strokeWidth={1.2 / zoom}
                            opacity={0.96}
                          />
                          <text
                            x={0}
                            y={fS * 0.35}
                            textAnchor="middle"
                            fill="#34d399"
                            fontSize={fS}
                            fontWeight="800"
                            className="font-mono tracking-tight"
                          >
                            {b.count}
                          </text>
                        </g>
                      );
                    })}
                </g>
              </svg>
            )}
          </div>

          {/* Floating Tooltip */}
          {hoveredLocation && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 text-white rounded-xl p-2.5 shadow-xl text-xs backdrop-blur-xs border border-slate-700 max-w-xs"
              style={{ top: tooltipPos.y, left: tooltipPos.x }}
            >
              <div className="font-bold text-sm text-white mb-0.5">{hoveredLocation.district}</div>
              <div className="text-[11px] text-slate-300 mb-1.5">{hoveredLocation.state}</div>
              <div className="text-xs font-semibold text-emerald-400">
                {METRICS.find((m) => m.id === selectedMetric)?.label}: {(hoveredLocation.val || 0).toLocaleString()}
              </div>
              {hoveredLocation.stObj?.isHighDemandLowCoverage && (
                <div className="mt-1.5 text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <FiAlertTriangle className="w-3 h-3" /> High Demand, Low EPC Coverage
                </div>
              )}
            </div>
          )}
        </div>

        {/* State / District Geography Report Table Column */}
        <div className="lg:col-span-5 border border-border/60 dark:border-border-dark rounded-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 bg-bg-light/60 dark:bg-bg-dark border-b border-border/60 dark:border-border-dark flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                  {selectedState ? `${selectedState} Districts` : 'All States Overview'}
                </h3>
                <span className="text-[11px] text-text-secondary">
                  {selectedState ? `${districtRows.length} districts` : `${data.length} states reporting`}
                </span>
              </div>
              {selectedState && (
                <button
                  onClick={() => selectState('')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All States
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-light/40 dark:bg-bg-dark/40 text-text-secondary sticky top-0 border-b border-border/50">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{selectedState ? 'District' : 'State'}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">EPCs</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Demand (kW)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Orders</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {selectedState ? (
                    districtRows.length > 0 ? (
                      districtRows.map((d, idx) => (
                        <tr
                          key={idx}
                          onClick={() => onDrillDown && onDrillDown('orders', `District: ${d.district}`)}
                          className="hover:bg-primary/5 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-semibold text-text-primary dark:text-text-primary-dark">{d.district}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{d.registeredEpcs}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-orange-600">{d.estimatedDemandKw}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-primary">{d.confirmedOrders}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-600">₹{(d.revenue || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-text-secondary">No district data available for this state.</td>
                      </tr>
                    )
                  ) : (
                    data.map((st, idx) => (
                      <tr
                        key={idx}
                        onClick={() => selectState(st.state)}
                        className="hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-1.5">
                            {st.state}
                            {st.isHighDemandLowCoverage && (
                              <span title="High Demand & Low EPC Coverage Opportunity">
                                <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-secondary">{st.districtsCount} districts</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{st.registeredEpcs}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-orange-600">{st.estimatedDemandKw}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">{st.confirmedOrders}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-600">₹{(st.revenue || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2.5 bg-bg-light/60 dark:bg-bg-dark border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
            <span>Opportunity Tag: High Demand &lt; 2 EPCs</span>
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                <FiDownload className="w-3.5 h-3.5" />
                <span>Export Location Report</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
