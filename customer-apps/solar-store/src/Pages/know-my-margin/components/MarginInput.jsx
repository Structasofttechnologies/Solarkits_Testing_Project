import React, { useEffect, useMemo } from "react";
import { FiDollarSign, FiPercent, FiTrendingUp, FiAlertCircle, FiLock } from "react-icons/fi";

export default function MarginInput({
  marginType = "percentage",
  marginValue = 5,
  allowedModes = "both",
  maxPercentage = 100,
  maxAmount = 10000000,
  onTypeChange,
  onValueChange,
  projectCost = 0,
}) {
  const effectiveMinPct = 0;
  const effectiveMaxPct = maxPercentage !== undefined && maxPercentage !== null ? Number(maxPercentage) : 100;
  const effectiveMinAmt = 0;
  const effectiveMaxAmt = maxAmount !== undefined && maxAmount !== null ? Number(maxAmount) : 10000000;

  const isPercentage = marginType === "percentage";
  const min = 0;
  const max = isPercentage ? effectiveMaxPct : effectiveMaxAmt;

  // Enforce allowed mode if Admin restricted to percentage or amount only
  useEffect(() => {
    if (allowedModes === "percentage" && marginType !== "percentage") {
      onTypeChange && onTypeChange("percentage");
    } else if (allowedModes === "amount" && marginType !== "amount") {
      onTypeChange && onTypeChange("amount");
    }
  }, [allowedModes, marginType, onTypeChange]);

  // Enforce maximum clamping if current marginValue exceeds allowed max
  useEffect(() => {
    const numVal = Number(marginValue);
    if (numVal > max) {
      onValueChange && onValueChange(max);
    } else if (numVal < 0) {
      onValueChange && onValueChange(0);
    }
  }, [max, marginValue, onValueChange]);

  // Dynamic quick percentage presets constrained strictly within [0, max]
  const quickPercentages = useMemo(() => {
    const candidatePcts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 25, 30, 40, 50, 75, 100];
    let filtered = candidatePcts.filter((p) => p <= effectiveMaxPct);

    if (effectiveMaxPct > 0 && !filtered.includes(effectiveMaxPct) && effectiveMaxPct <= 100) {
      filtered.push(effectiveMaxPct);
    }

    filtered = Array.from(new Set(filtered)).sort((a, b) => a - b);
    if (filtered.length === 0) {
      filtered = [effectiveMaxPct].filter((p) => p >= 0);
    }
    return filtered;
  }, [effectiveMaxPct]);

  // Dynamic quick amount presets constrained strictly within [0, max]
  const quickAmounts = useMemo(() => {
    const candidateAmts = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 150000, 200000];
    let filtered = candidateAmts.filter((a) => a <= effectiveMaxAmt);

    if (filtered.length === 0) {
      filtered = [effectiveMaxAmt].filter((a) => a > 0);
    }
    return filtered;
  }, [effectiveMaxAmt]);

  // Calculated profit preview
  const estimatedProfit = isPercentage
    ? Math.round(projectCost * (marginValue / 100))
    : Number(marginValue || 0);

  const estimatedProfitPct =
    projectCost > 0 && !isPercentage
      ? Math.round((Number(marginValue || 0) / projectCost) * 1000) / 10
      : marginValue;

  const handleInputChange = (e) => {
    let raw = Number(e.target.value);
    if (isNaN(raw)) raw = 0;
    if (raw > max) {
      raw = max;
    }
    if (raw < 0) {
      raw = 0;
    }
    onValueChange && onValueChange(raw);
  };

  const handleBlur = () => {
    const current = Number(marginValue);
    if (current < 0) {
      onValueChange && onValueChange(0);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm space-y-4">
      {/* Title & Mode Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-primary dark:text-blue-400 flex items-center gap-1.5">
            <FiTrendingUp className="w-4 h-4" /> Your EPC Margin
          </label>

          {/* Admin Constraint Badge - Max Margin Only */}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 dark:bg-blue-900/30 text-primary dark:text-blue-300 border border-primary/20">
            <FiLock className="w-3 h-3 text-primary dark:text-blue-400" />
            Max Allowed Margin: {effectiveMaxAmt < 10000000 ? (isPercentage ? `${effectiveMaxPct}%` : `₹${effectiveMaxAmt.toLocaleString("en-IN")}`) : "Open"}
          </span>
        </div>

        {allowedModes === "both" ? (
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onTypeChange && onTypeChange("percentage")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                isPercentage
                  ? "bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              % Percentage
            </button>
            <button
              type="button"
              onClick={() => onTypeChange && onTypeChange("amount")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                !isPercentage
                  ? "bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              ₹ Fixed Amount
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Mode: <strong className="text-slate-700 dark:text-slate-200 uppercase">{allowedModes}</strong>
          </span>
        )}
      </div>

      {/* Main Input */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
            {isPercentage ? "%" : "₹"}
          </span>
          <input
            type="number"
            min={min}
            max={max}
            step={isPercentage ? "0.1" : "500"}
            value={marginValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={`Enter ${isPercentage ? `${effectiveMinPct} to ${effectiveMaxPct}` : `${effectiveMinAmt} to ${effectiveMaxAmt}`}`}
            className="w-full pl-9 pr-4 py-2.5 text-base font-bold rounded-xl border border-primary/40 dark:border-primary/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Live Estimated Profit Tag */}
        <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-right shrink-0">
          <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Estimated Profit</div>
          <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
            +₹{estimatedProfit.toLocaleString("en-IN")}
            <span className="text-[11px] font-normal text-emerald-600/80 ml-1">
              ({estimatedProfitPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Preset Buttons (Strictly filtered within Admin Limits) */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 uppercase">Quick presets:</span>
        {isPercentage
          ? quickPercentages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onValueChange && onValueChange(p)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  Number(marginValue) === p
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
              >
                {p}%
              </button>
            ))
          : quickAmounts.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onValueChange && onValueChange(a)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  Number(marginValue) === a
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary"
                }`}
              >
                ₹{(a / 1000).toFixed(0)}k
              </button>
            ))}
      </div>
    </div>
  );
}
