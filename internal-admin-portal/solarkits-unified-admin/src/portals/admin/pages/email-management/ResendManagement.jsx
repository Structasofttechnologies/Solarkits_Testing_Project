import React, { useState, useEffect } from "react";
import {
  FaRedoAlt,
  FaShieldAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaLock
} from "react-icons/fa";
import { getResendQueue, retrySingleEmail, retryBulkEmails } from "../../api/emailManagementApi";

export default function ResendManagement() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [providerFilter, setProviderFilter] = useState("all");

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await getResendQueue({ provider: providerFilter });
      if (res?.success) {
        setQueue(res.data || []);
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [providerFilter]);

  const handleRetrySingle = async (id) => {
    try {
      setRetryingId(id);
      const res = await retrySingleEmail(id);
      if (res.success) {
        setFeedback({ type: "success", text: "Email recovered and dispatched successfully!" });
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryBulk = async () => {
    if (!window.confirm("Retry all eligible failed emails in queue? (Permanent bounces will be skipped safely)")) return;
    try {
      setBulkRetrying(true);
      const res = await retryBulkEmails({ provider: providerFilter !== "all" ? providerFilter : null });
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Bulk recovery completed: ${res.data.succeeded} recovered, ${res.data.failed} unrecovered.`
        });
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setBulkRetrying(false);
    }
  };

  const eligibleCount = queue.filter(q => !q.is_locked_bounce && q.is_resend_eligible).length;
  const lockedCount = queue.filter(q => q.is_locked_bounce).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Permanent Bounce Compliance Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resend & Recovery Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Safely retry failed outgoing messages with automated bounce protection guards.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetryBulk}
              disabled={bulkRetrying || eligibleCount === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
            >
              <FaRedoAlt className={`w-3 h-3 ${bulkRetrying ? "animate-spin" : ""}`} />
              {bulkRetrying ? "Retrying..." : `Retry All Eligible (${eligibleCount})`}
            </button>
            <button
              onClick={fetchQueue}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh Queue"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Security Banner */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-800">
          <div className="flex items-center gap-2.5">
            <FaShieldAlt className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Sender Reputation Guard:</strong> Permanent bounces (hard bounce / spam complaint) are strictly locked to protect IP reputation.
            </span>
          </div>
          <span className="font-semibold bg-blue-100/80 px-2 py-0.5 rounded-md text-[11px]">
            {lockedCount} Locked
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Unreached Email Queue ({queue.length})
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Providers</option>
            <option value="sender">Sender.net</option>
            <option value="aws_ses">AWS SES</option>
            <option value="smtp">Standard SMTP</option>
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FaSyncAlt className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Scanning failed message queue...
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center text-emerald-600 text-xs">
            <FaCheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <span className="font-bold block text-slate-800 text-sm">Resend Queue is Clean!</span>
            No failed emails pending retry. All dispatches delivered successfully.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-4">Recipient</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Provider</th>
                  <th className="py-3">Reason / Error</th>
                  <th className="py-3 text-center">Attempts</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((item) => {
                  const isLocked = item.is_locked_bounce;
                  const isEligible = !isLocked && item.is_resend_eligible;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 pl-4 font-semibold text-slate-900">{item.recipient}</td>
                      <td className="py-3 text-slate-600 max-w-xs truncate">{item.subject}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                          {item.provider}
                        </span>
                      </td>
                      <td className="py-3 text-rose-600 max-w-xs truncate font-medium">
                        {item.error_message || "Delivery rejected"}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">
                        {item.attempts_count} / {item.max_attempts}
                      </td>
                      <td className="py-3">
                        {isLocked ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                            <FaLock className="w-2.5 h-2.5" /> Permanent Lock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Eligible for Retry
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {isLocked ? (
                          <span className="text-[11px] text-slate-400 italic">Locked</span>
                        ) : (
                          <button
                            onClick={() => handleRetrySingle(item._id)}
                            disabled={retryingId === item._id || !isEligible}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition disabled:opacity-40"
                          >
                            {retryingId === item._id ? "Retrying..." : "Retry Now"}
                          </button>
                        )}
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
