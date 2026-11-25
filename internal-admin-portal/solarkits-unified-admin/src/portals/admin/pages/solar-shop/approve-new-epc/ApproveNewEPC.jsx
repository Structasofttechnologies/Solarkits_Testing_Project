// components/ApproveNewEPC.jsx
import React, { useState, lazy, Suspense } from "react";
import { FaUserCheck, FaGlobe, FaSpinner } from "react-icons/fa";

// Lazy load both heavy sub-modules on demand to eliminate initial bundle & execution lag
const ApproveNewEPCIndia = lazy(() => import("./ApproveNewEPCIndia"));
const WebsiteEpcLeads = lazy(() => import("../../dashboard/website-configuration/WebsiteEpcLeads"));

function TabLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-16 space-y-4 min-h-[320px] bg-surface rounded-2xl border border-border/60">
      <FaSpinner className="w-8 h-8 text-primary animate-spin" />
      <span className="text-sm font-bold text-text-muted tracking-wide">Loading module records...</span>
    </div>
  );
}

export default function ApproveNewEPC({ moduleUniqueId = "ADM_APPROVE_EPC" }) {
  const [activeTab, setActiveTab] = useState("self_registered");

  return (
    <div className="space-y-6">
      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border/80 bg-surface rounded-2xl p-2 shadow-sm">
        <button
          onClick={() => setActiveTab("self_registered")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === "self_registered"
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          }`}
        >
          <FaUserCheck className="text-sm" />
          <span>Self-Registered EPCs</span>
        </button>

        <button
          onClick={() => setActiveTab("website_leads")}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
            activeTab === "website_leads"
              ? "bg-primary text-white shadow-md shadow-primary/25"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          }`}
        >
          <FaGlobe className="text-sm" />
          <span>Website EPC Leads & Inquiries</span>
        </button>
      </div>

      {/* Lazy Loaded Sub-module View */}
      <Suspense fallback={<TabLoader />}>
        {activeTab === "self_registered" ? (
          <ApproveNewEPCIndia moduleUniqueId={moduleUniqueId} countryId="in" />
        ) : (
          <WebsiteEpcLeads />
        )}
      </Suspense>
    </div>
  );
}
