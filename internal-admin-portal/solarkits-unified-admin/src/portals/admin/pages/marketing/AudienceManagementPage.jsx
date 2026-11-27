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
import { marketingHttp, extractApiError } from './services/marketingApi';
import {
  fetchLiveActiveStates,
  fetchLiveClusters,
  fetchLiveWarehouses
} from './services/marketingDataService';

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [actionBanner, setActionBanner] = useState(null);
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'segments' | 'unsubscribed'
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL'); // ALL | Buyer EPC | Verified EPC | Registered EPC
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCluster, setSelectedCluster] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSegmentModal, setShowSegmentModal] = useState(false);

  // Audience Data (Strictly live from MongoDB)
  const [audiences, setAudiences] = useState([]);
  const [segments, setSegments] = useState([]);
  const [unsubscribedList, setUnsubscribedList] = useState([]);
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

  // Segment Builder Form State
  const [segmentForm, setSegmentForm] = useState({
    name: '',
    description: '',
    epcGroup: 'ALL',
    stateName: '',
    clusterName: '',
    minOrders: 0,
    requireConsent: false
  });
  const [savingSegment, setSavingSegment] = useState(false);

  // Manual Suppression Form State
  const [suppressForm, setSuppressForm] = useState({
    email: '',
    phone: '',
    channel: 'all',
    reason: 'Admin manual suppression'
  });
  const [suppressSubmitting, setSuppressSubmitting] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState(null);

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

  // ── CSV Import Wizard State ─────────────────────────────────────────
  const [importStep, setImportStep] = useState(1); // 1: Select File, 2: Map Fields & Preview
  const [csvFileName, setCsvFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [rawCsvRows, setRawCsvRows] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
    cluster: '',
    pincode: '',
    lifetimeOrders: ''
  });
  const [customFields, setCustomFields] = useState([]); // [{ key: 'extra1', label: 'Solar KW', csvHeader: '' }]
  const [importSuccessMessage, setImportSuccessMessage] = useState(null);
  const [importing, setImporting] = useState(false);

  // Fetch Audience list, Segments & Unsubscribed list from Backend
  const fetchAudience = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedGroup !== 'ALL') params.append('epc_type', selectedGroup);
      if (selectedState !== 'ALL') params.append('state', selectedState);
      if (selectedCluster !== 'ALL') params.append('cluster', selectedCluster);
      if (selectedWarehouse !== 'ALL') params.append('warehouse', selectedWarehouse);

      const res = await marketingHttp.get(`/audience/list?${params.toString()}`);

      if (res.data?.success && Array.isArray(res.data.audiences)) {
        setAudiences(res.data.audiences);
        if (res.data.stats) setStats(res.data.stats);
        if (res.data.clusters) setClustersData(res.data.clusters);
      } else {
        setAudiences([]);
      }
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to load EPC audience database'));
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, selectedState, selectedCluster, selectedWarehouse]);

  const fetchSegmentsAndSuppression = useCallback(async () => {
    try {
      const [segRes, unsubRes] = await Promise.all([
        marketingHttp.get('/segments').catch(() => null),
        marketingHttp.get('/audience/unsubscribed').catch(() => null)
      ]);
      if (segRes?.data?.success && Array.isArray(segRes.data.data)) {
        setSegments(segRes.data.data);
      }
      if (unsubRes?.data?.success && Array.isArray(unsubRes.data.unsubscribes)) {
        setUnsubscribedList(unsubRes.data.unsubscribes);
      }
    } catch (err) {
      console.warn('Segments/suppression fetch error:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  useEffect(() => {
    fetchSegmentsAndSuppression();
  }, [fetchSegmentsAndSuppression]);

  const handleSaveSegment = async (e) => {
    e?.preventDefault();
    if (!segmentForm.name.trim()) {
      setErrorMessage('Segment name is required.');
      return;
    }
    setSavingSegment(true);
    setErrorMessage(null);
    try {
      const filters = {
        epc_groups: segmentForm.epcGroup === 'ALL' ? ['all'] : [segmentForm.epcGroup],
        state_names: segmentForm.stateName ? [segmentForm.stateName] : [],
        cluster_names: segmentForm.clusterName ? [segmentForm.clusterName] : [],
        min_orders: Number(segmentForm.minOrders || 0),
        require_consent: Boolean(segmentForm.requireConsent),
        include_imported_leads: true
      };
      const res = await marketingHttp.post('/segments', {
        name: segmentForm.name.trim(),
        description: segmentForm.description.trim(),
        filters
      });
      if (res.data?.success) {
        setShowSegmentModal(false);
        setSegmentForm({ name: '', description: '', epcGroup: 'ALL', stateName: '', clusterName: '', minOrders: 0, requireConsent: false });
        setActionBanner(`Dynamic segment "${res.data.data?.name}" saved to MongoDB (${res.data.data?.cached_count ?? 0} matching contacts).`);
        fetchSegmentsAndSuppression();
      }
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to create segment'));
    } finally {
      setSavingSegment(false);
    }
  };

  const handleDeleteSegment = async (segId) => {
    try {
      await marketingHttp.delete(`/segments/${segId}`);
      setActionBanner('Segment removed.');
      fetchSegmentsAndSuppression();
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to delete segment'));
    }
  };

  const handleSuppressContact = async ({ email, phone, channel = 'all', reason = 'Admin suppression' }) => {
    if (!email && !phone) {
      setErrorMessage('Provide an email address or phone number to suppress.');
      return;
    }
    setSuppressSubmitting(true);
    setErrorMessage(null);
    try {
      await marketingHttp.post('/audience/unsubscribed/suppress', { email, phone, channel, reason });
      setActionBanner(`Suppressed ${email || phone} from future ${channel} broadcasts.`);
      setSuppressForm({ email: '', phone: '', channel: 'all', reason: 'Admin manual suppression' });
      fetchSegmentsAndSuppression();
      fetchAudience();
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to suppress contact'));
    } finally {
      setSuppressSubmitting(false);
    }
  };

  const handleResubscribeContact = async (record) => {
    try {
      await marketingHttp.post('/audience/unsubscribed/resubscribe', {
        id: record._id,
        email: record.email,
        phone: record.phone
      });
      setActionBanner(`Restored ${record.email || record.phone} to active audience eligibility.`);
      fetchSegmentsAndSuppression();
      fetchAudience();
    } catch (err) {
      setErrorMessage(extractApiError(err, 'Failed to resubscribe contact'));
    }
  };

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

  // Distinct Filter Lists (Mirrors Location Setup, Cluster Setup & Company Warehouses)
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

  // ── CSV File Parser ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) return;

      // Extract CSV headers
      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
      setCsvHeaders(headers);

      // Parse sample data rows
      const parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length > 0) {
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = parts[idx] || '';
          });
          parsedRows.push(rowObj);
        }
      }
      setRawCsvRows(parsedRows);

      // Smart auto-mapping detection
      const autoMap = {
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        state: '',
        cluster: '',
        pincode: '',
        lifetimeOrders: ''
      };

      headers.forEach(h => {
        const lh = h.toLowerCase();
        if (!autoMap.name && (lh.includes('company') || lh.includes('firm') || lh.includes('epc') || lh.includes('name'))) autoMap.name = h;
        if (!autoMap.contactPerson && (lh.includes('contact') || lh.includes('person') || lh.includes('owner') || lh.includes('proprietor'))) autoMap.contactPerson = h;
        if (!autoMap.phone && (lh.includes('phone') || lh.includes('mobile') || lh.includes('whatsapp') || lh.includes('cell'))) autoMap.phone = h;
        if (!autoMap.email && (lh.includes('email') || lh.includes('mail'))) autoMap.email = h;
        if (!autoMap.gstin && (lh.includes('gst') || lh.includes('gstin') || lh.includes('tax'))) autoMap.gstin = h;
        if (!autoMap.state && (lh.includes('state') || lh.includes('region'))) autoMap.state = h;
        if (!autoMap.cluster && (lh.includes('cluster') || lh.includes('city') || lh.includes('district') || lh.includes('area'))) autoMap.cluster = h;
        if (!autoMap.pincode && (lh.includes('pin') || lh.includes('zip') || lh.includes('postal'))) autoMap.pincode = h;
        if (!autoMap.lifetimeOrders && (lh.includes('order') || lh.includes('orders') || lh.includes('past') || lh.includes('kits') || lh.includes('qty'))) autoMap.lifetimeOrders = h;
      });

      setFieldMappings(autoMap);
      setImportStep(2); // Advance to Mapping Configurator
    };

    reader.readAsText(file);
  };

  // Add Custom Dynamic Field
  const handleAddCustomField = () => {
    const key = `custom_${Date.now()}`;
    setCustomFields(prev => [...prev, { key, label: `Custom Field ${prev.length + 1}`, csvHeader: '' }]);
  };

  const handleRemoveCustomField = (key) => {
    setCustomFields(prev => prev.filter(f => f.key !== key));
  };

  // Live Mapped Preview Data (Calculated dynamically)
  const mappedPreviewData = useMemo(() => {
    return rawCsvRows.slice(0, 5).map((row, idx) => {
      const name = row[fieldMappings.name] || `EPC Contractor ${idx + 1}`;
      const contactPerson = row[fieldMappings.contactPerson] || name;
      const phone = row[fieldMappings.phone] || '';
      const email = row[fieldMappings.email] || '';
      const gstin = row[fieldMappings.gstin] || null;
      const state = row[fieldMappings.state] || 'Maharashtra';
      const cluster = row[fieldMappings.cluster] || 'Bhiwandi Central';
      const pincode = row[fieldMappings.pincode] || '';
      const lifetimeOrders = Number(row[fieldMappings.lifetimeOrders] || 0);

      const computedType = classifyEpc({ gstin, lifetimeOrders });

      return {
        _id: `preview-${idx}`,
        name,
        contactPerson,
        phone,
        email,
        gstin,
        state,
        cluster,
        pincode,
        lifetimeOrders,
        type: computedType
      };
    });
  }, [rawCsvRows, fieldMappings]);

  // Submit and Upload Mapped Leads
  const handleUploadAndProcess = async () => {
    setImporting(true);
    setImportErrorMessage(null);
    try {
      // Prepare full transformed payload
      const transformedPayload = rawCsvRows.map(row => {
        const item = {
          name: row[fieldMappings.name] || 'Solar EPC Contractor',
          company_name: row[fieldMappings.name] || 'Solar EPC Contractor',
          contact_person: row[fieldMappings.contactPerson] || row[fieldMappings.name] || 'Contact Person',
          phone: row[fieldMappings.phone] || '',
          email: row[fieldMappings.email] || '',
          gstin: row[fieldMappings.gstin] || null,
          state_name: row[fieldMappings.state] || '',
          district_name: row[fieldMappings.cluster] || '',
          pincode: row[fieldMappings.pincode] || '',
          lifetime_orders: Number(row[fieldMappings.lifetimeOrders] || 0),
          customFields: {}
        };

        customFields.forEach(cf => {
          if (cf.csvHeader && row[cf.csvHeader]) {
            item.customFields[cf.label || cf.key] = row[cf.csvHeader];
          }
        });

        return item;
      });

      const res = await marketingHttp.post('/audience/import-leads', {
        leads: transformedPayload,
        customFieldMappings: fieldMappings
      });

      if (res.data?.success) {
        setImportSuccessMessage(res.data.message || `Successfully imported ${transformedPayload.length} EPC leads!`);
        fetchAudience();
        setTimeout(() => {
          setShowImportModal(false);
          setImportStep(1);
          setRawCsvRows([]);
          setImportSuccessMessage(null);
        }, 1500);
      } else {
        setImportErrorMessage(res.data?.message || 'Import rejected by server.');
      }
    } catch (err) {
      setImportErrorMessage(extractApiError(err, 'Failed to import leads to database'));
    } finally {
      setImporting(false);
    }
  };

  // Download Sample CSV template for testing lead uploads directly in browser
  const handleDownloadSampleCsv = () => {
    const csvContent = `Company Name,Contact Person,Mobile Number,Email Address,GSTIN Number,State,Cluster Area,Pincode,Lifetime Orders,Solar Requirement KW
Surat SunTech Energy Ltd,Karan Patel,9825012345,karan@suntechsurat.in,24AAECS1234B1Z5,Gujarat,Surat Cluster,395001,12,50 KW
Pune Power Grid Solar,Sanjay Kulkarni,9822198765,sanjay@punepowergrid.com,27AABCP5678C1Z8,Maharashtra,Pune Cluster,411001,8,25 KW
Bhiwandi CleanVolt Systems,Aditya Patil,9820055443,aditya@cleanvoltepc.in,27AAACB9988D1Z2,Maharashtra,Bhiwandi Central,421302,0,40 KW
Jaipur Solar Rays Pvt Ltd,Mahendra Rathore,9414077889,mahendra@jaipursolarrays.co.in,08AAECJ3344E1Z9,Rajasthan,Jaipur Central,302001,0,30 KW
Bengaluru Rooftop Solar Works,Naveen Gowda,9845011223,naveen@bengalurusolarworks.com,,Karnataka,Bengaluru South,560001,0,15 KW
Nagpur Solar Solutions,Pramod Joshi,9823044556,pramod@nagpursolarsolutions.in,,Maharashtra,Nagpur East,440001,0,20 KW
Ahmedabad SunPower Engineering,Mehul Vora,9879033445,mehul@sunpowereng.com,,Gujarat,Ahmedabad Industrial,380001,0,35 KW`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_epc_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            onClick={handleDownloadSampleCsv}
            className="px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            title="Download sample leads CSV template for testing"
          >
            <FaDownload className="text-emerald-600 dark:text-emerald-400 text-xs" />
            <span>Download Sample CSV</span>
          </button>
          <button
            onClick={() => {
              setImportStep(1);
              setShowImportModal(true);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <FaFileImport className="text-blue-500" />
            <span>Import CSV / Excel (Dynamic Fields)</span>
          </button>
          <button
            onClick={() => setShowSegmentModal(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
          >
            <FaPlus />
            <span>Create Custom Segment</span>
          </button>
        </div>
      </div>

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

          {/* Banners */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FaExclamationTriangle /> {errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="cursor-pointer"><FaTimes /></button>
            </div>
          )}
          {actionBanner && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><FaCheckCircle /> {actionBanner}</span>
              <button onClick={() => setActionBanner(null)} className="cursor-pointer"><FaTimes /></button>
            </div>
          )}

          {/* CRM View Tabs: Contacts | Saved Segments | Suppression List */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'contacts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FaUsers />
              <span>Active Contacts ({filteredAudiences.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('segments')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'segments'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FaLayerGroup />
              <span>Saved Segments ({segments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unsubscribed')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unsubscribed'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <FaShieldAlt />
              <span>Unsubscribed / Suppressed ({unsubscribedList.length})</span>
            </button>
          </div>

          {/* Audience Table */}
          {activeTab === 'contacts' && (
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
                              type="button"
                              onClick={() => handleSuppressContact({ email: item.email, phone: item.phone, channel: 'all', reason: `Manual suppression for ${item.name}` })}
                              className="px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold cursor-pointer transition-colors"
                              title="Add contact to Do-Not-Contact suppression list"
                            >
                              Suppress
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
          )}

          {activeTab === 'segments' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold">Saved Dynamic Segments</h3>
                  <p className="text-[11px] text-slate-500">Reusable MongoDB audience segments selectable directly inside the Campaign Wizard.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSegmentModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FaPlus /> New Segment
                </button>
              </div>
              {segments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                  No custom segments saved yet. Click "Create Custom Segment" to build one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {segments.map((seg) => (
                    <div key={seg._id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">{seg.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                            {seg.cached_count ?? 0} EPCs
                          </span>
                        </div>
                        {seg.description && <p className="text-[11px] text-slate-500 mt-1">{seg.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-slate-600 dark:text-slate-300">
                          {seg.filters?.epc_groups?.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              Groups: {seg.filters.epc_groups.join(', ')}
                            </span>
                          )}
                          {seg.filters?.state_names?.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              States: {seg.filters.state_names.join(', ')}
                            </span>
                          )}
                          {seg.filters?.cluster_names?.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              Clusters: {seg.filters.cluster_names.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                        <button
                          type="button"
                          onClick={() => handleDeleteSegment(seg._id)}
                          className="text-rose-600 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FaTrashAlt /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'unsubscribed' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs overflow-hidden p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs">
                <input
                  type="email"
                  value={suppressForm.email}
                  onChange={(e) => setSuppressForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email to suppress"
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  value={suppressForm.phone}
                  onChange={(e) => setSuppressForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone / WhatsApp (+91...)"
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <select
                  value={suppressForm.channel}
                  onChange={(e) => setSuppressForm((p) => ({ ...p, channel: e.target.value }))}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="all">All Channels</option>
                  <option value="email">Email Only</option>
                  <option value="whatsapp">WhatsApp Only</option>
                </select>
                <input
                  type="text"
                  value={suppressForm.reason}
                  onChange={(e) => setSuppressForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason"
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  disabled={suppressSubmitting}
                  onClick={() => handleSuppressContact(suppressForm)}
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {suppressSubmitting ? 'Saving...' : 'Add Suppression'}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Opted Out At</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {unsubscribedList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No contacts are currently suppressed or unsubscribed.
                        </td>
                      </tr>
                    ) : (
                      unsubscribedList.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20">
                          <td className="p-3">
                            <div className="font-bold">{u.email || '—'}</div>
                            <div className="text-[11px] text-slate-500">{u.phone || '—'}</div>
                          </td>
                          <td className="p-3 uppercase font-bold text-[10px]">{u.channel || 'all'}</td>
                          <td className="p-3 text-[11px] text-slate-500">{u.source || 'link'}</td>
                          <td className="p-3 text-[11px]">{u.reason || 'User opt-out'}</td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {u.unsubscribed_at ? new Date(u.unsubscribed_at).toLocaleString('en-IN') : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleResubscribeContact(u)}
                              className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold cursor-pointer"
                            >
                              Restore / Resubscribe
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ===================== DYNAMIC CSV / EXCEL IMPORT MODAL ===================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <FaFileImport />
                </div>
                <div>
                  <h3 className="text-base font-bold">Import EPC Leads (Dynamic Field Mapping)</h3>
                  <p className="text-[11px] text-slate-500">Upload CSV / Excel with custom columns and map them dynamically without failure</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-5">
              
              {/* Step Progress Tabs */}
              <div className="flex items-center gap-2 text-xs font-bold border-b border-slate-100 dark:border-slate-700 pb-3">
                <span className={`px-3 py-1 rounded-full ${importStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  1. Select File
                </span>
                <FaArrowRight className="text-slate-400 text-[10px]" />
                <span className={`px-3 py-1 rounded-full ${importStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  2. Dynamic Column Mapping & Preview
                </span>
              </div>

              {/* STEP 1: FILE PICKER */}
              {importStep === 1 && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors">
                    <FaFileImport className="w-10 h-10 mx-auto text-blue-500 mb-3" />
                    <h4 className="text-sm font-bold mb-1">Select or drop your Lead CSV / XLSX file</h4>
                    <p className="text-xs text-slate-500 mb-4">
                      Any column names allowed! In the next step you can map your CSV column headers directly to system fields.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <label className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2 shadow-sm">
                        <span>Choose CSV File</span>
                        <input
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        className="px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold cursor-pointer transition-all inline-flex items-center gap-2"
                      >
                        <FaDownload className="text-emerald-600" />
                        <span>Download Sample CSV</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] text-slate-500 space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200">💡 Smart Header Matching:</span>
                    <p>The parser automatically matches common headers like "Company", "Firm Name", "GSTIN", "Mobile", "WhatsApp", "Orders" etc. You can freely change or add dynamic custom fields.</p>
                  </div>
                </div>
              )}

              {/* STEP 2: DYNAMIC COLUMN MAPPING & PREVIEW */}
              {importStep === 2 && (
                <div className="space-y-5 text-xs">
                  
                  {/* File Stats Summary Pill */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                    <div>
                      <strong className="text-blue-700 dark:text-blue-300 font-bold">{csvFileName}</strong>
                      <div className="text-[11px] text-slate-500">{rawCsvRows.length} total rows parsed • {csvHeaders.length} columns detected</div>
                    </div>
                    <button
                      onClick={() => setImportStep(1)}
                      className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  {/* Field Mapping Grid */}
                  <div>
                    <h4 className="font-bold text-sm mb-2 flex items-center justify-between">
                      <span>Dynamic Column Mapping</span>
                      <span className="text-[11px] text-slate-400 font-normal">Map each CSV header to the system field</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                      
                      {/* Company Name */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Company / Firm Name <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={fieldMappings.name}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Contact Person */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Contact Person Name
                        </label>
                        <select
                          value={fieldMappings.contactPerson}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, contactPerson: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Phone / WhatsApp */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Mobile / WhatsApp <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={fieldMappings.phone}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Email Address
                        </label>
                        <select
                          value={fieldMappings.email}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* GSTIN */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          GSTIN / Tax ID
                        </label>
                        <select
                          value={fieldMappings.gstin}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, gstin: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* State */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          State / Territory
                        </label>
                        <select
                          value={fieldMappings.state}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Cluster / District */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          District / Cluster / City
                        </label>
                        <select
                          value={fieldMappings.cluster}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, cluster: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Lifetime Orders / Past Purchases */}
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Past Orders Count (Lifetime Kits)
                        </label>
                        <select
                          value={fieldMappings.lifetimeOrders}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, lifetimeOrders: e.target.value }))}
                          className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                        >
                          <option value="">-- Select CSV Column (Optional) --</option>
                          {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* Add Dynamic Custom Fields Configurator */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                        Additional Dynamic Custom Fields ({customFields.length})
                      </span>
                      <button
                        onClick={handleAddCustomField}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                      >
                        <FaPlus className="w-2.5 h-2.5" /> Add Custom Field
                      </button>
                    </div>

                    {customFields.length > 0 && (
                      <div className="space-y-2">
                        {customFields.map((cf) => (
                          <div key={cf.key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={cf.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomFields(prev => prev.map(f => f.key === cf.key ? { ...f, label: val } : f));
                              }}
                              placeholder="Field Name"
                              className="w-1/2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            />
                            <select
                              value={cf.csvHeader}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomFields(prev => prev.map(f => f.key === cf.key ? { ...f, csvHeader: val } : f));
                              }}
                              className="w-1/2 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            >
                              <option value="">-- Select CSV Header --</option>
                              {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            <button
                              onClick={() => handleRemoveCustomField(cf.key)}
                              className="text-red-500 hover:text-red-700 p-1.5"
                              title="Delete Field"
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Live Preview Table with Auto EPC Classification */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
                      Live Mapped Data Preview (First {mappedPreviewData.length} Rows)
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400">
                          <tr>
                            <th className="p-2 pl-3">Company</th>
                            <th className="p-2">Contact</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">GSTIN</th>
                            <th className="p-2">Orders</th>
                            <th className="p-2 pr-3">Auto Classification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {mappedPreviewData.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-2 pl-3 font-semibold">{row.name}</td>
                              <td className="p-2 text-slate-500">{row.contactPerson}</td>
                              <td className="p-2 font-mono">{row.phone || 'N/A'}</td>
                              <td className="p-2 font-mono">{row.gstin || 'None'}</td>
                              <td className="p-2 font-bold">{row.lifetimeOrders} Kits</td>
                              <td className="p-2 pr-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.type === 'Buyer EPC'
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : row.type === 'Verified EPC'
                                      ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                  {row.type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Success / Error Alerts */}
                  {importSuccessMessage && (
                    <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-2">
                      <FaCheck /> {importSuccessMessage}
                    </div>
                  )}
                  {importErrorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-2">
                      <FaExclamationTriangle /> {importErrorMessage}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              {importStep === 2 && (
                <button
                  disabled={importing}
                  onClick={handleUploadAndProcess}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <FaSyncAlt className="animate-spin" />
                      <span>Processing & Classifying...</span>
                    </>
                  ) : (
                    <>
                      <FaCheck />
                      <span>Upload & Process ({rawCsvRows.length} Leads)</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ===================== CREATE DYNAMIC SEGMENT MODAL ===================== */}
      {showSegmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form onSubmit={handleSaveSegment} className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold">Create Dynamic Segment</h3>
              <button type="button" onClick={() => setShowSegmentModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <FaTimes />
              </button>
            </div>
            <div className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Segment Name *</label>
                <input
                  type="text"
                  required
                  value={segmentForm.name}
                  onChange={(e) => setSegmentForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., High-Value Maharashtra EPCs (5+ Orders)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={segmentForm.description}
                  onChange={(e) => setSegmentForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional segment notes..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Target EPC Type</label>
                  <select
                    value={segmentForm.epcGroup}
                    onChange={(e) => setSegmentForm((p) => ({ ...p, epcGroup: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="ALL">All Types</option>
                    <option value="buyer">Buyer EPCs Only</option>
                    <option value="verified">Verified EPCs Only</option>
                    <option value="registered">Registered EPCs Only</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Minimum Order Count</label>
                  <input
                    type="number"
                    min={0}
                    value={segmentForm.minOrders}
                    onChange={(e) => setSegmentForm((p) => ({ ...p, minOrders: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">State Filter (Optional)</label>
                  <select
                    value={segmentForm.stateName}
                    onChange={(e) => setSegmentForm((p) => ({ ...p, stateName: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">All States</option>
                    {availableStates.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Cluster Filter (Optional)</label>
                  <select
                    value={segmentForm.clusterName}
                    onChange={(e) => setSegmentForm((p) => ({ ...p, clusterName: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">All Clusters</option>
                    {availableClusters.map((cl) => <option key={cl} value={cl}>{cl}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={segmentForm.requireConsent}
                  onChange={(e) => setSegmentForm((p) => ({ ...p, requireConsent: e.target.checked }))}
                />
                <span>Only include marketing opt-in consented EPCs</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowSegmentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSegment}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {savingSegment ? 'Saving...' : 'Save Segment'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
