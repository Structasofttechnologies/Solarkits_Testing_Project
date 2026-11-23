import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiMessageSquare,
  FiPlus,
  FiSearch,
  FiChevronRight,
  FiRefreshCw,
  FiArrowLeft,
  FiX,
  FiUser,
  FiTrendingUp,
} from "react-icons/fi";
import api from "../services/api";

const DATE_TABS = [
  { id: "all", label: "All Follow-ups" },
  { id: "today", label: "Due Today" },
  { id: "tomorrow", label: "Due Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
];

export default function EpcQuoteFollowupList() {
  const [activeTab, setActiveTab] = useState("all");
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit / Update Modal
  const [editingFu, setEditingFu] = useState(null);
  const [form, setForm] = useState({
    next_follow_up_date: "",
    follow_up_mode: "call",
    remarks: "",
    probability_pct: 50,
    status: "pending",
  });
  const [saving, setSaving] = useState(false);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const params = { is_trial_kit: false };
      if (activeTab !== "all") params.date_filter = activeTab;
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
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const openEditModal = (fu) => {
    setEditingFu(fu);
    setForm({
      next_follow_up_date: fu.next_follow_up_date
        ? new Date(fu.next_follow_up_date).toISOString().split("T")[0]
        : "",
      follow_up_mode: fu.follow_up_mode || "call",
      remarks: fu.remarks || "",
      probability_pct: fu.probability_pct ?? 50,
      status: fu.status || "pending",
    });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/india/v1/reseller/quotes/follow-ups/${editingFu._id}`, form);
      if (res.data?.status === "success") {
        setEditingFu(null);
        fetchFollowups();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const safeFollowups = Array.isArray(followups) ? followups : [];
  const filtered = safeFollowups.filter((fu) => {
    if (!fu) return false;
    const q = (search || "").toLowerCase();
    const epcName = fu.epc_id?.company_name || fu.epc_id?.name || fu.epc_id?.gstin_legal_name || fu.quote_id?.epc_snapshot?.company_name || "";
    const quoteNum = fu.quote_id?.quote_number || "";
    const remarks = fu.remarks || "";
    return epcName.toLowerCase().includes(q) || quoteNum.toLowerCase().includes(q) || remarks.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/epc-quotes" className="text-slate-400 hover:text-slate-600">
                <FiArrowLeft size={18} />
              </Link>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                EPC Follow-up Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Track sales conversations, scheduled reminders, and client purchase intent
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchFollowups}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-50 transition shadow-sm"
              title="Refresh"
            >
              <FiRefreshCw size={16} />
            </button>
            <Link
              to="/epc-quotes"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition"
            >
              Back to Quotes
            </Link>
          </div>
        </div>

        {/* Search & Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            {DATE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === tab.id
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search EPC, quote #, or notes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Follow-up Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-xs text-slate-400">Loading follow-ups...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <FiCalendar size={36} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Follow-ups in This View</h3>
            <p className="text-xs text-slate-400 mt-1">
              Select a different date tab or schedule a follow-up directly from the quote detail page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((fu) => {
              const isOverdue = fu.next_follow_up_date && new Date(fu.next_follow_up_date) < new Date();
              const quoteId = fu.quote_id?._id || fu.quote_id;
              const epcName = fu.epc_id?.company_name || fu.quote_id?.epc_snapshot?.company_name || "EPC Client";
              const mobile = fu.epc_id?.mobile || fu.quote_id?.epc_snapshot?.mobile;

              return (
                <div
                  key={fu._id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Link
                        to={`/epc-quotes/${quoteId}`}
                        className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        {fu.quote_id?.quote_number || "View Quote"}
                      </Link>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isOverdue
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        {isOverdue ? "Overdue" : fu.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{epcName}</h3>

                    <div className="mt-2 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                        {fu.follow_up_mode === "call" && <FiPhone size={13} className="text-blue-500" />}
                        {fu.follow_up_mode === "whatsapp" && <FiMessageSquare size={13} className="text-emerald-500" />}
                        {fu.follow_up_mode === "email" && <FiMail size={13} className="text-indigo-500" />}
                        <span>Mode: {fu.follow_up_mode}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <FiCalendar size={13} />
                        <span>
                          Due:{" "}
                          <strong className={isOverdue ? "text-red-500" : "text-slate-700 dark:text-slate-300"}>
                            {new Date(fu.next_follow_up_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {fu.remarks && (
                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 line-clamp-3">
                        "{fu.remarks}"
                      </p>
                    )}

                    {fu.probability_pct != null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Intent Probability</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{fu.probability_pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${fu.probability_pct >= 70
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

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mobile && (
                        <a
                          href={`tel:${mobile}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
                          title="Call Client"
                        >
                          <FiPhone size={13} />
                        </a>
                      )}
                      {mobile && (
                        <a
                          href={`https://wa.me/91${mobile}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 hover:bg-emerald-50"
                          title="WhatsApp Client"
                        >
                          <FiMessageSquare size={13} />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => openEditModal(fu)}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs transition"
                    >
                      Update / Reschedule
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {editingFu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Update Follow-up</h3>
                <button onClick={() => setEditingFu(null)} className="text-slate-400 hover:text-slate-600">
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Next Follow-up Date *
                    </label>
                    <input
                      type="date"
                      value={form.next_follow_up_date}
                      onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Mode
                    </label>
                    <select
                      value={form.follow_up_mode}
                      onChange={(e) => setForm({ ...form, follow_up_mode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Latest Remarks *
                  </label>
                  <textarea
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Probability ({form.probability_pct}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={form.probability_pct}
                      onChange={(e) => setForm({ ...form, probability_pct: Number(e.target.value) })}
                      className="w-full accent-amber-500 mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="rescheduled">Rescheduled</option>
                      <option value="interested">Interested</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="order_expected">Order Expected</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFu(null)}
                    className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow"
                  >
                    {saving ? "Saving..." : "Save Changes"}
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
