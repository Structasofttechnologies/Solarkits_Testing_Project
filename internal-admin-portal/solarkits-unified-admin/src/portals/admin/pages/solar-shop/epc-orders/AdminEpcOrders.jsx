import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  FaFileInvoiceDollar,
  FaUserShield,
  FaRegCopy,
  FaCheck,
  FaExternalLinkAlt,
  FaHistory,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  MdOutlineReceiptLong,
  MdRefresh,
  MdFilterList,
  MdCheckCircle,
  MdWarning,
  MdHistory,
  MdSettings,
  MdInfo,
  MdCheck,
  MdClose,
} from "react-icons/md";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiExternalLink,
  FiX,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";
import {
  getAdminEpcOrders,
  checkAdminDuplicateUtr,
  adminApproveEpcPayment,
  getAdminPaymentTatConfig,
  updateAdminPaymentTatConfig,
} from "../../../api/epcOrdersAdminApi";
import TransactionDetailsDrawer from "../../../../accounts/components/TransactionDetailsDrawer";
import Product8StageJourneyModal from "../../../../accounts/components/Product8StageJourneyModal";
import Button from "../../../components/Button";

export default function AdminEpcOrders() {
  const { user } = useSelector((state) => state.user_slice || {});

  // ── State: Orders & Metrics ─────────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_volume: 0,
    payments_received: 0,
    pending_payments: 0,
    payment_delays: 0,
    total_orders: 0,
    online_count: 0,
    online_volume: 0,
    offline_count: 0,
    offline_pending_count: 0,
    awaiting_admin_count: 0,
    approved_paid_count: 0,
    total_commissions: 0,
    direct_count: 0,
    onboarded_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // ── Active Tab Filter ──────────────────────────────────────────────────
  // 'awaiting_admin' (default for Admin queue) | 'approved_paid' | 'returned' | 'rejected' | 'offline_pending' | 'all'
  const [activeTab, setActiveTab] = useState("awaiting_admin");

  // ── Search & Filter State ──────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // ── Admin Review & Approval Modal State ────────────────────────────────
  const [adminModal, setAdminModal] = useState({
    isOpen: false,
    order: null,
    decision: "approved", // 'approved' | 'returned' | 'rejected'
    admin_remarks: "",
    submitting: false,
    duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null },
  });

  // ── Admin TAT Configuration Modal State ────────────────────────────────
  const [tatModal, setTatModal] = useState({
    isOpen: false,
    loading: false,
    saving: false,
    configs: {},
    procurement_settings: {
      production_tat_days: 5,
      supply_tat_days: 3,
      estimated_transport_cost: 0,
    },
  });

  // ── Side Drawer / Preview Modals ───────────────────────────────────────
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [journeyOrder, setJourneyOrder] = useState(null);
  const [historyModal, setHistoryModal] = useState({ isOpen: false, order: null });
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [alert, setAlert] = useState({ type: "", message: "" });

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: "", message: "" }), 5000);
  };

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard?.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  // ── Fetch Orders ────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        role: "admin",
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedStatus !== "all") params.payment_status = selectedStatus;
      if (selectedPaymentMode !== "all") params.payment_mode = selectedPaymentMode;
      if (dateRange.from) params.from_date = dateRange.from;
      if (dateRange.to) params.to_date = dateRange.to;

      // Map quick tabs
      if (activeTab === "awaiting_admin") {
        params.verification_status = "submitted_for_approval";
      } else if (activeTab === "approved_paid") {
        params.verification_status = "approved";
      } else if (activeTab === "returned") {
        params.verification_status = "returned";
      } else if (activeTab === "rejected") {
        params.verification_status = "rejected";
      } else if (activeTab === "offline_pending") {
        params.verification_status = "pending";
      } else if (activeTab === "delays") {
        params.delay_only = "true";
      }

      const res = await getAdminEpcOrders(params);

      if (res?.status === "success") {
        let orderList = res.data || [];
        if (selectedSignal !== "all") {
          orderList = orderList.filter((o) => o.delay_signal === selectedSignal);
        }
        setOrders(orderList);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin EPC orders:", err);
      showAlert("error", err?.response?.data?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, activeTab, selectedStatus, selectedPaymentMode, selectedSignal]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedPaymentMode("all");
    setSelectedSignal("all");
    setDateRange({ from: "", to: "" });
    setPage(1);
    setTimeout(fetchOrders, 50);
  };

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (searchQuery.trim()) c++;
    if (selectedStatus !== "all") c++;
    if (selectedPaymentMode !== "all") c++;
    if (selectedSignal !== "all") c++;
    if (dateRange.from || dateRange.to) c++;
    return c;
  }, [searchQuery, selectedStatus, selectedPaymentMode, selectedSignal, dateRange]);

  // ── Open Admin Approval Modal ───────────────────────────────────────────
  const handleOpenAdminModal = async (order) => {
    const utr = order.offline_payment?.utr_number || "";
    let duplicateCheck = { checked: false, isDuplicate: false, matchingOrder: null };

    if (utr) {
      try {
        const checkRes = await checkAdminDuplicateUtr(utr, order._id);
        if (checkRes?.status === "success") {
          duplicateCheck = {
            checked: true,
            isDuplicate: checkRes.is_duplicate,
            matchingOrder: checkRes.matching_order,
          };
        }
      } catch (err) {
        console.error("Duplicate check error:", err);
      }
    }

    setAdminModal({
      isOpen: true,
      order,
      decision: "approved",
      admin_remarks: "",
      submitting: false,
      duplicateCheck,
    });
  };

  // ── Submit Admin Decision ───────────────────────────────────────────────
  const handleSubmitAdminDecision = async (e) => {
    e.preventDefault();
    const { order, decision, admin_remarks } = adminModal;
    if (!order) return;

    if (decision === "rejected" && !admin_remarks.trim()) {
      showAlert("error", "Rejection remarks are mandatory.");
      return;
    }
    if (decision === "returned" && !admin_remarks.trim()) {
      showAlert("error", "Please provide a reason for returning to Accounts.");
      return;
    }

    setAdminModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await adminApproveEpcPayment(order._id, {
        decision,
        admin_remarks: admin_remarks.trim(),
        user_name: user?.name || "Admin",
      });

      if (res?.status === "success") {
        const actionLabel =
          decision === "approved"
            ? `Official Order #${res.official_order_number || res.data?.order_number} generated & activated!`
            : decision === "returned"
            ? "Order returned to Accounts for correction."
            : "Payment verification rejected.";

        showAlert("success", actionLabel);
        setAdminModal({
          isOpen: false,
          order: null,
          decision: "approved",
          admin_remarks: "",
          submitting: false,
          duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null },
        });
        fetchOrders();
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      } else {
        showAlert("error", res?.message || "Failed to submit admin decision.");
      }
    } catch (err) {
      console.error("Admin approval error:", err);
      showAlert("error", err?.response?.data?.message || "Admin approval failed.");
    } finally {
      setAdminModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // ── Admin TAT Configuration Modal Handlers ─────────────────────────────
  const handleOpenTatModal = async () => {
    setTatModal({
      isOpen: true,
      loading: true,
      saving: false,
      configs: {},
      procurement_settings: {
        production_tat_days: 5,
        supply_tat_days: 3,
        estimated_transport_cost: 0,
      },
    });
    try {
      const res = await getAdminPaymentTatConfig();
      if (res?.status === "success") {
        setTatModal((prev) => ({
          ...prev,
          loading: false,
          configs: res.configs || res.data || {},
          procurement_settings: res.procurement_settings || {
            production_tat_days: 5,
            supply_tat_days: 3,
            estimated_transport_cost: 0,
          },
        }));
      }
    } catch (err) {
      console.error("Failed to load TAT config:", err);
      showAlert("error", "Failed to load TAT configurations.");
      setTatModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSaveTatConfig = async () => {
    setTatModal((prev) => ({ ...prev, saving: true }));
    try {
      const payload = {
        stage_tats: tatModal.configs,
        configs: tatModal.configs,
        procurement_settings: tatModal.procurement_settings,
      };
      const res = await updateAdminPaymentTatConfig(payload);
      if (res?.status === "success") {
        showAlert("success", "Stage TAT & Procurement configurations updated successfully!");
        setTatModal((prev) => ({ ...prev, isOpen: false, saving: false }));
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to update TAT config:", err);
      showAlert("error", err?.response?.data?.message || "Failed to update TAT rules.");
      setTatModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  const formatDate = (val) => {
    if (!val) return "—";
    const d = new Date(val);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
  };

  const formatTime = (val) => {
    if (!val) return "";
    const d = new Date(val);
    return isNaN(d.getTime())
      ? ""
      : d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen text-text-primary">
      {/* ── Alert Toast ──────────────────────────────────────────────────────── */}
      {alert.message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-sm font-bold border transition ${
            alert.type === "error"
              ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
              : "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === "error" ? <FiAlertTriangle /> : <FiCheckCircle />}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert({ type: "", message: "" })}
            className="p-1 rounded-lg hover:bg-black/5"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* ── Top Header & Admin Settings Bar ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-purple-600/10 via-primary/5 to-transparent p-5 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <FaUserShield className="text-xl" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Solar Shop EPC Orders & Payment Approvals
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600/10 text-purple-700 dark:text-purple-300 border border-purple-600/20">
                  SOLARKITS ADMIN DESK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                Review offline payment verifications submitted by Accounts, verify bank UTR authenticity, approve offline orders to generate official Order Numbers (ORD-EPC-...). <strong className="text-purple-600 dark:text-purple-300">Note:</strong> Online ICICI payments are auto-approved instantly and do not require Admin approval.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Admin Settings */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          {/* Admin Stage TAT Rules Trigger */}
          <button
            type="button"
            onClick={handleOpenTatModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-purple-500/40 hover:border-purple-600 text-purple-700 dark:text-purple-300 transition flex items-center gap-1.5 shadow-sm hover:shadow"
            title="Configure Payment Stage TAT Days & Delay Warning Rules"
          >
            <MdSettings className="text-sm text-purple-600" />
            <span>Stage TAT Rules</span>
          </button>

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${
              showFilters || activeFiltersCount > 0
                ? "bg-primary/10 border-primary text-primary"
                : "bg-surface border-border text-text-secondary hover:text-text-primary shadow-sm"
            }`}
          >
            <MdFilterList className="text-sm" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Refresh */}
          <Button
            onClick={fetchOrders}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 shadow-sm"
            disabled={loading}
          >
            <MdRefresh className={`text-base ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Volume */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-xs font-bold mb-2">
            <span>Total Orders Volume</span>
            <FaFileInvoiceDollar className="text-primary text-base" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(stats.total_volume)}
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              {stats.total_orders || 0} Total Direct EPC Orders
            </div>
          </div>
        </div>

        {/* Awaiting Admin Approval */}
        <div className="p-4 rounded-2xl bg-surface border border-purple-500/30 shadow-sm flex flex-col justify-between bg-purple-500/5">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold mb-2">
            <span>Awaiting Admin Approval</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300">
              {stats.awaiting_admin_count || 0} Orders
            </div>
            <div className="text-[11px] text-purple-600/80 dark:text-purple-400 mt-1 font-semibold">
              Pending Admin official sign-off
            </div>
          </div>
        </div>

        {/* Approved Orders */}
        <div className="p-4 rounded-2xl bg-surface border border-emerald-500/30 shadow-sm flex flex-col justify-between bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
            <span>Approved & Paid Volume</span>
            <MdCheckCircle className="text-emerald-500 text-base" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(stats.payments_received)}
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400 mt-1">
              {stats.approved_paid_count || 0} Orders officially activated
            </div>
          </div>
        </div>

        {/* Payment Delays & Alerts */}
        <div className="p-4 rounded-2xl bg-surface border border-rose-500/30 shadow-sm flex flex-col justify-between bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs font-bold mb-2">
            <span>Stage Delayed Alerts</span>
            <MdWarning className="text-rose-500 text-base animate-pulse" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-300">
              {stats.payment_delays || 0} Delayed
            </div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400 mt-1 font-semibold">
              Exceeded configured Stage TAT days
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Segment Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab("awaiting_admin");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "awaiting_admin"
              ? "border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-500/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Pending Admin Approval</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-black">
            {stats.awaiting_admin_count || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("approved_paid");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "approved_paid"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Officially Approved</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-hover text-text-secondary">
            {stats.approved_paid_count || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("returned");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "returned"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Returned to Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("rejected");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "rejected"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Rejected Payments</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("offline_pending");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "offline_pending"
              ? "border-primary text-primary bg-primary/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Pending Accounts Verification</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-hover text-text-secondary">
            {stats.offline_pending_count || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("delays");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "delays"
              ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>Delayed (Exceeded TAT)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
            {stats.payment_delays || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setPage(1);
          }}
          className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === "all"
              ? "border-slate-800 dark:border-white text-slate-900 dark:text-white bg-surface-hover font-black"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          <span>All Orders</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-hover text-text-secondary">
            {stats.total_orders || 0}
          </span>
        </button>
      </div>

      {/* ── Filter Bar Drawer / Collapse ─────────────────────────────────────── */}
      {showFilters && (
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3 animate-in fade-in duration-200">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold text-text-secondary mb-1">
                Search Query
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Request ID, Official Order No, UTR, EPC Name, Mobile..."
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Delay Signal */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary mb-1">
                Stage Delay Signal
              </label>
              <select
                value={selectedSignal}
                onChange={(e) => setSelectedSignal(e.target.value)}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs outline-none"
              >
                <option value="all">All Signals</option>
                <option value="green">🟢 Within TAT (Green)</option>
                <option value="orange">🟠 Approaching TAT (Orange)</option>
                <option value="red">🔴 Overdue Alert (Red)</option>
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary mb-1">
                Payment Mode
              </label>
              <select
                value={selectedPaymentMode}
                onChange={(e) => setSelectedPaymentMode(e.target.value)}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs outline-none"
              >
                <option value="all">All Modes</option>
                <option value="offline">Offline Bank Transfer</option>
                <option value="online">Online (ICICI VAN)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Apply Filters
              </Button>
              <Button type="button" onClick={handleResetFilters} variant="outline" size="sm" className="w-full">
                Reset
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Main Orders Table ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/70 text-[11px] font-black text-text-secondary uppercase tracking-wider">
                <th className="py-3 px-3">Order IDs</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Solar EPC Customer</th>
                <th className="py-3 px-3 text-right">Order Amount</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">UTR / Reference</th>
                <th className="py-3 px-3">Accounts Verification</th>
                <th className="py-3 px-3">Admin Status</th>
                <th className="py-3 px-3 text-center">Stage & Days</th>
                <th className="py-3 px-3 text-center">Delay Signal</th>
                <th className="py-3 px-3 text-center">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted">
                    <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="font-bold">Loading orders & payment records...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-text-muted">
                    <MdOutlineReceiptLong className="text-4xl mx-auto mb-2 opacity-30 text-purple-600" />
                    <p className="font-bold text-sm">No orders found in this queue.</p>
                    <p className="text-xs text-text-muted mt-1">Try changing your tab or filters.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const reqId = o.order_request_id || (o.order_number ? `REQ-EPC-${String(o.order_number).replace(/^ORD-EPC-/, "")}` : o._id);
                  const offStatus = o.offline_payment?.verification_status || "pending";
                  const admStatus = o.offline_payment?.admin_approval_status || "pending";
                  const utr = o.offline_payment?.utr_number || o.bank_reference || "";
                  const receiptUrl =
                    o.offline_payment?.receipt_url ||
                    o.offline_payment?.payment_receipt_url ||
                    o.payment_receipt_url;
                  const signal = o.delay_signal || "green";
                  const isOnlineOrder = Boolean(o.is_online || o.payment_mode === "online" || o.payment_method === "icici_ecollection" || o.payment_gateway_used === "icici_ecollection");
                  const isOfficial = !!o.is_official_order_generated || isOnlineOrder;
                  const officialNumber = o.official_order_number || o.order_number;

                  const orderDate = o.created_at || o.createdAt || o.date || o.offline_payment?.payment_date;

                  const customerName =
                    o.buyer_name ||
                    o.epc_id?.company_name ||
                    o.epc_id?.name ||
                    o.delivery_address?.contact_name ||
                    o.customer?.name ||
                    o.customer_details?.name ||
                    "Solar EPC Partner";

                  const customerPhone =
                    o.buyer_phone ||
                    o.epc_id?.whatsapp ||
                    o.epc_id?.phone ||
                    o.delivery_address?.contact_phone ||
                    o.customer?.phone ||
                    o.customer_details?.phone ||
                    "—";

                  const customerLocation =
                    [
                      o.buyer_district || o.delivery_address?.district_name || o.epc_id?.district_name,
                      o.buyer_state || o.delivery_address?.state_name || o.epc_id?.state_name || o.customer?.state || o.customer?.city,
                    ]
                      .filter(Boolean)
                      .join(", ") || "India";

                  const totalAmount =
                    o.grand_total ??
                    (o.grand_total_paise ? o.grand_total_paise / 100 : undefined) ??
                    o.total_amount ??
                    o.amount ??
                    0;

                  const paidAmount =
                    o.amount_received ??
                    o.offline_payment?.amount_paid ??
                    o.offline_payment?.amount_received ??
                    o.paid_amount ??
                    0;

                  return (
                    <tr
                      key={o._id}
                      className={`hover:bg-surface-hover/50 transition ${
                        !isOnlineOrder && admStatus === "pending" && offStatus === "submitted_for_approval"
                          ? "bg-purple-500/5"
                          : ""
                      }`}
                    >
                      {/* 1. Order IDs */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {/* Request ID */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {reqId}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-tight ${
                              isOnlineOrder
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                              {isOnlineOrder ? "ONLINE" : "REQ"}
                            </span>
                          </div>

                          {/* Official Order Number */}
                          {isOfficial && officialNumber ? (
                            <div className="flex items-center gap-1 font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                              <MdCheckCircle className="text-emerald-500 shrink-0" />
                              <span>{officialNumber}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-text-muted italic flex items-center gap-1">
                              <span>Official No: Awaiting Approval</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Date */}
                      <td className="py-3 px-3 text-text-muted whitespace-nowrap text-[11px]">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(orderDate)}
                        </div>
                        <div className="text-[9px]">
                          {formatTime(orderDate)}
                        </div>
                      </td>

                      {/* 3. Customer */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-text-primary text-xs max-w-[170px] truncate" title={customerName}>
                          {customerName}
                        </div>
                        <div className="text-[10px] text-text-muted">{customerPhone}</div>
                        <div className="text-[9px] text-text-secondary truncate max-w-[170px]" title={customerLocation}>
                          {customerLocation}
                        </div>
                      </td>

                      {/* 4. Amount */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-slate-900 dark:text-white text-xs">
                          {formatCurrency(totalAmount)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          Paid: {formatCurrency(paidAmount)}
                        </div>
                      </td>

                      {/* 5. Payment Mode */}
                      <td className="py-3 px-3">
                        {isOnlineOrder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            Online (ICICI VAN)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Offline Bank
                          </span>
                        )}
                        <div className="text-[9px] text-text-muted mt-0.5">
                          {isOnlineOrder ? "ICICI E-COLLECTION" : (o.offline_payment?.payment_mode?.toUpperCase() || "NEFT / RTGS")}
                        </div>
                      </td>

                      {/* 6. UTR & Reference */}
                      <td className="py-3 px-3">
                        {utr ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-mono text-[11px] text-text-primary font-bold">
                              <span className="truncate max-w-[100px]" title={utr}>
                                {utr}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyUtr(utr)}
                                className="text-text-muted hover:text-purple-600 transition"
                                title="Copy UTR"
                              >
                                {copiedUtr === utr ? <FaCheck className="text-emerald-500" /> : <FaRegCopy />}
                              </button>
                            </div>
                            {receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(receiptUrl)}
                                className="text-[10px] text-purple-600 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <FiFileText size={10} /> View Proof
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">Awaiting UTR</span>
                        )}
                      </td>

                      {/* 7. Accounts Verification */}
                      <td className="py-3 px-3">
                        {isOnlineOrder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <MdCheck size={11} /> Auto-Verified (ICICI)
                          </span>
                        ) : offStatus === "submitted_for_approval" ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                              <MdCheck size={11} /> Verified by Accounts
                            </span>
                            <div className="text-[9px] text-text-muted truncate max-w-[130px]" title={o.offline_payment?.accounts_remarks}>
                              Note: {o.offline_payment?.accounts_remarks || "Bank credit confirmed"}
                            </div>
                          </div>
                        ) : offStatus === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            Verified
                          </span>
                        ) : offStatus === "returned" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            Returned
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">
                            Pending Accounts Verification
                          </span>
                        )}
                      </td>

                      {/* 8. Admin Status */}
                      <td className="py-3 px-3">
                        {isOnlineOrder ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <MdCheckCircle size={11} /> Auto-Approved (ICICI)
                          </span>
                        ) : admStatus === "approved" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <MdCheckCircle size={11} /> Approved
                          </span>
                        ) : admStatus === "rejected" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            <MdClose size={11} /> Rejected
                          </span>
                        ) : offStatus === "submitted_for_approval" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 animate-pulse">
                            Awaiting Admin
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-muted italic">Queued</span>
                        )}
                      </td>

                      {/* 9. Stage & Days */}
                      <td className="py-3 px-3 text-center">
                        <div className="font-mono font-bold text-xs">
                          {o.days_elapsed || 0} / {o.payment_tat_days || 2}d
                        </div>
                        <div className="text-[9px] text-text-muted">
                          {o.current_payment_stage_label || (isOnlineOrder ? "Final Settlement" : "Admin Approval")}
                        </div>
                      </td>

                      {/* 10. Delay Signal */}
                      <td className="py-3 px-3 text-center">
                        {signal === "green" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            🟢 On Track
                          </span>
                        ) : signal === "orange" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            🟠 In Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                            🔴 Overdue
                          </span>
                        )}
                      </td>

                      {/* 11. Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Admin Review & Approval Button - only for offline payments submitted for approval */}
                          {(!isOnlineOrder && offStatus === "submitted_for_approval") && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdminModal(o)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/30 transition flex items-center gap-1"
                              title="Review & Sign-off Official Approval"
                            >
                              <FaUserShield size={12} />
                              <span>Review & Approve</span>
                            </button>
                          )}

                          {(isOnlineOrder || admStatus === "approved") && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdminModal(o)}
                              className="px-2 py-1 rounded-xl text-[11px] font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary transition"
                              title="View Sign-off Details"
                            >
                              {isOnlineOrder ? "Auto-Approved" : "Approved"}
                            </button>
                          )}

                          {/* 8-Stage Journey Modal */}
                          <button
                            type="button"
                            onClick={() => setJourneyOrder(o)}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-purple-600 transition"
                            title="View 8-Stage Order Lifecycle Tracking"
                          >
                            <FaShieldAlt size={13} />
                          </button>

                          {/* Audit Trail Modal */}
                          <button
                            type="button"
                            onClick={() => setHistoryModal({ isOpen: true, order: o })}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-purple-600 transition"
                            title="View Audit Trail Timeline"
                          >
                            <MdHistory size={14} />
                          </button>

                          {/* Transaction Details Side Drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxn({
                                id: o._id,
                                type: "epc_order",
                                order_number: o.order_number,
                                ...o,
                              });
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                            title="View Full Order Details"
                          >
                            <FaExternalLinkAlt size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
            <div>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Admin Review & Decision Modal ────────────────────────────────────── */}
      {adminModal.isOpen && adminModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-border space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
                  <FaUserShield className="text-lg" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Admin Approval Desk: Offline Payment Sign-off
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Request ID: <strong>{adminModal.order.order_request_id || adminModal.order.order_number}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModal({ ...adminModal, isOpen: false, order: null })}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Order & Payment Verification Summary */}
            <div className="p-3.5 rounded-2xl bg-surface-hover/60 border border-border text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-text-muted block">Solar EPC Customer:</span>
                  <strong className="text-text-primary">
                    {adminModal.order.buyer_name ||
                      adminModal.order.epc_id?.company_name ||
                      adminModal.order.epc_id?.name ||
                      adminModal.order.delivery_address?.contact_name ||
                      adminModal.order.customer?.name ||
                      "Solar EPC Partner"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Order Total Amount:</span>
                  <strong className="text-purple-600 text-sm">
                    {formatCurrency(
                      adminModal.order.grand_total ??
                      (adminModal.order.grand_total_paise ? adminModal.order.grand_total_paise / 100 : undefined) ??
                      adminModal.order.total_amount ??
                      adminModal.order.amount ??
                      0
                    )}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Payment Mode:</span>
                  <span className="font-semibold">{adminModal.order.offline_payment?.payment_mode?.toUpperCase() || "NEFT / RTGS"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">UTR / Bank Reference:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {adminModal.order.offline_payment?.utr_number || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Receiving Company Bank:</span>
                  <span className="font-semibold text-text-secondary">
                    {adminModal.order.offline_payment?.receiving_account_reference || "Primary Company Account"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Amount Claimed:</span>
                  <strong className="text-emerald-600">
                    {formatCurrency(
                      adminModal.order.offline_payment?.amount_paid ??
                      adminModal.order.offline_payment?.amount_received ??
                      adminModal.order.amount_received ??
                      adminModal.order.paid_amount ??
                      0
                    )}
                  </strong>
                </div>
              </div>

              {adminModal.order.offline_payment?.accounts_remarks && (
                <div className="pt-2 border-t border-border/60 text-[11px]">
                  <span className="text-text-muted font-bold">Accounts Verification Notes:</span>
                  <p className="text-text-primary italic mt-0.5">
                    "{adminModal.order.offline_payment.accounts_remarks}"
                  </p>
                </div>
              )}

              {(adminModal.order.offline_payment?.receipt_url || adminModal.order.offline_payment?.payment_receipt_url) && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-text-muted">Payment Slip / Proof:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedReceipt(
                        adminModal.order.offline_payment.receipt_url ||
                        adminModal.order.offline_payment.payment_receipt_url
                      )
                    }
                    className="text-purple-600 hover:underline flex items-center gap-1 font-bold text-xs"
                  >
                    <FiFileText size={12} /> View Uploaded Receipt
                  </button>
                </div>
              )}
            </div>

            {/* Duplicate UTR Check Status Banner */}
            {adminModal.duplicateCheck.checked && (
              <div>
                {adminModal.duplicateCheck.isDuplicate ? (
                  <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <MdWarning className="text-lg shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <strong>Duplicate UTR Alert:</strong> This UTR was already matched on Order{" "}
                      <strong>#{adminModal.duplicateCheck.matchingOrder?.order_number}</strong> (Claimed: {formatCurrency(adminModal.duplicateCheck.matchingOrder?.grand_total || adminModal.duplicateCheck.matchingOrder?.amount || (adminModal.duplicateCheck.matchingOrder?.grand_total_paise ? adminModal.duplicateCheck.matchingOrder.grand_total_paise / 100 : 0))}).
                      Verify with the bank before approval to prevent duplicate credit!
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <MdCheckCircle className="text-base shrink-0 text-emerald-600" />
                    <span>No duplicate UTR detected across all verified records.</span>
                  </div>
                )}
              </div>
            )}

            {/* Admin Decision Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-primary">
                Admin Decision *
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdminModal({ ...adminModal, decision: "approved" })}
                  className={`py-2.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    adminModal.decision === "approved"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  <FiCheckCircle /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setAdminModal({ ...adminModal, decision: "returned" })}
                  className={`py-2.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    adminModal.decision === "returned"
                      ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  <FiClock /> Return
                </button>
                <button
                  type="button"
                  onClick={() => setAdminModal({ ...adminModal, decision: "rejected" })}
                  className={`py-2.5 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
                    adminModal.decision === "rejected"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  <FiXCircle /> Reject
                </button>
              </div>
            </div>

            {/* Decision explanation text */}
            <div className="text-xs">
              {adminModal.decision === "approved" ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <strong>Outcome on Approval:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                    <li>Generates official Order Number (<code>ORD-EPC-...</code>).</li>
                    <li>Generates official Tax Invoice & Order Confirmation.</li>
                    <li>Order becomes officially active and transfers to the <strong>Account Login → New Orders</strong> module for procurement grouping.</li>
                  </ul>
                </div>
              ) : adminModal.decision === "returned" ? (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                  Returns order to the Accounts Login queue with your remarks for bank re-check or proof re-upload.
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                  Rejecting this offline payment will notify the EPC customer and mark the payment as Failed / Rejected.
                </div>
              )}
            </div>

            {/* Admin Remarks Input */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Admin Remarks / Audit Notes {adminModal.decision === "rejected" || adminModal.decision === "returned" ? "*" : "(Optional)"}:
              </label>
              <textarea
                rows={2}
                value={adminModal.admin_remarks}
                onChange={(e) => setAdminModal({ ...adminModal, admin_remarks: e.target.value })}
                placeholder={
                  adminModal.decision === "approved"
                    ? "e.g. Bank credit verified against corporate ledger. Approved for procurement."
                    : "e.g. UTR mismatch with bank statement. Please verify with client."
                }
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdminModal({ ...adminModal, isOpen: false, order: null })}
                disabled={adminModal.submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={adminModal.decision === "rejected" ? "danger" : "primary"}
                size="sm"
                onClick={handleSubmitAdminDecision}
                loading={adminModal.submitting}
                className={`font-black px-4 ${
                  adminModal.decision === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                {adminModal.decision === "approved"
                  ? "Approve & Generate Official Order"
                  : adminModal.decision === "returned"
                  ? "Return to Accounts"
                  : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Stage-wise TAT Configuration Modal ───────────────────────── */}
      {tatModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-border space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
                  <MdSettings className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Stage-wise Payment Days & Delay Signal Configuration
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Configure expected TAT days and warning thresholds for all payment stages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTatModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-surface-hover border border-border text-xs text-text-secondary flex items-start gap-2">
              <MdInfo className="text-purple-600 shrink-0 text-base mt-0.5" />
              <span>
                <strong>Delay Signal Rules:</strong> Orders completed within configured TAT show 🟢 Green (On Track). Approaching deadline displays 🟠 Orange. Exceeding configured TAT triggers 🔴 Red Overdue alert and increments the Payment Delays KPI counter.
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-1 text-xs">
              {tatModal.loading ? (
                <div className="py-8 text-center text-text-muted">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Loading TAT configurations...</p>
                </div>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-1">
                    Stage-wise Payment Delay TATs
                  </div>
                  {Object.entries(tatModal.configs).map(([key, cfg]) => (
                    <div
                      key={key}
                      className="p-3.5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-text-primary dark:text-white text-xs">
                          {cfg.stage_name || key.replace(/_/g, " ").toUpperCase()}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          Key: <span className="font-mono">{key}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary mb-1">
                            Configured TAT (Days)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={cfg.tat_days || 2}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              setTatModal((prev) => ({
                                ...prev,
                                configs: {
                                  ...prev.configs,
                                  [key]: { ...cfg, tat_days: val },
                                },
                              }));
                            }}
                            className="w-20 p-2 bg-surface-hover border border-border rounded-xl text-center font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary mb-1">
                            Warning Threshold (Days)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={15}
                            value={cfg.warning_threshold_days || 1}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              setTatModal((prev) => ({
                                ...prev,
                                configs: {
                                  ...prev.configs,
                                  [key]: { ...cfg, warning_threshold_days: val },
                                },
                              }));
                            }}
                            className="w-20 p-2 bg-surface-hover border border-border rounded-xl text-center font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* ── Procurement Logistics & Purchase Indent Defaults ── */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div>
                        <div className="text-xs font-black text-text-primary dark:text-white uppercase tracking-wider">
                          Procurement & Purchase Indent Defaults
                        </div>
                        <p className="text-[10px] text-text-muted">
                          Configures locked default parameters for Accounts PI creation
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Admin Controlled
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary mb-1">
                            Production TAT (Days)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={tatModal.procurement_settings?.production_tat_days ?? 5}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTatModal((prev) => ({
                                ...prev,
                                procurement_settings: {
                                  ...(prev.procurement_settings || {}),
                                  production_tat_days: val,
                                },
                              }));
                            }}
                            className="w-full p-2 bg-surface-hover border border-border rounded-xl text-center font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary mb-1">
                            Supply / Transit TAT (Days)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={90}
                            value={tatModal.procurement_settings?.supply_tat_days ?? 3}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTatModal((prev) => ({
                                ...prev,
                                procurement_settings: {
                                  ...(prev.procurement_settings || {}),
                                  supply_tat_days: val,
                                },
                              }));
                            }}
                            className="w-full p-2 bg-surface-hover border border-border rounded-xl text-center font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-text-secondary mb-1">
                            Estimated Transport Cost (₹)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={tatModal.procurement_settings?.estimated_transport_cost ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setTatModal((prev) => ({
                                ...prev,
                                procurement_settings: {
                                  ...(prev.procurement_settings || {}),
                                  estimated_transport_cost: val,
                                },
                              }));
                            }}
                            className="w-full p-2 bg-surface-hover border border-border rounded-xl text-center font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTatModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={tatModal.saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveTatConfig}
                loading={tatModal.saving}
                className="font-bold px-4 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Save Configurations
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail Modal ────────────────────────────────────────────────── */}
      {historyModal.isOpen && historyModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-border space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FaHistory className="text-purple-600 text-lg" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Payment Verification Audit History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, order: null })}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {(!historyModal.order.audit_trail || historyModal.order.audit_trail.length === 0) ? (
                <p className="text-xs text-text-muted text-center py-6">
                  No previous audit events recorded for this order request.
                </p>
              ) : (
                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {historyModal.order.audit_trail.map((item, idx) => (
                    <div key={idx} className="relative text-xs">
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-purple-600 border-2 border-surface" />
                      <div className="flex items-center justify-between">
                        <strong className="text-text-primary uppercase font-bold text-[11px]">
                          {item.action?.replace(/_/g, " ")}
                        </strong>
                        <span className="text-[10px] text-text-muted">
                          {new Date(item.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        Performed by: <strong>{item.performed_by_name || "System"}</strong> ({item.performed_by_role || "User"})
                      </div>
                      {item.notes && (
                        <p className="text-[11px] text-text-muted italic bg-surface-hover p-2 rounded-xl border border-border/60 mt-1">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryModal({ isOpen: false, order: null })}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Details Side Drawer ─────────────────────────────────── */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        onStatusUpdated={fetchOrders}
      />

      {/* ── 8-Stage Fulfillment Journey Modal ──────────────────────────────── */}
      {journeyOrder && (
        <Product8StageJourneyModal
          isOpen={!!journeyOrder}
          onClose={() => setJourneyOrder(null)}
          order={journeyOrder}
          orderType="direct_epc"
          onStageUpdated={fetchOrders}
        />
      )}

      {/* ── Receipt Full Preview Modal ─────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-sm font-black text-text-primary dark:text-white flex items-center gap-2">
                <FiFileText className="text-purple-600" /> Payment Receipt Proof
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-purple-600 transition"
                  title="Open in new tab"
                >
                  <FiExternalLink />
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-rose-600 transition"
                >
                  <FiX className="text-lg" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-surface-hover/30">
              {selectedReceipt.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={selectedReceipt}
                  title="Receipt PDF"
                  className="w-full h-[65vh] rounded-2xl border border-border"
                />
              ) : (
                <img
                  src={selectedReceipt}
                  alt="Receipt Preview"
                  className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
