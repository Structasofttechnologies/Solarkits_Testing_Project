import React from "react";
import {
  FaExclamationTriangle,
  FaClock,
  FaCheckCircle,
  FaArrowRight,
  FaUserShield,
  FaTimesCircle
} from "react-icons/fa";

export default function DelayMonitoringSection({
  metrics = {},
  records = [],
  onSelectOrder
}) {
  const delayList = Object.entries(metrics || {}).map(([key, val]) => ({
    key,
    ...val
  }));

  const getStatusBadge = (status) => {
    switch (status) {
      case "red":
        return {
          bg: "bg-rose-500/15 border-rose-300 dark:border-rose-900/40 text-rose-600 dark:text-rose-400",
          dot: "bg-rose-500",
          label: "TAT Exceeded (Red)"
        };
      case "orange":
        return {
          bg: "bg-amber-500/15 border-amber-300 dark:border-amber-900/40 text-amber-700 dark:text-amber-400",
          dot: "bg-amber-500 animate-pulse",
          label: "Approaching TAT (Orange)"
        };
      case "green":
        return {
          bg: "bg-emerald-500/15 border-emerald-300 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400",
          dot: "bg-emerald-500",
          label: "Within TAT (Green)"
        };
      default:
        return {
          bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800 text-slate-500",
          dot: "bg-slate-400",
          label: "Inactive / NA"
        };
    }
  };

  return (
    <div className="card p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FaExclamationTriangle className="text-amber-500 text-xl" />
            <span>Delay & Overdue SLA Monitoring</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Turnaround time (TAT) monitoring across all 10 fulfillment checkpoints. Identifies bottlenecks across Warehouse, Procurement, Transporters, and Account teams.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] self-start sm:self-auto font-medium">
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Within TAT
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Approaching
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Overdue
          </span>
        </div>
      </div>

      {/* 10 Delay Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {delayList.map((d) => {
          const badge = getStatusBadge(d.status);
          return (
            <div
              key={d.key}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.02] ${badge.bg}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-tight text-text-secondary line-clamp-1">
                  {d.name}
                </span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`} />
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-black leading-none">{d.count}</span>
                <span className="text-[10px] text-text-muted font-semibold">
                  TAT: {d.tat_hours}h
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overdue Records Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <FaClock className="text-amber-500" />
            <span>Active Overdue & SLA Breach Dossier ({records.length})</span>
          </h3>
          <span className="text-[11px] text-text-muted">
            Prioritized by overdue days
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border max-h-72 scrollbar-hover">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-bg/80 sticky top-0 z-10 border-b border-border text-text-secondary uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Order Number</th>
                <th className="py-2.5 px-3">Current Operational Stage</th>
                <th className="py-2.5 px-3">Expected Date</th>
                <th className="py-2.5 px-3">Responsible Team</th>
                <th className="py-2.5 px-3 text-center">Elapsed Days</th>
                <th className="py-2.5 px-3 text-center">Overdue Days</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-text-muted text-xs">
                    <span className="text-emerald-600 font-bold">Excellent!</span> No orders currently breaching TAT thresholds.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-rose-500/5 transition-colors duration-150"
                  >
                    <td className="py-2.5 px-3 font-bold text-primary font-mono">
                      {r.order_number}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      {r.current_stage}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted whitespace-nowrap text-[11px]">
                      {r.expected_date ? new Date(r.expected_date).toLocaleDateString() : "TBD"}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-bg border border-border">
                        <FaUserShield className="w-2.5 h-2.5 text-text-muted" />
                        {r.responsible_team}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-text-primary">
                      {r.elapsed_days}d
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-300">
                        +{r.overdue_days} Days
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectOrder && onSelectOrder(r.order_number)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Expedite Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

