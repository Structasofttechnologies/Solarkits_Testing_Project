import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiTag,
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
  FiZap,
  FiShoppingBag,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "RSL_TYPES";

const apiFetch = (method, endpoint, data) =>
  axios({ method, url: `${API_BASE}/reseller-mgmt/types${endpoint}`, headers: authHeaderObj(), data });

const COMMERCIAL_MODES = [
  {
    value: "commission",
    label: "Commission",
    description: "Franchisee earns commission on eligible EPC buyer orders",
    icon: FiZap,
    color: "text-primary",
    bg: "bg-info-soft",
  },
  {
    value: "dealer",
    label: "Dealer",
    description: "Franchisee purchases at configured dealer pricing (margin discount)",
    icon: FiShoppingBag,
    color: "text-warning",
    bg: "bg-warning-soft",
  },
];

function CommercialModeBadge({ mode }) {
  return mode === "commission" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-info-soft text-primary border border-primary/20">
      <FiZap size={10} /> Commission
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-soft text-warning border border-warning/20">
      <FiShoppingBag size={10} /> Dealer
    </span>
  );
}

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success-soft text-success border border-success/20">
      <FiCheck size={10} /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-soft text-danger border border-danger/20">
      <FiX size={10} /> Inactive
    </span>
  );
}

function FormModal({ mode, initial, onClose, onSaved }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    name:            initial?.name            || "",
    commercial_mode: initial?.commercial_mode || "commission",
    description:     initial?.description     || "",
    sort_order:      initial?.sort_order      ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const isEdit = mode === "edit";
      const endpoint = isEdit
        ? `/update?req_for=edit&unique_id=${MODULE_UID}`
        : `/add?req_for=add&unique_id=${MODULE_UID}`;
      const payload = {
        ...(isEdit && { id: initial.id }),
        name:            form.name.trim(),
        commercial_mode: form.commercial_mode,
        description:     form.description.trim() || null,
        sort_order:      Number(form.sort_order),
      };
      const res = await apiFetch(isEdit ? "put" : "post", endpoint, payload);
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `Franchisee type ${isEdit ? "updated" : "created"}` }));
        onSaved(res.data.data);
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "An error occurred" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">
            {mode === "edit" ? "Edit Reseller Type" : "Add Reseller Type"}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="e.g. Solar Reseller Partner, Regional Distributor"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={200}
            />
          </div>

          {/* Commercial Mode */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Commercial Mode <span className="text-danger">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {COMMERCIAL_MODES.map((m) => {
                const Icon = m.icon;
                const selected = form.commercial_mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setForm({ ...form, commercial_mode: m.value })}
                    className={`relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border-2 transition-all text-left ${
                      selected
                        ? "border-primary bg-info-soft shadow-sm"
                        : "border-border bg-bg hover:border-primary/30"
                    }`}
                  >
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <FiCheck size={10} className="text-white" />
                      </span>
                    )}
                    <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                      <Icon size={16} className={m.color} />
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{m.label}</span>
                    <span className="text-xs text-text-muted leading-tight">{m.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              placeholder="Optional description for this reseller type..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              maxLength={1000}
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Sort Order</label>
            <input
              type="number"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              min={0}
              max={9999}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <FiLoader className="animate-spin" size={16} /> : null}
              {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteConfirmModal({ type, onClose, onConfirmed }) {
  const [deleting, setDeleting] = useState(false);
  const dispatch = useDispatch();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("delete", `/delete?req_for=delete&unique_id=${MODULE_UID}`, { id: type.id });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `"${type.name}" deleted` }));
        onConfirmed(type.id);
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Delete failed" }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Delete failed" }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
            <FiAlertCircle size={28} className="text-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Delete Franchisee Type?</h3>
            <p className="text-sm text-text-secondary">
              Permanently removing <strong className="text-text-primary">"{type.name}"</strong> ({type.commercial_mode} mode).
              Active franchisees using this type will need to be reassigned first.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-danger-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {deleting ? <FiLoader className="animate-spin" size={16} /> : null}
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResellerTypes({ moduleUniqueId }) {
  const dispatch = useDispatch();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [modal, setModal] = useState(null);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterMode !== "all" ? `&commercial_mode=${filterMode}` : "";
      const res = await axios.get(
        `${API_BASE}/reseller-mgmt/types/list?req_for=view&unique_id=${MODULE_UID}${params}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") setTypes(res.data.data);
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load franchisee types" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, filterMode]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  const handleToggle = async (type) => {
    try {
      const res = await apiFetch("put", `/toggle-status?req_for=edit&unique_id=${MODULE_UID}`, { id: type.id, is_active: !type.is_active });
      if (res.data?.status === "success") {
        setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, is_active: !t.is_active } : t)));
        dispatch(setAlert({ type: "success", message: `"${type.name}" ${!type.is_active ? "activated" : "deactivated"}` }));
      }
    } catch (err) {
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Toggle failed" }));
    }
  };

  const filtered = types.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiTag className="text-primary" size={24} />
            Franchisee Types
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Define franchisee categories and their commercial modes (Commission or Dealer)
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
        >
          <FiPlus size={16} />
          Add Franchisee Type
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search franchisee types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {["all", "commission", "dealer"].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                filterMode === m
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <FiLoader className="animate-spin" size={20} />
            <span className="text-sm">Loading franchisee types...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiTag size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {search || filterMode !== "all" ? "No franchisee types match your filters" : "No franchisee types yet. Add one to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">Name</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5">Commercial Mode</th>
                  <th className="text-left text-text-muted font-medium px-5 py-3.5 hidden md:table-cell">Description</th>
                  <th className="text-center text-text-muted font-medium px-4 py-3.5">Order</th>
                  <th className="text-center text-text-muted font-medium px-4 py-3.5">Status</th>
                  <th className="text-right text-text-muted font-medium px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {filtered.map((type) => (
                    <motion.tr
                      key={type.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-text-primary">{type.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 font-mono">{type.slug}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <CommercialModeBadge mode={type.commercial_mode} />
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-text-secondary max-w-xs truncate">
                        {type.description || <span className="text-text-muted italic">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-bg border border-border text-xs font-bold text-text-secondary">
                          {type.sort_order}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge isActive={type.is_active} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(type)}
                            title={type.is_active ? "Deactivate" : "Activate"}
                            className={`p-2 rounded-lg transition-colors ${type.is_active ? "text-success hover:bg-success-soft" : "text-text-muted hover:bg-surface-hover"}`}
                          >
                            {type.is_active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => setModal({ mode: "edit", data: type })}
                            title="Edit"
                            className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-info-soft transition-colors"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => setModal({ mode: "delete", data: type })}
                            title="Delete"
                            className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-bg text-xs text-text-muted">
            Showing {filtered.length} of {types.length} reseller type{types.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal?.mode === "add" && (
          <FormModal key="add" mode="add" initial={null} onClose={() => setModal(null)}
            onSaved={(d) => setTypes((p) => [...p, d].sort((a, b) => a.sort_order - b.sort_order))} />
        )}
        {modal?.mode === "edit" && (
          <FormModal key="edit" mode="edit" initial={modal.data} onClose={() => setModal(null)}
            onSaved={(d) => setTypes((p) => p.map((t) => (t.id === d.id ? { ...t, ...d } : t)))} />
        )}
        {modal?.mode === "delete" && (
          <DeleteConfirmModal key="del" type={modal.data} onClose={() => setModal(null)}
            onConfirmed={(id) => setTypes((p) => p.filter((t) => t.id !== id))} />
        )}
      </AnimatePresence>
    </div>
  );
}
