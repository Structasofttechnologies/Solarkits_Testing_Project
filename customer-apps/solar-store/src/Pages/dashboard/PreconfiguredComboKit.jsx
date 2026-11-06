import { useEffect, useState, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import KitCard from "./components/KitCard";
import SelectedKitCard from "./components/SelectedKitCard";
import KitFilters, { options } from "./components/KitFilters";
import Dialog from "@/Components/Dialog";
import Button from "@/Components/Button";
import IconButton from "@/Components/IconButton";
import {
  FiFilter,
  FiGrid,
  FiList,
  FiX,
  FiSearch,
  FiRefreshCw,
  FiCheckSquare,
  FiSquare,
  FiPackage,
  FiTrendingUp,
  FiSliders,
  FiLayers,
} from "react-icons/fi";
import Dropdown from "@/Components/Dropdown";
import KitComparisonDrawer from "@/Components/storefront/KitComparisonDrawer";
import OurBestSellerSection from "@/Components/storefront/OurBestSellerSection";
import PincodeLocationModal from "@/Components/PincodeLocationModal";
import { FiMapPin, FiNavigation } from "react-icons/fi";
import { fetchShopHierarchy } from "../../features/slice";

const SYSTEM_CAPACITIES = [
  { kw: 1, label: "1 kW", units: "~4-5 Units/Day", note: "Small Home / 1 BHK" },
  { kw: 2, label: "2 kW", units: "~8-10 Units/Day", note: "2 BHK / 1 AC" },
  { kw: 3, label: "3 kW", units: "~12-15 Units/Day", note: "3 BHK / Most Popular" },
  { kw: 5, label: "5 kW", units: "~20-25 Units/Day", note: "Large Home / 2-3 ACs" },
  { kw: 10, label: "10 kW", units: "~40-50 Units/Day", note: "Commercial / Large Villa" },
  { kw: 15, label: "15 kW+", units: "~60+ Units/Day", note: "Industrial / Enterprise" },
];

export default function PreconfiguredComboKit({ showBestSellers = true }) {
  const dispatch = useDispatch();
  const rawKits = useSelector((state) => state.slice?.availableKits);
  const availableKits = useMemo(() => (Array.isArray(rawKits) ? rawKits : []), [rawKits]);
  const shopHierarchy = useSelector((state) => state.slice?.shopHierarchy || []);
  const [selected, setSelected] = useState(null);
  const [selectedKit, setSelectedKit] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCapacity, setSelectedCapacity] = useState(null);
  const [comparedKits, setComparedKits] = useState([]);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [expandedSections, setExpandedSections] = useState({
    panel: true,
    inverter: false,
    battery: false
  });
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState([]);

  const [filters, setFilters] = useState({
    industryType: "all",
    category: "all",
    subCategory: "all",
    systemType: "all",
    subProjectType: "all",
    comboKitType: "all",
    projectRange: "all",
    pricePerKw: "all",
    popularKits: "all",
    frequencyBuyer: "all",
    panelBrand: "all",
    panelTechnology: "all",
    panelWattage: "all",
    panelWarranty: "all",
    panelEfficiency: "all",
    inverterBrand: "all",
    inverterType: "all",
    inverterCapacity: "all",
    inverterWarranty: "all",
    inverterEfficiency: "all",
    batteryBrand: "all",
    batteryType: "all",
    batteryCapacity: "all",
  });

  const selectedDistrict = useSelector((state) => state.slice?.selectedDistrict);
  const selectedState = useSelector((state) => state.slice?.selectedState);
  const selectedPincode = useSelector((state) => state.slice?.selectedPincode);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [activeOffers, setActiveOffers] = useState([]);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  useEffect(() => {
    if (!shopHierarchy || shopHierarchy.length === 0) {
      dispatch(fetchShopHierarchy());
    }
  }, [dispatch, shopHierarchy]);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const districtId = selectedDistrict?.id || selectedDistrict?._id || "";
        const res = await fetch(`${apiBase}/india/v1/shop/active-offers?district_id=${districtId}`);
        const json = await res.json();
        if (json.success) {
          setActiveOffers(json.data || []);
        }
      } catch (err) {
        console.error("Error fetching active offers:", err);
      }
    };
    fetchOffers();
  }, [selectedDistrict]);

  useEffect(() => {
    if (activeOffers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentOfferIndex(prev => (prev + 1) % activeOffers.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeOffers]);

  useEffect(() => {
    setSelectedKit(selected ? availableKits.find((k) =>
      String(k.id) === String(selected?.split('-')[0])
    ) : null);
  }, [selected, availableKits]);

  // Get unique kit types from data
  const comboKitTypeOptions = useMemo(() => {
    let filteredKits = availableKits;

    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter(kit => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(kit => kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() || kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase());
    }
    if (filters.systemType && filters.systemType !== "all") {
      filteredKits = filteredKits.filter(kit => kit.projectType?.toLowerCase() === filters.systemType.toLowerCase() || kit.inverter?.type?.toLowerCase() === filters.systemType.toLowerCase());
    }
    if (filters.projectRange && filters.projectRange !== "all") {
      filteredKits = filteredKits.filter(kit => String(kit.projectRange?.id) === String(filters.projectRange));
    }

    const types = [...new Set(filteredKits
      .filter(kit => !kit.hasNoAssignedVariants)
      .flatMap(kit =>
        kit.variants?.map(v => v.productTier) || []
      ).filter(Boolean)
    )];

    return [
      { value: "all", text: "All Combo Kit Types" },
      ...types.map(type => ({
        value: type.toLowerCase(),
        text: type
      }))
    ];
  }, [availableKits, filters.category, filters.subCategory, filters.systemType, filters.projectRange]);

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
      ...list
    ];
  }, [shopHierarchy, availableKits]);

  const categoryOptions = useMemo(() => {
    const catMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType) ||
          ind.slug?.toLowerCase() === filters.industryType.toLowerCase()
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (cat.name && !catMap.has(cat.name.toLowerCase())) {
            catMap.set(cat.name.toLowerCase(), { value: cat.name, text: cat.name, id: cat.id });
          }
        });
      });
    }

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter(kit => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    filteredKits.forEach(kit => {
      if (kit.category && !catMap.has(kit.category.toLowerCase())) {
        catMap.set(kit.category.toLowerCase(), { value: kit.category, text: kit.category });
      }
    });

    return [
      { value: "all", text: "All Categories" },
      ...Array.from(catMap.values())
    ];
  }, [shopHierarchy, availableKits, filters.industryType]);

  const subCategoryOptions = useMemo(() => {
    const subsMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase() || String(cat.id) === String(filters.category)) {
            (cat.subcategories || []).forEach(sub => {
              if (sub.name && !subsMap.has(sub.name.toLowerCase())) {
                subsMap.set(sub.name.toLowerCase(), {
                  value: sub.name,
                  text: sub.name,
                  id: sub.id,
                  image: sub.image || null
                });
              }
            });
          }
        });
      });
    }

    let filteredKits = availableKits;
    if (filters.industryType && filters.industryType !== "all") {
      filteredKits = filteredKits.filter(kit => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter(kit => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    filteredKits.forEach(kit => {
      const subName = kit.subCategory || kit.usageType;
      if (subName && !subsMap.has(subName.toLowerCase())) {
        subsMap.set(subName.toLowerCase(), {
          value: subName,
          text: subName,
          image: kit.usageTypeImage || null
        });
      }
    });

    return [
      { value: "all", text: "All Sub-Categories" },
      ...Array.from(subsMap.values())
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category]);

  const systemTypeOptions = useMemo(() => {
    const typesMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase()) {
            (cat.subcategories || []).forEach(sub => {
              if (filters.subCategory === "all" || sub.name?.toLowerCase() === filters.subCategory?.toLowerCase()) {
                (sub.mappedTypes || []).forEach(mt => {
                  if (mt.name && !typesMap.has(mt.name.toLowerCase())) {
                    typesMap.set(mt.name.toLowerCase(), {
                      value: mt.name,
                      text: mt.name,
                      id: mt.id || mt.type_id
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
      filteredKits = filteredKits.filter(kit => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter(kit => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(kit => (kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() || kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase()));
    }
    filteredKits.forEach(kit => {
      const typeName = kit.projectType || kit.inverter?.type || kit.systemType;
      if (typeName && !typesMap.has(typeName.toLowerCase())) {
        typesMap.set(typeName.toLowerCase(), { value: typeName, text: typeName });
      }
    });

    return [
      { value: "all", text: "All System Types" },
      ...Array.from(typesMap.values())
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category, filters.subCategory]);

  const projectRangeOptions = useMemo(() => {
    const rangesMap = new Map();

    if (shopHierarchy && shopHierarchy.length > 0) {
      let relevantInds = shopHierarchy;
      if (filters.industryType && filters.industryType !== "all") {
        relevantInds = shopHierarchy.filter(ind =>
          ind.name?.toLowerCase() === filters.industryType.toLowerCase() ||
          String(ind.id) === String(filters.industryType)
        );
      }
      relevantInds.forEach(ind => {
        (ind.categories || []).forEach(cat => {
          if (filters.category === "all" || cat.name?.toLowerCase() === filters.category?.toLowerCase()) {
            (cat.subcategories || []).forEach(sub => {
              if (filters.subCategory === "all" || sub.name?.toLowerCase() === filters.subCategory?.toLowerCase()) {
                (sub.mappedTypes || []).forEach(mt => {
                  if (filters.systemType === "all" || mt.name?.toLowerCase() === filters.systemType?.toLowerCase()) {
                    (mt.ranges || []).forEach(r => {
                      const idVal = String(r.id || r.range_label);
                      if (idVal && !rangesMap.has(idVal)) {
                        rangesMap.set(idVal, {
                          value: idVal,
                          text: r.range_label || `${r.min_value} - ${r.max_value} ${r.unit_symbol || 'kW'}`,
                          min: r.min_value || 0
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
      filteredKits = filteredKits.filter(kit => {
        const ind = (kit.industryType || kit.industry_type_name || "").toLowerCase();
        const sel = filters.industryType.toLowerCase();
        return ind === sel || (kit.industry_type_id && String(kit.industry_type_id) === String(filters.industryType)) || ind.includes(sel) || sel.includes(ind);
      });
    }
    if (filters.category && filters.category !== "all") {
      filteredKits = filteredKits.filter(kit => kit.category?.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.subCategory && filters.subCategory !== "all") {
      filteredKits = filteredKits.filter(kit => (kit.subCategory?.toLowerCase() === filters.subCategory.toLowerCase() || kit.usageType?.toLowerCase() === filters.subCategory.toLowerCase()));
    }
    if (filters.systemType && filters.systemType !== "all") {
      filteredKits = filteredKits.filter(kit => (kit.projectType?.toLowerCase() === filters.systemType.toLowerCase() || kit.inverter?.type?.toLowerCase() === filters.systemType.toLowerCase() || kit.systemType?.toLowerCase() === filters.systemType.toLowerCase()));
    }
    filteredKits.forEach(kit => {
      if (kit.projectRange) {
        const idVal = String(kit.projectRange.id || kit.projectRange.text);
        if (idVal && !rangesMap.has(idVal)) {
          rangesMap.set(idVal, {
            value: idVal,
            text: kit.projectRange.text || idVal,
            min: kit.projectRange.min || 0
          });
        }
      }
    });

    const uniqueRanges = Array.from(rangesMap.values()).sort((a, b) => (a.min || 0) - (b.min || 0));

    return [
      { value: "all", text: "All Project Ranges" },
      ...uniqueRanges.map(r => ({ value: r.value, text: r.text }))
    ];
  }, [shopHierarchy, availableKits, filters.industryType, filters.category, filters.subCategory, filters.systemType]);

  const getDropdownOptions = (key) => {
    switch (key) {
      case "industryType":
        return industryTypeOptions;
      case "comboKitType":
        return comboKitTypeOptions;
      case "category":
        return categoryOptions;
      case "subCategory":
        return subCategoryOptions;
      case "systemType":
        return systemTypeOptions;
      case "projectRange":
        return projectRangeOptions;
      case "popularKits":
        return options.popularKits || [];
      case "frequencyBuyer":
        return options.frequencyBuyer || [];
      default:
        return options[key] || [];
    }
  };

  const mainFilterKeys = ["industryType", "category", "subCategory", "systemType", "projectRange"];
  const subFilterKeys = ["comboKitType", "pricePerKw", "popularKits",];

  const clearAllFilters = () => {
    setFilters({
      industryType: "all",
      category: "all",
      subCategory: "all",
      systemType: "all",
      subProjectType: "all",
      comboKitType: "all",
      projectRange: "all",
      pricePerKw: "all",
      popularKits: "all",
      frequencyBuyer: "all",
      panelBrand: "all",
      panelTechnology: "all",
      panelWattage: "all",
      panelWarranty: "all",
      panelEfficiency: "all",
      inverterBrand: "all",
      inverterType: "all",
      inverterCapacity: "all",
      inverterWarranty: "all",
      inverterEfficiency: "all",
      batteryBrand: "all",
      batteryType: "all",
      batteryCapacity: "all",
    });
    setSearchTerm("");
    setSelectedCapacity(null);
    setShowInStockOnly(false);
    setSelectedTiers([]);
  };

  const handleToggleCompare = (kit) => {
    setComparedKits((prev) => {
      const exists = prev.some((k) => k.id === kit.id);
      if (exists) {
        return prev.filter((k) => k.id !== kit.id);
      }
      if (prev.length >= 4) {
        alert("You can compare up to 4 solar kits at a time.");
        return prev;
      }
      return [...prev, kit];
    });
  };

  const clearMainFilters = () => {
    const newFilters = { ...filters };
    mainFilterKeys.forEach((k) => (newFilters[k] = "all"));
    setFilters(newFilters);
  };

  const clearSubFilters = () => {
    const newFilters = { ...filters };
    subFilterKeys.forEach((k) => (newFilters[k] = "all"));
    setFilters(newFilters);
  };

  const clearProductFilters = () => {
    const newFilters = { ...filters };
    Object.keys(newFilters).forEach((k) => {
      if (![...mainFilterKeys, ...subFilterKeys].includes(k)) newFilters[k] = "all";
    });
    setFilters(newFilters);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleTier = (tier) => {
    setSelectedTiers(prev =>
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const finalKits = useMemo(() => {
    let result = [...availableKits];

    // Only show kits that have at least one variant assigned from the backend
    result = result.filter(k => k.variants && k.variants.length > 0);

    // Capacity quick filter
    if (selectedCapacity !== null) {
      if (selectedCapacity === 15) {
        result = result.filter((k) => (k.capacityKW || 0) >= 15);
      } else {
        result = result.filter((k) => Math.abs((k.capacityKW || 0) - selectedCapacity) < 0.6);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (k) =>
          k.kitName?.toLowerCase().includes(term) ||
          k.brand?.toLowerCase().includes(term) ||
          k.usageType?.toLowerCase().includes(term) ||
          k.description?.toLowerCase().includes(term) ||
          (k.capacityKW && `${k.capacityKW}kw`.includes(term.replace(/\s+/g, ""))) ||
          k.variants?.some(v => v.productTier?.toLowerCase().includes(term))
      );
    }

    // Tier filter
    if (selectedTiers.length > 0) {
      result = result.filter(k =>
        k.variants?.some(v =>
          selectedTiers.includes(v.productTier?.toLowerCase())
        )
      );
    }

    // Stock filter
    if (showInStockOnly) {
      result = result.filter((k) =>
        k.variants?.some(v => v.inStock === true)
      );
    }

    // Apply other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value === "all") return;

      result = result.filter((k) => {
        switch (key) {
          case "industryType": {
            const kitInd = (k.industryType || k.industry_type_name || "").toLowerCase();
            const selInd = value.toLowerCase();
            if (kitInd === selInd) return true;
            if (k.industry_type_id && String(k.industry_type_id) === String(value)) return true;
            return kitInd.includes(selInd) || selInd.includes(kitInd);
          }

          case "category": {
            const kitCat = (k.category || "").toLowerCase();
            const selCat = value.toLowerCase();
            if (kitCat === selCat) return true;
            if (k.category_id && String(k.category_id) === String(value)) return true;
            return kitCat.includes(selCat) || selCat.includes(kitCat);
          }

          case "subCategory": {
            const kitSub = (k.subCategory || k.usageType || "").toLowerCase();
            const selSub = value.toLowerCase();
            if (kitSub === selSub) return true;
            if (k.subcategory_id && String(k.subcategory_id) === String(value)) return true;
            return kitSub.includes(selSub) || selSub.includes(kitSub);
          }

          case "systemType": {
            const kitType = (k.projectType || k.inverter?.type || k.systemType || "").toLowerCase();
            const selType = value.toLowerCase();
            if (kitType === selType) return true;
            return kitType.includes(selType) || selType.includes(kitType);
          }

          case "subProjectType":
            return k.subProjectType?.toLowerCase() === value.toLowerCase();

          case "comboKitType":
            if (k.hasNoAssignedVariants) return false;
            return k.variants?.some(v => v.productTier?.toLowerCase() === value);

          case "pricePerKw": {
            const hasVariantInRange = k.variants?.some(v => {
              const pricePerKw = v.ourPrice / (k.capacityKW || 1);
              const ranges = {
                "0-25000": [0, 25000], "25000-60000": [25000, 50000], "50000-75000": [50000, 75000], "75000-100000": [75000, 100000], "100000+": [100000, Infinity],
              };
              const [min, max] = ranges[value] || [0, Infinity];
              return pricePerKw >= min && pricePerKw <= max;
            });
            return hasVariantInRange;
          }

          case "popularKits": {
            if (value === "all") return true;
            const hasExplicitFlag = Boolean(
              k.isPopular ||
              k.is_popular ||
              k.popular ||
              (k.badge && /popular|best|trending/i.test(k.badge)) ||
              (k.tags && k.tags.some(t => /popular|trending|bestseller/i.test(t)))
            );
            if (hasExplicitFlag) return true;

            // Frontend fallback when backend is not connected yet
            if (value === "popular" || value === "most_popular") {
              return k.capacityKW === 3 || k.capacityKW === 5 || Boolean(k.isPopular);
            }
            if (value === "trending") {
              return k.capacityKW === 5 || k.capacityKW === 10;
            }
            if (value === "top_rated") {
              return (k.rating && k.rating >= 4.5) || k.capacityKW === 3;
            }
            return true;
          }

          case "frequencyBuyer": {
            if (value === "all") return true;
            const hasExplicitFlag = Boolean(
              k.frequencyBuyer ||
              k.frequentBuyer ||
              k.isFrequentBuyer ||
              (k.buyerType && k.buyerType.toLowerCase() === value.toLowerCase()) ||
              (k.targetBuyer && k.targetBuyer.toLowerCase().includes(value.toLowerCase()))
            );
            if (hasExplicitFlag) return true;

            // Frontend fallback when backend is not connected yet
            if (value === "frequent") {
              return (k.capacityKW || 0) <= 5;
            }
            if (value === "regular") {
              return (k.capacityKW || 0) <= 3;
            }
            if (value === "bulk" || value === "high_volume") {
              return (k.capacityKW || 0) >= 5;
            }
            return true;
          }

          case "projectRange": {
            if (!k.projectRange) return false;
            return String(k.projectRange.id) === String(value) || String(k.projectRange.text) === String(value) || String(k.project_range_id) === String(value);
          }

          // Panel filters
          case "panelBrand": {
            const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
            return panel?.brandName?.toLowerCase() === value.toLowerCase();
          }
          case "panelTechnology": {
            const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
            const tech = (panel?.technologyType || panel?.technology || "").toLowerCase().trim();
            return tech === value.toLowerCase().trim();
          }
          case "panelWattage": {
            const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
            const watt = parseFloat(panel?.wattPerPanel);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(watt)) {
              return watt === numVal;
            }
            const ranges = {
              "under-300": [0, 300], "300-400": [300, 400], "400-500": [400, 500], "500-600": [500, 600], "600+": [600, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (watt || 0) >= min && (watt || 0) <= max;
            }
            return String(panel?.wattPerPanel || "").toLowerCase() === value.toLowerCase();
          }
          case "panelWarranty": {
            const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
            const warranty = parseFloat(panel?.warrantyYears);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(warranty)) {
              return warranty === numVal;
            }
            const ranges = {
              "1-5": [1, 5], "5-10": [5, 10], "10-15": [10, 15], "15-20": [15, 20], "20+": [20, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (warranty || 0) >= min && (warranty || 0) <= max;
            }
            return String(panel?.warrantyYears || "").toLowerCase() === value.toLowerCase();
          }
          case "panelEfficiency": {
            const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
            const eff = parseFloat(panel?.efficiencyPercent);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(eff)) {
              return eff === numVal;
            }
            const ranges = {
              "under-15": [0, 15], "15-18": [15, 18], "18-20": [18, 20], "20-22": [20, 22], "22+": [22, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (eff || 0) >= min && (eff || 0) <= max;
            }
            return String(panel?.efficiencyPercent || "").toLowerCase() === value.toLowerCase();
          }

          // Inverter filters
          case "inverterBrand": {
            const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
            return inv?.brandName?.toLowerCase() === value.toLowerCase();
          }
          case "inverterType": {
            const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
            const type = (inv?.type || inv?.category || "").toLowerCase().trim();
            return type === value.toLowerCase().trim();
          }
          case "inverterCapacity": {
            const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
            const cap = parseFloat(inv?.capacityKW || k.capacityKW || k.capacity);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(cap)) {
              return cap === numVal;
            }
            const ranges = {
              "under-1": [0, 1], "1-3": [1, 3], "3-5": [3, 5], "5-10": [5, 10], "10+": [10, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (cap || 0) >= min && (cap || 0) <= max;
            }
            return String(inv?.capacityKW || "").toLowerCase() === value.toLowerCase();
          }
          case "inverterWarranty": {
            const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
            const warranty = parseFloat(inv?.warrantyYears);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(warranty)) {
              return warranty === numVal;
            }
            const ranges = {
              "1-5": [1, 5], "5-10": [5, 10], "10-15": [10, 15], "15-20": [15, 20], "20+": [20, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (warranty || 0) >= min && (warranty || 0) <= max;
            }
            return String(inv?.warrantyYears || "").toLowerCase() === value.toLowerCase();
          }
          case "inverterEfficiency": {
            const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
            const eff = parseFloat(inv?.efficiencyPercent);
            const numVal = parseFloat(value);
            if (!isNaN(numVal) && !isNaN(eff)) {
              return eff === numVal;
            }
            const ranges = {
              "under-15": [0, 15], "15-18": [15, 18], "18-20": [18, 20], "20-22": [20, 22], "22+": [22, Infinity],
            };
            if (ranges[value]) {
              const [min, max] = ranges[value];
              return (eff || 0) >= min && (eff || 0) <= max;
            }
            return String(inv?.efficiencyPercent || "").toLowerCase() === value.toLowerCase();
          }

          // Battery filters
          case "batteryBrand":
            return k.battery?.brandName?.toLowerCase() === value;
          case "batteryType":
            return k.battery?.type?.toLowerCase() === value;
          case "batteryCapacity": {
            const cap = k.battery?.capacityKWh || 0;
            const ranges = {
              "under-2": [0, 2], "2-5": [2, 5], "5-10": [5, 10], "10-20": [10, 20], "20+": [20, Infinity],
            };
            const [min, max] = ranges[value] || [0, Infinity];
            return cap >= min && cap <= max;
          }

          default:
            return true;
        }
      });
    });

    return result;
  }, [availableKits, searchTerm, filters, showInStockOnly, selectedTiers, selectedCapacity]);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter((v) => v !== "all").length +
      (showInStockOnly ? 1 : 0) +
      selectedTiers.length +
      (selectedCapacity !== null ? 1 : 0),
    [filters, showInStockOnly, selectedTiers, selectedCapacity]
  );

  const inStockKitsCount = useMemo(() =>
    availableKits.filter(kit => kit.variants?.some(v => v.inStock)).length,
    [availableKits]
  );


  // Mobile Filters Drawer Component
  const MobileFiltersDrawer = () => {
    const drawerRef = useRef(null);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e) => {
      setStartY(e.touches[0].clientY);
      setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
      if (!isSwiping) return;
      const currentY = e.touches[0].clientY;
      setCurrentY(currentY);

      const diff = currentY - startY;
      if (diff > 0) {
        drawerRef.current.style.transform = `translateY(${diff}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping) return;

      const diff = currentY - startY;
      if (diff > 100) {
        setShowMobileFilters(false);
      } else {
        drawerRef.current.style.transform = 'translateY(0)';
      }

      setIsSwiping(false);
      setStartY(0);
      setCurrentY(0);
    };

    return (
      <div className="lg:hidden">
        {/* Backdrop */}
        {showMobileFilters && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        {/* Drawer */}
        <div
          ref={drawerRef}
          className={`
            fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-lg z-50 transform transition-transform duration-300
            ${showMobileFilters ? 'translate-y-0' : 'translate-y-full'}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-200 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-end px-4 py-3 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">All Filters</h3>
                <p className="text-sm text-white/80">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} active filters` : 'Adjust your search'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Button
                    onClick={clearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    Clear All
                  </Button>
                )}
                <IconButton
                  onClick={() => setShowMobileFilters(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <FiX size={20} />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Filters Content */}
          <div className="max-h-[65vh] overflow-y-auto bg-surface">
            <div className="p-4 space-y-6">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search kits..."
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-surface-hover"
                />
                {searchTerm && (
                  <IconButton
                    onClick={() => setSearchTerm("")}
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  >
                    <FiX size={16} />
                  </IconButton>
                )}
              </div>

              {/* In Stock Filter */}
              <div className="p-4 border border-border rounded-xl bg-surface-hover">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="hidden"
                  />
                  <div className={`flex items-center justify-center w-5 h-5 border rounded-md transition-all ${showInStockOnly
                    ? "bg-gradient-to-r from-primary to-primary-end border-primary text-white"
                    : "border-border text-transparent"
                    }`}>
                    {showInStockOnly && <FiCheckSquare size={14} />}
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${showInStockOnly ? 'text-primary dark:text-info ' : 'text-text-primary dark:text-info '}`}>
                      Show In Stock Only
                    </span>
                    <p className="text-xs text-text-secondary mt-1">
                      {inStockKitsCount} of {availableKits.length} kits available
                    </p>
                  </div>
                </label>
              </div>

              {/* Quick Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiPackage className="text-primary dark:text-info" size={16} />
                    <h4 className="font-semibold text-text-primary dark:text-info">Quick Filters</h4>
                  </div>
                  <Button onClick={clearMainFilters} variant="link" size="sm">
                    Clear
                  </Button>
                </div>
                <div className="grid gap-3">
                  <Dropdown
                    label="Industry Type"
                    options={industryTypeOptions}
                    value={filters.industryType}
                    onChange={(val) => setFilters((prev) => ({
                      ...prev,
                      industryType: val,
                      category: "all",
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all"
                    }))}
                    className="w-full"
                  />
                  <Dropdown
                    label="Category"
                    options={categoryOptions}
                    value={filters.category}
                    onChange={(val) => setFilters((prev) => ({
                      ...prev,
                      category: val,
                      subCategory: "all",
                      systemType: "all",
                      projectRange: "all"
                    }))}
                    className="w-full"
                  />
                  <Dropdown
                    label="Sub Category"
                    options={subCategoryOptions}
                    value={filters.subCategory}
                    disabled={filters.category === "all"}
                    onChange={(val) => setFilters((prev) => ({
                      ...prev,
                      subCategory: val,
                      systemType: "all",
                      projectRange: "all"
                    }))}
                    className="w-full"
                  />
                  <Dropdown
                    label="System Type"
                    options={systemTypeOptions}
                    value={filters.systemType}
                    disabled={filters.category === "all" || filters.subCategory === "all"}
                    onChange={(val) => setFilters((prev) => ({
                      ...prev,
                      systemType: val,
                      projectRange: "all"
                    }))}
                    className="w-full"
                  />
                  <Dropdown
                    label="Project Range"
                    options={projectRangeOptions}
                    value={filters.projectRange}
                    disabled={filters.category === "all" || filters.subCategory === "all" || filters.systemType === "all"}
                    onChange={(val) => setFilters((prev) => ({
                      ...prev,
                      projectRange: val
                    }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Details Filters */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-primary dark:text-info" size={16} />
                    <h4 className="font-semibold text-text-primary dark:text-info">Details Filters</h4>
                  </div>
                  <Button onClick={clearSubFilters} variant="link" size="sm">
                    Clear
                  </Button>
                </div>
                <div className="grid gap-3">
                  {subFilterKeys.map((key) => (
                    <Dropdown
                      key={key}
                      label={
                        key === "comboKitType"
                          ? "Combo Kit Type"
                          : key === "popularKits"
                            ? "Popular Kits"
                            : key === "frequencyBuyer"
                              ? "Frequency Buyer"
                              : key === "pricePerKw"
                                ? "Price Per Kw"
                                : key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())
                      }
                      options={key === "comboKitType" ? getDropdownOptions(key) : (options[key] || getDropdownOptions(key))}
                      value={filters[key]}
                      onChange={(val) => setFilters((prev) => ({ ...prev, [key]: val }))}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>

              {/* Product Filters */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FiSliders className="text-primary dark:text-info" size={16} />
                    <h4 className="font-semibold text-text-primary dark:text-info">Product Filters</h4>
                  </div>
                  <Button onClick={clearProductFilters} variant="link" size="sm">
                    Clear All
                  </Button>
                </div>
                <KitFilters
                  availableKits={availableKits}
                  filters={filters}
                  setFilters={setFilters}
                  clearFilters={clearProductFilters}
                  filterKeys={[]}
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                />
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="sticky bottom-0 left-0 right-0 bg-surface border-t border-border p-4">
            <div className="flex gap-3">
              <Button onClick={clearAllFilters} variant="secondary" size="lg" fullWidth>
                Reset All
              </Button>
              <Button onClick={() => setShowMobileFilters(false)} variant="primary" size="lg" fullWidth>
                <span className="flex items-center justify-center gap-2">
                  Show Results
                  <span className="bg-white/20 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-bold">
                    {finalKits.length}
                  </span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-end rounded-xl shadow-md mb-6">
        <div className="mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Pre-Configured Solar Kits
              </h1>
              <p className="text-sm lg:text-base text-white/80 mt-1">
                Browse and compare our expertly curated solar solutions
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
              <span className="text-white font-semibold text-sm lg:text-base">
                {finalKits.length} of {availableKits.length} kits
                {showInStockOnly && ` (${inStockKitsCount} in stock)`}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Active Offers Banners */}
      {activeOffers.length > 0 && (
        <div className="relative overflow-hidden rounded-xl mb-6 shadow-sm border border-border bg-surface">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentOfferIndex * 100}%)` }}
          >
            {activeOffers.map((offer) => {
              let bgGradient = "from-amber-500 to-orange-600";
              let icon = "⚡";
              let badgeText = "FLASH SALE";

              if (offer.offer_type === 'bundle') {
                bgGradient = "from-blue-600 to-indigo-700";
                icon = "📦";
                badgeText = "BUY PACK OFFER";
              } else if (offer.offer_type === 'coupon') {
                bgGradient = "from-emerald-500 to-teal-600";
                icon = "🎟️";
                badgeText = "COUPON CODE";
              } else if (offer.offer_type === 'discount') {
                bgGradient = "from-pink-500 to-rose-600";
                icon = "🏷️";
                badgeText = "SPECIAL DISCOUNT";
              }

              const formattedValue = offer.discount_type === 'percent'
                ? `${offer.discount_value}%`
                : `₹${offer.discount_value.toLocaleString("en-IN")}`;

              return (
                <div
                  key={offer._id}
                  className={`w-full shrink-0 bg-gradient-to-r ${bgGradient} text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6`}
                >
                  <div className="space-y-2 flex-1 text-left">
                    <span className="inline-block text-xs font-bold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm tracking-wider">
                      {icon} {badgeText}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      {offer.offer_name}
                    </h2>
                    <p className="text-white/80 text-sm max-w-xl">
                      {offer.offer_type === 'bundle'
                        ? `Save ${formattedValue} per kW on purchasing a minimum of ${offer.max_qty || 5} kits.`
                        : offer.offer_type === 'coupon'
                          ? `Use coupon code "${offer.coupon_code}" to get ${formattedValue} off on your order!`
                          : `Get ${formattedValue} off on eligible solar shop preconfigured kits.`
                      }
                    </p>
                    <div className="text-xs text-white/60">
                      Offer valid until {new Date(offer.end_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center bg-white/10 rounded-2xl p-6 border border-white/10 backdrop-blur-sm w-36 h-36">
                    <div className="text-center">
                      <span className="block text-2xl font-extrabold md:text-3xl leading-none">
                        {formattedValue}
                      </span>
                      <span className="block text-xs uppercase tracking-widest text-white/70 mt-1 font-bold">
                        {offer.discount_type === 'percent' ? 'Discount' : 'Off'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel dots */}
          {activeOffers.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {activeOffers.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentOfferIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${currentOfferIndex === idx ? "bg-white w-4" : "bg-white/40"
                    }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="">
        {/* REGIONAL PINCODE & LOCATION FILTER BANNER */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 mb-5 shadow-md border border-blue-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
              <FiMapPin size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/25 text-amber-300 border border-amber-400/30">
                  Serviceable Delivery Region
                </span>
                {selectedPincode && (
                  <span className="text-[11px] font-bold text-blue-200">
                    PIN: {selectedPincode}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                Solar Combo Kits for{" "}
                <span className="text-amber-400">
                  {selectedDistrict?.name || "All India"}, {selectedState?.name || ""}
                </span>
              </h3>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Showing turnkey kits, real-time warehouse inventory, and region-specific Best Seller rankings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              <FiNavigation size={14} />
              <span>{selectedPincode ? `Change PIN (${selectedPincode})` : "Enter Delivery Pincode"}</span>
            </button>
          </div>
        </div>

        {/* Search + Controls */}
        <div className="bg-surface rounded-xl shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by kit name, brand, capacity (e.g. 3kW), type..."
                className="w-full pl-10 pr-10 py-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-surface-hover"
              />
              {searchTerm && (
                <IconButton
                  onClick={() => setSearchTerm("")}
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <FiX size={16} />
                </IconButton>
              )}
            </div>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Compare Button */}
              <Button
                onClick={() => setIsCompareDrawerOpen(true)}
                variant={comparedKits.length > 0 ? "primary" : "secondary"}
                size="md"
                leftIcon={<FiLayers size={16} />}
                className={comparedKits.length > 0 ? "bg-amber-500 hover:bg-amber-600 text-white font-bold" : "font-bold"}
              >
                <span>Compare {comparedKits.length > 0 ? `(${comparedKits.length}/4)` : "Kits"}</span>
              </Button>

              {/* View Toggle */}
              <div className="flex bg-surface-hover rounded-xl p-1 border border-border">
                <IconButton
                  onClick={() => setViewMode("grid")}
                  variant={viewMode === "grid" ? "primary" : "ghost"}
                  size="sm"
                  className={`rounded-lg ${viewMode === "grid" ? "shadow-sm" : ""}`}
                  title="Grid View"
                >
                  <FiGrid size={18} />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode("list")}
                  variant={viewMode === "list" ? "primary" : "ghost"}
                  size="sm"
                  className={`rounded-lg ${viewMode === "list" ? "shadow-sm" : ""}`}
                  title="List View"
                >
                  <FiList size={18} />
                </IconButton>
              </div>

              {/* Best Sellers Quick Jump */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("our-best-sellers");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/15 to-amber-500/5 hover:from-amber-500/25 hover:to-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs rounded-xl border border-amber-500/30 shadow-xs transition-all cursor-pointer"
                title="Jump to regional Best Seller kits"
              >
                <span>⭐ Our Best Sellers</span>
              </button>

              {/* In Stock Toggle */}
              <Button
                onClick={() => setShowInStockOnly(!showInStockOnly)}
                variant={showInStockOnly ? "success" : "secondary"}
                size="md"
                leftIcon={showInStockOnly ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                className={showInStockOnly ? "bg-green-50 border-green-200 text-green-700" : ""}
              >
                <span className="flex">In Stock Only
                  {showInStockOnly && (
                    <span className="ml-2 bg-surface text-green-700 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                      {inStockKitsCount}
                    </span>
                  )}
                </span>
              </Button>

              {/* Reset */}
              {(activeFiltersCount > 0 || searchTerm) && (
                <Button onClick={clearAllFilters} variant="primary" size="md" leftIcon={<FiRefreshCw size={16} />}>
                  Reset All
                </Button>
              )}
            </div>

            {/* Mobile Controls */}
            <div className="lg:hidden flex items-center gap-2 w-full">
              <div className="flex bg-surface-hover rounded-lg p-1 border border-border">
                <IconButton
                  onClick={() => setViewMode("grid")}
                  variant={viewMode === "grid" ? "primary" : "ghost"}
                  size="sm"
                  className={`rounded-lg ${viewMode === "grid" ? "shadow-sm" : ""}`}
                >
                  <FiGrid size={16} />
                </IconButton>
                <IconButton
                  onClick={() => setViewMode("list")}
                  variant={viewMode === "list" ? "primary" : "ghost"}
                  className={`rounded-lg ${viewMode === "list" ? "shadow-sm" : ""}`}
                  size="sm"
                >
                  <FiList size={16} />
                </IconButton>
              </div>

              <Button
                onClick={() => setShowInStockOnly(!showInStockOnly)}
                variant={showInStockOnly ? "success" : "secondary"}
                size="md"
                fullWidth
                leftIcon={showInStockOnly ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
                className={showInStockOnly ? "bg-green-50 border-green-200 text-green-700" : ""}
              >
                In Stock
              </Button>

              <Button
                onClick={() => setShowMobileFilters(true)}
                variant="primary"
                size="md"
                leftIcon={<FiFilter size={16} />}
              >
                <span className="flex items-center gap-2">
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="bg-white/20 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </span>
              </Button>
            </div>
          </div>

          {/* Desktop Quick Filters */}
          <div className="hidden lg:block mt-4">

            {/* Main Filters */}
            <div className="bg-surface-hover rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FiPackage className="text-primary dark:text-info" size={18} />
                  <h3 className="font-semibold text-text-primary dark:text-info">Quick Filters</h3>
                </div>
                <Button onClick={clearMainFilters} variant="link" size="sm">
                  Clear Main
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <Dropdown
                  label="Industry Type"
                  options={industryTypeOptions}
                  value={filters.industryType}
                  onChange={(val) => setFilters((prev) => ({
                    ...prev,
                    industryType: val,
                    category: "all",
                    subCategory: "all",
                    systemType: "all",
                    projectRange: "all"
                  }))}
                  className="w-full"
                />
                <Dropdown
                  label="Category"
                  options={categoryOptions}
                  value={filters.category}
                  onChange={(val) => setFilters((prev) => ({
                    ...prev,
                    category: val,
                    subCategory: "all",
                    systemType: "all",
                    projectRange: "all"
                  }))}
                  className="w-full"
                />
                <Dropdown
                  label="Sub Category"
                  options={subCategoryOptions}
                  value={filters.subCategory}
                  onChange={(val) => setFilters((prev) => ({
                    ...prev,
                    subCategory: val
                  }))}
                  className="w-full"
                />
                <Dropdown
                  label="System Type"
                  options={systemTypeOptions}
                  value={filters.systemType}
                  onChange={(val) => setFilters((prev) => ({
                    ...prev,
                    systemType: val
                  }))}
                  className="w-full"
                />
                <Dropdown
                  label="Project Range"
                  options={projectRangeOptions}
                  value={filters.projectRange}
                  onChange={(val) => setFilters((prev) => ({
                    ...prev,
                    projectRange: val
                  }))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Details Filters */}
            <div className="bg-surface-hover rounded-xl p-4 border border-border mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FiTrendingUp className="text-primary dark:text-info" size={18} />
                  <h3 className="font-semibold text-text-primary dark:text-info">Details Filters</h3>
                </div>
                <Button onClick={clearSubFilters} variant="link" size="sm">
                  Clear Details
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {subFilterKeys.map((key) => (
                  <Dropdown
                    key={key}
                    label={
                      key === "comboKitType"
                        ? "Combo Kit Type"
                        : key === "popularKits"
                          ? "Popular Kits"
                          : key === "frequencyBuyer"
                            ? "Frequency Buyer"
                            : key === "pricePerKw"
                              ? "Price Per Kw"
                              : key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())
                    }
                    options={key === "comboKitType" ? getDropdownOptions(key) : (options[key] || getDropdownOptions(key))}
                    value={filters[key]}
                    onChange={(val) => setFilters((prev) => ({ ...prev, [key]: val }))}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-surface rounded-xl border border-border shadow-sm sticky top-4">
              <div className="bg-gradient-to-r from-primary to-primary-end px-4 py-3 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiSliders className="text-white" size={18} />
                    <h3 className="font-bold text-white">Product Filters</h3>
                  </div>
                  <Button onClick={clearProductFilters} variant="link" size="sm" className="text-white hover:text-white">
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <KitFilters
                  availableKits={availableKits}
                  filters={filters}
                  setFilters={setFilters}
                  clearFilters={clearProductFilters}
                  filterKeys={[]}
                  expandedSections={expandedSections}
                  onToggleSection={toggleSection}
                />
              </div>
            </div>
          </aside>

          {/* Kits Grid/List */}
          <main className="flex-1">
            {finalKits.length === 0 ? (
              <div className="bg-surface rounded-xl p-12 text-center border border-border shadow-sm">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiSearch size={32} className="text-primary dark:text-info" />
                </div>
                <h3 className="text-2xl font-semibold text-text-primary dark:text-info mb-2">No kits found</h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  {showInStockOnly
                    ? "No in-stock kits match your search criteria. Try adjusting your filters or showing all items."
                    : "Try adjusting your search criteria or filters to find more options."
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={clearAllFilters} variant="primary" size="lg">
                    Clear All Filters
                  </Button>
                  {showInStockOnly && (
                    <Button onClick={() => setShowInStockOnly(false)} variant="secondary" size="lg">
                      Show All Items
                    </Button>
                  )}
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {finalKits.map((kit) => (
                  <KitCard
                    key={kit.id}
                    kit={kit}
                    selected={selected}
                    setSelected={setSelected}
                    viewMode={viewMode}
                    activeOffers={activeOffers}
                    isCompared={comparedKits.some((k) => k.id === kit.id)}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {finalKits.map((kit) => (
                  <KitCard
                    key={kit.id}
                    kit={kit}
                    selected={selected}
                    setSelected={setSelected}
                    viewMode={viewMode}
                    activeOffers={activeOffers}
                    isCompared={comparedKits.some((k) => k.id === kit.id)}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* OUR BEST SELLER COMBO KITS (EPC DASHBOARD & STOREFRONT)    */}
      {/* ────────────────────────────────────────────────────────── */}
      {showBestSellers && (
        <div className="mt-14 pt-10 border-t-2 border-border/80">
          <OurBestSellerSection />
        </div>
      )}

      <MobileFiltersDrawer />
      <PincodeLocationModal isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} />

      {/* Floating Bottom Comparison Action Bar */}
      {comparedKits.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-amber-400">Comparing:</span>
            <div className="flex items-center gap-1.5">
              {comparedKits.map((kit) => (
                <span key={kit.id} className="text-xs bg-white/10 px-2.5 py-1 rounded-lg font-bold border border-white/15">
                  {kit.capacityKW} kW
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCompareDrawerOpen(true)}
              variant="primary"
              size="sm"
              leftIcon={<FiLayers size={14} />}
              className="font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md cursor-pointer"
            >
              Compare Now ({comparedKits.length})
            </Button>
            <Button
              onClick={() => setComparedKits([])}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Comparison Drawer Modal */}
      <KitComparisonDrawer
        isOpen={isCompareDrawerOpen}
        comparedKits={comparedKits}
        onClose={() => setIsCompareDrawerOpen(false)}
        onRemoveKit={(id) => setComparedKits((prev) => prev.filter((k) => k.id !== id))}
        onClearAll={() => setComparedKits([])}
      />

      {/* Selected Kit Dialog */}
      {selectedKit && (
        <Dialog isOpen={!!selectedKit} title={selectedKit.kitName} onClose={() => { setSelected(null); setSelectedKit(null); }} size="xl">
          <SelectedKitCard kit={selectedKit} initialVariantIndex={selected ? parseInt(selected.split('-')[1]) || 0 : 0} activeOffers={activeOffers} />
        </Dialog>
      )}
    </div>
  );
}
