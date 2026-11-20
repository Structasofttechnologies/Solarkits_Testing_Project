import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiPackage,
  FiSearch,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiShield,
  FiGrid,
  FiList,
  FiFilter,
  FiRefreshCw,
  FiMapPin,
  FiInfo,
  FiCheck,
  FiAlertCircle,
  FiLayers,
  FiEye,
  FiEyeOff,
  FiSliders,
} from "react-icons/fi";
import { FaWarehouse, FaSolarPanel } from "react-icons/fa";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import ToggleButton from "@/components/ToggleButton";
import IndiaChoroplethMap from "../franchisee-clusters/components/IndiaChoroplethMap";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ResellerProductAuth() {
  const dispatch = useDispatch();

  // ── 1. Filter States ────────────────────────────────────────────────────────
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mapCoverage, setMapCoverage] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'authorized' | 'restricted'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // ── 2. Kit Data States ──────────────────────────────────────────────────────
  const [kits, setKits] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingKits, setLoadingKits] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── 3. Fetch Initial Masters (States, Clusters, Districts, Map Summary) ─────
  const fetchFilterMasters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const headers = authHeaderObj();
      const [filterRes, mapRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/reseller-mgmt/product-auth/filter-options`, { headers }),
        axios.get(`${API_BASE}/reseller-mgmt/product-auth/map-coverage-summary`, { headers })
      ]);

      let initialStates = [];
      let initialClusters = [];

      if (filterRes.status === "fulfilled" && filterRes.value.data?.status === "success") {
        const d = filterRes.value.data.data;
        initialStates = d.states || [];
        initialClusters = d.clusters || [];
        setStates(initialStates);
        setClusters(initialClusters);
        setDistricts(d.districts || []);

        if (initialStates.length > 0 && !selectedState) {
          const firstState = initialStates[0];
          setSelectedState(firstState.name);

          // Find first cluster in first state
          const firstCluster = (firstState.clusters && firstState.clusters[0]) ||
            initialClusters.find(c => c.state_name?.toLowerCase() === firstState.name.toLowerCase());
          if (firstCluster) {
            setSelectedCluster(firstCluster.id || firstCluster.cluster_id);
          }
        }
      }

      if (mapRes.status === "fulfilled" && mapRes.value.data?.status === "success") {
        setMapCoverage(mapRes.value.data.data || []);
      }
    } catch (err) {
      console.error("[KitClusterAuth] Error loading filter masters:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load state & cluster masters" }));
    } finally {
      setLoadingFilters(false);
    }
  }, [dispatch, selectedState]);

  useEffect(() => {
    fetchFilterMasters();
  }, []);

  // Cascaded clusters based on selected state
  const availableClusters = useMemo(() => {
    if (!selectedState) return clusters;
    return clusters.filter(
      c => (c.state_name || "").toLowerCase() === selectedState.toLowerCase()
    );
  }, [clusters, selectedState]);

  // When selected state changes, auto-select first cluster if current is not in that state
  const handleStateChange = (newStateName) => {
    setSelectedState(newStateName);
    setSelectedDistrict("");
    const matchedClusters = clusters.filter(
      c => (c.state_name || "").toLowerCase() === newStateName.toLowerCase()
    );
    if (matchedClusters.length > 0) {
      setSelectedCluster(matchedClusters[0].id || matchedClusters[0].cluster_id);
    } else {
      setSelectedCluster("");
    }
  };

  // Selected cluster object
  const currentClusterObj = useMemo(() => {
    return clusters.find(
      c => (c.id || c.cluster_id)?.toString() === selectedCluster?.toString()
    );
  }, [clusters, selectedCluster]);

  // Cascaded districts for selected cluster
  const availableDistricts = useMemo(() => {
    if (!currentClusterObj) return [];
    const clusterDistrictNames = currentClusterObj.district_names || [];
    if (clusterDistrictNames.length > 0) {
      return clusterDistrictNames.map(name => ({ id: name, name }));
    }
    return districts.filter(
      d => d.cluster_id?.toString() === selectedCluster?.toString()
    );
  }, [currentClusterObj, districts, selectedCluster]);

  // ── 4. Fetch Kits for Selected Cluster / State / District ───────────────────
  const fetchClusterKits = useCallback(async () => {
    if (!selectedCluster && !selectedState) return;

    setLoadingKits(true);
    try {
      const headers = authHeaderObj();
      const params = {
        state_name: selectedState,
        cluster_id: selectedCluster
      };
      if (selectedDistrict) {
        params.district_id = selectedDistrict;
      }

      const res = await axios.get(`${API_BASE}/reseller-mgmt/product-auth/cluster-kits`, {
        headers,
        params
      });

      if (res.data?.status === "success") {
        setKits(res.data.data.kits || []);
        setWarehouses(res.data.data.warehouses || []);
      }
    } catch (err) {
      console.error("[KitClusterAuth] Error fetching cluster kits:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load kits for selected cluster" }));
    } finally {
      setLoadingKits(false);
    }
  }, [selectedCluster, selectedState, selectedDistrict, dispatch]);

  useEffect(() => {
    fetchClusterKits();
  }, [fetchClusterKits]);

  // ── 5. Toggle Individual Kit Authorization ──────────────────────────────────
  const handleToggleKit = async (kit, newAuthorizedState) => {
    if (!currentClusterObj) return;

    setActionLoadingId(kit.id);

    // Optimistic UI Update
    setKits(prev =>
      prev.map(k => (k.id === kit.id ? { ...k, is_authorized: newAuthorizedState } : k))
    );

    try {
      const headers = authHeaderObj();
      const payload = {
        state_id: currentClusterObj.state_id,
        state_name: currentClusterObj.state_name || selectedState,
        cluster_id: currentClusterObj.id || currentClusterObj.cluster_id,
        cluster_code: currentClusterObj.cluster_code,
        cluster_name: currentClusterObj.cluster_name,
        combo_kit_id: kit.combo_kit_id || kit.id,
        is_authorized: newAuthorizedState,
        district_id: selectedDistrict || null,
        district_name: selectedDistrict || null
      };

      const res = await axios.post(
        `${API_BASE}/reseller-mgmt/product-auth/toggle-auth`,
        payload,
        { headers }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: newAuthorizedState ? "success" : "info",
            message: `${kit.kit_name} is now ${
              newAuthorizedState ? "Active (Visible)" : "Hidden (Suppressed)"
            } in Solar Store for ${currentClusterObj.cluster_name}`
          })
        );
      }
    } catch (err) {
      console.error("[KitClusterAuth] Error toggling kit:", err);
      // Revert optimistic update on failure
      setKits(prev =>
        prev.map(k => (k.id === kit.id ? { ...k, is_authorized: !newAuthorizedState } : k))
      );
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update kit authorization"
        })
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── 6. Bulk Toggle Authorization for All Kits in Cluster ───────────────────
  const handleBulkToggle = async (authorizeAll) => {
    if (!currentClusterObj || kits.length === 0) return;

    setBulkLoading(true);

    // Optimistic UI Update
    setKits(prev => prev.map(k => ({ ...k, is_authorized: authorizeAll })));

    try {
      const headers = authHeaderObj();
      const payload = {
        state_id: currentClusterObj.state_id,
        state_name: currentClusterObj.state_name || selectedState,
        cluster_id: currentClusterObj.id || currentClusterObj.cluster_id,
        cluster_code: currentClusterObj.cluster_code,
        cluster_name: currentClusterObj.cluster_name,
        district_id: selectedDistrict || null,
        is_authorized: authorizeAll,
        combo_kit_ids: kits.map(k => k.combo_kit_id || k.id)
      };

      const res = await axios.post(
        `${API_BASE}/reseller-mgmt/product-auth/bulk-toggle-auth`,
        payload,
        { headers }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: authorizeAll ? "success" : "warning",
            message: `All ${kits.length} kits in ${currentClusterObj.cluster_name} set to ${
              authorizeAll ? "Active in Solar Store" : "Hidden in Solar Store"
            }`
          })
        );
      }
    } catch (err) {
      console.error("[KitClusterAuth] Error in bulk toggle:", err);
      fetchClusterKits(); // Rollback to actual state
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to bulk update authorizations"
        })
      );
    } finally {
      setBulkLoading(false);
    }
  };

  // ── 7. Filtered Kits List ───────────────────────────────────────────────────
  const filteredKits = useMemo(() => {
    return kits.filter(k => {
      // Status Filter
      if (statusFilter === "authorized" && !k.is_authorized) return false;
      if (statusFilter === "restricted" && k.is_authorized) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (k.kit_name || "").toLowerCase().includes(query);
        const matchesCode = (k.kit_code || "").toLowerCase().includes(query);
        const matchesCap = String(k.capacity || "").includes(query);
        const matchesType = (k.system_type || "").toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesCap && !matchesType) return false;
      }

      return true;
    });
  }, [kits, statusFilter, searchQuery]);

  // Counts
  const totalCount = kits.length;
  const authorizedCount = kits.filter(k => k.is_authorized).length;
  const restrictedCount = kits.filter(k => !k.is_authorized).length;

  // Prepare districts data for IndiaChoroplethMap
  const mapDistrictsData = useMemo(() => {
    const list = [];
    (mapCoverage || []).forEach(mc => {
      (mc.district_names || []).forEach(dName => {
        list.push({
          district_name: dName,
          state_name: mc.state_name,
          cluster_code: mc.cluster_code,
          cluster_name: mc.cluster_name,
          cluster_id: mc.cluster_id,
          coverage_status: mc.coverage_status,
          total_kits: mc.total_kits,
          authorized_kits: mc.authorized_kits,
          status: mc.coverage_status === "full" ? "allotted" : "available"
        });
      });
    });
    return list;
  }, [mapCoverage]);

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Page Header */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FiShield className="text-xl" />
            </span>
            <h1 className="text-xl font-bold text-text-primary">
              Kit Cluster Authorizations
            </h1>
          </div>
          <p className="text-xs text-text-secondary max-w-2xl">
            Manage state & franchise cluster kit authorizations, toggle live Solar Store visibility (ON / OFF), and inspect regional fulfillment coverage on the map.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              fetchFilterMasters();
              fetchClusterKits();
            }}
            disabled={loadingKits || loadingFilters}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FiRefreshCw className={loadingKits ? "animate-spin text-primary" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleBulkToggle(true)}
            disabled={bulkLoading || kits.length === 0}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FiEye />
            <span>Authorize All in Cluster</span>
          </button>

          <button
            onClick={() => handleBulkToggle(false)}
            disabled={bulkLoading || kits.length === 0}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FiEyeOff />
            <span>Hide All in Cluster</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Top Summary KPI Cards */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Kits in Cluster */}
        <div className="p-4 bg-surface rounded-xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <FiPackage className="text-xl" />
          </div>
          <div>
            <div className="text-[11px] text-text-secondary font-medium">Cluster Activated Kits</div>
            <div className="text-2xl font-black text-text-primary">{totalCount}</div>
            <div className="text-[10px] text-text-secondary">From mapped warehouses</div>
          </div>
        </div>

        {/* Active in Store */}
        <div className="p-4 bg-surface rounded-xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <FiCheckCircle className="text-xl" />
          </div>
          <div>
            <div className="text-[11px] text-text-secondary font-medium">Active in Solar Store</div>
            <div className="text-2xl font-black text-emerald-600">{authorizedCount}</div>
            <div className="text-[10px] text-text-secondary">
              {totalCount > 0 ? `${Math.round((authorizedCount / totalCount) * 100)}% visible` : "0% visible"}
            </div>
          </div>
        </div>

        {/* Hidden in Store */}
        <div className="p-4 bg-surface rounded-xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <FiXCircle className="text-xl" />
          </div>
          <div>
            <div className="text-[11px] text-text-secondary font-medium">Hidden in Solar Store</div>
            <div className="text-2xl font-black text-rose-600">{restrictedCount}</div>
            <div className="text-[10px] text-text-secondary">Suppressed from buyers</div>
          </div>
        </div>

        {/* Fulfilling Warehouses */}
        <div className="p-4 bg-surface rounded-xl border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <FaWarehouse className="text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-text-secondary font-medium">Fulfilling Hubs</div>
            <div className="text-lg font-bold text-text-primary truncate">
              {warehouses.length > 0 ? warehouses.map(w => w.code).join(", ") : "None"}
            </div>
            <div className="text-[10px] text-text-secondary truncate">
              {warehouses.length > 0 ? warehouses[0].name : "No warehouse mapped"}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Cascading Filters Bar */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* State Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              1. State Filter *
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            >
              {states.map(s => (
                <option key={s.id || s.name} value={s.name}>
                  {s.name} ({s.cluster_count} {s.cluster_count === 1 ? "cluster" : "clusters"})
                </option>
              ))}
            </select>
          </div>

          {/* Franchise Cluster Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              2. Franchise Cluster *
            </label>
            <select
              value={selectedCluster}
              onChange={(e) => {
                setSelectedCluster(e.target.value);
                setSelectedDistrict("");
              }}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary font-medium"
            >
              {availableClusters.map(c => (
                <option key={c.id || c.cluster_id} value={c.id || c.cluster_id}>
                  {c.cluster_code}: {c.cluster_name} ({c.district_count} dists)
                </option>
              ))}
            </select>
          </div>

          {/* District Filter (Optional Drilldown) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              3. District Filter (Optional)
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">All Districts in Cluster</option>
              {availableDistricts.map(d => (
                <option key={d.id || d.name} value={d.id || d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              4. Store Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="all">All Activated Kits ({totalCount})</option>
              <option value="authorized">Visible in Store Only ({authorizedCount})</option>
              <option value="restricted">Hidden in Store Only ({restrictedCount})</option>
            </select>
          </div>
        </div>

        {/* Search & View Mode Switch */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="relative w-full sm:w-80">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs" />
            <input
              type="text"
              placeholder="Search kits by name, capacity, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-bg border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              Showing <span className="font-bold text-text-primary">{filteredKits.length}</span> of {totalCount} kits
            </span>
            <div className="flex items-center bg-bg p-1 rounded-lg border border-border">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === "grid" ? "bg-surface text-primary shadow-xs font-bold" : "text-text-secondary hover:text-text-primary"
                }`}
                title="Grid Card View"
              >
                <FiGrid />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded text-xs transition-colors ${
                  viewMode === "table" ? "bg-surface text-primary shadow-xs font-bold" : "text-text-secondary hover:text-text-primary"
                }`}
                title="Table View"
              >
                <FiList />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Dual-Pane Content Layout: Left Map + Right Kit Toggles */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Map View & Regional Coverage (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-border shadow-xs overflow-hidden flex flex-col space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FiMapPin className="text-sm" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wide">
                  Regional Cluster Coverage
                </h3>
                <span className="text-[11px] text-text-secondary">
                  Showing {selectedState || "India"} clusters
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-bg border border-border text-text-primary">
              {availableClusters.length} Clusters
            </span>
          </div>

          {/* Map Container */}
          <div className="h-80 w-full rounded-xl border border-border overflow-hidden bg-bg relative">
            <IndiaChoroplethMap
              districtsData={mapDistrictsData}
              clustersList={availableClusters}
              selectedState={selectedState}
              selectedCluster={currentClusterObj?.cluster_name || ""}
              onDistrictClick={(dist) => {
                if (dist?.cluster_id) {
                  setSelectedCluster(dist.cluster_id);
                }
              }}
            />
          </div>

          {/* Quick Cluster Selector List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Clusters in {selectedState}
            </div>
            {availableClusters.map(c => {
              const isSelected = (c.id || c.cluster_id)?.toString() === selectedCluster?.toString();
              const covObj = mapCoverage.find(mc => mc.cluster_id?.toString() === (c.id || c.cluster_id)?.toString());
              const status = covObj?.coverage_status || "unconfigured";

              return (
                <div
                  key={c.id || c.cluster_id}
                  onClick={() => {
                    setSelectedCluster(c.id || c.cluster_id);
                    setSelectedDistrict("");
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-primary/10 border-primary text-text-primary shadow-xs"
                      : "bg-bg/60 border-border hover:border-border-hover text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface border border-border text-text-primary">
                        {c.cluster_code}
                      </span>
                      <span className={`font-semibold truncate ${isSelected ? "text-primary" : "text-text-primary"}`}>
                        {c.cluster_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5 truncate">
                      {c.district_count} Districts: {(c.district_names || []).slice(0, 3).join(", ")}
                      {(c.district_names || []).length > 3 ? "..." : ""}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      status === "full"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : status === "partial"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : status === "restricted"
                        ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                    }`}
                  >
                    {status === "full" ? "All Active" : status === "partial" ? "Partial" : status === "restricted" ? "Hidden" : "No Kits"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Kits List with Live Store Toggles (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Right Pane Header */}
          <div className="p-4 bg-surface rounded-xl border border-border shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {currentClusterObj?.cluster_code || "CLUSTER"}
                </span>
                <h2 className="text-sm font-bold text-text-primary">
                  {currentClusterObj?.cluster_name || "Select Cluster"}
                </h2>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Toggle kits ON to display in Solar Store for buyers in this cluster, or OFF to hide them.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-600 block">
                {authorizedCount} Active in Store
              </span>
              <span className="text-[10px] text-rose-500">
                {restrictedCount} Hidden
              </span>
            </div>
          </div>

          {/* Loading Indicator */}
          {loadingKits ? (
            <div className="p-16 bg-surface rounded-2xl border border-border text-center space-y-3">
              <FiLoader className="mx-auto text-3xl text-primary animate-spin" />
              <div className="text-xs font-semibold text-text-primary">
                Loading activated kits for {currentClusterObj?.cluster_name}...
              </div>
            </div>
          ) : filteredKits.length === 0 ? (
            <div className="p-12 bg-surface rounded-2xl border border-dashed border-border text-center space-y-3">
              <FaSolarPanel className="mx-auto text-4xl text-text-secondary/40" />
              <div className="text-sm font-bold text-text-primary">
                No Activated Kits Found for this Selection
              </div>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                No kits are active in the fulfilling warehouses mapped to {currentClusterObj?.cluster_name}. Please activate kits under{" "}
                <span className="font-semibold text-primary">Solar Shop ➔ Warehouse Kit Activations</span> first.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ───────────────────────────────────────────────────────── */
            /* GRID VIEW: Kit Cards with Live Toggle Switch */
            /* ───────────────────────────────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredKits.map(kit => {
                const isToggling = actionLoadingId === kit.id;
                return (
                  <div
                    key={kit.id}
                    className={`p-4 rounded-xl border transition-all space-y-3.5 bg-surface ${
                      kit.is_authorized
                        ? "border-emerald-500/40 shadow-xs"
                        : "border-border opacity-85 bg-bg/40"
                    }`}
                  >
                    {/* Top Row: Kit Name + Store Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-bg border border-border text-text-primary">
                            {kit.capacity} kW
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg border border-border text-text-secondary">
                            {kit.system_type}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-text-primary mt-1 truncate" title={kit.kit_name}>
                          {kit.kit_name}
                        </h4>
                        <div className="text-[10px] font-mono text-text-secondary">
                          SKU: {kit.kit_code}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap ${
                          kit.is_authorized
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        }`}
                      >
                        {kit.is_authorized ? (
                          <>
                            <FiCheckCircle className="text-[10px]" />
                            <span>Store Visible</span>
                          </>
                        ) : (
                          <>
                            <FiXCircle className="text-[10px]" />
                            <span>Hidden</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Middle: Fulfilling Warehouse & Pricing */}
                    <div className="p-2.5 bg-bg/70 rounded-lg border border-border text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-text-secondary flex items-center gap-1">
                          <FaWarehouse className="text-[10px] text-primary" /> Fulfilling Hub:
                        </span>
                        <span className="font-semibold text-text-primary truncate max-w-[150px]">
                          {kit.warehouses && kit.warehouses.length > 0
                            ? kit.warehouses[0].name
                            : "Ahmedabad Central"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                        <span className="text-text-secondary">Selling Price:</span>
                        <span className="font-bold text-text-primary">
                          ₹{Number(kit.selling_price || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Toggle Action Bar */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <div>
                        <span className="text-xs font-semibold text-text-primary block">
                          Solar Store Visibility
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          {kit.is_authorized ? "Buyers can view & order" : "Hidden from search & catalog"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isToggling && <FiLoader className="animate-spin text-primary text-xs" />}
                        <ToggleButton
                          checked={kit.is_authorized}
                          isChecked={kit.is_authorized}
                          disabled={isToggling}
                          onChange={(newVal) => handleToggleKit(kit, newVal)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────── */
            /* TABLE VIEW */
            /* ───────────────────────────────────────────────────────── */
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg border-b border-border text-xs uppercase font-semibold text-text-secondary">
                      <th className="p-3.5">Kit Name & SKU</th>
                      <th className="p-3.5">Capacity</th>
                      <th className="p-3.5">Fulfilling Warehouse</th>
                      <th className="p-3.5">Selling Price</th>
                      <th className="p-3.5">Store Status</th>
                      <th className="p-3.5 text-right">Visibility Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredKits.map(kit => {
                      const isToggling = actionLoadingId === kit.id;
                      return (
                        <tr key={kit.id} className="hover:bg-bg/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-text-primary">{kit.kit_name}</div>
                            <div className="text-[10px] font-mono text-text-secondary">{kit.kit_code}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-bg border border-border text-text-primary">
                              {kit.capacity} kW
                            </span>
                          </td>
                          <td className="p-3.5 text-text-secondary">
                            {kit.warehouses && kit.warehouses.length > 0 ? kit.warehouses[0].name : "Mapped Hub"}
                          </td>
                          <td className="p-3.5 font-bold text-text-primary">
                            ₹{Number(kit.selling_price || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                kit.is_authorized
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              }`}
                            >
                              {kit.is_authorized ? "Active in Store" : "Hidden"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isToggling && <FiLoader className="animate-spin text-primary text-xs" />}
                              <ToggleButton
                                checked={kit.is_authorized}
                                isChecked={kit.is_authorized}
                                disabled={isToggling}
                                onChange={(newVal) => handleToggleKit(kit, newVal)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
