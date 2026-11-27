import React, { useState, useEffect } from "react";
import {
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaServer,
  FaShieldAlt
} from "react-icons/fa";
import { getDeliverabilityAnalytics } from "../../api/emailManagementApi";

export default function EmailAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getDeliverabilityAnalytics();
      if (res?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const metrics = data?.metrics || { total_sent: 0, delivered: 0, failed: 0, bounced: 0, delivery_rate_pct: 100, bounce_rate_pct: 0 };
  const providers = data?.providers || [];
  const trends = data?.trends || [];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Deliverability & Performance Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliverability rates, bounce rates, provider response metrics, and 30-day telemetry trends.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <FaSyncAlt className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh Analytics
        </button>
      </div>

      {/* Deliverability Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Delivery Success Rate</div>
          <div className="text-3xl font-extrabold text-emerald-600">{metrics.delivery_rate_pct}%</div>
          <div className="text-xs text-slate-400 mt-1">Healthy reputation threshold: &gt; 95%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Bounce Rate</div>
          <div className="text-3xl font-extrabold text-amber-600">{metrics.bounce_rate_pct}%</div>
          <div className="text-xs text-slate-400 mt-1">Acceptable limit: &lt; 2.5%</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Total Emails Dispatched</div>
          <div className="text-3xl font-extrabold text-slate-900">{metrics.total_sent?.toLocaleString()}</div>
          <div className="text-xs text-slate-400 mt-1">Cumulative volume across all channels</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Reputation Protection</div>
          <div className="text-3xl font-extrabold text-blue-600">Active</div>
          <div className="text-xs text-slate-400 mt-1">Automatic bounce quarantine enabled</div>
        </div>
      </div>

      {/* Provider Matrix Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Provider Comparative Performance Matrix</h3>
        <p className="text-xs text-slate-500 mb-4">Volume and deliverability comparison across configured dispatchers</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="pb-3">Provider</th>
                <th className="pb-3">Dispatched</th>
                <th className="pb-3">Delivered</th>
                <th className="pb-3">Bounced</th>
                <th className="pb-3">Failed</th>
                <th className="pb-3">Deliverability Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providers.map((p) => (
                <tr key={p.provider} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 font-bold uppercase text-slate-800 flex items-center gap-2">
                    <FaServer className="w-3.5 h-3.5 text-blue-600" /> {p.provider}
                  </td>
                  <td className="py-3 font-semibold text-slate-700">{p.sent}</td>
                  <td className="py-3 text-emerald-600 font-semibold">{p.delivered}</td>
                  <td className="py-3 text-amber-600 font-semibold">{p.bounced}</td>
                  <td className="py-3 text-rose-600 font-semibold">{p.failed}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${p.delivery_rate}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-800">{p.delivery_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Volume Sparkline Trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">30-Day Dispatch Trajectory</h3>
        <p className="text-xs text-slate-500 mb-4">Daily volume distribution</p>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2">
          {trends.slice(-14).map((t, idx) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
              <div className="text-[11px] text-slate-400 font-semibold">{t.date.slice(5)}</div>
              <div className="text-lg font-extrabold text-slate-800 mt-1">{t.sent}</div>
              <div className="text-[10px] text-emerald-600 font-medium">{t.delivered} ok</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
