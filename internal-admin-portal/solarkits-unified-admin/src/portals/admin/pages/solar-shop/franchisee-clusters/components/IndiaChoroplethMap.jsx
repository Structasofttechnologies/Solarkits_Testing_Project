import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiMapPin,
  FiAlertCircle,
  FiLayers,
  FiShield,
  FiUser,
} from 'react-icons/fi';

// ── State Code & Center Mapping for All 36 States/UTs of India ─────────────
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
  'Andaman and Nicobar Islands': { code: 'AN', center: [92.954, 11.289] },
  'Lakshadweep': { code: 'LD', center: [73.038, 8.271] },
  'Puducherry': { code: 'PY', center: [79.877, 11.643] },
  'Dadra and Nagar Haveli and Daman and Diu': { code: 'DN', center: [72.982, 20.235] },
};

// Clean name string with spelling normalizations for fuzzy matching
const clean = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/bhoomi/g, 'bhumi')
    .replace(/[^a-z0-9]/g, '');

export default function IndiaChoroplethMap({
  districtsData = [],
  activeFranchiseeLegends = [],
  selectedState = '',
  selectedCluster = '',
  selectedStatus = 'all',
  selectedBde = '',
  searchDistrict = '',
  onDistrictClick,
}) {
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [errorGeo, setErrorGeo] = useState(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover Tooltip state
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Base dimensions of the SVG projection
  const width = 800;
  const height = 900;

  // Load GeoJSON on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingGeo(true);
    fetch('/geojson/india_districts.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load India district GeoJSON');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setGeoData(data);
          setLoadingGeo(false);
        }
      })
      .catch((err) => {
        console.error('Error loading GeoJSON:', err);
        if (isMounted) {
          setErrorGeo(err.message);
          setLoadingGeo(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Separate genuine 726 district features from the 34 state-level boundary overlays in GeoJSON
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

  // Projection setup for India
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };

    // Standard India Mercator Projection centered around [82.5, 22.5]
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 22.5])
      .scale(1200)
      .translate([width / 2, height / 2]);

    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // Index districts data by cleaned name and state
  const districtLookup = useMemo(() => {
    const map = new Map();
    for (const d of districtsData) {
      const dClean = clean(d.district_name);
      const sClean = clean(d.state_name);
      map.set(`${sClean}__${dClean}`, d);
      // Secondary fallback key by district alone
      if (!map.has(dClean)) {
        map.set(dClean, d);
      }
      // Handle Mumbai city/suburban variants
      if (dClean.includes('mumbai')) {
        map.set(`${sClean}__mumbai`, d);
        map.set('mumbai', d);
        map.set(`${sClean}__mumbaicity`, d);
        map.set('mumbaicity', d);
        map.set(`${sClean}__mumbaisuburban`, d);
        map.set('mumbaisuburban', d);
      }
      // Handle Banaskantha / Vav-Tharad
      if (dClean.includes('banaskantha')) {
        map.set(`${sClean}__vavtharad`, d);
        map.set('vavtharad', d);
      }
    }
    return map;
  }, [districtsData]);

  // Find district data for a GeoJSON feature
  const getDistrictMatch = useCallback(
    (feature) => {
      if (!feature || !feature.properties) return null;
      const dName = feature.properties.district || '';
      const sName = feature.properties.st_nm || '';
      const dClean = clean(dName);
      const sClean = clean(sName);

      return districtLookup.get(`${sClean}__${dClean}`) || districtLookup.get(dClean) || null;
    },
    [districtLookup]
  );

  // Auto-focus / zoom when selectedState changes
  useEffect(() => {
    if (!geoData || !projection) return;

    if (!selectedState) {
      // Reset to whole India
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Filter features for this state from genuine district features
    const stateFeatures = districtFeatures.filter((f) => {
      const st = f.properties?.st_nm || '';
      return clean(st) === clean(selectedState) || (STATE_INFO[st] && clean(STATE_INFO[st].code) === clean(selectedState));
    });

    if (stateFeatures.length > 0) {
      const bounds = d3Geo.geoBounds({ type: 'FeatureCollection', features: stateFeatures });
      const [[x0, y0], [x1, y1]] = [projection(bounds[0]), projection(bounds[1])];

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
  }, [selectedState, geoData, projection, districtFeatures]);

  // Handle Pan & Zoom Controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.35, 12));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.35, 0.8));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.8), 12));
  };

  // Render District Path Fill Color:
  // Rule: Black & White initially. ONLY clusters with an ONBOARDED FRANCHISEE get distinct color theme!
  const getDistrictFill = useCallback(
    (feature) => {
      const match = getDistrictMatch(feature);

      // Search match highlight
      if (searchDistrict && clean(feature.properties?.district).includes(clean(searchDistrict))) {
        return '#f97316'; // Vibrant orange for search highlight
      }

      // 1. Franchisee is onboarded/allotted -> distinct vibrant franchisee color
      if (match?.is_allotted && match.color) {
        return match.color;
      }

      // 2. Cluster created but available / unallotted -> clean neutral light slate
      if (match?.status_key === 'available') {
        return '#e2e8f0';
      }

      // 3. Cluster reserved or company store
      if (match?.status_key === 'reserved') {
        return '#fef3c7';
      }
      if (match?.status_key === 'company_store') {
        return match.color || '#2563eb';
      }

      // 4. Default: Black & White / Grayscale unassigned district
      return '#f8fafc';
    },
    [getDistrictMatch, searchDistrict]
  );

  // Render District Boundary Stroke Color:
  const getDistrictStroke = useCallback(
    (feature, isHovered) => {
      if (isHovered) return '#0f172a';
      const match = getDistrictMatch(feature);
      if (match?.is_allotted && match.stroke) {
        return match.stroke;
      }
      if (match?.status_key === 'available') {
        return '#94a3b8';
      }
      return '#cbd5e1'; // Crisp monochrome boundary
    },
    [getDistrictMatch]
  );

  if (loadingGeo) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-slate-50/60 p-8">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-700">Rendering High-Precision India Vector Map...</p>
        <p className="text-xs text-slate-400">Loading 726 district boundaries across 36 States & UTs</p>
      </div>
    );
  }

  if (errorGeo) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 bg-red-50/40 p-8 text-center">
        <FiAlertCircle size={36} className="text-red-500" />
        <p className="text-sm font-bold text-slate-800">Failed to render India Vector Map</p>
        <p className="text-xs text-slate-500">{errorGeo}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#f8fafc] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredDistrict(null);
      }}
      onWheel={handleWheel}
    >
      {/* ── Floating Controls Toolbar (Top Left) ───────────────────────────── */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/90 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <FiZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <FiZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reset India View"
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <FiRefreshCw size={15} />
          </button>
        </div>

        {/* Active Franchisees Badge & Quick Summary */}
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-800">
            Active Franchisees: <span className="font-black text-emerald-600">{activeFranchiseeLegends.length}</span>
          </span>
        </div>
      </div>

      {/* ── Status Indicator Pill (Top Right) ─────────────────────────────── */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-2 text-xs font-bold text-slate-700">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>India Vector Choropleth • 726 Districts</span>
      </div>

      {/* ── Main SVG Map Canvas ────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block"
        style={{ touchAction: 'none' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. Genuine District Polygons (726 districts) */}
          {districtFeatures.map((feature, idx) => {
            const dName = feature.properties?.district || `District-${idx}`;
            const sName = feature.properties?.st_nm || '';
            const match = getDistrictMatch(feature);
            const fill = getDistrictFill(feature);
            const isHovered = hoveredDistrict?.feature === feature;
            const strokeColor = getDistrictStroke(feature, isHovered);

            return (
              <path
                key={`district-${idx}-${dName}`}
                d={pathGenerator(feature)}
                fill={fill}
                stroke={strokeColor}
                strokeWidth={isHovered ? 2.4 / zoom : match?.is_allotted ? 1.4 / zoom : 0.55 / zoom}
                strokeDasharray={
                  match?.status_key === 'available' && !match?.is_allotted ? `${3 / zoom},${2 / zoom}` : undefined
                }
                strokeOpacity={1}
                className="transition-colors duration-150 cursor-pointer outline-none"
                onMouseEnter={() => {
                  setHoveredDistrict({
                    feature,
                    match,
                    districtName: dName,
                    stateName: sName,
                  });
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (match && match.id && onDistrictClick) {
                    onDistrictClick(match.id);
                  }
                }}
              />
            );
          })}

          {/* 2. Outer State Boundaries Overlay (fill="none" so they never obscure district colors!) */}
          {stateBoundaries.map((feature, idx) => (
            <path
              key={`state-outline-${idx}-${feature.properties?.st_nm || idx}`}
              d={pathGenerator(feature)}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.2 / zoom}
              strokeOpacity={0.4}
              className="pointer-events-none"
            />
          ))}

          {/* 3. State 2-Letter Code Badges (GJ, MH, MP, RJ, etc.) */}
          {Object.entries(STATE_INFO).map(([stateName, info]) => {
            if (!projection) return null;
            const [cx, cy] = projection(info.center) || [];
            if (cx === undefined || cy === undefined) return null;

            // Only show labels if reasonably visible
            const badgeW = 24 / Math.max(0.9, zoom * 0.7);
            const badgeH = 15 / Math.max(0.9, zoom * 0.7);
            const fontSize = Math.max(8, 11 / Math.max(0.85, zoom * 0.65));

            return (
              <g
                key={`badge-${stateName}`}
                transform={`translate(${cx}, ${cy})`}
                className="pointer-events-none select-none"
              >
                {/* High Contrast Background Pill */}
                <rect
                  x={-badgeW / 2}
                  y={-badgeH / 2}
                  width={badgeW}
                  height={badgeH}
                  rx={3 / zoom}
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth={0.8 / zoom}
                  opacity={0.95}
                />
                <text
                  x={0}
                  y={fontSize * 0.35}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize={fontSize}
                  fontWeight="900"
                  letterSpacing="0.05em"
                  className="font-mono"
                >
                  {info.code}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Active Franchisee Territory Key Legend (Bottom Left) ──────────────── */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-lg max-w-[300px] text-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-black text-slate-800">
            <FiLayers size={14} className="text-slate-700" />
            <span>Franchisee Territory Key</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
            {activeFranchiseeLegends.length} Onboarded
          </span>
        </div>

        {/* Monochrome Baseline Key */}
        <div className="space-y-1 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#f8fafc] border border-[#cbd5e1] shrink-0" />
            <span className="truncate">Black & White: Unassigned Districts</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
            <div className="w-3.5 h-3.5 rounded-sm bg-[#e2e8f0] border border-dashed border-[#94a3b8] shrink-0" />
            <span className="truncate">Slate Dashed: Open / Available Cluster</span>
          </div>
        </div>

        {/* Dynamic Active Franchisees */}
        {activeFranchiseeLegends.length > 0 ? (
          <div className="pt-2 max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Onboarded Franchisee Themes
            </div>
            {activeFranchiseeLegends.map((item) => (
              <div
                key={item.cluster_id || item.cluster_code}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-md shrink-0 shadow-xs"
                  style={{ backgroundColor: item.color, border: `1px solid ${item.stroke || item.color}` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-[11px] text-slate-800 truncate" title={item.franchisee_name}>
                    {item.franchisee_name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {item.cluster_name} ({item.cluster_code}) • {item.districts_count} Dist.
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pt-2 text-[10px] italic text-slate-400">
            No franchise onboarded yet. Map is displayed in Black & White until clusters are assigned.
          </div>
        )}
      </div>

      {/* ── Hover Tooltip Micro-Card ───────────────────────────────────────── */}
      {hoveredDistrict && (
        <div
          className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/80 min-w-[220px] max-w-[280px] text-xs transition-opacity duration-75"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: tooltipPos.x > 500 ? 'translateX(-105%)' : 'none',
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
            <span className="font-black text-slate-100 text-sm">{hoveredDistrict.districtName}</span>
            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-black uppercase bg-slate-800 text-slate-300">
              {STATE_INFO[hoveredDistrict.stateName]?.code || hoveredDistrict.stateName.slice(0, 2)}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-medium mt-1">{hoveredDistrict.stateName}</p>

          {hoveredDistrict.match ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: hoveredDistrict.match.color || '#94a3b8' }}
                />
                <span className="font-bold text-white text-[11px]">
                  {hoveredDistrict.match.status_label || 'Configured District'}
                </span>
              </div>

              {hoveredDistrict.match.cluster_name && (
                <div className="text-[11px] text-slate-300 font-medium">
                  <span className="text-slate-400">Cluster: </span>
                  <span className="text-orange-300 font-bold">{hoveredDistrict.match.cluster_name}</span>
                </div>
              )}

              {hoveredDistrict.match.franchisee_name && (
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <FiShield className="text-emerald-400" size={12} />
                  <span>{hoveredDistrict.match.franchisee_name}</span>
                </div>
              )}

              {hoveredDistrict.match.primary_bde_name && (
                <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                  <FiUser className="text-sky-400" size={12} />
                  <span>BDE: {hoveredDistrict.match.primary_bde_name}</span>
                </div>
              )}

              <p className="text-[10px] text-orange-400 font-semibold pt-1 border-t border-slate-800 flex items-center gap-1">
                <FiMapPin size={10} /> Click to inspect complete territory data
              </p>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-500 mr-1.5" />
              Available for cluster onboarding
            </div>
          )}
        </div>
      )}
    </div>
  );
}
