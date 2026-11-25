import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaUserCheck,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaSyncAlt,
  FaUsers,
  FaLayerGroup,
  FaCheckCircle,
  FaTimes,
  FaBriefcase,
  FaInfoCircle
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import PageHeader from "@/components/PageHeader";
import Dialog from "@/components/Dialog";
import Button from "@/components/Button";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

const BADGE_COLORS = [
  { value: "purple", label: "Purple (Royal)", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  { value: "blue", label: "Blue (Standard)", bg: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "emerald", label: "Emerald (Success)", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "amber", label: "Amber (Warning)", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "teal", label: "Teal (Corporate)", bg: "bg-teal-100 text-teal-800 border-teal-300" },
  { value: "indigo", label: "Indigo (Primary)", bg: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "rose", label: "Rose (Accent)", bg: "bg-rose-100 text-rose-800 border-rose-300" },
];

export function getEpcTypeBadgeClass(color) {
  const found = BADGE_COLORS.find((c) => c.value === color);
  return found ? found.bg : "bg-slate-100 text-slate-800 border-slate-300";
}

export default function EpcTypeSettings() {
  const dispatch = useDispatch();

  const [types, setTypes] = useState([]);
  const [summary, setSummary] = useState({
    total_types: 0,
    active_types: 0,
    total_accounts: 0,
    total_leads: 0,
    total_classified_epcs: 0,
    total_unclassified_epcs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    code: "",
    description: "",
    badge_color: "blue",
    display_order: 1,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    typeId: null,
    typeName: "",
  });

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/epc-types/list`, {
        headers: { ...authHeaderObj() },
      });
      if (res.data?.status === "success") {
        setTypes(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to fetch EPC types:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load EPC classification types",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingType(null);
    setModalForm({ name: "" });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (t) => {
    setEditingType(t);
    setModalForm({ name: t.name });
    setIsModalOpen(true);
  };

  // Save (Add or Update) - Simple Name Entry
  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = modalForm.name.trim();
    if (!cleanName) {
      dispatch(setAlert({ type: "error", message: "EPC Type Name is required." }));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        code: cleanName
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "_"),
      };

      if (editingType) {
        const res = await axios.put(
          `${API_URL}/epc-types/update/${editingType.id || editingType._id}`,
          payload,
          { headers: { ...authHeaderObj() } }
        );
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "EPC Type updated successfully!" }));
          setIsModalOpen(false);
          fetchTypes();
        }
      } else {
        const res = await axios.post(`${API_URL}/epc-types/create`, payload, {
          headers: { ...authHeaderObj() },
        });
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "New EPC Type created successfully!" }));
          setIsModalOpen(false);
          fetchTypes();
        }
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save EPC Type.",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (typeId) => {
    try {
      const res = await axios.put(
        `${API_URL}/epc-types/toggle/${typeId}`,
        {},
        { headers: { ...authHeaderObj() } }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        fetchTypes();
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to toggle status.",
        })
      );
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deleteDialog.typeId) return;
    try {
      const res = await axios.delete(`${API_URL}/epc-types/delete/${deleteDialog.typeId}`, {
        headers: { ...authHeaderObj() },
      });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "EPC Type deleted successfully!" }));
        setDeleteDialog({ isOpen: false, typeId: null, typeName: "" });
        fetchTypes();
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete EPC Type.",
        })
      );
    }
  };

  const filteredTypes = types.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? t.is_active
        : !t.is_active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <PageHeader
        title="EPC Types Configuration"
        subtitle="Define contractor categories (Government Contractor, Tender Bidder, New EPC, Experienced EPC) used across BDE, Franchisee and Admin onboarding pipelines."
        icon={FaUserCheck}
        stats={[
          { label: "Active Types", value: summary.active_types, description: `Out of ${summary.total_types} defined` },
          { label: "Classified EPCs", value: summary.total_classified_epcs, description: "Active wholesale accounts" },
          { label: "Total EPC Leads", value: summary.total_leads, description: "BDE pipeline prospects" },
        ]}
      />

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {types.map((t) => (
          <div
            key={t.id || t._id}
            className={`p-4 rounded-2xl border transition-all ${
              t.is_active
                ? "bg-white border-slate-200 shadow-xs hover:shadow-md"
                : "bg-slate-50 border-slate-200/60 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-800">
                {t.name}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  EPC Accounts
                </span>
                <span className="text-lg font-black text-slate-800">{t.accounts_count || 0}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  BDE Leads
                </span>
                <span className="text-lg font-black text-blue-600">{t.leads_count || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search EPC type name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            onClick={fetchTypes}
            title="Refresh List"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs transition"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-stretch md:self-auto justify-center cursor-pointer"
        >
          <FaPlus /> Add New EPC Type
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">EPC Type Name</th>
                <th className="py-3.5 px-4 text-center">EPC Accounts</th>
                <th className="py-3.5 px-4 text-center">BDE Leads</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FaSyncAlt className="animate-spin text-blue-600 text-lg mx-auto mb-2" />
                    Loading EPC types...
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No EPC types matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((t, index) => (
                  <tr key={t.id || t._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono text-xs">
                        {t.accounts_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-mono text-xs">
                        {t.leads_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(t.id || t._id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                          t.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {t.is_active ? <FaToggleOn className="text-sm" /> : <FaToggleOff className="text-sm" />}
                        {t.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          title="Edit EPC Type"
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition cursor-pointer"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              typeId: t.id || t._id,
                              typeName: t.name,
                            })
                          }
                          title="Delete EPC Type"
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal - Simple Name Only */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FaUserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingType ? "Edit EPC Type" : "Add New EPC Type"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter the name for this EPC classification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  EPC Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Government Contractor, Tender Bidder, New EPC..."
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !modalForm.name.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : editingType ? "Update Type" : "Save EPC Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-lg">
              <FaTrash />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete EPC Type?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete{" "}
                <span className="font-bold text-slate-700">"{deleteDialog.typeName}"</span>? Existing
                EPC records will retain their classified name.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteDialog({ isOpen: false, typeId: null, typeName: "" })}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex-1"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

