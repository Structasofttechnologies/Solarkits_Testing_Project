import React, { useState, useEffect } from "react";
import {
  FiSliders,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MoqSettingsAdminPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  const [formData, setFormData] = useState({
    rule_name: "",
    scope: "product_default",
    channel: "distributor",
    moq: 5,
    status: "active",
  });

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/moq-rules`);
      if (res.data?.success) {
        setRules(res.data.data?.rules || []);
      }
    } catch (err) {
      console.error("Error loading MOQ rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/boskit/v1/admin/moq-rules`, formData);
      setFeedback({ type: "success", msg: "MOQ rule created successfully." });
      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to create MOQ rule." });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this MOQ rule?")) return;
    try {
      await axios.delete(`${API_BASE}/boskit/v1/admin/moq-rules/${id}`);
      setFeedback({ type: "success", msg: "MOQ rule deleted." });
      loadRules();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to delete MOQ rule." });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiSliders /> Volume & Lot Policies
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Minimum Order Quantity (MOQ) Rules
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure channel and product batch procurement limits with hard-stop checkout enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRules}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
          >
            <FiRefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Add MOQ Rule
          </button>
        </div>
      </div>

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

      <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-text-muted text-xs">
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading MOQ rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <p className="text-sm font-semibold">No custom MOQ rules configured.</p>
            <p className="text-xs text-text-secondary">Default fallback: 5 units (Distributor) / 2 units (Dealer).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Rule Title</th>
                  <th className="p-4">Channel Scope</th>
                  <th className="p-4">Target Product / Entity</th>
                  <th className="p-4">Mandatory MOQ</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4 font-bold text-text-primary">{r.rule_name}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                        {r.channel}
                      </span>
                    </td>
                    <td className="p-4">{r.product_name || r.distributor_name || "All Components"}</td>
                    <td className="p-4 font-bold text-emerald-600 text-sm">{r.moq} Units</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg border border-border bg-surface hover:bg-rose-500/10 text-rose-500"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-black text-lg text-text-primary">Create MOQ Rule</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Inverter Lot MOQ"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Target Channel</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                >
                  <option value="distributor">Distributor Wholesale</option>
                  <option value="dealer">Dealer Network</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Minimum Order Units</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.moq}
                  onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-bold"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-surface-hover text-text-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white">
                  Save MOQ Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
