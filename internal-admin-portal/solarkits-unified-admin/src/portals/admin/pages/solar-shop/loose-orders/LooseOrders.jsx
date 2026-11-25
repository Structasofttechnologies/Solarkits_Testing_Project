import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaBoxes,
  FaGlobe,
  FaMapMarkerAlt,
  FaWarehouse,
  FaClipboardList,
  FaEdit,
  FaSlidersH,
  FaBoxOpen,
  FaUsers,
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaTruck,
  FaMoneyBillWave,
  FaTimes,
  FaSyncAlt,
  FaBuilding,
  FaStore,
  FaReceipt,
  FaCheck,
  FaRoute,
  FaMapPin,
  FaCheckDouble,
  FaCogs,
  FaExclamationTriangle
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomTable from "@/components/CustomTable";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

function fmtINR(val) {
  return `₹${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// delivery_address can be a plain string OR a structured object from the API
function fmtAddress(addr) {
  if (!addr) return null;
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const parts = [
      addr.line,
      addr.district_name,
      addr.state_name,
      addr.pincode,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : "Franchise Regional Hub";
  }
  return String(addr);
}

const STATUS_BADGES = {
  PENDING:             { label: "Pending", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  SUBMITTED:           { label: "Submitted", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  CONFIRMED:           { label: "1. Confirmed", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  PROCESSING:          { label: "2. Processing", bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  VEHICLE_ASSIGNED:    { label: "3. Vehicle Assigned", bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  READY_FOR_DISPATCH:  { label: "4. Ready for Dispatch", bg: "#fefce8", text: "#a16207", border: "#fde047" },
  DISPATCHED:          { label: "5. Dispatched", bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe" },
  IN_TRANSIT:          { label: "6. In Transit", bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  REACHED_DESTINATION: { label: "7. Reached Dest.", bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  DELIVERED:           { label: "8. Delivered", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  COMPLETED:           { label: "Completed", bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  CANCELLED:           { label: "Cancelled", bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
};

const PAYMENT_BADGES = {
  PAID:                 { label: "Paid", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  VERIFIED:             { label: "Verified", bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  VERIFICATION_PENDING: { label: "Verify Pending", bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  PENDING:              { label: "Pending", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  FAILED:               { label: "Failed", bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
};

function StatusBadge({ status }) {
  const norm = String(status || "SUBMITTED").toUpperCase();
  const cfg = STATUS_BADGES[norm] || { label: norm, bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-xs"
      style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const norm = String(status || "PENDING").toUpperCase();
  const cfg = PAYMENT_BADGES[norm] || { label: norm, bg: "#fffbeb", text: "#b45309", border: "#fde68a" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-xs"
      style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

function getStageBadgeText(status) {
  const norm = String(status || "SUBMITTED").toUpperCase();
  const map = {
    CONFIRMED: "Stage 1/8",
    PAID: "Stage 1/8",
    APPROVED: "Stage 1/8",
    SUBMITTED: "Stage 1/8",
    PROCESSING: "Stage 2/8",
    STOCK_ALLOCATED: "Stage 2/8",
    VEHICLE_ASSIGNED: "Stage 3/8",
    READY_FOR_DISPATCH: "Stage 4/8",
    PARTIALLY_DISPATCHED: "Stage 5/8",
    DISPATCHED: "Stage 5/8",
    IN_TRANSIT: "Stage 6/8",
    REACHED_DESTINATION: "Stage 7/8",
    DELIVERED: "Stage 8/8 ✓",
    COMPLETED: "Stage 8/8 ✓",
  };
  return map[norm] || "Stage 1/8";
}

export default function LooseOrders({ moduleUniqueId = "ADM_LOOSE_ORDERS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isWarehousePanel = location.pathname.startsWith("/warehouse-management-panel");
  const isAccountsPanel = location.pathname.startsWith("/account-panel");
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Top Primary Tab: "franchisee_loose" | "warehouse_loose"
  const [activeTab, setActiveTab] = useState("franchisee_loose");

  // ── Franchisee Loose Orders State ──────────────────────────────────────────
  const [looseOrders, setLooseOrders] = useState([]);
  const [looseStats, setLooseStats] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [routingFilter, setRoutingFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment Confirmation Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRefInput, setPaymentRefInput] = useState("");

  // ── Module 1: 8-Stage Pipeline & Vehicle Assignment States ─────────────────
  const [stageLoading, setStageLoading] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [recommendedVehicle, setRecommendedVehicle] = useState(null);
  const [recommendationNotes, setRecommendationNotes] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Dispatch modal state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchCourier, setDispatchCourier] = useState("");
  const [dispatchTrackingNum, setDispatchTrackingNum] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");

  // In-transit milestone modal
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneDesc, setMilestoneDesc] = useState("");

  // ── Warehouse Loose Configurations State ───────────────────────────────────
  const [activeCountries, setActiveCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [settings, setSettings] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");

  // ── Fetch Franchisee Loose Orders ─────────────────────────────────────────
  const fetchLooseOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        axios.get(
          `${API_URL}/reseller-mgmt/orders/loose-orders?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ).catch(() => ({ data: { data: [] } })),
        axios.get(
          `${API_URL}/reseller-mgmt/orders/stats?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ).catch(() => ({ data: { data: null } }))
      ]);

      if (ordersRes.data?.status === "success") {
        setLooseOrders(ordersRes.data.data || []);
      }
      if (statsRes.data?.status === "success" && statsRes.data.data) {
        setLooseStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Error fetching loose orders:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load Franchisee Loose Orders" }));
    } finally {
      setOrdersLoading(false);
    }
  }, [moduleUniqueId, dispatch]);

  // ── Fetch Warehouse Loose Configurations ──────────────────────────────────
  const fetchCountriesAndSettings = useCallback(async () => {
    setWarehouseLoading(true);
    try {
      const isIndiaUrl = isWarehousePanel || isAccountsPanel || (countryName || "india").toLowerCase() === "india" || (countryName || "").toLowerCase() === "in";
      const looseEndpoint = isIndiaUrl ? "india/loose-order-settings" : "loose-order-settings";

      const [countriesRes, warehousesRes, looseRes] = await Promise.all([
        axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(`${API_URL}/solarshop/${looseEndpoint}?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }).catch(() => ({ data: { data: [] } }))
      ]);

      const activeCountriesList = countriesRes.data?.countries || [];
      setActiveCountries(activeCountriesList);

      if (activeCountriesList.length > 0) {
        const activeCountriesNames = activeCountriesList.map(c => c.name.toLowerCase());

        if (isWarehousePanel || isAccountsPanel) {
          // Do not redirect out to admin portal when inside warehouse or accounts panel
        } else if (!countryName) {
          const storedCountry = localStorage.getItem('selected_country_solar-shop');
          const defaultCountry = (storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase()))
            ? storedCountry.toLowerCase()
            : activeCountriesList[0].name.toLowerCase();

          navigate(`/admin-panel/solar-shop/${defaultCountry}/loose-orders`, { replace: true });
          return;
        } else {
          const matchedCountry = activeCountriesList.find(c => c.name.toLowerCase() === countryName.toLowerCase());
          if (!matchedCountry) {
            const defaultCountry = activeCountriesList[0].name.toLowerCase();
            navigate(`/admin-panel/solar-shop/${defaultCountry}/loose-orders`, { replace: true });
            return;
          }
        }
      }

      const effectiveCountry = countryName || ((isWarehousePanel || isAccountsPanel) ? (localStorage.getItem('selected_country_solar-shop') || activeCountriesList[0]?.name?.toLowerCase() || "india") : "");
      const currentCountryObj = activeCountriesList.find(
        c => c.name.toLowerCase() === effectiveCountry?.toLowerCase()
      ) || activeCountriesList[0];

      const allWarehouses = warehousesRes.data?.warehouses || [];
      const countryWarehouses = currentCountryObj
        ? allWarehouses.filter(w => (w.country_id || w.level_0)?.toString() === currentCountryObj.id?.toString())
        : allWarehouses;
      setWarehouses(countryWarehouses);

      const allSettings = looseRes.data?.data || [];
      setSettings(allSettings);

      if (currentCountryObj) {
        axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: currentCountryObj.id },
          { headers: authHeaderObj() }
        ).then(statesRes => {
          setStates(statesRes.data?.states || []);
        }).catch(err => console.error("Error fetching states:", err));
      }
    } catch (error) {
      console.error("Error fetching loose order settings data:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load warehouse loose order settings" }));
    } finally {
      setWarehouseLoading(false);
    }
  }, [countryName, moduleUniqueId, navigate, dispatch, isWarehousePanel, isAccountsPanel]);

  useEffect(() => {
    if (token) {
      fetchLooseOrders();
      fetchCountriesAndSettings();
    }
  }, [token, fetchLooseOrders, fetchCountriesAndSettings]);

  // Current Country
  const effectiveCountry = countryName || ((isWarehousePanel || isAccountsPanel) ? (localStorage.getItem('selected_country_solar-shop') || activeCountries[0]?.name?.toLowerCase() || "india") : "");
  const currentCountry = activeCountries.find(
    c => c.name.toLowerCase() === effectiveCountry?.toLowerCase()
  ) || activeCountries[0];

  // Fetch clusters for selected state filter
  useEffect(() => {
    const fetchClustersForFilter = async () => {
      if (!stateFilter) {
        setClusters([]);
        setClusterFilter("");
        return;
      }
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/clusters/${stateFilter}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        setClusters(res.data?.clusters || []);
        setClusterFilter("");
      } catch (err) {
        console.error("Error fetching clusters:", err);
      }
    };
    if (token && stateFilter) {
      fetchClustersForFilter();
    }
  }, [stateFilter, token, moduleUniqueId]);

  // ── Filtered Loose Orders ─────────────────────────────────────────────────
  const filteredLooseOrders = useMemo(() => {
    return looseOrders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (routingFilter !== "ALL") {
        if (routingFilter === "primary_reseller" && !o.is_franchise_attributed) return false;
        if (routingFilter === "direct_fallback" && o.is_franchise_attributed) return false;
      }
      if (orderSearch && orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        const num = (o.order_number || "").toLowerCase();
        const partner = (o.reseller?.business_name || o.reseller?.name || "").toLowerCase();
        const buyer = (o.buyer?.name || "").toLowerCase();
        const kitName = (o.items?.[0]?.item_name || "").toLowerCase();
        return num.includes(q) || partner.includes(q) || buyer.includes(q) || kitName.includes(q);
      }
      return true;
    });
  }, [looseOrders, statusFilter, routingFilter, orderSearch]);

  // ── Metrics for Loose Orders ──────────────────────────────────────────────
  const totalLooseCount = looseStats?.loose_count ?? looseOrders.length;
  const franchiseAttributedCount = looseStats?.loose_attributed_count ?? looseOrders.filter(o => o.is_franchise_attributed).length;
  const directFallbackCount = looseOrders.filter(o => !o.is_franchise_attributed).length;
  const awaitingPaymentCount = looseOrders.filter(o => o.payment_status === "PENDING" || o.payment_status === "VERIFICATION_PENDING").length;

  const totalVolumeINR = looseStats?.loose_volume_inr ?? looseOrders.reduce((sum, o) => sum + (o.grand_total_inr || 0), 0);
  const totalKitsCount = looseStats?.loose_kits ?? looseOrders.reduce((sum, o) => sum + (o.total_kit_quantity || 0), 0);

  // ── Table Warehouse PO Settings ───────────────────────────────────────────
  const displayWarehouses = warehouses.filter(w => {
    if (stateFilter && (w.state_id || w.level_1)?.toString() !== stateFilter?.toString()) return false;
    if (clusterFilter && (w.cluster_id || w.cluster?.id || w.cluster)?.toString() !== clusterFilter?.toString()) return false;
    return true;
  });

  const warehouseTableData = displayWarehouses.map(w => {
    const targetId = (w.id || w._id)?.toString();
    const warehouseSettings = settings.filter(s => (s.warehouse_id || s.warehouse?.id || s.warehouse?._id)?.toString() === targetId);
    return {
      warehouse: w,
      settings: warehouseSettings,
      is_enabled: warehouseSettings.some(s => s.is_active !== false)
    };
  });

  const handleConfigureLooseOrders = (w) => {
    const targetId = w.id || w._id;
    if (isWarehousePanel) {
      navigate(`/warehouse-management-panel/loose-orders/${targetId}`);
    } else if (isAccountsPanel) {
      navigate(`/account-panel/solar-shop/loose-orders/${targetId}`);
    } else {
      navigate(`/admin-panel/solar-shop/${countryName?.toLowerCase()}/loose-orders/${targetId}`);
    }
  };

  const configuredWarehouseIds = [...new Set(settings.map(s => s.warehouse_id?.toString()).filter(Boolean))];
  const configuredCount = warehouses.filter(w => configuredWarehouseIds.includes(w.id)).length;
  const pendingCount = Math.max(0, warehouses.length - configuredCount);

  // ── Workflow Action Handlers ───────────────────────────────────────────────
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/franchisee/po/confirm-payment?unique_id=${moduleUniqueId}&req_for=edit`,
        {
          po_id: selectedOrder._id,
          payment_reference: paymentRefInput || `PAY-${Date.now()}`,
          payment_mode: "BANK_TRANSFER",
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Payment confirmed successfully!" }));
        setShowPaymentModal(false);
        setPaymentRefInput("");
        setSelectedOrder(null);
        fetchLooseOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Payment confirmation failed." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    const tracking = prompt("Enter dispatch courier / tracking number:", "TRK-" + Math.floor(100000 + Math.random() * 900000));
    if (!tracking) return;
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/dispatch?unique_id=${moduleUniqueId}&req_for=edit`,
        { po_id: orderId, tracking_number: tracking },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Loose Order marked as Dispatched!" }));
        setSelectedOrder(null);
        fetchLooseOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to dispatch loose order." }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverOrder = async (orderId) => {
    if (!confirm("Are you sure you want to mark this Loose Order as Delivered?")) return;
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_URL}/franchisee/po/deliver?unique_id=${moduleUniqueId}&req_for=edit`,
        { po_id: orderId },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Loose Order marked as Delivered!" }));
        setSelectedOrder(null);
        fetchLooseOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to mark delivered." }));
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Module 1: 8-Stage Progression & Vehicle Assignment Handlers ─────────

  const handleOpenVehicleAssignment = async (order) => {
    setSelectedVehicleId("");
    setIsOverride(false);
    setOverrideReason("");
    setRecommendedVehicle(null);
    setRecommendationNotes("");
    setShowVehicleModal(true);
    setLoadingVehicles(true);

    try {
      // 1. Fetch available vehicles
      const vRes = await axios.get(`${API_URL}/warehouse/vehicles`, { headers: authHeaderObj() });
      const vehicles = vRes.data?.data || [];
      setAvailableVehicles(vehicles);

      // 2. Fetch recommendation
      const rRes = await axios.get(
        `${API_URL}/warehouse/vehicles/recommend-for-order?order_id=${order._id}`,
        { headers: authHeaderObj() }
      );
      if (rRes.data?.status === "success" && rRes.data?.data?.recommended_vehicle) {
        const rec = rRes.data.data.recommended_vehicle;
        setRecommendedVehicle(rec);
        setSelectedVehicleId(rec._id);
        setRecommendationNotes(rRes.data.data.notes || "Optimal capacity & weight fit for this load.");
      } else if (vehicles.length > 0) {
        setSelectedVehicleId(vehicles[0]._id);
      }
    } catch (err) {
      console.error("Failed to load vehicle recommendations:", err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleAssignVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      dispatch(setAlert({ type: "error", message: "Please select a vehicle." }));
      return;
    }
    const isOverridden = recommendedVehicle && String(selectedVehicleId) !== String(recommendedVehicle._id);
    if (isOverridden && (!overrideReason || overrideReason.trim().length < 5)) {
      dispatch(setAlert({ type: "error", message: "Admin Override requires a reason of at least 5 characters." }));
      return;
    }

    setStageLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/reseller-mgmt/orders/${selectedOrder._id}/assign-vehicle`,
        {
          vehicle_id: selectedVehicleId,
          is_override: isOverridden,
          override_reason: isOverridden ? overrideReason.trim() : undefined,
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Stage 3: Vehicle assigned successfully!" }));
        setShowVehicleModal(false);
        if (res.data.data) setSelectedOrder(prev => ({ ...prev, ...res.data.data, status: "VEHICLE_ASSIGNED" }));
        fetchLooseOrders();
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to assign vehicle." }));
    } finally {
      setStageLoading(false);
    }
  };

  const handleAdvanceStage = async (nextStage, extraPayload = {}) => {
    setStageLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/reseller-mgmt/orders/${selectedOrder._id}/stage/${nextStage}`,
        extraPayload,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: `Order transitioned to ${nextStage.replace(/_/g, ' ').toUpperCase()} successfully!`
        }));
        if (res.data.data) {
          setSelectedOrder(prev => ({
            ...prev,
            ...res.data.data,
            status: nextStage.toUpperCase()
          }));
        }
        fetchLooseOrders();
        setShowDispatchModal(false);
        setShowMilestoneModal(false);
      }
    } catch (err) {
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || `Failed to transition to ${nextStage}.`
      }));
    } finally {
      setStageLoading(false);
    }
  };

  // Table Headers for Loose Orders
  const looseOrderHeaders = [
    { key: "order_number", label: "Order Number / Type" },
    { key: "franchisee", label: "Franchisee Partner" },
    { key: "buyer", label: "Buyer / Destination" },
    { key: "items", label: "Kit / Loose Qty" },
    { key: "amount", label: "Total Amount (INR)" },
    { key: "payment", label: "Payment Status" },
    { key: "payment_date", label: "Payment Confirmed" },
    { key: "days_elapsed", label: "Days Elapsed" },
    { key: "days_remaining", label: "SLA / Overdue" },
    { key: "status", label: "Order Status" },
    { key: "actions", label: "Actions", align: "right" },
  ];

  // Table Headers for Warehouses
  const warehouseHeaders = [
    { key: "warehouse_code", label: "Warehouse" },
    { key: "address", label: "Address" },
    { key: "location", label: "State & Cluster" },
    { key: "status", label: "Loose Orders Status" },
    { key: "actions", label: "Actions", align: "right" }
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Header Banner with Primary Tabs ──────────────────────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-primary-end p-6 lg:p-8 text-white shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FaBoxes className="text-white text-3xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                  Loose Orders Workspace
                </h1>
                {currentCountry && (
                  <span className="bg-white/20 rounded-full px-3 py-0.5 text-xs font-bold uppercase border border-white/30">
                    {currentCountry.name}
                  </span>
                )}
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1">
                Manage Franchisee Loose Kit Orders, on-demand retail requests, and warehouse-level inventory settings.
              </p>
            </div>
          </div>

          {/* Top Primary Tabs */}
          <div className="flex items-center p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab("franchisee_loose")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "franchisee_loose"
                  ? "bg-white text-primary shadow-lg"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <FaBoxes size={14} />
              <span>Franchisee Loose Orders ({looseOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("warehouse_loose")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "warehouse_loose"
                  ? "bg-white text-primary shadow-lg"
                  : "text-white/80 hover:text-white"
              }`}
            >
              <FaWarehouse size={14} />
              <span>Warehouse Loose Configurations</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB 1: FRANCHISEE LOOSE ORDERS VIEW ───────────────────────────────── */}
      {activeTab === "franchisee_loose" && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 border-l-4 border-l-primary shadow-sm bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Loose Orders</span>
                <span className="p-2 bg-primary/10 rounded-lg text-primary"><FaBoxes size={16} /></span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-text-primary">{totalLooseCount}</span>
                <span className="text-xs text-text-muted ml-2 font-medium">({totalKitsCount} kits total)</span>
              </div>
              <div className="mt-1 text-xs font-bold text-primary">{fmtINR(totalVolumeINR)}</div>
            </div>

            <div className="card p-5 border-l-4 border-l-purple-500 shadow-sm bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Franchise Attributed</span>
                <span className="p-2 bg-purple-500/10 rounded-lg text-purple-600"><FaBuilding size={16} /></span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-purple-600">{franchiseAttributedCount}</span>
                <span className="text-xs text-text-muted ml-2">Orders</span>
              </div>
              <div className="mt-1 text-xs text-text-secondary">Created by or mapped to franchisees</div>
            </div>

            <div className="card p-5 border-l-4 border-l-cyan-500 shadow-sm bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Direct / Fallback Store</span>
                <span className="p-2 bg-cyan-500/10 rounded-lg text-cyan-600"><FaStore size={16} /></span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-cyan-600">{directFallbackCount}</span>
                <span className="text-xs text-text-muted ml-2">Orders</span>
              </div>
              <div className="mt-1 text-xs text-text-secondary">Direct EPC loose checkout orders</div>
            </div>

            <div className="card p-5 border-l-4 border-l-amber-500 shadow-sm bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Awaiting Payment / Review</span>
                <span className="p-2 bg-amber-500/10 rounded-lg text-amber-600"><FaClock size={16} /></span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-amber-600">{awaitingPaymentCount}</span>
                <span className="text-xs text-text-muted ml-2">Pending</span>
              </div>
              <div className="mt-1 text-xs text-text-secondary">Pending verification or confirmation</div>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="card p-4 border border-border shadow-xs bg-surface flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={13} />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search Order #, Partner, Buyer, or Kit..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-surface-hover/30 focus:outline-hidden focus:border-primary transition-colors text-text-primary"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Routing Filter */}
              <div className="w-full sm:w-44">
                <Dropdown
                  placeholder="Source Filter"
                  options={[
                    { value: "ALL", text: "All Sources" },
                    { value: "primary_reseller", text: "Franchise Attributed" },
                    { value: "direct_fallback", text: "Direct Fallback" },
                  ]}
                  value={routingFilter}
                  onChange={(val) => setRoutingFilter(val)}
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-48">
                <Dropdown
                  placeholder="Status Filter"
                  options={[
                    { value: "ALL", text: "All Statuses" },
                    { value: "SUBMITTED", text: "Submitted" },
                    { value: "CONFIRMED", text: "1. Confirmed" },
                    { value: "PROCESSING", text: "2. Processing" },
                    { value: "VEHICLE_ASSIGNED", text: "3. Vehicle Assigned" },
                    { value: "READY_FOR_DISPATCH", text: "4. Ready for Dispatch" },
                    { value: "DISPATCHED", text: "5. Dispatched" },
                    { value: "IN_TRANSIT", text: "6. In Transit" },
                    { value: "REACHED_DESTINATION", text: "7. Reached Destination" },
                    { value: "DELIVERED", text: "8. Delivered" },
                    { value: "COMPLETED", text: "Completed" },
                    { value: "CANCELLED", text: "Cancelled" },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchLooseOrders}
                className="text-xs font-bold gap-2"
              >
                <FaSyncAlt size={12} className={ordersLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Orders Table */}
          {ordersLoading ? (
            <Loader text="Loading Franchisee Loose Orders..." />
          ) : (
            <div className="card shadow-sm border border-border overflow-hidden bg-surface">
              <CustomTable
                headers={looseOrderHeaders}
                data={filteredLooseOrders}
                renderRow={(row) => (
                  <tr key={row._id} className="hover:bg-surface-hover/50 transition-colors border-b border-border/50">
                    {/* Order Number & Type */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          row.is_franchise_attributed
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-cyan-100 text-cyan-700 border border-cyan-200"
                        }`}>
                          {row.is_franchise_attributed ? <FaBuilding size={14} /> : <FaStore size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary text-xs flex items-center gap-2">
                            <span>{row.order_number}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              row.is_franchise_attributed
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                            }`}>
                              {row.is_franchise_attributed ? "Franchise Order" : "Direct Store"}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted mt-0.5">
                            {row.created_at ? new Date(row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Franchisee Partner */}
                    <td className="p-4">
                      {row.reseller ? (
                        <div>
                          <div className="font-bold text-text-primary text-xs">{row.reseller.business_name}</div>
                          <div className="text-[11px] text-text-muted mt-0.5">{row.reseller.mobile || row.reseller.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">Central Direct Dispatch</span>
                      )}
                    </td>

                    {/* Buyer / Destination */}
                    <td className="p-4">
                      <div>
                        <div className="font-bold text-text-primary text-xs">{row.buyer?.name || "Hub Stock"}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {row.destination_type === "hub_stock" ? "Regional Franchise Warehouse Hub" : (row.buyer?.gstin ? `GST: ${row.buyer.gstin}` : "EPC Buyer Partner")}
                        </div>
                      </div>
                    </td>

                    {/* Items & Qty */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-primary/10 text-primary border border-primary/20">
                          {row.total_kit_quantity} Kits
                        </span>
                        <span className="text-xs text-text-secondary truncate max-w-xs" title={row.items?.[0]?.item_name}>
                          {row.items?.[0]?.item_name || "Solar Kit"}
                          {row.items?.length > 1 && ` +${row.items.length - 1} more`}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4">
                      <div className="font-black text-text-primary text-xs">{fmtINR(row.grand_total_inr)}</div>
                      <div className="text-[11px] text-text-muted">Incl. Tax</div>
                    </td>

                    {/* Payment Status */}
                    <td className="p-4">
                      <PaymentBadge status={row.payment_status} />
                      {row.payment_utr && (
                        <div className="text-[10px] text-text-muted font-mono mt-0.5 truncate max-w-[120px]" title={row.payment_utr}>
                          UTR: {row.payment_utr}
                        </div>
                      )}
                    </td>

                    {/* Payment Confirmed Date */}
                    <td className="p-4">
                      {row.payment_confirmed_at || row.paid_at || (row.payment_status === "PAID" || row.payment_status === "VERIFIED" ? row.updated_at || row.created_at : null) ? (
                        <div>
                          <div className="text-xs font-mono font-medium text-text-primary">
                            {new Date(row.payment_confirmed_at || row.paid_at || row.updated_at || row.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono">
                            {new Date(row.payment_confirmed_at || row.paid_at || row.updated_at || row.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted font-mono">—</span>
                      )}
                    </td>

                    {/* Days Elapsed */}
                    <td className="p-4">
                      {(() => {
                        const payDate = row.payment_confirmed_at || row.paid_at || (row.payment_status === "PAID" || row.payment_status === "VERIFIED" ? row.updated_at || row.created_at : null);
                        if (!payDate) return <span className="text-xs text-text-muted font-mono">—</span>;
                        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payDate).getTime()) / (1000 * 60 * 60 * 24)));
                        let badgeColor = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                        if (elapsed > 30) badgeColor = "bg-red-500/10 text-red-600 border-red-500/20 font-black";
                        else if (elapsed > 15) badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold";
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
                            {elapsed}d elapsed
                          </span>
                        );
                      })()}
                    </td>

                    {/* SLA / Overdue */}
                    <td className="p-4">
                      {(() => {
                        const isDelivered = row.status === "DELIVERED" || row.status === "COMPLETED";
                        if (isDelivered) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <FaCheckCircle size={10} /> Delivered
                            </span>
                          );
                        }
                        const payDate = row.payment_confirmed_at || row.paid_at || (row.payment_status === "PAID" || row.payment_status === "VERIFIED" ? row.updated_at || row.created_at : null);
                        if (!payDate) return <span className="text-xs text-text-muted">—</span>;
                        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(payDate).getTime()) / (1000 * 60 * 60 * 24)));
                        const targetDays = 15;
                        const remaining = targetDays - elapsed;
                        if (remaining < 0) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-red-500/10 text-red-600 border border-red-500/20">
                              <FaExclamationTriangle size={10} /> Overdue {Math.abs(remaining)}d
                            </span>
                          );
                        }
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${remaining <= 3 ? "text-amber-600 bg-amber-500/10" : "text-text-secondary"}`}>
                            {remaining}d left
                          </span>
                        );
                      })()}
                    </td>

                    {/* Order Status */}
                    <td className="p-4">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedOrder(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-primary hover:opacity-95 text-white shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                          title="Open 8-Step Product Journey Lifecycle"
                        >
                          <FaTruck size={12} />
                          <span>8-Step Journey</span>
                          <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-extrabold">
                            {getStageBadgeText(row.status)}
                          </span>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(row)}
                          className="text-xs font-bold gap-1.5 shadow-xs"
                        >
                          <FaEye size={12} />
                          View Details
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              />

              {filteredLooseOrders.length === 0 && (
                <div className="p-12 text-center text-text-muted space-y-2">
                  <FaBoxOpen size={36} className="mx-auto text-text-muted/40" />
                  <p className="text-sm font-semibold">No loose orders found matching your criteria</p>
                  <p className="text-xs">When franchisees or EPC buyers create loose kit orders, they will appear right here.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Order Detail Modal ───────────────────────────────────────────── */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-hover/40 sticky top-0 z-20 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <FaBoxes size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-text-primary">{selectedOrder.order_number}</h2>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          selectedOrder.is_franchise_attributed ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700"
                        }`}>
                          {selectedOrder.is_franchise_attributed ? "Franchise Order" : "Direct Store Fallback"}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Created on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString("en-IN") : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedOrder.status} />
                    <PaymentBadge status={selectedOrder.payment_status} />
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                  {/* ─── 8-STAGE LIVE TRACKER STEPPER ─── */}
                  {(() => {
                    const STAGES_LIST = [
                      { key: "CONFIRMED", label: "1. Confirmed", sub: "Payment verified" },
                      { key: "PROCESSING", label: "2. Processing", sub: "Warehouse staging" },
                      { key: "VEHICLE_ASSIGNED", label: "3. Vehicle Assigned", sub: "Assigned to fleet" },
                      { key: "READY_FOR_DISPATCH", label: "4. Ready for Dispatch", sub: "Ready at gate" },
                      { key: "DISPATCHED", label: "5. Dispatched", sub: "Leaves warehouse" },
                      { key: "IN_TRANSIT", label: "6. In Transit", sub: "En route" },
                      { key: "REACHED_DESTINATION", label: "7. Reached Dest.", sub: "Arrived at hub/site" },
                      { key: "DELIVERED", label: "8. Delivered", sub: "Delivery confirmed" },
                    ];

                    const currStatus = String(selectedOrder.order_status || selectedOrder.status || "CONFIRMED").toUpperCase();
                    let activeIdx = STAGES_LIST.findIndex(s => s.key === currStatus);
                    if (activeIdx === -1) {
                      if (currStatus === "COMPLETED") activeIdx = 7;
                      else if (currStatus === "PAID" || currStatus === "SUBMITTED") activeIdx = 0;
                      else activeIdx = 0;
                    }

                    return (
                      <div className="card p-5 border border-border bg-surface shadow-xs space-y-4 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-primary/10 text-primary rounded-full">
                              Module 1: 8-Stage Order Lifecycle Pipeline
                            </span>
                            <h3 className="text-sm font-extrabold text-text-primary mt-1 flex items-center gap-2">
                              <span>Live Stage:</span>
                              <span className="text-primary font-black">
                                {STAGES_LIST[activeIdx]?.label || currStatus}
                              </span>
                            </h3>
                          </div>
                          {selectedOrder.fulfillment_mode && (
                            <div className="text-xs bg-surface-hover px-3 py-1.5 rounded-xl border border-border flex items-center gap-1.5">
                              <span className="text-text-muted">Fulfillment:</span>
                              <strong className="text-text-primary capitalize">{selectedOrder.fulfillment_mode.replace(/_/g, " ")}</strong>
                            </div>
                          )}
                        </div>

                        {/* Stepper Progress Bar */}
                        <div className="overflow-x-auto pb-2">
                          <div className="flex items-center min-w-[700px] justify-between relative">
                            <div className="absolute top-4 left-6 right-6 h-1 bg-border -z-0">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${(activeIdx / (STAGES_LIST.length - 1)) * 100}%` }}
                              />
                            </div>

                            {STAGES_LIST.map((stage, idx) => {
                              const isCompleted = idx < activeIdx;
                              const isCurrent = idx === activeIdx;
                              return (
                                <div key={stage.key} className="flex flex-col items-center text-center relative z-10 w-24">
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all ${
                                      isCompleted
                                        ? "bg-emerald-600 text-white"
                                        : isCurrent
                                        ? "bg-primary text-white ring-4 ring-primary/20 scale-110 animate-pulse"
                                        : "bg-surface border-2 border-border text-text-muted"
                                    }`}
                                  >
                                    {isCompleted ? <FaCheck size={12} /> : idx + 1}
                                  </div>
                                  <p className={`text-[11px] font-bold mt-2 leading-tight ${isCurrent ? "text-primary font-black" : isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-text-muted"}`}>
                                    {stage.label.replace(/^\d+\.\s*/, "")}
                                  </p>
                                  <p className="text-[9px] text-text-muted mt-0.5">{stage.sub}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── Order Load Metrics & Vehicle Status Info ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          {/* Load Metrics Card */}
                          <div className="p-3.5 bg-surface-hover/50 rounded-xl border border-border text-xs space-y-2">
                            <div className="font-bold text-text-secondary flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <FaBoxes className="text-primary" /> Order Load Metrics
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                              <div className="p-2 bg-surface rounded-lg border border-border/70">
                                <span className="text-[10px] text-text-muted block">Total Kits</span>
                                <strong className="text-xs text-text-primary">
                                  {selectedOrder.order_load_metrics?.total_kits ?? (selectedOrder.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0)} Units
                                </strong>
                              </div>
                              <div className="p-2 bg-surface rounded-lg border border-border/70">
                                <span className="text-[10px] text-text-muted block">Total kW</span>
                                <strong className="text-xs text-text-primary">
                                  {selectedOrder.order_load_metrics?.total_kw ?? (selectedOrder.items || []).reduce((acc, it) => acc + ((it.kw || it.capacity_kw || 5) * (it.quantity || 1)), 0)} kW
                                </strong>
                              </div>
                              <div className="p-2 bg-surface rounded-lg border border-border/70">
                                <span className="text-[10px] text-text-muted block">Est. Weight</span>
                                <strong className="text-xs text-text-primary">
                                  {selectedOrder.order_load_metrics?.total_weight_kg ?? (selectedOrder.items || []).reduce((acc, it) => acc + (it.quantity || 1) * 250, 0)} kg
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Assigned Vehicle & Logistics Card */}
                          <div className="p-3.5 bg-surface-hover/50 rounded-xl border border-border text-xs space-y-2">
                            <div className="font-bold text-text-secondary flex items-center justify-between text-[11px] uppercase tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <FaTruck className="text-purple-600" /> Assigned Vehicle & Fleet
                              </span>
                              {selectedOrder.assigned_vehicle?.is_override ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-bold border border-amber-500/30">
                                  Admin Overridden
                                </span>
                              ) : selectedOrder.assigned_vehicle?.is_recommended ? (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-bold border border-emerald-500/30">
                                  AI Recommended
                                </span>
                              ) : null}
                            </div>

                            {selectedOrder.assigned_vehicle?.vehicle_name ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-extrabold text-text-primary text-xs">
                                    {selectedOrder.assigned_vehicle.vehicle_name} ({selectedOrder.assigned_vehicle.vehicle_registration})
                                  </span>
                                  <span className="text-[11px] text-text-secondary font-mono">
                                    {selectedOrder.assigned_vehicle.vehicle_type || "Commercial Fleet"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-text-secondary flex items-center gap-3">
                                  <span>Driver: <strong>{selectedOrder.assigned_vehicle.driver_name || "Assigned Driver"}</strong></span>
                                  <span>Contact: <strong>{selectedOrder.assigned_vehicle.driver_contact || "N/A"}</strong></span>
                                </div>
                                {selectedOrder.assigned_vehicle?.override_reason && (
                                  <div className="text-[10px] p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 text-amber-800 dark:text-amber-300">
                                    <strong>Override Reason:</strong> {selectedOrder.assigned_vehicle.override_reason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="pt-2 text-text-muted italic flex items-center justify-between">
                                <span>No vehicle assigned yet. Proceed to Stage 3 to allocate fleet.</span>
                                {activeIdx === 1 && (
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    onClick={() => handleOpenVehicleAssignment(selectedOrder)}
                                    className="text-[10px] font-bold"
                                  >
                                    Assign Fleet
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dispatch & Milestone tracking details if present */}
                        {(selectedOrder.dispatch_tracking?.tracking_number || (selectedOrder.milestones && selectedOrder.milestones.length > 0)) && (
                          <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 text-xs space-y-2">
                            {selectedOrder.dispatch_tracking?.tracking_number && (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="text-text-muted">Courier/Tracking: </span>
                                  <strong className="text-text-primary">{selectedOrder.dispatch_tracking.courier_name || "Company Transport"}</strong>
                                  <span className="font-mono ml-2 px-2 py-0.5 bg-surface rounded border border-border text-primary font-bold">
                                    {selectedOrder.dispatch_tracking.tracking_number}
                                  </span>
                                </div>
                                {selectedOrder.dispatch_tracking.dispatched_at && (
                                  <span className="text-[11px] text-text-muted">
                                    Dispatched on: {new Date(selectedOrder.dispatch_tracking.dispatched_at).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                            )}
                            {selectedOrder.milestones && selectedOrder.milestones.length > 0 && (
                              <div className="pt-2 border-t border-purple-500/10 space-y-1">
                                <span className="text-[10px] font-bold text-text-muted uppercase">In-Transit Milestones:</span>
                                <div className="space-y-1">
                                  {selectedOrder.milestones.map((m, mIdx) => (
                                    <div key={mIdx} className="text-[11px] flex items-center justify-between text-text-secondary bg-surface/50 px-2 py-1 rounded">
                                      <span className="flex items-center gap-1.5"><FaRoute className="text-primary" size={10} /> {m.description || m.status}</span>
                                      <span className="text-[10px] text-text-muted">{new Date(m.recorded_at).toLocaleTimeString("en-IN")}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Two Column Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Franchisee Partner Info */}
                    <div className="card p-4 border border-border bg-surface-hover/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                        <FaBuilding className="text-purple-600" />
                        <span>Franchisee Partner</span>
                      </div>
                      {selectedOrder.reseller ? (
                        <div>
                          <div className="font-black text-sm text-text-primary">{selectedOrder.reseller.business_name}</div>
                          <div className="text-xs text-text-secondary mt-1">Mobile: {selectedOrder.reseller.mobile || "N/A"}</div>
                          <div className="text-xs text-text-secondary">Email: {selectedOrder.reseller.email || "N/A"}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted italic">Central Direct Order (No franchisee linked)</div>
                      )}
                    </div>

                    {/* Buyer / Destination Info */}
                    <div className="card p-4 border border-border bg-surface-hover/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider">
                        <FaMapMarkerAlt className="text-primary" />
                        <span>Delivery Destination & Buyer</span>
                      </div>
                      <div>
                        <div className="font-black text-sm text-text-primary">{selectedOrder.buyer?.name || "Franchise Hub Stock"}</div>
                        <div className="text-xs text-text-secondary mt-1">
                          Destination: <span className="font-semibold">{selectedOrder.destination_type === "hub_stock" ? "Regional Franchise Hub Stock" : "EPC Buyer Delivery"}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          Address: <span className="font-medium">
                            {fmtAddress(selectedOrder.delivery_address) || "Franchise Regional Hub"}
                          </span>
                          {selectedOrder.destination_pincode && typeof selectedOrder.destination_pincode !== "object" && ` (PIN: ${selectedOrder.destination_pincode})`}
                          {selectedOrder.delivery_address?.contact_name && (
                            <span className="block text-text-muted">Contact: {selectedOrder.delivery_address.contact_name}{selectedOrder.delivery_address.contact_phone ? ` · ${selectedOrder.delivery_address.contact_phone}` : ""}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details Card */}
                  <div className="card p-4 border border-border bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        <FaMoneyBillWave className="text-emerald-600" />
                        <span>Payment & Settlement</span>
                      </div>
                      <PaymentBadge status={selectedOrder.payment_status} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-text-muted block">Payment UTR / Ref:</span>
                        <span className="font-mono font-bold text-text-primary">{selectedOrder.payment_utr || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Total Order Value:</span>
                        <span className="font-bold text-text-primary">{fmtINR(selectedOrder.grand_total_inr)}</span>
                      </div>
                      <div>
                        <span className="text-text-muted block">Payment Mode:</span>
                        <span className="font-bold text-text-primary">{selectedOrder.offline_payment?.payment_method || "Bank Transfer (NEFT/RTGS)"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-wider">Order Line Items</h3>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-surface-hover/60 text-text-muted font-bold border-b border-border">
                          <tr>
                            <th className="p-3 text-left">Item Name</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">GST Rate</th>
                            <th className="p-3 text-right">Total Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {(selectedOrder.items || []).map((item, idx) => (
                            <tr key={idx} className="hover:bg-surface-hover/30">
                              <td className="p-3 font-semibold text-text-primary">
                                {item.item_name}
                                {item.epc_allocations?.length > 0 && (
                                  <div className="mt-1 text-[11px] text-text-muted">
                                    Allocations: {item.epc_allocations.map(a => `${a.company_name || a.buyer_name} (${a.allocated_quantity})`).join(", ")}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-primary">{item.quantity}</td>
                              <td className="p-3 text-right text-text-secondary">{fmtINR(item.unit_price_inr)}</td>
                              <td className="p-3 text-right text-text-secondary">{Number(item.gst_rate != null ? item.gst_rate : 12).toFixed(1)}%</td>
                              <td className="p-3 text-right font-bold text-text-primary">{fmtINR(item.total_price_inr)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-surface-hover/40 font-bold border-t border-border">
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-text-muted">Subtotal (Taxable Base):</td>
                            <td className="p-3 text-right text-text-primary">{fmtINR(selectedOrder.subtotal_inr)}</td>
                          </tr>
                          {(() => {
                            const buyerState = (selectedOrder.delivery_address?.state_name || selectedOrder.buyer?.state_name || "").toLowerCase();
                            const isIntraState = !buyerState || buyerState.includes("gujarat");
                            const taxInr = Number(selectedOrder.tax_total_inr || 0);
                            const avgGstRate = Number(selectedOrder.items?.[0]?.gst_rate || 5);
                            const halfRate = (avgGstRate / 2).toFixed(1);

                            if (isIntraState && taxInr > 0) {
                              const halfTax = taxInr / 2;
                              return (
                                <>
                                  <tr className="text-text-muted font-medium text-[11px] bg-surface-hover/20">
                                    <td colSpan={4} className="py-1.5 px-3 text-right">CGST ({halfRate}%):</td>
                                    <td className="py-1.5 px-3 text-right text-text-secondary">{fmtINR(halfTax)}</td>
                                  </tr>
                                  <tr className="text-text-muted font-medium text-[11px] bg-surface-hover/20">
                                    <td colSpan={4} className="py-1.5 px-3 text-right">SGST ({halfRate}%):</td>
                                    <td className="py-1.5 px-3 text-right text-text-secondary">{fmtINR(halfTax)}</td>
                                  </tr>
                                </>
                              );
                            } else if (taxInr > 0) {
                              return (
                                <tr className="text-text-muted font-medium text-[11px] bg-surface-hover/20">
                                  <td colSpan={4} className="py-1.5 px-3 text-right">IGST ({avgGstRate.toFixed(1)}%):</td>
                                  <td className="py-1.5 px-3 text-right text-text-secondary">{fmtINR(taxInr)}</td>
                                </tr>
                              );
                            }
                            return null;
                          })()}
                          <tr>
                            <td colSpan={4} className="p-3 text-right text-text-muted">Total Tax:</td>
                            <td className="p-3 text-right text-text-primary">{fmtINR(selectedOrder.tax_total_inr)}</td>
                          </tr>
                          <tr className="text-sm font-black text-primary bg-primary/5">
                            <td colSpan={4} className="p-3 text-right">Grand Total:</td>
                            <td className="p-3 text-right">{fmtINR(selectedOrder.grand_total_inr)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-6 border-t border-border bg-surface-hover/30 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20 backdrop-blur-md">
                  <div className="text-xs text-text-muted">
                    Order Status: <span className="font-bold text-text-primary">{selectedOrder.status}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Confirm Payment Action (if not yet verified/paid) */}
                    {selectedOrder.payment_status !== "PAID" && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => {
                          setPaymentRefInput(selectedOrder.payment_utr || "");
                          setShowPaymentModal(true);
                        }}
                        className="text-xs font-bold gap-1.5"
                      >
                        <FaMoneyBillWave size={12} />
                        Confirm Payment
                      </Button>
                    )}

                    {/* ─── 8-Stage Pipeline Progression Action Buttons ─── */}
                    {(() => {
                      const currStatus = String(selectedOrder.order_status || selectedOrder.status || "CONFIRMED").toUpperCase();

                      return (
                        <>
                          {/* Stage 1 -> 2: Mark Processing */}
                          {(currStatus === "CONFIRMED" || currStatus === "PAID" || currStatus === "SUBMITTED") && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => handleAdvanceStage("processing")}
                              className="text-xs font-bold gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
                            >
                              <FaCogs size={12} />
                              {stageLoading ? "Updating..." : "Stage 2: Mark Processing"}
                            </Button>
                          )}

                          {/* Stage 2 -> 3: Assign Vehicle */}
                          {currStatus === "PROCESSING" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => handleOpenVehicleAssignment(selectedOrder)}
                              className="text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                              <FaTruck size={12} />
                              Stage 3: Assign Vehicle
                            </Button>
                          )}

                          {/* Stage 3 -> 4: Ready for Dispatch (STATUS ONLY - NO E-WAY BILL / INVOICE GENERATION) */}
                          {currStatus === "VEHICLE_ASSIGNED" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => handleAdvanceStage("ready_for_dispatch")}
                              className="text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <FaBoxOpen size={12} />
                              {stageLoading ? "Updating..." : "Stage 4: Ready for Dispatch"}
                            </Button>
                          )}

                          {/* Stage 4 -> 5: Dispatch Order */}
                          {currStatus === "READY_FOR_DISPATCH" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => {
                                setDispatchCourier(selectedOrder.assigned_vehicle?.vehicle_name || "Company Transport Fleet");
                                setDispatchTrackingNum("TRK-" + Math.floor(100000 + Math.random() * 900000));
                                setShowDispatchModal(true);
                              }}
                              className="text-xs font-bold gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <FaTruck size={12} />
                              Stage 5: Mark Dispatched
                            </Button>
                          )}

                          {/* Stage 5 -> 6: Mark In Transit */}
                          {currStatus === "DISPATCHED" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => {
                                setMilestoneDesc("Departed warehouse facility en route to destination");
                                setShowMilestoneModal(true);
                              }}
                              className="text-xs font-bold gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <FaRoute size={12} />
                              Stage 6: Mark In Transit
                            </Button>
                          )}

                          {/* Stage 6 -> 7: Reached Destination */}
                          {currStatus === "IN_TRANSIT" && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={stageLoading}
                                onClick={() => {
                                  setMilestoneDesc("");
                                  setShowMilestoneModal(true);
                                }}
                                className="text-xs font-bold gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                              >
                                + Add Milestone
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={stageLoading}
                                onClick={() => handleAdvanceStage("reached_destination")}
                                className="text-xs font-bold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                              >
                                <FaMapPin size={12} />
                                Stage 7: Mark Reached Destination
                              </Button>
                            </div>
                          )}

                          {/* Stage 7 -> 8: Mark Delivered (DIRECT CONFIRMATION - NO OTP VERIFICATION) */}
                          {currStatus === "REACHED_DESTINATION" && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={stageLoading}
                              onClick={() => {
                                if (window.confirm("Confirm this order has been successfully delivered? (No OTP verification required)")) {
                                  handleAdvanceStage("delivered");
                                }
                              }}
                              className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <FaCheckDouble size={12} />
                              {stageLoading ? "Updating..." : "Stage 8: Mark Delivered (Direct Confirmation)"}
                            </Button>
                          )}

                          {/* Stage 8 Completed */}
                          {(currStatus === "DELIVERED" || currStatus === "COMPLETED") && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300">
                              <FaCheckCircle size={14} /> Delivered & Completed
                            </span>
                          )}
                        </>
                      );
                    })()}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedOrder(null)}
                      className="text-xs font-bold"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Module 1: Vehicle Assignment Sub-Modal ─── */}
          {showVehicleModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <FaTruck size={16} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-text-primary text-base">Stage 3: Assign Delivery Vehicle</h3>
                      <p className="text-[11px] text-text-muted">Smart Auto-Recommendation & Admin Override Engine</p>
                    </div>
                  </div>
                  <button onClick={() => setShowVehicleModal(false)} className="text-text-muted hover:text-text-primary">
                    <FaTimes size={16} />
                  </button>
                </div>

                {loadingVehicles ? (
                  <div className="p-8 text-center text-text-muted text-xs">
                    <FaSyncAlt className="animate-spin mx-auto mb-2" size={20} />
                    Computing optimal vehicle recommendation...
                  </div>
                ) : (
                  <form onSubmit={handleAssignVehicleSubmit} className="space-y-4 text-xs">
                    {/* Recommended Vehicle Highlight Box */}
                    {recommendedVehicle ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                            <FaCheck size={10} /> AI Recommended Vehicle
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                            Closest Capacity & Weight Fit
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <div>
                            <p className="font-black text-sm text-text-primary">{recommendedVehicle.name}</p>
                            <p className="text-xs font-mono text-text-secondary">{recommendedVehicle.registration_number}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                              Cap: {recommendedVehicle.capacity_kg} kg
                            </span>
                            <span className="text-[10px] text-text-muted">
                              Max: {recommendedVehicle.max_kits || "∞"} kits / {recommendedVehicle.max_kw || "∞"} kW
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 italic pt-1 border-t border-emerald-500/20">
                          {recommendationNotes}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 text-xs">
                        No specific optimal match calculated. Please select an active vehicle from fleet below.
                      </div>
                    )}

                    {/* Vehicle Select Dropdown */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-text-secondary block">Select Delivery Vehicle from Fleet</label>
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-border bg-surface text-text-primary font-medium text-xs focus:ring-2 focus:ring-primary"
                        required
                      >
                        <option value="">-- Choose a Vehicle --</option>
                        {availableVehicles.map((v) => {
                          const isRec = recommendedVehicle && String(v._id) === String(recommendedVehicle._id);
                          return (
                            <option key={v._id} value={v._id}>
                              {isRec ? "⭐ [RECOMMENDED] " : ""}{v.name} ({v.registration_number}) - Cap: {v.capacity_kg} kg | {v.vehicle_type || "Fleet"}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Admin Override Warning & Mandatory Reason */}
                    {recommendedVehicle && selectedVehicleId && String(selectedVehicleId) !== String(recommendedVehicle._id) && (
                      <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-400 text-xs">
                          <FaExclamationTriangle />
                          <span>Admin Override Triggered</span>
                        </div>
                        <p className="text-[11px] text-text-secondary">
                          You are overriding the system's recommended vehicle. Please provide a mandatory reason for this manual allocation.
                        </p>
                        <textarea
                          rows={2}
                          placeholder="e.g. Recommended vehicle is currently scheduled for preventative maintenance, or destination has height restrictions."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-surface text-text-primary focus:outline-none"
                          required
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setShowVehicleModal(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="submit" disabled={stageLoading}>
                        {stageLoading ? "Assigning..." : "Confirm & Assign Vehicle"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ─── Module 1: Dispatch Details Sub-Modal ─── */}
          {showDispatchModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                    <FaTruck className="text-purple-600" /> Stage 5: Dispatch Order
                  </h3>
                  <button onClick={() => setShowDispatchModal(false)} className="text-text-muted hover:text-text-primary">
                    <FaTimes size={16} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdvanceStage("dispatched", {
                      dispatch_data: {
                        courier_name: dispatchCourier,
                        tracking_number: dispatchTrackingNum,
                        dispatch_notes: dispatchNotes,
                      },
                    });
                  }}
                  className="space-y-3 text-xs"
                >
                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary block">Courier / Vehicle Transporter Name</label>
                    <input
                      type="text"
                      value={dispatchCourier}
                      onChange={(e) => setDispatchCourier(e.target.value)}
                      placeholder="e.g. SolarKits Logistics Fleet or VRL Logistics"
                      className="w-full p-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary block">LR / Dispatch Tracking Number</label>
                    <input
                      type="text"
                      value={dispatchTrackingNum}
                      onChange={(e) => setDispatchTrackingNum(e.target.value)}
                      placeholder="e.g. TRK-892102"
                      className="w-full p-2.5 rounded-xl border border-border bg-surface text-text-primary font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary block">Dispatch Notes (Optional)</label>
                    <textarea
                      rows={2}
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g. Inspected and verified by warehouse gate manager"
                      className="w-full p-2 rounded-xl border border-border bg-surface text-text-primary text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setShowDispatchModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={stageLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {stageLoading ? "Dispatching..." : "Confirm Dispatch"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ─── Module 1: In-Transit Milestone Sub-Modal ─── */}
          {showMilestoneModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                    <FaRoute className="text-orange-600" /> Stage 6: In-Transit Milestone
                  </h3>
                  <button onClick={() => setShowMilestoneModal(false)} className="text-text-muted hover:text-text-primary">
                    <FaTimes size={16} />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdvanceStage("in_transit", {
                      milestone: {
                        status: "in_transit",
                        description: milestoneDesc || "In Transit update recorded",
                      },
                    });
                  }}
                  className="space-y-3 text-xs"
                >
                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary block">Milestone Description / Checkpoint</label>
                    <input
                      type="text"
                      value={milestoneDesc}
                      onChange={(e) => setMilestoneDesc(e.target.value)}
                      placeholder="e.g. Crossed State Toll Plaza / Checkpoint Alpha"
                      className="w-full p-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setShowMilestoneModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={stageLoading} className="bg-orange-600 hover:bg-orange-700 text-white">
                      {stageLoading ? "Saving..." : "Log In-Transit Milestone"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Payment Confirmation Sub-Modal ──────────────────────────────── */}
          {showPaymentModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <div className="bg-surface rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                    <FaMoneyBillWave className="text-emerald-600" /> Confirm Offline Payment
                  </h3>
                  <button onClick={() => setShowPaymentModal(false)} className="text-text-muted hover:text-text-primary">
                    <FaTimes size={16} />
                  </button>
                </div>

                <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Bank Transfer Reference / UTR Number
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentRefInput}
                      onChange={(e) => setPaymentRefInput(e.target.value)}
                      placeholder="e.g. UTR123456789"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface-hover/30 text-text-primary font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={actionLoading}
                      className="gap-1.5"
                    >
                      <FaCheck size={12} />
                      {actionLoading ? "Confirming..." : "Verify & Confirm"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: WAREHOUSE LOOSE CONFIGURATIONS VIEW ────────────────────────── */}
      {activeTab === "warehouse_loose" && (
        <div className="space-y-6">
          {warehouseLoading ? (
            <Loader text="Loading Loose Orders settings..." />
          ) : (
            <>
              {/* Active Country Context Detail Card */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="card p-6 border-l-4 border-l-primary shadow-sm space-y-4 bg-surface">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Active Market</h3>
                      <h2 className="text-lg font-black text-text-primary mt-1">
                        {currentCountry ? currentCountry.name : "No Selection"}
                      </h2>
                    </div>
                    {currentCountry && (
                      <ReactCountryFlag
                        countryCode={currentCountry.iso2}
                        svg
                        style={{ width: "2em", height: "1.5em" }}
                        className="rounded shadow-sm"
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-text-secondary">
                    <div className="flex justify-between">
                      <span>Region Dial Code:</span>
                      <span className="font-bold">{currentCountry?.phone_code || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Currency:</span>
                      <span className="font-bold">{currentCountry?.currency || "INR"}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Metrics */}
                <div className="card p-6 border-l-4 border-l-emerald-500 shadow-sm flex flex-col justify-between bg-surface">
                  <div>
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Total Warehouses</h3>
                    <h2 className="text-2xl font-black text-emerald-600 mt-2">{warehouses.length}</h2>
                  </div>
                  <p className="text-xs text-text-secondary mt-4">Registered facilities in this territory</p>
                </div>

                <div className="card p-6 border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-between bg-surface">
                  <div>
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Configured Hubs</h3>
                    <h2 className="text-2xl font-black text-blue-600 mt-2">{configuredCount}</h2>
                  </div>
                  <p className="text-xs text-text-secondary mt-4">Active loose order configurations</p>
                </div>

                <div className="card p-6 border-l-4 border-l-amber-500 shadow-sm flex flex-col justify-between bg-surface">
                  <div>
                    <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Pending Setup</h3>
                    <h2 className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</h2>
                  </div>
                  <p className="text-xs text-text-secondary mt-4">Warehouses needing initial setup</p>
                </div>
              </div>

              {/* Filtering and Location Selection */}
              <div className="card p-5 border border-border shadow-xs bg-surface">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FaSlidersH className="text-primary" />
                    <h3 className="font-bold text-text-primary text-sm">Territory Filters</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="w-full md:w-64">
                      <Dropdown
                        placeholder="Filter by State"
                        options={[
                          { value: "", text: "All States" },
                          ...states.map(s => ({ value: s.id, text: s.name }))
                        ]}
                        value={stateFilter}
                        onChange={(val) => {
                          setStateFilter(val);
                          setClusterFilter("");
                        }}
                      />
                    </div>

                    <div className="w-full md:w-64">
                      <Dropdown
                        placeholder="Filter by Cluster"
                        disabled={!stateFilter}
                        options={[
                          { value: "", text: "All Clusters" },
                          ...clusters.map(c => ({ value: c.id, text: c.name }))
                        ]}
                        value={clusterFilter}
                        onChange={(val) => setClusterFilter(val)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Warehouses Table */}
              <div className="card shadow-sm border border-border overflow-hidden bg-surface">
                <CustomTable
                  headers={warehouseHeaders}
                  data={warehouseTableData}
                  renderRow={(row) => (
                    <tr key={row.warehouse.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <FaWarehouse size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-text-primary text-sm flex items-center gap-2">
                              {row.warehouse.warehouse_code || row.warehouse.name || "Main Warehouse"}
                              <span className="text-[10px] px-2 py-0.5 rounded-full uppercase bg-surface-hover font-bold border border-border">
                                {row.warehouse.warehouse_type || "Hub"}
                              </span>
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              ID: {row.warehouse.id?.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-xs text-text-secondary max-w-xs truncate">
                        {row.warehouse.address || "N/A"}
                        {row.warehouse.pincode && <span className="block text-text-muted">PIN: {row.warehouse.pincode}</span>}
                      </td>

                      <td className="p-4">
                        <div className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                          <FaMapMarkerAlt className="text-primary text-[10px]" />
                          {row.warehouse.state_name || row.warehouse.state || "N/A"}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          Cluster: {row.warehouse.cluster_name || row.warehouse.cluster || "General"}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          row.is_enabled
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${row.is_enabled ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {row.is_enabled ? "Configured & Active" : "Pending Setup"}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleConfigureLooseOrders(row.warehouse)}
                          className="text-xs font-bold gap-1.5 shadow-sm"
                        >
                          <FaEdit size={13} />
                          Configure Loose Orders
                        </Button>
                      </td>
                    </tr>
                  )}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
