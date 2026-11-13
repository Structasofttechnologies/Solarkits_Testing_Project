import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiBarChart2, FiDownload, FiAlertTriangle, FiCheck, FiX,
  FiLoader, FiRefreshCw, FiMapPin, FiFilter, FiUser,
  FiTrendingUp, FiTrendingDown, FiTarget, FiPackage,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Button from "@/components/Button";

const API_BASE = import.meta.env.VITE_API_URL;
const apiFetch = (method, ep, data, params = {}) =>
  axios({
    method,
    url: `${API_BASE}/franchisee/performance${ep}`,
    headers: authHeaderObj(),
    data,
    params: { req_for: method === 'get' ? 'view' : method === 'post' ? 'add' : method === 'put' ? 'edit' : 'delete', unique_id: 'FPO_ANALYTICS', ...params },
  });

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const NOW    = new Date();

const STATUS_CONFIG = {
  EXCEEDED:        { label: "Exceeded",        bg: "bg-success-soft",  text: "text-success",  bar: "bg-success" },
  ACHIEVED:        { label: "Achieved",        bg: "bg-success-soft",  text: "text-success",  bar: "bg-success" },
  ON_TRACK:        { label: "On Track",        bg: "bg-info-soft",     text: "text-primary",  bar: "bg-primary" },
  BEHIND:          { label: "Behind",          bg: "bg-warning-soft",  text: "text-warning",  bar: "bg-warning" },
  LOW_PERFORMANCE: { label: "Low Performance", bg: "bg-error-soft",    text: "text-error",    bar: "bg-error"   },
  NOT_STARTED:     { label: "Not Started",     bg: "bg-surface-hover", text: "text-text-muted",bar: "bg-border" },
  NO_TARGET:       { label: "No Target",       bg: "bg-surface-hover", text: "text-text-muted",bar: "bg-border" },
  EXPIRED:         { label: "Expired",         bg: "bg-surface-hover", text: "text-text-muted",bar: "bg-border" },
};

function SummaryCard({ icon: Icon, label, value, sub, color = "text-primary", bg = "bg-info-soft" }) {
  return (
    <motion.div className="rounded-xl border border-border bg-surface p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
      whileHover={{ y: -2 }}>
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary font-medium">{label}</p>
        {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function FranchiseePerformanceTracker() {
  const dispatch = useDispatch();
  const [data, setData]         = useState(null);
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tracker");
  const [filterMonth, setFilterMonth] = useState(NOW.getMonth() + 1);
  const [filterYear, setFilterYear]   = useState(NOW.getFullYear());
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan, setFilterPlan]   = useState("");
  const [plans, setPlans]       = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail]     = useState(null);

  const fetchTracker = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: filterMonth, year: filterYear };
      if (filterStatus) params.performance_status = filterStatus;
      if (filterPlan)   params.plan_id = filterPlan;

      const [trackerRes, plansRes, alertsRes] = await Promise.all([
        apiFetch("get", "/tracker", null, params),
        axios.get(`${API_BASE}/resellers/plans/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "RSL_PLAN" },
        }),
        apiFetch("get", "/alerts", null, { status: "PENDING" }),
      ]);
      setData(trackerRes.data.data);
      setPlans(plansRes.data.data || []);
      setAlerts(alertsRes.data.data || []);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load performance data." }));
    } finally {
      setLoading(false);
      setAlertsLoading(false);
    }
  }, [filterMonth, filterYear, filterStatus, filterPlan]);

  useEffect(() => { fetchTracker(); }, [fetchTracker]);

  const fetchDetail = async (franchisee_id) => {
    setDetailId(franchisee_id);
    try {
      const res = await apiFetch("get", `/franchisee/${franchisee_id}`, null, {});
      setDetail(res.data.data);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load franchisee details." }));
    }
  };

  const resolveAlert = async (id) => {
    try {
      await apiFetch("put", "/alerts/resolve", { id });
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to resolve alert." }));
    }
  };

  const exportCsv = async () => {
    try {
      const res = await axios.get(`${API_BASE}/franchisee/performance/export/csv`, {
        headers: authHeaderObj(),
        params: { month: filterMonth, year: filterYear },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `performance_${filterYear}_${filterMonth}.csv`; a.click();
    } catch {
      dispatch(setAlert({ type: "error", message: "Export failed." }));
    }
  };

  const TABS = [
    { id: "tracker", label: "Performance Tracker" },
    { id: "alerts",  label: `Alerts (${alerts.length})` },
    { id: "location",label: "Location View" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiBarChart2 className="text-primary" /> Performance Tracker
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            State & district-wise franchisee performance analytics and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin-panel/solar-shop/franchise-clusters?tab=performance"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <FiBarChart2 size={14} /> Open Cluster Performance Dashboard
          </Link>
          <Button variant="secondary" leftIcon={<FiDownload />} onClick={exportCsv}>Export CSV</Button>
          <Button variant="ghost" leftIcon={<FiRefreshCw />} onClick={fetchTracker}>Refresh</Button>
        </div>
      </div>

      {/* Cluster Unified Announcement Banner */}
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0">
            <FiTarget size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">
              Live Cluster-Wise Goals & Performance Available
            </div>
            <p className="text-xs text-text-muted">
              Goals and real-time achievements across India clusters, EPC conversions, and monthly kit sales are accessible in the dedicated cluster dashboard.
            </p>
          </div>
        </div>
        <Link
          to="/admin-panel/solar-shop/franchise-clusters?tab=performance"
          className="shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
        >
          View Cluster Dashboard →
        </Link>
      </div>

      {/* Filters */}
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
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none"
          value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
          <option value="">All Plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {/* Tabs */}
        <div className="flex ml-auto gap-1 bg-surface-hover rounded-lg p-1">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><FiLoader className="animate-spin text-primary" size={32} /></div>
      ) : activeTab === "tracker" && data ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard icon={FiUser}        label="Total Franchisees"  value={data.summary.total}         color="text-primary"  bg="bg-info-soft" />
            <SummaryCard icon={FiCheck}       label="Achieved / Exceeded" value={data.summary.achieved}      color="text-success"  bg="bg-success-soft" />
            <SummaryCard icon={FiTrendingUp}  label="On Track"           value={data.summary.on_track}      color="text-primary"  bg="bg-info-soft" />
            <SummaryCard icon={FiTrendingDown}label="Behind / Low"       value={data.summary.behind}        color="text-error"    bg="bg-error-soft" />
            <SummaryCard icon={FiPackage}     label="Total Eligible Kits"value={data.summary.total_eligible?.toLocaleString("en-IN")} color="text-success" bg="bg-success-soft" />
            <SummaryCard icon={FiTarget}      label="Avg Achievement"    value={`${data.summary.avg_achievement}%`} color="text-warning" bg="bg-warning-soft" />
          </div>

          {/* Franchisee Table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover border-b border-border">
                <tr>
                  {["Franchisee", "Plan", "Target", "Eligible", "Balance", "Achievement", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.franchisees.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-text-muted">No data for this period</td></tr>
                ) : data.franchisees.map((row, idx) => {
                  const f = row.franchisee_id || {};
                  const sc = STATUS_CONFIG[row.performance_status] || STATUS_CONFIG.NO_TARGET;
                  const pct = Math.min(row.achievement_pct || 0, 100);
                  return (
                    <motion.tr key={row._id || idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="border-b border-border/50 hover:bg-surface-hover/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-primary">{f.business_name}</div>
                        <div className="text-[11px] text-text-muted">{f.mobile}</div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{f.plan_subscription_id?.plan_id?.name || "—"}</td>
                      <td className="px-4 py-3 font-semibold">{row.target_quantity?.toLocaleString("en-IN") || "—"}</td>
                      <td className="px-4 py-3 font-semibold text-success">{row.eligible_quantity?.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-text-secondary">{row.balance_quantity?.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${sc.bar}`}
                              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} />
                          </div>
                          <span className="text-xs font-semibold text-text-secondary">{(row.achievement_pct || 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => fetchDetail(f._id)} className="text-xs font-semibold text-primary hover:underline">
                          View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "alerts" ? (
        <div className="space-y-3">
          {alertsLoading ? (
            <div className="flex justify-center py-12"><FiLoader className="animate-spin text-primary" size={24} /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <FiCheck size={40} className="mx-auto text-success mb-3" />
              <p className="font-semibold">No pending alerts</p>
            </div>
          ) : alerts.map((alert) => (
            <motion.div key={alert._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-warning/30 bg-warning-soft">
              <FiAlertTriangle className="text-warning flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-text-primary text-sm">{alert.alert_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {alert.franchisee_id?.business_name} · {MONTHS[(alert.period_month || 1) - 1]} {alert.period_year}
                  {alert.actual_value != null && ` · Actual: ${alert.actual_value}`}
                </p>
              </div>
              <button onClick={() => resolveAlert(alert._id)}
                className="p-2 rounded-lg hover:bg-success-soft text-success transition-colors" title="Resolve">
                <FiCheck size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      ) : activeTab === "location" ? (
        <div className="text-center py-16 text-text-muted">
          <FiMapPin size={40} className="mx-auto text-primary mb-3" />
          <p className="font-semibold text-text-primary">State & District Analytics</p>
          <p className="text-sm">Location breakdown fetched via GET /franchisee/performance/location</p>
        </div>
      ) : null}

      {/* Franchisee Detail Drawer */}
      <AnimatePresence>
        {detailId && detail && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setDetailId(null); setDetail(null); }}>
            <motion.div className="bg-surface w-full max-w-md h-full overflow-y-auto p-6 space-y-4 border-l border-border"
              initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-text-primary text-lg">Franchisee Detail</h3>
                <button onClick={() => { setDetailId(null); setDetail(null); }} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted">
                  <FiX />
                </button>
              </div>
              {/* 6-month history chart */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Last 6 Months</p>
                {(detail.history || []).map((h) => {
                  const pct = Math.min(h.achievement_pct || 0, 120);
                  const sc = STATUS_CONFIG[h.performance_status] || STATUS_CONFIG.NO_TARGET;
                  return (
                    <div key={`${h.target_year}-${h.target_month}`} className="flex items-center gap-3">
                      <span className="text-[11px] text-text-muted w-12 text-right">{MONTHS[h.target_month - 1]}</span>
                      <div className="flex-1 h-4 bg-border rounded-full overflow-hidden">
                        <motion.div className={`h-full rounded-full ${sc.bar}`}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.6 }} />
                      </div>
                      <span className="text-xs font-semibold text-text-secondary w-14 text-right">{(h.achievement_pct || 0).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
              {/* MoM change */}
              {detail.mom_change_pct != null && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${detail.mom_change_pct >= 0 ? "bg-success-soft" : "bg-error-soft"}`}>
                  {detail.mom_change_pct >= 0 ? <FiTrendingUp className="text-success" /> : <FiTrendingDown className="text-error" />}
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Month-over-Month</p>
                    <p className={`text-lg font-bold ${detail.mom_change_pct >= 0 ? "text-success" : "text-error"}`}>
                      {detail.mom_change_pct >= 0 ? "+" : ""}{detail.mom_change_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
              {/* Recent POs */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Recent POs</p>
                {(detail.recent_pos || []).map((po) => (
                  <div key={po._id} className="flex items-center justify-between p-3 rounded-lg border border-border mb-1">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{po.po_number}</p>
                      <p className="text-[11px] text-text-muted">{po.status} · ₹{((po.grand_total_paise || 0) / 100).toLocaleString("en-IN")}</p>
                    </div>
                    <span className="text-[11px] text-success font-semibold">
                      Comm: ₹{((po.total_commission_paise || 0) / 100).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
