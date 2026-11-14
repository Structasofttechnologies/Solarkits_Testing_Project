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

export default function EpcQuotes() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("quotes"); // "quotes" | "followups" | "dashboard"
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("-created_at");

  // Follow-up quick tab in followups mode
  const [followupFilter, setFollowupFilter] = useState("all"); // all | today | tomorrow | this_week | overdue
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

  // Fetch Quotes
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort: sortOrder,
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
      console.error("Failed to load quotes:", err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, sortOrder]);

  // Fetch Dashboard Stats
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/quotes/dashboard");
      if (res.data?.status === "success") {
        setDashboardData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load quote dashboard:", err);
    }
  }, []);

  // Fetch Follow-ups
  const fetchFollowups = useCallback(async () => {
    setFollowupsLoading(true);
    try {
      const params = {};
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
      a.download = `${quoteNumber || "Quotation"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF. Please ensure quote is generated.");
    }
  };

  // Open Share Modal
  const openShareModal = (quote) => {
    setShareModalQuote(quote);
    setShareMethod("email");
    setShareRecipient(quote.epc_snapshot?.email || "");
    setShareSuccess("");
    setShareError("");
  };

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!shareRecipient.trim()) {
      setShareError("Please provide a recipient email or mobile number.");
      return;
    }
    setSharing(true);
    setShareError("");
    setShareSuccess("");
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${shareModalQuote._id}/share`, {
        method: shareMethod,
        recipient: shareRecipient.trim(),
      });
      if (res.data?.status === "success") {
        setShareSuccess(`Quote successfully sent via ${shareMethod.toUpperCase()}!`);
        setTimeout(() => setShareModalQuote(null), 1800);
      }
    } catch (err) {
      setShareError(err.response?.data?.message || "Failed to share quotation.");
    } finally {
      setSharing(false);
    }
  };

  // Open Follow-up Modal
  const openFollowupModal = (quote) => {
    setFuModalQuote(quote);
    setFuForm({
      next_follow_up_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      follow_up_mode: "call",
      remarks: "",
      expected_quantity: quote.quantity || 1,
      expected_order_date: quote.valid_until ? new Date(quote.valid_until).toISOString().split("T")[0] : "",
      expected_order_value_inr: quote.total_amount_paise ? Math.round(quote.total_amount_paise / 100) : "",
      probability_pct: 60,
      status: "pending",
    });
    setFuError("");
  };

  const handleFollowupSubmit = async (e) => {
    e.preventDefault();
    setSavingFu(true);
    setFuError("");
    try {
      const payload = {
        ...fuForm,
        expected_order_value_paise: fuForm.expected_order_value_inr ? Number(fuForm.expected_order_value_inr) * 100 : undefined,
      };
      delete payload.expected_order_value_inr;

      const res = await api.post(`/india/v1/reseller/quotes/${fuModalQuote._id}/follow-ups`, payload);
      if (res.data?.status === "success") {
        setFuModalQuote(null);
        fetchQuotes();
        fetchDashboard();
        if (activeTab === "followups") fetchFollowups();
      }
    } catch (err) {
      setFuError(err.response?.data?.message || "Failed to record follow-up.");
    } finally {
      setSavingFu(false);
    }
  };

  // Open Convert Modal
  const openConvertModal = (quote) => {
    setConvertModalQuote(quote);
    setOrderType("epc_order");
    setConvertError("");
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setConverting(true);
    setConvertError("");
    try {
      const res = await api.post(`/india/v1/reseller/quotes/${convertModalQuote._id}/convert-order`, {
        order_type: orderType,
      });
      if (res.data?.status === "success") {
        setConvertModalQuote(null);
        alert(`Quote successfully converted to order #${res.data.data.order_number}!`);
        fetchQuotes();
        fetchDashboard();
      }
    } catch (err) {
      setConvertError(err.response?.data?.message || "Failed to convert quote to order.");
    } finally {
      setConverting(false);
    }
  };

  const summary = dashboardData?.summary || dashboardData || {};
  const stats = {
    total_quotes: summary.total_quotes ?? summary.total ?? 0,
    converted_quotes: summary.converted_quotes ?? summary.converted ?? 0,
    total_pipeline_value_paise: summary.total_pipeline_value_paise ?? summary.pipeline_value_paise ?? 0,
    total_converted_value_paise: summary.total_converted_value_paise ?? summary.total_converted_paise ?? 0,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <FiFileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                EPC Quotations & Pipeline
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate official EPC quotes, manage follow-ups, and track deal closures
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchDashboard();
              if (activeTab === "quotes") fetchQuotes();
              if (activeTab === "followups") fetchFollowups();
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition shadow-sm"
            title="Refresh"
          >
            <FiRefreshCw size={16} />
          </button>

          <Link
            to="/epc-quotes/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition active:scale-[0.98]"
          >
            <FiPlus size={18} />
            <span>Create New Quote</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Quotes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FiFileText size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {stats.total_quotes || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">All created & generated</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FiTrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {formatINR(stats.total_pipeline_value_paise || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Quotes pending conversion</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Converted Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FiCheckCircle size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatINR(stats.total_converted_value_paise || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-400">{stats.converted_quotes || 0} deals converted to orders</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Follow-ups Today</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FiClock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {dashboardData?.followups_today ?? dashboardData?.follow_ups_today ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">Scheduled calls & meetings</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab("quotes")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "quotes"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FiFileText size={16} />
          <span>All Quotes</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("followups")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "followups"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FiCalendar size={16} />
          <span>Follow-up Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === "dashboard"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FiTrendingUp size={16} />
          <span>Pipeline Analytics</span>
        </button>
      </div>

      {/* ── TAB 1: ALL QUOTES ─────────────────────────────────────────────── */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by quote number, EPC company name, contact person..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-total_amount_paise">Highest Amount</option>
                <option value="valid_until">Expiring Soonest</option>
              </select>
            </div>
          </div>

          {/* Quotes Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-slate-500">Loading quotations...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center mx-auto mb-3">
                  <FiFileText size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Quotations Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {search || statusFilter
                    ? "No quotations match your search filter criteria. Try clearing filters."
                    : "Create your first EPC quotation to start pitching ComboKits to your buyers."}
                </p>
                <div className="mt-4">
                  <Link
                    to="/epc-quotes/create"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition"
                  >
                    <FiPlus size={15} />
                    <span>Create EPC Quotation</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Quote Number</th>
                      <th className="py-3.5 px-4">EPC Buyer</th>
                      <th className="py-3.5 px-4">ComboKit & KW</th>
                      <th className="py-3.5 px-4">Qty</th>
                      <th className="py-3.5 px-4 text-right">Total Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Valid Until</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {quotes.map((q) => {
                      const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status !== "converted";
                      return (
                        <tr
                          key={q._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition group"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <Link
                              to={`/epc-quotes/${q._id}`}
                              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
                            >
                              <span>{q.quote_number}</span>
                              {q.revision_number > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  R{q.revision_number}
                                </span>
                              )}
                            </Link>
                            <div className="text-[11px] font-sans font-normal text-slate-400">
                              {new Date(q.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {q.epc_snapshot?.company_name || "EPC Client"}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>{q.epc_snapshot?.contact_person || q.epc_snapshot?.gstin}</span>
                              {q.epc_snapshot?.district && <span>• {q.epc_snapshot.district}</span>}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px]" title={q.combo_kit_snapshot?.name}>
                              {q.combo_kit_snapshot?.name || "ComboKit"}
                            </div>
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                              {q.combo_kit_snapshot?.capacity || q.kit_capacity_kw ? `${q.combo_kit_snapshot?.capacity || q.kit_capacity_kw} kW` : ""}
                              {q.total_kw ? ` • Total ${q.total_kw} kW` : ""}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                            {q.quantity}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="font-black text-slate-900 dark:text-white">
                              {formatINR(q.total_amount_paise)}
                            </div>
                            <div className="text-[10px] text-slate-400">Inc. GST</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge status={q.status} />
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {q.valid_until ? (
                              <div>
                                <span className={`text-xs font-semibold ${isExpired ? "text-red-500 font-bold" : "text-slate-600 dark:text-slate-300"}`}>
                                  {new Date(q.valid_until).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                {isExpired && (
                                  <div className="text-[10px] text-red-500 font-bold">Expired</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Details */}
                              <Link
                                to={`/epc-quotes/${q._id}`}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                title="View Details"
                              >
                                <FiEye size={15} />
                              </Link>

                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownloadPdf(q._id, q.quote_number)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                                title="Download PDF"
                              >
                                <FiDownload size={15} />
                              </button>

                              {/* Share */}
                              <button
                                onClick={() => openShareModal(q)}
                                className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                                title="Share Quote"
                              >
                                <FiShare2 size={15} />
                              </button>

                              {/* Follow-up */}
                              <button
                                onClick={() => openFollowupModal(q)}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
                                title="Schedule Follow-up"
                              >
                                <FiCalendar size={15} />
                              </button>

                              {/* Convert to Order */}
                              {q.status !== "converted" && !q.converted_order_id && (
                                <button
                                  onClick={() => openConvertModal(q)}
                                  className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                                  title="Convert to Order"
                                >
                                  <FiCheckCircle size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: FOLLOW-UPS PIPELINE ────────────────────────────────────── */}
      {activeTab === "followups" && (
        <div className="space-y-4">
          {/* Quick Date Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  followupFilter === tab.id
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Follow-up Cards */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            {followupsLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-sm text-slate-500">Loading follow-ups...</p>
              </div>
            ) : (!Array.isArray(followups) || followups.length === 0) ? (
              <div className="py-16 text-center">
                <FiCalendar size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Follow-ups Found</h3>
                <p className="text-xs text-slate-400 mt-1">Schedule follow-ups on active quotations to monitor EPC closures.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Array.isArray(followups) ? followups : []).map((fu) => {
                  const isOverdue = fu.next_follow_up_date && new Date(fu.next_follow_up_date) < new Date();
                  return (
                    <div
                      key={fu._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between hover:shadow-md transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                            {fu.quote_id?.quote_number || "Quotation"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOverdue ? "bg-red-50 text-red-600 border border-red-200" : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {isOverdue ? "Overdue" : fu.status}
                          </span>
                        </div>

                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {fu.epc_id?.company_name || fu.quote_id?.epc_snapshot?.company_name || "EPC Client"}
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                            Mode: {fu.follow_up_mode}
                          </span>
                          <span>•</span>
                          <span>
                            Next: {new Date(fu.next_follow_up_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>

                        {fu.remarks && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 line-clamp-3">
                            "{fu.remarks}"
                          </p>
                        )}

                        {fu.probability_pct != null && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span>Win Probability</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{fu.probability_pct}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  fu.probability_pct >= 70
                                    ? "bg-emerald-500"
                                    : fu.probability_pct >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-400"
                                }`}
                                style={{ width: `${fu.probability_pct}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <Link
                          to={`/epc-quotes/${fu.quote_id?._id || fu.quote_id}`}
                          className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                        >
                          <span>View Quote</span>
                          <FiChevronRight size={14} />
                        </Link>

                        <button
                          onClick={() => openFollowupModal(fu.quote_id || { _id: fu.quote_id })}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition"
                        >
                          Log Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: PIPELINE ANALYTICS ────────────────────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pipeline by Status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <FiLayers className="text-amber-500" />
                <span>Quotes by Stage</span>
              </h3>
              <div className="space-y-3">
                {Object.keys(STATUS_CONFIG).map((st) => {
                  const count = dashboardData?.by_status?.[st] || 0;
                  const total = stats.total_quotes || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">{STATUS_CONFIG[st].label}</span>
                        <span className="text-slate-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <FiDollarSign className="text-emerald-500" />
                  <span>Commercial Performance</span>
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Total Quoted Value
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {formatINR(stats.total_pipeline_value_paise)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                      Converted Orders Value
                    </span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatINR(stats.total_converted_value_paise)}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
                    <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">
                      Conversion Rate
                    </span>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {stats.total_quotes > 0
                        ? `${Math.round(((stats.converted_quotes || 0) / stats.total_quotes) * 100)}%`
                        : "0%"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                <Link
                  to="/epc-quotes/create"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow transition"
                >
                  <FiPlus size={16} />
                  <span>Generate New Quote Now</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QUICK SHARE ────────────────────────────────────────────── */}
      <AnimatePresence>
        {shareModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Share Quotation</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{shareModalQuote.quote_number}</p>
                </div>
                <button
                  onClick={() => setShareModalQuote(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <FiX size={18} />
                </button>
              </div>

              {shareSuccess && (
                <div className="my-4 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                  <FiCheck size={16} /> {shareSuccess}
                </div>
              )}
              {shareError && (
                <div className="my-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <FiAlertCircle size={16} /> {shareError}
                </div>
              )}

              <form onSubmit={handleShareSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Share Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShareMethod("email");
                        setShareRecipient(shareModalQuote.epc_snapshot?.email || "");
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        shareMethod === "email"
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                      }`}
                    >
                      <FiMail size={16} /> Email PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShareMethod("whatsapp");
                        setShareRecipient(shareModalQuote.epc_snapshot?.mobile || "");
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        shareMethod === "whatsapp"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                      }`}
                    >
                      <FiSend size={16} /> WhatsApp
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    {shareMethod === "email" ? "Recipient Email Address" : "WhatsApp Number (+91...)"}
                  </label>
                  <input
                    type={shareMethod === "email" ? "email" : "text"}
                    value={shareRecipient}
                    onChange={(e) => setShareRecipient(e.target.value)}
                    required
                    placeholder={shareMethod === "email" ? "epc@company.com" : "7777939842"}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

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
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition flex items-center gap-2"
                  >
                    {sharing && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>Send Quote</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SCHEDULE FOLLOW-UP ────────────────────────────────────── */}
      <AnimatePresence>
        {fuModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule EPC Follow-up</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{fuModalQuote.quote_number}</p>
                </div>
                <button
                  onClick={() => setFuModalQuote(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <FiX size={18} />
                </button>
              </div>

              {fuError && (
                <div className="my-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <FiAlertCircle size={16} /> {fuError}
                </div>
              )}

              <form onSubmit={handleFollowupSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Next Follow-up Date *
                    </label>
                    <input
                      type="date"
                      value={fuForm.next_follow_up_date}
                      onChange={(e) => setFuForm({ ...fuForm, next_follow_up_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Follow-up Mode
                    </label>
                    <select
                      value={fuForm.follow_up_mode}
                      onChange={(e) => setFuForm({ ...fuForm, follow_up_mode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="meeting">In-Person Meeting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Discussion Remarks & Client Feedback *
                  </label>
                  <textarea
                    rows={3}
                    value={fuForm.remarks}
                    onChange={(e) => setFuForm({ ...fuForm, remarks: e.target.value })}
                    required
                    placeholder="Details about client reaction, budget discussion, delivery timeline questions..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Expected Order Date
                    </label>
                    <input
                      type="date"
                      value={fuForm.expected_order_date}
                      onChange={(e) => setFuForm({ ...fuForm, expected_order_date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Expected Qty (Kits)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={fuForm.expected_quantity}
                      onChange={(e) => setFuForm({ ...fuForm, expected_quantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Probability % ({fuForm.probability_pct}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={fuForm.probability_pct}
                      onChange={(e) => setFuForm({ ...fuForm, probability_pct: Number(e.target.value) })}
                      className="w-full accent-amber-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Update Quote Status
                    </label>
                    <select
                      value={fuForm.status}
                      onChange={(e) => setFuForm({ ...fuForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      <option value="pending">Pending Follow-up</option>
                      <option value="interested">Interested</option>
                      <option value="negotiation">In Negotiation</option>
                      <option value="order_expected">Order Expected</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
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
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition flex items-center gap-2"
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

      {/* ── MODAL: CONVERT TO ORDER ──────────────────────────────────────── */}
      <AnimatePresence>
        {convertModalQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FiCheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Convert to Official Order</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{convertModalQuote.quote_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setConvertModalQuote(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <FiX size={18} />
                </button>
              </div>

              {convertError && (
                <div className="my-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2 border border-red-200">
                  <FiAlertCircle size={16} /> {convertError}
                </div>
              )}

              <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">EPC Buyer:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{convertModalQuote.epc_snapshot?.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kit:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{convertModalQuote.combo_kit_snapshot?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{convertModalQuote.quantity} Units</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500 font-bold">Total Payable:</span>
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
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition ${
                        orderType === "epc_order"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                      }`}
                    >
                      <div className="font-bold">EPC Direct Order</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">Billed to EPC Buyer</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType("fpo_order")}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition ${
                        orderType === "fpo_order"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                      }`}
                    >
                      <div className="font-bold">Franchisee PO</div>
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">Franchisee PO inventory</div>
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
