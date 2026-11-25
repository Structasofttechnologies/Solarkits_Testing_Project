import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { authHeaderObj } from "@/app/authHeader";
import {
  FiTool, FiSearch, FiFilter, FiEye, FiCheck, FiX, FiTruck,
  FiPackage, FiRefreshCw, FiChevronRight, FiArrowLeft,
  FiCheckCircle, FiXCircle, FiClock, FiAlertCircle,
  FiImage, FiFile,
} from "react-icons/fi";
import { HiOutlineTicket } from "react-icons/hi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api";

// ── Constants ────────────────────────────────────────────────────────────────
const ISSUE_CATEGORIES = {
  physical_damage:    "Physical Damage",
  non_functional:     "Non-Functional",
  missing_part:       "Missing Part",
  wrong_item:         "Wrong Item",
  installation_issue: "Installation Issue",
  other:              "Other",
};

const STATUS_CONFIG = {
  raised:                 { label: "Raised",       color: "#3b82f6", bg: "#eff6ff",  border: "#bfdbfe" },
  under_review:           { label: "Under Review", color: "#f59e0b", bg: "#fffbeb",  border: "#fde68a" },
  approved:               { label: "Approved",     color: "#10b981", bg: "#f0fdf4",  border: "#a7f3d0" },
  rejected:               { label: "Rejected",     color: "#ef4444", bg: "#fef2f2",  border: "#fecaca" },
  replacement_processing: { label: "Processing",   color: "#8b5cf6", bg: "#f5f3ff",  border: "#ddd6fe" },
  dispatched:             { label: "Dispatched",   color: "#0ea5e9", bg: "#f0f9ff",  border: "#bae6fd" },
  delivered:              { label: "Delivered",    color: "#22c55e", bg: "#f0fdf4",  border: "#86efac" },
  closed:                 { label: "Closed",       color: "#6b7280", bg: "#f9fafb",  border: "#e5e7eb" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
}

// ── Stats Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, bg }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: bg || "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color || "var(--color-text-primary)" }}>{value ?? "—"}</p>
    </div>
  );
}

// ── Timeline Entry ────────────────────────────────────────────────────────────
function TimelineStep({ entry, isLast }) {
  const cfg = STATUS_CONFIG[entry.status] || { color: "#6b7280" };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-black"
          style={{ background: cfg.color }}>
          {entry.status.charAt(0).toUpperCase()}
        </div>
        {!isLast && <div className="w-0.5 flex-1 mt-1" style={{ background: "var(--color-border)" }} />}
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: cfg.color }}>
            {STATUS_CONFIG[entry.status]?.label || entry.status}
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            by {entry.actor_name || entry.actor_type} • {new Date(entry.timestamp).toLocaleString("en-IN")}
          </span>
        </div>
        {entry.comment && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{entry.comment}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN ADMIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ServiceTicketsAdmin() {
  const [view, setView] = useState("list"); // 'list' | 'detail'
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Review action state
  const [action, setAction] = useState("");
  const [reviewData, setReviewData] = useState({ rejection_reason: "", tracking_number: "", shipping_carrier: "", admin_notes: "", replacement_item_details: "" });
  const [reviewing, setReviewing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/service-tickets/stats`, { headers: authHeaderObj() });
      if (res.data?.success) setStats(res.data.data);
    } catch {}
  }, []);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("raised_by_type", typeFilter);
      if (search.trim()) params.append("search", search.trim());

      const res = await axios.get(`${API_BASE}/service-tickets/list?${params}`, { headers: authHeaderObj() });
      if (res.data?.success) {
        setTickets(res.data.data.tickets || []);
        setTotal(res.data.data.total || 0);
      }
    } catch {}
    finally { setLoading(false); }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (view === "list") fetchTickets(); }, [view, fetchTickets]);

  // ── Open detail ────────────────────────────────────────────────────────────
  const openDetail = async (ticket) => {
    setDetailLoading(true);
    setView("detail");
    setAction("");
    setReviewData({ rejection_reason: "", tracking_number: "", shipping_carrier: "", admin_notes: ticket.admin_notes || "", replacement_item_details: "" });
    try {
      const res = await axios.get(`${API_BASE}/service-tickets/${ticket._id}`, { headers: authHeaderObj() });
      if (res.data?.success) setSelectedTicket(res.data.data);
      else setSelectedTicket(ticket);
    } catch { setSelectedTicket(ticket); }
    finally { setDetailLoading(false); }
  };

  // ── Submit review action ───────────────────────────────────────────────────
  const handleReview = async () => {
    if (!action || !selectedTicket) return;
    if (action === "reject" && !reviewData.rejection_reason.trim()) {
      showToast("Please enter a rejection reason.", "error");
      return;
    }
    if (action === "dispatch" && !reviewData.tracking_number.trim()) {
      showToast("Please enter the tracking number.", "error");
      return;
    }
    setReviewing(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/service-tickets/${selectedTicket._id}/review`,
        { action, ...reviewData },
        { headers: authHeaderObj() }
      );
      if (res.data?.success) {
        showToast(`Ticket status updated to "${res.data.data?.ticket_status || action}".`);
        // Refresh detail
        const detail = await axios.get(`${API_BASE}/service-tickets/${selectedTicket._id}`, { headers: authHeaderObj() });
        if (detail.data?.success) setSelectedTicket(detail.data.data);
        setAction("");
        fetchStats();
        fetchTickets();
      } else {
        showToast(res.data?.message || "Failed to update ticket.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed.", "error");
    } finally {
      setReviewing(false);
    }
  };

  const STATUS_TABS = [
    { key: "all",                 label: "All",         count: stats?.total },
    { key: "raised",              label: "Open",        count: stats?.raised },
    { key: "under_review",        label: "Review",      count: stats?.under_review },
    { key: "approved",            label: "Approved",    count: stats?.approved },
    { key: "rejected",            label: "Rejected",    count: stats?.rejected },
    { key: "dispatched",          label: "Dispatched",  count: stats?.dispatched },
    { key: "closed",              label: "Closed",      count: stats?.closed },
  ];

  return (
    <div style={{ color: "var(--color-text-primary)" }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold"
            style={toast.type === "error"
              ? { background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }
              : { background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac" }
            }
          >
            {toast.type === "error" ? <FiAlertCircle size={16} /> : <FiCheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-black flex items-center gap-2">
                  <FiTool size={22} style={{ color: "var(--color-primary)" }} />
                  Service Tickets
                </h1>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  Kit item replacement and service requests from Franchisees & EPC Buyers
                </p>
              </div>
              <button onClick={() => { fetchStats(); fetchTickets(); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <FiRefreshCw size={13} /> Refresh
              </button>
            </div>

            {/* Stats Row */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <StatCard label="Total" value={stats.total} />
                <StatCard label="Open" value={stats.raised} color="#3b82f6" bg="#eff6ff" />
                <StatCard label="Under Review" value={stats.under_review} color="#f59e0b" bg="#fffbeb" />
                <StatCard label="Approved" value={stats.approved} color="#10b981" bg="#f0fdf4" />
                <StatCard label="Rejected" value={stats.rejected} color="#ef4444" bg="#fef2f2" />
                <StatCard label="Dispatched" value={stats.dispatched} color="#0ea5e9" bg="#f0f9ff" />
                <StatCard label="Avg Resolution" value={stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : "N/A"} color="#8b5cf6" />
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <FiSearch size={14} style={{ color: "var(--color-text-muted)" }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ticket, order, item..."
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: "var(--color-text-primary)" }} />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                <option value="all">All Users</option>
                <option value="reseller">Franchisee</option>
                <option value="epc_buyer">EPC Buyer</option>
              </select>
              <button onClick={fetchTickets}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "var(--gradient-primary)" }}>
                <FiSearch size={13} />
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {STATUS_TABS.map((tab) => (
                <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5"
                  style={statusFilter === tab.key
                    ? { background: "var(--color-primary)", color: "white" }
                    : { background: "var(--color-surface)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                  }>
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: statusFilter === tab.key ? "rgba(255,255,255,0.25)" : "var(--color-bg)" }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                    {["Ticket No.", "Raised By", "Type", "Item / Kit", "Issue", "Status", "Date", "Action"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-bold" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        {[...Array(8)].map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 rounded animate-pulse" style={{ background: "var(--color-surface)" }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <HiOutlineTicket size={40} className="mx-auto mb-2 opacity-20" />
                        <p className="font-bold" style={{ color: "var(--color-text-muted)" }}>No tickets found</p>
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr key={t._id}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-4 py-3 font-black" style={{ color: "var(--color-primary)" }}>{t.ticket_number}</td>
                        <td className="px-4 py-3 font-semibold max-w-[140px] truncate">{t.raised_by_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                            style={{ background: t.raised_by_type === "reseller" ? "#eff6ff" : "#fdf4ff", color: t.raised_by_type === "reseller" ? "#1d4ed8" : "#7c3aed" }}>
                            {t.raised_by_type === "reseller" ? "Franchisee" : "EPC Buyer"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          <p className="font-bold truncate">{t.item_name}</p>
                          {t.kit_name && <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>{t.kit_name}</p>}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                          {ISSUE_CATEGORIES[t.issue_category] || t.issue_category}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.ticket_status} /></td>
                        <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(t.created_at).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(t)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                            style={{ background: "var(--color-primary)", color: "white" }}>
                            <FiEye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] mt-3" style={{ color: "var(--color-text-muted)" }}>Showing {tickets.length} of {total} tickets</p>
          </motion.div>
        )}

        {/* ── DETAIL VIEW ───────────────────────────────────────────────── */}
        {view === "detail" && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <button onClick={() => { setView("list"); setSelectedTicket(null); }}
              className="flex items-center gap-1.5 mb-5 text-xs font-semibold hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text-secondary)" }}>
              <FiArrowLeft size={15} /> Back to Tickets
            </button>

            {detailLoading ? (
              <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--color-surface)" }} />)}</div>
            ) : selectedTicket ? (
              <div className="grid lg:grid-cols-3 gap-5">
                {/* LEFT — Ticket Info */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Header */}
                  <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-[11px] font-bold mb-0.5" style={{ color: "var(--color-text-muted)" }}>TICKET</p>
                        <h2 className="text-xl font-black" style={{ color: "var(--color-primary)" }}>{selectedTicket.ticket_number}</h2>
                        <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                          Raised on {new Date(selectedTicket.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={selectedTicket.ticket_status} />
                        <p className="text-[11px] mt-1 capitalize" style={{ color: "var(--color-text-muted)" }}>
                          by {selectedTicket.raised_by_type === "reseller" ? "Franchisee" : "EPC Buyer"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      {[
                        ["Raised By", selectedTicket.raised_by_name],
                        ["Item", selectedTicket.item_name],
                        ["Serial Number", selectedTicket.item_serial_number],
                        ["Kit", selectedTicket.kit_name ? `${selectedTicket.kit_name} ${selectedTicket.kit_capacity || ""}` : null],
                        ["Order", selectedTicket.order_number],
                        ["Invoice", selectedTicket.invoice_number],
                        ["Issue Category", ISSUE_CATEGORIES[selectedTicket.issue_category] || selectedTicket.issue_category],
                        ["Warranty", selectedTicket.warranty_status?.replace(/_/g, " ")],
                        ["Installation Date", selectedTicket.installation_date ? new Date(selectedTicket.installation_date).toLocaleDateString("en-IN") : null],
                      ].map(([label, val]) => val ? (
                        <div key={label}>
                          <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{label}</p>
                          <p className="text-sm font-semibold capitalize" style={{ color: "var(--color-text-primary)" }}>{val}</p>
                        </div>
                      ) : null)}
                    </div>

                    <div className="mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>PROBLEM DESCRIPTION</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{selectedTicket.problem_description}</p>
                    </div>

                    {selectedTicket.project_details && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>PROJECT DETAILS</p>
                        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{selectedTicket.project_details}</p>
                      </div>
                    )}

                    {selectedTicket.installation_address?.city && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-muted)" }}>INSTALLATION ADDRESS</p>
                        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                          {[selectedTicket.installation_address.line, selectedTicket.installation_address.city, selectedTicket.installation_address.state, selectedTicket.installation_address.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  {selectedTicket.ticket_status === "rejected" && selectedTicket.rejection_reason && (
                    <div className="p-4 rounded-2xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <p className="text-xs font-black mb-1" style={{ color: "#dc2626" }}>❌ REJECTION REASON</p>
                      <p className="text-sm" style={{ color: "#991b1b" }}>{selectedTicket.rejection_reason}</p>
                    </div>
                  )}

                  {/* Dispatch Info */}
                  {selectedTicket.tracking_number && (
                    <div className="p-4 rounded-2xl" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                      <p className="text-xs font-black mb-2" style={{ color: "#0369a1" }}>📦 DISPATCH INFO</p>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div><p className="text-[10px] font-bold" style={{ color: "#0369a1" }}>Tracking No.</p><p style={{ color: "#0c4a6e" }}>{selectedTicket.tracking_number}</p></div>
                        {selectedTicket.shipping_carrier && <div><p className="text-[10px] font-bold" style={{ color: "#0369a1" }}>Carrier</p><p style={{ color: "#0c4a6e" }}>{selectedTicket.shipping_carrier}</p></div>}
                        {selectedTicket.dispatched_at && <div><p className="text-[10px] font-bold" style={{ color: "#0369a1" }}>Dispatched</p><p style={{ color: "#0c4a6e" }}>{new Date(selectedTicket.dispatched_at).toLocaleString("en-IN")}</p></div>}
                      </div>
                    </div>
                  )}

                  {/* Proof Files */}
                  {selectedTicket.proof_files?.length > 0 && (
                    <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <p className="text-[10px] font-black uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>UPLOADED PROOF ({selectedTicket.proof_files.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedTicket.proof_files.map((f, i) => (
                          <a key={i} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                            className="block p-3 rounded-xl text-center transition-all hover:opacity-80"
                            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                            {f.file_type === "image"
                              ? <FiImage size={20} className="mx-auto mb-1" style={{ color: "var(--color-primary)" }} />
                              : <FiFile size={20} className="mx-auto mb-1" />
                            }
                            <p className="text-[10px] truncate font-semibold" style={{ color: "var(--color-text-muted)" }}>{f.file_name || `File ${i + 1}`}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {selectedTicket.status_history?.length > 0 && (
                    <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <p className="text-[10px] font-black uppercase tracking-wide mb-4" style={{ color: "var(--color-text-muted)" }}>STATUS TIMELINE</p>
                      {selectedTicket.status_history.map((e, i) => (
                        <TimelineStep key={i} entry={e} isLast={i === selectedTicket.status_history.length - 1} />
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT — Admin Action Panel */}
                <div className="space-y-4">
                  {/* Action Buttons */}
                  <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[10px] font-black uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>ADMIN ACTIONS</p>
                    <div className="space-y-2">
                      {/* Available actions based on current status */}
                      {["raised", "under_review"].includes(selectedTicket.ticket_status) && (
                        <>
                          <ActionBtn label="Take Under Review" icon={FiEye} color="#f59e0b" onClick={() => setAction("under_review")} active={action === "under_review"} />
                          <ActionBtn label="Approve Ticket" icon={FiCheckCircle} color="#10b981" onClick={() => setAction("approve")} active={action === "approve"} />
                          <ActionBtn label="Reject Ticket" icon={FiXCircle} color="#ef4444" onClick={() => setAction("reject")} active={action === "reject"} />
                        </>
                      )}
                      {selectedTicket.ticket_status === "approved" && (
                        <>
                          <ActionBtn label="Mark Processing" icon={FiRefreshCw} color="#8b5cf6" onClick={() => setAction("mark_processing")} active={action === "mark_processing"} />
                          <ActionBtn label="Dispatch Replacement" icon={FiTruck} color="#0ea5e9" onClick={() => setAction("dispatch")} active={action === "dispatch"} />
                        </>
                      )}
                      {selectedTicket.ticket_status === "replacement_processing" && (
                        <ActionBtn label="Dispatch Replacement" icon={FiTruck} color="#0ea5e9" onClick={() => setAction("dispatch")} active={action === "dispatch"} />
                      )}
                      {selectedTicket.ticket_status === "dispatched" && (
                        <ActionBtn label="Mark as Delivered" icon={FiPackage} color="#22c55e" onClick={() => setAction("mark_delivered")} active={action === "mark_delivered"} />
                      )}
                      {["closed", "rejected"].includes(selectedTicket.ticket_status) && (
                        <p className="text-xs text-center py-3" style={{ color: "var(--color-text-muted)" }}>
                          This ticket is {selectedTicket.ticket_status}.
                        </p>
                      )}
                    </div>

                    {/* Dynamic input fields based on action */}
                    {action && (
                      <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                        {action === "reject" && (
                          <textarea
                            value={reviewData.rejection_reason}
                            onChange={(e) => setReviewData((p) => ({ ...p, rejection_reason: e.target.value }))}
                            placeholder="Enter rejection reason..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                            style={{ background: "var(--color-bg)", border: "1px solid #fca5a5", color: "var(--color-text-primary)" }}
                          />
                        )}
                        {action === "dispatch" && (
                          <>
                            <input type="text" placeholder="Tracking Number *" value={reviewData.tracking_number}
                              onChange={(e) => setReviewData((p) => ({ ...p, tracking_number: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }} />
                            <input type="text" placeholder="Shipping Carrier (e.g. DTDC, BlueDart)"
                              value={reviewData.shipping_carrier}
                              onChange={(e) => setReviewData((p) => ({ ...p, shipping_carrier: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }} />
                            <input type="text" placeholder="Replacement item details (optional)"
                              value={reviewData.replacement_item_details}
                              onChange={(e) => setReviewData((p) => ({ ...p, replacement_item_details: e.target.value }))}
                              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }} />
                          </>
                        )}

                        {/* Submit */}
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleReview}
                          disabled={reviewing}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                          style={{ background: action === "reject" ? "#ef4444" : "var(--gradient-primary)" }}
                        >
                          {reviewing ? <><FiRefreshCw size={13} className="animate-spin" /> Processing...</> : "Confirm Action"}
                        </motion.button>
                        <button onClick={() => setAction("")} className="w-full py-2 text-xs font-bold transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <p className="text-[10px] font-black uppercase tracking-wide mb-3" style={{ color: "var(--color-text-muted)" }}>INTERNAL NOTES</p>
                    <textarea
                      value={reviewData.admin_notes}
                      onChange={(e) => setReviewData((p) => ({ ...p, admin_notes: e.target.value }))}
                      placeholder="Add internal notes (visible to support team only)..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                    />
                    <button
                      onClick={async () => {
                        setReviewing(true);
                        try {
                          await axios.patch(`${API_BASE}/service-tickets/${selectedTicket._id}/review`,
                            { action: selectedTicket.ticket_status === "raised" ? "under_review" : selectedTicket.ticket_status, admin_notes: reviewData.admin_notes },
                            { headers: authHeaderObj() });
                          showToast("Notes saved.");
                        } catch { showToast("Failed to save notes.", "error"); }
                        setReviewing(false);
                      }}
                      className="mt-2 w-full py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({ label, icon: Icon, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
      style={active
        ? { background: color, color: "white", border: `1px solid ${color}` }
        : { background: "var(--color-bg)", color, border: `1px solid ${color}30` }
      }
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
