import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSliders,
  FiPlus,
  FiFileText,
  FiColumns,
  FiTrendingUp,
  FiSun,
  FiDollarSign,
  FiCheckCircle,
} from "react-icons/fi";
import EstimatorWizard from "./EstimatorWizard";
import SavedEstimates from "./SavedEstimates";
import CompareSolutions from "./CompareSolutions";
import {
  fetchEstimatesStats,
  resetWizard,
  setActiveStep,
} from "../../features/estimator.slice";

export default function KnowMyMargin() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("wizard"); // 'wizard' | 'saved' | 'compare'

  const { estimatesStats, comparisonSolutions } = useSelector(
    (state) => state.estimator_slice
  );
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchEstimatesStats());
    }
  }, [dispatch, isAuthenticated]);

  const handleStartNew = () => {
    dispatch(resetWizard());
    setActiveTab("wizard");
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary dark:text-blue-400 border border-primary/20">
            <FiTrendingUp className="w-3.5 h-3.5" /> Know My Margin Calculator
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Solar Project Margin & Cost Estimator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configure engineered ComboKits, add admin-defined project structures & balance of systems, set your profit margin, and generate authoritative customer quotes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-primary hover:bg-primary-hover active:scale-95 shadow-lg shadow-primary/25 transition cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Estimate</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Total Estimates
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
            {estimatesStats.total_estimates || 0}
          </div>
          <p className="text-[11px] text-slate-500">Configured project deployments</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Active Saved
          </span>
          <div className="text-2xl sm:text-3xl font-black text-primary dark:text-blue-400 font-mono">
            {estimatesStats.active_saved || 0}
          </div>
          <p className="text-[11px] text-slate-500">Ready for quote conversion</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Quotes Generated
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {estimatesStats.quotes_generated || 0}
          </div>
          <p className="text-[11px] text-slate-500">Converted to formal EPC quotes</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Pipeline Value
          </span>
          <div className="text-2xl sm:text-3xl font-black text-primary dark:text-blue-400 font-mono">
            ₹{((estimatesStats.total_estimated_value || 0) / 100000).toFixed(1)}L
          </div>
          <p className="text-[11px] text-slate-500">Estimated customer billing</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("wizard")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === "wizard"
              ? "border-primary text-primary dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FiSliders className="w-4 h-4" />
          <span>Estimator Wizard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === "saved"
              ? "border-primary text-primary dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FiFileText className="w-4 h-4" />
          <span>Saved Estimates</span>
          {estimatesStats.active_saved > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 dark:bg-blue-900/40 text-primary dark:text-blue-300 font-bold">
              {estimatesStats.active_saved}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compare")}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeTab === "compare"
              ? "border-primary text-primary dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FiColumns className="w-4 h-4" />
          <span>Compare Solutions</span>
          {comparisonSolutions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 dark:bg-blue-900/40 text-primary dark:text-blue-300 font-bold">
              {comparisonSolutions.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "wizard" && (
          <EstimatorWizard
            onEstimateSaved={() => {
              dispatch(fetchEstimatesStats());
              setActiveTab("saved");
            }}
            onQuoteGenerated={() => {
              dispatch(fetchEstimatesStats());
              setActiveTab("saved");
            }}
          />
        )}

        {activeTab === "saved" && (
          <SavedEstimates onNewEstimateClick={handleStartNew} />
        )}

        {activeTab === "compare" && (
          <CompareSolutions
            onSelectSolution={() => {
              setActiveTab("wizard");
            }}
          />
        )}
      </div>
    </div>
  );
}
