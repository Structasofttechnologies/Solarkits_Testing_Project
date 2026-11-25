import React from "react";
import { FiCheck, FiInfo, FiLayers } from "react-icons/fi";

export default function BomBreakdownTable({
  items = [],
  selectedItems = [],
  onToggleItem,
  allowOptionalSelection = true,
  showRates = true,
  totalKw = 0,
  quantity = 1,
}) {
  const isSelected = (item) => {
    const id = String(item._id || item.bom_id);
    return selectedItems.some((b) => String(b._id || b.bom_id) === id);
  };

  const getMultiplierLabel = (rateType) => {
    switch (rateType) {
      case "per_kw":
        return `${totalKw} kW`;
      case "per_kit":
        return `${quantity} Kit${quantity > 1 ? "s" : ""}`;
      case "quantity_based":
        return "Qty based";
      case "location_based":
        return "Regional";
      default:
        return "Flat";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary text-white">
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Project BOM Breakdown</h3>
            <p className="text-xs text-slate-500">Admin-defined balance of system, structures, cables & services</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 dark:bg-blue-950/40 text-primary dark:text-blue-300 rounded-full border border-primary/20">
          {items.length} BOM Items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No additional BOM items configured for this project category.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                {allowOptionalSelection && <th className="px-4 py-3 w-10 text-center">Inc</th>}
                <th className="px-4 py-3">Item Details</th>
                <th className="px-4 py-3">Rate Basis</th>
                {showRates && <th className="px-4 py-3 text-right">Applied Rate</th>}
                <th className="px-4 py-3 text-right">Qty / Multiplier</th>
                <th className="px-4 py-3 text-right">Cost (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {items.map((item) => {
                const checked = isSelected(item);
                const isMandatory = item.is_mandatory !== false;
                const isIncluded = Boolean(item.is_included_in_kit);

                return (
                  <tr
                    key={item._id || item.code}
                    className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                      checked ? "bg-primary/5 dark:bg-primary/10" : "opacity-60"
                    }`}
                  >
                    {allowOptionalSelection && (
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isMandatory}
                          onChange={() => onToggleItem && onToggleItem(item)}
                          className="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer disabled:cursor-not-allowed accent-[#253880]"
                        />
                      </td>
                    )}

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{item.name}</span>
                        {isMandatory && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                            Mandatory
                          </span>
                        )}
                        {isIncluded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                            Kit Included
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{item.code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="capitalize text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {item.rate_type?.replace("_", " ")}
                      </span>
                    </td>

                    {showRates && (
                      <td className="px-4 py-3 text-right font-mono">
                        {isIncluded ? "₹0" : `₹${(item.applied_rate ?? item.admin_rate ?? 0).toLocaleString("en-IN")}`}
                      </td>
                    )}

                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 font-mono">
                      {item.multiplier_or_qty !== undefined
                        ? item.multiplier_or_qty
                        : getMultiplierLabel(item.rate_type)}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {isIncluded
                        ? "₹0"
                        : item.amount !== undefined
                        ? `₹${item.amount.toLocaleString("en-IN")}`
                        : "Calculated"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
