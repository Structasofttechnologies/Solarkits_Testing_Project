import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaPaperPlane,
  FaCoins,
  FaClock,
  FaArrowRight,
  FaSyncAlt,
  FaExternalLinkAlt,
  FaCheck
} from "react-icons/fa";
import { getDashboardOverview } from "../../api/emailManagementApi";

export default function EmailDashboard({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardOverview();
      if (res?.success) {
        setData(res.data);
      } else {
        setError(res?.message || "Failed to load dashboard metrics");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <FaSyncAlt className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading dynamic email metrics from database...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Failed to connect to Email Management API</h3>
          <p className="text-xs mt-1 text-red-600">{error}</p>
        </div>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const today = kpis.today || { sent: 0, delivered: 0, failed: 0, bounced: 0 };
  const allTime = kpis.all_time || { total_sent: 0, delivered: 0, failed: 0, bounced: 0, delivery_rate_pct: 100, bounce_rate_pct: 0 };
  const quota = kpis.quota || { allocated: 0, used: 0, remaining: 0, usage_pct: 0 };
  const financials = kpis.financials || { invoiced: 0, paid: 0, pending: 0, currency: "INR" };
  const recent = data?.recent_activity || [];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Dispatched */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sent Today</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FaPaperPlane className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{today.sent.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-400">emails</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <FaCheck className="w-3 h-3" /> {today.delivered} delivered
            </span>
            <span>•</span>
            <span className="text-rose-500 font-medium">{today.failed} failed</span>
          </div>
        </div>

        {/* Card 2: Deliverability Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deliverability Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FaCheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{allTime.delivery_rate_pct}%</span>
            <span className="text-xs font-medium text-slate-400">all-time avg</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>Bounce Rate: <strong className="text-slate-700">{allTime.bounce_rate_pct}%</strong></span>
            <span>•</span>
            <span>Total: {allTime.total_sent}</span>
          </div>
        </div>

        {/* Card 3: Remaining Quota */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Remaining Quota</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FaCoins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-600">{quota.remaining.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-400">/ {quota.allocated.toLocaleString()}</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, quota.usage_pct)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>{quota.usage_pct}% consumed</span>
              <button
                onClick={() => onNavigateTab("quotas")}
                className="text-indigo-600 hover:underline font-semibold"
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Financial Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FaClock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">₹{financials.pending.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-400">pending</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Paid: <strong className="text-emerald-600">₹{financials.paid.toLocaleString()}</strong></span>
            <button
              onClick={() => onNavigateTab("billing")}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              Invoices <FaArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Provider Quick Status & Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 14-Day Delivery Activity */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Dispatch & Delivery Trends</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated daily volume across all active providers</p>
            </div>
            <button
              onClick={fetchOverview}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
              title="Refresh Data"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Simple visual bar sparkline for 14-day trends */}
          <div className="space-y-3 pt-2">
            {(data?.trends || []).slice(-7).map((t, idx) => {
              const maxVol = Math.max(...(data?.trends || []).map(x => x.sent), 10);
              const pct = Math.round((t.sent / maxVol) * 100);
              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-slate-500 font-medium">{t.date}</span>
                  <div className="flex-1 bg-slate-100 rounded-lg h-5 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                      title={`${t.delivered} Delivered`}
                    ></div>
                    {t.failed > 0 && (
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${Math.round((t.failed / maxVol) * 100)}%` }}
                        title={`${t.failed} Failed`}
                      ></div>
                    )}
                  </div>
                  <span className="w-16 text-right font-semibold text-slate-700">{t.sent} sent</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Control Shortcuts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quick Shortcuts</h2>
            <p className="text-xs text-slate-500 mt-0.5">Admin operational controls</p>

            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => onNavigateTab("providers")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">Manage Email Providers</div>
                  <div className="text-[11px] text-slate-500">Configure Sender, AWS SES, or SMTP keys</div>
                </div>
                <FaArrowRight className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab("resend")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">Resend Failed Emails</div>
                  <div className="text-[11px] text-slate-500">Recover eligible unreached messages</div>
                </div>
                <FaArrowRight className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigateTab("logs")}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition text-left"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">Audit Delivery Logs</div>
                  <div className="text-[11px] text-slate-500">Inspect recipient dispatch history & CSV</div>
                </div>
                <FaArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Status: <strong>All Systems Operational</strong></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
        </div>
      </div>

      {/* Recent Dispatches Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Dispatches</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time dynamic dispatches from database</p>
          </div>
          <button
            onClick={() => onNavigateTab("logs")}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            View All Logs <FaExternalLinkAlt className="w-2.5 h-2.5" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No emails recorded yet. Send a test email from Provider Management to verify live tracking.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Recipient</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Purpose</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((item) => {
                  const statusColors = {
                    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    accepted: "bg-blue-50 text-blue-700 border-blue-200",
                    failed: "bg-rose-50 text-rose-700 border-rose-200",
                    bounced: "bg-amber-50 text-amber-700 border-amber-200",
                    queued: "bg-slate-50 text-slate-600 border-slate-200"
                  };
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pl-2 font-semibold text-slate-900">{item.recipient}</td>
                      <td className="py-3 text-slate-600 max-w-xs truncate">{item.subject}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.provider}
                        </span>
                      </td>
                      <td className="py-3 capitalize text-slate-500">{item.purpose}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[item.status] || statusColors.queued}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString() : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
