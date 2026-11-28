import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as d3Geo from 'd3-geo';
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiMapPin, FiSliders } from 'react-icons/fi';
import {
  MAP_COLOR_PALETTES,
  normalizeGeoKey,
  loadSavedPaletteId,
  savePaletteId,
  loadSavedCustomStateColors,
  saveCustomStateColors,
  buildStateColorMap,
  getStateFallbackColor
} from '../../../utils/mapColorPalettes';

const cleanName = (s) => normalizeGeoKey(s);

const SVG_WIDTH = 760;
const SVG_HEIGHT = 540;

const COUNTRY_NAME_ALIASES = {
  'united states of america': 'united states',
  'united arab emirates': 'uae',
  'united kingdom': 'uk'
};

export default function LeadGeoMapVisualizer({
  countriesData = [],
  statesData = [],
  districtsData = [],
  districtClusterMap = {},
  mode = 'india', // 'world' | 'india' | 'district'
  selectedStateName = '',
  selectedClusterName = '',
  selectedDistrictName = '',
  selectedSegment = 'ALL', // 'ALL' | 'franchisee_leads' | 'epc_signup_leads' | 'epc_sales_leads'
  onSelectCountry,
  onSelectState,
  onSelectDistrict
}) {
  const [worldGeo, setWorldGeo] = useState(null);
  const [indiaGeo, setIndiaGeo] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });

  // Dynamic Color Palette Controls (State-Cluster Identity vs Intensity)
  const [paletteId, setPaletteId] = useState(() => loadSavedPaletteId());
  const [customStateColors, setCustomStateColors] = useState(() => loadSavedCustomStateColors());
  const [colorMode, setColorMode] = useState('state_clusters'); // 'state_clusters' | 'intensity'
  const [showColorTools, setShowColorTools] = useState(false);
  const [pickState, setPickState] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/geojson/world_countries.json')
      .then((r) => r.json())
      .then((d) => { if (active) setWorldGeo(d); })
      .catch(() => { });
    fetch('/geojson/india_districts.json')
      .then((r) => r.json())
      .then((d) => { if (active) setIndiaGeo(d); })
      .catch(() => { });
    return () => { active = false; };
  }, []);

  const metricValue = useCallback((entry) => {
    if (!entry) return 0;
    if (selectedSegment !== 'ALL' && entry[selectedSegment] !== undefined) {
      return Number(entry[selectedSegment] || 0);
    }
    return Number(entry.unique_leads ?? entry.leads ?? entry.targeted ?? 0);
  }, [selectedSegment]);

  const countryLookup = useMemo(() => {
    const m = new Map();
    for (const c of countriesData) {
      const k = String(c.name || '').trim().toLowerCase();
      m.set(k, c);
      m.set(cleanName(k), c);
    }
    return m;
  }, [countriesData]);

  const stateLookup = useMemo(() => {
    const m = new Map();
    for (const s of statesData) {
      m.set(cleanName(s.name), s);
    }
    return m;
  }, [statesData]);

  const districtLookup = useMemo(() => {
    const m = new Map();
    for (const d of districtsData) {
      const key = `${cleanName(d.state_name || '')}::${cleanName(d.name)}`;
      m.set(key, d);
      m.set(cleanName(d.name), d);
    }
    return m;
  }, [districtsData]);

  const allStateNames = useMemo(() => {
    const s = new Set((statesData || []).map((st) => st.name).filter(Boolean));
    for (const feat of indiaGeo?.features || []) {
      if (feat.properties?.st_nm) s.add(feat.properties.st_nm);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [statesData, indiaGeo]);

  useEffect(() => {
    if (!pickState && allStateNames.length > 0) {
      setPickState(allStateNames[0]);
    }
  }, [pickState, allStateNames]);

  const stateColorMap = useMemo(
    () => buildStateColorMap(allStateNames, paletteId, customStateColors),
    [allStateNames, paletteId, customStateColors]
  );

  const resolveStateColor = useCallback(
    (stName) => {
      if (!stName) return '#E2E8F0';
      return (
        stateColorMap.get(cleanName(stName)) ||
        stateColorMap.get(String(stName).toLowerCase()) ||
        getStateFallbackColor(stName, paletteId, customStateColors)
      );
    },
    [stateColorMap, paletteId, customStateColors]
  );

  const renderedMap = useMemo(() => {
    if (mode === 'world' && worldGeo?.features) {
      const projection = d3Geo.geoNaturalEarth1().fitSize([SVG_WIDTH - 20, SVG_HEIGHT - 20], worldGeo);
      const pathGen = d3Geo.geoPath().projection(projection);
      const features = worldGeo.features.map((feat, idx) => {
        const rawName = feat.properties?.name || feat.properties?.NAME || '';
        const aliasKey = COUNTRY_NAME_ALIASES[rawName.toLowerCase()] || rawName.toLowerCase();
        const stats = countryLookup.get(rawName.toLowerCase()) || countryLookup.get(aliasKey) || countryLookup.get(cleanName(rawName));
        const val = metricValue(stats);
        const fill =
          colorMode === 'state_clusters'
            ? val > 0
              ? resolveStateColor(rawName)
              : '#E2E8F0'
            : val > 100 ? '#0F766E' : val > 25 ? '#14B8A6' : val > 5 ? '#5EEAD4' : val > 0 ? '#99F6E4' : '#E2E8F0';
        return {
          key: feat.id || idx,
          name: rawName,
          d: pathGen(feat),
          centroid: pathGen.centroid(feat),
          stats,
          val,
          fill,
          fillOpacity: val > 0 ? 0.92 : 0.85,
          matchesSelection: true
        };
      });
      return { features, stateMarkers: [], kind: 'world' };
    }

    if (indiaGeo?.features) {
      const activeFeatures =
        mode === 'district' && selectedStateName
          ? indiaGeo.features.filter((f) => cleanName(f.properties?.st_nm) === cleanName(selectedStateName))
          : indiaGeo.features;

      const collection = {
        type: 'FeatureCollection',
        features: activeFeatures.length > 0 ? activeFeatures : indiaGeo.features
      };

      const projection = d3Geo.geoMercator().fitExtent([[18, 18], [SVG_WIDTH - 18, SVG_HEIGHT - 18]], collection);
      const pathGen = d3Geo.geoPath().projection(projection);

      const statePoints = new Map();
      const features = collection.features.map((feat, idx) => {
        const stNm = feat.properties?.st_nm || '';
        const distNm = feat.properties?.district || '';
        const normKey = `${cleanName(stNm)}::${cleanName(distNm)}`;
        const stStats = stateLookup.get(cleanName(stNm));
        const dStats = districtLookup.get(normKey) || districtLookup.get(cleanName(distNm));
        const cluInfo = districtClusterMap?.[normKey] || null;
        const cluName = dStats?.cluster_name || cluInfo?.cluster_name || '';

        const stats = mode === 'district' ? (dStats || stStats) : stStats;
        const val = metricValue(stats);
        const distVal = metricValue(dStats);

        const matchesState = !selectedStateName || cleanName(stNm) === cleanName(selectedStateName);
        const matchesCluster = !selectedClusterName || (cluName && cleanName(cluName) === cleanName(selectedClusterName));
        const matchesDistrict = !selectedDistrictName || cleanName(distNm) === cleanName(selectedDistrictName);
        const matchesSelection = matchesState && matchesCluster && matchesDistrict;

        const stateColor = resolveStateColor(stNm);
        let fill = stateColor;
        let fillOpacity = 0.35;

        if (colorMode === 'state_clusters') {
          fill = stateColor;
          if (!matchesSelection) {
            fillOpacity = 0.14;
          } else {
            fillOpacity = val > 0 || distVal > 0 ? 0.94 : cluInfo ? 0.72 : 0.32;
          }
        } else {
          fill = '#E2E8F0';
          fillOpacity = !matchesSelection ? 0.16 : 0.95;
          const intensityVal = selectedClusterName || selectedDistrictName || mode === 'district' ? distVal : val;
          if (intensityVal > 50) fill = '#1E3A8A';
          else if (intensityVal > 15) fill = '#2563EB';
          else if (intensityVal > 4) fill = '#60A5FA';
          else if (intensityVal > 0) fill = '#BFDBFE';
        }

        const c = pathGen.centroid(feat);
        if (stNm && !Number.isNaN(c[0]) && !Number.isNaN(c[1]) && matchesState) {
          if (!statePoints.has(stNm)) statePoints.set(stNm, { sx: 0, sy: 0, n: 0, val: metricValue(stStats) });
          const sp = statePoints.get(stNm);
          sp.sx += c[0];
          sp.sy += c[1];
          sp.n += 1;
        }

        return {
          key: `${stNm}_${distNm}_${idx}`,
          name: mode === 'district' ? distNm : stNm,
          stateName: stNm,
          districtName: distNm,
          d: pathGen(feat),
          centroid: c,
          stats,
          stateStats: stStats,
          districtStats: dStats,
          clusterInfo: cluInfo,
          val,
          distVal,
          fill,
          fillOpacity,
          matchesSelection
        };
      });

      const stateMarkers =
        mode === 'india'
          ? Array.from(statePoints.entries())
            .filter(([, v]) => v.val > 0)
            .map(([stName, v]) => ({ name: stName, x: v.sx / v.n, y: v.sy / v.n, val: v.val }))
          : [];

      return { features, stateMarkers, kind: mode };
    }

    return { features: [], stateMarkers: [], kind: mode };
  }, [
    mode,
    worldGeo,
    indiaGeo,
    selectedStateName,
    selectedClusterName,
    selectedDistrictName,
    countryLookup,
    stateLookup,
    districtLookup,
    districtClusterMap,
    metricValue,
    colorMode,
    resolveStateColor
  ]);

  const handlePaletteChange = (newId) => {
    setPaletteId(newId);
    savePaletteId(newId);
  };

  const handleStateColorPick = (stateName, hex) => {
    if (!stateName) return;
    const next = { ...customStateColors, [stateName]: hex, [cleanName(stateName)]: hex };
    setCustomStateColors(next);
    saveCustomStateColors(next);
  };

  const handleResetColors = () => {
    setCustomStateColors({});
    saveCustomStateColors({});
  };

  return (
    <div className="space-y-2.5">
      {/* Dynamic State Color Palette Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/70 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <FiSliders className="text-teal-600" /> Map Palette:
          </span>
          <select
            value={paletteId}
            onChange={(e) => handlePaletteChange(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-semibold"
          >
            {MAP_COLOR_PALETTES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 font-semibold"
          >
            <option value="state_clusters">Unique Color / State (Same Across State Clusters)</option>
            <option value="intensity">Lead Volume Intensity</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowColorTools((s) => !s)}
          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-bold text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer"
        >
          {showColorTools ? 'Hide State Colors' : 'Customize State Color'}
        </button>
      </div>

      {showColorTools && (
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900/90 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800 text-[11px]">
          <span className="font-bold text-slate-600 dark:text-slate-300">Select State:</span>
          <select
            value={pickState}
            onChange={(e) => setPickState(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 font-semibold"
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
            title="Pick custom hex color for state clusters"
          />
          <button
            type="button"
            onClick={handleResetColors}
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
          >
            Reset Custom Colors
          </button>
        </div>
      )}

      {/* Map Viewport */}
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-hidden select-none">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, z + 0.35))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            title="Zoom In"
          >
            <FiZoomIn />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.35))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            title="Zoom Out"
          >
            <FiZoomOut />
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            title="Reset View"
          >
            <FiRefreshCw />
          </button>
        </div>

        {/* Rich District -> Cluster -> State Hover Tooltip */}
        {hovered && (
          <div className="absolute top-3 left-3 z-20 bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl text-[11px] shadow-xl pointer-events-none max-w-xs border border-slate-700 space-y-1">
            <div className="font-bold text-xs flex items-center gap-1.5">
              <FiMapPin className="text-teal-400 shrink-0" />
              <span>{hovered.districtName ? `${hovered.districtName}, ${hovered.stateName}` : hovered.name}</span>
            </div>
            {(hovered.clusterInfo || hovered.districtStats?.cluster_name) && (
              <div className="text-[10px] font-bold text-amber-300">
                Cluster: {hovered.districtStats?.cluster_name || hovered.clusterInfo?.cluster_name}{' '}
                {hovered.clusterInfo?.cluster_code ? `(${hovered.clusterInfo.cluster_code})` : ''}
              </div>
            )}
            {hovered.districtStats && (
              <div className="text-[10px] text-teal-300 font-semibold border-b border-slate-700 pb-1">
                District Leads: <strong>{metricValue(hovered.districtStats).toLocaleString('en-IN')}</strong>
              </div>
            )}
            {hovered.stateStats || hovered.stats ? (
              <div className="space-y-0.5 text-slate-200">
                <div>
                  {hovered.stateName ? `${hovered.stateName} Leads` : 'Unique Leads'}:{' '}
                  <strong>{metricValue(hovered.stateStats || hovered.stats).toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Franchisee: {(hovered.stateStats || hovered.stats)?.franchisee_leads ?? 0} • EPC Signup:{' '}
                  {(hovered.stateStats || hovered.stats)?.epc_signup_leads ?? 0} • Sales:{' '}
                  {(hovered.stateStats || hovered.stats)?.epc_sales_leads ?? 0}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">0 leads matched in this area</div>
            )}
          </div>
        )}

        {!worldGeo && !indiaGeo ? (
          <div className="h-[520px] flex items-center justify-center text-xs text-slate-500">
            Loading geographical boundaries...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-[520px] cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              setDragging(true);
              setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }}
            onMouseMove={(e) => {
              if (dragging) {
                setPan({ x: e.clientX - dragOrigin.x, y: e.clientY - dragOrigin.y });
              }
            }}
            onMouseUp={() => setDragging(false)}
            onMouseLeave={() => setDragging(false)}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {renderedMap.features.map((f) => {
                const isExactDistrict =
                  selectedDistrictName && cleanName(f.districtName) === cleanName(selectedDistrictName);
                const isHighlighted =
                  isExactDistrict ||
                  (selectedStateName && f.matchesSelection && (selectedClusterName || selectedDistrictName));
                return (
                  <path
                    key={f.key}
                    d={f.d || ''}
                    fill={f.fill}
                    fillOpacity={f.fillOpacity ?? 0.9}
                    stroke={isExactDistrict ? '#0F172A' : isHighlighted ? '#1E293B' : '#64748B'}
                    strokeWidth={isExactDistrict ? 1.6 : mode === 'world' ? 0.6 : 0.45}
                    className="transition-colors hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHovered(f)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (mode === 'world' && onSelectCountry) onSelectCountry(f.name, f.stats);
                      else if (mode === 'india' && onSelectState) onSelectState(f.stateName, f.stats);
                      else if (mode === 'district' && onSelectDistrict) onSelectDistrict(f.districtName, f.stateName, f.stats);
                    }}
                  />
                );
              })}

              {(renderedMap.stateMarkers || []).map((m) => (
                <g
                  key={m.name}
                  transform={`translate(${m.x}, ${m.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectState && onSelectState(m.name, stateLookup.get(cleanName(m.name)))}
                >
                  <circle r={Math.max(8, Math.min(18, 6 + Math.sqrt(m.val)))} fill="#0F172A" fillOpacity="0.82" stroke="#FFFFFF" strokeWidth="1.2" />
                  <text textAnchor="middle" dy="3.5" fill="#FFFFFF" fontSize="8.5" fontWeight="700">
                    {m.val}
                  </text>
                </g>
              ))}

              {mode === 'district' &&
                renderedMap.features
                  .filter((f) => f.matchesSelection && (f.distVal || f.val) > 0 && f.centroid && !Number.isNaN(f.centroid[0]))
                  .map((f) => (
                    <g key={`lbl_${f.key}`} transform={`translate(${f.centroid[0]}, ${f.centroid[1]})`} className="pointer-events-none">
                      <circle r="9" fill="#0F172A" fillOpacity="0.82" stroke="#FFFFFF" strokeWidth="1" />
                      <text textAnchor="middle" dy="3" fill="#FFFFFF" fontSize="8" fontWeight="700">
                        {f.distVal || f.val}
                      </text>
                    </g>
                  ))}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
