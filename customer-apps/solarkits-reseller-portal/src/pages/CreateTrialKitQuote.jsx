import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiSearch,
  FiTruck,
  FiMapPin,
  FiBox,
  FiShield,
  FiDollarSign,
  FiFileText,
  FiUsers,
  FiAlertCircle,
  FiLayers,
  FiInfo,
  FiCheckCircle,
  FiPackage,
  FiChevronDown,
  FiZap,
  FiSun,
  FiGrid,
  FiList,
} from "react-icons/fi";
import api from "../services/api";

const STEPS = [
  { num: 1, title: "EPC Buyer", desc: "Select target EPC client", icon: FiUsers },
  { num: 2, title: "Delivery Site", desc: "Location & dispatch mode", icon: FiTruck },
  { num: 3, title: "Choose ComboKit", desc: "Admin trial packs & qty", icon: FiBox },
<<<<<<< HEAD
  { num: 4, title: "Warranty Option", desc: "Protection package", icon: FiShield },
  { num: 5, title: "Review & Generate", desc: "Summary & pricing", icon: FiDollarSign },
=======
  { num: 4, title: "Review & Generate", desc: "Summary & pricing", icon: FiDollarSign },
>>>>>>> origin/main
];

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

function TrialKitCard({ kit, isSelected, onSelectKit }) {
  const trialQty = useMemo(() => {
    return kit.trial_kit_quantity !== undefined && kit.trial_kit_quantity !== null
      ? Math.max(1, Number(kit.trial_kit_quantity))
      : 10;
  }, [kit.trial_kit_quantity]);

  const unitPricePaise = kit.price_paise || kit.mrp_paise || (kit.selling_price_cached ? kit.selling_price_cached * 100 : 0);
  const totalBatchPaise = unitPricePaise * trialQty;
  const gstRate = kit.gst_rate || 13.8;
  const gstIncludedPaise = Math.round(totalBatchPaise - (totalBatchPaise / (1 + gstRate / 100)));

  const capacityKW = kit.capacity || kit.kit_capacity_kw || 1;
  const panelCount = Math.max(2, Math.round(capacityKW * 2));
  const warrantyYears = kit.warranty_years || 12;
  const kitImage = kit.kit_image || "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

  return (
    <div
      onClick={() => onSelectKit(kit, trialQty)}
      className={`rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-800 shadow-sm hover:shadow-md cursor-pointer ${
        isSelected
          ? "border-purple-600 ring-2 ring-purple-600/20 shadow-md"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
      }`}
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Top Header: Badge & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[180px]">
            {kit.project_type_name || kit.industry_type_name || "Individual Home - On-Grid"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <FiBox size={10} /> Trial Kit
          </span>
        </div>

        {/* Kit Image Container */}
        <div className="relative mb-3.5 flex justify-center items-center bg-gradient-to-tr from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800/60 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/60 w-full h-44 group">
          <img
            src={kitImage}
            alt={kit.name}
            className="w-full h-full p-2.5 object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
            }}
          />
          {isSelected && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
              <FiCheck size={14} />
            </div>
          )}
        </div>

        {/* Title & Brand */}
        <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 leading-snug mb-1">
          {kit.name}
        </h4>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <span>Brand: <strong className="text-slate-700 dark:text-slate-300">{kit.brand_name || "SolarKits"}</strong></span>
          <span>•</span>
          <span>Warranty: <strong className="text-slate-700 dark:text-slate-300">{warrantyYears} Yrs</strong></span>
        </div>

        {/* Hardware Specs Pills */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 mb-3 text-xs">
          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-purple-600 shadow-2xs border border-slate-200/50">
              <FiZap size={15} />
            </div>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[68px]">
              {capacityKW} kW System
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-amber-600 shadow-2xs border border-slate-200/50">
              <FiSun size={15} />
            </div>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[68px]">
              {panelCount} Panels
            </span>
          </div>

          <span className="text-xs font-black text-slate-400 shrink-0">+</span>

          <div className="flex flex-col items-center justify-center text-center shrink-0 w-[68px]">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 shadow-2xs border border-slate-200/50">
              <FiPackage size={15} />
            </div>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[68px]">
              Wiring & BOS
            </span>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="mb-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Trial Unit Price</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
              {formatINR(unitPricePaise)}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">/ kit</span>
          </div>

          <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
            <span>Trial Pack Total:</span>
            <span>{formatINR(totalBatchPaise)}</span>
            <span className="text-[10px] font-normal text-slate-400">({trialQty} kits)</span>
          </div>

          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
            (Includes {formatINR(gstIncludedPaise)} GST @ {gstRate}%)
          </span>
        </div>

        {/* Admin Trial Pack Quantity Badge (Strictly Enforced) */}
        <div className="mt-auto pt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300 mb-1">
              <span className="flex items-center gap-1">
                <FiBox size={13} className="text-purple-600" />
                <span>Admin Configured Trial Pack</span>
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                Quantity Locked
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-700 dark:text-purple-300">
                {trialQty} Kits Pack
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Admin Configured
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Selection Bar */}
      <div
        className={`p-3 text-center text-xs font-bold transition-colors ${
          isSelected
            ? "bg-purple-600 text-white"
            : "bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
        }`}
      >
        {isSelected ? (
          <span className="flex items-center justify-center gap-1.5">
            <FiCheck size={14} /> Selected ({trialQty} Kits Trial Pack)
          </span>
        ) : (
          <span>Select This Trial Pack</span>
        )}
      </div>
    </div>
  );
}

export default function CreateTrialKitQuote() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Form selections
  const [selectedEpc, setSelectedEpc] = useState(null);
  const [epcViewMode, setEpcViewMode] = useState("table");
  const [deliveryType, setDeliveryType] = useState("epc_location");
  const [deliveryDetails, setDeliveryDetails] = useState({
    shipping_address_line1: "",
    state_name: "",
    district_name: "",
    pincode: "",
    contact_person: "",
    mobile: "",
  });

  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(10);
<<<<<<< HEAD
  const [selectedWarranty, setSelectedWarranty] = useState(null);
=======
>>>>>>> origin/main

  // Data lists from backend
  const [epcList, setEpcList] = useState([]);
  const [epcSearch, setEpcSearch] = useState("");
  const [kitList, setKitList] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [kitSearch, setKitSearch] = useState("");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("all");
<<<<<<< HEAD
  const [warrantyList, setWarrantyList] = useState([]);
=======
>>>>>>> origin/main
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Live Pricing Calculation
  const [pricing, setPricing] = useState({
    price_per_kit_paise: 0,
    product_subtotal_paise: 0,
    warranty_charges_paise: 0,
    delivery_charges_paise: 0,
    taxable_amount_paise: 0,
    gst_rate: 13.8,
    gst_amount_paise: 0,
    total_amount_paise: 0,
  });

  // Fetch eligible EPCs
  const fetchEpcs = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/quotes/eligible-epcs");
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.epcs)
          ? raw.epcs
          : Array.isArray(res.data?.epcs)
          ? res.data.epcs
          : [];
        setEpcList(list);
      } else {
        setEpcList([]);
      }
    } catch (err) {
      console.error("Failed to load eligible EPCs:", err);
      setEpcList([]);
    }
  }, []);

  // Fetch Kits authorized specifically for Trial Kits
  const fetchKits = useCallback(async () => {
    setLoadingKits(true);
    try {
      const res = await api.get("/india/v1/reseller/quotes/eligible-kits", {
        params: { trial_only: true, quote_type: "trial_kit" },
      });
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.kits)
          ? raw.kits
          : Array.isArray(res.data?.kits)
          ? res.data.kits
          : [];
        // Double-check allow_trial_kit
        const filtered = list.filter((k) => k.allow_trial_kit !== false);
        setKitList(filtered);
      } else {
        setKitList([]);
      }
    } catch (err) {
      console.error("Failed to load trial kits:", err);
      setKitList([]);
    } finally {
      setLoadingKits(false);
    }
  }, []);

<<<<<<< HEAD
  // Fetch Warranties
  const fetchWarranties = useCallback(async (kitId) => {
    try {
      const params = {};
      if (kitId) params.combo_kit_id = kitId;
      const res = await api.get("/india/v1/reseller/quotes/eligible-warranties", { params });
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.warranties)
          ? raw.warranties
          : Array.isArray(res.data?.warranties)
          ? res.data.warranties
          : [];
        setWarrantyList(list);
      } else {
        setWarrantyList([]);
      }
    } catch (err) {
      console.error("Failed to load warranties:", err);
      setWarrantyList([]);
    }
  }, []);

=======
>>>>>>> origin/main
  // Fetch Warehouses
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/reseller/quotes/eligible-warehouses");
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.warehouses)
          ? raw.warehouses
          : Array.isArray(res.data?.warehouses)
          ? res.data.warehouses
          : [];
        setWarehouses(list);
        if (list.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(list[0]._id);
        }
      } else {
        setWarehouses([]);
      }
    } catch (err) {
      console.error("Failed to load warehouses:", err);
      setWarehouses([]);
    }
  }, [selectedWarehouseId]);

  useEffect(() => {
    fetchEpcs();
    fetchKits();
    fetchWarehouses();
  }, [fetchEpcs, fetchKits, fetchWarehouses]);

<<<<<<< HEAD
  // Recalculate price when kit, qty, warranty, or delivery changes
=======
  // Recalculate price when kit, qty, or delivery changes
>>>>>>> origin/main
  useEffect(() => {
    if (!selectedKit) return;

    const baseUnitPaise = selectedKit.price_paise || selectedKit.mrp_paise || (selectedKit.selling_price_cached ? selectedKit.selling_price_cached * 100 : 0);
    const subtotalPaise = baseUnitPaise * quantity;

<<<<<<< HEAD
    let warrantyPaise = 0;
    if (selectedWarranty) {
      if (selectedWarranty.pricing_mode === "percentage" && selectedWarranty.price_pct) {
        warrantyPaise = Math.round((subtotalPaise * selectedWarranty.price_pct) / 100);
      } else if (selectedWarranty.price_per_kit_paise) {
        warrantyPaise = selectedWarranty.price_per_kit_paise * quantity;
      }
    }

    const deliveryPaise = deliveryType === "franchisee_warehouse" ? 0 : 250000 * quantity;
    const taxablePaise = subtotalPaise + warrantyPaise + deliveryPaise;
=======
    const deliveryPaise = deliveryType === "franchisee_warehouse" ? 0 : 250000 * quantity;
    const taxablePaise = subtotalPaise + deliveryPaise;
>>>>>>> origin/main
    const gstRate = Number(selectedKit?.gst_rate ?? selectedKit?.tax_pct ?? selectedKit?.gst_pct ?? 13.8);
    const gstPaise = Math.round((taxablePaise * gstRate) / 100);
    const totalPaise = taxablePaise + gstPaise;

    setPricing({
      price_per_kit_paise: baseUnitPaise,
      product_subtotal_paise: subtotalPaise,
<<<<<<< HEAD
      warranty_charges_paise: warrantyPaise,
=======
      warranty_charges_paise: 0,
>>>>>>> origin/main
      delivery_charges_paise: deliveryPaise,
      taxable_amount_paise: taxablePaise,
      gst_rate: gstRate,
      gst_amount_paise: gstPaise,
      total_amount_paise: totalPaise,
    });
<<<<<<< HEAD
  }, [selectedKit, quantity, selectedWarranty, deliveryType]);
=======
  }, [selectedKit, quantity, deliveryType]);
>>>>>>> origin/main

  // On EPC Selection, prepopulate address
  const handleSelectEpc = (epc) => {
    setSelectedEpc(epc);
    const addr = epc.address || epc.street_address || epc.address_line1 || (typeof epc.address === "object" ? epc.address?.street_address : "") || "";
    const state = epc.state_name || (typeof epc.address === "object" ? epc.address?.state : "") || "Gujarat";
    const dist = epc.district_name || (typeof epc.address === "object" ? epc.address?.district : "") || "Surat";
    const pin = epc.pincode || (typeof epc.address === "object" ? epc.address?.pincode : "") || "395001";
    const contact = epc.contact_person || epc.name || "";
    const phone = epc.mobile || epc.phone || "";

    setDeliveryDetails({
      shipping_address_line1: addr || `Plot 42, GIDC Industrial Zone, ${dist}, ${state} - ${pin}`,
      state_name: state,
      district_name: dist,
      pincode: pin,
      contact_person: contact,
      mobile: phone,
    });
  };

  // Filtered EPC List
  const filteredEpcs = useMemo(() => {
    if (!epcSearch.trim()) return epcList;
    const q = epcSearch.toLowerCase();
    return epcList.filter(
      (e) =>
        e.company_name?.toLowerCase().includes(q) ||
        e.name?.toLowerCase().includes(q) ||
        e.gstin?.toLowerCase().includes(q) ||
        e.mobile?.includes(q)
    );
  }, [epcList, epcSearch]);

  // Filtered Kits List
  const filteredKits = useMemo(() => {
    return kitList.filter((k) => {
      const matchSearch =
        !kitSearch.trim() ||
        k.name?.toLowerCase().includes(kitSearch.toLowerCase()) ||
        k.brand_name?.toLowerCase().includes(kitSearch.toLowerCase());
      const matchIndustry =
        selectedIndustryFilter === "all" ||
        k.industry_type_id === selectedIndustryFilter ||
        k.industry_type_name?.toLowerCase() === selectedIndustryFilter.toLowerCase();
      return matchSearch && matchIndustry;
    });
  }, [kitList, kitSearch, selectedIndustryFilter]);

  // Extract unique industries for filter tabs
  const industries = useMemo(() => {
    const map = new Map();
    kitList.forEach((k) => {
      if (k.industry_type_name) {
        map.set(k.industry_type_name, k.industry_type_id || k.industry_type_name);
      }
    });
    return Array.from(map.entries()).map(([name, id]) => ({ id, name }));
  }, [kitList]);

  // Submit Quote (Draft or Official Generate)
  const handleSubmitQuote = async (isDraft = false) => {
    if (!selectedEpc) {
      setError("Please select an EPC client in Step 1.");
      setCurrentStep(1);
      return;
    }
    if (!selectedKit) {
      setError("Please select a Combo Kit in Step 3.");
      setCurrentStep(3);
      return;
    }

    setGenerating(true);
    setError("");

    try {
      const payload = {
        epc_id: selectedEpc._id,
        delivery_type: deliveryType,
        delivery_address: deliveryDetails,
        delivery_address_snapshot: deliveryDetails,
        industry_type_id: selectedKit?.industry_type_id || undefined,
        project_type_id: selectedKit?.project_type_id || undefined,
        combo_kit_id: selectedKit._id,
        warehouse_id: selectedWarehouseId || undefined,
        quantity: Number(quantity),
        quote_mode: "trial_quote",
        is_trial_kit: true,
        quote_type: "trial_kit",
        trial_kit_quantity: Number(quantity),
<<<<<<< HEAD
        warranty_id: selectedWarranty?._id || undefined,
        price_per_kit_paise: pricing.price_per_kit_paise,
        warranty_charges_paise: pricing.warranty_charges_paise,
=======
        warranty_id: undefined,
        price_per_kit_paise: pricing.price_per_kit_paise,
        warranty_charges_paise: 0,
>>>>>>> origin/main
        delivery_charges_paise: pricing.delivery_charges_paise,
        taxable_amount_paise: pricing.taxable_amount_paise,
        gst_rate: pricing.gst_rate,
        gst_amount_paise: pricing.gst_amount_paise,
        total_amount_paise: pricing.total_amount_paise,
      };

      // Create draft first
      const draftRes = await api.post("/india/v1/reseller/quotes", payload);
      if (draftRes.data?.status !== "success") {
        throw new Error(draftRes.data?.message || "Failed to create trial kit quote.");
      }

      const quoteId = draftRes.data.data._id;

      if (!isDraft) {
        // Officially generate quote
        const genRes = await api.post(`/india/v1/reseller/quotes/${quoteId}/generate`);
        if (genRes.data?.status === "success") {
          navigate(`/trial-kit-quotes/${quoteId}`);
          return;
        }
      }

      // If draft or generated fallback
      navigate(`/trial-kit-quotes/${quoteId}`);
    } catch (err) {
      console.error("Quote creation error:", err);
      setError(err.response?.data?.message || err.message || "Failed to save quotation.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Link
            to="/trial-kit-quotes"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition"
          >
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Create Trial Kit Quote
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Admin Pack Enforced
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly configured trial evaluation packs for verified EPC partners
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
<<<<<<< HEAD
          <div className="text-xs text-slate-400">Step {currentStep} of 5</div>
=======
          <div className="text-xs text-slate-400">Step {currentStep} of 4</div>
>>>>>>> origin/main
          <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
            {STEPS[currentStep - 1]?.title}
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
<<<<<<< HEAD
        <div className="grid grid-cols-5 gap-2 md:gap-4">
=======
        <div className="grid grid-cols-4 gap-2 md:gap-4">
>>>>>>> origin/main
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <button
                key={step.num}
                type="button"
                onClick={() => isCompleted && setCurrentStep(step.num)}
                disabled={!isCompleted && !isCurrent}
                className={`text-left transition-all ${
                  !isCompleted && !isCurrent ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <FiCheck size={14} /> : step.num}
                  </div>
                  <span
                    className={`text-xs font-bold hidden md:inline truncate ${
                      isCurrent
                        ? "text-purple-600 dark:text-purple-400 font-black"
                        : isCompleted
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                <div
                  className={`h-1.5 w-full rounded-full transition-all ${
                    isCompleted
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-purple-600"
                      : "bg-slate-100 dark:bg-slate-700"
                  }`}
                ></div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <FiAlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: EPC BUYER SELECTION */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Step 1: Select Target EPC Client
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose the verified EPC partner to whom this Trial Kit quote will be issued
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search by company or GSTIN..."
                  value={epcSearch}
                  onChange={(e) => setEpcSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEpcViewMode("table")}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    epcViewMode === "table" ? "bg-white dark:bg-slate-800 shadow-xs text-purple-600" : "text-slate-500"
                  }`}
                  title="Table View"
                >
                  <FiList size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEpcViewMode("grid")}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    epcViewMode === "grid" ? "bg-white dark:bg-slate-800 shadow-xs text-purple-600" : "text-slate-500"
                  }`}
                  title="Card Grid View"
                >
                  <FiGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {filteredEpcs.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <FiUsers size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No EPC clients found matching your query.</p>
            </div>
          ) : epcViewMode === "table" ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 dark:bg-slate-900/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredEpcs.map((epc) => {
                    const isSelected = selectedEpc?._id === epc._id;
                    return (
                      <tr
                        key={epc._id}
                        onClick={() => handleSelectEpc(epc)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-purple-50/60 dark:bg-purple-950/30"
                            : "hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black flex items-center justify-center text-xs">
                              {(epc.company_name || epc.name || "E").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{epc.company_name || epc.name}</div>
                              {epc.legal_name && (
                                <div className="text-[10px] text-slate-400 font-normal">{epc.legal_name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {epc.gstin || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          <div>{epc.contact_person || epc.name || "—"}</div>
                          <div className="text-[10px] text-slate-400">{epc.mobile || "—"}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {epc.district_name || "Surat"}, {epc.state_name || "Gujarat"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEpc(epc);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                              isSelected
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEpcs.map((epc) => {
                const isSelected = selectedEpc?._id === epc._id;
                return (
                  <div
                    key={epc._id}
                    onClick={() => handleSelectEpc(epc)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                      isSelected
                        ? "border-purple-600 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {epc.company_name || epc.name}
                      </h4>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                          <FiCheck size={12} />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div>GSTIN: <span className="font-mono text-slate-700 dark:text-slate-300">{epc.gstin || "—"}</span></div>
                      <div>Contact: <span className="text-slate-700 dark:text-slate-300">{epc.contact_person || epc.name}</span> ({epc.mobile})</div>
                      <div>Location: <span className="text-slate-700 dark:text-slate-300">{epc.district_name}, {epc.state_name}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              disabled={!selectedEpc}
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition disabled:opacity-40 shadow"
            >
              <span>Next: Delivery Site</span>
              <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DELIVERY SITE */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Step 2: Delivery Site & Logistics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify delivery mode and destination details for this Trial Kit pack
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryType("epc_location")}
              className={`p-4 rounded-2xl border-2 text-left transition ${
                deliveryType === "epc_location"
                  ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  EPC Partner Site Delivery
                </span>
                <FiTruck className="text-purple-600" size={18} />
              </div>
              <p className="text-xs text-slate-500">
                Direct door-to-door dispatch to the EPC client's registered site or warehouse.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType("franchisee_warehouse")}
              className={`p-4 rounded-2xl border-2 text-left transition ${
                deliveryType === "franchisee_warehouse"
                  ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Franchisee Warehouse Self-Pickup
                </span>
                <FiMapPin className="text-purple-600" size={18} />
              </div>
              <p className="text-xs text-slate-500">
                EPC client collects directly from your local Franchisee Hub (Zero freight charges).
              </p>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Shipping Address Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="md:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  Address Line (Plot, Survey, Street) *
                </label>
                <input
                  type="text"
                  value={deliveryDetails.shipping_address_line1}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, shipping_address_line1: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Plot 42, GIDC Industrial Zone"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  District / City *
                </label>
                <input
                  type="text"
                  value={deliveryDetails.district_name}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, district_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  State *
                </label>
                <input
                  type="text"
                  value={deliveryDetails.state_name}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, state_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  Pincode *
                </label>
                <input
                  type="text"
                  value={deliveryDetails.pincode}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, pincode: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                  Site Contact Person
                </label>
                <input
                  type="text"
                  value={deliveryDetails.contact_person}
                  onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contact_person: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow"
            >
              <span>Next: Choose ComboKit</span>
              <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CHOOSE COMBO KIT (ADMIN TRIAL PACK CONFIG ENFORCED) */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Step 3: Choose ComboKit (Admin Trial Packs)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  Strict Admin Quantities
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing only ComboKits configured by Admin for trial evaluation with strictly locked quantities
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Filter kits by name or brand..."
                  value={kitSearch}
                  onChange={(e) => setKitSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Industry Filter Pills */}
          {industries.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedIndustryFilter("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                  selectedIndustryFilter === "all"
                    ? "bg-purple-600 text-white shadow-xs font-black"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Industries ({kitList.length})
              </button>
              {industries.map((ind) => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => setSelectedIndustryFilter(ind.name)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 ${
                    selectedIndustryFilter.toLowerCase() === ind.name.toLowerCase()
                      ? "bg-purple-600 text-white shadow-xs font-black"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {ind.name}
                </button>
              ))}
            </div>
          )}

          {/* Admin Enforced Alert Notice */}
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300">
            <FiInfo size={16} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Admin Configuration Rule:</strong> Trial kit quantities for these products are strictly locked to the quantity configured in the Admin Portal (e.g. 10 kits). Arbitrary bulk PO or loose quantity modifications are disabled for Trial Kit proposals.
            </div>
          </div>

          {/* Kit Cards Grid */}
          {loadingKits ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs">Loading authorized trial combo kits...</p>
            </div>
          ) : filteredKits.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
              <FiBox size={36} className="mx-auto text-slate-400 mb-2 opacity-60" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                No Trial Kits Authorized
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No combo kits are currently marked as available for trial kit evaluation by Admin configuration for your territory. Please contact the administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKits.map((kit) => (
                <TrialKitCard
                  key={kit._id}
                  kit={kit}
                  isSelected={selectedKit?._id === kit._id}
                  onSelectKit={(k, q) => {
                    setSelectedKit(k);
                    setQuantity(q);
<<<<<<< HEAD
                    fetchWarranties(k._id);
=======
>>>>>>> origin/main
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={!selectedKit}
              onClick={() => setCurrentStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition disabled:opacity-40 shadow"
            >
<<<<<<< HEAD
              <span>Next: Warranty Option</span>
              <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: WARRANTY OPTION */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Step 4: Select Warranty Package
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose protection warranty options to include with this Trial Kit quotation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Standard Manufacturer Warranty (Included) */}
            <div
              onClick={() => setSelectedWarranty(null)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                selectedWarranty === null
                  ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  OEM Factory Warranty
                </span>
                <FiShield className="text-emerald-600" size={18} />
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Standard OEM manufacturer warranty coverage included by default at zero extra cost.
              </p>
              <div className="text-xs font-bold text-emerald-600">
                Included in Kit Base Price
              </div>
            </div>

            {/* Additional Warranty Packages from DB */}
            {warrantyList.map((w) => {
              const isSelected = selectedWarranty?._id === w._id;
              return (
                <div
                  key={w._id}
                  onClick={() => setSelectedWarranty(w)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                    isSelected
                      ? "border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {w.name}
                    </span>
                    <FiShield className="text-purple-600" size={18} />
                  </div>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {w.description || "Comprehensive coverage with on-site technician support."}
                  </p>
                  <div className="text-xs font-black text-purple-600 dark:text-purple-400">
                    +{formatINR(w.price_per_kit_paise || (w.price_pct ? (pricing.product_subtotal_paise * w.price_pct) / (100 * quantity) : 0))} / kit
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow"
            >
=======
>>>>>>> origin/main
              <span>Next: Review & Generate</span>
              <FiArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* STEP 5: REVIEW & GENERATE */}
      {currentStep === 5 && (
=======
      {/* STEP 4: REVIEW & GENERATE */}
      {currentStep === 4 && (
>>>>>>> origin/main
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
<<<<<<< HEAD
                  Step 5: Review & Generate Trial Kit Proposal
=======
                  Step 4: Review & Generate Trial Kit Proposal
>>>>>>> origin/main
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                  Trial Proposal
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all deal specifics before issuing the official Trial Kit quotation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Details */}
            <div className="lg:col-span-2 space-y-4 text-xs">
              {/* Buyer & Delivery */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target EPC Partner
                  </span>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedEpc?.company_name || selectedEpc?.name}
                  </div>
                  <div className="text-slate-500 mt-0.5">GSTIN: {selectedEpc?.gstin || "—"}</div>
                  <div className="text-slate-500">Contact: {selectedEpc?.contact_person || selectedEpc?.name} ({selectedEpc?.mobile})</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Delivery Site & Dispatch
                  </span>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {deliveryType === "epc_location" ? "Direct Site Delivery" : "Franchisee Warehouse Pickup"}
                  </div>
                  <div className="text-slate-500 mt-0.5">{deliveryDetails.shipping_address_line1}</div>
                  <div className="text-slate-500">{deliveryDetails.district_name}, {deliveryDetails.state_name} - {deliveryDetails.pincode}</div>
                </div>
              </div>

              {/* Kit Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Configured ComboKit Product
                    </span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedKit?.name}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      System Capacity: <strong className="text-slate-700 dark:text-slate-300">{selectedKit?.capacity || 1} kW</strong> • Brand: <strong className="text-slate-700 dark:text-slate-300">{selectedKit?.brand_name || "SolarKits"}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300">
                      <FiBox size={13} />
                      {quantity} Kits (Admin Trial Pack)
                    </span>
                  </div>
                </div>
<<<<<<< HEAD

                {selectedWarranty && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Selected Protection Package:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{selectedWarranty.name}</span>
                  </div>
                )}
=======
>>>>>>> origin/main
              </div>
            </div>

            {/* Right 1 Col: Commercial Breakdown */}
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  Commercial Pricing Breakdown
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unit Price:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatINR(pricing.price_per_kit_paise)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Admin Pack Qty:</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{quantity} Kits</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Product Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatINR(pricing.product_subtotal_paise)}</span>
                  </div>

<<<<<<< HEAD
                  {pricing.warranty_charges_paise > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>Warranty Protection:</span>
                      <span className="font-bold">+{formatINR(pricing.warranty_charges_paise)}</span>
                    </div>
                  )}

=======
>>>>>>> origin/main
                  <div className="flex justify-between">
                    <span className="text-slate-500">Freight & Logistics:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {pricing.delivery_charges_paise === 0 ? "FREE" : formatINR(pricing.delivery_charges_paise)}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-semibold">
                    <span className="text-slate-600">Taxable Subtotal:</span>
                    <span className="text-slate-900 dark:text-white">{formatINR(pricing.taxable_amount_paise)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>GST ({pricing.gst_rate}%):</span>
                    <span className="font-bold">+{formatINR(pricing.gst_amount_paise)}</span>
                  </div>

                  <div className="flex justify-between pt-3 border-t-2 border-slate-200 dark:border-slate-700 text-sm">
                    <span className="font-black text-slate-900 dark:text-white">Total Amount:</span>
                    <span className="font-black text-purple-600 dark:text-purple-400 text-base">
                      {formatINR(pricing.total_amount_paise)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-6">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleSubmitQuote(false)}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {generating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <FiFileText size={15} />
                  <span>Generate Official Trial Quote</span>
                </button>

                <button
                  type="button"
                  disabled={generating}
                  onClick={() => handleSubmitQuote(true)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Save as Draft</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-start pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
<<<<<<< HEAD
              onClick={() => setCurrentStep(4)}
=======
              onClick={() => setCurrentStep(3)}
>>>>>>> origin/main
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
