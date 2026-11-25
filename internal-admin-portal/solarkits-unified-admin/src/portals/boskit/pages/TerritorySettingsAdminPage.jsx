import React, { useState, useEffect } from "react";
import { FiMapPin, FiPlus, FiRefreshCw, FiShield, FiX, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TerritorySettingsAdminPage() {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [distributors, setDistributors] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", msg: "" });

  const [formData, setFormData] = useState({
    distributor_id: "",
    state_name: "Gujarat",
    district_name: "Ahmedabad",
    is_exclusive: true,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [terrRes, distRes] = await Promise.all([
        axios.get(`${API_BASE}/boskit/v1/admin/territories`),
        axios.get(`${API_BASE}/boskit/v1/admin/distributors`),
      ]);
      if (terrRes.data?.success) setTerritories(terrRes.data.data?.territories || []);
      if (distRes.data?.success) setDistributors(distRes.data.data?.distributors || []);
    } catch (err) {
      console.error("Error loading territories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/boskit/v1/admin/territories/assign`, formData);
      setFeedback({ type: "success", msg: "Territory allocated successfully." });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFeedback({ type: "error", msg: "Failed to allocate territory." });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <FiMapPin /> Territorial Governance
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-text-primary mt-1">
            Territory Allocations & Exclusivity Master
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Regional franchise revenue district allocations and territorial non-compete locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary transition-colors"
          >
            <FiRefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <FiPlus size={16} /> Allocate Territory
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
            <FiRefreshCw className="animate-spin inline-block mr-2" /> Loading territory allocations...
          </div>
        ) : territories.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <FiShield size={32} className="mx-auto text-text-muted/40" />
            <p className="text-sm font-semibold">No territories allocated yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface-hover/70 text-text-muted font-bold uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="p-4">Assigned Franchise / Distributor</th>
                  <th className="p-4">Territory State</th>
                  <th className="p-4">Assigned District</th>
                  <th className="p-4">Exclusivity Status</th>
                  <th className="p-4">Allocation Type</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {territories.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-hover/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-text-primary">{t.distributor_name}</div>
                      <div className="text-[10px] font-mono text-text-muted">{t.distributor_gst}</div>
                    </td>
                    <td className="p-4 font-semibold text-text-primary">{t.state}</td>
                    <td className="p-4 font-semibold text-text-primary">{t.district}</td>
                    <td className="p-4">
                      {t.is_exclusive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Exclusive Lock
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          Non-Exclusive
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-text-muted capitalize">{t.assignment_source.replace(/_/g, " ")}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
                        {t.status}
                      </span>
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
              <h3 className="font-heading font-black text-lg text-text-primary">Allocate Territory</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted">
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Select Distributor</label>
                <select
                  required
                  value={formData.distributor_id}
                  onChange={(e) => setFormData({ ...formData, distributor_id: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                >
                  <option value="">-- Choose Distributor --</option>
                  {distributors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.business_name} ({d.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">State Name</label>
                <input
                  type="text"
                  required
                  value={formData.state_name}
                  onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">District Name</label>
                <input
                  type="text"
                  required
                  value={formData.district_name}
                  onChange={(e) => setFormData({ ...formData, district_name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-surface border border-border text-text-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isExcl"
                  checked={formData.is_exclusive}
                  onChange={(e) => setFormData({ ...formData, is_exclusive: e.target.checked })}
                  className="rounded text-primary h-4 w-4"
                />
                <label htmlFor="isExcl" className="text-xs font-semibold text-text-primary">
                  Lock territory exclusively to this franchise
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
                <button type="submit" className="px-5 py-2 text-xs font-bold rounded-xl bg-primary text-white">
                  Confirm Territory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
