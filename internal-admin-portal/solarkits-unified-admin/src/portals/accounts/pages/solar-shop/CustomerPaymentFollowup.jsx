import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  MdSearch,
  MdRefresh,
  MdFilterList,
  MdVisibility,
  MdReceipt,
  MdShoppingCart,
  MdOutlineVerifiedUser,
  MdOutlinePendingActions,
  MdClose,
  MdLocationOn,
  MdHistory,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdSecurity,
  MdPayments,
  MdArrowBack,
  MdPhone,
} from "react-icons/md";
import {
  FaBolt,
  FaHandshake,
  FaRupeeSign,
  FaShieldAlt,
  FaTruckMoving,
  FaRegCopy,
  FaCheck,
  FaUserShield,
  FaFileInvoiceDollar,
  FaWhatsapp,
  FaCalendarAlt,
  FaLock,
  FaUnlock,
  FaPhoneVolume,
} from "react-icons/fa";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiExternalLink,
  FiUploadCloud,
  FiFilter,
  FiChevronDown,
  FiX,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiPhoneCall,
  FiSend,
} from "react-icons/fi";
import {
  getCustomerPaymentFollowups,
  logCustomerPaymentFollowup,
  recordMilestoneTwoPayment,
  checkDuplicateUtr,
} from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Product8StageJourneyModal from "../../components/Product8StageJourneyModal";
import Button from "../../components/Button";

export default function CustomerPaymentFollowup() {
  const { user } = useSelector((state) => state.user_slice || {});

  // ── State: Orders & KPI Statistics ───────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_order_value: 0,
    advance_collected: 0,
    pending_amount: 0,
    overdue_count: 0,
    payment_submitted_count: 0,
    promised_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // ── Quick Sub-Tabs ───────────────────────────────────────────────────────
  // 'all' | 'awaiting_payment' | 'payment_submitted' | 'promised' | 'overdue'
  const [activeTab, setActiveTab] = useState("all");

  // ── Search & Filter State ────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [followUpStatusFilter, setFollowUpStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [delaySignalFilter, setDelaySignalFilter] = useState("all");
  const [copiedUtr, setCopiedUtr] = useState("");

  // ── Modals & Drawers ─────────────────────────────────────────────────────
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [journeyOrder, setJourneyOrder] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // ── Follow-up Call & Promise Log Modal State ─────────────────────────────
  const [followUpModal, setFollowUpModal] = useState({
    isOpen: false,
    order: null,
    status: "promised_to_pay",
    contact_mode: "call",
    remarks: "",
    promised_payment_date: "",
    next_follow_up_date: "",
    submitting: false,
  });

  // ── Milestone 2 Payment Verification Modal State ─────────────────────────
  const [milestoneModal, setMilestoneModal] = useState({
    isOpen: false,
    order: null,
    utr_number: "",
    amount_paid: "",
    payment_date: new Date().toISOString().slice(0, 10),
    sender_bank_name: "",
    receiving_account_reference: "HDFC Bank - Current A/c 50200088991122",
    receipt_url: "",
    accounts_remarks: "",
    submitting: false,
    duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null, checking: false },
  });

  // ── Fetch Follow-up Orders ───────────────────────────────────────────────
  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        tab: activeTab,
      };

      if (followUpStatusFilter !== "all") params.follow_up_status = followUpStatusFilter;
      if (stageFilter !== "all") params.stage = stageFilter;
      if (delaySignalFilter !== "all") params.delay_signal = delaySignalFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getCustomerPaymentFollowups(params);
      if (res.status === "success") {
        setOrders(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching customer payment followups:", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, followUpStatusFilter, stageFilter, delaySignalFilter, searchQuery]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFollowups();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFollowUpStatusFilter("all");
    setStageFilter("all");
    setDelaySignalFilter("all");
    setActiveTab("all");
    setPage(1);
  };

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(""), 2000);
  };

  const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // ── Open Follow-up Modal ─────────────────────────────────────────────────
  const handleOpenFollowUpModal = (order) => {
    setFollowUpModal({
      isOpen: true,
      order,
      status: order.follow_up?.status || "promised_to_pay",
      contact_mode: "call",
      remarks: "",
      promised_payment_date: order.follow_up?.promised_payment_date
        ? new Date(order.follow_up.promised_payment_date).toISOString().slice(0, 10)
        : "",
      next_follow_up_date: order.follow_up?.next_follow_up_date
        ? new Date(order.follow_up.next_follow_up_date).toISOString().slice(0, 10)
        : "",
      submitting: false,
    });
  };

  // ── Submit Follow-up Note ────────────────────────────────────────────────
  const handleSubmitFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpModal.order) return;
    setFollowUpModal((prev) => ({ ...prev, submitting: true }));

    try {
      const payload = {
        status: followUpModal.status,
        contact_mode: followUpModal.contact_mode,
        remarks: followUpModal.remarks,
        promised_payment_date: followUpModal.promised_payment_date || null,
        next_follow_up_date: followUpModal.next_follow_up_date || null,
      };

      const res = await logCustomerPaymentFollowup(followUpModal.order._id, payload);
      if (res.status === "success") {
        setFollowUpModal({
          isOpen: false,
          order: null,
          status: "promised_to_pay",
          contact_mode: "call",
          remarks: "",
          promised_payment_date: "",
          next_follow_up_date: "",
          submitting: false,
        });
        fetchFollowups();
      }
    } catch (err) {
      console.error("Failed to log customer follow-up:", err);
      alert("Failed to save follow-up note: " + (err.response?.data?.message || err.message));
      setFollowUpModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // ── Open Milestone 2 Payment Modal ───────────────────────────────────────
  const handleOpenMilestoneModal = (order) => {
    const remainingAmt = order.remaining_amount || order.outstanding_amount || 0;
    const m2Sub = order.milestone_2_submission;

    setMilestoneModal({
      isOpen: true,
      order,
      utr_number: m2Sub?.utr_number || "",
      amount_paid: m2Sub?.amount_paid || remainingAmt,
      payment_date: m2Sub?.payment_date
        ? new Date(m2Sub.payment_date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      sender_bank_name: m2Sub?.sender_bank_name || "",
      receiving_account_reference: "HDFC Bank - Current A/c 50200088991122",
      receipt_url: m2Sub?.receipt_url || "",
      accounts_remarks: `Milestone 2 (${order.remaining_percentage || order.payment_milestones?.remaining_percentage || 70}%) payment verified for Order ${order.order_number}`,
      submitting: false,
      duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null, checking: false },
    });
  };

  // ── Check Duplicate UTR ──────────────────────────────────────────────────
  const performDuplicateCheck = async (utr, orderId) => {
    if (!utr || !utr.trim()) return;
    setMilestoneModal((prev) => ({
      ...prev,
      duplicateCheck: { ...prev.duplicateCheck, checking: true },
    }));

    try {
      const res = await checkDuplicateUtr(utr.trim(), orderId);
      setMilestoneModal((prev) => ({
        ...prev,
        duplicateCheck: {
          checked: true,
          isDuplicate: res.is_duplicate,
          matchingOrder: res.matching_order || null,
          checking: false,
        },
      }));
    } catch (err) {
      console.error("Duplicate check failed:", err);
      setMilestoneModal((prev) => ({
        ...prev,
        duplicateCheck: { ...prev.duplicateCheck, checking: false },
      }));
    }
  };

  // ── Submit Milestone 2 Payment Verification ──────────────────────────────
  const handleSubmitMilestonePayment = async (e) => {
    e.preventDefault();
    if (!milestoneModal.order) return;
    if (!milestoneModal.utr_number.trim()) {
      alert("Please provide the UTR / Bank Reference number");
      return;
    }

    setMilestoneModal((prev) => ({ ...prev, submitting: true }));

    try {
      const payload = {
        utr_number: milestoneModal.utr_number.trim(),
        amount_paid: Number(milestoneModal.amount_paid) || milestoneModal.order.remaining_amount,
        payment_date: milestoneModal.payment_date,
        sender_bank_name: milestoneModal.sender_bank_name,
        receipt_url: milestoneModal.receipt_url,
        accounts_remarks: milestoneModal.accounts_remarks,
      };

      const res = await recordMilestoneTwoPayment(milestoneModal.order._id, payload);
      if (res.status === "success") {
        setMilestoneModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
        alert("Milestone 2 payment recorded & verified successfully! Order is unlocked for dispatch.");
        fetchFollowups();
      }
    } catch (err) {
      console.error("Failed to record milestone payment:", err);
      alert("Failed to record milestone payment: " + (err.response?.data?.message || err.message));
      setMilestoneModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">
              Customer Payment & Follow-up Module
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              Pending Milestones Tracking
            </span>
          </div>
          <p className="text-xs text-text-secondary max-w-3xl leading-relaxed">
            Follow up on pending milestone payments for customers whose advance is verified.
            Maintain contact call logs, record promised payment dates, and verify the final balance payment to unlock warehouse dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            to="/account-panel/solar-shop/epc-orders"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition flex items-center gap-1.5"
            title="Return to EPC Orders & Verification Queue"
          >
            <MdArrowBack />
            <span>EPC Verification Queue</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              showFilters
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
            }`}
          >
            <MdFilterList />
            <span>Filters</span>
          </button>

          <button
            type="button"
            onClick={fetchFollowups}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover text-text-secondary transition flex items-center gap-1.5"
          >
            <MdRefresh className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Follow-up Orders */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-text-secondary tracking-wider">
              Active Milestone Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FaBolt />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary tracking-tight">
              {stats.total_orders} <span className="text-xs font-bold text-text-muted">Orders</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Gross Value: <span className="font-bold text-text-primary">{formatCurrency(stats.total_order_value)}</span>
            </div>
          </div>
          <div className="text-[10px] text-text-secondary border-t border-border/60 pt-2 flex items-center justify-between">
            <span>Advance Verified</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">In Production Pipeline</span>
          </div>
        </div>

        {/* Card 2: Advance Collected */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-text-secondary tracking-wider">
              Advance Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <MdOutlineVerifiedUser />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(stats.advance_collected)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Officially verified & approved in company bank
            </div>
          </div>
          <div className="text-[10px] text-text-secondary border-t border-border/60 pt-2 flex items-center justify-between">
            <span>Verified Offline Bank Transfers</span>
            <span className="text-emerald-600 font-bold">Secured</span>
          </div>
        </div>

        {/* Card 3: Pending Recovery */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-text-secondary tracking-wider">
              Pending Recovery
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <MdPayments />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(stats.pending_amount)}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Remaining balance due before warehouse release
            </div>
          </div>
          <div className="text-[10px] text-text-secondary border-t border-border/60 pt-2 flex items-center justify-between">
            <span>Mandatory Before Dispatch</span>
            <span className="text-amber-600 font-bold">Follow-up Target</span>
          </div>
        </div>

        {/* Card 4: TAT Delay & Second Payment Submissions */}
        <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-text-secondary tracking-wider">
              Follow-up Alerts & Action
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <MdWarning />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <div>
                <span className="text-2xl font-black text-rose-600">{stats.overdue_count}</span>
                <span className="text-[10px] text-rose-600/80 font-bold ml-1">Overdue</span>
              </div>
              <div className="h-6 w-px bg-border"></div>
              <div>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.payment_submitted_count}</span>
                <span className="text-[10px] text-purple-600/80 font-bold ml-1">Ready to Verify</span>
              </div>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {stats.promised_count} customers promised payment date
            </div>
          </div>
          <div className="text-[10px] text-text-secondary border-t border-border/60 pt-2 flex items-center justify-between">
            <span>Red Signal Overdue Delays</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab("overdue");
                setPage(1);
              }}
              className="text-rose-600 hover:underline font-bold"
            >
              Filter Overdue →
            </button>
          </div>
        </div>
      </div>

      {/* ── Sub-Segment Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "All Pending Follow-ups", count: stats.total_orders },
            {
              key: "awaiting_payment",
              label: "Awaiting Balance Transfer",
              count: Math.max(0, stats.total_orders - stats.payment_submitted_count),
            },
            {
              key: "payment_submitted",
              label: "Second Payment Submitted (Verify Now)",
              count: stats.payment_submitted_count,
              highlight: stats.payment_submitted_count > 0,
              highlightColor: "purple",
            },
            {
              key: "promised",
              label: "Promised Payment Scheduled",
              count: stats.promised_count,
              highlight: stats.promised_count > 0,
              highlightColor: "amber",
            },
            {
              key: "overdue",
              label: "Delayed Beyond TAT (Overdue)",
              count: stats.overdue_count,
              highlight: stats.overdue_count > 0,
              highlightColor: "rose",
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? tab.highlightColor === "rose"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : tab.highlightColor === "purple"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : tab.highlightColor === "amber"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "bg-primary text-white shadow-md shadow-primary/30"
                  : tab.highlight
                  ? tab.highlightColor === "rose"
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25"
                    : tab.highlightColor === "purple"
                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                  : "bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-border"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count != null && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : tab.highlight
                      ? tab.highlightColor === "rose"
                        ? "bg-rose-600 text-white animate-pulse"
                        : tab.highlightColor === "purple"
                        ? "bg-purple-600 text-white"
                        : "bg-amber-500 text-white animate-pulse"
                      : "bg-surface-hover text-text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {(searchQuery || followUpStatusFilter !== "all" || stageFilter !== "all" || delaySignalFilter !== "all" || activeTab !== "all") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition"
          >
            <FiX /> Reset All Filters
          </button>
        )}
      </div>

      {/* ── Expandable Filter Bar ──────────────────────────────────────────── */}
      {showFilters && (
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FiFilter className="text-primary" /> Filter Customer Follow-up Pipeline
            </span>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="text-text-muted hover:text-text-primary text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Follow-up Status */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Follow-up Call Status</label>
              <select
                value={followUpStatusFilter}
                onChange={(e) => {
                  setFollowUpStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Follow-up Statuses</option>
                <option value="pending">Pending Follow-up (Not Contacted)</option>
                <option value="contacted">Contacted / Call Done</option>
                <option value="promised_to_pay">Promised to Pay (Scheduled)</option>
                <option value="details_sent">Bank Details / QR Sent</option>
                <option value="second_payment_submitted">Second Payment Submitted</option>
              </select>
            </div>

            {/* Production Lifecycle Stage */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Order Production Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Stages</option>
                <option value="confirmed">Confirmed (Advance Verified)</option>
                <option value="processing">Processing (Warehouse BOM Picking)</option>
                <option value="vehicle_assigned">Vehicle Assigned</option>
                <option value="ready_for_dispatch">Ready for Dispatch (Gate Lock)</option>
              </select>
            </div>

            {/* Delay Signal */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">TAT Delay Signal</label>
              <select
                value={delaySignalFilter}
                onChange={(e) => {
                  setDelaySignalFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Signals</option>
                <option value="green">🟢 Green: Within Configured TAT</option>
                <option value="orange">🟠 Orange: Approaching Stage Deadline</option>
                <option value="red">🔴 Red: Overdue Exceeded TAT</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Bar ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg" />
          <input
            type="text"
            placeholder="Search by exact Official Order Number (ORD-EPC-...), Contractor Name, WhatsApp/Phone, District, or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <MdClose />
            </button>
          )}
        </div>
        <Button type="submit" variant="primary" size="sm" className="px-5 font-bold">
          Search
        </Button>
      </form>

      {/* ── Main Customer Payment & Follow-up Table ────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-hover/70 border-b border-border text-text-secondary font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Order Ref / ID</th>
                <th className="py-3 px-3">Customer / Solar EPC</th>
                <th className="py-3 px-3">Kit & Capacity</th>
                <th className="py-3 px-3 text-right">Order Value (100%)</th>
                <th className="py-3 px-3 text-right">Advance Paid</th>
                <th className="py-3 px-3 text-right">Pending Balance</th>
                <th className="py-3 px-3">Next Milestone</th>
                <th className="py-3 px-3">Order Lifecycle</th>
                <th className="py-3 px-3 text-center">TAT Elapsed</th>
                <th className="py-3 px-3 text-center">Delay Signal</th>
                <th className="py-3 px-3">Follow-up Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold">Loading Customer Payment & Follow-up Pipeline...</p>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <MdShoppingCart className="text-3xl text-text-muted/60" />
                      <p className="text-sm font-bold text-text-primary">No Pending Follow-up Orders</p>
                      <p className="text-xs text-text-secondary">
                        All orders are either fully settled or no orders matched your filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const m2Sub = o.milestone_2_submission;
                  const hasSecondPaymentSubmitted =
                    o.milestone_verification_status === "final_payment_pending_verification" ||
                    m2Sub?.payment_status === "pending_verification" ||
                    o.follow_up?.status === "second_payment_submitted";

                  return (
                    <tr key={o._id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* 1. Official Order Number */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-black text-text-primary dark:text-white flex items-center gap-1">
                          <span>{o.order_number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(o.order_number)}
                            className="text-text-muted hover:text-primary transition"
                            title="Copy Order Number"
                          >
                            {copiedUtr === o.order_number ? (
                              <FaCheck className="text-emerald-500 text-[10px]" />
                            ) : (
                              <FaRegCopy className="text-[10px]" />
                            )}
                          </button>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mt-1">
                          <FiCheckCircle size={9} /> Advance {o.advance_percentage || o.payment_milestones?.advance_percentage || 30}% Verified
                        </span>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {formatDate(o.created_at)}
                        </div>
                      </td>

                      {/* 2. Solar EPC Customer & Quick Contacts */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-text-primary dark:text-white truncate max-w-[150px]" title={o.customer?.company_name || o.customer?.name}>
                          {o.customer?.company_name || o.customer?.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-text-muted">{o.customer?.phone}</span>
                          {o.customer?.phone && o.customer.phone !== "-" && (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${o.customer.phone}`}
                                className="p-1 rounded bg-surface-hover hover:bg-primary hover:text-white text-text-secondary transition text-[11px]"
                                title="Call Customer"
                              >
                                <MdPhone />
                              </a>
                              <a
                                href={`https://wa.me/91${o.customer.phone.replace(/[^0-9]/g, "").slice(-10)}?text=Hello%20${encodeURIComponent(
                                  o.customer.name
                                )},%20this%20is%20SolarKits%20Accounts%20regarding%20your%20Order%20${o.order_number}.%20Your%20remaining%20balance%20of%20${encodeURIComponent(
                                  formatCurrency(o.remaining_amount)
                                )}%20is%20due%20before%20dispatch.`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 transition text-[11px]"
                                title="Send WhatsApp Payment Follow-up"
                              >
                                <FaWhatsapp />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-text-secondary flex items-center gap-0.5 mt-0.5">
                          <MdLocationOn className="text-primary shrink-0" />
                          <span className="truncate max-w-[130px]">{o.customer?.district}, {o.customer?.state}</span>
                        </div>
                      </td>

                      {/* 3. Kit & Quantity */}
                      <td className="py-3 px-3">
                        <div className="max-w-[150px]">
                          {(o.items || []).slice(0, 1).map((it, idx) => (
                            <div key={idx} className="truncate text-text-primary font-medium" title={it.item_name}>
                              {it.item_name} <span className="text-primary font-bold">x{it.quantity}</span>
                            </div>
                          ))}
                          {(o.items || []).length > 1 && (
                            <span className="text-[10px] text-primary font-bold">
                              +{(o.items || []).length - 1} more items
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Order Value (100%) */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-text-primary dark:text-white">
                          {formatCurrency(o.grand_total)}
                        </div>
                        <span className="text-[9px] text-text-muted font-bold">Gross Total</span>
                      </td>

                      {/* 5. Advance Paid Verified */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(o.advance_amount)}
                        </div>
                        <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-end gap-1 mt-0.5">
                          <span>{o.advance_percentage || o.payment_milestones?.advance_percentage || 30}% Verified</span>
                          <FiCheckCircle size={8} />
                        </div>
                        {o.advance_utr && o.advance_utr !== "-" && (
                          <div className="font-mono text-[8px] text-text-muted truncate max-w-[100px] ml-auto" title={o.advance_utr}>
                            UTR: {o.advance_utr}
                          </div>
                        )}
                      </td>

                      {/* 6. Pending Balance Outstanding */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-amber-600 dark:text-amber-400 text-sm">
                          {formatCurrency(o.remaining_amount)}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 mt-0.5">
                          {o.remaining_percentage || o.payment_milestones?.remaining_percentage || 70}% Outstanding
                        </span>
                      </td>

                      {/* 7. Next Milestone Stage */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-text-primary text-[11px]">
                            Milestone 2 ({o.remaining_percentage || o.payment_milestones?.remaining_percentage || 70}%)
                          </div>
                          <div className="text-[9px] text-text-muted">
                            Trigger: Before Dispatch
                          </div>
                          {hasSecondPaymentSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 animate-pulse">
                              UTR Submitted (Verify)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Payment Awaited
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Order Lifecycle & Dispatch Gate */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight bg-surface-hover border border-border text-text-primary">
                            {o.order_status?.replace(/_/g, " ")}
                          </span>
                          {o.is_dispatch_blocked ? (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-rose-600">
                              <FaLock size={8} /> Gate Exit Blocked
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                              <FaUnlock size={8} /> Dispatch Cleared
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 9. TAT Elapsed */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-text-primary">
                          {o.days_elapsed || 0}d
                        </span>
                        <div className="text-[9px] text-text-muted">
                          TAT: {o.payment_tat_days || 2}d
                        </div>
                      </td>

                      {/* 10. Delay Signal */}
                      <td className="py-3 px-3 text-center">
                        {o.delay_signal === "green" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            🟢 Within TAT
                          </span>
                        ) : o.delay_signal === "orange" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            🟠 Approaching
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                            🔴 Overdue Alert
                          </span>
                        )}
                      </td>

                      {/* 11. Follow-up Status */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              o.follow_up?.status === "promised_to_pay"
                                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30"
                                : o.follow_up?.status === "second_payment_submitted"
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold"
                                : o.follow_up?.status === "contacted"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-surface-hover text-text-muted border border-border"
                            }`}
                          >
                            {o.follow_up?.status === "promised_to_pay"
                              ? `Promised (${formatDate(o.follow_up.promised_payment_date)})`
                              : o.follow_up?.status === "second_payment_submitted"
                              ? `${o.remaining_percentage || o.payment_milestones?.remaining_percentage || 70}% UTR Submitted`
                              : o.follow_up?.status === "contacted"
                              ? "Follow-up Done"
                              : "Pending Call"}
                          </span>

                          {o.follow_up?.remarks && (
                            <div className="text-[10px] text-text-secondary truncate max-w-[140px]" title={o.follow_up.remarks}>
                              "{o.follow_up.remarks}"
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Log Follow-up Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenFollowUpModal(o)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-surface-hover hover:bg-surface border border-border text-primary hover:border-primary transition flex items-center gap-1 shadow-sm"
                            title="Log Follow-up Call / Promised Date"
                          >
                            <FiPhoneCall size={12} />
                            <span>Follow-up</span>
                          </button>

                          {/* Record / Verify Milestone 2 Payment */}
                          <button
                            type="button"
                            onClick={() => handleOpenMilestoneModal(o)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 transition flex items-center gap-1"
                            title={`Record or Verify Milestone 2 (${o.remaining_percentage || o.payment_milestones?.remaining_percentage || 70}%) Payment`}
                          >
                            <FaFileInvoiceDollar size={12} />
                            <span>Record Balance</span>
                          </button>

                          {/* Transaction Details Side Drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxn(o);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                            title="View Full Order Details"
                          >
                            <MdVisibility size={14} />
                          </button>

                          {/* 8-Stage Lifecycle Journey Tracker */}
                          <button
                            type="button"
                            onClick={() => setJourneyOrder(o)}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                            title="8-Stage Order Lifecycle Tracker"
                          >
                            <FaTruckMoving size={13} />
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

        {/* ── Table Footer & Pagination ────────────────────────────────────── */}
        <div className="p-4 border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs text-text-secondary">
          <div>
            Showing <span className="font-bold text-text-primary">{orders.length}</span> of{" "}
            <span className="font-bold text-text-primary">{total}</span> milestone follow-up orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="font-bold text-text-primary">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal 1: Log Customer Follow-up & Promise Date ─────────────────── */}
      {followUpModal.isOpen && followUpModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-text-primary">Log Customer Follow-up</h3>
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {followUpModal.order.order_number}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Customer: <span className="font-bold text-text-primary">{followUpModal.order.customer?.name}</span> ({followUpModal.order.customer?.phone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModal({ ...followUpModal, isOpen: false })}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitFollowUp} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-surface-hover rounded-xl border border-border text-center">
                <div>
                  <span className="text-[10px] text-text-muted font-bold block uppercase">Order Value</span>
                  <span className="font-black text-text-primary">{formatCurrency(followUpModal.order.grand_total)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block uppercase">
                    {followUpModal.order.advance_percentage || followUpModal.order.payment_milestones?.advance_percentage || 30}% Verified
                  </span>
                  <span className="font-black text-emerald-600">{formatCurrency(followUpModal.order.advance_amount)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-600 font-bold block uppercase">
                    {followUpModal.order.remaining_percentage || followUpModal.order.payment_milestones?.remaining_percentage || 70}% Due
                  </span>
                  <span className="font-black text-amber-600">{formatCurrency(followUpModal.order.remaining_amount)}</span>
                </div>
              </div>

              {/* Follow-up Status */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">
                  Follow-up Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={followUpModal.status}
                  onChange={(e) => setFollowUpModal({ ...followUpModal, status: e.target.value })}
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                >
                  <option value="promised_to_pay">Customer Promised Payment Date</option>
                  <option value="contacted">Call Completed / Discussed Milestone 2</option>
                  <option value="details_sent">Bank Details / Payment Link Sent via WhatsApp</option>
                  <option value="second_payment_submitted">Customer Claimed Balance Paid (UTR Shared)</option>
                  <option value="pending">Call Scheduled / Follow-up Pending</option>
                </select>
              </div>

              {/* Contact Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Contact Channel</label>
                  <select
                    value={followUpModal.contact_mode}
                    onChange={(e) => setFollowUpModal({ ...followUpModal, contact_mode: e.target.value })}
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="email">Email</option>
                    <option value="in_person">In-Person Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Promised Payment Date</label>
                  <input
                    type="date"
                    value={followUpModal.promised_payment_date}
                    onChange={(e) => setFollowUpModal({ ...followUpModal, promised_payment_date: e.target.value })}
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">
                  Discussion Notes & Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter details of conversation: customer feedback, bank transfer commitment, invoice copy requested, etc..."
                  value={followUpModal.remarks}
                  onChange={(e) => setFollowUpModal({ ...followUpModal, remarks: e.target.value })}
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              {/* Follow-up History Audit Trail */}
              {followUpModal.order.follow_up?.history?.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <span className="text-xs font-black uppercase text-text-secondary tracking-wider flex items-center gap-1.5">
                    <MdHistory /> Previous Follow-up History ({followUpModal.order.follow_up.history.length})
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {followUpModal.order.follow_up.history.slice().reverse().map((h, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-surface-hover/70 border border-border text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-primary uppercase text-[10px]">{h.contact_mode} • {h.status?.replace(/_/g, " ")}</span>
                          <span className="text-text-muted text-[10px]">{formatDateTime(h.contacted_at)}</span>
                        </div>
                        <p className="text-text-primary">{h.remarks}</p>
                        {h.promised_payment_date && (
                          <div className="text-[10px] text-amber-600 font-bold">
                            Promised on: {formatDate(h.promised_payment_date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFollowUpModal({ ...followUpModal, isOpen: false })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={followUpModal.submitting}
                  className="font-bold px-5"
                >
                  {followUpModal.submitting ? "Saving Note..." : "Save Follow-up Note"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Record / Verify Milestone 2 Payment ───────────────────── */}
      {milestoneModal.isOpen && milestoneModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-text-primary">
                    Record Milestone 2 ({milestoneModal.order.remaining_percentage || milestoneModal.order.payment_milestones?.remaining_percentage || 70}%) Payment
                  </h3>
                  <span className="font-mono text-xs font-bold text-emerald-600 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {milestoneModal.order.order_number}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  Customer: <span className="font-bold text-text-primary">{milestoneModal.order.customer?.name}</span> • Releasing dispatch gate lock upon verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMilestoneModal({ ...milestoneModal, isOpen: false })}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitMilestonePayment} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Financial Snapshot */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase block">
                    Outstanding {milestoneModal.order.remaining_percentage || milestoneModal.order.payment_milestones?.remaining_percentage || 70}% Balance Due
                  </span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                    {formatCurrency(milestoneModal.order.remaining_amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted block">Gross Order Total</span>
                  <span className="font-bold text-text-primary">{formatCurrency(milestoneModal.order.grand_total)}</span>
                </div>
              </div>

              {/* UTR Input & Duplicate Check */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 12-22 digit NEFT / RTGS / IMPS UTR..."
                    value={milestoneModal.utr_number}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setMilestoneModal({
                        ...milestoneModal,
                        utr_number: val,
                        duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null, checking: false },
                      });
                    }}
                    onBlur={() => performDuplicateCheck(milestoneModal.utr_number, milestoneModal.order._id)}
                    className="flex-1 p-2.5 font-mono bg-surface-hover border border-border rounded-xl text-text-primary font-bold focus:ring-2 focus:ring-primary focus:outline-none uppercase"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => performDuplicateCheck(milestoneModal.utr_number, milestoneModal.order._id)}
                    disabled={milestoneModal.duplicateCheck.checking || !milestoneModal.utr_number.trim()}
                    className="px-3 py-2 bg-surface-hover hover:bg-surface border border-border rounded-xl font-bold text-text-secondary text-xs"
                  >
                    {milestoneModal.duplicateCheck.checking ? "Checking..." : "Verify UTR"}
                  </button>
                </div>

                {milestoneModal.duplicateCheck.checked && (
                  <div className="mt-1 text-[11px]">
                    {milestoneModal.duplicateCheck.isDuplicate ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <MdWarning /> Warning: UTR already claimed in Order{" "}
                        {milestoneModal.duplicateCheck.matchingOrder?.order_number}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <FiCheckCircle /> UTR is unique and verified clean.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Amount Paid & Payment Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">
                    Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={milestoneModal.amount_paid}
                    onChange={(e) => setMilestoneModal({ ...milestoneModal, amount_paid: e.target.value })}
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-black focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={milestoneModal.payment_date}
                    onChange={(e) => setMilestoneModal({ ...milestoneModal, payment_date: e.target.value })}
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Sender Bank & Receiving Bank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-secondary mb-1">Customer Remitting Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC, SBI, ICICI, Axis..."
                    value={milestoneModal.sender_bank_name}
                    onChange={(e) => setMilestoneModal({ ...milestoneModal, sender_bank_name: e.target.value })}
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-text-secondary mb-1">Company Receiving Bank</label>
                  <input
                    type="text"
                    readOnly
                    value={milestoneModal.receiving_account_reference}
                    className="w-full p-2.5 bg-surface-hover/50 border border-border rounded-xl text-text-muted font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Payment Proof Receipt URL */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">Payment Proof / Screenshot URL</label>
                <input
                  type="url"
                  placeholder="Paste transaction receipt image URL (Cloudinary / S3 / Direct Link)..."
                  value={milestoneModal.receipt_url}
                  onChange={(e) => setMilestoneModal({ ...milestoneModal, receipt_url: e.target.value })}
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Accounts Remarks */}
              <div>
                <label className="block font-bold text-text-secondary mb-1">Accounts Verification Remarks</label>
                <textarea
                  rows={2}
                  value={milestoneModal.accounts_remarks}
                  onChange={(e) => setMilestoneModal({ ...milestoneModal, accounts_remarks: e.target.value })}
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                <FiCheckCircle className="shrink-0 text-base" />
                <span>
                  Verifying this payment marks the order as <strong>Fully Paid</strong>, unlocks warehouse gate release, and generates the final GST Tax Invoice.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMilestoneModal({ ...milestoneModal, isOpen: false })}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={milestoneModal.submitting}
                  className="font-bold px-5 bg-emerald-600 hover:bg-emerald-700"
                >
                  {milestoneModal.submitting ? "Verifying..." : "Verify & Clear for Dispatch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Details Side Drawer ─────────────────────────────────── */}
      <TransactionDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        transaction={selectedTxn}
        type="epc"
      />

      {/* ── 8-Stage Order Lifecycle Modal ───────────────────────────────────── */}
      {journeyOrder && (
        <Product8StageJourneyModal
          order={journeyOrder}
          onClose={() => setJourneyOrder(null)}
          onOrderUpdated={() => {
            fetchFollowups();
            setJourneyOrder(null);
          }}
        />
      )}
    </div>
  );
}
