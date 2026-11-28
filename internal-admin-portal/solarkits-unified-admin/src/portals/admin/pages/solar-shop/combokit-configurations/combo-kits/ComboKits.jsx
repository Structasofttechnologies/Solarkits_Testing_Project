import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";

import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Pagination from "@/components/Pagination";

import { FaPlus, FaShoppingBag, FaEye, FaTrash, FaImage, FaEdit, FaSearch, FaTruck, FaAward, FaLandmark } from "react-icons/fa";
import SkuDetailsModal from "../components/SkuDetailsModal";
import ComboKitFormDrawer from "../components/ComboKitFormDrawer";
import ComboKitDetailsModal from "../components/ComboKitDetailsModal";

const API_URL = import.meta.env.VITE_API_URL;

export default function ComboKits({ moduleUniqueId = "ADM_COMBO_KITS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Dynamic Endpoints prefix based on Selected Country
  const isIndia = countryName?.toLowerCase() === "india";
  const baseEndpoint = useMemo(() => {
    return `${API_URL}/combo-kits${isIndia ? "/india" : ""}`;
  }, [isIndia]);

  // State
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [loadingDrawerData, setLoadingDrawerData] = useState(false);
  const [_countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [_countryDetails, setCountryDetails] = useState(null);

  const [configuredKits, setConfiguredKits] = useState([]);
  const [variantConfigs, setVariantConfigs] = useState([]);
  const [masterKits, setMasterKits] = useState([]);
  const [brands, setBrands] = useState([]);

  // Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    solar_kit_id: "",
    brand_id: "",
    project_range_id: "",
    capacity: 0,
    inverter_tolerance: 10,
    inverter_mode: "single", // "single" | "multi"
    variant_id: "",
    variant_ids: [],
    kit_image: null,
    base_components: [],
    bos_kits: [],
    order_quantities: [], // e.g. [10, 25, 50, 100] — allowed order kit quantities
    loose_order_quantities: [], // e.g. [5, 10, 15, 20, 25, 30, 50] — allowed loose order kit quantities
    allow_trial_kit: false,
    trial_kit_quantity: 10,
    trial_kit_max_orders_per_buyer: 1
  });

  const [kitImageFile, setKitImageFile] = useState(null);
  const [bosImageFiles, setBosImageFiles] = useState({}); // { [index]: File }

  // Details modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingKit, setViewingKit] = useState(null);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Project ranges loaded dynamically based on selected solar kit's type_id
  const [projectRanges, setProjectRanges] = useState([]);

  // Kits Search & Filter states
  const [kitsSearch, setKitsSearch] = useState("");
  const [selectedIndustryType, setSelectedIndustryType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedProjectRange, setSelectedProjectRange] = useState("");

  // API-driven filter option lists
  const [filterIndustryTypes, setFilterIndustryTypes] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [filterSystemTypes, setFilterSystemTypes] = useState([]);
  const [filterProjectRanges, setFilterProjectRanges] = useState([]);

  // SKU Caches for base components and BOS kits
  const [baseComponentSkus, setBaseComponentSkus] = useState({}); // { [index]: options }
  const [bosComponentSkus, setBosComponentSkus] = useState({});  // { [index]: options }
  const [skuDetailsCache, setSkuDetailsCache] = useState({});     // { [skuId]: details }
  const [templateBrands, setTemplateBrands] = useState({});       // { [templateId]: brands }
  const [subtypeBrands, setSubtypeBrands] = useState({});         // { [subtypeIdOrIds]: brands }
  const [activeViewingSku, setActiveViewingSku] = useState(null); // SKU object for specs popup

  // Collapsible section state: keys are section identifiers
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const isSectionOpen = (key, defaultOpen = true) => collapsedSections[key] === undefined ? defaultOpen : !collapsedSections[key];

  // SKU attribute helpers
  const getSkuPower = (sku) => {
    if (!sku?.attributes?.length) return null;

    let a = sku.attributes.find(a => a.is_sku || a.is_capacity || a.attribute_type === "sku" || a.attribute_type === "capacity");
    if (!a) a = sku.attributes.find(a => {
      const n = (a.attribute_name || "").toLowerCase();
      return n.includes("ac capacity") || n.includes("capacity") || n.includes("power") || n.includes("pmax") || n.includes("watt");
    });
    if (!a) return null;

    const raw = parseFloat(a.value_number ?? a.value_text ?? 0);
    if (isNaN(raw) || raw === 0) return null;

    let watts;
    if (typeof a.conversion_factor === "number") {
      watts = raw * a.conversion_factor;
    } else {
      const unit = (a.unit_symbol || "").toLowerCase().trim();
      if (unit === "w" || unit === "wp" || unit === "watt" || unit === "watts") watts = raw;
      else if (unit === "kw" || unit === "kwp" || unit === "kilowatt" || unit === "kilowatts") watts = raw * 1000;
      else if (unit === "mw" || unit === "mwp") watts = raw * 1_000_000;
      else watts = raw * 1000; // default assume kW
    }
    return parseFloat((watts / 1000).toFixed(4));
  };

  const getSkuTolerance = (sku) => {
    if (!sku?.attributes?.length) return null;
    let a = sku.attributes.find(a =>
      a.is_tolerance || a.attribute_type === "tolerance" || a.attribute_type === "tollarance" || a.attribute_type === "tolarance"
    );
    if (!a) a = sku.attributes.find(a => (a.attribute_name || "").toLowerCase().includes("tolerance"));
    if (!a) return null;
    const v = parseFloat(a.value_number ?? a.value_text);
    return isNaN(v) ? null : v;
  };

  const getSkuMinInputWatt = (sku) => {
    if (!sku?.attributes?.length) return null;
    const a = sku.attributes.find(a => {
      const n = (a.attribute_name || "").toLowerCase();
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
    const a = sku.attributes.find(a => {
      const n = (a.attribute_name || "").toLowerCase();
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

  const getSkuConnectedPanels = (sku) => {
    if (!sku?.attributes?.length) return null;
    const a = sku.attributes.find(a => {
      const n = (a.attribute_name || "").toLowerCase();
      return (n.includes("connected") && n.includes("panel")) ||
        (n.includes("total") && n.includes("pv") && n.includes("input"));
    });
    if (!a) return null;
    const v = parseInt(a.value_number ?? a.value_text ?? a.value_raw);
    return isNaN(v) ? null : v;
  };

  const isSubtypeMicroInverter = (bc) => {
    const subtype = (bc?.subtype_name || "").toLowerCase();
    const name = (bc?.name || "").toLowerCase();
    const template = (bc?.template_id?.name || bc?.template_id?.text || bc?.template_id || "").toString().toLowerCase();
    return subtype.includes("micro") || name.includes("micro") || template.includes("micro");
  };

  const isSubtypeRegularInverter = (bc) => {
    const subtype = (bc?.subtype_name || "").toLowerCase();
    const name = (bc?.name || "").toLowerCase();
    const template = (bc?.template_id?.name || bc?.template_id?.text || bc?.template_id || "").toString().toLowerCase();
    const isInv = subtype.includes("inverter") || name.includes("inverter") || template.includes("inverter") ||
      subtype === "string" || subtype === "hybrid" || subtype === "central" ||
      template === "inverter";
    const isMicro = subtype.includes("micro") || name.includes("micro") || template.includes("micro");
    return isInv && !isMicro;
  };

  const getRangeBoundInkW = (val, pr) => {
    if (val === null || val === undefined) return 0;
    const factor = pr?.conversion_factor ?? pr?.unit_id?.conversion_factor;
    if (typeof factor === "number") return (val * factor) / 1000;
    const unit = (pr?.unit_symbol ?? pr?.unit_id?.symbol ?? "").toLowerCase().trim();
    if (unit === "w" || unit === "wp") return val / 1000;
    if (unit === "kw" || unit === "kwp") return val;
    if (unit === "mw" || unit === "mwp") return val * 1000;
    return val;
  };

  const getTemplateUnitSymbol = (component) => {
    if (!component) return "nos";

    let tId = "";
    if (component.template_id) {
      if (typeof component.template_id === "object") {
        const tpl = component.template_id;
        return tpl.qty_unit_id?.symbol || tpl.qty_unit_symbol || "nos";
      }
      tId = component.template_id.toString();
    } else if (component.template_ids && component.template_ids.length > 0) {
      const firstTpl = component.template_ids[0];
      if (firstTpl && typeof firstTpl === "object") {
        return firstTpl.qty_unit_id?.symbol || firstTpl.qty_unit_symbol || "nos";
      }
      tId = (firstTpl || "").toString();
    }

    if (tId) {
      for (const mk of masterKits) {
        const found = (mk.base_template_ids || []).find(t => (t._id || t.id || t).toString() === tId?.toString());
        if (found && typeof found === "object") {
          return found.qty_unit_id?.symbol || found.qty_unit_symbol || "nos";
        }
        for (const bk of (mk.bos_kits || [])) {
          const foundBos = (bk.template_ids || []).find(t => (t._id || t.id || t).toString() === tId?.toString());
          if (foundBos && typeof foundBos === "object") {
            return foundBos.qty_unit_id?.symbol || foundBos.qty_unit_symbol || "nos";
          }
        }
      }
    }

    if (editingKit) {
      const origBc = (editingKit.base_components || []).find(bc =>
        (bc.template_id?._id || bc.template_id?.id || bc.template_id)?.toString() === tId
      );
      if (origBc?.template_id && typeof origBc.template_id === "object") {
        return origBc.template_id.qty_unit_id?.symbol || origBc.template_id.qty_unit_symbol || "nos";
      }

      for (const bk of (editingKit.bos_kits || [])) {
        const origItem = (bk.template_ids || []).find(t =>
          (t._id || t.id || t)?.toString() === tId
        );
        if (origItem && typeof origItem === "object") {
          return origItem.qty_unit_id?.symbol || origItem.qty_unit_symbol || "nos";
        }
      }
    }

    return "nos";
  };

  const getSkuPhase = (sku) => {
    if (!sku || !sku.attributes || sku.attributes.length === 0) return null;
    const phaseAttr = sku.attributes.find(a => {
      const type = (a.attribute_type || "").toLowerCase();
      const name = (a.attribute_name || "").toLowerCase();
      return type === "phase" || name.includes("phase") || name.includes("pole");
    });
    if (!phaseAttr) return null;
    const val = (phaseAttr.value_text || phaseAttr.value_number || "").toString().toLowerCase().trim();
    if (val.includes("1") || val.includes("single") || val.includes("spn")) return "1";
    if (val.includes("3") || val.includes("three") || val.includes("tpn") || val.includes("triple")) return "3";
    return val;
  };

  const getFilteredBosSkus = (cacheKey, item) => {
    const rawOptions = bosComponentSkus[cacheKey] || [];

    const parts = cacheKey.split("_");
    const groupIdx = parseInt(parts[0]);
    const itemIdx = parseInt(parts[1]);

    let filteredOptions = rawOptions;

    if (!isNaN(groupIdx) && formData.bos_kits[groupIdx]) {
      const currentTemplateId = (item.template_id?.id || item.template_id?._id || item.template_id)?.toString();

      const selectedSkus = formData.bos_kits[groupIdx].items
        .filter((it, idx) => {
          if (idx === itemIdx) return false;
          const itTemplateId = (it.template_id?.id || it.template_id?._id || it.template_id)?.toString();
          return itTemplateId === currentTemplateId;
        })
        .map(it => it.sku_id)
        .filter(Boolean);

      if (selectedSkus.length > 0) {
        filteredOptions = filteredOptions.filter(opt => !selectedSkus.includes(opt.value));
      }
    }

    const isAcdb = item.name?.toLowerCase().includes("acdb") || item.template_id?.name?.toLowerCase().includes("acdb");
    if (!isAcdb) return filteredOptions;

    const inverterBc = formData.base_components.find(bc =>
      bc.name?.toLowerCase().includes("inverter")
    );
    if (!inverterBc || !inverterBc.sku_id) return filteredOptions;

    const inverterSku = skuDetailsCache[inverterBc.sku_id] || (() => {
      const inverterIdx = formData.base_components.findIndex(bc =>
        bc.name?.toLowerCase().includes("inverter")
      );
      if (inverterIdx !== -1) {
        const skus = baseComponentSkus[inverterIdx] || [];
        return skus.find(s => (s.id || s._id) === inverterBc.sku_id || s.value === inverterBc.sku_id);
      }
      return null;
    })();

    if (!inverterSku) return filteredOptions;

    const inverterPhase = getSkuPhase(inverterSku);
    if (!inverterPhase) return filteredOptions;

    const matched = filteredOptions.filter(opt => {
      const acdbPhase = getSkuPhase(opt);
      return acdbPhase === inverterPhase;
    });

    if (matched.length === 0) return filteredOptions;
    return matched;
  };

  const getPanelWattPerPanel = (activeFormData = formData) => {
    const panelBc = activeFormData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"));
    if (!panelBc?.sku_id) return null;
    const panelSku = skuDetailsCache[panelBc.sku_id] ||
      (baseComponentSkus[activeFormData.base_components.indexOf(panelBc)] || []).find(s => (s.id || s._id || s.value) === panelBc.sku_id);
    if (!panelSku) return null;
    const kw = getSkuPower(panelSku);
    return kw !== null ? kw * 1000 : null; // return in Watts
  };

  const getPanelCount = (activeFormData = formData) => {
    const panelBc = activeFormData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"));
    return parseInt(panelBc?.quantity || 0) || 0;
  };

  const getFilteredSkusForComponent = (index, component, skus, activeFormData = formData) => {
    if (!skus || skus.length === 0) return [];

    let pool = skus;
    if (component.brand_id) {
      pool = pool.filter(s => {
        const bId = s.brand_id?._id || s.brand_id;
        return bId && String(bId) === String(component.brand_id);
      });
    }

    const isMicro = isSubtypeMicroInverter(component);
    const isRegularInv = isSubtypeRegularInverter(component);

    if (isMicro) {
      const panelWatt = getPanelWattPerPanel(activeFormData);
      const totalPanels = getPanelCount(activeFormData);

      const filtered = pool.filter(s => {
        if (panelWatt !== null) {
          const minW = getSkuMinInputWatt(s);
          const maxW = getSkuMaxInputWatt(s);
          if (minW !== null && panelWatt < minW) return false;
          if (maxW !== null && panelWatt > maxW) return false;
        }
        return true;
      });

      // If no SKUs match and we have constraints, return all SKUs so user can at least select
      if (filtered.length === 0 && (panelWatt !== null || totalPanels > 0)) {
        return pool;
      }
      return filtered;
    }

    if (isRegularInv) {
      const targetTol = parseFloat(activeFormData.inverter_tolerance || 10);
      const mode = activeFormData.inverter_mode || "single";
      const qty = mode === "single" ? 1 : parseFloat(component.quantity || 2) || 2;

      const filtered = pool.filter(s => {
        const skuTol = getSkuTolerance(s);
        // Allow only SKUs with exact matching tolerance, or no tolerance attribute
        if (skuTol !== null && Number(skuTol) !== Number(targetTol)) {
          return false;
        }

        const tol = skuTol !== null ? Number(skuTol) : targetTol;

        if (activeFormData.capacity) {
          const power = getSkuPower(s);
          if (power === null) return true;

          const targetCapacity = activeFormData.capacity / qty;
          const minPower = power * (1 - tol / 100);
          const maxPower = power * (1 + tol / 100);

          return targetCapacity >= minPower && targetCapacity <= maxPower;
        }
        return true;
      });

      // If no SKUs match capacity constraints, return all SKUs so user can select
      // This helps during initial setup before capacity is calculated
      if (filtered.length === 0 && activeFormData.capacity) {
        return pool;
      }
      return filtered;
    }

    return pool;
  };

  // Fetch Configured kits when selectedCountry changes
  useEffect(() => {
    if (selectedCountry) {
      fetchConfiguredKits(selectedCountry);
      fetchVariantConfigs(selectedCountry);
    }
  }, [selectedCountry, baseEndpoint]);

  const fetchConfiguredKits = async (countryId) => {
    if (!countryId) return;
    try {
      setLoading(true);
      const url = `${baseEndpoint}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${countryId}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setConfiguredKits(res.data.data || []);
      } else {
        setConfiguredKits([]);
      }
    } catch (e) {
      console.error("Error fetching configured kits:", e);
      setConfiguredKits([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVariantConfigs = async (countryId) => {
    if (!countryId) return;
    try {
      const url = `${API_URL}/combo-kit-variants${isIndia ? "/india" : ""}/get-configs?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=view&country_id=${countryId}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setVariantConfigs(res.data.data || []);
      } else {
        setVariantConfigs([]);
      }
    } catch (e) {
      console.error("Error fetching variant configs:", e);
      setVariantConfigs([]);
    }
  };

  // ─── Filter Hierarchy Fetchers ───────────────────────────────────────────────

  const fetchFilterIndustryTypes = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/industry-types/list?unique_id=${moduleUniqueId}&req_for=view&active_only=true`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFilterIndustryTypes(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching industry types:", e);
    }
  };

  const fetchFilterCategories = async (industryTypeId = null) => {
    setFilterCategories([]);
    setFilterSubcategories([]);
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    try {
      const url = `${API_URL}/project-types/get-categories?unique_id=${moduleUniqueId}&req_for=view${industryTypeId ? `&industry_type_id=${industryTypeId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setFilterCategories(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  };

  const fetchFilterSubcategories = async (categoryId) => {
    setFilterSubcategories([]);
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    if (!categoryId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategories?unique_id=${moduleUniqueId}&req_for=view&category_id=${categoryId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFilterSubcategories(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching subcategories:", e);
    }
  };

  const fetchFilterSystemTypes = async (subcategoryId) => {
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    if (!subcategoryId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategory-types?unique_id=${moduleUniqueId}&req_for=view&subcategory_id=${subcategoryId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFilterSystemTypes(
          res.data.data.map((item) => ({ value: String(item.subcategory_type_id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching system types:", e);
    }
  };

  const fetchFilterProjectRanges = async (subcategoryTypeId) => {
    setFilterProjectRanges([]);
    if (!subcategoryTypeId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-ranges?unique_id=${moduleUniqueId}&req_for=view&subcategory_type_id=${subcategoryTypeId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFilterProjectRanges(
          res.data.data.map((item) => ({
            value: String(item.id),
            text: `${item.min_value} - ${item.max_value} ${item.unit_symbol || "kW"}`,
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching project ranges:", e);
    }
  };

  // Fetch Master Solar Kits (extracted so it can be called on demand)
  const fetchMasterKits = async () => {
    try {
      const kitRes = await axios.get(
        `${API_URL}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (kitRes.data?.status === "success") {
        setMasterKits(kitRes.data.data || []);
        return kitRes.data.data || [];
      }
    } catch (e) {
      console.error("Error fetching master solar kits:", e);
    }
    return [];
  };

  // Fetch countries and initial dependencies
  useEffect(() => {
    const fetchCountriesAndMasterData = async () => {
      try {
        setLoading(true);
        // Fetch Countries
        const response = await axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: { ...authHeaderObj() } }
        );

        if (response.data.status === "success") {
          const fetched = response.data.countries || [];
          setCountries(fetched);

          let currentC = null;
          if (countryName) {
            currentC = fetched.find(c => c.name.toLowerCase() === countryName.toLowerCase());
            if (currentC) {
              setSelectedCountry(currentC.id);
              setCountryDetails(currentC);
            }
          } else if (fetched.length > 0) {
            const activeCountriesNames = fetched.map(c => c.name.toLowerCase());
            const storedCountry = localStorage.getItem('selected_country_solar-shop');
            const defaultCountry = (storedCountry && activeCountriesNames.includes(storedCountry.toLowerCase()))
              ? storedCountry.toLowerCase()
              : fetched[0].name.toLowerCase();

            navigate(`/admin-panel/solar-shop/${defaultCountry}/combokit-configurations/combo-kits`, { replace: true });
            return;
          }
        }

        // Fetch Brands
        const brandRes = await axios.get(
          `${API_URL}/brand-manufacturer/get-brands-with-logo-name-only?unique_id=ADM_SOLAR_KITS&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (brandRes.data?.status === "success") {
          setBrands(brandRes.data.data || []);
        }

        // Fetch Master Solar Kits
        await fetchMasterKits();

        // Fetch Filter Industry Types & Categories
        fetchFilterIndustryTypes();
        fetchFilterCategories();

      } catch (error) {
        console.error("Error fetching initial master solar kit data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountriesAndMasterData();
  }, [countryName, moduleUniqueId]);



  // Selected Master Details Map
  const selectedSolarKitObj = useMemo(() => {
    return masterKits.find(mk => (mk.id || mk._id) === formData.solar_kit_id);
  }, [formData.solar_kit_id, masterKits]);

  // Fetch Project Ranges dynamically when Selected Kit changes
  const selectedKitTypeId = useMemo(() => {
    if (!selectedSolarKitObj) return null;
    const t = selectedSolarKitObj.type_id;
    if (!t) return null;
    return t._id?.toString() || t.id?.toString() || t.toString();
  }, [selectedSolarKitObj]);

  useEffect(() => {
    if (selectedKitTypeId) {
      axios.get(`${API_URL}/project-types/get-ranges?subcategory_type_id=${selectedKitTypeId}&unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() })
        .then(res => {
          if (res.data?.status === "success") {
            setProjectRanges(res.data.data || []);
          }
        })
        .catch(err => console.error("Error fetching project ranges:", err));
    } else {
      setProjectRanges([]);
    }
  }, [selectedKitTypeId, moduleUniqueId]);

  // Save draft for Combo Kit Configuration (only in Add mode)
  useEffect(() => {
    if (showDrawer && !editingKit) {
      const draftKey = "combokit_draft_" + (countryName || "global");
      const hasContent = formData.name || formData.description || formData.solar_kit_id;
      if (hasContent) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      } else {
        localStorage.removeItem(draftKey);
      }
    }
  }, [showDrawer, editingKit, formData, countryName]);

  // Fetch SKUs for base components dynamically
  const fetchSkusForBaseComponent = async (index, templateId, brandId = "", subtypeId = "") => {
    const cleanTemplateId = templateId && typeof templateId === 'object' ? (templateId._id || templateId.id) : templateId;
    const cleanBrandId = brandId && typeof brandId === 'object' ? (brandId._id || brandId.id) : brandId;
    const cleanSubtypeId = subtypeId && typeof subtypeId === 'object' ? (subtypeId._id || subtypeId.id) : subtypeId;

    if (!cleanTemplateId) {
      setBaseComponentSkus(prev => ({ ...prev, [index]: [] }));
      return;
    }
    try {
      const bc = formData.base_components[index];
      const isRegular = bc && isSubtypeRegularInverter(bc);
      let extraParams = "";
      if (isRegular && formData.capacity) {
        const mode = formData.inverter_mode || "single";
        const qty = mode === "single" ? 1 : parseFloat(bc?.quantity || 2) || 2;
        const targetCap = formData.capacity / qty;
        const targetTol = formData.inverter_tolerance || 10;
        extraParams = `&capacity=${targetCap}&tolerance=${targetTol}`;
      }

      const brandParam = cleanBrandId ? `&brand_id=${cleanBrandId}` : "";
      const subtypeParam = cleanSubtypeId ? `&subtype_id=${cleanSubtypeId}` : "";
      const res = await axios.get(
        `${API_URL}/products/search-skus?template_id=${cleanTemplateId}${brandParam}${subtypeParam}${extraParams}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setBaseComponentSkus(prev => ({
          ...prev,
          [index]: res.data.data || []
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    formData.base_components.forEach((bc, idx) => {
      if (isSubtypeRegularInverter(bc) || isSubtypeMicroInverter(bc)) {
        const templateId = bc.template_id?._id || bc.template_id?.id || bc.template_id;
        const brandId = bc.brand_id?._id || bc.brand_id?.id || bc.brand_id || "";
        const subtypeId = bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || "";

        if (templateId) {
          fetchSkusForBaseComponent(idx, templateId, brandId || "", subtypeId);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"))?.sku_id,
    formData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"))?.quantity,
    formData.inverter_tolerance,
    formData.inverter_mode,
    formData.base_components.find(bc => bc.name?.toLowerCase().includes("inverter"))?.quantity,
    formData.capacity
  ]);

  useEffect(() => {
    setFormData(prev => {
      let hasChanges = false;
      const updatedBase = (prev.base_components || []).map((bc, idx) => {
        const isRegular = isSubtypeRegularInverter(bc);
        if (isRegular && bc.sku_id && baseComponentSkus[idx] && baseComponentSkus[idx].length > 0) {
          const pool = baseComponentSkus[idx];
          const filtered = getFilteredSkusForComponent(idx, bc, pool, prev);
          const isCompatible = filtered.some(s => String(s.id || s._id) === String(bc.sku_id));
          if (!isCompatible) {
            hasChanges = true;
            return { ...bc, sku_id: "" };
          }
        }
        return bc;
      });
      if (hasChanges) {
        return { ...prev, base_components: updatedBase };
      }
      return prev;
    });
  }, [formData.capacity, formData.inverter_mode, baseComponentSkus]);

  const fetchSkusForBosItem = async (groupIdx, itemIdx, templateId, brandId, subtypeIds = []) => {
    if (!templateId) {
      setBosComponentSkus(prev => ({ ...prev, [`${groupIdx}_${itemIdx}`]: [] }));
      return;
    }
    try {
      const isStandardKit = brandId === "Standard Kit";
      const brandParam = (isStandardKit || !brandId) ? "" : `&brand_id=${brandId}`;
      const subtypeParam = (subtypeIds && subtypeIds.length > 0) ? `&subtype_id=${subtypeIds.join(",")}` : "";
      const res = await axios.get(
        `${API_URL}/products/search-skus?template_id=${templateId}${brandParam}${subtypeParam}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setBosComponentSkus(prev => ({
          ...prev,
          [`${groupIdx}_${itemIdx}`]: (res.data.data || []).map(s => ({
            text: s.sku_code,
            value: s.id || s._id,
            attributes: s.attributes || []
          }))
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBrandsForTemplate = async (templateId) => {
    const cleanId = (templateId?.id || templateId?._id || templateId)?.toString();
    if (!cleanId) return;
    try {
      const res = await axios.get(
        `${API_URL}/product-templates/get-brands-by-template-flat?template_id=${cleanId}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setTemplateBrands(prev => ({
          ...prev,
          [cleanId]: res.data.data || []
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBrandsForSubtype = async (subtypeIdOrIds) => {
    if (!subtypeIdOrIds) return;
    const cleanId = Array.isArray(subtypeIdOrIds)
      ? subtypeIdOrIds.map(st => st?._id || st?.id || st).filter(Boolean).join(",")
      : (subtypeIdOrIds?._id || subtypeIdOrIds?.id || subtypeIdOrIds)?.toString();
    if (!cleanId || subtypeBrands[cleanId]) return;
    try {
      const res = await axios.get(
        `${API_URL}/product-templates/get-brands-by-subtype?subtype_id=${cleanId}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSubtypeBrands(prev => ({
          ...prev,
          [cleanId]: res.data.data || []
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSkuDetails = async (skuId) => {
    if (!skuId || skuDetailsCache[skuId]) return;
    try {
      const res = await axios.get(
        `${API_URL}/products/get-sku-details?sku_id=${skuId}&unique_id=ADM_SOLAR_KITS&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSkuDetailsCache(prev => ({
          ...prev,
          [skuId]: res.data.data
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Form handle changes
  const handleFormChange = async (key, value) => {
    if (key === "solar_kit_id") {
      setBaseComponentSkus({});
      setBosComponentSkus({});
      setSkuDetailsCache({});
      setTemplateBrands({});
      setSubtypeBrands({});

      // Fetch the latest kit data directly from the API so template/subtype
      // changes made in SolarKits.jsx are always reflected (avoids stale cache)
      let selectedMaster = null;
      try {
        const res = await axios.get(
          `${API_URL}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          const fresh = res.data.data || [];
          setMasterKits(fresh); // keep local list in sync too
          selectedMaster = fresh.find(mk => (mk.id || mk._id) === value);
        }
      } catch (e) {
        console.error("Error fetching solar kits on kit select:", e);
        // Fall back to local cache if API call fails
        selectedMaster = masterKits.find(mk => (mk.id || mk._id) === value);
      }

      setFormData(prev => {
        const updated = { ...prev, [key]: value };
        if (selectedMaster) {
          if (selectedMaster.base_components && selectedMaster.base_components.length > 0) {
            updated.base_components = selectedMaster.base_components.map((bc, idx) => {
              const tId = bc.template_id?._id || bc.template_id?.id || bc.template_id;
              const subId = bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || "";
              const subName = bc.subtype_id?.name || "";
              const tName = bc.template_id?.name || 'Base Component';
              if (subId) fetchBrandsForSubtype(subId);
              else if (tId) fetchBrandsForTemplate(tId);

              if (tId) {
                fetchSkusForBaseComponent(idx, tId, "", subId || "");
              }

              const isRegular = tName.toLowerCase().includes("inverter") && !tName.toLowerCase().includes("micro");

              return {
                template_id: tId,
                name: tName,
                subtype_id: subId || null,
                subtype_name: subName,
                brand_id: "",
                sku_id: "",
                quantity: isRegular ? 1 : 0
              };
            });
          } else {
            updated.base_components = (selectedMaster.base_template_ids || []).map((t, idx) => {
              const templateId = t._id || t.id || t;
              fetchBrandsForTemplate(templateId);

              if (templateId) {
                fetchSkusForBaseComponent(idx, templateId, "", "");
              }

              const isRegular = t.name?.toLowerCase().includes("inverter") && !t.name?.toLowerCase().includes("micro");

              return {
                template_id: templateId,
                name: t.name || 'Component Template',
                subtype_id: null,
                subtype_name: '',
                brand_id: "",
                sku_id: "",
                quantity: isRegular ? 1 : 0
              };
            });
          }

          updated.bos_kits = (selectedMaster.bos_kits || []).map((bk, groupIdx) => {
            const itemsSource = bk.items && bk.items.length > 0
              ? bk.items
              : (bk.template_ids || []).map(t => ({ template_id: t, subtype_ids: [] }));

            const items = itemsSource.map((item, itemIdx) => {
              const t = item.template_id;
              const tId = t?._id || t?.id || t;
              const tName = t?.name || 'Component';
              const subtypeIds = (item.subtype_ids || []).map(st => st?._id || st?.id || st).filter(Boolean);
              const subtypeNames = (item.subtype_ids || []).map(st => st?.name || "").filter(Boolean);

              if (subtypeIds && subtypeIds.length > 0) {
                fetchBrandsForSubtype(subtypeIds);
              } else {
                fetchBrandsForTemplate(tId);
              }
              fetchSkusForBosItem(groupIdx, itemIdx, tId, "Standard Kit", subtypeIds);
              return {
                template_id: tId,
                subtype_ids: subtypeIds,
                subtype_names: subtypeNames,
                name: tName,
                brand_id: "",
                sku_id: "",
                quantity: 1
              };
            });

            const groupSubtypeIds = items.flatMap(item => item.subtype_ids).filter(Boolean);
            const groupTemplateIds = items.map(item => item.template_id).filter(Boolean);

            return {
              name: bk.name,
              brand_id: "Standard Kit",
              sku_id: "",
              quantity: 1,
              image: bk.image || "",
              template_ids: groupTemplateIds,
              subtype_ids: groupSubtypeIds,
              items
            };
          });
        } else {
          updated.base_components = [];
          updated.bos_kits = [];
        }
        return updated;
      });
    } else if (key === "inverter_mode") {
      setFormData(prev => {
        const copy = { ...prev, inverter_mode: value };
        copy.base_components = (prev.base_components || []).map((bc, idx) => {
          const isRegular = isSubtypeRegularInverter(bc);
          if (isRegular) {
            const updatedBc = { ...bc };
            const currentQty = parseFloat(bc.quantity) || 0;
            if (value === "multi" && currentQty < 2) {
              updatedBc.quantity = 2;
            } else if (value === "single") {
              updatedBc.quantity = 1;
            }

            if (updatedBc.sku_id) {
              const pool = baseComponentSkus[idx] || [];
              const filtered = getFilteredSkusForComponent(idx, updatedBc, pool, copy);
              const isCompatible = filtered.some(s => String(s.id || s._id) === String(updatedBc.sku_id));
              if (!isCompatible) {
                updatedBc.sku_id = "";
              }
            }
            return updatedBc;
          }
          return bc;
        });
        return copy;
      });
    } else {
      setFormData(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleBaseBrandChange = async (index, brandId) => {
    setFormData(prev => {
      const copy = [...prev.base_components];
      copy[index] = { ...copy[index], brand_id: brandId, sku_id: "" };
      return { ...prev, base_components: copy };
    });

    const bc = formData.base_components[index];
    const templateId = bc.template_id?._id || bc.template_id?.id || bc.template_id;
    const subtypeId = bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || "";

    if (templateId && brandId) {
      await fetchSkusForBaseComponent(index, templateId, brandId, subtypeId);
    }
  };

  const handleBaseSkuChange = async (index, skuId) => {
    setFormData(prev => {
      const copy = [...prev.base_components];
      const selectedSku = (baseComponentSkus[index] || []).find(s => String(s.id || s._id) === String(skuId));
      const brandId = selectedSku?.brand_id || copy[index].brand_id || "";
      copy[index] = { ...copy[index], sku_id: skuId, brand_id: brandId };
      return { ...prev, base_components: copy };
    });
    if (skuId) {
      await fetchSkuDetails(skuId);
    }
  };

  const handleBosGroupBrandChange = async (groupIdx, brandId) => {
    setFormData(prev => {
      const copy = [...prev.bos_kits];
      copy[groupIdx] = { ...copy[groupIdx], brand_id: brandId };
      copy[groupIdx].items = (copy[groupIdx].items || []).map(item => {
        if (!item.brand_id) {
          return { ...item, sku_id: "" };
        }
        return item;
      });
      return { ...prev, bos_kits: copy };
    });

    const bk = formData.bos_kits[groupIdx];
    for (let i = 0; i < (bk.items || []).length; i++) {
      const item = bk.items[i];
      const templateId = item.template_id;
      const subtypeIds = item.subtype_ids || [];
      if (!item.brand_id && templateId && brandId) {
        await fetchSkusForBosItem(groupIdx, i, templateId, brandId, subtypeIds);
      }
    }
  };

  const handleBosItemBrandChange = async (groupIdx, itemIdx, brandId) => {
    setFormData(prev => {
      const copy = [...prev.bos_kits];
      const items = [...copy[groupIdx].items];
      items[itemIdx] = { ...items[itemIdx], brand_id: brandId, sku_id: "" };
      copy[groupIdx] = { ...copy[groupIdx], items };
      return { ...prev, bos_kits: copy };
    });

    const bk = formData.bos_kits[groupIdx];
    const item = bk.items[itemIdx];
    const templateId = item.template_id;
    const subtypeIds = item.subtype_ids || [];
    const effectiveBrand = brandId || bk.brand_id;
    if (templateId && effectiveBrand) {
      await fetchSkusForBosItem(groupIdx, itemIdx, templateId, effectiveBrand, subtypeIds);
    }
  };

  const handleAddBosItemRow = (groupIdx, item) => {
    const newIdx = formData.bos_kits[groupIdx].items.length;
    const tId = item.template_id?.id || item.template_id?._id || item.template_id;

    const effectiveBrand = item.brand_id || formData.bos_kits[groupIdx].brand_id;
    if (tId && effectiveBrand) {
      fetchSkusForBosItem(groupIdx, newIdx, tId, effectiveBrand, item.subtype_ids || []);
    }
    if (item.subtype_ids && item.subtype_ids.length > 0) {
      fetchBrandsForSubtype(item.subtype_ids);
    } else if (tId) {
      fetchBrandsForTemplate(tId);
    }

    setFormData(prev => {
      const copy = [...prev.bos_kits];
      const itemsCopy = [...(copy[groupIdx].items || [])];
      itemsCopy.push({
        template_id: item.template_id,
        subtype_ids: item.subtype_ids || [],
        subtype_names: item.subtype_names || [],
        name: item.name,
        brand_id: item.brand_id || "",
        sku_id: "",
        quantity: 1
      });
      copy[groupIdx] = { ...copy[groupIdx], items: itemsCopy };
      return { ...prev, bos_kits: copy };
    });
  };

  const handleRemoveBosItemRow = (groupIdx, itemIdx) => {
    setFormData(prev => {
      const copy = [...prev.bos_kits];
      const itemsCopy = (copy[groupIdx].items || []).filter((_, idx) => idx !== itemIdx);

      const newBosComponentSkus = { ...bosComponentSkus };

      Object.keys(bosComponentSkus).forEach(key => {
        if (key.startsWith(`${groupIdx}_`)) {
          delete newBosComponentSkus[key];
        }
      });

      itemsCopy.forEach((item, idx) => {
        const oldKey = `${groupIdx}_${idx >= itemIdx ? idx + 1 : idx}`;
        const newKey = `${groupIdx}_${idx}`;
        if (bosComponentSkus[oldKey]) {
          newBosComponentSkus[newKey] = bosComponentSkus[oldKey];
        } else {
          const effectiveBrand = item.brand_id || copy[groupIdx].brand_id;
          fetchSkusForBosItem(groupIdx, idx, item.template_id, effectiveBrand, item.subtype_ids || []);
        }
      });

      setBosComponentSkus(newBosComponentSkus);

      copy[groupIdx] = { ...copy[groupIdx], items: itemsCopy };
      return { ...prev, bos_kits: copy };
    });
  };

  // Open Form Drawer
  const openAddKit = async () => {
    setEditingKit(null);
    setKitImageFile(null);
    setBosImageFiles({});
    setShowDrawer(true);

    // Always re-fetch master kits so the dropdown reflects the latest
    // template/subtype changes made in SolarKits.jsx
    fetchMasterKits();

    const draftKey = "combokit_draft_" + (countryName || "global");
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setLoadingDrawerData(true);
      try {
        const parsed = JSON.parse(savedDraft);

        // If draft has a solar_kit_id, always fetch the latest kit structure
        // from the API so any template/subtype changes in SolarKits.jsx
        // are reflected. Merge in the user's saved selections where possible.
        let resolvedData = { ...parsed };
        if (parsed.solar_kit_id) {
          try {
            const res = await axios.get(
              `${API_URL}/solar-kits/get-kits?unique_id=ADM_SOLAR_KITS&req_for=view`,
              { headers: authHeaderObj() }
            );
            if (res.data?.status === "success") {
              const fresh = res.data.data || [];
              setMasterKits(fresh);
              const freshKit = fresh.find(mk => (mk.id || mk._id) === parsed.solar_kit_id);
              if (freshKit) {
                // Helper: find draft component matching a fresh template_id
                const findDraftBc = (tId) =>
                  (parsed.base_components || []).find(d => {
                    const dId = d.template_id?._id || d.template_id?.id || d.template_id;
                    return String(dId) === String(tId);
                  });

                // Rebuild base_components from fresh kit, preserving user selections
                const sourceComponents = freshKit.base_components?.length > 0
                  ? freshKit.base_components
                  : (freshKit.base_template_ids || []).map(t => ({ template_id: t, subtype_id: null }));

                resolvedData.base_components = sourceComponents.map(bc => {
                  const tId = bc.template_id?._id || bc.template_id?.id || bc.template_id;
                  const subId = bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || "";
                  const subName = bc.subtype_id?.name || "";
                  const tName = bc.template_id?.name || "Base Component";
                  const isRegular = tName.toLowerCase().includes("inverter") && !tName.toLowerCase().includes("micro");

                  // Restore user's prior selection if template_id still matches
                  const saved = findDraftBc(tId);
                  return {
                    template_id: tId,
                    name: tName,
                    subtype_id: subId || null,
                    subtype_name: subName,
                    brand_id: saved?.brand_id || "",
                    sku_id: saved?.sku_id || "",
                    quantity: saved?.quantity ?? (isRegular ? 1 : 0)
                  };
                });

                // Rebuild bos_kits from fresh kit, preserving user selections
                resolvedData.bos_kits = (freshKit.bos_kits || []).map((bk, groupIdx) => {
                  const savedGroup = (parsed.bos_kits || [])[groupIdx];
                  const itemsSource = bk.items?.length > 0
                    ? bk.items
                    : (bk.template_ids || []).map(t => ({ template_id: t, subtype_ids: [] }));

                  const items = itemsSource.map((item, itemIdx) => {
                    const t = item.template_id;
                    const tId = t?._id || t?.id || t;
                    const tName = t?.name || "Component";
                    const subtypeIds = (item.subtype_ids || []).map(st => st?._id || st?.id || st).filter(Boolean);
                    const subtypeNames = (item.subtype_ids || []).map(st => st?.name || "").filter(Boolean);
                    const savedItem = (savedGroup?.items || [])[itemIdx];
                    return {
                      template_id: tId,
                      subtype_ids: subtypeIds,
                      subtype_names: subtypeNames,
                      name: tName,
                      brand_id: savedItem?.brand_id || "",
                      sku_id: savedItem?.sku_id || "",
                      quantity: savedItem?.quantity ?? 1
                    };
                  });

                  const groupSubtypeIds = items.flatMap(i => i.subtype_ids).filter(Boolean);
                  const groupTemplateIds = items.map(i => i.template_id).filter(Boolean);
                  return {
                    name: bk.name,
                    brand_id: savedGroup?.brand_id || "Standard Kit",
                    sku_id: "",
                    quantity: savedGroup?.quantity ?? 1,
                    image: bk.image || savedGroup?.image || "",
                    template_ids: groupTemplateIds,
                    subtype_ids: groupSubtypeIds,
                    items
                  };
                });
              }
            }
          } catch (fetchErr) {
            console.error("Failed to refresh kit structure for draft:", fetchErr);
            // Continue with raw draft if API fails
          }
        }

        setFormData(resolvedData);

        // Pre-load all SKU options and details for restored components
        if (resolvedData.base_components?.length > 0) {
          for (let idx = 0; idx < resolvedData.base_components.length; idx++) {
            const bc = resolvedData.base_components[idx];
            const tId = bc.template_id?._id || bc.template_id?.id || bc.template_id;
            const bId = bc.brand_id;
            const sId = bc.sku_id;
            const subId = bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || null;

            if (tId) await fetchBrandsForTemplate(tId);
            if (subId) await fetchBrandsForSubtype(subId);

            if (tId) {
              await fetchSkusForBaseComponent(idx, tId, bId || "", subId || "");
            }
            if (sId) {
              await fetchSkuDetails(sId);
            }
          }
        }

        if (resolvedData.bos_kits?.length > 0) {
          for (let groupIdx = 0; groupIdx < resolvedData.bos_kits.length; groupIdx++) {
            const group = resolvedData.bos_kits[groupIdx];
            const groupBrandId = group.brand_id;

            for (let itemIdx = 0; itemIdx < (group.items || []).length; itemIdx++) {
              const item = group.items[itemIdx];
              const tId = item.template_id;
              const itemBrandId = item.brand_id || groupBrandId;
              const sId = item.sku_id;
              const subIds = item.subtype_ids || [];

              if (subIds?.length > 0) {
                await fetchBrandsForSubtype(subIds);
              } else if (tId) {
                await fetchBrandsForTemplate(tId);
              }

              if (tId) {
                await fetchSkusForBosItem(groupIdx, itemIdx, tId, itemBrandId || "", subIds);
              }
              if (sId) {
                await fetchSkuDetails(sId);
              }
            }
          }
        }

        dispatch(setAlert({ type: "success", message: "Restored draft with latest kit structure!" }));
      } catch (e) {
        console.error("Failed to restore draft:", e);
        setFormData({
          name: "",
          description: "",
          solar_kit_id: "",
          brand_id: "",
          project_range_id: "",
          capacity: 0,
          inverter_tolerance: 10,
          inverter_mode: "single",
          variant_id: "",
          variant_ids: [],
          kit_image: null,
          base_components: [],
          bos_kits: [],
          order_quantities: [],
          loose_order_quantities: [],
          allow_trial_kit: false,
          trial_kit_quantity: 10,
          trial_kit_max_orders_per_buyer: 1
        });
      } finally {
        setLoadingDrawerData(false);
      }

    } else {
      setFormData({
        name: "",
        description: "",
        solar_kit_id: "",
        brand_id: "",
        project_range_id: "",
        capacity: 0,
        inverter_tolerance: 10,
        inverter_mode: "single",
        variant_id: "",
        variant_ids: [],
        kit_image: null,
        base_components: [],
        bos_kits: [],
        order_quantities: [],
        loose_order_quantities: [],
        allow_trial_kit: false,
        trial_kit_quantity: 10,
        trial_kit_max_orders_per_buyer: 1
      });
      setLoadingDrawerData(false);
    }
  };

  const openEditKit = async (row) => {
    setEditingKit(row);
    setKitImageFile(null);
    setBosImageFiles({});
    setShowDrawer(true);
    setLoadingDrawerData(true);

    // Refresh master kits list in background so the dropdown stays current
    fetchMasterKits();

    try {
      const formattedBase = [];
      for (let idx = 0; idx < (row.base_components || []).length; idx++) {
        const bc = row.base_components[idx];
        const tId = bc.template_id?.id || bc.template_id?._id || bc.template_id;
        const bId = bc.brand_id?.id || bc.brand_id?._id || bc.brand_id || "";
        const sId = bc.sku_id?.id || bc.sku_id?._id || bc.sku_id || "";
        const subId = bc.subtype_id?.id || bc.subtype_id?._id || bc.subtype_id || null;

        if (tId) await fetchBrandsForTemplate(tId);
        if (subId) await fetchBrandsForSubtype(subId);

        formattedBase.push({
          template_id: tId,
          name: bc.template_id?.name || 'Base Component',
          subtype_id: subId,
          subtype_name: bc.subtype_id?.name || '',
          brand_id: bId,
          sku_id: sId,
          quantity: bc.quantity || 1
        });

        if (tId) {
          await fetchSkusForBaseComponent(idx, tId, bId || "", subId || "");
        }
        if (sId) {
          await fetchSkuDetails(sId);
        }
      }

      const groupedBosKits = [];
      (row.bos_kits || []).forEach(bk => {
        let groupName = bk.name;
        let itemName = "Component";
        if (bk.name.includes(" — ")) {
          const parts = bk.name.split(" — ");
          groupName = parts[0];
          itemName = parts.slice(1).join(" — ");
        }

        let group = groupedBosKits.find(g => g.name === groupName);
        if (!group) {
          group = {
            name: groupName,
            brand_id: bk.brand_id?.id || bk.brand_id?._id || bk.brand_id || "Standard Kit",
            image: bk.image || "",
            items: []
          };
          groupedBosKits.push(group);
        }

        const tId = (bk.template_ids || []).map(t => t.id || t._id || t)[0] || "";
        const subtypeIds = (bk.subtype_ids || []).map(st => st.id || st._id || st).filter(Boolean);
        const subtypeNames = (bk.subtype_ids || []).map(st => st.name || "").filter(Boolean);
        group.items.push({
          template_id: tId,
          subtype_ids: subtypeIds,
          subtype_names: subtypeNames,
          name: itemName,
          brand_id: bk.brand_id?.id || bk.brand_id?._id || bk.brand_id || "",
          sku_id: bk.sku_id?.id || bk.sku_id?._id || bk.sku_id || "",
          quantity: bk.quantity || 1
        });
      });

      const formattedBos = [];
      for (let groupIdx = 0; groupIdx < groupedBosKits.length; groupIdx++) {
        const group = groupedBosKits[groupIdx];
        const groupBrandId = group.brand_id;

        const formattedItems = [];
        const groupTemplateIds = [];
        const groupSubtypeIds = [];

        for (let itemIdx = 0; itemIdx < group.items.length; itemIdx++) {
          const item = group.items[itemIdx];
          const tId = item.template_id;
          const itemBrandId = item.brand_id || groupBrandId;
          const sId = item.sku_id;
          const subIds = item.subtype_ids;

          if (tId) groupTemplateIds.push(tId);
          if (subIds && subIds.length > 0) {
            subIds.forEach(sid => groupSubtypeIds.push(sid));
            await fetchBrandsForSubtype(subIds);
          } else if (tId) {
            await fetchBrandsForTemplate(tId);
          }

          formattedItems.push({
            template_id: tId,
            name: item.name,
            brand_id: item.brand_id || "",
            sku_id: sId,
            quantity: item.quantity,
            subtype_ids: subIds,
            subtype_names: item.subtype_names || []
          });

          if (tId) {
            await fetchSkusForBosItem(groupIdx, itemIdx, tId, itemBrandId || "", subIds);
          }
          if (sId) {
            await fetchSkuDetails(sId);
          }
        }

        formattedBos.push({
          name: group.name,
          brand_id: groupBrandId,
          image: group.image || "",
          template_ids: [...new Set(groupTemplateIds)],
          subtype_ids: [...new Set(groupSubtypeIds)],
          items: formattedItems
        });
      }

      const hasMultiInverter = formattedBase.some(bc => {
        const isRegular = isSubtypeRegularInverter(bc);
        return isRegular && (parseFloat(bc.quantity) >= 2);
      });

      setFormData({
        name: row.name || "",
        description: row.description || "",
        solar_kit_id: row.solar_kit_id?.id || row.solar_kit_id?._id || row.solar_kit_id,
        brand_id: row.brand_id?._id || row.brand_id?.id || row.brand_id || "",
        project_range_id: row.project_range_id?.id || row.project_range_id?._id || row.project_range_id || "",
        order_quantities: Array.isArray(row.order_quantities) ? row.order_quantities.map(Number).filter(n => !isNaN(n) && n > 0) : [],
        loose_order_quantities: Array.isArray(row.loose_order_quantities) ? row.loose_order_quantities.map(Number).filter(n => !isNaN(n) && n > 0) : [],
        allow_trial_kit: Boolean(row.allow_trial_kit),
        trial_kit_quantity: Number(row.trial_kit_quantity) || 10,
        trial_kit_max_orders_per_buyer: row.trial_kit_max_orders_per_buyer !== undefined ? Number(row.trial_kit_max_orders_per_buyer) : 1,
        capacity: row.capacity || 0,
        inverter_tolerance: row.inverter_tolerance || 10,
        inverter_mode: row.inverter_mode || (hasMultiInverter ? "multi" : "single"),
        variant_id: row.variant_id || (row.variant?.id || row.variant?._id || row.variant || ""),
        variant_ids: row.variant_ids ? row.variant_ids.map(id => id.id || id._id || id) : (row.variant_id || (row.variant?.id || row.variant?._id || row.variant) ? [row.variant_id || (row.variant?.id || row.variant?._id || row.variant)] : []),
        kit_image: row.kit_image,
        base_components: formattedBase,
        bos_kits: formattedBos
      });
    } catch (e) {
      console.error("Failed to load edit kit data:", e);
      dispatch(setAlert({ type: "error", message: "Failed to load combo kit configuration details." }));
    } finally {
      setLoadingDrawerData(false);
    }
  };

  // Form Submit
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.solar_kit_id) {
      dispatch(setAlert({ type: "warning", message: "Please specify the custom name and solar kit blueprint." }));
      return;
    }

    const hasInvalidBaseQty = formData.base_components.some(bc => bc.quantity === "" || bc.quantity <= 0);
    const hasInvalidBosQty = formData.bos_kits.some(bk => (bk.items || []).some(item => item.quantity === "" || item.quantity <= 0));
    if (hasInvalidBaseQty || hasInvalidBosQty) {
      dispatch(setAlert({ type: "warning", message: "Please specify valid quantities (at least 1) for all components." }));
      return;
    }

    if (!kitImageFile && !formData.kit_image) {
      dispatch(setAlert({ type: "warning", message: "Combo kit cover image is required." }));
      return;
    }

    const hasMissingBosImage = formData.bos_kits.some((bk, groupIdx) => !bk.image && !bosImageFiles[groupIdx]);
    if (hasMissingBosImage) {
      dispatch(setAlert({ type: "warning", message: "All BOS kits must have an image." }));
      return;
    }

    setLoadingForm(true);
    try {
      const payload = new FormData();
      if (editingKit) {
        payload.append("id", editingKit.id || editingKit._id);
      }
      payload.append("name", formData.name);
      payload.append("description", formData.description || "");

      const rawCountryId = selectedCountry || editingKit?.country_id?._id || editingKit?.country_id?.id || editingKit?.country_id || "";
      const rawSolarKitId = formData.solar_kit_id?._id || formData.solar_kit_id?.id || formData.solar_kit_id || "";
      const rawBrandId = formData.brand_id?._id || formData.brand_id?.id || formData.brand_id || "";
      const rawRangeId = formData.project_range_id?._id || formData.project_range_id?.id || formData.project_range_id || "";
      const rawVariantId = formData.variant_id?._id || formData.variant_id?.id || formData.variant_id || "";
      const cleanVariantIds = (formData.variant_ids || []).map(v => v?._id || v?.id || v).filter(Boolean);

      payload.append("country_id", rawCountryId);
      payload.append("solar_kit_id", rawSolarKitId);
      payload.append("brand_id", rawBrandId);
      payload.append("project_range_id", rawRangeId);
      payload.append("capacity", formData.capacity || 0);
      payload.append("inverter_tolerance", formData.inverter_tolerance || 10);
      payload.append("inverter_mode", formData.inverter_mode || "single");
      payload.append("variant_id", rawVariantId);
      payload.append("variant_ids", JSON.stringify(cleanVariantIds));
      payload.append("order_quantities", JSON.stringify((formData.order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)));
      payload.append("loose_order_quantities", JSON.stringify((formData.loose_order_quantities || []).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b)));
      payload.append("allow_trial_kit", formData.allow_trial_kit ? "true" : "false");
      payload.append("trial_kit_quantity", formData.trial_kit_quantity || 10);
      payload.append("trial_kit_max_orders_per_buyer", formData.trial_kit_max_orders_per_buyer !== undefined ? formData.trial_kit_max_orders_per_buyer : 1);

      const cleanBaseComponents = (formData.base_components || []).map(bc => ({
        template_id: bc.template_id?._id || bc.template_id?.id || bc.template_id,
        subtype_id: bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || null,
        brand_id: bc.brand_id?._id || bc.brand_id?.id || bc.brand_id || null,
        brand_ids: (bc.brand_ids || []).map(b => b?._id || b?.id || b).filter(Boolean),
        sku_id: bc.sku_id?._id || bc.sku_id?.id || bc.sku_id || null,
        quantity: parseFloat(bc.quantity) || 1
      }));
      payload.append("base_components", JSON.stringify(cleanBaseComponents));

      const flattenedBosKits = [];
      let flatIdx = 0;
      (formData.bos_kits || []).forEach((bk, groupIdx) => {
        (bk.items || []).forEach(item => {
          let resolvedBrandId = item.brand_id || bk.brand_id || null;
          resolvedBrandId = resolvedBrandId?._id || resolvedBrandId?.id || resolvedBrandId;
          if (resolvedBrandId === "Standard Kit") {
            resolvedBrandId = null;
          }
          const tId = item.template_id?._id || item.template_id?.id || item.template_id;
          const sId = item.sku_id?._id || item.sku_id?.id || item.sku_id || null;
          const subIds = (item.subtype_ids || []).map(s => s?._id || s?.id || s).filter(Boolean);

          flattenedBosKits.push({
            name: `${bk.name || "BOS Kit"} — ${item.name || "Item"}`,
            brand_id: resolvedBrandId || null,
            sku_id: sId,
            quantity: parseFloat(item.quantity) || 1,
            image: bk.image || null,
            template_ids: tId ? [tId] : [],
            subtype_ids: subIds
          });

          if (bosImageFiles[groupIdx]) {
            payload.append(`bos_kit_image_${flatIdx}`, bosImageFiles[groupIdx]);
          }
          flatIdx++;
        });
      });

      payload.append("bos_kits", JSON.stringify(flattenedBosKits));

      if (kitImageFile) {
        payload.append("kit_image", kitImageFile);
      }

      const url = editingKit
        ? `${baseEndpoint}/update-kit?unique_id=${moduleUniqueId}&req_for=edit`
        : `${baseEndpoint}/create-kit?unique_id=${moduleUniqueId}&req_for=add`;
      const method = editingKit ? 'put' : 'post';

      const res = await axios({
        method,
        url,
        data: payload,
        headers: {
          ...authHeaderObj(),
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        if (!editingKit) {
          localStorage.removeItem("combokit_draft_" + (countryName || "global"));
        }
        setShowDrawer(false);
        fetchConfiguredKits(selectedCountry);
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to configure Combo Kit." }));
    } finally {
      setLoadingForm(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await axios.post(
        `${baseEndpoint}/delete-kit?unique_id=${moduleUniqueId}&req_for=delete`,
        { id: deleteConfirm.id },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        fetchConfiguredKits(selectedCountry);
      }
    } catch (e) {
      console.error(e);
      dispatch(setAlert({ type: "error", message: "Failed to delete combo kit configuration." }));
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Auto calculate capacity in kW: Panel quantity * Panel W rating / 1000
  const calculatedCapacity = useMemo(() => {
    const panelsObj = formData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"));
    if (!panelsObj || !panelsObj.sku_id || !panelsObj.quantity) return 0;

    const panelSku = skuDetailsCache[panelsObj.sku_id] ||
      (baseComponentSkus[formData.base_components.indexOf(panelsObj)] || []).find(s => (s.id || s._id || s.value) === panelsObj.sku_id);
    if (!panelSku) return 0;

    const power = getSkuPower(panelSku); // returns kW
    if (power === null) return 0;

    return parseFloat((power * parseFloat(panelsObj.quantity)).toFixed(4));
  }, [formData.base_components, skuDetailsCache, baseComponentSkus]);

  // Sync calculated capacity back to formData
  useEffect(() => {
    if (calculatedCapacity > 0 && calculatedCapacity !== formData.capacity) {
      setFormData(prev => ({ ...prev, capacity: calculatedCapacity }));
    }
  }, [calculatedCapacity, formData.capacity]);

  // Auto-calculate micro-inverter quantity: panels count ÷ connected panels of micro-inverter SKU
  useEffect(() => {
    const panelBc = formData.base_components.find(bc => bc.name?.toLowerCase().includes("panel"));
    const panelsCount = parseInt(panelBc?.quantity || 0) || 0;

    let hasChanges = false;
    const updatedBaseComponents = formData.base_components.map((bc, idx) => {
      if (isSubtypeMicroInverter(bc)) {
        let microQty = 0;
        if (bc.sku_id && panelsCount > 0) {
          const microSku = skuDetailsCache[bc.sku_id] ||
            (baseComponentSkus[idx] || []).find(s => (s.id || s._id || s.value) === bc.sku_id);
          if (microSku) {
            const cp = getSkuConnectedPanels(microSku);
            if (cp && cp > 0) {
              microQty = Math.ceil(panelsCount / cp);
            }
          }
        }
        if (bc.quantity !== microQty) {
          hasChanges = true;
          return { ...bc, quantity: microQty };
        }
      }
      return bc;
    });

    if (hasChanges) {
      setFormData(prev => ({ ...prev, base_components: updatedBaseComponents }));
    }
  }, [formData.base_components, skuDetailsCache, baseComponentSkus]);

  // Currently selected project range object
  const selectedProjectRangeObj = useMemo(() => {
    if (!formData.project_range_id || projectRanges.length === 0) return null;
    return projectRanges.find(pr => String(pr._id || pr.id) === String(formData.project_range_id)) || null;
  }, [formData.project_range_id, projectRanges]);

  // Handle auto-selected matched project range based on capacity
  const matchedProjectRangeObj = useMemo(() => {
    if (!formData.capacity || projectRanges.length === 0) return null;
    return projectRanges.find(pr => {
      const minVal = getRangeBoundInkW(pr.min_value, pr);
      const maxVal = getRangeBoundInkW(pr.max_value, pr);
      return formData.capacity >= minVal && formData.capacity <= maxVal;
    });
  }, [formData.capacity, projectRanges]);

  // When matched project range changes due to capacity calculation, auto-sync project_range_id
  useEffect(() => {
    if (matchedProjectRangeObj) {
      const rangeId = matchedProjectRangeObj._id || matchedProjectRangeObj.id;
      setFormData(prev => {
        if (prev.project_range_id !== rangeId) {
          return { ...prev, project_range_id: rangeId };
        }
        return prev;
      });
    }
  }, [matchedProjectRangeObj]);

  // If projectRanges change (e.g. user selected different solar kit), ensure selected range is still valid
  useEffect(() => {
    if (projectRanges.length > 0) {
      setFormData(prev => {
        if (prev.project_range_id) {
          const isValid = projectRanges.some(pr => String(pr._id || pr.id) === String(prev.project_range_id));
          if (!isValid) {
            return { ...prev, project_range_id: "" };
          }
        }
        return prev;
      });
    }
  }, [projectRanges]);

  const isCapacityOutOfRange = useMemo(() => {
    if (projectRanges.length === 0 || !formData.capacity) return false;
    if (selectedProjectRangeObj) {
      const minVal = getRangeBoundInkW(selectedProjectRangeObj.min_value, selectedProjectRangeObj);
      const maxVal = getRangeBoundInkW(selectedProjectRangeObj.max_value, selectedProjectRangeObj);
      return formData.capacity < minVal || formData.capacity > maxVal;
    }
    return !matchedProjectRangeObj;
  }, [projectRanges, formData.capacity, selectedProjectRangeObj, matchedProjectRangeObj]);

  // Dropdown options
  const masterKitOptions = useMemo(() => {
    return masterKits.map(mk => ({ text: mk.name, value: mk._id || mk.id }));
  }, [masterKits]);

  const projectRangeOptions = useMemo(() => {
    return projectRanges.map(pr => ({
      text: `${pr.min_value} - ${pr.max_value} ${pr.unit_symbol || pr.unit_id?.symbol || 'kW'}`,
      value: pr._id || pr.id
    }));
  }, [projectRanges]);

  const bosBrandOptions = useMemo(() => {
    return [
      { text: "Generic / Brandless", value: "" },
      { text: "Standard Kit (Global/Standardized)", value: "Standard Kit" },
      ...brands.map(b => ({
        text: b.name || b.brand_name || b.brand || "Unknown Brand",
        value: b.id || b._id || b.brand_id
      })).filter(opt => opt.value)
    ];
  }, [brands]);

  // Filtered kits for CustomTable
  const filteredConfiguredKits = useMemo(() => {
    return configuredKits.filter((k) => {
      const matchSearch = !kitsSearch ||
        k.name?.toLowerCase().includes(kitsSearch.toLowerCase()) ||
        k.solar_kit_id?.name?.toLowerCase().includes(kitsSearch.toLowerCase());

      const kitInd = k.solar_kit_id?.category_id?.industry_type_id?._id || k.solar_kit_id?.category_id?.industry_type_id || "";
      const matchInd = !selectedIndustryType || String(kitInd) === selectedIndustryType;

      const matchCat = !selectedCategory ||
        String(k.solar_kit_id?.category_id?._id || k.solar_kit_id?.category_id?.id) === selectedCategory;

      const matchSub = !selectedSubcategory ||
        String(k.solar_kit_id?.subcategory_id?._id || k.solar_kit_id?.subcategory_id?.id) === selectedSubcategory;

      const matchType = !selectedType ||
        String(k.solar_kit_id?.type_id?._id || k.solar_kit_id?.type_id?.id) === selectedType;

      const matchRange = !selectedProjectRange ||
        String(k.project_range_id?._id || k.project_range_id?.id) === selectedProjectRange;

      return matchSearch && matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [configuredKits, kitsSearch, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  // Pagination State & Calculations
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [kitsSearch, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange, selectedCountry]);

  const totalPages = Math.ceil(filteredConfiguredKits.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredConfiguredKits.length);

  const paginatedKits = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredConfiguredKits.slice(start, start + itemsPerPage);
  }, [filteredConfiguredKits, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Custom Table Configuration
  const columns = [
    {
      header: "Combo Kit Name",
      label: "Combo Kit Name",
      accessor: "name",
      render: (val, row) => (
        <div>
          <p className="text-xs font-bold text-text-primary uppercase tracking-wide">{val || 'N/A'}</p>
          {row.variants && row.variants.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {row.variants.map((v, idx) => (
                <span key={idx} className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-primary/20">
                  {v.name}
                </span>
              ))}
            </div>
          ) : row.variant?.name ? (
            <span className="inline-block mt-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-primary/20">
              {row.variant.name}
            </span>
          ) : null}
        </div>
      )
    },
    {
      header: "Country",
      label: "Country",
      accessor: "country_name",
      render: (val) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <FaShoppingBag size={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary uppercase tracking-wide">{val || countryName || 'Global'}</p>
          </div>
        </div>
      )
    },
    {
      header: "Combo Kit Cover",
      label: "Combo Kit Cover",
      accessor: "kit_image",
      render: (val) => (
        <div className="w-16 h-12 rounded-lg border border-border bg-surface-hover overflow-hidden flex items-center justify-center">
          {val ? (
            <img
              src={val.includes('localhost:3001') ? val.replace('localhost:3001', 'localhost:5000') : (val.startsWith('http://') || val.startsWith('https://')) ? val : `${API_URL.replace(/\/admin-api|\/api/g, "")}/${val.startsWith('/') ? val.slice(1) : val}`}
              alt="Kit Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
              }}
            />
          ) : (
            <FaImage className="text-text-muted/40" size={16} />
          )}
        </div>
      )
    },
    {
      header: "Solar Kit Blueprint",
      label: "Solar Kit Blueprint",
      accessor: "solar_kit_id",
      render: (val) => (
        <div>
          <p className="text-xs font-black text-text-primary uppercase tracking-wider">{val?.name || 'N/A'}</p>
          <p className="text-[9px] text-text-muted mt-0.5 font-bold uppercase tracking-wider truncate max-w-50">
            {val?.description || 'No Technical Specifications'}
          </p>
        </div>
      )
    },
    {
      header: "Trial Kits / MOQ",
      label: "Trial Kits / MOQ",
      accessor: "allow_trial_kit",
      render: (val, row) => {
        const isTrialAllowed = Boolean(val || row.allow_trial_kit);
        const trialQty = row.trial_kit_quantity || 10;
        const trialLimit = row.trial_kit_max_orders_per_buyer !== undefined ? Number(row.trial_kit_max_orders_per_buyer) : 1;
        const qtys = Array.isArray(row.order_quantities) ? row.order_quantities.filter(n => n > 0).sort((a, b) => a - b) : [];
        const looseQtys = Array.isArray(row.loose_order_quantities) ? row.loose_order_quantities.filter(n => n > 0).sort((a, b) => a - b) : [];
        return (
          <div className="space-y-1.5 max-w-64">
            {isTrialAllowed ? (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/25 shadow-2xs">
                ✓ Trial: {trialQty} Kits <span className="opacity-75 font-semibold text-[9px]">({trialLimit === 0 ? "Unlimited" : `Limit: ${trialLimit}x/Buyer`})</span>
              </span>
            ) : (
              <span className="inline-block text-[10px] text-text-muted font-bold opacity-60">Trial Disabled</span>
            )}
            {/* PO Quantities */}
            <div className="space-y-0.5">
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                PO Qty:
              </div>
              <div className="flex flex-wrap gap-1">
                {qtys.length > 0 ? qtys.map((q, idx) => (
                  <span key={idx} className="bg-amber-500/10 text-amber-700 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/20">
                    {q} Kits
                  </span>
                )) : (
                  <span className="text-[9px] text-text-muted italic">No Qty Limits</span>
                )}
              </div>
            </div>
            {/* Loose Quantities */}
            <div className="space-y-0.5">
              <div className="text-[9px] font-black uppercase tracking-wider text-sky-700">
                Loose Qty:
              </div>
              <div className="flex flex-wrap gap-1">
                {looseQtys.length > 0 ? looseQtys.map((q, idx) => (
                  <span key={idx} className="bg-sky-500/10 text-sky-700 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-sky-500/20">
                    {q} Kits
                  </span>
                )) : (
                  <span className="text-[9px] text-text-muted italic">Default (5-50 Kits)</span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: "Configured Brands",
      label: "Configured Brands",
      accessor: "base_components",
      render: (val, row) => {
        const bcBrands = (val || []).flatMap(bc => (bc.brand_ids || []).map(b => b?.brand_name || b)).concat((val || []).map(bc => bc.brand_id?.brand_name || bc.brand_id)).filter(Boolean);
        const bosBrands = (row.bos_kits || []).flatMap(bk => (bk.brand_ids || []).map(b => b?.brand_name || b)).concat((row.bos_kits || []).map(bk => bk.brand_id?.brand_name || bk.brand_id)).filter(Boolean);
        const all = [...new Set([...bcBrands, ...bosBrands])].map(b => typeof b === 'object' ? b.brand_name || b.name : b);
        return (
          <div className="flex flex-wrap gap-1 max-w-75">
            {all.length > 0 ? all.map((b, idx) => (
              <span key={idx} className="bg-linear-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
                {b}
              </span>
            )) : (
              <span className="text-[10px] text-text-muted font-bold italic">No Brands Configured</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Actions",
      label: "Actions",
      accessor: "id",
      render: (val, row) => (
        <div className="flex items-center gap-1">
          <IconButton variant="secondary" size="sm" onClick={() => { setViewingKit(row); setShowDetailModal(true); }}>
            <FaEye size={12} />
          </IconButton>
          <IconButton variant="primary" size="sm" onClick={() => openEditKit(row)}>
            <FaEdit size={12} />
          </IconButton>
          <IconButton variant="danger" size="sm" onClick={() => setDeleteConfirm(row)}>
            <FaTrash size={12} />
          </IconButton>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen space-y-6 pb-24 animate-in fade-in duration-500">
      <PageHeader
        title="Combokit Configuration"
        subtitle={`Manage localized configurations of solar combo kits including cover images, specific brands, and BOS kit accessories for ${countryName || 'Global'}.`}
        icon={FaShoppingBag}
        stats={[
          { label: "Configured Kits", value: configuredKits.length, description: `Active ${countryName || 'Global'} combo kits` }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaTruck />}
              onClick={() => navigate(`/admin-panel/solar-shop/${countryName || "india"}/combokit-configurations/pincode-delivery-costs`)}
            >
              Pincode Delivery Costs
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaAward className="text-amber-500" />}
              onClick={() => navigate(`/admin-panel/solar-shop/${countryName || "india"}/combokit-configurations/best-seller`)}
            >
              Best Seller Configuration
            </Button>
            <Button variant="primary" size="md" onClick={openAddKit} leftIcon={<FaPlus />}>
              Configure Combo Kit
            </Button>
          </div>
        }
      />

      {/* FILTERS */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Search</label>
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                <FaSearch size={12} />
              </span>
              <input
                type="text"
                placeholder="Search kits..."
                value={kitsSearch}
                onChange={(e) => setKitsSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
              />
            </div>
          </div>

          {/* Industry Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Industry Type</label>
            <DropdownWithSearchInput
              options={filterIndustryTypes}
              value={selectedIndustryType}
              onChange={(val) => {
                setSelectedIndustryType(val);
                setSelectedCategory("");
                setSelectedSubcategory("");
                setSelectedType("");
                setSelectedProjectRange("");
                fetchFilterCategories(val);
              }}
              placeholder="All Industry Types"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
            <DropdownWithSearchInput
              options={filterCategories}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setSelectedSubcategory("");
                setSelectedType("");
                setSelectedProjectRange("");
                fetchFilterSubcategories(val);
              }}
              placeholder="All Categories"
            />
          </div>

          {/* Sub-Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Sub-Category</label>
            <DropdownWithSearchInput
              options={filterSubcategories}
              value={selectedSubcategory}
              onChange={(val) => {
                setSelectedSubcategory(val);
                setSelectedType("");
                setSelectedProjectRange("");
                fetchFilterSystemTypes(val);
              }}
              placeholder="All Sub-Categories"
              disabled={!selectedCategory}
            />
          </div>

          {/* System Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">System Type</label>
            <DropdownWithSearchInput
              options={filterSystemTypes}
              value={selectedType}
              onChange={(val) => {
                setSelectedType(val);
                setSelectedProjectRange("");
                fetchFilterProjectRanges(val);
              }}
              placeholder="All Types"
              disabled={!selectedSubcategory}
            />
          </div>

          {/* Project Range */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Project Range</label>
            <DropdownWithSearchInput
              options={filterProjectRanges}
              value={selectedProjectRange}
              onChange={setSelectedProjectRange}
              placeholder="All Ranges"
              disabled={!selectedType}
            />
          </div>
        </div>
      </div>

      {/* TABLE DATA SECTION */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Header with Title and count info */}
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
              <FaShoppingBag size={14} />
            </div>
            Configured Combo Kits Registry
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
              Showing {filteredConfiguredKits.length > 0 ? startIndex : 0}-{endIndex} of {filteredConfiguredKits.length}
            </span>
          </div>
        </div>

        {/* Padded table wrapper */}
        <div className="flex-1 p-6">
          <CustomTable
            headers={columns}
            data={paginatedKits}
            loading={loading}
            emptyMessage="No configured combo kits found. Click 'Configure Combo Kit' to map one."
            containerClassName="border-none shadow-none rounded-none bg-transparent"
          />
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-border bg-surface-hover/20">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredConfiguredKits.length}
              pageSize={itemsPerPage}
              className="w-full"
            />
          </div>
        )}
      </div>

      <ComboKitFormDrawer
        showDrawer={showDrawer}
        setShowDrawer={setShowDrawer}
        variantConfigs={variantConfigs}
        currencySymbol={_countryDetails?.currency_symbol || "₹"}
        editingKit={editingKit}
        handleSave={handleSave}
        loadingForm={loadingForm}
        loadingDrawerData={loadingDrawerData}
        formData={formData}
        handleFormChange={handleFormChange}
        setBaseComponentSkus={setBaseComponentSkus}
        setBosComponentSkus={setBosComponentSkus}
        setSkuDetailsCache={setSkuDetailsCache}
        setTemplateBrands={setTemplateBrands}
        setSubtypeBrands={setSubtypeBrands}
        masterKitOptions={masterKitOptions}
        projectRangeOptions={projectRangeOptions}
        selectedSolarKitObj={selectedSolarKitObj}
        selectedProjectRange={selectedProjectRangeObj || matchedProjectRangeObj}
        brands={brands}
        isCapacityOutOfRange={isCapacityOutOfRange}
        setKitImageFile={setKitImageFile}
        kitImageFile={kitImageFile}
        API_URL={API_URL}
        getFilteredSkusForComponent={getFilteredSkusForComponent}
        baseComponentSkus={baseComponentSkus}
        templateBrands={templateBrands}
        getTemplateUnitSymbol={getTemplateUnitSymbol}
        handleBaseBrandChange={handleBaseBrandChange}
        handleBaseSkuChange={handleBaseSkuChange}
        setFormData={setFormData}
        toggleSection={toggleSection}
        isSectionOpen={isSectionOpen}
        bosBrandOptions={bosBrandOptions}
        handleBosGroupBrandChange={handleBosGroupBrandChange}
        bosImageFiles={bosImageFiles}
        setBosImageFiles={setBosImageFiles}
        handleBosItemBrandChange={handleBosItemBrandChange}
        getFilteredBosSkus={getFilteredBosSkus}
        bosComponentSkus={bosComponentSkus}
        handleAddBosItemRow={handleAddBosItemRow}
        handleRemoveBosItemRow={handleRemoveBosItemRow}
        skuDetailsCache={skuDetailsCache}
        fetchSkuDetails={fetchSkuDetails}
        setActiveViewingSku={setActiveViewingSku}
        dispatch={dispatch}
        setAlert={setAlert}
        subtypeBrands={subtypeBrands}
        isSubtypeMicroInverter={isSubtypeMicroInverter}
        isSubtypeRegularInverter={isSubtypeRegularInverter}
        countryName={countryName}
      />

      {/* DETAIL MODAL */}
      <ComboKitDetailsModal
        showDetailModal={showDetailModal}
        setShowDetailModal={setShowDetailModal}
        viewingKit={viewingKit}
        toggleSection={toggleSection}
        isSectionOpen={isSectionOpen}
        getTemplateUnitSymbol={getTemplateUnitSymbol}
        skuDetailsCache={skuDetailsCache}
        fetchSkuDetails={fetchSkuDetails}
        setActiveViewingSku={setActiveViewingSku}
        API_URL={API_URL}
      />

      {/* SKU SPECS MODAL */}
      <SkuDetailsModal
        isOpen={!!activeViewingSku}
        onClose={() => setActiveViewingSku(null)}
        sku={activeViewingSku}
      />

      {/* DELETE CONFIRM POPUP */}
      <ConfirmationPopup
        isOpen={!!deleteConfirm}
        title="Delete Configured Combo Kit"
        message="Are you sure you want to delete this combo configuration? The local configuration mapping, brands, and cover images will be deleted."
        variant="danger"
        confirmText="Confirm Deletion"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
