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
  FiPlus,
  FiMinus,
} from "react-icons/fi";
import api from "../services/api";

const STEPS = [
  { num: 1, title: "EPC Buyer", desc: "Select target EPC client", icon: FiUsers },
  { num: 2, title: "Delivery Site", desc: "Location & dispatch mode", icon: FiTruck },
  { num: 3, title: "Choose ComboKit", desc: "Authorized kits & quantity", icon: FiBox },
  { num: 4, title: "Warranty Option", desc: "Protection package", icon: FiShield },
  { num: 5, title: "Review & Generate", desc: "Summary & pricing", icon: FiDollarSign },
];

function formatINR(paise) {
  if (paise == null || isNaN(paise)) return "₹0";
  const rupees = Math.round(paise / 100);
  return "₹" + rupees.toLocaleString("en-IN");
}

export default function CreateEpcQuote() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Form selections
  const [selectedEpc, setSelectedEpc] = useState(null);
  const [deliveryType, setDeliveryType] = useState("epc_location"); // epc_location | franchisee_warehouse
  const [deliveryDetails, setDeliveryDetails] = useState({
    shipping_address_line1: "",
    state_name: "",
    district_name: "",
    pincode: "",
    contact_person: "",
    mobile: "",
  });

  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedWarranty, setSelectedWarranty] = useState(null);

  // Data lists from backend
  const [epcList, setEpcList] = useState([]);
  const [epcSearch, setEpcSearch] = useState("");
  const [kitList, setKitList] = useState([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [kitSearch, setKitSearch] = useState("");
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState("all");
  const [warrantyList, setWarrantyList] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

  // Quick Filters State & Shop Hierarchy
  const [shopHierarchy, setShopHierarchy] = useState([]);
  const [quickFilters, setQuickFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
  });

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

  // Fetch Kits directly with enriched Industry and Project Type metadata
  const fetchKits = useCallback(async () => {
    setLoadingKits(true);
    try {
      const res = await api.get("/india/v1/reseller/quotes/eligible-kits");
      if (res.data?.status === "success") {
        const raw = res.data.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.kits)
            ? raw.kits
            : Array.isArray(res.data?.kits)
              ? res.data.kits
              : [];
        setKitList(list);
      } else {
        setKitList([]);
      }
    } catch (err) {
      console.error("Failed to load kits:", err);
      setKitList([]);
    } finally {
      setLoadingKits(false);
    }
  }, []);

  // Fetch Shop Hierarchy for Quick Filters
  const fetchHierarchy = useCallback(async () => {
    try {
      const res = await api.get("/india/v1/shop/hierarchy");
      if (res.data?.success || res.data?.status === "success") {
        setShopHierarchy(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load shop hierarchy:", err);
    }
  }, []);

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
    fetchHierarchy();
  }, [fetchEpcs, fetchKits, fetchWarehouses, fetchHierarchy]);

  // Recalculate price when kit, qty, warranty, or delivery changes
  useEffect(() => {
    if (!selectedKit) return;

    const baseUnitPaise = selectedKit.price_paise || selectedKit.mrp_paise || (selectedKit.selling_price_cached ? selectedKit.selling_price_cached * 100 : 0);
    const subtotalPaise = baseUnitPaise * quantity;

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
    const gstRate = Number(selectedKit?.gst_rate ?? selectedKit?.tax_pct ?? selectedKit?.gst_pct ?? 13.8);
    const gstPaise = Math.round((taxablePaise * gstRate) / 100);
    const totalPaise = taxablePaise + gstPaise;

    setPricing({
      price_per_kit_paise: baseUnitPaise,
      product_subtotal_paise: subtotalPaise,
      warranty_charges_paise: warrantyPaise,
      delivery_charges_paise: deliveryPaise,
      taxable_amount_paise: taxablePaise,
      gst_rate: gstRate,
      gst_amount_paise: gstPaise,
      total_amount_paise: totalPaise,
    });
  }, [selectedKit, quantity, selectedWarranty, deliveryType]);

  // On EPC Selection, prepopulate address from EPC data
  const handleSelectEpc = (epc) => {
    setSelectedEpc(epc);
    const addr = epc.address || epc.street_address || epc.address_line1 || (typeof epc.address === 'object' ? epc.address?.street_address : "") || "";
    const state = epc.state_name || (typeof epc.address === 'object' ? epc.address?.state : "") || "Gujarat";
    const dist = epc.district_name || (typeof epc.address === 'object' ? epc.address?.district : "") || "Surat";
    const pin = epc.pincode || (typeof epc.address === 'object' ? epc.address?.pincode : "") || "395001";
    const contact = epc.contact_person || epc.name || "";
    const mobile = epc.mobile || epc.phone || epc.whatsapp || "";

    setDeliveryDetails({
      shipping_address_line1: addr || `Plot 42, GIDC Industrial Zone, ${dist}, ${state} - ${pin}`,
      state_name: state,
      district_name: dist,
      pincode: pin,
      contact_person: contact,
      mobile: mobile,
    });
  };

  const handleDeliveryModeSelect = (modeId) => {
    setDeliveryType(modeId);
    if (modeId === "franchisee_warehouse") {
      setDeliveryDetails({
        shipping_address_line1: "Plot 101, GIDC Electronic Estate, Sachin, Surat",
        state_name: "Gujarat",
        district_name: "Surat",
        pincode: "394230",
        contact_person: "Franchisee Store Incharge",
        mobile: "9913421453",
      });
    } else if (selectedEpc) {
      handleSelectEpc(selectedEpc);
    }
  };

  // Step Validation & Progression (5 Steps)
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!selectedEpc;
      case 2:
        return deliveryType === "franchisee_warehouse" || !!(deliveryDetails.pincode && deliveryDetails.pincode.length >= 6);
      case 3:
        return !!selectedKit;
      case 4:
        return quantity >= 1;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setError("");
    if (!canProceed()) {
      setError("Please complete all required fields for this step before continuing.");
      return;
    }

    if (currentStep === 3 && selectedKit) {
      fetchWarranties(selectedKit._id);
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit and Generate Quote
  const handleGenerateQuote = async (isDraft = false) => {
    setError("");
    setGenerating(true);
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
        warranty_id: selectedWarranty?._id || undefined,
        price_per_kit_paise: pricing.price_per_kit_paise,
        warranty_charges_paise: pricing.warranty_charges_paise,
        delivery_charges_paise: pricing.delivery_charges_paise,
        taxable_amount_paise: pricing.taxable_amount_paise,
        gst_rate: pricing.gst_rate,
        gst_amount_paise: pricing.gst_amount_paise,
        total_amount_paise: pricing.total_amount_paise,
      };

      // Create draft first
      const draftRes = await api.post("/india/v1/reseller/quotes", payload);
      if (draftRes.data?.status !== "success") {
        throw new Error(draftRes.data?.message || "Failed to create quote.");
      }

      const quoteId = draftRes.data.data._id;

      if (!isDraft) {
        // Officially generate quote
        const genRes = await api.post(`/india/v1/reseller/quotes/${quoteId}/generate`);
        if (genRes.data?.status === "success") {
          navigate(`/epc-quotes/${quoteId}`);
          return;
        }
      }

      navigate(`/epc-quotes/${quoteId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to generate quotation.");
    } finally {
      setGenerating(false);
    }
  };

  const safeEpcList = Array.isArray(epcList) ? epcList : [];
  const filteredEpcs = safeEpcList.filter((epc) => {
    if (!epc) return false;
    const q = (epcSearch || "").toLowerCase();
    const company = epc.company_name || epc.name || epc.gstin_legal_name || epc.gstin_trade_name || "";
    const contact = epc.contact_person || epc.name || "";
    const gstin = epc.gstin || "";
    const mobile = epc.mobile || epc.phone || epc.whatsapp || "";
    return (
      company.toLowerCase().includes(q) ||
      contact.toLowerCase().includes(q) ||
      gstin.toLowerCase().includes(q) ||
      mobile.includes(q)
    );
  });

  const safeKitList = Array.isArray(kitList) ? kitList : [];

  // Cascading Quick Filter Options derived from shopHierarchy & loaded kits
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return safeKitList.filter((k) => {
        const kName = (k.industry_type_name || "").toLowerCase();
        const kId = k.industry_type_id ? String(k.industry_type_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        const name = ind.name;
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          const count = getCount(name, ind.id || ind._id);
          list.push({ value: name, label: `${name} (${count})`, rawLabel: name, id: ind.id || ind._id, count });
        }
      });
    }

    safeKitList.forEach((kit) => {
      const name = kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const count = getCount(name, kit.industry_type_id);
        list.push({ value: name, label: `${name} (${count})`, rawLabel: name, id: kit.industry_type_id, count });
      }
    });

    return [{ value: "all", label: `All Industry Types (${safeKitList.length})`, count: safeKitList.length }, ...list];
  }, [shopHierarchy, safeKitList]);

  const categoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const kitsInCurrentIndustry = safeKitList.filter((k) => {
      if (quickFilters.industryType === "all") return true;
      const indVal = quickFilters.industryType.toLowerCase();
      const kInd = (k.industry_type_name || "").toLowerCase();
      const kIndId = String(k.industry_type_id || "");
      return kInd === indVal || kIndId === indVal || kInd.includes(indVal);
    });

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return kitsInCurrentIndustry.filter((k) => {
        const kName = (k.category_name || "").toLowerCase();
        const kId = k.category_id ? String(k.category_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !seen.has(cat.name.toLowerCase())) {
            seen.add(cat.name.toLowerCase());
            const count = getCount(cat.name, cat.id || cat._id);
            list.push({ value: cat.name, label: `${cat.name} (${count})`, rawLabel: cat.name, id: cat.id || cat._id, count });
          }
        });
      });
    }

    safeKitList.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
        String(kit.industry_type_id || "") === String(quickFilters.industryType);
      if (indOk && kit.category_name && !seen.has(kit.category_name.toLowerCase())) {
        seen.add(kit.category_name.toLowerCase());
        const count = getCount(kit.category_name, kit.category_id);
        list.push({ value: kit.category_name, label: `${kit.category_name} (${count})`, rawLabel: kit.category_name, id: kit.category_id, count });
      }
    });

    return [{ value: "all", label: `All Categories (${kitsInCurrentIndustry.length})`, count: kitsInCurrentIndustry.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const kitsInCurrentCat = safeKitList.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      return true;
    });

    const getCount = (name, id) => {
      const targetName = (name || "").toLowerCase();
      const targetId = id ? String(id) : null;
      return kitsInCurrentCat.filter((k) => {
        const kName = (k.subcategory_name || "").toLowerCase();
        const kId = k.subcategory_id ? String(k.subcategory_id) : null;
        return (kName && (kName === targetName || kName.includes(targetName))) || (targetId && kId && kId === targetId);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase() ||
            String(cat.id || cat._id) === String(quickFilters.category);
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !seen.has(sub.name.toLowerCase())) {
                seen.add(sub.name.toLowerCase());
                const count = getCount(sub.name, sub.id || sub._id);
                list.push({ value: sub.name, label: `${sub.name} (${count})`, rawLabel: sub.name, id: sub.id || sub._id, count });
              }
            });
          }
        });
      });
    }

    safeKitList.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
        String(kit.industry_type_id || "") === String(quickFilters.industryType);
      const catOk =
        quickFilters.category === "all" ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase() ||
        String(kit.category_id || "") === String(quickFilters.category);
      if (indOk && catOk && kit.subcategory_name && !seen.has(kit.subcategory_name.toLowerCase())) {
        seen.add(kit.subcategory_name.toLowerCase());
        const count = getCount(kit.subcategory_name, kit.subcategory_id);
        list.push({ value: kit.subcategory_name, label: `${kit.subcategory_name} (${count})`, rawLabel: kit.subcategory_name, id: kit.subcategory_id, count });
      }
    });

    return [{ value: "all", label: `All Sub-Categories (${kitsInCurrentCat.length})`, count: kitsInCurrentCat.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category]);

  const systemTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const kitsInCurrentSub = safeKitList.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      if (quickFilters.subCategory !== "all") {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || "").toLowerCase();
        const kSubId = String(k.subcategory_id || "");
        if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) return false;
      }
      return true;
    });

    const getCount = (sysName) => {
      const targetSys = (sysName || "").toLowerCase();
      return kitsInCurrentSub.filter((k) => {
        const kSys = (k.system_type || "").toLowerCase();
        const kProjType = (k.project_type_name || "").toLowerCase();
        return kSys === targetSys || kSys.includes(targetSys) || kProjType.includes(targetSys);
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !seen.has(mt.name.toLowerCase())) {
                    seen.add(mt.name.toLowerCase());
                    const count = getCount(mt.name);
                    list.push({ value: mt.name, label: `${mt.name} (${count})`, rawLabel: mt.name, id: mt.id || mt.type_id, count });
                  }
                });
              }
            });
          }
        });
      });
    }

    safeKitList.forEach((kit) => {
      const indOk =
        quickFilters.industryType === "all" ||
        kit.industry_type_name?.toLowerCase() === quickFilters.industryType.toLowerCase();
      const catOk =
        quickFilters.category === "all" ||
        kit.category_name?.toLowerCase() === quickFilters.category.toLowerCase();
      const subOk =
        quickFilters.subCategory === "all" ||
        kit.subcategory_name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
      if (indOk && catOk && subOk && kit.project_type_name) {
        const cleanType = kit.project_type_name.includes("-")
          ? kit.project_type_name.split("-").pop().trim()
          : kit.project_type_name.trim();
        if (cleanType && !seen.has(cleanType.toLowerCase())) {
          seen.add(cleanType.toLowerCase());
          const count = getCount(cleanType);
          list.push({ value: cleanType, label: `${cleanType} (${count})`, rawLabel: cleanType, id: kit.project_type_id, count });
        }
      }
    });

    return [{ value: "all", label: `All System Types (${kitsInCurrentSub.length})`, count: kitsInCurrentSub.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category, quickFilters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const kitsInCurrentSys = safeKitList.filter((k) => {
      if (quickFilters.industryType !== "all") {
        const indVal = quickFilters.industryType.toLowerCase();
        const kInd = (k.industry_type_name || "").toLowerCase();
        const kIndId = String(k.industry_type_id || "");
        if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) return false;
      }
      if (quickFilters.category !== "all") {
        const catVal = quickFilters.category.toLowerCase();
        const kCat = (k.category_name || "").toLowerCase();
        const kCatId = String(k.category_id || "");
        if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) return false;
      }
      if (quickFilters.subCategory !== "all") {
        const subVal = quickFilters.subCategory.toLowerCase();
        const kSub = (k.subcategory_name || "").toLowerCase();
        const kSubId = String(k.subcategory_id || "");
        if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) return false;
      }
      if (quickFilters.systemType !== "all") {
        const sysVal = quickFilters.systemType.toLowerCase();
        const kSys = (k.system_type || "").toLowerCase();
        const kProjType = (k.project_type_name || "").toLowerCase();
        if (kSys !== sysVal && !kSys.includes(sysVal) && !kProjType.includes(sysVal)) return false;
      }
      return true;
    });

    const getCount = (label, min, max) => {
      const targetLabel = (label || "").toLowerCase();
      return kitsInCurrentSys.filter((k) => {
        const kRange = (k.project_range_label || "").toLowerCase();
        if (kRange === targetLabel || kRange.includes(targetLabel)) return true;
        if (min != null && max != null) {
          const cap = Number(k.capacity || k.capacity_kw || 0);
          return cap >= min && cap <= max;
        }
        return false;
      }).length;
    };

    if (Array.isArray(shopHierarchy) && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (quickFilters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(
          (ind) =>
            ind.name?.toLowerCase() === quickFilters.industryType.toLowerCase() ||
            String(ind.id || ind._id) === String(quickFilters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          const catOk =
            quickFilters.category === "all" ||
            cat.name?.toLowerCase() === quickFilters.category.toLowerCase();
          if (catOk) {
            (cat.subcategories || []).forEach((sub) => {
              const subOk =
                quickFilters.subCategory === "all" ||
                sub.name?.toLowerCase() === quickFilters.subCategory.toLowerCase();
              if (subOk) {
                (sub.mappedTypes || []).forEach((mt) => {
                  const typeOk =
                    quickFilters.systemType === "all" ||
                    mt.name?.toLowerCase() === quickFilters.systemType.toLowerCase() ||
                    quickFilters.systemType.toLowerCase().includes(mt.name?.toLowerCase());
                  if (typeOk) {
                    (mt.ranges || []).forEach((r) => {
                      const label = r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`;
                      if (label && !seen.has(label.toLowerCase())) {
                        seen.add(label.toLowerCase());
                        const count = getCount(label, r.min_value, r.max_value);
                        list.push({ value: label, label: `${label} (${count})`, rawLabel: label, id: r.id || r._id, min: r.min_value, max: r.max_value, count });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      });
    }

    safeKitList.forEach((kit) => {
      const label = kit.project_range_label || (kit.capacity ? `${kit.capacity} kW System` : null);
      if (label && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        const count = getCount(label, kit.min_kw, kit.max_kw);
        list.push({ value: label, label: `${label} (${count})`, rawLabel: label, id: kit.project_range_id, min: kit.min_kw, max: kit.max_kw, count });
      }
    });

    return [{ value: "all", label: `All Project Ranges (${kitsInCurrentSys.length})`, count: kitsInCurrentSys.length }, ...list];
  }, [shopHierarchy, safeKitList, quickFilters.industryType, quickFilters.category, quickFilters.subCategory, quickFilters.systemType]);

  const handleClearMainFilters = () => {
    setQuickFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    });
    setKitSearch("");
  };

  const filteredKits = safeKitList.filter((k) => {
    if (!k) return false;

    // 1. Industry filter
    if (quickFilters.industryType !== "all") {
      const indVal = quickFilters.industryType.toLowerCase();
      const kInd = (k.industry_type_name || "").toLowerCase();
      const kIndId = String(k.industry_type_id || "");
      if (kInd !== indVal && kIndId !== indVal && !kInd.includes(indVal)) {
        return false;
      }
    }

    // 2. Category filter
    if (quickFilters.category !== "all") {
      const catVal = quickFilters.category.toLowerCase();
      const kCat = (k.category_name || "").toLowerCase();
      const kCatId = String(k.category_id || "");
      if (kCat !== catVal && kCatId !== catVal && !kCat.includes(catVal)) {
        return false;
      }
    }

    // 3. Sub Category filter
    if (quickFilters.subCategory !== "all") {
      const subVal = quickFilters.subCategory.toLowerCase();
      const kSub = (k.subcategory_name || "").toLowerCase();
      const kSubId = String(k.subcategory_id || "");
      if (kSub !== subVal && kSubId !== subVal && !kSub.includes(subVal)) {
        return false;
      }
    }

    // 4. System Type filter
    if (quickFilters.systemType !== "all") {
      const sysVal = quickFilters.systemType.toLowerCase();
      const kSys = (k.project_type_name || "").toLowerCase();
      const kSysId = String(k.project_type_id || "");
      if (kSys !== sysVal && kSysId !== sysVal && !kSys.includes(sysVal)) {
        return false;
      }
    }

    // 5. Project Range filter
    if (quickFilters.projectRange !== "all") {
      const rangeVal = quickFilters.projectRange.toLowerCase();
      const kRange = (k.project_range_label || "").toLowerCase();
      const kRangeId = String(k.project_range_id || "");
      const rangeObj = projectRangeOptions.find((o) => o.value === quickFilters.projectRange);
      if (rangeObj && rangeObj.min != null && rangeObj.max != null) {
        const cap = Number(k.capacity || 0);
        if (cap < rangeObj.min || cap > rangeObj.max) {
          return false;
        }
      } else if (kRange !== rangeVal && kRangeId !== rangeVal && !kRange.includes(rangeVal)) {
        return false;
      }
    }

    // 6. Search query
    const q = (kitSearch || "").toLowerCase();
    if (!q) return true;
    const name = k.name || k.kit_name || "";
    const code = k.code || k.kit_code || "";
    const cap = (k.capacity ?? k.kit_capacity_kw ?? "").toString();
    const ind = (k.industry_type_name || "").toLowerCase();
    const proj = (k.project_type_name || "").toLowerCase();
    const brand = (k.brand_name || "").toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      cap.includes(q) ||
      ind.includes(q) ||
      proj.includes(q) ||
      brand.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Top Breadcrumb */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <Link
          to="/epc-quotes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
        >
          <FiArrowLeft size={16} />
          <span>Back to All Quotations</span>
        </Link>
        <span className="text-xs font-semibold text-slate-400">
          Step {currentStep} of {STEPS.length}
        </span>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Stepper Progress Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const isDone = s.num < currentStep;
              const isCurr = s.num === currentStep;

              return (
                <div
                  key={s.num}
                  className={`flex flex-col items-center text-center p-2 rounded-xl transition ${isCurr
                      ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                      : isDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400 opacity-60"
                    }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5 transition ${isCurr
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                        : isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                      }`}
                  >
                    {isDone ? <FiCheck size={16} /> : <Icon size={16} />}
                  </div>
                  <span className="text-[11px] font-bold truncate max-w-full">{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Step Body */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* STEP 1: SELECT EPC */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select EPC Buyer Client</h2>
                  <p className="text-xs text-slate-500">Choose the approved EPC buyer for whom this quote is generated</p>
                </div>

                <div className="relative w-full sm:w-72">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={epcSearch}
                    onChange={(e) => setEpcSearch(e.target.value)}
                    placeholder="Search EPC name or GSTIN..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              {filteredEpcs.length === 0 ? (
                <div className="py-12 text-center">
                  <FiUsers size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Eligible EPC Buyers Found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Only verified EPCs assigned to your franchise or onboarded under your territory can receive quotations.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredEpcs.map((epc) => {
                    const isSel = selectedEpc?._id === epc._id;
                    return (
                      <div
                        key={epc._id}
                        onClick={() => handleSelectEpc(epc)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition text-left relative flex flex-col justify-between ${isSel
                            ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/50 dark:bg-slate-900/30"
                          }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                              {epc.company_name || epc.name}
                            </h4>
                            {isSel && (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                                <FiCheck size={12} />
                              </div>
                            )}
                          </div>

                          <div className="text-[11px] font-mono text-slate-500 mt-1">
                            GSTIN: {epc.gstin || "—"}
                          </div>

                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                            <div>Contact: {epc.contact_person || epc.name || "—"}</div>
                            <div>Phone: {epc.mobile || epc.phone || "—"}</div>
                            <div className="text-slate-400 text-[11px]">
                              {epc.district_name || epc.address?.district || "District"}, {epc.state_name || epc.address?.state || "State"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            Active Buyer
                          </span>
                          <span>Pincode: {epc.pincode || epc.address?.pincode || "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DELIVERY SITE */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delivery Mode & Destination</h2>
                <p className="text-xs text-slate-500">Configure logistics destination and delivery contact person</p>
              </div>

              {/* 2 Delivery Mode Tiles: EPC Registered Address & Franchisee Store Pickup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    id: "epc_location",
                    title: "EPC Registered Address",
                    desc: "Dispatch directly to EPC registered office / godown",
                  },
                  {
                    id: "franchisee_warehouse",
                    title: "Franchisee Store Pickup",
                    desc: "Self-fulfillment via your local franchisee warehouse",
                  },
                ].map((mode) => {
                  const isSel = deliveryType === mode.id;
                  return (
                    <div
                      key={mode.id}
                      onClick={() => handleDeliveryModeSelect(mode.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSel
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{mode.title}</span>
                        {isSel && <FiCheckCircle className="text-amber-500" size={16} />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{mode.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Informative Destination Banner */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <FiTruck size={16} className="shrink-0" />
                <span>
                  {deliveryType === "franchisee_warehouse"
                    ? "Franchisee Store Pickup: Order will be prepared for collection at your local franchisee depot (Free logistics / ₹0 freight)."
                    : "EPC Registered Address: Auto-fetched from verified EPC registration & GST records. You can update the delivery site address below if required."}
                </span>
              </div>

              {/* Delivery Address Form */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Site Delivery Details
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Site Contact Person *
                    </label>
                    <input
                      type="text"
                      value={deliveryDetails.contact_person}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contact_person: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      placeholder="Name of site engineer or receiver"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Contact Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={deliveryDetails.mobile}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, mobile: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Street Address / Site Location *
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.shipping_address_line1}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, shipping_address_line1: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    placeholder="Plot / Survey No., Landmark, Industrial Area"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">State</label>
                    <input
                      type="text"
                      value={deliveryDetails.state_name}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, state_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">District</label>
                    <input
                      type="text"
                      value={deliveryDetails.district_name}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, district_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={deliveryDetails.pincode}
                      onChange={(e) => setDeliveryDetails({ ...deliveryDetails, pincode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                      placeholder="6 digits"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COMBOKIT (DIRECT DISPLAY WITH INDUSTRY & PROJECT TYPE) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Choose Authorized ComboKit</h2>
                  <p className="text-xs text-slate-500">
                    Products assigned to your franchisee plan displayed with Industry Type and Project Type
                  </p>
                </div>

                <div className="relative w-full sm:w-80">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    value={kitSearch}
                    onChange={(e) => setKitSearch(e.target.value)}
                    placeholder="Search by kit, brand, kW, industry, project..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              {/* Quick Filters Component (matching Screenshot 2) */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiPackage className="text-blue-600 dark:text-blue-400" size={18} />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Quick Filters</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearMainFilters}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition cursor-pointer"
                  >
                    Clear Main
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Industry Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Industry Type
                    </label>
                    <div className="relative">
                      <select
                        value={quickFilters.industryType}
                        onChange={(e) =>
                          setQuickFilters((prev) => ({
                            ...prev,
                            industryType: e.target.value,
                            category: "all",
                            subCategory: "all",
                            systemType: "all",
                            projectRange: "all",
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-8 cursor-pointer"
                      >
                        {industryTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* 2. Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={quickFilters.category}
                        onChange={(e) =>
                          setQuickFilters((prev) => ({
                            ...prev,
                            category: e.target.value,
                            subCategory: "all",
                            systemType: "all",
                            projectRange: "all",
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-8 cursor-pointer"
                      >
                        {categoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* 3. Sub Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Sub Category
                    </label>
                    <div className="relative">
                      <select
                        value={quickFilters.subCategory}
                        onChange={(e) =>
                          setQuickFilters((prev) => ({
                            ...prev,
                            subCategory: e.target.value,
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-8 cursor-pointer"
                      >
                        {subCategoryOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* 4. System Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      System Type
                    </label>
                    <div className="relative">
                      <select
                        value={quickFilters.systemType}
                        onChange={(e) =>
                          setQuickFilters((prev) => ({
                            ...prev,
                            systemType: e.target.value,
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-8 cursor-pointer"
                      >
                        {systemTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  {/* 5. Project Range */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Project Range
                    </label>
                    <div className="relative">
                      <select
                        value={quickFilters.projectRange}
                        onChange={(e) =>
                          setQuickFilters((prev) => ({
                            ...prev,
                            projectRange: e.target.value,
                          }))
                        }
                        className="w-full appearance-none px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 pr-8 cursor-pointer"
                      >
                        {projectRangeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>
                </div>
              </div>

              {loadingKits ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span>Loading authorized ComboKits...</span>
                </div>
              ) : filteredKits.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <FiBox size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">No authorized ComboKits found</p>
                  <p className="mt-1">Check your franchisee plan subscriptions or contact admin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKits.map((kit) => {
                    const isSel = selectedKit?._id === kit._id;
                    const pricePaise = kit.price_paise || kit.mrp_paise || (kit.selling_price_cached ? kit.selling_price_cached * 100 : 0);

                    return (
                      <div
                        key={kit._id}
                        onClick={() => setSelectedKit(kit)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between hover:shadow-md ${isSel
                            ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md ring-2 ring-amber-500/20"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
                          }`}
                      >
                        <div>
                          {/* Tags: Industry Type & Project Type badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {kit.industry_type_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                <FiLayers size={11} /> {kit.industry_type_name}
                              </span>
                            )}
                            {kit.project_type_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                <FiFileText size={11} /> {kit.project_type_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                              {kit.capacity || kit.kit_capacity_kw || 3} kW System
                            </span>
                            {isSel ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                                <FiCheck size={12} />
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                <FiCheckCircle size={10} /> Authorized
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                            {kit.name}
                          </h4>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {kit.brand_name || (kit.name?.includes('Tata') ? 'Tata Power' : (kit.name?.includes('Waaree') ? 'Waaree' : 'SolarKits'))}
                            </span>
                            <span>•</span>
                            <span className="font-mono">{kit.code || kit.kit_code || "SK-KIT"}</span>
                          </div>

                          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Panels: {kit.panel_brand || "Tier-1 High-Efficiency PV Modules"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span>Inverter: {kit.inverter_brand || "Grid-Tied String Inverter"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>BOS: {kit.bos_details || "Complete AC/DC DB, Structure & Cabling"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Franchise Price (excl. GST)</span>
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-base font-black text-slate-900 dark:text-white">
                                {formatINR(pricePaise)}
                              </span>
                              {isSel && quantity > 1 && (
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                  ({quantity} × {formatINR(pricePaise)} = {formatINR(pricePaise * quantity)})
                                </span>
                              )}
                            </div>
                          </div>

                          {isSel ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center bg-amber-500 text-white rounded-xl shadow-sm p-0.5 border border-amber-600/20"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuantity((prev) => Math.max(1, Number(prev) - 1));
                                }}
                                disabled={quantity <= 1}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${quantity <= 1
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-amber-600 active:scale-90 cursor-pointer"
                                  }`}
                                title="Decrease quantity"
                              >
                                <FiMinus size={13} />
                              </button>

                              <div className="flex flex-col items-center justify-center px-2 min-w-[36px]">
                                <span className="text-xs font-black leading-none text-center">
                                  {quantity}
                                </span>
                                <span className="text-[9px] font-bold opacity-90 leading-none mt-0.5">
                                  {quantity === 1 ? "Kit" : "Kits"}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuantity((prev) => Number(prev) + 1);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-600 active:scale-90 transition cursor-pointer"
                                title="Increase quantity"
                              >
                                <FiPlus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedKit(kit);
                                if (quantity < 1) setQuantity(1);
                              }}
                              className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                              <FiPlus size={13} />
                              <span>Select Kit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: WARRANTY OPTION */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Warranty & Protection Option</h2>
                <p className="text-xs text-slate-500">Choose extended warranty protection package for the quotation</p>
              </div>

              {/* Selected Kit Summary Banner */}
              {selectedKit && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <FiPackage size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {selectedKit.name || selectedKit.kit_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {selectedKit.brand_name || "SolarKits Direct"} • {selectedKit.category_name || "Rooftop"} • Capacity: {((selectedKit.capacity || selectedKit.kit_capacity_kw || 3) * quantity).toFixed(1)} kW
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      Selected Quantity: {quantity} {quantity > 1 ? "kits" : "kit"}
                    </span>
                  </div>
                </div>
              )}

              {/* Warranty Options */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Select Warranty & Protection Option
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Default Standard Warranty */}
                  <div
                    onClick={() => setSelectedWarranty(null)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${selectedWarranty === null
                        ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-700"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        Standard OEM Warranty
                      </span>
                      {selectedWarranty === null && <FiCheckCircle className="text-amber-500" size={16} />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Standard manufacturer warranty (25 yrs panels, 5 yrs inverter). No extra charge.
                    </p>
                    <div className="mt-3 text-xs font-black text-emerald-600">Free / Included</div>
                  </div>

                  {(Array.isArray(warrantyList) ? warrantyList : []).map((war) => {
                    const isSel = selectedWarranty?._id === war._id;
                    const priceLabel =
                      war.pricing_mode === "percentage"
                        ? `+${war.price_pct}% of Kit Price`
                        : `+${formatINR(war.price_per_kit_paise || 0)} / Kit`;

                    return (
                      <div
                        key={war._id}
                        onClick={() => setSelectedWarranty(war)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition ${isSel
                            ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                            : "border-slate-200 dark:border-slate-700"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{war.name}</span>
                          {isSel && <FiCheckCircle className="text-amber-500" size={16} />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{war.terms || war.covered_products}</p>
                        <div className="mt-3 text-xs font-black text-amber-600">{priceLabel}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & GENERATE */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review Quotation Summary</h2>
                <p className="text-xs text-slate-500">
                  Verify commercial numbers and client details before issuing formal quotation
                </p>
              </div>

              {/* 3 Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* EPC Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EPC Buyer</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                    {selectedEpc?.company_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div>GST: {selectedEpc?.gstin || "—"}</div>
                    <div>Contact: {selectedEpc?.contact_person}</div>
                    <div>Phone: {selectedEpc?.mobile}</div>
                  </div>
                </div>

                {/* Delivery Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Site</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                    {deliveryType === "franchisee_warehouse" ? "Franchisee Store Pickup" : "EPC Registered Address"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div>Address: {deliveryDetails.shipping_address_line1 || "—"}</div>
                    <div>Pincode: {deliveryDetails.pincode || "—"}</div>
                    <div>Receiver: {deliveryDetails.contact_person}</div>
                  </div>
                </div>

                {/* ComboKit Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ComboKit</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-1 line-clamp-2">
                    {selectedKit?.name}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5 mb-1.5">
                    {selectedKit?.industry_type_name && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100/70 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {selectedKit.industry_type_name}
                      </span>
                    )}
                    {selectedKit?.project_type_name && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {selectedKit.project_type_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <div>Quantity: {quantity} Kits ({((selectedKit?.capacity || 3) * quantity).toFixed(1)} kW)</div>
                    <div>Warranty: {selectedWarranty?.name || "Standard OEM"}</div>
                  </div>
                </div>
              </div>

              {/* Price Calculation Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-700">
                  Commercial Pricing Breakdown
                </h4>

                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Unit Price per Kit:</span>
                  <span className="font-mono font-bold">{formatINR(pricing.price_per_kit_paise)}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Product Subtotal ({quantity} Kits):</span>
                  <span className="font-mono font-bold">{formatINR(pricing.product_subtotal_paise)}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Warranty Charges:</span>
                  <span className="font-mono font-bold">{formatINR(pricing.warranty_charges_paise)}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Logistics & Freight:</span>
                  <span className="font-mono font-bold">{formatINR(pricing.delivery_charges_paise)}</span>
                </div>

                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span>Taxable Value:</span>
                  <span className="font-mono font-black">{formatINR(pricing.taxable_amount_paise)}</span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>GST ({pricing.gst_rate}%):</span>
                  <span className="font-mono font-bold">{formatINR(pricing.gst_amount_paise)}</span>
                </div>

                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                  <span>Total Payable Quotation Amount:</span>
                  <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400">
                    {formatINR(pricing.total_amount_paise)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <FiArrowLeft size={15} />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              {currentStep === 5 ? (
                <>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => handleGenerateQuote(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => handleGenerateQuote(false)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-md transition"
                  >
                    {generating ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FiCheck size={16} />
                    )}
                    <span>Generate Official Quote</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow transition"
                >
                  <span>Continue</span>
                  <FiArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
