import React, { useState, useEffect, useCallback } from "react";
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
  MdSettings,
  MdHistory,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdSecurity,
  MdSync,
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
  FaCalculator,
  FaFileInvoiceDollar,
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
} from "react-icons/fi";
import {
  getUnifiedEpcOrders,
  verifyEpcOrderPayment,
  checkDuplicateUtr,
  accountsVerifyEpcPayment,
} from "../../api/solarshopAccounts";
import TransactionDetailsDrawer from "../../components/TransactionDetailsDrawer";
import Product8StageJourneyModal from "../../components/Product8StageJourneyModal";
import Button from "../../components/Button";

export default function EpcOrdersManagement() {
  const { user } = useSelector((state) => state.user_slice || {});

  // Fixed Role: Accounts Portal

  // ── State: Orders & Statistics ──────────────────────────────────────────
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

  // ── Quick Segment Tabs ──────────────────────────────────────────────────
  // 'all' | 'offline_pending' | 'awaiting_admin' | 'approved_paid' | 'delays' | 'rejected' | 'online'
  const [activeTab, setActiveTab] = useState("all");

  // ── Filters State ───────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all"); // 'all' | 'online' | 'offline'
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all"); // 'all' | 10 standard statuses
  const [paymentStageFilter, setPaymentStageFilter] = useState("all"); // 'all' | 8 stages
  const [channelFilter, setChannelFilter] = useState("all"); // 'all' | 'direct' | 'onboarded'
  const [stateFilter, setStateFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("");
  const [datePreset, setDatePreset] = useState("all"); // 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month'
  const [delaySignalFilter, setDelaySignalFilter] = useState("all"); // 'all' | 'green' | 'orange' | 'red'
  const [copiedUtr, setCopiedUtr] = useState("");

  // ── Modals & Drawers ────────────────────────────────────────────────────
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [journeyOrder, setJourneyOrder] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Accounts Verification Modal
  const [accountsModal, setAccountsModal] = useState({
    isOpen: false,
    order: null,
    utr_number: "",
    payment_date: "",
    payment_mode: "bank_transfer",
    amount_paid: "",
    receiving_account_reference: "HDFC Bank - Current A/c 50200088991122",
    receipt_url: "",
    accounts_remarks: "",
    decision: "submitted_for_approval", // 'submitted_for_approval' | 'returned' | 'rejected'
    duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null, checking: false },
  });
  const [submittingAccounts, setSubmittingAccounts] = useState(false);

  // Audit History Modal
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    order: null,
  });

  // ── Fetch Orders ────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        tab: activeTab,
      };

      if (paymentModeFilter !== "all") params.payment_mode = paymentModeFilter;
      if (paymentStatusFilter !== "all") params.payment_status = paymentStatusFilter;
      if (paymentStageFilter !== "all") params.payment_stage = paymentStageFilter;
      if (channelFilter !== "all") params.channel = channelFilter;
      if (stateFilter !== "all") params.state_name = stateFilter;
      if (districtFilter.trim()) params.district_name = districtFilter.trim();
      if (datePreset !== "all") params.date_preset = datePreset;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getUnifiedEpcOrders(params);
      if (res.status === "success") {
        let fetched = res.data || [];
        if (delaySignalFilter !== "all") {
          fetched = fetched.filter((o) => o.delay_signal === delaySignalFilter);
        }
        setOrders(fetched);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching unified epc orders:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    activeTab,
    paymentModeFilter,
    paymentStatusFilter,
    paymentStageFilter,
    channelFilter,
    stateFilter,
    districtFilter,
    datePreset,
    delaySignalFilter,
    searchQuery,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time listener for incoming ICICI webhook credits
  useEffect(() => {
    const handlePaymentReceived = () => {
      fetchOrders();
    };
    window.addEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
    return () => window.removeEventListener("ICICI_PAYMENT_RECEIVED", handlePaymentReceived);
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPaymentModeFilter("all");
    setPaymentStatusFilter("all");
    setPaymentStageFilter("all");
    setChannelFilter("all");
    setStateFilter("all");
    setDistrictFilter("");
    setDatePreset("all");
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
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // ── Duplicate UTR Validation Check ──────────────────────────────────────
  const performDuplicateCheck = async (utr, orderId) => {
    if (!utr || !utr.trim()) return;
    setAccountsModal((prev) => ({
      ...prev,
      duplicateCheck: { ...prev.duplicateCheck, checking: true },
    }));

    try {
      const res = await checkDuplicateUtr(utr.trim(), orderId);
      setAccountsModal((prev) => ({
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
      setAccountsModal((prev) => ({
        ...prev,
        duplicateCheck: { ...prev.duplicateCheck, checking: false },
      }));
    }
  };

  // ── Open Accounts Verification Modal ────────────────────────────────────
  const handleOpenAccountsModal = (order) => {
    const m1Req = order.payment_milestones?.advance_amount || Math.round((order.grand_total || 0) * 0.3);
    const claimedAmt =
      order.offline_payment?.amount_paid ||
      order.payment_milestones?.advance_amount ||
      order.grand_total ||
      0;
    const utr = order.offline_payment?.utr_number || order.payment_reference || "";
    const pDate = order.offline_payment?.payment_date
      ? new Date(order.offline_payment.payment_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    setAccountsModal({
      isOpen: true,
      order,
      m1_required: m1Req,
      utr_number: utr,
      payment_date: pDate,
      payment_mode: order.offline_payment?.payment_mode || "bank_transfer",
      amount_paid: claimedAmt,
      receiving_account_reference:
        order.offline_payment?.receiving_account_reference || "HDFC Bank - Current A/c 50200088991122",
      receipt_url: order.offline_payment?.receipt_url || "",
      accounts_remarks: order.offline_payment?.accounts_remarks || "",
      decision: "submitted_for_approval",
      duplicateCheck: { checked: false, isDuplicate: false, matchingOrder: null, checking: false },
    });

    if (utr) {
      performDuplicateCheck(utr, order._id || order.id, "accounts");
    }
  };

  const handleSubmitAccountsVerification = async () => {
    if (!accountsModal.order) return;
    if (accountsModal.decision === "submitted_for_approval" && !accountsModal.utr_number.trim()) {
      alert("UTR / Bank Reference number is mandatory for verification.");
      return;
    }
    if (accountsModal.decision !== "submitted_for_approval" && !accountsModal.accounts_remarks.trim()) {
      alert("Please provide remarks for returning or rejecting this payment.");
      return;
    }

    setSubmittingAccounts(true);
    try {
      const payload = {
        decision: accountsModal.decision,
        utr_number: accountsModal.utr_number.trim(),
        payment_date: accountsModal.payment_date,
        payment_mode: accountsModal.payment_mode,
        amount_paid: Number(accountsModal.amount_paid) || 0,
        receiving_account_reference: accountsModal.receiving_account_reference,
        accounts_remarks: accountsModal.accounts_remarks.trim(),
        receipt_url: accountsModal.receipt_url,
      };

      const res = await accountsVerifyEpcPayment(accountsModal.order._id || accountsModal.order.id, payload);
      if (res.status === "success") {
        setAccountsModal((prev) => ({ ...prev, isOpen: false }));
        fetchOrders();
      } else {
        alert(res.message || "Failed to update verification status");
      }
    } catch (err) {
      console.error("Accounts submit error:", err);
      alert(err.response?.data?.message || err.message || "Failed to submit verification");
    } finally {
      setSubmittingAccounts(false);
    }
  };

  const activeFiltersCount = [
    paymentModeFilter !== "all",
    paymentStatusFilter !== "all",
    paymentStageFilter !== "all",
    channelFilter !== "all",
    stateFilter !== "all",
    districtFilter.trim().length > 0,
    delaySignalFilter !== "all",
    datePreset !== "all",
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800 dark:text-slate-100">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-5 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <FaFileInvoiceDollar className="text-xl" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Payment Verification & Customer Payment Tracking Module
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  SOLARKITS ACCOUNTS DESK
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                Accounts verification workflow: Enter offline payment details (UTR, date, amount, bank), verify credit proof, submit for Admin approval, and monitor stage-wise payment delays with 🟢 🟠 🔴 signals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">

          {/* Filters Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${showFilters || activeFiltersCount > 0
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

      {/* ── KPI Metric Dashboard Cards (Section 2A) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Order Value */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-primary/50 transition">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
            <span>Total Order Value</span>
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FaRupeeSign />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(stats.total_volume)}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              Across all {stats.total_orders} Solar EPC customer orders
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Direct EPC: {stats.direct_count}</span>
            <span>Franchisee: {stats.onboarded_count}</span>
          </div>
        </div>

        {/* Payments Received (Verified Amount) */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>Payments Received (Verified)</span>
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MdCheckCircle className="text-base" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.payments_received)}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              {stats.approved_paid_count} Officially Verified & Paid Orders
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Online VAN: {formatCurrency(stats.online_volume)}</span>
            <span>Verified Offline</span>
          </div>
        </div>

        {/* Pending Payments (Outstanding Amount) */}
        {/* <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between hover:border-amber-500/50 transition">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Pending Payments (Outstanding)</span>
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <FiClock className="text-base" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {formatCurrency(stats.pending_payments)}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              {stats.offline_pending_count} Under Accounts Review • {stats.awaiting_admin_count} Awaiting Admin
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 font-bold">
            <span>Awaiting Milestone / Verification</span>
            <Link
              to="/account-panel/solar-shop/customer-payment-followup"
              className="hover:underline flex items-center gap-1 text-primary"
            >
              Follow-up Desk →
            </Link>
          </div>
        </div> */}

        {/* Payment Delays (Overdue Orders) */}
        <div
          onClick={() => {
            setActiveTab("delays");
            setPage(1);
          }}
          className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition ${stats.payment_delays > 0
            ? "bg-rose-500/10 border-rose-500/30 hover:border-rose-500"
            : "bg-surface border-border hover:border-emerald-500"
            }`}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              {stats.payment_delays > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
              Payment Delays (Overdue TAT)
            </span>
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <MdErrorOutline className="text-base" />
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.payment_delays} Orders
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-medium">
              Exceeded configured payment stage deadline
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 font-bold">
            <span>🔴 Red Delay Signals</span>
            <span>View Delays →</span>
          </div>
        </div>
      </div>

      {/* ── Quick Segment Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: "all", label: "All EPC Payments", count: stats.total_orders },
            {
              key: "offline_pending",
              label: "Verification Pending (Accounts)",
              count: stats.offline_pending_count,
              highlight: stats.offline_pending_count > 0,
              highlightColor: "amber",
            },
            {
              key: "awaiting_admin",
              label: "Awaiting Admin Approval",
              count: stats.awaiting_admin_count,
              highlight: stats.awaiting_admin_count > 0,
              highlightColor: "purple",
            },
            {
              key: "approved_paid",
              label: "Approved & Paid (Official)",
              count: stats.approved_paid_count,
            },
            {
              key: "delays",
              label: "Payment Delays (Overdue)",
              count: stats.payment_delays,
              highlight: stats.payment_delays > 0,
              highlightColor: "rose",
            },
            { key: "online", label: "Online (ICICI VAN)", count: stats.online_count },
            { key: "direct", label: "Direct EPC", count: stats.direct_count },
            { key: "onboarded", label: "Franchisee Partner", count: stats.onboarded_count },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === tab.key
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
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === tab.key
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

          <Link
            to="/account-panel/solar-shop/customer-payment-followup"
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 shadow-sm"
            title="Open Dedicated Customer Payment & Follow-up Desk (Pending Balance)"
          >
            <MdOutlinePendingActions className="text-sm" />
            <span>Customer Payment & Follow-up</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
              Balance Due
            </span>
          </Link>
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition"
          >
            <FiX /> Reset All Filters ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* ── Expandable Filter Bar (Section 4) ──────────────────────────────── */}
      {showFilters && (
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FiFilter className="text-primary" /> Filter EPC Orders & Payment Tracking
            </span>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="text-text-muted hover:text-text-primary text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            {/* Payment Mode */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Payment Mode</label>
              <select
                value={paymentModeFilter}
                onChange={(e) => {
                  setPaymentModeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Modes</option>
                <option value="online">Online (ICICI VAN)</option>
                <option value="offline">Offline Bank Transfer (NEFT/RTGS/IMPS)</option>
              </select>
            </div>

            {/* Customer Payment Status (10 standard statuses) */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Customer Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid (Full Amount Verified)</option>
                <option value="partially_paid">Partially Paid (Advance Verified)</option>
                <option value="awaiting_approval">Awaiting Admin Approval</option>
                <option value="pending">Verification Pending / Pending</option>
                <option value="failed">Payment Failed / Rejected</option>
                <option value="refund_pending">Refund Pending</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Current Payment Stage (8 stages) */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Current Payment Stage</label>
              <select
                value={paymentStageFilter}
                onChange={(e) => {
                  setPaymentStageFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Payment Stages</option>
                <option value="initial_payment">Initial Payment / Token</option>
                <option value="accounts_verification">Accounts Verification</option>
                <option value="admin_approval">Admin Approval</option>
                <option value="advance_payment">Advance Payment (M1)</option>
                <option value="production_milestone">Production Milestone</option>
                <option value="delivery_milestone">Delivery Milestone (M2)</option>
                <option value="final_settlement">Final Settlement</option>
                <option value="refund_processing">Refund Processing</option>
              </select>
            </div>

            {/* Delay Signal (Green, Orange, Red) */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Delay Signal Indicator</label>
              <select
                value={delaySignalFilter}
                onChange={(e) => {
                  setDelaySignalFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Delay Signals</option>
                <option value="green">🟢 Green: Within Configured TAT</option>
                <option value="orange">🟠 Orange: Approaching Deadline / Review</option>
                <option value="red">🔴 Red: Overdue Exceeded TAT</option>
              </select>
            </div>

            {/* Order Channel */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Order Origin Channel</label>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Channels</option>
                <option value="direct">Direct EPC (Company Store)</option>
                <option value="onboarded">Franchisee Partner Attributed</option>
              </select>
            </div>

            {/* State Filter */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">State</label>
              <input
                type="text"
                placeholder="Filter by State (e.g. Gujarat, Maharashtra)..."
                value={stateFilter === "all" ? "" : stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value || "all");
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* District Filter */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">District</label>
              <input
                type="text"
                placeholder="Filter by District (e.g. Pune, Rajkot)..."
                value={districtFilter}
                onChange={(e) => {
                  setDistrictFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Date Preset */}
            <div>
              <label className="block font-bold text-text-secondary mb-1">Date Range</label>
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setPage(1);
                }}
                className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Bar ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-lg" />
          <input
            type="text"
            placeholder="Search by Order Request ID, Official Order No, UTR Reference, EPC Contractor name, phone, or Franchisee..."
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

      {/* ── Order-wise Payment Tracking Table (Section 4) ────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-hover/70 border-b border-border text-text-secondary font-black uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Order Ref / ID</th>
                <th className="py-3 px-3">Solar EPC</th>
                <th className="py-3 px-3">Origin</th>
                <th className="py-3 px-3">Kit & Qty</th>
                <th className="py-3 px-3 text-right">Order Value</th>
                <th className="py-3 px-3 text-right">Amount Received</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3">Latest UTR / Ref</th>
                <th className="py-3 px-3">Payment Stage</th>
                <th className="py-3 px-3 text-center">Days Elapsed</th>
                <th className="py-3 px-3 text-center">TAT</th>
                <th className="py-3 px-3 text-center">Delay Signal</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold">Loading Solar EPC payment tracking records...</p>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <MdShoppingCart className="text-3xl text-text-muted/60" />
                      <p className="text-sm font-bold text-text-primary">No EPC Orders Found</p>
                      <p className="text-xs text-text-secondary">
                        Try adjusting your filters, active tab, or search query.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isOnline = Boolean(o.is_online || o.payment_mode === "online" || o.payment_method === "icici_ecollection");
                  const isDirect = o.is_direct;
                  const isPoOrder = Boolean(o.po_origin?.is_po_drawdown || o.po_origin?.parent_po_number || o.parent_po_number || o.order_type === "loose_kit_order");
                  const parentPoRef = o.po_origin?.parent_po_number || o.parent_po_number;
                  const poEpcName = o.po_origin?.epc_name || o.buyer_name;
                  const m2 = o.payment_milestones?.milestones?.find((m) => m.milestone_number === 2);
                  const m1 = o.payment_milestones?.milestones?.find((m) => m.milestone_number === 1);
                  const utr = o.latest_utr || m2?.utr_number || m1?.utr_number || o.offline_payment?.utr_number || o.payment_reference;
                  const receiptUrl = m2?.receipt_url || o.offline_payment?.receipt_url;
                  const offStatus = o.offline_payment?.verification_status || "pending";
                  const admStatus = o.offline_payment?.admin_approval_status || "pending";
                  const isOfficial = Boolean(o.is_official_order_generated || isOnline);
                  const signal = o.delay_signal || "green";

                  return (
                    <tr
                      key={o._id || o.id}
                      className="hover:bg-surface-hover/50 transition-colors"
                    >
                      {/* 1. Order Request ID / Order Number */}
                      <td className="py-3 px-3">
                        {isOfficial ? (
                          <div>
                            <div className="font-mono font-bold text-text-primary dark:text-white">
                              {o.order_number}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mt-0.5">
                              <FiCheckCircle size={9} /> Official Order
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono font-bold text-amber-700 dark:text-amber-300">
                              {o.order_request_id || `REQ-EPC-${o.order_number?.replace(/^ORD-EPC-/, "")}`}
                            </div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 mt-0.5">
                              <FiClock size={9} /> Request (Pre-Approval)
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {formatDate(o.created_at)}
                        </div>
                      </td>

                      {/* 2. Solar EPC */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-text-primary dark:text-white truncate max-w-[150px]" title={o.buyer_name}>
                          {o.buyer_name}
                        </div>
                        <div className="text-[10px] text-text-muted">{o.buyer_phone}</div>
                        <div className="text-[10px] text-text-secondary flex items-center gap-0.5 mt-0.5">
                          <MdLocationOn className="text-primary shrink-0" />
                          <span className="truncate max-w-[130px]">{o.buyer_district}, {o.buyer_state}</span>
                        </div>
                      </td>

                      {/* 3. Order Origin */}
                      <td className="py-3 px-3">
                        {isPoOrder ? (
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                              📋 PO Order
                            </span>
                            {parentPoRef && (
                              <div className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 truncate max-w-[130px]" title={`Parent PO: ${parentPoRef}`}>
                                {parentPoRef}
                              </div>
                            )}
                            <div className="text-[9px] text-text-muted truncate max-w-[130px]" title={poEpcName}>
                              EPC: {poEpcName}
                            </div>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md inline-block ${isDirect
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                }`}
                            >
                              {isDirect ? "Direct EPC" : "Franchisee"}
                            </span>
                            {!isDirect && o.franchisee_name && (
                              <div className="text-[10px] text-text-muted truncate max-w-[120px] mt-0.5" title={o.franchisee_name}>
                                {o.franchisee_name}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      {/* 4. Kit Type & Quantity */}
                      <td className="py-3 px-3">
                        <div className="max-w-[150px]">
                          {(o.items || []).slice(0, 1).map((it, idx) => (
                            <div key={idx} className="truncate text-text-primary font-medium" title={it.item_name}>
                              {it.item_name} <span className="text-primary font-bold">x{it.quantity}</span>
                            </div>
                          ))}
                          {(o.items || []).length > 1 && (
                            <span className="text-[10px] text-primary font-bold">
                              +{(o.items || []).length - 1} more kit items
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Order Value */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-text-primary dark:text-white">
                          {formatCurrency(o.grand_total)}
                        </div>
                        {o.price_lock?.is_locked && (
                          <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5" title="Price locked at PO creation rate">
                            🔒 Rate Locked
                          </div>
                        )}
                      </td>

                      {/* 6. Amount Received */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-bold ${o.amount_received > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-text-muted"}`}>
                          {formatCurrency(o.amount_received)}
                        </div>
                        {o.payment_milestones && (
                          <div className="text-[9px] text-text-muted space-y-0.5 mt-0.5">
                            {o.is_trial_order || o.order_type === "trial_order" || o.payment_milestones.remaining_percentage === 0 ? (
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                100% Full Payment (Trial)
                              </div>
                            ) : o.amount_received >= o.grand_total ? (
                              <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                100% Cleared (M1 + M2)
                              </div>
                            ) : (
                              <>
                                <div>M1 Paid: {formatCurrency(o.payment_milestones.advance_amount)} ({o.payment_milestones.advance_percentage || 30}%)</div>
                                {o.milestone_verification_status === "final_payment_pending_verification" || o.customer_payment_status === "Milestone 2 Submitted" ? (
                                  <div className="text-purple-600 dark:text-purple-400 font-bold">
                                    M2 Submitted (Verify)
                                  </div>
                                ) : (
                                  <div className="text-amber-600 dark:text-amber-400">
                                    M2 Due: {formatCurrency(o.payment_milestones.remaining_amount)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Outstanding Amount */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-bold ${o.outstanding_amount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {o.outstanding_amount > 0 ? formatCurrency(o.outstanding_amount) : "₹0.00"}
                        </div>
                        {o.outstanding_amount === 0 && o.amount_received > 0 && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 mt-0.5">
                            Fully Paid
                          </span>
                        )}
                      </td>

                      {/* 8. Payment Mode */}
                      <td className="py-3 px-3">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#264baa]/15 text-[#264baa] dark:text-blue-300 border border-[#264baa]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#264baa] animate-pulse"></span>
                            Online (ICICI VAN)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Offline Bank Transfer
                          </span>
                        )}
                      </td>

                      {/* 9. Latest UTR / Reference */}
                      <td className="py-3 px-3">
                        {utr ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-mono text-[11px] text-text-primary font-bold">
                              <span className="truncate max-w-[90px]" title={utr}>
                                {utr}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyUtr(utr)}
                                className="text-text-muted hover:text-primary transition"
                                title="Copy UTR"
                              >
                                {copiedUtr === utr ? <FaCheck className="text-emerald-500" /> : <FaRegCopy />}
                              </button>
                            </div>
                            <div className="text-[9px] text-text-muted">
                              {o.offline_payment?.payment_mode?.toUpperCase() || "NEFT / RTGS"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text-muted italic">Awaiting UTR</span>
                        )}
                      </td>

                      {/* 10. Current Payment Stage */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight bg-surface-hover border border-border text-text-primary">
                            {o.current_payment_stage_label || "Accounts Verification"}
                          </span>
                          <div className="text-[10px]">
                            <span className={`font-bold ${o.customer_payment_status === "Paid"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : o.customer_payment_status === "Milestone 2 Submitted"
                                ? "text-purple-600 dark:text-purple-400"
                                : o.customer_payment_status === "Partially Paid"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : o.customer_payment_status === "Awaiting Admin Approval"
                                    ? "text-purple-600 dark:text-purple-400"
                                    : o.customer_payment_status === "Payment Failed"
                                      ? "text-rose-600"
                                      : "text-text-muted"
                              }`}>
                              {o.customer_payment_status}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 11. Days Elapsed */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-text-primary">
                          {o.days_elapsed || 0}d
                        </span>
                      </td>

                      {/* 12. Payment TAT */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono text-text-muted">
                          {o.payment_tat_days || 2}d
                        </span>
                      </td>

                      {/* 13. Delay Signal (Green / Orange / Red) */}
                      <td className="py-3 px-3 text-center">
                        {signal === "green" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            🟢 Within TAT
                          </span>
                        ) : signal === "orange" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            🟠 In Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 animate-pulse">
                            🔴 Overdue Alert
                          </span>
                        )}
                      </td>

                      {/* 14. Action (Verify / Approve / History / Receipt) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Online ICICI Auto-Confirmed Pill */}
                          {isOnline && (
                            <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-[#264baa]/15 text-[#264baa] dark:text-blue-300 border border-[#264baa]/30 flex items-center gap-1">
                              <FaCheck size={10} /> Auto-Confirmed (ICICI)
                            </span>
                          )}

                          {/* Accounts Verification Button (Offline only) */}
                          {!isOnline && (offStatus === "pending" || offStatus === "returned") && (
                            <button
                              type="button"
                              onClick={() => handleOpenAccountsModal(o)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/30 transition flex items-center gap-1"
                              title="Accounts Payment Verification Form"
                            >
                              <FiUploadCloud size={12} />
                              <span>{offStatus === "returned" ? "Re-verify" : "Verify Payment"}</span>
                            </button>
                          )}

                          {/* Submitted to Admin pill (Offline only) */}
                          {!isOnline && offStatus === "submitted_for_approval" && (
                            <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
                              <FiClock size={11} /> In Admin Review
                            </span>
                          )}

                          {/* Officially Approved pill (Offline only) */}
                          {!isOnline && offStatus === "approved" && (
                            <span className="px-2 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <FaCheck size={10} /> Approved
                            </span>
                          )}

                          {/* View Audit History Timeline */}
                          <button
                            type="button"
                            onClick={() => setHistoryModal({ isOpen: true, order: o })}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                            title="View Complete Audit Trail & History"
                          >
                            <MdHistory size={14} />
                          </button>

                          {/* View Proof Link */}
                          {!isOnline && receiptUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(receiptUrl)}
                              className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                              title="View Payment Receipt Proof"
                            >
                              <FiFileText size={14} />
                            </button>
                          )}

                          {/* Transaction Details Side Drawer */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTxn(o);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-surface-hover hover:bg-surface border border-border text-text-secondary hover:text-primary transition"
                            title="View Full Transaction Details"
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

        {/* ── Pagination ───────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <span>
            Showing {orders.length} of {total} orders (Page {page} of {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface-hover disabled:opacity-40 transition font-bold"
            >
              Previous
            </button>
            <span className="font-mono px-2 text-text-primary font-bold">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface-hover disabled:opacity-40 transition font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Accounts Payment Verification Form Modal (Section 1B) ───────────── */}
      {accountsModal.isOpen && accountsModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                  <FiUploadCloud className="text-xl" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Accounts Payment Verification Form
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Pre-Approval Reference: <span className="font-mono font-bold text-amber-600">{accountsModal.order?.order_request_id || accountsModal.order?.order_number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountsModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-text-muted hover:text-text-primary"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Notice */}
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${accountsModal.order?.is_online || accountsModal.order?.payment_mode === "online" || accountsModal.order?.payment_method === "icici_ecollection"
                ? "bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300"
              }`}>
              <FiInfo className="shrink-0 mt-0.5" />
              <span>
                {accountsModal.order?.is_online || accountsModal.order?.payment_mode === "online" || accountsModal.order?.payment_method === "icici_ecollection" ? (
                  <><strong>Online ICICI Payment:</strong> Admin Approval is <strong>NOT required</strong> for ICICI online payments. Verifying this payment will directly activate and confirm the official order.</>
                ) : (
                  <><strong>Controlled Offline Workflow:</strong> Official Order Number will NOT be generated until Admin approval is completed. Enter and verify payment details below to submit for Admin review.</>
                )}
              </span>
            </div>

            {/* Customer Details Display */}
            <div className="p-3.5 rounded-xl bg-surface-hover border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">Customer / Solar EPC:</span>
                <span className="font-bold text-text-primary">
                  {accountsModal.order.buyer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Contact / Phone:</span>
                <span className="font-medium text-text-primary">
                  {accountsModal.order.buyer_phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total Order Value:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {formatCurrency(accountsModal.order.grand_total)}
                </span>
              </div>
              {accountsModal.m1_required > 0 && (
                <div className="flex justify-between items-center bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <span className="text-amber-800 dark:text-amber-300 font-bold">
                    Milestone 1 Advance ({accountsModal.order.payment_milestones?.advance_percentage || 30}%):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-900 dark:text-amber-200">
                      {formatCurrency(accountsModal.m1_required)}
                    </span>
                    {Number(accountsModal.amount_paid) !== Number(accountsModal.m1_required) && (
                      <button
                        type="button"
                        onClick={() =>
                          setAccountsModal((prev) => ({ ...prev, amount_paid: accountsModal.m1_required }))
                        }
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-xs"
                      >
                        Set to M1
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Form Inputs */}
            <div className="space-y-3 text-xs">
              {/* Payment Amount Claimed */}
              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Payment Amount Claimed by Customer (₹) *
                </label>
                <input
                  type="number"
                  value={accountsModal.amount_paid}
                  onChange={(e) =>
                    setAccountsModal({ ...accountsModal, amount_paid: e.target.value })
                  }
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="e.g. 50000"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Payment Mode *
                </label>
                <select
                  value={accountsModal.payment_mode}
                  onChange={(e) =>
                    setAccountsModal({ ...accountsModal, payment_mode: e.target.value })
                  }
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="upi">UPI Transfer</option>
                  <option value="cheque">Cheque Deposit</option>
                  <option value="other">Other Configured Offline Mode</option>
                </select>
              </div>

              {/* UTR / Bank Reference Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-text-primary">
                    UTR / Bank Reference Number *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      performDuplicateCheck(
                        accountsModal.utr_number,
                        accountsModal.order._id || accountsModal.order.id,
                        "accounts"
                      )
                    }
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <MdSync className={accountsModal.duplicateCheck.checking ? "animate-spin" : ""} />
                    Check Duplicate
                  </button>
                </div>
                <input
                  type="text"
                  value={accountsModal.utr_number}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setAccountsModal({ ...accountsModal, utr_number: val });
                  }}
                  onBlur={() =>
                    performDuplicateCheck(
                      accountsModal.utr_number,
                      accountsModal.order._id || accountsModal.order.id,
                      "accounts"
                    )
                  }
                  placeholder="e.g. HDFCR520261015001"
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs font-mono font-bold text-text-primary uppercase focus:ring-2 focus:ring-primary focus:outline-none"
                />

                {/* Duplicate UTR Alert Banner */}
                {accountsModal.duplicateCheck.checked && (
                  <div className="mt-1.5">
                    {accountsModal.duplicateCheck.isDuplicate ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] flex items-start gap-1.5">
                        <FiAlertTriangle className="shrink-0 mt-0.5 text-base" />
                        <div>
                          <strong>Duplicate UTR Warning:</strong> This UTR was already verified on{" "}
                          <strong>Order #{accountsModal.duplicateCheck.matchingOrder?.order_number}</strong> (Claimed: {formatCurrency(accountsModal.duplicateCheck.matchingOrder?.amount)}). Verify bank credit before proceeding!
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                        <FiCheckCircle className="shrink-0" />
                        <span>Clean: No duplicate transactions found for this UTR.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Date & Receiving Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-text-primary mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={accountsModal.payment_date}
                    onChange={(e) =>
                      setAccountsModal({ ...accountsModal, payment_date: e.target.value })
                    }
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">
                    Receiving Bank / A/c *
                  </label>
                  <input
                    type="text"
                    value={accountsModal.receiving_account_reference}
                    onChange={(e) =>
                      setAccountsModal({
                        ...accountsModal,
                        receiving_account_reference: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Proof URL & Preview */}
              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Payment Proof (Receipt / Transaction Screenshot)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="URL to payment receipt or transaction proof..."
                    value={accountsModal.receipt_url}
                    onChange={(e) =>
                      setAccountsModal({ ...accountsModal, receipt_url: e.target.value })
                    }
                    className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  {accountsModal.receipt_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReceipt(accountsModal.receipt_url)}
                      className="shrink-0"
                    >
                      Preview
                    </Button>
                  )}
                </div>
              </div>

              {/* Accounts Remarks */}
              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Accounts Remarks / Verification Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified in ICICI Corporate net banking; funds credited to main collection account."
                  value={accountsModal.accounts_remarks}
                  onChange={(e) =>
                    setAccountsModal({ ...accountsModal, accounts_remarks: e.target.value })
                  }
                  className="w-full p-2.5 bg-surface-hover border border-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Action Decision Selector */}
              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Verification Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountsModal({ ...accountsModal, decision: "submitted_for_approval" })}
                    className={`py-2 px-1 text-center rounded-xl font-bold transition text-[11px] ${accountsModal.decision === "submitted_for_approval"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                      }`}
                  >
                    {accountsModal.order?.is_online || accountsModal.order?.payment_mode === "online" || accountsModal.order?.payment_method === "icici_ecollection" ? "Verify & Activate (Direct)" : "Submit for Admin Approval"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountsModal({ ...accountsModal, decision: "returned" })}
                    className={`py-2 px-1 text-center rounded-xl font-bold transition text-[11px] ${accountsModal.decision === "returned"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                      }`}
                  >
                    Return for Correction
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountsModal({ ...accountsModal, decision: "rejected" })}
                    className={`py-2 px-1 text-center rounded-xl font-bold transition text-[11px] ${accountsModal.decision === "rejected"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-surface-hover text-text-secondary hover:text-text-primary border border-border"
                      }`}
                  >
                    Reject Payment
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAccountsModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={submittingAccounts}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={
                  accountsModal.decision === "rejected"
                    ? "danger"
                    : accountsModal.decision === "returned"
                      ? "outline"
                      : "primary"
                }
                size="sm"
                onClick={handleSubmitAccountsVerification}
                loading={submittingAccounts}
                className="font-bold px-4"
              >
                {accountsModal.decision === "submitted_for_approval"
                  ? "Submit for Admin Approval"
                  : accountsModal.decision === "returned"
                    ? "Return to Customer"
                    : "Reject Payment Proof"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit History Modal (Section 1C & 5) ─────────────────────────────── */}
      {historyModal.isOpen && historyModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-border space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <MdHistory className="text-xl" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Verification & Approval Audit Trail
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Order Ref: <span className="font-mono font-bold text-primary">{historyModal.order.order_number || historyModal.order.order_request_id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModal({ isOpen: false, order: null })}
                className="text-text-muted hover:text-text-primary"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {(!historyModal.order.audit_trail || historyModal.order.audit_trail.length === 0) ? (
                <div className="py-8 text-center text-text-muted">
                  <p className="text-xs">No audit events recorded yet for this order.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-border pl-4 ml-2 space-y-4">
                  {historyModal.order.audit_trail.map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-surface" />
                      <div className="bg-surface-hover p-3 rounded-xl border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary">
                            {item.action?.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {formatDate(item.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-surface border border-border">
                            {item.role || "Accounts"}
                          </span>
                          <span>{item.performer_name || "System"}</span>
                        </div>
                        {item.notes && (
                          <p className="text-text-muted italic pt-1 border-t border-border/50 text-[11px]">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
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
          <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-sm font-black text-text-primary dark:text-white flex items-center gap-2">
                <FiFileText className="text-primary" /> Payment Receipt Proof
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-text-secondary hover:text-primary transition"
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
                  className="w-full h-[65vh] rounded-lg border border-border"
                />
              ) : (
                <img
                  src={selectedReceipt}
                  alt="Receipt Preview"
                  className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
