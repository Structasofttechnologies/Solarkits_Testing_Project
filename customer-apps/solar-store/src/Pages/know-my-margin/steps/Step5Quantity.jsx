import React from "react";
import { FiArrowLeft, FiPlus, FiMinus, FiArrowRight, FiCheckCircle, FiSun, FiLayers } from "react-icons/fi";

export default function Step5Quantity({
  selectedSolution,
  quantity = 1,
  onChangeQuantity,
  onBack,
  onProceed,
}) {
  const rawCap = selectedSolution?.capacity_kw || selectedSolution?.capacity || 0;
  const capacityPerKit = typeof rawCap === "number" && !isNaN(rawCap) ? rawCap : (parseFloat(String(rawCap).replace(/kw/ig, '').trim()) || 0);
  const totalKw = Math.round(capacityPerKit * quantity * 100) / 100;
  const unitPrice = Number(selectedSolution?.selling_price || 0);
  const totalKitCost = Math.round(unitPrice * quantity);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Step 2: Project Quantity & Capacity
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Specify how many kits are required for this site deployment
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
        >
          <FiArrowLeft className="w-3.5 h-3.5" /> Back to Kits
        </button>
      </div>

      {/* Selected Kit Preview Card */}
      <div className="p-6 rounded-2xl border border-primary/20 dark:border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/25">
            <FiSun className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-primary dark:text-blue-400">
              Selected ComboKit
            </div>
            <h3 className="lg font-bold text-slate-900 dark:text-slate-100">
              {selectedSolution?.name}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {selectedSolution?.capacity_kw} kW • {selectedSolution?.brand_name || "Solarkits Certified"}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 font-semibold uppercase">Unit Price</div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono">
            ₹{unitPrice.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Quantity Selector Card */}
      <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6 text-center">
        <label className="block text-sm font-bold uppercase tracking-wider text-slate-500">
          Enter Quantity (Number of Kits)
        </label>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40 transition active:scale-95"
          >
            <FiMinus className="w-5 h-5" />
          </button>

          <input
            type="number"
            min="1"
            max="1000"
            value={quantity}
            onChange={(e) => onChangeQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-28 text-center py-3 text-3xl font-black rounded-2xl border-2 border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <button
            type="button"
            onClick={() => onChangeQuantity(quantity + 1)}
            className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 5, 10, 20].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChangeQuantity(q)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${quantity === q
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
            >
              {q} {q === 1 ? "Kit" : "Kits"}
            </button>
          ))}
        </div>

        {/* Live Calculation Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400">Total Capacity</div>
            <div className="text-xl font-black text-primary dark:text-blue-400 font-mono">
              {totalKw} kW
            </div>
          </div>
          <div>
            <div className="text-xs uppercase font-semibold text-slate-400">Kit Subtotal</div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              ₹{totalKitCost.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Proceed CTA */}
        <button
          type="button"
          onClick={onProceed}
          className="w-full py-3.5 px-6 rounded-xl text-base font-bold text-white bg-primary hover:bg-primary-hover active:scale-98 shadow-xl shadow-primary/25 transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Calculate Margin & Project BOM</span>
          <FiArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
