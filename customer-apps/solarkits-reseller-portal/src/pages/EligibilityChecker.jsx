import { useMemo, useState, useEffect } from "react";
import {
  FiArrowRight,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiGlobe,
  FiMap,
  FiMapPin,
  FiShield,
  FiTrendingUp,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiPercent,
  FiLayers,
} from "react-icons/fi";
import { INDIAN_STATES_DISTRICTS } from "../data/territoryData";
import api from "../services/api";
import Navbar from "../components/storefront/Navbar";
import Footer from "../components/storefront/Footer";
import LeadCaptureModal from "../components/storefront/LeadCaptureModal";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const formatOrderTypes = (ot) => {
  let types = [];
  if (Array.isArray(ot)) types = ot;
  else if (typeof ot === "string") types = ot === "both" ? ["po_order", "loose_order"] : ot.split(",").map((s) => s.trim());
  else types = ["po_order"];

  const map = {
    loose_order: "Loose Order",
    combine_po_order: "Combine PO",
    po_order: "PO Order",
  };
  const labels = types.map((t) => map[t]).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "PO Order";
};

export default function EligibilityChecker({ onOpenLeadModal: externalOpenLeadModal }) {
  const states = Object.keys(INDIAN_STATES_DISTRICTS);
  const initialState = states[0] || "Maharashtra";

  // Dynamic Plans from Backend
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Standalone modal state if accessed directly via /eligibility route
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [internalModalContext, setInternalModalContext] = useState({});
  const [businessProfiles, setBusinessProfiles] = useState([]);

  useEffect(() => {
    api
      .get("/business-profiles/active")
      .then((res) => {
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          setBusinessProfiles(res.data.data);
          if (res.data.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              businessType: prev.businessType || res.data.data[0].name,
            }));
          }
        }
      })
      .catch(() => { });
  }, []);

  const [formData, setFormData] = useState({
    gstin: "",
    businessType: "",
    experience: "1-3",
    investment: "5-15",
    teamSize: "2-5",
    country: "India",
    state: initialState,
    district: (INDIAN_STATES_DISTRICTS[initialState] || [""])[0],
  });
  const [touched, setTouched] = useState(false);

  // ── Fetch dynamic plans from Admin Panel API ───────────────────────────────
  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/india/v1/reseller/plans/list");
      const result = res.data;
      if (result.status === "success" && Array.isArray(result.data)) {
        setPlans(result.data);
        if (result.data.length > 0) {
          // Default select the first popular plan or the first active plan
          const popular = result.data.find((p) => p.is_popular) || result.data[0];
          setSelectedPlanId(popular?.id || popular?._id);
        }
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error("Error fetching franchise plans for eligibility:", err);
      setError("Unable to connect to Admin Panel plans. Please verify the backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const gstin = formData.gstin.trim().toUpperCase();
  const gstinValid = GSTIN_PATTERN.test(gstin);

  // Selected Plan Object from live plans
  const selectedPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans.find((p) => (p.id || p._id) === selectedPlanId) || plans[0];
  }, [plans, selectedPlanId]);

  const profileMatch = useMemo(() => {
    let score = 55;
    if (gstinValid) score += 10;
    if (formData.experience === "3+") score += 10;
    if (formData.investment === "15+") score += 15;
    else if (formData.investment === "5-15") score += 10;
    if (formData.teamSize === "10+") score += 10;
    else if (formData.teamSize === "2-5" || formData.teamSize === "6-10") score += 6;
    return Math.min(score, 98);
  }, [formData.experience, formData.investment, formData.teamSize, gstinValid]);

  const qualification = useMemo(() => {
    const level = (selectedPlan?.territory_level || "district").toLowerCase();
    if (level === "district") {
      return {
        ready: gstinValid,
        text: gstinValid ? "Strong profile for district dealership" : "Enter a valid GSTIN to qualify",
      };
    }
    if (level === "state") {
      const ready = gstinValid && ["5-15", "15+"].includes(formData.investment) && formData.teamSize !== "solo";
      return {
        ready,
        text: ready ? "Profile fits state distribution network" : "State plan needs ₹5L+ capacity and an operations team",
      };
    }
    const ready =
      gstinValid &&
      formData.investment === "15+" &&
      ["6-10", "10+"].includes(formData.teamSize) &&
      formData.experience === "3+";
    return {
      ready,
      text: ready ? "Eligible for country master franchise review" : "Country master plan needs ₹15L+, 3+ years and an established network",
    };
  }, [selectedPlan, formData, gstinValid]);

  const locationText = useMemo(() => {
    const level = (selectedPlan?.territory_level || "district").toLowerCase();
    if (level === "district") return `${formData.district}, ${formData.state}`;
    if (level === "state") return `${formData.state}`;
    return formData.country;
  }, [selectedPlan, formData]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleStateChange = (state) => {
    setFormData((current) => ({
      ...current,
      state,
      district: (INDIAN_STATES_DISTRICTS[state] || [""])[0],
    }));
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!gstinValid || !selectedPlan) return;

    const contextPayload = {
      plan_id: selectedPlan.id || selectedPlan._id,
      kitName: selectedPlan.name,
      gstin,
      state: formData.state,
      district: formData.district,
      country: formData.country,
      territoryLevel: selectedPlan.territory_level,
      preferredModel: selectedPlan.name,
      requiredConfig: `${selectedPlan.name} | ${locationText} | Match ${profileMatch}%`,
      businessProfile: formData.businessType,
      notes: `Applied via Eligibility Checker with ${profileMatch}% match score for ${selectedPlan.name} (${locationText}).`,
    };

    if (typeof externalOpenLeadModal === "function") {
      externalOpenLeadModal(contextPayload, "franchise_apply");
    } else {
      setInternalModalContext(contextPayload);
      setInternalModalOpen(true);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#253880] focus:ring-4 focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Show Navbar when rendered directly on /eligibility page */}
      {!externalOpenLeadModal && <Navbar onOpenLeadModal={() => setInternalModalOpen(true)} />}

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-xs">
              <FiShield className="text-[#F49222]" size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D97E15]">
                Official Franchise Program
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">
              Territory Franchise <span className="text-[#253880]">Eligibility Checker</span>
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600">
              Verify your business profile, select from active Admin-authorized partner plans, and receive verified territory allocation.
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-12 flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs">
              <FiLoader className="animate-spin text-[#253880]" size={36} />
              <p className="mt-4 text-sm font-bold text-slate-700">Loading authorized franchise plans from Admin Panel...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching live territory tiers, fee structures, and commercial margins</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="mt-12 max-w-xl mx-auto p-6 bg-red-50 border border-red-200 rounded-3xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <FiAlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-900">Failed to Load Franchise Plans</h3>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={fetchPlans}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-xs"
              >
                <FiRefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && plans.length === 0 && (
            <div className="mt-12 max-w-xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
              <FiBriefcase className="mx-auto text-amber-600" size={32} />
              <h3 className="text-base font-bold text-amber-900">No Active Franchise Plans Found</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please add and activate Franchise Plans in the Admin Panel (<strong>Franchisee Management ➔ Franchisee Plans</strong>) to display them here.
              </p>
            </div>
          )}

          {/* Main Interactive Grid */}
          {!loading && !error && plans.length > 0 && selectedPlan && (
            <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: Form Details & Plan Selector */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-7 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#253880]">Applicant Profile</p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">Business & Territory Details</h2>
                  </div>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase text-[#D97E15]">
                    GSTIN Required
                  </span>
                </div>

                {/* GSTIN Input */}
                <div>
                  <label htmlFor="gstin" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    GSTIN Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="gstin"
                      maxLength={15}
                      value={formData.gstin}
                      onBlur={() => setTouched(true)}
                      onChange={(e) => updateField("gstin", e.target.value.toUpperCase().replace(/\s/g, ""))}
                      placeholder="22AAAAA0000A1Z5"
                      className={`${inputClass} pr-11 uppercase font-mono ${touched && !gstinValid
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : gstinValid
                            ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                            : ""
                        }`}
                      aria-invalid={touched && !gstinValid}
                    />
                    {gstinValid && (
                      <FiCheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600" size={19} />
                    )}
                  </div>
                  <p className={`mt-1.5 text-[11px] ${touched && !gstinValid ? "text-red-600" : "text-slate-500"}`}>
                    {touched && !gstinValid
                      ? "Enter a valid 15-character GSTIN. GSTIN is compulsory."
                      : "GSTIN is securely used to verify territory business ownership."}
                  </p>
                </div>

                {/* Profile Selectors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Business Profile
                    <select
                      value={formData.businessType}
                      onChange={(e) => updateField("businessType", e.target.value)}
                      className={inputClass}
                    >
                      {businessProfiles.length === 0 ? (
                        <option value="">No Business Profiles Configured</option>
                      ) : (
                        businessProfiles.map((bp) => (
                          <option key={bp.code || bp._id || bp.name} value={bp.name}>
                            {bp.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Industry Experience
                    <select
                      value={formData.experience}
                      onChange={(e) => updateField("experience", e.target.value)}
                      className={inputClass}
                    >
                      <option value="0-1">0–1 Year</option>
                      <option value="1-3">1–3 Years</option>
                      <option value="3+">3+ Years</option>
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Investment Capacity
                    <select
                      value={formData.investment}
                      onChange={(e) => updateField("investment", e.target.value)}
                      className={inputClass}
                    >
                      <option value="2-5">₹2L–₹5L</option>
                      <option value="5-15">₹5L–₹15L</option>
                      <option value="15+">₹15L+</option>
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Sales & Operations Team
                    <select
                      value={formData.teamSize}
                      onChange={(e) => updateField("teamSize", e.target.value)}
                      className={inputClass}
                    >
                      <option value="solo">Solo operator</option>
                      <option value="2-5">2–5 Members</option>
                      <option value="6-10">6–10 Members</option>
                      <option value="10+">10+ Members</option>
                    </select>
                  </label>
                </div>

                {/* Dynamic Admin Plans Selector */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Choose Admin Authorized Plan ({plans.length} available)
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Live from Central Database</span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {plans.map((plan) => {
                      const id = plan.id || plan._id;
                      const active = (selectedPlan.id || selectedPlan._id) === id;
                      const level = (plan.territory_level || "district").toLowerCase();
                      const Icon = level === "state" ? FiMap : level === "country" ? FiGlobe : FiMapPin;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedPlanId(id)}
                          className={`relative rounded-2xl border p-3.5 text-left transition-all flex flex-col justify-between ${active
                              ? "border-[#253880] bg-blue-50/70 text-[#253880] ring-2 ring-blue-100 shadow-xs"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50"
                            }`}
                        >
                          {plan.is_popular && (
                            <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F49222] to-[#E07D10] text-[9px] font-black text-white uppercase tracking-wider shadow-xs">
                              Popular
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-[#253880] text-white" : "bg-slate-100 text-slate-500"
                                }`}
                            >
                              <Icon size={14} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {plan.territory_level || "Plan"}
                            </span>
                          </div>

                          <div className="mt-2.5">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1">{plan.name}</p>
                            <p className="text-xs font-black text-[#253880] mt-0.5">
                              ₹{Number(plan.one_time_fee || 0).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* State & District Target Location */}
                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Target State
                    <select
                      value={formData.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className={inputClass}
                    >
                      {states.map((state) => (
                        <option key={state}>{state}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Target District
                    <select
                      value={formData.district}
                      onChange={(e) => updateField("district", e.target.value)}
                      className={inputClass}
                    >
                      {(INDIAN_STATES_DISTRICTS[formData.state] || []).map((district) => (
                        <option key={district}>{district}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Right Column: Live Recommendation Card */}
              <aside className="overflow-hidden rounded-3xl border-2 border-[#253880] bg-white shadow-xl shadow-blue-900/10 lg:sticky lg:top-8">
                <div className="flex items-center justify-between bg-[#253880] px-5 py-3.5 text-white">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] flex items-center gap-1.5">
                    <FiCheckCircle size={13} />
                    <span>Live Admin Plan Details</span>
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                    {profileMatch}% Profile Match
                  </span>
                </div>

                <div className="p-5 sm:p-7 space-y-5">
                  {/* Plan Title & Level */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[#D97E15] text-[10px] font-black uppercase tracking-wider">
                        {selectedPlan.territory_level} Franchise
                      </span>
                      <h3 className="mt-1.5 text-2xl font-black text-slate-900 tracking-tight">
                        {selectedPlan.name}
                      </h3>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#253880]">
                      <FiBriefcase size={21} />
                    </div>
                  </div>

                  {/* Dynamic Plan Description */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                    {selectedPlan.description || "Authorized distributor franchise partner plan with direct warehouse equipment fulfillment."}
                  </p>

                  {/* Pricing & Commercial Structure Box */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          One-Time Onboarding Fee
                        </p>
                        <p className="mt-0.5 text-2xl sm:text-3xl font-black text-slate-900">
                          ₹{Number(selectedPlan.one_time_fee || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-600">
                          {selectedPlan.validity_value || 1} {selectedPlan.validity_unit || "year(s)"} validity
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Territory Scope</p>
                        <p className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">
                          {selectedPlan.max_states_allowed || `${selectedPlan.allowed_territories_count || 1} ${selectedPlan.territory_level}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Commission Rate</p>
                        <p className="mt-0.5 text-xs font-black text-[#253880]">
                          {selectedPlan.default_commission_rate || 8}% Commission
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Warehouse Infrastructure</p>
                        <p className="mt-0.5 text-xs font-black text-slate-800">
                          {selectedPlan.warehouse_required
                            ? `${selectedPlan.warehouse_count || 1} WH (${Number(selectedPlan.warehouse_space_sqft || 0).toLocaleString("en-IN")} sqft)`
                            : "No WH Required"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Order Fulfillment</p>
                        <p className="mt-0.5 text-xs font-black text-purple-700">
                          {formatOrderTypes(selectedPlan.order_type_allowed)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Benefits Checklist */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plan Highlights</p>
                    <ul className="space-y-2 text-xs font-medium text-slate-600">
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>Authorized {selectedPlan.territory_level}-level exclusivity in <strong>{locationText}</strong></span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>
                          <strong>MOQ Capacity:</strong> Up to {Number(selectedPlan.moq_capacity_kw || 10000).toLocaleString("en-IN")} kW ({selectedPlan.moq_kits_count || 1} Kit MOQ)
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>
                          <strong>Project Types:</strong> {selectedPlan.project_types_display || selectedPlan.moq_project_type || "All Project Types (Residential / Commercial)"}
                        </span>
                      </li>
                      {selectedPlan.combo_kits_display && selectedPlan.combo_kits_display !== "All Admin Combo Kits" && (
                        <li className="flex items-center gap-2.5">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                            <FiCheck size={12} strokeWidth={3} />
                          </span>
                          <span>
                            <strong>Covered Kits:</strong> {selectedPlan.combo_kits_display}
                          </span>
                        </li>
                      )}
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>
                          <strong>Warehouse Requirement:</strong> {selectedPlan.warehouse_required
                            ? `${selectedPlan.warehouse_count || 1} Warehouse Hub (${Number(selectedPlan.warehouse_space_sqft || 0).toLocaleString("en-IN")} sq. ft.)`
                            : "Direct hub fulfillment without mandatory warehouse"}
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>
                          <strong>Allowed Orders:</strong> {formatOrderTypes(selectedPlan.order_type_allowed)}
                        </span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                          <FiCheck size={12} strokeWidth={3} />
                        </span>
                        <span>Real-time earnings with {selectedPlan.default_commission_rate || 8}% direct franchisee commission on sales</span>
                      </li>
                    </ul>
                  </div>

                  {/* Qualification Alert */}
                  <div
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 ${qualification.ready ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"
                      }`}
                  >
                    {qualification.ready ? (
                      <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />
                    ) : (
                      <FiTrendingUp className="mt-0.5 shrink-0 text-[#D97E15]" />
                    )}
                    <div>
                      <p className={`text-xs font-black ${qualification.ready ? "text-emerald-800" : "text-orange-800"}`}>
                        {qualification.ready ? "Recommended for your profile" : "Profile note"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">{qualification.text}</p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!gstinValid}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#253880] to-[#1d2c66] px-4 py-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/25 transition-all hover:from-[#1d2c66] hover:to-[#253880] disabled:cursor-not-allowed disabled:opacity-45 hover:shadow-xl"
                    >
                      <span>Apply for {selectedPlan.name}</span>
                      <FiArrowRight size={15} />
                    </button>
                    {!gstinValid && (
                      <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
                        Enter a valid 15-digit GSTIN above to unlock franchise application
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {/* Standalone Lead Capture Modal when on /eligibility page */}
      <LeadCaptureModal
        isOpen={internalModalOpen}
        onClose={() => setInternalModalOpen(false)}
        initialContext={internalModalContext}
        actionType="franchise_apply"
      />

      {/* Show Footer when rendered directly on /eligibility page */}
      {!externalOpenLeadModal && <Footer onOpenLeadModal={() => setInternalModalOpen(true)} />}
    </div>
  );
}
