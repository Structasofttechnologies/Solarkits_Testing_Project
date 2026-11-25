import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";

import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import Dropdown from "@/components/Dropdown";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import Dialog from "@/components/Dialog";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import CustomFilePicker from "@/components/CustomFilePicker";

import {
  FaPlus, FaLayerGroup,
  FaTrash, FaEdit, FaShoppingBag,
  FaEye, FaImage, FaCheckCircle,
   FaChevronRight
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

const getCleanId = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    return val.id || val._id || "";
  }
  return String(val);
};

export default function CustomizeKits({ moduleUniqueId = "ADM_CUSTOMIZE_KITS" }) {
  const { countryName } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State
  const [loading, setLoading] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryDetails, setCountryDetails] = useState(null);

  const [configuredKits, setConfiguredKits] = useState([]);
  const [masterKits, setMasterKits] = useState([]);

  // Cache for subtype brands
  const [subtypeBrandsMap, setSubtypeBrandsMap] = useState({}); // subtypeId(s) -> [{ value, text }]

  // List Filter States
  const [selectedIndustryType, setSelectedIndustryType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedProjectRange, setSelectedProjectRange] = useState("");

  // List Filter Option Lists
  const [industryTypes, setIndustryTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [projectRanges, setProjectRanges] = useState([]);

  // Form Range Options
  const [formProjectRanges, setFormProjectRanges] = useState([]);
  const [loadingRanges, setLoadingRanges] = useState(false);

  // Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    solar_kit_id: "",
    project_range_id: "",
    kit_image: null,
    base_components: [], // { template_id, name, subtype_id, subtype_name, brand_ids }
    bos_kits: []        // { name, brand_ids, template_ids, subtype_ids, image: null/string }
  });

  const [kitImageFile, setKitImageFile] = useState(null);
  const [bosImageFiles, setBosImageFiles] = useState({}); // { [index]: File }

  // Details modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingKit, setViewingKit] = useState(null);

  // Delete Confirm
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Endpoint resolver based on Selected Country
  const isIndia = countryName?.toLowerCase() === "india";
  const endpoints = useMemo(() => {
    const base = `${API_URL}/combo-kits${isIndia ? "/india" : ""}`;
    return {
      get: `${base}/get-kits`,
      create: `${base}/create-kit`,
      update: `${base}/update-kit`,
      delete: `${base}/delete-kit`
    };
  }, [isIndia]);

  // Fetch configured kits
  const fetchConfiguredKits = async (countryId) => {
    if (!countryId) return;
    try {
      setLoading(true);
      const res = await axios.get(
        `${endpoints.get}?unique_id=${moduleUniqueId}&req_for=view&is_custom=true&country_id=${countryId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setConfiguredKits(res.data.data || []);
      }
    } catch (e) {
      console.error("Error fetching configured kits:", e);
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

  const fetchFormProjectRanges = async (systemTypeId) => {
    setFormProjectRanges([]);
    if (!systemTypeId) return;
    try {
      setLoadingRanges(true);
      const res = await axios.get(
        `${API_URL}/project-types/get-ranges?unique_id=${moduleUniqueId}&req_for=view&subcategory_type_id=${systemTypeId}`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setFormProjectRanges(
          res.data.data.map((item) => ({
            value: String(item.id),
            text: `${item.min_value} - ${item.max_value} ${item.unit_symbol || "kW"}`,
          }))
        );
      }
    } catch (e) {
      console.error("Error fetching form project ranges:", e);
    } finally {
      setLoadingRanges(false);
    }
  };

  const handleIndustryTypeChange = (val) => {
    setSelectedIndustryType(val);
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedType("");
    setSelectedProjectRange("");
    fetchCategories(val);
  };

  const handleCategoryChange = (val) => {
    setSelectedCategory(val);
    setSelectedSubcategory("");
    setSelectedType("");
    setSelectedProjectRange("");
    fetchSubcategories(val);
  };

  const handleSubcategoryChange = (val) => {
    setSelectedSubcategory(val);
    setSelectedType("");
    setSelectedProjectRange("");
    fetchSystemTypes(val);
  };

  const handleTypeChange = (val) => {
    setSelectedType(val);
    setSelectedProjectRange("");
    fetchProjectRanges(val);
  };

  const handleProjectRangeChange = (val) => {
    setSelectedProjectRange(val);
  };

  const clearFilters = () => {
    setSelectedIndustryType("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedType("");
    setSelectedProjectRange("");
    setCategories([]);
    setSubcategories([]);
    setSystemTypes([]);
    setProjectRanges([]);
  };

  // Fetch initial filters
  useEffect(() => {
    if (moduleUniqueId) {
      fetchIndustryTypes();
      fetchCategories();
    }
  }, [moduleUniqueId]);

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

            navigate(`/admin-panel/solar-shop/${defaultCountry}/combokit-configurations/customize-kits`, { replace: true });
            return;
          }
        }

        // Fetch Master Solar Kits
        const kitRes = await axios.get(
          `${API_URL}/solar-kits/get-kits?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        if (kitRes.data?.status === "success") {
          setMasterKits(kitRes.data.data || []);
        }

      } catch (error) {
        console.error("Error fetching initial master data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountriesAndMasterData();
  }, [countryName, moduleUniqueId]);

  // Fetch Configured kits whenever selectedCountry changes
  useEffect(() => {
    if (selectedCountry) {
      fetchConfiguredKits(selectedCountry);
    }
  }, [selectedCountry, endpoints.get]);

  // Fetch brands dynamically for selected subtypes
  const fetchBrandsForSubtypeIds = async (subtypeIds) => {
    if (!subtypeIds || (Array.isArray(subtypeIds) && subtypeIds.length === 0)) return;
    const cleanId = Array.isArray(subtypeIds)
      ? subtypeIds.map(st => st?._id || st?.id || st).filter(Boolean).join(",")
      : subtypeIds.toString();
    if (!cleanId || subtypeBrandsMap[cleanId]) return;

    try {
      const res = await axios.get(
        `${API_URL}/product-templates/get-brands-by-subtype?subtype_id=${cleanId}&unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        const mappedBrands = (res.data.data || []).map(b => ({
          value: b.id || b._id || b.brand_id,
          text: b.name || b.brand_name || b.brand || "Unknown Brand",
          logo: b.logo || null
        })).filter(opt => opt.value);
        setSubtypeBrandsMap(prev => ({
          ...prev,
          [cleanId]: mappedBrands
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger brands fetching for selected component subtypes
  useEffect(() => {
    if (formData.base_components?.length > 0) {
      formData.base_components.forEach(bc => {
        if (bc.subtype_id) {
          fetchBrandsForSubtypeIds(bc.subtype_id);
        }
      });
    }
    if (formData.bos_kits?.length > 0) {
      formData.bos_kits.forEach(bk => {
        if (bk.subtype_ids?.length > 0) {
          fetchBrandsForSubtypeIds(bk.subtype_ids);
        }
      });
    }
  }, [formData.base_components, formData.bos_kits]);

  const masterKitOptions = useMemo(() => {
    return masterKits.map(mk => ({ text: mk.name, value: getCleanId(mk) }));
  }, [masterKits]);

  // Form handle functions
  const handleFormChange = (key, value) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value };

      if (key === "solar_kit_id") {
        const selectedMaster = masterKits.find(mk => (mk.id || mk._id) === value);
        if (selectedMaster) {
          const systemTypeId = selectedMaster.type_id?._id || selectedMaster.type_id?.id || selectedMaster.type_id;
          if (systemTypeId) {
            fetchFormProjectRanges(systemTypeId);
          } else {
            setFormProjectRanges([]);
          }
          updated.project_range_id = ""; // reset project range

          updated.base_components = (selectedMaster.base_components || []).map(bc => ({
            template_id: bc.template_id?._id || bc.template_id?.id || bc.template_id,
            name: bc.template_id?.name || 'Component Template',
            subtype_id: bc.subtype_id?._id || bc.subtype_id?.id || bc.subtype_id || null,
            subtype_name: bc.subtype_id?.name || '',
            brand_ids: []
          }));
          updated.bos_kits = (selectedMaster.bos_kits || []).map(bk => {
            const allSubtypeIds = (bk.items || []).flatMap(item => 
              (item.subtype_ids || []).map(st => st?._id || st?.id || st)
            ).filter(Boolean);
            
            return {
              name: bk.name,
              brand_ids: [],
              image: bk.image || "",
              template_ids: (bk.items || []).map(item => item.template_id?._id || item.template_id?.id || item.template_id).filter(Boolean),
              subtype_ids: allSubtypeIds
            };
          });
        } else {
          updated.base_components = [];
          updated.bos_kits = [];
          updated.project_range_id = "";
          setFormProjectRanges([]);
        }
      }
      return updated;
    });
  };

  const handleBaseBrandChange = (index, brandIds) => {
    setFormData(prev => {
      const copy = [...prev.base_components];
      copy[index] = { ...copy[index], brand_ids: brandIds };
      return { ...prev, base_components: copy };
    });
  };

  const handleBosBrandChange = (index, brandIds) => {
    setFormData(prev => {
      const copy = [...prev.bos_kits];
      copy[index] = { ...copy[index], brand_ids: brandIds };
      return { ...prev, bos_kits: copy };
    });
  };

  // Open Form
  const openAddKit = () => {
    setEditingKit(null);
    setKitImageFile(null);
    setBosImageFiles({});
    setFormProjectRanges([]);
    setFormData({
      name: "",
      solar_kit_id: "",
      project_range_id: "",
      kit_image: null,
      base_components: [],
      bos_kits: []
    });
    setShowDrawer(true);
  };

  const openEditKit = (row) => {
    setEditingKit(row);
    setKitImageFile(null);
    setBosImageFiles({});

    const systemTypeId = getCleanId(row.solar_kit_id?.type_id);
    if (systemTypeId) {
      fetchFormProjectRanges(systemTypeId);
    } else {
      setFormProjectRanges([]);
    }

    setFormData({
      name: row.name || "",
      solar_kit_id: getCleanId(row.solar_kit_id),
      project_range_id: getCleanId(row.project_range_id),
      kit_image: row.kit_image,
      base_components: (row.base_components || []).map(bc => ({
        template_id: getCleanId(bc.template_id),
        name: bc.template_id?.name || 'Base Component',
        subtype_id: getCleanId(bc.subtype_id) || null,
        subtype_name: bc.subtype_id?.name || '',
        brand_ids: (bc.brand_ids || []).map(b => getCleanId(b))
      })),
      bos_kits: (row.bos_kits || []).map(bk => {
        const allSubtypeIds = (bk.subtype_ids || []).map(st => getCleanId(st)).filter(Boolean);
        return {
          name: bk.name,
          brand_ids: (bk.brand_ids || []).map(b => getCleanId(b)),
          image: bk.image || "",
          template_ids: (bk.template_ids || []).map(t => getCleanId(t)),
          subtype_ids: allSubtypeIds
        };
      })
    });
    setShowDrawer(true);
  };

  // Form Submit
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.solar_kit_id) {
      dispatch(setAlert({ type: "warning", message: "Please fill custom name and solar kit blueprint." }));
      return;
    }

    setLoadingForm(true);
    try {
      const payload = new FormData();
      if (editingKit) {
        payload.append("id", editingKit.id);
      }
      payload.append("name", formData.name);
      payload.append("country_id", selectedCountry);
      payload.append("solar_kit_id", formData.solar_kit_id);
      payload.append("project_range_id", formData.project_range_id || "");
      payload.append("base_components", JSON.stringify(formData.base_components));
      payload.append("bos_kits", JSON.stringify(formData.bos_kits));
      payload.append("is_custom", "true");

      if (kitImageFile) {
        payload.append("kit_image", kitImageFile);
      }

      Object.keys(bosImageFiles).forEach(index => {
        payload.append(`bos_kit_image_${index}`, bosImageFiles[index]);
      });

      const url = editingKit ? `${endpoints.update}?unique_id=${moduleUniqueId}&req_for=edit` : `${endpoints.create}?unique_id=${moduleUniqueId}&req_for=add`;
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
        setShowDrawer(false);
        fetchConfiguredKits(selectedCountry);
        window.dispatchEvent(new Event('pipeline-status-refresh'));
      }
    } catch (err) {
      console.error(err);
      dispatch(setAlert({ type: "error", message: err.response?.data?.message || "Failed to configure Custom Kit." }));
    } finally {
      setLoadingForm(false);
    }
  };

  // Soft Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await axios.post(
        `${endpoints.delete}?unique_id=${moduleUniqueId}&req_for=delete`,
        { id: deleteConfirm.id },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: res.data.message }));
        fetchConfiguredKits(selectedCountry);
      }
    } catch (e) {
      console.error(e);
      dispatch(setAlert({ type: "error", message: "Failed to delete custom kit configuration." }));
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Selected Master Details Map
  const selectedSolarKitObj = useMemo(() => {
    return masterKits.find(mk => getCleanId(mk) === getCleanId(formData.solar_kit_id));
  }, [formData.solar_kit_id, masterKits]);

  // Custom Table Configuration
  const columns = [
    {
      header: "Custom Kit Name",
      accessor: "name",
      render: (val) => (
        <p className="text-xs font-bold text-text-primary uppercase tracking-wide">{val || 'N/A'}</p>
      )
    },
    {
      header: "Country",
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
      header: "Custom Kit Cover",
      accessor: "kit_image",
      render: (val) => (
        <div className="w-16 h-12 rounded-lg border border-border bg-surface-hover overflow-hidden flex items-center justify-center">
          {val ? (
            <img src={val} alt="Kit Cover" className="w-full h-full object-cover" />
          ) : (
            <FaImage className="text-text-muted/40" size={16} />
          )}
        </div>
      )
    },
    {
      header: "Solar Kit Blueprint",
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
      header: "Project Range",
      accessor: "project_range_id",
      render: (val) => (
        <p className="text-xs font-bold text-text-primary uppercase tracking-wide">
          {val ? `${val.min_value} - ${val.max_value} ${val.unit_symbol || val.unit_id?.symbol || "kW"}` : 'N/A'}
        </p>
      )
    },
    {
      header: "Configured Brands",
      accessor: "base_components",
      render: (val, row) => {
        const bcBrands = (val || []).flatMap(bc => (bc.brand_ids || []).map(b => b.brand_name)).filter(Boolean);
        const bosBrands = (row.bos_kits || []).flatMap(bk => (bk.brand_ids || []).map(b => b.brand_name)).filter(Boolean);
        const all = [...new Set([...bcBrands, ...bosBrands])];
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

  const filteredCustomKits = useMemo(() => {
    return configuredKits.filter((k) => {
      const kitInd = k.solar_kit_id?.category_id?.industry_type_id?._id || k.solar_kit_id?.category_id?.industry_type_id || "";
      const matchInd = !selectedIndustryType || String(kitInd) === selectedIndustryType;

      const matchCat = !selectedCategory ||
        String(getCleanId(k.solar_kit_id?.category_id)) === selectedCategory;

      const matchSub = !selectedSubcategory ||
        String(getCleanId(k.solar_kit_id?.subcategory_id)) === selectedSubcategory;

      const matchType = !selectedType ||
        String(getCleanId(k.solar_kit_id?.type_id)) === selectedType;

      const matchRange = !selectedProjectRange ||
        String(getCleanId(k.project_range_id)) === selectedProjectRange;

      return matchInd && matchCat && matchSub && matchType && matchRange;
    });
  }, [configuredKits, selectedIndustryType, selectedCategory, selectedSubcategory, selectedType, selectedProjectRange]);

  return (
    <div className="min-h-screen space-y-6 pb-24 animate-in fade-in duration-500">
      <PageHeader
        title="Customize Kit Configuration"
        subtitle={`Manage custom brand configurations of solar kit components and accessories for ${countryName || 'Global'}.`}
        icon={FaShoppingBag}
        stats={[
          { label: "Configured Custom Kits", value: configuredKits.length, description: `Active ${countryName || 'Global'} custom kits` }
        ]}
        actions={
          <Button variant="primary" size="md" onClick={openAddKit} leftIcon={<FaPlus />}>
            Configure Custom Kit
          </Button>
        }
      />

      {/* FILTER CONTROLS */}
      <div className="bg-surface rounded-3xl border-2 border-border p-6 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <Dropdown
            label="Industry Type"
            value={selectedIndustryType}
            onChange={handleIndustryTypeChange}
            placeholder="All Industry Types"
            options={industryTypes}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="Category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            placeholder="All Categories"
            options={categories}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="Subcategory"
            value={selectedSubcategory}
            onChange={handleSubcategoryChange}
            placeholder={selectedCategory ? "All Subcategories" : "Select Category first"}
            disabled={!selectedCategory}
            options={subcategories}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="System Type"
            value={selectedType}
            onChange={handleTypeChange}
            placeholder={selectedSubcategory ? "All System Types" : "Select Subcategory first"}
            disabled={!selectedSubcategory}
            options={systemTypes}
          />
        </div>
        <div className="flex-1 w-full">
          <Dropdown
            label="Project Range"
            value={selectedProjectRange}
            onChange={handleProjectRangeChange}
            placeholder={selectedType ? "All Ranges" : "Select System Type first"}
            disabled={!selectedType}
            options={projectRanges}
          />
        </div>
        {(selectedCategory || selectedSubcategory || selectedType || selectedProjectRange) && (
          <Button
            variant="secondary"
            onClick={clearFilters}
            className="mt-6 md:mt-0 rounded-xl"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* LISTING TABLE */}
      <div className="bg-surface rounded-3xl border-2 border-border overflow-hidden shadow-md">
        <CustomTable
          headers={columns}
          data={filteredCustomKits}
          loading={loading}
          emptyMessage="No configured custom kits found. Click 'Configure Custom Kit' to map one."
        />
      </div>

      {/* CONFIGURATION FORM DIALOG */}
      <Dialog
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingKit ? "Edit Configured Custom Kit" : "Configure Custom Kit"}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-8 p-1">
          {/* Custom Kit Details */}
          <section className="bg-surface-hover/20 p-6 rounded-3xl border border-border space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><FaEdit size={14} /></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Custom Kit Details</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Custom Kit Name</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-none focus:border-primary placeholder:text-text-muted/50"
                placeholder="e.g. Custom 5kW System"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                required
              />
            </div>
          </section>

          {/* Solar Kit Master Select */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600"><FaShoppingBag size={14} /></div>
              <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Solar Kit Definition Blueprint</h3>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Master Solar Kit</label>
              <DropdownWithSearchInput
                options={masterKitOptions}
                value={formData.solar_kit_id}
                onChange={(val) => handleFormChange("solar_kit_id", val)}
                placeholder="Select Master Solar Kit Definition"
                disabled={!!editingKit}
              />
            </div>

            {/* Display Hierarchy Mapping */}
            {selectedSolarKitObj && (
              <div className="bg-surface border border-border p-5 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Selected Kit Project Hierarchy Mapping</p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-text-primary">
                  <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl border border-primary/20">{selectedSolarKitObj.category_id?.name || 'Category'}</span>
                  <FaChevronRight className="text-text-muted" size={10} />
                  <span className="bg-indigo-500/10 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-500/20">{selectedSolarKitObj.subcategory_id?.name || 'Subcategory'}</span>
                  <FaChevronRight className="text-text-muted" size={10} />
                  <span className="bg-amber-500/10 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-500/20">{selectedSolarKitObj.type_id?.name || 'System Type'}</span>
                </div>
              </div>
            )}

            {/* Project Range Selection */}
            {selectedSolarKitObj && (
              <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Project Range</label>
                <DropdownWithSearchInput
                  options={formProjectRanges}
                  value={formData.project_range_id}
                  onChange={(val) => handleFormChange("project_range_id", val)}
                  placeholder={loadingRanges ? "Loading Ranges..." : "Select Project Range"}
                  disabled={loadingRanges}
                />
              </div>
            )}
          </section>

          {/* Configuration Parameters */}
          {selectedSolarKitObj && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Kit Cover Image */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-600"><FaImage size={14} /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Kit Cover Image</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <CustomFilePicker
                    label="Upload Kit Cover Image"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setKitImageFile(file);
                    }}
                  />
                  <div>
                    {kitImageFile ? (
                      <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <FaCheckCircle /> Selected: {kitImageFile.name}
                      </div>
                    ) : formData.kit_image ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Current Cover Image:</p>
                        <img
                          src={formData.kit_image.includes('localhost:3001') ? formData.kit_image.replace('localhost:3001', 'localhost:5000') : (formData.kit_image.startsWith('http://') || formData.kit_image.startsWith('https://')) ? formData.kit_image : `http://localhost:5000/${formData.kit_image.startsWith('/') ? formData.kit_image.slice(1) : formData.kit_image}`}
                          alt="Current Kit Cover"
                          className="h-16 w-auto rounded-lg border border-border object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-muted italic">No cover image uploaded for this combo configuration.</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Base Component Brand Mapping */}
              <section className="bg-surface-hover/20 p-6 rounded-3xl border border-border space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-600"><FaLayerGroup size={14} /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Base Components Brand Assignment</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.base_components.map((bc, idx) => (
                    <div key={idx} className="bg-surface p-4 rounded-2xl border border-border space-y-2">
                      <label className="text-xs font-black text-text-primary uppercase tracking-wide">{bc.name}</label>
                      <MultiSelectDropdownWithSearchInput
                        options={subtypeBrandsMap[bc.subtype_id] || []}
                        values={bc.brand_ids}
                        onChange={(vals) => handleBaseBrandChange(idx, vals)}
                        placeholder={bc.subtype_id ? "Select Brand Manufacturers" : "Brands not mapped to template subtype"}
                        disabled={!bc.subtype_id}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* BOS Kit Brand & Image Mapping */}
              {formData.bos_kits.length > 0 && (
                <section className="bg-surface-hover/20 p-6 rounded-3xl border border-border space-y-6">
                  <div className="flex items-center gap-2 px-1">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600"><FaShoppingBag size={14} /></div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">BOS Kits Brand & Images</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {formData.bos_kits.map((bk, idx) => (
                      <div key={idx} className="bg-surface p-5 rounded-2xl border border-border space-y-4">
                        <div className="flex justify-between items-center border-b border-border pb-2">
                          <span className="text-xs font-black text-text-primary uppercase tracking-wider">{bk.name}</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-wider">BOS Kit Bundle</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Brand Manufacturer</label>
                            <MultiSelectDropdownWithSearchInput
                              options={subtypeBrandsMap[bk.subtype_ids?.join(",")] || []}
                              values={bk.brand_ids}
                              onChange={(vals) => handleBosBrandChange(idx, vals)}
                              placeholder={bk.subtype_ids?.length > 0 ? "Select Brands" : "Brands not mapped to template subtype"}
                              disabled={!bk.subtype_ids || bk.subtype_ids.length === 0}
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-3">
                            <CustomFilePicker
                              label="Upload BOS Kit Image"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setBosImageFiles(prev => ({ ...prev, [idx]: file }));
                                }
                              }}
                            />
                            {bosImageFiles[idx] ? (
                              <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                                <FaCheckCircle /> Selected: {bosImageFiles[idx].name}
                              </div>
                            ) : bk.image ? (
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Current BOS Image:</p>
                                <img src={bk.image} alt="Current BOS" className="h-12 w-auto rounded border border-border object-cover" />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={loadingForm}>
              {editingKit ? "Save Updates" : "Confirm Configuration"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Custom Kit Configuration Details"
        size="lg"
      >
        {viewingKit && (
          <div className="space-y-6">
            {/* Top overview */}
            <div className="flex items-center gap-4 bg-surface-hover/20 p-5 rounded-2xl border border-border">
              <div className="w-20 h-16 rounded-xl border border-border overflow-hidden bg-surface flex items-center justify-center shrink-0">
                {viewingKit.kit_image ? (
                  <img
                    src={viewingKit.kit_image.includes('localhost:3001') ? viewingKit.kit_image.replace('localhost:3001', 'localhost:5000') : (viewingKit.kit_image.startsWith('http://') || viewingKit.kit_image.startsWith('https://')) ? viewingKit.kit_image : `http://localhost:5000/${viewingKit.kit_image.startsWith('/') ? viewingKit.kit_image.slice(1) : viewingKit.kit_image}`}
                    alt="Kit"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";
                    }}
                  />
                ) : (
                  <FaImage className="text-text-muted/40" size={24} />
                )}
              </div>
              <div>
                <h4 className="text-base font-black text-text-primary uppercase tracking-wide">{viewingKit.name}</h4>
                <p className="text-xs text-text-secondary font-bold uppercase mt-1">Blueprint: {viewingKit.solar_kit_id?.name || 'N/A'}</p>
                <p className="text-xs text-text-secondary font-bold uppercase mt-0.5">Country: {viewingKit.country_name || countryName || 'Global'}</p>
              </div>
            </div>

            {/* Hierarchy mapping */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Master Hierarchy Map</p>
              <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                <span className="bg-primary/5 border border-primary/15 text-primary px-2.5 py-1 rounded-xl">{viewingKit.solar_kit_id?.category_id?.name || 'Category'}</span>
                <FaChevronRight className="text-text-muted" size={8} />
                <span className="bg-indigo-500/5 border border-indigo-500/15 text-indigo-700 px-2.5 py-1 rounded-xl">{viewingKit.solar_kit_id?.subcategory_id?.name || 'Subcategory'}</span>
                <FaChevronRight className="text-text-muted" size={8} />
                <span className="bg-amber-500/5 border border-amber-500/15 text-amber-700 px-2.5 py-1 rounded-xl">{viewingKit.solar_kit_id?.type_id?.name || 'Type'}</span>
              </div>
            </div>

            {/* Project Range mapping */}
            {viewingKit.project_range_id && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Project Range</p>
                <div className="text-xs font-bold text-text-primary">
                  <span className="bg-teal-500/5 border border-teal-500/15 text-teal-700 px-2.5 py-1 rounded-xl">
                    {viewingKit.project_range_id.min_value} - {viewingKit.project_range_id.max_value} {viewingKit.project_range_id.unit_symbol || viewingKit.project_range_id.unit_id?.symbol || "kW"}
                  </span>
                </div>
              </div>
            )}

            {/* Base Components List */}
            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                <span className="w-1.5 h-3 bg-teal-500 rounded-full"></span> Base Component Brands
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(viewingKit.base_components || []).map((bc, idx) => (
                  <div key={idx} className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between gap-2">
                    <p className="text-xs font-black text-text-primary uppercase">{bc.template_id?.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {(bc.brand_ids || []).map((b, bidx) => (
                        <span key={bidx} className="bg-linear-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {b.brand_name || b.name || b}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOS Kits List */}
            {viewingKit.bos_kits?.length > 0 && (
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full"></span> Configured BOS Kits
                </h5>
                <div className="grid grid-cols-1 gap-4">
                  {viewingKit.bos_kits.map((bk, idx) => (
                    <div key={idx} className="bg-surface border border-border p-4 rounded-xl flex flex-col justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded border border-border overflow-hidden bg-surface-hover flex items-center justify-center shrink-0">
                          {bk.image ? (
                            <img src={bk.image} alt="BOS" className="w-full h-full object-cover" />
                          ) : (
                            <FaImage className="text-text-muted/30" size={14} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-text-primary uppercase">{bk.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(bk.brand_ids || []).map((b, bidx) => (
                              <span key={bidx} className="bg-linear-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {b.brand_name || b.name || b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close Specifications</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* DELETE CONFIRM POPUP */}
      <ConfirmationPopup
        isOpen={!!deleteConfirm}
        title="Delete Configured Custom Kit"
        message="Are you sure you want to delete this custom kit configuration? The local configuration mapping, brands, and cover images will be deleted."
        variant="danger"
        confirmText="Confirm Deletion"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
