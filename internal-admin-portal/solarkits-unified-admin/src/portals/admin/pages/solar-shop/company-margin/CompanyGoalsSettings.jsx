import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FiTarget, FiPlus, FiEdit2, FiTrash2, FiCalendar,
  FiTrendingUp, FiTrendingDown, FiMinus, FiAlertTriangle, FiCheck,
} from "react-icons/fi";
import { FaBullseye } from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import Dialog from "@/components/Dialog";
import Loader from "@/components/Loader";

const API_URL = import.meta.env.VITE_API_URL;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const now = new Date();

const EMPTY_FORM = {
  state_id: "", district_id: "", combo_kit_id: "",
  target_month: now.getMonth() + 1, target_year: now.getFullYear(),
  target_quantity: "", target_sales_value: "", target_margin_pct: "",
  on_track_threshold: "80", critical_threshold: "50",
};

// Performance classification
function classify(pct, onTrack = 80, critical = 50) {
  if (pct === null || pct === undefined) return { label: "Pending", color: "text-text-muted", bg: "bg-surface-hover", icon: <FiMinus /> };
  if (pct > 100) return { label: "Above Target", color: "text-success", bg: "bg-success/10", icon: <FiTrendingUp /> };
  if (pct === 100) return { label: "Target Achieved", color: "text-success", bg: "bg-success/10", icon: <FiCheck /> };
  if (pct >= onTrack) return { label: "On Track", color: "text-info", bg: "bg-info/10", icon: <FiTrendingUp /> };
  if (pct >= critical) return { label: "Below Target", color: "text-warning", bg: "bg-warning/10", icon: <FiTrendingDown /> };
  return { label: "Critical", color: "text-danger", bg: "bg-danger/10", icon: <FiAlertTriangle /> };
}

export default function CompanyGoalsSettings({ moduleUniqueId = "ADM_CO_MARGIN" }) {
  const dispatch = useDispatch();
  const { countryName } = useParams();
  const token = useSelector((s) => s.auth.token);

  const [goals, setGoals] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [kits, setKits] = useState([]);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [showHistory, setShowHistory] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch active countries
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(() => ({ data: { countries: [] } }));

      const countries = countriesRes.data?.countries || [];
      const current = countries.find(
        (c) => c.name?.toLowerCase() === countryName?.toLowerCase()
      ) || countries[0] || null;
      setCountryObj(current);

      if (current) {
        const isIndia = current.iso2?.toLowerCase() === "in" || current.name?.toLowerCase() === "india";

        // Fetch states, kits, and goals in parallel, using safe individual catches
        const [statesRes, kitsRes, goalsRes] = await Promise.all([
          axios.post(
            `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
            { country_id: current.id || current._id },
            { headers: authHeaderObj() }
          ).catch((e) => {
            console.error("Failed to load active states:", e);
            return { data: { states: [] } };
          }),

          axios.get(
            `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${current.id || current._id}`,
            { headers: authHeaderObj() }
          ).catch((e) => {
            console.error("Failed to load kits:", e);
            return { data: { data: [] } };
          }),

          axios.get(
            `${API_URL}/company/margin-goals/list?unique_id=${moduleUniqueId}&req_for=view&country_id=${current.id || current._id}&target_month=${filterMonth}&target_year=${filterYear}&include_history=${showHistory}`,
            { headers: authHeaderObj() }
          ).catch((e) => {
            console.error("Failed to load margin goals:", e);
            return { data: { data: [] } };
          }),
        ]);

        const rawKits = kitsRes.data?.data || [];
        const seenKitNames = new Set();
        const cleanKits = rawKits.filter((k) => {
          const nameKey = (k.name || k.kit_name || "").trim().toLowerCase();
          if (!nameKey || seenKitNames.has(nameKey)) return false;
          seenKitNames.add(nameKey);
          return true;
        });

        setStates(statesRes.data?.states || []);
        setKits(cleanKits);
        setGoals(goalsRes.data?.data || []);
      }
    } catch (err) {
      console.error("Error in fetchAll goals data:", err);
      dispatch(setAlert({ type: "error", message: "Failed to load goals data" }));
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId, token, countryName, filterMonth, filterYear, showHistory, dispatch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fetch districts/clusters when form state_id changes
  useEffect(() => {
    if (!form.state_id) {
      setDistricts([]);
      return;
    }
    axios
      .get(`${API_URL}/geolocation/clusters/${form.state_id}?unique_id=${moduleUniqueId}&req_for=view`, {
        headers: authHeaderObj(),
      })
      .then((r) => setDistricts(r.data?.clusters || []))
      .catch((e) => {
        console.error("Error fetching clusters:", e);
        setDistricts([]);
      });
  }, [form.state_id, moduleUniqueId]);

  const setF = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, target_month: filterMonth, target_year: filterYear });
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditingId(goal._id || goal.id);
    setForm({
      state_id:            goal.state_id || "",
      district_id:         goal.district_id || "",
      combo_kit_id:        goal.combo_kit_id || "",
      target_month:        goal.target_month || filterMonth,
      target_year:         goal.target_year || filterYear,
      target_quantity:     String(goal.target_quantity ?? ""),
      target_sales_value:  String(goal.target_sales_value ?? ""),
      target_margin_pct:   String(goal.target_margin_pct ?? ""),
      on_track_threshold:  String(goal.on_track_threshold ?? "80"),
      critical_threshold:  String(goal.critical_threshold ?? "50"),
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.target_quantity || Number(form.target_quantity) < 0) {
      dispatch(setAlert({ type: "warning", message: "Target quantity is required and must be >= 0" }));
      return;
    }
    if (!countryObj) {
      dispatch(setAlert({ type: "error", message: "Active country not identified" }));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        country_id:         countryObj.id || countryObj._id,
        state_id:           form.state_id || null,
        district_id:        form.district_id || null,
        combo_kit_id:       form.combo_kit_id || null,
        target_month:       Number(form.target_month),
        target_year:        Number(form.target_year),
        target_quantity:    Number(form.target_quantity),
        target_sales_value: form.target_sales_value ? Number(form.target_sales_value) : 0,
        target_margin_pct:  form.target_margin_pct !== "" && form.target_margin_pct !== null ? Number(form.target_margin_pct) : null,
        on_track_threshold: Number(form.on_track_threshold || 80),
        critical_threshold: Number(form.critical_threshold || 50),
      };

      if (editingId) {
        await axios.put(
          `${API_URL}/company/margin-goals/update?unique_id=${moduleUniqueId}&req_for=edit`,
          { id: editingId, ...payload },
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Goal updated successfully" }));
      } else {
        await axios.post(
          `${API_URL}/company/margin-goals/add?unique_id=${moduleUniqueId}&req_for=add`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Goal created successfully" }));
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      console.error("Save goal error:", err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to save goal" }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm("Delete this goal record?")) return;
    try {
      await axios.delete(
        `${API_URL}/company/margin-goals/delete?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj(), data: { id: goal._id || goal.id } }
      );
      dispatch(setAlert({ type: "success", message: "Goal deleted successfully" }));
      fetchAll();
    } catch (err) {
      console.error("Delete goal error:", err);
      dispatch(setAlert({ type: "error", message: "Failed to delete goal" }));
    }
  };

  const yearOptions = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 2; y++) {
    yearOptions.push({ value: y, text: String(y) });
  }

  // Summary KPIs
  const totalTarget = goals.reduce((s, g) => s + (Number(g.target_quantity) || 0), 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative rounded-2xl bg-linear-120 from-success to-success-hover shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]" />
        <div className="relative px-6 py-7 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
              <FiTarget className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">Company Goals & Targets</h1>
              <p className="text-white/80 text-xs mt-0.5 font-medium">
                Monthly kit sales goals with historical performance tracking.
              </p>
            </div>
          </div>
          <Button
            onClick={openAdd}
            variant="secondary"
            leftIcon={<FiPlus />}
            className="bg-white text-success border-white hover:bg-white/90 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
          >
            Set Goal
          </Button>
        </div>
      </div>

      {/* Period Filters */}
      <div className="card border-2 border-border p-4 flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <Dropdown
            label="Month"
            value={filterMonth}
            onChange={(v) => setFilterMonth(Number(v))}
            options={MONTHS.map((m, i) => ({ value: i + 1, text: m }))}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="Year"
            value={filterYear}
            onChange={(v) => setFilterYear(Number(v))}
            options={yearOptions}
          />
        </div>
        <div className="flex items-center gap-2 pb-3">
          <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="rounded cursor-pointer"
            />
            Include History
          </label>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Goals Configured", value: goals.length, icon: <FiTarget />, color: "text-success", bg: "bg-success/10" },
          { label: "Total Target Units", value: totalTarget.toLocaleString(), icon: <FaBullseye />, color: "text-primary", bg: "bg-primary/10" },
          { label: "Period", value: `${MONTHS[filterMonth - 1]} ${filterYear}`, icon: <FiCalendar />, color: "text-info", bg: "bg-info/10" },
        ].map((kpi, i) => (
          <div key={i} className="card p-5 border-2 border-border shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} border border-current/10`}>{kpi.icon}</div>
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-text-primary mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Goals Table */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <FiTarget className="text-success" /> Goals for {MONTHS[filterMonth - 1]} {filterYear}
          </h2>
          <span className="text-[10px] font-black text-text-muted bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
            {goals.length} Records
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <Loader text="Loading goals..." />
          ) : goals.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <FiTarget className="mx-auto text-4xl mb-3 opacity-30" />
              <p className="font-bold text-sm">No goals set for this period.</p>
              <p className="text-xs mt-1">Click "Set Goal" above to configure monthly targets.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Scope", "Target Qty", "Target Value", "Target Margin %", "Achievement", "Performance", "Actions"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const achPct = goal.achievement_pct ?? null;
                  const cls = classify(achPct, goal.on_track_threshold, goal.critical_threshold);
                  const stateName = states.find((s) => (s.id || s._id) === goal.state_id)?.name || "All States";
                  const kitName = kits.find((k) => (k.id || k._id) === goal.combo_kit_id)?.name || kits.find((k) => (k.id || k._id) === goal.combo_kit_id)?.kit_name || "All Kits";
                  return (
                    <tr key={goal._id || goal.id} className="border-b border-border/40 hover:bg-surface-hover/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-text-primary">{stateName}</span>
                          <span className="text-text-muted font-medium">{kitName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-bold text-text-primary whitespace-nowrap">
                        {goal.target_quantity?.toLocaleString()} kits
                      </td>
                      <td className="px-3 py-3 font-medium text-text-secondary whitespace-nowrap">
                        {goal.target_sales_value ? `₹${Number(goal.target_sales_value).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-3 py-3 font-medium text-text-secondary whitespace-nowrap">
                        {goal.target_margin_pct != null ? `${goal.target_margin_pct}%` : "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {achPct != null ? (
                          <span className={`font-black ${achPct >= 100 ? "text-success" : achPct >= 80 ? "text-info" : "text-danger"}`}>
                            {achPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-text-muted font-medium">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${cls.color} ${cls.bg} border-current/20`}>
                          {cls.icon} {cls.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEdit(goal)}
                            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/10 cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(goal)}
                            className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 border border-danger/10 cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Goal" : "Set Monthly Goal"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dropdown
              label="Month *"
              value={form.target_month}
              onChange={(v) => setF("target_month", Number(v))}
              options={MONTHS.map((m, i) => ({ value: i + 1, text: m }))}
            />
            <Dropdown
              label="Year *"
              value={form.target_year}
              onChange={(v) => setF("target_year", Number(v))}
              options={yearOptions}
            />
            <Dropdown
              label="State (optional)"
              value={form.state_id}
              onChange={(v) => {
                setF("state_id", v);
                setF("district_id", "");
              }}
              placeholder="All States"
              options={[
                { value: "", text: "All States" },
                ...states.map((s) => ({ value: s.id || s._id, text: s.name }))
              ]}
            />
            <Dropdown
              label="District (optional)"
              value={form.district_id}
              onChange={(v) => setF("district_id", v)}
              placeholder={form.state_id ? "All Districts" : "Select state first"}
              disabled={!form.state_id}
              options={[
                { value: "", text: "All Districts" },
                ...districts.map((d) => ({ value: d.id || d._id, text: d.name }))
              ]}
            />
            <div className="md:col-span-2">
              <Dropdown
                label="Kit (optional — leave blank for all)"
                value={form.combo_kit_id}
                onChange={(v) => setF("combo_kit_id", v)}
                placeholder="All Kits"
                options={[
                  { value: "", text: "All Kits" },
                  ...kits.map((k) => ({ value: k.id || k._id, text: k.name || k.kit_name || "Kit" }))
                ]}
              />
            </div>
            <CustomInput
              label="Target Quantity (kits) *"
              type="number"
              min="0"
              value={form.target_quantity}
              onChange={(e) => setF("target_quantity", e.target.value)}
              placeholder="e.g. 5000"
            />
            <CustomInput
              label="Target Sales Value (₹)"
              type="number"
              min="0"
              value={form.target_sales_value}
              onChange={(e) => setF("target_sales_value", e.target.value)}
              placeholder="e.g. 50000000"
            />
            <CustomInput
              label="Target Margin %"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.target_margin_pct}
              onChange={(e) => setF("target_margin_pct", e.target.value)}
              placeholder="e.g. 10"
            />
            <div className="hidden md:block" />
            <CustomInput
              label="On-Track Threshold (%)"
              type="number"
              min="0"
              max="100"
              value={form.on_track_threshold}
              onChange={(e) => setF("on_track_threshold", e.target.value)}
              helperText="Min % to classify as On Track (Default 80%)"
            />
            <CustomInput
              label="Critical Threshold (%)"
              type="number"
              min="0"
              max="100"
              value={form.critical_threshold}
              onChange={(e) => setF("critical_threshold", e.target.value)}
              helperText="Below this % is Critical (Default 50%)"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="flex-1 rounded-xl font-black uppercase tracking-wider text-xs"
            >
              {editingId ? "Update Goal" : "Save Goal"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
