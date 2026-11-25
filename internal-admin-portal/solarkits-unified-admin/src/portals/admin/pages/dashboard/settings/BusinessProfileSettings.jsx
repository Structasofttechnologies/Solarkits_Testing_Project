import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaBriefcase,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import PageHeader from "@/components/PageHeader";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function BusinessProfileSettings() {
  const dispatch = useDispatch();

  const [profiles, setProfiles] = useState([]);
  const [summary, setSummary] = useState({
    total_profiles: 0,
    active_profiles: 0,
    inactive_profiles: 0,
    total_leads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State - Simple Name Only
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [modalForm, setModalForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    profileId: null,
    profileName: "",
  });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/business-profiles/list`, {
        headers: { ...authHeaderObj() },
      });
      if (res.data?.status === "success") {
        setProfiles(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to fetch business profiles:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load business profiles",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProfile(null);
    setModalForm({ name: "" });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p) => {
    setEditingProfile(p);
    setModalForm({ name: p.name || "" });
    setIsModalOpen(true);
  };

  // Save (Add or Update) - Simple Title/Name Only
  const handleSave = async (e) => {
    e.preventDefault();
    const cleanName = modalForm.name.trim();
    if (!cleanName) {
      dispatch(setAlert({ type: "error", message: "Business Profile Name is required." }));
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

      if (editingProfile) {
        const res = await axios.put(
          `${API_URL}/business-profiles/update/${editingProfile.id || editingProfile._id}`,
          payload,
          { headers: { ...authHeaderObj() } }
        );
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "Business Profile updated successfully!" }));
          setIsModalOpen(false);
          fetchProfiles();
        }
      } else {
        const res = await axios.post(`${API_URL}/business-profiles/add`, payload, {
          headers: { ...authHeaderObj() },
        });
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "New Business Profile added successfully!" }));
          setIsModalOpen(false);
          fetchProfiles();
        }
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save Business Profile.",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (profileId) => {
    try {
      const res = await axios.patch(
        `${API_URL}/business-profiles/toggle/${profileId}`,
        {},
        { headers: { ...authHeaderObj() } }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        fetchProfiles();
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

  // Delete (Soft delete)
  const handleConfirmDelete = async () => {
    if (!deleteDialog.profileId) return;
    try {
      const res = await axios.delete(`${API_URL}/business-profiles/delete/${deleteDialog.profileId}`, {
        headers: { ...authHeaderObj() },
      });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Business Profile deleted successfully!" }));
        setDeleteDialog({ isOpen: false, profileId: null, profileName: "" });
        fetchProfiles();
      }
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to delete Business Profile.",
        })
      );
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? p.is_active
          : !p.is_active;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <PageHeader
        title="Business Profiles Configuration"
        subtitle="Configure business profile options selectable across franchise application forms and partner onboarding."
        icon={FaBriefcase}
        stats={[
          { label: "Active Profiles", value: summary.active_profiles, description: `Out of ${summary.total_profiles} defined` },
          { label: "Total Inquiries", value: summary.total_leads, description: "Linked franchise leads & applications" },
          { label: "Inactive Profiles", value: summary.inactive_profiles, description: "Hidden from application forms" },
        ]}
      />

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {profiles.map((p) => (
          <div
            key={p.id || p._id}
            className={`p-4 rounded-2xl border transition-all ${p.is_active
                ? "bg-white border-slate-200 shadow-xs hover:shadow-md"
                : "bg-slate-50 border-slate-200/60 opacity-60"
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-800 line-clamp-1">
                {p.name}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
              >
                {p.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Inquiries / Leads
                </span>
                <span className="text-base font-black text-slate-800">{p.leads_count || 0}</span>
              </div>
              <div className="text-right">
                <button
                  onClick={() => handleToggleStatus(p.id || p._id)}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  {p.is_active ? "Deactivate" : "Activate"}
                </button>
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
              placeholder="Search business profile title..."
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
            onClick={fetchProfiles}
            title="Refresh List"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs transition cursor-pointer"
          >
            <FaSyncAlt className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm self-stretch md:self-auto justify-center cursor-pointer"
        >
          <FaPlus /> Add Business Profile
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500 font-bold uppercase text-[11px]">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Profile Title / Name</th>
                <th className="py-3.5 px-4 text-center">Inquiries Linked</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FaSyncAlt className="animate-spin text-blue-600 text-lg mx-auto mb-2" />
                    Loading business profiles...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No business profiles configured yet. Click "Add Business Profile" to add one.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p, index) => (
                  <tr key={p.id || p._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-mono text-xs">
                        {p.leads_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(p.id || p._id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${p.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                      >
                        {p.is_active ? <FaToggleOn className="text-sm" /> : <FaToggleOff className="text-sm" />}
                        {p.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          title="Edit Profile"
                          className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition cursor-pointer"
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteDialog({
                              isOpen: true,
                              profileId: p.id || p._id,
                              profileName: p.name,
                            })
                          }
                          title="Delete Profile"
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

      {/* Add / Edit Modal - Simple Profile Title/Name Only */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FaBriefcase size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingProfile ? "Edit Business Profile" : "Add Business Profile"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter profile name for storefront application forms
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
                  Profile Title / Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solar EPC Contractor"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 font-bold">
              <FaTrash size={18} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Delete Business Profile?
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteDialog.profileName}"</strong>? This will hide it from new application forms.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialog({ isOpen: false, profileId: null, profileName: "" })}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
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
