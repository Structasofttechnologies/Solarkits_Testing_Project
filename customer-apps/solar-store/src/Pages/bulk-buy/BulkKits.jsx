import { useEffect, useState, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import BulkKitCard from "./components/BulkKitCard";
import SelectedBulkKitCard from "./components/SelectedBulkKitCard";
import BulkKitFilters, { options } from "./components/BulkKitFilters";
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
} from "react-icons/fi";
import Dropdown from "@/Components/Dropdown";
import { fetchShopHierarchy } from "../../features/slice";

export default function BulkKits() {
    const dispatch = useDispatch();
    const { bulkKits = [], shopHierarchy = [] } = useSelector((state) => state.slice);
    const [selected, setSelected] = useState(null);
    const [selectedKit, setSelectedKit] = useState(null);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("grid");
    const [expandedSections, setExpandedSections] = useState({
        capacity: true,
        panel: true,
        inverter: false,
        battery: false
    });
    const [showInStockOnly, setShowInStockOnly] = useState(false);
    const [selectedKitTypes, setSelectedKitTypes] = useState([]);

    const [filters, setFilters] = useState({
        capacityKW: "all",
        industryType: "all",
        category: "all",
        subCategory: "all",
        systemType: "all",
        subProjectType: "all",
        comboKitType: "all",
        projectRange: "all",
        pricePerKw: "all",
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

    useEffect(() => {
        if (!shopHierarchy || shopHierarchy.length === 0) {
            dispatch(fetchShopHierarchy());
        }
    }, [dispatch, shopHierarchy]);

    useEffect(() => {
        setSelectedKit(selected ? bulkKits.find((k) =>
            String(k.id) === String(selected?.split('-')[0])
        ) : null);
    }, [selected, bulkKits]);

    // Get unique kit types from data
    const comboKitTypeOptions = useMemo(() => {
        let filteredKits = bulkKits;

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

        const types = [...new Set(filteredKits.flatMap(kit =>
            kit.variants?.map(v => v.productTier) || []
        ).filter(Boolean))];

        return [
            { value: "all", text: "All Combo Kit Types" },
            ...types.map(type => ({
                value: type.toLowerCase(),
                text: type
            }))
        ];
    }, [bulkKits, filters.category, filters.subCategory, filters.systemType, filters.projectRange]);

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
        bulkKits.forEach((kit) => {
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
    }, [shopHierarchy, bulkKits]);

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

        let filteredKits = bulkKits;
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
    }, [shopHierarchy, bulkKits, filters.industryType]);

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

        let filteredKits = bulkKits;
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
    }, [shopHierarchy, bulkKits, filters.industryType, filters.category]);

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

        let filteredKits = bulkKits;
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
    }, [shopHierarchy, bulkKits, filters.industryType, filters.category, filters.subCategory]);

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

        let filteredKits = bulkKits;
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
    }, [shopHierarchy, bulkKits, filters.industryType, filters.category, filters.subCategory, filters.systemType]);

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
            default:
                return options[key] || [];
        }
    };

    const mainFilterKeys = ["industryType", "category", "subCategory", "systemType", "projectRange"];
    const subFilterKeys = ["comboKitType", "pricePerKw"];

    const clearAllFilters = () => {
        setFilters({
            capacityKW: "all",
            industryType: "all",
            category: "all",
            subCategory: "all",
            systemType: "all",
            subProjectType: "all",
            comboKitType: "all",
            projectRange: "all",
            pricePerKw: "all",
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
        setShowInStockOnly(false);
        setSelectedKitTypes([]);
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
        newFilters.capacityKW = "all";
        setFilters(newFilters);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const toggleKitType = (kitType) => {
        setSelectedKitTypes(prev =>
            prev.includes(kitType)
                ? prev.filter(t => t !== kitType)
                : [...prev, kitType]
        );
    };

    const finalKits = useMemo(() => {
        let result = [...bulkKits].filter(k =>
            k.variants?.some(v => v.bulkPack !== null && v.bulkPack !== undefined)
        );

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (k) =>
                    k.kitName?.toLowerCase().includes(term) ||
                    k.brand?.toLowerCase().includes(term) ||
                    k.usageType?.toLowerCase().includes(term) ||
                    k.description?.toLowerCase().includes(term) ||
                    k.variants?.some(v => v.productTier?.toLowerCase().includes(term))
            );
        }

        // Kit Type filter
        if (selectedKitTypes.length > 0) {
            result = result.filter(k =>
                k.variants?.some(v =>
                    selectedKitTypes.includes(v.productTier?.toLowerCase())
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
                    case "comboKitType":
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

                    case "projectRange": {
                        if (!k.projectRange) return false;
                        return String(k.projectRange.id) === String(value) || String(k.projectRange.text) === String(value) || String(k.project_range_id) === String(value);
                    }

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

                    case "capacityKW": {
                        const numVal = parseFloat(value);
                        if (!isNaN(numVal)) {
                            if (numVal >= 15) return (k.capacityKW || k.capacity || 0) >= 15;
                            return Math.abs((k.capacityKW || k.capacity || 0) - numVal) < 0.1;
                        }
                        return true;
                    }

                    case "subProjectType":
                        return k.subProjectType?.toLowerCase() === value.toLowerCase();

                    // Panel filters
                    case "panelBrand": {
                        const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
                        return panel?.brandName?.toLowerCase() === value.toLowerCase();
                    }
                    case "panelTechnology": {
                        const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
                        const tech = (panel?.technologyType || panel?.technology || "").toLowerCase().trim();
                        const val = value.toLowerCase().trim();
                        return tech === val || tech.includes(val) || val.includes(tech);
                    }
                    case "panelWattage": {
                        const panel = k.panel || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "panel"));
                        const watt = parseFloat(panel?.wattPerPanel);
                        const numVal = parseFloat(value);
                        if (!isNaN(numVal) && !isNaN(watt)) {
                            return Math.abs(watt - numVal) < 1;
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
                        const val = value.toLowerCase().trim();
                        return type === val || type.includes(val) || val.includes(type);
                    }
                    case "inverterCapacity": {
                        const inv = k.inverter || (Array.isArray(k.includedComponents) && k.includedComponents.find((c) => c.actualType === "inverter"));
                        let cap = parseFloat(inv?.capacityKW);
                        if (cap >= 100) cap = cap / 1000;
                        if (!cap) cap = parseFloat(k.capacityKW || k.capacity);
                        const numVal = parseFloat(value);
                        if (!isNaN(numVal) && !isNaN(cap)) {
                            return Math.abs(cap - numVal) < 0.1;
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
    }, [bulkKits, searchTerm, filters, showInStockOnly, selectedKitTypes]);

    const activeFiltersCount = useMemo(
        () => Object.values(filters).filter((v) => v !== "all").length +
            (showInStockOnly ? 1 : 0) +
            selectedKitTypes.length,
        [filters, showInStockOnly, selectedKitTypes]
    );

    const inStockKitsCount = useMemo(() =>
        bulkKits.filter(kit => kit.variants?.some(v => v.inStock)).length,
        [bulkKits]
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
                                    placeholder="Search bulk kits..."
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
                                            {inStockKitsCount} of {bulkKits.length} kits available
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
                                            label={key === "comboKitType" ? "Combo Kit Type" : key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                                            options={key === "comboKitType" ? getDropdownOptions(key) : options[key]}
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
                                <BulkKitFilters
                                    bulkKits={bulkKits}
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
                                Bulk Solar Kits
                            </h1>
                            <p className="text-sm lg:text-base text-white/80 mt-1">
                                Browse our large-scale solar kits for commercial & industrial projects
                            </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                            <span className="text-white font-semibold text-sm lg:text-base">
                                {finalKits.length} of {bulkKits.length} kits
                                {showInStockOnly && ` (${inStockKitsCount} in stock)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="">
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
                                placeholder="Search by kit name, brand, type..."
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
                            <div className="grid grid-cols-2 gap-4">
                                {subFilterKeys.map((key) => (
                                    <Dropdown
                                        key={key}
                                        label={key === "comboKitType" ? "Combo Kit Type" : key.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                                        options={key === "comboKitType" ? getDropdownOptions(key) : options[key]}
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
                                <BulkKitFilters
                                    bulkKits={bulkKits}
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
                                <h3 className="text-2xl font-semibold text-text-primary dark:text-info mb-2">No bulk kits found</h3>
                                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                                    {showInStockOnly
                                        ? "No in-stock bulk kits match your search criteria. Try adjusting your filters or showing all items."
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
                                    <BulkKitCard
                                        key={kit.id}
                                        kit={kit}
                                        selected={selected}
                                        setSelected={setSelected}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {finalKits.map((kit) => (
                                    <BulkKitCard
                                        key={kit.id}
                                        kit={kit}
                                        selected={selected}
                                        setSelected={setSelected}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <MobileFiltersDrawer />

            {/* Selected Kit Dialog */}
            {selectedKit && (
                <Dialog isOpen={!!selectedKit} title={selectedKit.kitName} onClose={() => setSelected(null)} size="xl">
                    <SelectedBulkKitCard kit={selectedKit} initialVariantIndex={selected ? parseInt(selected.split('-')[1]) || 0 : 0} />
                </Dialog>
            )}
        </div>
    );
}