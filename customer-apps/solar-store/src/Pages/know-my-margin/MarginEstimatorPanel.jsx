import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiSave,
  FiLayers,
  FiTrendingUp,
  FiSun,
  FiCheckCircle,
  FiRefreshCw,
  FiSliders,
} from "react-icons/fi";
import BomBreakdownTable from "./components/BomBreakdownTable";
import GstSelector from "./components/GstSelector";
import MarginInput from "./components/MarginInput";
import {
  toggleBomItem,
  setMarginType,
  setMarginValue,
  setSelectedGstRate,
  calculateMargin,
  saveEstimateThunk,
  addToComparison,
  fetchGstSettings,
} from "../../features/estimator.slice";
import { setShowAuthDialog } from "../../features/slice";

export default function MarginEstimatorPanel({ onBack, onSaved, onQuoteGenerated }) {
  const dispatch = useDispatch();

  const {
    selectedSolution,
    selectedIndustry,
    selectedProjectType,
    selectedProjectSubType,
    quantity,
    eligibleBoms,
    selectedBoms,
    marginType,
    marginValue,
    selectedGstRate,
    gstSettings,
    calculationResult,
    calcLoading,
    loading,
    successMessage,
  } = useSelector((state) => state.estimator_slice);

  const selectedDistrict = useSelector((state) => state.slice.selectedDistrict);
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  const [isSavingEstimate, setIsSavingEstimate] = useState(false);

  // Fetch fresh global settings on mount
  useEffect(() => {
    dispatch(fetchGstSettings());
  }, [dispatch]);

  // Trigger backend authoritative calculation whenever inputs change
  useEffect(() => {
    if (!selectedSolution) return;

    dispatch(
      calculateMargin({
        kit: selectedSolution,
        quantity,
        bom_items: selectedBoms,
        location: {
          district_id: selectedDistrict?.id,
          district_name: selectedDistrict?.name,
        },
        delivery: { delivery_cost: 0 },
        margin: { type: marginType, value: marginValue },
        gst_settings: {
          method: gstSettings.gst_calculation_method,
          rate: selectedGstRate,
        },
      })
    );
  }, [
    dispatch,
    selectedSolution,
    quantity,
    selectedBoms,
    marginType,
    marginValue,
    selectedGstRate,
    gstSettings.gst_calculation_method,
    selectedDistrict?.id,
  ]);

  const handleSaveEstimate = async () => {
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    const payload = {
      title: `Estimate for ${selectedSolution?.name} (${calculationResult?.total_kw || 0} kW)`,
      solution: selectedSolution,
      quantity,
      bom_items: selectedBoms,
      location: {
        district_id: selectedDistrict?.id,
        district_name: selectedDistrict?.name,
      },
      delivery: { delivery_cost: 0 },
      margin: { type: marginType, value: marginValue },
      gst_settings: {
        method: gstSettings.gst_calculation_method,
        rate: selectedGstRate,
      },
      industry_type_snapshot: selectedIndustry,
      project_type_snapshot: selectedProjectType,
      project_sub_type_snapshot: selectedProjectSubType,
    };

    setIsSavingEstimate(true);
    try {
      const action = await dispatch(saveEstimateThunk(payload));
      if (saveEstimateThunk.fulfilled.match(action)) {
        alert("Margin estimate saved successfully!");
        if (onSaved) onSaved(action.payload);
      } else {
        const errMsg = String(action.payload || action.error?.message || "");
        if (errMsg.includes("Unauthorized") || errMsg.includes("401")) {
          dispatch(setShowAuthDialog(true));
        } else {
          alert(errMsg || "Failed to save estimate. Please try again.");
        }
      }
    } finally {
      setIsSavingEstimate(false);
    }
  };



  const cr = calculationResult || {
    kit_total_price: (selectedSolution?.selling_price || 0) * quantity,
    bom_total_cost: 0,
    project_cost_before_gst: (selectedSolution?.selling_price || 0) * quantity,
    gst_amount: 0,
    margin_amount: 0,
    margin_percentage: marginValue,
    estimated_customer_price: (selectedSolution?.selling_price || 0) * quantity,
    total_kw: (selectedSolution?.capacity_kw || 0) * quantity,
    profit_amount: 0,
  };

  const costPerWatt =
    cr.total_kw > 0
      ? Math.round((cr.estimated_customer_price / (cr.total_kw * 1000)) * 100) / 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary dark:text-blue-400 uppercase tracking-wider">
            <span>{selectedIndustry?.name || "Industry"}</span>
            <span>›</span>
            <span>{selectedProjectType?.name || "Category"}</span>
            <span>›</span>
            <span>{selectedProjectSubType?.name || "Sub-Type"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Know My Margin — Cost & Selling Price Estimator
          </h1>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition shadow-sm"
        >
          <FiArrowLeft className="w-4 h-4" /> Change Quantity / Kit
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2 font-medium">
          <FiCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: BOM & Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* Solution Summary Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                <FiSun className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {selectedSolution?.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {selectedSolution?.capacity_kw} kW • Brand: {selectedSolution?.brand_name || "Solarkits Certified"}
                </p>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-xs text-slate-400 font-semibold uppercase">
                {quantity} {quantity > 1 ? "Kits" : "Kit"} ({cr.total_kw} kW)
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                ₹{(cr.kit_total_price || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* BOM Breakdown Table */}
          <BomBreakdownTable
            items={cr.bom_items?.length ? cr.bom_items : eligibleBoms}
            selectedItems={selectedBoms}
            onToggleItem={(item) => dispatch(toggleBomItem(item))}
            allowOptionalSelection={gstSettings.allow_optional_bom_selection}
            showRates={gstSettings.show_bom_rates_to_epc}
            totalKw={cr.total_kw}
            quantity={quantity}
          />

          {/* Margin Input */}
          {(() => {
            const kitMaxMargin = Number(selectedSolution?.max_margin || 0);
            const costBeforeGst = Number(cr?.project_cost_before_gst || selectedSolution?.selling_price || 0);
            const effectiveMaxAmount = kitMaxMargin > 0 ? kitMaxMargin : 10000000;
            const effectiveMaxPercentage = (kitMaxMargin > 0 && costBeforeGst > 0)
              ? Math.min(100, Math.round((kitMaxMargin / costBeforeGst) * 1000) / 10)
              : 100;

            return (
              <MarginInput
                marginType={marginType}
                marginValue={marginValue}
                allowedModes={gstSettings?.allowed_margin_types || "both"}
                minPercentage={0}
                maxPercentage={effectiveMaxPercentage}
                minAmount={0}
                maxAmount={effectiveMaxAmount}
                kitMaxMargin={kitMaxMargin}
                onTypeChange={(type) => dispatch(setMarginType(type))}
                onValueChange={(val) => dispatch(setMarginValue(val))}
                projectCost={cr.project_cost_before_gst}
              />
            );
          })()}

          {/* GST Selector */}
          <GstSelector
            selectedRate={selectedGstRate}
            allowedOptions={gstSettings.allowed_gst_options}
            calculationMethod={gstSettings.gst_calculation_method}
            onChange={(rate) => dispatch(setSelectedGstRate(rate))}
          />
        </div>

        {/* Right Column: Sticky Cost & Price Breakdown Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Financial Summary
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Live Calculation
              </span>
            </div>

            {/* Line items */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Solar Kit Cost ({quantity}x)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  ₹{(cr.kit_total_price || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Project BOM Cost (Structures & BOS)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  +₹{(cr.bom_total_cost || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {cr.delivery_cost > 0 && (
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Transport & Logistics</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    +₹{cr.delivery_cost.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Project Base Cost (Excl. Tax)</span>
                <span className="font-mono">
                  ₹{(cr.project_cost_before_gst || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Your EPC Margin ({cr.margin_percentage}%)</span>
                <span className="font-mono">
                  +₹{(cr.margin_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>GST ({cr.gst_rate}%)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  +₹{(cr.gst_amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Estimated Customer Price Hero Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary via-[#253880] to-[#1d2c66] text-white shadow-xl shadow-primary/25 space-y-2">
              <div className="flex items-center justify-between text-blue-100 text-xs uppercase font-bold tracking-wider">
                <span>Estimated Customer Selling Price</span>
                <span className="px-2 py-0.5 bg-white/20 rounded">Incl. GST</span>
              </div>

              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
                ₹{(cr.estimated_customer_price || 0).toLocaleString("en-IN")}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/20 text-xs text-blue-100">
                <span>Total Project Capacity: <strong>{cr.total_kw} kW</strong></span>
                <span>Unit Price: <strong>₹{costPerWatt} / Wp</strong></span>
              </div>
            </div>

            {/* Profitability Badge */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiTrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Net EPC Profit
                  </div>
                  <div className="text-[11px] text-emerald-600/80">
                    Earned on this project deployment
                  </div>
                </div>
              </div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                ₹{(cr.profit_amount || 0).toLocaleString("en-IN")}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSaveEstimate}
                disabled={isSavingEstimate || loading}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover active:scale-98 shadow-lg shadow-primary/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingEstimate ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Estimate...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span>Save Margin Estimate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  dispatch(addToComparison(selectedSolution));
                  alert("Solution added to comparison list!");
                }}
                className="w-full py-2.5 px-4 text-xs font-semibold text-primary dark:text-blue-400 hover:text-primary-hover hover:bg-primary/10 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>+ Add Solution to Compare Matrix</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
