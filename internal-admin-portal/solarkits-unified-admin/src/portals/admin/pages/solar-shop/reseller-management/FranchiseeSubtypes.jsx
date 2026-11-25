import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiLoader,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiLayers,
  FiToggleLeft,
  FiToggleRight,
  FiFileText,
  FiHome,
} from "react-icons/fi";
import { authHeaderObj } from "@/app/authHeader";
import { setAlert } from "../../../features/alert.slice";

const API_BASE = import.meta.env.VITE_API_URL;
const MODULE_UID = "STR_TYPE_CFG";

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ─── SUBTYPE FORM MODAL ────────────────────────────────────────────────────────
function SubtypeModal({ mode, initial, onClose, onSaved }) {
  const dispatch = useDispatch();
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    sort_order: initial?.sort_order ?? 0,
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const autoSlug = slugify(form.name);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const endpoint = isEdit
        ? `${API_BASE}/store-management/subtypes/update`
        : `${API_BASE}/store-management/subtypes/add`;

      const payload = {
        ...(isEdit && { id: initial.id || initial._id }),
        name: form.name.trim(),
        description: form.description.trim() || null,
        sort_order: Number(form.sort_order || 0),
        is_active: Boolean(form.is_active),
      };

      const res = await axios({
        method: isEdit ? "put" : "post",
        url: endpoint,
        headers: authHeaderObj(),
        data: payload,
      });

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `Franchisee subtype ${isEdit ? "updated" : "created"} successfully`,
          })
        );
        onSaved();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Operation failed" }));
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save franchisee subtype",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg/50">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {isEdit ? "Edit Franchisee Subtype" : "Create Franchisee Subtype"}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Define configurable store categories managed dynamically without code changes
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary mb-1">
              Subtype Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="e.g. Solar Distributor Partner, Urban Retail Store"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            {form.name.trim() && (
              <div className="text-[11px] text-text-muted mt-1 font-mono">
                System identifier (slug): <strong className="text-text-primary">{autoSlug}</strong>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              placeholder="Commercial scope, target partner profile, or eligibility..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Sort Priority Order
              </label>
              <input
                type="number"
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                min={0}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Status
              </label>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`w-full px-3.5 py-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                  form.is_active
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-border bg-surface text-text-muted"
                }`}
              >
                <span>{form.is_active ? "Active" : "Inactive"}</span>
                {form.is_active ? <FiCheck size={16} /> : <FiX size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {saving ? <FiLoader className="animate-spin" size={16} /> : null}
              {saving ? "Saving..." : isEdit ? "Update Subtype" : "Create Subtype"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ──────────────────────────────────────────────────────
function DeleteSubtypeModal({ subtype, onClose, onConfirmed }) {
  const dispatch = useDispatch();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await axios.delete(
        `${API_BASE}/store-management/subtypes/delete?id=${subtype.id || subtype._id}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: `Subtype "${subtype.name}" deleted successfully`,
          })
        );
        onConfirmed();
        onClose();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Delete failed" }));
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete subtype",
        })
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
            <FiAlertCircle size={28} className="text-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">Delete Franchisee Subtype?</h3>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete <strong className="text-text-primary">"{subtype.name}"</strong>? This will fail if active plans or stores are currently linked to this subtype.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
            >
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

// ─── MAIN FRANCHISEE SUBTYPES PAGE ─────────────────────────────────────────────
export default function FranchiseeSubtypes() {
  const dispatch = useDispatch();

  const [subtypes, setSubtypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit' | 'delete', data?: subtype }

  const fetchSubtypes = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterActive === "active") p.append("active_only", "true");
      if (search.trim()) p.append("search", search.trim());

      const res = await axios.get(
        `${API_BASE}/store-management/subtypes/list?${p.toString()}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSubtypes(res.data.data || []);
      }
    } catch {
      dispatch(setAlert({ type: "error", message: "Failed to load franchisee subtypes" }));
    } finally {
      setLoading(false);
    }
  }, [dispatch, filterActive, search]);

  useEffect(() => {
    fetchSubtypes();
  }, [fetchSubtypes]);

  const handleToggle = async (subtype) => {
    try {
      const res = await axios.put(
        `${API_BASE}/store-management/subtypes/toggle-status`,
        { id: subtype.id || subtype._id },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSubtypes((prev) =>
          prev.map((s) =>
            (s.id || s._id) === (subtype.id || subtype._id)
              ? { ...s, is_active: !s.is_active }
              : s
          )
        );
        dispatch(
          setAlert({
            type: "success",
            message: `"${subtype.name}" ${!subtype.is_active ? "activated" : "deactivated"}`,
          })
        );
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to toggle status",
        })
      );
    }
  };

  const totalCount = subtypes.length;
  const activeCount = subtypes.filter((s) => s.is_active).length;
  const totalPlansLinked = subtypes.reduce((acc, s) => acc + (s.plan_count || 0), 0);
  const totalStoresLinked = subtypes.reduce((acc, s) => acc + (s.store_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <FiLayers className="text-primary" size={24} />
            Franchisee Subtypes
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Manage configurable franchisee categories and store tiers dynamically without code changes
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
        >
          <FiPlus size={16} />
          Create Subtype
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info-soft text-primary flex items-center justify-center font-bold">
            <FiLayers size={18} />
          </div>
          <div>
            <div className="text-xs text-text-muted font-medium">Total Subtypes</div>
            <div className="text-lg font-black text-text-primary">{totalCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-soft text-success flex items-center justify-center font-bold">
            <FiCheck size={18} />
          </div>
          <div>
            <div className="text-xs text-text-muted font-medium">Active Subtypes</div>
            <div className="text-lg font-black text-text-primary">{activeCount}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center font-bold border border-purple-200 dark:border-purple-800">
            <FiFileText size={18} />
          </div>
          <div>
            <div className="text-xs text-text-muted font-medium">Plans Linked</div>
            <div className="text-lg font-black text-text-primary">{totalPlansLinked}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800">
            <FiHome size={18} />
          </div>
          <div>
            <div className="text-xs text-text-muted font-medium">Stores Linked</div>
            <div className="text-lg font-black text-text-primary">{totalStoresLinked}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search subtypes by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 self-start sm:self-auto">
          {[
            { val: "all", label: "All Statuses" },
            { val: "active", label: "Active Only" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => setFilterActive(tab.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterActive === tab.val
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtypes Table */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted gap-3">
            <FiLoader className="animate-spin" size={20} />
            <span className="text-sm">Loading franchisee subtypes...</span>
          </div>
        ) : subtypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center">
              <FiLayers size={24} className="text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {search ? "No subtypes match your search" : "No subtypes configured yet. Click 'Create Subtype' to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-text-muted font-semibold text-xs">
                  <th className="text-left px-5 py-3.5">Category Name</th>
                  <th className="text-left px-4 py-3.5">System Slug</th>
                  <th className="text-left px-4 py-3.5">Description</th>
                  <th className="text-center px-4 py-3.5">Linked Plans</th>
                  <th className="text-center px-4 py-3.5">Linked Stores</th>
                  <th className="text-center px-4 py-3.5">Order Priority</th>
                  <th className="text-center px-3 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence>
                  {subtypes.map((st) => (
                    <motion.tr
                      key={st.id || st._id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-surface-hover/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-text-primary">
                        {st.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-text-muted">
                        {st.slug}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary max-w-xs truncate">
                        {st.description || <span className="text-text-muted italic">No description</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {st.plan_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {st.store_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-xs text-text-muted">
                        {st.sort_order ?? 0}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            st.is_active
                              ? "bg-success-soft text-success border-success/20"
                              : "bg-danger-soft text-danger border-danger/20"
                          }`}
                        >
                          {st.is_active ? <FiCheck size={10} /> : <FiX size={10} />}
                          {st.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggle(st)}
                            title={st.is_active ? "Deactivate" : "Activate"}
                            className={`p-2 rounded-xl transition-colors ${
                              st.is_active
                                ? "text-success hover:bg-success-soft"
                                : "text-text-muted hover:bg-surface-hover"
                            }`}
                          >
                            {st.is_active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => setModal({ mode: "edit", data: st })}
                            title="Edit Subtype"
                            className="p-2 rounded-xl text-text-muted hover:text-primary hover:bg-surface-hover transition-colors"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            onClick={() => setModal({ mode: "delete", data: st })}
                            title="Delete Subtype"
                            className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger-soft transition-colors"
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
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.mode === "add" && (
          <SubtypeModal
            mode="add"
            onClose={() => setModal(null)}
            onSaved={fetchSubtypes}
          />
        )}
        {modal?.mode === "edit" && (
          <SubtypeModal
            mode="edit"
            initial={modal.data}
            onClose={() => setModal(null)}
            onSaved={fetchSubtypes}
          />
        )}
        {modal?.mode === "delete" && (
          <DeleteSubtypeModal
            subtype={modal.data}
            onClose={() => setModal(null)}
            onConfirmed={fetchSubtypes}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
