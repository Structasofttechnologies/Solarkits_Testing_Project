import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiMapPin, FiCheck } from 'react-icons/fi';

const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const STATE_CENTERS = {
  'gujarat': [71.577, 22.7],
  'maharashtra': [76.094, 19.455],
  'madhyapradesh': [78.284, 23.541],
  'rajasthan': [73.852, 26.578],
  'uttarpradesh': [80.591, 26.922],
  'karnataka': [76.168, 14.7],
  'tamilnadu': [78.406, 11.011],
  'delhi': [77.114, 28.645]
};

export default function IndiaTargetingMap({
  selectedStates = [],
  onToggleState,
  selectedClusters = [],
  onSelectCluster
}) {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const width = 600;
  const height = 650;

  useEffect(() => {
    let isMounted = true;
    fetch('/geojson/india_districts.json')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setGeoData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Map loading error:', err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

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

  // Perfectly calibrated D3 Mercator projection for India
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 0])
      .scale(880)
      .translate([width / 2, 650]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData, width, height]);

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
      setTooltipPos({
        x: e.clientX - rect.left + 10,
        y: e.clientY - rect.top + 10
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.7), 8));
  };

  // State selection helper
  const isStateSelected = useCallback((stateName) => {
    if (!stateName) return false;
    const cName = clean(stateName);
    return selectedStates.some(s => clean(s) === cName);
  }, [selectedStates]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoveredState(null);
      }}
      onWheel={handleWheel}
    >
      {/* Top Banner overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs text-xs">
        <FiMapPin className="text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-slate-700 dark:text-slate-200">
          Click Map to Select States / Clusters
        </span>
        <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-black">
          {selectedStates.length} Selected
        </span>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <button
          type="button"
          onClick={() => setZoom(prev => Math.min(prev * 1.3, 8))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
          title="Zoom In"
        >
          <FiZoomIn />
        </button>
        <button
          type="button"
          onClick={() => setZoom(prev => Math.max(prev / 1.3, 0.7))}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
          title="Zoom Out"
        >
          <FiZoomOut />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
          title="Reset Map"
        >
          <FiRefreshCw />
        </button>
      </div>

      {loading ? (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading India Territory Map...</span>
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Districts Rendering */}
            {districtFeatures.map((f, i) => {
              const sName = f.properties?.st_nm || '';
              const dName = f.properties?.district || '';
              const selected = isStateSelected(sName);

              return (
                <path
                  key={i}
                  d={pathGenerator(f)}
                  fill={selected ? '#6366f1' : '#e2e8f0'}
                  fillOpacity={selected ? 0.75 : 0.6}
                  stroke={selected ? '#4338ca' : '#cbd5e1'}
                  strokeWidth={selected ? 0.8 / zoom : 0.4 / zoom}
                  className="transition-colors duration-150 hover:fill-indigo-400 hover:fill-opacity-80 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleState && sName) onToggleState(sName);
                  }}
                  onMouseEnter={() => {
                    setHoveredState({ state: sName, district: dName, selected });
                  }}
                />
              );
            })}

            {/* State Boundaries */}
            {stateBoundaries.map((s, idx) => (
              <path
                key={`sb-${idx}`}
                d={pathGenerator(s)}
                fill="none"
                stroke="#475569"
                strokeWidth={1.0 / zoom}
                className="pointer-events-none"
              />
            ))}
          </g>
        </svg>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredState && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/90 text-white px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-700 text-[11px] backdrop-blur-xs space-y-0.5"
          style={{
            left: `${Math.min(tooltipPos.x, width - 180)}px`,
            top: `${Math.min(tooltipPos.y, height - 80)}px`
          }}
        >
          <div className="font-bold flex items-center gap-1.5">
            <span>{hoveredState.district}, {hoveredState.state}</span>
            {hoveredState.selected && (
              <span className="text-emerald-400 text-[10px]">✓ Selected</span>
            )}
          </div>
          <p className="text-[10px] text-slate-300">Click to toggle state selection</p>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[10px] text-slate-500 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
        <span>💡 Click any state on the map to add/remove it from campaign targeting.</span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Drag to Pan • Wheel to Zoom</span>
      </div>
    </div>
  );
}
