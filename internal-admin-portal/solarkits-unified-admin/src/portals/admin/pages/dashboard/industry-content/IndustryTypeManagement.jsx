import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getIndustryTypes,
  createIndustryType,
  updateIndustryType,
  toggleIndustryTypeStatus,
  deleteIndustryType,
} from "../../../api/industryContentApi";
import IndustryUserAssignmentModal from "../../../components/industry/IndustryUserAssignmentModal";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiCheck,
  FiX,
  FiLayers,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { MdOutlineFactory } from "react-icons/md";

export default function IndustryTypeManagement() {
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedForUsers, setSelectedForUsers] = useState(null);
  const [alert, setAlert] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [forResellers, setForResellers] = useState(true);
  const [forEpc, setForEpc] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchIndustries = async () => {
    setLoading(true);
    try {
      const res = await getIndustryTypes();
      if (res.status === "success") {
        setIndustries(res.data || []);
      }
    } catch (err) {
      console.error(err);
      showAlert("error", err.response?.data?.message || "Failed to fetch industry types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndustries();
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName("");
    setCode("");
    setIcon("");
    setDescription("");
    setSortOrder(0);
    setForResellers(true);
    setForEpc(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || "");
    setCode(item.code || "");
    setIcon(item.icon || "");
    setDescription(item.description || "");
    setSortOrder(item.sort_order || 0);
    setForResellers(item.for_resellers !== false);
    setForEpc(item.for_epc !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase() || null,
        icon: icon.trim() || null,
        description: description.trim() || null,
        sort_order: Number(sortOrder),
        for_resellers: forResellers,
        for_epc: forEpc,
      };

      if (editingItem) {
        await updateIndustryType({ id: editingItem.id || editingItem._id, ...payload });
        showAlert("success", "Industry type updated successfully!");
      } else {
        await createIndustryType(payload);
        showAlert("success", "Industry type created successfully!");
      }

      setIsModalOpen(false);
      fetchIndustries();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Failed to save industry type");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await toggleIndustryTypeStatus({
        id: item.id || item._id,
        is_active: !item.is_active,
      });
      showAlert("success", `Industry "${item.name}" status updated`);
      fetchIndustries();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone if mappings exist.`)) return;
    try {
      await deleteIndustryType({ id: item.id || item._id });
      showAlert("success", "Industry type deleted successfully");
      fetchIndustries();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Cannot delete industry type");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <MdOutlineFactory size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Industry Type Management</h1>
            <p className="text-xs font-medium text-slate-500">
              Create, activate, and manage business industry segments and audience targeting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIndustries}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Refresh List"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-black rounded-2xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Create Industry Type
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            alert.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <FiAlertCircle size={16} />
          <span>{alert.message}</span>
        </div>
      )}

      {/* Industry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-bold animate-pulse">
            Loading industry types...
          </div>
        ) : industries.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <MdOutlineFactory size={40} className="mx-auto text-slate-300" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No industry types created yet</p>
            <p className="text-xs text-slate-400">Click "Create Industry Type" above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-6">Industry Name & Code</th>
                  <th className="py-4 px-6">Slug</th>
                  <th className="py-4 px-6">Audience Eligibility</th>
                  <th className="py-4 px-6">Sort Order</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {industries.map((item) => (
                  <tr
                    key={item.id || item._id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold shrink-0">
                          {item.icon || "🏭"}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm">{item.name}</p>
                          <span className="text-[10px] font-bold text-slate-400">
                            {item.code ? `Code: ${item.code}` : "No Code"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 font-mono text-slate-500 text-[11px]">{item.slug}</td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        {item.for_resellers && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                            Resellers
                          </span>
                        )}
                        {item.for_epc && (
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                            EPC Buyers
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 font-black text-slate-700 dark:text-slate-300">{item.sort_order}</td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {item.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Manage Users */}
                        <button
                          onClick={() => setSelectedForUsers(item)}
                          className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="Manage Authorized Users"
                        >
                          <FiUsers size={14} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Industry Type"
                        >
                          <FiEdit2 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Industry Type"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {editingItem ? "Edit Industry Type" : "Create New Industry Type"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Industry Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Residential Solar, Commercial & Industrial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Short Code / Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RESI, COMM"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Icon / Emoji
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 🏠, 🏢, 🏭"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description of this industry segment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Audience checkboxes */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Target Audience Availability
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forResellers}
                      onChange={(e) => setForResellers(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Reseller Portal</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forEpc}
                      onChange={(e) => setForEpc(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>EPC Buyer Shop</span>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary text-white font-black rounded-2xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer"
                >
                  {saving ? "Saving..." : editingItem ? "Update Industry" : "Create Industry"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* User Assignment Modal */}
      {selectedForUsers && (
        <IndustryUserAssignmentModal
          industry={selectedForUsers}
          onClose={() => setSelectedForUsers(null)}
        />
      )}

    </div>
  );
}
