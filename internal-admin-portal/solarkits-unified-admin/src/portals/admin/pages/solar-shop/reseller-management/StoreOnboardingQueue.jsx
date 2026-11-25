import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FaStore } from "react-icons/fa";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiXCircle,
  FiDollarSign,
  FiTruck,
  FiUserCheck,
  FiFileText,
  FiLayers,
  FiLoader,
  FiEye,
  FiActivity,
  FiCheck,
  FiX,
  FiShield,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;

// Lifecycle status definitions
const STATUS_CONFIG = {
  store_created: { label: "Store Created", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200" },
  agreement_pending: { label: "Agreement Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200" },
  agreement_signed: { label: "Agreement Signed", color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200" },
  payment_pending: { label: "Payment Pending", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200" },
  payment_verification_pending: { label: "Payment Verification", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200" },
  payment_verified: { label: "Payment Verified", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200" },
  setup_verification_pending: { label: "Setup Verification", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200" },
  active: { label: "Active & Operational", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200" },
  on_hold: { label: "On Hold", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200" },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200" },
};

export default function StoreOnboardingQueue() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all"); // 'all' | 'company_store' | 'franchisee_store'
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'status' | 'payment' | 'bde' | 'warehouse' | 'history' | 'hold_reject'
  const [selectedStore, setSelectedStore] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states for modals
  const [targetStatus, setTargetStatus] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [bdeList, setBdeList] = useState([]);
  const [selectedBdeId, setSelectedBdeId] = useState("");
  const [warehouseList, setWarehouseList] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [holdRejectAction, setHoldRejectAction] = useState("hold"); // 'hold' | 'reject'
  const [actionReason, setActionReason] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  // Load pipeline stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/store-management/onboarding/pipeline-stats`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load pipeline stats:", err);
    }
  }, []);

  // Load stores queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        status: statusFilter,
        store_category: categoryFilter,
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await axios.get(`${API_BASE}/store-management/onboarding/queue?${params}`, {
        headers: authHeaderObj(),
      });

      if (res.data?.status === "success") {
        setStores(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch onboarding queue:", err);
      dispatch(setAlert({ show: true, type: "error", message: "Failed to load store queue." }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, categoryFilter, search, dispatch]);

  useEffect(() => {
    fetchStats();
    fetchQueue();
  }, [fetchStats, fetchQueue]);

  // Load BDE list for assignment modal
  const loadBdes = async () => {
    try {
      const res = await axios
        .get(`${API_BASE}/store-management/bde/list?unique_id=RSL_MGMT&req_for=view`, {
          headers: authHeaderObj(),
        })
        .catch(() =>
          axios.get(`${API_BASE}/bde/list?unique_id=RSL_MGMT&req_for=view&limit=100`, {
            headers: authHeaderObj(),
          })
        );
      if (res?.data?.data) setBdeList(res.data.data);
    } catch (err) {
      console.error("Failed to load BDEs:", err);
    }
  };

  // Load Warehouses list for allocation modal
  const loadWarehouses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/store-management/warehouses/list?active_only=true`, {
        headers: authHeaderObj(),
      });
      if (res.data?.data) setWarehouseList(res.data.data);
    } catch (err) {
      console.error("Failed to load warehouses:", err);
    }
  };

  // Open status history modal
  const openHistoryModal = async (store) => {
    setSelectedStore(store);
    setActiveModal("history");
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/store-management/onboarding/status-history/${store.id || store._id}`, {
        headers: authHeaderObj(),
      });
      if (res.data?.data) setStatusHistory(res.data.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      dispatch(setAlert({ show: true, type: "error", message: "Failed to load audit history." }));
    } finally {
      setLoadingHistory(false);
    }
  };

  // Advance Status submission
  const handleAdvanceStatus = async () => {
    if (!targetStatus) return;
    setModalSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/onboarding/advance-status`,
        {
          store_id: selectedStore.id || selectedStore._id,
          target_status: targetStatus,
          remarks: modalRemarks,
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: res.data.message }));
        setActiveModal(null);
        fetchQueue();
        fetchStats();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Failed to advance status.",
        })
      );
    } finally {
      setModalSaving(false);
    }
  };

  // Accounts Payment Verification submission
  const handleVerifyPayment = async () => {
    setModalSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/payments/verify`,
        {
          store_id: selectedStore.id || selectedStore._id,
          remarks: modalRemarks,
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: "Fee payment verified successfully by Accounts!" }));
        setActiveModal(null);
        fetchQueue();
        fetchStats();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Payment verification failed.",
        })
      );
    } finally {
      setModalSaving(false);
    }
  };

  // Company Store BDE Assignment submission
  const handleAssignBde = async () => {
    if (!selectedBdeId) return;
    setModalSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/bde/assign`,
        {
          store_id: selectedStore.id || selectedStore._id,
          bde_id: selectedBdeId,
          remarks: modalRemarks,
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: res.data.message }));
        setActiveModal(null);
        fetchQueue();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Failed to assign BDE.",
        })
      );
    } finally {
      setModalSaving(false);
    }
  };

  // Warehouse Allocation & Verification
  const handleAllocateWarehouse = async () => {
    if (!selectedWarehouseId) return;
    setModalSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/warehouses/allocate`,
        {
          store_id: selectedStore.id || selectedStore._id,
          warehouse_id: selectedWarehouseId,
          remarks: modalRemarks,
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: "Warehouse allocated successfully." }));
        setActiveModal(null);
        fetchQueue();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Failed to allocate warehouse.",
        })
      );
    } finally {
      setModalSaving(false);
    }
  };

  const handleVerifyWarehouse = async (store) => {
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/warehouses/verify`,
        {
          store_id: store.id || store._id,
          remarks: "Verified fulfillment readiness",
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: "Warehouse allocation verified!" }));
        fetchQueue();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Failed to verify warehouse.",
        })
      );
    }
  };

  // Hold or Reject Submission
  const handleHoldOrReject = async () => {
    if (!actionReason.trim()) {
      dispatch(setAlert({ show: true, type: "error", message: "Please provide a reason." }));
      return;
    }
    setModalSaving(true);
    try {
      const res = await axios.post(
        `${API_BASE}/store-management/onboarding/hold-or-reject`,
        {
          store_id: selectedStore.id || selectedStore._id,
          action: holdRejectAction,
          reason: actionReason,
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ show: true, type: "success", message: res.data.message }));
        setActiveModal(null);
        fetchQueue();
        fetchStats();
      }
    } catch (err) {
      dispatch(
        setAlert({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Operation failed.",
        })
      );
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <FaStore className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Store Onboarding & Lifecycle Queue
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage Company and Franchisee store onboarding stages, Accounts fee verification, and operations start
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchStats();
                fetchQueue();
              }}
              className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Refresh Queue"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => navigate("/admin-panel/solar-shop/reseller-management/create-store")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition"
            >
              <FiPlus className="text-lg" /> Onboard New Store
            </button>
          </div>
        </div>

        {/* Funnel Counters / Stats Bar */}
        {stats && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Stores</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total || 0}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex gap-2">
                <span>Company: {stats.company_stores || 0}</span>
                <span>•</span>
                <span>Franchisee: {stats.franchisee_stores || 0}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Created / Init</span>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.by_status?.store_created || 0}</div>
              <span className="text-[11px] text-blue-500">Pipeline Started</span>
            </div>

            <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Fee Pending</span>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                {(stats.by_status?.payment_pending || 0) + (stats.by_status?.payment_verification_pending || 0)}
              </div>
              <span className="text-[11px] text-orange-500">Accounts Approval</span>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20 shadow-sm">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Payment Verified</span>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{stats.by_status?.payment_verified || 0}</div>
              <span className="text-[11px] text-purple-500">Cleared by Accounts</span>
            </div>

            <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm">
              <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Physical Setup</span>
              <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mt-1">{stats.by_status?.setup_verification_pending || 0}</div>
              <span className="text-[11px] text-cyan-500">Store Construction</span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Operational</span>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.by_status?.active || 0}</div>
              <span className="text-[11px] text-emerald-500">Active Live Stores</span>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by store name, mobile, email, GST, or UTR..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* Category Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                categoryFilter === "all" ? "bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white font-bold" : "text-slate-500"
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setCategoryFilter("company_store")}
              className={`px-3 py-1.5 rounded-lg transition ${
                categoryFilter === "company_store" ? "bg-white dark:bg-slate-700 shadow text-purple-700 dark:text-purple-300 font-bold" : "text-slate-500"
              }`}
            >
              Company Store
            </button>
            <button
              onClick={() => setCategoryFilter("franchisee_store")}
              className={`px-3 py-1.5 rounded-lg transition ${
                categoryFilter === "franchisee_store" ? "bg-white dark:bg-slate-700 shadow text-blue-700 dark:text-blue-300 font-bold" : "text-slate-500"
              }`}
            >
              Franchisee Store
            </button>
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="all">All Lifecycle Stages</option>
              <option value="store_created">1. Store Created</option>
              <option value="agreement_pending">2. Agreement Pending</option>
              <option value="agreement_signed">3. Agreement Signed</option>
              <option value="payment_pending">4. Payment Pending</option>
              <option value="payment_verification_pending">5. Payment Verification Pending</option>
              <option value="payment_verified">6. Payment Verified</option>
              <option value="setup_verification_pending">7. Setup Verification Pending</option>
              <option value="active">8. Active & Operational</option>
              <option value="on_hold">On Hold</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Store List Cards */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FiLoader className="text-4xl text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading store onboarding queue...</p>
          </div>
        ) : stores.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <FaStore className="text-5xl text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No stores found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              There are no stores matching the selected criteria. Onboard a new store to start the lifecycle pipeline.
            </p>
            <button
              onClick={() => navigate("/admin-panel/solar-shop/reseller-management/create-store")}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition"
            >
              Onboard Store Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => {
              const statusCfg = STATUS_CONFIG[store.reseller_lifecycle_status] || {
                label: store.reseller_lifecycle_status,
                color: "bg-slate-100 text-slate-800 border-slate-200",
              };
              const isCompanyStore = store.store_category === "company_store";
              const setup = store.store_setup;
              const hasWarehouse = setup?.warehouse_allocated;
              const warehouseVerified = setup?.warehouse_allocation_verified;

              return (
                <div
                  key={store.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Store Title & Badges */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{store.business_name}</h3>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isCompanyStore
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          }`}
                        >
                          {isCompanyStore ? "Company Store" : "Franchisee Store"}
                        </span>
                        {store.franchisee_subtype && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {store.franchisee_subtype.name}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Contact & Location */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>📞 {store.mobile}</span>
                        <span>✉️ {store.email}</span>
                        {store.address?.city && <span>📍 {store.address.city} ({store.address.pincode || "No Pincode"})</span>}
                        {store.gst_number && <span>GST: <span className="font-mono text-slate-700 dark:text-slate-300">{store.gst_number}</span></span>}
                      </div>

                      {/* Commercial Rules & Allocations Bar */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        <span className="text-slate-400">Plan: <strong className="text-slate-700 dark:text-slate-200">{store.plan?.name || "N/A"}</strong></span>
                        <span className="text-slate-400">•</span>
                        <span>
                          Setup Fee:{" "}
                          <strong className={store.fee_payment_status === "verified" ? "text-emerald-600" : "text-amber-600"}>
                            {store.fee_payment_status === "verified" ? "Verified" : store.fee_payment_status || "Pending"}
                          </strong>
                          {store.fee_payment_amount ? ` (₹${store.fee_payment_amount.toLocaleString()})` : ""}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>
                          BDE: <strong className="text-slate-700 dark:text-slate-200">{store.bde?.name || store.bde?.full_name || "Unassigned"}</strong>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>
                          Warehouse:{" "}
                          <strong className={warehouseVerified ? "text-emerald-600" : hasWarehouse ? "text-amber-600" : "text-red-500"}>
                            {warehouseVerified ? "Allocated & Verified" : hasWarehouse ? "Allocated (Pending Verification)" : "Not Allocated"}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Advance Status Button */}
                      <button
                        onClick={() => {
                          setSelectedStore(store);
                          setTargetStatus(store.reseller_lifecycle_status);
                          setModalRemarks("");
                          setActiveModal("status");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1 shadow-sm"
                      >
                        Advance Stage <FiChevronRight />
                      </button>

                      {/* Accounts Fee Verification Modal Trigger (if fee applicable) */}
                      {store.plan?.setup_cost_enabled && store.fee_payment_status !== "verified" && (
                        <button
                          onClick={() => {
                            setSelectedStore(store);
                            setModalRemarks("");
                            setActiveModal("payment");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-1"
                        >
                          <FiDollarSign /> Verify Fee
                        </button>
                      )}

                      {/* BDE Assignment (Company Store) */}
                      {isCompanyStore && (
                        <button
                          onClick={() => {
                            setSelectedStore(store);
                            setSelectedBdeId(store.bde?.id || "");
                            setModalRemarks("");
                            loadBdes();
                            setActiveModal("bde");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                        >
                          <FiUserCheck /> BDE Assign
                        </button>
                      )}

                      {/* Warehouse Allocation Button */}
                      <button
                        onClick={() => {
                          setSelectedStore(store);
                          const whId =
                            typeof store.store_setup?.warehouse_id === "object"
                              ? store.store_setup?.warehouse_id?._id || store.store_setup?.warehouse_id?.id || ""
                              : store.store_setup?.warehouse_id || "";
                          setSelectedWarehouseId(whId);
                          setModalRemarks("");
                          loadWarehouses();
                          setActiveModal("warehouse");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                      >
                        <FiTruck /> Warehouse
                      </button>

                      {/* Warehouse Quick Verify Button if allocated but not verified */}
                      {hasWarehouse && !warehouseVerified && (
                        <button
                          onClick={() => handleVerifyWarehouse(store)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                          title="Verify Allocated Warehouse"
                        >
                          <FiCheck /> Verify WH
                        </button>
                      )}

                      {/* Hold or Reject Trigger */}
                      <button
                        onClick={() => {
                          setSelectedStore(store);
                          setHoldRejectAction("hold");
                          setActionReason("");
                          setActiveModal("hold_reject");
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Hold or Reject Store"
                      >
                        <FiAlertTriangle />
                      </button>

                      {/* Audit History Timeline */}
                      <button
                        onClick={() => openHistoryModal(store)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View Status History"
                      >
                        <FiActivity />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} stores)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL 1: ADVANCE STAGE MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal === "status" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Advance Store Stage</h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Transitioning lifecycle state for <strong>{selectedStore.business_name}</strong>
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1">Target Lifecycle State</label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="store_created">1. Store Created</option>
                    <option value="agreement_pending">2. Agreement Pending</option>
                    <option value="agreement_signed">3. Agreement Signed</option>
                    <option value="payment_pending">4. Payment Pending</option>
                    <option value="payment_verification_pending">5. Payment Verification Pending</option>
                    <option value="payment_verified">6. Payment Verified</option>
                    <option value="setup_verification_pending">7. Setup Verification Pending</option>
                    <option value="active">8. Active & Operational (Final Activation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Remarks / Note</label>
                  <textarea
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    rows={3}
                    placeholder="Provide details about this status transition..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                {targetStatus === "active" && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <FiShield /> Final Activation Gate Verification:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Franchise Agreement must be signed</li>
                      <li>Setup fee verified by Accounts team (if cost applicable)</li>
                      <li>Primary warehouse allocated and verified</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={handleAdvanceStatus}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSaving ? "Advancing..." : "Confirm Transition"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: ACCOUNTS FEE PAYMENT VERIFICATION ───────────────────────── */}
      <AnimatePresence>
        {activeModal === "payment" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiDollarSign className="text-purple-600" /> Accounts Payment Verification
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Store:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedStore.business_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Amount:</span>
                  <strong className="text-emerald-600">₹{(selectedStore.fee_payment_amount || 0).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Ref Number:</span>
                  <strong className="font-mono text-purple-600">{selectedStore.fee_payment_utr || "Pending submission"}</strong>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <label className="block text-xs font-semibold">Accounts Verification Remarks</label>
                <textarea
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Bank statement matched, UTR verified with HDFC account..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving || !selectedStore.fee_payment_utr}
                  onClick={handleVerifyPayment}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSaving ? "Verifying..." : "Confirm & Verify Payment"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: COMPANY STORE BDE ASSIGNMENT ─────────────────────────────── */}
      <AnimatePresence>
        {activeModal === "bde" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiUserCheck className="text-purple-600" /> Assign Company Store BDE
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Assign or transfer dedicated BDE leadership for Company Store: <strong>{selectedStore.business_name}</strong>
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1">Select BDE</label>
                  <select
                    value={selectedBdeId}
                    onChange={(e) => setSelectedBdeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">-- Select Active BDE --</option>
                    {bdeList.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        {b.name || b.full_name} ({b.employee_id || b.bde_id || "No ID"}) — {b.mobile || b.mobile_number || b.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Assignment Remarks</label>
                  <textarea
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    rows={2}
                    placeholder="Reason or assignment notes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving || !selectedBdeId}
                  onClick={handleAssignBde}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSaving ? "Assigning..." : "Assign BDE"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: WAREHOUSE ALLOCATION ────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal === "warehouse" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiTruck className="text-blue-600" /> Allocate Primary Supply Warehouse
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <p className="text-xs text-slate-500 mb-4">
                Store: <strong>{selectedStore.business_name}</strong>
              </p>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold mb-1">Select Supply Warehouse</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Select Active Warehouse --</option>
                    {warehouseList.map((w) => (
                      <option key={w.id || w._id} value={w.id || w._id}>
                        {w.warehouse_code} — {w.address || "Main Facility"} ({w.pincode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Allocation Remarks</label>
                  <textarea
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    rows={2}
                    placeholder="Logistics notes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving || !selectedWarehouseId}
                  onClick={handleAllocateWarehouse}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSaving ? "Allocating..." : "Allocate Warehouse"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 5: HOLD OR REJECT MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal === "hold_reject" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FiAlertTriangle className="text-rose-600" /> Hold or Reject Store
                </h3>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hold_reject"
                      value="hold"
                      checked={holdRejectAction === "hold"}
                      onChange={() => setHoldRejectAction("hold")}
                    />
                    <span className="font-semibold text-yellow-600">Place on Hold</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hold_reject"
                      value="reject"
                      checked={holdRejectAction === "reject"}
                      onChange={() => setHoldRejectAction("reject")}
                    />
                    <span className="font-semibold text-rose-600">Reject Application</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Reason (Mandatory) *</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    placeholder="Specify why this store is placed on hold or rejected..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving || !actionReason.trim()}
                  onClick={handleHoldOrReject}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {modalSaving ? "Processing..." : `Confirm ${holdRejectAction === "hold" ? "Hold" : "Rejection"}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 6: IMMUTABLE AUDIT HISTORY TIMELINE ────────────────────────── */}
      <AnimatePresence>
        {activeModal === "history" && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FiActivity className="text-amber-500 text-xl" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Audit Trail: {selectedStore.business_name}
                  </h3>
                </div>
                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 space-y-4">
                {loadingHistory ? (
                  <div className="py-12 text-center">
                    <FiLoader className="text-3xl text-amber-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading audit history...</p>
                  </div>
                ) : statusHistory.length === 0 ? (
                  <p className="text-center py-12 text-slate-400 text-sm">No status transitions recorded yet.</p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-4 space-y-6">
                    {statusHistory.map((item) => (
                      <div key={item.id} className="relative">
                        <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {item.to_status}
                          </span>
                          <span className="text-slate-400">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.remarks}</p>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                          <span>Actor: <strong>{item.actor_name}</strong> ({item.actor_type})</span>
                          {item.from_status && (
                            <>
                              <span>•</span>
                              <span>From: {item.from_status}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
