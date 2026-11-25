import React from "react";
import {
  FiX,
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiSun,
  FiLayers,
  FiTrendingUp,
} from "react-icons/fi";

export default function EstimateDetail({ estimate, onClose, onGenerateQuote }) {
  if (!estimate) return null;

  const isQuoteGenerated = estimate.status === "quote_generated";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded">
                {estimate.estimate_number}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  isQuoteGenerated
                    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                    : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                }`}
              >
                {isQuoteGenerated ? "Quote Generated" : "Saved Estimate"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {estimate.title || "Solar Project Margin Estimate"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Solution & Hierarchy Banner */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-semibold uppercase">Solution</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                {estimate.solution_snapshot?.name || "Solar ComboKit"}
              </p>
              <p className="text-slate-500 font-mono">
                {estimate.kit_capacity_kw} kW System
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold uppercase">Sector & Category</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                {estimate.industry_type_snapshot?.name || "Standard Sector"}
              </p>
              <p className="text-slate-500">
                {estimate.project_type_snapshot?.name} › {estimate.project_sub_type_snapshot?.name}
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-semibold uppercase">Quantity & Date</span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                {estimate.quantity} {estimate.quantity > 1 ? "Kits" : "Kit"} ({estimate.total_kw} kW)
              </p>
              <p className="text-slate-500">
                Created {new Date(estimate.created_at).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>

          {/* Frozen BOM Items Snapshot */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FiLayers className="text-primary dark:text-blue-400" /> Frozen BOM Items Snapshot
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2">Item Name</th>
                    <th className="px-3 py-2">Basis</th>
                    <th className="px-3 py-2 text-right">Applied Rate</th>
                    <th className="px-3 py-2 text-right">Multiplier</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {(estimate.bom_snapshot || []).map((b, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-sans font-medium text-slate-900 dark:text-slate-100">
                        {b.name}
                      </td>
                      <td className="px-3 py-2 capitalize font-sans">{b.rate_type?.replace("_", " ")}</td>
                      <td className="px-3 py-2 text-right">₹{b.applied_rate?.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right">{b.multiplier_or_qty}</td>
                      <td className="px-3 py-2 text-right font-bold">₹{b.amount?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost & Margin Summary */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary via-[#253880] to-[#1d2c66] text-white shadow-lg shadow-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-blue-100 tracking-wider">
                  Estimated Customer Selling Price
                </span>
                <div className="text-3xl font-black font-mono mt-1">
                  ₹{estimate.estimated_customer_price?.toLocaleString("en-IN")}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-blue-100 tracking-wider">
                  EPC Profit
                </span>
                <div className="text-xl font-bold font-mono text-emerald-200 mt-1">
                  +₹{estimate.profit_amount?.toLocaleString("en-IN")} ({estimate.margin_percentage}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/20 text-xs text-blue-100 font-mono">
              <div>Kit Cost: ₹{estimate.kit_total_price?.toLocaleString("en-IN")}</div>
              <div>BOM Cost: ₹{estimate.bom_total_cost?.toLocaleString("en-IN")}</div>
              <div>GST: ₹{estimate.gst_amount?.toLocaleString("en-IN")} ({estimate.gst_rate}%)</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Valid until: {estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString("en-IN") : "30 days"}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Close
            </button>
            {!isQuoteGenerated && (
              <button
                type="button"
                onClick={() => onGenerateQuote && onGenerateQuote(estimate)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-md shadow-primary/25 transition cursor-pointer"
              >
                <FiFileText className="w-3.5 h-3.5" /> Convert to Quote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
