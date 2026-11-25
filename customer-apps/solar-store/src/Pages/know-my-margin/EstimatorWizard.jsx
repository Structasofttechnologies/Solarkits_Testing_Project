import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEligibleIndustries,
  fetchEligibleSolutions,
  fetchEligibleBoms,
  fetchGstSettings,
  selectSolution,
  setQuantity,
  setActiveStep,
  addToComparison,
} from "../../features/estimator.slice";
import { fetchShopHierarchy, getAvailableKitData } from "../../features/slice";
import Step4Solutions from "./steps/Step4Solutions";
import Step5Quantity from "./steps/Step5Quantity";
import MarginEstimatorPanel from "./MarginEstimatorPanel";

const STEPS = [
  { step: 1, title: "Solution Kit" },
  { step: 2, title: "Quantity" },
  { step: 3, title: "Calculator" },
];

export default function EstimatorWizard({ onEstimateSaved, onQuoteGenerated }) {
  const dispatch = useDispatch();

  const {
    activeStep,
    solutions,
    selectedIndustry,
    selectedProjectType,
    selectedProjectSubType,
    selectedSolution,
    quantity,
    comparisonSolutions,
  } = useSelector((state) => state.estimator_slice);

  const rawKits = useSelector((state) => state.slice?.availableKits);
  const shopHierarchy = useSelector((state) => state.slice?.shopHierarchy);
  const selectedDistrict = useSelector((state) => state.slice?.selectedDistrict);

  // Initial loads: Hierarchy, available kits, and estimator settings
  useEffect(() => {
    dispatch(fetchEligibleIndustries());
    dispatch(fetchGstSettings());
    dispatch(fetchEligibleSolutions({ district_id: selectedDistrict?.id }));

    if (!rawKits || rawKits.length === 0) {
      dispatch(getAvailableKitData(selectedDistrict?.id ? { districtId: selectedDistrict.id } : {}));
    }
    if (!shopHierarchy || shopHierarchy.length === 0) {
      dispatch(fetchShopHierarchy());
    }
  }, [dispatch, selectedDistrict?.id]);

  // Merge available kits from store & estimator backend into a unified list
  const allKits = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addKit = (k) => {
      const id = String(k.id || k._id);
      if (!id || seen.has(id)) return;
      if (k.sku && k.sku.startsWith("SK-DEF-")) return;
      if ((k.brand_name === "Solarkits Certified Blueprint" || k.brand === "Solarkits Certified Blueprint") && !(k.selling_price || k.customer_price || k.base_price)) return;
      seen.add(id);

      const cap = Number(k.capacityKW || k.capacity_kw || k.capacity || 0);
      let price = 0;
      if (k.variants && k.variants.length > 0) {
        price = Number(k.variants[0].ourPrice || k.variants[0].price || 0);
      }
      if (!price) {
        price = Number(k.selling_price || k.customer_price || k.base_price || 0);
      }
      if (price <= 0) return; // Only show configured kits with active pricing

      list.push({
        _id: id,
        id: id,
        name: k.kitName || k.name || `Solar Kit ${cap} kW`,
        sku: k.sku || `SK-${id.slice(-6).toUpperCase()}`,
        brand_name: k.brand || k.brand_name || "Solarkits Certified",
        capacity_kw: cap,
        capacityKW: cap,
        selling_price: price,
        base_price: price,
        max_margin: Number(k.max_margin || 0),
        variants: k.variants || [],
        image: k.image || k.thumbnail || (k.images && k.images[0]) || null,
        industryType: k.industryType || k.industry_type_name || null,
        category: k.category || null,
        subCategory: k.subCategory || k.usageType || null,
        projectType: k.projectType || k.inverter?.type || k.systemType || null,
        projectRange: k.projectRange || null,
        description: k.description || null,
        base_components: k.base_components || [],
        industry_type_id: k.industry_type_id || null,
        project_category_id: k.project_category_id || null,
        project_subcategory_id: k.project_subcategory_id || null,
        raw: k,
      });
    };

    if (Array.isArray(solutions) && solutions.length > 0) {
      solutions.forEach(addKit);
    }
    if (Array.isArray(rawKits) && rawKits.length > 0) {
      rawKits.forEach(addKit);
    }

    return list;
  }, [rawKits, solutions]);

  // Load BOM items whenever a kit is selected
  useEffect(() => {
    if (selectedSolution) {
      dispatch(
        fetchEligibleBoms({
          industry_type_id: selectedSolution?.industry_type_id || selectedIndustry?._id,
          project_category_id: selectedSolution?.project_category_id || selectedProjectType?._id,
          project_subcategory_id: selectedSolution?.project_subcategory_id || selectedProjectSubType?._id,
          industry_type_name: selectedSolution?.industryType || selectedSolution?.industry_type_name,
          category_name: selectedSolution?.category,
          sub_category_name: selectedSolution?.subCategory || selectedSolution?.usageType,
          system_type_name: selectedSolution?.projectType || selectedSolution?.systemType,
          project_range_name: selectedSolution?.projectRange?.text || selectedSolution?.projectRange,
          kit_id: selectedSolution?._id || selectedSolution?.id,
          district_id: selectedDistrict?.id,
        })
      );
    }
  }, [dispatch, selectedSolution, selectedDistrict?.id]);

  const handleSelectSolution = (sol) => {
    dispatch(selectSolution(sol));
    dispatch(
      fetchEligibleBoms({
        kit_id: sol._id || sol.id,
        industry_type_id: sol.industry_type_id,
        project_category_id: sol.project_category_id,
        project_subcategory_id: sol.project_subcategory_id,
        industry_type_name: sol.industryType || sol.industry_type_name,
        category_name: sol.category,
        sub_category_name: sol.subCategory || sol.usageType,
        system_type_name: sol.projectType || sol.systemType,
        project_range_name: sol.projectRange?.text || sol.projectRange,
        district_id: selectedDistrict?.id,
      })
    );
    dispatch(setActiveStep(2));
  };

  return (
    <div className="space-y-6">
      {/* ── Streamlined Stepper Progress Bar ───────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[350px] max-w-xl mx-auto">
          {STEPS.map((s, idx) => {
            const isCompleted = activeStep > s.step;
            const isCurrent = activeStep === s.step;

            return (
              <React.Fragment key={s.step}>
                <div
                  onClick={() => {
                    // Allow navigating back to completed steps
                    if (isCompleted) dispatch(setActiveStep(s.step));
                  }}
                  className={`flex items-center gap-2.5 select-none ${
                    isCompleted ? "cursor-pointer group" : "cursor-default"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                      isCurrent
                        ? "bg-primary text-white shadow-md shadow-primary/25 ring-4 ring-primary/20"
                        : isCompleted
                        ? "bg-emerald-600 text-white group-hover:bg-emerald-700"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : s.step}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-primary dark:text-blue-400 font-bold"
                        : isCompleted
                        ? "text-slate-700 dark:text-slate-200 group-hover:text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 rounded-full transition ${
                      activeStep > s.step ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Dynamic Step View ─────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <Step4Solutions
          solutions={allKits}
          shopHierarchy={shopHierarchy}
          selectedSolution={selectedSolution}
          onSelect={handleSelectSolution}
          onAddToCompare={(sol) => dispatch(addToComparison(sol))}
          compareList={comparisonSolutions}
        />
      )}

      {activeStep === 2 && (
        <Step5Quantity
          selectedSolution={selectedSolution}
          quantity={quantity}
          onChangeQuantity={(q) => dispatch(setQuantity(q))}
          onBack={() => dispatch(setActiveStep(1))}
          onProceed={() => dispatch(setActiveStep(3))}
        />
      )}

      {activeStep === 3 && (
        <MarginEstimatorPanel
          onBack={() => dispatch(setActiveStep(2))}
          onSaved={onEstimateSaved}
          onQuoteGenerated={onQuoteGenerated}
        />
      )}
    </div>
  );
}
