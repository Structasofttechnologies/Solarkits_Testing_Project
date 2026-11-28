import React, { useState } from "react";
import {
  FaSlidersH,
  FaShieldAlt,
  FaBell,
  FaCheck,
  FaArrowRight
} from "react-icons/fa";

export default function EmailSettings({ onNavigateTab }) {
  const [saved, setSaved] = useState(false);
  const [routingRules, setRoutingRules] = useState({
    transactionalProvider: "aws_ses",
    marketingProvider: "sender",
    alertProvider: "smtp",
    autoFallback: true,
    alertEmail: "admin@solarkits.in",
    lowQuotaAlertActive: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Email Routing & Operational Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default provider routing rules, failover behavior, and low-quota notification recipients.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <FaCheck className="w-3.5 h-3.5" /> Routing and notification rules saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Routing Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FaSlidersH className="w-4 h-4 text-blue-600" />
            Purpose-Based Provider Dispatch Rules
          </h3>
          <p className="text-xs text-slate-500">
            Route high-priority transactional OTPs through low-latency relays while directing marketing blasts through bulk providers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Transactional & OTP Emails
              </label>
              <select
                value={routingRules.transactionalProvider}
                onChange={(e) => setRoutingRules({ ...routingRules, transactionalProvider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none"
              >
                <option value="aws_ses">AWS SES (High Delivery Speed)</option>
                <option value="smtp">Dedicated SMTP</option>
                <option value="sender">Sender.net</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Marketing & Campaign Emails
              </label>
              <select
                value={routingRules.marketingProvider}
                onChange={(e) => setRoutingRules({ ...routingRules, marketingProvider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none"
              >
                <option value="sender">Sender.net (Optimized Bulk API)</option>
                <option value="aws_ses">AWS SES</option>
                <option value="smtp">Dedicated SMTP</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                System & Security Alerts
              </label>
              <select
                value={routingRules.alertProvider}
                onChange={(e) => setRoutingRules({ ...routingRules, alertProvider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none"
              >
                <option value="smtp">Dedicated SMTP Relay</option>
                <option value="aws_ses">AWS SES</option>
                <option value="sender">Sender.net</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={routingRules.autoFallback}
                onChange={(e) => setRoutingRules({ ...routingRules, autoFallback: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-xs font-semibold text-slate-800">
                Enable Automatic Failover on Quota Depletion or Dispatch Failure
              </span>
            </label>
          </div>
        </div>

        {/* Alert Notifications Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FaBell className="w-4 h-4 text-amber-500" />
            Low-Quota & Deliverability Notification Alerts
          </h3>
          <p className="text-xs text-slate-500">
            Receive automated alerts before credits run out or when bounce rates exceed threshold.
          </p>

          <div className="space-y-3 text-xs max-w-md">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Notification Recipient Email Address
              </label>
              <input
                type="email"
                value={routingRules.alertEmail}
                onChange={(e) => setRoutingRules({ ...routingRules, alertEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={routingRules.lowQuotaAlertActive}
                onChange={(e) => setRoutingRules({ ...routingRules, lowQuotaAlertActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="font-semibold text-slate-800">
                Notify admin when provider quota is below 15% remaining
              </span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
