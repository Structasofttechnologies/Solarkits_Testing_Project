import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import CustomFilePicker from "@/components/CustomFilePicker";
import CustomInput from "@/components/CustomInput";
import { useState, useMemo } from "react";
import {
    FaPlus,
    FaLayerGroup,
    FaTrash,
    FaEdit,
    FaShoppingBag,
    FaCheckCircle,
    FaChevronRight,
    FaChevronDown,
    FaInfoCircle,
    FaUserShield,
} from "react-icons/fa";
import SkuSpecsLink from "./SkuSpecsLink";
import PopupDataLoader from "@/components/PopupDataLoader";

const DEFAULT_KIT_COVER_FALLBACK = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

const resolveKitCoverUrl = (url, apiUrl) => {
    if (!url) return DEFAULT_KIT_COVER_FALLBACK;
    if (url.includes("localhost:3001")) {
        return url.replace("localhost:3001", "localhost:5000");
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }
    const base = (apiUrl || "http://localhost:5000").replace(/\/admin-api|\/api/g, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${base}${cleanPath}`;
};

export default function ComboKitFormDrawer({
    variantConfigs = [],
    currencySymbol = "₹",
    showDrawer,
    setShowDrawer,
    editingKit,
    handleSave,
    loadingForm,
    loadingDrawerData,
    formData,
    handleFormChange,
    masterKitOptions,
    projectRangeOptions,
    selectedSolarKitObj,
    selectedProjectRange,
    isCapacityOutOfRange,
    setKitImageFile,
    kitImageFile,
    API_URL,
    getFilteredSkusForComponent,
    baseComponentSkus,
    templateBrands,
    getTemplateUnitSymbol,
    handleBaseBrandChange,
    handleBaseSkuChange,
    setFormData,
    setBaseComponentSkus,
    setBosComponentSkus,
    setSkuDetailsCache,
    setTemplateBrands,
    setSubtypeBrands,
    toggleSection,
    isSectionOpen,
    bosBrandOptions,
    handleBosGroupBrandChange,
    bosImageFiles,
    setBosImageFiles,
    handleBosItemBrandChange,
    getFilteredBosSkus,
    bosComponentSkus,
    handleAddBosItemRow,
    handleRemoveBosItemRow,
    skuDetailsCache,
    fetchSkuDetails,
    setActiveViewingSku,
    dispatch,
    setAlert,
    subtypeBrands,
    isSubtypeMicroInverter,
    isSubtypeRegularInverter,
    countryName,
    brands = [],
}) {
    const [filterInfoData, setFilterInfoData] = useState(null);
    const [orderQtyInput, setOrderQtyInput] = useState("");
    const [looseQtyInput, setLooseQtyInput] = useState("");

    const comboKitBrandOptions = useMemo(() => {
        return (brands || []).map((b) => ({
            text: b.name || b.brand_name,
            value: b.id || b._id,
        }));
    }, [brands]);

    const matchingVariantConfig = useMemo(() => {
        if (!selectedSolarKitObj || !formData.project_range_id || !variantConfigs?.length) return null;

        const kCat = selectedSolarKitObj.category_id?._id || selectedSolarKitObj.category_id?.id || selectedSolarKitObj.category_id;
        const kSub = selectedSolarKitObj.subcategory_id?._id || selectedSolarKitObj.subcategory_id?.id || selectedSolarKitObj.subcategory_id;
        const kType = selectedSolarKitObj.type_id?._id || selectedSolarKitObj.type_id?.id || selectedSolarKitObj.type_id;
        const kRange = formData.project_range_id;

        return variantConfigs.find((config) => {
            const cCat = config.category_id?._id || config.category_id?.id || config.category_id;
            const cSub = config.subcategory_id?._id || config.subcategory_id?.id || config.subcategory_id;
            const cType = config.type_id?._id || config.type_id?.id || config.type_id;
            const cRange = config.project_range_id?._id || config.project_range_id?.id || config.project_range_id;

            return (
                String(cCat) === String(kCat) &&
                String(cSub) === String(kSub) &&
                String(cType) === String(kType) &&
                String(cRange) === String(kRange)
            );
        });
    }, [selectedSolarKitObj, formData.project_range_id, variantConfigs]);

    const variantOptions = useMemo(() => {
        if (!matchingVariantConfig?.variants) return [];
        return matchingVariantConfig.variants.map((v) => ({
            text: `${v.name} (Upgrade: ${currencySymbol}${v.additional_price} | Retail Worth: ${currencySymbol}${v.worth_price})`,
            value: v.id || v._id
        }));
    }, [matchingVariantConfig, currencySymbol]);

    const getSkuPower = (sku) => {
        if (!sku?.attributes?.length) return null;
        let a = sku.attributes.find(attr => attr.is_sku || attr.is_capacity || attr.attribute_type === "sku" || attr.attribute_type === "capacity");
        if (!a) a = sku.attributes.find(attr => {
            const n = (attr.attribute_name || attr.name || "").toLowerCase();
            return n.includes("ac capacity") || n.includes("capacity") || n.includes("power") || n.includes("pmax") || n.includes("watt");
        });
        if (!a) return null;
        const raw = parseFloat(a.value_number ?? a.value_text ?? a.value_raw ?? 0);
        if (isNaN(raw) || raw === 0) return null;
        return raw;
    };

    const getSkuTolerance = (sku) => {
        if (!sku?.attributes?.length) return null;
        let a = sku.attributes.find(attr =>
            attr.is_tolerance || attr.attribute_type === "tolerance" || attr.attribute_type === "tollarance" || attr.attribute_type === "tolarance"
        );
        if (!a) a = sku.attributes.find(attr => (attr.attribute_name || attr.name || "").toLowerCase().includes("tolerance"));
        if (!a) return null;
        const v = parseFloat(a.value_number ?? a.value_text ?? a.value_raw);
        return isNaN(v) ? null : v;
    };

    const getSkuPhase = (sku) => {
        if (!sku?.attributes?.length) return null;
        const phaseAttr = sku.attributes.find(attr =>
            attr.attribute_type === "phase" ||
            (attr.subtype_attribute_id &&
                (attr.subtype_attribute_id.attribute_type === "phase" ||
                    (attr.subtype_attribute_id.name || "").toLowerCase().trim() === "phase")) ||
            (attr.attribute_name || "").toLowerCase().trim() === "phase"
        );
        if (!phaseAttr) return null;
        const val = (phaseAttr.value_text || phaseAttr.value_number || phaseAttr.value_raw || "").toString().toLowerCase().trim();
        if (val.includes("1") || val.includes("single") || val.includes("spn")) return "1";
        if (val.includes("3") || val.includes("three") || val.includes("tpn") || val.includes("triple")) return "3";
        return val;
    };

    const getPanelWattPerPanel = () => {
        const panelBcIdx = formData.base_components.findIndex(bc => bc.name?.toLowerCase().includes("panel"));
        if (panelBcIdx === -1) return null;
        const panelBc = formData.base_components[panelBcIdx];
        if (!panelBc?.sku_id) return null;
        const panelSku = skuDetailsCache[panelBc.sku_id] ||
            (baseComponentSkus[panelBcIdx] || []).find(s => (s.id || s._id || s.value) === panelBc.sku_id);
        if (!panelSku) return null;
        // getSkuPower in the drawer returns raw value (Watts) directly — no unit conversion needed
        return getSkuPower(panelSku);
    };

    const getPanelCount = () => {
        const panelBc = formData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"));
        return parseInt(panelBc?.quantity || 0) || 0;
    };

    const getSkuMinInputWatt = (sku) => {
        if (!sku?.attributes?.length) return null;
        const a = sku.attributes.find(attr => {
            const n = (attr.attribute_name || attr.name || "").toLowerCase();
            return (n.includes("minimum") && (n.includes("watt") || n.includes("input"))) ||
                (n.includes("min") && n.includes("panel") && n.includes("power"));
        });
        if (!a) return null;
        const v = parseFloat(a.value_number ?? a.value_text ?? a.value_raw);
        if (!isNaN(v)) {
            const unit = (a.unit_symbol || "").toLowerCase();
            if (unit === "kw") return v * 1000;
            return v;
        }
        return null;
    };

    const getSkuMaxInputWatt = (sku) => {
        if (!sku?.attributes?.length) return null;
        const a = sku.attributes.find(attr => {
            const n = (attr.attribute_name || attr.name || "").toLowerCase();
            return (n.includes("maximum") && (n.includes("watt") || n.includes("input"))) ||
                (n.includes("max") && n.includes("panel") && (n.includes("power") || n.includes("watt")));
        });
        if (!a) return null;
        const v = parseFloat(a.value_number ?? a.value_text ?? a.value_raw);
        if (!isNaN(v)) {
            const unit = (a.unit_symbol || "").toLowerCase();
            if (unit === "kw") return v * 1000;
            return v;
        }
        return null;
    };

    const handleShowBaseComponentFilters = (bc, idx) => {
        const isMicro = typeof isSubtypeMicroInverter === "function" && isSubtypeMicroInverter(bc);
        const isRegular = typeof isSubtypeRegularInverter === "function" && isSubtypeRegularInverter(bc);
        const isPanel = bc.name?.toLowerCase().includes("panel");

        // Resolve brand name
        const subKey = (bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id)?.toString();
        const templateKey = (bc.template_id?._id || bc.template_id?.id || bc.template_id)?.toString();
        let brandsList = [];
        if (subKey && subtypeBrands && subtypeBrands[subKey]) {
            brandsList = subtypeBrands[subKey];
        } else if (templateKey && templateBrands && templateBrands[templateKey]) {
            brandsList = templateBrands[templateKey];
        }
        const selectedBrandObj = (brandsList || []).find(b => String(b.id || b._id || b.brand_id) === String(bc.brand_id));
        const brandName = selectedBrandObj ? (selectedBrandObj.name || selectedBrandObj.brand_name) : null;

        const allSkus = baseComponentSkus[idx] || [];
        const totalCount = allSkus.length;

        // 1. Brand Filter
        let brandFiltered = allSkus;
        if (bc.brand_id) {
            brandFiltered = allSkus.filter(s => {
                const bId = s.brand_id?._id || s.brand_id;
                return bId && String(bId) === String(bc.brand_id);
            });
        }
        const brandCount = brandFiltered.length;

        // 2. Component Specific Filters
        const criteria = [];
        criteria.push({
            title: "Brand Manufacturer Filter",
            desc: brandName
                ? `Only showing SKUs manufactured by ${brandName}.`
                : "No brand manufacturer selected. Showing SKUs from all allowed brands for this component.",
            value: brandName ? `Brand: "${brandName}"` : null,
            active: !!brandName
        });

        let techFiltered = brandFiltered;
        let isFallbackApplied = false;

        if (isPanel) {
            criteria.push({
                title: "Solar Panel Template Filter",
                desc: "Showing all available solar panel SKUs. The selected panel's power rating will drive the auto-calculation of the system capacity and the micro-inverter quantity.",
                active: true
            });
        } else if (isMicro) {
            const panelWatt = getPanelWattPerPanel();
            techFiltered = brandFiltered.filter(s => {
                if (panelWatt !== null) {
                    const minW = getSkuMinInputWatt(s);
                    const maxW = getSkuMaxInputWatt(s);
                    if (minW !== null && panelWatt < minW) return false;
                    if (maxW !== null && panelWatt > maxW) return false;
                }
                return true;
            });

            if (techFiltered.length === 0 && (panelWatt !== null || getPanelCount() > 0)) {
                techFiltered = brandFiltered;
                isFallbackApplied = true;
            }

            // Gather min/max watt range across all matched micro-inverter SKUs
            const minWatts = techFiltered
                .map(s => getSkuMinInputWatt(s))
                .filter(v => v !== null);
            const maxWatts = techFiltered
                .map(s => getSkuMaxInputWatt(s))
                .filter(v => v !== null);
            const overallMin = minWatts.length > 0 ? Math.min(...minWatts) : null;
            const overallMax = maxWatts.length > 0 ? Math.max(...maxWatts) : null;

            criteria.push({
                title: "Solar Panel Wattage Compatibility",
                desc: panelWatt
                    ? `Matching micro-inverter SKUs whose input watt range covers the selected solar panel's wattage (${panelWatt}W). SKUs whose Min Panel Power is greater than ${panelWatt}W or whose Max Panel Power is less than ${panelWatt}W are excluded.`
                    : "No solar panel SKU selected yet. Wattage compatibility filter is currently inactive.",
                value: panelWatt
                    ? `Solar Panel Wattage: ${panelWatt}W${overallMin !== null || overallMax !== null ? ` | Inverter Input Range: ${overallMin ?? "?"} – ${overallMax ?? "?"}W` : ""}`
                    : null,
                active: !!panelWatt
            });
            criteria.push({
                title: "No Matching SKU Fallback",
                desc: "If no micro-inverters are compatible with the selected panel's wattage, the system automatically falls back to showing all SKUs to avoid blocking selection.",
                active: isFallbackApplied
            });
        } else if (isRegular) {
            const targetTol = parseFloat(formData.inverter_tolerance || 10);
            const mode = formData.inverter_mode || "single";
            const qty = mode === "single" ? 1 : parseFloat(bc.quantity || 2) || 2;
            const targetCapacity = formData.capacity ? (formData.capacity / qty) : null;

            techFiltered = brandFiltered.filter(s => {
                const skuTol = getSkuTolerance(s);
                // Allow only SKUs with exact matching tolerance, or no tolerance attribute
                if (skuTol !== null && Number(skuTol) !== Number(targetTol)) {
                    return false;
                }
                const tol = skuTol !== null ? Number(skuTol) : targetTol;
                if (formData.capacity) {
                    const power = getSkuPower(s);
                    if (power === null) return true;
                    const targetCapacity = formData.capacity / qty;
                    const minPower = power * (1 - tol / 100);
                    const maxPower = power * (1 + tol / 100);
                    return targetCapacity >= minPower && targetCapacity <= maxPower;
                }
                return true;
            });

            if (techFiltered.length === 0 && formData.capacity) {
                techFiltered = brandFiltered;
                isFallbackApplied = true;
            }

            criteria.push({
                title: "Tolerance Match",
                desc: `Only showing inverter SKUs whose tolerance rating exactly matches the selected tolerance (${targetTol}%). SKUs with a different tolerance value are excluded.`,
                value: `Inverter Tolerance: ${targetTol}%`,
                active: true
            });

            criteria.push({
                title: "Capacity and Load Compatibility",
                desc: targetCapacity
                    ? `Matching inverter SKUs whose rated power output matches the system target capacity per inverter (${targetCapacity.toFixed(2)} kW) within their own tolerance rating.`
                    : "System capacity is not calculated yet (requires solar panels and quantity). Capacity filter is currently inactive.",
                value: targetCapacity
                    ? `Required Inverter Power: ${(targetCapacity / (1 + targetTol / 100)).toFixed(2)} kW to ${(targetCapacity / (1 - targetTol / 100)).toFixed(2)} kW`
                    : null,
                active: !!targetCapacity
            });
            criteria.push({
                title: "No Matching SKU Fallback",
                desc: "If no inverters match the capacity range or tolerance filters, the system automatically falls back to showing all SKUs to avoid blocking selection.",
                active: isFallbackApplied
            });
        }

        const finalCount = techFiltered.length;

        setFilterInfoData({
            name: `${bc.name} ${bc.subtype_name ? `(${bc.subtype_name})` : ""}`,
            description: `Filter conditions applied to fetch valid SKUs for the base component: ${bc.name}.`,
            criteria,
            summary: {
                totalCount,
                brandCount,
                finalCount,
                isFallbackApplied,
                filters: {
                    brand: brandName || "All Brands / None Selected",
                    panelWatt: isMicro ? (getPanelWattPerPanel() ? `${getPanelWattPerPanel()} W` : null) : null,
                    targetTolerance: isRegular ? `${formData.inverter_tolerance || 10}%` : null,
                    targetCapacity: isRegular ? (formData.capacity ? `${(formData.capacity / (formData.inverter_mode === "single" ? 1 : (bc.quantity || 2))).toFixed(2)} kW` : null) : null,
                }
            }
        });
    };

    const handleShowBosComponentFilters = (bk, item, groupIdx, itemIdx) => {
        const bosGroupBrandId = bk.brand_id;
        const itemBrandId = item.brand_id || bosGroupBrandId;

        // Resolve brand
        let brandName = null;
        if (itemBrandId) {
            const subKey = (item.subtype_ids || []).map(st => st?._id || st?.id || st).filter(Boolean).join(",");
            const brandsList = (subKey && subtypeBrands && subtypeBrands[subKey])
                ? subtypeBrands[subKey]
                : (templateBrands[(item.template_id?.id || item.template_id?._id || item.template_id)?.toString()] || []);
            const selectedBrandObj = (brandsList || []).find(b => String(b.id || b._id || b.brand_id) === String(itemBrandId));
            if (selectedBrandObj) {
                brandName = selectedBrandObj.name || selectedBrandObj.brand_name;
            }
        }

        const cacheKey = `${groupIdx}_${itemIdx}`;
        const rawOptions = bosComponentSkus[cacheKey] || [];
        const totalCount = rawOptions.length;

        // 1. Uniqueness Filter Step
        const currentTemplateId = (item.template_id?.id || item.template_id?._id || item.template_id)?.toString();
        const selectedSkus = bk.items
            .filter((it, idx) => {
                if (idx === itemIdx) return false;
                const itTemplateId = (it.template_id?.id || it.template_id?._id || it.template_id)?.toString();
                return itTemplateId === currentTemplateId;
            })
            .map(it => it.sku_id)
            .filter(Boolean);

        let uniqFiltered = rawOptions;
        if (selectedSkus.length > 0) {
            uniqFiltered = uniqFiltered.filter(opt => !selectedSkus.includes(opt.value));
        }
        const uniqCount = uniqFiltered.length;

        const criteria = [];

        // 1. Brand Filter
        criteria.push({
            title: "BOS Brand Filter",
            desc: brandName
                ? `Only showing SKUs manufactured by ${brandName} (inherited from ${item.brand_id ? 'item' : 'BOS group'} configuration).`
                : "No brand manufacturer selected. Showing SKUs from all allowed brands.",
            value: brandName ? `Brand: "${brandName}"` : null,
            active: !!brandName
        });

        // 2. Uniqueness Filter
        criteria.push({
            title: "Row Uniqueness (No Duplicates)",
            desc: selectedSkus.length > 0
                ? `Excluding already selected SKUs in this BOS group to prevent duplicate selection of the same product.`
                : "No other items of the same type are configured in this group yet. Uniqueness filter is inactive.",
            value: selectedSkus.length > 0 ? `Excluded SKU count: ${selectedSkus.length}` : null,
            active: selectedSkus.length > 0
        });

        // 3. ACDB Phase filter
        let phaseFiltered = uniqFiltered;
        let isAcdb = item.name?.toLowerCase().includes("acdb") || item.template_id?.name?.toLowerCase().includes("acdb");
        let inverterPhase = null;
        let isFallbackApplied = false;

        if (isAcdb) {
            const inverterBc = formData.base_components.find(bc =>
                bc.name?.toLowerCase().includes("inverter")
            );
            if (inverterBc?.sku_id) {
                const inverterIdx = formData.base_components.findIndex(bc =>
                    bc.name?.toLowerCase().includes("inverter")
                );
                const skus = baseComponentSkus[inverterIdx] || [];
                const inverterSku = skus.find(s => (s.id || s._id) === inverterBc.sku_id || s.value === inverterBc.sku_id);
                if (inverterSku) {
                    const inverterPhaseVal = getSkuPhase(inverterSku);
                    if (inverterPhaseVal) {
                        inverterPhase = inverterPhaseVal === "1" ? "1 (Single Phase)" : "3 (Three Phase)";
                    }
                }
            }

            if (inverterPhase) {
                const phaseValStr = inverterPhase.includes("1") ? "1" : "3";
                phaseFiltered = uniqFiltered.filter(opt => {
                    const acdbPhase = getSkuPhase(opt);
                    return acdbPhase === phaseValStr;
                });

                if (phaseFiltered.length === 0) {
                    phaseFiltered = uniqFiltered;
                    isFallbackApplied = true;
                }
            }

            criteria.push({
                title: "ACDB Phase Synchronisation",
                desc: inverterPhase
                    ? `Only matching ACDB SKUs that have the same phase classification as the selected Inverter (${inverterPhase}).`
                    : "No system inverter selected or phase is undetermined. Phase compatibility filter is currently inactive.",
                value: inverterPhase ? `Required Phase: ${inverterPhase}` : null,
                active: !!inverterPhase
            });
            criteria.push({
                title: "Phase Compatibility Fallback",
                desc: "If no phase-compatible ACDB SKUs are found, the system automatically falls back to showing all SKUs to avoid blocking selection.",
                active: isFallbackApplied
            });
        }

        const finalCount = phaseFiltered.length;

        setFilterInfoData({
            name: `${item.name} (BOS Component)`,
            description: `Filter conditions applied to fetch valid SKUs for the Balance of System (BOS) item: ${item.name}.`,
            criteria,
            summary: {
                totalCount,
                brandCount: totalCount, // Fetched options from API are already brand-filtered
                finalCount,
                isFallbackApplied,
                filters: {
                    brand: brandName || "Inherited / Not Selected",
                    duplicateExclusions: selectedSkus.length > 0 ? selectedSkus.length : null,
                    inverterPhase: isAcdb ? inverterPhase : null,
                }
            }
        });
    };

    return (
        <Dialog
            isOpen={showDrawer}
            onClose={() => setShowDrawer(false)}
            title={
                editingKit
                    ? "Edit Configured Combo Kit"
                    : "Configure Combo Kit"
            }
            size="xl"
        >
            {loadingDrawerData ? (
                <PopupDataLoader text={editingKit ? "Loading Combo Kit details..." : "Restoring Combo Kit draft..."} />
            ) : (
                <form onSubmit={handleSave} className="space-y-8 p-1">
                    <div className="space-y-6">
                        <section className="rounded-2xl border border-border bg-surface-hover/20 p-5 space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                                    <FaEdit size={14} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                    Combo Kit Details
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <CustomInput
                                    label="Combo Kit Name"
                                    placeholder="e.g. 5kW System"
                                    value={formData.name}
                                    onChange={(e) => handleFormChange("name", e.target.value)}
                                    required
                                />
                                <div className="space-y-1.5">
                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                        Combo Kit Brand *
                                    </label>
                                    <DropdownWithSearchInput
                                        options={comboKitBrandOptions}
                                        value={formData.brand_id}
                                        onChange={(val) => handleFormChange("brand_id", val)}
                                        placeholder="Select Combo Kit Manufacturer Brand"
                                        required
                                    />
                                </div>
                                <CustomInput
                                    type="textarea"
                                    label="Description"
                                    placeholder="Describe technical specs, warranty information, etc."
                                    value={formData.description}
                                    onChange={(e) =>
                                        handleFormChange("description", e.target.value)
                                    }
                                />
                            </div>
                        </section>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="rounded-2xl border border-border bg-surface-hover/20 p-5 space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600">
                                        <FaShoppingBag size={14} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                        Solar Kit Definition Blueprint
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                            Master Solar Kit
                                        </label>
                                        <DropdownWithSearchInput
                                            options={masterKitOptions}
                                            value={formData.solar_kit_id}
                                            onChange={(val) => handleFormChange("solar_kit_id", val)}
                                            placeholder="Select Master Solar Kit Definition"
                                            disabled={!!editingKit}
                                        />
                                    </div>
                                    {selectedSolarKitObj && (
                                        <div className="space-y-1.5">
                                            <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                                Matched Project Range
                                            </label>
                                            <DropdownWithSearchInput
                                                options={projectRangeOptions}
                                                value={formData.project_range_id}
                                                onChange={(val) =>
                                                    handleFormChange("project_range_id", val)
                                                }
                                                placeholder="Select Project Range"
                                            />
                                        </div>
                                    )}
                                    {matchingVariantConfig && variantOptions.length > 0 && (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                            <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                                Assign Variants
                                            </label>
                                            <MultiSelectDropdownWithSearchInput
                                                options={variantOptions}
                                                values={formData.variant_ids || []}
                                                onChange={(val) =>
                                                    handleFormChange("variant_ids", val)
                                                }
                                                placeholder="Select Variants to Assign"
                                            />
                                            {(formData.variant_ids || []).map((vId) => {
                                                const selectedVariant = matchingVariantConfig?.variants?.find(
                                                    (v) => String(v.id || v._id) === String(vId)
                                                );
                                                if (!selectedVariant) return null;
                                                return (
                                                    <div key={vId} className="mt-2 p-3 bg-surface-hover border border-border/80 rounded-xl space-y-2">
                                                        <div className="flex items-center justify-between border-b border-border/30 pb-1.5">
                                                            <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">
                                                                {selectedVariant.name} Variant Benefits
                                                            </span>
                                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                                {selectedVariant.additional_features?.length || 0} Benefits
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                                            {(selectedVariant.additional_features || []).map((feature, fIdx) => {
                                                                const isObj = typeof feature === "object" && feature !== null;
                                                                const name = isObj ? feature.name : String(feature);
                                                                const price = isObj ? feature.price : 0;
                                                                const isFree = isObj ? feature.is_free : true;
                                                                const desc = isObj ? feature.description : "";
                                                                return (
                                                                    <div key={fIdx} className="text-xs flex flex-col gap-0.5 border-b border-border/10 last:border-0 pb-1.5 last:pb-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-emerald-500' : 'bg-primary'}`} />
                                                                            <span className="font-bold text-[11px] text-text-primary">{name}</span>
                                                                            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${isFree ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10' : 'bg-primary/10 text-primary border border-primary/10'}`}>
                                                                                {isFree ? `Free (${currencySymbol}${price})` : `${currencySymbol}${price}`}
                                                                            </span>
                                                                        </div>
                                                                        {desc && (
                                                                            <span className="text-[10px] text-text-muted pl-3 leading-tight">{desc}</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(!selectedVariant.additional_features || selectedVariant.additional_features.length === 0) && (
                                                                <p className="text-[10px] text-text-muted italic py-1 pl-1">No additional features configured for this variant.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedSolarKitObj && (
                                <div className="rounded-2xl border border-border bg-surface-hover/20 p-5 space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600">
                                            <FaLayerGroup size={14} />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                            Tolerance & Cover
                                        </h3>
                                    </div>
                                    <div className="space-y-4">
                                        {!(formData.base_components || []).some(bc =>
                                            typeof isSubtypeMicroInverter === "function" && isSubtypeMicroInverter(bc)
                                        ) && (
                                                <CustomInput
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    label="Tolerance (%)"
                                                    value={formData.inverter_tolerance}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleFormChange(
                                                            "inverter_tolerance",
                                                            val === "" ? "" : parseInt(val)
                                                        );
                                                    }}
                                                />
                                            )}
                                        <div
                                            className={`rounded-xl border px-4 py-3 transition-colors duration-200 ${isCapacityOutOfRange
                                                ? "border-rose-500/20 bg-rose-500/5"
                                                : "border-amber-500/20 bg-amber-500/5"
                                                }`}
                                        >
                                            <p
                                                className={`text-[9px] font-black uppercase tracking-widest ${isCapacityOutOfRange ? "text-rose-700" : "text-amber-700"
                                                    }`}
                                            >
                                                {isCapacityOutOfRange
                                                    ? "Capacity Out of Range"
                                                    : "Auto-Calculated Capacity"}
                                            </p>
                                            <p
                                                className={`mt-0.5 text-base font-black ${isCapacityOutOfRange ? "text-rose-700" : "text-amber-700"
                                                    }`}
                                            >
                                                {formData.capacity || 0}{" "}
                                                <span className="text-xs font-bold">kW</span>
                                            </p>
                                            {isCapacityOutOfRange && selectedProjectRange ? (
                                                <p className="mt-0.5 text-[9px] font-semibold text-rose-600">
                                                    Must be between {selectedProjectRange.min_value} -{" "}
                                                    {selectedProjectRange.max_value}{" "}
                                                    {selectedProjectRange.unit_symbol ||
                                                        selectedProjectRange.unit_id?.symbol ||
                                                        "kW"}
                                                </p>
                                            ) : (
                                                <p className="mt-0.5 text-[9px] text-text-muted">
                                                    Panels × SKU power rating
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-3 border-t border-border pt-4">
                                            <CustomFilePicker
                                                label="Upload Kit Cover Image *"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) setKitImageFile(file);
                                                }}
                                            />
                                            {kitImageFile ? (
                                                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                                                    <img
                                                        src={URL.createObjectURL(kitImageFile)}
                                                        alt="Preview"
                                                        className="h-14 w-14 rounded-lg object-cover border border-emerald-500/20 shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                                                            <FaCheckCircle size={10} /> New Image Selected
                                                        </div>
                                                        <p className="text-[10px] text-emerald-600 font-semibold truncate mt-0.5">{kitImageFile.name}</p>
                                                        <p className="text-[9px] text-emerald-500/70 mt-0.5">{(kitImageFile.size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                </div>
                                            ) : formData.kit_image ? (
                                                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                                                    <img
                                                        src={resolveKitCoverUrl(formData.kit_image, API_URL)}
                                                        alt="Current Kit Cover"
                                                        className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = DEFAULT_KIT_COVER_FALLBACK;
                                                        }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Current Cover Image</p>
                                                        <p className="text-[10px] text-text-secondary font-semibold mt-0.5 truncate">Upload a new image to replace</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] italic text-text-muted">
                                                    No cover image uploaded.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── PO ORDER QUANTITY OPTIONS SECTION ─────────────────────────── */}
                    <section className="rounded-2xl border border-border bg-surface-hover/20 p-5 space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <div className="rounded-lg bg-orange-500/10 p-1.5 text-orange-600">
                                <FaShoppingBag size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                    PO Order Quantity Options (Kits)
                                </h3>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    Define kit batch sizes for Purchase Orders (PO Orders). These exact quantities will be displayed in the Store &amp; Reseller PO modal (/po-order).
                                </p>
                            </div>
                        </div>

                        {/* Quick Preset Chips */}
                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                Quick Add Presets
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[10, 25, 50, 100, 200, 500].map((preset) => {
                                    const alreadyAdded = (formData.order_quantities || []).includes(preset);
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            disabled={alreadyAdded}
                                            onClick={() => {
                                                if (!alreadyAdded) {
                                                    const updated = [...(formData.order_quantities || []), preset].sort((a, b) => a - b);
                                                    handleFormChange("order_quantities", updated);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all duration-150 
                                                ${alreadyAdded
                                                    ? "bg-orange-500/10 text-orange-700 border-orange-500/30 cursor-not-allowed opacity-60"
                                                    : "bg-surface border-border text-text-secondary hover:bg-orange-500/10 hover:text-orange-700 hover:border-orange-500/30 cursor-pointer"
                                                }`}
                                        >
                                            {alreadyAdded ? `✓ ${preset} Kits` : `+ ${preset} Kits`}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Qty Input */}
                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                Add Custom PO Quantity
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="99999"
                                    value={orderQtyInput}
                                    onChange={(e) => setOrderQtyInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = parseInt(orderQtyInput);
                                            if (!isNaN(val) && val > 0 && !(formData.order_quantities || []).includes(val)) {
                                                const updated = [...(formData.order_quantities || []), val].sort((a, b) => a - b);
                                                handleFormChange("order_quantities", updated);
                                                setOrderQtyInput("");
                                            }
                                        }
                                    }}
                                    placeholder="e.g. 150"
                                    className="flex-1 h-10 px-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const val = parseInt(orderQtyInput);
                                        if (!isNaN(val) && val > 0 && !(formData.order_quantities || []).includes(val)) {
                                            const updated = [...(formData.order_quantities || []), val].sort((a, b) => a - b);
                                            handleFormChange("order_quantities", updated);
                                            setOrderQtyInput("");
                                        }
                                    }}
                                    className="h-10 px-4 bg-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <FaPlus size={11} /> Add
                                </button>
                            </div>
                        </div>

                        {/* Configured Quantities Display */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                    Configured PO Quantities ({(formData.order_quantities || []).length})
                                </label>
                                {(formData.order_quantities || []).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleFormChange("order_quantities", [])}
                                        className="text-[9px] text-rose-500 font-black uppercase tracking-wider hover:text-rose-700 transition-colors cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {(formData.order_quantities || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                                    {[...(formData.order_quantities || [])].sort((a, b) => a - b).map((qty, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-1.5 bg-orange-500/10 text-orange-700 border border-orange-500/25 px-3 py-1 rounded-full group"
                                        >
                                            <span className="text-[11px] font-black">{qty} Kits</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = (formData.order_quantities || []).filter(q => q !== qty);
                                                    handleFormChange("order_quantities", updated);
                                                }}
                                                className="w-3.5 h-3.5 rounded-full bg-orange-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors text-orange-700 cursor-pointer"
                                                title={`Remove ${qty} Kits`}
                                            >
                                                <FaTrash size={7} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-border bg-surface-hover/5 text-center">
                                    <p className="text-[11px] text-text-muted italic">
                                        No PO quantity options set — standard +/- counter will be displayed in store/PO modal
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ─── LOOSE ORDER QUANTITY OPTIONS SECTION ─────────────────────── */}
                    <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <div className="rounded-lg bg-sky-500/10 p-1.5 text-sky-600">
                                <FaLayerGroup size={14} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                    Loose Order Quantity Options (Kits)
                                </h3>
                                <p className="text-[10px] text-text-muted mt-0.5">
                                    Define flexible quantities for Loose Orders. These variations will be displayed in the Reseller Loose Order portal (/loose-order) Step 2.
                                </p>
                            </div>
                        </div>

                        {/* Quick Preset Chips */}
                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                Quick Add Presets
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[5, 10, 15, 20, 25, 30, 50, 100].map((preset) => {
                                    const alreadyAdded = (formData.loose_order_quantities || []).includes(preset);
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            disabled={alreadyAdded}
                                            onClick={() => {
                                                if (!alreadyAdded) {
                                                    const updated = [...(formData.loose_order_quantities || []), preset].sort((a, b) => a - b);
                                                    handleFormChange("loose_order_quantities", updated);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all duration-150 
                                                ${alreadyAdded
                                                    ? "bg-sky-500/15 text-sky-800 border-sky-500/35 cursor-not-allowed opacity-60"
                                                    : "bg-surface border-border text-text-secondary hover:bg-sky-500/10 hover:text-sky-700 hover:border-sky-500/30 cursor-pointer"
                                                }`}
                                        >
                                            {alreadyAdded ? `✓ ${preset} Kits` : `+ ${preset} Kits`}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Loose Qty Input */}
                        <div className="space-y-2">
                            <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                Add Custom Loose Quantity
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="99999"
                                    value={looseQtyInput}
                                    onChange={(e) => setLooseQtyInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            const val = parseInt(looseQtyInput);
                                            if (!isNaN(val) && val > 0 && !(formData.loose_order_quantities || []).includes(val)) {
                                                const updated = [...(formData.loose_order_quantities || []), val].sort((a, b) => a - b);
                                                handleFormChange("loose_order_quantities", updated);
                                                setLooseQtyInput("");
                                            }
                                        }
                                    }}
                                    placeholder="e.g. 75"
                                    className="flex-1 h-10 px-4 bg-surface border-2 border-border focus:border-sky-500 rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const val = parseInt(looseQtyInput);
                                        if (!isNaN(val) && val > 0 && !(formData.loose_order_quantities || []).includes(val)) {
                                            const updated = [...(formData.loose_order_quantities || []), val].sort((a, b) => a - b);
                                            handleFormChange("loose_order_quantities", updated);
                                            setLooseQtyInput("");
                                        }
                                    }}
                                    className="h-10 px-4 bg-sky-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-sky-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <FaPlus size={11} /> Add
                                </button>
                            </div>
                        </div>

                        {/* Configured Loose Quantities Display */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                    Configured Loose Quantities ({(formData.loose_order_quantities || []).length})
                                </label>
                                {(formData.loose_order_quantities || []).length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleFormChange("loose_order_quantities", [])}
                                        className="text-[9px] text-rose-500 font-black uppercase tracking-wider hover:text-rose-700 transition-colors cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {(formData.loose_order_quantities || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-sky-500/5 border border-sky-500/15">
                                    {[...(formData.loose_order_quantities || [])].sort((a, b) => a - b).map((qty, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-1.5 bg-sky-500/10 text-sky-800 border border-sky-500/25 px-3 py-1 rounded-full group"
                                        >
                                            <span className="text-[11px] font-black">{qty} Kits</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = (formData.loose_order_quantities || []).filter(q => q !== qty);
                                                    handleFormChange("loose_order_quantities", updated);
                                                }}
                                                className="w-3.5 h-3.5 rounded-full bg-sky-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors text-sky-800 cursor-pointer"
                                                title={`Remove ${qty} Kits`}
                                            >
                                                <FaTrash size={7} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-border bg-surface-hover/5 text-center">
                                    <p className="text-[11px] text-text-muted italic">
                                        No loose quantity options set — /loose-order will display default presets (5, 10, 15, 20, 25, 30, 50 Kits)
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECTION: Trial Kits Order Configuration */}
                    <section className="bg-surface-hover/30 border border-border p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.allow_trial_kit ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-surface border border-border text-text-muted'}`}>
                                    <FaShoppingBag size={14} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                                        Trial Kits Order Configuration
                                    </h3>
                                    <p className="text-[10px] text-text-muted mt-0.5">
                                        Enable a dedicated trial batch order button for EPCs with dynamic pincode delivery freight calculation.
                                    </p>
                                </div>
                            </div>
                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.allow_trial_kit)}
                                    onChange={(e) => handleFormChange("allow_trial_kit", e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {formData.allow_trial_kit && (
                            <div className="pt-2 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                                        Number of Trial Kits Order (X)
                                    </label>
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Active: {formData.trial_kit_quantity || 10} Kits
                                    </span>
                                </div>

                                {/* Quick Presets */}
                                {/* <div className="flex flex-wrap gap-2">
                                    {[5, 10, 15, 20, 25, 50].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => handleFormChange("trial_kit_quantity", preset)}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${Number(formData.trial_kit_quantity || 10) === preset
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                : "bg-surface border-border text-text-secondary hover:border-emerald-500/30 hover:text-emerald-600"
                                                }`}
                                        >
                                            {preset} Kits {preset === 10 ? "(Recommended)" : ""}
                                        </button>
                                    ))}
                                </div> */}

                                {/* Custom Trial Qty Input */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="9999"
                                        value={formData.trial_kit_quantity || 10}
                                        onChange={(e) => handleFormChange("trial_kit_quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-32 h-10 px-3 bg-surface border-2 border-border focus:border-emerald-500 rounded-xl text-xs font-bold text-text-primary outline-none transition-colors"
                                        placeholder="10"
                                    />
                                    <span className="text-xs text-text-muted font-semibold">
                                        Kits per trial order
                                    </span>
                                </div>

                                {/* Buyer Purchase Limit Configuration */}
                                <div className="pt-3 border-t border-border/60 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                                                <FaUserShield className="text-amber-600 dark:text-amber-400" size={12} />
                                                Buyer Purchase Limit (How Many Times Buyer Can Buy)
                                            </label>
                                            <p className="text-[10px] text-text-muted mt-0.5">
                                                Maximum number of times an EPC / Buyer can order this trial kit. Once the limit is reached, the trial button will automatically be hidden from the store for that buyer.
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                            {Number(formData.trial_kit_max_orders_per_buyer ?? 1) === 0 ? "Unlimited" : `${formData.trial_kit_max_orders_per_buyer ?? 1} Time(s) Per Buyer`}
                                        </span>
                                    </div>

                                    {/* Quick Presets for Limit */}
                                    {/* <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "1 Time Only (Recommended)", value: 1 },
                                            { label: "2 Times", value: 2 },
                                            { label: "3 Times", value: 3 },
                                            { label: "5 Times", value: 5 },
                                            { label: "Unlimited", value: 0 },
                                        ].map((preset) => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => handleFormChange("trial_kit_max_orders_per_buyer", preset.value)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${Number(formData.trial_kit_max_orders_per_buyer ?? 1) === preset.value
                                                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                                    : "bg-surface border-border text-text-secondary hover:border-amber-500/30 hover:text-amber-600"
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div> */}

                                    {/* Custom Limit Input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="999"
                                            value={formData.trial_kit_max_orders_per_buyer ?? 1}
                                            onChange={(e) => handleFormChange("trial_kit_max_orders_per_buyer", Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-32 h-10 px-3 bg-surface border-2 border-border focus:border-amber-500 rounded-xl text-xs font-bold text-text-primary outline-none transition-colors"
                                            placeholder="1"
                                        />
                                        <span className="text-xs text-text-muted font-semibold">
                                            Max trial orders allowed per buyer (0 = Unlimited)
                                        </span>
                                    </div>
                                </div>

                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-start gap-2 text-emerald-700">
                                    <FaInfoCircle className="mt-0.5 flex-shrink-0" size={13} />
                                    <p className="text-[11px] leading-relaxed">
                                        An <strong>"Order Trial Kit ({formData.trial_kit_quantity || 10} Kits)"</strong> button will be displayed on this product in the EPC store. Each buyer can order this product's trial kit a maximum of <strong>{Number(formData.trial_kit_max_orders_per_buyer ?? 1) === 0 ? "unlimited times" : `${formData.trial_kit_max_orders_per_buyer ?? 1} time${Number(formData.trial_kit_max_orders_per_buyer ?? 1) === 1 ? "" : "s"}`}</strong>. Once the limit is reached, this button will be <strong>automatically hidden</strong> for that buyer.
                                    </p>
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="space-y-6">
                        {!selectedSolarKitObj ? (
                            <div className="flex min-h-90 h-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-surface-hover/5 p-6 text-center">
                                <FaShoppingBag className="mb-3 text-text-muted/30" size={40} />
                                <h4 className="text-sm font-black uppercase text-text-secondary">
                                    Product Specifications Blueprint
                                </h4>
                                <p className="mt-1 max-w-xs text-xs text-text-muted">
                                    Select a Master Solar Kit definition on the left to configure
                                    component SKUs and specifications.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                        Selected Kit Project Hierarchy Mapping
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-text-primary">
                                        <span className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-primary">
                                            {selectedSolarKitObj.category_id?.name || "Category"}
                                        </span>
                                        <FaChevronRight className="text-text-muted" size={10} />
                                        <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-indigo-700">
                                            {selectedSolarKitObj.subcategory_id?.name || "Subcategory"}
                                        </span>
                                        <FaChevronRight className="text-text-muted" size={10} />
                                        <span className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700">
                                            {selectedSolarKitObj.type_id?.type?.name || "System Type"}
                                        </span>
                                    </div>
                                </div>
                                <section className="rounded-3xl border border-border bg-surface-hover/20">
                                    <button
                                        type="button"
                                        onClick={() => toggleSection("form_base_components")}
                                        className="flex w-full items-center justify-between gap-2 rounded-t-3xl px-6 py-4 transition-colors hover:bg-surface-hover/30 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-teal-500/10 p-1.5 text-teal-600">
                                                <FaLayerGroup size={14} />
                                            </div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                                Base Components &amp; SKU Mapping
                                            </h3>
                                            {formData.base_components.filter((bc) => bc.sku_id).length >
                                                0 && (
                                                    <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold text-teal-700">
                                                        {
                                                            formData.base_components.filter((bc) => bc.sku_id)
                                                                .length
                                                        }
                                                        /{formData.base_components.length} mapped
                                                    </span>
                                                )}
                                        </div>
                                        <FaChevronDown
                                            size={12}
                                            className={`text-text-muted transition-transform duration-200 ${isSectionOpen("form_base_components") ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>
                                    {isSectionOpen("form_base_components") && (
                                        <div className="px-6 pb-6 pt-2">
                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                {(() => {
                                                    const sortedBc = formData.base_components
                                                        .map((bc, originalIdx) => ({ bc, originalIdx }))
                                                        .sort((a, b) => {
                                                            const order = ["panel", "inverter", "battery"];
                                                            const nameA = (a.bc.name || "").toLowerCase();
                                                            const nameB = (b.bc.name || "").toLowerCase();
                                                            const rankA = order.findIndex(term => nameA.includes(term)) === -1 ? 99 : order.findIndex(term => nameA.includes(term));
                                                            const rankB = order.findIndex(term => nameB.includes(term)) === -1 ? 99 : order.findIndex(term => nameB.includes(term));
                                                            return rankA - rankB;
                                                        });

                                                    return sortedBc.map(({ bc, originalIdx: idx }) => {
                                                        const isMicro = typeof isSubtypeMicroInverter === "function" && isSubtypeMicroInverter(bc);
                                                        const isRegular = typeof isSubtypeRegularInverter === "function" && isSubtypeRegularInverter(bc);
                                                        const isPanel = bc.name?.toLowerCase().includes("panel");
                                                        const mode = formData.inverter_mode || "single";

                                                        const filteredSkus = getFilteredSkusForComponent(
                                                            idx,
                                                            bc,
                                                            baseComponentSkus[idx] || []
                                                        );
                                                        const filteredSkuOptions = filteredSkus
                                                            .map((s) => ({ text: s.sku_code, value: s.id }))
                                                            .filter((opt) => opt.value);

                                                        if (bc.sku_id) {
                                                            const selectedSku = (baseComponentSkus[idx] || []).find(
                                                                (s) => String(s.id) === String(bc.sku_id) || String(s._id) === String(bc.sku_id)
                                                            );
                                                            if (selectedSku && !filteredSkuOptions.some((opt) => String(opt.value) === String(selectedSku.id || selectedSku._id))) {
                                                                filteredSkuOptions.unshift({ text: selectedSku.sku_code, value: selectedSku.id || selectedSku._id });
                                                            }
                                                        }

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="space-y-4 rounded-2xl border border-border bg-surface p-5"
                                                            >
                                                                {/* Header */}
                                                                <div className="border-b border-border pb-2 flex items-center justify-between">
                                                                    <span className="text-xs font-black uppercase tracking-wide text-text-primary">
                                                                        {bc.name}
                                                                        {bc.subtype_name && (
                                                                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                                                                                {bc.subtype_name}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {/* Single / Multi toggle — only for regular inverters */}
                                                                    {isRegular && (
                                                                        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-hover p-0.5">
                                                                            {["single", "multi"].map(m => (
                                                                                <button
                                                                                    key={m}
                                                                                    type="button"
                                                                                    onClick={() => handleFormChange("inverter_mode", m)}
                                                                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 ${mode === m
                                                                                        ? "bg-primary text-white shadow-md"
                                                                                        : "text-text-muted hover:text-text-primary"
                                                                                        }`}
                                                                                >
                                                                                    {m === "single" ? "Single" : "Multi"}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-3">
                                                                    {/* Brand */}
                                                                    <div className="space-y-1.5">
                                                                        <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                                            Brand Manufacturer
                                                                        </label>
                                                                        <DropdownWithSearchInput
                                                                            options={(() => {
                                                                                const subKey = (bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id)?.toString();
                                                                                const templateKey = (bc.template_id?._id || bc.template_id?.id || bc.template_id)?.toString();
                                                                                let brandsList = [];
                                                                                if (subKey && subtypeBrands && subtypeBrands[subKey]) {
                                                                                    brandsList = subtypeBrands[subKey];
                                                                                } else if (templateKey && templateBrands && templateBrands[templateKey]) {
                                                                                    brandsList = templateBrands[templateKey];
                                                                                }
                                                                                return (brandsList || []).map((b) => ({
                                                                                    text: b.name || b.brand_name || b.brand || 'Unknown Brand',
                                                                                    value: b.id || b._id || b.brand_id
                                                                                })).filter(opt => opt.value);
                                                                            })()}
                                                                            value={bc.brand_id}
                                                                            onChange={(val) =>
                                                                                handleBaseBrandChange(idx, val)
                                                                            }
                                                                            placeholder="Select Brand Manufacturer"
                                                                            className="w-full"
                                                                        />
                                                                    </div>

                                                                    {/* SKU */}
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center justify-between px-1">
                                                                            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                                                                                Select SKU
                                                                            </label>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleShowBaseComponentFilters(bc, idx)}
                                                                                className="text-text-muted hover:text-primary transition-colors cursor-pointer p-0.5"
                                                                                title="Show SKU filtering criteria"
                                                                            >
                                                                                <FaInfoCircle size={11} />
                                                                            </button>
                                                                        </div>
                                                                        <DropdownWithSearchInput
                                                                            options={filteredSkuOptions}
                                                                            value={bc.sku_id}
                                                                            onChange={(val) =>
                                                                                handleBaseSkuChange(idx, val)
                                                                            }
                                                                            placeholder={
                                                                                (() => {
                                                                                    const isReg = typeof isSubtypeRegularInverter === "function" && isSubtypeRegularInverter(bc);
                                                                                    const isMic = typeof isSubtypeMicroInverter === "function" && isSubtypeMicroInverter(bc);
                                                                                    if (isReg || isMic) {
                                                                                        const panelBc = formData.base_components.find(c => c.name?.toLowerCase().includes("panel"));
                                                                                        if (!panelBc?.sku_id || !panelBc?.quantity || parseInt(panelBc.quantity) <= 0) {
                                                                                            return "Select Solar Panel & Quantity First";
                                                                                        }
                                                                                    }
                                                                                    return filteredSkuOptions.length === 0 ? "No matching SKUs" : "Select SKU";
                                                                                })()
                                                                            }
                                                                            disabled={!bc.template_id || (() => {
                                                                                const isReg = typeof isSubtypeRegularInverter === "function" && isSubtypeRegularInverter(bc);
                                                                                const isMic = typeof isSubtypeMicroInverter === "function" && isSubtypeMicroInverter(bc);
                                                                                if (isReg || isMic) {
                                                                                    const panelBc = formData.base_components.find(c => c.name?.toLowerCase().includes("panel"));
                                                                                    const isPanelSelectedAndValid = panelBc?.sku_id && panelBc?.quantity && parseInt(panelBc.quantity) > 0;
                                                                                    return !isPanelSelectedAndValid;
                                                                                }
                                                                                return false;
                                                                            })()}
                                                                            className="w-full"
                                                                        />
                                                                        {filteredSkuOptions.length === 0 && (
                                                                            <p className="ml-1 text-[9px] text-amber-600 font-semibold">
                                                                                {isPanel
                                                                                    ? (bc.brand_id ? "No solar panels found for this brand." : "No solar panels found.")
                                                                                    : isMicro
                                                                                        ? "No micro-inverters match this panel watt / count."
                                                                                        : isRegular
                                                                                            ? "No inverters found matching the required capacity exactly (no tolerance applied)."
                                                                                            : (bc.brand_id ? "No matching SKUs found for this brand." : "No matching SKUs found.")}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    {/* Quantity field — context-aware */}
                                                                    {isMicro ? (
                                                                        /* Micro-inverter: auto-calculated, read-only */
                                                                        <div className="space-y-1">
                                                                            <div className="flex items-center justify-between px-1">
                                                                                <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                                                    Quantity (nos) — Auto
                                                                                </label>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        const panelBc = formData.base_components.find(b => b.name?.toLowerCase().includes("panel"));
                                                                                        const panelCount = parseInt(panelBc?.quantity || 0) || 0;
                                                                                        setFilterInfoData({
                                                                                            name: `${bc.name} ${bc.subtype_name ? `(${bc.subtype_name})` : ""} — Quantity Calculation`,
                                                                                            description: "The micro-inverter quantity is automatically calculated based on the number of solar panels and how many panels each micro-inverter can handle.",
                                                                                            criteria: [
                                                                                                {
                                                                                                    title: "Solar Panel Count Input",
                                                                                                    desc: panelCount > 0
                                                                                                        ? `The system has ${panelCount} solar panel(s) configured in the base components.`
                                                                                                        : "No solar panels have been configured yet. Set the panel quantity first.",
                                                                                                    value: panelCount > 0 ? `Solar Panels: ${panelCount} nos` : null,
                                                                                                    active: panelCount > 0
                                                                                                },
                                                                                                {
                                                                                                    title: "Total PV Inputs (from SKU attribute)",
                                                                                                    desc: "Each micro-inverter SKU has a 'Total PV Inputs' attribute specifying how many solar panels it can connect to. This is read from the micro-inverter's SKU specification.",
                                                                                                    value: bc.quantity && panelCount > 0
                                                                                                        ? `Total PV Inputs: ${Math.round(panelCount / bc.quantity)}`
                                                                                                        : "No micro-inverter SKU selected yet",
                                                                                                    active: !!bc.quantity
                                                                                                },
                                                                                                {
                                                                                                    title: "Auto-Quantity Formula",
                                                                                                    desc: "The required number of micro-inverters is calculated using ceiling division so every panel is covered, even if panels don't divide evenly.",
                                                                                                    value: `Quantity = ⌈ Panel Count ÷ Total PV Inputs ⌉ = ⌈ ${panelCount} ÷ ${bc.quantity && panelCount > 0 ? Math.round(panelCount / bc.quantity) : "?"} ⌉ = ${bc.quantity || "?"}`,
                                                                                                    active: !!(bc.quantity && panelCount > 0)
                                                                                                },
                                                                                                {
                                                                                                    title: "Read-only Field",
                                                                                                    desc: "This quantity is automatically managed and cannot be changed manually. It updates whenever the panel count or SKU selection changes.",
                                                                                                    active: true
                                                                                                }
                                                                                            ],
                                                                                            summary: {
                                                                                                totalCount: null,
                                                                                                brandCount: null,
                                                                                                finalCount: null,
                                                                                                isFallbackApplied: false,
                                                                                                filters: {
                                                                                                    "Solar Panel Count": panelCount > 0 ? `${panelCount} nos` : null,
                                                                                                    "PV Inputs Per Unit": bc.quantity && panelCount > 0 ? `${Math.round(panelCount / bc.quantity)} panels/unit` : null,
                                                                                                    "Calculated Qty": bc.quantity ? `${bc.quantity} units` : null,
                                                                                                }
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    className="text-text-muted hover:text-primary transition-colors cursor-pointer p-0.5"
                                                                                    title="How is this quantity calculated?"
                                                                                >
                                                                                    <FaInfoCircle size={11} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-hover/50 px-4 py-2.5">
                                                                                <span className="text-sm font-black text-text-primary">{bc.quantity || "—"}</span>
                                                                                <span className="text-[10px] text-text-muted font-medium">units (panels ÷ total PV inputs)</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : isRegular ? (
                                                                        /* Regular inverter: locked at 1 for single, editable ≥2 for multi */
                                                                        <CustomInput
                                                                            type="number"
                                                                            min={mode === "single" ? "1" : "2"}
                                                                            max={mode === "single" ? "1" : undefined}
                                                                            label={`Quantity (${getTemplateUnitSymbol(bc)})`}
                                                                            labelClassName={`!text-[10px] !mb-1.5 ${mode === "single" ? "!text-text-muted" : "!text-text-secondary"
                                                                                }`}
                                                                            inputClassName={`!py-2 !text-xs !font-semibold ${mode === "single"
                                                                                ? "!bg-surface-hover/60 !text-text-muted cursor-not-allowed"
                                                                                : "!border-border focus:!border-primary"
                                                                                }`}
                                                                            value={mode === "single" ? 1 : bc.quantity}
                                                                            disabled={mode === "single"}
                                                                            onChange={(e) => {
                                                                                if (mode === "single") return;
                                                                                const val = e.target.value;
                                                                                setFormData((prev) => {
                                                                                    const copy = [...prev.base_components];
                                                                                    copy[idx] = {
                                                                                        ...copy[idx],
                                                                                        quantity: val === "" ? "" : Math.max(2, parseInt(val) || 2),
                                                                                    };
                                                                                    return { ...prev, base_components: copy };
                                                                                });
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        /* Panels and other components: normal editable qty */
                                                                        <CustomInput
                                                                            type="number"
                                                                            min="1"
                                                                            label={
                                                                                isPanel
                                                                                    ? `Number of Panels (${getTemplateUnitSymbol(bc)})`
                                                                                    : `Quantity (${getTemplateUnitSymbol(bc)})`
                                                                            }
                                                                            labelClassName={`!text-[10px] !mb-1.5 transition-colors duration-200 ${bc.quantity === 0 || bc.quantity === "" || bc.quantity < 0
                                                                                ? "!text-rose-600"
                                                                                : isPanel && isCapacityOutOfRange
                                                                                    ? "!text-rose-600"
                                                                                    : "!text-text-secondary"
                                                                                }`}
                                                                            inputClassName={`!py-2 !text-xs !font-semibold transition-all duration-200 ${bc.quantity === 0 || bc.quantity === "" || bc.quantity < 0
                                                                                ? "!border-rose-500 focus:!border-rose-600 ring-1 ring-rose-500/20"
                                                                                : isPanel && isCapacityOutOfRange
                                                                                    ? "!border-rose-500 focus:!border-rose-600 ring-1 ring-rose-500/20"
                                                                                    : "!border-border focus:!border-primary"
                                                                                }`}
                                                                            value={bc.quantity}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setFormData((prev) => {
                                                                                    const copy = [...prev.base_components];
                                                                                    copy[idx] = {
                                                                                        ...copy[idx],
                                                                                        quantity: val === "" ? "" : parseInt(val),
                                                                                    };
                                                                                    return { ...prev, base_components: copy };
                                                                                });
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>

                                                                <SkuSpecsLink
                                                                    skuId={bc.sku_id}
                                                                    skuDetailsCache={skuDetailsCache}
                                                                    fetchSkuDetails={fetchSkuDetails}
                                                                    setActiveViewingSku={setActiveViewingSku}
                                                                />
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </section>
                                {formData.bos_kits.length > 0 && (
                                    <section className="rounded-3xl border border-border bg-surface-hover/20">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection("form_bos_kits")}
                                            className="flex w-full items-center justify-between gap-2 rounded-t-3xl px-6 py-4 transition-colors hover:bg-surface-hover/30 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600">
                                                    <FaShoppingBag size={14} />
                                                </div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                                                    BOS Kits Brand, SKU &amp; Images
                                                </h3>
                                                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                                                    {formData.bos_kits.length} group
                                                    {formData.bos_kits.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <FaChevronDown
                                                size={12}
                                                className={`text-text-muted transition-transform duration-200 ${isSectionOpen("form_bos_kits") ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>
                                        {isSectionOpen("form_bos_kits") && (
                                            <div className="px-6 pb-6 pt-2">
                                                <div className="grid grid-cols-1 gap-6">
                                                    {formData.bos_kits.map((bk, groupIdx) => {
                                                        const bosGroupKey = `form_bos_group_${groupIdx}`;
                                                        return (
                                                            <div
                                                                key={groupIdx}
                                                                className="rounded-2xl border border-border bg-surface"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleSection(bosGroupKey)}
                                                                    className="flex w-full items-center justify-between rounded-t-2xl border-b border-border px-5 py-3.5 transition-colors hover:bg-surface-hover/30 cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                                                                            {bk.name}
                                                                        </span>
                                                                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                                                                            BOS Group
                                                                        </span>
                                                                        {bk.items?.filter((i) => i.sku_id).length >
                                                                            0 && (
                                                                                <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-bold text-teal-700">
                                                                                    {bk.items.filter((i) => i.sku_id).length}/
                                                                                    {bk.items.length} SKUs
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                    <FaChevronDown
                                                                        size={11}
                                                                        className={`text-text-muted transition-transform duration-200 ${isSectionOpen(bosGroupKey)
                                                                            ? "rotate-180"
                                                                            : ""
                                                                            }`}
                                                                    />
                                                                </button>
                                                                {isSectionOpen(bosGroupKey) && (
                                                                    <div className="space-y-6 p-5">
                                                                        <div className="grid grid-cols-1 gap-6 rounded-xl border border-border/60 bg-surface-hover/30 p-4 md:grid-cols-2">
                                                                            <div className="space-y-1.5">
                                                                                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                                                    Standard Brand for {bk.name}
                                                                                </label>
                                                                                <DropdownWithSearchInput
                                                                                    options={bosBrandOptions}
                                                                                    value={bk.brand_id}
                                                                                    onChange={(val) =>
                                                                                        handleBosGroupBrandChange(
                                                                                            groupIdx,
                                                                                            val
                                                                                        )
                                                                                    }
                                                                                    placeholder="Select Standard Brand"
                                                                                    className="w-full"
                                                                                />
                                                                                <p className="ml-1 mt-0.5 text-[9px] italic text-text-muted">
                                                                                    Applied to all items unless custom brand
                                                                                    is selected.
                                                                                </p>
                                                                            </div>
                                                                            <div className="space-y-3">
                                                                                <CustomFilePicker
                                                                                    label={`Upload Image for ${bk.name} *`}
                                                                                    accept="image/*"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) {
                                                                                            setBosImageFiles((prev) => ({
                                                                                                ...prev,
                                                                                                [groupIdx]: file,
                                                                                            }));
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                {bosImageFiles[groupIdx] ? (
                                                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                                                                                        <FaCheckCircle /> Selected:{" "}
                                                                                        {bosImageFiles[groupIdx].name}
                                                                                    </div>
                                                                                ) : bk.image ? (
                                                                                    <div className="space-y-1">
                                                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                                                                                            Current BOS Image:
                                                                                        </p>
                                                                                        <img
                                                                                            src={bk.image}
                                                                                            alt="Current BOS"
                                                                                            className="h-12 w-auto rounded border border-border object-cover"
                                                                                        />
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                                                                                BOS Kit Items
                                                                            </p>
                                                                            <div className="grid grid-cols-1 gap-4">
                                                                                {bk.items?.map((item, itemIdx) => {
                                                                                    const cacheKey = `${groupIdx}_${itemIdx}`;
                                                                                    const itemBrandOptions = (() => {
                                                                                        const subKey = (item.subtype_ids || []).map(st => st?._id || st?.id || st).filter(Boolean).join(",");
                                                                                        const brandsList = (subKey && subtypeBrands && subtypeBrands[subKey])
                                                                                            ? subtypeBrands[subKey]
                                                                                            : (templateBrands[
                                                                                                (
                                                                                                    item.template_id?.id ||
                                                                                                    item.template_id?._id ||
                                                                                                    item.template_id
                                                                                                )?.toString()
                                                                                            ] || []);
                                                                                        return brandsList.map((b) => ({
                                                                                            text: b.name || b.brand_name || b.brand || "Unknown Brand",
                                                                                            value: b.id || b._id || b.brand_id,
                                                                                        })).filter(opt => opt.value);
                                                                                    })();
                                                                                    const tId =
                                                                                        item.template_id?.id ||
                                                                                        item.template_id?._id ||
                                                                                        item.template_id;
                                                                                    const tplCount = bk.items.filter(
                                                                                        (it) =>
                                                                                            (
                                                                                                it.template_id?.id ||
                                                                                                it.template_id?._id ||
                                                                                                it.template_id
                                                                                            )?.toString() === tId?.toString()
                                                                                    ).length;
                                                                                    return (
                                                                                        <div
                                                                                            key={itemIdx}
                                                                                            className="space-y-4 rounded-xl border border-border/40 bg-surface-hover/10 p-4"
                                                                                        >
                                                                                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                                                                                                <span className="text-[11px] font-bold uppercase tracking-wide text-text-primary">
                                                                                                    {item.name}
                                                                                                    {item.subtype_names && item.subtype_names.length > 0 && (
                                                                                                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                                                                                                            ({item.subtype_names.join(", ")})
                                                                                                        </span>
                                                                                                    )}
                                                                                                </span>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                            handleAddBosItemRow(
                                                                                                                groupIdx,
                                                                                                                item
                                                                                                            )
                                                                                                        }
                                                                                                        className="flex items-center gap-1 rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[9px] font-black uppercase text-primary hover:bg-primary/10 hover:text-primary-hover cursor-pointer"
                                                                                                    >
                                                                                                        <FaPlus size={8} /> Add
                                                                                                        Product
                                                                                                    </button>
                                                                                                    {tplCount > 1 && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() =>
                                                                                                                handleRemoveBosItemRow(
                                                                                                                    groupIdx,
                                                                                                                    itemIdx
                                                                                                                )
                                                                                                            }
                                                                                                            className="flex items-center gap-1 rounded border border-rose-500/10 bg-rose-500/5 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 cursor-pointer"
                                                                                                        >
                                                                                                            <FaTrash size={8} /> Remove
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                                                                <div className="space-y-1.5">
                                                                                                    <label className="ml-1 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                                                                                                        Brand
                                                                                                    </label>
                                                                                                    <DropdownWithSearchInput
                                                                                                        options={itemBrandOptions}
                                                                                                        value={item.brand_id}
                                                                                                        onChange={(val) =>
                                                                                                            handleBosItemBrandChange(
                                                                                                                groupIdx,
                                                                                                                itemIdx,
                                                                                                                val
                                                                                                            )
                                                                                                        }
                                                                                                        placeholder="Select Brand"
                                                                                                        className="w-full"
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="space-y-1.5">
                                                                                                    <div className="flex items-center justify-between px-1">
                                                                                                        <label className="text-[9px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1">
                                                                                                            Select SKU
                                                                                                        </label>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => handleShowBosComponentFilters(bk, item, groupIdx, itemIdx)}
                                                                                                            className="text-text-muted hover:text-primary transition-colors cursor-pointer p-0.5"
                                                                                                            title="Show SKU filtering criteria"
                                                                                                        >
                                                                                                            <FaInfoCircle size={10} />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                    <DropdownWithSearchInput
                                                                                                        options={getFilteredBosSkus(
                                                                                                            cacheKey,
                                                                                                            item
                                                                                                        )}
                                                                                                        value={item.sku_id}
                                                                                                        onChange={(val) => {
                                                                                                            setFormData((prev) => {
                                                                                                                const copy = [
                                                                                                                    ...prev.bos_kits,
                                                                                                                ];
                                                                                                                const ic = [
                                                                                                                    ...copy[groupIdx].items,
                                                                                                                ];
                                                                                                                ic[itemIdx] = {
                                                                                                                    ...ic[itemIdx],
                                                                                                                    sku_id: val,
                                                                                                                };
                                                                                                                copy[groupIdx] = {
                                                                                                                    ...copy[groupIdx],
                                                                                                                    items: ic,
                                                                                                                };
                                                                                                                return {
                                                                                                                    ...prev,
                                                                                                                    bos_kits: copy,
                                                                                                                };
                                                                                                            });
                                                                                                            if (val)
                                                                                                                fetchSkuDetails(val);
                                                                                                            const rawOpts =
                                                                                                                bosComponentSkus[
                                                                                                                cacheKey
                                                                                                                ] || [];
                                                                                                            const skuItem =
                                                                                                                rawOpts.find(
                                                                                                                    (o) => o.value === val
                                                                                                                );
                                                                                                            if (
                                                                                                                skuItem &&
                                                                                                                skuItem.attributes
                                                                                                            )
                                                                                                                setSkuDetailsCache(
                                                                                                                    (prev) => ({
                                                                                                                        ...prev,
                                                                                                                        [val]: skuItem,
                                                                                                                    })
                                                                                                                );
                                                                                                        }}
                                                                                                        placeholder="Select SKU"
                                                                                                        disabled={
                                                                                                            !(
                                                                                                                item.brand_id ||
                                                                                                                bk.brand_id
                                                                                                            )
                                                                                                        }
                                                                                                        className="w-full"
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="space-y-1.5">
                                                                                                    <CustomInput
                                                                                                        type="number"
                                                                                                        min="1"
                                                                                                        label={`Quantity (${getTemplateUnitSymbol(
                                                                                                            item
                                                                                                        )})`}
                                                                                                        labelClassName={`!text-[9px] !mb-1.5 ${item.quantity === 0 ||
                                                                                                            item.quantity === "" ||
                                                                                                            item.quantity < 0
                                                                                                            ? "!text-rose-600"
                                                                                                            : "!text-text-secondary"
                                                                                                            }`}
                                                                                                        inputClassName={`!py-2 !text-xs !font-semibold ${item.quantity === 0 ||
                                                                                                            item.quantity === "" ||
                                                                                                            item.quantity < 0
                                                                                                            ? "!border-rose-500 ring-1 ring-rose-500/20"
                                                                                                            : "!border-border focus:!border-primary"
                                                                                                            }`}
                                                                                                        value={item.quantity}
                                                                                                        onChange={(e) => {
                                                                                                            const val = e.target.value;
                                                                                                            setFormData((prev) => {
                                                                                                                const copy = [
                                                                                                                    ...prev.bos_kits,
                                                                                                                ];
                                                                                                                const ic = [
                                                                                                                    ...copy[groupIdx].items,
                                                                                                                ];
                                                                                                                ic[itemIdx] = {
                                                                                                                    ...ic[itemIdx],
                                                                                                                    quantity:
                                                                                                                        val === ""
                                                                                                                            ? ""
                                                                                                                            : parseInt(val),
                                                                                                                };
                                                                                                                copy[groupIdx] = {
                                                                                                                    ...copy[groupIdx],
                                                                                                                    items: ic,
                                                                                                                };
                                                                                                                return {
                                                                                                                    ...prev,
                                                                                                                    bos_kits: copy,
                                                                                                                };
                                                                                                            });
                                                                                                        }}
                                                                                                    />
                                                                                                    {(item.quantity === 0 ||
                                                                                                        item.quantity === "" ||
                                                                                                        item.quantity < 0) && (
                                                                                                            <p className="mt-1 text-[9px] font-semibold text-rose-600">
                                                                                                                Quantity must be at least 1.
                                                                                                            </p>
                                                                                                        )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <SkuSpecsLink
                                                                                                skuId={item.sku_id}
                                                                                                skuDetailsCache={
                                                                                                    skuDetailsCache
                                                                                                }
                                                                                                fetchSkuDetails={
                                                                                                    fetchSkuDetails
                                                                                                }
                                                                                                setActiveViewingSku={
                                                                                                    setActiveViewingSku
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                )}
                            </div>
                        )}{" "}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-border pt-6">
                        {localStorage.getItem("combokit_draft_" + (countryName || "global")) && !editingKit && (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => {
                                    localStorage.removeItem("combokit_draft_" + (countryName || "global"));
                                    setFormData({
                                        name: "",
                                        description: "",
                                        solar_kit_id: "",
                                        project_range_id: "",
                                        capacity: 0,
                                        inverter_tolerance: 10,
                                        inverter_mode: "single",
                                        kit_image: null,
                                        base_components: [],
                                        bos_kits: [],
                                    });
                                    setBaseComponentSkus({});
                                    setBosComponentSkus({});
                                    setSkuDetailsCache({});
                                    setTemplateBrands({});
                                    setSubtypeBrands({});
                                    setKitImageFile(null);
                                    setBosImageFiles({});
                                    dispatch(setAlert({ type: "info", message: "Draft cleared" }));
                                }}
                            >
                                Clear Draft
                            </Button>
                        )}
                        <Button type="button" variant="secondary" onClick={() => setShowDrawer(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" loading={loadingForm}>
                            {editingKit ? "Save Updates" : "Confirm Configuration"}
                        </Button>
                    </div>
                </form>
            )}

            {filterInfoData && (
                <Dialog
                    isOpen={!!filterInfoData}
                    onClose={() => setFilterInfoData(null)}
                    title={filterInfoData.summary?.totalCount === null ? "Auto-Quantity Calculation" : "SKU Filtering Specifications"}
                    size="md"
                >
                    <div className="space-y-5 p-1">
                        {/* Component Details */}
                        <div className="rounded-2xl border border-border bg-surface-hover/20 p-4 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted">Component</p>
                            <h4 className="text-sm font-black text-text-primary">{filterInfoData.name}</h4>
                            <p className="text-xs text-text-secondary leading-relaxed">{filterInfoData.description}</p>
                        </div>

                        {/* Summary Funnel */}
                        {filterInfoData.summary && filterInfoData.summary.totalCount !== null && (
                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">SKU Funnel Analysis</p>
                                <div className="grid grid-cols-3 gap-3 text-center border border-border bg-surface p-3 rounded-2xl shadow-sm">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-text-muted">Total Pool</p>
                                        <p className="text-base font-black text-text-primary">{filterInfoData.summary.totalCount}</p>
                                        <span className="text-[8px] text-text-muted block">unfiltered database</span>
                                    </div>
                                    <div className="space-y-1 border-x border-border/80">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-text-muted">Brand Matched</p>
                                        <p className="text-base font-black text-text-primary">{filterInfoData.summary.brandCount}</p>
                                        <span className="text-[8px] text-text-muted block">manufacturer matching</span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black tracking-widest text-text-muted">Tech Filtered</p>
                                        <div className="flex justify-center items-center gap-1">
                                            <p className="text-base font-black text-text-primary">{filterInfoData.summary.finalCount}</p>
                                            {filterInfoData.summary.isFallbackApplied && (
                                                <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold uppercase">Fallback</span>
                                            )}
                                        </div>
                                        <span className="text-[8px] text-text-muted block">active criteria match</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Input Parameters */}
                        {filterInfoData.summary?.filters && Object.values(filterInfoData.summary.filters).some(Boolean) && (
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Active Matching Criteria Parameters</p>
                                <div className="rounded-2xl border border-border bg-surface p-3 space-y-2.5">
                                    {Object.entries(filterInfoData.summary.filters).map(([key, val]) => {
                                        if (!val) return null;
                                        let label = key;
                                        if (key === 'brand') label = 'Selected Brand';
                                        if (key === 'panelWatt') label = 'Solar Panel Output';
                                        if (key === 'targetTolerance') label = 'Inverter Tolerance';
                                        if (key === 'targetCapacity') label = 'Required Power Output';
                                        if (key === 'duplicateExclusions') label = 'Duplicate Exclusions';
                                        if (key === 'inverterPhase') label = 'Inverter Phase';

                                        return (
                                            <div key={key} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                                                <span className="text-text-secondary font-medium">{label}:</span>
                                                <span className="font-bold text-text-primary bg-surface-hover/80 px-2 py-0.5 rounded border border-border/30">{val}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Filter Criteria Cards */}
                        <div className="space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted px-1">Detailed Matching Rules</p>
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {filterInfoData.criteria.map((c, i) => {
                                    const Icon = c.active ? FaCheckCircle : FaInfoCircle;
                                    const iconStyle = c.active
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-surface-hover text-text-muted border border-border/40';
                                    return (
                                        <div key={i} className="flex gap-3 items-start border border-border rounded-2xl p-3.5 bg-surface hover:border-border-hover transition-colors duration-200">
                                            <div className={`mt-0.5 rounded-xl p-1.5 ${iconStyle}`}>
                                                <Icon size={12} />
                                            </div>
                                            <div className="space-y-1.5 flex-1">
                                                <p className="text-xs font-black text-text-primary flex items-center gap-1.5">
                                                    {c.title}
                                                    {!c.active && (
                                                        <span className="text-[8px] px-1 py-0.5 rounded bg-surface-hover text-text-muted border border-border/40 font-bold uppercase">Inactive</span>
                                                    )}
                                                </p>
                                                <p className="text-[11px] text-text-secondary leading-relaxed">{c.desc}</p>
                                                {c.value && (
                                                    <span className="inline-block mt-1 text-[10px] font-mono bg-surface-hover border border-border px-2.5 py-0.5 rounded-lg text-text-primary font-bold">
                                                        {c.value}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-border">
                            <Button variant="secondary" onClick={() => setFilterInfoData(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Dialog>
            )}
        </Dialog>
    );
}
