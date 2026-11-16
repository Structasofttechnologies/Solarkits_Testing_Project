import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaToggleOn,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaSave,
  FaExclamationTriangle,
  FaDollarSign,
  FaLock,
  FaPercentage,
  FaSync,
  FaCalendarAlt,
  FaStore,
  FaGlobeAmericas,
  FaBuilding,
  FaSlidersH,
  FaClock,
  FaBoxes,
  FaTruck,
  FaLayerGroup,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehouseKitConfig({ moduleUniqueId = "ADM_WH_KIT_ACT" }) {
  const { countryName: routeCountry, warehouseId } = useParams();
  const storedCountry = localStorage.getItem('selected_country_admin') || 'india';
  const countryName = (routeCountry || storedCountry).toLowerCase();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Core States
  const [warehouse, setWarehouse] = useState(null);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orderFulfillmentTypes, setOrderFulfillmentTypes] = useState([
    "po_order",
    "loose_order",
    "trial_order",
  ]);
  const [updatingWhOrderTypes, setUpdatingWhOrderTypes] = useState(false);

  // Combo Kits & Customize Kits (master lists from API)
  const [comboKits, setComboKits] = useState([]);
  const [customizeKits, setCustomizeKits] = useState([]);

  // Activation states from backend - keyed by combo_kit_id
  // { [kitId]: { is_combokit_active, is_customize_kit_active, activationId, kitData } }
  const [kitActivations, setKitActivations] = useState({});

  // Local toggle changes not yet saved: { [kitId]: { is_combokit_active?, is_customize_kit_active? } }
  const [pendingToggles, setPendingToggles] = useState({});

  // SKU price info per kit from backend
  const [skuPriceInfo, setSkuPriceInfo] = useState({});

  // Margin configuration status per kit from backend
  const [marginConfigured, setMarginConfigured] = useState({});

  // GST configuration status from backend, keyed by kit ID
  const [gstConfigured, setGstConfigured] = useState({});
  const [gstRates, setGstRates] = useState({});

  // Store Display, Schedule & Scope State (Week Plan Requirements)
  const [storeDisplayConfig, setStoreDisplayConfig] = useState({});
  const [activeModal, setActiveModal] = useState({ type: null, kit: null });
  const [modalForm, setModalForm] = useState(null);
  const [availableClusters, setAvailableClusters] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);

  const defaultIndustryTypes = ["Residential", "Commercial", "Industrial", "Agricultural", "Government & Institutional"];
  const defaultProjectTypes = ["Rooftop PV", "Ground Mount", "Solar Carport", "Microgrid / Hybrid", "Floating Solar"];

  const getStoreConfig = (kitId) => {
    return storeDisplayConfig[kitId] || {
      is_store_display: true,
      display_start_date: new Date().toISOString().split("T")[0],
      display_end_date: "",
      always_display: true,
      clusters: ["all"],
      states: ["all"],
      industry_types: ["all"],
      project_types: ["all"],
    };
  };

  const handleUpdateStoreConfig = (kitId, updates) => {
    setStoreDisplayConfig((prev) => ({
      ...prev,
      [kitId]: {
        ...(prev[kitId] || getStoreConfig(kitId)),
        ...updates,
      },
    }));
  };

  // Granular Stock, Procurement & Operational Parameters per Kit (Rule 6.1)
  const [kitCustomSettings, setKitCustomSettings] = useState({});
  const [warehouseDistricts, setWarehouseDistricts] = useState([]);

  const getKitConfig = (kitId) => {
    return kitCustomSettings[kitId] || {
      max_permitted_stock: 0,
      minimum_stock_alert: 0,
      maximum_stock_holding: 0,
      procurement_source: "company_stock",
      assembly_permission: true,
      dispatch_permission: true,
      delivery_districts: []
    };
  };

  const handleUpdateKitConfig = (kitId, updates) => {
    setKitCustomSettings((prev) => ({
      ...prev,
      [kitId]: {
        ...(prev[kitId] || getKitConfig(kitId)),
        ...updates
      }
    }));
  };

  // Error info for save failures per kit
  const [saveErrors, setSaveErrors] = useState({});

  // Search
  const [comboSearch, setComboSearch] = useState("");
  const [customizeSearch, setCustomizeSearch] = useState("");

  // Tabs state: combokit | customize | trial | loose | bos
  const [activeTab, setActiveTab] = useState("combokit");

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const fetchActivations = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/solarshop/warehouse-kit-activations/warehouse/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const data = res.data?.data || { combo_kits: [], customize_kits: [] };

      const activationMap = {};
      const skuPriceMap = {};
      const marginMap = {};
      const gstMap = {};
      const gstRateMap = {};
      const storeMap = {};
      const customMap = {};

      const processKit = (a) => {
        const kitId = a.combo_kit_id?._id || a.combo_kit_id;
        if (kitId) {
          activationMap[kitId] = {
            is_combokit_active: a.is_combokit_active ?? false,
            is_customize_kit_active: a.is_customize_kit_active ?? false,
            activationId: a.id || a._id,
            kitData: a.combo_kit_id,
          };
          if (a.sku_price_info) {
            skuPriceMap[kitId] = a.sku_price_info;
          }
          // Capture margin configuration status
          marginMap[kitId] = a.is_margin_configured ?? false;
          gstMap[kitId] = a.is_gst_configured ?? false;
          gstRateMap[kitId] = a.gst_rate !== undefined && a.gst_rate !== null ? Number(a.gst_rate) : null;

          storeMap[kitId] = {
            is_store_display: a.is_store_display ?? (a.is_combokit_active || a.is_customize_kit_active || true),
            display_start_date: a.display_start_date || new Date().toISOString().split("T")[0],
            display_end_date: a.display_end_date || "",
            always_display: a.always_display ?? true,
            clusters: a.restricted_clusters || ["all"],
            states: a.restricted_states || ["all"],
            industry_types: a.restricted_industry_types || ["all"],
            project_types: a.restricted_project_types || ["all"],
          };

          customMap[kitId] = {
            max_permitted_stock: a.max_permitted_stock ?? 0,
            minimum_stock_alert: a.minimum_stock_alert ?? 0,
            maximum_stock_holding: a.maximum_stock_holding ?? 0,
            procurement_source: a.procurement_source || "company_stock",
            assembly_permission: a.assembly_permission ?? true,
            dispatch_permission: a.dispatch_permission ?? true,
            delivery_districts: Array.isArray(a.delivery_districts) ? a.delivery_districts.map(d => d._id || d) : []
          };
        }
      };

      data.combo_kits?.forEach(processKit);
      data.customize_kits?.forEach(processKit);

      setKitActivations(activationMap);
      setSkuPriceInfo(skuPriceMap);
      setMarginConfigured(marginMap);
      setGstConfigured(gstMap);
      setGstRates(gstRateMap);
      setStoreDisplayConfig(storeMap);
      setKitCustomSettings(customMap);
      setPendingToggles({});
      setSaveErrors({});
    } catch {
      setKitActivations({});
      setSkuPriceInfo({});
      setMarginConfigured({});
      setGstConfigured({});
      setGstRates({});
      setKitCustomSettings({});
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const isIndia = countryName?.toLowerCase() === "india";

      // 1. Parallel fetch countries, warehouses, activations, and kits
      const [countriesRes, warehousesRes, comboRes, customizeRes] = await Promise.all([
        axios.get(`${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }),
        axios.get(`${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`, { headers: authHeaderObj() }),
        axios.get(`${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false`, { headers: authHeaderObj() }),
        axios.get(`${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=true`, { headers: authHeaderObj() }),
        fetchActivations()
      ]);

      const activeCountries = countriesRes.data?.countries || [];
      const foundCountry = activeCountries.find((c) => c.name.toLowerCase() === countryName?.toLowerCase()) || activeCountries[0] || null;
      setCountryObj(foundCountry);

      const allWarehouses = warehousesRes.data?.warehouses || [];
      const wh = allWarehouses.find((w) => (w.id || w._id)?.toString() === warehouseId?.toString());
      setWarehouse(wh);
      if (wh && Array.isArray(wh.order_fulfillment_types)) {
        setOrderFulfillmentTypes(wh.order_fulfillment_types);
      }

      // Fetch state districts for granular delivery district mapping (Rule 6.1)
      if (wh && (wh.level_1 || wh.state_id)) {
        try {
          const distRes = await axios.post(
            `${API_URL}/geolocation/active-districts?unique_id=${moduleUniqueId}&req_for=view`,
            { state_id: wh.level_1 || wh.state_id },
            { headers: authHeaderObj() }
          );
          const dList = distRes.data.districts || distRes.data.data || [];
          setWarehouseDistricts(dList.map((d) => ({ value: String(d.id || d._id), text: d.name })));
        } catch (e) {
          console.warn("Could not load warehouse state districts:", e);
        }
      }

      // Dynamically load Regional Clusters and Fulfillment States for this warehouse
      try {
        const clusterRes = await axios.get(
          `${API_URL}/solarshop/cluster-routing/clusters`,
          { headers: authHeaderObj() }
        );
        const allClusters = clusterRes.data?.data || [];

        let targetCluster = null;
        if (wh) {
          targetCluster = allClusters.find(
            (c) => (c.id || c._id)?.toString() === wh.cluster_id?.toString() || c.name === wh.cluster_name
          );
        }

        if (wh && wh.is_cluster_mapped && targetCluster) {
          setAvailableClusters([{ id: targetCluster.id || targetCluster._id, name: targetCluster.name }]);
          const stList = Array.isArray(wh.fulfillment_states) && wh.fulfillment_states.length > 0
            ? wh.fulfillment_states
            : targetCluster.states;
          setAvailableStates(stList.map((s) => ({ id: s, name: s })));
        } else if (targetCluster) {
          setAvailableClusters([{ id: targetCluster.id || targetCluster._id, name: targetCluster.name }]);
          setAvailableStates(targetCluster.states.map((s) => ({ id: s, name: s })));
        } else if (wh && (wh.cluster_name || wh.cluster)) {
          setAvailableClusters([{ id: wh.cluster_id || "mapped_cluster", name: wh.cluster_name || wh.cluster }]);
          const stList = Array.isArray(wh.fulfillment_states) && wh.fulfillment_states.length > 0
            ? wh.fulfillment_states
            : (wh.state ? [wh.state] : []);
          setAvailableStates(stList.map((s) => ({ id: s, name: s })));
        } else if (allClusters.length > 0) {
          setAvailableClusters(allClusters.map((c) => ({ id: c.id || c._id, name: c.name })));
          const uniqueStates = [...new Set(allClusters.flatMap((c) => c.states || []))];
          setAvailableStates(uniqueStates.map((s) => ({ id: s, name: s })));
        }
      } catch (cErr) {
        console.warn("Could not load regional clusters in config:", cErr);
      }

      const fetchedCombos = comboRes.data?.data || [];
      const uniqueCombos = [];
      const seenComboIds = new Set();
      for (const kit of fetchedCombos) {
        const kId = kit.id || kit._id;
        if (kId && !seenComboIds.has(kId)) {
          uniqueCombos.push(kit);
          seenComboIds.add(kId);
        }
      }
      setComboKits(uniqueCombos);

      const fetchedCustomizes = customizeRes.data?.data || [];
      const uniqueCustomizes = [];
      const seenCustomizeIds = new Set();
      for (const kit of fetchedCustomizes) {
        const kId = kit.id || kit._id;
        if (kId && !seenCustomizeIds.has(kId)) {
          uniqueCustomizes.push(kit);
          seenCustomizeIds.add(kId);
        }
      }
      setCustomizeKits(uniqueCustomizes);
    } catch (error) {
      console.error("Error loading warehouse kit config:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load warehouse kit configuration" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleUniqueId && token && warehouseId) {
      fetchData();
      fetchFilterIndustryTypes();
      fetchFilterCategories();
    }
  }, [moduleUniqueId, token, warehouseId, countryName]);

  // Rule 6.3: Warehouse Activation != Kit Activation
  // Warehouse must be ACTIVE before any kit can be activated.
  const isWarehouseActive = warehouse
    ? Boolean(
      warehouse.is_active === true ||
      warehouse.status_id === 4 ||
      warehouse.operational_status === "active" ||
      warehouse.status_code === "active"
    )
    : false;

  // ─── Toggle Logic ──────────────────────────────────────────────────────────────
  // Gets the effective current value (saved state + pending toggle)
  const getEffectiveStatus = (kitId, field) => {
    // Check pending toggles first (local changes not yet saved)
    if (pendingToggles[kitId] && pendingToggles[kitId][field] !== undefined) {
      return pendingToggles[kitId][field];
    }
    // Fall back to saved activation state
    return kitActivations[kitId]?.[field] ?? false;
  };

  const handleToggle = (kitId, field) => {
    if (!isWarehouseActive) {
      dispatch(
        setAlert({
          type: "warning",
          message: "Rule 6.3 Enforced: Warehouse must be activated before enabling kits for store dispatch.",
          duration: 5000,
        })
      );
      return;
    }
    const currentValue = getEffectiveStatus(kitId, field);
    setPendingToggles((prev) => ({
      ...prev,
      [kitId]: {
        ...prev[kitId],
        [field]: !currentValue,
      },
    }));
    // Clear any previous save error for this kit
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[kitId];
      return next;
    });
  };

  // ─── Save Logic ────────────────────────────────────────────────────────────────

  const hasChanges = () => {
    return Object.keys(pendingToggles).length > 0;
  };

  const handleSaveAll = async () => {
    if (!hasChanges()) {
      dispatch(setAlert({ type: "warning", message: "No changes to save." }));
      return;
    }

    setSaving(true);
    try {
      const allKits = [...comboKits, ...customizeKits];

      const activationsPayload = [];
      for (const [kitId, pending] of Object.entries(pendingToggles)) {
        const kit = allKits.find((k) => (k.id || k._id) === kitId);
        if (!kit) continue;

        // Merge saved state with pending changes
        const savedState = kitActivations[kitId] || {};
        const savedConfig = getKitConfig(kitId);
        const storeConfig = getStoreConfig(kitId);

        activationsPayload.push({
          warehouse_id: warehouse.id || warehouse._id,
          combo_kit_id: kitId,
          kit_type: kit.is_custom ? "customize_kit" : "combo_kit",
          is_combokit_active: pending.is_combokit_active !== undefined ? pending.is_combokit_active : (savedState.is_combokit_active ?? false),
          is_customize_kit_active: pending.is_customize_kit_active !== undefined ? pending.is_customize_kit_active : (savedState.is_customize_kit_active ?? false),
          max_permitted_stock: savedConfig.max_permitted_stock,
          minimum_stock_alert: savedConfig.minimum_stock_alert,
          maximum_stock_holding: savedConfig.maximum_stock_holding,
          procurement_source: savedConfig.procurement_source,
          assembly_permission: savedConfig.assembly_permission,
          dispatch_permission: savedConfig.dispatch_permission,
          delivery_districts: savedConfig.delivery_districts,
          is_store_display: storeConfig.is_store_display,
          display_start_date: storeConfig.display_start_date,
          display_end_date: storeConfig.display_end_date,
          always_display: storeConfig.always_display,
          restricted_clusters: storeConfig.clusters,
          restricted_states: storeConfig.states,
          restricted_industry_types: storeConfig.industry_types,
          restricted_project_types: storeConfig.project_types,
        });
      }

      if (activationsPayload.length === 0) {
        dispatch(setAlert({ type: "warning", message: "No changes to save." }));
        setSaving(false);
        return;
      }

      const res = await axios.post(
        `${API_URL}/solarshop/warehouse-kit-activations/bulk-save?unique_id=${moduleUniqueId}&req_for=add`,
        { activations: activationsPayload },
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Kit activations saved successfully." }));
        await fetchActivations();
        window.dispatchEvent(new Event('pipeline-status-refresh'));

        // Check for any errors in bulk response
        const errors = res.data?.data?.errors || [];
        if (errors.length > 0) {
          const errorMap = {};
          errors.forEach((e) => {
            const kitId = e.item?.combo_kit_id;
            if (kitId) {
              errorMap[kitId] = e.message;
            }
          });
          setSaveErrors(errorMap);
          if (errorMap.length > 0) {
            dispatch(setAlert({ type: "warning", message: `${errors.length} kit(s) failed: ${errors[0].message}` }));
          }
        }
      }
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to save kit activations" }));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFulfillmentType = async (type) => {
    const updated = orderFulfillmentTypes.includes(type)
      ? orderFulfillmentTypes.filter((t) => t !== type)
      : [...orderFulfillmentTypes, type];

    setOrderFulfillmentTypes(updated);
    setUpdatingWhOrderTypes(true);
    try {
      const res = await axios.patch(
        `${API_URL}/warehouses/${warehouseId}/order-fulfillment-types?unique_id=${moduleUniqueId}&req_for=edit`,
        { order_fulfillment_types: updated },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `Updated order fulfillment capability: ${type}` }));
        setWarehouse((prev) => ({ ...prev, order_fulfillment_types: updated }));
      }
    } catch (err) {
      console.error("Error updating order fulfillment type:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to update order fulfillment capability",
        })
      );
      setOrderFulfillmentTypes(warehouse?.order_fulfillment_types || ["po_order", "loose_order", "trial_order"]);
    } finally {
      setUpdatingWhOrderTypes(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  const getSkuPriceInfo = (kitId) => {
    return skuPriceInfo[kitId] || null;
  };

  const getMarginConfigured = (kitId) => {
    // Returns true if margin is configured, false if not, null if unknown
    if (marginConfigured[kitId] === undefined) return null;
    return marginConfigured[kitId];
  };

  const getGstConfigured = (kitId) => {
    if (gstConfigured[kitId] === undefined) return null;
    return gstConfigured[kitId];
  };

  const getGstRate = (kitId) => {
    return gstRates[kitId] ?? null;
  };

  // ─── Filter States (API-driven, cascading) ───────────────────────────────────
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
      console.error("Error fetching filter industry types:", e);
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
      console.error("Error fetching filter categories:", e);
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
      console.error("Error fetching filter subcategories:", e);
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
      console.error("Error fetching filter system types:", e);
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
      console.error("Error fetching filter project ranges:", e);
    }
  };

  // Filtered lists
  const filteredComboKits = useMemo(() => {
    return comboKits.filter((k) => {
      const matchSearch =
        k.name?.toLowerCase().includes(comboSearch.toLowerCase()) ||
        k.solar_kit_id?.name?.toLowerCase().includes(comboSearch.toLowerCase());
      const kitInd = k.solar_kit_id?.category_id?.industry_type_id?._id || k.solar_kit_id?.category_id?.industry_type_id || "";
      const matchInd = !selectedIndustryType || String(kitInd) === selectedIndustryType;
      const matchCat = !selectedCategory ||
        String(k.solar_kit_id?.category_id?._id || k.solar_kit_id?.category_id?.id || "") === selectedCategory;
      const matchSub = !selectedSubcategory ||
        String(k.solar_kit_id?.subcategory_id?._id || k.solar_kit_id?.subcategory_id?.id || "") === selectedSubcategory;
      const matchType = !selectedType ||
        String(k.solar_kit_id?.type_id?.subcategory_type_id || k.solar_kit_id?.type_id?._id || k.solar_kit_id?.type_id?.id || "") === selectedType ||
        (k.solar_kit_id?.type_id?.type?.name || k.solar_kit_id?.type_id?.name) === selectedType;
      const matchRange = !selectedProjectRange ||
        String(k.project_range_id?._id || k.project_range_id?.id || k.project_range_id || "") === selectedProjectRange;
      return matchSearch && matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [comboKits, comboSearch, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  const filteredCustomizeKits = useMemo(() => {
    return customizeKits.filter((k) => {
      const matchSearch =
        k.name?.toLowerCase().includes(customizeSearch.toLowerCase()) ||
        k.solar_kit_id?.name?.toLowerCase().includes(customizeSearch.toLowerCase());
      const kitInd = k.solar_kit_id?.category_id?.industry_type_id?._id || k.solar_kit_id?.category_id?.industry_type_id || "";
      const matchInd = !selectedIndustryType || String(kitInd) === selectedIndustryType;
      const matchCat = !selectedCategory ||
        String(k.solar_kit_id?.category_id?._id || k.solar_kit_id?.category_id?.id || "") === selectedCategory;
      const matchSub = !selectedSubcategory ||
        String(k.solar_kit_id?.subcategory_id?._id || k.solar_kit_id?.subcategory_id?.id || "") === selectedSubcategory;
      const matchType = !selectedType ||
        String(k.solar_kit_id?.type_id?.subcategory_type_id || k.solar_kit_id?.type_id?._id || k.solar_kit_id?.type_id?.id || "") === selectedType ||
        (k.solar_kit_id?.type_id?.type?.name || k.solar_kit_id?.type_id?.name) === selectedType;
      const matchRange = !selectedProjectRange ||
        String(k.project_range_id?._id || k.project_range_id?.id || k.project_range_id || "") === selectedProjectRange;
      return matchSearch && matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [customizeKits, customizeSearch, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  // Derived Kit Categories (Rule 6.1: Trial / Loose / BOS / Combo / Customize)
  const filteredTrialKits = useMemo(() => {
    return filteredComboKits.filter(
      (k) =>
        k.is_trial_kit ||
        /trial/i.test(k.name || "") ||
        (k.solar_kit_id?.name && /trial/i.test(k.solar_kit_id.name))
    );
  }, [filteredComboKits]);

  const filteredLooseKits = useMemo(() => {
    return filteredComboKits.filter(
      (k) =>
        k.is_loose_order ||
        /loose/i.test(k.name || "") ||
        (k.solar_kit_id?.name && /loose/i.test(k.solar_kit_id.name))
    );
  }, [filteredComboKits]);

  const filteredBosKits = useMemo(() => {
    return filteredComboKits.filter(
      (k) =>
        k.is_bos_kit ||
        /bos|balance of system/i.test(k.name || "") ||
        (k.solar_kit_id?.name && /bos/i.test(k.solar_kit_id.name))
    );
  }, [filteredComboKits]);

  // ─── Loading / Not Found ──────────────────────────────────────────────────────

  if (loading) return <Loader text="Loading warehouse kit configuration..." />;

  if (!warehouse) {
    return (
      <div className="card p-12 text-center border-2 border-dashed border-border flex flex-col justify-center items-center gap-4">
        <FaWarehouse className="text-4xl text-text-muted opacity-30" />
        <h3 className="text-lg font-black text-text-primary">Warehouse Not Found</h3>
        <Button
          onClick={() =>
            navigate(`/admin-panel/solar-shop/${countryName}/warehouse-kit-activations`)
          }
          variant="secondary"
          className="rounded-xl"
        >
          Back to List
        </Button>
      </div>
    );
  }

  // ─── Render Kits Section ───────────────────────────────────────────────────────

  const renderKitSection = (title, kits, search, setSearch, field, isCustomSection, emptyMsg) => (
    <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-[10px] font-black text-text-muted bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
          {kits.length} Kits
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Filters and Search Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Search</label>
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                <FaSearch size={12} />
              </span>
              <input
                type="text"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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

        {/* Kits List */}
        <div className="border border-border/60 rounded-2xl bg-surface divide-y divide-border/40 overflow-hidden">
          {kits.length > 0 ? (
            kits.map((kit) => {
              const kitId = kit.id || kit._id;
              const isActive = getEffectiveStatus(kitId, field);
              const pending = pendingToggles[kitId]?.[field] !== undefined;
              const priceInfo = getSkuPriceInfo(kitId);
              const isMarginConfigured = getMarginConfigured(kitId);
              const isGstConfigured = getGstConfigured(kitId);
              const hasMissingPrices = !isCustomSection && priceInfo && !priceInfo.allPriced;
              const hasMissingMargin = isMarginConfigured === false;
              const kitError = saveErrors[kitId];
              const hasMissingGst = isGstConfigured === false;

              // Determine if activation should be blocked (incorporating Rule 6.3)
              const blockReason = !isActive
                ? !isWarehouseActive
                  ? "Warehouse is inactive (Rule 6.3: Activate warehouse first)"
                  : hasMissingGst
                    ? "GST rate is not configured for this kit margin"
                    : (hasMissingPrices && hasMissingMargin)
                      ? "SKU benchmark prices & company margins not configured"
                      : hasMissingPrices
                        ? `${priceInfo.pricedCount}/${priceInfo.totalSkus} SKU benchmark price(s) not set`
                        : hasMissingMargin
                          ? "Company margin not configured for this warehouse"
                          : null
                : null;
              const isToggleBlocked = !!blockReason;

              return (
                <div
                  key={kitId}
                  className={`flex items-start justify-between p-4 transition-colors ${isToggleBlocked && !isActive
                    ? 'bg-warning/5'
                    : pending
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-surface-hover/30'
                    }`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-text-primary uppercase tracking-wide truncate">
                        {kit.name || "N/A"}
                      </span>
                      {pending && (
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded border border-primary/20">
                          CHANGED
                        </span>
                      )}
                      {isToggleBlocked && !isActive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/10 text-warning text-[9px] font-black rounded border border-warning/20">
                          <FaLock size={7} /> LOCKED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted font-bold uppercase">
                      Blueprint:{" "}
                      <strong className="text-text-secondary">
                        {kit.solar_kit_id?.name || "N/A"}
                      </strong>{" "}
                      &bull; {kit.capacity || 0} kW
                    </span>

                    {/* Blocking reason banner */}
                    {blockReason && !isActive && (
                      <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 bg-warning/10 border border-warning/25 rounded-lg">
                        <FaLock size={8} className="text-warning shrink-0" />
                        <span className="text-[9px] font-bold text-warning">
                          Cannot activate: {blockReason}
                        </span>
                      </div>
                    )}

                    {/* SKU Price Info — show for combo kits only (non-custom) */}
                    {!isCustomSection && priceInfo && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className={`flex items-center gap-1.5 ${hasMissingPrices ? 'text-danger' : 'text-success'}`}>
                          <FaDollarSign size={9} />
                          <span className="text-[9px] font-bold">
                            SKU Benchmark Prices: {priceInfo.pricedCount}/{priceInfo.totalSkus} configured
                          </span>
                          {hasMissingPrices && (
                            <span className="text-[9px] font-bold text-danger">
                              ({priceInfo.missingSkuIds.length} missing on linked cluster)
                            </span>
                          )}
                        </div>
                        {hasMissingPrices && priceInfo.missingSkuDetails && (
                          <div className="mt-0.5 pl-3 border-l-2 border-danger/30 space-y-1">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">
                              SKUs missing benchmark prices (linked cluster: {warehouse.cluster || "N/A"}) — click to set:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {priceInfo.missingSkuDetails.map((sku) => (
                                <button
                                  key={sku.sku_id}
                                  type="button"
                                  onClick={() => {
                                    const cId = warehouse.country_id || warehouse.level_0 || "";
                                    const sId = warehouse.state_id || warehouse.level_1 || "";
                                    const clId = warehouse.cluster_id || warehouse.cluster?.id || warehouse.cluster?._id || "";
                                    navigate(`/admin-panel/product-configurations/price-master?sku_id=${sku.sku_id}&cluster_id=${clId}&state_id=${sId}&country_id=${cId}`);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger/10 text-danger hover:bg-danger/20 hover:scale-[1.02] border border-danger/20 rounded-md text-[9px] font-bold transition-all cursor-pointer"
                                >
                                  <span className="underline">{sku.sku_code}</span>
                                  <span className="text-[8px] text-text-muted font-normal">
                                    ({sku.product_name || "Unknown Product"})
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Margin Configuration Status */}
                    {isMarginConfigured !== null && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className={`flex items-center gap-1.5 ${hasMissingMargin ? 'text-danger' : 'text-success'}`}>
                          <FaPercentage size={9} />
                          <span className="text-[9px] font-bold">
                            Company Margin: {hasMissingMargin ? 'Not configured for this warehouse' : 'Configured ✓'}
                          </span>
                          {hasMissingMargin && (
                            <span
                              title="Go to Company Margin settings to configure margins for this kit"
                              className="text-[8px] font-bold text-danger/70 italic ml-0.5"
                            >
                              (required to activate)
                            </span>
                          )}
                        </div>
                        {hasMissingMargin && (
                          <div className="mt-0.5 pl-3 border-l-2 border-danger/30 space-y-1">
                            <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">
                              Company margin not set (for warehouse: {warehouse.warehouse_code || "N/A"}) — click to set:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/company-margin/${warehouseId}?combo_kit_id=${kitId}`)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger/10 text-danger hover:bg-danger/20 hover:scale-[1.02] border border-danger/20 rounded-md text-[9px] font-bold transition-all cursor-pointer"
                              >
                                <span className="underline">Configure Margin</span>
                                <span className="text-[8px] text-text-muted font-normal">
                                  ({kit.name || "This Kit"})
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* GST Configuration Status */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className={`flex items-center gap-1.5 ${hasMissingGst ? 'text-danger' : 'text-success'}`}>
                        <FaPercentage size={9} />
                        <span className="text-[9px] font-bold">
                          GST: {hasMissingGst ? 'Not configured in margin settings' : `Configured (${getGstRate(kitId) !== null ? `${getGstRate(kitId)}%` : 'Dynamic'}) ✓`}
                        </span>
                        {hasMissingGst && (
                          <span
                            title="Go to Company Margin settings to configure GST for this kit"
                            className="text-[8px] font-bold text-danger/70 italic ml-0.5"
                          >
                            (required to activate)
                          </span>
                        )}
                      </div>
                      {hasMissingGst && (
                        <div className="mt-0.5 pl-3 border-l-2 border-danger/30 space-y-1">
                          <span className="text-[9px] font-black text-text-muted uppercase tracking-wider block">
                            GST rate not set (for warehouse: {warehouse.warehouse_code || "N/A"}) — click to set:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/company-margin/${warehouseId}?combo_kit_id=${kitId}`)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-danger/10 text-danger hover:bg-danger/20 hover:scale-[1.02] border border-danger/20 rounded-md text-[9px] font-bold transition-all cursor-pointer"
                            >
                              <span className="underline">Configure GST & Margin</span>
                              <span className="text-[8px] text-text-muted font-normal">
                                ({kit.name || "This Kit"})
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Save Error */}
                    {kitError && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <FaExclamationTriangle size={9} className="text-danger" />
                        <span className="text-[9px] font-bold text-danger">{kitError}</span>
                      </div>
                    )}

                    {/* Store Display & Restrictions Control Bar */}
                    <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                      {/* Store Display Switch */}
                      <div className="flex items-center gap-2 bg-surface-hover/80 px-2.5 py-1.5 rounded-lg border border-border/60">
                        <FaStore className={getStoreConfig(kitId).is_store_display ? "text-primary" : "text-text-muted"} size={11} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-primary">
                          Store Display:
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={getStoreConfig(kitId).is_store_display}
                            onChange={(e) => {
                              handleUpdateStoreConfig(kitId, { is_store_display: e.target.checked });
                              setPendingToggles(prev => ({ ...prev, [kitId]: { ...prev[kitId], store_display_changed: true } }));
                            }}
                            className="sr-only peer"
                          />
                          <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${getStoreConfig(kitId).is_store_display ? "bg-primary" : "bg-border"}`} />
                        </label>
                        <span className={`text-[9px] font-black uppercase ${getStoreConfig(kitId).is_store_display ? "text-primary" : "text-text-muted"}`}>
                          {getStoreConfig(kitId).is_store_display ? "Visible" : "Hidden"}
                        </span>
                      </div>

                      {/* Display Schedule Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalForm({ kitId, ...getStoreConfig(kitId) });
                          setActiveModal({ type: 'schedule', kit });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-hover/80 hover:bg-surface-hover border border-border/60 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                      >
                        <FaCalendarAlt size={10} className="text-primary/70" />
                        <span>Schedule:</span>
                        <span className="font-black text-text-primary">
                          {getStoreConfig(kitId).always_display ? "Always Active" : `${getStoreConfig(kitId).display_start_date || "Start"} → ${getStoreConfig(kitId).display_end_date || "Open"}`}
                        </span>
                      </button>

                      {/* Region Restrictions Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalForm({ kitId, ...getStoreConfig(kitId) });
                          setActiveModal({ type: 'region', kit });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-hover/80 hover:bg-surface-hover border border-border/60 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                      >
                        <FaGlobeAmericas size={10} className="text-info/70" />
                        <span>Region Scope:</span>
                        <span className="font-black text-text-primary">
                          {getStoreConfig(kitId).clusters.includes("all") ? "All Clusters" : `${getStoreConfig(kitId).clusters.length} Cluster(s)`}
                        </span>
                      </button>

                      {/* Industry & Project Restrictions Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalForm({ kitId, ...getStoreConfig(kitId) });
                          setActiveModal({ type: 'industry', kit });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-hover/80 hover:bg-surface-hover border border-border/60 text-[10px] font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
                      >
                        <FaBuilding size={10} className="text-warning/80" />
                        <span>Industry / Project:</span>
                        <span className="font-black text-text-primary">
                          {getStoreConfig(kitId).industry_types.includes("all") ? "Universal" : `${getStoreConfig(kitId).industry_types.length} Ind.`}
                        </span>
                      </button>

                      {/* Granular Kit Rules & Stock Thresholds Button (Rule 6.1) */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalForm({ kitId, ...getKitConfig(kitId) });
                          setActiveModal({ type: 'parameters', kit });
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-600 transition-all cursor-pointer"
                      >
                        <FaBoxes size={10} className="text-emerald-500" />
                        <span>Kit Rules & Stock:</span>
                        <span className="font-black text-emerald-700 bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                          {getKitConfig(kitId).max_permitted_stock ? `${getKitConfig(kitId).max_permitted_stock} Max` : "Configure"}
                        </span>
                      </button>
                    </div>

                    {/* Operational Summary Badges Strip */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-hover text-text-secondary border border-border">
                        Source: {getKitConfig(kitId).procurement_source === 'supplier' ? 'Supplier Direct' : getKitConfig(kitId).procurement_source === 'oem' ? 'OEM Partner' : 'Company Stock'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getKitConfig(kitId).assembly_permission ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                        Assembly: {getKitConfig(kitId).assembly_permission ? 'Allowed' : 'Disabled'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getKitConfig(kitId).dispatch_permission ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                        Dispatch: {getKitConfig(kitId).dispatch_permission ? 'Authorized' : 'Held'}
                      </span>
                      {getKitConfig(kitId).minimum_stock_alert > 0 && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                          Reorder Alert: &le; {getKitConfig(kitId).minimum_stock_alert} units
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                        <FaCheckCircle size={9} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                        <FaTimesCircle size={9} /> Inactive
                      </span>
                    )}

                    {/* Toggle Switch — disabled when activation is blocked */}
                    <div
                      title={isToggleBlocked && !isActive ? blockReason : undefined}
                      className={isToggleBlocked && !isActive ? 'opacity-40 cursor-not-allowed' : ''}
                    >
                      <label
                        className={`relative inline-flex items-center select-none ${isToggleBlocked && !isActive ? 'pointer-events-none' : 'cursor-pointer'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => !isToggleBlocked || isActive ? handleToggle(kitId, field) : undefined}
                          disabled={isToggleBlocked && !isActive}
                          className="sr-only peer"
                        />
                        <div className={`w-12 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isActive ? "bg-primary" : "bg-border"}`}></div>
                      </label>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-xs font-bold text-text-muted italic">
              {emptyMsg || "No kits found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative px-6 py-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                onClick={() =>
                  navigate(`/admin-panel/solar-shop/${countryName}/warehouse-kit-activations`)
                }
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm hover:scale-105 transition-transform shrink-0"
                title="Back to List"
              >
                <FaArrowLeft />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-white shrink-0">
                  <FaToggleOn className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight">
                    Configure Kit Activations
                  </h1>
                  <p className="text-white/80 text-xs mt-0.5 font-bold">
                    Activate or deactivate combo kits and customize kits for this warehouse.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <Button
                onClick={fetchData}
                disabled={loading}
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm hover:scale-105 transition-transform shrink-0"
                title="Refresh Page Data"
              >
                <FaSync className={loading ? "animate-spin" : ""} />
              </Button>

              {countryObj && (
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shrink-0 w-fit">
                  <ReactCountryFlag
                    countryCode={countryObj.iso2}
                    svg
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {countryObj.name} Market
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rule 6.3 Warehouse Inactive Status Warning */}
      {!isWarehouseActive && warehouse && (
        <div className="p-4 bg-amber-500/10 rounded-2xl border-2 border-amber-500/30 flex items-start gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <FaExclamationTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-amber-700 text-sm">
                Warehouse Inactive — Kit Activations Locked (SOLARKITS Rule 6.3)
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 border border-amber-500/30">
                {warehouse.operational_status || warehouse.status || 'Pending Verification'}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Under SOLARKITS Master Architecture Rule 6.3, a warehouse must complete all mandatory setup checklists and be in <strong>Active</strong> status before any kit can be activated for store display and dispatch. You can pre-configure storage capacity, stock thresholds, procurement sources, and delivery districts below, but activations will remain locked until this facility is activated.
            </p>
          </div>
        </div>
      )}

      {/* Warehouse Detail Card */}
      <div className="card p-6 border-l-4 border-l-primary shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">
            Warehouse Code
          </span>
          <span className="font-black text-text-primary text-sm flex items-center gap-2 mt-1">
            <FaWarehouse className="text-primary opacity-60" size={14} />
            {warehouse.warehouse_code}
          </span>
        </div>
        <div className="md:col-span-2">
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">
            Address
          </span>
          <span className="font-semibold text-text-secondary text-xs mt-1 block">
            {warehouse.address} (PIN: {warehouse.pincode || "N/A"})
          </span>
        </div>
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">
            Routing Cluster & Fulfillment States
          </span>
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20 w-fit">
              <FaLayerGroup className="text-[10px]" />
              {warehouse.cluster_name || warehouse.cluster || "Cluster Mapped"}
            </span>
            {Array.isArray(warehouse.fulfillment_states) && warehouse.fulfillment_states.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-text-muted font-bold mr-0.5">Fulfillment States:</span>
                {warehouse.fulfillment_states.map((st, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-hover text-text-secondary border border-border">
                    {st}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
              <FaMapMarkerAlt className="text-text-muted text-[9px]" /> Base: {warehouse.district ? `${warehouse.district}, ` : ''}{warehouse.state || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Warehouse Order Type Fulfillment Capabilities Card */}
      <div className="bg-surface rounded-2xl border-2 border-border/70 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <FaBoxes size={14} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-text-primary">
                Order Type Fulfillment Specialization
              </h3>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Select which order categories this warehouse fulfills. State & District EPC orders will bifurcate automatically based on these active capabilities.
            </p>
          </div>
          {updatingWhOrderTypes && (
            <span className="text-[10px] font-bold text-primary animate-pulse flex items-center gap-1.5 self-start md:self-center">
              <FaSync className="animate-spin" size={10} /> Updating Routing Matrix...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* PO Orders */}
          <div
            onClick={() => !updatingWhOrderTypes && handleToggleFulfillmentType("po_order")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${orderFulfillmentTypes.includes("po_order")
              ? "bg-blue-500/5 border-blue-500/40 shadow-xs"
              : "bg-surface-hover/30 border-border opacity-70 hover:opacity-100"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <FaTruck size={12} />
                </span>
                <div>
                  <h4 className="text-xs font-black text-text-primary">PO Orders</h4>
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                    Bulk Project Kits
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input
                  type="checkbox"
                  checked={orderFulfillmentTypes.includes("po_order")}
                  readOnly
                  className="sr-only peer"
                />
                <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${orderFulfillmentTypes.includes("po_order") ? "bg-blue-600" : "bg-border"}`} />
              </label>
            </div>
            <p className="text-[11px] text-text-muted mt-3 leading-normal">
              Fulfills regular Combo Kit purchase orders and large commercial turnkey shipments.
            </p>
          </div>

          {/* Loose Orders */}
          <div
            onClick={() => !updatingWhOrderTypes && handleToggleFulfillmentType("loose_order")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${orderFulfillmentTypes.includes("loose_order")
              ? "bg-purple-500/5 border-purple-500/40 shadow-xs"
              : "bg-surface-hover/30 border-border opacity-70 hover:opacity-100"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  <FaBoxes size={12} />
                </span>
                <div>
                  <h4 className="text-xs font-black text-text-primary">Loose Orders</h4>
                  <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider">
                    Customized BOM
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input
                  type="checkbox"
                  checked={orderFulfillmentTypes.includes("loose_order")}
                  readOnly
                  className="sr-only peer"
                />
                <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${orderFulfillmentTypes.includes("loose_order") ? "bg-purple-600" : "bg-border"}`} />
              </label>
            </div>
            <p className="text-[11px] text-text-muted mt-3 leading-normal">
              Fulfills loose component items and customized partial BOM orders tailored by EPCs.
            </p>
          </div>

          {/* Trial Orders */}
          <div
            onClick={() => !updatingWhOrderTypes && handleToggleFulfillmentType("trial_order")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${orderFulfillmentTypes.includes("trial_order")
              ? "bg-amber-500/5 border-amber-500/40 shadow-xs"
              : "bg-surface-hover/30 border-border opacity-70 hover:opacity-100"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <FaCheckCircle size={12} />
                </span>
                <div>
                  <h4 className="text-xs font-black text-text-primary">Trial Orders</h4>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                    Pilot & Evaluation
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input
                  type="checkbox"
                  checked={orderFulfillmentTypes.includes("trial_order")}
                  readOnly
                  className="sr-only peer"
                />
                <div className={`w-8 h-4 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all ${orderFulfillmentTypes.includes("trial_order") ? "bg-amber-600" : "bg-border"}`} />
              </label>
            </div>
            <p className="text-[11px] text-text-muted mt-3 leading-normal">
              Fulfills trial units and sample kits dispatched to EPCs for pilot inspection.
            </p>
          </div>
        </div>
      </div>

      {/* 5-Category Kit Type Tabs (Rule 6.1: Trial / Loose / Combo / BOS / Customize) */}
      <div className="flex border-b border-border gap-2 overflow-x-auto">
        {[
          { id: "combokit", label: "Combo Kits", count: filteredComboKits.length },
          { id: "customize", label: "Customize Kits", count: filteredCustomizeKits.length },
          { id: "trial", label: "Trial Kits", count: filteredTrialKits.length },
          { id: "loose", label: "Loose Component Kits", count: filteredLooseKits.length },
          { id: "bos", label: "BOS Packages", count: filteredBosKits.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 shrink-0 ${activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
              }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover font-bold border border-border">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        {activeTab === "combokit" && (
          renderKitSection(
            "Combo Kits",
            filteredComboKits,
            comboSearch,
            setComboSearch,
            "is_combokit_active",
            false,
            "No combo kits found for this country."
          )
        )}
        {activeTab === "customize" && (
          renderKitSection(
            "Customize Kits",
            filteredCustomizeKits,
            customizeSearch,
            setCustomizeSearch,
            "is_customize_kit_active",
            true,
            "No customize kits found for this country."
          )
        )}
        {activeTab === "trial" && (
          renderKitSection(
            "Trial Kits",
            filteredTrialKits,
            comboSearch,
            setComboSearch,
            "is_combokit_active",
            false,
            "No trial kits configured for this country."
          )
        )}
        {activeTab === "loose" && (
          renderKitSection(
            "Loose Component Kits",
            filteredLooseKits,
            comboSearch,
            setComboSearch,
            "is_combokit_active",
            false,
            "No loose component kits configured for this country."
          )
        )}
        {activeTab === "bos" && (
          renderKitSection(
            "BOS (Balance of System) Packages",
            filteredBosKits,
            comboSearch,
            setComboSearch,
            "is_combokit_active",
            false,
            "No BOS packages configured for this country."
          )
        )}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 flex justify-end">
        <Button
          onClick={handleSaveAll}
          variant="primary"
          loading={saving}
          leftIcon={<FaSave />}
          className="rounded-xl shadow-lg font-black uppercase tracking-widest text-sm px-8 py-3"
          size="lg"
          disabled={!hasChanges() && !saving}
        >
          {hasChanges() ? `Save Changes (${Object.keys(pendingToggles).length} kit(s))` : "No Changes to Save"}
        </Button>
      </div>

      {/* ── Modal 1: Display Schedule Modal ────────────────────────────────────── */}
      <Dialog
        isOpen={activeModal.type === 'schedule'}
        onClose={() => setActiveModal({ type: null, kit: null })}
        title={`Display Schedule: ${activeModal.kit?.name || "Kit"}`}
        size="md"
      >
        {modalForm && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl border border-border">
              <div>
                <span className="text-xs font-black text-text-primary block">Always Display on Store</span>
                <span className="text-[10px] text-text-secondary">Keep active continuously without date restrictions</span>
              </div>
              <input
                type="checkbox"
                checked={modalForm.always_display}
                onChange={(e) => setModalForm(prev => ({ ...prev, always_display: e.target.checked }))}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {!modalForm.always_display && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface rounded-xl border border-border">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase">Display Start Date *</label>
                  <input
                    type="date"
                    value={modalForm.display_start_date || ""}
                    onChange={(e) => setModalForm(prev => ({ ...prev, display_start_date: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase">Display End Date *</label>
                  <input
                    type="date"
                    value={modalForm.display_end_date || ""}
                    onChange={(e) => setModalForm(prev => ({ ...prev, display_end_date: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal({ type: null, kit: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (activeModal.kit) {
                    const kId = activeModal.kit.id || activeModal.kit._id;
                    handleUpdateStoreConfig(kId, {
                      always_display: modalForm.always_display,
                      display_start_date: modalForm.display_start_date,
                      display_end_date: modalForm.display_end_date,
                    });
                    setPendingToggles(prev => ({ ...prev, [kId]: { ...prev[kId], schedule_changed: true } }));
                  }
                  setActiveModal({ type: null, kit: null });
                }}
              >
                Save Schedule
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Modal 2: Region Restrictions Modal ──────────────────────────────────── */}
      <Dialog
        isOpen={activeModal.type === 'region'}
        onClose={() => setActiveModal({ type: null, kit: null })}
        title={`Region Scope & Restrictions: ${activeModal.kit?.name || "Kit"}`}
        size="lg"
      >
        {modalForm && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl border border-border">
              <div>
                <span className="text-xs font-black text-text-primary block">All Regions Accessible</span>
                <span className="text-[10px] text-text-secondary">Allow this kit to be visible and deliverable across all state clusters</span>
              </div>
              <input
                type="checkbox"
                checked={modalForm.clusters.includes("all")}
                onChange={(e) => {
                  setModalForm(prev => ({
                    ...prev,
                    clusters: e.target.checked ? ["all"] : [],
                    states: e.target.checked ? ["all"] : []
                  }));
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {!modalForm.clusters.includes("all") && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-text-secondary">Select Allowed Clusters</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableClusters.map(c => {
                      const checked = modalForm.clusters.includes(c.id);
                      return (
                        <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-surface border-border text-text-secondary'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setModalForm(prev => {
                                const current = prev.clusters.filter(x => x !== "all");
                                const next = e.target.checked ? [...current, c.id] : current.filter(x => x !== c.id);
                                return { ...prev, clusters: next.length === 0 ? ["all"] : next };
                              });
                            }}
                            className="rounded text-primary"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[11px] font-black uppercase text-text-secondary">Select Allowed States</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableStates.map(s => {
                      const checked = modalForm.states.includes(s.id);
                      return (
                        <label key={s.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-surface border-border text-text-secondary'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setModalForm(prev => {
                                const current = prev.states.filter(x => x !== "all");
                                const next = e.target.checked ? [...current, s.id] : current.filter(x => x !== s.id);
                                return { ...prev, states: next.length === 0 ? ["all"] : next };
                              });
                            }}
                            className="rounded text-primary"
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal({ type: null, kit: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (activeModal.kit) {
                    const kId = activeModal.kit.id || activeModal.kit._id;
                    handleUpdateStoreConfig(kId, {
                      clusters: modalForm.clusters,
                      states: modalForm.states,
                    });
                    setPendingToggles(prev => ({ ...prev, [kId]: { ...prev[kId], region_changed: true } }));
                  }
                  setActiveModal({ type: null, kit: null });
                }}
              >
                Save Region Restrictions
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Modal 3: Industry & Project Restrictions Modal ───────────────────────── */}
      <Dialog
        isOpen={activeModal.type === 'industry'}
        onClose={() => setActiveModal({ type: null, kit: null })}
        title={`Industry & Project Scope: ${activeModal.kit?.name || "Kit"}`}
        size="lg"
      >
        {modalForm && (
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl border border-border">
              <div>
                <span className="text-xs font-black text-text-primary block">Universal Application</span>
                <span className="text-[10px] text-text-secondary">Suitable for all industry verticals and deployment types</span>
              </div>
              <input
                type="checkbox"
                checked={modalForm.industry_types.includes("all")}
                onChange={(e) => {
                  setModalForm(prev => ({
                    ...prev,
                    industry_types: e.target.checked ? ["all"] : [],
                    project_types: e.target.checked ? ["all"] : []
                  }));
                }}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {!modalForm.industry_types.includes("all") && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-text-secondary">Eligible Industry Sectors</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {defaultIndustryTypes.map(ind => {
                      const checked = modalForm.industry_types.includes(ind);
                      return (
                        <label key={ind} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-surface border-border text-text-secondary'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setModalForm(prev => {
                                const current = prev.industry_types.filter(x => x !== "all");
                                const next = e.target.checked ? [...current, ind] : current.filter(x => x !== ind);
                                return { ...prev, industry_types: next.length === 0 ? ["all"] : next };
                              });
                            }}
                            className="rounded text-primary"
                          />
                          <span>{ind}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border">
                  <span className="text-[11px] font-black uppercase text-text-secondary">Supported Project Deployment Types</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {defaultProjectTypes.map(proj => {
                      const checked = modalForm.project_types.includes(proj);
                      return (
                        <label key={proj} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${checked ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-surface border-border text-text-secondary'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setModalForm(prev => {
                                const current = prev.project_types.filter(x => x !== "all");
                                const next = e.target.checked ? [...current, proj] : current.filter(x => x !== proj);
                                return { ...prev, project_types: next.length === 0 ? ["all"] : next };
                              });
                            }}
                            className="rounded text-primary"
                          />
                          <span>{proj}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal({ type: null, kit: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (activeModal.kit) {
                    const kId = activeModal.kit.id || activeModal.kit._id;
                    handleUpdateStoreConfig(kId, {
                      industry_types: modalForm.industry_types,
                      project_types: modalForm.project_types,
                    });
                    setPendingToggles(prev => ({ ...prev, [kId]: { ...prev[kId], industry_changed: true } }));
                  }
                  setActiveModal({ type: null, kit: null });
                }}
              >
                Save Industry Restrictions
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Modal 4: Granular Kit Parameters & Stock Rules Modal (Rule 6.1) ─────────── */}
      <Dialog
        isOpen={activeModal.type === 'parameters'}
        onClose={() => setActiveModal({ type: null, kit: null })}
        title={`Kit Rules & Operational Thresholds: ${activeModal.kit?.name || "Kit"}`}
        size="lg"
      >
        {modalForm && (
          <div className="space-y-4 p-1">
            <div className="p-3 bg-surface-hover rounded-xl border border-border">
              <span className="text-xs font-black text-text-primary block">
                {activeModal.kit?.name}
              </span>
              <span className="text-[10px] text-text-secondary">
                Warehouse: <strong>{warehouse?.warehouse_name || warehouse?.warehouse_code}</strong> | Blueprint: <strong>{activeModal.kit?.solar_kit_id?.name || "Standard Solar Kit"}</strong>
              </span>
            </div>

            {/* Storage Capacity & Stock Limits */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase text-text-secondary tracking-wider block">
                Inventory Thresholds & Capacity Limits
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">
                    Max Permitted Stock (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.max_permitted_stock || 0}
                    onChange={(e) => setModalForm(prev => ({ ...prev, max_permitted_stock: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-primary"
                    placeholder="e.g. 100"
                  />
                  <span className="text-[9px] text-text-muted">Maximum capacity at this hub</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">
                    Minimum Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.minimum_stock_alert || 0}
                    onChange={(e) => setModalForm(prev => ({ ...prev, minimum_stock_alert: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-primary"
                    placeholder="e.g. 10"
                  />
                  <span className="text-[9px] text-text-muted">Reorder trigger threshold</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">
                    Maximum Holding Limit
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.maximum_stock_holding || 0}
                    onChange={(e) => setModalForm(prev => ({ ...prev, maximum_stock_holding: Number(e.target.value) }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-primary"
                    placeholder="e.g. 150"
                  />
                  <span className="text-[9px] text-text-muted">Safety holding ceiling</span>
                </div>
              </div>
            </div>

            {/* Procurement Sourcing & Operational Permissions */}
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-xs font-black uppercase text-text-secondary tracking-wider block">
                Procurement & Operational Permissions
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-secondary">
                    Procurement Source
                  </label>
                  <select
                    value={modalForm.procurement_source || "company_stock"}
                    onChange={(e) => setModalForm(prev => ({ ...prev, procurement_source: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-primary"
                  >
                    <option value="company_stock">Company Stock (Central WH)</option>
                    <option value="supplier">Approved Supplier Direct</option>
                    <option value="oem">OEM Partner Direct</option>
                  </select>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border cursor-pointer select-none">
                    <span className="text-xs font-bold text-text-primary">Assembly Allowed</span>
                    <input
                      type="checkbox"
                      checked={modalForm.assembly_permission ?? true}
                      onChange={(e) => setModalForm(prev => ({ ...prev, assembly_permission: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary"
                    />
                  </label>
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border cursor-pointer select-none">
                    <span className="text-xs font-bold text-text-primary">Dispatch Allowed</span>
                    <input
                      type="checkbox"
                      checked={modalForm.dispatch_permission ?? true}
                      onChange={(e) => setModalForm(prev => ({ ...prev, dispatch_permission: e.target.checked }))}
                      className="w-4 h-4 rounded text-primary"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Serviceable Delivery Districts */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-text-secondary tracking-wider block">
                    Serviceable Delivery Districts
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Leave empty to service all districts in warehouse territory
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allDistIds = warehouseDistricts.map(d => d.value);
                    const isAll = (modalForm.delivery_districts || []).length === allDistIds.length;
                    setModalForm(prev => ({ ...prev, delivery_districts: isAll ? [] : allDistIds }));
                  }}
                  className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                >
                  {(modalForm.delivery_districts || []).length === warehouseDistricts.length ? "Deselect All" : "Select All State Districts"}
                </button>
              </div>

              {warehouseDistricts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-border/60 rounded-xl bg-surface">
                  {warehouseDistricts.map(d => {
                    const isChecked = (modalForm.delivery_districts || []).includes(d.value);
                    return (
                      <label key={d.value} className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${isChecked ? 'bg-primary/10 border-primary/40 text-text-primary font-bold' : 'bg-surface border-border text-text-secondary'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setModalForm(prev => {
                              const curr = prev.delivery_districts || [];
                              const next = e.target.checked ? [...curr, d.value] : curr.filter(x => x !== d.value);
                              return { ...prev, delivery_districts: next };
                            });
                          }}
                          className="w-3.5 h-3.5 rounded text-primary"
                        />
                        <span className="truncate">{d.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic p-2 bg-surface rounded-lg border border-border">
                  All districts within warehouse operating region are covered by default.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal({ type: null, kit: null })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  if (activeModal.kit) {
                    const kId = activeModal.kit.id || activeModal.kit._id;
                    handleUpdateKitConfig(kId, {
                      max_permitted_stock: modalForm.max_permitted_stock,
                      minimum_stock_alert: modalForm.minimum_stock_alert,
                      maximum_stock_holding: modalForm.maximum_stock_holding,
                      procurement_source: modalForm.procurement_source,
                      assembly_permission: modalForm.assembly_permission,
                      dispatch_permission: modalForm.dispatch_permission,
                      delivery_districts: modalForm.delivery_districts,
                    });
                    setPendingToggles(prev => ({ ...prev, [kId]: { ...prev[kId], kit_parameters_changed: true } }));

                    try {
                      await axios.post(
                        `${API_URL}/solarshop/warehouse-kit-activations/save?unique_id=${moduleUniqueId}&req_for=edit`,
                        {
                          warehouse_id: warehouseId,
                          combo_kit_id: kId,
                          kit_type: activeModal.kit.is_custom ? 'customize_kit' : 'combo_kit',
                          max_permitted_stock: modalForm.max_permitted_stock,
                          minimum_stock_alert: modalForm.minimum_stock_alert,
                          maximum_stock_holding: modalForm.maximum_stock_holding,
                          procurement_source: modalForm.procurement_source,
                          assembly_permission: modalForm.assembly_permission,
                          dispatch_permission: modalForm.dispatch_permission,
                          delivery_districts: modalForm.delivery_districts
                        },
                        { headers: authHeaderObj() }
                      );
                      dispatch(setAlert({ type: "success", message: `Stock rules & thresholds updated for ${activeModal.kit.name}` }));
                    } catch (err) {
                      console.warn("Direct save failed, queued for bulk save:", err);
                    }
                  }
                  setActiveModal({ type: null, kit: null });
                }}
              >
                Save Kit Parameters
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}