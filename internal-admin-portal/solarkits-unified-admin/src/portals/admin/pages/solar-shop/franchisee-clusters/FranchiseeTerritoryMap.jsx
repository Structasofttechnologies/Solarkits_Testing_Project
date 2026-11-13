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

        {/* Quick Search District */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search district name..."
            value={searchDistrict}
            onChange={(e) => setSearchDistrict(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* ── Section 2.2: Map Colour Legend ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xs">
        <span className="text-slate-400 font-black uppercase tracking-wider text-[11px]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
          <span>Green: Allotted & Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-200" />
          <span>Yellow: Application in Progress / Reserved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200" />
          <span>Red: Available – Franchisee Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 ring-2 ring-blue-200" />
          <span>Blue: Company-Owned Store</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-400 ring-2 ring-slate-200" />
          <span>Grey: Inactive / Unconfigured</span>
        </div>
      </div>

      {/* ── Map Container & Interactive Districts Grid ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-[600px] relative flex flex-col">
          {/* Map Header Toolbar with View Mode Switcher */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
                <FiMap size={14} className="text-orange-500" />
                Territory Map Visualizer
              </span>
              {selectedStateName && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200">
                  Focus: {selectedStateName}
                </span>
              )}
            </div>

            {/* Provider Switcher */}
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setMapProvider('vector')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapProvider === 'vector'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FiLayers size={13} />
                <span>India Vector Map (Screenshot 2)</span>
              </button>
              <button
                type="button"
                onClick={() => setMapProvider('google')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mapProvider === 'google'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FiMapPin size={13} />
                <span>Google Map</span>
              </button>
            </div>
          </div>

          {/* Map View Body */}
          <div className="relative flex-1 w-full overflow-hidden">
            {mapProvider === 'vector' ? (
              <IndiaChoroplethMap
                districtsData={districts}
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

        {/* Territory Districts Quick Browser */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-sm">Districts Territory Explorer</h3>
              <p className="text-xs text-slate-500">{districts.length} Districts matching filters</p>
            </div>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
            {districts.map((d) => (
              <button
                key={d.id}
                onClick={() => handleDistrictClick(d.id)}
                className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.district_name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {d.cluster_name ? `${d.cluster_name} (${d.cluster_code})` : 'No Cluster'} • {d.state_name}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${d.color}20`, color: d.color }}
                  >
                    {d.status_label.split(' ')[0]}
                  </span>
                  <FiChevronRight className="inline-block ml-1 text-slate-300 group-hover:text-slate-600" size={14} />
                </div>
              </button>
            ))}
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
    </div>
  );
}
