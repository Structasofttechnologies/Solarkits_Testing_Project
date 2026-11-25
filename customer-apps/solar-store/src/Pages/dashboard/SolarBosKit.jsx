import { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { setAlert } from "../../features/alert.slice";
import { addToCart, syncCartWithBackend, getAvailableKitData, fetchShopHierarchy } from "../../features/slice";
import { hasPermission } from "@/utils/permissions";
import Dropdown from "@/Components/Dropdown";
import Button from "@/Components/Button";
import {
  FiPackage,
  FiShield,
  FiZap,
  FiCheckCircle,
  FiShoppingCart,
  FiSearch,
  FiSliders,
  FiCpu,
  FiTruck,
  FiAward,
  FiInfo,
  FiArrowRight,
  FiCheck,
  FiGrid,
  FiList,
  FiCheckSquare,
  FiSquare,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiSettings,
  FiTool,
} from "react-icons/fi";
import { FaSolarPanel, FaBolt, FaTools, FaPlug } from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────
// HELPER COMPONENT FOR PRODUCT IMAGE WITH FALLBACK
// ─────────────────────────────────────────────────────────────────
const BosImage = ({ src, alt, icon, className = "", imageClassName = "" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-surface-hover to-slate-200 dark:to-slate-800 text-text-primary ${className}`}>
        <span className="text-4xl mb-1 shrink-0">{icon || "⚡"}</span>
        <span className="text-[10px] font-bold text-text-secondary px-2 text-center truncate max-w-full">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden w-full h-full bg-surface-hover ${className}`}>
      <img
        src={src}
        alt={alt || "Solar BOS Kit"}
        className={`w-full h-full object-cover transition-transform duration-500 ease-out ${imageClassName}`}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PRICE RANGE OPTIONS
// ─────────────────────────────────────────────────────────────────
const PRICE_RANGE_OPTIONS = [
  { value: "all", text: "All Price/kW" },
  { value: "under-5000", text: "Under ₹5,000" },
  { value: "5000-15000", text: "₹5,000 – ₹15,000" },
  { value: "15000-30000", text: "₹15,000 – ₹30,000" },
  { value: "30000+", text: "Above ₹30,000" },
];

export default function SolarBosKit() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth_slice?.user);
  const selectedDistrict = useSelector((state) => state.slice?.selectedDistrict);
  const rawKits = useSelector((state) => state.slice?.availableKits);
  const shopHierarchy = useSelector((state) => state.slice?.shopHierarchy || []);

  // Tab mode: 'preconfigured' | 'customize'
  const [activeTab, setActiveTab] = useState("preconfigured");

  // Top Bar Search & View Mode State
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [showInStockOnly, setShowInStockOnly] = useState(false);

  // Filter Bar Dropdowns State
  const [filters, setFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    projectRange: "all",
    comboKitType: "all",
    pricePerKw: "all",
  });

  useEffect(() => {
    if (!shopHierarchy || shopHierarchy.length === 0) {
      dispatch(fetchShopHierarchy());
    }
  }, [dispatch, shopHierarchy]);

  // Live admin-managed BOS Kits & Custom Catalog Store from Database API
  const [adminBosKits, setAdminBosKits] = useState(() => {
    try {
      const saved = localStorage.getItem("solar_bos_kits_admin_store");
      return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [adminCustomCatalog, setAdminCustomCatalog] = useState(() => {
    try {
      const saved = localStorage.getItem("solar_custom_bos_catalog_admin_store");
      return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Customizer System Capacity State (Default: 5 kW)
  const [customSystemKw, setCustomSystemKw] = useState(5);

  // Fetch live custom catalog from MongoDB Database API
  const fetchCatalogFromApi = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/india/v1/shop/bos-custom-catalog");
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setAdminCustomCatalog(res.data.data);
        localStorage.setItem("solar_custom_bos_catalog_admin_store", JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error("Failed to fetch live custom catalog from DB API:", err);
    }
  };

  useEffect(() => {
    fetchCatalogFromApi();
    const interval = setInterval(fetchCatalogFromApi, 3000);
    window.addEventListener("focus", fetchCatalogFromApi);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchCatalogFromApi);
    };
  }, []);

  // Listen for admin changes from localStorage / Admin portal
  useEffect(() => {
    const syncAdminData = () => {
      try {
        const savedKits = localStorage.getItem("solar_bos_kits_admin_store");
        if (savedKits) setAdminBosKits(JSON.parse(savedKits));
        fetchCatalogFromApi();
      } catch (err) {
        console.error("Error syncing BOS admin data:", err);
      }
    };

    window.addEventListener("solar_bos_data_updated", syncAdminData);
    window.addEventListener("storage", syncAdminData);
    return () => {
      window.removeEventListener("solar_bos_data_updated", syncAdminData);
      window.removeEventListener("storage", syncAdminData);
    };
  }, []);

  // Fetch API kits when district changes or component mounts
  useEffect(() => {
    const districtId = selectedDistrict?.id || selectedDistrict?._id;
    if (districtId) {
      dispatch(getAvailableKitData({ districtId }));
    } else {
      dispatch(getAvailableKitData());
    }
  }, [selectedDistrict, dispatch]);

  // Combine Admin Managed BOS Kits with API BOS-specific kits
  const availableKits = useMemo(() => {
    const apiKits = Array.isArray(rawKits) ? rawKits : [];
    
    // Filter rawKits from API to ONLY include items explicitly categorized as BOS Kits
    const apiBosKits = apiKits
      .map((apiKit) => ({
        ...apiKit,
        id: apiKit.id || apiKit._id,
        name: apiKit.name || apiKit.kitName || "Solar BOS Protection Kit",
        category: apiKit.category || "Complete BOS Combos",
        subCategory: apiKit.subCategory || apiKit.usageType || "Single Phase",
        systemType: apiKit.systemType || apiKit.projectType || apiKit.inverter?.type || "On-Grid & Hybrid",
        comboKitType: apiKit.comboKitType || apiKit.variants?.[0]?.productTier || "Standard Residential",
        ourPrice: apiKit.ourPrice || apiKit.price || 5000,
        marketPrice: apiKit.marketPrice || Math.round((apiKit.ourPrice || apiKit.price || 5000) * 1.25),
        inStock: apiKit.inStock ?? true,
        availableStock: apiKit.availableStock ?? 10,
        rating: apiKit.rating || 4.8,
        reviewsCount: apiKit.reviewsCount || 42,
        warranty: apiKit.warranty || "5 Years Replacement",
        badge: apiKit.badge || apiKit.variants?.[0]?.productTier || "Verified Solution",
        components: Array.isArray(apiKit.components) && apiKit.components.length > 0
          ? apiKit.components
          : ["DCDB Protection Box", "ACDB Enclosure", "30m Solar Cable"],
        specifications: apiKit.specifications || {
          "Enclosure Rating": "IP65 Weatherproof",
          "Certification": "BIS & MNRE Approved"
        },
      }));

    // Merge admin-configured kits with API BOS kits
    const combined = [...adminBosKits];
    apiBosKits.forEach((apiKit) => {
      if (!combined.some((k) => String(k.id) === String(apiKit.id))) {
        combined.push(apiKit);
      }
    });
    return combined;
  }, [rawKits, adminBosKits]);

  // Dynamic Quick Filter Options derived from shopHierarchy and kit data
  const industryTypeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    if (shopHierarchy && shopHierarchy.length > 0) {
      shopHierarchy.forEach((ind) => {
        if (ind.name && !seen.has(ind.name.toLowerCase())) {
          seen.add(ind.name.toLowerCase());
          list.push({ value: ind.name, text: ind.name, id: ind.id });
        }
      });
    }
    availableKits.forEach((kit) => {
      const name = kit.industryType || kit.industry_type_name;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ value: name, text: name });
      }
    });

    return [
      { value: "all", text: "All Industry Types" },
      ...list,
    ];
  }, [shopHierarchy, availableKits]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter((ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType) ||
          ind.slug?.toLowerCase() === filters.industryType.toLowerCase()
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name, id: cat.id });
          }
        });
      });
    }

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter((kit) => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    filteredKits.forEach((kit) => {
      if (kit.category && !catMap.has(kit.category.toLowerCase())) {
        catMap.set(kit.category.toLowerCase(), { value: kit.category, text: kit.category });
      }
    });

    return [
      { value: "all", text: "All Categories" },
      ...Array.from(catMap.values()),
    ];
  }, [shopHierarchy, availableKits, filters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter((ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase() || String(cat.id) === String(filters.category)) {
            (cat.subcategories || []).forEach((sub) => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), {
                  value: sub.name,
                  text: sub.name,
                  id: sub.id,
                  image: sub.image || null,
                });
              }
            });
          }
        });
      });
    }

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter((kit) => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter((kit) => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    filteredKits.forEach((kit) => {
      const subName = kit.subCategory || kit.usageType;
      if (subName && !subsMap.has(subName.toLowerCase())) {
        subsMap.set(subName.toLowerCase(), {
          value: subName,
          text: subName,
        });
      }
    });

    return [
      { value: "all", text: "All Sub-Categories" },
      ...Array.from(subsMap.values()),
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category]);

  const systemTypeOptions = useMemo(() => {
    const typesMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter((ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase()) {
            (cat.subcategories || []).forEach((sub) => {
              if (filters.subCategory === "all" || sub.name?.toLowerCase() === filters.subCategory?.toLowerCase()) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), {
                      value: mt.name,
                      text: mt.name,
                      id: mt.id || mt.type_id,
                    });
                  }
                });
              }
            });
          }
        });
      });
    }

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter((kit) => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter((kit) => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(
        (kit) =>
          kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() ||
          kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase()
      );
    }
    filteredKits.forEach((kit) => {
      const typeName = kit.systemType || kit.projectType || kit.inverter?.type;
      if (typeName && !typesMap.has(typeName.toLowerCase())) {
        typesMap.set(typeName.toLowerCase(), { value: typeName, text: typeName });
      }
    });

    return [
      { value: "all", text: "All System Types" },
      ...Array.from(typesMap.values()),
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category, filters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const rangesMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter((ind) =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach((ind) => {
        (ind.categories || []).forEach((cat) => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase()) {
            (cat.subcategories || []).forEach((sub) => {
              if (filters.subCategory === "all" || sub.name?.toLowerCase() === filters.subCategory?.toLowerCase()) {
                (sub.mappedTypes || []).forEach((mt) => {
                  if (filters.systemType === "all" || mt.name?.toLowerCase() === filters.systemType?.toLowerCase()) {
                    (mt.ranges || []).forEach((r) => {
                      const idVal = String(r.id || r.range_label);
                      if (idVal && !rangesMap.has(idVal)) {
                        rangesMap.set(idVal, {
                          value: idVal,
                          text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`,
                          min: r.min_value || 0,
                        });
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

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter((kit) => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter((kit) => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(
        (kit) =>
          kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() ||
          kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase()
      );
    }
    if (filters.systemType && filters.systemType !== "all") {
      filteredKits = filteredKits.filter(
        (kit) =>
          kit.systemType?.toLowerCase() === filters.systemType.toLowerCase() ||
          kit.projectType?.toLowerCase() === filters.systemType.toLowerCase() ||
          kit.inverter?.type?.toLowerCase() === filters.systemType.toLowerCase()
      );
    }

    filteredKits.forEach((kit) => {
      if (typeof kit.projectRange === "object" && kit.projectRange !== null) {
        const idVal = String(kit.projectRange.id || kit.projectRange.text);
        if (idVal && !rangesMap.has(idVal)) {
          rangesMap.set(idVal, {
            value: idVal,
            text: kit.projectRange.text || idVal,
            min: kit.projectRange.min || 0,
          });
        }
      } else if (typeof kit.projectRange === "string" && kit.projectRange) {
        if (!rangesMap.has(kit.projectRange)) {
          rangesMap.set(kit.projectRange, {
            value: kit.projectRange,
            text: kit.projectRange,
            min: 0,
          });
        }
      }
    });

    const uniqueRanges = Array.from(rangesMap.values()).sort((a, b) => (a.min || 0) - (b.min || 0));

    return [
      { value: "all", text: "All Project Ranges" },
      ...uniqueRanges.map((r) => ({ value: r.value, text: r.text })),
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category, filters.subCategory, filters.systemType]);

  const comboKitTypeOptions = useMemo(() => {
    let filteredKits = availableKits;

    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter((kit) => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(
        (kit) =>
          kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() ||
          kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase()
      );
    }

    const typesSet = new Set();
    filteredKits.forEach((kit) => {
      if (kit.comboKitType) typesSet.add(kit.comboKitType);
      if (Array.isArray(kit.variants)) {
        kit.variants.forEach((v) => {
          if (v.productTier) typesSet.add(v.productTier);
        });
      }
    });

    return [
      { value: "all", text: "All Combo Kit Types" },
      ...Array.from(typesSet).map((t) => ({ value: t, text: t })),
    ];
  }, [availableKits, filters.category, filters.subCategory]);

  // Modal State
  const [selectedKitModal, setSelectedKitModal] = useState(null);
  const [orderQty, setOrderQty] = useState(1);

  // Customizer State: { [itemId]: quantity }
  const [customQuantities, setCustomQuantities] = useState({});

  // Filter Clear Handlers
  const clearMainFilters = () => {
    setFilters((prev) => ({
      ...prev,
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
    }));
  };

  const clearPerformanceFilters = () => {
    setFilters((prev) => ({
      ...prev,
      comboKitType: "all",
      pricePerKw: "all",
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      category: "all",
      subCategory: "all",
      systemType: "all",
      projectRange: "all",
      comboKitType: "all",
      pricePerKw: "all",
    });
    setSearchTerm("");
    setShowInStockOnly(false);
  };

  // Filter Pre-configured Kits
  const filteredKits = useMemo(() => {
    return availableKits.filter((kit) => {
      // Industry Type
      if (filters.industryType !== "all") {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        const matchInd = ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
        if (!matchInd) return false;
      }
      // Category
      if (filters.category !== "all") {
        const cat = (kit.category || "").toLowerCase();
        const sel = filters.category.toLowerCase();
        const matchCat = cat === sel || (kit.category_id && String(kit.category_id) === String(filters.category)) || cat.includes(sel) || sel.includes(cat);
        if (!matchCat) return false;
      }
      // Sub Category
      if (filters.subCategory !== "all") {
        const sub = (kit.subCategory || kit.usageType || "").toLowerCase();
        const sel = filters.subCategory.toLowerCase();
        const matchSub = sub === sel || (kit.subcategory_id && String(kit.subcategory_id) === String(filters.subCategory)) || sub.includes(sel) || sel.includes(sub);
        if (!matchSub) return false;
      }
      // System Type
      if (filters.systemType !== "all") {
        const sys = (kit.systemType || kit.projectType || kit.inverter?.type || "").toLowerCase();
        const sel = filters.systemType.toLowerCase();
        if (sys !== sel && !sys.includes(sel) && !sel.includes(sys)) return false;
      }
      // Project Range
      if (filters.projectRange !== "all") {
        const prId = typeof kit.projectRange === "object" ? String(kit.projectRange?.id || kit.projectRange?.text || "") : String(kit.projectRange || "");
        const sel = String(filters.projectRange);
        if (prId.toLowerCase() !== sel.toLowerCase() && prId !== sel && String(kit.project_range_id || '') !== sel) return false;
      }
      // Combo Kit Type
      if (filters.comboKitType !== "all") {
        const kitType = (kit.comboKitType || "").toLowerCase();
        const hasVariantTier = kit.variants?.some(v => v.productTier?.toLowerCase() === filters.comboKitType.toLowerCase());
        if (kitType !== filters.comboKitType.toLowerCase() && !hasVariantTier) return false;
      }
      // Price Range
      if (filters.pricePerKw !== "all") {
        const price = kit.ourPrice || kit.price || 0;
        if (filters.pricePerKw === "under-5000" && price >= 5000) return false;
        if (filters.pricePerKw === "5000-15000" && (price < 5000 || price > 15000)) return false;
        if (filters.pricePerKw === "15000-30000" && (price < 15000 || price > 30000)) return false;
        if (filters.pricePerKw === "30000+" && price <= 30000) return false;
      }
      // In stock
      if (showInStockOnly && !kit.inStock && !kit.variants?.some(v => v.inStock)) {
        return false;
      }
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = kit.name?.toLowerCase().includes(term);
        const matchCategory = kit.category?.toLowerCase().includes(term);
        const matchBadge = kit.badge?.toLowerCase().includes(term);
        if (!matchName && !matchCategory && !matchBadge) return false;
      }
      return true;
    });
  }, [availableKits, filters, showInStockOnly, searchTerm]);

  // Handle Add Pre-configured Kit to Cart
  const handleAddToCart = (kit, qty = 1) => {
    if (user && !hasPermission(user, 'can_add_to_cart')) {
      dispatch(setAlert({
        type: 'error',
        message: 'Your sub-user account is not authorized to add items to cart. Please contact your EPC Administrator.'
      }));
      return;
    }

    const districtId = selectedDistrict?.id || selectedDistrict?._id || "dist_default";
    const districtName = selectedDistrict?.name || "Pan India Supply";

    const cartPayload = {
      id: kit.id,
      name: kit.name,
      category: kit.category,
      ourPrice: kit.ourPrice,
      marketPrice: kit.marketPrice,
      productTier: "BOS Kit",
      inStock: kit.inStock,
      availableStock: kit.availableStock,
      districtId,
      districtName,
      qty,
      image: kit.image,
    };

    dispatch(addToCart(cartPayload));
    dispatch(syncCartWithBackend());

    dispatch(
      setAlert({
        type: "success",
        message: `Added ${qty}x ${kit.name} to Cart!`,
      })
    );

    if (selectedKitModal) {
      setSelectedKitModal(null);
    }
  };

  // Helper to calculate recommended quantity for an item based on system capacity
  const getItemRecommendedQty = (item, systemKw = customSystemKw) => {
    if (item.recommendedPerKw && Number(item.recommendedPerKw) > 0) {
      return Math.round(Number(item.recommendedPerKw) * systemKw);
    }
    if (item.defaultQty && Number(item.defaultQty) > 0) {
      // Scale proportionally relative to standard 5kW baseline
      const factor = systemKw / 5;
      return Math.max(1, Math.round(Number(item.defaultQty) * factor));
    }
    return 1;
  };

  // 1-Click Load Admin Recommended Package quantities for all catalog items
  const handleLoadAdminRecommendedPackage = (systemKw = customSystemKw) => {
    const recommendedMap = {};
    adminCustomCatalog.forEach((catGroup) => {
      catGroup.items.forEach((item) => {
        const rec = getItemRecommendedQty(item, systemKw);
        recommendedMap[item.id] = rec;
      });
    });
    setCustomQuantities(recommendedMap);
    dispatch(
      setAlert({
        type: "success",
        message: `Loaded Admin Recommended Package for ${systemKw} kW System!`,
      })
    );
  };

  // Customizer quantity helper
  const handleQtyChange = (itemId, delta) => {
    setCustomQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Compute Customizer Totals
  const selectedCustomItems = useMemo(() => {
    const list = [];
    adminCustomCatalog.forEach((cat) => {
      cat.items.forEach((item) => {
        const qty = customQuantities[item.id] || 0;
        if (qty > 0) {
          list.push({
            ...item,
            qty,
            itemTotal: item.unitPrice * qty,
          });
        }
      });
    });
    return list;
  }, [customQuantities, adminCustomCatalog]);

  const customizerSubtotal = useMemo(() => {
    return selectedCustomItems.reduce((acc, item) => acc + item.itemTotal, 0);
  }, [selectedCustomItems]);

  const customizerGst = useMemo(() => {
    return Math.round(customizerSubtotal * 0.18);
  }, [customizerSubtotal]);

  const customizerTotal = useMemo(() => {
    return customizerSubtotal + customizerGst;
  }, [customizerSubtotal, customizerGst]);

  // Add Custom Package to Cart
  const handleAddCustomPackageToCart = () => {
    if (user && !hasPermission(user, 'can_add_to_cart')) {
      dispatch(setAlert({
        type: 'error',
        message: 'Your sub-user account is not authorized to add items to cart. Please contact your EPC Administrator.'
      }));
      return;
    }

    if (selectedCustomItems.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please select at least 1 component to add to cart!" }));
      return;
    }

    const districtId = selectedDistrict?.id || selectedDistrict?._id || "dist_default";
    const districtName = selectedDistrict?.name || "Pan India Supply";

    const customPackageId = `custom_bos_${Date.now()}`;
    const componentSummaryStr = selectedCustomItems.map((i) => `${i.qty}x ${i.name}`).join(", ");

    const cartPayload = {
      id: customPackageId,
      name: `Customized BOS Package (${selectedCustomItems.reduce((a, b) => a + b.qty, 0)} Items)`,
      category: "Custom BOS Package",
      ourPrice: customizerSubtotal,
      marketPrice: Math.round(customizerSubtotal * 1.2),
      productTier: "Custom BOS",
      inStock: true,
      availableStock: 99,
      districtId,
      districtName,
      qty: 1,
      image: "🛠️",
      customComponentsSummary: componentSummaryStr,
    };

    dispatch(addToCart(cartPayload));
    dispatch(syncCartWithBackend());

    dispatch(
      setAlert({
        type: "success",
        message: `Customized BOS Package added to Cart! Total: ₹${customizerTotal.toLocaleString()}`,
      })
    );

    setCustomQuantities({});
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 text-text-primary">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white mb-6 bg-gradient-to-r from-primary via-primary-end to-blue-600 shadow-lg">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-amber-300 mb-3">
            <FiZap /> BALANCE OF SYSTEM (BOS) MARKETPLACE
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-2 font-outfit">
            Certified Solar BOS Kits & Components
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl leading-relaxed">
            Choose from Pre-configured BOS Combos created by experts or Build your own Customized BOS Package component-by-component with live pricing and local stock.
          </p>

          <div className="flex flex-wrap gap-4 mt-4 text-xs sm:text-sm text-slate-200">
            <div className="flex items-center gap-2"><FiCheckCircle className="text-green-400" /> BIS & MNRE Certified</div>
            <div className="flex items-center gap-2"><FiShield className="text-amber-300" /> Up to 15 Years Warranty</div>
            <div className="flex items-center gap-2"><FiTruck className="text-sky-300" /> District Level Dispatch</div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE SWITCHER BUTTONS (Pre-configured vs Customize BOS Kits)  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap bg-surface border border-border p-2 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("preconfigured")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === "preconfigured"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-surface-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <FiPackage className="text-base" />
            <span>Pre-configured BOS Kits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("customize")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
              activeTab === "customize"
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-surface-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <FiTool className="text-base text-amber-400" />
            <span>Customize BOS Kit</span>
          </button>
        </div>

        <div className="text-xs text-text-secondary font-medium px-2">
          {activeTab === "preconfigured" ? (
            <span className="text-primary font-semibold">Showing Pre-Packaged BOS Combos</span>
          ) : (
            <span className="text-amber-600 font-semibold">Custom Component Selector Active</span>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FILTER BAR HEADER (Exact matching UI as requested)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="relative z-30 bg-surface border border-border rounded-2xl p-4 sm:p-5 mb-6 shadow-sm space-y-4">
        {/* Top Controls: Search Bar + View Mode + In Stock Checkbox */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-sm" />
            <input
              type="text"
              placeholder="Search by kit name, brand, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface-hover border border-border rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                title="Grid View"
              >
                <FiGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
                title="List View"
              >
                <FiList size={16} />
              </button>
            </div>

            {/* In Stock Only Checkbox */}
            <button
              type="button"
              onClick={() => setShowInStockOnly(!showInStockOnly)}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl bg-surface hover:bg-surface-hover text-sm font-medium text-text-primary transition"
            >
              {showInStockOnly ? <FiCheckSquare className="text-primary" size={16} /> : <FiSquare className="text-text-secondary" size={16} />}
              <span>In Stock Only</span>
            </button>
          </div>
        </div>

        {/* Quick Filters Group */}
        <div className="border border-border/80 rounded-xl p-3.5 bg-surface-hover/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <FiPackage size={14} /> Quick Filters
            </div>
            <button
              type="button"
              onClick={clearMainFilters}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Clear Main
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <Dropdown
              label="Industry Type"
              value={filters.industryType}
              onChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  industryType: val,
                  category: "all",
                  subCategory: "all",
                  systemType: "all",
                  projectRange: "all",
                }))
              }
              options={industryTypeOptions}
              className="w-full"
            />
            <Dropdown
              label="Category"
              value={filters.category}
              onChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  category: val,
                  subCategory: "all",
                  systemType: "all",
                  projectRange: "all",
                }))
              }
              options={categoryOptions}
              className="w-full"
            />
            <Dropdown
              label="Sub Category"
              value={filters.subCategory}
              onChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  subCategory: val,
                }))
              }
              options={subCategoryOptions}
              className="w-full"
            />
            <Dropdown
              label="System Type"
              value={filters.systemType}
              onChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  systemType: val,
                  projectRange: "all",
                }))
              }
              options={systemTypeOptions}
              className="w-full"
            />
            <Dropdown
              label="Project Range"
              value={filters.projectRange}
              onChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  projectRange: val,
                }))
              }
              options={projectRangeOptions}
              className="w-full"
            />
          </div>
        </div>

        {/* Details Filters Group */}
        <div className="border border-border/80 rounded-xl p-3.5 bg-surface-hover/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <FiSliders size={14} /> Details Filters
            </div>
            <button
              type="button"
              onClick={clearPerformanceFilters}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Clear Details
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3">
            <Dropdown
              label="BOS Kit Type"
              value={filters.comboKitType}
              onChange={(val) => setFilters((prev) => ({ ...prev, comboKitType: val }))}
              options={comboKitTypeOptions}
              className="w-full"
            />
            <Dropdown
              label="Price Per Kw"
              value={filters.pricePerKw}
              onChange={(val) => setFilters((prev) => ({ ...prev, pricePerKw: val }))}
              options={PRICE_RANGE_OPTIONS}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 1: PRE-CONFIGURED BOS KITS GRID / LIST                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "preconfigured" && (
        <div>
          {filteredKits.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-border rounded-2xl p-8">
              <FiPackage className="mx-auto text-4xl text-text-secondary mb-3" />
              <h3 className="text-lg font-bold text-text-primary mb-1">No Pre-configured BOS Kits Found</h3>
              <p className="text-sm text-text-secondary mb-4">Try clearing filters or search term to see available kits.</p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "flex flex-col gap-4"
              }
            >
              {filteredKits.map((kit) => (
                <div
                  key={kit.id}
                  className={`bg-surface border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 ${
                    viewMode === "list" ? "sm:flex-row" : ""
                  }`}
                >
                  {/* Card Header & Product Image */}
                  <div
                    className={`relative overflow-hidden group border-b border-border bg-surface-hover ${
                      viewMode === "list" ? "sm:w-64 sm:h-auto sm:border-b-0 sm:border-r shrink-0" : "h-48 sm:h-52"
                    }`}
                  >
                    <BosImage
                      src={kit.imageUrl || (typeof kit.image === "string" && kit.image.startsWith("http") ? kit.image : null)}
                      alt={kit.name}
                      icon={kit.icon || kit.image}
                      imageClassName="group-hover:scale-105"
                    />

                    {/* Overlay Gradient for Badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none z-10" />

                    {/* Top Badges Overlay */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none z-20">
                      <span className="text-[10px] font-extrabold text-white bg-primary/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                        {kit.category}
                      </span>
                      <span className="text-[11px] font-bold text-amber-300 bg-slate-900/85 backdrop-blur-md px-2 py-0.5 rounded-lg shadow-md flex items-center gap-1 border border-amber-400/30">
                        ★ {kit.rating} <span className="text-slate-300 font-normal">({kit.reviewsCount})</span>
                      </span>
                    </div>

                    {/* Bottom Status Overlay */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-semibold pointer-events-none z-20">
                      <span className="bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] border border-white/10 text-emerald-400 flex items-center gap-1 font-bold">
                        <FiCheckCircle size={11} /> In Stock
                      </span>
                      <span className="bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] border border-white/10 text-amber-200">
                        {kit.warranty}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-text-primary text-base mb-2 leading-snug">
                      {kit.name}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                        {kit.badge}
                      </span>
                      <span className="text-[11px] bg-surface-hover text-text-secondary px-2 py-0.5 rounded">
                        {kit.subCategory}
                      </span>
                    </div>

                    {/* Component Preview */}
                    <div className="bg-surface-hover/50 rounded-xl p-3 text-xs text-text-secondary mb-4 space-y-1">
                      <div className="font-semibold text-text-primary mb-1">Key Included Items:</div>
                      {(kit.components || []).slice(0, 3).map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 truncate">
                          <FiCheck className="text-green-600 shrink-0" />
                          <span className="truncate">{comp}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Price & Buttons */}
                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-text-secondary line-through">
                          ₹{(kit.marketPrice || 0).toLocaleString()}
                        </div>
                        <div className="text-lg font-extrabold text-primary">
                          ₹{(kit.ourPrice || 0).toLocaleString()}
                          <span className="text-[10px] text-text-secondary font-normal"> +18% GST</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKitModal(kit);
                            setOrderQty(1);
                          }}
                          className="px-3 py-2 bg-surface-hover hover:bg-border text-text-primary rounded-xl text-xs font-semibold transition"
                        >
                          Specs
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(kit, 1)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition cursor-pointer"
                        >
                          <FiShoppingCart /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODE 2: CUSTOMIZE BOS KIT (COMPONENT CATALOG & SELECTOR)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "customize" && (
        <div className="space-y-6">
          {/* Admin System Capacity Selector & Recommended Package Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 border border-slate-700 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <FiCpu /> System Size & Admin Preset Wire/Item Metering
                </div>
                <h3 className="text-lg font-extrabold text-white font-outfit">
                  Select Solar Project Capacity ({customSystemKw} kW)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Admin preset wire meters & package items (J-bolts, clamps, connectors) dynamically adjust for your system size.
                </p>
              </div>

              {/* Quick kW Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-300">Quick kW:</span>
                {[3, 5, 8, 10, 15, 25].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      setCustomSystemKw(kw);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      customSystemKw === kw
                        ? "bg-primary text-white shadow-md shadow-primary/30 ring-2 ring-amber-400"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600"
                    }`}
                  >
                    {kw} kW {kw === 5 ? "(Default)" : ""}
                  </button>
                ))}
              </div>

              {/* 1-Click Load Admin Package Button */}
              <button
                type="button"
                onClick={() => handleLoadAdminRecommendedPackage(customSystemKw)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FiZap size={15} /> Load Admin Recommended {customSystemKw} kW Package
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Component Selection Catalog */}
            <div className="lg:col-span-2 space-y-6">
              {adminCustomCatalog.map((catGroup, idx) => (
                <div key={idx} className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{catGroup.icon}</span>
                      <h3 className="font-bold text-base text-text-primary">{catGroup.group}</h3>
                    </div>
                    <span className="text-xs text-text-secondary font-medium">
                      {catGroup.items.length} Options Available
                    </span>
                  </div>

                  <div className="space-y-3">
                    {catGroup.items.map((item) => {
                      const qty = customQuantities[item.id] || 0;
                      const recQty = getItemRecommendedQty(item, customSystemKw);
                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                            qty > 0 ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-surface hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-border shrink-0 bg-surface-hover shadow-xs">
                              <BosImage
                                src={item.imageUrl || (typeof item.image === "string" && item.image.startsWith("http") ? item.image : null)}
                                alt={item.name}
                                icon={item.icon || item.image}
                              />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <h4 className="font-bold text-sm text-text-primary leading-snug">{item.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                                <strong className="text-primary font-extrabold">₹{item.unitPrice.toLocaleString()}</strong> per {item.unit}
                                {item.specs && <span className="text-text-muted">• {item.specs}</span>}
                              </div>

                              {/* Admin Set Cable Meters / Item Quantity Recommendation Badge */}
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                                  ⚡ Admin Recommended for {customSystemKw} kW: <strong className="text-slate-900 dark:text-white font-extrabold">{recQty} {item.unit}s</strong>
                                </span>
                                {item.packInfo && (
                                  <span className="text-[10px] text-text-secondary italic">
                                    ({item.packInfo})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Counter & Recommended Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 shrink-0">
                            {/* Quick fill recommended button if not matching */}
                            {qty !== recQty && (
                              <button
                                type="button"
                                onClick={() => setCustomQuantities((prev) => ({ ...prev, [item.id]: recQty }))}
                                className="text-[10px] text-primary hover:underline font-bold px-2 py-1 bg-primary/10 rounded-md transition cursor-pointer"
                                title={`Set to Admin recommended ${recQty} ${item.unit}s`}
                              >
                                Set Rec ({recQty} {item.unit}s)
                              </button>
                            )}

                            <div className="flex items-center gap-2">
                              {qty > 0 && (
                                <div className="text-right mr-1">
                                  <div className="text-xs font-black text-primary">
                                    ₹{(item.unitPrice * qty).toLocaleString()}
                                  </div>
                                  <div className="text-[9px] text-text-secondary">
                                    ({qty} {item.unit}s x ₹{item.unitPrice})
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.id, -1)}
                                  className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                                  title="Decrease"
                                >
                                  <FiMinus size={14} />
                                </button>
                                <span className="px-3 py-1 text-xs font-black min-w-[32px] text-center bg-surface-hover/40">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.id, 1)}
                                  className="px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                                  title="Increase"
                                >
                                  <FiPlus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          {/* Right Column: Live Customized Package Summary Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-surface border border-border rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FiTool className="text-primary text-lg" />
                  <h3 className="font-bold text-base text-text-primary">Custom Package Summary</h3>
                </div>
                {selectedCustomItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomQuantities({})}
                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <FiTrash2 size={12} /> Clear All
                  </button>
                )}
              </div>

              {selectedCustomItems.length === 0 ? (
                <div className="text-center py-8 text-text-secondary space-y-2">
                  <FiPackage className="mx-auto text-3xl opacity-40" />
                  <p className="text-xs">No components selected yet.</p>
                  <p className="text-[11px] text-text-muted">Use the <strong>+</strong> buttons on the left to add items to your custom BOS package.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Item List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hover">
                    {selectedCustomItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-hover">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-text-primary block truncate">{item.name}</span>
                          <span className="text-text-secondary">{item.qty} {item.unit}s x ₹{item.unitPrice}</span>
                        </div>
                        <span className="font-bold text-text-primary shrink-0">₹{item.itemTotal.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price Calculations */}
                  <div className="pt-3 border-t border-border space-y-2 text-xs">
                    <div className="flex justify-between text-text-secondary">
                      <span>Total Selected Components:</span>
                      <span className="font-bold text-text-primary">{selectedCustomItems.reduce((a, b) => a + b.qty, 0)} Items</span>
                    </div>

                    <div className="flex justify-between text-text-secondary">
                      <span>Subtotal (Excl. Tax):</span>
                      <span className="font-semibold text-text-primary">₹{customizerSubtotal.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-text-secondary">
                      <span>Estimated GST (18%):</span>
                      <span className="font-semibold text-text-primary">₹{customizerGst.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-sm font-extrabold text-primary pt-2 border-t border-border">
                      <span>Total Estimated Cost:</span>
                      <span className="text-base">₹{customizerTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={handleAddCustomPackageToCart}
                    className="w-full py-3 bg-gradient-to-r from-primary to-primary-end hover:from-primary-hover hover:to-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/25 transition cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <FiShoppingCart /> Add Custom BOS Package to Cart
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SPECS MODAL FOR PRE-CONFIGURED KITS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedKitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl border border-border">
            <button
              type="button"
              onClick={() => setSelectedKitModal(null)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Product Hero Image */}
            <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden mb-5 border border-border">
              <BosImage
                src={selectedKitModal.imageUrl || (typeof selectedKitModal.image === "string" && selectedKitModal.image.startsWith("http") ? selectedKitModal.image : null)}
                alt={selectedKitModal.name}
                icon={selectedKitModal.icon || selectedKitModal.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none z-10" />
              <div className="absolute top-3 left-3 z-20">
                <span className="text-[10px] font-extrabold text-white bg-primary px-3 py-1 rounded-lg uppercase shadow-md tracking-wider">
                  {selectedKitModal.category}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 z-20">
                <h2 className="text-base sm:text-lg font-extrabold text-white drop-shadow-md">
                  {selectedKitModal.name}
                </h2>
              </div>
            </div>

            <div className="bg-surface-hover rounded-xl p-4 mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-text-secondary">Wholesale Direct Price</div>
                <div className="text-xl font-extrabold text-primary">
                  ₹{(selectedKitModal.ourPrice || 0).toLocaleString()}
                  <span className="text-xs text-text-secondary font-normal"> (+18% GST)</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                  In Stock ({selectedKitModal.availableStock || 10} Available)
                </span>
              </div>
            </div>

            <h4 className="font-bold text-sm text-text-primary mb-2">Included Components List:</h4>
            <div className="bg-surface border border-border rounded-xl p-3 mb-5 space-y-1.5">
              {(selectedKitModal.components || []).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                  <FiCheckCircle className="text-green-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h4 className="font-bold text-sm text-text-primary mb-2">Technical Specifications:</h4>
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
              {Object.entries(selectedKitModal.specifications || {}).map(([k, v]) => (
                <div key={k} className="bg-surface-hover p-2.5 rounded-lg">
                  <div className="text-text-secondary font-semibold">{k}</div>
                  <div className="font-bold text-text-primary">{v}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">Qty:</span>
                <div className="flex items-center border border-border rounded-lg overflow-hidden bg-surface">
                  <button
                    type="button"
                    onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                    className="px-3 py-1 bg-surface-hover font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 font-bold text-sm">{orderQty}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQty(orderQty + 1)}
                    className="px-3 py-1 bg-surface-hover font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddToCart(selectedKitModal, orderQty)}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <FiShoppingCart /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
