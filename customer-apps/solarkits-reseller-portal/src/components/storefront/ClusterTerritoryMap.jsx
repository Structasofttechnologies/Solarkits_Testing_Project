import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as d3Geo from "d3-geo";
import {
  FiZoomIn,
  FiZoomOut,
  FiRefreshCw,
  FiMapPin,
  FiCheckCircle,
  FiShield,
  FiInfo,
  FiLayers,
} from "react-icons/fi";

// Cache GeoJSON data in-memory so subsequent modal openings don't re-fetch
let cachedGeoData = null;

// Normalizer for district & state name matching
export const cleanName = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/bhoomi/g, "bhumi")
    .replace(/chhatrapati sambhaji nagar/g, "aurangabad")
    .replace(/gautam buddha nagar/g, "noida")
    .replace(/dakshina kannada/g, "mangaluru")
    .replace(/[^a-z0-9]/g, "");

// Vibrant Cluster Palette for differentiating multiple clusters in the same state
const CLUSTER_COLORS = [
  { fill: "#10B981", border: "#047857", bg: "#D1FAE5", text: "#065F46", name: "Emerald" }, // Active default
  { fill: "#3B82F6", border: "#1D4ED8", bg: "#DBEAFE", text: "#1E40AF", name: "Blue" },
  { fill: "#8B5CF6", border: "#6D28D9", bg: "#EDE9FE", text: "#5B21B6", name: "Purple" },
  { fill: "#F59E0B", border: "#D97706", bg: "#FEF3C7", text: "#92400E", name: "Amber" },
  { fill: "#EC4899", border: "#BE185D", bg: "#FCE7F3", text: "#9D174D", name: "Pink" },
  { fill: "#06B6D4", border: "#0E7490", bg: "#CFFAFE", text: "#155E75", name: "Cyan" },
  { fill: "#F97316", border: "#C2410C", bg: "#FFEDD5", text: "#9A3412", name: "Orange" },
  { fill: "#14B8A6", border: "#0F766E", bg: "#CCFBF1", text: "#115E59", name: "Teal" },
];

export default function ClusterTerritoryMap({
  selectedState = "",
  selectedCluster = null,
  availableClusters = [],
  onSelectCluster = () => { },
  highlightedDistrict = "",
  onSelectDistrict = () => { },
}) {
  const [geoData, setGeoData] = useState(cachedGeoData);
  const [loadingGeo, setLoadingGeo] = useState(!cachedGeoData);
  const [loadError, setLoadError] = useState(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Hover Tooltip
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [activeChipDistrict, setActiveChipDistrict] = useState("");

  const svgRef = useRef(null);
  const containerRef = useRef(null);

  // Dimensions
  const width = 640;
  const height = 440;

  // Load GeoJSON
  useEffect(() => {
    if (cachedGeoData) {
      setGeoData(cachedGeoData);
      setLoadingGeo(false);
      return;
    }

    let isMounted = true;
    setLoadingGeo(true);

    fetch("/geojson/india_districts.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load India district boundaries.");
        return res.json();
      })
      .then((data) => {
        cachedGeoData = data;
        if (isMounted) {
          setGeoData(data);
          setLoadingGeo(false);
        }
      })
      .catch((err) => {
        console.error("[ClusterTerritoryMap] GeoJSON load error:", err);
        if (isMounted) {
          setLoadError(err.message);
          setLoadingGeo(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Separate district features
  const districtFeatures = useMemo(() => {
    if (!geoData?.features) return [];
    return geoData.features.filter((f) => f.properties?.district && f.properties.district.trim());
  }, [geoData]);

  // Base Mercator projection
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 22.5])
      .scale(920)
      .translate([width / 2, height / 2]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData]);

  // Map each cluster to a consistent color
  const clusterColorMap = useMemo(() => {
    const map = new Map();
    (availableClusters || []).forEach((clu, idx) => {
      const key = clu.cluster_code || clu.cluster_name;
      const palette = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
      map.set(key, palette);
    });
    return map;
  }, [availableClusters]);

  // District to Cluster Lookup
  const districtToClusterMap = useMemo(() => {
    const map = new Map();
    (availableClusters || []).forEach((clu) => {
      (clu.district_names || []).forEach((distName) => {
        map.set(cleanName(distName), clu);
      });
    });
    return map;
  }, [availableClusters]);

  // Selected cluster district set for O(1) checks
  const selectedClusterDistrictCleanSet = useMemo(() => {
    const set = new Set();
    if (selectedCluster && Array.isArray(selectedCluster.district_names)) {
      selectedCluster.district_names.forEach((d) => set.add(cleanName(d)));
    }
    return set;
  }, [selectedCluster]);

  // Auto-focus and zoom when selectedState changes
  const resetToStateView = useCallback(() => {
    if (!geoData || !projection || !selectedState) return;

    const stateFeatures = districtFeatures.filter((f) => {
      const st = f.properties?.st_nm || "";
      return cleanName(st) === cleanName(selectedState);
    });

    if (stateFeatures.length > 0) {
      try {
        const bounds = d3Geo.geoBounds({ type: "FeatureCollection", features: stateFeatures });
        const [[x0, y0], [x1, y1]] = [projection(bounds[0]), projection(bounds[1])];

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const midX = (x0 + x1) / 2;
        const midY = (y0 + y1) / 2;

        const targetScale = Math.min(7, Math.max(1.8, 0.82 / Math.max(dx / width, dy / height)));
        const targetPanX = width / 2 - targetScale * midX;
        const targetPanY = height / 2 - targetScale * midY;

        setZoom(targetScale);
        setPan({ x: targetPanX, y: targetPanY });
      } catch (e) {
        console.warn("[ClusterTerritoryMap] Auto-zoom error:", e);
      }
    } else {
      // Whole country reset
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [geoData, projection, selectedState, districtFeatures]);

  useEffect(() => {
    resetToStateView();
  }, [resetToStateView]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
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
        x: e.clientX - rect.left + 14,
        y: e.clientY - rect.top + 14,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Zoom buttons
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.3, 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.3, 0.8));

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.8), 10));
  };

  // State features
  const stateDistricts = useMemo(() => {
    if (!selectedState) return districtFeatures;
    return districtFeatures.filter((f) => cleanName(f.properties?.st_nm) === cleanName(selectedState));
  }, [districtFeatures, selectedState]);

  // Resolve visual styling for each district
  const getDistrictStyle = useCallback(
    (feature) => {
      const dName = feature.properties?.district || "";
      const sName = feature.properties?.st_nm || "";
      const dClean = cleanName(dName);
      const isSelectedState = cleanName(sName) === cleanName(selectedState);

      if (!isSelectedState) {
        return {
          fill: "#f8fafc",
          stroke: "#e2e8f0",
          strokeWidth: 0.5 / zoom,
          opacity: 0.35,
          cursor: "default",
          isMember: false,
          cluster: null,
        };
      }

      // Check if it belongs to selected cluster
      const isMemberOfSelectedCluster =
        selectedClusterDistrictCleanSet.has(dClean) ||
        Array.from(selectedClusterDistrictCleanSet).some((sc) => dClean.includes(sc) || sc.includes(dClean));

      // Check if it matches active chip or hovered district
      const isChipActive =
        activeChipDistrict &&
        (cleanName(activeChipDistrict) === dClean || dClean.includes(cleanName(activeChipDistrict)));

      // Associated cluster for this district
      const assignedCluster =
        districtToClusterMap.get(dClean) ||
        Array.from(districtToClusterMap.entries()).find(
          ([k]) => dClean.includes(k) || k.includes(dClean)
        )?.[1];

      if (isMemberOfSelectedCluster) {
        return {
          fill: isChipActive ? "#047857" : "#10B981", // Vibrant Solarkits Emerald
          stroke: "#064E3B",
          strokeWidth: (isChipActive ? 2.8 : 2.2) / zoom,
          opacity: 1,
          cursor: "pointer",
          isMember: true,
          cluster: selectedCluster,
        };
      }

      if (assignedCluster) {
        const clusterKey = assignedCluster.cluster_code || assignedCluster.cluster_name;
        const palette = clusterColorMap.get(clusterKey) || CLUSTER_COLORS[1];
        return {
          fill: palette.fill,
          stroke: palette.border,
          strokeWidth: 1.2 / zoom,
          opacity: 0.45,
          cursor: "pointer",
          isMember: false,
          cluster: assignedCluster,
        };
      }

      // District without an assigned cluster
      return {
        fill: "#f1f5f9",
        stroke: "#cbd5e1",
        strokeWidth: 0.8 / zoom,
        opacity: 0.8,
        cursor: "pointer",
        isMember: false,
        cluster: null,
      };
    },
    [
      selectedState,
      selectedCluster,
      selectedClusterDistrictCleanSet,
      activeChipDistrict,
      districtToClusterMap,
      clusterColorMap,
      zoom,
    ]
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs space-y-0 transition-all">
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
            <FiLayers size={14} />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-slate-200">
              {selectedState || "India"} Franchise Territory
            </span>
            {selectedCluster?.cluster_name ? (
              <span className="ml-1.5 text-[11px] font-semibold text-emerald-300">
                • {selectedCluster.cluster_name} ({selectedCluster.cluster_code || "Cluster"})
              </span>
            ) : (
              <span className="ml-1.5 text-[11px] font-semibold text-amber-300">
                • Expansion Region (0 Clusters Active)
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
          >
            <FiZoomIn size={13} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
          >
            <FiZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={resetToStateView}
            title="Reset State View"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
          >
            <FiRefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Map Canvas Container ───────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full h-[250px] sm:h-[280px] bg-slate-50/70 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredDistrict(null);
        }}
        onWheel={handleWheel}
      >
        {/* Loading Spinner */}
        {loadingGeo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-20 gap-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-600">Loading State & Cluster Map...</span>
          </div>
        )}

        {/* Load Error */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-red-50 text-red-700 text-xs z-20 text-center">
            <FiInfo size={20} className="mb-1 text-red-500" />
            <span>Map unavailable: {loadError}</span>
          </div>
        )}

        {/* SVG Projection Canvas */}
        {pathGenerator && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full block"
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {districtFeatures.map((feature, idx) => {
                const dName = feature.properties?.district || `District-${idx}`;
                const sName = feature.properties?.st_nm || "";
                const style = getDistrictStyle(feature);
                const isHovered = hoveredDistrict?.dName === dName;

                return (
                  <path
                    key={`dist-${sName}-${dName}-${idx}`}
                    d={pathGenerator(feature)}
                    fill={isHovered ? "#059669" : style.fill}
                    fillOpacity={isHovered ? 1 : style.opacity}
                    stroke={isHovered ? "#064E3B" : style.stroke}
                    strokeWidth={isHovered ? 2.5 / zoom : style.strokeWidth}
                    className="transition-colors duration-100 outline-none"
                    onMouseEnter={() => {
                      if (style.opacity > 0.4) {
                        setHoveredDistrict({
                          dName,
                          sName,
                          isMember: style.isMember,
                          cluster: style.cluster,
                        });
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (style.cluster) {
                        onSelectCluster(style.cluster, dName);
                      }
                      if (onSelectDistrict) {
                        onSelectDistrict(dName);
                      }
                    }}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {/* Interactive Floating Tooltip */}
        {hoveredDistrict && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-[11px] max-w-xs animate-fadeIn transition-transform"
            style={{
              left: Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 300) - 210),
              top: Math.min(tooltipPos.y, (containerRef.current?.clientHeight || 200) - 80),
            }}
          >
            <div className="font-extrabold text-sm text-emerald-400 flex items-center gap-1.5">
              <FiMapPin size={12} />
              <span>{hoveredDistrict.dName}</span>
            </div>
            <div className="text-[10px] text-slate-300">
              State: <span className="font-semibold text-white">{hoveredDistrict.sName}</span>
            </div>
            {hoveredDistrict.cluster ? (
              <div className="mt-1 pt-1 border-t border-slate-800">
                <div className="text-[10px] text-slate-300">
                  Cluster:{" "}
                  <span className="font-bold text-white">
                    {hoveredDistrict.cluster.cluster_name}
                  </span>
                </div>
                {hoveredDistrict.isMember ? (
                  <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                    <FiCheckCircle size={10} /> Selected Cluster Rights
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-medium text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                    Click to switch to this cluster
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-amber-300 flex items-center gap-1 font-semibold">
                <FiInfo size={11} />
                <span>Unassigned Territory — Inquire as Expansion Partner</span>
              </div>
            )}
          </div>
        )}

        {/* Floating Banner when 0 Clusters in this State */}
        {availableClusters.length === 0 && !loadingGeo && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/40 shadow-lg text-center max-w-xs sm:max-w-sm pointer-events-none">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-[11px]">
              <FiShield size={12} />
              <span>No Active Clusters in {selectedState}</span>
            </div>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
              Submit your inquiry to register as an early regional expansion partner.
            </p>
          </div>
        )}

        {/* Live Map Legend Overlay (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-3 text-[10px] font-bold text-slate-700">
          {availableClusters.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-xs" />
                <span>Selected Cluster ({selectedCluster?.district_names?.length || 0})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 opacity-60" />
                <span>Other Clusters ({availableClusters.length})</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-800">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-xs" />
              <span>Expansion Region (0 Clusters Active)</span>
            </div>
          )}
        </div>

        {/* Click Hint (Bottom Right) */}
        <div className="absolute bottom-2.5 right-2.5 z-10 hidden sm:flex items-center gap-1 text-[10px] text-slate-500 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200">
          <FiInfo size={11} className="text-slate-400" />
          <span>{availableClusters.length > 0 ? "Click any district to auto-select its cluster" : "Territory open for expansion partner inquiry"}</span>
        </div>
      </div>

      {/* ── Covered Districts Interactive Chips Bar ────────────────── */}
      {selectedCluster && (selectedCluster.district_names || []).length > 0 ? (
        <div className="p-3 bg-emerald-50/50 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FiShield className="text-emerald-700 shrink-0" size={13} />
              <span className="font-extrabold text-emerald-950">
                Covered Districts in {selectedCluster.cluster_name} ({selectedCluster.district_names.length}):
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {selectedCluster.district_names.map((dist) => (
                <button
                  type="button"
                  key={dist}
                  onClick={() => {
                    setActiveChipDistrict(dist);
                    if (onSelectDistrict) onSelectDistrict(dist);
                  }}
                  onMouseEnter={() => setActiveChipDistrict(dist)}
                  onMouseLeave={() => setActiveChipDistrict("")}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${activeChipDistrict === dist
                      ? "bg-emerald-700 text-white border-emerald-800 shadow-xs scale-105"
                      : "bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                    }`}
                >
                  {dist}
                </button>
              ))}
            </div>
          </div>

          <span className="self-start sm:self-center shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
            <FiCheckCircle size={11} /> Exclusive Rights
          </span>
        </div>
      ) : (
        <div className="p-2.5 bg-amber-50/50 border-t border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-1.5">
            <FiInfo className="text-amber-600 shrink-0" size={13} />
            <span className="font-semibold text-[11px]">
              Territory Expansion: Solarkits is currently onboarding partners across active states. Submit inquiry for early allocation in {selectedState}.
            </span>
          </div>
          <span className="self-start sm:self-center shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
            Expansion Request
          </span>
        </div>
      )}
    </div>
  );
}
