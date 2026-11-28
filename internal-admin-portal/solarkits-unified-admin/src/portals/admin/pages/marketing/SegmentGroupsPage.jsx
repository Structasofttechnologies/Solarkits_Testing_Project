import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaFileUpload,
  FaUsers,
  FaEnvelope,
  FaPhoneAlt,
  FaCheckCircle,
  FaEdit,
  FaTrashAlt,
  FaEye,
  FaTimes,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaSlidersH,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaBoxes,
  FaMapMarkedAlt
} from 'react-icons/fa';
import { FiZoomIn, FiZoomOut, FiRefreshCw } from 'react-icons/fi';
import {
  fetchMarketingStates,
  fetchMarketingDistricts,
  fetchMarketingClusters,
  fetchMarketingKits,
  fetchSegments,
  fetchSegmentTerritorySummary,
  createSegment,
  updateSegment,
  deleteSegment,
  fetchSegmentContacts,
  uploadSegmentCsv,
  deleteSegmentContact,
  clearSegmentContacts,
  syncVerifiedEpcsWithSegments
} from './services/marketingDataService';
import DynamicBulkUploadModal from '../../components/bulk-upload/DynamicBulkUploadModal';
import { SEGMENT_LEAD_FIELD_OPTIONS, SEGMENT_LEAD_PRESETS } from '../../components/bulk-upload/bulkUploadSchemas';
import { parseSpreadsheetFile } from '../../components/bulk-upload/parseSpreadsheetFile';

const SEGMENT_PURPOSES = [
  { value: 'epc_signup_login', label: 'EPC Sign Up & Login' },
  { value: 'franchisee_signup_login', label: 'Franchisee Sign Up & Login' },
  { value: 'kit_sales', label: 'Kit Sales' }
];

const PURPOSE_BADGE_MAP = {
  epc_signup_login: { label: 'EPC Sign Up & Login', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' },
  franchisee_signup_login: { label: 'Franchisee Sign Up & Login', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
  kit_sales: { label: 'Kit Sales', cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' }
};

const FIELD_ROLES = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone / WhatsApp' },
  { value: 'state', label: 'State' },
  { value: 'district', label: 'District' },
  { value: 'cluster', label: 'Cluster' },
  { value: 'custom', label: 'Database Field (Custom)' }
];

const DEFAULT_STARTER_FIELDS = [
  { key: 'name', label: 'Name', role: 'name' },
  { key: 'email', label: 'Email', role: 'email' },
  { key: 'phone', label: 'Phone / WhatsApp', role: 'phone' },
  { key: 'state', label: 'State', role: 'state' },
  { key: 'district', label: 'District', role: 'district' }
];

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
  thedangs: 'dang',
  dangs: 'dang',
  dohad: 'dahod',
  panchmahals: 'panchmahal',
  bombay: 'mumbai',
  poonah: 'pune',
  poona: 'pune',
  aurangabad: 'chhatrapatisambhajinagar',
  osmanabad: 'dharashiv',
  ahilyanagar: 'ahmednagar',
  gondiya: 'gondia',
  belgaum: 'belagavi',
  bangalore: 'bengaluruurban',
  bengaluru: 'bengaluruurban',
  mysore: 'mysuru',
  gulbarga: 'kalaburagi',
  gurgaon: 'gurugram',
  mewat: 'nuh',
  allahabad: 'prayagraj',
  faizabad: 'ayodhya',
  trivandrum: 'thiruvananthapuram',
  lko: 'lucknow',
  chikhli: 'buldhana',
  kannad: 'chhatrapatisambhajinagar',
  mul: 'chandrapur'
};

const cleanGeoToken = (val) => {
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

const slugifyFieldKey = (text, idx = 0) => {
  const clean = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || `field_${idx + 1}`;
};

// Automatically maps CSV column header names to canonical database field keys & roles
const matchHeaderToDbField = (header, idx = 0) => {
  const slug = slugifyFieldKey(header, idx);
  const label = String(header || '').trim() || `Column ${idx + 1}`;

  if (/^(email|e_mail|email_id|email_address|mail|mail_id)$/.test(slug) || /email/.test(slug)) {
    return { key: 'email', label, role: 'email' };
  }
  if (/^(whatsapp|whatsapp_no|whatsapp_number)$/.test(slug)) {
    return { key: 'whatsapp_number', label, role: 'phone' };
  }
  if (/^(phone|phone_no|phone_number|mobile|mobile_no|mobile_number|contact_no|contact_number|tel)$/.test(slug) || /(phone|mobile|whatsapp)/.test(slug)) {
    return { key: slug.includes('whatsapp') ? 'whatsapp_number' : 'phone', label, role: 'phone' };
  }
  if (/^(name|full_name|contact_name|contact_person|person_name|lead_name|owner_name|customer_name)$/.test(slug)) {
    return { key: 'name', label, role: 'name' };
  }
  if (/^(state|state_name|province)$/.test(slug)) {
    return { key: 'state', label, role: 'state' };
  }
  if (/^(district|district_name|dist|city|taluka|town)$/.test(slug)) {
    return { key: 'district', label, role: 'district' };
  }
  if (/^(cluster|cluster_name|cluster_code|territory_cluster)$/.test(slug)) {
    return { key: 'cluster', label, role: 'cluster' };
  }
  if (/^(gst|gstin|gst_no|gst_number|gstin_number)$/.test(slug)) {
    return { key: 'gstin', label, role: 'custom' };
  }
  if (/^(company|company_name|business_name|firm|firm_name|organization|organisation)$/.test(slug)) {
    return { key: 'company_name', label, role: 'custom' };
  }
  if (/^(pin|pincode|pin_code|postal_code|zip|zipcode)$/.test(slug)) {
    return { key: 'pincode', label, role: 'custom' };
  }

  return { key: slug, label, role: 'custom' };
};

// Decodes UTF-16LE / UTF-16BE / UTF-8 ArrayBuffer (handles Meta Lead Ads UTF-16LE exports cleanly)
const decodeCsvArrayBuffer = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let encoding = 'utf-8';

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
  } else if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    encoding = 'utf-8';
  } else {
    const sampleLen = Math.min(bytes.length, 256);
    let evenNulls = 0;
    let oddNulls = 0;
    for (let i = 0; i < sampleLen; i++) {
      if (bytes[i] === 0) {
        if (i % 2 === 0) evenNulls += 1;
        else oddNulls += 1;
      }
    }
    if (oddNulls > 4 && evenNulls < oddNulls / 2) encoding = 'utf-16le';
    else if (evenNulls > 4 && oddNulls < evenNulls / 2) encoding = 'utf-16be';
  }

  const decoded = new TextDecoder(encoding).decode(bytes);
  return decoded.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
};

const detectCsvDelimiter = (text) => {
  let inQuotes = false;
  let firstLine = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (firstLine.trim()) break;
      continue;
    }
    firstLine += ch;
  }

  const counts = { '\t': 0, ',': 0, ';': 0, '|': 0 };
  inQuotes = false;
  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, ch)) {
      counts[ch] += 1;
    }
  }

  let bestDelimiter = ',';
  let maxCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }
  return bestDelimiter;
};

const parseCsvText = (rawText) => {
  const text = String(rawText || '').replace(/^\uFEFF/, '').replace(/\u0000/g, '');
  const delimiter = detectCsvDelimiter(text);
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(current.trim());
      current = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }

  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  if (rows.length < 2) {
    return { headers: rows[0] || [], records: [] };
  }

  const headers = rows[0].map((h, i) => h || `Column_${i + 1}`);
  const records = rows.slice(1).map((values) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] !== undefined ? values[idx] : '';
    });
    return obj;
  });

  return { headers, records };
};

const buildColumnMappingsForHeaders = (headers = [], existingDefs = []) => {
  const seenKeys = new Set();
  const fieldDefs = [];
  const colMap = {};

  headers.forEach((h, idx) => {
    const autoMatched = matchHeaderToDbField(h, idx);
    const matchingDef = existingDefs.find(
      (d) =>
        slugifyFieldKey(d.key) === autoMatched.key ||
        slugifyFieldKey(d.label) === slugifyFieldKey(h) ||
        (autoMatched.role !== 'custom' && d.role === autoMatched.role && d.key === autoMatched.key)
    );
    let finalKey = slugifyFieldKey(matchingDef?.key || autoMatched.key, idx);
    while (seenKeys.has(finalKey)) finalKey = `${finalKey}_${idx + 1}`;
    seenKeys.add(finalKey);

    const cfg = {
      key: finalKey,
      label: matchingDef?.label || autoMatched.label,
      role: matchingDef?.role || autoMatched.role
    };
    fieldDefs.push(cfg);
    colMap[h] = cfg;
  });

  return { colMap, fieldDefs };
};

// Re-keys CSV records by dot-free safe field keys so Express mongoSanitize never drops or mutates nested columns
const serializeCsvPayload = (records = [], columnMappings = {}) => {
  const safeColumnMapping = {};
  const headerToSafeKey = [];

  Object.entries(columnMappings).forEach(([header, cfg]) => {
    if (!cfg || cfg.skip || !cfg.key) return;
    const safeKey = slugifyFieldKey(cfg.key);
    safeColumnMapping[safeKey] = {
      key: safeKey,
      label: cfg.label || header,
      role: cfg.role || 'custom'
    };
    headerToSafeKey.push([header, safeKey]);
  });

  const safeRows = records.map((rec) => {
    const rowObj = {};
    for (const [header, safeKey] of headerToSafeKey) {
      rowObj[safeKey] = rec[header] !== undefined ? rec[header] : (rec[safeKey] ?? '');
    }
    return rowObj;
  });

  return { safeRows, safeColumnMapping };
};

/**
 * Interactive India Territory Map (right column) showing State -> Active Clusters -> Districts with unlimited live lead counts.
 */
function SegmentTerritoryMapPanel({
  territorySummary,
  selectedStateName,
  selectedClusterName,
  selectedDistrictName,
  onSelectTerritory,
  onClearMapFilter
}) {
  const [geoData, setGeoData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickedAreaPopup, setClickedAreaPopup] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [clusterFilterMode, setClusterFilterMode] = useState('all'); // 'all' | 'has_leads'
  const [expandedState, setExpandedState] = useState('');
  const containerRef = useRef(null);

  const width = 600;
  const height = 650;

  useEffect(() => {
    let mounted = true;
    fetch('/geojson/india_districts.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setGeoData(data);
          setMapLoading(false);
        }
      })
      .catch((err) => {
        console.error('Map GeoJSON load error:', err);
        if (mounted) setMapLoading(false);
      });
    return () => { mounted = false; };
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

  // Index State -> Cluster -> District data from live MongoDB territory summary
  const { districtLookup, stateLookup } = useMemo(() => {
    const dMap = new Map();
    const sMap = new Map();

    for (const st of territorySummary?.states || []) {
      const stTok = cleanGeoToken(st.state_name);
      sMap.set(stTok, st);

      for (const clu of st.clusters || []) {
        for (const dist of clu.districts || []) {
          const dTok = cleanGeoToken(dist.district_name);
          if (!dTok) continue;
          dMap.set(`${stTok}::${dTok}`, {
            state_name: st.state_name,
            state_id: st.state_id,
            state_leads: st.segment_leads_count,
            state_epcs: st.epcs_count,
            state_clusters: st.clusters || [],
            cluster_id: clu.cluster_id,
            cluster_name: clu.cluster_name,
            cluster_code: clu.cluster_code,
            color_code: clu.color_code || '#2563eb',
            cluster_leads: clu.leads_count,
            cluster_epcs: clu.epcs_count,
            cluster_total: clu.total_count,
            cluster_districts: clu.districts || [],
            district_name: dist.district_name,
            district_leads: dist.leads_count,
            district_epcs: dist.epcs_count,
            district_total: dist.total_count,
            is_clustered: true
          });
        }
      }

      for (const uDist of st.unclustered_districts || []) {
        const dTok = cleanGeoToken(uDist.district_name);
        if (!dTok || dMap.has(`${stTok}::${dTok}`)) continue;
        dMap.set(`${stTok}::${dTok}`, {
          state_name: st.state_name,
          state_id: st.state_id,
          state_leads: st.segment_leads_count,
          state_epcs: st.epcs_count,
          state_clusters: st.clusters || [],
          cluster_id: null,
          cluster_name: 'Unassigned Cluster',
          cluster_code: '',
          color_code: '#f59e0b',
          cluster_leads: st.unclustered_leads,
          cluster_epcs: 0,
          cluster_total: st.unclustered_leads,
          cluster_districts: st.unclustered_districts || [],
          district_name: uDist.district_name,
          district_leads: uDist.leads_count,
          district_epcs: uDist.epcs_count,
          district_total: uDist.total_count,
          is_clustered: false
        });
      }
    }

    return { districtLookup: dMap, stateLookup: sMap };
  }, [territorySummary]);

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 });
    }
  };

  const totals = territorySummary?.totals || {
    states_with_leads: 0,
    total_clusters: 0,
    total_segment_leads: 0,
    total_epcs_in_clusters: 0
  };

  const filteredStatesForExplorer = useMemo(() => {
    const list = territorySummary?.states || [];
    if (clusterFilterMode === 'all') return list;
    return list
      .map((st) => ({
        ...st,
        clusters: (st.clusters || []).filter((c) => c.leads_count > 0 || c.epcs_count > 0)
      }))
      .filter((st) => st.clusters.length > 0 || st.unclustered_leads > 0 || st.segment_leads_count > 0);
  }, [territorySummary, clusterFilterMode]);

  const buildAreaPayload = (sName, dName, match, stateNode) => ({
    state_name: match?.state_name || stateNode?.state_name || sName,
    state_id: match?.state_id || stateNode?.state_id || '',
    state_leads: match?.state_leads ?? stateNode?.segment_leads_count ?? 0,
    state_epcs: match?.state_epcs ?? stateNode?.epcs_count ?? 0,
    state_clusters: match?.state_clusters || stateNode?.clusters || [],
    unclustered_districts: stateNode?.unclustered_districts || [],
    district_name: match?.district_name || dName,
    district_leads: match?.district_leads || 0,
    district_epcs: match?.district_epcs || 0,
    district_total: match?.district_total || 0,
    cluster_id: match?.cluster_id || null,
    cluster_name: match?.cluster_name || 'No Cluster Mapped',
    cluster_code: match?.cluster_code || '',
    cluster_leads: match?.cluster_leads || 0,
    cluster_epcs: match?.cluster_epcs || 0,
    cluster_districts: match?.cluster_districts || [],
    is_clustered: Boolean(match?.is_clustered)
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
      {/* Map Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FaMapMarkedAlt className="text-indigo-600" /> State, Cluster & District Lead Map
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Click or hover any region to inspect State, Active Clusters & Districts (unlimited leads)
          </p>
        </div>

        {(selectedStateName || selectedClusterName || selectedDistrictName) && (
          <button
            type="button"
            onClick={() => {
              setClickedAreaPopup(null);
              onClearMapFilter();
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
          >
            Clear Map Filter
          </button>
        )}
      </div>

      {/* Live Territory Mini Stats (Strictly Uploaded Segment Leads — zero legacy EPC leakage) */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/70 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-400 uppercase">States w/ Leads</p>
          <p className="text-sm font-black text-slate-900 dark:text-white">{totals.states_with_leads || 0}</p>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Clusters w/ Leads</p>
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {totals.active_clusters ?? 0} / {totals.total_clusters ?? 0}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Uploaded Leads</p>
          <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
            {(totals.total_segment_leads || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Interactive SVG Map */}
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
          setHoverInfo(null);
        }}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.15 : 0.87;
          setZoom((prev) => Math.min(Math.max(prev * factor, 0.7), 8));
        }}
      >
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 bg-white/95 dark:bg-slate-800/95 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => setZoom((p) => Math.min(p * 1.3, 8))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
            title="Zoom In"
          >
            <FiZoomIn />
          </button>
          <button
            type="button"
            onClick={() => setZoom((p) => Math.max(p / 1.3, 0.7))}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
            title="Zoom Out"
          >
            <FiZoomOut />
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs cursor-pointer"
            title="Reset View"
          >
            <FiRefreshCw />
          </button>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/95 dark:bg-slate-800/95 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] space-y-1 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">Cluster District (Has Uploaded Leads)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">Uploaded Leads Outside Cluster</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300 inline-block" />
            <span className="font-semibold text-slate-500 dark:text-slate-400">0 Uploaded Leads (Neutral)</span>
          </div>
        </div>

        {mapLoading || !pathGenerator ? (
          <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
            Loading India Map...
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {districtFeatures.map((f, idx) => {
                const sName = f.properties?.st_nm || '';
                const dName = f.properties?.district || '';
                const stTok = cleanGeoToken(sName);
                const dTok = cleanGeoToken(dName);
                const match = districtLookup.get(`${stTok}::${dTok}`);
                const stateNode = stateLookup.get(stTok);

                const isSelectedDist =
                  selectedDistrictName &&
                  cleanGeoToken(selectedDistrictName) === dTok &&
                  (!selectedStateName || cleanGeoToken(selectedStateName) === stTok);
                const isSelectedCluster =
                  selectedClusterName &&
                  match?.cluster_name &&
                  cleanGeoToken(selectedClusterName) === cleanGeoToken(match.cluster_name);
                const isSelectedState =
                  selectedStateName && cleanGeoToken(selectedStateName) === stTok;

                let fill = '#f1f5f9';
                let fillOpacity = 0.85;
                let stroke = '#cbd5e1';
                let strokeWidth = 0.45 / Math.sqrt(zoom);

                if (match && match.district_leads > 0) {
                  fill = match.color_code || '#2563eb';
                  fillOpacity = 0.86;
                  stroke = '#ffffff';
                }

                if (isSelectedDist || isSelectedCluster || (!selectedClusterName && !selectedDistrictName && isSelectedState)) {
                  stroke = '#0f172a';
                  strokeWidth = 1.4 / Math.sqrt(zoom);
                  fillOpacity = Math.max(fillOpacity, 0.9);
                }

                return (
                  <path
                    key={`${sName}-${dName}-${idx}`}
                    d={pathGenerator(f)}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    className="transition-opacity cursor-pointer hover:opacity-95"
                    onMouseEnter={() => {
                      setHoverInfo(buildAreaPayload(sName, dName, match, stateNode));
                    }}
                    onMouseLeave={() => setHoverInfo(null)}
                    onClick={() => {
                      const payload = buildAreaPayload(sName, dName, match, stateNode);
                      setClickedAreaPopup(payload);
                      onSelectTerritory({
                        stateId: payload.state_id || '',
                        stateName: payload.state_name || sName,
                        clusterName: payload.is_clustered ? payload.cluster_name : '',
                        districtName: match ? payload.district_name : ''
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

        {/* Cursor Hover Tooltip (State, Active Clusters & Districts — Segment Leads only) */}
        {hoverInfo && (
          <div
            style={{
              left: Math.min(tooltipPos.x, 300),
              top: Math.min(tooltipPos.y, 175)
            }}
            className="absolute z-20 pointer-events-none w-72 bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-[11px] space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-white truncate">{hoverInfo.state_name}</span>
              <span className="text-[10px] text-slate-300">
                {hoverInfo.state_leads} Segment Leads{hoverInfo.state_epcs > 0 ? ` • ${hoverInfo.state_epcs} Converted EPCs` : ''}
              </span>
            </div>
            <div className="text-indigo-300 font-bold">
              {hoverInfo.district_name}: {hoverInfo.district_leads} Uploaded Leads
              {hoverInfo.district_epcs > 0 ? ` • ${hoverInfo.district_epcs} Converted` : ''}
            </div>
            <div className="pt-1 border-t border-slate-700 space-y-1">
              <p className="font-bold text-amber-300">
                {hoverInfo.cluster_name} {hoverInfo.cluster_code ? `(${hoverInfo.cluster_code})` : ''}
              </p>
              {hoverInfo.cluster_districts?.length > 0 && (
                <p className="text-[10px] text-slate-200 leading-snug">
                  Cluster Districts: {hoverInfo.cluster_districts.map((d) => `${d.district_name} (${d.leads_count}L)`).join(', ')}
                </p>
              )}
              {hoverInfo.state_clusters?.length > 0 && (
                <p className="text-[10px] text-emerald-300 leading-snug">
                  Active Clusters in {hoverInfo.state_name}: {hoverInfo.state_clusters.length} ({hoverInfo.state_clusters.map((c) => c.cluster_name).slice(0, 3).join(', ')}{hoverInfo.state_clusters.length > 3 ? ` +${hoverInfo.state_clusters.length - 3}` : ''})
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clicked Area Details Popup Panel (State + Active Clusters + Districts Inside Clusters) */}
      {clickedAreaPopup && (
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-t border-indigo-200 dark:border-indigo-800 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                Selected Area Breakdown
              </p>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                {clickedAreaPopup.district_name ? `${clickedAreaPopup.district_name}, ` : ''}
                {clickedAreaPopup.state_name}
              </h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-300">
                State Total: <strong>{clickedAreaPopup.state_leads}</strong> Uploaded Leads •{' '}
                {clickedAreaPopup.state_epcs > 0 && (
                  <><strong>{clickedAreaPopup.state_epcs}</strong> Converted EPCs •{' '}</>
                )}
                <strong>{clickedAreaPopup.state_clusters?.length || 0}</strong> Active Cluster(s)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setClickedAreaPopup(null)}
              className="p-1 rounded-md text-slate-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              title="Close Popup"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          </div>

          {clickedAreaPopup.state_clusters?.length > 0 ? (
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {[...(clickedAreaPopup.state_clusters || [])]
                .sort((a, b) => {
                  const aHit = cleanGeoToken(clickedAreaPopup.cluster_name) === cleanGeoToken(a.cluster_name) ? 1 : 0;
                  const bHit = cleanGeoToken(clickedAreaPopup.cluster_name) === cleanGeoToken(b.cluster_name) ? 1 : 0;
                  return bHit - aHit || (b.leads_count || 0) - (a.leads_count || 0);
                })
                .map((clu) => (
                <div
                  key={clu.cluster_code || clu.cluster_name}
                  className={`p-2 rounded-lg bg-white dark:bg-slate-800 border text-[10px] ${
                    cleanGeoToken(clickedAreaPopup.cluster_name) === cleanGeoToken(clu.cluster_name)
                      ? 'border-indigo-500 ring-1 ring-indigo-300'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectTerritory({
                          stateId: clickedAreaPopup.state_id || '',
                          stateName: clickedAreaPopup.state_name,
                          clusterName: clu.cluster_name,
                          districtName: ''
                        })
                      }
                      className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clu.color_code || '#2563eb' }} />
                      <span>{clu.cluster_name}</span>
                      <span className="text-slate-400 font-mono">({clu.cluster_code})</span>
                    </button>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {clu.leads_count} Leads{clu.epcs_count > 0 ? ` • ${clu.epcs_count} Converted` : ''}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(clu.districts || []).map((d) => (
                      <button
                        key={d.district_name}
                        type="button"
                        onClick={() =>
                          onSelectTerritory({
                            stateId: clickedAreaPopup.state_id || '',
                            stateName: clickedAreaPopup.state_name,
                            clusterName: clu.cluster_name,
                            districtName: d.district_name
                          })
                        }
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 cursor-pointer"
                      >
                        {d.district_name} ({d.leads_count}L{d.epcs_count > 0 ? `/${d.epcs_count}C` : ''})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">No active Franchisee Clusters configured in this state yet.</p>
          )}
        </div>
      )}

      {/* State -> Cluster -> District Explorer (Unlimited Segment Leads) */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-700/70 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Clusters & District Lead Breakdown
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-[10px] font-bold">
            {[
              { id: 'all', label: 'All Clusters' },
              { id: 'has_leads', label: 'Has Leads' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setClusterFilterMode(tab.id)}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  clusterFilterMode === tab.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {filteredStatesForExplorer.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              No Franchisee Clusters or state leads match this view yet.
            </p>
          ) : (
            filteredStatesForExplorer.map((st) => {
              const isExpanded = expandedState === st.state_name || cleanGeoToken(selectedStateName) === cleanGeoToken(st.state_name);
              return (
                <div
                  key={st.state_name}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedState(isExpanded ? '' : st.state_name);
                      onSelectTerritory({
                        stateId: st.state_id || '',
                        stateName: st.state_name,
                        clusterName: '',
                        districtName: ''
                      });
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-100/70 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">{st.state_name}</span>
                      <span className="ml-2 text-[10px] font-semibold text-slate-500">
                        {st.clusters.length} Cluster(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                        {st.segment_leads_count} Leads
                      </span>
                      {st.epcs_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                          {st.epcs_count} Converted EPCs
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-200/70 dark:border-slate-700/70">
                      {st.clusters.map((clu) => (
                        <div
                          key={clu.cluster_id}
                          className={`p-2.5 rounded-xl bg-white dark:bg-slate-800 border transition-colors ${
                            cleanGeoToken(selectedClusterName) === cleanGeoToken(clu.cluster_name)
                              ? 'border-indigo-500'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onSelectTerritory({
                                  stateId: st.state_id || '',
                                  stateName: st.state_name,
                                  clusterName: clu.cluster_name,
                                  districtName: ''
                                })
                              }
                              className="text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: clu.color_code }}
                              />
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {clu.cluster_name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">({clu.cluster_code})</span>
                            </button>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {clu.leads_count} Leads{clu.epcs_count > 0 ? ` • ${clu.epcs_count} Converted` : ''}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {clu.districts.map((dist) => (
                              <button
                                key={dist.district_name}
                                type="button"
                                onClick={() =>
                                  onSelectTerritory({
                                    stateId: st.state_id || '',
                                    stateName: st.state_name,
                                    clusterName: clu.cluster_name,
                                    districtName: dist.district_name
                                  })
                                }
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer ${
                                  cleanGeoToken(selectedDistrictName) === cleanGeoToken(dist.district_name)
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : dist.leads_count > 0
                                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {dist.district_name}: {dist.leads_count}L{dist.epcs_count > 0 ? ` • ${dist.epcs_count}C` : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      {st.unclustered_districts?.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[10px]">
                          <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">
                            Outside Franchisee Clusters ({st.unclustered_leads} Leads):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {st.unclustered_districts.map((ud) => (
                              <button
                                key={ud.district_name}
                                type="button"
                                onClick={() =>
                                  onSelectTerritory({
                                    stateId: st.state_id || '',
                                    stateName: st.state_name,
                                    clusterName: '',
                                    districtName: ud.district_name
                                  })
                                }
                                className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer"
                              >
                                {ud.district_name}: {ud.leads_count}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function SegmentGroupsPage() {
  const [segments, setSegments] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [clustersList, setClustersList] = useState([]);
  const [districtsList, setDistrictsList] = useState([]);
  const [configuredKits, setConfiguredKits] = useState([]);
  const [territorySummary, setTerritorySummary] = useState({ totals: {}, states: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [clearingContacts, setClearingContacts] = useState(false);
  const [duplicateModalData, setDuplicateModalData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Live filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedStateName, setSelectedStateName] = useState('');
  const [selectedClusterName, setSelectedClusterName] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('');

  // Create / Edit Segment Modal (No Segment Type; includes auto CSV header detection + Kit Sales)
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [segForm, setSegForm] = useState({
    name: '',
    purpose: 'epc_signup_login',
    selected_kits: [],
    description: '',
    field_definitions: [...DEFAULT_STARTER_FIELDS]
  });
  const [modalCsvFileName, setModalCsvFileName] = useState('');
  const [modalCsvRows, setModalCsvRows] = useState([]);
  const [modalColumnMappings, setModalColumnMappings] = useState({});
  const [savingSegment, setSavingSegment] = useState(false);

  // Standalone BDE-Style Dynamic Bulk Upload Modal state
  const [uploadTargetSegment, setUploadTargetSegment] = useState(null);

  // Contacts Drawer / Modal
  const [contactsModalSegment, setContactsModalSegment] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPagination, setContactsPagination] = useState({ total: 0, page: 1, limit: 25, total_pages: 1 });
  const [contactSearch, setContactSearch] = useState('');
  const [contactStateId, setContactStateId] = useState('');
  const [contactStateName, setContactStateName] = useState('');
  const [contactClusterName, setContactClusterName] = useState('');
  const [contactDistrictName, setContactDistrictName] = useState('');
  const [contactClusters, setContactClusters] = useState([]);
  const [contactDistricts, setContactDistricts] = useState([]);

  // Load GeoLevel1 states & live Admin Panel Kit Configurations once on mount
  useEffect(() => {
    Promise.all([
      fetchMarketingStates().catch(() => []),
      fetchMarketingKits().catch(() => [])
    ]).then(([stList, kits]) => {
      setStatesList(stList);
      setConfiguredKits(kits);
    });
  }, []);

  // Load cascading live Franchisee Clusters & GeoLevel2 Districts when main State changes
  useEffect(() => {
    if (!selectedStateId && !selectedStateName) {
      setClustersList([]);
      setDistrictsList([]);
      setSelectedClusterName('');
      setSelectedDistrictName('');
      return;
    }
    Promise.all([
      fetchMarketingClusters({ stateId: selectedStateId, stateName: selectedStateName }).catch(() => []),
      fetchMarketingDistricts({ stateId: selectedStateId, stateName: selectedStateName }).catch(() => [])
    ]).then(([cList, dList]) => {
      setClustersList(cList);
      setDistrictsList(dList);
    });
  }, [selectedStateId, selectedStateName]);

  // View Leads Modal cascading Clusters & Districts
  useEffect(() => {
    if (!contactStateId && !contactStateName) {
      setContactClusters([]);
      setContactDistricts([]);
      setContactClusterName('');
      setContactDistrictName('');
      return;
    }
    Promise.all([
      fetchMarketingClusters({ stateId: contactStateId, stateName: contactStateName }).catch(() => []),
      fetchMarketingDistricts({ stateId: contactStateId, stateName: contactStateName }).catch(() => [])
    ]).then(([cList, dList]) => {
      setContactClusters(cList);
      setContactDistricts(dList);
    });
  }, [contactStateId, contactStateName]);

  const loadSegmentsAndSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [{ segments: list }, summaryRes] = await Promise.all([
        fetchSegments({
          search: searchQuery.trim() || undefined,
          purpose: selectedPurpose !== 'all' ? selectedPurpose : undefined,
          state: selectedStateName || undefined,
          cluster: selectedClusterName || undefined,
          district: selectedDistrictName || undefined
        }),
        fetchSegmentTerritorySummary({
          purpose: selectedPurpose !== 'all' ? selectedPurpose : undefined
        })
      ]);
      setSegments(list);
      if (summaryRes?.states) {
        setTerritorySummary(summaryRes);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to load segment groups.' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedPurpose, selectedStateName, selectedClusterName, selectedDistrictName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSegmentsAndSummary();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadSegmentsAndSummary]);

  const loadContacts = useCallback(async (segId, page = 1) => {
    if (!segId) return;
    setContactsLoading(true);
    try {
      const res = await fetchSegmentContacts(segId, {
        search: contactSearch.trim() || undefined,
        state: contactStateName || undefined,
        cluster: contactClusterName || undefined,
        district: contactDistrictName || undefined,
        page,
        limit: 25
      });
      setContacts(res?.data || []);
      setContactsPagination(res?.pagination || { total: 0, page: 1, limit: 25, total_pages: 1 });
      if (res?.segment) setContactsModalSegment(res.segment);
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to load segment contacts.' });
    } finally {
      setContactsLoading(false);
    }
  }, [contactSearch, contactStateName, contactClusterName, contactDistrictName]);

  useEffect(() => {
    if (contactsModalSegment?._id) {
      loadContacts(contactsModalSegment._id, 1);
    }
  }, [contactsModalSegment?._id, contactSearch, contactStateName, contactClusterName, contactDistrictName, loadContacts]);

  const handleSyncVerifiedEpcs = async () => {
    setSyncing(true);
    try {
      const res = await syncVerifiedEpcsWithSegments();
      setFeedback({
        type: 'success',
        text: `Synced with Verified EPCs: ${res?.reconciled || 0} lead(s) promoted and removed across ${res?.affected_segments || 0} segment(s).`
      });
      await loadSegmentsAndSummary();
      if (contactsModalSegment?._id) await loadContacts(contactsModalSegment._id, 1);
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Sync with Verified EPCs failed.' });
    } finally {
      setSyncing(false);
    }
  };

  const openCreateModal = () => {
    setEditingSegment(null);
    setKitSearchQuery('');
    setModalCsvFileName('');
    setModalCsvRows([]);
    setModalColumnMappings({});
    setSegForm({
      name: '',
      purpose: 'epc_signup_login',
      selected_kits: [],
      description: '',
      field_definitions: DEFAULT_STARTER_FIELDS.map((f) => ({ ...f }))
    });
    setShowSegmentModal(true);
  };

  const openEditModal = (seg) => {
    setEditingSegment(seg);
    setKitSearchQuery('');
    setModalCsvFileName('');
    setModalCsvRows([]);
    setModalColumnMappings({});
    setSegForm({
      name: seg.name || '',
      purpose: seg.purpose || 'epc_signup_login',
      selected_kits: Array.isArray(seg.selected_kits) ? seg.selected_kits : [],
      description: seg.description || '',
      field_definitions: Array.isArray(seg.field_definitions) && seg.field_definitions.length > 0
        ? seg.field_definitions.map((f) => ({ ...f }))
        : DEFAULT_STARTER_FIELDS.map((f) => ({ ...f }))
    });
    setShowSegmentModal(true);
  };

  // Auto-detect headers inside Create/Edit modal (supports .xlsx & UTF-16/UTF-8 CSV/TSV)
  const handleModalCsvSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalCsvFileName(file.name);

    try {
      const { headers, records } = await parseSpreadsheetFile(file);
      const { colMap, fieldDefs } = buildColumnMappingsForHeaders(headers, []);

      setModalCsvRows(records);
      setModalColumnMappings(colMap);
      if (fieldDefs.length > 0) {
        setSegForm((prev) => ({ ...prev, field_definitions: fieldDefs }));
      }
    } catch (err) {
      setFeedback({ type: 'error', text: `Failed parsing file: ${err.message}` });
    }
  };

  const handleToggleKitSelection = (kitObj) => {
    setSegForm((prev) => {
      const exists = prev.selected_kits.some((k) => String(k.kit_id) === String(kitObj.kit_id));
      const next = exists
        ? prev.selected_kits.filter((k) => String(k.kit_id) !== String(kitObj.kit_id))
        : [...prev.selected_kits, kitObj];
      return { ...prev, selected_kits: next };
    });
  };

  const handleFieldLabelChange = (idx, newLabel) => {
    setSegForm((prev) => {
      const nextFields = [...prev.field_definitions];
      const matched = matchHeaderToDbField(newLabel, idx);
      nextFields[idx] = {
        ...nextFields[idx],
        label: newLabel,
        key: matched.key,
        role: matched.role
      };
      return { ...prev, field_definitions: nextFields };
    });
  };

  const handleFieldRoleChange = (idx, role) => {
    setSegForm((prev) => {
      const nextFields = [...prev.field_definitions];
      nextFields[idx] = { ...nextFields[idx], role };
      return { ...prev, field_definitions: nextFields };
    });
  };

  const handleAddDynamicField = () => {
    setSegForm((prev) => ({
      ...prev,
      field_definitions: [
        ...prev.field_definitions,
        { key: `field_${prev.field_definitions.length + 1}`, label: '', role: 'custom' }
      ]
    }));
  };

  const handleRemoveDynamicField = (idx) => {
    setSegForm((prev) => ({
      ...prev,
      field_definitions: prev.field_definitions.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveSegment = async (e) => {
    e.preventDefault();
    if (!segForm.name.trim()) {
      setFeedback({ type: 'error', text: 'Segment name is required.' });
      return;
    }
    if (segForm.purpose === 'kit_sales' && segForm.selected_kits.length === 0) {
      setFeedback({ type: 'error', text: 'Please select at least one Kit for a Kit Sales segment group.' });
      return;
    }

    setSavingSegment(true);
    try {
      const cleanFields = segForm.field_definitions
        .filter((f) => f.label && f.label.trim())
        .map((f, idx) => ({
          key: slugifyFieldKey(f.key || f.label, idx),
          label: f.label.trim(),
          role: f.role || 'custom'
        }));

      const payload = {
        name: segForm.name.trim(),
        purpose: segForm.purpose,
        selected_kits: segForm.purpose === 'kit_sales' ? segForm.selected_kits : [],
        description: segForm.description.trim(),
        field_definitions: cleanFields
      };

      let savedSeg;
      if (editingSegment?._id) {
        savedSeg = await updateSegment(editingSegment._id, payload);
      } else {
        savedSeg = await createSegment(payload);
      }

      let uploadNotice = '';
      if (modalCsvRows.length > 0 && savedSeg?._id) {
        const { safeRows, safeColumnMapping } = serializeCsvPayload(modalCsvRows, modalColumnMappings);
        const importRes = await uploadSegmentCsv(savedSeg._id, {
          rows: safeRows,
          column_mapping: safeColumnMapping,
          field_definitions: cleanFields,
          source_file_name: modalCsvFileName
        });
        const skippedTotal = Number(importRes?.duplicates_skipped || 0) + Number(importRes?.skipped_verified_epcs || 0);
        uploadNotice = ` Imported ${importRes?.imported || 0} leads across States & Clusters (Skipped existing/duplicate: ${skippedTotal}).`;
        if ((importRes?.skipped_details?.length > 0) || skippedTotal > 0) {
          setDuplicateModalData({
            segmentName: payload.name,
            ...importRes
          });
        }
      }

      setFeedback({
        type: 'success',
        text: `${editingSegment ? 'Updated' : 'Created'} segment "${payload.name}".${uploadNotice}`
      });
      setShowSegmentModal(false);
      await loadSegmentsAndSummary();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed saving segment group.' });
    } finally {
      setSavingSegment(false);
    }
  };

  const handleDeleteSegment = async (seg) => {
    if (!window.confirm(`Delete segment group "${seg.name}" and its contacts?`)) return;
    try {
      await deleteSegment(seg._id);
      setFeedback({ type: 'success', text: `Deleted segment "${seg.name}".` });
      await loadSegmentsAndSummary();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed deleting segment group.' });
    }
  };

  const openCsvModal = (seg) => {
    setUploadTargetSegment(seg);
  };

  const dynamicSegmentFieldOptions = useMemo(() => {
    const existingKeys = new Set(SEGMENT_LEAD_FIELD_OPTIONS.map((f) => f.key));
    const extras = (uploadTargetSegment?.field_definitions || [])
      .filter((d) => d?.key && !existingKeys.has(slugifyFieldKey(d.key)) && d.role === 'custom')
      .map((d, idx) => ({
        key: slugifyFieldKey(d.key, idx),
        label: d.label || d.key,
        description: 'Custom segment group field',
        required: false,
        category: 'Segment Field',
        aliases: [d.key, d.label].filter(Boolean),
      }));
    return [...SEGMENT_LEAD_FIELD_OPTIONS, ...extras];
  }, [uploadTargetSegment]);

  const handleSegmentBulkImport = async (validRows, { fileName, headerMappings, activeFields = [], requiredFields = null, batchDefaults }) => {
    if (!uploadTargetSegment?._id || validRows.length === 0) return null;

    const activeLabelByKey = new Map(
      (activeFields || []).map((f) => [slugifyFieldKey(f.key), f.label || f.key])
    );

    const mergedDefsMap = new Map();
    (uploadTargetSegment.field_definitions || []).forEach((d) => {
      const k = slugifyFieldKey(d.key || d.label);
      mergedDefsMap.set(k, { ...d, key: k });
    });

    const roleByKey = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      whatsapp_number: 'phone',
      state: 'state',
      district: 'district',
      cluster: 'cluster',
    };

    const safeColumnMapping = {};
    headerMappings.forEach((m) => {
      if (!m || m.skip) return;
      const safeKey = slugifyFieldKey(m.targetKey || m.rawHeader);
      const role = roleByKey[safeKey] || 'custom';
      safeColumnMapping[safeKey] = {
        key: safeKey,
        label: m.targetLabel || m.rawHeader,
        role,
      };
      if (!mergedDefsMap.has(safeKey)) {
        mergedDefsMap.set(safeKey, {
          key: safeKey,
          label: m.targetLabel || m.rawHeader,
          role,
        });
      }
    });

    // Also include batch-filled standard fields if not explicitly present in file headers
    SEGMENT_LEAD_FIELD_OPTIONS.forEach((f) => {
      const safeKey = slugifyFieldKey(f.key);
      if (!safeColumnMapping[safeKey]) {
        safeColumnMapping[safeKey] = {
          key: safeKey,
          label: f.label,
          role: roleByKey[safeKey] || 'custom',
        };
      }
    });

    const safeRows = validRows.map((row) => {
      const obj = {};
      SEGMENT_LEAD_FIELD_OPTIONS.forEach((f) => {
        const k = slugifyFieldKey(f.key);
        if (row[f.key] !== undefined && String(row[f.key]).trim() !== '') {
          obj[k] = row[f.key];
        }
      });
      Object.entries(row._customFields || {}).forEach(([ck, cv]) => {
        const safeCk = slugifyFieldKey(ck);
        if (cv !== undefined && String(cv).trim() !== '') {
          obj[safeCk] = cv;
          const displayLabel = activeLabelByKey.get(safeCk) || ck;
          if (!safeColumnMapping[safeCk]) {
            safeColumnMapping[safeCk] = { key: safeCk, label: displayLabel, role: 'custom' };
          }
          if (!mergedDefsMap.has(safeCk)) {
            mergedDefsMap.set(safeCk, { key: safeCk, label: displayLabel, role: 'custom' });
          }
        }
      });
      return obj;
    });

    const res = await uploadSegmentCsv(uploadTargetSegment._id, {
      rows: safeRows,
      column_mapping: safeColumnMapping,
      field_definitions: Array.from(mergedDefsMap.values()),
      default_state: batchDefaults?.default_state || '',
      default_district: batchDefaults?.default_district || '',
      default_cluster: batchDefaults?.default_cluster || '',
      required_fields: requiredFields,
      source_file_name: fileName || 'bulk_upload.csv',
    });

    await loadSegmentsAndSummary();

    const skippedTotal = Number(res?.duplicates_skipped || 0) + Number(res?.skipped_verified_epcs || 0);
    const msg = `Imported ${res?.imported || 0} lead(s) across States & Clusters. Skipped ${res?.skipped_verified_epcs || 0} platform account(s) & ${res?.duplicates_skipped || 0} duplicate(s).`;
    setFeedback({ type: 'success', text: msg });

    return {
      success: true,
      message: msg,
      skippedDetails: res?.skipped_details || (skippedTotal > 0 ? [] : []),
    };
  };

  const openContactsViewer = (seg) => {
    setContactSearch('');
    setContactStateId(selectedStateId);
    setContactStateName(selectedStateName);
    setContactClusterName(selectedClusterName);
    setContactDistrictName(selectedDistrictName);
    setContactsModalSegment(seg);
  };

  const handleDeleteOneContact = async (contactId) => {
    if (!contactsModalSegment?._id) return;
    try {
      await deleteSegmentContact(contactsModalSegment._id, contactId);
      await loadContacts(contactsModalSegment._id, contactsPagination.page);
      await loadSegmentsAndSummary();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed deleting contact.' });
    }
  };

  const handleClearAllContactsInSegment = async (seg) => {
    if (!seg?._id) return;
    if (!window.confirm(`Clear all uploaded leads and reset malformed column fields for "${seg.name}" so you can re-upload cleanly?`)) {
      return;
    }
    setClearingContacts(true);
    try {
      const res = await clearSegmentContacts(seg._id, true);
      setFeedback({
        type: 'success',
        text: res?.message || `Cleared leads from "${seg.name}". Ready for clean CSV upload.`
      });
      await loadSegmentsAndSummary();
      if (contactsModalSegment?._id === seg._id) {
        setContactsModalSegment(null);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed clearing leads.' });
    } finally {
      setClearingContacts(false);
    }
  };

  const handleSelectTerritoryFromMap = ({ stateId, stateName, clusterName, districtName }) => {
    const resolvedState = stateId || statesList.find((s) => cleanGeoToken(s.name) === cleanGeoToken(stateName))?._id || '';
    setSelectedStateId(resolvedState);
    setSelectedStateName(stateName || '');
    setSelectedClusterName(clusterName || '');
    setSelectedDistrictName(districtName || '');
  };

  const handleClearMapFilter = () => {
    setSelectedStateId('');
    setSelectedStateName('');
    setSelectedClusterName('');
    setSelectedDistrictName('');
  };

  const filteredKitsForModal = useMemo(() => {
    const q = kitSearchQuery.trim().toLowerCase();
    if (!q) return configuredKits;
    return configuredKits.filter((k) =>
      `${k.kit_name} ${k.solar_kit_name} ${k.category_name} ${k.subcategory_name}`.toLowerCase().includes(q)
    );
  }, [configuredKits, kitSearchQuery]);

  const summary = useMemo(() => {
    return segments.reduce(
      (acc, s) => ({
        groups: acc.groups + 1,
        contacts: acc.contacts + Number(s.filtered_contact_count ?? s.contact_count ?? 0),
        emails: acc.emails + Number(s.filtered_email_count ?? s.email_count ?? 0),
        phones: acc.phones + Number(s.filtered_phone_count ?? s.phone_count ?? 0),
        promoted: acc.promoted + Number(s.promoted_count ?? 0)
      }),
      { groups: 0, contacts: 0, emails: 0, phones: 0, promoted: 0 }
    );
  }, [segments]);

  const hasGeoFilter = Boolean(selectedStateName || selectedClusterName || selectedDistrictName);

  const contactsCustomCols = useMemo(() => {
    if (!contactsModalSegment?.field_definitions) return [];
    return contactsModalSegment.field_definitions.filter((f) => f.role === 'custom');
  }, [contactsModalSegment]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FaLayerGroup className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Segment Groups</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Isolated Non-EPC Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-3xl">
            Manage Purpose-driven marketing groups (<strong>EPC Sign Up & Login</strong>, <strong>Franchisee Sign Up & Login</strong>, <strong>Kit Sales</strong>), auto-match CSV fields, distribute unlimited leads across live <strong>States & Franchisee Clusters</strong>, prevent cross-database duplicates, and auto-promote leads upon GSTIN verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncVerifiedEpcs}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-60"
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Verified EPCs...' : 'Sync Verified EPCs'}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FaPlus className="w-3.5 h-3.5" /> Create Segment Group
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            feedback.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.type === 'error' ? <FaExclamationCircle /> : <FaCheckCircle />}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-70 cursor-pointer">
            <FaTimes />
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400">Segment Groups</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{summary.groups}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {hasGeoFilter ? 'Filtered Non-EPC Leads' : 'Active Non-EPC Leads'}
          </span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {summary.contacts.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400">Email Reachable</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {summary.emails.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-400">Phone Reachable</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.phones.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <FaShieldAlt /> Auto-Promoted to EPC
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.promoted.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Main Split Workspace: Left Segment Controls & List + Right Live Territory Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Filters & Segment Group Cards */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups or kits..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <select
              value={selectedPurpose}
              onChange={(e) => setSelectedPurpose(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Purposes</option>
              {SEGMENT_PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <select
              value={selectedStateId}
              onChange={(e) => {
                const id = e.target.value;
                const st = statesList.find((s) => String(s._id) === id);
                setSelectedStateId(id);
                setSelectedStateName(st?.name || '');
                setSelectedClusterName('');
                setSelectedDistrictName('');
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="">All States (Live DB)</option>
              {statesList.map((st) => (
                <option key={st._id} value={st._id}>{st.name}</option>
              ))}
            </select>

            <select
              value={selectedClusterName}
              onChange={(e) => {
                setSelectedClusterName(e.target.value);
                setSelectedDistrictName('');
              }}
              disabled={!selectedStateId}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              <option value="">{selectedStateId ? 'All Clusters in State' : 'Cluster (Pick State)'}</option>
              {clustersList.map((c) => (
                <option key={c._id} value={c.cluster_name}>{c.cluster_name} ({c.cluster_code})</option>
              ))}
            </select>

            <select
              value={selectedDistrictName}
              onChange={(e) => setSelectedDistrictName(e.target.value)}
              disabled={!selectedStateId}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              <option value="">{selectedStateId ? 'All Districts' : 'District (Pick State)'}</option>
              {districtsList.map((dist) => (
                <option key={dist._id} value={dist.name}>{dist.name}</option>
              ))}
            </select>
          </div>

          {/* Segment List */}
          {loading ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-xs font-bold text-slate-400">
              Loading Segment Groups & Live Territory Distribution...
            </div>
          ) : segments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
              <FaLayerGroup className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No Segment Groups found</p>
              <p className="text-xs text-slate-400">Create a Purpose-based segment group and upload leads — fields & clusters map automatically.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                <FaPlus /> Create Segment Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {segments.map((seg) => {
                const badgeCfg = PURPOSE_BADGE_MAP[seg.purpose] || PURPOSE_BADGE_MAP.epc_signup_login;
                const stateClusterGroups = Array.isArray(seg.state_cluster_breakdown) && seg.state_cluster_breakdown.length > 0
                  ? seg.state_cluster_breakdown
                  : (seg.state_breakdown || []).map((sb) => ({
                      state: sb.state || sb.name,
                      leads_count: sb.count,
                      clusters: [],
                      unclustered_count: sb.count
                    }));

                return (
                  <div
                    key={seg._id}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{seg.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeCfg.cls}`}>
                            {seg.purpose_label || badgeCfg.label}
                          </span>
                        </div>
                        {seg.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{seg.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(seg)}
                          title="Edit Segment Group"
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSegment(seg)}
                          title="Delete Segment"
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <FaTrashAlt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Selected Kits (shown when Purpose = Kit Sales) */}
                    {seg.purpose === 'kit_sales' && Array.isArray(seg.selected_kits) && seg.selected_kits.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <FaBoxes /> Target Kits:
                        </span>
                        {seg.selected_kits.map((kit) => (
                          <span
                            key={kit.kit_id}
                            className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-800 dark:text-amber-300"
                          >
                            {kit.kit_name}{kit.capacity ? ` (${kit.capacity} kW)` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Counts */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FaUsers className="text-indigo-500" /> Leads
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {(seg.filtered_contact_count ?? seg.contact_count ?? 0).toLocaleString('en-IN')}
                        </p>
                        {hasGeoFilter && (
                          <p className="text-[10px] text-slate-400">of {(seg.contact_count || 0).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FaEnvelope className="text-blue-500" /> Emails
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {(seg.filtered_email_count ?? seg.email_count ?? 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FaPhoneAlt className="text-emerald-500" /> Phones
                        </span>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {(seg.filtered_phone_count ?? seg.phone_count ?? 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/70">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <FaShieldAlt /> Promoted
                        </span>
                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                          {(seg.promoted_count || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Differentiated State -> Cluster Breakdown inside Card */}
                    {stateClusterGroups.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Territory Breakdown (By State & Cluster)
                        </p>
                        <div className="space-y-1.5">
                          {stateClusterGroups.map((sg) => {
                            const isStSelected = cleanGeoToken(selectedStateName) === cleanGeoToken(sg.state);
                            return (
                              <div
                                key={`st-grp-${seg._id}-${sg.state}`}
                                className={`p-2 rounded-xl border text-[10px] ${
                                  isStSelected
                                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/70'
                                }`}
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectTerritoryFromMap({
                                        stateId: '',
                                        stateName: sg.state === 'Unspecified' ? '' : sg.state,
                                        clusterName: '',
                                        districtName: ''
                                      })
                                    }
                                    className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold cursor-pointer hover:bg-indigo-700"
                                  >
                                    {sg.state}: {sg.leads_count ?? sg.count} Leads
                                  </button>

                                  {(sg.clusters || []).map((clu) => (
                                    <button
                                      key={`cl-${seg._id}-${sg.state}-${clu.cluster_name}`}
                                      type="button"
                                      onClick={() =>
                                        handleSelectTerritoryFromMap({
                                          stateId: '',
                                          stateName: sg.state === 'Unspecified' ? '' : sg.state,
                                          clusterName: clu.cluster_name,
                                          districtName: ''
                                        })
                                      }
                                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer hover:border-emerald-400"
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full inline-block"
                                        style={{ backgroundColor: clu.color_code || '#10b981' }}
                                      />
                                      <span>
                                        {clu.cluster_name}{clu.cluster_code ? ` (${clu.cluster_code})` : ''}: {clu.leads_count}
                                      </span>
                                    </button>
                                  ))}

                                  {sg.unclustered_count > 0 && sg.state !== 'Unspecified' && (
                                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">
                                      Outside Clusters: {sg.unclustered_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Auto-Matched DB Fields */}
                    <div className="flex flex-wrap gap-1">
                      {(seg.field_definitions || []).map((fld) => (
                        <span
                          key={fld.key}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/70 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {fld.label} <span className="opacity-60">[{fld.key}]</span>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/70">
                      <button
                        type="button"
                        onClick={() => openCsvModal(seg)}
                        className="flex-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FaFileUpload className="w-3.5 h-3.5" /> Upload CSV Leads
                      </button>
                      <button
                        type="button"
                        onClick={() => openContactsViewer(seg)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FaEye className="w-3.5 h-3.5" /> View Leads ({seg.filtered_contact_count ?? seg.contact_count ?? 0})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live India Territory & Cluster Map */}
        <div className="lg:col-span-5 lg:sticky lg:top-4">
          <SegmentTerritoryMapPanel
            territorySummary={territorySummary}
            selectedStateName={selectedStateName}
            selectedClusterName={selectedClusterName}
            selectedDistrictName={selectedDistrictName}
            onSelectTerritory={handleSelectTerritoryFromMap}
            onClearMapFilter={handleClearMapFilter}
          />
        </div>
      </div>

      {/* CREATE / EDIT SEGMENT MODAL (No Segment Type; Purpose + Kit Config + Auto-Match CSV Headers) */}
      {showSegmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FaSlidersH className="text-indigo-600" />
                {editingSegment ? 'Edit Segment Group' : 'Create Isolated Segment Group'}
              </h2>
              <button type="button" onClick={() => setShowSegmentModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveSegment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Segment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={segForm.name}
                    onChange={(e) => setSegForm({ ...segForm, name: e.target.value })}
                    placeholder="e.g., REI Expo Gujarat & MH Leads"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Segment Purpose *
                  </label>
                  <select
                    value={segForm.purpose}
                    onChange={(e) => {
                      const nextPurpose = e.target.value;
                      setSegForm((prev) => ({
                        ...prev,
                        purpose: nextPurpose,
                        selected_kits: nextPurpose === 'kit_sales' ? prev.selected_kits : []
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {SEGMENT_PURPOSES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Kit Selector from Admin Panel Kit Configurations when Purpose = Kit Sales */}
              {segForm.purpose === 'kit_sales' && (
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <FaBoxes /> Select Kits from Admin Panel Kit Configurations * ({segForm.selected_kits.length} selected)
                    </label>
                    <input
                      type="text"
                      value={kitSearchQuery}
                      onChange={(e) => setKitSearchQuery(e.target.value)}
                      placeholder="Filter configured kits..."
                      className="px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  {filteredKitsForModal.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No configured kits found in MongoDB Kit Configurations matching your search.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {filteredKitsForModal.map((kit) => {
                        const checked = segForm.selected_kits.some((k) => String(k.kit_id) === String(kit.kit_id));
                        return (
                          <label
                            key={kit.kit_id}
                            className={`p-2 rounded-lg border text-xs flex items-start justify-between gap-2 cursor-pointer ${
                              checked
                                ? 'bg-amber-100/70 dark:bg-amber-900/40 border-amber-500'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{kit.kit_name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {[kit.category_name, kit.subcategory_name, kit.capacity ? `${kit.capacity} kW` : ''].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleKitSelection(kit)}
                              className="mt-0.5 rounded-sm text-amber-600"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={segForm.description}
                  onChange={(e) => setSegForm({ ...segForm, description: e.target.value })}
                  placeholder="Optional notes on lead source and outreach goal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Upload File for Auto Field Matching & Direct Lead Import */}
              <div className="p-3.5 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                      Upload CSV File (Auto-Matches Columns to Database Fields & Multi-State Clusters)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      System detects file columns automatically (name, email, phone, state, district, cluster, gstin, etc.) — no manual key typing needed.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt,text/csv"
                  onChange={handleModalCsvSelected}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
                {modalCsvRows.length > 0 && (
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Ready to import {modalCsvRows.length.toLocaleString('en-IN')} leads from "{modalCsvFileName}" with auto-matched fields & cluster assignment.
                  </p>
                )}
              </div>

              {/* Matched Database Fields (User only adds or deletes fields — no key typing required) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Auto-Matched Database Fields ({segForm.field_definitions.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddDynamicField}
                    className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FaPlus className="w-3 h-3" /> Add Field
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {segForm.field_definitions.map((fld, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={fld.label}
                        onChange={(e) => handleFieldLabelChange(idx, e.target.value)}
                        placeholder="Field Name (e.g., GSTIN, Capacity)"
                        className="col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      />
                      <span
                        title="Auto-matched DB field key"
                        className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-500 truncate"
                      >
                        {fld.key}
                      </span>
                      <select
                        value={fld.role}
                        onChange={(e) => handleFieldRoleChange(idx, e.target.value)}
                        className="col-span-3 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {FIELD_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveDynamicField(idx)}
                        className="col-span-1 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg flex justify-center cursor-pointer"
                        title="Remove Field"
                      >
                        <FaTrashAlt className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSegmentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSegment}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {savingSegment
                    ? 'Saving & Mapping Leads...'
                    : editingSegment
                    ? modalCsvRows.length > 0 ? `Save & Import ${modalCsvRows.length} Leads` : 'Save Changes'
                    : modalCsvRows.length > 0 ? `Create & Import ${modalCsvRows.length} Leads` : 'Create Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNIFIED BDE-STYLE DYNAMIC BULK UPLOAD MODAL FOR SEGMENT GROUP */}
      <DynamicBulkUploadModal
        isOpen={Boolean(uploadTargetSegment)}
        onClose={() => setUploadTargetSegment(null)}
        title={`Bulk Upload Leads to "${uploadTargetSegment?.name || ''}"`}
        subtitle="Multi-state leads & Meta Lead Ads exports (.xlsx / UTF-16 / UTF-8 CSV). Automatically renames file columns to DB fields, preserves custom questions, maps States & Franchisee Clusters, and skips existing platform EPCs (Option B)."
        badgeText="Auto-Rename + Unlimited Leads"
        fieldOptions={dynamicSegmentFieldOptions}
        presets={SEGMENT_LEAD_PRESETS}
        defaultSelectedKeys={['name', 'phone', 'whatsapp_number', 'email', 'state', 'district']}
        enableDefaultFields={{ state: true, district: true, cluster: true, epcType: false, leadSource: true, remarks: true }}
        allowCustomColumns={true}
        customColumnsDefaultOn={true}
        sampleFileName={`segment_${slugifyFieldKey(uploadTargetSegment?.name || 'leads')}_template.csv`}
        submitLabel="Import Leads"
        onSubmitImport={handleSegmentBulkImport}
      />

      {/* SEGMENT CONTACTS VIEWER MODAL (Includes Cluster Column & Filter) */}
      {contactsModalSegment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaUsers className="text-indigo-600" /> {contactsModalSegment.name} — Active Non-EPC Leads ({contactsPagination.total})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Promoted to Verified EPC: {contactsModalSegment.promoted_count || 0} lead(s) automatically removed on GSTIN verification
                </p>
              </div>
              <div className="flex items-center gap-2">
                {contactsPagination.total > 0 && (
                  <button
                    type="button"
                    disabled={clearingContacts}
                    onClick={() => handleClearAllContactsInSegment(contactsModalSegment)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FaTrashAlt className="w-3 h-3" /> {clearingContacts ? 'Clearing...' : 'Clear Leads & Reset Fields'}
                  </button>
                )}
                <button type="button" onClick={() => setContactsModalSegment(null)} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search name, email, phone, cluster..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={contactStateId}
                onChange={(e) => {
                  const id = e.target.value;
                  const st = statesList.find((s) => String(s._id) === id);
                  setContactStateId(id);
                  setContactStateName(st?.name || '');
                  setContactClusterName('');
                  setContactDistrictName('');
                }}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
              >
                <option value="">All States</option>
                {statesList.map((st) => <option key={st._id} value={st._id}>{st.name}</option>)}
              </select>

              <select
                value={contactClusterName}
                onChange={(e) => setContactClusterName(e.target.value)}
                disabled={!contactStateId}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white disabled:opacity-50"
              >
                <option value="">All Clusters</option>
                {contactClusters.map((c) => (
                  <option key={c._id} value={c.cluster_name}>{c.cluster_name} ({c.cluster_code})</option>
                ))}
              </select>

              <select
                value={contactDistrictName}
                onChange={(e) => setContactDistrictName(e.target.value)}
                disabled={!contactStateId}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white disabled:opacity-50"
              >
                <option value="">All Districts</option>
                {contactDistricts.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/70 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">State</th>
                    <th className="px-3 py-2.5">Cluster</th>
                    <th className="px-3 py-2.5">District</th>
                    {contactsCustomCols.map((col) => (
                      <th key={col.key} className="px-3 py-2.5">{col.label}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {contactsLoading ? (
                    <tr>
                      <td colSpan={7 + contactsCustomCols.length} className="p-6 text-center text-slate-400">Loading contacts...</td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan={7 + contactsCustomCols.length} className="p-6 text-center text-slate-400">No matching active segment leads.</td>
                    </tr>
                  ) : (
                    contacts.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{c.name || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{c.email || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{c.phone || c.phone_normalized || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{c.state || '-'}</td>
                        <td className="px-3 py-2">
                          {c.cluster_name ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                              {c.cluster_name} {c.cluster_code ? `(${c.cluster_code})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{c.district || '-'}</td>
                        {contactsCustomCols.map((col) => (
                          <td key={col.key} className="px-3 py-2 text-slate-600 dark:text-slate-300">
                            {c.dynamic_fields?.[col.key] || '-'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteOneContact(c._id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Remove Lead"
                          >
                            <FaTrashAlt className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {contactsPagination.total_pages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Page {contactsPagination.page} of {contactsPagination.total_pages}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={contactsPagination.page <= 1}
                    onClick={() => loadContacts(contactsModalSegment._id, contactsPagination.page - 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={contactsPagination.page >= contactsPagination.total_pages}
                    onClick={() => loadContacts(contactsModalSegment._id, contactsPagination.page + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OPTION B POPUP: SKIPPED ALREADY-REGISTERED / DUPLICATE LEADS */}
      {duplicateModalData && (
        <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800 w-full max-w-3xl max-h-[85vh] flex flex-col p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                  <FaExclamationTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Duplicate / Already Registered Leads Blocked
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <strong>{duplicateModalData.imported || 0}</strong> unique lead(s) were uploaded to{' '}
                    <strong>{duplicateModalData.segmentName || 'Segment Group'}</strong>. The following{' '}
                    <strong>{duplicateModalData.skipped_details?.length || ((duplicateModalData.duplicates_skipped || 0) + (duplicateModalData.skipped_verified_epcs || 0))}</strong>{' '}
                    person(s) already exist in SolarKits databases and were skipped:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">Uploaded Successfully</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{duplicateModalData.imported || 0}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">Already in Platform DB</p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-300">
                  {(duplicateModalData.skipped_verified_epcs || 0) +
                    (duplicateModalData.skipped_registered_epcs || 0) +
                    (duplicateModalData.skipped_franchisees || 0) +
                    (duplicateModalData.skipped_crm_leads || 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase text-slate-500">Duplicate in Segment / File</p>
                <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                  {(duplicateModalData.skipped_existing_segment_leads || 0) +
                    (duplicateModalData.skipped_duplicate_in_file || 0)}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/70 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2">CSV Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Reason (Existing Source)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {(duplicateModalData.skipped_details || []).map((item, idx) => (
                    <tr key={`dup-${idx}`} className="hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                      <td className="px-3 py-2 font-mono text-slate-500">#{item.row_number || idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{item.name || '-'}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{item.phone || '-'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.email || '-'}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
                          {item.reason_label || item.reason || item.existing_source}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!duplicateModalData.skipped_details || duplicateModalData.skipped_details.length === 0) && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        Matched existing phone/email records were automatically excluded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
