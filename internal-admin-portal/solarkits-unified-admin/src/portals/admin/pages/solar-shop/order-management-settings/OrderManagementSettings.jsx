import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaGlobe,
  FaSave,
  FaLock,
  FaInfoCircle,
  FaCheckCircle,
  FaBoxes,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { FiSliders } from "react-icons/fi";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";
import { useHasPermission } from "@/components/PermissionCheck";
import ToggleButton from "@/components/ToggleButton";

const API_URL = import.meta.env.VITE_API_URL;



export default function OrderManagementSettings({ moduleUniqueId = "ADM_ORDER_SETTINGS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // Check write permissions
  const hasEditPermission =
    useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "edit" }) ||
    useHasPermission({ requiredUniqueId: moduleUniqueId, permission: "add" });

  // Geolocation states
  const [activeCountries, setActiveCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Selected values
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [stateFilter, setStateFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");

  // Tab configurations
  const [activeTab, setActiveTab] = useState("combo"); // combo / customize / bulk / po_registered

  // Kits list loaded from backend
  const [kits, setKits] = useState([]);
  const [loadedFromMaster, setLoadedFromMaster] = useState(false);
  const [masterWarehouseCode, setMasterWarehouseCode] = useState(null);

  // Filter States (API-driven cascading filters & search)
  const [search, setSearch] = useState("");
  const [selectedIndustryType, setSelectedIndustryType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedProjectRange, setSelectedProjectRange] = useState("");

  // Options for filter dropdowns
  const [filterIndustryTypes, setFilterIndustryTypes] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [filterSystemTypes, setFilterSystemTypes] = useState([]);
  const [filterProjectRanges, setFilterProjectRanges] = useState([]);

  // UI loading states
  const [loadingGeolocations, setLoadingGeolocations] = useState(true);
  const [loadingKits, setLoadingKits] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filter Fetch Functions
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
      const url = `${API_URL}/project-types/get-categories?unique_id=${moduleUniqueId}&req_for=view${industryTypeId ? `&industry_type_id=${industryTypeId}` : ""}`;
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

  useEffect(() => {
    if (moduleUniqueId && token) {
      fetchFilterIndustryTypes();
      fetchFilterCategories();
    }
  }, [moduleUniqueId, token]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedIndustryType("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedType("");
    setSelectedProjectRange("");
    fetchFilterCategories();
  };

  const hasActiveFilters = Boolean(
    search || selectedIndustryType || selectedCategory || selectedSubcategory || selectedType || selectedProjectRange
  );

  const filteredKits = useMemo(() => {
    return kits.filter((k) => {
      const matchSearch =
        !search ||
        k.name?.toLowerCase().includes(search.toLowerCase()) ||
        k.combo_kit_code?.toLowerCase().includes(search.toLowerCase()) ||
        k.solar_kit_id?.name?.toLowerCase().includes(search.toLowerCase());

      const kitInd =
        k.industry_type_id ||
        k.solar_kit_id?.category_id?.industry_type_id?._id ||
        k.solar_kit_id?.category_id?.industry_type_id ||
        "";
      const matchInd = !selectedIndustryType || String(kitInd) === selectedIndustryType;

      const kitCat =
        k.category_id ||
        k.solar_kit_id?.category_id?._id ||
        k.solar_kit_id?.category_id?.id ||
        "";
      const matchCat = !selectedCategory || String(kitCat) === selectedCategory;

      const kitSub =
        k.subcategory_id ||
        k.solar_kit_id?.subcategory_id?._id ||
        k.solar_kit_id?.subcategory_id?.id ||
        "";
      const matchSub = !selectedSubcategory || String(kitSub) === selectedSubcategory;

      const kitType =
        k.type_id ||
        k.solar_kit_id?.type_id?.subcategory_type_id ||
        k.solar_kit_id?.type_id?._id ||
        k.solar_kit_id?.type_id?.id ||
        "";
      const kitTypeName =
        k.type_name ||
        k.solar_kit_id?.type_id?.type?.name ||
        k.solar_kit_id?.type_id?.name ||
        "";
      const matchType =
        !selectedType ||
        String(kitType) === selectedType ||
        kitTypeName === selectedType;

      const kitRange =
        k.project_range_id?._id ||
        k.project_range_id?.id ||
        k.project_range_id ||
        "";
      const matchRange = !selectedProjectRange || String(kitRange) === selectedProjectRange;

      return matchSearch && matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [kits, search, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  // Reset search when activeTab changes
  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  // Initial country routing initialization
  const fetchCountriesAndInitialize = async () => {
    setLoadingGeolocations(true);
    try {
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const activeCountriesList = countriesRes.data?.countries || [];
      setActiveCountries(activeCountriesList);

      if (activeCountriesList.length > 0) {
        const countryNames = activeCountriesList.map((c) => c.name.toLowerCase());

        if (!countryName) {
          const storedCountry = localStorage.getItem("selected_country_solar-shop");
          const defaultCountry =
            storedCountry && countryNames.includes(storedCountry.toLowerCase())
              ? storedCountry.toLowerCase()
              : activeCountriesList[0].name.toLowerCase();

          navigate(`/admin-panel/solar-shop/${defaultCountry}/order-management-settings`, { replace: true });
          return;
        } else {
          const matchedCountry = activeCountriesList.find(
            (c) => c.name.toLowerCase() === countryName.toLowerCase()
          );
          if (!matchedCountry) {
            const defaultCountry = activeCountriesList[0].name.toLowerCase();
            navigate(`/admin-panel/solar-shop/${defaultCountry}/order-management-settings`, { replace: true });
            return;
          }
          setSelectedCountry(matchedCountry);
        }
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load active countries" }));
    } finally {
      setLoadingGeolocations(false);
    }
  };

  useEffect(() => {
    if (moduleUniqueId && token) {
      fetchCountriesAndInitialize();
      setStateFilter("");
      setClusterFilter("");
      setDistrictFilter("");
      setKits([]);
    }
  }, [moduleUniqueId, token, countryName]);

  // Load States when Country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (!selectedCountry) return;
      try {
        const statesRes = await axios.post(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: selectedCountry.id },
          { headers: authHeaderObj() }
        );
        setStates(statesRes.data?.states || []);
      } catch (error) {
        console.error("Error fetching states:", error);
      }
    };
    fetchStates();
    setStateFilter("");
    setClusterFilter("");
    setDistrictFilter("");
    setKits([]);
    setLoadedFromMaster(false);
    setMasterWarehouseCode(null);
  }, [selectedCountry]);

  // Load Clusters when State changes
  useEffect(() => {
    const fetchClusters = async () => {
      if (!stateFilter) {
        setClusters([]);
        return;
      }
      try {
        const clustersRes = await axios.get(
          `${API_URL}/geolocation/clusters/${stateFilter}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        setClusters(clustersRes.data?.clusters || []);
      } catch (error) {
        console.error("Error fetching clusters:", error);
      }
    };
    fetchClusters();
    setClusterFilter("");
    setDistrictFilter("");
    setKits([]);
    setLoadedFromMaster(false);
    setMasterWarehouseCode(null);
  }, [stateFilter]);

  // Handle Cluster selection -> Extract districts
  useEffect(() => {
    if (!clusterFilter) {
      setDistricts([]);
      setDistrictFilter("");
      return;
    }
    const selectedClust = clusters.find((c) => c.id === clusterFilter);
    setDistricts(selectedClust?.districts || []);
    setDistrictFilter("");
    setKits([]);
    setLoadedFromMaster(false);
    setMasterWarehouseCode(null);
  }, [clusterFilter, clusters]);

  // Fetch combo kits and settings for selected District & Active Tab
  const loadKitsAndSettings = async () => {
    if (!districtFilter || activeTab === "po_registered") {
      setKits([]);
      return;
    }
    setLoadingKits(true);
    try {
      const res = await axios.get(
        `${API_URL}/solarshop/order-settings?unique_id=${moduleUniqueId}&req_for=view&district_id=${districtFilter}&kit_type=${activeTab}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setKits(res.data.data || []);
        setLoadedFromMaster(!!res.data.loaded_from_master);
        setMasterWarehouseCode(res.data.master_warehouse_code);
      }
    } catch (error) {
      console.error("Error loading order settings:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load kits order settings" }));
    } finally {
      setLoadingKits(false);
    }
  };

  useEffect(() => {
    loadKitsAndSettings();
  }, [districtFilter, activeTab]);

  // Handle individual toggle switches in state with logic chains
  const handleToggle = (kitId, channelField, newValue) => {
    if (!hasEditPermission) return;

    setKits((prevKits) =>
      prevKits.map((k) => {
        if (k.combo_kit_id !== kitId) return k;

        const updated = { ...k, [channelField]: newValue };

        // --- ENFORCE PIPELINE CHAINS ---
        if (activeTab === "combo" || activeTab === "customize") {
          // Chain: Sub -> Near -> In-Cluster
          if (channelField === "sub_warehouse_active" && !newValue) {
            updated.nearest_supplier_active = false;
            updated.in_cluster_supplier_active = false;
          }
          if (channelField === "nearest_supplier_active" && !newValue) {
            updated.in_cluster_supplier_active = false;
          }
        } else if (activeTab === "bulk") {
          // Chain: Sub -> Master -> Near -> In-Cluster
          if (channelField === "sub_warehouse_active" && !newValue) {
            updated.master_warehouse_active = false;
            updated.nearest_supplier_active = false;
            updated.in_cluster_supplier_active = false;
          }
          if (channelField === "master_warehouse_active" && !newValue) {
            updated.nearest_supplier_active = false;
            updated.in_cluster_supplier_active = false;
          }
          if (channelField === "nearest_supplier_active" && !newValue) {
            updated.in_cluster_supplier_active = false;
          }
        }

        return updated;
      })
    );
  };

  // Save Settings to Backend
  const handleSave = async () => {
    if (!districtFilter || savingSettings) return;
    setSavingSettings(true);
    try {
      const payload = {
        country_id: selectedCountry.id,
        state_id: stateFilter,
        cluster_id: clusterFilter,
        district_id: districtFilter,
        kit_type: activeTab,
        settings: kits.map((k) => ({
          combo_kit_id: k.combo_kit_id,
          sub_warehouse_active: k.sub_warehouse_active,
          master_warehouse_active: k.master_warehouse_active,
          nearest_supplier_active: k.nearest_supplier_active,
          in_cluster_supplier_active: k.in_cluster_supplier_active,
        })),
      };

      const res = await axios.post(
        `${API_URL}/solarshop/order-settings/save?unique_id=${moduleUniqueId}&req_for=edit`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(
          setAlert({ type: "success", message: res.data.message || "Order settings saved successfully!" })
        );
        loadKitsAndSettings(); // Refresh from DB
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      dispatch(
        setAlert({
          type: "error",
          message: error.response?.data?.message || "Failed to save order settings",
        })
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { id: "combo", label: "Combo Kits" },
    { id: "customize", label: "Customize Kits" },
    { id: "bulk", label: "Bulk Kits" },
    { id: "po_registered", label: "PO Registered Kits Order" },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Premium Header Banner */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <FiSliders className="text-white text-3xl" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">Order Management Settings</h1>
                <p className="text-white/90 mt-1">
                  Manage active/inactive inventory channels per district combo kit.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedCountry && (
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={selectedCountry.iso2}
                    svg
                    className="w-5 h-5 rounded-sm object-cover"
                  />
                  <span className="text-white text-xs font-bold uppercase tracking-wider">
                    {selectedCountry.name} Market
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loadingGeolocations ? (
        <Loader text="Initializing regional markets..." />
      ) : (
        <>
          {/* Location Filters */}
          <div className="card p-6 border-2 border-border shadow-sm">
            <div className="flex items-center gap-2.5 mb-5 border-b border-border/40 pb-3">
              <FaGlobe className="text-primary text-lg" />
              <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">Select Regional Scope</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Dropdown
                  label="Select State"
                  value={stateFilter}
                  onChange={setStateFilter}
                  placeholder="Select State"
                  options={states.map((s) => ({ value: s.id, text: s.name }))}
                />
              </div>
              <div>
                <Dropdown
                  label="Select Cluster"
                  value={clusterFilter}
                  onChange={setClusterFilter}
                  placeholder={stateFilter ? "Select Cluster" : "Choose a state first..."}
                  disabled={!stateFilter}
                  options={clusters.map((c) => ({ value: c.id, text: c.name }))}
                />
              </div>
              <div>
                <Dropdown
                  label="Select District"
                  value={districtFilter}
                  onChange={setDistrictFilter}
                  placeholder={clusterFilter ? "Select District" : "Choose a cluster first..."}
                  disabled={!clusterFilter}
                  options={districts.map((d) => ({ value: d.id, text: d.name }))}
                />
              </div>
            </div>
          </div>

          {/* Settings Tabs and Table */}
          <div className="bg-surface rounded-2xl border-2 border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Tabs Row */}
            <div className="flex border-b border-border bg-surface-hover/30 p-2 overflow-x-auto gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                      : "bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary border border-border/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Config Content Area */}
            <div className="flex-1 p-6 relative">
              {!districtFilter ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-surface/50 backdrop-blur-[1px]">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-primary/20 shadow-inner">
                    <FiSliders className="text-primary text-3xl opacity-60 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-1">Select Scope to Configure</h3>
                  <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                    Please choose a State, Cluster, and District from the filter scope dropdowns above to manage the active order fulfillment channels.
                  </p>
                </div>
              ) : loadingKits ? (
                <Loader text="Loading district warehouse combo kits..." />
              ) : activeTab === "po_registered" ? (
                <div className="bg-surface rounded-xl border-2 border-dashed border-border/80 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
                  <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-4 border border-border shadow-inner">
                    <FaLock className="text-text-muted text-xl" />
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/15 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20 mb-2.5">
                    Phase 2 Implementation
                  </span>
                  <h4 className="text-base font-bold text-text-primary">PO Registered Kits Order</h4>
                  <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
                    This order fulfillment setting will be available in the next release phase.
                  </p>
                </div>
              ) : kits.length === 0 ? (
                <div className="bg-surface rounded-xl border-2 border-dashed border-border/60 p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4 border border-border">
                    <FaBoxes className="text-primary opacity-60 text-xl" />
                  </div>
                  <h4 className="text-base font-bold text-text-primary">No Activated Kits Found</h4>
                  <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
                    No warehouses exist in this district, or no combo kits are activated for warehouses in this district. Activate kits under "Warehouse Kit Activations" first.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cascading Filter Bar */}
                  <div className="p-4 bg-surface-hover/30 rounded-2xl border border-border/60 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                      {/* Search */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">Search</label>
                        <div className="relative w-full">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                            <FaSearch size={12} />
                          </span>
                          <input
                            type="text"
                            placeholder={`Search ${tabs.find((t) => t.id === activeTab)?.label.toLowerCase() || "kits"}...`}
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

                    {/* Filter status / Reset button if active */}
                    {hasActiveFilters && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                        <span className="text-text-muted font-medium">
                          Showing <strong>{filteredKits.length}</strong> of <strong>{kits.length}</strong> kits matching filters
                        </span>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="flex items-center gap-1 text-primary hover:text-primary-hover font-bold text-xs cursor-pointer transition-colors"
                        >
                          <FaTimes size={10} />
                          <span>Clear Filters</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {loadedFromMaster && (
                    <div className="flex items-start gap-3 p-4 bg-warning/5 rounded-xl border border-warning/20 animate-in fade-in duration-300">
                      <FaInfoCircle className="text-warning shrink-0 mt-0.5" />
                      <div className="text-xs text-text-secondary leading-relaxed">
                        This district does not have any local warehouses. Showing activated kits from the <strong>Master Warehouse ({masterWarehouseCode})</strong> of this cluster.
                      </div>
                    </div>
                  )}

                  {/* Informational Warning */}
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <FaInfoCircle className="text-primary shrink-0 mt-0.5" />
                    <div className="text-xs text-text-secondary leading-relaxed">
                      Configure how each combo kit can be obtained in this district. Toggling switches will enforce sequential pipeline chains:
                      <ul className="list-disc pl-5 mt-2 space-y-1 font-medium text-text-primary">
                        {activeTab === "bulk" ? (
                          <>
                            <li>Sub Warehouse Inventory must be active to enable Master Warehouse Inventory.</li>
                            <li>Master Warehouse Inventory must be active to enable Nearest Supplier Order.</li>
                            <li>Nearest Supplier Order must be active to enable In-Cluster Supplier Order.</li>
                          </>
                        ) : (
                          <>
                            <li>Sub Warehouse Inventory must be active to enable Nearest Supplier Order.</li>
                            <li>Nearest Supplier Order must be active to enable In-Cluster Supplier Order.</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  {filteredKits.length === 0 ? (
                    <div className="bg-surface rounded-xl border-2 border-dashed border-border/60 p-12 text-center flex flex-col items-center justify-center min-h-[220px]">
                      <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-3 border border-border">
                        <FaBoxes className="text-primary opacity-60 text-lg" />
                      </div>
                      <h4 className="text-sm font-bold text-text-primary">No Kits Match the Selected Filters</h4>
                      <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed">
                        Try clearing or adjusting your search term and filter criteria.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    /* Settings Table */
                    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-surface-hover/40">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-black text-text-muted uppercase tracking-wider">
                              Kit Details
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-black text-text-muted uppercase tracking-wider">
                              Sub Warehouse Inventory
                            </th>
                            {activeTab === "bulk" && (
                              <th className="px-6 py-4 text-center text-xs font-black text-text-muted uppercase tracking-wider">
                                Master Warehouse Inventory
                              </th>
                            )}
                            <th className="px-6 py-4 text-center text-xs font-black text-text-muted uppercase tracking-wider">
                              Nearest Supplier
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-black text-text-muted uppercase tracking-wider">
                              In-Cluster Supplier
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                          {filteredKits.map((kit) => (
                            <tr key={kit.combo_kit_id} className="hover:bg-surface-hover/10 transition-colors">
                              <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                  <div className="text-xs font-black text-text-primary uppercase tracking-tight">
                                    {kit.combo_kit_code}
                                  </div>
                                  <div className="text-sm font-bold text-text-primary">{kit.name}</div>
                                  <div className="text-[10px] text-text-muted flex items-center gap-2 flex-wrap">
                                    <span>{kit.category} &rarr; {kit.subcategory}</span>
                                    {kit.type_name && (
                                      <span className="px-1.5 py-0.5 bg-surface-hover rounded text-[9px] font-semibold">
                                        {kit.type_name}
                                      </span>
                                    )}
                                    {kit.project_range_id && kit.project_range_id.min_value !== undefined && (
                                      <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-semibold">
                                        {kit.project_range_id.min_value} - {kit.project_range_id.max_value} {kit.project_range_id.unit_symbol || "kW"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Sub Warehouse Toggle */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center">
                                  <ToggleButton
                                    checked={kit.sub_warehouse_active}
                                    onChange={(val) => handleToggle(kit.combo_kit_id, "sub_warehouse_active", val)}
                                    disabled={!hasEditPermission}
                                    gradient={true}
                                  />
                                </div>
                              </td>

                              {/* Master Warehouse Toggle (Bulk tab only) */}
                              {activeTab === "bulk" && (
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center">
                                    <ToggleButton
                                      checked={kit.master_warehouse_active}
                                      onChange={(val) => handleToggle(kit.combo_kit_id, "master_warehouse_active", val)}
                                      disabled={!hasEditPermission || !kit.sub_warehouse_active}
                                      gradient={true}
                                    />
                                  </div>
                                </td>
                              )}

                              {/* Nearest Supplier Toggle */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center">
                                  <ToggleButton
                                    checked={kit.nearest_supplier_active}
                                    onChange={(val) => handleToggle(kit.combo_kit_id, "nearest_supplier_active", val)}
                                    disabled={
                                      !hasEditPermission ||
                                      (activeTab === "bulk"
                                        ? !kit.master_warehouse_active
                                        : !kit.sub_warehouse_active)
                                    }
                                    gradient={true}
                                  />
                                </div>
                              </td>

                              {/* In-Cluster Supplier Toggle */}
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center">
                                  <ToggleButton
                                    checked={kit.in_cluster_supplier_active}
                                    onChange={(val) => handleToggle(kit.combo_kit_id, "in_cluster_supplier_active", val)}
                                    disabled={!hasEditPermission || !kit.nearest_supplier_active}
                                    gradient={true}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-text-muted font-semibold flex items-center gap-1.5">
                      {!hasEditPermission ? (
                        <>
                          <FaLock className="text-text-muted" />
                          <span>You do not have write access permissions to modify settings.</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="text-success" />
                          <span>All toggle settings follow pipeline dependencies automatically.</span>
                        </>
                      )}
                    </div>

                    {hasEditPermission && (
                      <Button
                        onClick={handleSave}
                        disabled={savingSettings}
                        leftIcon={savingSettings ? null : <FaSave />}
                        className="rounded-xl px-6 font-bold"
                        loading={savingSettings}
                      >
                        {savingSettings ? "Saving Settings..." : "Save Settings"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
