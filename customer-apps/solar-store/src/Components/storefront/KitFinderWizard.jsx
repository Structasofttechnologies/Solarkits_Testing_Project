import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiHome,
  FiBriefcase,
  FiSun,
  FiBatteryCharging,
  FiZap,
  FiArrowRight,
  FiArrowLeft,
  FiCheckCircle,
  FiShoppingCart,
  FiRefreshCw,
  FiSliders,
  FiCheck
} from "react-icons/fi";
import { FaSolarPanel, FaBolt, FaLeaf } from "react-icons/fa";
import { addToCart, setShowAuthDialog } from "@/features/slice";
import Button from "../Button";

export default function KitFinderWizard({ onSelectKit }) {
  const dispatch = useDispatch();
  const availableKits = useSelector((state) => state.slice.availableKits || []);
  const { isAuthenticated } = useSelector((state) => state.auth_slice);

  const [step, setStep] = useState(1);
  const [propertyType, setPropertyType] = useState("residential");
  const [gridReliability, setGridReliability] = useState("reliable");
  const [backupNeed, setBackupNeed] = useState("none");
  const [billRange, setBillRange] = useState("medium"); // small (1-2kW), medium (3kW), high (5kW), very_high (10kW+)

  // Compute recommended kW based on answers
  const recommendedKw = useMemo(() => {
    switch (billRange) {
      case "small":
        return 2;
      case "medium":
        return 3;
      case "high":
        return 5;
      case "commercial_high":
      case "very_high":
        return 10;
      default:
        return 3;
    }
  }, [billRange]);

  // Find best matching kit from catalog
  const matchingKit = useMemo(() => {
    if (!availableKits || availableKits.length === 0) return null;

    // Filter by capacity close to recommendation
    const sorted = [...availableKits].sort((a, b) => {
      const diffA = Math.abs((a.capacityKW || 0) - recommendedKw);
      const diffB = Math.abs((b.capacityKW || 0) - recommendedKw);
      return diffA - diffB;
    });

    return sorted[0] || availableKits[0];
  }, [availableKits, recommendedKw]);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleReset = () => {
    setStep(1);
    setPropertyType("residential");
    setGridReliability("reliable");
    setBackupNeed("none");
    setBillRange("medium");
  };

  const handleAddToCart = () => {
    if (!matchingKit) return;
    if (!isAuthenticated) {
      dispatch(setShowAuthDialog(true));
      return;
    }
    dispatch(addToCart({ id: matchingKit.id, variantIndex: 0 }));
  };

  return (
    <div className="bg-surface rounded-3xl border border-border shadow-xl p-6 sm:p-10 max-w-4xl mx-auto overflow-hidden">
      
      {/* Wizard Header with Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
              <FiSliders size={16} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-text-primary">
                Find Your Perfect Solar Kit
              </h3>
              <p className="text-xs text-text-secondary">
                Answer 4 simple questions to receive an engineered solar kit recommendation
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary bg-primary-soft px-3 py-1 rounded-full">
            Step {step} of 5
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mt-3">
          <div
            className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Property Type */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
          <div>
            <h4 className="text-base font-bold text-text-primary">1. Where will the solar kit be installed?</h4>
            <p className="text-xs text-text-secondary mt-0.5">Select the premises type for rooftop sizing.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: "residential", title: "Independent Home / Villa", desc: "Residential rooftop with single or 3-phase connection", icon: FiHome },
              { id: "apartment", title: "Residential Apartment Rooftop", desc: "Dedicated or shared society rooftop space", icon: FiHome },
              { id: "commercial", title: "Commercial Office / Clinic", desc: "Daytime high energy usage (ACs, lights, computers)", icon: FiBriefcase },
              { id: "industrial", title: "Factory / Warehouse / Farm", desc: "Heavy commercial 3-phase machinery or agriculture", icon: FiZap }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPropertyType(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                  propertyType === opt.id
                    ? "bg-primary text-white border-primary shadow-md scale-[1.01]"
                    : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 border-border text-text-primary"
                }`}
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${propertyType === opt.id ? "bg-white/20 text-white" : "bg-primary-soft text-primary"}`}>
                  <opt.icon size={20} />
                </div>
                <div>
                  <h5 className="text-sm font-bold">{opt.title}</h5>
                  <p className={`text-xs mt-0.5 ${propertyType === opt.id ? "text-white/80" : "text-text-secondary"}`}>
                    {opt.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Grid Connectivity */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
          <div>
            <h4 className="text-base font-bold text-text-primary">2. How is your power grid connection?</h4>
            <p className="text-xs text-text-secondary mt-0.5">Helps determine On-Grid vs Hybrid vs Off-Grid inverter configuration.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "reliable", title: "Reliable Grid", desc: "Rare power cuts (< 1 hour/week). Maximum net-metering savings.", icon: FiSun },
              { id: "frequent_cuts", title: "Frequent Power Cuts", desc: "Regular outages (2-4 hours/day). Needs battery storage.", icon: FiBatteryCharging },
              { id: "no_grid", title: "No Grid Access / Remote", desc: "Completely off-grid farmhouse, petrol pump, or shed.", icon: FiZap }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setGridReliability(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  gridReliability === opt.id
                    ? "bg-primary text-white border-primary shadow-md scale-[1.01]"
                    : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 border-border text-text-primary"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${gridReliability === opt.id ? "bg-white/20 text-white" : "bg-primary-soft text-primary"}`}>
                  <opt.icon size={20} />
                </div>
                <div>
                  <h5 className="text-sm font-bold">{opt.title}</h5>
                  <p className={`text-xs mt-1 leading-relaxed ${gridReliability === opt.id ? "text-white/80" : "text-text-secondary"}`}>
                    {opt.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Battery Backup Need */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
          <div>
            <h4 className="text-base font-bold text-text-primary">3. Do you require battery power backup?</h4>
            <p className="text-xs text-text-secondary mt-0.5">On-grid systems export power to the grid, while hybrid systems keep emergency power.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "none", title: "No Backup Needed", desc: "Standard On-Grid kit with highest ROI and net-metering exports." },
              { id: "essential", title: "Essential Home Backup", desc: "Run fans, lights, WiFi, and refrigerator during power outages." },
              { id: "heavy", title: "Heavy Hybrid Backup", desc: "Run air conditioners, water pumps, and critical office loads." }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBackupNeed(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  backupNeed === opt.id
                    ? "bg-primary text-white border-primary shadow-md scale-[1.01]"
                    : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 border-border text-text-primary"
                }`}
              >
                <h5 className="text-sm font-bold mb-1">{opt.title}</h5>
                <p className={`text-xs leading-relaxed ${backupNeed === opt.id ? "text-white/80" : "text-text-secondary"}`}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Electricity Bill / Consumption */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
          <div>
            <h4 className="text-base font-bold text-text-primary">4. What is your approximate monthly electricity bill?</h4>
            <p className="text-xs text-text-secondary mt-0.5">Used to compute the exact solar generation capacity (kW) to offset your bill.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "small", bill: "Under ₹2,500 / mo", cap: "1 - 2 kW Kit", desc: "Small homes, lights, fans, TV" },
              { id: "medium", bill: "₹2,500 - ₹6,000 / mo", cap: "3 kW Kit (Most Popular)", desc: "2-3 BHK, 1 AC, refrigerator, washing machine" },
              { id: "high", bill: "₹6,000 - ₹12,000 / mo", cap: "5 kW Kit", desc: "Large homes/villas, 2-3 ACs, geysers" },
              { id: "very_high", bill: "₹12,000+ / mo", cap: "10 kW+ Commercial Kit", desc: "Offices, schools, commercial buildings" }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBillRange(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  billRange === opt.id
                    ? "bg-primary text-white border-primary shadow-md scale-[1.01]"
                    : "bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 border-border text-text-primary"
                }`}
              >
                <div>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${billRange === opt.id ? "text-white/80" : "text-primary"}`}>
                    {opt.cap}
                  </span>
                  <h5 className="text-sm font-black">{opt.bill}</h5>
                </div>
                <p className={`text-[11px] mt-2 leading-relaxed ${billRange === opt.id ? "text-white/80" : "text-text-secondary"}`}>
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Recommendation Result */}
      {step === 5 && matchingKit && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
            <FiCheckCircle className="text-emerald-600 shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Engineered Match Found: {matchingKit.capacityKW} kW Solar Kit
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Based on your {propertyType} selection and ~₹{billRange === 'medium' ? '4,500' : '8,000'} monthly energy bill.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-border grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Image */}
            <div className="h-44 bg-surface rounded-xl p-3 border border-border flex items-center justify-center overflow-hidden">
              <img
                src={matchingKit.kitImage || "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80"}
                alt={matchingKit.kitName}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Details */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                  Recommended Complete Solar Kit
                </span>
                <h3 className="text-lg font-black text-text-primary mt-0.5 leading-snug">
                  {matchingKit.kitName}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <p className="text-text-muted text-[10px]">Capacity</p>
                  <p className="font-bold text-text-primary">{matchingKit.capacityKW} kW</p>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <p className="text-text-muted text-[10px]">Est. Generation</p>
                  <p className="font-bold text-primary">~{(matchingKit.capacityKW * 1450).toLocaleString("en-IN")} kWh/Yr</p>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border">
                  <p className="text-text-muted text-[10px]">Warranty</p>
                  <p className="font-bold text-emerald-600">{matchingKit.warrantyYears || 25} Years</p>
                </div>
              </div>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-2xl font-black text-text-primary">
                  ₹{matchingKit.variants?.[0]?.ourPrice?.toLocaleString("en-IN") || "1,45,000"}
                </span>
                <span className="text-xs text-emerald-600 font-bold">
                  Includes All Panels, Inverter, Structure & Safety Boxes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 pt-4 border-t border-border flex items-center justify-between gap-3">
        {step > 1 ? (
          <Button
            variant="secondary"
            size="md"
            onClick={handleBack}
            leftIcon={<FiArrowLeft size={16} />}
            className="font-bold"
          >
            Back
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {step === 5 ? (
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={handleReset}
                leftIcon={<FiRefreshCw size={14} />}
              >
                Restart
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                leftIcon={<FiShoppingCart size={16} />}
                className="font-bold px-6 shadow-md"
              >
                Add Recommended Kit to Cart
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              rightIcon={<FiArrowRight size={16} />}
              className="font-bold px-6 shadow-md"
            >
              Continue
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
