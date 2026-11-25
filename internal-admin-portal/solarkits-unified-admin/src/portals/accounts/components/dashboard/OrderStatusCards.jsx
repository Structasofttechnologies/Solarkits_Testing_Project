import React from "react";
import {
  FaBoxes,
  FaFileInvoice,
  FaCheckCircle,
  FaHourglassHalf,
  FaCogs,
  FaTruckLoading,
  FaShippingFast,
  FaCheckDouble,
  FaBan,
  FaUndoAlt,
  FaCoins,
  FaWarehouse,
  FaTools,
  FaUserShield,
} from "react-icons/fa";

export const ORDER_STATUS_CONFIG = [
  {
    key: "New Orders",
    title: "New Orders",
    desc: "Received & awaiting Account processing",
    icon: <FaBoxes />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800/40",
    activeRing: "ring-2 ring-blue-500 border-blue-500 shadow-md",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    modulePath: "/account-panel/new-orders",
  },
  {
    key: "Order Approval Pending",
    title: "Order Approval Pending",
    desc: "Awaiting Admin margin/price approval",
    icon: <FaUserShield />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800/40",
    activeRing: "ring-2 ring-amber-500 border-amber-500 shadow-md",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    modulePath: "/account-panel/procurement",
  },
  {
    key: "PO Pending",
    title: "PO Pending",
    desc: "Requiring PO preparation or sign-off",
    icon: <FaFileInvoice />,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/40",
    activeRing: "ring-2 ring-indigo-500 border-indigo-500 shadow-md",
    badgeBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    modulePath: "/account-panel/purchase-orders",
  },
  {
    key: "Procurement In Progress",
    title: "Procurement In Progress",
    desc: "Supplier selection, sourcing & grouping",
    icon: <FaHourglassHalf />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800/40",
    activeRing: "ring-2 ring-purple-500 border-purple-500 shadow-md",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    modulePath: "/account-panel/procurement",
  },
  {
    key: "Supplier Payment Pending",
    title: "Supplier Payment Pending",
    desc: "1st (30%) or 2nd (70%) payment action pending",
    icon: <FaCoins />,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800/40",
    activeRing: "ring-2 ring-rose-500 border-rose-500 shadow-md",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    modulePath: "/account-panel/payments",
  },
  {
    key: "Production In Progress",
    title: "Production In Progress",
    desc: "Supplier / OEM production underway",
    icon: <FaCogs />,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-300 dark:border-amber-700/40",
    activeRing: "ring-2 ring-amber-600 border-amber-600 shadow-md",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    modulePath: "/account-panel/procurement",
  },
  {
    key: "Warehouse Inward Pending",
    title: "Warehouse Inward Pending",
    desc: "Goods dispatched; awaiting GRN receipt",
    icon: <FaWarehouse />,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-500/10 border-teal-200 dark:border-teal-800/40",
    activeRing: "ring-2 ring-teal-500 border-teal-500 shadow-md",
    badgeBg: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    modulePath: "/account-panel/inward-invoices",
  },
  {
    key: "Kit Preparation",
    title: "Kit Preparation",
    desc: "BOSKIT / ComboKit assembly in progress",
    icon: <FaTools />,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-200 dark:border-cyan-800/40",
    activeRing: "ring-2 ring-cyan-500 border-cyan-500 shadow-md",
    badgeBg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    modulePath: "/account-panel/procurement",
  },
  {
    key: "Ready for Dispatch",
    title: "Ready for Dispatch",
    desc: "Packed & staged for Delivery Manager",
    icon: <FaTruckLoading />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/40",
    activeRing: "ring-2 ring-emerald-500 border-emerald-500 shadow-md",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    modulePath: "/account-panel/eway-bills",
  },
  {
    key: "Dispatched",
    title: "Dispatched",
    desc: "Vehicle in transit with active E-Way Bill",
    icon: <FaShippingFast />,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10 border-sky-200 dark:border-sky-800/40",
    activeRing: "ring-2 ring-sky-500 border-sky-500 shadow-md",
    badgeBg: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    modulePath: "/account-panel/eway-bills",
  },
  {
    key: "Delivered",
    title: "Delivered",
    desc: "Successfully delivered to customer / EPC",
    icon: <FaCheckCircle />,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 border-green-200 dark:border-green-800/40",
    activeRing: "ring-2 ring-green-500 border-green-500 shadow-md",
    badgeBg: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    modulePath: "/account-panel/invoices",
  },
  {
    key: "Completed",
    title: "Completed",
    desc: "All stages & financial settlements closed",
    icon: <FaCheckDouble />,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800/40",
    activeRing: "ring-2 ring-slate-500 border-slate-500 shadow-md",
    badgeBg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    modulePath: "/account-panel/invoices",
  },
  {
    key: "Cancelled",
    title: "Cancelled",
    desc: "Orders cancelled & payment reversed",
    icon: <FaBan />,
    color: "text-gray-500 dark:text-gray-400",
    bg: "bg-gray-500/10 border-gray-200 dark:border-gray-800/40",
    activeRing: "ring-2 ring-gray-500 border-gray-500 shadow-md",
    badgeBg: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    modulePath: "#",
  },
  {
    key: "Returned",
    title: "Returned",
    desc: "Undergoing return or replacement claim",
    icon: <FaUndoAlt />,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 border-red-200 dark:border-red-800/40",
    activeRing: "ring-2 ring-red-500 border-red-500 shadow-md",
    badgeBg: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    modulePath: "#",
  },
];

export default function OrderStatusCards({
  counts = {},
  selectedStatus,
  onSelectStatus,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-text-primary tracking-tight flex items-center gap-2">
            <span>Order Status Overview</span>
            <span className="text-[11px] font-semibold text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">
              14 Lifecycle Stages
            </span>
          </h3>
          <p className="text-xs text-text-secondary">
            Click any status card below to filter the Master Tracking Table or drill down directly into the stage.
          </p>
        </div>

        {selectedStatus && (
          <button
            onClick={() => onSelectStatus(null)}
            className="self-start sm:self-auto text-xs font-bold text-primary hover:text-primary-hover underline flex items-center gap-1.5 transition-all"
          >
            Clear active status filter ({selectedStatus})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-3 w-full max-w-full">
        {ORDER_STATUS_CONFIG.map((status) => {
          const countKey = status.key.toLowerCase().replace(/[\s-]/g, "_");
          const count = counts[countKey] ?? 0;
          const isSelected = selectedStatus === status.key;

          return (
            <div
              key={status.key}
              onClick={() => onSelectStatus(isSelected ? null : status.key)}
              className={`group relative min-w-0 p-3 rounded-2xl border transition-all cursor-pointer select-none bg-surface hover:shadow-md hover:-translate-y-0.5 ${isSelected
                  ? status.activeRing
                  : "border-border/70 hover:border-border"
                }`}
            >
              {/* Top Accent Icon & Badge */}
              <div className="flex items-center justify-between gap-1.5 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl flex items-center justify-center text-xs sm:text-sm border ${status.bg} ${status.color}`}
                >
                  {status.icon}
                </div>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${status.badgeBg}`}
                >
                  {count}
                </span>
              </div>

              {/* Title & Desc */}
              <div className="mt-2.5 min-w-0">
                <h4
                  className={`text-xs font-bold leading-snug truncate transition-colors ${isSelected ? "text-primary font-black" : "text-text-primary group-hover:text-primary"
                    }`}
                  title={status.title}
                >
                  {status.title}
                </h4>
                <p
                  className="text-[10px] text-text-secondary mt-0.5 line-clamp-2 leading-tight break-words"
                  title={status.desc}
                >
                  {status.desc}
                </p>
              </div>

              {/* Bottom active pill */}
              {isSelected && (
                <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] font-bold text-primary">
                  <span className="truncate">Active Filter</span>
                  <span className="shrink-0">●</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

