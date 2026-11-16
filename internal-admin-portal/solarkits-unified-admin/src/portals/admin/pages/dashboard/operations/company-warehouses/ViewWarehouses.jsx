import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import CardImageSlider from "@/components/CardImageSlider";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdown from "@/components/MultiSelectDropdown";
import ToggleButton from "@/components/ToggleButton";
import Loader from "@/components/Loader";
import PageHeader from "@/components/PageHeader";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  FiArchive,
  FiRefreshCw,
  FiXCircle,
  FiEye,
  FiMap,
  FiEdit2,
  FiPlus,
  FiClock,
  FiAlertCircle,
  FiFileText,
  FiCheck,
  FiCheckCircle,
  FiMapPin,
  FiGlobe,
  FiNavigation,
  FiSearch,
  FiStar,
  FiGitBranch,
  FiSliders,
  FiChevronDown,
  FiChevronUp,
  FiHome,
  FiTruck,
  FiPackage,
  FiDollarSign,
  FiLayers,
  FiAlertTriangle,
  FiActivity,
  FiCheckSquare,
  FiPauseCircle,
  FiPlayCircle,
  FiShield
} from "react-icons/fi";
import { FaTimes, FaRupeeSign } from "react-icons/fa";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import RenderIfPermission, { useHasPermission } from "@/components/PermissionCheck";
import ConfirmationPopup from "@/components/ConfirmationPopup";

import CompanyActivationModal from "./components/CompanyActivationModal";
import ThreePLInspectionModal from "./components/ThreePLInspectionModal";
import ThreePLCommercialsModal from "./components/ThreePLCommercialsModal";
import ThreePLVendorManagementModal from "./components/ThreePLVendorManagementModal";
import WarehouseMapSection from "./components/WarehouseMapSection";

const CircleProgressBar = ({ percentage, size = 44, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border/40 dark:stroke-border/20"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-text-primary">{percentage}%</span>
    </div>
  );
};

export default function ViewWarehouses({ moduleUniqueId }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "view" });

  const [warehouses, setWarehouses] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'map'

  // Modals state
  const [checklistWhId, setChecklistWhId] = useState(null);
  const [inspectionWh, setInspectionWh] = useState(null);
  const [commercialsWh, setCommercialsWh] = useState(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [suspendPopup, setSuspendPopup] = useState({ open: false, warehouse: null, action: "suspend" });

  const API = import.meta.env.VITE_API_URL;

  // ---------------------------
  // VALIDATION STATUS MAPPING
  // ---------------------------
  const validationStatus = {
    1: {
      label: "Pending Validation Setup",
      color: "from-slate-500 to-slate-600",
      text: "text-white",
      icon: FiClock,
      variant: "ghost"
    },
    2: {
      label: "Awaiting Information",
      color: "from-amber-500 to-amber-600",
      text: "text-white",
      icon: FiAlertCircle,
      variant: "warning"
    },
    3: {
      label: "In Review",
      color: "from-blue-500 to-blue-600",
      text: "text-white",
      icon: FiFileText,
      variant: "primary"
    },
    4: {
      label: "Verified",
      color: "from-green-500 to-green-600",
      text: "text-white",
      icon: FiCheck,
      variant: "success"
    },
    5: {
      label: "Rejected",
      color: "from-red-500 to-red-600",
      text: "text-white",
      icon: FiXCircle,
      variant: "danger"
    }
  };

  // ---------------------------
  // FILTER STATES
  // ---------------------------
  const [filterCountry, setFilterCountry] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [showActive, setShowActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValidationStatus, setSelectedValidationStatus] = useState([]);
  const [filterWarehouseType, setFilterWarehouseType] = useState(""); // "", "company", "3pl"

  // ---------------------------
  // LOAD DATA & METRICS
  // ---------------------------
  const fetchWarehouses = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [resWh, resMetrics] = await Promise.all([
        axios.get(`${API}/warehouses?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }),
        axios.get(`${API}/warehouses/dashboard/metrics?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() })
      ]);

      setWarehouses(resWh.data.warehouses || []);
      if (resMetrics.data?.status === "success") {
        setMetrics(resMetrics.data.metrics);
      }
    } catch (err) {
      console.error(err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load warehouses.",
          duration: 4000
        })
      );
    }

    setLoading(false);
    if (showRefresh) setRefreshing(false);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // ---------------------------
  // UNIQUE DROPDOWN OPTIONS
  // ---------------------------
  const countries = useMemo(
    () =>
      [...new Set(warehouses.map((w) => w.country))].filter(Boolean).map((c) => ({
        value: c,
        text: (
          <span className="flex items-center gap-2">
            <div className="w-6 h-6 bg-linear-120 from-primary to-primary-end rounded-full flex items-center justify-center">
              <FiGlobe className="text-white w-3 h-3" />
            </div>
            {c}
          </span>
        ),
      })),
    [warehouses]
  );

  const states = useMemo(() => {
    return [
      ...new Set(
        warehouses
          .filter((w) => !filterCountry || w.country === filterCountry)
          .map((w) => w.state)
      ),
    ].filter(Boolean).map((s) => ({
      value: s,
      text: (
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-120 from-amber-500 to-amber-600 rounded-full flex items-center justify-center">
            <FiMap className="text-white w-3 h-3" />
          </div>
          {s}
        </span>
      )
    }));
  }, [warehouses, filterCountry]);

  const districts = useMemo(() => {
    return [
      ...new Set(
        warehouses
          .filter(
            (w) =>
              (!filterCountry || w.country === filterCountry) &&
              (!filterState || w.state === filterState)
          )
          .map((w) => w.district)
      ),
    ].filter(Boolean).map((d) => ({
      value: d,
      text: (
        <span className="flex items-center gap-2">
          <div className="w-6 h-6 bg-linear-120 from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <FiMapPin className="text-white w-3 h-3" />
          </div>
          {d}
        </span>
      )
    }));
  }, [warehouses, filterCountry, filterState]);

  const validationStatusOptions = useMemo(() => {
    return Object.entries(validationStatus).map(([key, value]) => ({
      value: parseInt(key),
      text: (
        <span className="flex items-center gap-2">
          <div className={`w-6 h-6 bg-linear-120 ${value.color} rounded-full flex items-center justify-center`}>
            <value.icon className={`${value.text} w-3 h-3`} />
          </div>
          {value.label}
        </span>
      )
    }));
  }, []);

  // ---------------------------
  // FILTERED WAREHOUSES
  // ---------------------------
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      const matchesSearch = searchQuery === "" ||
        w.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.pincode?.toString().includes(searchQuery) ||
        w.warehouse_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesValidationStatus = selectedValidationStatus.length === 0
        ? true
        : selectedValidationStatus.includes(w.status_id);

      const matchesWarehouseType = !filterWarehouseType || w.warehouse_type === filterWarehouseType;

      return (
        (!filterCountry || w.country === filterCountry) &&
        (!filterState || w.state === filterState) &&
        (!filterDistrict || w.district === filterDistrict) &&
        (!showActive || w.is_active === 1 || w.is_active === true) &&
        matchesValidationStatus &&
        matchesWarehouseType &&
        matchesSearch
      );
    });
  }, [warehouses, filterCountry, filterState, filterDistrict, showActive, searchQuery, selectedValidationStatus, filterWarehouseType]);

  const clearFilters = () => {
    setFilterCountry("");
    setFilterState("");
    setFilterDistrict("");
    setShowActive(false);
    setSearchQuery("");
    setSelectedValidationStatus([]);
    setFilterWarehouseType("");
  };

  const activeFilterCount = [
    filterCountry,
    filterState,
    filterDistrict,
    showActive,
    searchQuery,
    selectedValidationStatus.length > 0,
    filterWarehouseType
  ].filter(Boolean).length;

  const handleAddWarehouse = () => {
    navigate("add-warehouse");
  };

  const getStatusInfo = (warehouse) => {
    const status = validationStatus[warehouse.status_id];
    return {
      label: warehouse.status || status?.label || "Unknown",
      color: status?.color || "from-primary to-primary-end",
      text: status?.text || "text-white",
      icon: status?.icon || FiClock,
      variant: status?.variant || "ghost"
    };
  };

  const handleToggleStatus = async () => {
    const wh = suspendPopup.warehouse;
    if (!wh) return;

    try {
      const nextAction = wh.is_active ? "suspend" : "activate";
      const res = await axios.patch(
        `${API}/warehouses/${wh.id}/toggle-status?unique_id=${moduleUniqueId}&req_for=edit`,
        { action: nextAction },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: `Warehouse status updated to '${nextAction === "suspend" ? "Suspended" : "Active"}'.`
        }));
        fetchWarehouses();
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to update warehouse status."
      }));
    } finally {
      setSuspendPopup({ open: false, warehouse: null, action: "suspend" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Management & Activation Master"
        subtitle={loading ? "Loading warehouses..." : `${filteredWarehouses.length} of ${warehouses.length} facilities displayed`}
        icon={FiArchive}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle Button */}
            <div className="flex bg-surface-elevated p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "grid"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <FiLayers className="w-3.5 h-3.5" />
                Directory
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${viewMode === "map"
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary"
                  }`}
              >
                <FiMap className="w-3.5 h-3.5" />
                Live Map
              </button>
            </div>

            {/* 3PL Logistics Partner Management */}
            <Button
              onClick={() => setVendorModalOpen(true)}
              variant="secondary"
              leftIcon={<FiTruck className="w-4 h-4 text-blue-500" />}
            >
              3PL Vendors
            </Button>

            <Button
              onClick={() => fetchWarehouses(true)}
              disabled={refreshing}
              variant="secondary"
              leftIcon={<FiRefreshCw className={refreshing ? "animate-spin" : ""} />}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>

            <RenderIfPermission
              requiredUniqueId={moduleUniqueId}
              permission="add"
              fallback={null}
            >
              <Button
                onClick={handleAddWarehouse}
                variant="primary"
                leftIcon={<FiPlus />}
              >
                Add Warehouse
              </Button>
            </RenderIfPermission>
          </div>
        }
      />

      {/* ── 10 KPI Summary Cards Grid (Section 9.1) ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Warehouses */}
        <div
          onClick={() => { setFilterWarehouseType(""); setShowActive(false); }}
          className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiArchive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.total_warehouses ?? warehouses.length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Total Facilities</span>
          </div>
        </div>

        {/* KPI 2: Company Warehouses */}
        <div
          onClick={() => setFilterWarehouseType("company")}
          className="bg-surface border border-border hover:border-emerald-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <FiHome className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.company_warehouses ?? warehouses.filter(w => w.warehouse_type === "company").length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Company-Owned</span>
          </div>
        </div>

        {/* KPI 3: 3PL Warehouses */}
        <div
          onClick={() => setFilterWarehouseType("3pl")}
          className="bg-surface border border-border hover:border-blue-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <FiTruck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.tpl_warehouses ?? warehouses.filter(w => w.warehouse_type === "3pl").length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">3PL Vendor Operated</span>
          </div>
        </div>

        {/* KPI 4: Active Warehouses */}
        <div
          onClick={() => setShowActive(true)}
          className="bg-surface border border-border hover:border-emerald-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <FiCheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block leading-tight">
              {metrics?.active_warehouses ?? warehouses.filter(w => w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Active Warehouses</span>
          </div>
        </div>

        {/* KPI 5: Pending Activation (Company) */}
        <div
          onClick={() => { setFilterWarehouseType("company"); setSelectedValidationStatus([1, 2]); }}
          className="bg-surface border border-border hover:border-amber-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <FiClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block leading-tight">
              {metrics?.pending_activation ?? warehouses.filter(w => w.warehouse_type === "company" && !w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Pending Activation</span>
          </div>
        </div>

        {/* KPI 6: Pending Inspection (3PL) */}
        <div
          onClick={() => { setFilterWarehouseType("3pl"); setSelectedValidationStatus([1, 2]); }}
          className="bg-surface border border-border hover:border-amber-500/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 block leading-tight">
              {metrics?.pending_inspection ?? warehouses.filter(w => w.warehouse_type === "3pl" && !w.is_active).length}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Pending Inspection</span>
          </div>
        </div>

        {/* KPI 7: Active Kit Mappings */}
        <div
          onClick={() => navigate("/admin-panel/solar-shop/warehouse-kit-activations")}
          className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FiPackage className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.active_kit_mappings ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Active Kit Mappings</span>
          </div>
        </div>

        {/* KPI 8: Inactive Kit Mappings */}
        <div
          onClick={() => navigate("/admin-panel/solar-shop/warehouse-kit-activations")}
          className="bg-surface border border-border hover:border-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-surface-elevated text-text-muted flex items-center justify-center shrink-0 border border-border">
            <FiPackage className="w-5 h-5 opacity-50" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-secondary block leading-tight">
              {metrics?.inactive_kit_mappings ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Disabled Kits</span>
          </div>
        </div>

        {/* KPI 9: Total Inventory Units */}
        <div
          className="bg-surface border border-border rounded-2xl p-4 shadow-2xs flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <FiActivity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {(metrics?.total_inventory_units ?? 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Total Stock Units</span>
          </div>
        </div>

        {/* KPI 10: Stock Discrepancies */}
        <div
          className={`border rounded-2xl p-4 shadow-2xs flex items-center gap-3 ${(metrics?.stock_discrepancies || 0) > 0
            ? "bg-red-500/5 border-red-500/30 text-red-600"
            : "bg-surface border-border text-text-muted"
            }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${(metrics?.stock_discrepancies || 0) > 0 ? "bg-red-500/15 text-red-500" : "bg-surface-elevated"
            }`}>
            <FiAlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xl font-black text-text-primary block leading-tight">
              {metrics?.stock_discrepancies ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-text-muted truncate block">Stock Discrepancies</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Live Map View ────────────────────────────────────────── */}
      {viewMode === "map" && (
        <WarehouseMapSection
          warehouses={filteredWarehouses}
          onOpenChecklist={(whId) => setChecklistWhId(whId)}
          onOpenInspection={(wh) => setInspectionWh(wh)}
          onOpenCommercials={(wh) => setCommercialsWh(wh)}
          onNavigateDetails={(whId) => navigate(`edit-warehouse/${whId}`)}
          onConfigureKits={(wh) => {
            const cSlug = (wh.country || "india").toLowerCase();
            navigate(`/admin-panel/solar-shop/${cSlug}/warehouse-kit-activations/${wh.id}`);
          }}
        />
      )}

      {/* ── Search & Filter Controls (Grid View) ────────────────────────────── */}
      {viewMode === "grid" && (
        <>
          <div className="card shadow-xs overflow-hidden bg-surface border border-border rounded-3xl mb-6">
            <div className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by warehouse name, code, address, vendor, or district..."
                    className="w-full h-[52px] bg-bg border-2 border-border/85 rounded-2xl px-5 pl-12 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm font-medium text-text-primary"
                  />
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <ToggleButton
                    label="Active Only"
                    checked={showActive}
                    onChange={setShowActive}
                    className="h-[52px] px-5 rounded-2xl border border-border"
                  />

                  <Button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    variant={showAdvancedFilters ? "outline" : "secondary"}
                    leftIcon={<FiSliders className="w-4 h-4" />}
                    rightIcon={showAdvancedFilters ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                    className="h-[52px] py-0 rounded-2xl shadow-xs px-6"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm shrink-0">
                          {activeFilterCount}
                        </span>
                      )}
                    </span>
                  </Button>

                  {activeFilterCount > 0 && (
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}
                      className="h-[52px] py-0 rounded-2xl px-5 text-text-secondary hover:text-danger hover:bg-danger/5 transition-all"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Collapsible Filter Details */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-6 mt-6 border-t border-border/50 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <DropdownWithSearchInput
                          label="Country"
                          value={filterCountry}
                          onChange={(v) => {
                            setFilterCountry(v);
                            setFilterState("");
                            setFilterDistrict("");
                          }}
                          options={countries}
                          placeholder="All Countries"
                          className="w-full"
                        />
                        <DropdownWithSearchInput
                          label="State"
                          value={filterState}
                          onChange={(v) => {
                            setFilterState(v);
                            setFilterDistrict("");
                          }}
                          options={states}
                          placeholder="All States"
                          className="w-full"
                          disabled={!filterCountry && states.length === 0}
                        />
                        <DropdownWithSearchInput
                          label="District"
                          value={filterDistrict}
                          onChange={(v) => setFilterDistrict(v)}
                          options={districts}
                          placeholder="All Districts"
                          className="w-full"
                          disabled={!filterState && districts.length === 0}
                        />

                        <div>
                          <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                            Warehouse Type
                          </label>
                          <select
                            value={filterWarehouseType}
                            onChange={(e) => setFilterWarehouseType(e.target.value)}
                            className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">All Types (Company & 3PL)</option>
                            <option value="company">Company Warehouse</option>
                            <option value="3pl">3PL Warehouse</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="min-h-100 flex items-center justify-center">
              <Loader text="Loading warehouses..." />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredWarehouses.length === 0 && (
            <div className="card shadow-sm hover:shadow-md transition-all duration-300">
              <div className="p-6">
                <div className="bg-linear-120 from-primary/5 to-primary/10 rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <FiMap className="text-primary text-3xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">No warehouses found</h3>
                  <p className="text-text-secondary max-w-md mx-auto text-sm mb-6">
                    {warehouses.length === 0
                      ? "No warehouses have been registered yet. Click 'Add Warehouse' to onboard your first facility."
                      : "No facilities match your active search filters."}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {activeFilterCount > 0 && (
                      <Button onClick={clearFilters} variant="secondary">
                        Clear all filters
                      </Button>
                    )}
                    <Button onClick={handleAddWarehouse} variant="primary" leftIcon={<FiPlus />}>
                      Add Warehouse
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Warehouse Card Grid */}
          {!loading && filteredWarehouses.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWarehouses.map((w, ind) => {
                const statusInfo = getStatusInfo(w);
                const StatusIcon = statusInfo.icon;
                const isCompany = w.warehouse_type === "company";
                const is3PL = w.warehouse_type === "3pl";

                return (
                  <div
                    key={w.id || `wh-${ind}`}
                    className="card rounded-3xl overflow-hidden bg-surface border border-border shadow-xs hover:shadow-xl hover:scale-[1.008] transition-all flex flex-col group h-full relative"
                  >
                    {/* Image Header with Badge Overlay */}
                    <div className="relative overflow-hidden h-44 shrink-0 bg-surface-elevated">
                      {w.images?.length > 0 ? (
                        <CardImageSlider
                          images={w.images.map((img) => `${img}`)}
                          height="100%"
                          aspectRatio="auto"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-linear-to-tr from-primary/10 via-primary/5 to-transparent relative group">
                          <img
                            src={isCompany
                              ? "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80"
                              : "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&auto=format&fit=crop&q=80"
                            }
                            alt={w.warehouse_name || w.warehouse_code}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 items-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-xs ${isCompany
                          ? "bg-emerald-950/70 text-emerald-300 border-emerald-500/30"
                          : "bg-blue-950/70 text-blue-300 border-blue-500/30"
                          }`}>
                          {isCompany ? <FiHome className="w-3 h-3" /> : <FiTruck className="w-3 h-3" />}
                          {isCompany ? "Company Warehouse" : "3PL Partner"}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${w.is_active === 1 || w.is_active === true
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${w.is_active ? "bg-emerald-400" : "bg-amber-400"}`} />
                          {w.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Code Badge */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-md border border-white/20">
                          {w.warehouse_code}
                        </span>
                      </div>
                    </div>

                    {/* Body Info */}
                    <div className="p-5 flex flex-col flex-1 space-y-3.5">
                      {/* Name & Vendor */}
                      <div>
                        <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1" title={w.warehouse_name || w.warehouse_code}>
                          {w.warehouse_name || w.warehouse_code}
                        </h3>
                        {is3PL && (
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                            <FiTruck className="w-3 h-3" />
                            Vendor: {w.vendor_name || w.vendor?.company_name || "Logistics Partner"}
                          </p>
                        )}
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                          <FiMapPin className="w-3 h-3 text-primary shrink-0" />
                          <span>{w.district}, {w.state} ({w.pincode || "Pincode N/A"})</span>
                        </p>
                      </div>

                      {/* Metrics Strip */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-surface-elevated/70 p-3 rounded-2xl border border-border">
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Active Kits</span>
                          <span className="font-black text-text-primary text-sm flex items-center gap-1">
                            <FiPackage className="w-3.5 h-3.5 text-primary" />
                            {w.active_kits_count || 0} Kits
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Max Capacity</span>
                          <span className="font-black text-text-primary text-sm">
                            {w.max_weight_capacity_kg ? `${w.max_weight_capacity_kg.toLocaleString()} kg` : (w.warehouse_area_sqft ? `${w.warehouse_area_sqft} sq.ft.` : "Configurable")}
                          </span>
                        </div>
                      </div>

                      {/* Operational Permissions Indicators */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-text-secondary">
                        <span className="text-[10px] uppercase font-bold text-text-muted">Permissions:</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.inward ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Inward
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.outward ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Outward
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${w.operational_permissions?.dispatch ? "bg-emerald-500/10 text-emerald-600" : "bg-bg text-text-muted opacity-50"}`}>
                            Dispatch
                          </span>
                        </div>
                      </div>

                      {/* Contextual Action Buttons */}
                      <div className="pt-3 border-t border-border/60 flex flex-col gap-2 mt-auto">
                        {/* Company Inactive -> 10-Gate Checklist */}
                        {isCompany && !w.is_active && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none"
                            onClick={() => setChecklistWhId(w.id)}
                          >
                            <FiCheckSquare className="w-3.5 h-3.5 mr-1.5" />
                            10-Gate Activation Checklist
                          </Button>
                        )}

                        {/* 3PL Inactive -> Inspect & Verify Facility */}
                        {is3PL && !w.is_active && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold border-none"
                            onClick={() => setInspectionWh(w)}
                          >
                            <FiTruck className="w-3.5 h-3.5 mr-1.5" />
                            Conduct 3PL Inspection & Details
                          </Button>
                        )}

                        {/* 3PL Active -> Inspection & Details Audit */}
                        {is3PL && w.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center border-blue-500/30 text-blue-600 hover:bg-blue-500/10 font-medium"
                            onClick={() => setInspectionWh(w)}
                          >
                            <FiShield className="w-3.5 h-3.5 mr-1.5" />
                            3PL Inspection & Facility Details
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="justify-center text-xs"
                            onClick={() => {
                              const cSlug = (w.country || "india").toLowerCase();
                              navigate(`/admin-panel/solar-shop/${cSlug}/warehouse-kit-activations/${w.id}`);
                            }}
                          >
                            <FiPackage className="w-3.5 h-3.5 mr-1" />
                            Configure Kits
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-center text-xs"
                            onClick={() => navigate(`edit-warehouse/${w.id}`)}
                          >
                            <FiEdit2 className="w-3.5 h-3.5 mr-1" />
                            Edit Facility
                          </Button>
                        </div>

                        {is3PL && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-center text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            onClick={() => setCommercialsWh(w)}
                          >
                            <FaRupeeSign className="w-3.5 h-3.5 mr-1" />
                            Commercial Terms & SLA
                          </Button>
                        )}

                        {/* Extra controls (Edit & Suspend) */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => navigate(`edit-warehouse/${w.id}`)}
                            className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            Edit Location
                          </button>

                          <button
                            type="button"
                            onClick={() => setSuspendPopup({
                              open: true,
                              warehouse: w,
                              action: w.is_active ? "suspend" : "activate"
                            })}
                            className={`text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${w.is_active
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-emerald-500 hover:text-emerald-600"
                              }`}
                          >
                            {w.is_active ? (
                              <>
                                <FiPauseCircle className="w-3.5 h-3.5" />
                                Suspend Hub
                              </>
                            ) : (
                              <>
                                <FiPlayCircle className="w-3.5 h-3.5" />
                                Reactivate
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {/* 1. Company Warehouse 10-Gate Activation Modal */}
      {checklistWhId && (
        <CompanyActivationModal
          warehouseId={checklistWhId}
          isOpen={Boolean(checklistWhId)}
          onClose={() => setChecklistWhId(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 2. 3PL Warehouse Inspection Modal */}
      {inspectionWh && (
        <ThreePLInspectionModal
          warehouse={inspectionWh}
          isOpen={Boolean(inspectionWh)}
          onClose={() => setInspectionWh(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 3. 3PL Commercial Terms & SLA Modal */}
      {commercialsWh && (
        <ThreePLCommercialsModal
          warehouse={commercialsWh}
          isOpen={Boolean(commercialsWh)}
          onClose={() => setCommercialsWh(null)}
          onSuccess={fetchWarehouses}
          moduleUniqueId={moduleUniqueId}
        />
      )}

      {/* 4. 3PL Vendor Onboarding & Verification Modal */}
      <ThreePLVendorManagementModal
        isOpen={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        onVendorSelected={(vendor) => {
          navigate("add-warehouse");
        }}
        moduleUniqueId={moduleUniqueId}
      />

      {/* 5. Suspend / Reactivate Confirmation Popup */}
      <ConfirmationPopup
        isOpen={suspendPopup.open}
        onClose={() => setSuspendPopup({ open: false, warehouse: null, action: "suspend" })}
        onConfirm={handleToggleStatus}
        title={suspendPopup.action === "suspend" ? "Suspend Warehouse" : "Reactivate Warehouse"}
        message={
          suspendPopup.action === "suspend"
            ? `Are you sure you want to suspend '${suspendPopup.warehouse?.warehouse_name || suspendPopup.warehouse?.warehouse_code}'? It will temporarily be excluded from new order allocation, but all historical order records will be retained.`
            : `Reactivate '${suspendPopup.warehouse?.warehouse_name || suspendPopup.warehouse?.warehouse_code}' to restore it as an active fulfillment hub?`
        }
        confirmText={suspendPopup.action === "suspend" ? "Suspend" : "Reactivate"}
        confirmVariant={suspendPopup.action === "suspend" ? "danger" : "primary"}
      />
    </div>
  );
}
