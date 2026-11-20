import React, { useState } from 'react';
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaWhatsapp,
  FaEnvelope,
  FaMobileAlt,
  FaToggleOn,
  FaToggleOff,
  FaPaperPlane,
  FaSave,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';

export default function CampaignNotificationsPage() {
  const [alerts, setAlerts] = useState([
    {
      id: 'notif-1',
      title: 'Campaign Launch & Activation Confirmation',
      description: 'Sends real-time confirmation immediately when a marketing campaign is launched or scheduled by any manager.',
      severity: 'Info',
      inApp: true,
      email: true,
      whatsapp: false,
      recipients: 'Super Admin, Campaign Manager',
      enabled: true
    },
    {
      id: 'notif-2',
      title: 'WhatsApp Business API Disconnect or Token Expiry Alert',
      description: 'Urgent critical alert triggered if Meta Cloud API returns token expiry (Error 190), phone number disconnect, or payment block.',
      severity: 'Critical',
      inApp: true,
      email: true,
      whatsapp: true,
      recipients: 'Super Admin, Tech Ops',
      enabled: true
    },
    {
      id: 'notif-3',
      title: 'High Bounce Rate Threshold Warning (>5.0%)',
      description: 'Automatically pauses campaign dispatch and sends alarm if email bounce rate or WhatsApp delivery failure exceeds 5%.',
      severity: 'Warning',
      inApp: true,
      email: true,
      whatsapp: true,
      recipients: 'Super Admin, Campaign Manager',
      enabled: true
    },
    {
      id: 'notif-4',
      title: 'Campaign Target Milestone Reached (50% & 100%)',
      description: 'Notifies leadership when campaign lead generation or order conversion goal reaches 50% and 100% of the planned target.',
      severity: 'Success',
      inApp: true,
      email: true,
      whatsapp: true,
      recipients: 'Management, Cluster Managers',
      enabled: true
    },
    {
      id: 'notif-5',
      title: 'Campaign Budget Spend Depletion Warning (>80%)',
      description: 'Alerts financial operations when campaign messaging costs or marketing spend crosses 80% of allocated budget.',
      severity: 'Warning',
      inApp: true,
      email: true,
      whatsapp: false,
      recipients: 'Accounts Admin, Campaign Manager',
      enabled: true
    },
    {
      id: 'notif-6',
      title: 'Instant Commercial EPC Website Form Submission Alert',
      description: 'Instant notification on mobile and admin panel whenever a new commercial EPC, dealer or franchise form is submitted.',
      severity: 'Info',
      inApp: true,
      email: false,
      whatsapp: true,
      recipients: 'Cluster BDE, Sales Head',
      enabled: true
    },
    {
      id: 'notif-7',
      title: 'Daily Marketing MIS Performance Digest (9:00 AM)',
      description: 'Consolidated daily morning digest detailing dispatched messages, deliverability, leads captured, and orders generated.',
      severity: 'Info',
      inApp: true,
      email: true,
      whatsapp: true,
      recipients: 'Executive Directors, Cluster Operations',
      enabled: true
    }
  ]);

  const toggleAlert = (id) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const toggleChannel = (id, channel) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, [channel]: !a[channel] } : a))
    );
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            <FaBell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Campaign Notifications & Triggers</h1>
          <p className="text-sm text-slate-500">Configure real-time delivery alerts, WhatsApp API outage alarms, milestone notifications, and daily MIS digests.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Test Ping: A test high-priority notification was dispatched to your WhatsApp number & Admin Bell.')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
          >
            <FaPaperPlane className="text-blue-500" />
            <span>Send Test Alert Ping</span>
          </button>
          <button
            onClick={() => alert('Notification preferences saved successfully!')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
          >
            <FaSave />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      {/* Top Advisory */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <FaExclamationTriangle className="text-amber-500 text-lg shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300">
          <strong>Fail-Safe Disconnect Monitoring:</strong> WhatsApp Business Cloud API health is automatically pinged every 5 minutes. If a webhook or credential disconnect occurs, the system immediately halts scheduled dispatches to protect API rate limits and pings the Super Admin via SMS and Email.
        </div>
      </div>

      {/* Alerts Configuration Table/Cards */}
      <div className="space-y-4">
        {alerts.map((alertItem) => (
          <div
            key={alertItem.id}
            className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all ${
              alertItem.enabled
                ? 'border-slate-200 dark:border-slate-700/60 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    alertItem.severity === 'Critical'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : alertItem.severity === 'Warning'
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : alertItem.severity === 'Success'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}>
                    {alertItem.severity}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Recipients: <strong>{alertItem.recipients}</strong></span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{alertItem.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{alertItem.description}</p>
              </div>

              {/* Channel Selectors & Toggle */}
              <div className="flex flex-wrap items-center gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 mr-1">Channels:</span>
                  <button
                    onClick={() => toggleChannel(alertItem.id, 'inApp')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      alertItem.inApp ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <FaBell className="w-3 h-3" /> Bell
                  </button>
                  <button
                    onClick={() => toggleChannel(alertItem.id, 'email')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      alertItem.email ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <FaEnvelope className="w-3 h-3" /> Email
                  </button>
                  <button
                    onClick={() => toggleChannel(alertItem.id, 'whatsapp')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      alertItem.whatsapp ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <FaWhatsapp className="w-3 h-3" /> WhatsApp
                  </button>
                </div>

                <button
                  onClick={() => toggleAlert(alertItem.id)}
                  className="cursor-pointer text-2xl transition-transform active:scale-95"
                  title={alertItem.enabled ? 'Disable Notification' : 'Enable Notification'}
                >
                  {alertItem.enabled ? (
                    <FaToggleOn className="text-blue-600" />
                  ) : (
                    <FaToggleOff className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
