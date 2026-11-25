import React from "react";
import {
  FaWarehouse,
  FaSyncAlt,
  FaBoxes,
  FaTruck,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { FiRefreshCw, FiExternalLink } from "react-icons/fi";

export default function WarehouseHeroHeader({
  meta = {},
  refreshing = false,
  onRefresh,
  totalOrders = 0,
  warehouseMode = "master",
  onModeChange
}) {
  const now = new Date();
  const timeString = meta.synced_at
    ? new Date(meta.synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isSuperAdmin = !meta.manager_name || /super\s*admin/i.test(meta.manager_name);
  const managerDisplayName = isSuperAdmin ? "Delivery Manager" : meta.manager_name;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1e293b] via-[#243356] to-[#1e3a8a] text-white shadow-xl border border-white/10 p-6 md:p-8">
      {/* Decorative ambient background glows */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Branding & Manager Details */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Operations Online
            </span>
            <span className="text-xs text-slate-300/80 font-medium">
              Last synced: <span className="font-mono text-white font-semibold">{timeString}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Delivery Manager Dashboard
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mt-1.5 leading-relaxed">
              Warehouse & Fulfilment Control Panel • Welcome, <span className="text-white font-bold">{managerDisplayName}</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Operational Stats & Refresh */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Quick Stats Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-inner">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
              <FaBoxes className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Active Workload</div>
              <div className="text-lg font-black text-white leading-none">{totalOrders} Orders</div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border shadow-md active:scale-95 ${refreshing
                ? "bg-white/20 border-white/20 text-slate-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 hover:shadow-blue-500/25"
              }`}
            title="Refresh Real-time Data"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

