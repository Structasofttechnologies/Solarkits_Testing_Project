import React from "react";
import {
  FaBoxes,
  FaTruck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTools,
  FaShippingFast,
  FaHourglassHalf,
  FaExchangeAlt,
  FaFileInvoice,
  FaWarehouse,
  FaTruckLoading,
  FaDolly,
  FaBoxOpen,
  FaShieldAlt,
  FaClipboardCheck
} from "react-icons/fa";
import { MdOutlineLocalShipping, MdOutlineInventory2 } from "react-icons/md";

export default function OrderStatusOverviewSection({
  counts = {},
  selectedStatus,
  onSelectStatus
}) {
  const statusCards = [
    {
      key: "incoming_supplier_goods",
      label: "Incoming Supplier Goods",
      count: counts.incoming_supplier_goods ?? 0,
      description: "Supplier goods expected",
      icon: <FaWarehouse className="w-4 h-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40 hover:border-blue-400",
      activeBg: "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40"
    },
    {
      key: "pickup_pending",
      label: "Pickup Pending",
      count: counts.pickup_pending ?? 0,
      description: "Ready for company pickup",
      icon: <FaDolly className="w-4 h-4" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40 hover:border-amber-400",
      activeBg: "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40"
    },
    {
      key: "supplier_dispatch_pending",
      label: "Supplier Dispatch Pending",
      count: counts.supplier_dispatch_pending ?? 0,
      description: "Supplier delivery not dispatched",
      icon: <FaClock className="w-4 h-4" />,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40 hover:border-orange-400",
      activeBg: "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/40"
    },
    {
      key: "supplier_in_transit",
      label: "In Transit (Supplier)",
      count: counts.supplier_in_transit ?? 0,
      description: "Goods travelling to warehouse",
      icon: <FaTruckLoading className="w-4 h-4" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/40 hover:border-indigo-400",
      activeBg: "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
    },
    {
      key: "warehouse_inward_pending",
      label: "Warehouse Inward Pending",
      count: counts.warehouse_inward_pending ?? 0,
      description: "Goods expected at warehouse",
      icon: <MdOutlineInventory2 className="w-4 h-4" />,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10 border-sky-200 dark:border-sky-900/40 hover:border-sky-400",
      activeBg: "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/40"
    },
    {
      key: "partially_received",
      label: "Partially Received",
      count: counts.partially_received ?? 0,
      description: "Partial goods inwarded, balance pending",
      icon: <FaBoxOpen className="w-4 h-4" />,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10 border-violet-200 dark:border-violet-900/40 hover:border-violet-400",
      activeBg: "ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-950/40"
    },
    {
      key: "inward_completed",
      label: "Inward Completed",
      count: counts.inward_completed ?? 0,
      description: "All required goods physically received",
      icon: <FaCheckCircle className="w-4 h-4" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400",
      activeBg: "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
    },
    {
      key: "inventory_allocation_pending",
      label: "Stock Allocation Pending",
      count: counts.inventory_allocation_pending ?? 0,
      description: "Stock needs allocation/reservation",
      icon: <FaHourglassHalf className="w-4 h-4" />,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-500/15 border-amber-300 dark:border-amber-800/40 hover:border-amber-500",
      activeBg: "ring-2 ring-amber-600 bg-amber-100/50 dark:bg-amber-950/40"
    },
    {
      key: "boskit_combokit_preparation",
      label: "BOSKIT / ComboKit Prep",
      count: counts.boskit_combokit_preparation ?? 0,
      description: "Kit assembly in progress",
      icon: <FaTools className="w-4 h-4" />,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-200 dark:border-cyan-900/40 hover:border-cyan-400",
      activeBg: "ring-2 ring-cyan-500 bg-cyan-50 dark:bg-cyan-950/40"
    },
    {
      key: "awaiting_missing_components",
      label: "Awaiting Missing Components",
      count: counts.awaiting_missing_components ?? 0,
      description: "Kit shortage reported",
      icon: <FaExclamationTriangle className="w-4 h-4" />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-200 dark:border-rose-900/40 hover:border-rose-400",
      activeBg: "ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40"
    },
    {
      key: "ready_for_dispatch",
      label: "Ready for Dispatch",
      count: counts.ready_for_dispatch ?? 0,
      description: "Kit completed, verified & staged",
      icon: <FaClipboardCheck className="w-4 h-4" />,
      color: "text-blue-700 dark:text-blue-300",
      bg: "bg-blue-600/10 border-blue-300 dark:border-blue-800/40 hover:border-blue-500",
      activeBg: "ring-2 ring-blue-600 bg-blue-100/50 dark:bg-blue-950/40"
    },
    {
      key: "vehicle_booking_pending",
      label: "Vehicle Booking Pending",
      count: counts.vehicle_booking_pending ?? 0,
      description: "Transport arrangement required",
      icon: <FaTruck className="w-4 h-4" />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200 dark:border-amber-900/40 hover:border-amber-400",
      activeBg: "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40"
    },
    {
      key: "vehicle_booked",
      label: "Vehicle Booked",
      count: counts.vehicle_booked ?? 0,
      description: "Transport confirmed & scheduled",
      icon: <FaTruck className="w-4 h-4" />,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-200 dark:border-teal-900/40 hover:border-teal-400",
      activeBg: "ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950/40"
    },
    {
      key: "dispatched",
      label: "Gate Dispatched",
      count: counts.dispatched ?? 0,
      description: "Customer order departed warehouse",
      icon: <FaShippingFast className="w-4 h-4" />,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10 border-purple-200 dark:border-purple-900/40 hover:border-purple-400",
      activeBg: "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/40"
    },
    {
      key: "in_transit_customer",
      label: "In Transit to Customer",
      count: counts.in_transit_customer ?? 0,
      description: "Vehicle en route to destination site",
      icon: <MdOutlineLocalShipping className="w-4 h-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200 dark:border-blue-900/40 hover:border-blue-400",
      activeBg: "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40"
    },
    {
      key: "delivered",
      label: "Delivered",
      count: counts.delivered ?? 0,
      description: "Goods arrived at customer premises",
      icon: <FaCheckCircle className="w-4 h-4" />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-400",
      activeBg: "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
    },
    {
      key: "pod_pending",
      label: "POD Pending",
      count: counts.pod_pending ?? 0,
      description: "Delivery photo/OTP unconfirmed",
      icon: <FaFileInvoice className="w-4 h-4" />,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500/10 border-orange-200 dark:border-orange-900/40 hover:border-orange-400",
      activeBg: "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950/40"
    },
    {
      key: "completed",
      label: "Process Completed",
      count: counts.completed ?? 0,
      description: "Delivery validated & archived",
      icon: <FaShieldAlt className="w-4 h-4" />,
      color: "text-slate-600 dark:text-slate-300",
      bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800 hover:border-slate-400",
      activeBg: "ring-2 ring-slate-500 bg-slate-100 dark:bg-slate-900"
    }
  ];

  return (
    <div className="card p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaBoxes className="text-primary text-xl" />
            <span>Order Status Overview</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              18 Status Workstations
            </span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Click any status card to filter master orders or navigate directly to the relevant operational queue.
          </p>
        </div>

        {selectedStatus && (
          <button
            onClick={() => onSelectStatus(null)}
            className="text-xs font-semibold px-3 py-1 rounded-lg bg-text-secondary/10 hover:bg-text-secondary/20 text-text-primary self-start sm:self-auto transition-colors"
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      {/* 18-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {statusCards.map((card) => {
          const isSelected = selectedStatus === card.key;
          return (
            <div
              key={card.key}
              onClick={() => onSelectStatus(isSelected ? null : card.key)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between select-none hover:shadow-md hover:-translate-y-0.5 ${
                card.bg
              } ${isSelected ? card.activeBg : ""}`}
              title={`${card.label} — ${card.description}`}
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-tight text-text-secondary line-clamp-1">
                  {card.label}
                </span>
                <span className={`shrink-0 ${card.color}`}>{card.icon}</span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className={`text-2xl font-black tracking-tight ${card.color}`}>
                  {card.count}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary text-white">
                    Active
                  </span>
                )}
              </div>

              <p className="text-[10px] text-text-muted mt-1 truncate">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

