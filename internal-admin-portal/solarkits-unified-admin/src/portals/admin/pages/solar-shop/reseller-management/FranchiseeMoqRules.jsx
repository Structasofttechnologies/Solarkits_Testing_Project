import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiLayers,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiSearch,
  FiAlertCircle,
  FiLoader,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiInfo,
  FiPackage,
  FiTag,
  FiCpu,
  FiSliders,
  FiActivity,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";
import Button from "@/components/Button";

const API_BASE = import.meta.env.VITE_API_URL;
const apiFetch = (method, endpoint, data, params = {}) =>
  axios({
    method,
    url: `${API_BASE}/franchisee/moq-rules${endpoint}`,
    headers: authHeaderObj(),
    data,
    params: {
      req_for: method === "get" ? "view" : method === "post" ? "add" : method === "put" ? "edit" : "delete",
      unique_id: "FPO_MOQ",
      ...params,
    },
  });

const EMPTY_FORM = {
  industry_type_id: "",
  category_id: "",
  subcategory_id: "",
  system_type_id: "",
  project_range_id: "",
  combo_kit_id: "",
  plan_id: "",
  moq: "1",
  increment_quantity: "1",
  max_quantity: "",
  po_quantity_limit: "",
  priority: "0",
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: "",
};

export default function FranchiseeMoqRules() {
  const dispatch = useDispatch();
  const [rules, setRules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [liveQty, setLiveQty] = useState({ qty: "", result: null, checking: false });

  // Cascading Hierarchy Options
  const [industries, setIndustries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [projectRanges, setProjectRanges] = useState([]);
  const [comboKits, setComboKits] = useState([]);

  // Fetch Rules & Global Options
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE}/franchisee/moq-rules/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "FPO_MOQ" },
        }),
        axios.get(`${API_BASE}/resellers/plans/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "RSL_PLAN" },
        }),
        axios.get(`${API_BASE}/industry-types/list`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "FPO_MOQ", active_only: "true" },
        }),
        axios.get(`${API_BASE}/combo-kits/india/get-kits`, {
          headers: authHeaderObj(),
          params: { req_for: "view", unique_id: "FPO_MOQ", is_custom: "false" },
        }),
      ]);
      const [rulesRes, plansRes, indRes, kitsRes] = results;
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value.data.data || []);
      if (plansRes.status === "fulfilled") setPlans(plansRes.value.data.data || []);
      if (indRes.status === "fulfilled") setIndustries(indRes.value.data.data || []);
      if (kitsRes.status === "fulfilled") setComboKits(kitsRes.value.data.data || []);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load MOQ rules." }));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 1. When Industry changes -> Load Categories
  useEffect(() => {
    if (!form.industry_type_id) {
      setCategories([]);
      return;
    }
    axios
      .get(`${API_BASE}/project-types/get-categories`, {
        headers: authHeaderObj(),
        params: { req_for: "view", unique_id: "FPO_MOQ", industry_type_id: form.industry_type_id },
      })
      .then((res) => setCategories(res.data.data || []))
      .catch((e) => console.error("Error loading categories:", e));
  }, [form.industry_type_id]);

  // 2. When Category changes -> Load Sub-Categories
  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      return;
    }
    axios
      .get(`${API_BASE}/project-types/get-subcategories`, {
        headers: authHeaderObj(),
        params: { req_for: "view", unique_id: "FPO_MOQ", category_id: form.category_id },
      })
      .then((res) => setSubcategories(res.data.data || []))
      .catch((e) => console.error("Error loading subcategories:", e));
  }, [form.category_id]);

  // 3. When Sub-Category changes -> Load System Types
  useEffect(() => {
    if (!form.subcategory_id) {
      setSystemTypes([]);
      return;
    }
    axios
      .get(`${API_BASE}/project-types/get-subcategory-types`, {
        headers: authHeaderObj(),
        params: { req_for: "view", unique_id: "FPO_MOQ", subcategory_id: form.subcategory_id },
      })
      .then((res) => setSystemTypes(res.data.data || []))
      .catch((e) => console.error("Error loading system types:", e));
  }, [form.subcategory_id]);

  // 4. When System Type changes -> Load Capacity Ranges
  useEffect(() => {
    const params = { req_for: "view", unique_id: "FPO_MOQ" };
    if (form.system_type_id) params.subcategory_type_id = form.system_type_id;
    axios
      .get(`${API_BASE}/project-types/get-ranges`, {
        headers: authHeaderObj(),
        params,
      })
      .then((res) => setProjectRanges(res.data.data || []))
      .catch((e) => console.error("Error loading ranges:", e));
  }, [form.system_type_id]);

  // Filter Matching Combo Kits based on 5-level hierarchy selections
  const matchingKits = useMemo(() => {
    return comboKits.filter((k) => {
      if (form.industry_type_id && k.industry_type_id && (k.industry_type_id?._id || k.industry_type_id) !== form.industry_type_id) {
        return false;
      }
      if (form.category_id && k.category_id && (k.category_id?._id || k.category_id) !== form.category_id) {
        return false;
      }
      if (form.subcategory_id && k.subcategory_id && (k.subcategory_id?._id || k.subcategory_id) !== form.subcategory_id) {
        return false;
      }
      if (form.system_type_id && (k.system_type_id || k.subcategory_type_id)) {
        const sid = k.system_type_id?._id || k.system_type_id || k.subcategory_type_id?._id || k.subcategory_type_id;
        if (sid !== form.system_type_id) return false;
      }
      if (form.project_range_id && k.project_range_id && (k.project_range_id?._id || k.project_range_id) !== form.project_range_id) {
        return false;
      }
      return true;
    });
  }, [comboKits, form.industry_type_id, form.category_id, form.subcategory_id, form.system_type_id, form.project_range_id]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setLiveQty({ qty: "", result: null, checking: false });
    setShowModal(true);
  };

  const openEdit = (r) => {
    setForm({
      industry_type_id: r.industry_type_id?._id || r.industry_type_id || "",
      category_id:      r.category_id?._id      || r.category_id      || "",
      subcategory_id:   r.subcategory_id?._id   || r.subcategory_id   || "",
      system_type_id:   r.system_type_id?._id   || r.system_type_id   || r.project_type_id?._id || r.project_type_id || "",
      project_range_id: r.project_range_id?._id || r.project_range_id || "",
      combo_kit_id:     r.combo_kit_id?._id     || r.combo_kit_id     || "",
      plan_id:          r.plan_id?._id          || r.plan_id          || "",
      moq:              r.moq ?? "1",
      increment_quantity: r.increment_quantity ?? "1",
      max_quantity:     r.max_quantity ?? "",
      po_quantity_limit: r.po_quantity_limit ?? "",
      priority:         r.priority ?? "0",
      valid_from:       r.valid_from?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      valid_until:      r.valid_until?.slice(0, 10) || "",
    });
    setEditingId(r._id || r.id);
    setLiveQty({ qty: "", result: null, checking: false });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        industry_type_id: form.industry_type_id || null,
        category_id:      form.category_id      || null,
        subcategory_id:   form.subcategory_id   || null,
        system_type_id:   form.system_type_id   || null,
        project_type_id:  form.system_type_id   || null,
        project_range_id: form.project_range_id || null,
        combo_kit_id:     form.combo_kit_id     || null,
        plan_id:          form.plan_id          || null,
        moq:              Number(form.moq),
        increment_quantity: Number(form.increment_quantity),
        max_quantity:      form.max_quantity      ? Number(form.max_quantity)      : null,
        po_quantity_limit: form.po_quantity_limit ? Number(form.po_quantity_limit) : null,
        priority:          Number(form.priority),
        valid_from:        form.valid_from,
        valid_until:       form.valid_until || null,
      };
      if (editingId) {
        await apiFetch("put", "/update", { id: editingId, ...payload });
        dispatch(setAlert({ type: "success", message: "MOQ rule updated successfully." }));
      } else {
        await apiFetch("post", "/add", payload);
        dispatch(setAlert({ type: "success", message: "MOQ rule created successfully." }));
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
    if (!window.confirm("Delete this MOQ rule?")) return;
    try {
      await apiFetch("delete", "/delete", { id });
      dispatch(setAlert({ type: "success", message: "Rule deleted." }));
      fetchAll();
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to delete." }));
    }
  };

  const checkQuantity = async () => {
    if (!liveQty.qty) return;
    setLiveQty((prev) => ({ ...prev, checking: true, result: null }));
    try {
      const res = await axios.post(
        `${API_BASE}/franchisee/moq-rules/validate-quantity`,
        {
          plan_id: form.plan_id || null,
          combo_kit_id: form.combo_kit_id || null,
          project_range_id: form.project_range_id || null,
          system_type_id: form.system_type_id || null,
          project_type_id: form.system_type_id || null,
          industry_type_id: form.industry_type_id || null,
          quantity: Number(liveQty.qty),
        },
        { headers: authHeaderObj() }
      );
      setLiveQty((prev) => ({ ...prev, result: res.data.data, checking: false }));
    } catch {
      setLiveQty((prev) => ({ ...prev, checking: false }));
    }
  };

  const filtered = rules.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.combo_kit_id?.name || r.combo_kit_id?.kit_name || "").toLowerCase().includes(q) ||
      (r.category_id?.name || "").toLowerCase().includes(q) ||
      (r.system_type_id?.name || r.project_type_id?.name || "").toLowerCase().includes(q) ||
      (r.industry_type_id?.name || "").toLowerCase().includes(q) ||
      (r.plan_id?.name || "Global").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiLayers className="text-warning" /> Project-Type & Product MOQ Rules
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Configure 5-level hierarchy-based minimum order quantities, batch increments, and limits for Franchisee PO ordering
          </p>
        </div>
        <Button id="add-moq-rule-btn" onClick={openAdd} leftIcon={<FiPlus />} variant="primary">
          Add MOQ Rule
        </Button>
      </div>

      {/* Formula Info Banner */}
      <div className="rounded-2xl border border-primary/20 bg-info-soft/40 p-4 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <FiSliders size={18} />
        </div>
        <div className="text-sm text-text-secondary">
          <div className="font-bold text-text-primary mb-0.5">5-Level Hierarchy & MOQ Formula Logic:</div>
          <p className="text-xs text-text-muted leading-relaxed">
            Order Qty <strong>Q ≥ MOQ</strong> &nbsp;and&nbsp; <strong>(Q − MOQ) % Increment === 0</strong> &nbsp;and&nbsp; <strong>Q ≤ Max Qty</strong>.
            <br />
            Product-level MOQ overrides Capacity Range rules, which override System Type, Category, and Global defaults.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={15} />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Search by product, category, system type, or plan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Rules Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <FiLoader className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/80 border-b border-border text-xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold">Hierarchy Scope / Product</th>
                <th className="text-left px-4 py-3.5 font-semibold">Franchisee Plan</th>
                <th className="text-left px-4 py-3.5 font-semibold">MOQ & Increment</th>
                <th className="text-left px-4 py-3.5 font-semibold">Limits (Max / PO)</th>
                <th className="text-center px-3 py-3.5 font-semibold">Priority</th>
                <th className="text-left px-4 py-3.5 font-semibold">Valid Period</th>
                <th className="text-right px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-text-muted">
                    <FiPackage className="mx-auto text-3xl mb-2 opacity-40" />
                    No MOQ rules found. Click &quot;Add MOQ Rule&quot; to configure.
                  </td>
                </tr>
              ) : (
                filtered.map((rule) => {
                  const hasProduct = Boolean(rule.combo_kit_id);
                  return (
                    <motion.tr
                      key={rule._id || rule.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-hover/50 transition-colors"
                    >
                      {/* 1. Hierarchy / Product */}
                      <td className="px-5 py-3.5">
                        {hasProduct ? (
                          <div>
                            <div className="font-bold text-text-primary flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                                Product / Kit
                              </span>
                              {rule.combo_kit_id?.name || rule.combo_kit_id?.kit_name || "Custom Kit"}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                              {rule.combo_kit_id?.total_capacity_kw ? <span>{rule.combo_kit_id.total_capacity_kw} kW</span> : null}
                              {rule.combo_kit_id?.sku ? <span className="font-mono text-[10px]">{rule.combo_kit_id.sku}</span> : null}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="font-semibold text-text-primary flex items-center gap-1.5 flex-wrap">
                              {rule.industry_type_id?.name && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-hover text-text-secondary text-[10px] font-medium border border-border">
                                  {rule.industry_type_id.name}
                                </span>
                              )}
                              {rule.category_id?.name && (
                                <span className="px-2 py-0.5 rounded-md bg-info-soft text-primary text-[10px] font-bold">
                                  {rule.category_id.name}
                                </span>
                              )}
                              {(rule.system_type_id?.name || rule.project_type_id?.name) && (
                                <span className="px-2 py-0.5 rounded-md bg-warning-soft text-warning text-[10px] font-bold">
                                  {rule.system_type_id?.name || rule.project_type_id?.name}
                                </span>
                              )}
                              {rule.project_range_id?.label && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  {rule.project_range_id.label}
                                </span>
                              )}
                              {!rule.industry_type_id && !rule.category_id && !rule.system_type_id && !rule.project_type_id && !rule.project_range_id && (
                                <span className="text-text-muted italic text-xs">All Types (Global Default)</span>
                              )}
                            </div>
                            {rule.subcategory_id?.name && (
                              <p className="text-[11px] text-text-muted">Sub-category: {rule.subcategory_id.name}</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 2. Plan */}
                      <td className="px-4 py-3.5">
                        {rule.plan_id ? (
                          <span className="font-semibold text-text-primary">{rule.plan_id.name}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-surface-hover text-text-muted border border-border">
                            Global (All Plans)
                          </span>
                        )}
                      </td>

                      {/* 3. MOQ & Increment */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-warning-soft text-warning text-xs font-black">
                            MOQ {rule.moq} kits
                          </span>
                          <span className="text-xs font-semibold text-text-secondary">
                            +{rule.increment_quantity} step
                          </span>
                        </div>
                      </td>

                      {/* 4. Limits */}
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div>Max: {rule.max_quantity ? `${rule.max_quantity} kits` : <span className="text-text-muted">Unlimited</span>}</div>
                        <div>PO Limit: {rule.po_quantity_limit ? `${rule.po_quantity_limit} kits` : <span className="text-text-muted">None</span>}</div>
                      </td>

                      {/* 5. Priority */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-surface-hover text-text-secondary text-xs font-bold border border-border">
                          P{rule.priority || 0}
                        </span>
                      </td>

                      {/* 6. Valid Period */}
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div className="font-medium">
                          {rule.valid_from ? new Date(rule.valid_from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {rule.valid_until ? `→ ${new Date(rule.valid_until).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : "No Expiry"}
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(rule)}
                            className="p-2 rounded-lg hover:bg-info-soft text-primary transition-colors"
                            title="Edit"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule._id || rule.id)}
                            className="p-2 rounded-lg hover:bg-error-soft text-error transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl border border-border overflow-y-auto max-h-[92vh] flex flex-col"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-warning-soft text-warning">
                    <FiLayers size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {editingId ? "Edit MOQ & Increment Rule" : "Add MOQ & Increment Rule"}
                    </h2>
                    <p className="text-xs text-text-muted">Select 5-level hierarchy and target product to configure MOQ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-surface-hover text-text-muted"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* 5-Level Hierarchy Selection Section */}
                <div className="rounded-2xl border border-border bg-surface-hover/40 p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-primary">
                    <FiSliders className="text-primary" /> 1. Hierarchy & Category Scoping
                  </div>

                  {/* Level 1: Industry Type */}
                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      1. Industry Type
                    </label>
                    <select
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.industry_type_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          industry_type_id: e.target.value,
                          category_id: "",
                          subcategory_id: "",
                          system_type_id: "",
                          project_range_id: "",
                          combo_kit_id: "",
                        })
                      }
                    >
                      <option value="">All Industry Types (Global)</option>
                      {industries.map((ind) => (
                        <option key={ind.id || ind._id} value={ind.id || ind._id}>
                          {ind.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Level 2 & Level 3: Category & Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        2. Project Category
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={form.category_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            category_id: e.target.value,
                            subcategory_id: "",
                            system_type_id: "",
                            project_range_id: "",
                            combo_kit_id: "",
                          })
                        }
                      >
                        <option value="">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id || c._id} value={c.id || c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        3. Sub-Category
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={form.subcategory_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            subcategory_id: e.target.value,
                            system_type_id: "",
                            project_range_id: "",
                            combo_kit_id: "",
                          })
                        }
                      >
                        <option value="">All Sub-Categories</option>
                        {subcategories.map((s) => (
                          <option key={s.id || s._id} value={s.id || s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Level 4 & Level 5: System Type & Capacity Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        4. System Type
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={form.system_type_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            system_type_id: e.target.value,
                            project_range_id: "",
                            combo_kit_id: "",
                          })
                        }
                      >
                        <option value="">All System Types</option>
                        {systemTypes.map((st) => (
                          <option key={st.id || st._id} value={st.id || st._id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        5. Capacity Range
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        value={form.project_range_id}
                        onChange={(e) => setForm({ ...form, project_range_id: e.target.value, combo_kit_id: "" })}
                      >
                        <option value="">All Capacity Ranges</option>
                        {projectRanges.map((pr) => (
                          <option key={pr.id || pr._id} value={pr.id || pr._id}>
                            {pr.label || `${pr.min_value} - ${pr.max_value} ${pr.unit_symbol || "kW"}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Specific Product / Combo Kit Dropdown */}
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                      <FiPackage className="text-purple-600" /> Target Product / Combo Kit (Optional)
                    </label>
                    <span className="text-[11px] text-text-muted">
                      {matchingKits.length} matching products available
                    </span>
                  </div>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.combo_kit_id}
                    onChange={(e) => setForm({ ...form, combo_kit_id: e.target.value })}
                  >
                    <option value="">All Matching Products under this Hierarchy (Category/Range Level MOQ)</option>
                    {matchingKits.map((k) => (
                      <option key={k.id || k._id} value={k.id || k._id}>
                        {k.name || k.kit_name} {k.total_capacity_kw ? `(${k.total_capacity_kw} kW)` : ""} {k.sku ? `— ${k.sku}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-text-muted">
                    Specific kit select karne par ye rule us specific kit ke upar directly apply hoga.
                  </p>
                </div>

                {/* Plan Scope */}
                <div>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                    Franchisee Plan Scope
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={form.plan_id}
                    onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  >
                    <option value="">Global (All Franchisee Plans)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MOQ & Increment Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Minimum Order Quantity (MOQ) *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.moq}
                      onChange={(e) => setForm({ ...form, moq: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Order Increment Step *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      value={form.increment_quantity}
                      onChange={(e) => setForm({ ...form, increment_quantity: e.target.value })}
                    />
                    <p className="text-[10px] text-text-muted mt-0.5">Valid quantities: MOQ, MOQ+incr, MOQ+2×incr…</p>
                  </div>
                </div>

                {/* Quantity Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Max Quantity Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none"
                      value={form.max_quantity}
                      onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
                      placeholder="Empty = Unlimited"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      PO Quantity Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none"
                      value={form.po_quantity_limit}
                      onChange={(e) => setForm({ ...form, po_quantity_limit: e.target.value })}
                      placeholder="Empty = No Limit"
                    />
                  </div>
                </div>

                {/* Priority & Effective Dates */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Rule Priority
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    />
                    <p className="text-[10px] text-text-muted mt-0.5">Higher = evaluated first</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Valid From *
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none"
                      value={form.valid_from}
                      onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 block">
                      Valid Until (Optional)
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none"
                      value={form.valid_until}
                      onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                {/* Live Quantity Tester */}
                {!editingId && (
                  <div className="rounded-2xl border border-border bg-surface-hover/60 p-4 space-y-2">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-wide">
                      Test Quantity with Formula Checker
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter quantity to test (e.g. 15, 25)"
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-sm focus:outline-none font-bold"
                        value={liveQty.qty}
                        onChange={(e) => setLiveQty({ qty: e.target.value, result: null, checking: false })}
                      />
                      <Button type="button" variant="secondary" onClick={checkQuantity} disabled={liveQty.checking}>
                        {liveQty.checking ? <FiLoader className="animate-spin" /> : "Check Qty"}
                      </Button>
                    </div>
                    {liveQty.result && (
                      <div
                        className={`flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl ${
                          liveQty.result.valid
                            ? "bg-success-soft text-success border border-success/30"
                            : "bg-error-soft text-error border border-error/30"
                        }`}
                      >
                        {liveQty.result.valid ? <FiCheck size={16} /> : <FiAlertTriangle size={16} />}
                        {liveQty.result.valid ? "Valid quantity! Allowed for PO order." : liveQty.result.reason}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    leftIcon={saving ? <FiLoader className="animate-spin" /> : <FiCheck />}
                  >
                    {saving ? "Saving…" : editingId ? "Update Rule" : "Create Rule"}
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
