import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiColumns,
  FiTrash2,
  FiTrendingUp,
  FiArrowRight,
  FiSun,
  FiPercent,
  FiDollarSign,
  FiInfo,
} from "react-icons/fi";
import {
  removeFromComparison,
  clearComparison,
  compareSolutionsThunk,
  selectSolution,
  setActiveStep,
} from "../../features/estimator.slice";

export default function CompareSolutions({ onSelectSolution }) {
  const dispatch = useDispatch();
  const {
    comparisonSolutions,
    comparisonResults,
    calcLoading,
    gstSettings,
    selectedGstRate,
  } = useSelector((state) => state.estimator_slice);

  const [compareMargin, setCompareMargin] = useState(10);
  const [compareMarginType, setCompareMarginType] = useState("percentage");

  useEffect(() => {
    if (comparisonSolutions.length >= 2) {
      dispatch(
        compareSolutionsThunk({
          solutions: comparisonSolutions,
          margin: { type: compareMarginType, value: compareMargin },
          gst_settings: {
            method: gstSettings.gst_calculation_method,
            rate: selectedGstRate,
          },
        })
      );
    }
  }, [dispatch, comparisonSolutions, compareMargin, compareMarginType, gstSettings.gst_calculation_method, selectedGstRate]);

  if (comparisonSolutions.length < 2) {
    return (
      <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
          <FiColumns className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Compare Solar Solutions
          </h3>
          <p className="text-sm text-slate-500 max-w-md mt-1">
            Add at least 2 solutions from the wizard to analyze hardware costs, BOM requirements, margins, and final selling prices side-by-side.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dispatch(setActiveStep(4))}
          className="mt-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/25 transition cursor-pointer"
        >
          Browse & Add Solutions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FiColumns className="text-primary" /> Compare Solutions Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparing {comparisonSolutions.length} configured solar systems
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Margin quick adjuster */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500">Margin:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={compareMargin}
              onChange={(e) => setCompareMargin(Number(e.target.value || 0))}
              className="w-14 text-center font-bold text-xs text-primary dark:text-blue-400 bg-transparent focus:outline-none"
            />
            <span className="text-xs font-bold text-slate-400">%</span>
          </div>

          <button
            type="button"
            onClick={() => dispatch(clearComparison())}
            className="px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-[700px]">
          {comparisonResults.map((item, index) => {
            const sol = item.calculation;
            const costPerWatt =
              sol.total_kw > 0
                ? Math.round((sol.estimated_customer_price / (sol.total_kw * 1000)) * 100) / 100
                : 0;

            return (
              <div
                key={index}
                className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg flex flex-col justify-between space-y-6 relative"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => dispatch(removeFromComparison(item.solution_id))}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                  title="Remove from comparison"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  {/* Solution Head */}
                  <div className="space-y-1">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-sm inline-block">
                      {item.capacity_kw} kW System
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {item.solution_name}
                    </h3>
                    <p className="text-xs text-primary dark:text-blue-400 font-semibold">
                      Brand: {item.brand_name || "Solarkits Certified"}
                    </p>
                  </div>

                  {/* Highlight Hero Price */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Estimated Customer Price
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                      ₹{sol.estimated_customer_price?.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Rate: ₹{costPerWatt} / Wp
                    </div>
                  </div>

                  {/* Itemized Comparison Table */}
                  <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="pt-2 flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Kit Base Price</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ₹{sol.kit_total_price?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Project BOM Cost</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        +₹{sol.bom_total_cost?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>EPC Margin ({compareMargin}%)</span>
                      <span className="font-mono">
                        +₹{sol.margin_amount?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>GST ({sol.gst_rate}%)</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        +₹{sol.gst_amount?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-300">
                      <span>Net Profit</span>
                      <span className="font-mono">
                        ₹{sol.profit_amount?.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Select button */}
                <button
                  type="button"
                  onClick={() => {
                    const matchedSol = comparisonSolutions.find(
                      (c) => String(c.kit?._id || c._id) === String(item.solution_id)
                    );
                    if (matchedSol) {
                      dispatch(selectSolution(matchedSol.kit || matchedSol));
                      dispatch(setActiveStep(6));
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-hover active:scale-98 shadow-md shadow-primary/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Select Solution</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
