import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFileDownload,
  FaSyncAlt,
  FaEye,
  FaRedoAlt,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
  FaTimes
} from "react-icons/fa";
import { getEmailLogs, getEmailLogDetail, retrySingleEmail } from "../../api/emailManagementApi";

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [purpose, setPurpose] = useState("all");

  // Selected Log Drawer Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [logDetailLoading, setLogDetailLoading] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        search,
        provider,
        status,
        purpose
      };
      const res = await getEmailLogs(params);
      if (res?.success) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [provider, status, purpose]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const openLogDetail = async (id) => {
    try {
      setLogDetailLoading(true);
      setSelectedLog({ _id: id, loading: true });
      const res = await getEmailLogDetail(id);
      if (res?.success) {
        setSelectedLog(res.data);
      }
    } catch (err) {
      setSelectedLog(null);
    } finally {
      setLogDetailLoading(false);
    }
  };

  const handleRetryFromDetail = async (id) => {
    try {
      setRetryingId(id);
      const res = await retrySingleEmail(id);
      if (res.success) {
        setFeedback({ type: "success", text: "Email retried successfully!" });
        openLogDetail(id);
        fetchLogs(pagination.page);
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.response?.data?.message || err.message });
    } finally {
      setRetryingId(null);
    }
  };

  const handleExportCsv = () => {
    const rawApiUrl = (import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/admin-api").replace(/\/+$/, "");
    const exportUrl = `${rawApiUrl}/email-management/logs/export/csv?provider=${provider}&status=${status}`;
    window.open(exportUrl, "_blank");
  };

  const statusColors = {
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accepted: "bg-blue-50 text-blue-700 border-blue-200",
    failed: "bg-rose-50 text-rose-700 border-rose-200",
    bounced: "bg-amber-50 text-amber-700 border-amber-200",
    queued: "bg-slate-50 text-slate-600 border-slate-200"
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email Delivery & Audit Logs</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive ledger of all outgoing emails with attempt traces and delivery timestamps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <FaFileDownload className="w-3 h-3 text-slate-500" /> Export CSV
            </button>
            <button
              onClick={() => fetchLogs(pagination.page)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <form onSubmit={handleSearchSubmit} className="sm:col-span-1 relative">
            <input
              type="text"
              placeholder="Search recipient or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <FaSearch className="w-3 h-3 text-slate-400 absolute left-3 top-3" />
          </form>

          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Providers</option>
            <option value="sender">Sender.net</option>
            <option value="aws_ses">AWS SES</option>
            <option value="smtp">Standard SMTP</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
            <option value="queued">Queued</option>
          </select>

          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Purposes</option>
            <option value="transactional">Transactional</option>
            <option value="otp">OTP Verification</option>
            <option value="marketing">Marketing</option>
            <option value="alert">Alerts</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <FaSyncAlt className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading dynamic email logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No email logs match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-4">Recipient</th>
                  <th className="py-3">Subject</th>
                  <th className="py-3">Provider</th>
                  <th className="py-3">Purpose</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-center">Attempts</th>
                  <th className="py-3">Timestamp</th>
                  <th className="py-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 pl-4 font-semibold text-slate-900">{log.recipient}</td>
                    <td className="py-3 text-slate-600 max-w-xs truncate">{log.subject}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700">
                        {log.provider}
                      </span>
                    </td>
                    <td className="py-3 capitalize text-slate-500">{log.purpose}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[log.status] || statusColors.queued}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                        {log.attempts_count || 1}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => openLogDetail(log._id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition flex items-center gap-1 ml-auto"
                      >
                        <FaEye className="w-2.5 h-2.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{logs.length}</strong> of <strong>{pagination.total}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
              className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <FaChevronLeft className="w-3 h-3" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
              className="p-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <FaChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Details Modal Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Email Dispatch Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            {selectedLog.loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <FaSyncAlt className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading dispatch trace...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {feedback && (
                  <div className={`p-3 rounded-xl font-semibold ${feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                    {feedback.text}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Recipient:</span>
                    <strong className="text-slate-900 text-sm">{selectedLog.log?.recipient}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Status:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${statusColors[selectedLog.log?.status]}`}>
                      {selectedLog.log?.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Subject:</span>
                    <span className="text-slate-800 font-medium">{selectedLog.log?.subject}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Provider:</span>
                    <span className="font-bold uppercase text-slate-800">{selectedLog.log?.provider}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Message ID:</span>
                    <span className="font-mono text-slate-600">{selectedLog.log?.message_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Created At:</span>
                    <span className="text-slate-600">{selectedLog.log?.created_at ? new Date(selectedLog.log.created_at).toLocaleString() : "-"}</span>
                  </div>
                </div>

                {selectedLog.log?.error_message && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <strong className="block mb-1">Error Message:</strong>
                    {selectedLog.log.error_message}
                  </div>
                )}

                {/* Attempt History */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Attempt Trace & Failover History</h4>
                  <div className="space-y-2">
                    {(selectedLog.attempts || []).map((att) => (
                      <div key={att._id} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-[11px]">
                            #{att.attempt_number}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-800 uppercase">{att.provider}</div>
                            <div className="text-[11px] text-slate-400">
                              Duration: {att.duration_ms}ms • {new Date(att.dispatched_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${att.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          {att.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {selectedLog.log?.is_locked_bounce ? (
                    <span className="text-rose-600 font-semibold flex items-center gap-1.5">
                      <FaShieldAlt className="w-3.5 h-3.5" /> Locked: Permanent Bounce Guard Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRetryFromDetail(selectedLog.log?._id)}
                      disabled={retryingId === selectedLog.log?._id}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                    >
                      <FaRedoAlt className={`w-3 h-3 ${retryingId === selectedLog.log?._id ? "animate-spin" : ""}`} />
                      {retryingId === selectedLog.log?._id ? "Retrying..." : "Retry Dispatch"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 border rounded-xl font-semibold hover:bg-slate-50 text-slate-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
