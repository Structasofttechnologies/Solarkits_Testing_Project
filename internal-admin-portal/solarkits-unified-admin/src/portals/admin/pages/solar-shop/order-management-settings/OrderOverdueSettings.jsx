import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaClock,
  FaCheckCircle,
  FaSave,
  FaUndo,
  FaTruck,
  FaShieldAlt,
  FaInfoCircle,
  FaRegClock,
  FaCheck,
  FaCalendarAlt,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import ToggleButton from "@/components/ToggleButton";
import { authHeaderObj } from "@/app/authHeader";

const rawApiUrl =
  import.meta.env.VITE_ADMIN_API_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/admin-api";
const API_BASE = rawApiUrl.replace(/\/admin-api$|\/api$/, "");
const ADMIN_API = rawApiUrl.endsWith("/admin-api") ? rawApiUrl : `${API_BASE}/admin-api`;

const DEFAULT_STAGES = [
  {
    sequence: 1,
    stage_number: 1,
    stage_key: "CONFIRMED",
    stage_name: "Confirmed (Payment Verified)",
    tat_days: 1,
    tat_hours: 24,
    tat_description: "Advance Payment Verified by Accounts",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 2,
    stage_number: 2,
    stage_key: "PROCESSING",
    stage_name: "Processing (Picking & Packing)",
    tat_days: 2,
    tat_hours: 48,
    tat_description: "Warehouse BOM picking & packing",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 3,
    stage_number: 3,
    stage_key: "VEHICLE_ASSIGNED",
    stage_name: "Vehicle Assigned",
    tat_days: 1,
    tat_hours: 24,
    tat_description: "Vehicle & driver allocated to route",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 4,
    stage_number: 4,
    stage_key: "READY_FOR_DISPATCH",
    stage_name: "Ready for Dispatch / Before Dispatch",
    tat_days: 2,
    tat_hours: 48,
    tat_description: "Staged at gate; Remaining Payment verified before release",
    payment_required: true,
    is_active: true,
  },
  {
    sequence: 5,
    stage_number: 5,
    stage_key: "DISPATCHED",
    stage_name: "Dispatched",
    tat_days: 1,
    tat_hours: 12,
    tat_description: "Vehicle gate exit from warehouse",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 6,
    stage_number: 6,
    stage_key: "IN_TRANSIT",
    stage_name: "In Transit",
    tat_days: 3,
    tat_hours: 72,
    tat_description: "Carrier movement to destination",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 7,
    stage_number: 7,
    stage_key: "REACHED_DESTINATION",
    stage_name: "Reached Destination",
    tat_days: 1,
    tat_hours: 12,
    tat_description: "Arrived at delivery location",
    payment_required: false,
    is_active: true,
  },
  {
    sequence: 8,
    stage_number: 8,
    stage_key: "DELIVERED",
    stage_name: "Delivered",
    tat_days: 1,
    tat_hours: 6,
    tat_description: "Sign-off and customer handover completed",
    payment_required: false,
    is_active: true,
  },
];

export default function OrderOverdueSettings() {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [policyId, setPolicyId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dynamic calculations
  const totalSlaDays = stages.reduce((sum, s) => {
    if (s.is_active === false) return sum;
    const d = Number(s.tat_days) || (s.tat_hours ? Math.max(1, Math.round(Number(s.tat_hours) / 24)) : 1);
    return sum + d;
  }, 0);

  const totalTatHours = stages.reduce((sum, s) => {
    if (s.is_active === false) return sum;
    return sum + (Number(s.tat_hours) || (Number(s.tat_days || 1) * 24));
  }, 0);

  const activeStagesCount = stages.filter((s) => s.is_active !== false).length;

  const fetchStages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${ADMIN_API}/payment-milestones/stages-tat`, {
        headers: authHeaderObj(),
      });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        if (Array.isArray(d.stages) && d.stages.length > 0) {
          setStages(d.stages);
        }
        if (d.policy_id) setPolicyId(d.policy_id);
        if (d.updated_at) setLastUpdated(d.updated_at);
      }
    } catch (err) {
      console.warn("Could not fetch from /stages-tat, attempting fallback:", err?.message);
      try {
        const fallbackRes = await axios.get(`${ADMIN_API}/order-stages-tat`, {
          headers: authHeaderObj(),
        });
        if (fallbackRes.data?.data?.stages) {
          setStages(fallbackRes.data.data.stages);
          if (fallbackRes.data.data.policy_id) setPolicyId(fallbackRes.data.data.policy_id);
        }
      } catch (fbErr) {
        console.warn("Using default initial stages:", fbErr?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStages();
    }
  }, [token]);

  const handleStageFieldChange = (index, field, value) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-sync days and hours if either is modified
      if (field === "tat_days") {
        const d = Math.max(1, Number(value) || 1);
        updated[index].tat_days = d;
        updated[index].tat_hours = d * 24;
      } else if (field === "tat_hours") {
        const h = Math.max(0, Number(value) || 0);
        updated[index].tat_hours = h;
        updated[index].tat_days = Math.max(1, Math.round(h / 24));
      }

      return updated;
    });
  };

  const handleToggleActive = (index) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        is_active: updated[index].is_active === false ? true : false,
      };
      return updated;
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all 8 fulfillment stages to standard industry defaults (12 Days Total SLA)?")) {
      setStages(DEFAULT_STAGES);
      dispatch(setAlert({ type: "info", message: "Fulfillment stages reset to standard 12-day SLA defaults." }));
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        stages,
        order_stages_config: stages,
        policy_id: policyId,
      };

      const res = await axios.put(`${ADMIN_API}/payment-milestones/stages-tat`, payload, {
        headers: authHeaderObj(),
      });

      if (res.data?.success || res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `Order Stages & TAT Configuration saved! Total SLA: ${totalSlaDays} Days.`,
          })
        );
        setLastUpdated(new Date().toISOString());
      } else {
        throw new Error(res.data?.message || "Failed to save configuration");
      }
    } catch (err) {
      console.error("Save stages error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || err.message || "Failed to save order stages",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2">
              <FaClock className="text-primary" /> Order Stages & Turnaround Time (TAT) Configuration
            </h2>
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Live Customer Sync
            </span>
          </div>
          <p className="text-text-secondary text-xs leading-relaxed max-w-3xl">
            Configure target Turnaround Time (TAT in Days & Hours) for each of the 8 fulfillment stages.
            These SLA targets directly calculate the customer's live tracking timeline, stage completion pills, and estimated delivery dates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-surface-hover border border-border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset to standard 12-day baseline"
          >
            <FaUndo size={11} /> Reset Defaults
          </button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md"
          >
            {saving ? <Loader size="sm" /> : <FaSave size={13} />}
            <span>{saving ? "Saving Changes..." : "Save Configuration"}</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SLA Days */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-1.5 hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Total Fulfillment SLA
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <FaCalendarAlt size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {totalSlaDays}
            </span>
            <span className="text-xs font-bold text-text-secondary">Business Days</span>
          </div>
          <p className="text-[11px] text-text-muted">
            Sum of all active stage turnaround windows
          </p>
        </div>

        {/* Total Hours */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-1.5 hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Turnaround Time (TAT)
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <FaRegClock size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {totalTatHours}
            </span>
            <span className="text-xs font-bold text-text-secondary">Total Hours</span>
          </div>
          <p className="text-[11px] text-text-muted">
            End-to-end operational processing SLA
          </p>
        </div>

        {/* Active Stages Count */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-1.5 hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Configured Stages
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <FaCheckCircle size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
              {activeStagesCount} / {stages.length}
            </span>
            <span className="text-xs font-bold text-text-secondary">Stages Enabled</span>
          </div>
          <p className="text-[11px] text-text-muted">
            8-step standardized logistics pipeline
          </p>
        </div>

        {/* Live Customer Status */}
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-1.5 hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Customer Tracking
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <FaTruck size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
              ✓ Synchronized
            </span>
          </div>
          <p className="text-[11px] text-text-muted">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleDateString("en-IN")}` : "Direct DB binding active"}
          </p>
        </div>
      </div>

      {/* ── Visual 8-Step Timeline Preview ───────────────────────────────────── */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center gap-2">
            <FaTruck className="text-primary" /> Live 8-Stage Journey Customer Stepper Preview
          </span>
          <span className="text-[11px] font-semibold text-text-muted">
            Target SLA: <strong>{totalSlaDays} Days</strong>
          </span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-8 gap-2 min-w-[760px] pt-2">
            {stages.map((stg, idx) => {
              const d = Number(stg.tat_days) || (stg.tat_hours ? Math.max(1, Math.round(Number(stg.tat_hours) / 24)) : 1);
              return (
                <div
                  key={stg.stage_key || idx}
                  className={`p-2.5 rounded-xl border text-center space-y-1 transition ${
                    stg.is_active === false
                      ? "opacity-40 bg-surface-hover border-dashed border-border"
                      : "bg-surface-hover/60 border-border hover:border-primary/40"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-black mx-auto flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <p className="text-[11px] font-bold text-text-primary truncate" title={stg.stage_name}>
                    {stg.stage_name.replace(/\(.*\)/, "").trim()}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    ⏱️ {d} Day{d > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 8-Stage Detailed Configuration Table ─────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border bg-surface-hover/30 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-text-primary">
              Stage-by-Stage Turnaround Time (TAT) & Settings
            </h3>
            <p className="text-xs text-text-muted">
              Edit target days and hours for each step. Changes take effect on all orders immediately.
            </p>
          </div>
          <span className="text-xs font-semibold text-text-secondary">
            Total Pipeline SLA: <strong className="text-emerald-600 font-bold">{totalSlaDays} Days</strong>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader text="Loading Stage Configuration..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover/70 text-[11px] font-bold text-text-muted uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-center w-12">#</th>
                  <th className="px-4 py-3 min-w-[200px]">Stage Name & Key</th>
                  <th className="px-4 py-3 min-w-[260px]">Operational Description</th>
                  <th className="px-4 py-3 text-center min-w-[110px]">Target Days</th>
                  <th className="px-4 py-3 text-center min-w-[110px]">Target Hours</th>
                  <th className="px-4 py-3 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stages.map((stg, idx) => {
                  const days = stg.tat_days !== undefined && stg.tat_days !== null && stg.tat_days !== ""
                    ? Number(stg.tat_days)
                    : (stg.tat_hours ? Math.max(1, Math.round(Number(stg.tat_hours) / 24)) : 1);
                  const hours = stg.tat_hours !== undefined && stg.tat_hours !== null && stg.tat_hours !== ""
                    ? Number(stg.tat_hours)
                    : (days * 24);

                  return (
                    <tr
                      key={stg.stage_key || idx}
                      className={`hover:bg-surface-hover/40 transition ${stg.is_active === false ? "opacity-50" : ""}`}
                    >
                      {/* Sequence # */}
                      <td className="px-4 py-3 text-center font-mono font-bold text-text-muted">
                        {idx + 1}
                      </td>

                      {/* Stage Name & Key */}
                      <td className="px-4 py-3 space-y-1">
                        <input
                          type="text"
                          value={stg.stage_name}
                          onChange={(e) => handleStageFieldChange(idx, "stage_name", e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-border bg-surface text-text-primary focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                        <span className="font-mono text-[10px] text-text-muted block">
                          Key: {stg.stage_key}
                        </span>
                      </td>

                      {/* Operational Description */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={stg.tat_description || stg.description || ""}
                          onChange={(e) => handleStageFieldChange(idx, "tat_description", e.target.value)}
                          placeholder="e.g. Advance payment verified by Accounts team..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-surface text-text-secondary focus:ring-1 focus:ring-primary focus:border-primary"
                        />
                      </td>

                      {/* Target Days */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={days}
                            onChange={(e) => handleStageFieldChange(idx, "tat_days", e.target.value)}
                            className="w-16 px-2 py-1.5 text-center text-xs font-black rounded-lg border border-border bg-surface text-text-primary focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <span className="text-text-muted text-[11px] font-bold">d</span>
                        </div>
                      </td>

                      {/* Target Hours */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="1440"
                            value={hours}
                            onChange={(e) => handleStageFieldChange(idx, "tat_hours", e.target.value)}
                            className="w-16 px-2 py-1.5 text-center text-xs font-semibold rounded-lg border border-border bg-surface text-text-primary focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <span className="text-text-muted text-[11px] font-bold">h</span>
                        </div>
                      </td>

                      {/* Active Toggle */}
                      <td className="px-4 py-3 text-center">
                        <ToggleButton
                          isChecked={stg.is_active !== false}
                          onChange={() => handleToggleActive(idx)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 bg-surface-hover/30 border-t border-border flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-secondary">
            <FaInfoCircle className="text-primary" />
            <span>
              Changes saved here update the customer store's 8-step journey tracker, stage duration pills, and estimated delivery dates.
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            {saving ? <Loader size="sm" /> : <FaSave size={12} />}
            <span>{saving ? "Saving..." : "Save Configuration"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
