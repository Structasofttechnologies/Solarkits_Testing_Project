import React, { useState, useEffect } from "react";
import {
  FaCoins,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSlidersH,
  FaRedo
} from "react-icons/fa";
import { getQuotas, updateQuotaConfig, resetQuotaUsage } from "../../api/emailManagementApi";

export default function QuotaManagement() {
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [editingQuota, setEditingQuota] = useState(null);
  const [form, setForm] = useState({ allocated_limit: "", low_quota_threshold: "", reset_period: "monthly" });

  const fetchQuotas = async () => {
    try {
      setLoading(true);
      const res = await getQuotas();
      if (res?.success) {
        setQuotas(res.data);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
  }, []);

  const openEdit = (q) => {
    setEditingQuota(q);
    setForm({
      allocated_limit: q.allocated_limit,
      low_quota_threshold: q.low_quota_threshold,
      reset_period: q.reset_period
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await updateQuotaConfig(editingQuota.provider, form);
      if (res.success) {
        setMessage({ type: "success", text: `Quota limits updated for ${editingQuota.provider_name}.` });
        setEditingQuota(null);
        fetchQuotas();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleReset = async (provider, name) => {
    if (!window.confirm(`Are you sure you want to reset the usage counter for ${name}?`)) return;
    try {
      const res = await resetQuotaUsage(provider);
      if (res.success) {
        setMessage({ type: "success", text: `Usage counter for ${name} reset to 0.` });
        fetchQuotas();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Quota & Consumption Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time remaining sending credits, set low-quota trigger thresholds, and audit period cycles.
          </p>
        </div>
        <button
          onClick={fetchQuotas}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <FaSyncAlt className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh Quotas
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quotas.map((q) => {
          const isCritical = q.is_low;
          const pct = q.usage_percentage || 0;

          return (
            <div
              key={q.provider}
              className={`bg-white border rounded-2xl p-6 shadow-sm transition flex flex-col justify-between ${
                isCritical ? "border-amber-400 bg-amber-50/20" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <FaCoins className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{q.provider_name}</h3>
                      <span className="text-[11px] font-mono uppercase text-slate-400">{q.provider}</span>
                    </div>
                  </div>

                  {isCritical && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <FaExclamationTriangle className="w-2.5 h-2.5" /> Low Quota
                    </span>
                  )}
                </div>

                {/* Big Remaining Count */}
                <div className="my-4">
                  <div className="text-xs text-slate-400 font-semibold uppercase">Remaining Credits</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">
                    {q.remaining_count.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    of <strong>{q.allocated_limit.toLocaleString()}</strong> allocated
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 my-3">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Usage: {pct}%</span>
                    <span>Used: {q.used_count.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Meta details */}
                <div className="text-xs text-slate-500 space-y-1.5 pt-3 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reset Cycle:</span>
                    <span className="font-semibold capitalize text-slate-700">{q.reset_period.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Low Alert At:</span>
                    <span className="font-semibold text-slate-700">≤ {q.low_quota_threshold.toLocaleString()}</span>
                  </div>
                  {q.last_synced_at && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Last Synced:</span>
                      <span>{new Date(q.last_synced_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => openEdit(q)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <FaSlidersH className="w-3 h-3" /> Adjust Limit
                </button>
                <button
                  onClick={() => handleReset(q.provider, q.provider_name)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
                  title="Reset used counter"
                >
                  <FaRedo className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Quota Limit Modal */}
      {editingQuota && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">
                Adjust Quota: {editingQuota.provider_name}
              </h3>
              <button onClick={() => setEditingQuota(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Allocated Credit Limit</label>
                <input
                  type="number"
                  required
                  value={form.allocated_limit}
                  onChange={(e) => setForm({ ...form, allocated_limit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Low Quota Alert Threshold</label>
                <input
                  type="number"
                  required
                  value={form.low_quota_threshold}
                  onChange={(e) => setForm({ ...form, low_quota_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Triggers an in-platform alert when remaining credits fall below this value.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reset Period</label>
                <select
                  value={form.reset_period}
                  onChange={(e) => setForm({ ...form, reset_period: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="rolling_24h">Rolling 24h</option>
                  <option value="unlimited">Unlimited / Manual</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuota(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
