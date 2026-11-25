import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaBoxes,
  FaEdit,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import CustomInput from "@/components/CustomInput";
import Loader from "@/components/Loader";
import Dialog from "@/components/Dialog";
import IconButton from "@/components/IconButton";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehouseBulkConfig({ moduleUniqueId }) {
  const { countryName, warehouseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Core Metadata States
  const [warehouse, setWarehouse] = useState(null);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Kits lists
  const [comboKits, setComboKits] = useState([]);

  // Bulk Settings: { [kitId]: { is_bulk_enabled: bool, bulk_tiers: { quantity, margin }[] } }
  const [bulkSettings, setBulkSettings] = useState({});

  const [warehouseMargins, setWarehouseMargins] = useState({});

  // Kit Activations: { [kitId]: { is_combokit_active: bool } }
  const [kitActivations, setKitActivations] = useState({});

  // Kits search
  const [kitsSearch, setKitsSearch] = useState("");

  // Selected filter states
  const [selectedIndustryType, setSelectedIndustryType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedProjectRange, setSelectedProjectRange] = useState("");

  // API-driven filter option lists
  const [industryTypes, setIndustryTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [projectRanges, setProjectRanges] = useState([]);

  // Bulk Settings Edit Dialog
  const [settingsDialog, setSettingsDialog] = useState({
    isOpen: false,
    kit: null,
    is_bulk_enabled: false,
    kits_per_bulk: "",
    apply_to_variants: false,
    bulk_tiers: [],
  });

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const fetchBulkSettings = async (isIndia) => {
    try {
      const endpoint = isIndia ? "india/bulk-kit-settings" : "bulk-kit-settings";
      const res = await axios.get(
        `${API_URL}/solarshop/${endpoint}/warehouse/${warehouseId}?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const data = res.data?.data || [];
      const settingsMap = {};
      data.forEach((s) => {
        if (s.combo_kit_id) {
          let tiers = [];
          if (s.bulk_tiers && Array.isArray(s.bulk_tiers)) {
            tiers = s.bulk_tiers;
          } else if (s.allowed_quantities && Array.isArray(s.allowed_quantities)) {
            tiers = s.allowed_quantities.map((q) => ({ quantity: q, margin: "" }));
          }
          settingsMap[s.combo_kit_id] = {
            is_bulk_enabled: s.is_bulk_enabled ?? false,
            kits_per_bulk: s.kits_per_bulk || "",
            apply_to_variants: s.apply_to_variants ?? false,
            bulk_tiers: tiers,
          };
        }
      });
      setBulkSettings(settingsMap);
    } catch {
      setBulkSettings({});
    }
  };

  const fetchKitActivations = async () => {
    try {
      // Use the flat list endpoint with warehouse_id filter.
      // This returns raw activation records where combo_kit_id is a plain ObjectId
      // string (not a populated object), making key extraction simple and reliable.
      const res = await axios.get(
        `${API_URL}/solarshop/warehouse-kit-activations?warehouse_id=${warehouseId}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const activationsList = res.data?.data || [];
      const activationsMap = {};
      activationsList.forEach((item) => {
        // combo_kit_id here is a populated kit object (from get_warehouse_kit_activations).
        // Extract the ID defensively from all possible shapes.
        const rawKitId =
          item.combo_kit_id?._id?.toString?.() ||   // lean object with _id ObjectId
          item.combo_kit_id?.id?.toString?.() ||     // toObject with virtual id
          item.combo_kit_id?.toString?.();           // raw ObjectId string
        if (rawKitId) {
          activationsMap[rawKitId] = {
            is_combokit_active: !!item.is_combokit_active,
          };
        }
      });
      setKitActivations(activationsMap);
    } catch (e) {
      console.warn("Could not fetch kit activations:", e);
      setKitActivations({});
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const isIndia = (countryName || "india").toLowerCase() === "india" || (countryName || "").toLowerCase() === "in";
      const marginEndpoint = isIndia ? "india/company-margins" : "company-margins";

      // Concurrently fetch all independent resources
      const [countriesRes, warehousesRes, comboRes, marginRes] = await Promise.all([
        axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=ADM_CO_MARGIN&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/warehouses?unique_id=ADM_CO_MARGIN&req_for=view`,
          { headers: authHeaderObj() }
        ),
        axios.get(
          `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false`,
          { headers: authHeaderObj() }
        ).catch(() => ({ data: { data: [] } })),
        axios.get(
          `${API_URL}/solarshop/${marginEndpoint}/warehouse/${warehouseId}?unique_id=ADM_CO_MARGIN&req_for=view`,
          { headers: authHeaderObj() }
        ).catch(() => ({ data: { data: [] } })),
        fetchBulkSettings(isIndia),
        fetchKitActivations(),
        fetchIndustryTypes()
      ]);

      const activeCountries = countriesRes.data?.countries || [];
      const foundCountry = activeCountries.find(
        (c) => c.name.toLowerCase() === countryName?.toLowerCase()
      );
      setCountryObj(foundCountry);

      const allWarehouses = warehousesRes.data?.warehouses || [];
      const wh = allWarehouses.find((w) => (w.id || w._id)?.toString() === warehouseId?.toString());
      setWarehouse(wh);

      // Deduplicate kits
      const fetchedKits = comboRes.data?.data || [];
      const uniqueKits = [];
      const seenIds = new Set();
      for (const kit of fetchedKits) {
        const kId = kit.id || kit._id;
        if (kId && !seenIds.has(kId)) {
          uniqueKits.push(kit);
          seenIds.add(kId);
        }
      }
      setComboKits(uniqueKits);

      // Populate margins map
      const marginsMap = {};
      (marginRes.data?.data || []).forEach((m) => {
        if (m.combo_kit_id) {
          marginsMap[m.combo_kit_id] = m;
        }
      });
      setWarehouseMargins(marginsMap);
    } catch (error) {
      console.error("Error loading bulk combo kit config:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load warehouse bulk kit configuration" }));
    } finally {
      setLoading(false);
    }
  };

  // ─── Filter Hierarchy Fetchers ───────────────────────────────────────────────

  const fetchIndustryTypes = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/industry-types/list?unique_id=${moduleUniqueId}&req_for=view&active_only=true`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setIndustryTypes(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching industry types:", e);
    }
  };

  const fetchCategories = async (industryTypeId = null) => {
    setCategories([]);
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);
    try {
      const url = `${API_URL}/project-types/get-categories?unique_id=${moduleUniqueId}&req_for=view${industryTypeId ? `&industry_type_id=${industryTypeId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setCategories(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching categories:", e);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);
    if (!categoryId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategories?unique_id=${moduleUniqueId}&req_for=view&category_id=${categoryId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSubcategories(
          res.data.data.map((item) => ({ value: String(item.id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching subcategories:", e);
    }
  };

  const fetchSystemTypes = async (subcategoryId) => {
    setSystemTypes([]);
    setProjectRanges([]);
    if (!subcategoryId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategory-types?unique_id=${moduleUniqueId}&req_for=view&subcategory_id=${subcategoryId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setSystemTypes(
          res.data.data.map((item) => ({ value: String(item.subcategory_type_id), text: item.name }))
        );
      }
    } catch (e) {
      console.error("Error fetching system types:", e);
    }
  };

  const fetchProjectRanges = async (subcategoryTypeId) => {
    setProjectRanges([]);
    if (!subcategoryTypeId) return;
    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-ranges?unique_id=${moduleUniqueId}&req_for=view&subcategory_type_id=${subcategoryTypeId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setProjectRanges(
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

  useEffect(() => {
    if (moduleUniqueId && token && warehouseId) {
      fetchData();
      fetchIndustryTypes();
      fetchCategories();
    }
  }, [moduleUniqueId, token, warehouseId, countryName]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getBulkSetting = (kitId) =>
    bulkSettings[kitId] || { is_bulk_enabled: false, kits_per_bulk: "", apply_to_variants: false, bulk_tiers: [] };

  /** Returns true only if the combo kit is activated for this warehouse */
  const isComboKitActive = (kitId) => {
    if (!kitId) return false;
    // kitId may be a string, or an object with .id / ._id depending on the endpoint
    const idStr =
      typeof kitId === "object"
        ? (kitId?.id?.toString?.() || kitId?._id?.toString?.())
        : kitId?.toString?.();
    return kitActivations[idStr]?.is_combokit_active === true;
  };

  // ─── Dynamic Tiers Logic ───────────────────────────────────────────────────

  const addTier = () => {
    setSettingsDialog((prev) => ({
      ...prev,
      bulk_tiers: [...prev.bulk_tiers, { quantity: "", margin: "" }],
    }));
  };

  const removeTier = (index) => {
    setSettingsDialog((prev) => ({
      ...prev,
      bulk_tiers: prev.bulk_tiers.slice(0, -1),
    }));
  };

  const updateTier = (index, field, value) => {
    setSettingsDialog((prev) => {
      const newTiers = [...prev.bulk_tiers];
      newTiers[index][field] = value;
      return { ...prev, bulk_tiers: newTiers };
    });
  };

  // ─── Bulk Settings Dialog ─────────────────────────────────────────────────────

  const openSettingsDialog = (kit) => {
    const kitId = kit.id || kit._id;
    const setting = getBulkSetting(kitId);
    // Preserve backend-saved quantities (and margins). Fall back to a single
    // default tier if no setting exists yet. The display label is based on
    // the tier's index in the dialog, not the stored quantity.
    const tiers =
      setting.bulk_tiers && setting.bulk_tiers.length > 0
        ? setting.bulk_tiers.map((t) => ({
          quantity: t.quantity ?? "",
          margin: t.margin ?? "",
        }))
        : [{ quantity: 1, margin: "" }];

    setSettingsDialog({
      isOpen: true,
      kit,
      is_bulk_enabled: !!setting.is_bulk_enabled,
      kits_per_bulk: setting.kits_per_bulk ?? "",
      apply_to_variants: !!setting.apply_to_variants,
      bulk_tiers: tiers,
    });
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!warehouse || !countryObj || !settingsDialog.kit) return;

    let finalTiers = [];
    let kitsPerBulk = null;
    if (settingsDialog.is_bulk_enabled) {
      kitsPerBulk = parseInt(settingsDialog.kits_per_bulk);
      if (!kitsPerBulk || kitsPerBulk <= 0) {
        dispatch(setAlert({ type: "warning", message: "Please specify a valid number of Kits per Bulk." }));
        return;
      }

      const hasEmptyMargin = settingsDialog.bulk_tiers.some((t) => t.margin === "" || t.margin === null || t.margin === undefined);
      if (hasEmptyMargin) {
        dispatch(setAlert({ type: "warning", message: "Please fill in all margin percentages." }));
        return;
      }

      finalTiers = settingsDialog.bulk_tiers.map((t, i) => ({
        quantity: i + 1,
        margin: parseFloat(t.margin),
      }));

      const kitId = settingsDialog.kit.id || settingsDialog.kit._id;
      const standardMargin = Number(warehouseMargins[kitId]?.standard_margin) || 0;

      for (let i = 0; i < finalTiers.length; i++) {
        if (i === 0) {
          if (finalTiers[i].margin > standardMargin) {
            dispatch(setAlert({ type: "warning", message: `Margin for 1 bulk (${finalTiers[i].margin}%) cannot exceed standard margin (${standardMargin}%).` }));
            return;
          }
        } else {
          if (finalTiers[i].margin > finalTiers[i - 1].margin) {
            dispatch(setAlert({ type: "warning", message: `Margin for ${finalTiers[i].quantity} bulks (${finalTiers[i].margin}%) cannot exceed margin for ${finalTiers[i - 1].quantity} bulk(s) (${finalTiers[i - 1].margin}%).` }));
            return;
          }
        }
      }
    }

    setSaving(true);
    try {
      const isIndia = countryObj.iso2?.toLowerCase() === "in";
      const endpoint = isIndia ? "india/bulk-kit-settings" : "bulk-kit-settings";
      const payload = {
        country_id: warehouse.country_id,
        state_id: warehouse.state_id,
        cluster_id: warehouse.cluster_id || null, // cluster_id is optional; warehouse.cluster is the name, not ID
        warehouse_id: warehouse.id,
        combo_kit_id: settingsDialog.kit.id || settingsDialog.kit._id,
        is_bulk_enabled: settingsDialog.is_bulk_enabled,
        kits_per_bulk: kitsPerBulk,
        apply_to_variants: settingsDialog.apply_to_variants,
        bulk_tiers: finalTiers,
        allowed_quantities: finalTiers.map((t) => t.quantity),
      };
      const res = await axios.post(
        `${API_URL}/solarshop/${endpoint}/save?unique_id=${moduleUniqueId}&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );
      if (res.data.status === "success") {
        dispatch(setAlert({ type: "success", message: "Bulk kit settings saved successfully" }));
        setSettingsDialog((prev) => ({ ...prev, isOpen: false }));
        await fetchBulkSettings(isIndia);
      }
    } catch (error) {
      dispatch(setAlert({ type: "error", message: error.response?.data?.message || "Failed to save bulk kit settings" }));
    } finally {
      setSaving(false);
    }
  };

  // ─── Filtered kits for Bulk Settings tab ─────────────────────────────────────

  // Filtered kits — filters use IDs from API-fetched lists
  const filteredComboKits = useMemo(() => {
    return comboKits.filter((k) => {
      const matchSearch = !k.is_custom && (
        k.name?.toLowerCase().includes(kitsSearch.toLowerCase()) ||
        k.solar_kit_id?.name?.toLowerCase().includes(kitsSearch.toLowerCase())
      );

      const matchCat = !selectedCategory ||
        String(k.solar_kit_id?.category_id?._id || k.solar_kit_id?.category_id?.id) === selectedCategory;

      const matchSub = !selectedSubcategory ||
        String(k.solar_kit_id?.subcategory_id?._id || k.solar_kit_id?.subcategory_id?.id) === selectedSubcategory;

      // type_id on the kit is the ProjectSubcategoryType document whose _id == subcategory_type_id
      const matchType = !selectedType ||
        String(k.solar_kit_id?.type_id?._id || k.solar_kit_id?.type_id?.id) === selectedType;

      const matchRange = !selectedProjectRange ||
        String(k.project_range_id?._id || k.project_range_id?.id) === selectedProjectRange;

      return matchSearch && matchCat && matchSub && matchType && matchRange;
    });
  }, [comboKits, kitsSearch, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  // ─── Loading / Not Found ──────────────────────────────────────────────────────

  if (loading) return <Loader text="Loading bulk kit configuration..." />;

  if (!warehouse) {
    return (
      <div className="card p-12 text-center border-2 border-dashed border-border flex flex-col justify-center items-center gap-4">
        <FaWarehouse className="text-4xl text-text-muted opacity-30" />
        <h3 className="text-lg font-black text-text-primary">Warehouse Not Found</h3>
        <Button
          onClick={() =>
            navigate(
              `/admin-panel/solar-shop/${countryName}/combokit-configurations/bulk-combo-kits`
            )
          }
          variant="secondary"
          className="rounded-xl"
        >
          Back to List
        </Button>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

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
                  navigate(
                    `/admin-panel/solar-shop/${countryName}/combokit-configurations/bulk-combo-kits`
                  )
                }
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm hover:scale-105 transition-transform shrink-0"
              >
                <FaArrowLeft />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-white shrink-0">
                  <FaBoxes className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight">
                    Configure Bulk Combo Kits
                  </h1>
                  <p className="text-white/80 text-xs mt-0.5 font-bold">
                    Enable bulk availability and set margin tiers for each kit in this warehouse.
                  </p>
                </div>
              </div>
            </div>

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
            State & Cluster
          </span>
          <span className="font-bold text-text-secondary text-xs flex flex-col gap-0.5 mt-1">
            <span className="flex items-center gap-1">
              <FaMapMarkerAlt className="text-primary/50 text-[10px]" /> {warehouse.state}
            </span>
            <span className="text-text-muted pl-3.5">
              Cluster: <strong>{warehouse.cluster || "N/A"}</strong>
            </span>
          </span>
        </div>
      </div>

      {/* Tab Panel */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                Kit Bulk Availability
              </h3>
              <p className="text-xs text-text-muted mt-1 font-bold">
                Enable bulk purchasing for each combo kit and define the allowed quantity tiers (e.g., 1, 2, 3 bulks).
              </p>
            </div>

            {/* Filters */}
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
                  options={industryTypes}
                  value={selectedIndustryType}
                  onChange={(val) => {
                    setSelectedIndustryType(val);
                    setSelectedCategory("");
                    setSelectedSubcategory("");
                    setSelectedType("");
                    setSelectedProjectRange("");
                    fetchCategories(val);
                  }}
                  placeholder="All Industry Types"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
                <DropdownWithSearchInput
                  options={categories}
                  value={selectedCategory}
                  onChange={(val) => {
                    setSelectedCategory(val);
                    setSelectedSubcategory("");
                    setSelectedType("");
                    setSelectedProjectRange("");
                    fetchSubcategories(val);
                  }}
                  placeholder="All Categories"
                />
              </div>

              {/* Sub-Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Sub-Category</label>
                <DropdownWithSearchInput
                  options={subcategories}
                  value={selectedSubcategory}
                  onChange={(val) => {
                    setSelectedSubcategory(val);
                    setSelectedType("");
                    setSelectedProjectRange("");
                    fetchSystemTypes(val);
                  }}
                  placeholder="All Sub-Categories"
                  disabled={!selectedCategory}
                />
              </div>

              {/* System Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">System Type</label>
                <DropdownWithSearchInput
                  options={systemTypes}
                  value={selectedType}
                  onChange={(val) => {
                    setSelectedType(val);
                    setSelectedProjectRange("");
                    fetchProjectRanges(val);
                  }}
                  placeholder="All Types"
                  disabled={!selectedSubcategory}
                />
              </div>

              {/* Project Range */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Project Range</label>
                <DropdownWithSearchInput
                  options={projectRanges}
                  value={selectedProjectRange}
                  onChange={setSelectedProjectRange}
                  placeholder="All Ranges"
                  disabled={!selectedType}
                />
              </div>
            </div>

            {/* List Header / Count Info */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                Kits List
              </span>
              <div className="text-xs font-black text-text-muted bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
                {filteredComboKits.length} Combo Kits Found
              </div>
            </div>

            {/* Kits List */}
            <div className="border border-border/60 rounded-2xl bg-surface divide-y divide-border/40 overflow-hidden">
              {filteredComboKits.length > 0 ? (
                filteredComboKits.map((kit) => {
                  const kitId = kit.id || kit._id;
                  const setting = getBulkSetting(kitId);
                  const comboActive = isComboKitActive(kitId);
                  return (
                    <div
                      key={kitId}
                      className={`flex items-center justify-between p-4 transition-colors ${comboActive
                        ? "hover:bg-surface-hover/30"
                        : "bg-surface-hover/20 opacity-70"
                        }`}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="font-black text-xs text-text-primary uppercase tracking-wide truncate">
                          {kit.name || "N/A"}
                        </span>
                        <span className="text-[10px] text-text-muted font-bold uppercase">
                          Blueprint:{" "}
                          <strong className="text-text-secondary">
                            {kit.solar_kit_id?.name || "N/A"}
                          </strong>{" "}
                          &bull; {kit.capacity || 0} kW
                        </span>
                        {setting.is_bulk_enabled && setting.kits_per_bulk && comboActive && (
                          <span className="text-[10px] text-primary font-bold uppercase mt-0.5">
                            Kits per Bulk: {setting.kits_per_bulk}
                          </span>
                        )}
                        {!comboActive && (
                          <span className="text-[10px] text-warning font-bold mt-0.5 flex items-center gap-1">
                            <FaTimesCircle size={9} className="text-warning" />
                            Combo Kit not activated for this warehouse
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 ml-6 shrink-0">
                        {/* Allowed quantities & margins chips — only show when combo kit is active */}
                        {comboActive && setting.is_bulk_enabled && setting.bulk_tiers?.length > 0 && (
                          <div className="flex flex-col gap-1 items-end mr-2">
                            {setting.bulk_tiers.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] font-black bg-primary/10 text-primary border border-primary/20 rounded-md whitespace-nowrap"
                              >
                                {t.quantity} Bulk{t.quantity > 1 ? "s" : ""} &rarr; {t.margin !== "" ? `${t.margin}%` : "No Margin"}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Bulk / Activation status badge */}
                        {!comboActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-warning/10 text-warning border border-warning/30">
                            <FaTimesCircle size={9} /> Combo Kit Inactive
                          </span>
                        ) : setting.is_bulk_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                            <FaCheckCircle size={9} /> Bulk Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-surface-hover text-text-muted border border-border/40">
                            <FaTimesCircle size={9} /> Disabled
                          </span>
                        )}

                        <IconButton
                          onClick={() => comboActive && openSettingsDialog(kit)}
                          variant={comboActive ? "primary" : "secondary"}
                          size="sm"
                          tooltip={comboActive ? "Configure Bulk Settings" : "Activate combo kit first to configure bulk"}
                          disabled={!comboActive}
                        >
                          <FaEdit />
                        </IconButton>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-xs font-bold text-text-muted italic">
                  No kits found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog: Configure Bulk Settings ── */}
      <Dialog
        isOpen={settingsDialog.isOpen}
        onClose={() => setSettingsDialog((prev) => ({ ...prev, isOpen: false }))}
        title="Configure Bulk Kit Settings"
        size="md"
      >
        {settingsDialog.kit && (() => {
          const kitId = settingsDialog.kit.id || settingsDialog.kit._id;
          const kitStandardMargin = Number(warehouseMargins[kitId]?.standard_margin) || 0;

          return (
            <form onSubmit={handleSaveSettings} className="space-y-6 pt-2">
              {/* Kit Info */}
              <div className="bg-surface-hover/50 p-4 border border-border rounded-xl space-y-2 animate-in fade-in zoom-in duration-300">
                <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">
                  Target Kit
                </span>
                <div className="flex flex-col gap-1">
                  <span className="font-black text-text-primary text-sm uppercase">
                    {settingsDialog.kit.name}
                  </span>
                  <span className="text-xs text-text-secondary font-bold">
                    Blueprint: {settingsDialog.kit.solar_kit_id?.name || "N/A"} &bull;{" "}
                    {settingsDialog.kit.capacity || 0} kW
                  </span>
                </div>
              </div>

              {/* Bulk Enable Toggle */}
              {!isComboKitActive(kitId) ? (
                <div className="flex items-center gap-3 p-4 bg-warning/5 border-2 border-warning/30 rounded-xl animate-in fade-in duration-200">
                  <FaTimesCircle className="text-warning shrink-0" size={18} />
                  <div>
                    <h4 className="font-black text-sm text-warning">Combo Kit Not Active</h4>
                    <p className="text-xs text-text-muted font-bold mt-0.5">
                      The combo kit must be activated for this warehouse before bulk purchasing can be enabled.
                      Go to <strong>Kit Activations</strong> to activate it first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-surface border-2 border-border rounded-xl">
                  <div>
                    <h4 className="font-black text-sm text-text-primary">Enable Bulk Purchasing</h4>
                    <p className="text-xs text-text-muted font-bold mt-0.5">
                      Allow this kit to be sold in bulk quantity tiers
                    </p>
                    {kitStandardMargin <= 0 && (
                      <p className="text-[10px] text-danger font-bold mt-1">
                        * Standard margin is required in Company Margin first.
                      </p>
                    )}
                  </div>
                  <label className={`relative inline-flex items-center select-none ${kitStandardMargin > 0 ? "cursor-pointer" : "cursor-not-allowed"}`}>
                    <input
                      type="checkbox"
                      checked={settingsDialog.is_bulk_enabled}
                      onChange={(e) => {
                        if (e.target.checked && kitStandardMargin <= 0) {
                          dispatch(setAlert({ type: "warning", message: "Cannot enable bulk kit. Standard margin is missing or 0." }));
                          return;
                        }
                        setSettingsDialog((prev) => ({
                          ...prev,
                          is_bulk_enabled: e.target.checked,
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className={`w-12 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${kitStandardMargin > 0 ? "bg-border peer-checked:bg-primary" : "bg-border/50"}`}></div>
                  </label>
                </div>
              )}

              {/* Allowed Quantities & Margins — shown only when bulk is enabled */}
              {settingsDialog.is_bulk_enabled && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <CustomInput
                    label="Kits per Bulk *"
                    type="number"
                    min="1"
                    value={settingsDialog.kits_per_bulk}
                    onChange={(e) =>
                      setSettingsDialog((prev) => ({ ...prev, kits_per_bulk: e.target.value }))
                    }
                    placeholder="e.g. 10"
                  />
                  <div className="flex items-center justify-between p-4 bg-surface-hover/30 border border-border rounded-xl">
                    <div>
                      <h4 className="font-black text-xs text-text-primary uppercase tracking-wider">Enable Upgrade Variants for Bulk</h4>
                      <p className="text-[10px] text-text-muted font-bold mt-0.5">
                        Apply bulk discount margin tiers to upgrade variants of this combo kit
                      </p>
                    </div>
                    <label className="relative inline-flex items-center select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsDialog.apply_to_variants}
                        onChange={(e) => {
                          setSettingsDialog((prev) => ({
                            ...prev,
                            apply_to_variants: e.target.checked,
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-border rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs text-text-primary uppercase tracking-wider">
                        Allowed Bulk Tiers & Margins *
                      </h4>
                      <p className="text-[10px] text-text-muted font-bold mt-0.5">
                        Standard Margin: <span className="text-primary">
                          {kitStandardMargin}%
                        </span>
                        . Margin must decrease or stay the same as bulks increase.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {settingsDialog.bulk_tiers.map((tier, index) => (
                      <div key={index} className="flex gap-3 items-center animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="w-1/3 h-10 px-4 bg-surface border-2 border-border rounded-xl text-xs font-black text-text-primary flex items-center justify-center shadow-sm shrink-0">
                          {index + 1} Bulk{index > 0 ? "s" : ""}
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Margin %"
                          value={tier.margin}
                          onChange={(e) => updateTier(index, "margin", e.target.value)}
                          className="w-full flex-1 h-10 px-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                          required
                        />
                        <div className="w-8 shrink-0 flex items-center justify-center">
                          {index === settingsDialog.bulk_tiers.length - 1 && settingsDialog.bulk_tiers.length > 1 && (
                            <IconButton
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => removeTier(index)}
                              tooltip="Remove Tier"
                            >
                              <FaTrash />
                            </IconButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addTier}
                      disabled={settingsDialog.bulk_tiers.length > 0 && (settingsDialog.bulk_tiers[settingsDialog.bulk_tiers.length - 1].margin === "" || settingsDialog.bulk_tiers[settingsDialog.bulk_tiers.length - 1].margin === null)}
                      leftIcon={<FaPlus />}
                      className="rounded-lg py-1.5 shrink-0"
                    >
                      Add Tier
                    </Button>

                    {settingsDialog.bulk_tiers.length > 0 && settingsDialog.kits_per_bulk > 0 && (
                      <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-xs font-bold text-primary">
                          Max Purchase: {settingsDialog.bulk_tiers.length} bulk{settingsDialog.bulk_tiers.length > 1 ? "s" : ""}
                          ({settingsDialog.bulk_tiers.length * settingsDialog.kits_per_bulk} total kits)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSettingsDialog((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
                >
                  Save Bulk Settings
                </Button>
              </div>
            </form>
          );
        })()}
      </Dialog>
    </div>
  );
}
