import React, { useState, useEffect } from "react";
import {
  FaServer,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaStar,
  FaRegStar,
  FaSyncAlt,
  FaPlay,
  FaPaperPlane,
  FaKey,
  FaSlidersH,
  FaCheck
} from "react-icons/fa";
import {
  getProviders,
  updateProviderConfig,
  setDefaultProvider,
  testProviderConnection,
  sendTestEmail
} from "../../api/emailManagementApi";

export default function ProviderManagement() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState(null);

  // Test Email Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    to: "",
    provider_key: "sender",
    subject: "SolarKits Email Management Test Dispatch",
    message: "Live verification email dispatched from SolarKits Unified Admin."
  });
  const [sendingTest, setSendingTest] = useState(false);

  // Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await getProviders();
      if (res?.success) {
        setProviders(res.data);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSetDefault = async (providerKey) => {
    try {
      const res = await setDefaultProvider(providerKey);
      if (res.success) {
        setMessage({ type: "success", text: `${providerKey} set as primary default provider.` });
        fetchProviders();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleTestConnection = async (providerKey) => {
    try {
      setTestingKey(providerKey);
      setTestResult(null);
      const res = await testProviderConnection(providerKey);
      setTestResult({
        providerKey,
        success: res.success,
        message: res.message,
        duration_ms: res.duration_ms
      });
      fetchProviders();
    } catch (err) {
      setTestResult({
        providerKey,
        success: false,
        message: err.message
      });
    } finally {
      setTestingKey(null);
    }
  };

  const handleSendTestEmailSubmit = async (e) => {
    e.preventDefault();
    if (!testEmailData.to) return;
    try {
      setSendingTest(true);
      const res = await sendTestEmail(testEmailData);
      if (res.success) {
        setMessage({ type: "success", text: `Test email dispatched to ${testEmailData.to} via ${res.data.provider}!` });
        setShowTestModal(false);
      } else {
        setMessage({ type: "error", text: res.message || "Failed to dispatch test email." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const openEditModal = (provider) => {
    setEditingProvider(provider);
    setEditForm({
      name: provider.name,
      is_enabled: provider.is_enabled,
      fallback_enabled: provider.fallback_enabled,
      fallback_provider_key: provider.fallback_provider_key || "aws_ses",
      max_send_rate: provider.max_send_rate,
      credentials: { ...(provider.credentials || {}) }
    });
  };

  const handleSaveProviderConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await updateProviderConfig(editingProvider.provider_key, editForm);
      if (res.success) {
        setMessage({ type: "success", text: "Provider settings updated successfully." });
        setEditingProvider(null);
        fetchProviders();
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configured Email Providers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage provider credentials, health monitoring, priority dispatch, and automatic fallback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            <FaPaperPlane className="w-3 h-3" />
            Send Live Test Email
          </button>
          <button
            onClick={fetchProviders}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh Providers"
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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

      {/* Test Connection Result Toast */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
            testResult.success
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              : "bg-rose-50/80 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <FaCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <FaTimesCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <strong>{testResult.providerKey.toUpperCase()} Test:</strong> {testResult.message}
              {testResult.duration_ms && (
                <span className="ml-2 text-slate-500 text-[11px]">({testResult.duration_ms}ms)</span>
              )}
            </div>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((p) => {
          const isDefault = p.is_default;
          const isHealthy = p.health_status === "healthy";
          const isDegraded = p.health_status === "degraded";

          return (
            <div
              key={p.provider_key}
              className={`bg-white rounded-2xl border transition shadow-sm p-6 flex flex-col justify-between ${
                isDefault ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                {/* Header: Name & Default Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                        <FaServer className="w-4 h-4" />
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase mt-1 block">
                      Key: {p.provider_key}
                    </span>
                  </div>

                  {isDefault ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <FaStar className="w-2.5 h-2.5 text-blue-600" /> Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(p.provider_key)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-blue-600 flex items-center gap-1 transition"
                      title="Set as Default Provider"
                    >
                      <FaRegStar className="w-3 h-3" /> Set Default
                    </button>
                  )}
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap items-center gap-2 my-4 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                      isHealthy
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isDegraded
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isHealthy ? "bg-emerald-500" : isDegraded ? "bg-amber-500" : "bg-slate-400"
                      }`}
                    ></span>
                    {p.health_status || "Untested"}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold border ${
                      p.is_enabled
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {p.is_enabled ? "Enabled" : "Disabled"}
                  </span>

                  {p.fallback_enabled && (
                    <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 text-[11px]">
                      Fallback: {p.fallback_provider_key || "auto"}
                    </span>
                  )}
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2 text-xs text-slate-600 py-3 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rate Limit:</span>
                    <span className="font-semibold text-slate-800">{p.max_send_rate} emails/sec</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sender Email:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {p.credentials?.from_email || "Default"}
                    </span>
                  </div>
                  {p.credentials?.api_key_masked && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">API Key:</span>
                      <span className="font-mono text-[11px] text-slate-700">{p.credentials.api_key_masked}</span>
                    </div>
                  )}
                  {p.last_tested_at && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Last Verified:</span>
                      <span>{new Date(p.last_tested_at).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleTestConnection(p.provider_key)}
                  disabled={testingKey === p.provider_key}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  <FaPlay className={`w-2.5 h-2.5 ${testingKey === p.provider_key ? "animate-spin" : ""}`} />
                  {testingKey === p.provider_key ? "Testing..." : "Test Health"}
                </button>
                <button
                  onClick={() => openEditModal(p)}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                  title="Edit Provider Settings"
                >
                  <FaSlidersH className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Send Live Test Email Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">Send Live Test Email</h3>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <form onSubmit={handleSendTestEmailSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Recipient Email *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@solarkits.in"
                  value={testEmailData.to}
                  onChange={(e) => setTestEmailData({ ...testEmailData, to: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Dispatch Provider</label>
                <select
                  value={testEmailData.provider_key}
                  onChange={(e) => setTestEmailData({ ...testEmailData, provider_key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {providers.map((p) => (
                    <option key={p.provider_key} value={p.provider_key}>
                      {p.name} ({p.provider_key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Subject</label>
                <input
                  type="text"
                  value={testEmailData.subject}
                  onChange={(e) => setTestEmailData({ ...testEmailData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition disabled:opacity-50"
                >
                  {sendingTest ? "Sending..." : "Dispatch Test"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {editingProvider && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900">
                Configure {editingProvider.name}
              </h3>
              <button onClick={() => setEditingProvider(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <form onSubmit={handleSaveProviderConfig} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Provider Display Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editForm.is_enabled}
                    onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">Enable Provider</span>
                </label>

                <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={editForm.fallback_enabled}
                    onChange={(e) => setEditForm({ ...editForm, fallback_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-semibold text-slate-800">Auto Fallback</span>
                </label>
              </div>

              {editForm.fallback_enabled && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fallback Provider</label>
                  <select
                    value={editForm.fallback_provider_key}
                    onChange={(e) => setEditForm({ ...editForm, fallback_provider_key: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="sender">Sender.net API</option>
                    <option value="aws_ses">AWS SES</option>
                    <option value="smtp">Dedicated SMTP Relay</option>
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Max Send Rate (per second)</label>
                <input
                  type="number"
                  value={editForm.max_send_rate}
                  onChange={(e) => setEditForm({ ...editForm, max_send_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sender Email Address (From)</label>
                <input
                  type="email"
                  value={editForm.credentials?.from_email || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      credentials: { ...editForm.credentials, from_email: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProvider(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
