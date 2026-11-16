import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { useLoadScript } from '@react-google-maps/api';
import { authHeaderObj } from '@/app/authHeader';
import { setAlert } from '@/features/alert.slice';
import {
  FiMap,
  FiMapPin,
  FiFilter,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiFileText,
  FiTool,
  FiPlus,
  FiLayers,
  FiX,
  FiArrowRight,
  FiAward,
  FiPackage,
  FiShield,
  FiChevronRight,
  FiUser,
} from 'react-icons/fi';
import UniversalMap from '@/components/UniversalMap';
import Loader from '@/components/Loader';
import Button from '@/components/Button';
import IndiaChoroplethMap from './components/IndiaChoroplethMap';

export default function FranchiseeTerritoryMap({ onCreateClusterFromDistrict }) {
  const dispatch = useDispatch();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  // Map Data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_districts: 0,
    coverage_percentage: 0,
    allotted_districts: 0,
    available_districts: 0,
    in_progress_districts: 0,
    company_store_districts: 0,
    unconfigured_districts: 0,
  });
  const [districts, setDistricts] = useState([]);
  const [boundaries, setBoundaries] = useState([]);

  // States & Clusters Dropdown
  const [states, setStates] = useState([]);
  const [clustersList, setClustersList] = useState([]);
  const [bdesList, setBdesList] = useState([]);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBde, setSelectedBde] = useState('');
  const [searchDistrict, setSearchDistrict] = useState('');

  // Map Provider View: 'vector' (Screenshot 2 Thematic Vector Map) | 'google' (Google Maps)
  const [mapProvider, setMapProvider] = useState('vector');

  // Dual Map View Mode: 'clusters' (Map 1: Created Clusters) | 'franchisees' (Map 2: Onboarded Franchisees)
  const [mapViewMode, setMapViewMode] = useState('clusters');

  // Compute selected state name for auto-zoom in Vector Map
  const selectedStateName = useMemo(() => {
    if (!selectedState) return '';
    const st = states.find((s) => String(s._id || s.id) === String(selectedState));
    return st?.name || st?.state_name || '';
  }, [selectedState, states]);

  // Selected District Popup / Drawer State
  const [selectedDistrictDetail, setSelectedDistrictDetail] = useState(null);
  const [loadingPopup, setLoadingPopup] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Explorer View Tab: 'clusters' (default) | 'unassigned'
  const [explorerTab, setExplorerTab] = useState('clusters');

  // Selected Cluster Drawer State
  const [selectedClusterDetail, setSelectedClusterDetail] = useState(null);
  const [loadingClusterDetail, setLoadingClusterDetail] = useState(false);
  const [isClusterDrawerOpen, setIsClusterDrawerOpen] = useState(false);

  // Initial Data Load
  useEffect(() => {
    fetchStates();
    fetchFilterMasters();
  }, []);

  // Fetch Map Data whenever State or Cluster or BDE or Status changes
  useEffect(() => {
    fetchMapData();
  }, [selectedState, selectedCluster, selectedStatus, selectedBde]);

  const fetchStates = async () => {
    try {
      let res = await axios.get(`${API_URL}/franchise-clusters/states`, authHeaderObj()).catch(() => null);
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/geolocation/get-states`, authHeaderObj()).catch(() => null);
      }
      if (!res || !res.data?.data) {
        res = await axios.get(`${API_URL}/geolocation/states`, authHeaderObj()).catch(() => null);
      }
      const list = res?.data?.states || res?.data?.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setStates(list);
      }
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  const fetchFilterMasters = async () => {
    try {
      const [cluRes, bdeRes] = await Promise.all([
        axios.get(`${API_URL}/franchise-clusters/list`, authHeaderObj()).catch(() => ({ data: { data: [] } })),
        axios
          .get(`${API_URL}/franchise-clusters/bdes`, authHeaderObj())
          .catch(() => axios.get(`${API_URL}/franchise-clusters/bde/mappings`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, authHeaderObj()))
          .catch(() => axios.get(`${API_URL}/bde/list?unique_id=ADM_BDE_MGMT&req_for=view&limit=500`, authHeaderObj())),
      ]);
      if (cluRes?.data?.data) setClustersList(cluRes.data.data);
      const bList = bdeRes?.data?.data || bdeRes?.data?.bdes || [];
      if (Array.isArray(bList)) setBdesList(bList);
    } catch (err) {
      console.error('Error loading masters for map:', err);
    }
  };

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedState) params.append('state_id', selectedState);
      if (selectedCluster) params.append('cluster_id', selectedCluster);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedBde) params.append('bde_id', selectedBde);

      const res = await axios.get(
        `${API_URL}/franchise-clusters/map/territory-overview?${params.toString()}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        setSummary(res.data.summary || {});
        setDistricts(res.data.data?.districts || []);
        setBoundaries(res.data.data?.boundaries || []);
      }
    } catch (err) {
      console.error('Error loading territory map data:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load map data', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  // Click on District to view details popup
  const handleDistrictClick = async (districtId) => {
    setIsPopupOpen(true);
    setLoadingPopup(true);
    try {
      const res = await axios.get(
        `${API_URL}/franchise-clusters/map/district-popup/${districtId}`,
        authHeaderObj()
      );
      if (res.data?.status === 'success') {
        setSelectedDistrictDetail(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching district popup details:', err);
      dispatch(setAlert({ title: 'Error', message: 'Failed to load district details', type: 'error' }));
    } finally {
      setLoadingPopup(false);
    }
  };

  // Convert district points to map markers for UniversalMap
  const mapMarkers = useMemo(() => {
    return districts
      .filter((d) => d.lat && d.lng && (!searchDistrict || d.district_name.toLowerCase().includes(searchDistrict.toLowerCase())))
      .map((d) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        title: `${d.district_name} (${d.status_label})`,
        color: d.color,
        district_id: d.id,
      }));
  }, [districts, searchDistrict]);

  // Center coordinate (India default: [20.5937, 78.9629])
  const mapCenter = useMemo(() => {
    if (districts.length > 0 && districts[0].lat && districts[0].lng) {
      return { lat: districts[0].lat, lng: districts[0].lng };
    }
    return { lat: 22.5, lng: 78.9 };
  }, [districts]);

  // Cluster Status Configuration Helper (Labels, Colors, Badges)
  const getClusterStatusConfig = (status) => {
    switch (status) {
      case 'allotted':
        return {
          label: 'Allotted & Active',
          dotColor: '#10b981',
          color: '#065f46',
          bg: '#d1fae5',
          border: '#a7f3d0',
        };
      case 'reserved':
        return {
          label: 'In Progress / Reserved',
          dotColor: '#f59e0b',
          color: '#92400e',
          bg: '#fef3c7',
          border: '#fde68a',
        };
      case 'available':
        return {
          label: 'Available (Pending)',
          dotColor: '#ef4444',
          color: '#991b1b',
          bg: '#fee2e2',
          border: '#fca5a5',
        };
      default:
        return {
          label: 'Inactive / Unconfigured',
          dotColor: '#94a3b8',
          color: '#475569',
          bg: '#f1f5f9',
          border: '#cbd5e1',
        };
    }
  };

  // Filtered clusters matching all top bar controls (state, status, bde, search)
  const filteredClusters = useMemo(() => {
    return clustersList.filter((c) => {
      // 1. State filter
      if (selectedState) {
        const cStateId = c.state_id?._id || c.state_id;
        if (String(cStateId) !== String(selectedState)) return false;
      }
      // 2. Cluster dropdown filter
      if (selectedCluster && String(c._id) !== String(selectedCluster)) {
        return false;
      }
      // 3. Status filter
      if (selectedStatus && selectedStatus !== 'all') {
        if (c.status !== selectedStatus) return false;
      }
      // 4. BDE filter
      if (selectedBde) {
        const primaryId = c.primary_bde_id?._id || c.primary_bde_id;
        const supportIds = (c.support_bde_ids || []).map((s) => s._id || s);
        if (String(primaryId) !== String(selectedBde) && !supportIds.some((sId) => String(sId) === String(selectedBde))) {
          return false;
        }
      }
      // 5. Search filter (cluster name, code, state, franchisee name, member district names)
      if (searchDistrict && searchDistrict.trim()) {
        const q = searchDistrict.toLowerCase().trim();
        const nameMatch = (c.cluster_name || '').toLowerCase().includes(q);
        const codeMatch = (c.cluster_code || '').toLowerCase().includes(q);
        const stateMatch = (c.state_name || c.state_id?.name || '').toLowerCase().includes(q);
        const fNameMatch = (c.assigned_franchisee_id?.business_name || '').toLowerCase().includes(q);
        const dNamesMatch =
          (c.district_names || []).some((dn) => (dn || '').toLowerCase().includes(q)) ||
          (c.district_ids || []).some((d) => (d?.name || '').toLowerCase().includes(q));
        if (!nameMatch && !codeMatch && !stateMatch && !fNameMatch && !dNamesMatch) return false;
      }
      return true;
    });
  }, [clustersList, selectedState, selectedCluster, selectedStatus, selectedBde, searchDistrict]);

  // Total unique districts covered across filtered clusters
  const totalDistrictsInClusters = useMemo(() => {
    const set = new Set();
    filteredClusters.forEach((c) => {
      (c.district_ids || []).forEach((d) => set.add(String(d._id || d)));
    });
    return set.size;
  }, [filteredClusters]);

  // Unassigned / unclustered districts for secondary explorer tab
  const unassignedDistricts = useMemo(() => {
    return districts.filter((d) => {
      if (d.cluster_id) return false;
      if (searchDistrict && !d.district_name.toLowerCase().includes(searchDistrict.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [districts, searchDistrict]);

  // Handle clicking on a Cluster in the Explorer
  const handleClusterSelect = async (cluster) => {
    const isAlreadySelected = String(cluster._id) === String(selectedCluster);
    if (isAlreadySelected) {
      setSelectedCluster('');
      setSelectedClusterDetail(null);
      setIsClusterDrawerOpen(false);
      return;
    }

    setSelectedCluster(cluster._id);
    if (cluster.state_id?._id || cluster.state_id) {
      const stId = String(cluster.state_id?._id || cluster.state_id);
      if (!selectedState || selectedState !== stId) {
        setSelectedState(stId);
      }
    }

    setIsClusterDrawerOpen(true);
    setLoadingClusterDetail(true);
    try {
      const res = await axios.get(`${API_URL}/franchise-clusters/${cluster._id}`, authHeaderObj());
      if (res.data?.status === 'success') {
        setSelectedClusterDetail(res.data.data);
      } else {
        setSelectedClusterDetail(cluster);
      }
    } catch (err) {
      console.error('Error fetching cluster detail:', err);
      setSelectedClusterDetail(cluster);
    } finally {
      setLoadingClusterDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section 2.3: Dashboard Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* All India Territory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500">All India Coverage</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
              {summary.coverage_percentage || 0}% Coverage
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{summary.total_districts || 0}</span>
            <span className="text-xs font-bold text-slate-500">Total Districts</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Territory allocation across all states</p>
          <div className="absolute top-0 left-0 h-1 bg-slate-800 w-full" />
        </div>

        {/* Allotted & Active (Green) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-emerald-700">Allotted & Active</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{summary.allotted_districts || 0}</span>
            <span className="text-xs font-bold text-slate-500">Active Districts</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Active Franchisee Stores operating</p>
          <div className="absolute top-0 left-0 h-1 bg-emerald-500 w-full" />
        </div>

        {/* Available – Franchisee Pending (Red) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-red-700">Available Districts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">{summary.available_districts || 0}</span>
            <span className="text-xs font-bold text-slate-500">Pending Districts</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Open for Franchisee Onboarding</p>
          <div className="absolute top-0 left-0 h-1 bg-red-500 w-full" />
        </div>

        {/* In Progress / Reserved (Yellow) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-amber-700">In Progress / Reserved</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{summary.in_progress_districts || 0}</span>
            <span className="text-xs font-bold text-slate-500">Reserved Areas</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Applications & territory reserving</p>
          <div className="absolute top-0 left-0 h-1 bg-amber-500 w-full" />
        </div>
      </div>

      {/* ── Section 2.1: Filter Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        {/* State Filter */}
        <div>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedCluster('');
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Indian States</option>
            {states.map((st) => (
              <option key={st._id || st.id} value={st._id || st.id}>
                {st.name || st.state_name}
              </option>
            ))}
          </select>
        </div>

        {/* Cluster Filter */}
        <div>
          <select
            value={selectedCluster}
            onChange={(e) => setSelectedCluster(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Clusters</option>
            {clustersList
              .filter((c) => !selectedState || String(c.state_id?._id || c.state_id) === selectedState)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.cluster_name} ({c.cluster_code})
                </option>
              ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Allocation Statuses</option>
            <option value="allotted">🟢 Franchisee Allotted & Active</option>
            <option value="reserved">🟡 In Progress / Reserved</option>
            <option value="available">🔴 Available District – Pending</option>
            <option value="inactive">⚪ Inactive / Unconfigured</option>
          </select>
        </div>

        {/* BDE Filter */}
        <div>
          <select
            value={selectedBde}
            onChange={(e) => setSelectedBde(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Assigned BDEs</option>
            {bdesList.map((b) => (
              <option key={b._id || b.id || b.bde_id} value={b._id || b.id || b.bde_id}>
                {b.full_name || b.name} {b.bde_id || b.bde_code || b.employee_id ? `(${b.bde_id || b.bde_code || b.employee_id})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Search Cluster / District */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search cluster, district, or franchisee..."
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* ── Section 2.2: Dynamic Map Mode Banner & Legend ───────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
        {mapViewMode === 'clusters' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200 uppercase flex items-center gap-1">
                <FiLayers size={11} /> Map 1: Created Clusters View
              </span>
              <span className="text-slate-500 font-medium">
                Each created cluster territory is filled with a distinct solid color across all its member districts.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 border border-slate-300" />
                <span>Colored Area: Created Cluster</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
                <span>White / Grey: Unassigned District</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
                <FiShield size={11} /> Map 2: Onboarded Franchisees View
              </span>
              <span className="text-slate-500 font-medium">
                Colors indicate live onboarded stores and operational reservation status.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                <span>Green: Allotted & Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-200" />
                <span>Yellow: Reserved / In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
                <span>Red: Available – Franchisee Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-200" />
                <span>Grey: Unassigned</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Map Container & Interactive Districts Grid ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[600px] relative flex flex-col">
          {/* Map Header Toolbar with View Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 z-10 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <FiMap size={14} className="text-orange-500" />
                Territory Map Visualizer
              </span>
              {selectedStateName && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                  Focus: {selectedStateName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Dual Map View Switcher */}
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMapViewMode('clusters')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${mapViewMode === 'clusters'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  title="View all created clusters with distinct cluster territory colors"
                >
                  <FiLayers size={13} />
                  <span>Map 1: Created Clusters</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapViewMode('franchisees')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${mapViewMode === 'franchisees'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  title="View clusters with onboarded active franchisees"
                >
                  <FiShield size={13} />
                  <span>Map 2: Onboarded Franchisees</span>
                </button>
              </div>

              {/* Provider Switcher */}
              <div className="hidden sm:flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMapProvider('vector')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${mapProvider === 'vector'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Vector
                </button>
                <button
                  type="button"
                  onClick={() => setMapProvider('google')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${mapProvider === 'google'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  Google Map
                </button>
              </div>
            </div>
          </div>

          {/* Map View Body */}
          <div className="relative flex-1 w-full overflow-hidden">
            {mapProvider === 'vector' ? (
              <IndiaChoroplethMap
                districtsData={districts}
                activeFranchiseeLegends={summary.active_franchisee_legends || []}
                clustersList={clustersList}
                mapViewMode={mapViewMode}
                selectedState={selectedStateName}
                selectedCluster={selectedCluster}
                selectedStatus={selectedStatus}
                selectedBde={selectedBde}
                searchDistrict={searchDistrict}
                onDistrictClick={handleDistrictClick}
              />
            ) : loading || !isMapLoaded ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                <Loader text={!isMapLoaded ? 'Loading Google Maps...' : 'Rendering India Territory Map...'} />
              </div>
            ) : mapLoadError ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center bg-slate-50">
                <FiAlertCircle size={32} className="text-amber-500" />
                <p className="font-bold text-slate-700">Google Map Notice</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Google Maps could not be initialized directly. Please use the India Vector Map view.
                </p>
              </div>
            ) : (
              <UniversalMap
                center={mapCenter}
                zoom={selectedState ? 7 : 5}
                boundaries={boundaries}
                onBoundaryClick={(boundary) => {
                  if (boundary?.id) handleDistrictClick(boundary.id);
                }}
                mapOptions={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                }}
              />
            )}
          </div>
        </div>

        {/* ── Clusters Territory Explorer (Replaces Districts Quick Browser) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FiLayers className="text-orange-500" size={16} />
                Clusters Territory Explorer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredClusters.length} Clusters • {totalDistrictsInClusters} Districts covered
              </p>
            </div>
            {onCreateClusterFromDistrict && (
              <button
                type="button"
                onClick={() => onCreateClusterFromDistrict()}
                className="px-2.5 py-1 text-[11px] font-bold bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 rounded-lg flex items-center gap-1 transition-all"
                title="Create New Cluster in Hub"
              >
                <FiPlus size={13} />
                <span>New</span>
              </button>
            )}
          </div>

          {/* Sub-Tabs: Clusters vs Unassigned Districts */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl my-2.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setExplorerTab('clusters')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${explorerTab === 'clusters'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <FiLayers size={13} />
              <span>Clusters ({filteredClusters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setExplorerTab('unassigned')}
              className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${explorerTab === 'unassigned'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <FiMapPin size={13} />
              <span>Unassigned ({unassignedDistricts.length})</span>
            </button>
          </div>

          {/* List Area */}
          <div className="mt-1 flex-1 overflow-y-auto space-y-2 pr-1">
            {explorerTab === 'clusters' ? (
              filteredClusters.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                  <FiLayers size={36} className="text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700 text-xs">No clusters match current filters</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Try clearing state or status filters to view all clusters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('');
                      setSelectedCluster('');
                      setSelectedStatus('all');
                      setSelectedBde('');
                      setSearchDistrict('');
                    }}
                    className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredClusters.map((cluster) => {
                  const isSelected = String(cluster._id) === String(selectedCluster);
                  const statusConfig = getClusterStatusConfig(cluster.status);
                  const franchisee = cluster.assigned_franchisee_id;
                  const bde = cluster.primary_bde_id;
                  const districtNames =
                    cluster.district_names ||
                    (cluster.district_ids || []).map((d) => (typeof d === 'string' ? d : d?.name)).filter(Boolean);
                  const districtCount = districtNames.length;

                  return (
                    <div
                      key={cluster._id}
                      onClick={() => handleClusterSelect(cluster)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${isSelected
                          ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-400/30 shadow-xs'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                    >
                      {/* Top Row: Name, Status & Code */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: statusConfig.dotColor }}
                            />
                            <span className="truncate">{cluster.cluster_name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                            <span className="font-mono text-slate-700 font-bold px-1.5 py-0.2 bg-slate-100 rounded text-[10px]">
                              {cluster.cluster_code}
                            </span>
                            <span>•</span>
                            <span className="truncate">{cluster.state_name || cluster.state_id?.name || 'India'}</span>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border"
                          style={{
                            backgroundColor: statusConfig.bg,
                            color: statusConfig.color,
                            borderColor: statusConfig.border,
                          }}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Middle Row: Franchisee Store */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate">
                          <FiShield size={12} className={franchisee ? 'text-emerald-500' : 'text-slate-400'} />
                          <span className="truncate text-[11px]">
                            {franchisee?.business_name ? (
                              <strong className="text-slate-800">{franchisee.business_name}</strong>
                            ) : (
                              <span className="text-slate-400 italic">No Franchisee Assigned</span>
                            )}
                          </span>
                        </div>
                        {bde?.full_name && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            BDE: {bde.full_name.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Covered Districts Preview & Quick Action */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-1 truncate max-w-[82%]">
                          <span className="font-extrabold text-slate-700 bg-orange-100/70 text-orange-800 text-[10px] px-1.5 py-0.2 rounded font-mono">
                            {districtCount} {districtCount === 1 ? 'District' : 'Districts'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {districtNames.slice(0, 3).join(', ')}
                            {districtCount > 3 ? ` +${districtCount - 3} more` : ''}
                          </span>
                        </div>
                        <FiChevronRight
                          className={`text-slate-300 transition-transform ${isSelected ? 'text-orange-500 translate-x-0.5' : 'group-hover:text-slate-600'
                            }`}
                          size={14}
                        />
                      </div>
                    </div>
                  );
                })
              )
            ) : unassignedDistricts.length === 0 ? (
              <div className="py-16 text-center p-4 text-slate-400">
                <FiCheckCircle size={36} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-xs">All matching districts are assigned to clusters!</p>
              </div>
            ) : (
              unassignedDistricts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDistrictClick(d.id)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      {d.district_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Unconfigured • {d.state_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      + Create Cluster
                    </span>
                    <FiChevronRight className="text-slate-300 group-hover:text-slate-600" size={14} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2.4: District Details Popup (Right Drawer) ──────────────── */}
      {isPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                  style={{ backgroundColor: selectedDistrictDetail?.color || '#f97316' }}
                >
                  <FiMapPin size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {selectedDistrictDetail?.district_name || 'District Details'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedDistrictDetail?.state_name} Territory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPopupOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {loadingPopup || !selectedDistrictDetail ? (
                <div className="py-20 flex justify-center">
                  <Loader text="Loading district allocation details..." />
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div
                    className="p-3.5 rounded-xl border flex items-center justify-between"
                    style={{
                      backgroundColor: `${selectedDistrictDetail.color}10`,
                      borderColor: `${selectedDistrictDetail.color}30`,
                    }}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Franchisee Status</div>
                      <div className="font-black text-sm" style={{ color: selectedDistrictDetail.color }}>
                        {selectedDistrictDetail.franchisee_status}
                      </div>
                    </div>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedDistrictDetail.color }} />
                  </div>

                  {/* 1. Cluster Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiLayers size={13} className="text-orange-500" /> Cluster Information
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">Cluster Name</span>
                      <span className="font-bold text-slate-900 text-xs">{selectedDistrictDetail.cluster_name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">Cluster Code</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{selectedDistrictDetail.cluster_code}</span>
                    </div>
                  </div>

                  {/* 2. Assigned Franchisee Store */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiShield size={13} className="text-blue-500" /> Assigned Franchisee Store
                    </div>
                    {selectedDistrictDetail.franchisee ? (
                      <>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {selectedDistrictDetail.franchisee.business_name}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <FiPhone size={12} className="text-slate-400" /> {selectedDistrictDetail.franchisee.mobile}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <FiMail size={12} className="text-slate-400" /> {selectedDistrictDetail.franchisee.email}
                        </div>
                        {selectedDistrictDetail.franchisee.gst_number && (
                          <div className="text-xs text-slate-600 font-mono font-semibold">
                            GSTIN: {selectedDistrictDetail.franchisee.gst_number}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs italic text-slate-400 py-1">No active franchisee mapped to this district.</div>
                    )}
                  </div>

                  {/* 3. Assigned BDE Contact */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiAward size={13} className="text-purple-500" /> Assigned BDE Support
                    </div>
                    {selectedDistrictDetail.bde ? (
                      <>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {selectedDistrictDetail.bde.full_name} ({selectedDistrictDetail.bde.bde_id})
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <FiPhone size={12} className="text-slate-400" /> {selectedDistrictDetail.bde.mobile_number}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <FiMail size={12} className="text-slate-400" /> {selectedDistrictDetail.bde.email}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs italic text-slate-400 py-1">No BDE assigned for this cluster.</div>
                    )}
                  </div>

                  {/* 4. Setup Fee & Agreement Validity */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiDollarSign size={13} className="text-emerald-500" /> Setup Fee & Agreement
                    </div>
                    {selectedDistrictDetail.setup_fee_config && (
                      <div className="flex justify-between py-1 border-b border-slate-200/50">
                        <span className="text-slate-500">Total Setup Fee</span>
                        <span className="font-black text-slate-900">
                          ₹{selectedDistrictDetail.setup_fee_config.total_payable.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    {selectedDistrictDetail.agreement ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-500">Agreement No.</span>
                          <span className="font-bold text-slate-900">{selectedDistrictDetail.agreement.agreement_number}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-500">Validity</span>
                          <span className="font-bold text-slate-900">
                            {new Date(selectedDistrictDetail.agreement.start_date).toLocaleDateString()} –{' '}
                            {new Date(selectedDistrictDetail.agreement.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 italic py-1">No agreement active for this territory.</div>
                    )}
                  </div>

                  {/* 5. Performance Goals & Open Tickets */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
                    <div className="font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiPackage size={13} className="text-orange-500" /> Performance & Support
                    </div>

                    {/* EPC Onboarding */}
                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Annual EPC Onboarding</span>
                        <span className="text-orange-600">
                          {selectedDistrictDetail.performance.actual_epcs} / {selectedDistrictDetail.performance.annual_epc_goal} (
                          {selectedDistrictDetail.performance.epc_achievement_pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-orange-500 h-1.5 rounded-full"
                          style={{ width: `${selectedDistrictDetail.performance.epc_achievement_pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Monthly Kit Sales */}
                    <div>
                      <div className="flex justify-between font-bold text-slate-700 mb-1">
                        <span>Monthly Kit Sales</span>
                        <span className="text-emerald-600">
                          {selectedDistrictDetail.performance.actual_kit_sales} / {selectedDistrictDetail.performance.monthly_kit_target} Kits (
                          {selectedDistrictDetail.performance.kit_achievement_pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${selectedDistrictDetail.performance.kit_achievement_pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Open Tickets */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <FiTool size={12} className="text-slate-400" /> Open Tickets
                      </span>
                      <span className="font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {selectedDistrictDetail.open_tickets_count} Tickets
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              {selectedDistrictDetail?.status_key === 'red' || selectedDistrictDetail?.status_key === 'grey' ? (
                <Button
                  onClick={() => {
                    setIsPopupOpen(false);
                    if (onCreateClusterFromDistrict) {
                      onCreateClusterFromDistrict(selectedDistrictDetail);
                    }
                  }}
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs"
                >
                  <FiPlus size={15} /> Create Cluster from this District
                </Button>
              ) : (
                <Button
                  onClick={() => setIsPopupOpen(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
                >
                  Close Inspection
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2.5: Cluster Details Drawer (Right Slide-over) ────────── */}
      {isClusterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white bg-orange-600 shadow-xs">
                  <FiLayers size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {selectedClusterDetail?.cluster_name || 'Cluster Details'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedClusterDetail?.cluster_code} • {selectedClusterDetail?.state_name || selectedClusterDetail?.state_id?.name || 'India'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClusterDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {loadingClusterDetail || !selectedClusterDetail ? (
                <div className="py-20 flex justify-center">
                  <Loader text="Loading cluster details..." />
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  {(() => {
                    const st = getClusterStatusConfig(selectedClusterDetail.status);
                    return (
                      <div
                        className="p-3.5 rounded-xl border flex items-center justify-between"
                        style={{
                          backgroundColor: st.bg,
                          borderColor: st.border,
                        }}
                      >
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: st.color }}>
                            Cluster Status
                          </div>
                          <div className="font-black text-sm" style={{ color: st.color }}>
                            {st.label}
                          </div>
                        </div>
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.dotColor }} />
                      </div>
                    );
                  })()}

                  {/* 1. Cluster Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiLayers size={13} className="text-orange-500" /> Cluster Information
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">Cluster Code</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">{selectedClusterDetail.cluster_code}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">State / Region</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {selectedClusterDetail.state_name || selectedClusterDetail.state_id?.name || 'All India'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">Agreement Duration</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {selectedClusterDetail.agreement_duration_years || 2} Years
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/50">
                      <span className="text-slate-500 text-xs">Payment Status</span>
                      <span className="font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-slate-200/70 text-slate-800">
                        {selectedClusterDetail.payment_status || 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* 2. Assigned Franchisee Store */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiShield size={13} className="text-blue-500" /> Assigned Franchisee Store
                    </div>
                    {selectedClusterDetail.assigned_franchisee_id ? (
                      <>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {selectedClusterDetail.assigned_franchisee_id.business_name}
                        </div>
                        {selectedClusterDetail.assigned_franchisee_id.mobile && (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <FiPhone size={12} className="text-slate-400" /> {selectedClusterDetail.assigned_franchisee_id.mobile}
                          </div>
                        )}
                        {selectedClusterDetail.assigned_franchisee_id.email && (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <FiMail size={12} className="text-slate-400" /> {selectedClusterDetail.assigned_franchisee_id.email}
                          </div>
                        )}
                        {selectedClusterDetail.assigned_franchisee_id.gst_number && (
                          <div className="text-xs text-slate-600 font-mono font-semibold">
                            GSTIN: {selectedClusterDetail.assigned_franchisee_id.gst_number}
                          </div>
                        )}
                        {selectedClusterDetail.assigned_franchisee_id.store_category && (
                          <div className="text-xs text-slate-500">
                            Category: <span className="font-bold uppercase">{selectedClusterDetail.assigned_franchisee_id.store_category}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs italic text-slate-400 py-1">
                        No active franchisee mapped to this cluster yet. Available for onboarding.
                      </div>
                    )}
                  </div>

                  {/* 3. Covered Districts in Cluster */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                        <FiMapPin size={13} className="text-emerald-500" /> Covered Districts
                      </div>
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-100/70 px-2 py-0.5 rounded-full font-mono">
                        {(selectedClusterDetail.district_names || selectedClusterDetail.district_ids || []).length} Districts
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(
                        selectedClusterDetail.district_names ||
                        (selectedClusterDetail.district_ids || []).map((d) => (typeof d === 'string' ? d : d?.name)) ||
                        []
                      ).map((dName, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-1"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {typeof dName === 'string' ? dName : dName?.name || 'District'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 4. Commercials & Setup Fees */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiDollarSign size={13} className="text-emerald-500" /> Setup Fee & Commercials
                    </div>
                    {selectedClusterDetail.setup_fee_config ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-500">Base Franchisee Fee</span>
                          <span className="font-bold text-slate-900">
                            ₹{(selectedClusterDetail.setup_fee_config.base_franchisee_fee || 100000).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-500">Annual Renewal Fee</span>
                          <span className="font-bold text-slate-900">
                            ₹{(selectedClusterDetail.setup_fee_config.renewal_fee_annual || 10000).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50">
                          <span className="text-slate-500">Security Deposit</span>
                          <span className="font-bold text-slate-900">
                            ₹{(selectedClusterDetail.setup_fee_config.security_deposit || 25000).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/50 font-black">
                          <span className="text-slate-700">Total Setup Payable</span>
                          <span className="text-emerald-600 text-sm">
                            ₹{(selectedClusterDetail.setup_fee_config.total_payable || 135000).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1 font-black">
                        <span className="text-slate-700">Standard Setup Fee</span>
                        <span className="text-emerald-600">₹1,35,000</span>
                      </div>
                    )}
                  </div>

                  {/* 5. Assigned BDE Support */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                      <FiAward size={13} className="text-purple-500" /> Assigned BDE Support
                    </div>
                    {selectedClusterDetail.primary_bde_id ? (
                      <>
                        <div className="font-extrabold text-slate-900 text-sm">
                          {selectedClusterDetail.primary_bde_id.full_name} ({selectedClusterDetail.primary_bde_id.bde_id || 'BDE'})
                        </div>
                        {selectedClusterDetail.primary_bde_id.mobile_number && (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <FiPhone size={12} className="text-slate-400" /> {selectedClusterDetail.primary_bde_id.mobile_number}
                          </div>
                        )}
                        {selectedClusterDetail.primary_bde_id.email && (
                          <div className="text-xs text-slate-600 flex items-center gap-1.5">
                            <FiMail size={12} className="text-slate-400" /> {selectedClusterDetail.primary_bde_id.email}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs italic text-slate-400 py-1">No BDE assigned for this cluster.</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-2">
              {onCreateClusterFromDistrict && (
                <Button
                  onClick={() => {
                    setIsClusterDrawerOpen(false);
                    onCreateClusterFromDistrict();
                  }}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FiLayers size={14} /> Open in Cluster Hub
                </Button>
              )}
              <Button
                onClick={() => setIsClusterDrawerOpen(false)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
