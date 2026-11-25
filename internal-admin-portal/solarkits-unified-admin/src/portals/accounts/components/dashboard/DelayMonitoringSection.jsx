import React, { useState } from "react";
import {
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaCalendarAlt,
  FaUserTie,
  FaHourglassEnd,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

export const DELAY_INDICATORS = [
  {
    key: "overdue_orders",
    label: "Overdue Orders",
    desc: "Exceeding configured stage TAT",
    badgeColor: "bg-red-500/10 text-red-600 border-red-300 dark:border-red-800/40",
    dot: "bg-red-500",
  },
  {
    key: "production_delay",
    label: "Production Delay",
    desc: "Supplier OEM lead time exceeded",
    badgeColor: "bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-800/40",
    dot: "bg-amber-500",
  },
  {
    key: "supplier_payment_delay",
    label: "Supplier Payment Delay",
    desc: "30% or 70% payment action overdue",
    badgeColor: "bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-800/40",
    dot: "bg-rose-500",
  },
  {
    key: "procurement_delay",
    label: "Procurement Delay",
    desc: "Procurement/PO grouping exceeds TAT",
    badgeColor: "bg-orange-500/10 text-orange-600 border-orange-300 dark:border-orange-800/40",
    dot: "bg-orange-500",
  },
  {
    key: "inward_delay",
    label: "Inward Delay",
    desc: "Goods not arrived within ETA",
    badgeColor: "bg-purple-500/10 text-purple-600 border-purple-300 dark:border-purple-800/40",
    dot: "bg-purple-500",
  },
  {
    key: "dispatch_delay",
    label: "Dispatch Delay",
    desc: "Vehicle not booked within TAT",
    badgeColor: "bg-yellow-500/10 text-yellow-700 border-yellow-300 dark:border-yellow-800/40",
    dot: "bg-yellow-500",
  },
  {
    key: "approval_delay",
    label: "Approval Delay",
    desc: "Admin approval pending > 24 hours",
    badgeColor: "bg-red-500/10 text-red-700 border-red-300 dark:border-red-800/40",
    dot: "bg-red-600",
  },
  {
    key: "customer_delivery_delay",
    label: "Customer Delivery Delay",
    desc: "Delivery exceeds customer promised date",
    badgeColor: "bg-red-500/10 text-red-600 border-red-300 dark:border-red-800/40",
    dot: "bg-red-500",
  },
];

export default function DelayMonitoringSection({
  metrics = {},
  records = [],
  onSelectOrder,
}) {
  const [expanded, setExpanded] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const filteredRecords = records.filter((r) => {
    if (selectedFilter === "red") return r.status_color === "red";
    if (selectedFilter === "orange") return r.status_color === "orange";
    return true;
  });

  return (
    <div id="delay-monitoring-section" className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header with Visual System Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-600 text-sm">
              <FaExclamationTriangle />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Delay & Overdue Monitoring
            </h3>
            <span className="text-[10px] bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
              {metrics.overdue_orders || records.length} Alerts Active
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Identify orders exceeding configured stage turnaround times (TAT) requiring immediate follow-up.
          </p>
        </div>

        {/* Visual Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Green: Within TAT</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Orange: Approaching</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse" />
            <span>Red: Overdue</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-text-muted hover:text-text-primary transition-colors ml-1"
            title={expanded ? "Collapse section" : "Expand section"}
          >
            {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* 8 TAT Delay Indicators Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 w-full max-w-full">
            {DELAY_INDICATORS.map((item) => {
              const val = metrics[item.key] ?? 0;
              return (
                <div
                  key={item.key}
                  className={`p-3 rounded-xl border bg-surface hover:shadow-xs transition-all flex flex-col justify-between min-w-0 ${val > 0
                      ? item.badgeColor
                      : "border-border/60 text-text-muted opacity-80"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span className="text-base font-black">
                      {val}
                    </span>
                  </div>
                  <div className="mt-2 min-w-0">
                    <h5 className="text-[11px] font-extrabold leading-tight text-text-primary truncate" title={item.label}>
                      {item.label}
                    </h5>
                    <p className="text-[9px] text-text-muted mt-0.5 line-clamp-1 break-words" title={item.desc}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delay Records Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-text-primary uppercase tracking-wider text-[11px]">
                Orders Requiring Action ({filteredRecords.length})
              </span>
              <div className="flex items-center gap-1 bg-surface-hover border border-border p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setSelectedFilter("all")}
                  className={`px-2 py-0.5 rounded ${selectedFilter === "all" ? "bg-primary text-white" : "text-text-secondary"
                    }`}
                >
                  All Alerts
                </button>
                <button
                  onClick={() => setSelectedFilter("red")}
                  className={`px-2 py-0.5 rounded ${selectedFilter === "red" ? "bg-red-500 text-white" : "text-text-secondary"
                    }`}
                >
                  TAT Exceeded (Red)
                </button>
                <button
                  onClick={() => setSelectedFilter("orange")}
                  className={`px-2 py-0.5 rounded ${selectedFilter === "orange" ? "bg-amber-500 text-white" : "text-text-secondary"
                    }`}
                >
                  Approaching (Orange)
                </button>
              </div>
            </div>

            <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border/80">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-surface-hover border-b border-border text-[10px] uppercase font-bold text-text-muted">
                  <tr>
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Current Stage</th>
                    <th className="py-2.5 px-3">Responsible Party</th>
                    <th className="py-2.5 px-3">Expected Date</th>
                    <th className="py-2.5 px-3">Elapsed</th>
                    <th className="py-2.5 px-3">Overdue Days</th>
                    <th className="py-2.5 px-3">Action Required</th>
                    <th className="py-2.5 px-3 text-right">Drill Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-surface">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((rec, idx) => {
                      const isRed = rec.status_color === "red";
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-surface-hover/70 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-primary">
                            {rec.order_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-text-primary">
                              {rec.current_stage}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${rec.responsible_team === "Account"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                    : rec.responsible_team === "Admin"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200"
                                  }`}
                              >
                                {rec.responsible_team}
                              </span>
                              <span className="text-text-secondary text-[11px] truncate max-w-[120px]">
                                {rec.responsible_person}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary">
                            {rec.expected_date || "—"}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-text-secondary">
                            {rec.elapsed_days}d
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`font-black px-2 py-0.5 rounded-full text-[10px] ${isRed
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                }`}
                            >
                              +{rec.overdue_days} days
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-text-primary max-w-xs truncate" title={rec.action_required}>
                            {rec.action_required}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => onSelectOrder?.(rec.order_number)}
                              className="text-primary hover:text-primary-hover font-bold text-[11px] inline-flex items-center gap-1 hover:underline"
                            >
                              <span>Take Action</span>
                              <FaArrowRight size={10} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-6 text-center text-text-muted italic"
                      >
                        No active delays match the selected criteria!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

