import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaCheck,
  FaTimes,
  FaUndo,
  FaTruck,
  FaFileInvoiceDollar,
  FaCoins,
  FaExclamationTriangle,
  FaClock,
  FaSearch,
  FaFilter,
  FaSync,
  FaSlidersH,
  FaEye,
  FaInfoCircle,
  FaBuilding,
  FaUser,
  FaWarehouse,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaArrowRight,
  FaPercentage,
  FaExclamationCircle,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBoxes,
  FaBoxOpen,
  FaReceipt,
  FaStore,
  FaCreditCard,
  FaIndustry,
} from "react-icons/fa";
import { FiCheckSquare, FiAlertCircle, FiLayers, FiDollarSign } from "react-icons/fi";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

// Format Currency in INR
const formatINR = (val) => {
  const num = Number(val || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

// Safe date formatter preventing "Invalid Date"
const formatSafeDate = (val) => {
  if (!val) return "Recent";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Recent";
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const STAGE_CONFIGS = {
  orders: {
    label: "Customer Order",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#93c5fd",
    icon: FiCheckSquare,
  },
  pos: {
    label: "Purchase Order",
    bg: "#f3e8ff",
    text: "#7e22ce",
    border: "#d8b4fe",
    icon: FaFileInvoiceDollar,
  },
  first_payment: {
    label: "1st Payment (30%)",
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
    icon: FaCoins,
  },
  second_payment: {
    label: "2nd Payment (70%)",
    bg: "#ecfdf5",
    text: "#047857",
    border: "#a7f3d0",
    icon: FaCoins,
  },
  delivery: {
    label: "Delivery Freight",
    bg: "#ecfeff",
    text: "#0e7490",
    border: "#a5f3fc",
    icon: FaTruck,
  },
};

export default function AdminOrderApprovalDashboard() {
  const { countryName } = useParams();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Data States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [kpis, setKpis] = useState({
    pending_orders: 0,
    pending_pos: 0,
    pending_first_payment: 0,
    pending_second_payment: 0,
    pending_delivery: 0,
    rejected_returned: 0,
    approved_today: 0,
    total_overdue: 0,
    overdue_by_stage: {},
  });
  const [config, setConfig] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Priority Sort: Pending requests always at the top, newest request first
  const sortedRecords = useMemo(() => {
    let filtered = records;
    if (orderTypeFilter && orderTypeFilter !== "all") {
      filtered = filtered.filter((r) => {
        const type =
          r.order_type ||
          r.details?.order_type ||
          r.fulfillment_bifurcation?.order_type ||
          (r.is_trial_order ? "trial_order" : "po_order");
        return type === orderTypeFilter;
      });
    }

    return [...filtered].sort((a, b) => {
      const isPendingA = a.approval_status === "pending";
      const isPendingB = b.approval_status === "pending";

      // Pending requests ALWAYS come first (top of table)
      if (isPendingA && !isPendingB) return -1;
      if (!isPendingA && isPendingB) return 1;

      // Overdue pending requests come first among pending
      if (isPendingA && isPendingB) {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
      }

      // Within same status, newest requested_at first
      const timeA = new Date(a.requested_at || 0).getTime();
      const timeB = new Date(b.requested_at || 0).getTime();
      return timeB - timeA;
    });
  }, [records, orderTypeFilter]);

  // Modals
  const [inspectionItem, setInspectionItem] = useState(null);
  const [decisionModal, setDecisionModal] = useState({
    isOpen: false,
    item: null,
    action: "approve", // 'approve' | 'reject' | 'return'
    remarks: "",
  });
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState(null);

  // 1. Fetch Summary & KPIs
  const fetchSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/order-approvals/summary`, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        setKpis(res.data.data.kpis || {});
        setConfig(res.data.data.config || {});
      }
    } catch (err) {
      console.error("Error fetching approval summary:", err);
    }
  }, []);

  // 2. Fetch Queue Records
  const fetchQueue = useCallback(
    async (page = 1, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = {
          stage: activeTab,
          status: statusFilter,
          search: searchQuery,
          page,
          limit: 25,
        };
        const res = await axios.get(`${API_URL}/order-approvals/queue`, {
          params,
          headers: authHeaderObj(),
        });
        if (res.data?.status === "success") {
          setRecords(res.data.data.records || []);
          setPagination({
            page: res.data.data.page || 1,
            pages: res.data.data.pages || 1,
            total: res.data.data.total || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching approval queue:", err);
        dispatch(
          setAlert({
            type: "error",
            message: err.response?.data?.message || "Failed to load approval queue.",
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [activeTab, statusFilter, searchQuery, dispatch]
  );

  useEffect(() => {
    if (token) {
      fetchSummary();
      fetchQueue(1);
    }
  }, [token, activeTab, statusFilter, fetchSummary, fetchQueue]);

  // Handle Search submit
  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueue(1);
  };

  // 3. Submit Decision
  const handleDecisionSubmit = async () => {
    const { item, action, remarks } = decisionModal;
    if (!item) return;

    if ((action === "reject" || action === "return") && !remarks?.trim()) {
      dispatch(
        setAlert({
          type: "warning",
          message: `Remarks or reasoning are mandatory when ${action}ing an approval.`,
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = `${API_URL}/order-approvals/${item.stage}/${item._id}/action`;
      const res = await axios.post(
        endpoint,
        {
          decision: action,
          remarks: remarks.trim(),
        },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `Stage successfully ${action}d!`,
          })
        );
        setDecisionModal({ isOpen: false, item: null, action: "approve", remarks: "" });
        if (inspectionItem?._id === item._id) {
          setInspectionItem(null);
        }
        // Optimistic local state update: remove actioned item immediately so UI does not reload or flash
        setRecords((prev) => prev.filter((r) => r._id !== item._id));
        setPagination((prev) => ({ ...prev, total: Math.max(0, (prev.total || 1) - 1) }));

        fetchSummary();
        fetchQueue(pagination.page, true);
        window.dispatchEvent(new Event('sidebar-counts-refresh'));
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      console.error("Error submitting approval action:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || `Failed to ${action} item.`,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Action Opener
  const openDecisionModal = (item, action) => {
    setDecisionModal({
      isOpen: true,
      item,
      action,
      remarks: action === "approve" ? "Approved by Admin" : "",
    });
  };

  // 4. Save Workflow Rules
  const handleSaveConfig = async () => {
    if (!tempConfig) return;
    setSubmitting(true);
    try {
      const res = await axios.put(`${API_URL}/order-approvals/config`, tempConfig, {
        headers: authHeaderObj(),
      });
      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: "Approval workflow configuration updated successfully.",
          })
        );
        setConfig(res.data.data);
        setConfigModalOpen(false);
        fetchSummary();
      }
    } catch (err) {
      console.error("Error saving workflow config:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save workflow config.",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Stage Badge Renderer matching SolarKits standard badge theme
  const renderStageBadge = (stage) => {
    const cfg = STAGE_CONFIGS[stage] || {
      label: stage,
      bg: "#f1f5f9",
      text: "#475569",
      border: "#cbd5e1",
      icon: FiLayers,
    };
    const IconComp = cfg.icon;

    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
        style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.text }} />
        <IconComp className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  // Status Badge Renderer matching SolarKits standard STATUS_BADGES
  const renderStatusBadge = (status, isOverdue) => {
    const norm = String(status || "pending").toLowerCase();

    if (norm === "pending") {
      return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs animate-pulse"
            style={{ backgroundColor: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Pending Approval
          </span>
          {isOverdue && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap shadow-2xs animate-pulse"
              style={{ backgroundColor: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}
            >
              <FaExclamationCircle className="w-2.5 h-2.5 text-red-600" />
              OVERDUE
            </span>
          )}
        </div>
      );
    }

    if (norm === "approved") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
          style={{ backgroundColor: "#f0fdf4", color: "#15803d", border: "1px solid #86efac" }}
        >
          <FaCheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    }

    if (norm === "rejected") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
          style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }}
        >
          <FaTimesCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    }

    if (norm === "returned") {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap shadow-2xs"
          style={{ backgroundColor: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" }}
        >
          <FaUndo className="w-3 h-3" />
          Returned
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-surface-hover text-text-secondary border border-border">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ── Top Header Banner (Brand Gradient Theme) ── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-primary to-primary-end p-6 lg:p-8 text-white shadow-xl overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)] pointer-events-none"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg shrink-0">
              <FaShieldAlt className="text-white text-3xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight">
                  Centralized Order & Stage Approval Module
                </h1>
                {countryName && (
                  <span className="bg-white/20 rounded-full px-3 py-0.5 text-xs font-bold uppercase border border-white/30">
                    {countryName}
                  </span>
                )}
              </div>
              <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Single-window authorization gate for Customer Orders, Purchase Orders (POs), Supplier Advance & Balance Payments, and Delivery Freight Variances.
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                fetchSummary();
                fetchQueue(pagination.page);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/25 transition-all shadow-sm cursor-pointer"
            >
              <FaSync size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 8 Summary KPI Cards (Color Theme Synchronized) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Pending Orders */}
        <div
          onClick={() => setActiveTab("orders")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "orders"
              ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/[0.04] shadow-md"
              : "border-border hover:border-blue-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center">
              <FiCheckSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Orders</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.pending_orders || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Pending Store</div>
          </div>
        </div>

        {/* 2. Pending POs */}
        <div
          onClick={() => setActiveTab("pos")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "pos"
              ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-500/[0.04] shadow-md"
              : "border-border hover:border-purple-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center">
              <FaFileInvoiceDollar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">POs</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.pending_pos || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Purchase Orders</div>
          </div>
        </div>

        {/* 3. Supplier 1st Payment */}
        <div
          onClick={() => setActiveTab("first_payment")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "first_payment"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.04] shadow-md"
              : "border-border hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center">
              <FaCoins className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">30% Adv</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.pending_first_payment || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Advance Requests</div>
          </div>
        </div>

        {/* 4. Supplier 2nd Payment */}
        <div
          onClick={() => setActiveTab("second_payment")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "second_payment"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04] shadow-md"
              : "border-border hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <FaCoins className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">70% Bal</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.pending_second_payment || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Balance Requests</div>
          </div>
        </div>

        {/* 5. Delivery Charge */}
        <div
          onClick={() => setActiveTab("delivery")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "delivery"
              ? "border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-500/[0.04] shadow-md"
              : "border-border hover:border-cyan-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 flex items-center justify-center">
              <FaTruck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Freight</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.pending_delivery || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Rate Variances</div>
          </div>
        </div>

        {/* 6. Overdue Approvals */}
        <div
          onClick={() => setActiveTab("overdue")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "overdue"
              ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/[0.04] shadow-md"
              : kpis.total_overdue > 0
              ? "border-red-500/50 bg-red-500/[0.02] animate-pulse hover:border-red-500"
              : "border-border hover:border-red-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center">
              <FaClock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-600">Alert</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-red-600">{kpis.total_overdue || 0}</div>
            <div className="text-[11px] text-red-600/90 font-bold truncate mt-0.5">Overdue TAT</div>
          </div>
        </div>

        {/* 7. Rejected / Returned */}
        <div
          onClick={() => setActiveTab("rejected_returned")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "rejected_returned"
              ? "border-violet-500 ring-2 ring-violet-500/20 bg-violet-500/[0.04] shadow-md"
              : "border-border hover:border-violet-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 border border-violet-500/20 flex items-center justify-center">
              <FaUndo className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Action</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.rejected_returned || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Rejected / Return</div>
          </div>
        </div>

        {/* 8. Approved Today */}
        <div
          onClick={() => setActiveTab("approved")}
          className={`card p-4 border-2 transition-all duration-200 cursor-pointer rounded-2xl flex flex-col justify-between hover:shadow-md ${
            activeTab === "approved"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04] shadow-md"
              : "border-border hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
              <FaCheckCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Today</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{kpis.approved_today || 0}</div>
            <div className="text-[11px] text-text-secondary font-bold truncate mt-0.5">Approved Items</div>
          </div>
        </div>
      </div>

      {/* ── Stage Tabs & Filters Card ── */}
      <div className="card p-4 border-2 border-border shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Scrollable Stage Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hover">
            {[
              { key: "all", label: "All Active Queues", icon: <FiLayers className="w-3.5 h-3.5" /> },
              { key: "orders", label: `Customer Orders (${kpis.pending_orders || 0})`, icon: <FiCheckSquare className="w-3.5 h-3.5" /> },
              { key: "pos", label: `Purchase Orders (${kpis.pending_pos || 0})`, icon: <FaFileInvoiceDollar className="w-3.5 h-3.5" /> },
              { key: "first_payment", label: `1st Payment (${kpis.pending_first_payment || 0})`, icon: <FaCoins className="w-3.5 h-3.5" /> },
              { key: "second_payment", label: `2nd Payment (${kpis.pending_second_payment || 0})`, icon: <FaCoins className="w-3.5 h-3.5" /> },
              { key: "delivery", label: `Delivery Variances (${kpis.pending_delivery || 0})`, icon: <FaTruck className="w-3.5 h-3.5" /> },
              { key: "overdue", label: `Overdue Alerts (${kpis.total_overdue || 0})`, icon: <FaClock className="w-3.5 h-3.5 text-red-500" /> },
              { key: "rejected_returned", label: `Rejected / Returned (${kpis.rejected_returned || 0})`, icon: <FaUndo className="w-3.5 h-3.5" /> },
              { key: "approved", label: `Approved (${kpis.approved_today || 0})`, icon: <FaCheckCircle className="w-3.5 h-3.5 text-emerald-500" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-md"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Filter Dropdown */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative min-w-[260px]">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search order #, PO #, partner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">Status: All Records</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </select>

            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">Fulfillment: All Types</option>
              <option value="po_order">PO Orders (Bulk Combo)</option>
              <option value="loose_order">Loose Orders (Custom BOM)</option>
              <option value="trial_order">Trial Orders (Sample)</option>
            </select>
          </div>
        </div>

        {/* ── Unified Approval Table ── */}
        <div className="card overflow-hidden border-2 border-border shadow-xs rounded-2xl">
          <div className="overflow-x-auto scrollbar-hover">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-hover border-b-2 border-border text-text-secondary text-xs uppercase font-black tracking-wider">
                  <th className="py-4 px-4">Stage & Workflow</th>
                  <th className="py-4 px-4">Identifiers</th>
                  <th className="py-4 px-4">Entity / Stakeholder</th>
                  <th className="py-4 px-4 text-right">Requested vs Benchmark</th>
                  <th className="py-4 px-4 text-center">Approval Status</th>
                  <th className="py-4 px-4 text-center">TAT Waiting</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {loading && records.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-text-secondary">
                      <Loader text="Loading live approval queue..." />
                    </td>
                  </tr>
                ) : sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-text-secondary">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FaCheckCircle className="w-10 h-10 text-emerald-500" />
                        <p className="text-sm font-black text-text-primary">All Clear! No items pending in this queue.</p>
                        <p className="text-xs text-text-muted">
                          Switch stage tabs or clear filter to view other operational records.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map((item) => {
                    const isPending = item.approval_status === "pending";
                    const isPoOrPayment = ["pos", "first_payment", "second_payment"].includes(item.stage);

                    return (
                      <tr
                        key={`${item.stage}-${item._id}`}
                        className={`hover:bg-primary/[0.02] transition-colors ${
                          isPending ? "bg-amber-50/[0.15]" : ""
                        } ${item.is_overdue ? "bg-red-500/[0.04]" : ""}`}
                      >
                        {/* Stage & Workflow */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {renderStageBadge(item.stage)}
                            <span className="text-[11px] text-text-muted font-bold ml-1">
                              {item.stage_label}
                            </span>
                            {item.is_above_benchmark && item.stage === 'pos' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-2xs mt-0.5 animate-pulse">
                                <FaShieldAlt className="text-amber-600 text-[8px]" />
                                Exceeds Benchmark
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Identifiers */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {isPoOrPayment && item.pi_number ? (
                            <div>
                              <div className="font-black text-primary font-mono text-sm flex items-center gap-1.5">
                                {item.pi_number}
                              </div>
                              {item.order_number && (
                                <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                                  Order: <span className="font-mono font-bold text-text-primary">{item.order_number}</span>
                                </div>
                              )}
                              {item.order_group_id && (
                                <div className="text-[10px] text-text-muted font-semibold font-mono mt-0.5">
                                  Batch: {item.order_group_id}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-black text-text-primary text-sm flex items-center gap-1.5">
                                {item.order_number || item.pi_number || "N/A"}
                              </div>
                              {item.pi_number && item.pi_number !== item.order_number && (
                                <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                                  PO: <span className="font-mono font-bold">{item.pi_number}</span>
                                </div>
                              )}
                              {item.order_group_id && (
                                <div className="text-[10px] text-primary font-bold font-mono mt-0.5">
                                  Batch: {item.order_group_id}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Order Type & Bifurcated Warehouse Badges */}
                          {(() => {
                            const orderType = item.order_type || item.details?.order_type || item.fulfillment_bifurcation?.order_type || (item.is_trial_order ? "trial_order" : "po_order");
                            const whCode = item.warehouse_code || item.details?.warehouse_code || item.fulfillment_bifurcation?.bifurcated_warehouse_code;
                            return (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {item.is_above_benchmark && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                    <FaShieldAlt className="text-amber-600 text-[8px]" />
                                    Benchmark Cost Exceeded
                                  </span>
                                )}
                                {orderType === "po_order" && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                    PO Order
                                  </span>
                                )}
                                {orderType === "loose_order" && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                    Loose Order
                                  </span>
                                )}
                                {orderType === "trial_order" && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    Trial Order
                                  </span>
                                )}
                                {whCode && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-text-muted bg-surface-hover px-1.5 py-0.5 rounded border border-border/60">
                                    <FaWarehouse className="text-primary/70" size={9} />
                                    {whCode}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Entity / Stakeholder */}
                        <td className="py-4 px-4">
                          <div className="font-black text-text-primary text-xs">{item.entity_name}</div>
                          <div className="text-[11px] text-text-secondary font-medium truncate max-w-[220px] mt-0.5">
                            {item.partner_name}
                          </div>
                        </td>

                        {/* Financials & Benchmark */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-text-primary text-sm">
                            {formatINR(item.requested_amount)}
                          </div>
                          {["first_payment", "second_payment"].includes(item.stage) && item.details?.total_pi_value ? (
                            <div className="text-[10px] text-text-muted font-medium mt-0.5">
                              of {formatINR(item.details.total_pi_value)}{" "}
                              <span className="font-bold text-text-secondary">
                                ({item.stage === "first_payment" ? "30% Adv" : "70% Bal"})
                              </span>
                            </div>
                          ) : item.benchmark_amount > 0 && item.benchmark_amount !== item.requested_amount ? (
                            <div className="text-[11px] font-semibold text-text-muted mt-0.5">
                              Bench: {formatINR(item.benchmark_amount)}
                            </div>
                          ) : null}
                          {item.variance_amount > 0 && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full mt-1">
                              +{formatINR(item.variance_amount)} ({item.variance_percentage}%)
                            </div>
                          )}
                        </td>

                        {/* Approval Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(item.approval_status, item.is_overdue)}
                        </td>

                        {/* TAT & Hours Pending */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {isPending ? (
                            <>
                              <div
                                className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md inline-block border ${
                                  item.is_overdue
                                    ? "bg-red-50 text-red-700 border-red-300 animate-pulse"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {item.hours_pending}h / {item.tat_hours}h limit
                              </div>
                              <div className="text-[10px] text-text-muted font-bold mt-1">
                                Req: {formatSafeDate(item.requested_at)}
                              </div>
                            </>
                          ) : item.approval_status === "approved" ? (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                <FaCheckCircle className="w-3 h-3 text-emerald-600" /> Settled
                              </span>
                              <span className="text-[10px] text-text-muted font-medium mt-1">
                                {formatSafeDate(item.decision_info?.approved_at || item.requested_at)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-200">
                                <FaTimesCircle className="w-3 h-3 text-red-600" /> {item.approval_status === "rejected" ? "Rejected" : "Returned"}
                              </span>
                              <span className="text-[10px] text-text-muted font-medium mt-1">
                                {formatSafeDate(item.decision_info?.approved_at || item.requested_at)}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectionItem(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              title="Inspect full details & financial breakdown"
                            >
                              <FaEye className="w-3 h-3" /> Inspect
                            </button>

                            {isPending && (
                              <>
                                <button
                                  onClick={() => openDecisionModal(item, "approve")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Approve stage release"
                                >
                                  <FaCheck className="w-3 h-3" /> Approve
                                </button>

                                <button
                                  onClick={() => openDecisionModal(item, "reject")}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Reject stage authorization"
                                >
                                  <FaTimes className="w-3 h-3" /> Reject
                                </button>

                                <button
                                  onClick={() => openDecisionModal(item, "return")}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                  title="Return for revision / negotiation"
                                >
                                  <FaUndo className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between text-xs text-text-secondary pt-3 px-1">
            <div className="font-semibold">
              Showing <span className="text-text-primary font-bold">{records.length}</span> of{" "}
              <span className="text-text-primary font-bold">{pagination.total}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchQueue(pagination.page - 1)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs font-black text-text-primary">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchQueue(pagination.page + 1)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Inspection & 360-Degree Detail Modal ── */}
      {inspectionItem && (() => {
        const customerOrder = inspectionItem.customer_order_info || inspectionItem.details?.customer_order_info || null;
        const buyer = customerOrder?.buyer || null;
        const deliveryAddr = customerOrder?.delivery_address || null;
        const partner = customerOrder?.reseller_partner || null;
        const orderItems = customerOrder?.items || [];
        const piItems = inspectionItem.details?.items || [];
        const supplierDetails = inspectionItem.details?.supplier_details || {};
        const paymentDetails = inspectionItem.details?.payment || {};
        const isPaymentStage = inspectionItem.stage === "first_payment" || inspectionItem.stage === "second_payment";
        const isPoStage = inspectionItem.stage === "pos";
        const isDeliveryStage = inspectionItem.stage === "delivery";
        const isOrderStage = inspectionItem.stage === "orders";

        const piTotalValue = inspectionItem.details?.total_pi_value || 0;
        const advAmount = paymentDetails.advance_amount || (piTotalValue > 0 ? Math.round(piTotalValue * 0.3) : 0);
        const balAmount = paymentDetails.balance_amount || (piTotalValue > advAmount ? piTotalValue - advAmount : 0);
        const isAdvPaid = Boolean(paymentDetails.advance_payment?.utr_number || ["Advance Paid", "Paid"].includes(paymentDetails.payment_status));
        const isBalPaid = Boolean(paymentDetails.balance_payment?.utr_number || paymentDetails.payment_status === "Paid");

        const supplierBank = supplierDetails.bank_name || paymentDetails.supplier_bank_details?.bank_name || paymentDetails.advance_payment?.bank_name || null;
        const supplierAccNo = supplierDetails.bank_account_number || paymentDetails.supplier_bank_details?.account_number || null;
        const supplierIfsc = supplierDetails.ifsc_code || paymentDetails.supplier_bank_details?.ifsc_code || null;

        return (
          <Dialog
            isOpen={Boolean(inspectionItem)}
            onClose={() => setInspectionItem(null)}
            title={`Approval Inspection — ${inspectionItem.stage_label}`}
            size="xl"
          >
            <div className="space-y-6 text-xs p-1">
              {/* Header banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4.5 rounded-2xl bg-surface-hover border border-border gap-4 shadow-xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStageBadge(inspectionItem.stage)}
                    {(isPoStage || isPaymentStage) && inspectionItem.pi_number ? (
                      <span className="font-black text-base text-text-primary tracking-tight font-mono">
                        {inspectionItem.pi_number}
                      </span>
                    ) : (
                      <span className="font-black text-base text-text-primary tracking-tight">
                        {inspectionItem.order_number}
                      </span>
                    )}
                    {(isPoStage || isPaymentStage) && inspectionItem.order_number && inspectionItem.order_number !== inspectionItem.pi_number && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                        Order: {inspectionItem.order_number}
                      </span>
                    )}
                    {inspectionItem.order_group_id && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/10 text-purple-700 border border-purple-500/20">
                        Batch: {inspectionItem.order_group_id}
                      </span>
                    )}
                  </div>
                  <div className="text-text-secondary mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span>
                      Entity / Stakeholder: <strong className="text-text-primary">{inspectionItem.entity_name}</strong>
                    </span>
                    {inspectionItem.partner_name && (
                      <>
                        <span className="text-text-muted">•</span>
                        <span>
                          Partner: <strong className="text-text-primary">{inspectionItem.partner_name}</strong>
                        </span>
                      </>
                    )}
                    {customerOrder?.order_type && (
                      <>
                        <span className="text-text-muted">•</span>
                        <span className="text-primary font-bold">{customerOrder.order_type}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right sm:shrink-0">
                  <div className="text-2xl font-black text-text-primary">
                    {formatINR(inspectionItem.requested_amount)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-text-muted text-[11px]">Approval:</span>
                    {renderStatusBadge(inspectionItem.approval_status, inspectionItem.is_overdue)}
                  </div>
                </div>
              </div>

              {/* Benchmark Cost Exceeded Alert Banner for PO Stage */}
              {(inspectionItem.is_above_benchmark || inspectionItem.variance_amount > 0) && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <FaShieldAlt className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded-md">
                        ⚠️ Benchmark Cost Exceeded
                      </span>
                      {inspectionItem.benchmark_cost_unit > 0 && inspectionItem.entered_unit_rate > 0 && (
                        <span className="text-xs font-bold font-mono text-text-primary">
                          Entered: ₹{Number(inspectionItem.entered_unit_rate).toLocaleString("en-IN")}/unit vs Benchmark: ₹{Number(inspectionItem.benchmark_cost_unit).toLocaleString("en-IN")}/unit (+₹{Number(inspectionItem.entered_unit_rate - inspectionItem.benchmark_cost_unit).toLocaleString("en-IN")}/unit)
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      This Purchase Order has been flagged for Admin approval because the negotiated unit rate exceeds the approved benchmark pricing limit.
                      Admin authorization is strictly required before order release to supplier and before 30% advance payment request can be triggered.
                    </p>
                    {inspectionItem.details?.po_approval?.remarks && (
                      <div className="text-[11px] font-semibold text-text-secondary mt-1 bg-surface/70 p-2 rounded-lg border border-border/70">
                        <strong>Reason / Flagged Remarks:</strong> {inspectionItem.details.po_approval.remarks}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial & Benchmark Audit Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {isPaymentStage ? (
                  <>
                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Requested Payment ({inspectionItem.stage === "first_payment" ? "30% Advance" : "70% Balance"})
                      </div>
                      <div className="text-xl font-black text-primary">
                        {formatINR(inspectionItem.requested_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Stage disbursement amount</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Total PI Value
                      </div>
                      <div className="text-xl font-black text-text-primary">
                        {formatINR(piTotalValue || inspectionItem.requested_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Full procurement order total</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Milestone Progress
                      </div>
                      <div className="text-xl font-black text-emerald-600">
                        {isBalPaid
                          ? "Fully Paid (100%)"
                          : isAdvPaid
                          ? "Advance Paid (30%)"
                          : "Advance Pending"}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {isBalPaid
                          ? "All supplier payments disbursed"
                          : isAdvPaid
                          ? `Remaining Balance: ${formatINR(balAmount)}`
                          : `Total Due: ${formatINR(piTotalValue || inspectionItem.requested_amount)}`}
                      </div>
                    </div>
                  </>
                ) : isPoStage ? (
                  <>
                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Total PO Indent Value
                      </div>
                      <div className="text-xl font-black text-text-primary">
                        {formatINR(piTotalValue || inspectionItem.requested_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Supplier indent value</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Benchmark Limit
                      </div>
                      <div className="text-xl font-black text-text-primary">
                        {formatINR(inspectionItem.benchmark_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Approved baseline cost</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Rate Variance
                      </div>
                      <div
                        className={`text-xl font-black ${
                          inspectionItem.variance_amount > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {inspectionItem.variance_amount > 0
                          ? `+${formatINR(inspectionItem.variance_amount)} (${inspectionItem.variance_percentage}%)`
                          : "Within Benchmark"}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {inspectionItem.variance_amount > 0 ? "Exceeds standard baseline" : "Pre-approved safe threshold"}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Requested Amount
                      </div>
                      <div className="text-xl font-black text-text-primary">
                        {formatINR(inspectionItem.requested_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Stage authorization value</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Benchmark Limit
                      </div>
                      <div className="text-xl font-black text-text-primary">
                        {formatINR(inspectionItem.benchmark_amount)}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">Approved baseline cost</div>
                    </div>

                    <div className="card p-4 border border-border bg-surface rounded-xl shadow-2xs">
                      <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider mb-1">
                        Variance / Extra
                      </div>
                      <div
                        className={`text-xl font-black ${
                          inspectionItem.variance_amount > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {inspectionItem.variance_amount > 0
                          ? `+${formatINR(inspectionItem.variance_amount)} (${inspectionItem.variance_percentage}%)`
                          : "Within Benchmark"}
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        {inspectionItem.variance_amount > 0 ? "Exceeds standard baseline" : "Pre-approved safe threshold"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── 1. SUPPLIER & PROCUREMENT DETAILS (Shown first for PO & Payment stages) ── */}
              {(isPoStage || isPaymentStage || inspectionItem.pi_number) && (
                <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                        <FaIndustry className="w-3.5 h-3.5" />
                      </span>
                      Supplier & Purchase Indent Details (PO: {inspectionItem.pi_number || inspectionItem.order_number})
                    </h4>
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      PO Value: {formatINR(piTotalValue || inspectionItem.requested_amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Supplier / Brand</span>
                      <strong className="text-xs font-black text-text-primary block mt-0.5">
                        {inspectionItem.details?.supplier_name || inspectionItem.entity_name}
                      </strong>
                      {inspectionItem.details?.supplier_brand && (
                        <span className="text-[10px] text-text-muted">Brand: {inspectionItem.details.supplier_brand}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Supplier GSTIN</span>
                      <span className="font-mono text-xs font-bold text-text-primary block mt-0.5">
                        {inspectionItem.details?.supplier_gst || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Delivery Warehouse</span>
                      <span className="text-xs font-bold text-text-primary block mt-0.5">
                        {inspectionItem.details?.destination_warehouse_name ||
                         inspectionItem.details?.destination_warehouse_code ||
                         inspectionItem.details?.delivery_warehouse_id?.name ||
                         inspectionItem.details?.warehouse_id?.name ||
                         "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Indent / PO Date</span>
                      <span className="text-xs font-medium text-text-primary block mt-0.5">
                        {formatSafeDate(inspectionItem.details?.po_date || inspectionItem.details?.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Supplier PO Line Items if present */}
                  {piItems.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[11px] font-bold text-text-secondary block mb-1.5">
                        Procurement BOM / Components Breakdown ({piItems.length} items)
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-surface-hover border-b border-border text-text-secondary font-black uppercase text-[11px]">
                              <th className="py-2 px-3">SKU</th>
                              <th className="py-2 px-3">Product Name</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-right">Unit Rate</th>
                              <th className="py-2 px-3 text-right">Tax / GST</th>
                              <th className="py-2 px-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {piItems.map((it, idx) => (
                              <tr key={idx} className="hover:bg-primary/[0.02]">
                                <td className="py-2 px-3 font-mono text-[11px] font-bold text-text-secondary">{it.sku_code || "—"}</td>
                                <td className="py-2 px-3 font-bold text-text-primary">{it.product_name || "Component"}</td>
                                <td className="py-2 px-3 text-center font-bold font-mono">{it.quantity}</td>
                                <td className="py-2 px-3 text-right font-medium">{formatINR(it.unit_rate)}</td>
                                <td className="py-2 px-3 text-right text-text-secondary">{formatINR(it.tax_amount)}</td>
                                <td className="py-2 px-3 text-right font-black text-text-primary">{formatINR(it.total_value)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-surface-hover/60 border-t border-border font-bold">
                              <td colSpan="5" className="py-2 px-3 text-right text-text-muted uppercase text-[11px]">Total PI Value:</td>
                              <td className="py-2 px-3 text-right font-black text-text-primary text-xs">
                                {formatINR(piTotalValue || inspectionItem.requested_amount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 2. SUPPLIER BANK ACCOUNT & MILESTONES (Payment stages) ── */}
              {isPaymentStage && (
                <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <FaCoins className="w-3.5 h-3.5" />
                      </span>
                      Supplier Bank Account & Disbursement Milestones
                    </h4>
                    <span className="text-[11px] font-bold text-text-secondary">
                      Beneficiary: <strong className="text-text-primary">{inspectionItem.entity_name}</strong>
                    </span>
                  </div>

                  {/* Bank Account Fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-surface-hover border border-border text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Registered Bank</span>
                      <strong className="text-xs font-bold text-text-primary block mt-0.5">
                        {supplierBank || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Account Number</span>
                      <strong className="font-mono text-xs font-bold text-text-primary block mt-0.5">
                        {supplierAccNo || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">IFSC Code</span>
                      <strong className="font-mono text-xs font-bold text-text-primary block mt-0.5">
                        {supplierIfsc || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Disbursement Stage</span>
                      <strong className="text-xs font-black text-primary block mt-0.5">
                        {inspectionItem.stage_label}
                      </strong>
                    </div>
                  </div>

                  {/* 30% Advance vs 70% Balance milestone cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl border border-border bg-surface space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-text-primary">1st Payment (30% Advance)</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isAdvPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : paymentDetails.advance_approval?.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isAdvPaid
                            ? "Paid"
                            : paymentDetails.advance_approval?.status === "approved"
                            ? "Approved"
                            : (paymentDetails.advance_approval?.status || "Pending Approval")}
                        </span>
                      </div>
                      <div className="text-base font-black text-text-primary">
                        {formatINR(advAmount)}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        UTR: <span className="font-mono font-bold text-text-primary">{paymentDetails.advance_payment?.utr_number || "—"}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border bg-surface space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-text-primary">2nd Payment (70% Balance)</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isBalPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : paymentDetails.balance_approval?.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isBalPaid
                            ? "Paid"
                            : paymentDetails.balance_approval?.status === "approved"
                            ? "Approved"
                            : (paymentDetails.balance_approval?.status || "Pending Approval")}
                        </span>
                      </div>
                      <div className="text-base font-black text-text-primary">
                        {formatINR(balAmount)}
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        UTR: <span className="font-mono font-bold text-text-primary">{paymentDetails.balance_payment?.utr_number || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. BUYER & CUSTOMER PROFILE + DELIVERY DESTINATION ── */}
              {customerOrder && (
                <div className="space-y-3">
                  {(isPoStage || isPaymentStage) && (
                    <div className="text-text-muted text-[11px] font-bold uppercase tracking-wider">
                      Linked Customer Order Reference ({customerOrder?.order_number || inspectionItem.order_number})
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buyer & Customer Details */}
                    <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                            <FaBuilding className="w-3.5 h-3.5" />
                          </span>
                          Buyer & Customer Details
                        </h4>
                        {buyer?.gst && (
                          <span className="font-mono text-[10px] font-bold bg-surface-hover text-text-secondary border border-border px-2 py-0.5 rounded-md">
                            GST: {buyer.gst}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-text-muted block">Company / Customer Name</span>
                          <strong className="text-sm text-text-primary font-black block mt-0.5">
                            {buyer?.name || "—"}
                          </strong>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Contact Person</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5">
                              {buyer?.contact_person || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Phone / WhatsApp</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5 flex items-center gap-1.5">
                              <FaPhone className="w-2.5 h-2.5 text-emerald-600" />
                              {buyer?.phone || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Email Address</span>
                            <span className="text-xs font-medium text-text-primary block mt-0.5 truncate flex items-center gap-1.5" title={buyer?.email}>
                              <FaEnvelope className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                              {buyer?.email || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Order Placed Date</span>
                            <span className="text-xs font-medium text-text-primary block mt-0.5">
                              {formatSafeDate(customerOrder?.order_date || inspectionItem.requested_at)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-border/50">
                          <span className="text-[10px] font-semibold text-text-muted block">Billing / Registered Address</span>
                          <span className="text-xs text-text-secondary block mt-0.5">
                            {buyer?.address || `${buyer?.district || ""}, ${buyer?.state || ""} - ${buyer?.pincode || ""}`.trim() || "—"}
                          </span>
                        </div>

                        {customerOrder && (
                          <div className="p-2.5 rounded-xl bg-surface-hover border border-border flex items-center justify-between text-[11px]">
                            <div>
                              <span className="text-text-muted block text-[10px]">Payment Method</span>
                              <span className="font-bold text-text-primary uppercase mt-0.5 block">
                                {customerOrder.payment_method?.replace(/_/g, " ") || "—"}
                              </span>
                            </div>
                            {customerOrder.payment_reference && (
                              <div className="text-right">
                                <span className="text-text-muted block text-[10px]">Reference / UTR</span>
                                <span className="font-mono font-bold text-primary block mt-0.5">
                                  {customerOrder.payment_reference}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Site Delivery & Partner Destination */}
                    <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                            <FaMapMarkerAlt className="w-3.5 h-3.5" />
                          </span>
                          Site & Delivery Destination
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Destination
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-[11px] font-semibold text-text-muted block">Delivery Site Address</span>
                          <strong className="text-xs font-bold text-text-primary block mt-0.5">
                            {deliveryAddr?.line || "—"}
                          </strong>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50">
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">District</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5">
                              {deliveryAddr?.district || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">State</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5">
                              {deliveryAddr?.state || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Pincode</span>
                            <span className="text-xs font-mono font-bold text-text-primary block mt-0.5">
                              {deliveryAddr?.pincode || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Site Contact</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5">
                              {deliveryAddr?.contact_name || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-text-muted block">Site Phone</span>
                            <span className="text-xs font-bold text-text-primary block mt-0.5 flex items-center gap-1.5">
                              <FaPhone className="w-2.5 h-2.5 text-emerald-600" />
                              {deliveryAddr?.contact_phone || "—"}
                            </span>
                          </div>
                        </div>

                        {partner && (
                          <div className="p-3 rounded-xl bg-surface-hover border border-border space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                                <FaStore className="text-primary w-3 h-3" />
                                {partner.name || inspectionItem.partner_name || "—"}
                              </span>
                              <span className="text-[10px] text-text-muted font-bold">
                                {partner.city || "—"}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-secondary flex items-center justify-between">
                              <span>Partner Contact: {partner.phone || "—"}</span>
                              <span>{partner.email || ""}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CUSTOMER ORDER LINE ITEMS (Only for Customer Order Stage) ── */}
              {isOrderStage && orderItems.length > 0 && (
                <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                        <FaBoxes className="w-3.5 h-3.5" />
                      </span>
                      Customer Order Line Items ({orderItems.length} {orderItems.length === 1 ? "item" : "items"})
                    </h4>
                    {customerOrder?.grand_total > 0 && (
                      <span className="font-black text-xs text-text-primary">
                        Total Order: {formatINR(customerOrder.grand_total)}
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-surface-hover border-b border-border text-text-secondary font-black uppercase text-[11px]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Item / Kit Description</th>
                          <th className="py-2.5 px-3">Capacity / Specs</th>
                          <th className="py-2.5 px-3 text-center">Scope</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {orderItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-primary/[0.02]">
                            <td className="py-2.5 px-3 font-mono text-text-muted">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-text-primary">{item.item_name}</td>
                            <td className="py-2.5 px-3 text-text-secondary font-medium">{item.capacity || "—"}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-surface-hover border border-border text-text-secondary">
                                {item.scope_type || "Kit"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-text-primary font-mono">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-text-secondary">{formatINR(item.unit_price)}</td>
                            <td className="py-2.5 px-3 text-right font-black text-text-primary">{formatINR(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {customerOrder?.grand_total > 0 && (
                        <tfoot>
                          <tr className="bg-surface-hover/60 border-t border-border font-bold">
                            <td colSpan="5" className="py-2 px-3 text-right text-text-secondary text-[11px]">
                              Subtotal: {formatINR(customerOrder.subtotal)} | Tax (GST): {formatINR(customerOrder.tax_total)}
                              {customerOrder.shipping_fee > 0 ? ` | Shipping: ${formatINR(customerOrder.shipping_fee)}` : ""}
                            </td>
                            <td className="py-2 px-3 text-right text-text-muted uppercase text-[11px]">Grand Total:</td>
                            <td className="py-2 px-3 text-right font-black text-text-primary text-sm">
                              {formatINR(customerOrder.grand_total)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* ── DELIVERY FLEET & ROUTE DETAILS (Delivery stage) ── */}
              {isDeliveryStage && inspectionItem.details && (
                <div className="card p-4.5 border border-border bg-surface rounded-2xl shadow-xs space-y-3">
                  <h4 className="font-black text-text-primary text-xs uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2.5">
                    <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600">
                      <FaTruck className="w-3.5 h-3.5" />
                    </span>
                    Delivery & Route Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Carrier / Transporter</span>
                      <strong className="text-xs font-bold text-text-primary block mt-0.5">
                        {inspectionItem.details.service_provider_id?.name || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Vehicle Registration</span>
                      <strong className="font-mono text-xs font-bold text-text-primary block mt-0.5">
                        {inspectionItem.details.vehicles_allocated?.[0]?.registration_number || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Driver</span>
                      <strong className="text-xs font-bold text-text-primary block mt-0.5">
                        {inspectionItem.details.vehicles_allocated?.[0]?.driver_name || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted block">Total Stops</span>
                      <strong className="text-xs font-black text-text-primary block mt-0.5">
                        {inspectionItem.details.stops?.length || 1}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AUDIT HISTORY & STAGE REMARKS ── */}
              {inspectionItem.details?.audit_history && inspectionItem.details.audit_history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-text-primary text-xs uppercase tracking-wider">
                    Stage History & Audit Trail
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-hover">
                    {inspectionItem.details.audit_history.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-border bg-surface text-[11px] flex items-start justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <strong className="text-text-primary">{log.action}</strong>
                          <div className="text-text-secondary mt-0.5">{log.remarks || log.note || "No notes"}</div>
                        </div>
                        <div className="text-right text-[10px] text-text-muted whitespace-nowrap">
                          <div className="font-bold text-text-primary">{log.performer_name || log.role || "Admin"}</div>
                          <div>{formatSafeDate(log.timestamp || log.changed_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Decision Footer */}
              {inspectionItem.approval_status === "pending" && (
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                  <button
                    onClick={() => openDecisionModal(inspectionItem, "return")}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaUndo className="w-3 h-3" /> Return for Revision
                  </button>
                  <button
                    onClick={() => openDecisionModal(inspectionItem, "reject")}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaTimes className="w-3 h-3" /> Reject Request
                  </button>
                  <button
                    onClick={() => openDecisionModal(inspectionItem, "approve")}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaCheck className="w-3 h-3" /> Approve Stage
                  </button>
                </div>
              )}
            </div>
          </Dialog>
        );
      })()}

      {/* ── Decision Action Confirmation Modal (Approve / Reject / Return) ── */}
      {decisionModal.isOpen && decisionModal.item && (
        <Dialog
          isOpen={decisionModal.isOpen}
          onClose={() => setDecisionModal({ isOpen: false, item: null, action: "approve", remarks: "" })}
          title={`Confirm Action: ${decisionModal.action.toUpperCase()} — ${decisionModal.item.stage_label}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs p-1">
            <div className="p-3.5 rounded-xl border border-border bg-surface-hover">
              <div className="font-black text-text-primary text-sm">
                {decisionModal.item.order_number}
              </div>
              <div className="text-text-secondary mt-1">
                Amount: <strong className="text-text-primary">{formatINR(decisionModal.item.requested_amount)}</strong> |
                Entity: <span className="text-text-primary font-bold">{decisionModal.item.entity_name}</span>
              </div>
            </div>

            <div>
              <label className="block font-black text-text-primary mb-1.5">
                {decisionModal.action === "approve"
                  ? "Approval Remarks (Optional)"
                  : "Reason / Justification (Mandatory)"}
              </label>
              <textarea
                rows={3}
                placeholder={
                  decisionModal.action === "approve"
                    ? "Enter remarks (e.g. Verified benchmark and authorized)..."
                    : "Specify the exact reason for rejection or instructions for revision..."
                }
                value={decisionModal.remarks}
                onChange={(e) =>
                  setDecisionModal((prev) => ({ ...prev, remarks: e.target.value }))
                }
                className="w-full p-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() =>
                  setDecisionModal({ isOpen: false, item: null, action: "approve", remarks: "" })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover text-text-primary cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleDecisionSubmit}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm cursor-pointer transition-all ${
                  decisionModal.action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : decisionModal.action === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                {submitting ? "Processing..." : `Confirm ${decisionModal.action.toUpperCase()}`}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── Workflow Rules & Stage TAT Configuration Modal ── */}
      {configModalOpen && tempConfig && (
        <Dialog
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          title="Approval Workflow & Stage TAT Configuration"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs p-1">
            <p className="text-text-secondary text-xs">
              Configure mandatory approval gates and turnaround time (TAT) thresholds for each operational stage.
            </p>

            {/* Required stage toggles */}
            <div className="space-y-2.5 border border-border rounded-xl p-3.5 bg-surface-hover/50">
              <h4 className="font-black text-text-primary text-xs uppercase tracking-wider">Required Approval Gates</h4>

              {[
                { key: "require_order_approval", label: "Customer Store Order Approval (Store / EPC / FPO)" },
                { key: "require_po_approval", label: "Purchase Order (PO) Rate Approval (Procurement Indent)" },
                { key: "require_advance_payment_approval", label: "Supplier First Payment Approval (30% Advance)" },
                { key: "require_balance_payment_approval", label: "Supplier Second Payment Approval (70% Balance)" },
                { key: "require_delivery_variance_approval", label: "Delivery Freight Rate Variance Approval" },
              ].map((gate) => (
                <label key={gate.key} className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-text-primary font-bold">{gate.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(tempConfig[gate.key])}
                    onChange={(e) =>
                      setTempConfig((prev) => ({ ...prev, [gate.key]: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                </label>
              ))}
            </div>

            {/* Stage TAT Limits */}
            <div className="space-y-2.5 border border-border rounded-xl p-3.5 bg-surface-hover/50">
              <h4 className="font-black text-text-primary text-xs uppercase tracking-wider">
                Turnaround Time (TAT) Hours Thresholds
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "order_approval", label: "Customer Orders TAT (Hrs)" },
                  { key: "po_approval", label: "Purchase Order TAT (Hrs)" },
                  { key: "advance_payment", label: "1st Payment Advance TAT (Hrs)" },
                  { key: "balance_payment", label: "2nd Payment Balance TAT (Hrs)" },
                  { key: "delivery_charge", label: "Delivery Freight TAT (Hrs)" },
                ].map((tat) => (
                  <div key={tat.key}>
                    <label className="block text-[11px] text-text-secondary mb-1 font-bold">{tat.label}</label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={tempConfig.stage_tat_hours?.[tat.key] || 24}
                      onChange={(e) =>
                        setTempConfig((prev) => ({
                          ...prev,
                          stage_tat_hours: {
                            ...(prev.stage_tat_hours || {}),
                            [tat.key]: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-surface-hover text-text-primary cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white shadow-sm cursor-pointer transition-all"
              >
                {submitting ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
