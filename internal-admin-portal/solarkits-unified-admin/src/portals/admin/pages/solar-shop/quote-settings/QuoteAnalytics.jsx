import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiBarChart2,
  FiFileText,
  FiTrendingUp,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiRefreshCw,
  FiLayers,
  FiUsers,
  FiDownload,
  FiEye,
  FiX,
  FiTag,
  FiPhone,
  FiMail,
  FiMapPin,
  FiPackage,
  FiShield,
  FiAlertCircle,
  FiDollarSign,
} from "react-icons/fi";
import { TbCurrencyRupee } from "react-icons/tb";

const rawApiUrl = (
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api"
).replace(/\/+$/, "");
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case "converted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
    case "sent":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800";
    case "generated":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    case "lost":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    case "expired":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

export default function QuoteAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [anRes, qRes] = await Promise.all([
        axios.get(`${API_BASE}/admin-api/quote-settings/analytics`, { headers: authHeaderObj() }),
        axios.get(`${API_BASE}/admin-api/quote-settings/quotes?limit=100`, { headers: authHeaderObj() }),
      ]);
      if (anRes.data?.status === "success") {
        setAnalytics(anRes.data.data);
      }
      if (qRes.data?.status === "success") {
        setQuotes(qRes.data.data?.quotes || qRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const rawSummary = analytics?.summary || {};
  const summary = {
    total_quotes: rawSummary.total_quotes ?? rawSummary.total ?? 0,
    converted_quotes: rawSummary.converted_quotes ?? rawSummary.converted ?? 0,
    lost_quotes: rawSummary.lost_quotes ?? rawSummary.lost ?? 0,
    total_pipeline_value_paise: rawSummary.total_pipeline_value_paise ?? rawSummary.total_quoted_paise ?? 0,
    total_converted_value_paise: rawSummary.total_converted_value_paise ?? rawSummary.total_converted_paise ?? 0,
    conversion_rate_pct:
      rawSummary.conversion_rate_pct != null
        ? rawSummary.conversion_rate_pct
        : rawSummary.total > 0
          ? Math.round((rawSummary.converted / rawSummary.total) * 100)
          : 0,
    avg_deal_paise:
      rawSummary.avg_deal_paise ??
      (rawSummary.total > 0 ? Math.round(rawSummary.total_quoted_paise / rawSummary.total) : 0),
  };

  const statusMap = analytics?.by_status_map || {};
  if (!analytics?.by_status_map && Array.isArray(analytics?.by_status)) {
    analytics.by_status.forEach((item) => {
      statusMap[item._id] = item.count;
    });
  }

  const filteredQuotes = quotes.filter((q) => {
    const s = search.toLowerCase();
    const qNum = q.quote_number?.toLowerCase() || "";
    const epc = q.epc_snapshot?.company_name?.toLowerCase() || "";
    const contact = q.epc_snapshot?.contact_person?.toLowerCase() || "";
    const bde = q.bde_snapshot?.full_name?.toLowerCase() || "";
    const f = q.franchisee_snapshot?.business_name?.toLowerCase() || "";
    const matchesSearch = qNum.includes(s) || epc.includes(s) || contact.includes(s) || bde.includes(s) || f.includes(s);
    const matchesStatus = !statusFilter || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDownloadPdf = async (e, q) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(q._id);
    try {
      const res = await axios.get(`${API_BASE}/admin-api/quote-settings/quotes/${q._id}/pdf`, {
        headers: authHeaderObj(),
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Quote-${q.quote_number || "EPC"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF. Please ensure quote status is not draft.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <FiBarChart2 size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Quotation Pipeline & Commercial Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live commercial performance across all Franchisee Partners, BDEs, and EPC clients
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm text-xs font-bold self-start sm:self-auto cursor-pointer"
        >
          <FiRefreshCw size={14} className={loading ? "animate-spin text-amber-500" : ""} />
          <span>Refresh Live Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quotes</span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <FiFileText size={14} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{summary.total_quotes}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All issued proposals</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pipeline</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <FiTrendingUp size={14} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatINR(summary.total_pipeline_value_paise)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Gross quotation value</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <FiCheckCircle size={14} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatINR(summary.total_converted_value_paise)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary.converted_quotes} closed orders</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
              <FiBarChart2 size={14} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {summary.conversion_rate_pct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Quote-to-Order ratio</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Deal Size</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <TbCurrencyRupee size={14} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatINR(summary.avg_deal_paise)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Per quotation average</div>
        </div>
      </div>

      {/* Breakdown Strip & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Breakdown Pills */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FiLayers className="text-amber-500" />
              <span>Pipeline Stage Breakdown</span>
            </h3>
            <span className="text-[11px] text-slate-400">Click a stage to filter</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { key: "", label: "All Quotes", count: summary.total_quotes, color: "hover:border-slate-400" },
              { key: "converted", label: "Converted", count: statusMap.converted || 0, color: "hover:border-emerald-500 text-emerald-600" },
              { key: "sent", label: "Sent", count: statusMap.sent || 0, color: "hover:border-sky-500 text-sky-600" },
              { key: "generated", label: "Generated", count: statusMap.generated || 0, color: "hover:border-amber-500 text-amber-600" },
              { key: "draft", label: "Draft", count: statusMap.draft || 0, color: "hover:border-slate-400 text-slate-600" },
              { key: "lost", label: "Lost", count: statusMap.lost || 0, color: "hover:border-rose-500 text-rose-600" },
            ].map((st) => {
              const active = statusFilter === st.key;
              return (
                <button
                  key={st.label}
                  type="button"
                  onClick={() => setStatusFilter(active ? "" : st.key)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${active
                    ? "border-amber-500 bg-amber-500/10 shadow-sm ring-1 ring-amber-500"
                    : `border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 ${st.color}`
                    }`}
                >
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{st.label}</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white mt-1">{st.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Franchisee Partners */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FiUsers className="text-amber-500" />
              <span>Top Franchisee Partners</span>
            </h3>
            <span className="text-[11px] text-slate-400">By quote volume</span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto">
            {analytics?.top_franchisees && analytics.top_franchisees.length > 0 ? (
              analytics.top_franchisees.map((f, idx) => (
                <div
                  key={f._id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {f.franchisee_name || "Franchisee Partner"}
                    </div>
                    <div className="text-[10px] text-slate-400">{f.total_quotes} quotes • {f.converted || 0} converted</div>
                  </div>
                  <div className="text-right whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                    {formatINR(f.pipeline_paise)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">No franchisee records found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Quotes Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiFileText className="text-amber-500" />
              <span>Platform-wide EPC Quotations</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {filteredQuotes.length} of {quotes.length} total quotations
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search quote, EPC, partner..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="generated">Generated</option>
              <option value="sent">Sent</option>
              <option value="converted">Converted</option>
              <option value="expired">Expired</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-400">Loading platform records...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <FiAlertCircle size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-500">No quotation records matched your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Quote Number</th>
                  <th className="py-3 px-4">EPC Client</th>
                  <th className="py-3 px-4">Franchisee / Partner</th>
                  <th className="py-3 px-4">ComboKit & Capacity</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotes.map((q) => (
                  <tr
                    key={q._id}
                    onClick={() => setSelectedQuote(q)}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-750 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {q.quote_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {q.epc_snapshot?.company_name || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {q.epc_snapshot?.contact_person} {q.epc_snapshot?.mobile ? `• ${q.epc_snapshot?.mobile}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {q.franchisee_snapshot?.business_name || "Direct / Admin"}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {q.quote_source?.replace(/_/g, " ") || q.created_by_role || "BDE / Partner"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div className="truncate max-w-[220px]" title={q.combo_kit_snapshot?.name}>
                        {q.combo_kit_snapshot?.name || "ComboKit"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {q.kit_capacity_kw || q.combo_kit_snapshot?.capacity_kw || 3} kW • Qty: {q.quantity || 1}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(q.total_amount_paise)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block capitalize px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          q.status
                        )}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(q.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedQuote(q)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition cursor-pointer"
                          title="View Details"
                        >
                          <FiEye size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(e, q)}
                          disabled={downloadingId === q._id || q.status === "draft"}
                          className={`p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition cursor-pointer ${q.status === "draft" ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                          title={q.status === "draft" ? "Generate quote first" : "Download Official PDF"}
                        >
                          {downloadingId === q._id ? (
                            <FiRefreshCw size={13} className="animate-spin text-amber-500" />
                          ) : (
                            <FiDownload size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote Details Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                  {selectedQuote.quote_number}
                </span>
                <span
                  className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                    selectedQuote.status
                  )}`}
                >
                  {selectedQuote.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* EPC Client & Partner Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FiUsers size={12} className="text-amber-500" />
                    <span>EPC Client Snapshot</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedQuote.epc_snapshot?.company_name || "—"}
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    {selectedQuote.epc_snapshot?.gstin && (
                      <div>GSTIN: <span className="font-mono font-semibold">{selectedQuote.epc_snapshot.gstin}</span></div>
                    )}
                    {selectedQuote.epc_snapshot?.contact_person && (
                      <div>Contact: {selectedQuote.epc_snapshot.contact_person}</div>
                    )}
                    {selectedQuote.epc_snapshot?.mobile && (
                      <div>Mobile: {selectedQuote.epc_snapshot.mobile}</div>
                    )}
                    {selectedQuote.epc_snapshot?.email && (
                      <div>Email: {selectedQuote.epc_snapshot.email}</div>
                    )}
                    {selectedQuote.epc_snapshot?.address && (
                      <div>Address: {selectedQuote.epc_snapshot.address}</div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FiTag size={12} className="text-amber-500" />
                    <span>Partner & Origin</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedQuote.franchisee_snapshot?.business_name || "Direct Admin"}
                  </div>
                  <div className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <div>Source: <span className="capitalize">{selectedQuote.quote_source?.replace(/_/g, " ") || "Partner Portal"}</span></div>
                    <div>Created By: <span className="capitalize">{selectedQuote.created_by_role}</span></div>
                    {selectedQuote.franchisee_snapshot?.mobile && (
                      <div>Partner Contact: {selectedQuote.franchisee_snapshot.mobile}</div>
                    )}
                    <div>
                      Date:{" "}
                      {new Date(selectedQuote.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ComboKit Snapshot */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiPackage size={12} className="text-amber-500" />
                  <span>ComboKit Details</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedQuote.combo_kit_snapshot?.name || "ComboKit"}
                </div>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                    Capacity: {selectedQuote.kit_capacity_kw || 3} kW
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold">
                    Quantity: {selectedQuote.quantity || 1} Kit(s)
                  </span>
                  {selectedQuote.combo_kit_snapshot?.system_type && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold uppercase">
                      {selectedQuote.combo_kit_snapshot.system_type}
                    </span>
                  )}
                  {selectedQuote.gst_rate && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                      GST Rate: {selectedQuote.gst_rate}%
                    </span>
                  )}
                </div>
              </div>

              {/* Commercials Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FiDollarSign size={12} className="text-amber-500" />
                  <span>Financial Summary</span>
                </div>

                <div className="space-y-1.5 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Base Kit Subtotal</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatINR(selectedQuote.product_subtotal_paise || (selectedQuote.price_per_kit_paise * (selectedQuote.quantity || 1)))}
                    </span>
                  </div>

                  {selectedQuote.warranty_charges_paise > 0 && (
                    <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                      <span>Extended Warranty Charges</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatINR(selectedQuote.warranty_charges_paise)}
                      </span>
                    </div>
                  )}

                  {selectedQuote.delivery_charges_paise > 0 && (
                    <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                      <span>Logistics & Delivery Charges</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatINR(selectedQuote.delivery_charges_paise)}
                      </span>
                    </div>
                  )}

                  {selectedQuote.discount_paise > 0 && (
                    <div className="flex justify-between py-1 text-emerald-600">
                      <span>Discount Applied</span>
                      <span className="font-semibold">- {formatINR(selectedQuote.discount_paise)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Taxable Amount</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatINR(selectedQuote.taxable_amount_paise)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>GST ({selectedQuote.gst_rate || 13.8}%)</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatINR(selectedQuote.gst_amount_paise)}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-sm font-bold text-amber-600 dark:text-amber-400">
                    <span>Total Quoted Amount</span>
                    <span>{formatINR(selectedQuote.total_amount_paise)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedQuote(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={(e) => handleDownloadPdf(e, selectedQuote)}
                disabled={downloadingId === selectedQuote._id || selectedQuote.status === "draft"}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {downloadingId === selectedQuote._id ? (
                  <FiRefreshCw size={14} className="animate-spin" />
                ) : (
                  <FiDownload size={14} />
                )}
                <span>Download Official PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
