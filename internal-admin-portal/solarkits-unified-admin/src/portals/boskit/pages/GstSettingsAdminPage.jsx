import React, { useState, useEffect } from "react";
import { FiPercent, FiPlus, FiTrash2, FiRefreshCw, FiX, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function GstSettingsAdminPage() {
  const [taxRules, setTaxRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  const [formData, setFormData] = useState({
    rule_name: "",
    scope: "product",
    total_gst_pct: 18,
    hsn_code: "998399",
    status: "active",
  });

  const loadTaxRules = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/boskit/v1/admin/tax-rules`);
      if (res.data?.success) {
        setTaxRules(res.data.data?.rules || []);
      }
    } catch (err) {
      console.error("Error loading tax rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxRules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/boskit/v1/admin/tax-rules`, formData);
      setFeedback({ type: "success", msg: "Tax rule created successfully." });
      setIsModalOpen(false);
      loadTaxRules();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to create tax rule." });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this GST tax rule?")) return;
    try {
      await axios.delete(`${API_BASE}/boskit/v1/admin/tax-rules/${id}`);
      setFeedback({ type: "success", msg: "Tax rule deleted." });
      loadTaxRules();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to delete tax rule." });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiPercent /> Statutory Compliance & Taxation
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Goods & Services Tax (GST) Settings
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure CGST/SGST/IGST rates and HSN code statutory mappings across solar components.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTaxRules}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
          >
            <FiRefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Add GST Rule
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
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading GST rules...
          </div>
        ) : taxRules.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <p className="text-sm font-semibold">No custom tax rules found.</p>
            <p className="text-xs text-text-secondary">Default statutory rate: 18% GST (9% CGST + 9% SGST or 18% IGST).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Tax Rule Name</th>
                  <th className="p-4">HSN Code</th>
                  <th className="p-4">Total GST Rate</th>
                  <th className="p-4">Intrastate (CGST / SGST)</th>
                  <th className="p-4">Interstate (IGST)</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {taxRules.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4 font-bold text-text-primary">{t.rule_name}</td>
                    <td className="p-4 font-mono font-bold text-text-secondary">{t.hsn_code}</td>
                    <td className="p-4 font-bold text-primary text-sm">{t.total_gst_pct}%</td>
                    <td className="p-4">{t.cgst_pct}% CGST + {t.sgst_pct}% SGST</td>
                    <td className="p-4 font-semibold text-text-primary">{t.igst_pct}% IGST</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
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
              <h3 className="font-heading font-black text-lg text-text-primary">Create Statutory Tax Rule</h3>
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
                  placeholder="e.g. Solar Equipment 12% Standard"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">HSN/SAC Code</label>
                <input
                  type="text"
                  required
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Total GST Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.total_gst_pct}
                  onChange={(e) => setFormData({ ...formData, total_gst_pct: e.target.value })}
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
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
