import React, { lazy, Suspense } from "react";
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaGlobe, FaStore, FaFileContract, FaUsersCog } from "react-icons/fa";
import { HiCube } from "react-icons/hi";
import { FiUsers } from "react-icons/fi";
import Loader from "../../../components/Loader";

const SolarKitsWebsite = lazy(() => import("./solar-kits/SolarKitsWebsite"));
const FranchiseWebsite = lazy(() => import("./franchise/FranchiseWebsite"));
const SolarStoreWebsite = lazy(() => import("./solar-store/SolarStoreWebsite"));
const WebsiteEpcLeads = lazy(() => import("./WebsiteEpcLeads"));

const TABS = [
  {
    name: "SolarKits Website",
    path: "/admin-panel/website-configurations/solar-kits",
    subPath: "solar-kits",
    icon: <HiCube className="text-lg" />,
    badge: "Main Website",
  },
  {
    name: "Franchise Website",
    path: "/admin-panel/website-configurations/franchise",
    subPath: "franchise",
    icon: <FaFileContract className="text-lg" />,
    badge: "Partners",
  },
  {
    name: "Solar Store Website",
    path: "/admin-panel/website-configurations/solar-store",
    subPath: "solar-store",
    icon: <FaStore className="text-lg" />,
    badge: "Storefront",
  },
  {
    name: "Website EPC Leads",
    path: "/admin-panel/website-configurations/epc-leads",
    subPath: "epc-leads",
    icon: <FiUsers className="text-lg" />,
    badge: "Bulk Inquiries",
  },
];

export default function WebsiteConfiguration() {
  const location = useLocation();
  const navigate = useNavigate();

  const isTabActive = (tabSubPath) => {
    return (
      location.pathname.includes(`/website-configurations/${tabSubPath}`) ||
      location.pathname.includes(`/website-configuration/${tabSubPath}`)
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
              <FaGlobe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-primary">Website Configurations</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Landing Pages CMS & EPC Leads
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Manage landing page content, store banners, product ribbons, and assign bulk EPC inquiries to BDEs.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const active = isTabActive(tab.subPath);
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent hover:border-border"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    active ? "bg-white/20 text-white" : "bg-surface-hover text-text-secondary"
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Routed Content */}
      <div className="min-h-[400px]">
        <Suspense fallback={<Loader text="Loading website settings..." />}>
          <Routes>
            <Route path="solar-kits/*" element={<SolarKitsWebsite />} />
            <Route path="franchise/*" element={<FranchiseWebsite />} />
            <Route path="solar-store/*" element={<SolarStoreWebsite />} />
            <Route path="epc-leads/*" element={<WebsiteEpcLeads />} />
            <Route path="leads/*" element={<WebsiteEpcLeads />} />
            <Route path="/" element={<Navigate to="solar-kits" replace />} />
            <Route path="*" element={<Navigate to="solar-kits" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
