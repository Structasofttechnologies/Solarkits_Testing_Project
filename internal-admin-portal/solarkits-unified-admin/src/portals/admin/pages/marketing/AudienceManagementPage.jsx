import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import * as d3Geo from 'd3-geo';
import {
  FaUsers,
  FaFilter,
  FaSearch,
  FaFileImport,
  FaPlus,
  FaWhatsapp,
  FaEnvelope,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaBuilding,
  FaMapMarkerAlt,
  FaDownload,
  FaTimes,
  FaEye,
  FaSyncAlt,
  FaLayerGroup,
  FaCheck,
  FaTrashAlt,
  FaArrowRight,
  FaCoins,
  FaSlidersH,
  FaInfoCircle
} from 'react-icons/fa';
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiMapPin, FiCheck, FiSliders } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthToken } from '../../app/authHeader';
import {
  fetchLiveActiveStates,
  fetchLiveClusters,
  fetchLiveWarehouses
} from './services/marketingDataService';
import DynamicBulkUploadModal from '../../components/bulk-upload/DynamicBulkUploadModal';
import { EPC_LEAD_FIELD_OPTIONS, EPC_LEAD_PRESETS } from '../../components/bulk-upload/bulkUploadSchemas';

const API_BASE = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/admin-api';

// Center coordinates for key Indian states
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

// Known coordinates for cluster markers on map
const CLUSTER_COORDINATES = {
  'Bhiwandi Central': [73.063, 19.297],
  'Pune Cluster': [73.856, 18.520],
  'Surat Cluster': [72.831, 21.170],
  'Ahmedabad Industrial': [72.571, 23.022],
  'Jaipur Central': [75.787, 26.912],
  'Bengaluru South': [77.594, 12.971],
  'Nagpur East': [79.088, 21.145],
  'Nashik North': [73.789, 19.997],
  'Jodhpur Tech': [73.024, 26.238],
  'Hubballi Industrial': [75.124, 15.364]
};

const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// EPC Type Classification Function (Boss Rule):
// 1. Buyer EPC: Placed >= 1 order (lifetimeOrders > 0)
// 2. Verified EPC: Has GSTIN provided, but 0 orders
// 3. Registered EPC: No GSTIN provided until they provide GSTIN
const classifyEpc = (item) => {
  const orders = Number(item.lifetimeOrders || item.lifetime_orders || item.orders || 0);
  if (orders > 0) return 'Buyer EPC';
  const gstin = String(item.gstin || item.gst_number || '').trim();
  if (gstin.length >= 10) return 'Verified EPC';
  return 'Registered EPC';
};

export default function AudienceManagementPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL'); // ALL | Buyer EPC | Verified EPC | Registered EPC
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCluster, setSelectedCluster] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);

  // Audience Data (100% live from MongoDB — zero static/dummy baseline)
  const [audiences, setAudiences] = useState([]);
  const [liveStates, setLiveStates] = useState([]);
  const [liveClusters, setLiveClusters] = useState([]);
  const [liveWarehouses, setLiveWarehouses] = useState([]);
  const [stats, setStats] = useState({
    total_epc_database: 0,
    unique_eligible_epcs: 0,
    buyer_epcs: 0,
    verified_epcs: 0,
    registered_epcs: 0,
    lifetime_kits_ordered: 0,
    active_clusters_count: 0,
    active_states_count: 0
  });

  // Fetch live active states, clusters, and warehouses from central services
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchLiveActiveStates(),
      fetchLiveClusters(),
      fetchLiveWarehouses()
    ]).then(([sList, cList, wList]) => {
      if (!isMounted) return;
      if (Array.isArray(sList) && sList.length > 0) setLiveStates(sList);
      if (Array.isArray(cList) && cList.length > 0) setLiveClusters(cList);
      if (Array.isArray(wList) && wList.length > 0) setLiveWarehouses(wList);
    }).catch(err => {
      console.warn('Live filter metadata notice:', err.message);
    });
    return () => { isMounted = false; };
  }, []);
  const [clustersData, setClustersData] = useState([]);

  // Map state
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredArea, setHoveredArea] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);
  const mapWidth = 520;
  const mapHeight = 580;

  const [importFeedback, setImportFeedback] = useState(null);

  // Fetch Audience list from Backend (100% Dynamic from MongoDB)
  const fetchAudience = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedGroup !== 'ALL') params.append('epc_type', selectedGroup);
      if (selectedState !== 'ALL') params.append('state', selectedState);
      if (selectedCluster !== 'ALL') params.append('cluster', selectedCluster);
      if (selectedWarehouse !== 'ALL') params.append('warehouse', selectedWarehouse);

      const res = await axios.get(`${API_BASE}/marketing/audience/list?${params.toString()}`, {
        headers: token ? { Authorization: token } : {}
      });

      if (res.data?.success) {
        setAudiences(Array.isArray(res.data.audiences) ? res.data.audiences : []);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.clusters) setClustersData(res.data.clusters);
      }
    } catch (err) {
      console.warn('Backend audience fetch notice:', err.message);
      setAudiences([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, selectedState, selectedCluster, selectedWarehouse]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  // Load India GeoJSON for Map
  useEffect(() => {
    let isMounted = true;
    fetch('/geojson/india_districts.json')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          setGeoData(data);
          setLoadingGeo(false);
        }
      })
      .catch(err => {
        console.error('GeoJSON loading error:', err);
        if (isMounted) setLoadingGeo(false);
      });
    return () => { isMounted = false; };
  }, []);

  // D3 Projection for India Map
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null };
    const proj = d3Geo
      .geoMercator()
      .center([82.5, 0])
      .scale(800)
      .translate([mapWidth / 2, 600]);
    const pathGen = d3Geo.geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoData, mapWidth, mapHeight]);

  // Geo features
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

  // Distinct Filter Lists (100% Dynamic from Live MongoDB Masters & Loaded Audiences)
  const availableStates = useMemo(() => {
    const set = new Set();
    liveStates.forEach(s => { if (s.name) set.add(s.name); });
    audiences.forEach(a => { if (a.state) set.add(a.state); });
    return Array.from(set).sort();
  }, [liveStates, audiences]);

  const availableClusters = useMemo(() => {
    const set = new Set();
    liveClusters.forEach(c => {
      const name = c.cluster_name || c.name;
      if (name) set.add(name);
    });
    audiences.forEach(a => { if (a.cluster) set.add(a.cluster); });
    return Array.from(set).sort();
  }, [liveClusters, audiences]);

  const availableWarehouses = useMemo(() => {
    const set = new Set();
    liveWarehouses.forEach(w => {
      const code = w.warehouse_code || w.code || w.name;
      if (code) set.add(code);
    });
    audiences.forEach(a => { if (a.warehouse) set.add(a.warehouse); });
    return Array.from(set).sort();
  }, [liveWarehouses, audiences]);

  // Handle clicking a state or district on map
  const handleStateClick = (stateName) => {
    if (!stateName) return;
    if ((selectedState || '').toLowerCase() === stateName.toLowerCase()) {
      setSelectedState('ALL');
      setSelectedCluster('ALL');
    } else {
      setSelectedState(stateName);
      setSelectedCluster('ALL');
    }
  };

  // Handle clicking a cluster pin or pill
  const handleClusterClick = (clusterName, clusterState) => {
    if (!clusterName) return;
    if ((selectedCluster || '').toLowerCase() === clusterName.toLowerCase()) {
      setSelectedCluster('ALL');
      setSelectedState('ALL');
    } else {
      setSelectedCluster(clusterName);
      setSelectedState('ALL'); // Reset state so cluster is the focused target
    }
  };

  // Filtered audience table data with intelligent location matching
  const filteredAudiences = useMemo(() => {
    return audiences.filter(item => {
      // Classification check
      const computedType = item.type || classifyEpc(item);

      const matchesSearch =
        !search.trim() ||
        (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.contactPerson || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.phone || '').includes(search) ||
        (item.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.gstin || '').toLowerCase().includes(search.toLowerCase());

      const matchesGroup =
        selectedGroup === 'ALL' ||
        (selectedGroup === 'Buyer EPC' && computedType === 'Buyer EPC') ||
        (selectedGroup === 'Verified EPC' && computedType === 'Verified EPC') ||
        (selectedGroup === 'Registered EPC' && computedType === 'Registered EPC');

      // Intelligent location matching based on user clicks
      let matchesLocation = true;
      if (selectedCluster !== 'ALL') {
        const itemCluster = (item.cluster || '').toLowerCase();
        const targetCluster = selectedCluster.toLowerCase();
        matchesLocation = itemCluster.includes(targetCluster) || targetCluster.includes(itemCluster);
      } else if (selectedState !== 'ALL') {
        const itemState = (item.state || '').toLowerCase();
        const targetState = selectedState.toLowerCase();
        matchesLocation = itemState === targetState || itemState.includes(targetState) || targetState.includes(itemState);
      }

      const matchesWarehouse = selectedWarehouse === 'ALL' || (item.warehouse || '').toLowerCase().includes(selectedWarehouse.toLowerCase());

      return matchesSearch && matchesGroup && matchesLocation && matchesWarehouse;
    });
  }, [audiences, search, selectedGroup, selectedState, selectedCluster, selectedWarehouse]);

  // Aggregated Cluster Map Metrics
  const clusterMapPoints = useMemo(() => {
    const clusterMap = new Map();
    for (const item of audiences) {
      const cName = item.cluster || 'Other Cluster';
      const cType = item.type || classifyEpc(item);
      if (!clusterMap.has(cName)) {
        const coords = CLUSTER_COORDINATES[cName] || (STATE_CENTERS[clean(item.state)] || [77.0, 20.0]);
        clusterMap.set(cName, {
          name: cName,
          state: item.state || 'Maharashtra',
          warehouse: item.warehouse || 'Central Depot',
          buyer_epcs: 0,
          verified_epcs: 0,
          registered_epcs: 0,
          total_epcs: 0,
          total_orders: 0,
          coords
        });
      }
      const cObj = clusterMap.get(cName);
      cObj.total_epcs++;
      cObj.total_orders += Number(item.lifetimeOrders) || 0;
      if (cType === 'Buyer EPC') cObj.buyer_epcs++;
      else if (cType === 'Verified EPC') cObj.verified_epcs++;
      else cObj.registered_epcs++;
    }

    return Array.from(clusterMap.values()).map(c => {
      let dominant = 'Registered EPC';
      if (c.buyer_epcs >= c.verified_epcs && c.buyer_epcs >= c.registered_epcs) dominant = 'Buyer EPC';
      else if (c.verified_epcs >= c.registered_epcs) dominant = 'Verified EPC';
      return {
        ...c,
        dominant_type: dominant
      };
    });
  }, [audiences]);

  // Map Mouse Handlers
  const handleMapMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHoveredArea(null);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMapMouseMove = (e) => {
    if (isDragging) {
      setHoveredArea(null);
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMapMouseUp = () => setIsDragging(false);

  // Dynamic Hover Handler for any District or State polygon on the map
  const handleHoverDistrict = (sName, dName) => {
    if (isDragging) return;
    if (!sName && !dName) {
      setHoveredArea(null);
      return;
    }

    const cleanS = clean(sName);
    const cleanD = clean(dName);

    const matchingEpcs = audiences.filter(a => {
      const aState = clean(a.state);
      const aCluster = clean(a.cluster);
      return (cleanS && aState === cleanS) || (cleanD && (aCluster.includes(cleanD) || cleanD.includes(aCluster)));
    });

    const title = dName ? `${dName}` : sName;
    const subtitle = dName && sName && dName !== sName ? sName : (matchingEpcs.length > 0 ? 'Active Solar Hub' : 'No Active EPCs');

    if (matchingEpcs.length > 0) {
      const buyer = matchingEpcs.filter(a => (a.type || classifyEpc(a)) === 'Buyer EPC').length;
      const verified = matchingEpcs.filter(a => (a.type || classifyEpc(a)) === 'Verified EPC').length;
      const registered = matchingEpcs.filter(a => (a.type || classifyEpc(a)) === 'Registered EPC').length;
      const totalOrders = matchingEpcs.reduce((acc, a) => acc + (Number(a.lifetimeOrders) || 0), 0);

      setHoveredArea({
        title,
        subtitle,
        buyer_epcs: buyer,
        verified_epcs: verified,
        registered_epcs: registered,
        total_epcs: matchingEpcs.length,
        total_orders: totalOrders,
        hasData: true
      });
    } else {
      setHoveredArea({
        title,
        subtitle: `${sName || 'Territory'}`,
        buyer_epcs: 0,
        verified_epcs: 0,
        registered_epcs: 0,
        total_epcs: 0,
        total_orders: 0,
        hasData: false
      });
    }
  };

  // Dynamic Hover Handler for Cluster Pin markers
  const handleHoverCluster = (cluster) => {
    if (isDragging) return;
    if (!cluster) {
      setHoveredArea(null);
      return;
    }
    setHoveredArea({
      title: cluster.name,
      subtitle: cluster.state,
      buyer_epcs: cluster.buyer_epcs,
      verified_epcs: cluster.verified_epcs,
      registered_epcs: cluster.registered_epcs,
      total_epcs: cluster.total_epcs,
      total_orders: cluster.total_orders,
      hasData: true
    });
  };

  // Dynamic BDE-Style Bulk Import Submit Handler
  const handleBulkAudienceImport = async (validRows, { batchDefaults, requiredFields }) => {
    const token = getAuthToken();
    const transformedPayload = validRows.map((row) => ({
      name: row.company_name,
      company_name: row.company_name,
      contact_person: row.contact_person || row.company_name,
      phone: row.mobile_number,
      mobile_number: row.mobile_number,
      email: row.email || null,
      gstin: row.gst_number || null,
      gst_number: row.gst_number || null,
      state_name: row.state_name || batchDefaults?.default_state || '',
      district_name: row.district_name || batchDefaults?.default_district || '',
      cluster_id: row.cluster_id || null,
      cluster_name: row.cluster_name || batchDefaults?.default_cluster || '',
      cluster_code: row.cluster_code || '',
      pincode: row.pincode || '',
      address_line: row.address_line || '',
      epc_type: row.epc_type || batchDefaults?.default_epc_type || '',
      lead_source: row.lead_source || batchDefaults?.default_lead_source || 'audience_dynamic_import',
      interested_products: row.interested_products || '',
      follow_up_date: row.follow_up_date || '',
      remarks: row.remarks || batchDefaults?.default_remarks || '',
      lifetime_orders: Number(row.lifetime_orders || 0),
      custom_attributes: row._customFields || {},
    }));

    const res = await axios.post(
      `${API_BASE}/marketing/audience/import-leads`,
      { leads: transformedPayload, default_settings: { ...batchDefaults, required_fields: requiredFields } },
      { headers: token ? { Authorization: token } : {} }
    );

    if (res.data?.success) {
      setImportFeedback(res.data.message || `Successfully imported ${transformedPayload.length} leads!`);
      await fetchAudience();
    }

    return {
      success: Boolean(res.data?.success),
      message: res.data?.message || `Imported ${transformedPayload.length} leads.`,
      skippedDetails: res.data?.skipped_details || [],
    };
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaUsers className="w-3.5 h-3.5" />
            <span>Audience & Contact Hub • Centralized CRM Sync</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Contact & Audience Management</h1>
          <p className="text-sm text-slate-500">
            Segment, deduplicate and manage verified EPC partners, solar dealers, and target lead lists across India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <FaFileImport />
            <span>Bulk Upload (Excel / CSV)</span>
          </button>
          <button
            onClick={() => navigate('/marketing-panel/segments')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
          >
            <FaLayerGroup />
            <span>Manage Segment Groups</span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>{importFeedback}</span>
          <button type="button" onClick={() => setImportFeedback(null)} className="cursor-pointer">
            <FaTimes />
          </button>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total EPC Database</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">
              <FaUsers />
            </div>
          </div>
          <div className="text-2xl font-black">{stats.total_epc_database.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-500">Connected across all panels</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Eligible</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
              <FaShieldAlt />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.unique_eligible_epcs.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Strict Deduplication Applied</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-xs bg-emerald-50/20 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Buyer EPCs</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.buyer_epcs.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Placed at least 1 order</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-500/30 dark:border-blue-500/30 shadow-xs bg-blue-50/20 dark:bg-blue-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Verified EPCs</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
              <FaCheckCircle />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.verified_epcs.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-blue-600 font-semibold">GSTIN verified • 0 Orders</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-500/30 dark:border-amber-500/30 shadow-xs bg-amber-50/20 dark:bg-amber-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Registered EPCs</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
              !
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{stats.registered_epcs.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-amber-600 font-semibold">Awaiting GSTIN verification</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Clusters</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs">
              <FaMapMarkerAlt />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600">{clusterMapPoints.length}</div>
          <span className="text-[11px] text-slate-500">Across {availableStates.length} Indian States</span>
        </div>
      </div>

      {/* ── Strict Deduplication & Classification Banner ── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
        <FaShieldAlt className="text-blue-600 dark:text-blue-400 text-lg shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <strong className="text-blue-600 dark:text-blue-400 font-bold">SolarKits Universal Lead & EPC Sync Active:</strong> All leads uploaded via Admin Panel or Marketing CSV are connected to the central database. EPCs are classified strictly:
          <span className="inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold">🟢 Buyer EPC (Purchased Kits)</span>
          <span className="inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold">🔵 Verified EPC (GSTIN OK, 0 Orders)</span>
          <span className="inline-flex items-center gap-1 mx-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold">🟠 Registered EPC (No GSTIN)</span>.
        </div>
      </div>

      {/* ── MAIN CONTENT: LEFT SIDE INTERACTIVE MAP + RIGHT SIDE AUDIENCE CRM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ===================== LEFT SIDE: INTERACTIVE MAP ===================== */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <FaMapMarkerAlt className="text-indigo-600" />
                <span>Territory & Cluster EPC Map</span>
              </h3>
              <p className="text-[11px] text-slate-500">Live geographic distribution of EPCs & order density</p>
            </div>
            
            {/* Color Legend */}
            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Buyer
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Verified
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Registered
              </span>
            </div>
          </div>

          {/* Map Canvas */}
          <div
            ref={mapContainerRef}
            className="relative w-full h-[480px] bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={() => { setIsDragging(false); setHoveredArea(null); }}
            onWheel={(e) => {
              e.preventDefault();
              const factor = e.deltaY < 0 ? 1.15 : 0.88;
              setZoom(prev => Math.min(Math.max(prev * factor, 0.7), 6));
            }}
          >
            {/* Map Controls */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <button
                onClick={() => setZoom(prev => Math.min(prev * 1.25, 6))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
                title="Zoom In"
              >
                <FiZoomIn />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(prev / 1.25, 0.7))}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
                title="Zoom Out"
              >
                <FiZoomOut />
              </button>
              <button
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
                title="Reset Map View"
              >
                <FiRefreshCw />
              </button>
            </div>

            {/* Selected Filter Indicator Pill */}
            {selectedCluster !== 'ALL' && (
              <div className="absolute top-3 left-3 z-10 bg-indigo-600 text-white px-2.5 py-1 rounded-xl shadow-md text-xs font-bold flex items-center gap-1.5">
                <span>Filtered: {selectedCluster}</span>
                <button onClick={() => setSelectedCluster('ALL')} className="hover:text-red-200 ml-1">
                  <FaTimes />
                </button>
              </div>
            )}

            {loadingGeo ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading Territory Coordinates...</span>
              </div>
            ) : (
              <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full block">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Districts Outline */}
                  {districtFeatures.map((f, i) => {
                    const sName = f.properties?.st_nm || '';
                    const dName = f.properties?.district || '';
                    const isStateActive = availableStates.some(st => clean(st) === clean(sName));

                    return (
                      <path
                        key={i}
                        d={pathGenerator(f)}
                        fill={isStateActive ? '#e0e7ff' : '#f1f5f9'}
                        fillOpacity={isStateActive ? 0.75 : 0.5}
                        stroke="#cbd5e1"
                        strokeWidth={0.4 / zoom}
                        className="transition-colors hover:fill-indigo-300/60"
                        onClick={() => handleStateClick(sName)}
                        onMouseEnter={() => handleHoverDistrict(sName, dName)}
                        onMouseLeave={() => setHoveredArea(null)}
                      />
                    );
                  })}

                  {/* State Outer Boundaries */}
                  {stateBoundaries.map((s, idx) => (
                    <path
                      key={`sb-${idx}`}
                      d={pathGenerator(s)}
                      fill="none"
                      stroke="#475569"
                      strokeWidth={0.9 / zoom}
                      className="pointer-events-none"
                    />
                  ))}

                  {/* Cluster Area Colored Pins (Boss Requirement) */}
                  {clusterMapPoints.map((cluster, cIdx) => {
                    const coords = cluster.coords;
                    if (!coords || !projection) return null;
                    const projected = projection(coords);
                    if (!projected) return null;

                    const [cx, cy] = projected;
                    const isSelected = selectedCluster.toLowerCase() === cluster.name.toLowerCase();

                    // Pin color based on dominant EPC type
                    let pinBg = '#f59e0b'; // Amber for Registered
                    if (cluster.dominant_type === 'Buyer EPC') pinBg = '#10b981'; // Green for Buyer
                    else if (cluster.dominant_type === 'Verified EPC') pinBg = '#3b82f6'; // Blue for Verified

                    return (
                      <g
                        key={`clu-${cIdx}`}
                        transform={`translate(${cx}, ${cy})`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClusterClick(cluster.name, cluster.state);
                        }}
                        onMouseEnter={() => handleHoverCluster(cluster)}
                        onMouseLeave={() => setHoveredArea(null)}
                      >
                        {/* Pulse Ring for high orders */}
                        {cluster.total_orders > 0 && (
                          <circle
                            r={(12 + Math.min(cluster.total_orders, 15)) / zoom}
                            fill={pinBg}
                            fillOpacity={0.25}
                            className="animate-ping"
                          />
                        )}

                        {/* Outer Circle */}
                        <circle
                          r={(9 / zoom)}
                          fill={pinBg}
                          stroke="#ffffff"
                          strokeWidth={2 / zoom}
                          className="shadow-md"
                        />

                        {/* Inner Dot */}
                        <circle
                          r={(4 / zoom)}
                          fill="#ffffff"
                        />

                        {/* Cluster Label Badge */}
                        <text
                          y={-(12 / zoom)}
                          textAnchor="middle"
                          fontSize={9 / zoom}
                          fontWeight="bold"
                          fill="#1e293b"
                          className="select-none pointer-events-none"
                          style={{ textShadow: '0 1px 2px rgba(255,255,255,0.9)' }}
                        >
                          {cluster.name.replace(' Cluster', '').replace(' Central', '')} ({cluster.total_epcs})
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Floating Dynamic Area Tooltip */}
            {hoveredArea && !isDragging && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-2.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1.5 w-56 transition-all duration-75"
                style={{
                  left: `${Math.min(Math.max(tooltipPos.x - 112, 10), mapWidth - 235)}px`,
                  top: `${Math.max(tooltipPos.y - 130, 10)}px`
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                  <span className="font-extrabold text-xs text-indigo-300 truncate">{hoveredArea.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">{hoveredArea.subtitle}</span>
                </div>

                {hoveredArea.hasData ? (
                  <>
                    <div className="grid grid-cols-3 gap-1 text-[10px] py-0.5">
                      <div className="bg-emerald-950/60 p-1 rounded-lg border border-emerald-500/30 text-center">
                        <span className="block text-slate-400 text-[9px]">Buyer</span>
                        <strong className="text-emerald-400 text-xs">{hoveredArea.buyer_epcs}</strong>
                      </div>
                      <div className="bg-blue-950/60 p-1 rounded-lg border border-blue-500/30 text-center">
                        <span className="block text-slate-400 text-[9px]">Verified</span>
                        <strong className="text-blue-400 text-xs">{hoveredArea.verified_epcs}</strong>
                      </div>
                      <div className="bg-amber-950/60 p-1 rounded-lg border border-amber-500/30 text-center">
                        <span className="block text-slate-400 text-[9px]">Registered</span>
                        <strong className="text-amber-400 text-xs">{hoveredArea.registered_epcs}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="text-slate-300">Total Kits Ordered:</span>
                      <strong className="text-emerald-400 font-bold">{hoveredArea.total_orders} Kits</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Conversion Rate:</span>
                      <strong className="text-indigo-400 font-bold">
                        {hoveredArea.total_epcs > 0 ? ((hoveredArea.buyer_epcs / hoveredArea.total_epcs) * 100).toFixed(1) : 0}%
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="py-1 text-center text-slate-400 text-[11px]">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold mb-1">
                      0 Active EPCs
                    </span>
                    <p className="text-[10px] text-slate-500">No registered or buyer EPCs in this territory.</p>
                  </div>
                )}

                <div className="text-[9.5px] text-indigo-400 text-center pt-0.5 font-medium border-t border-slate-800/80">
                  Click area to filter table
                </div>
              </div>
            )}

            {/* Bottom Controls Hint */}
            <div className="absolute bottom-2 left-3 right-3 z-10 flex items-center justify-between text-[10px] text-slate-500 bg-white/85 dark:bg-slate-800/85 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <span>💡 Color pins define EPC Types: Green = Buyer, Blue = Verified, Amber = Registered</span>
              <span className="font-semibold text-indigo-600">Drag to Pan • Scroll to Zoom</span>
            </div>
          </div>

          {/* Quick Cluster Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => {
                setSelectedCluster('ALL');
                setSelectedState('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                selectedCluster === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Clusters ({clusterMapPoints.length})
            </button>
            {clusterMapPoints.map(c => (
              <button
                key={c.name}
                onClick={() => handleClusterClick(c.name, c.state)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
                  selectedCluster.toLowerCase() === c.name.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  c.dominant_type === 'Buyer EPC' ? 'bg-emerald-500' : (c.dominant_type === 'Verified EPC' ? 'bg-blue-500' : 'bg-amber-500')
                }`}></span>
                <span>{c.name}</span>
                <span className="opacity-70 text-[10px]">({c.total_epcs})</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===================== RIGHT SIDE: FILTERS & AUDIENCE TABLE ===================== */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs space-y-3">
            <div className="relative w-full">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by EPC Company, Contact Name, Mobile, Email or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              
              {/* Buyer / EPC Type Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">EPC Category</label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Buyer EPC">🟢 Buyer EPCs (Ordered)</option>
                  <option value="Verified EPC">🔵 Verified EPCs (GSTIN OK)</option>
                  <option value="Registered EPC">🟠 Registered EPCs (Awaiting GST)</option>
                </select>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">State / Territory</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                >
                  <option value="ALL">All States</option>
                  {availableStates.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Cluster Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Cluster / Region</label>
                <select
                  value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                >
                  <option value="ALL">All Clusters</option>
                  {availableClusters.map(cl => (
                    <option key={cl} value={cl}>{cl}</option>
                  ))}
                </select>
              </div>

              {/* Warehouse Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Depot / Warehouse</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:outline-hidden"
                >
                  <option value="ALL">All Warehouses</option>
                  {availableWarehouses.map(wh => (
                    <option key={wh} value={wh}>{wh}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Active Area / Cluster Focus Notification */}
          {(selectedState !== 'ALL' || selectedCluster !== 'ALL' || selectedGroup !== 'ALL') && (
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-2.5 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold">
                <FiMapPin className="text-indigo-600 dark:text-indigo-400" />
                <span>
                  Active Area Filter: <strong>{selectedCluster !== 'ALL' ? selectedCluster : selectedState}</strong>
                  {selectedGroup !== 'ALL' && ` • Category: ${selectedGroup}`}
                </span>
                <span className="text-[11px] bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-full font-bold">
                  {filteredAudiences.length} EPC{filteredAudiences.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedState('ALL');
                  setSelectedCluster('ALL');
                  setSelectedGroup('ALL');
                  setSelectedWarehouse('ALL');
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-xs font-bold underline cursor-pointer"
              >
                Clear Area Filter ✕
              </button>
            </div>
          )}

          {/* Audience Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Displaying <strong>{filteredAudiences.length}</strong> matching EPC partners
              </span>
              <button
                onClick={fetchAudience}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <FaSyncAlt className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh Database
              </button>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="p-3 pl-4">EPC Company & Contact</th>
                    <th className="p-3">Cluster & State</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3">Lifetime Orders</th>
                    <th className="p-3">Channels</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-medium">
                  {filteredAudiences.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-xl">
                            <FiMapPin />
                          </div>
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {selectedCluster !== 'ALL'
                              ? `No EPC Partners in ${selectedCluster}`
                              : (selectedState !== 'ALL'
                                ? `No EPC Partners in ${selectedState}`
                                : 'No EPC Partners matching your search / filters')}
                          </div>
                          <p className="text-xs text-slate-400 max-w-sm">
                            {selectedCluster !== 'ALL' || selectedState !== 'ALL'
                              ? 'There are currently no active EPC contractors registered in this specific area in the database.'
                              : 'Try adjusting your search query, or clear your filters to view all partners.'}
                          </p>
                          {(selectedCluster !== 'ALL' || selectedState !== 'ALL' || selectedGroup !== 'ALL' || search) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCluster('ALL');
                                setSelectedState('ALL');
                                setSelectedGroup('ALL');
                                setSelectedWarehouse('ALL');
                                setSearch('');
                              }}
                              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                            >
                              <FiRefreshCw className="text-xs" />
                              <span>Show All Areas & Reset Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAudiences.map((item) => {
                      const computedType = item.type || classifyEpc(item);

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                            <div className="text-[11px] text-slate-500">{item.contactPerson} • {item.phone}</div>
                            <div className="text-[10px] text-slate-400">{item.email}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-200">{item.cluster}</div>
                            <div className="text-[11px] text-slate-400">{item.state}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              computedType === 'Buyer EPC'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : computedType === 'Verified EPC'
                                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                computedType === 'Buyer EPC' ? 'bg-emerald-500' : (computedType === 'Verified EPC' ? 'bg-blue-500' : 'bg-amber-500')
                              }`} />
                              {computedType}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            {item.gstin ? (
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.gstin}</span>
                            ) : (
                              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[10px] font-bold">
                                Awaiting GSTIN
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {item.lifetimeOrders || 0} Kits
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`p-1 rounded-full ${item.whatsappOptIn ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-400'}`} title="WhatsApp Opted In">
                                <FaWhatsapp className="w-3 h-3" />
                              </span>
                              <span className={`p-1 rounded-full ${item.emailVerified ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-200 text-slate-400'}`} title="Email Verified">
                                <FaEnvelope className="w-3 h-3" />
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {item.lastActive || 'Recent'}
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <button
                              onClick={() => alert(`Enqueued ${item.name} for Campaign Target Dispatch`)}
                              className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              Target
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      <DynamicBulkUploadModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk Upload Audience & EPC Leads"
        subtitle="Import contractor & audience leads via Excel (.xlsx) or CSV with dynamic batch defaults, automatic column renaming, and live inline correction"
        badgeText="Dynamic Fields + Option B Dedupe"
        fieldOptions={EPC_LEAD_FIELD_OPTIONS}
        presets={EPC_LEAD_PRESETS}
        defaultSelectedKeys={['company_name', 'mobile_number', 'gst_number', 'email', 'contact_person', 'district_name', 'state_name']}
        enableDefaultFields={{ state: true, district: true, cluster: true, epcType: true, leadSource: true, remarks: true }}
        allowCustomColumns={true}
        customColumnsDefaultOn={true}
        sampleFileName="audience_leads_template.csv"
        submitLabel="Import Leads"
        onSubmitImport={handleBulkAudienceImport}
      />

    </div>
  );
}
