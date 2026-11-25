import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaLayerGroup,
  FaBoxes,
  FaSlidersH,
  FaTags,
  FaInfoCircle,
  FaChevronRight,
  FaCheckCircle,
  FaTimes,
  FaGlobe,
  FaPercent
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import Dropdown from "@/components/Dropdown";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Dialog from "@/components/Dialog";
import Loader from "@/components/Loader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import CustomInput from "@/components/CustomInput";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;
const PREDEFINED_BENEFITS = [
  "Free Delivery",
  "Product Insurance",
  "Cleanup Kit Included",
  "Extended Warranty (1 Year)",
  "Priority Installation",
  "Maintenance Kit Included",
  "24/7 Support Service"
];

export default function ComboKitVariants({ moduleUniqueId = "ADM_COMBO_KIT_VARIANTS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isIndia = countryName?.toLowerCase() === "india";
  const baseEndpoint = useMemo(() => {
    return `${API_URL}/combo-kit-variants${isIndia ? "/india" : ""}`;
  }, [isIndia]);

  // General State
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);
  const [, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryDetails, setCountryDetails] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [comboKits, setComboKits] = useState([]);
  const [loadingComboKits, setLoadingComboKits] = useState(false);

  // Filter lists for main table and form
  const [industryTypes, setIndustryTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  // Main Table Filters
  const [tableIndustryType, setTableIndustryType] = useState("");
  const [tableCategory, setTableCategory] = useState("");
  const [tableSubcategory, setTableSubcategory] = useState("");
  const [tableType, setTableType] = useState("");
  const [tableRange, setTableRange] = useState("");

  const allFiltersSelected = useMemo(() => {
    return !!(tableCategory && tableSubcategory && tableType && tableRange);
  }, [tableCategory, tableSubcategory, tableType, tableRange]);

  const [tableSubcategoriesOptions, setTableSubcategoriesOptions] = useState([]);
  const [tableTypesOptions, setTableTypesOptions] = useState([]);
  const [tableRangesOptions, setTableRangesOptions] = useState([]);

  // Drawer / Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);

  // Tag input helper state per variant card
  const [newFeatureText, setNewFeatureText] = useState({});

  const [formData, setFormData] = useState({
    category_id: "",
    subcategory_id: "",
    type_id: "",
    project_range_id: "",
    variants: [
      { name: "", color: "", additional_price: 0, worth_price: 0, additional_features: [] }
    ]
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Helper to calculate total Upgrade Price and Retail Worth based on features
  const calculateVariantPrices = (variants) => {
    return variants.map((v) => {
      let additional_price = 0;
      let worth_price = 0;
      (v.additional_features || []).forEach((f) => {
        const price = Number(typeof f === "object" && f !== null ? f.price : 0) || 0;
        worth_price += price;
        const isFree = typeof f === "object" && f !== null ? f.is_free : true;
        if (!isFree) {
          additional_price += price;
        }
      });
      return {
        ...v,
        additional_price,
        worth_price
      };
    });
  };

  const handleBenefitFieldChange = (varIdx, bIdx, field, value) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      const list = [...(copy[varIdx].additional_features || [])];

      const currentFeature = list[bIdx];
      const featureObj = typeof currentFeature === "object" && currentFeature !== null
        ? { ...currentFeature }
        : { name: String(currentFeature), price: 0, is_free: true };

      featureObj[field] = value;
      list[bIdx] = featureObj;
      copy[varIdx] = { ...copy[varIdx], additional_features: list };
      const updatedVariants = calculateVariantPrices(copy);
      return { ...prev, variants: updatedVariants };
    });
  };

  const fetchComboKits = async (countryId) => {
    if (!countryId) return;
    try {
      setLoadingComboKits(true);
      const isIndia = countryName?.toLowerCase() === "india";
      const url = `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=ADM_COMBO_KITS&req_for=view&country_id=${countryId}&is_custom=false`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setComboKits(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching combo kits:", err);
    } finally {
      setLoadingComboKits(false);
    }
  };

  // Fetch initial geolocation & dependencies
  useEffect(() => {
    const fetchMasterAndCountries = async () => {
      try {
        setLoading(true);
        // 1. Fetch active countries
        const countriesRes = await axios.get(
          `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = countriesRes.data?.countries || [];
        setCountries(list);

        let currentC = null;
        if (countryName) {
          currentC = list.find((c) => c.name.toLowerCase() === countryName.toLowerCase());
          if (currentC) {
            setSelectedCountry(currentC.id);
            setCountryDetails(currentC);
            fetchComboKits(currentC.id);
          }
        } else if (list.length > 0) {
          const activeCountryNames = list.map((c) => c.name.toLowerCase());
          const storedCountry = localStorage.getItem("selected_country_admin");
          const defaultCName =
            storedCountry && activeCountryNames.includes(storedCountry.toLowerCase())
              ? storedCountry.toLowerCase()
              : list[0].name.toLowerCase();

          navigate(`/admin-panel/solar-shop/${defaultCName}/combokit-configurations/combo-kit-variants`, { replace: true });
          return;
        }

        // 2. Fetch industry types and categories
        const [indRes, catRes] = await Promise.all([
          axios.get(
            `${API_URL}/industry-types/list?unique_id=${moduleUniqueId}&req_for=view&active_only=true`,
            { headers: authHeaderObj() }
          ),
          axios.get(
            `${API_URL}/project-types/get-categories?unique_id=${moduleUniqueId}&req_for=view`,
            { headers: authHeaderObj() }
          )
        ]);
        if (indRes.data?.status === "success") {
          setIndustryTypes(indRes.data.data || []);
        }
        if (catRes.data?.status === "success") {
          setCategories(catRes.data.data || []);
        }
      } catch (err) {
        console.error("Error loading master data:", err);
        dispatch(setAlert({ type: "error", message: "Failed to load master metadata." }));
      } finally {
        setLoading(false);
      }
    };

    fetchMasterAndCountries();
  }, [countryName, moduleUniqueId]);

  // Load configured variants when country is selected
  useEffect(() => {
    if (selectedCountry) {
      fetchConfigs();
      fetchComboKits(selectedCountry);
    }
  }, [selectedCountry, baseEndpoint]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const url = `${baseEndpoint}/get-configs?unique_id=${moduleUniqueId}&req_for=view&country_id=${selectedCountry}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setConfigs(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
      dispatch(setAlert({ type: "error", message: "Failed to fetch configurations." }));
    } finally {
      setLoading(false);
    }
  };

  const handleTableIndustryTypeChange = async (indId) => {
    setTableIndustryType(indId);
    setTableCategory("");
    setTableSubcategory("");
    setTableType("");
    setTableRange("");
    setCategories([]);
    setTableSubcategoriesOptions([]);
    setTableTypesOptions([]);
    setTableRangesOptions([]);

    try {
      const url = `${API_URL}/project-types/get-categories?unique_id=${moduleUniqueId}&req_for=view${indId ? `&industry_type_id=${indId}` : ''}`;
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading categories for industry:", err);
    }
  };

  // Form metadata selectors loader helpers
  const handleTableCategoryChange = async (catId) => {
    setTableCategory(catId);
    setTableSubcategory("");
    setTableType("");
    setTableRange("");
    setTableSubcategoriesOptions([]);
    setTableTypesOptions([]);
    setTableRangesOptions([]);
    if (!catId) return;

    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategories?unique_id=${moduleUniqueId}&req_for=view&category_id=${catId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setTableSubcategoriesOptions(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading table subcategories:", err);
    }
  };

  const handleTableSubcategoryChange = async (subcatId) => {
    setTableSubcategory(subcatId);
    setTableType("");
    setTableRange("");
    setTableTypesOptions([]);
    setTableRangesOptions([]);
    if (!subcatId) return;

    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-subcategory-types?unique_id=${moduleUniqueId}&req_for=view&subcategory_id=${subcatId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setTableTypesOptions(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading table types:", err);
    }
  };

  const handleTableTypeChange = async (typeId) => {
    setTableType(typeId);
    setTableRange("");
    setTableRangesOptions([]);
    if (!typeId) return;

    try {
      const res = await axios.get(
        `${API_URL}/project-types/get-ranges?unique_id=${moduleUniqueId}&req_for=view&subcategory_type_id=${typeId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setTableRangesOptions(res.data.data || []);
      }
    } catch (err) {
      console.error("Error loading table ranges:", err);
    }
  };

  // Main table list filters
  const filteredConfigs = useMemo(() => {
    return configs.filter((c) => {
      if (tableCategory && String(c.category_id?._id || c.category_id) !== tableCategory) return false;
      if (tableSubcategory && String(c.subcategory_id?._id || c.subcategory_id) !== tableSubcategory) return false;
      if (tableType && String(c.type_id?._id || c.type_id) !== tableType) return false;
      if (tableRange && String(c.project_range_id?._id || c.project_range_id) !== tableRange) return false;
      return true;
    });
  }, [configs, tableCategory, tableSubcategory, tableType, tableRange]);

  // Open Drawer for Add Config/Variant
  const handleAddClick = () => {
    const existingConfig = filteredConfigs[0];
    setEditingConfig(existingConfig || null);
    setEditingVariant(null);
    setFormData({
      category_id: tableCategory,
      subcategory_id: tableSubcategory,
      type_id: tableType,
      project_range_id: tableRange,
      variants: [
        { name: "", color: "", additional_price: 0, worth_price: 0, additional_features: [], combo_kit_id: "" }
      ]
    });
    setNewFeatureText({});
    setShowDrawer(true);
  };

  // Open Drawer for Edit specific Variant
  const handleEditVariantClick = (config, variant) => {
    setEditingConfig(config);
    setEditingVariant(variant);
    setFormData({
      category_id: config.category_id?._id || config.category_id,
      subcategory_id: config.subcategory_id?._id || config.subcategory_id,
      type_id: config.type_id?._id || config.type_id,
      project_range_id: config.project_range_id?._id || config.project_range_id,
      variants: [
        {
          id: variant.id || variant._id,
          name: variant.name,
          color: variant.color || "",
          additional_price: variant.additional_price,
          worth_price: variant.worth_price,
          combo_kit_id: variant.combo_kit_id?._id || variant.combo_kit_id || "",
          additional_features: (variant.additional_features || []).map((f) => {
            if (typeof f === "object" && f !== null) {
              return {
                name: f.name || "",
                description: f.description || "",
                price: f.price || 0,
                is_free: !!f.is_free
              };
            }
            return {
              name: String(f),
              description: "",
              price: 0,
              is_free: true
            };
          })
        }
      ]
    });
    setNewFeatureText({});
    setShowDrawer(true);
  };

  // Delete specific Variant
  const handleDeleteVariantClick = async (config, variant) => {
    if (config.variants.length <= 1) {
      handleDeleteClick(config);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the "${variant.name}" variant?`)) {
      return;
    }

    try {
      setLoading(true);
      const updatedVariants = config.variants.filter((v) => (v.id || v._id) !== (variant.id || variant._id));
      const payload = {
        id: config._id,
        country_id: selectedCountry,
        category_id: config.category_id?._id || config.category_id,
        subcategory_id: config.subcategory_id?._id || config.subcategory_id,
        type_id: config.type_id?._id || config.type_id,
        project_range_id: config.project_range_id?._id || config.project_range_id,
        variants: updatedVariants
      };

      const url = `${baseEndpoint}/update-config?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=edit`;
      const res = await axios.put(url, payload, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Variant deleted successfully!" }));
        fetchConfigs();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to delete variant." }));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "An error occurred." }));
    } finally {
      setLoading(false);
    }
  };

  // Delete Config Click
  const handleDeleteClick = (config) => {
    setDeleteConfirm(config);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setLoading(true);
      const res = await axios.post(
        `${baseEndpoint}/delete-config?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=delete`,
        { id: deleteConfirm.id || deleteConfirm._id },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Variant Configuration deleted successfully!" }));
        fetchConfigs();
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to delete configuration." }));
    } finally {
      setDeleteConfirm(null);
      setLoading(false);
    }
  };

  // Form manipulation helpers
  const handleVariantFieldChange = (index, field, value) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, variants: copy };
    });
  };

  const handleAddBenefit = (varIdx, text) => {
    const val = (text || "").trim();
    if (!val) return;
    setFormData((prev) => {
      const copy = [...prev.variants];
      const list = [...(copy[varIdx].additional_features || [])];
      const exists = list.some((f) => {
        const name = typeof f === "object" && f !== null ? f.name : String(f);
        return name.toLowerCase() === val.toLowerCase();
      });
      if (!exists) {
        list.push({
          name: val,
          description: "",
          price: 0,
          is_free: val.toLowerCase().includes("free")
        });
      }
      copy[varIdx] = { ...copy[varIdx], additional_features: list };
      const updatedVariants = calculateVariantPrices(copy);
      return { ...prev, variants: updatedVariants };
    });
    setNewFeatureText((prev) => ({ ...prev, [varIdx]: "" }));
  };

  const handleRemoveBenefit = (varIdx, bIdx) => {
    setFormData((prev) => {
      const copy = [...prev.variants];
      const list = [...(copy[varIdx].additional_features || [])];
      list.splice(bIdx, 1);
      copy[varIdx] = { ...copy[varIdx], additional_features: list };
      const updatedVariants = calculateVariantPrices(copy);
      return { ...prev, variants: updatedVariants };
    });
  };

  // Save/Submit configuration to API
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const { category_id, subcategory_id, type_id, project_range_id, variants } = formData;
    const singleVariant = variants[0];

    if (!category_id || !subcategory_id || !type_id || !project_range_id) {
      dispatch(setAlert({ type: "error", message: "Please select all mapping filters." }));
      return;
    }

    if (!singleVariant.name?.trim()) {
      dispatch(setAlert({ type: "error", message: "Please enter a variant name." }));
      return;
    }

    if (singleVariant.additional_price === "" || isNaN(Number(singleVariant.additional_price))) {
      dispatch(setAlert({ type: "error", message: "Please configure a valid Upgrade Price." }));
      return;
    }

    if (singleVariant.worth_price === "" || isNaN(Number(singleVariant.worth_price))) {
      dispatch(setAlert({ type: "error", message: "Please configure a valid Retail Worth." }));
      return;
    }

    if (Number(singleVariant.additional_price) > Number(singleVariant.worth_price)) {
      dispatch(setAlert({
        type: "error",
        message: `Upgrade Price (${singleVariant.additional_price}) cannot be greater than Retail Worth (${singleVariant.worth_price}).`
      }));
      return;
    }

    try {
      setLoadingForm(true);

      let payload;
      let url;

      if (editingVariant) {
        // Editing a specific variant: update its entry in the variants array
        const updatedVariants = editingConfig.variants.map((v) => {
          const matches = (v.id || v._id) === (editingVariant.id || editingVariant._id);
          return matches ? singleVariant : v;
        });

        payload = {
          id: editingConfig.id || editingConfig._id,
          country_id: selectedCountry,
          category_id,
          subcategory_id,
          type_id,
          project_range_id,
          variants: updatedVariants
        };
        url = `${baseEndpoint}/update-config?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=edit`;
      } else if (editingConfig) {
        // Adding a new variant to an existing configuration
        const updatedVariants = [...editingConfig.variants, singleVariant];

        payload = {
          id: editingConfig.id || editingConfig._id,
          country_id: selectedCountry,
          category_id,
          subcategory_id,
          type_id,
          project_range_id,
          variants: updatedVariants
        };
        url = `${baseEndpoint}/update-config?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=edit`;
      } else {
        // Creating a new configuration document with this first variant
        payload = {
          country_id: selectedCountry,
          category_id,
          subcategory_id,
          type_id,
          project_range_id,
          variants: [singleVariant]
        };
        url = `${baseEndpoint}/create-config?unique_id=ADM_COMBO_KIT_VARIANTS&req_for=add`;
      }

      const isEdit = !!(editingVariant || editingConfig);
      const res = await (isEdit
        ? axios.put(url, payload, { headers: authHeaderObj() })
        : axios.post(url, payload, { headers: authHeaderObj() }));

      if (res.data?.status === "success") {
        dispatch(
          setAlert({
            type: "success",
            message: editingVariant
              ? "Variant updated successfully!"
              : "Variant added successfully!"
          })
        );
        setShowDrawer(false);
        fetchConfigs();
      } else {
        dispatch(setAlert({ type: "error", message: res.data?.message || "Failed to save variant." }));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to save variant." }));
    } finally {
      setLoadingForm(false);
    }
  };

  const tableData = useMemo(() => {
    const list = [];
    filteredConfigs.forEach((config) => {
      (config.variants || []).forEach((variant) => {
        list.push({
          ...variant,
          parentConfig: config
        });
      });
    });
    return list;
  }, [filteredConfigs]);

  const filteredComboKits = useMemo(() => {
    return comboKits.filter((kit) => {
      const kitCat = kit.solar_kit_id?.category_id?._id || kit.solar_kit_id?.category_id;
      const kitSub = kit.solar_kit_id?.subcategory_id?._id || kit.solar_kit_id?.subcategory_id;
      const kitType = kit.solar_kit_id?.type_id?._id || kit.solar_kit_id?.type_id;
      const kitRange = kit.project_range_id?._id || kit.project_range_id;

      return (
        String(kitCat || "") === String(formData.category_id || "") &&
        String(kitSub || "") === String(formData.subcategory_id || "") &&
        String(kitType || "") === String(formData.type_id || "") &&
        String(kitRange || "") === String(formData.project_range_id || "")
      );
    });
  }, [comboKits, formData.category_id, formData.subcategory_id, formData.type_id, formData.project_range_id]);

  const comboKitOptions = useMemo(() => {
    const options = filteredComboKits.map((kit) => ({
      value: String(kit._id || kit.id),
      text: `${kit.name} (Worth: ${countryDetails?.currency_symbol || "₹"}${kit.selling_price_cached || 0})`
    }));

    // If there is an existing selected kit that is not in the filtered list, append it
    formData.variants.forEach((v) => {
      if (v.combo_kit_id) {
        const alreadyExists = options.some(opt => String(opt.value) === String(v.combo_kit_id));
        if (!alreadyExists) {
          const originalKit = comboKits.find(kit => String(kit._id || kit.id) === String(v.combo_kit_id));
          if (originalKit) {
            options.push({
              value: String(originalKit._id || originalKit.id),
              text: `${originalKit.name} (Worth: ${countryDetails?.currency_symbol || "₹"}${originalKit.selling_price_cached || 0})`
            });
          }
        }
      }
    });

    return options;
  }, [filteredComboKits, comboKits, formData.variants, countryDetails]);

  const tableHeaders = [
    { key: "name", label: "Variant", align: "left" },
    { key: "additional_price", label: "Upgrade Price", align: "left" },
    { key: "worth_price", label: "Retail Worth", align: "left" },
    { key: "benefits", label: "Included Benefits", align: "left" },
    { key: "actions", label: "Actions", align: "right" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Combo Kit Variants"
        subtitle="Configure product variants with markup pricing and included benefits for different project configurations."
        actions={
          allFiltersSelected ? (
            <Button onClick={handleAddClick} leftIcon={<FaPlus />}>
              Add Variant
            </Button>
          ) : null
        }
      />

      {loading ? (
        <Loader text="Loading combo kit variants..." />
      ) : (
        <>
          {/* Main Top Filter Cards */}
          <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm flex flex-wrap md:flex-nowrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Dropdown
                label="Industry Type"
                value={tableIndustryType}
                onChange={handleTableIndustryTypeChange}
                placeholder="All Industry Types"
                options={industryTypes.map((i) => ({ value: String(i.id || i._id), text: i.name }))}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Dropdown
                label="Category"
                value={tableCategory}
                onChange={handleTableCategoryChange}
                placeholder="All Categories"
                options={categories.map((c) => ({ value: String(c.id || c._id), text: c.name }))}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Dropdown
                label="Subcategory"
                value={tableSubcategory}
                onChange={handleTableSubcategoryChange}
                placeholder={tableCategory ? "All Subcategories" : "Select category first..."}
                options={tableSubcategoriesOptions.map((s) => ({ value: String(s.id || s._id), text: s.name }))}
                disabled={!tableCategory}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Dropdown
                label="Project Type"
                value={tableType}
                onChange={handleTableTypeChange}
                placeholder={tableSubcategory ? "All Types" : "Select subcategory first..."}
                options={tableTypesOptions.map((t) => ({ value: String(t.subcategory_type_id || t.id || t._id), text: t.name }))}
                disabled={!tableSubcategory}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Dropdown
                label="Range"
                value={tableRange}
                onChange={setTableRange}
                placeholder={tableType ? "All Ranges" : "Select project type first..."}
                options={tableRangesOptions.map((r) => ({
                  value: String(r.id || r._id),
                  text: `${r.min_value} - ${r.max_value} ${r.unit_symbol || "kW"}`
                }))}
                disabled={!tableType}
              />
            </div>
            {(tableIndustryType || tableCategory || tableSubcategory || tableType || tableRange) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setTableIndustryType("");
                  setTableCategory("");
                  setTableSubcategory("");
                  setTableType("");
                  setTableRange("");
                  setTableSubcategoriesOptions([]);
                  setTableTypesOptions([]);
                  setTableRangesOptions([]);
                }}
                className="rounded-xl h-[44px]"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Configs Table */}
          <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/10 shadow-inner">
                  <FaLayerGroup size={14} />
                </div>
                Configured Upgrade Variants
              </h2>
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-surface-hover px-3 py-1.5 rounded-lg border border-border/40">
                {allFiltersSelected ? tableData.length : 0} Variants Found
              </span>
            </div>

            <div className="flex-1 p-6">
              {allFiltersSelected && tableData.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-surface-hover/10 border-2 border-dashed border-border rounded-2xl min-h-[300px] text-center space-y-4">
                  <div className="p-4 bg-primary/5 text-primary rounded-full border border-primary/10">
                    <FaBoxes size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-sm text-text-primary uppercase tracking-wider">
                      No Variants Configured
                    </h3>
                    <p className="text-xs text-text-muted max-w-sm">
                      There are no upgrade variants configured for this selected category, subcategory, project type, and capacity range combination.
                    </p>
                  </div>
                  <Button onClick={handleAddClick} leftIcon={<FaPlus />}>
                    Configure Variants for this Selection
                  </Button>
                </div>
              ) : (
                <CustomTable
                  headers={tableHeaders}
                  data={allFiltersSelected ? tableData : []}
                  loading={loading}
                  emptyMessage={
                    allFiltersSelected
                      ? "No variant configurations defined for this combination."
                      : "Please select Category, Subcategory, Project Type, and Range above to view configured upgrade variants."
                  }
                  renderRow={(item) => {
                    return (
                      <>
                        <td className="px-6 py-4">
                          <span className="font-black text-text-primary text-sm px-2.5 py-1 rounded-lg bg-surface-hover border border-border">
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-text-primary text-sm">
                            {countryDetails?.currency_symbol || "₹"}
                            {item.additional_price}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-text-secondary text-sm">
                            {countryDetails?.currency_symbol || "₹"}
                            {item.worth_price}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {item.additional_features?.map((feature, fIdx) => {
                              const isObj = typeof feature === "object" && feature !== null;
                              const name = isObj ? feature.name : String(feature);
                              const price = isObj ? feature.price : 0;
                              const isFree = isObj ? feature.is_free : true;
                              const description = isObj ? feature.description : "";
                              return (
                                <div key={fIdx} className="text-[11px] text-text-secondary flex flex-col gap-0.5 border-b border-border/20 last:border-0 pb-1 last:pb-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFree ? 'bg-success' : 'bg-primary'}`} />
                                    <span className="font-semibold">{name}</span>
                                    <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded ${isFree ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                                      {isFree ? `Free (${countryDetails?.currency_symbol || "₹"}${price})` : `${countryDetails?.currency_symbol || "₹"}${price}`}
                                    </span>
                                  </div>
                                  {description && (
                                    <span className="text-[10px] text-text-muted pl-3">{description}</span>
                                  )}
                                </div>
                              );
                            })}
                            {(!item.additional_features || item.additional_features.length === 0) && (
                              <span className="text-[11px] text-text-muted italic">No benefits</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton
                              tooltip="Edit Variant"
                              onClick={() => handleEditVariantClick(item.parentConfig, item)}
                            >
                              <FaEdit size={14} />
                            </IconButton>
                            <IconButton
                              tooltip="Delete Variant"
                              onClick={() => handleDeleteVariantClick(item.parentConfig, item)}
                              variant="danger"
                            >
                              <FaTrash size={14} />
                            </IconButton>
                          </div>
                        </td>
                      </>
                    );
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Configuration Dialog */}
      <Dialog
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingConfig ? "Edit Variant Setup" : "Configure Upgrade Variants"}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowDrawer(false)}
              className="rounded-xl font-bold uppercase tracking-wider text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveConfig}
              loading={loadingForm}
              className="rounded-xl font-bold uppercase tracking-wider text-xs"
            >
              Save Configuration
            </Button>
          </>
        }
      >
        {/* Subtitle */}
        <p className="text-xs text-text-muted mb-6 -mt-2">
          Set variants and matching upgrade prices for a specific product context.
        </p>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Context defined automatically by active selection */}

          {/* Variants Configuration Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-text-primary tracking-wider uppercase flex items-center gap-2">
                <FaBoxes className="text-primary" />
                Configure Variant Card
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {formData.variants.map((v, varIdx) => (
                <div
                  key={varIdx}
                  className="bg-surface rounded-2xl border-2 border-border p-5 relative shadow-sm space-y-4 transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-black text-primary uppercase bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10">
                        Variant #{varIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => handleVariantFieldChange(varIdx, "name", e.target.value)}
                        placeholder="e.g. Standard, Premium, Elite"
                        className="font-black text-sm bg-transparent outline-none border-b border-transparent focus:border-primary text-text-primary px-1 flex-1 min-w-[120px]"
                      />
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                        Color Theme:
                      </span>
                      <input
                        type="color"
                        value={v.color || "#2f4cbd"}
                        onChange={(e) => handleVariantFieldChange(varIdx, "color", e.target.value)}
                        className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        placeholder="#2f4cbd"
                        value={v.color || ""}
                        onChange={(e) => handleVariantFieldChange(varIdx, "color", e.target.value)}
                        className="w-20 text-xs bg-surface-hover hover:bg-surface-hover/80 text-text-secondary outline-none border border-border rounded-lg px-2 py-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Additional Price */}
                    <div>
                      <CustomInput
                        label={`Upgrade Price (${countryDetails?.currency_symbol || "₹"}) - Calculated`}
                        type="number"
                        value={v.additional_price}
                        disabled
                        placeholder="Calculated automatically"
                        inputClassName="font-bold"
                      />
                    </div>

                    {/* Worth Price */}
                    <div>
                      <CustomInput
                        label={`Retail Worth (${countryDetails?.currency_symbol || "₹"}) - Calculated`}
                        type="number"
                        value={v.worth_price}
                        disabled
                        placeholder="Calculated automatically"
                        inputClassName="font-bold"
                      />
                    </div>
                  </div>

                  {/* Benefits / Offers Configurator */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                      <FaTags className="text-primary/60" />
                      Included Benefits &amp; Offers (Configure price &amp; is free)
                    </label>

                    {/* Structured Benefits List */}
                    <div className="space-y-2">
                      {(v.additional_features || []).map((feature, fIdx) => {
                        const isObj = typeof feature === "object" && feature !== null;
                        const featureName = isObj ? feature.name : String(feature);
                        const featurePrice = isObj ? feature.price : 0;
                        const featureIsFree = isObj ? feature.is_free : true;
                        const featureDescription = isObj ? feature.description : "";

                        return (
                          <div
                            key={fIdx}
                            className="flex flex-col gap-2 bg-surface-hover/30 p-3 rounded-xl border border-border transition-all hover:bg-surface-hover/50"
                          >
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full">
                              <div className="flex-1 min-w-[150px] font-bold text-xs text-text-primary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {featureName}
                              </div>
                              <div className="w-[120px] flex items-center gap-1.5">
                                <span className="text-[10px] text-text-muted font-bold uppercase shrink-0">
                                  {countryDetails?.currency_symbol || "₹"}
                                </span>
                                <input
                                  type="number"
                                  placeholder="Price"
                                  value={featurePrice === 0 && !featureIsFree ? "" : featurePrice}
                                  onChange={(e) =>
                                    handleBenefitFieldChange(varIdx, fIdx, "price", Number(e.target.value))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-border text-xs focus:border-primary outline-none bg-surface"
                                />
                              </div>
                              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={featureIsFree}
                                  onChange={(e) =>
                                    handleBenefitFieldChange(varIdx, fIdx, "is_free", e.target.checked)
                                  }
                                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                  Free
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveBenefit(varIdx, fIdx)}
                                className="p-2 rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-all"
                                title="Remove Benefit"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                            <div className="pl-3.5 w-full">
                              <CustomInput
                                type="textarea"
                                placeholder="Benefit description (optional)..."
                                value={featureDescription || ""}
                                onChange={(e) =>
                                  handleBenefitFieldChange(varIdx, fIdx, "description", e.target.value)
                                }
                                rows={2}
                                inputClassName="!py-2 !px-3 text-xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!(v.additional_features || []).length && (
                        <div className="text-xs text-text-muted italic bg-surface-hover/10 border border-dashed border-border rounded-xl p-4 text-center">
                          No benefits or offers configured for this variant yet.
                        </div>
                      )}
                    </div>

                    {/* Add tag inputs */}
                    <div className="flex items-center gap-2 max-w-md pt-1">
                      <input
                        type="text"
                        value={newFeatureText[varIdx] || ""}
                        onChange={(e) =>
                          setNewFeatureText((prev) => ({ ...prev, [varIdx]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBenefit(varIdx, newFeatureText[varIdx]);
                          }
                        }}
                        placeholder="Type a custom offer..."
                        className="flex-1 px-3 py-1.5 rounded-xl border-2 border-border outline-none text-xs focus:border-primary transition-all bg-surface"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleAddBenefit(varIdx, newFeatureText[varIdx])}
                        className="rounded-xl py-2 px-3 text-xs"
                      >
                        Add
                      </Button>
                    </div>

                    {/* Predefined benefits quick chips */}
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] text-text-muted uppercase font-black tracking-wider block">
                        Quick Recommendations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {PREDEFINED_BENEFITS.filter(
                          (p) =>
                            !(v.additional_features || []).some(
                              (f) =>
                                (typeof f === "object" && f !== null ? f.name : String(f)).toLowerCase() ===
                                p.toLowerCase()
                            )
                        ).map((b) => (
                          <button
                            type="button"
                            key={b}
                            onClick={() => handleAddBenefit(varIdx, b)}
                            className="text-[10px] font-bold text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 px-2.5 py-1 rounded-lg border border-border transition-all"
                          >
                            + {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Popup */}
      {deleteConfirm && (
        <ConfirmationPopup
          isOpen={true}
          title="Delete Variant Configuration"
          message={`Are you sure you want to delete the variant configuration for category "${deleteConfirm.category_id?.name || "N/A"}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteConfirm(null)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
