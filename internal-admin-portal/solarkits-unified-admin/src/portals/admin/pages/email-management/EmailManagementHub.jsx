import React, { useState } from "react";
import {
  FaChartPie,
  FaServer,
  FaCoins,
  FaListAlt,
  FaRedoAlt,
  FaFileInvoiceDollar,
  FaChartLine,
  FaCog,
  FaEnvelopeOpenText,
  FaShieldAlt
} from "react-icons/fa";
import EmailDashboard from "./EmailDashboard";
import ProviderManagement from "./ProviderManagement";
import QuotaManagement from "./QuotaManagement";
import EmailLogs from "./EmailLogs";
import ResendManagement from "./ResendManagement";
import BillingPayments from "./BillingPayments";
import EmailAnalytics from "./EmailAnalytics";
import EmailSettings from "./EmailSettings";

const tabs = [
  { id: "dashboard", label: "Email Dashboard", icon: <FaChartPie className="w-4 h-4" /> },
  { id: "providers", label: "Provider Management", icon: <FaServer className="w-4 h-4" /> },
  { id: "quotas", label: "Quota & Limits", icon: <FaCoins className="w-4 h-4" /> },
  { id: "logs", label: "Email Logs", icon: <FaListAlt className="w-4 h-4" /> },
  { id: "resend", label: "Resend Queue", icon: <FaRedoAlt className="w-4 h-4" /> },
  { id: "billing", label: "Billing & Invoices", icon: <FaFileInvoiceDollar className="w-4 h-4" /> },
  { id: "analytics", label: "Deliverability Analytics", icon: <FaChartLine className="w-4 h-4" /> },
  { id: "settings", label: "Routing & Settings", icon: <FaCog className="w-4 h-4" /> }
];

export default function EmailManagementHub() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 lg:p-8">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FaEnvelopeOpenText className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Email Management & Monitoring
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Centralized email dispatch engine, provider failover routing (Sender / AWS SES / SMTP), dynamic quota ledger, and real-time deliverability telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-blue-50/80 border border-blue-200/60 rounded-xl text-xs text-blue-700 flex items-center gap-2 font-medium">
            <FaShieldAlt className="w-3.5 h-3.5 text-blue-600" />
            Permanent Bounce Guard Active
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm mb-6 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View Body */}
      <div className="transition-all duration-200">
        {activeTab === "dashboard" && <EmailDashboard onNavigateTab={setActiveTab} />}
        {activeTab === "providers" && <ProviderManagement />}
        {activeTab === "quotas" && <QuotaManagement />}
        {activeTab === "logs" && <EmailLogs />}
        {activeTab === "resend" && <ResendManagement />}
        {activeTab === "billing" && <BillingPayments />}
        {activeTab === "analytics" && <EmailAnalytics />}
        {activeTab === "settings" && <EmailSettings onNavigateTab={setActiveTab} />}
      </div>
    </div>
  );
}
