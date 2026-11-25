import React from "react";
import { FiPercent, FiInfo } from "react-icons/fi";

export default function GstSelector({
  selectedRate = 18,
  allowedOptions = [0, 5, 12, 13.8, 18],
  calculationMethod = "on_cost_plus_margin",
  onChange,
}) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <FiPercent className="text-primary dark:text-blue-400" /> Applicable Project GST
        </label>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
          {calculationMethod === "on_cost_plus_margin" ? "On Total (Cost + Margin)" : "On Project Cost Only"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allowedOptions.map((rate) => {
          const active = Number(selectedRate) === Number(rate);
          return (
            <button
              key={rate}
              type="button"
              onClick={() => onChange && onChange(rate)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer active:scale-95 ${
                active
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary"
              }`}
            >
              {rate}% GST
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1">
        <FiInfo className="w-3.5 h-3.5 shrink-0" />
        <span>
          {calculationMethod === "on_cost_plus_margin"
            ? "GST is computed on the total taxable quote value (Kit + BOM + EPC Margin)."
            : "GST is computed only on the project hardware & BOM cost."}
        </span>
      </p>
    </div>
  );
}
