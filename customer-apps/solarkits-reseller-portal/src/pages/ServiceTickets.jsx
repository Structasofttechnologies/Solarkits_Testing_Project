import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiTool, FiPlus, FiChevronRight, FiChevronLeft, FiUpload,
  FiX, FiCheck, FiAlertCircle, FiClock, FiTruck, FiPackage,
  FiEye, FiRefreshCw, FiCheckCircle, FiXCircle, FiSearch,
  FiFilter, FiImage, FiFile, FiDownload, FiArrowLeft,
} from "react-icons/fi";
import { HiOutlineTicket } from "react-icons/hi";
import api from "../services/api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const TICKET_TYPES = [
  { value: "business_support", label: "Business Support", desc: "Support regarding BDE, schemes, onboarding, or sales", icon: "🤝", defaultDept: "Sales & BDE", defaultTat: "24h" },
  { value: "product", label: "Product Issue", desc: "Technical or performance issue with solar kit products", icon: "⚡", defaultDept: "Technical", defaultTat: "48h" },
  { value: "replacement", label: "Replacement Request", desc: "Request for replacement of damaged or non-functional items", icon: "🔄", defaultDept: "Technical", defaultTat: "48h" },
  { value: "delivery", label: "Delivery Issue", desc: "Dispatched material delayed, damaged, or incomplete", icon: "🚚", defaultDept: "Logistics & Dispatch", defaultTat: "24h" },
  { value: "payment", label: "Payment & Accounts", desc: "Payment reconciliation, ledger issues, or commission queries", icon: "💳", defaultDept: "Accounts & Finance", defaultTat: "24h" },
];

const PRIORITY_CONFIG = {
  low: { label: "Low Priority", color: "#6b7280", bg: "#f3f4f6", tat: "72 Hours" },
  medium: { label: "Medium Priority", color: "#2563eb", bg: "#eff6ff", tat: "48 Hours" },
  high: { label: "High Priority", color: "#d97706", bg: "#fffbeb", tat: "24 Hours" },
  critical: { label: "Critical Priority", color: "#dc2626", bg: "#fef2f2", tat: "12 Hours" },
};

const ISSUE_CATEGORIES = [
  { value: "physical_damage", label: "Physical Damage", icon: "⚡" },
  { value: "non_functional", label: "Not Working / Non-Functional", icon: "🔌" },
  { value: "missing_part", label: "Missing Part", icon: "🔍" },
  { value: "wrong_item", label: "Wrong Item Supplied", icon: "❌" },
  { value: "installation_issue", label: "Installation Issue", icon: "🔧" },
  { value: "other", label: "Other", icon: "📋" },
];

const WARRANTY_OPTIONS = [
  { value: "under_warranty", label: "Under Warranty" },
  { value: "out_of_warranty", label: "Out of Warranty" },
  { value: "unknown", label: "Not Sure" },
];

const STATUS_CONFIG = {
  raised: { label: "Raised", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", icon: HiOutlineTicket },
  under_review: { label: "Under Review", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", icon: FiEye },
  approved: { label: "Approved", color: "#10b981", bg: "#f0fdf4", border: "#a7f3d0", icon: FiCheckCircle },
  rejected: { label: "Rejected", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", icon: FiXCircle },
  replacement_processing: { label: "Processing", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", icon: FiRefreshCw },
  dispatched: { label: "Dispatched", color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd", icon: FiTruck },
  delivered: { label: "Delivered", color: "#22c55e", bg: "#f0fdf4", border: "#86efac", icon: FiPackage },
  closed: { label: "Closed", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", icon: FiCheck },
};

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "raised", label: "Open" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "dispatched", label: "Dispatched" },
  { key: "closed", label: "Closed" },
];

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  const Icon = cfg.icon || FiClock;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Timeline Step ─────────────────────────────────────────────────────────────
function TimelineStep({ entry, isLast }) {
  const cfg = STATUS_CONFIG[entry.status] || { color: "#6b7280", bg: "#f9fafb" };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: cfg.bg, border: `2px solid ${cfg.color}` }}
        >
          <span style={{ color: cfg.color }} className="text-[10px] font-black">
            {entry.status.charAt(0).toUpperCase()}
          </span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 mt-1" style={{ background: "var(--color-border)" }} />}
      </div>
      <div className={`pb-4 min-w-0 flex-1 ${isLast ? "" : ""}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: cfg.color }}>
            {STATUS_CONFIG[entry.status]?.label || entry.status}
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            by {entry.actor_name || entry.actor_type}
          </span>
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            • {new Date(entry.timestamp).toLocaleString("en-IN")}
          </span>
        </div>
        {entry.comment && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {entry.comment}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ServiceTickets() {
  const [view, setView] = useState("list"); // 'list' | 'create' | 'detail'
  const [tickets, setTickets] = useState([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Fetch tickets ──────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (activeTab !== "all") params.append("ticket_status", activeTab);
      // Try centralized franchise cluster tickets first
      let res = await api.get(`/india/v1/franchise-clusters/tickets/list?${params}`).catch(() => null);
      if (res?.data?.status === "success" && Array.isArray(res.data.data)) {
        setTickets(res.data.data);
        setTotalTickets(res.data.count || res.data.data.length);
      } else {
        if (activeTab !== "all") params.set("status", activeTab);
        res = await api.get(`/india/v1/reseller/service-tickets?${params}`);
        if (res?.data?.success) {
          setTickets(res.data.data.tickets || []);
          setTotalTickets(res.data.data.total || 0);
        }
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (view === "list") fetchTickets();
  }, [view, fetchTickets]);

  // ── View detail ────────────────────────────────────────────────────────────
  const openDetail = async (ticket) => {
    setDetailLoading(true);
    setView("detail");
    try {
      const res = await api.get(`/india/v1/reseller/service-tickets/${ticket._id}`);
      if (res.data?.success) setSelectedTicket(res.data.data);
      else setSelectedTicket(ticket);
    } catch {
      setSelectedTicket(ticket);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Confirm delivery ───────────────────────────────────────────────────────
  const handleConfirmDelivery = async () => {
    if (!selectedTicket) return;
    setConfirmingDelivery(true);
    try {
      const res = await api.post(`/india/v1/reseller/service-tickets/${selectedTicket._id}/confirm-delivery`);
      if (res.data?.success) {
        setSelectedTicket((prev) => ({ ...prev, ticket_status: "closed" }));
        setSuccessMsg("Replacement confirmed! Ticket has been closed.");
        fetchTickets();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to confirm delivery.");
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 4000); };
  const showError = (msg) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 4000); };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}>
      {/* Toast Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold"
            style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac" }}
          >
            <FiCheckCircle size={16} /> {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold"
            style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}
          >
            <FiAlertCircle size={16} /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ── LIST VIEW ───────────────────────────────────────────────────── */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-black flex items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <FiTool size={22} style={{ color: "var(--color-primary)" }} />
                  Service Tickets
                </h1>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  Raise and track kit item replacement / service requests
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setView("create")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all"
                style={{ background: "var(--gradient-primary)" }}
              >
                <FiPlus size={16} /> Raise Ticket
              </motion.button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-thin">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.key ? "text-white" : ""}`}
                  style={activeTab === tab.key
                    ? { background: "var(--color-primary)", color: "white" }
                    : { background: "var(--color-surface)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                  }
                >
                  {tab.label}
                  {tab.key === "all" && totalTickets > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: activeTab === "all" ? "rgba(255,255,255,0.25)" : "var(--color-primary)", color: "white" }}>
                      {totalTickets}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tickets List */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--color-surface)" }} />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-20 text-center">
                <HiOutlineTicket size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm" style={{ color: "var(--color-text-muted)" }}>No tickets found</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {activeTab === "all" ? "Raise a ticket to get started" : `No ${activeTab.replace("_", " ")} tickets`}
                </p>
                <button
                  onClick={() => setView("create")}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Raise New Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <motion.div
                    key={ticket._id}
                    whileHover={{ y: -1 }}
                    onClick={() => openDetail(ticket)}
                    className="p-4 rounded-2xl cursor-pointer transition-all"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs" style={{ color: "var(--color-primary)" }}>
                            {ticket.ticket_number}
                          </span>
                          <StatusBadge status={ticket.ticket_status} />
                          {ticket.ticket_type && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700">
                              {TICKET_TYPES.find(t => t.value === ticket.ticket_type)?.icon || "📋"} {ticket.ticket_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          {ticket.priority && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                              style={{ color: PRIORITY_CONFIG[ticket.priority]?.color, background: PRIORITY_CONFIG[ticket.priority]?.bg }}>
                              {ticket.priority} Priority
                            </span>
                          )}
                          {ticket.assigned_department && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              Dept: {ticket.assigned_department}
                            </span>
                          )}
                          {ticket.tat_deadline && new Date(ticket.tat_deadline) < new Date() && !['resolved', 'closed', 'rejected'].includes(ticket.ticket_status) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              ⚠️ SLA Overdue
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm mt-1 truncate" style={{ color: "var(--color-text-primary)" }}>
                          {ticket.item_name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {ticket.kit_name && (
                            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                              Kit: {ticket.kit_name}
                            </span>
                          )}
                          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            {ISSUE_CATEGORIES.find((c) => c.value === ticket.issue_category)?.label || ticket.issue_category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(ticket.created_at).toLocaleDateString("en-IN")}
                        </p>
                        <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-semibold"
                          style={{ color: "var(--color-primary)" }}>
                          View <FiChevronRight size={13} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CREATE VIEW (WIZARD) ─────────────────────────────────────────── */}
        {view === "create" && (
          <CreateTicketWizard
            onBack={() => setView("list")}
            onSuccess={(ticketNumber) => {
              setView("list");
              showSuccess(`Ticket ${ticketNumber} raised successfully! Support team will review shortly.`);
            }}
            onError={showError}
          />
        )}

        {/* ── DETAIL VIEW ─────────────────────────────────────────────────── */}
        {view === "detail" && (
          <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => { setView("list"); setSelectedTicket(null); }}
              className="flex items-center gap-1.5 mb-5 text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <FiArrowLeft size={15} /> Back to Tickets
            </button>

            {detailLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--color-surface)" }} />)}
              </div>
            ) : selectedTicket ? (
              <TicketDetail
                ticket={selectedTicket}
                onConfirmDelivery={handleConfirmDelivery}
                confirmingDelivery={confirmingDelivery}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CREATE TICKET WIZARD
// ─────────────────────────────────────────────────────────────────────────────
function CreateTicketWizard({ onBack, onSuccess, onError }) {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    ticket_type: "business_support",
    priority: "medium",
    order_id: "", order_number: "", invoice_number: "",
    kit_id: "", kit_name: "", kit_capacity: "",
    item_name: "", item_serial_number: "",
    issue_category: "other", problem_description: "",
    installation_date: "", installation_address: { line: "", city: "", state: "", pincode: "" },
    project_details: "", warranty_status: "unknown",
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  // Fetch completed orders
  useEffect(() => {
    if (step === 2) {
      setOrdersLoading(true);
      api.get("/india/v1/reseller/po/my-orders")
        .then((res) => {
          if (res.data?.success || res.data?.data) {
            const allOrders = res.data.data?.orders || res.data.data || [];
            setOrders(Array.isArray(allOrders) ? allOrders.filter((o) => ["completed", "delivered", "confirmed"].includes(o.status)) : []);
          }
        })
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    }
  }, [step]);

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const setAddressField = (key, val) => {
    setForm((prev) => ({ ...prev, installation_address: { ...prev.installation_address, [key]: val } }));
  };

  const handleFiles = (newFiles) => {
    const allowed = [...files, ...Array.from(newFiles)].slice(0, 5);
    setFiles(allowed);
  };

  const removeFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const validateStep = () => {
    const errs = {};
    if (step === 1) {
      if (!form.ticket_type) errs.ticket_type = "Please select a ticket category";
    }
    if (step === 3) {
      if (!form.item_name.trim()) errs.item_name = "Subject or Item name is required";
    }
    if (step === 4) {
      if (!form.problem_description.trim()) errs.problem_description = "Please describe the problem or request";
      if (form.problem_description.trim().length < 10) errs.problem_description = "Please provide at least 10 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Step 1: Create ticket
      const payload = { ...form };
      if (!payload.order_id) delete payload.order_id;
      if (!payload.kit_id) delete payload.kit_id;

      let res;
      let ticket_id, ticket_number;
      try {
        res = await api.post("/india/v1/franchise-clusters/tickets/create", payload);
        if (res.data?.status === "success") {
          ticket_id = res.data.data.ticket_id;
          ticket_number = res.data.data.ticket_number;
        }
      } catch (err) {
        res = await api.post("/india/v1/reseller/service-tickets/raise", payload);
        if (!res.data?.success) throw new Error(res.data?.message || "Failed to raise ticket");
        ticket_id = res.data.data.ticket_id;
        ticket_number = res.data.data.ticket_number;
      }

      // Step 2: Upload proof files if any
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        await api.post(`/india/v1/reseller/service-tickets/${ticket_id}/upload-proof`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        }).catch(() => { }); // Non-blocking
      }

      onSuccess(ticket_number);
    } catch (err) {
      onError(err.response?.data?.message || err.message || "Failed to raise ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ["Category & Priority", "Select Order", "Kit Details", "Describe Issue", "Upload Proof"];
  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}>
          <FiArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-black" style={{ color: "var(--color-text-primary)" }}>Raise Service Ticket</h1>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Step {step} of {TOTAL_STEPS}: {stepTitles[step - 1]}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {stepTitles.map((title, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={i + 1 <= step
                  ? { background: "var(--color-primary)", color: "white" }
                  : { background: "var(--color-surface)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }
                }
              >
                {i + 1 < step ? <FiCheck size={14} /> : i + 1}
              </div>
              <span className="text-[10px] hidden sm:block text-center" style={{ color: i + 1 === step ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                {title}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "var(--gradient-primary)" }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 rounded-2xl mb-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <AnimatePresence mode="wait">
          {/* STEP 1: Ticket Category & Priority */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-black text-base mb-1" style={{ color: "var(--color-text-primary)" }}>Ticket Category & Priority</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Select the defined category and priority level for your support or replacement ticket
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    Select Category <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TICKET_TYPES.map((t) => (
                      <div
                        key={t.value}
                        onClick={() => {
                          setField("ticket_type", t.value);
                          if (!form.item_name || ["Business Support Request", "Product Technical Issue", "Replacement Request", "Delivery Material Issue", "Payment & Accounts Query"].includes(form.item_name)) {
                            setField("item_name", t.label);
                          }
                        }}
                        className="p-3.5 rounded-xl cursor-pointer transition-all border text-left"
                        style={{
                          background: form.ticket_type === t.value ? "var(--color-primary)" : "var(--color-bg)",
                          color: form.ticket_type === t.value ? "white" : "var(--color-text-primary)",
                          borderColor: form.ticket_type === t.value ? "var(--color-primary)" : "var(--color-border)",
                        }}
                      >
                        <div className="flex items-center gap-2 font-black text-sm">
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                        </div>
                        <p className={`text-[11px] mt-1 line-clamp-2 ${form.ticket_type === t.value ? "text-white/80" : "text-slate-500"}`}>
                          {t.desc}
                        </p>
                        <div className="mt-2 text-[10px] font-bold opacity-80">
                          Route: {t.defaultDept} • SLA: {t.defaultTat}
                        </div>
                      </div>
                    ))}
                  </div>
                  {errors.ticket_type && <p className="text-[11px] mt-1 text-rose-500">{errors.ticket_type}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setField("priority", k)}
                        className="p-2.5 rounded-xl text-left border transition-all"
                        style={{
                          background: form.priority === k ? v.color : "var(--color-bg)",
                          color: form.priority === k ? "white" : "var(--color-text-primary)",
                          borderColor: form.priority === k ? v.color : "var(--color-border)",
                        }}
                      >
                        <div className="text-xs font-black">{v.label}</div>
                        <div className={`text-[10px] mt-0.5 ${form.priority === k ? "text-white/80" : "text-slate-400"}`}>
                          TAT: {v.tat}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Select Order */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-black text-base" style={{ color: "var(--color-text-primary)" }}>Select Order</h2>
                {["business_support", "payment"].includes(form.ticket_type) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Optional for {form.ticket_type.replace(/_/g, ' ')}</span>
                )}
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Choose the order containing the kit or materials related to this ticket, or proceed directly.
              </p>

              {ordersLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--color-bg)" }} />)}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {orders.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>No completed orders found</p>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>You can still proceed without selecting an order</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order._id}
                        onClick={() => { setField("order_id", order._id); setField("order_number", order.order_number || order._id?.slice(-6)); }}
                        className="p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                        style={{
                          background: form.order_id === order._id ? "var(--color-primary)" : "var(--color-bg)",
                          color: form.order_id === order._id ? "white" : "var(--color-text-primary)",
                          border: `1px solid ${form.order_id === order._id ? "var(--color-primary)" : "var(--color-border)"}`,
                        }}
                      >
                        <div>
                          <p className="text-xs font-bold">{order.order_number || `Order #${order._id?.slice(-6)}`}</p>
                          <p className="text-[11px] opacity-75">{new Date(order.created_at).toLocaleDateString("en-IN")}</p>
                        </div>
                        {form.order_id === order._id && <FiCheck size={16} />}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Manual Order Number Entry */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                  Or enter Order / Invoice Number manually
                </label>
                <input
                  type="text"
                  value={form.order_number}
                  onChange={(e) => { setField("order_number", e.target.value); setField("order_id", ""); }}
                  placeholder="e.g. PO-2026-000123"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                />
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) => setField("invoice_number", e.target.value)}
                  placeholder="Invoice number (optional)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mt-2"
                  style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Kit & Item Details */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-black text-base mb-1" style={{ color: "var(--color-text-primary)" }}>
                {['business_support', 'payment'].includes(form.ticket_type) ? "Request & Subject Details" : "Kit & Item Details"}
              </h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                {['business_support', 'payment'].includes(form.ticket_type)
                  ? "Provide the subject title and any reference details for your support ticket."
                  : "Specify the solar combo kit and affected item that requires service or replacement."}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    {['business_support', 'payment'].includes(form.ticket_type) ? "Request Subject / Title" : "Item / Component Name"}{" "}
                    <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.item_name}
                    onChange={(e) => setField("item_name", e.target.value)}
                    placeholder={
                      form.ticket_type === "business_support"
                        ? "e.g. BDE assistance needed for Rajkot dealer onboarding"
                        : form.ticket_type === "payment"
                          ? "e.g. Commission ledger discrepancy for March 2026"
                          : "e.g. Solar Panel 540W Mono, 5kW Inverter"
                    }
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-bg)", border: `1px solid ${errors.item_name ? "#ef4444" : "var(--color-border)"}`, color: "var(--color-text-primary)" }}
                  />
                  {errors.item_name && <p className="text-[11px] mt-1" style={{ color: "#ef4444" }}>{errors.item_name}</p>}
                </div>

                {['product', 'replacement'].includes(form.ticket_type) && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Kit Name / Type</label>
                        <input
                          type="text"
                          value={form.kit_name}
                          onChange={(e) => setField("kit_name", e.target.value)}
                          placeholder="e.g. Solar On-Grid Kit"
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Kit Capacity</label>
                        <input
                          type="text"
                          value={form.kit_capacity}
                          onChange={(e) => setField("kit_capacity", e.target.value)}
                          placeholder="e.g. 5kW, 10kW"
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Serial / Model Number (Optional)</label>
                      <input
                        type="text"
                        value={form.item_serial_number}
                        onChange={(e) => setField("item_serial_number", e.target.value)}
                        placeholder="Enter item serial number if visible"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Warranty Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {WARRANTY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setField("warranty_status", opt.value)}
                            className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
                            style={form.warranty_status === opt.value
                              ? { background: "var(--color-primary)", color: "white" }
                              : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    Additional Reference / Project Notes (Optional)
                  </label>
                  <textarea
                    value={form.project_details}
                    onChange={(e) => setField("project_details", e.target.value)}
                    placeholder="Enter customer site, quotation ref, or specific context..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Issue Details */}
          {step === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-black text-base mb-1" style={{ color: "var(--color-text-primary)" }}>Describe the Issue</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>Select the issue category and provide a detailed description.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    Issue Category <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ISSUE_CATEGORIES.map((cat) => (
                      <button key={cat.value} onClick={() => setField("issue_category", cat.value)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={form.issue_category === cat.value
                          ? { background: "var(--color-primary)", color: "white", border: "1px solid var(--color-primary)" }
                          : { background: "var(--color-bg)", color: "var(--color-text-secondary)", border: `1px solid ${errors.issue_category ? "#ef4444" : "var(--color-border)"}` }
                        }>
                        <div className="text-lg mb-1">{cat.icon}</div>
                        <div className="text-xs font-bold leading-tight">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                  {errors.issue_category && <p className="text-[11px] mt-1" style={{ color: "#ef4444" }}>{errors.issue_category}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    Problem Description <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <textarea
                    value={form.problem_description}
                    onChange={(e) => setField("problem_description", e.target.value)}
                    placeholder="Describe the issue in detail — what happened, when it started, what you've observed..."
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: "var(--color-bg)", border: `1px solid ${errors.problem_description ? "#ef4444" : "var(--color-border)"}`, color: "var(--color-text-primary)" }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    {errors.problem_description
                      ? <p className="text-[11px]" style={{ color: "#ef4444" }}>{errors.problem_description}</p>
                      : <span />
                    }
                    <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{form.problem_description.length}/3000</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Upload Proof */}
          {step === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-black text-base mb-1" style={{ color: "var(--color-text-primary)" }}>Upload Proof (Optional)</h2>
              <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
                Upload photos, videos or documents showing the issue (up to 5 files, 10MB each).
              </p>

              {/* Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-4"
                style={{ borderColor: "var(--color-primary)", background: "var(--color-bg)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-bg)")}
              >
                <FiUpload size={28} className="mx-auto mb-2" style={{ color: "var(--color-primary)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>Click or drag files here</p>
                <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Photos, videos, PDFs — up to 5 files</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx"
                  onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                      {file.type?.startsWith("image/")
                        ? <FiImage size={18} style={{ color: "var(--color-primary)" }} />
                        : <FiFile size={18} style={{ color: "var(--color-text-muted)" }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{file.name}</p>
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 transition-colors">
                        <FiX size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-5 p-4 rounded-xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-black mb-2" style={{ color: "var(--color-text-primary)" }}>Ticket Summary</p>
                <div className="space-y-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {form.order_number && <div className="flex gap-2"><span className="font-semibold w-24 shrink-0">Order:</span><span>{form.order_number}</span></div>}
                  {form.kit_name && <div className="flex gap-2"><span className="font-semibold w-24 shrink-0">Kit:</span><span>{form.kit_name} {form.kit_capacity}</span></div>}
                  <div className="flex gap-2"><span className="font-semibold w-24 shrink-0">Item:</span><span>{form.item_name}</span></div>
                  <div className="flex gap-2"><span className="font-semibold w-24 shrink-0">Issue:</span><span>{ISSUE_CATEGORIES.find((c) => c.value === form.issue_category)?.label}</span></div>
                  <div className="flex gap-2"><span className="font-semibold w-24 shrink-0">Warranty:</span><span className="capitalize">{form.warranty_status.replace("_", " ")}</span></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={step === 1 ? onBack : () => setStep((s) => s - 1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: "var(--color-surface)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
        >
          <FiChevronLeft size={16} /> {step === 1 ? "Cancel" : "Back"}
        </button>

        {step < TOTAL_STEPS ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md"
            style={{ background: "var(--gradient-primary)" }}
          >
            Next <FiChevronRight size={16} />
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {submitting ? <><FiRefreshCw size={15} className="animate-spin" /> Submitting...</> : <><FiCheck size={16} /> Submit Ticket</>}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TICKET DETAIL VIEW
// ─────────────────────────────────────────────────────────────────────────────
function TicketDetail({ ticket, onConfirmDelivery, confirmingDelivery }) {
  const issueLabel = ISSUE_CATEGORIES.find((c) => c.value === ticket.issue_category)?.label || ticket.issue_category;

  return (
    <div className="space-y-4">
      {/* Ticket Header Card */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--color-text-muted)" }}>TICKET NUMBER</p>
            <h2 className="text-lg font-black" style={{ color: "var(--color-primary)" }}>{ticket.ticket_number}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Raised on {new Date(ticket.created_at).toLocaleString("en-IN")}
            </p>
          </div>
          <StatusBadge status={ticket.ticket_status} />
        </div>

        {/* Item + Issue */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <InfoRow label="Item" value={ticket.item_name} />
          <InfoRow label="Issue Category" value={issueLabel} />
          {ticket.kit_name && <InfoRow label="Kit Type" value={`${ticket.kit_name}${ticket.kit_capacity ? ` (${ticket.kit_capacity})` : ""}`} />}
          {ticket.item_serial_number && <InfoRow label="Serial Number" value={ticket.item_serial_number} />}
          {ticket.order_number && <InfoRow label="Order Number" value={ticket.order_number} />}
          {ticket.invoice_number && <InfoRow label="Invoice Number" value={ticket.invoice_number} />}
          <InfoRow label="Warranty Status" value={ticket.warranty_status?.replace(/_/g, " ")} capitalize />
          {ticket.installation_date && (
            <InfoRow label="Installation Date" value={new Date(ticket.installation_date).toLocaleDateString("en-IN")} />
          )}
        </div>

        {/* Problem Description */}
        <div className="mt-4">
          <p className="text-xs font-bold mb-1" style={{ color: "var(--color-text-muted)" }}>PROBLEM DESCRIPTION</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-primary)" }}>{ticket.problem_description}</p>
        </div>
      </div>

      {/* Replacement Info (if dispatched/delivered) */}
      {["dispatched", "delivered", "closed"].includes(ticket.ticket_status) && ticket.tracking_number && (
        <div className="p-5 rounded-2xl" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
          <p className="text-xs font-black mb-3" style={{ color: "#0369a1" }}>📦 REPLACEMENT DISPATCH INFO</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ticket.shipping_carrier && <InfoRow label="Carrier" value={ticket.shipping_carrier} dark={false} />}
            <InfoRow label="Tracking Number" value={ticket.tracking_number} dark={false} />
            {ticket.dispatched_at && <InfoRow label="Dispatched At" value={new Date(ticket.dispatched_at).toLocaleString("en-IN")} dark={false} />}
            {ticket.replacement_item_details && <InfoRow label="Replacement Item" value={ticket.replacement_item_details} dark={false} />}
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {ticket.ticket_status === "rejected" && ticket.rejection_reason && (
        <div className="p-4 rounded-2xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-xs font-black mb-1" style={{ color: "#dc2626" }}>❌ REJECTION REASON</p>
          <p className="text-sm" style={{ color: "#991b1b" }}>{ticket.rejection_reason}</p>
        </div>
      )}

      {/* Confirm Delivery CTA */}
      {ticket.ticket_status === "delivered" && (
        <div className="p-5 rounded-2xl" style={{ background: "#f0fdf4", border: "1px solid #a7f3d0" }}>
          <p className="font-bold text-sm mb-1" style={{ color: "#15803d" }}>🎉 Replacement Delivered!</p>
          <p className="text-xs mb-3" style={{ color: "#166534" }}>
            Please confirm that you have received the replacement item to close this ticket.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={onConfirmDelivery}
            disabled={confirmingDelivery}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
          >
            {confirmingDelivery ? <><FiRefreshCw size={14} className="animate-spin" /> Confirming...</> : <><FiCheck size={14} /> Confirm Receipt & Close Ticket</>}
          </motion.button>
        </div>
      )}

      {/* Proof Files */}
      {ticket.proof_files?.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs font-black mb-3" style={{ color: "var(--color-text-muted)" }}>UPLOADED PROOF</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ticket.proof_files.map((f, i) => (
              <a key={i} href={`http://localhost:5000${f.file_url}`} target="_blank" rel="noreferrer"
                className="block p-3 rounded-xl text-center transition-all hover:opacity-80"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                {f.file_type === "image"
                  ? <FiImage size={20} className="mx-auto mb-1" style={{ color: "var(--color-primary)" }} />
                  : <FiFile size={20} className="mx-auto mb-1" style={{ color: "var(--color-text-muted)" }} />
                }
                <p className="text-[11px] font-semibold truncate" style={{ color: "var(--color-text-secondary)" }}>
                  {f.file_name || `File ${i + 1}`}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status Timeline */}
      {ticket.status_history?.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs font-black mb-4" style={{ color: "var(--color-text-muted)" }}>STATUS TIMELINE</p>
          <div>
            {ticket.status_history.map((entry, i) => (
              <TimelineStep key={i} entry={entry} isLast={i === ticket.status_history.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Info Row
function InfoRow({ label, value, dark = true, capitalize = false }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: dark ? "var(--color-text-muted)" : "#0369a1", opacity: 0.8 }}>{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${capitalize ? "capitalize" : ""}`} style={{ color: dark ? "var(--color-text-primary)" : "#0c4a6e" }}>
        {value}
      </p>
    </div>
  );
}
