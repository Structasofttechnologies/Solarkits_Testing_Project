

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiAlertCircle,
  FiLoader,
  FiCheck,
  FiX,
  FiGlobe,
  FiMap,
  FiShield,
  FiUserCheck,
  FiUsers,
  FiGrid,
  FiList,
  FiChevronRight,
  FiRefreshCw,
  FiLayers,
  FiBriefcase,
  FiPhone,
  FiMail,
  FiAward,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_TERRITORY";

const apiFetch = (method, endpoint, data) =>
  axios({ method, url: `${API_BASE}/reseller-mgmt/territories${endpoint}`, headers: authHeaderObj(), data });

const SOURCE_BADGES = {
  admin_override: { label: "Admin Override", bg: "bg-red-500/10 text-red-600 border-red-500/20", icon: FiShield },
  admin_assigned: { label: "Admin Assigned", bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: FiUserCheck },
  plan:           { label: "Plan Default",   bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: FiCheck },
  gst_derived:    { label: "GST Address",    bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: FiMapPin },
};

function SourceBadge({ source }) {
  const cfg = SOURCE_BADGES[source] || SOURCE_BADGES.admin_assigned;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGN TERRITORY MODAL (Supports Pre-filling for specific territory)
// ─────────────────────────────────────────────────────────────────────────────
function AssignTerritoryModal({ resellers = [], initialData = null, onClose, onAssigned }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    reseller_id:      initialData?.reseller_id || "",
    territory_level:  initialData?.territory_level || "district",
    country_id:       initialData?.country_id || "",
    state_id:         initialData?.state_id || "",
    district_id:      initialData?.district_id || "",
    source:           "admin_override",
    override_reason:  "",
  });

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Auto pre-fill address from selected reseller if not pre-set
  useEffect(() => {
    if (initialData?.country_id || !form.reseller_id) return;
    const sel = (resellers || []).find((r) => (r.id || r._id) === form.reseller_id);
    if (sel && sel.address) {
      const addr = sel.address;
      setForm((f) => ({
        ...f,
        country_id: addr.country_id || f.country_id,
        state_id: addr.state_id || f.state_id,
        district_id: addr.district_id || f.district_id,
        territory_level: addr.district_id ? "district" : addr.state_id ? "state" : f.territory_level,
      }));
    }
  }, [form.reseller_id, resellers, initialData]);

  // Fetch Countries
  useEffect(() => {
    axios.get(`${API_BASE}/geolocation/get-countries`, { headers: authHeaderObj() })
      .then((res) => {
        const list = res.data?.countries || res.data?.data || [];
        if (res.data?.status === "success" && Array.isArray(list)) {
          setCountries(list);
          if (!form.country_id && list.length > 0 && !initialData?.country_id) {
            setForm((f) => ({ ...f, country_id: list[0].id || list[0]._id }));
          }
        }
      })
      .catch((e) => console.error(e));
  }, [initialData, form.country_id]);

  // Fetch States when Country changes
  useEffect(() => {
    if (!form.country_id) {
      setStates([]);
      return;
    }
    axios.get(`${API_BASE}/geolocation/get-states?country_id=${form.country_id}`, { headers: authHeaderObj() })
      .then((res) => {
        const list = res.data?.states || res.data?.data || [];
        if (res.data?.status === "success" && Array.isArray(list)) {
          setStates(list);
        } else {
          setStates([]);
        }
      })
      .catch(() => setStates([]));
  }, [form.country_id]);

  // Fetch Districts when State changes
  useEffect(() => {
    if (!form.state_id) {
      setDistricts([]);
      return;
    }
    axios.get(`${API_BASE}/geolocation/get-districts?state_id=${form.state_id}`, { headers: authHeaderObj() })
      .then((res) => {
        const list = res.data?.districts || res.data?.data || [];
        if (res.data?.status === "success" && Array.isArray(list)) {
          setDistricts(list);
        } else {
          setDistricts([]);
        }
      })
      .catch(() => setDistricts([]));
  }, [form.state_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reseller_id || !form.country_id) return;
    setSaving(true);

    try {
      const payload = {
        territory_level: form.territory_level,
        country_id:      form.country_id,
        state_id:        form.territory_level !== "country" ? form.state_id : undefined,
        district_id:     form.territory_level === "district" ? form.district_id : undefined,
        source:          form.source,
        override_reason: form.override_reason.trim() || undefined,
      };

      const res = await apiFetch("post", `/assign/${form.reseller_id}?req_for=add&unique_id=${MODULE_UID}`, payload);
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Territory assigned successfully!" }));
        onAssigned();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Assignment failed" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Assignment failed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border bg-bg/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <FiMapPin size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">Assign Franchise Territory</h3>
              <p className="text-xs text-text-muted">Authorize sales boundary for a franchise partner</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
          {/* Select Reseller */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Select Franchise / Reseller Partner <span className="text-danger">*</span>
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.reseller_id}
              onChange={(e) => setForm({ ...form, reseller_id: e.target.value })}
              required
            >
              <option value="">Select Partner...</option>
              {(resellers || []).map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.business_name} ({r.email}) — {r.commercial_mode || "Reseller"}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Level Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Territory Scope Level <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { level: "country",  label: "Country Level",  desc: "Pan-Nation Access", icon: FiGlobe, color: "text-indigo-500" },
                { level: "state",    label: "State Level",    desc: "Entire State", icon: FiMap, color: "text-emerald-500" },
                { level: "district", label: "District Level", desc: "Single District", icon: FiMapPin, color: "text-amber-500" },
              ].map((item) => {
                const Icon = item.icon;
                const sel = form.territory_level === item.level;
                return (
                  <button
                    key={item.level}
                    type="button"
                    onClick={() => setForm({ ...form, territory_level: item.level })}
                    className={`flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all ${
                      sel
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-bg hover:border-primary/40 hover:bg-surface-hover"
                    }`}
                  >
                    <Icon size={20} className={sel ? "text-primary" : item.color} />
                    <span className={`text-xs font-bold mt-1.5 ${sel ? "text-primary" : "text-text-primary"}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-text-muted">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Hierarchy Pickers */}
          <div className="space-y-3 p-4 rounded-2xl bg-bg/60 border border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <FiLayers size={13} className="text-primary" /> Geographic Boundaries
            </h4>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Country <span className="text-danger">*</span></label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.country_id}
                onChange={(e) => setForm({ ...form, country_id: e.target.value, state_id: "", district_id: "" })}
                required
              >
                <option value="">Select Country...</option>
                {(countries || []).map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* State */}
            {form.territory_level !== "country" && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">State <span className="text-danger">*</span></label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.state_id}
                  onChange={(e) => setForm({ ...form, state_id: e.target.value, district_id: "" })}
                  required
                >
                  <option value="">Select State...</option>
                  {(states || []).map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* District */}
            {form.territory_level === "district" && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">District <span className="text-danger">*</span></label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={form.district_id}
                  onChange={(e) => setForm({ ...form, district_id: e.target.value })}
                  required
                >
                  <option value="">Select District...</option>
                  {(districts || []).map((d) => (
                    <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Assignment Source & Precedence
            </label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              <option value="admin_override">🛡️ Admin Override (Highest Priority)</option>
              <option value="admin_assigned">👤 Admin Assigned (Direct Manual)</option>
              <option value="plan">✨ Plan Default (From Franchise Tier)</option>
              <option value="gst_derived">📍 GST Address (Auto Boundary)</option>
            </select>
          </div>

          {/* Override Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
              Override Justification / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="e.g. Exclusive expansion granted for Western region expansion"
              value={form.override_reason}
              onChange={(e) => setForm({ ...form, override_reason: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.reseller_id || !form.country_id}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/25"
            >
              {saving ? <FiLoader className="animate-spin" size={16} /> : <FiCheck size={16} />}
              Assign Territory
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TERRITORY DETAIL MODAL (Table of Franchise Partners for Selected Territory)
// ─────────────────────────────────────────────────────────────────────────────
function TerritoryDetailModal({ territoryGroup, onClose, onAssignNew, onDeleteTerritory }) {
  if (!territoryGroup) return null;

  const { location_name, scope_level, country, state, district, partners } = territoryGroup;

  const levelColor =
    scope_level === "country"
      ? { bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: FiGlobe, title: "Country Scope" }
      : scope_level === "state"
      ? { bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: FiMap, title: "State Scope" }
      : { bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: FiMapPin, title: "District Scope" };

  const ScopeIcon = levelColor.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-surface rounded-3xl shadow-2xl border border-border w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border bg-bg/60 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border ${levelColor.bg}`}>
              <ScopeIcon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${levelColor.bg}`}>
                  {levelColor.title}
                </span>
                <span className="text-xs font-semibold text-text-muted">
                  {country?.name || "Pan-India"} {state ? `› ${state.name}` : ""} {district ? `› ${district.name}` : ""}
                </span>
              </div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">{location_name}</h2>
              <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5 font-medium">
                <FiUsers className="text-primary" size={14} />
                <span className="font-bold text-primary">{partners.length} Franchise / Reseller Partner{partners.length > 1 ? "s" : ""}</span> assigned to this territory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAssignNew(territoryGroup)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
            >
              <FiPlus size={14} /> Assign Another Partner
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Partners Table */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="border border-border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-text-muted text-xs uppercase tracking-wider text-left">
                  <th className="px-5 py-3.5 font-bold">Franchise Partner</th>
                  <th className="px-5 py-3.5 font-bold">Commercial Mode</th>
                  <th className="px-5 py-3.5 font-bold">Precedence Source</th>
                  <th className="px-5 py-3.5 font-bold">Exclusivity</th>
                  <th className="px-5 py-3.5 font-bold">Remarks / Override</th>
                  <th className="px-5 py-3.5 font-bold">Assigned Date</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {partners.map((p) => {
                  const r = p.reseller;
                  return (
                    <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {r?.business_name ? r.business_name.substring(0, 2).toUpperCase() : "FP"}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary">{r?.business_name || "Franchise Partner"}</div>
                            <div className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                              {r?.email && <span className="flex items-center gap-1"><FiMail size={11} /> {r.email}</span>}
                              {r?.mobile && <span className="flex items-center gap-1"><FiPhone size={11} /> {r.mobile}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-border text-xs font-semibold text-text-secondary">
                          <FiBriefcase size={11} className="text-primary" /> {r?.commercial_mode || "Reseller"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <SourceBadge source={p.precedence_source || p.source} />
                      </td>
                      <td className="px-5 py-4">
                        {p.is_exclusive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <FiAward size={11} /> Exclusive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-text-muted bg-bg border border-border">
                            Shared / Open
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-text-secondary max-w-xs truncate">
                        {p.override_reason || <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="px-5 py-4 text-xs text-text-muted whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onDeleteTerritory(p.id)}
                          className="p-2 rounded-xl text-danger hover:bg-danger-soft transition-colors"
                          title="Revoke Territory Authorization"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-bg/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface border border-border text-text-primary text-xs font-bold hover:bg-surface-hover transition-colors"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ResellerTerritories({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [resellers, setResellers] = useState([]);
  const [selectedResellerId, setSelectedResellerId] = useState("all");
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [selectedTerritoryGroup, setSelectedTerritoryGroup] = useState(null);

  // Filters & View Modes
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [levelFilter, setLevelFilter] = useState("all"); // 'all' | 'country' | 'state' | 'district'
  const [searchQuery, setSearchQuery] = useState("");

  // Load Resellers list
  useEffect(() => {
    axios.get(`${API_BASE}/reseller-mgmt/list?req_for=view&unique_id=${MODULE_UID}&limit=150`, { headers: authHeaderObj() })
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data?.data)) {
          setResellers(res.data.data);
        } else {
          setResellers([]);
        }
      })
      .catch((e) => {
        console.error(e);
        setResellers([]);
      });
  }, []);

  // Fetch territories
  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("get", `/list/${selectedResellerId}?req_for=view&unique_id=${MODULE_UID}`);
      if (res.data?.status === "success" && Array.isArray(res.data?.data)) {
        setTerritories(res.data.data);
      } else {
        setTerritories([]);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load territories" }));
      setTerritories([]);
    } finally {
      setLoading(false);
    }
  }, [selectedResellerId, dispatch]);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  // Group territories by Location Key for the Big Card Grid View
  const groupedTerritories = useMemo(() => {
    const map = new Map();

    (territories || []).forEach((t) => {
      const scopeLevel = t.scope_level || t.territory_level || "district";
      const cId = t.country?.id || t.country?._id || t.country_id || "c0";
      const sId = t.state?.id || t.state?._id || t.state_id || "s0";
      const dId = t.district?.id || t.district?._id || t.district_id || "d0";

      const key = `${scopeLevel}_${cId}_${sId}_${dId}_${t.location_name}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          location_name: t.location_name || "Pan-India / Territory",
          scope_level: scopeLevel,
          country: t.country,
          state: t.state,
          district: t.district,
          country_id: t.country_id || t.country?.id,
          state_id: t.state_id || t.state?.id,
          district_id: t.district_id || t.district?.id,
          partners: [],
        });
      }

      const group = map.get(key);
      const r = t.reseller || (resellers || []).find((res) => (res.id || res._id) === t.reseller_id);
      group.partners.push({
        id: t.id,
        reseller_id: t.reseller_id,
        reseller: r,
        source: t.source,
        precedence_source: t.precedence_source || t.source,
        override_reason: t.override_reason,
        is_exclusive: t.is_exclusive,
        created_at: t.created_at,
        assigned_by: t.assigned_by,
      });
    });

    return Array.from(map.values());
  }, [territories, resellers]);

  // Filtered Territory Groups
  const filteredGroups = useMemo(() => {
    return groupedTerritories.filter((g) => {
      // Level filter
      if (levelFilter !== "all" && g.scope_level !== levelFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLoc = g.location_name.toLowerCase().includes(q);
        const matchCountry = g.country?.name?.toLowerCase().includes(q);
        const matchState = g.state?.name?.toLowerCase().includes(q);
        const matchDistrict = g.district?.name?.toLowerCase().includes(q);
        const matchPartner = g.partners.some(
          (p) =>
            p.reseller?.business_name?.toLowerCase().includes(q) ||
            p.reseller?.email?.toLowerCase().includes(q) ||
            p.reseller?.mobile?.includes(q)
        );
        return matchLoc || matchCountry || matchState || matchDistrict || matchPartner;
      }

      return true;
    });
  }, [groupedTerritories, levelFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalAssignments = territories.length;
    const countriesCount = new Set(territories.map((t) => t.country?.id || t.country_id).filter(Boolean)).size;
    const statesCount = new Set(territories.map((t) => t.state?.id || t.state_id).filter(Boolean)).size;
    const districtsCount = new Set(territories.map((t) => t.district?.id || t.district_id).filter(Boolean)).size;
    const uniquePartners = new Set(territories.map((t) => t.reseller_id).filter(Boolean)).size;

    return { totalAssignments, countriesCount, statesCount, districtsCount, uniquePartners };
  }, [territories]);

  // Handle Delete
  const handleDeleteTerritory = async (territoryId) => {
    if (!window.confirm("Are you sure you want to revoke this territory authorization?")) return;
    try {
      const res = await apiFetch("delete", `/delete/${territoryId}?req_for=delete&unique_id=${MODULE_UID}`);
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Territory removed successfully" }));
        fetchTerritories();
        // Update selected modal group if open
        if (selectedTerritoryGroup) {
          const updated = {
            ...selectedTerritoryGroup,
            partners: selectedTerritoryGroup.partners.filter((p) => p.id !== territoryId),
          };
          if (updated.partners.length === 0) {
            setSelectedTerritoryGroup(null);
          } else {
            setSelectedTerritoryGroup(updated);
          }
        }
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Delete failed" }));
    }
  };

  const handleOpenAssignModal = (prefillData = null) => {
    setModalInitialData(prefillData);
    setAssignModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <FiMapPin size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
                Reseller & Franchise Territory Management
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Assign and manage sales boundaries across Country, State, and District levels with partner allocations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTerritories}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
            title="Refresh Territories"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin text-primary" : ""} />
          </button>

          <button
            onClick={() => handleOpenAssignModal(null)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/25"
          >
            <FiPlus size={18} /> Assign Territory
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
            <FiGlobe size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{stats.countriesCount || 1}</div>
            <div className="text-xs font-semibold text-text-muted">Countries Active</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
            <FiMap size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{stats.statesCount}</div>
            <div className="text-xs font-semibold text-text-muted">States Covered</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
            <FiMapPin size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{stats.districtsCount}</div>
            <div className="text-xs font-semibold text-text-muted">Districts Assigned</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <FiUsers size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-text-primary">{stats.uniquePartners}</div>
            <div className="text-xs font-semibold text-text-muted">Franchise Partners</div>
          </div>
        </div>
      </div>

      {/* ── Control Bar: Reseller Selector, Search, Level Pills, and View Modes ── */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Partner Filter */}
          <div className="flex items-center gap-3 flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary whitespace-nowrap">
              Partner Filter:
            </label>
            <select
              className="w-full max-w-md px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={selectedResellerId}
              onChange={(e) => setSelectedResellerId(e.target.value)}
            >
              <option value="all">🌐 All Franchise Partners (System-Wide Overview)</option>
              {(resellers || []).map((r) => (
                <option key={r.id || r._id} value={r.id || r._id}>
                  {r.business_name} ({r.email}) — Mode: {r.commercial_mode || "Standard"}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input
              type="text"
              placeholder="Search State, District, Partner..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-bg text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <FiX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Level Filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All Territories", icon: FiLayers },
              { id: "country", label: "Country Level", icon: FiGlobe },
              { id: "state", label: "State Level", icon: FiMap },
              { id: "district", label: "District Level", icon: FiMapPin },
            ].map((lvl) => {
              const Icon = lvl.icon;
              const active = levelFilter === lvl.id;
              const count =
                lvl.id === "all"
                  ? groupedTerritories.length
                  : groupedTerritories.filter((g) => g.scope_level === lvl.id).length;

              return (
                <button
                  key={lvl.id}
                  onClick={() => setLevelFilter(lvl.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-border/80"
                  }`}
                >
                  <Icon size={14} />
                  <span>{lvl.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      active ? "bg-white/20 text-white" : "bg-surface text-text-muted border border-border/50"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-bg border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid" ? "bg-surface text-primary shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
              title="Big Block Grid View"
            >
              <FiGrid size={14} /> Grid Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "table" ? "bg-surface text-primary shadow-xs" : "text-text-muted hover:text-text-primary"
              }`}
              title="Full Table View"
            >
              <FiList size={14} /> Master Table
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content View ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted text-sm gap-3">
          <FiLoader className="animate-spin text-primary" size={28} />
          <span className="font-semibold">Loading territory authorizations & partner assignments...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-20 text-center bg-surface rounded-3xl border border-border p-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <FiAlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary">No Territory Assignments Found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No territories match your search term "${searchQuery}". Try another keyword or reset filters.`
              : "No territory authorization rules assigned yet. Assign a new territory boundary to get started."}
          </p>
          <button
            onClick={() => handleOpenAssignModal(null)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all"
          >
            <FiPlus size={15} /> Assign First Territory
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* ═══════════════════════════════════════════════════════════════════════
           BIG BLOCK SIZE GRID VIEW CARDS
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredGroups.map((group) => {
              const { key, location_name, scope_level, country, state, district, partners } = group;

              const isCountry = scope_level === "country";
              const isState = scope_level === "state";

              const badgeColor = isCountry
                ? {
                    cardBorder: "hover:border-indigo-500/50",
                    badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                    icon: FiGlobe,
                    label: "COUNTRY LEVEL",
                    bannerBg: "bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400",
                    headerBg: "from-indigo-500/5 to-transparent",
                  }
                : isState
                ? {
                    cardBorder: "hover:border-emerald-500/50",
                    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    icon: FiMap,
                    label: "STATE LEVEL",
                    bannerBg: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
                    headerBg: "from-emerald-500/5 to-transparent",
                  }
                : {
                    cardBorder: "hover:border-amber-500/50",
                    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    icon: FiMapPin,
                    label: "DISTRICT LEVEL",
                    bannerBg: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
                    headerBg: "from-amber-500/5 to-transparent",
                  };

              const Icon = badgeColor.icon;
              const partnerCount = partners.length;

              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-surface rounded-3xl border border-border shadow-sm ${badgeColor.cardBorder} transition-all duration-300 flex flex-col justify-between overflow-hidden hover:shadow-xl group`}
                >
                  {/* Card Top / Header */}
                  <div>
                    <div className={`p-5 bg-gradient-to-b ${badgeColor.headerBg} border-b border-border/60`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider border ${badgeColor.badge}`}>
                          <Icon size={13} /> {badgeColor.label}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              handleOpenAssignModal({
                                territory_level: scope_level,
                                country_id: group.country_id,
                                state_id: group.state_id,
                                district_id: group.district_id,
                              })
                            }
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Assign another partner to this territory"
                          >
                            <FiPlus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Location Name & Hierarchy */}
                      <h3 className="text-xl font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                        {location_name}
                      </h3>
                      <p className="text-xs text-text-muted font-medium mt-0.5">
                        {country?.name || "India"}
                        {state ? ` › ${state.name}` : ""}
                        {district ? ` › ${district.name}` : ""}
                      </p>
                    </div>

                    {/* Prominent Label / Metric Banner */}
                    <div className="p-5 space-y-4">
                      <div className={`px-4 py-3 rounded-2xl border ${badgeColor.bannerBg} flex items-center justify-between shadow-xs`}>
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-surface shadow-xs text-primary font-bold">
                            <FiUsers size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold tracking-tight">
                              {partnerCount} Franchise Partner{partnerCount > 1 ? "s" : ""} Assigned
                            </div>
                            <div className="text-[11px] opacity-80 font-medium">
                              Territory authorized & active
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-surface/80 border border-current/20">
                          Active
                        </span>
                      </div>

                      {/* Preview of Assigned Partners */}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center justify-between">
                          <span>Assigned Partners</span>
                          <span className="text-[10px] font-semibold text-text-secondary">{partners.length} total</span>
                        </div>

                        <div className="space-y-2">
                          {partners.slice(0, 3).map((p) => {
                            const r = p.reseller;
                            return (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-bg border border-border/80 text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-[10px] shrink-0">
                                    {r?.business_name ? r.business_name.substring(0, 2).toUpperCase() : "FP"}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-text-primary truncate">
                                      {r?.business_name || "Franchise Partner"}
                                    </div>
                                    <div className="text-[10px] text-text-muted truncate">{r?.email || "No email"}</div>
                                  </div>
                                </div>

                                <div className="shrink-0 pl-2">
                                  <SourceBadge source={p.precedence_source || p.source} />
                                </div>
                              </div>
                            );
                          })}

                          {partners.length > 3 && (
                            <div className="text-center py-1 text-[11px] font-bold text-primary">
                              +{partners.length - 3} more franchise partner{partners.length - 3 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Action Button */}
                  <div className="p-4 border-t border-border bg-bg/40 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTerritoryGroup(group)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-primary hover:text-white border border-border text-text-primary text-xs font-bold transition-all shadow-xs group-hover:border-primary/40"
                    >
                      <FiList size={14} />
                      <span>View Details & Partner Table</span>
                      <FiChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           MASTER TABLE VIEW
           ═══════════════════════════════════════════════════════════════════════ */
        <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-text-muted text-xs uppercase tracking-wider text-left">
                  <th className="px-6 py-4 font-bold">Franchise Partner</th>
                  <th className="px-6 py-4 font-bold">Scope Level</th>
                  <th className="px-6 py-4 font-bold">Location Name</th>
                  <th className="px-6 py-4 font-bold">Precedence Source</th>
                  <th className="px-6 py-4 font-bold">Override Reason</th>
                  <th className="px-6 py-4 font-bold">Assigned Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {territories.map((t) => {
                  const r = t.reseller || (resellers || []).find((res) => (res.id || res._id) === t.reseller_id);
                  const scopeLevel = t.scope_level || t.territory_level || "district";
                  return (
                    <tr key={t.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">{r ? r.business_name : "General System"}</div>
                        <div className="text-xs text-text-muted">{r ? r.email : ""}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg border border-border text-xs font-bold uppercase tracking-wider text-text-secondary">
                          {scopeLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">{t.location_name}</td>
                      <td className="px-6 py-4">
                        <SourceBadge source={t.precedence_source || t.source} />
                      </td>
                      <td className="px-6 py-4 text-text-secondary text-xs">{t.override_reason || "—"}</td>
                      <td className="px-6 py-4 text-text-muted text-xs">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteTerritory(t.id)}
                          className="p-1.5 rounded-lg text-danger hover:bg-danger-soft transition-colors"
                          title="Remove Territory Authorization"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Assign Territory Modal ── */}
      {assignModal && (
        <AssignTerritoryModal
          resellers={resellers}
          initialData={modalInitialData}
          onClose={() => {
            setAssignModal(false);
            setModalInitialData(null);
          }}
          onAssigned={fetchTerritories}
        />
      )}

      {/* ── Territory Detail Drill-Down Modal (Table View of Partners) ── */}
      {selectedTerritoryGroup && (
        <TerritoryDetailModal
          territoryGroup={selectedTerritoryGroup}
          onClose={() => setSelectedTerritoryGroup(null)}
          onAssignNew={(group) => {
            setSelectedTerritoryGroup(null);
            handleOpenAssignModal({
              territory_level: group.scope_level,
              country_id: group.country_id,
              state_id: group.state_id,
              district_id: group.district_id,
            });
          }}
          onDeleteTerritory={handleDeleteTerritory}
        />
      )}
    </div>
  );
}
