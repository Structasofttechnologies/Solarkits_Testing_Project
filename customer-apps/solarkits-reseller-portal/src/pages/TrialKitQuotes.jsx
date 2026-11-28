import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiFileText,
  FiPlus,
  FiSearch,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiDownload,
  FiShare2,
  FiPhone,
  FiMail,
  FiEye,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiLayers,
  FiUser,
  FiCheck,
  FiX,
  FiChevronRight,
  FiSend,
  FiCopy,
  FiShield,
  FiBox,
  FiPackage,
} from "react-icons/fi";
import api from "../services/api";

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", border: "border-slate-300" },
  generated: { label: "Generated", bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  sent: { label: "Sent", bg: "bg-indigo-50 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300" },
  viewed: { label: "Viewed", bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
  follow_up_pending: { label: "Follow-up Pending", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-300" },
  interested: { label: "Interested", bg: "bg-cyan-50 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-300" },
  negotiation: { label: "Negotiation", bg: "bg-orange-50 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300" },
  order_expected: { label: "Order Expected", bg: "bg-teal-50 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300" },
  converted: { label: "Converted", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300" },
  expired: { label: "Expired", bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-300" },
  lost: { label: "Lost", bg: "bg-red-50 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", border: "border-red-300" },
  revised: { label: "Revised", bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400", border: "border-gray-300" },
};

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

export default function TrialKitQuotes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("quotes"); // "quotes" | "followups"
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("-created_at");

  // Follow-up quick tab in followups mode
  const [followupFilter, setFollowupFilter] = useState("all");
  const [followups, setFollowups] = useState([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);

  // Quick Share Modal
  const [shareModalQuote, setShareModalQuote] = useState(null);
  const [shareMethod, setShareMethod] = useState("email");
  const [shareRecipient, setShareRecipient] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState("");
  const [shareError, setShareError] = useState("");

  // Quick Follow-up Modal
  const [fuModalQuote, setFuModalQuote] = useState(null);
  const [fuForm, setFuForm] = useState({
    next_follow_up_date: "",
    follow_up_mode: "call",
    remarks: "",
    expected_quantity: "",
    expected_order_date: "",
    expected_order_value_inr: "",
    probability_pct: 50,
    status: "pending",
  });
  const [savingFu, setSavingFu] = useState(false);
  const [fuError, setFuError] = useState("");

  // Quick Convert Modal
  const [convertModalQuote, setConvertModalQuote] = useState(null);
  const [orderType, setOrderType] = useState("epc_order");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  // Fetch Quotes (strictly filtered with is_trial_kit = true)
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortOrder,
        is_trial_kit: true,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/india/v1/reseller/quotes", { params });
      if (res.data?.status === "success") {
        const rawQuotes = res.data.data?.quotes || (Array.isArray(res.data.data) ? res.data.data : []);
        setQuotes(rawQuotes);
        setPagination((prev) => ({
          ...prev,
          page: res.data.data?.page || 1,
          total: res.data.data?.total || 0,
          totalPages: res.data.data?.totalPages || 1,
        }));
      }
    } catch (err) {
      console.error("Failed to load trial kit quotes:", err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, sortOrder]);

  // Fetch Dashboard Stats for Trial Quotes
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/quotes/dashboard", { params: { is_trial_kit: true } });
      if (res.data?.status === "success") {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load trial kit quote dashboard:", err);
    }
  }, []);

  // Fetch Follow-ups for Trial Quotes
  const fetchFollowups = useCallback(async () => {
    setFollowupsLoading(true);
    try {
      const params = { is_trial_kit: true };
      if (followupFilter !== "all") {
        params.date_filter = followupFilter;
      }
      const res = await api.get("/india/v1/reseller/quotes/follow-ups/list", { params });
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.followups)
            ? raw.followups
            : Array.isArray(res.data?.followups)
              ? res.data.followups
              : [];
        setFollowups(list);
      } else {
        setFollowups([]);
      }
    } catch (err) {
      console.error("Failed to load follow-ups:", err);
      setFollowups([]);
    } finally {
      setFollowupsLoading(false);
    }
  }, [followupFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === "quotes") {
      fetchQuotes();
    } else if (activeTab === "followups") {
      fetchFollowups();
    }
  }, [activeTab, fetchQuotes, fetchFollowups]);

  // Download PDF
  const handleDownloadPdf = async (quoteId, quoteNumber) => {
    try {
      const res = await api.get(`/india/v1/reseller/quotes/${quoteId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TrialKit_Quote_${quoteNumber || quoteId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download quote PDF.");
    }
  };

  // Open Quick Share Modal
  const openShareModal = (quote) => {
    setShareModalQuote(quote);
    setShareMethod("email");
    setShareRecipient(quote.epc_snapshot?.email || "");
    setShareSuccess("");
    setShareError("");
  };

  // Submit Quick Share
  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareRecipient.trim() && shareMethod !== "link_copy") {
      setShareError("Please enter recipient email or phone number.");
      return;
    }
    setSharing(true);
    setShareError("");
    setShareSuccess("");
    try {
      const payload = {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      };
      const res = await api.post(`/india/v1/reseller/quotes/${shareModalQuote._id}/share`, payload);
      if (res.data?.status === "success") {
        setShareSuccess("Quotation link shared successfully!");
        setTimeout(() => {
          setShareModalQuote(null);
          fetchQuotes();
        }, 1500);
      } else {
        setShareError(res.data?.message || "Failed to share quotation.");
      }
    } catch (err) {
      setShareError(err.response?.data?.message || "Failed to share quotation.");
    } finally {
      setSharing(false);
    }
  };

  // Open Quick Follow-up Modal
  const openFollowupModal = (quote) => {
    setFuModalQuote(quote);
    setFuForm({
      next_follow_up_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
      follow_up_mode: "call",
      remarks: "",
      expected_quantity: quote.quantity || 10,
      expected_order_date: "",
      expected_order_value_inr: Math.round((quote.total_amount_paise || 0) / 100),
      probability_pct: 60,
      status: "pending",
    });
    setFuError("");
  };

  // Submit Quick Follow-up
  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    if (!fuForm.next_follow_up_date) {
      setFuError("Please select next follow-up date.");
      return;
    }
    setSavingFu(true);
    setFuError("");
    try {
      const payload = {
        next_follow_up_date: fuForm.next_follow_up_date,
        follow_up_mode: fuForm.follow_up_mode,
        remarks: fuForm.remarks,
        expected_quantity: fuForm.expected_quantity ? Number(fuForm.expected_quantity) : undefined,
        expected_order_date: fuForm.expected_order_date || undefined,
        expected_order_value_paise: fuForm.expected_order_value_inr
          ? Math.round(Number(fuForm.expected_order_value_inr) * 100)
          : undefined,
        probability_pct: Number(fuForm.probability_pct),
      };
      const res = await api.post(`/india/v1/reseller/quotes/${fuModalQuote._id}/follow-ups`, payload);
      if (res.data?.status === "success") {
        setFuModalQuote(null);
        fetchQuotes();
      } else {
        setFuError(res.data?.message || "Failed to log follow-up.");
      }
    } catch (err) {
      setFuError(err.response?.data?.message || "Failed to log follow-up.");
    } finally {
      setSavingFu(false);
    }
  };

  // Open Quick Convert Modal
  const openConvertModal = (quote) => {
    setConvertModalQuote(quote);
    setOrderType("epc_order");
    setConvertError("");
  };

  // Submit Quick Convert
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    setConvertError("");
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${convertModalQuote._id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === "success") {
        alert("Quote converted to order successfully!");
        setConvertModalQuote(null);
        fetchQuotes();
      } else {
        setConvertError(res.data?.message || "Failed to convert quote.");
      }
    } catch (err) {
      setConvertError(err.response?.data?.message || "Failed to convert quote.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Trial Kit Quotes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Admin Pack Enforced
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create, manage and share formal quotations for Admin-configured trial evaluation packs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/trial-kit-quote-followups"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            <FiCalendar size={14} className="text-purple-600 dark:text-purple-400" />
            <span>Follow-up Manager</span>
          </Link>

          <Link
            to="/trial-kit-quotes/create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all duration-200 hover:scale-[1.02]"
          >
            <FiPlus size={15} />
            <span>Create Trial Quote</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview */}
      {dashboardData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Proposals</span>
              <FiBox className="text-purple-500" size={16} />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {dashboardData.kpis?.total_quotes ?? 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Drafts: {dashboardData.kpis?.draft_quotes ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Trial Pipeline</span>
              <FiTrendingUp className="text-blue-500" size={16} />
            </div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
              {formatINR(dashboardData.financials?.total_pipeline_paise)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Active pending deals
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Converted Orders</span>
              <FiCheckCircle className="text-emerald-500" size={16} />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {dashboardData.kpis?.converted_quotes ?? 0}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">
              Value: {formatINR(dashboardData.financials?.total_converted_paise)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Due Follow-ups</span>
              <FiClock className="text-amber-500" size={16} />
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              {dashboardData.followup_stats?.due_today ?? 0}
            </div>
            <div className="text-[10px] text-rose-500 mt-0.5">
              Overdue: {dashboardData.followup_stats?.overdue ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("quotes")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "quotes"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <FiFileText size={15} />
          <span>All Trial Quotes ({pagination.total})</span>
        </button>

        <button
          onClick={() => setActiveTab("followups")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === "followups"
              ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
        >
          <FiCalendar size={15} />
          <span>Quote Follow-ups ({dashboardData?.followup_stats?.due_today ?? 0})</span>
        </button>
      </div>

      {/* TAB 1: QUOTES LIST */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search quote #, EPC client, or GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="follow_up_pending">Follow-up Pending</option>
                <option value="interested">Interested</option>
                <option value="order_expected">Order Expected</option>
                <option value="converted">Converted</option>
                <option value="expired">Expired</option>
                <option value="lost">Lost</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-total_amount_paise">Highest Amount</option>
                <option value="total_amount_paise">Lowest Amount</option>
              </select>

              <button
                onClick={fetchQuotes}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                title="Refresh"
              >
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Quotes Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs font-semibold">Loading trial kit quotes...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <FiBox size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  No Trial Kit quotes found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                  You haven't created any trial kit quotations yet. Generate formal trial proposals for your EPC buyers with Admin-configured kit packs.
                </p>
                <Link
                  to="/trial-kit-quotes/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow"
                >
                  <FiPlus size={14} />
                  <span>Create Trial Quote</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Quote Number</th>
                      <th className="py-3 px-4">EPC Client</th>
                      <th className="py-3 px-4">Combo Kit & Quantity</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Validity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    {quotes.map((quote) => (
                      <tr
                        key={quote._id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors"
                      >
                        {/* Quote Number & Date */}
                        <td className="py-3.5 px-4">
                          <Link
                            to={`/trial-kit-quotes/${quote._id}`}
                            className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
                          >
                            <span>{quote.quote_number || "DRAFT"}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              Trial
                            </span>
                          </Link>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(quote.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* EPC Client */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {quote.epc_snapshot?.company_name || "EPC Client"}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>GSTIN: {quote.epc_snapshot?.gstin || "—"}</span>
                          </div>
                        </td>

                        {/* Combo Kit & Trial Quantity */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[240px]">
                            {quote.combo_kit_snapshot?.name || "Solar ComboKit"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <FiBox size={10} />
                              {quote.trial_kit_quantity || quote.quantity || 10} Kits (Admin Configured)
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-black text-slate-900 dark:text-white">
                            {formatINR(quote.total_amount_paise)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Unit: {formatINR(quote.price_per_kit_paise)}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <StatusBadge status={quote.status} />
                        </td>

                        {/* Validity */}
                        <td className="py-3.5 px-4 text-slate-500">
                          {quote.valid_until ? (
                            <span className={new Date() > new Date(quote.valid_until) ? "text-rose-500 font-semibold" : ""}>
                              {new Date(quote.valid_until).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/trial-kit-quotes/${quote._id}`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-purple-600 hover:bg-slate-100 transition"
                              title="View Details"
                            >
                              <FiEye size={13} />
                            </Link>

                            <button
                              onClick={() => handleDownloadPdf(quote._id, quote.quote_number)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 transition"
                              title="Download PDF"
                            >
                              <FiDownload size={13} />
                            </button>

                            <button
                              onClick={() => openShareModal(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 transition"
                              title="Quick Share"
                            >
                              <FiShare2 size={13} />
                            </button>

                            <button
                              onClick={() => openFollowupModal(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-slate-100 transition"
                              title="Schedule Follow-up"
                            >
                              <FiCalendar size={13} />
                            </button>

                            {quote.status !== "converted" && quote.status !== "draft" && (
                              <button
                                onClick={() => openConvertModal(quote)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition"
                                title="Convert to Order"
                              >
                                Convert
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FOLLOW-UPS QUICK TAB */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto">
              {[
                { id: "all", label: "All Follow-ups" },
                { id: "today", label: "Due Today" },
                { id: "tomorrow", label: "Due Tomorrow" },
                { id: "this_week", label: "This Week" },
                { id: "overdue", label: "Overdue" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFollowupFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition ${followupFilter === tab.id
                      ? "bg-purple-600 text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              to="/trial-kit-quote-followups"
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Full Follow-up Workspace</span>
              <FiChevronRight size={13} />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs">
            {followupsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading follow-ups...</div>
            ) : followups.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No scheduled follow-ups found for this filter.</div>
            ) : (
              <div className="space-y-3">
                {followups.map((fu) => (
                  <div
                    key={fu._id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {fu.quote_number || "Trial Quote"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200">
                          {fu.follow_up_mode}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Client: <strong className="text-slate-700 dark:text-slate-300">{fu.epc_name || fu.epc_id?.company_name || "EPC Partner"}</strong>
                      </div>
                      {fu.remarks && (
                        <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                          "{fu.remarks}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          {new Date(fu.next_follow_up_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Status: {fu.status}
                        </div>
                      </div>

                      <Link
                        to={`/trial-kit-quotes/${fu.quote_id?._id || fu.quote_id}`}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 text-xs font-bold transition"
                      >
                        View Deal
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK SHARE MODAL */}
      <AnimatePresence>
        {shareModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Share Trial Kit Quotation
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {shareModalQuote.quote_number} • {shareModalQuote.epc_snapshot?.company_name}
                  </p>
                </div>
                <button
                  onClick={() => setShareModalQuote(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <FiX size={16} />
                </button>
              </div>

              {shareSuccess && (
                <div className="p-3 my-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <FiCheckCircle size={15} />
                  <span>{shareSuccess}</span>
                </div>
              )}
              {shareError && (
                <div className="p-3 my-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <FiAlertCircle size={15} />
                  <span>{shareError}</span>
                </div>
              )}

              <form onSubmit={handleShareSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Share Channel
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "email", label: "Email", icon: FiMail },
                      { id: "whatsapp", label: "WhatsApp", icon: FiPhone },
                      { id: "link_copy", label: "Copy Link", icon: FiCopy },
                    ].map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setShareMethod(m.id)}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${shareMethod === m.id
                              ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                        >
                          <Icon size={16} />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {shareMethod !== "link_copy" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Recipient {shareMethod === "email" ? "Email Address" : "WhatsApp Number"}
                    </label>
                    <input
                      type={shareMethod === "email" ? "email" : "text"}
                      placeholder={shareMethod === "email" ? "client@example.com" : "+91 98765 43210"}
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShareModalQuote(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sharing}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow transition flex items-center gap-2"
                  >
                    {sharing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <FiSend size={13} />
                    <span>Send Proposal</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK FOLLOW-UP MODAL */}
      <AnimatePresence>
        {fuModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Schedule Trial Quote Follow-up
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {fuModalQuote.quote_number} • {fuModalQuote.epc_snapshot?.company_name}
                  </p>
                </div>
                <button
                  onClick={() => setFuModalQuote(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <FiX size={16} />
                </button>
              </div>

              {fuError && (
                <div className="p-3 my-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                  {fuError}
                </div>
              )}

              <form onSubmit={handleFollowupSubmit} className="space-y-3.5 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Next Follow-up Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={fuForm.next_follow_up_date}
                      onChange={(e) => setFuForm({ ...fuForm, next_follow_up_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Follow-up Mode
                    </label>
                    <select
                      value={fuForm.follow_up_mode}
                      onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp Message</option>
                      <option value="meeting">In-Person Meeting</option>
                      <option value="site_visit">Site Visit</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Remarks / Discussion Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="E.g., Client reviewed trial pack spec, discussing delivery timeline..."
                    value={fuForm.remarks}
                    onChange={(e) => setFuForm({ ...fuForm, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setFuModalQuote(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFu}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow transition flex items-center gap-2"
                  >
                    {savingFu && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>Save Follow-up</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK CONVERT MODAL */}
      <AnimatePresence>
        {convertModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Convert Trial Quote to Order
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {convertModalQuote.quote_number} • {convertModalQuote.epc_snapshot?.company_name}
                  </p>
                </div>
                <button
                  onClick={() => setConvertModalQuote(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <FiX size={16} />
                </button>
              </div>

              {convertError && (
                <div className="p-3 my-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                  {convertError}
                </div>
              )}

              <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kit:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{convertModalQuote.combo_kit_snapshot?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admin Trial Pack Quantity:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{convertModalQuote.trial_kit_quantity || convertModalQuote.quantity} Units</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500 font-bold">Total Amount:</span>
                  <span className="font-black text-emerald-600 text-sm">{formatINR(convertModalQuote.total_amount_paise)}</span>
                </div>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Order System Routing
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType("epc_order")}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition ${orderType === "epc_order"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                    >
                      <div className="font-bold">EPC Trial Order</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">Direct EPC dispatch</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType("fpo_order")}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition ${orderType === "fpo_order"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                    >
                      <div className="font-bold">Franchisee PO</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">Warehouse buffer</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertModalQuote(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={converting}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2"
                  >
                    {converting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>Confirm Conversion</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
