import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiFileText,
  FiClock,
  FiTrash2,
  FiRefreshCw,
  FiEye,
  FiCheckCircle,
  FiArrowRight,
  FiSun,
  FiDollarSign,
} from "react-icons/fi";
import {
  fetchMyEstimates,
  deleteEstimateThunk,
  generateQuoteThunk,
} from "../../features/estimator.slice";
import { setShowAuthDialog } from "../../features/slice";
import EstimateDetail from "./EstimateDetail";
import axiosInstance from "@/utils/axiosInstance";
import { FiLock } from "react-icons/fi";

export default function SavedEstimates({ onNewEstimateClick }) {
  const dispatch = useDispatch();
  const { savedEstimates, loading, successMessage } = useSelector(
    (state) => state.estimator_slice
  );
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEstimate, setSelectedEstimate] = useState(null);

  // Recalculate preview modal
  const [recalcData, setRecalcData] = useState(null);
  const [recalcLoading, setRecalcLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyEstimates());
    }
  }, [dispatch, isAuthenticated]);

  const filtered = savedEstimates.filter((est) => {
    if (statusFilter !== "all" && est.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = est.estimate_number?.toLowerCase().includes(q);
      const matchTitle = est.title?.toLowerCase().includes(q);
      const matchSol = est.solution_snapshot?.name?.toLowerCase().includes(q);
      if (!matchNum && !matchTitle && !matchSol) return false;
    }
    return true;
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this margin estimate?")) {
      dispatch(deleteEstimateThunk(id));
    }
  };

  const handleGenerateQuote = (estimate) => {
    dispatch(generateQuoteThunk(estimate._id));
    setSelectedEstimate(null);
  };

  const handleRecalculate = async (est) => {
    setRecalcLoading(true);
    try {
      const res = await axiosInstance.post(`/india/v1/estimates/${est._id}/recalculate`);
      if (res.data?.success) {
        setRecalcData(res.data.data);
      }
    } catch (err) {
      alert("Failed to recalculate estimate with current live rates.");
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by estimate # or system..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "saved", "quote_generated"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize transition cursor-pointer ${
                statusFilter === tab
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {tab.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Estimates List */}
      {!isAuthenticated ? (
        <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-3">
          <FiLock className="w-10 h-10 opacity-40 text-primary" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            EPC Partner Login Required
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            Please log in with your EPC account to view your saved estimates, live rate recalculations, and generated quotes.
          </p>
          <button
            type="button"
            onClick={() => dispatch(setShowAuthDialog(true))}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary-hover transition cursor-pointer"
          >
            Log In as EPC Partner
          </button>
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-400">Loading saved estimates...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-3">
          <FiFileText className="w-10 h-10 opacity-30 text-primary" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No saved estimates found
          </p>
          <p className="text-xs text-slate-500">
            Use the Know My Margin calculator wizard to create and save your first estimate.
          </p>
          <button
            type="button"
            onClick={onNewEstimateClick}
            className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition cursor-pointer"
          >
            Start New Estimate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((est) => {
            const isQuoteGen = est.status === "quote_generated";

            return (
              <div
                key={est._id}
                className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-primary dark:text-blue-400 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded">
                      {est.estimate_number}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isQuoteGen
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                          : "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {isQuoteGen ? "Quote Generated" : "Saved"}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {est.solution_snapshot?.name || est.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {est.kit_capacity_kw} kW • {est.quantity} {est.quantity > 1 ? "kits" : "kit"} ({est.total_kw} kW total)
                    </p>
                  </div>

                  {/* Financial KPI */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Customer Price
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
                      ₹{(est.estimated_customer_price || 0).toLocaleString("en-IN")}
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Margin: +₹{(est.profit_amount || est.margin_amount || 0).toLocaleString("en-IN")}</span>
                      <span>({est.margin_percentage}%)</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {new Date(est.created_at).toLocaleDateString("en-IN")}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRecalculate(est)}
                      className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Recalculate with live rates"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedEstimate(est)}
                      className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="View details"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                    </button>

                    {!isQuoteGen && (
                      <button
                        type="button"
                        onClick={() => handleDelete(est._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                        title="Delete estimate"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEstimate && (
        <EstimateDetail
          estimate={selectedEstimate}
          onClose={() => setSelectedEstimate(null)}
          onGenerateQuote={handleGenerateQuote}
        />
      )}

      {/* Recalculate Live Rates Comparison Modal */}
      {recalcData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FiRefreshCw className="text-primary" /> Live Rate Recalculation
            </h3>
            <p className="text-xs text-slate-500">
              Comparison between frozen estimate snapshot and current live platform rates:
            </p>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-mono">
              <div>
                <span className="text-slate-400 block font-sans">Frozen Estimate</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200">
                  ₹{recalcData.saved_estimate?.estimated_customer_price?.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Current Live Price</span>
                <span className="text-base font-black text-primary dark:text-blue-400">
                  ₹{recalcData.current_rates_calculation?.estimated_customer_price?.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="text-xs font-semibold text-center text-slate-600 dark:text-slate-300">
              Difference:{" "}
              <span className={recalcData.price_difference > 0 ? "text-rose-500" : "text-emerald-500"}>
                {recalcData.price_difference > 0 ? "+" : ""}₹{recalcData.price_difference?.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRecalcData(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
