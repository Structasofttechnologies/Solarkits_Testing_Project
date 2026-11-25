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
  FiBox,
} from "react-icons/fi";
import api from "../services/api";

const DATE_TABS = [
  { id: "all", label: "All Follow-ups" },
  { id: "today", label: "Due Today" },
  { id: "tomorrow", label: "Due Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "overdue", label: "Overdue" },
];

export default function TrialKitQuoteFollowupList() {
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
    probability_pct: 60,
    status: "pending",
  });
  const [saving, setSaving] = useState(false);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const params = { is_trial_kit: true };
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
      console.error("Failed to load trial follow-ups:", err);
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
      probability_pct: fu.probability_pct ?? 60,
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
      } else {
        alert(res.data?.message || "Failed to update follow-up.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update follow-up.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = followups.filter((fu) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      fu.quote_number?.toLowerCase().includes(q) ||
      fu.epc_name?.toLowerCase().includes(q) ||
      fu.remarks?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Link
            to="/trial-kit-quotes"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition"
          >
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Trial Kit Quote Follow-ups
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Trial Manager
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track and convert scheduled client touchpoints for Trial Kit evaluation proposals
            </p>
          </div>
        </div>

        <button
          onClick={fetchFollowups}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <FiRefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl transition shrink-0 ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Follow-up Cards List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading trial kit follow-ups...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
              <FiCalendar size={22} />
            </div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
              No follow-ups found
            </h4>
            <p className="text-xs text-slate-500">
              There are no trial kit follow-ups scheduled for this filter view.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((fu) => (
              <div
                key={fu._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs text-slate-900 dark:text-white">
                      {fu.quote_number || "Trial Quote"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 capitalize">
                      {fu.follow_up_mode}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                      {fu.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Client: <strong className="text-slate-900 dark:text-white">{fu.epc_name || fu.epc_id?.company_name || "EPC Client"}</strong>
                  </div>

                  {fu.remarks && (
                    <p className="text-xs text-slate-500 italic mt-1">"{fu.remarks}"</p>
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
                      Probability: {fu.probability_pct ?? 50}%
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(fu)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Log Interaction
                  </button>

                  <Link
                    to={`/trial-kit-quotes/${fu.quote_id?._id || fu.quote_id}`}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    View Deal
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPDATE MODAL */}
      <AnimatePresence>
        {editingFu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Update Follow-up Interaction
                </h3>
                <button onClick={() => setEditingFu(null)} className="text-slate-400">
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-3.5 mt-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed / Client Interested</option>
                    <option value="negotiation">Under Negotiation</option>
                    <option value="order_expected">Order Expected Soon</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Next Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={form.next_follow_up_date}
                    onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mode</label>
                  <select
                    value={form.follow_up_mode}
                    onChange={(e) => setForm({ ...form, follow_up_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="meeting">In-Person Meeting</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                  <textarea
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    placeholder="Notes from interaction..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingFu(null)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow"
                  >
                    Save Changes
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
