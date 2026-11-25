import React, { useState, useEffect } from "react";
import {
  FiSliders,
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiMapPin,
  FiDollarSign,
  FiPercent,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ChannelSettingsAdminPage() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    rule_priority: 100,
    status: "active",
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
    mrp_inr: 10000,
    distributor_rate_inr: 8500,
    dealer_rate_inr: 9000,
    dealer_allowed: true,
    gst_rate_pct: 18,
    distributor_moq: 5,
    dealer_moq: 2,
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE}/boskit/v1/admin/channel-settings?status=${statusFilter}`
      );
      if (res.data?.success) {
        setSettings(res.data.data?.settings || []);
        setTotal(res.data.data?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load channel settings:", err);
      setFeedback({ type: "error", msg: "Failed to load channel configurations." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      rule_priority: 100,
      status: "active",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
      mrp_inr: 10000,
      distributor_rate_inr: 8500,
      dealer_rate_inr: 9000,
      dealer_allowed: true,
      gst_rate_pct: 18,
      distributor_moq: 5,
      dealer_moq: 2,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const p0 = item.product_configs?.[0] || {};
    setFormData({
      rule_priority: item.rule_priority || 100,
      status: item.status || "active",
      effective_from: item.effective_from ? item.effective_from.split("T")[0] : "",
      effective_to: item.effective_to ? item.effective_to.split("T")[0] : "",
      mrp_inr: p0.mrp_paise ? p0.mrp_paise / 100 : 10000,
      distributor_rate_inr: p0.distributor_rate_paise ? p0.distributor_rate_paise / 100 : 8500,
      dealer_rate_inr: p0.dealer_rate_paise ? p0.dealer_rate_paise / 100 : 9000,
      dealer_allowed: p0.dealer_allowed !== false,
      gst_rate_pct: p0.gst_rate_pct || 18,
      distributor_moq: p0.distributor_moq || 5,
      dealer_moq: p0.dealer_moq || 2,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback({ type: "", msg: "" });

      const payload = {
        rule_priority: Number(formData.rule_priority) || 100,
        status: formData.status,
        effective_from: formData.effective_from || new Date(),
        effective_to: formData.effective_to || null,
        product_configs: [
          {
            mrp_inr: Number(formData.mrp_inr),
            distributor_rate_inr: Number(formData.distributor_rate_inr),
            dealer_rate_inr: Number(formData.dealer_rate_inr),
            dealer_allowed: Boolean(formData.dealer_allowed),
            gst_rate_pct: Number(formData.gst_rate_pct),
            distributor_moq: Number(formData.distributor_moq),
            dealer_moq: Number(formData.dealer_moq),
          },
        ],
      };

      if (editingItem) {
        await axios.put(`${API_BASE}/boskit/v1/admin/channel-settings/${editingItem.id}`, payload);
        setFeedback({ type: "success", msg: "Channel configuration updated successfully." });
      } else {
        await axios.post(`${API_BASE}/boskit/v1/admin/channel-settings`, payload);
        setFeedback({ type: "success", msg: "Channel configuration created successfully." });
      }

      setIsModalOpen(false);
      loadSettings();
    } catch (err) {
      setFeedback({ type: "error", msg: err.response?.data?.message || "Failed to save configuration." });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await axios.post(`${API_BASE}/boskit/v1/admin/channel-settings/${id}/duplicate`);
      setFeedback({ type: "success", msg: "Configuration cloned as draft." });
      loadSettings();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to duplicate configuration." });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate and remove this channel configuration?")) return;
    try {
      await axios.delete(`${API_BASE}/boskit/v1/admin/channel-settings/${id}`);
      setFeedback({ type: "success", msg: "Channel configuration deleted." });
      loadSettings();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to delete configuration." });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiSliders /> Hierarchy Configuration Matrix
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            BOSKIT Channel Settings
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Define multi-tier commercial rules: Industry → Project Type → State → District → Distributor
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSettings}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
            title="Refresh"
          >
            <FiRefreshCw size={16} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Add Channel Rule
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback.msg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          }`}
        >
          {feedback.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
          {feedback.msg}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              placeholder="Search by state, district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-text-muted">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface border border-border text-text-primary focus:outline-none focus:border-primary font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Rules</option>
            <option value="draft">Drafts</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Configurations Table */}
      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading channel rules...
          </div>
        ) : settings.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <FiLayers size={32} className="mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold">No channel configurations found.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white"
            >
              Create First Channel Setting
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Hierarchy Dimensions</th>
                  <th className="p-4">Commercial Slabs</th>
                  <th className="p-4">Dealer Access</th>
                  <th className="p-4">MOQ Specs</th>
                  <th className="p-4">Priority & Validity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {settings.map((item) => {
                  const p0 = item.product_configs?.[0] || {};
                  return (
                    <tr key={item.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-text-primary flex items-center gap-1.5">
                          <FiMapPin className="text-primary" size={13} />
                          {item.state} → {item.district}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {item.industry} | {item.distributor}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-text-primary">
                          MRP: ₹{(p0.mrp_paise ? p0.mrp_paise / 100 : 10000).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-bold">
                          Distributor: ₹{(p0.distributor_rate_paise ? p0.distributor_rate_paise / 100 : 8500).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-primary font-medium">
                          Dealer: ₹{(p0.dealer_rate_paise ? p0.dealer_rate_paise / 100 : 9000).toLocaleString("en-IN")}
                        </div>
                      </td>

                      <td className="p-4">
                        {p0.dealer_allowed !== false ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Allowed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            Disallowed
                          </span>
                        )}
                        <div className="text-[10px] text-text-muted mt-1">GST: {p0.gst_rate_pct || 18}%</div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-text-primary">
                          Distributor: {p0.distributor_moq || 5} units
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Dealer: {p0.dealer_moq || 2} units
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="text-[11px] font-mono font-bold text-text-primary bg-surface-hover px-1.5 py-0.5 rounded">
                          Priority {item.rule_priority}
                        </span>
                        <div className="text-[10px] text-text-muted mt-1">
                          {item.effective_from ? new Date(item.effective_from).toLocaleDateString() : "Immediate"}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text-primary"
                          title="Edit"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item.id)}
                          className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-text-secondary"
                          title="Duplicate as Draft"
                        >
                          <FiCopy size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg border border-border bg-surface hover:bg-rose-500/10 text-rose-500"
                          title="Delete"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-heading font-black text-lg text-text-primary">
                  {editingItem ? "Edit Channel Setting" : "New Channel Configuration"}
                </h3>
                <p className="text-xs text-text-secondary">
                  Set deterministic pricing rules, GST, and MOQ parameters.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text-primary"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Base MRP (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.mrp_inr}
                    onChange={(e) => setFormData({ ...formData, mrp_inr: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Distributor Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.distributor_rate_inr}
                    onChange={(e) => setFormData({ ...formData, distributor_rate_inr: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Dealer Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dealer_rate_inr}
                    onChange={(e) => setFormData({ ...formData, dealer_rate_inr: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-bold text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.gst_rate_pct}
                    onChange={(e) => setFormData({ ...formData, gst_rate_pct: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Distributor MOQ (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.distributor_moq}
                    onChange={(e) => setFormData({ ...formData, distributor_moq: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Dealer MOQ (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.dealer_moq}
                    onChange={(e) => setFormData({ ...formData, dealer_moq: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Rule Priority (Lower = Higher)
                  </label>
                  <input
                    type="number"
                    value={formData.rule_priority}
                    onChange={(e) => setFormData({ ...formData, rule_priority: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="dealerAllowed"
                  checked={formData.dealer_allowed}
                  onChange={(e) => setFormData({ ...formData, dealer_allowed: e.target.checked })}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="dealerAllowed" className="text-xs font-semibold text-text-primary">
                  Allow Sub-Dealer Onboarding & Procurement under this channel rule
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover text-text-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingItem ? "Update Configuration" : "Create Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
