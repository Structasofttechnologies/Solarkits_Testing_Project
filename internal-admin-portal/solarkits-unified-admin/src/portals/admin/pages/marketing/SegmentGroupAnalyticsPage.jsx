import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3Geo from 'd3-geo';
import {
  FaLayerGroup,
  FaSyncAlt,
  FaUsers,
  FaCheckCircle,
  FaShieldAlt,
  FaShoppingCart,
  FaRupeeSign,
  FaBullhorn,
  FaChartLine,
  FaMapMarkedAlt,
  FaFilter,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaArrowUp,
  FaPlus,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import { fetchSegmentAnalytics } from './services/marketingDataService';

const NON_LATIN_STATE_ALIASES = {
  'महाराष्ट्र': 'maharashtra',
  'गुजरात': 'gujarat',
  'राजस्थान': 'rajasthan',
  'उत्तरप्रदेश': 'uttarpradesh',
  'उत्तर प्रदेश': 'uttarpradesh',
  'मध्यप्रदेश': 'madhyapradesh',
  'मध्य प्रदेश': 'madhyapradesh',
  'कर्नाटक': 'karnataka',
  'तमिलनाडु': 'tamilnadu',
  'दिल्ली': 'delhi',
  'नईदिल्ली': 'delhi',
  'बिहार': 'bihar',
  'हरियाणा': 'haryana',
  'पंजाब': 'punjab',
  'तेलंगाना': 'telangana',
  'आंध्रप्रदेश': 'andhrapradesh',
  'केरल': 'kerala',
  'ओडिशा': 'odisha',
  'झारखंड': 'jharkhand',
  'छत्तीसगढ़': 'chhattisgarh'
};

const DISTRICT_SPELLING_ALIASES = {
  ahmadabad: 'ahmedabad',
  baroda: 'vadodara',
  broach: 'bharuch',
  aurangabad: 'chhatrapatisambhajinagar',
  osmanabad: 'dharashiv',
  ahilyanagar: 'ahmednagar',
  bangalore: 'bengaluruurban',
  bengaluru: 'bengaluruurban',
  lko: 'lucknow',
  chikhli: 'buldhana',
  kannad: 'chhatrapatisambhajinagar',
  mul: 'chandrapur'
};

const cleanToken = (val) => {
  const raw = String(val || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '');
  if (NON_LATIN_STATE_ALIASES[raw]) return NON_LATIN_STATE_ALIASES[raw];
  if (NON_LATIN_STATE_ALIASES[compact]) return NON_LATIN_STATE_ALIASES[compact];
  const base = raw
    .toLowerCase()
    .replace(/bhoomi/g, 'bhumi')
    .replace(/\b(district|dist|region|division|cluster|urban|rural|city|taluka|tehsil|state)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
  return DISTRICT_SPELLING_ALIASES[base] || base;
};

const formatInr = (val) => {
  const num = Number(val || 0);
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
};

const PURPOSE_COLORS = {
  epc_signup_login: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  franchisee_signup_login: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  kit_sales: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
};

/**
 * Dynamic India Map displaying Segment Group Leads, Registrations, Verifications, Orders & Campaign Impact
 * down to State -> Active Clusters -> Districts. Zero static/mock data.
 */
function SegmentAnalyticsMapPanel({
  mapTerritory,
  selectedState,
  selectedCluster,
  selectedDistrict,
  onSelectGeo,
  onClearGeo
}) {
  const [geoData, setGeoData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverArea, setHoverArea] = useState(null);
  const [clickedArea, setClickedArea] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [metricMode, setMetricMode] = useState('leads'); // 'leads' | 'registered' | 'buyers' | 'impact'
  const containerRef = useRef(null);

  const width = 600;
  const height = 650;

  useEffect(() => {
    let mounted = true;
    fetch('/geojson/india_districts.json')
      .then((res) => res.json())
      .then((d) => {
        if (mounted) {
          setGeoData(d);
          setMapLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setMapLoading(false);
      });
    return () => {
      mounted = false;
    };
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

  const pathGenerator = useMemo(() => {
    if (!geoData) return null;
    const proj = d3Geo.geoMercator().center([82.5, 0]).scale(880).translate([width / 2, 650]);
    return d3Geo.geoPath().projection(proj);
  }, [geoData]);

  const { stateByToken, districtByToken } = useMemo(() => {
    const sMap = new Map();
    const dMap = new Map();
    for (const st of mapTerritory?.states || []) {
      const sTok = cleanToken(st.state_name);
      sMap.set(sTok, st);
      for (const clu of st.clusters || []) {
        for (const dist of clu.districts || []) {
          const dTok = cleanToken(dist.district_name);
          if (!dTok) continue;
          dMap.set(`${sTok}::${dTok}`, {
            ...dist,
            state_name: st.state_name,
            state_stats: st,
            cluster_name: clu.cluster_name,
            cluster_code: clu.cluster_code,
            color_code: clu.color_code,
            cluster_stats: clu
          });
        }
      }
      for (const ud of st.unclustered_districts || []) {
        const dTok = cleanToken(ud.district_name);
        if (!dTok || dMap.has(`${sTok}::${dTok}`)) continue;
        dMap.set(`${sTok}::${dTok}`, {
          ...ud,
          state_name: st.state_name,
          state_stats: st,
          cluster_name: 'Outside Configured Cluster',
          cluster_code: '',
          color_code: '#f59e0b',
          cluster_stats: null
        });
      }
    }
    return { stateByToken: sMap, districtByToken: dMap };
  }, [mapTerritory]);

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
    }
  };

  const buildPopupInfo = (sName, dName) => {
    const sTok = cleanToken(sName);
    const dTok = cleanToken(dName);
    const stNode = stateByToken.get(sTok) || null;
    const distNode = districtByToken.get(`${sTok}::${dTok}`) || null;
    return {
      state_name: stNode?.state_name || sName,
      district_name: distNode?.district_name || dName,
      state_stats: stNode,
      district_stats: distNode,
      cluster_name: distNode?.cluster_name || '',
      cluster_code: distNode?.cluster_code || '',
      clusters: stNode?.clusters || []
    };
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaMapMarkedAlt className="text-indigo-600" /> Live Segment & Campaign Impact Map
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Click or hover any area to inspect Leads Uploaded, Registrations, Verifications, Orders & Campaign Lift
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <select
            value={metricMode}
            onChange={(e) => setMetricMode(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="leads">Highlight: Leads Uploaded</option>
            <option value="registered">Highlight: Registered & Verified</option>
            <option value="buyers">Highlight: Buyers & Orders</option>
            <option value="impact">Highlight: Post-Campaign Conversions</option>
          </select>

          {(selectedState || selectedCluster || selectedDistrict) && (
            <button
              type="button"
              onClick={() => {
                setClickedArea(null);
                onClearGeo();
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
            >
              Clear Geo
            </button>
          )}
        </div>
      </div>

      {/* SVG Map Box */}
      <div
        ref={containerRef}
        className="relative w-full h-[380px] bg-slate-50 dark:bg-slate-900/60 overflow-hidden select-none cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoverArea(null);
        }}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.15 : 0.87;
          setZoom((p) => Math.min(Math.max(p * factor, 0.7), 8));
        }}
      >
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 bg-white/95 dark:bg-slate-800/95 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => setZoom((p) => Math.min(p * 1.3, 8))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
          >
            <FiZoomIn />
          </button>
          <button
            type="button"
            onClick={() => setZoom((p) => Math.max(p / 1.3, 0.7))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
          >
            <FiZoomOut />
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
          >
            <FiRefreshCw />
          </button>
        </div>

        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/95 dark:bg-slate-800/95 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">Active Segment / Cluster Territory</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">Verified / Buyer / Post-Campaign Impact</span>
          </div>
        </div>

        {mapLoading || !pathGenerator ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
            Loading India Vector Map...
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {districtFeatures.map((f, idx) => {
                const sName = f.properties?.st_nm || '';
                const dName = f.properties?.district || '';
                const sTok = cleanToken(sName);
                const dTok = cleanToken(dName);
                const stNode = stateByToken.get(sTok);
                const dNode = districtByToken.get(`${sTok}::${dTok}`);

                let fill = '#f1f5f9';
                let fillOpacity = 0.85;
                let stroke = '#cbd5e1';
                let strokeWidth = 0.45 / Math.sqrt(zoom);

                if (dNode && dNode.leads_uploaded > 0) {
                  if (metricMode === 'buyers') {
                    fill = dNode.buyers_count > 0 ? '#059669' : '#6366f1';
                    fillOpacity = dNode.buyers_count > 0 ? 0.9 : 0.65;
                  } else if (metricMode === 'registered') {
                    fill = dNode.verified_count > 0 ? '#10b981' : dNode.registered_count > 0 ? '#3b82f6' : '#6366f1';
                    fillOpacity = dNode.registered_count > 0 ? 0.85 : 0.55;
                  } else if (metricMode === 'impact') {
                    fill = dNode.post_campaign_conversions > 0 ? '#7c3aed' : (dNode.color_code || '#3b82f6');
                    fillOpacity = dNode.post_campaign_conversions > 0 ? 0.9 : 0.65;
                  } else {
                    fill = dNode.color_code || '#4f46e5';
                    fillOpacity = 0.85;
                  }
                  stroke = '#ffffff';
                }

                const isSelected =
                  (selectedDistrict && cleanToken(selectedDistrict) === dTok && (!selectedState || cleanToken(selectedState) === sTok)) ||
                  (selectedCluster && dNode?.cluster_name && cleanToken(selectedCluster) === cleanToken(dNode.cluster_name)) ||
                  (selectedState && !selectedDistrict && !selectedCluster && cleanToken(selectedState) === sTok);

                if (isSelected) {
                  stroke = '#0f172a';
                  strokeWidth = 1.4 / Math.sqrt(zoom);
                  fillOpacity = Math.max(fillOpacity, 0.92);
                }

                return (
                  <path
                    key={`${sName}-${dName}-${idx}`}
                    d={pathGenerator(f)}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className="cursor-pointer transition-opacity hover:opacity-95"
                    onMouseEnter={() => setHoverArea(buildPopupInfo(sName, dName))}
                    onMouseLeave={() => setHoverArea(null)}
                    onClick={() => {
                      const info = buildPopupInfo(sName, dName);
                      setClickedArea(info);
                      onSelectGeo({
                        state: info.state_stats ? info.state_stats.state_name : '',
                        cluster: info.cluster_name && !info.cluster_name.startsWith('Outside') ? info.cluster_name : '',
                        district: info.district_stats ? info.district_stats.district_name : ''
                      });
                    }}
                  />
                );
              })}

              {stateBoundaries.map((f, idx) => (
                <path
                  key={`sb-${idx}`}
                  d={pathGenerator(f)}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={0.9 / Math.sqrt(zoom)}
                  pointerEvents="none"
                />
              ))}
            </g>
          </svg>
        )}

        {/* Hover Tooltip */}
        {hoverArea && (
          <div
            style={{
              left: Math.min(tooltipPos.x, 300),
              top: Math.min(tooltipPos.y, 165)
            }}
            className="absolute z-20 pointer-events-none w-72 bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-[11px] space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
              <span className="font-black text-white truncate">
                {hoverArea.district_name}, {hoverArea.state_name}
              </span>
              <span className="text-[10px] text-emerald-300 font-bold">
                {hoverArea.clusters.length} Cluster(s)
              </span>
            </div>

            {hoverArea.district_stats ? (
              <div className="space-y-1 text-[10px]">
                <p className="text-amber-300 font-bold">
                  Cluster: {hoverArea.cluster_name} {hoverArea.cluster_code ? `(${hoverArea.cluster_code})` : ''}
                </p>
                <p>
                  District: <strong>{hoverArea.district_stats.leads_uploaded}</strong> Uploaded •{' '}
                  <strong>{hoverArea.district_stats.registered_count}</strong> Reg •{' '}
                  <strong>{hoverArea.district_stats.verified_count}</strong> Verified •{' '}
                  <strong>{hoverArea.district_stats.buyers_count}</strong> Buyers
                </p>
                <p className="text-violet-300">
                  Post-Campaign Conv: <strong>{hoverArea.district_stats.post_campaign_conversions}</strong> • Rev:{' '}
                  <strong>{formatInr(hoverArea.district_stats.revenue_inr)}</strong>
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-300">
                State Total: {hoverArea.state_stats?.leads_uploaded || 0} Leads Uploaded • {hoverArea.state_stats?.registered_count || 0} Reg • {hoverArea.state_stats?.buyers_count || 0} Buyers
              </p>
            )}
          </div>
        )}
      </div>

      {/* Clicked Area Details Popup: State -> Active Clusters -> Districts Inside Clusters + Segment Impact */}
      {clickedArea && (
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-t border-indigo-200 dark:border-indigo-800 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                {clickedArea.district_name}, {clickedArea.state_name}
              </h4>
              {clickedArea.state_stats ? (
                <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">
                  State: <strong>{clickedArea.state_stats.leads_uploaded}</strong> Uploaded •{' '}
                  <strong>{clickedArea.state_stats.registered_count}</strong> Reg ({clickedArea.state_stats.registration_rate_pct}%) •{' '}
                  <strong>{clickedArea.state_stats.verified_count}</strong> Ver •{' '}
                  <strong>{clickedArea.state_stats.buyers_count}</strong> Buyers •{' '}
                  <strong>{clickedArea.state_stats.post_campaign_conversions}</strong> Post-Campaign Conv •{' '}
                  <strong>{formatInr(clickedArea.state_stats.revenue_inr)}</strong>
                </p>
              ) : (
                <p className="text-[10px] text-slate-500">No uploaded segment leads or clusters recorded in this state yet.</p>
              )}
            </div>
            <button type="button" onClick={() => setClickedArea(null)} className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer">
              <FaTimes className="w-3 h-3" />
            </button>
          </div>

          {clickedArea.clusters.length > 0 && (
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {clickedArea.clusters.map((c) => (
                <div key={c.cluster_code || c.cluster_name} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectGeo({ state: clickedArea.state_name, cluster: c.cluster_name, district: '' })}
                      className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color_code || '#2563eb' }} />
                      <span>{c.cluster_name}</span>
                      <span className="font-mono text-slate-400">({c.cluster_code})</span>
                    </button>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {c.leads_uploaded}L • {c.registered_count}R • {c.buyers_count}B • {c.post_campaign_conversions} Imp
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(c.districts || []).map((d) => (
                      <button
                        key={d.district_name}
                        type="button"
                        onClick={() => onSelectGeo({ state: clickedArea.state_name, cluster: c.cluster_name, district: d.district_name })}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 cursor-pointer"
                      >
                        {d.district_name}: {d.leads_uploaded}L/{d.registered_count}R/{d.buyers_count}B
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {clickedArea.state_stats?.segments?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-indigo-200/70 dark:border-indigo-800/70 text-[10px]">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 mr-1">Segment Groups in {clickedArea.state_name}:</span>
              {clickedArea.state_stats.segments.map((sg) => (
                <span key={sg.segment_id} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 font-semibold">
                  {sg.segment_name}: {sg.leads_uploaded}L / {sg.registered_count}R / {sg.buyers_count}B ({sg.campaigns_count} camp)
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* State -> Cluster Breakdown List */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-700/70 space-y-2 max-h-60 overflow-y-auto">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Territory Impact by State & Cluster
        </p>
        {(mapTerritory?.states || []).length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">No matching territory data.</p>
        ) : (
          (mapTerritory?.states || []).map((st) => (
            <div
              key={st.state_name}
              onClick={() => onSelectGeo({ state: st.state_name, cluster: '', district: '' })}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-indigo-400 cursor-pointer flex items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{st.state_name}</p>
                <p className="text-[10px] text-slate-500">
                  {st.active_clusters_count} Cluster(s) • {st.campaigns_count} Campaign(s) • Post-Camp Impact: {st.post_campaign_conversions}
                </p>
              </div>
              <div className="text-right text-[10px] font-bold space-y-0.5">
                <p className="text-indigo-600 dark:text-indigo-300">
                  {st.leads_uploaded}L → {st.registered_count}R → {st.verified_count}V → {st.buyers_count}B
                </p>
                <p className="text-emerald-600">{formatInr(st.revenue_inr)} ({st.registration_rate_pct}% Reg)</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SegmentGroupAnalyticsPage({ embedded = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [expandedSegmentId, setExpandedSegmentId] = useState(null);

  // Filters
  const [segmentId, setSegmentId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [clusterFilter, setClusterFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSegmentAnalytics({
        segment_id: segmentId || undefined,
        purpose: purpose || undefined,
        state: stateFilter || undefined,
        cluster: clusterFilter || undefined,
        district: districtFilter || undefined,
        campaign_id: campaignId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      setAnalytics(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed loading Segment Group analytics');
    } finally {
      setLoading(false);
    }
  }, [segmentId, purpose, stateFilter, clusterFilter, districtFilter, campaignId, startDate, endDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary || {};
  const comparison = analytics?.campaign_impact_comparison || { with_campaigns: {}, without_campaigns: {} };
  const segments = analytics?.segments || [];
  const filterOptions = analytics?.filter_options || { segments: [], purposes: [], states: [], clusters: [], districts: [], campaigns: [] };

  const selectedStateObj = useMemo(
    () => (filterOptions.states || []).find((s) => s.name === stateFilter || String(s._id) === stateFilter) || null,
    [filterOptions.states, stateFilter]
  );

  const visibleClusters = useMemo(() => {
    const all = filterOptions.clusters || [];
    if (!stateFilter) return all;
    return all.filter((c) => c.state_name === stateFilter || (selectedStateObj && String(c.state_id) === String(selectedStateObj._id)));
  }, [filterOptions.clusters, stateFilter, selectedStateObj]);

  const visibleDistricts = useMemo(() => {
    const all = filterOptions.districts || [];
    if (!selectedStateObj) return all;
    return all.filter((d) => String(d.level_1) === String(selectedStateObj._id));
  }, [filterOptions.districts, selectedStateObj]);

  const hasFilters = Boolean(segmentId || purpose || stateFilter || clusterFilter || districtFilter || campaignId || startDate || endDate);

  const resetFilters = () => {
    setSegmentId('');
    setPurpose('');
    setStateFilter('');
    setClusterFilter('');
    setDistrictFilter('');
    setCampaignId('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 pb-8">
      {!embedded && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <FaChartLine className="w-3.5 h-3.5" />
              <span>Dynamic Segment Group & Campaign Impact Analytics</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Segment Group Analytics & Conversion Impact
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
              Real-time analytics across every Segment Group showing uploaded leads, platform registrations, GST/KYC verifications, kit orders, conversion ratios, and the direct lift after launching campaigns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/marketing-panel/segments')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FaLayerGroup /> Segment Groups
            </button>
            <button
              type="button"
              onClick={() => navigate('/marketing-panel/create-campaign')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FaPlus /> Launch Campaign
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Dynamic Filter Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <FaFilter className="text-indigo-600" /> Dynamic Segment & Territory Filters
          </span>
          <div className="flex items-center gap-2">
            {embedded && (
              <button
                type="button"
                onClick={loadAnalytics}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Sync Live Data
              </button>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[11px] font-bold cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2.5">
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Segments ({filterOptions.segments.length})</option>
            {filterOptions.segments.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Purposes</option>
            {(filterOptions.purposes || []).map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setClusterFilter('');
              setDistrictFilter('');
            }}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All States</option>
            {(filterOptions.states || []).map((st) => (
              <option key={st._id} value={st.name}>{st.name}</option>
            ))}
          </select>

          <select
            value={clusterFilter}
            onChange={(e) => {
              setClusterFilter(e.target.value);
              setDistrictFilter('');
            }}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Active Clusters</option>
            {visibleClusters.map((c) => (
              <option key={c._id} value={c.cluster_name}>{c.cluster_name} ({c.cluster_code})</option>
            ))}
          </select>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Districts</option>
            {visibleDistricts.map((d) => (
              <option key={d._id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          >
            <option value="">All Campaigns ({filterOptions.campaigns.length})</option>
            {filterOptions.campaigns.map((c) => (
              <option key={c._id} value={c._id}>{c.campaign_name}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold"
          />
        </div>
      </div>

      {/* Live Executive KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Leads Uploaded</span>
            <FaUsers className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {(summary.total_leads_uploaded || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary.total_active_cold_leads || 0} Cold / Unregistered
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Registered Users</span>
            <FaCheckCircle className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {(summary.total_registered || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-bold text-blue-600 mt-0.5">
            {summary.overall_registration_rate_pct || 0}% Registration Ratio
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Verified Accounts</span>
            <FaShieldAlt className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {(summary.total_verified || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
            {summary.overall_verification_rate_pct || 0}% GST/KYC Verified
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Platform Buyers</span>
            <FaShoppingCart className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {(summary.total_buyers || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-bold text-amber-600 mt-0.5">
            {summary.overall_buyer_conversion_rate_pct || 0}% Buyer Conversion
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
            <span>Orders & Revenue</span>
            <FaRupeeSign className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {formatInr(summary.total_revenue_inr)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {summary.total_orders || 0} Order(s) • {summary.total_kits_ordered || 0} Kits
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/40 to-white dark:from-violet-950/20 dark:to-slate-800">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-violet-600 dark:text-violet-300">
            <span>Campaign Impact</span>
            <FaBullhorn className="text-violet-600" />
          </div>
          <p className="text-2xl font-black text-violet-700 dark:text-violet-300 mt-1">
            {(summary.post_campaign_registered || 0) + (summary.post_campaign_buyers || 0)}
          </p>
          <p className="text-[11px] text-violet-700 dark:text-violet-300 font-semibold mt-0.5">
            Post-Camp: {summary.post_campaign_registered || 0} Reg • {summary.post_campaign_buyers || 0} Buy
          </p>
        </div>
      </div>

      {/* Campaign Formation Effect Comparison: Groups With Campaigns vs Without Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              Groups Included in Campaigns
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              {comparison.with_campaigns?.groups_count || 0} Groups
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {(comparison.with_campaigns?.leads_uploaded || 0).toLocaleString('en-IN')} Leads Uploaded •{' '}
            <strong>{formatInr(comparison.with_campaigns?.revenue_inr)}</strong> Revenue
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Reg Ratio</p>
              <p className="font-black text-blue-600">{comparison.with_campaigns?.registration_rate_pct || 0}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Verified</p>
              <p className="font-black text-emerald-600">{comparison.with_campaigns?.verification_rate_pct || 0}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Buyers</p>
              <p className="font-black text-amber-600">{comparison.with_campaigns?.buyer_conversion_rate_pct || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
              Groups Without Campaigns (No Campaign Yet)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
              {comparison.without_campaigns?.groups_count || 0} Groups
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {(comparison.without_campaigns?.leads_uploaded || 0).toLocaleString('en-IN')} Leads Uploaded •{' '}
            <strong>{formatInr(comparison.without_campaigns?.revenue_inr)}</strong> Revenue
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Reg Ratio</p>
              <p className="font-black text-slate-700 dark:text-slate-200">{comparison.without_campaigns?.registration_rate_pct || 0}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Verified</p>
              <p className="font-black text-slate-700 dark:text-slate-200">{comparison.without_campaigns?.verification_rate_pct || 0}%</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
              <p className="text-[10px] text-slate-400 font-bold">Buyers</p>
              <p className="font-black text-slate-700 dark:text-slate-200">{comparison.without_campaigns?.buyer_conversion_rate_pct || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-2">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <FaArrowUp /> Net Campaign Formation Lift (With vs Without)
          </span>
          <p className="text-[11px] text-slate-500">
            Measures how starting campaigns on a Segment Group improves registrations, verifications, and platform buying.
          </p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
            <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Reg Lift</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {comparison.registration_rate_lift_pct >= 0 ? '+' : ''}{comparison.registration_rate_lift_pct || 0}%
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Ver Lift</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {comparison.verification_rate_lift_pct >= 0 ? '+' : ''}{comparison.verification_rate_lift_pct || 0}%
              </p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Buyer Lift</p>
              <p className="font-black text-emerald-700 dark:text-emerald-300">
                {comparison.buyer_rate_lift_pct >= 0 ? '+' : ''}{comparison.buyer_rate_lift_pct || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Per-Segment Group Analytics Table (Left) + Live India Map (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT: Every Segment Group Detailed Analytics & Pre/Post Campaign Impact */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FaLayerGroup className="text-indigo-600" /> Every Segment Group Performance & Campaign Impact ({segments.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Uploaded Leads → Platform Registrations → GST/KYC Verified → Buyers & Pre/Post Campaign Conversion Effect
                </p>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-xs font-bold text-slate-400">
                Computing live Segment Group conversion & campaign impact...
              </div>
            ) : segments.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                No Segment Groups match the current filters.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {segments.map((seg) => {
                  const isExpanded = expandedSegmentId === seg._id;
                  const purposeCls = PURPOSE_COLORS[seg.purpose] || PURPOSE_COLORS.epc_signup_login;
                  return (
                    <div key={seg._id} className="p-4 space-y-3 hover:bg-slate-50/40 dark:hover:bg-slate-900/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">{seg.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${purposeCls}`}>
                              {seg.purpose_label}
                            </span>
                            {seg.has_campaigns ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                                {seg.campaigns_count} Campaign(s) Linked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500">
                                No Campaign Started
                              </span>
                            )}
                          </div>
                          {seg.description && <p className="text-[11px] text-slate-500 mt-0.5">{seg.description}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate('/marketing-panel/create-campaign')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <FaExternalLinkAlt className="w-2.5 h-2.5" /> Add to Campaign
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedSegmentId(isExpanded ? null : seg._id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            {isExpanded ? 'Hide Details' : 'Campaign & State Details'}
                          </button>
                        </div>
                      </div>

                      {/* Core Funnel Metrics Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 font-bold">Uploaded</p>
                          <p className="font-black text-slate-900 dark:text-white">{seg.leads_uploaded}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60">
                          <p className="text-[10px] text-blue-600 font-bold">Registered</p>
                          <p className="font-black text-blue-700 dark:text-blue-300">
                            {seg.registered_count} <span className="text-[10px] font-semibold">({seg.registration_rate_pct}%)</span>
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
                          <p className="text-[10px] text-emerald-600 font-bold">Verified</p>
                          <p className="font-black text-emerald-700 dark:text-emerald-300">
                            {seg.verified_count} <span className="text-[10px] font-semibold">({seg.verification_rate_pct}%)</span>
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60">
                          <p className="text-[10px] text-amber-700 font-bold">Buyers</p>
                          <p className="font-black text-amber-700 dark:text-amber-300">
                            {seg.buyers_count} <span className="text-[10px] font-semibold">({seg.buyer_conversion_rate_pct}%)</span>
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 font-bold">Orders / Kits</p>
                          <p className="font-black text-slate-900 dark:text-white">{seg.orders_count} / {seg.kits_ordered}</p>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">Revenue</p>
                          <p className="font-black text-emerald-700 dark:text-emerald-300">{formatInr(seg.revenue_inr)}</p>
                        </div>
                      </div>

                      {/* Pre-Campaign vs Post-Campaign Impact Bar */}
                      {seg.has_campaigns && (
                        <div className="p-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/25 border border-violet-200/70 dark:border-violet-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-bold text-slate-600 dark:text-slate-300">
                              Pre-Campaign: {seg.pre_campaign.registered} Reg • {seg.pre_campaign.buyers} Buy ({seg.pre_campaign.conversion_rate_pct}%)
                            </span>
                            <span className="font-bold text-violet-700 dark:text-violet-300">
                              Post-Campaign Impact: +{seg.post_campaign_impact.registered} Reg • +{seg.post_campaign_impact.verified} Ver • +{seg.post_campaign_impact.buyers} Buy ({formatInr(seg.post_campaign_impact.revenue_inr)})
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 font-black text-violet-700 dark:text-violet-300">
                            Post Conv: {seg.post_campaign_impact.conversion_rate_pct}% ({seg.post_campaign_impact.net_conversion_lift_pct >= 0 ? '+' : ''}{seg.post_campaign_impact.net_conversion_lift_pct}% vs pre)
                          </span>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-700/60">
                          {/* Linked Campaigns */}
                          {seg.campaigns?.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold uppercase text-slate-400">Included Campaigns & Telemetry</p>
                              <div className="grid grid-cols-1 gap-2">
                                {seg.campaigns.map((camp) => (
                                  <div key={camp._id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                    <div>
                                      <span className="font-bold text-slate-900 dark:text-white">{camp.campaign_name}</span>
                                      <span className="ml-2 text-[10px] font-mono text-slate-400">{camp.campaign_code} • {camp.campaign_type}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                                      <span className="text-slate-600 dark:text-slate-300">Reached: {camp.campaign_contacts_reached}</span>
                                      <span className="text-blue-600">Clicks/UTM Visits: {camp.link_clicks}/{camp.utm_visits}</span>
                                      <span className="text-indigo-600">Reg: {camp.campaign_registered}</span>
                                      <span className="text-emerald-600">Buyers: {camp.campaign_buyers} ({formatInr(camp.campaign_revenue_inr)})</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* State Breakdown inside Segment */}
                          {seg.state_breakdown?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              <span className="font-bold text-slate-400 uppercase mr-1">States:</span>
                              {seg.state_breakdown.map((sb) => (
                                <button
                                  key={sb.state}
                                  type="button"
                                  onClick={() => setStateFilter(sb.state === 'Unspecified' ? '' : sb.state)}
                                  className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold cursor-pointer"
                                >
                                  {sb.state}: {sb.leads_uploaded}L • {sb.registered_count}R • {sb.buyers_count}B
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live Segment Territory & Campaign Impact Map */}
        <div className="xl:col-span-5 xl:sticky xl:top-4">
          <SegmentAnalyticsMapPanel
            mapTerritory={analytics?.map_territory}
            selectedState={stateFilter}
            selectedCluster={clusterFilter}
            selectedDistrict={districtFilter}
            onSelectGeo={({ state, cluster, district }) => {
              setStateFilter(state || '');
              setClusterFilter(cluster || '');
              setDistrictFilter(district || '');
            }}
            onClearGeo={() => {
              setStateFilter('');
              setClusterFilter('');
              setDistrictFilter('');
            }}
          />
        </div>
      </div>
    </div>
  );
}
