import React from "react";
import {
  FaCogs,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTruck,
  FaWarehouse,
  FaCoins,
  FaBuilding,
  FaArrowRight,
  FaExternalLinkAlt,
  FaPhoneAlt,
  FaShieldAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function ProductionSupplierSection({
  summary = {},
  suppliers = [],
  onSelectSupplier,
}) {
  const navigate = useNavigate();

  const productionCards = [
    {
      label: "Orders in Production",
      value: summary.in_production || 0,
      icon: <FaCogs />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800/40",
    },
    {
      label: "Production Completed",
      value: summary.production_completed || 0,
      icon: <FaCheckCircle />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/40",
    },
    {
      label: "Production Overdue",
      value: summary.production_overdue || 0,
      icon: <FaExclamationTriangle />,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10 border-red-200 dark:border-red-800/40",
    },
    {
      label: "Supplier Dispatch Pending",
      value: summary.supplier_dispatch_pending || 0,
      icon: <FaTruck />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800/40",
    },
    {
      label: "Supplier Goods in Transit",
      value: summary.goods_in_transit || 0,
      icon: <FaTruck />,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/40",
    },
    {
      label: "Warehouse Inward Pending",
      value: summary.warehouse_inward_pending || 0,
      icon: <FaWarehouse />,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-200 dark:border-teal-800/40",
    },
    {
      label: "Supplier Payment Pending",
      value: summary.supplier_payment_pending || 0,
      icon: <FaCoins />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800/40",
    },
    {
      label: "Supplier Follow-up Required",
      value: summary.supplier_followup_required || 0,
      icon: <FaPhoneAlt />,
      color: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-500/10 border-amber-300 dark:border-amber-700/40",
    },
  ];

  return (
    <div className="card p-5 space-y-4 border border-border/80 shadow-xs w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
              <FaCogs />
            </span>
            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase">
              Production & Supplier Monitoring
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Real-time status of Tier-1 OEMs, production runs, transit tracking, and supplier SLAs.
          </p>
        </div>

        <button
          onClick={() => navigate("/account-panel/procurement")}
          className="self-start sm:self-auto text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1.5 hover:underline"
        >
          <span>Open Full Procurement Module</span>
          <FaExternalLinkAlt size={10} />
        </button>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 w-full max-w-full">
        {productionCards.map((card, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border bg-surface flex flex-col justify-between hover:shadow-xs transition-all min-w-0 ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm ${card.color}`}>{card.icon}</span>
              <span className="text-base font-black text-text-primary">
                {card.value}
              </span>
            </div>
            <div className="mt-2 min-w-0">
              <h5 className="text-[10px] font-bold text-text-primary leading-tight truncate" title={card.label}>
                {card.label}
              </h5>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier-wise Progress Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-text-primary uppercase tracking-wider text-[11px]">
            Supplier Progress & Allocation Matrix
          </span>
          <span className="text-[11px] text-text-muted">
            Clicking a supplier filters orders and active procurement records
          </span>
        </div>

        <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-surface-hover border-b border-border text-[10px] uppercase font-bold text-text-muted">
              <tr>
                <th className="py-2.5 px-3">Supplier Name & Brand</th>
                <th className="py-2.5 px-3 text-center">Active Orders</th>
                <th className="py-2.5 px-3 text-center">Production Pending</th>
                <th className="py-2.5 px-3 text-center">Dispatch Pending</th>
                <th className="py-2.5 px-3 text-center">Overdue</th>
                <th className="py-2.5 px-3 text-center">SLA Compliance</th>
                <th className="py-2.5 px-3 text-right">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {suppliers.map((s) => (
                <tr
                  key={s.supplier_id}
                  onClick={() => onSelectSupplier?.(s.supplier_name)}
                  className="hover:bg-surface-hover/70 transition-colors cursor-pointer group"
                >
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <FaBuilding className="text-text-muted text-xs" />
                      <span>{s.supplier_name}</span>
                    </div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                      {s.brand} • {s.contact_person}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-text-primary">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono">
                      {s.active_orders}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-amber-600 font-mono">
                    {s.production_pending}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-indigo-600 font-mono">
                    {s.dispatch_pending}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {s.overdue > 0 ? (
                      <span className="font-mono font-black text-red-600 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-[10px]">
                        {s.overdue} Delay
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[10px]">On Track</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-600">
                    {s.compliance_score}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSupplier?.(s.supplier_name);
                      }}
                      className="text-primary hover:text-primary-hover font-bold text-[11px] inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Filter Orders</span>
                      <FaArrowRight size={10} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

