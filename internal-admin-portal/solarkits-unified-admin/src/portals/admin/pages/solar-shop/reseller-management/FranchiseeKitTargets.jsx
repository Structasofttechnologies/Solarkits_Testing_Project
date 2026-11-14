import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiTarget, FiPlus, FiEdit2, FiTrash2, FiSearch, FiLoader,
  FiCheck, FiX, FiRefreshCw, FiMapPin, FiGlobe, FiMap, FiUser,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Button from "@/components/Button";

const API_BASE = import.meta.env.VITE_API_URL;
const apiFetch = (method, ep, data, params = {}) =>
  axios({
    method,
    url: `${API_BASE}/franchisee/kit-targets${ep}`,
    headers: authHeaderObj(),
    data,
    params: { req_for: method === 'get' ? 'view' : method === 'post' ? 'add' : method === 'put' ? 'edit' : 'delete', unique_id: 'FPO_TARGET', ...params },
  });

const TARGET_TYPES = [
  { value: "GLOBAL", label: "Global", icon: FiGlobe, color: "text-text-secondary", bg: "bg-surface-hover" },
  { value: "PLAN", label: "Plan", icon: FiTarget, color: "text-primary", bg: "bg-info-soft" },
  { value: "STATE", label: "State", icon: FiMap, color: "text-success", bg: "bg-success-soft" },
  { value: "DISTRICT", label: "District", icon: FiMapPin, color: "text-warning", bg: "bg-warning-soft" },
  { value: "FRANCHISEE", label: "Franchisee", icon: FiUser, color: "text-purple-500", bg: "bg-purple-50" },
];

const CALC_STAGES = [
  { value: "ORDERED_QUANTITY", label: "Ordered / Placed PO Quantity" },
  { value: "DELIVERED_QUANTITY", label: "Delivered Quantity" },
  { value: "DISPATCHED_QUANTITY", label: "Dispatched Quantity" },
  { value: "PAID_QUANTITY", label: "Paid Quantity" },
  { value: "APPROVED_PO_QUANTITY", label: "Approved PO Quantity" },
];

const now = new Date();
const EMPTY_FORM = {
  target_type: "GLOBAL", franchisee_id: "", plan_id: "", state_id: "", district_id: "",
  target_quantity: "100", calculation_stage: "DELIVERED_QUANTITY",
  target_month: now.getMonth() + 1, target_year: now.getFullYear(),
  is_recurring: false, carry_forward_enabled: false, grace_period_days: "0",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function FranchiseeKitTargets() {
  const dispatch = useDispatch();
  const [targets, setTargets] = useState([]);
  const [plans, setPlans] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterType, setFilterType] = useState("");
  const [progressData, setProgressData] = useState([]);
  const [activeTab, setActiveTab] = useState("targets");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { req_for: "view", unique_id: "FPO_TARGET" };
      if (filterMonth) params.target_month = filterMonth;
      if (filterYear) params.target_year = filterYear;
      if (filterType) params.target_type = filterType;

      const [targetsRes, plansRes, progressRes] = await Promise.all([
        axios.get(`${API_BASE}/franchisee/kit-targets/list`, { headers: authHeaderObj(), params }),
        axios.get(`${API_BASE}/resellers/plans/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "RSL_PLAN" },
        }),
        axios.get(`${API_BASE}/franchisee/kit-targets/progress`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "FPO_TARGET", target_month: filterMonth, target_year: filterYear },
        }),
      ]);
      setTargets(targetsRes.data.data || []);
      setPlans(plansRes.data.data || []);
      setProgressData(progressRes.data.data || []);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load kit targets." }));
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        target_quantity: Number(form.target_quantity),
        target_month: Number(form.target_month),
        target_year: Number(form.target_year),
        grace_period_days: Number(form.grace_period_days || 0),
        franchisee_id: form.franchisee_id || null,
        plan_id: form.plan_id || null,
        state_id: form.state_id || null,
        district_id: form.district_id || null,
      };
      if (editingId) {
        await apiFetch("put", "/update", { id: editingId, ...payload });
        dispatch(setAlert({ type: "success", message: "Kit target updated." }));
      } else {
        await apiFetch("post", "/add", payload);
        dispatch(setAlert({ type: "success", message: "Kit target created." }));
      }
      setShowModal(false);
      fetchAll();
    } catch (e) {
      dispatch(setAlert({ type: "error", message: e.response?.data?.message || "Failed to save." }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this target?")) return;
    try { await apiFetch("delete", "/delete", { id }); fetchAll(); }
    catch { dispatch(setAlert({ type: "error", message: "Failed to delete." })); }
  };

  const handleRecalculate = async (franchisee_id) => {
    try {
      await apiFetch("post", "/recalculate", { franchisee_id, month: filterMonth, year: filterYear });
      dispatch(setAlert({ type: "success", message: "Progress recalculated." }));
      fetchAll();
    } catch {
      dispatch(setAlert({ type: "error", message: "Recalculation failed." }));
    }
  };

  const statusConfig = {
    EXCEEDED: { label: "Exceeded", color: "text-success", bg: "bg-success-soft" },
    ACHIEVED: { label: "Achieved", color: "text-success", bg: "bg-success-soft" },
    ON_TRACK: { label: "On Track", color: "text-primary", bg: "bg-info-soft" },
    BEHIND: { label: "Behind", color: "text-warning", bg: "bg-warning-soft" },
    LOW_PERFORMANCE: { label: "Low Performance", color: "text-error", bg: "bg-error-soft" },
    NOT_STARTED: { label: "Not Started", color: "text-text-muted", bg: "bg-surface-hover" },
    NO_TARGET: { label: "No Target", color: "text-text-muted", bg: "bg-surface-hover" },
    EXPIRED: { label: "Expired", color: "text-text-muted", bg: "bg-surface-hover" },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiTarget className="text-success" /> Kit Targets & Goal Progress
          </h1>
          <p className="text-text-muted text-sm mt-0.5">Configure monthly kit order targets per plan, state, district, or franchisee</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin-panel/solar-shop/franchise-clusters?tab=goals"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <FiTarget size={14} /> Open Cluster Goal Settings
          </Link>
          <Button id="add-kit-target-btn" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }} leftIcon={<FiPlus />} variant="primary">
            Add Target
          </Button>
        </div>
      </div>

      {/* Cluster Unified Announcement Banner */}
      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
            <FiTarget size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">
              Unified Cluster Goal System is Active
            </div>
            <p className="text-xs text-text-muted">
              Annual EPC goals, active EPC thresholds, and 12-month kit sales quotas are now managed directly under Franchise Cluster Management Hub.
            </p>
          </div>
        </div>
        <Link
          to="/admin-panel/solar-shop/franchise-clusters?tab=goals"
          className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
        >
          Manage Cluster Goals →
        </Link>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none"
          value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none"
          value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none"
          value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Target Types</option>
          {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {/* Tabs */}
        <div className="flex ml-auto gap-1 bg-surface-hover rounded-lg p-1">
          {["targets", "progress"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${activeTab === tab ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><FiLoader className="animate-spin text-primary" size={28} /></div>
      ) : activeTab === "targets" ? (
        /* Targets Table */
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover border-b border-border">
              <tr>
                {["Type", "Scope", "Target Qty", "Stage", "Period", "Recurring", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-text-muted">No targets for this period</td></tr>
              ) : targets.map((t, idx) => {
                const tc = TARGET_TYPES.find((x) => x.value === t.target_type);
                const Icon = tc?.icon || FiGlobe;
                const scopeLabel = t.franchisee_id?.business_name || t.plan_id?.name || t.state_id?.name || t.district_id?.name || "All";
                return (
                  <motion.tr key={t._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tc?.bg} ${tc?.color}`}>
                        <Icon size={11} />{t.target_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{scopeLabel}</td>
                    <td className="px-4 py-3 font-bold text-text-primary text-base">{t.target_quantity?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{t.calculation_stage}</td>
                    <td className="px-4 py-3 text-text-secondary">{MONTHS[t.target_month - 1]} {t.target_year}</td>
                    <td className="px-4 py-3">
                      {t.is_recurring ? <FiCheck className="text-success" /> : <FiX className="text-text-muted" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setForm({ target_type: t.target_type, franchisee_id: t.franchisee_id?._id || "", plan_id: t.plan_id?._id || "", state_id: t.state_id?._id || "", district_id: t.district_id?._id || "", target_quantity: t.target_quantity, calculation_stage: t.calculation_stage, target_month: t.target_month, target_year: t.target_year, is_recurring: t.is_recurring, carry_forward_enabled: t.carry_forward_enabled, grace_period_days: t.grace_period_days }); setEditingId(t._id || t.id); setShowModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-info-soft text-primary"><FiEdit2 size={14} /></button>
                        <button onClick={() => handleDelete(t._id || t.id)} className="p-1.5 rounded-lg hover:bg-error-soft text-error"><FiTrash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Progress Table */
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover border-b border-border">
              <tr>
                {["Franchisee", "Target", "Eligible", "Balance", "Achievement", "Status", "Recalculate"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progressData.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-text-muted">No progress data for this period</td></tr>
              ) : progressData.map((p, idx) => {
                const sc = statusConfig[p.performance_status] || statusConfig.NO_TARGET;
                const pct = p.achievement_pct || 0;
                return (
                  <motion.tr key={p._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{p.franchisee_id?.business_name}</div>
                      <div className="text-[11px] text-text-muted">{p.franchisee_id?.mobile}</div>
                    </td>
                    <td className="px-4 py-3 font-bold">{p.target_quantity?.toLocaleString("en-IN") || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-success">{p.eligible_quantity?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.balance_quantity?.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <motion.div className={`h-full rounded-full ${pct >= 100 ? "bg-success" : pct >= 75 ? "bg-primary" : pct >= 50 ? "bg-warning" : "bg-error"}`}
                            initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8 }} />
                        </div>
                        <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRecalculate(p.franchisee_id?._id)}
                        className="p-1.5 rounded-lg hover:bg-info-soft text-primary transition-colors" title="Recalculate">
                        <FiRefreshCw size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border overflow-y-auto max-h-[90vh]"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-lg font-bold text-text-primary">{editingId ? "Edit Target" : "Add Kit Target"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted"><FiX /></button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4">
                {/* Target Type */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 block">Target Type *</label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_TYPES.map((t) => (
                      <button key={t.value} type="button"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-all ${form.target_type === t.value ? `border-primary ${t.bg} ${t.color}` : "border-border bg-surface hover:border-primary/40 text-text-secondary"}`}
                        onClick={() => setForm({ ...form, target_type: t.value })}>
                        <t.icon size={13} /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scope */}
                {form.target_type === "PLAN" && (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Plan *</label>
                    <select required className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                      value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                      <option value="">Select Plan</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                {form.target_type === "FRANCHISEE" && (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Franchisee ID *</label>
                    <input required className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                      value={form.franchisee_id} onChange={(e) => setForm({ ...form, franchisee_id: e.target.value })}
                      placeholder="Enter Franchisee ID" />
                  </div>
                )}

                {/* Target Qty */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Target Quantity (Kits) *</label>
                  <input required type="number" min="0"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                    value={form.target_quantity} onChange={(e) => setForm({ ...form, target_quantity: e.target.value })} />
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Month *</label>
                    <select required className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                      value={form.target_month} onChange={(e) => setForm({ ...form, target_month: Number(e.target.value) })}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Year *</label>
                    <select required className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                      value={form.target_year} onChange={(e) => setForm({ ...form, target_year: Number(e.target.value) })}>
                      {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* Stage */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Calculation Stage</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none"
                    value={form.calculation_stage} onChange={(e) => setForm({ ...form, calculation_stage: e.target.value })}>
                    {CALC_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  {[["is_recurring", "Recurring Monthly"], ["carry_forward_enabled", "Carry Forward"]].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded accent-primary"
                        checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                      <span className="text-sm text-text-secondary">{label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={saving} leftIcon={saving ? <FiLoader className="animate-spin" /> : <FiCheck />}>
                    {saving ? "Saving…" : editingId ? "Update Target" : "Create Target"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
