import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import * as solarKitApi from "@/api/solarKits";
import * as templateApi from "@/api/productTemplates";
import { getTemplatesByScope } from "@/api/productTemplates";
import { authHeaderObj } from "@/app/authHeader";

import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import CustomTable from "@/components/CustomTable";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import PopupDataLoader from "@/components/PopupDataLoader";

import {
  FaPlus, FaSearch, FaLayerGroup,
  FaTrash, FaEdit, FaSolarPanel, FaShoppingBag,
  FaFileAlt, FaEye, FaSync
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

export default function SolarKits({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // State
  const [loading, setLoading] = useState(false);
  const [kits, setKits] = useState([]);
  const [allTemplates, setAllTemplates] = useState([]);
  const [scopedTemplateIds, setScopedTemplateIds] = useState(null); // null = no filter active
  const [options, setOptions] = useState({ industryType: [], category: [], subcategory: [], type: [] });
  const [filters, setFilters] = useState({ industryType: "", category: "", subcategory: "", type: "" });
  const [searchTerm, setSearchTerm] = useState("");

  // Drawer & Form State
  const [showDrawer, setShowDrawer] = useState(false);
  const [isDataReady, setIsDataReady] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [viewingKit, setViewingKit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry_type_id: "",
    category_id: "",
    subcategory_id: "",
    type_id: "",
    base_template_ids: [],
    base_components: [],
    bos_template_ids: [],
    bos_kits: [],
    image: ""
  });

  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteBosKitConfirm, setDeleteBosKitConfirm] = useState(null);

  // Loaded Kit Component Specs details
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [kitDetails, setKitDetails] = useState({ base: [], bos: [] });

  // Brands list for BOS Kits
  const [brands, setBrands] = useState([]);

  // Template Subtypes cache
  const [templateSubtypes, setTemplateSubtypes] = useState({}); // templateId -> [{ value: subId, text: subName }]
  const [subtypeScopes, setSubtypeScopes] = useState({}); // templateId -> { subtypeId -> [typeIds] }

  // BOS Kit Dialog state
  const [showBosKitModal, setShowBosKitModal] = useState(false);
  const [editingBosKitIndex, setEditingBosKitIndex] = useState(null);
  const [bosKitForm, setBosKitForm] = useState({
    name: "",
    image: "",
    brand_id: "",
    items: []
  });

  const fetchSubtypesForTemplate = async (templateId) => {
    if (!templateId) return;
    if (templateSubtypes[templateId] && subtypeScopes[templateId]) return;

    try {
      const promises = [];
      if (!templateSubtypes[templateId]) {
        promises.push(
          axios.get(
            `${API_URL}/product-templates/get-subtypes?unique_id=${moduleUniqueId}&req_for=view&template_id=${templateId}`,
            { headers: authHeaderObj() }
          )
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      if (!subtypeScopes[templateId]) {
        promises.push(
          axios.get(
            `${API_URL}/product-templates/get-subtype-scope?unique_id=${moduleUniqueId}&req_for=view&template_id=${templateId}`,
            { headers: authHeaderObj() }
          )
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      const results = await Promise.allSettled(promises);
      const subtypesResResult = results[0];
      const scopesResResult = results[1];

      let nextSubtypes = null;
      if (subtypesResResult.status === "fulfilled" && subtypesResResult.value) {
        const subtypesRes = subtypesResResult.value;
        if (subtypesRes.data?.status === "success") {
          nextSubtypes = (subtypesRes.data.data || []).map(st => ({
            value: st.id || st._id,
            text: st.name
          }));
        }
      }

      let nextScopes = null;
      if (scopesResResult.status === "fulfilled" && scopesResResult.value) {
        const scopesRes = scopesResResult.value;
        if (scopesRes.data?.status === "success") {
          const scopeData = scopesRes.data.data || [];
          const mapping = {};
          scopeData.forEach(item => {
            const subId = item.subtype_id;
            const typeId = item.subcategory_type_id;
            if (subId && typeId) {
              if (!mapping[subId]) mapping[subId] = [];
              if (!mapping[subId].includes(String(typeId))) {
                mapping[subId].push(String(typeId));
              }
            }
          });
          nextScopes = mapping;
        }
      }

      if (nextSubtypes !== null || nextScopes !== null) {
        setTemplateSubtypes(prev => {
          const updated = { ...prev };
          if (nextSubtypes !== null) {
            updated[templateId] = nextSubtypes;
          }
          return updated;
        });
        setSubtypeScopes(prev => {
          const updated = { ...prev };
          if (nextScopes !== null) {
            updated[templateId] = nextScopes;
          }
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==================== FETCH FUNCTIONS ====================
  const fetchKits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await solarKitApi.getKits(moduleUniqueId);
      if (res.status === "success") setKits(res.data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [moduleUniqueId]);

  const fetchHierarchyOptions = async (levelId, parentId = null) => {
    let url = "";
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=view`;
    if (levelId === "industryType") url = `${API_URL}/industry-types/list${baseQuery}&active_only=true`;
    else if (levelId === "category") url = `${API_URL}/project-types/get-categories${baseQuery}${parentId ? `&industry_type_id=${parentId}` : ''}`;
    else if (levelId === "subcategory") url = `${API_URL}/project-types/get-subcategories${baseQuery}&category_id=${parentId}`;
    else if (levelId === "type") url = `${API_URL}/project-types/get-subcategory-types${baseQuery}&subcategory_id=${parentId}`;

    if (!url || (levelId !== "industryType" && levelId !== "category" && !parentId)) return [];

    try {
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        const mapped = res.data.data.map(item => ({
          value: item.subcategory_type_id || item.id,
          text: item.name
        }));
        setOptions(prev => ({ ...prev, [levelId]: mapped }));
        return mapped;
      }
    } catch (e) { console.error(e); }
    return [];
  };

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await templateApi.getTemplates(moduleUniqueId);
      if (res.status === "success") {
        setAllTemplates(res.data.map(t => ({ value: t.id, text: t.name })));
      }
    } catch (e) { console.error(e); }
  }, [moduleUniqueId]);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await templateApi.getAllBrands(moduleUniqueId);
      if (res.status === "success") {
        setBrands(res.data || []);
      }
    } catch (e) { console.error(e); }
  }, [moduleUniqueId]);

  useEffect(() => {
    fetchKits();
    fetchTemplates();
    fetchBrands();
    fetchHierarchyOptions("industryType");
    fetchHierarchyOptions("category");
  }, [fetchKits, fetchTemplates, fetchBrands, moduleUniqueId]);

  // ==================== HANDLERS ====================
  const handleFilterChange = (level, val) => {
    const next = { ...filters, [level]: val };
    if (level === "industryType") {
      next.category = "";
      next.subcategory = "";
      next.type = "";
      fetchHierarchyOptions("category", val);
    }
    if (level === "category") {
      next.subcategory = "";
      next.type = "";
      fetchHierarchyOptions("subcategory", val);
    }
    if (level === "subcategory") {
      next.type = "";
      fetchHierarchyOptions("type", val);
    }
    setFilters(next);
  };

  const handleFormChange = (field, val) => {
    const next = { ...formData, [field]: val };
    if (field === "industry_type_id") {
      next.category_id = "";
      next.subcategory_id = "";
      next.type_id = "";
      setScopedTemplateIds(null);
      fetchHierarchyOptions("category", val);
    }
    if (field === "category_id") {
      next.subcategory_id = "";
      next.type_id = "";
      setScopedTemplateIds(null);
      fetchHierarchyOptions("subcategory", val);
    }
    if (field === "subcategory_id") {
      next.type_id = "";
      setScopedTemplateIds(null);
      fetchHierarchyOptions("type", val);
    }
    if (field === "type_id" && val) {
      // Fetch templates scoped to this system type
      (async () => {
        try {
          const res = await getTemplatesByScope(val, moduleUniqueId);
          if (res.status === "success") {
            setScopedTemplateIds(new Set((res.data || []).map(t => String(t.id))));
          } else {
            setScopedTemplateIds(null);
          }
        } catch (e) {
          console.error(e);
          setScopedTemplateIds(null);
        }
      })();
    }
    if (field === "type_id" && !val) {
      setScopedTemplateIds(null);
    }
    if (field === "base_template_ids") {
      next.base_components = (next.base_components || []).filter(bc =>
        val.includes(String(bc.template_id))
      );
      // Ensure there's an entry for each selected template
      val.forEach(tId => {
        const exists = next.base_components.some(bc => String(bc.template_id) === String(tId));
        if (!exists) {
          next.base_components.push({ template_id: tId, subtype_id: "" });
        }
        fetchSubtypesForTemplate(tId);
      });
    }
    setFormData(next);
  };

  const isBaseOnlyTemplateName = (name) => {
    if (!name) return false;
    const norm = name.trim().toLowerCase();
    return norm === "battery" || norm === "inverter" || norm === "solar panel";
  };

  const saveKit = async () => {
    if (!formData.name || !formData.category_id || !formData.subcategory_id || !formData.type_id) {
      dispatch(setAlert({ type: "error", message: "Please fill all required fields." }));
      return;
    }

    // Compute flat list of bos_template_ids from configured bos_kits
    const allBosKitTemplates = [];
    (formData.bos_kits || []).forEach(kit => {
      (kit.items || []).forEach(item => {
        if (item.template_id && !allBosKitTemplates.includes(item.template_id)) {
          allBosKitTemplates.push(item.template_id);
        }
      });
    });

    // 1. Check overlap
    const hasOverlap = formData.base_template_ids.some(id => allBosKitTemplates.includes(id));
    if (hasOverlap) {
      dispatch(setAlert({ type: "error", message: "The same template cannot be assigned as both Base and BOS Components." }));
      return;
    }

    // 2. Check system/base-only templates in BOS
    const hasSystemInBos = allBosKitTemplates.some(id => {
      const template = allTemplates.find(t => t.value === id);
      return template && isBaseOnlyTemplateName(template.text);
    });
    if (hasSystemInBos) {
      dispatch(setAlert({ type: "error", message: "System templates (Battery, Inverter, Solar Panel) cannot be assigned as BOS Kit Templates." }));
      return;
    }

    // 3. Check duplicate templates across different bos_kits
    if (formData.bos_kits && formData.bos_kits.length > 0) {
      const seenTemplates = new Set();
      for (const kit of formData.bos_kits) {
        for (const item of (kit.items || [])) {
          if (!item.template_id) continue;
          if (seenTemplates.has(item.template_id)) {
            dispatch(setAlert({ type: "error", message: "The same product template cannot be selected in multiple BOS kits." }));
            return;
          }
          seenTemplates.add(item.template_id);
        }
      }
    }

    // Validate that each base component has a subtype
    const missingBaseSubtype = (formData.base_components || []).some(bc => !bc.subtype_id);
    if (missingBaseSubtype) {
      dispatch(setAlert({ type: "error", message: "Please select a subtype for all base components." }));
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("description", formData.description || "");
      fd.append("category_id", formData.category_id);
      fd.append("subcategory_id", formData.subcategory_id);
      fd.append("type_id", formData.type_id);
      fd.append("base_components", JSON.stringify(formData.base_components || []));
      fd.append("base_template_ids", JSON.stringify(formData.base_template_ids || []));
      fd.append("bos_template_ids", JSON.stringify(allBosKitTemplates));

      if (editingKit) {
        fd.append("id", editingKit._id);
      }

      // Solar Kit image file (not used)
      fd.append("image", "");

      // Process nested bos_kits
      const cleanedBosKits = (formData.bos_kits || []).map((kit) => {
        return {
          name: kit.name,
          brand_id: kit.brand_id || null,
          items: kit.items.map(item => ({
            template_id: item.template_id,
            subtype_ids: item.subtype_ids
          })),
          image: kit.image || ""
        };
      });

      fd.append("bos_kits", JSON.stringify(cleanedBosKits));

      const res = editingKit
        ? await solarKitApi.updateKit(fd, moduleUniqueId)
        : await solarKitApi.createKit(fd, moduleUniqueId);

      if (res.status === "success") {
        dispatch(setAlert({ type: "success", message: `Solar Kit ${editingKit ? 'updated' : 'defined'} successfully` }));
        fetchKits();
        setShowDrawer(false);
      } else {
        dispatch(setAlert({ type: "error", message: res.message }));
      }
    } catch (e) {
      console.error(e);
      const errMsg = e.response?.data?.message || e.message || "Failed to save Solar Kit";
      dispatch(setAlert({ type: "error", message: errMsg }));
    }
    finally { setLoading(false); }
  };

  const openAddKit = () => {
    setEditingKit(null);
    setScopedTemplateIds(null);
    setFormData({
      name: "", description: "",
      industry_type_id: "", category_id: "", subcategory_id: "", type_id: "",
      base_template_ids: [], base_components: [], bos_template_ids: [],
      bos_kits: [],
      image: ""
    });
    setIsDataReady(true);
    setShowDrawer(true);
  };

  const openEditKit = async (kit) => {
    setEditingKit(kit);

    const baseComponents = kit.base_components && kit.base_components.length > 0
      ? kit.base_components.map(bc => {
        const tId = bc.template_id?._id || bc.template_id;
        fetchSubtypesForTemplate(tId);
        return {
          template_id: tId,
          subtype_id: bc.subtype_id?._id || bc.subtype_id || ""
        };
      })
      : (kit.base_template_ids || []).map(t => {
        const tId = t._id || t;
        fetchSubtypesForTemplate(tId);
        return {
          template_id: tId,
          subtype_id: ""
        };
      });

    const bosKits = kit.bos_kits?.map(bk => {
      if (bk.items && bk.items.length > 0) {
        return {
          name: bk.name,
          image: bk.image || "",
          brand_id: bk.brand_id?._id || bk.brand_id || "",
          items: bk.items.map(item => {
            const tId = item.template_id?._id || item.template_id;
            fetchSubtypesForTemplate(tId);
            return {
              template_id: tId,
              subtype_ids: item.subtype_ids?.map(st => st._id || st) || []
            };
          })
        };
      } else {
        return {
          name: bk.name,
          image: bk.image || "",
          brand_id: bk.brand_id?._id || bk.brand_id || "",
          items: (bk.template_ids || []).map(t => {
            const tId = t._id || t;
            fetchSubtypesForTemplate(tId);
            return {
              template_id: tId,
              subtype_ids: []
            };
          })
        };
      }
    }) || [];

    const indTypeId = kit.category_id?.industry_type_id?._id || kit.category_id?.industry_type_id || "";

    setFormData({
      name: kit.name,
      description: kit.description,
      industry_type_id: indTypeId,
      category_id: kit.category_id?._id,
      subcategory_id: kit.subcategory_id?._id,
      type_id: kit.type_id?._id,
      base_template_ids: kit.base_template_ids?.map(t => t._id || t) || [],
      base_components: baseComponents,
      bos_template_ids: kit.bos_template_ids?.map(t => t._id || t) || [],
      bos_kits: bosKits,
      image: kit.image
    });
    setIsDataReady(false);
    setShowDrawer(true);

    try {
      await Promise.all([
        indTypeId ? fetchHierarchyOptions("category", indTypeId) : Promise.resolve(),
        fetchHierarchyOptions("subcategory", kit.category_id?._id),
        fetchHierarchyOptions("type", kit.subcategory_id?._id)
      ]);

      // Restore scoped template filter for the saved type
      const savedTypeId = kit.type_id?._id;
      if (savedTypeId) {
        const res = await getTemplatesByScope(savedTypeId, moduleUniqueId);
        if (res.status === "success") {
          setScopedTemplateIds(new Set((res.data || []).map(t => String(t.id))));
        } else {
          setScopedTemplateIds(null);
        }
      } else {
        setScopedTemplateIds(null);
      }
    } catch (e) {
      console.error(e);
      setScopedTemplateIds(null);
    } finally {
      setIsDataReady(true);
    }
  };

  const openAddBosKitModal = () => {
    setEditingBosKitIndex(null);
    setBosKitForm({
      name: "",
      image: "",
      brand_id: "",
      items: [{ template_id: "", subtype_ids: [] }]
    });
    setShowBosKitModal(true);
  };

  const openEditBosKitModal = (index) => {
    const kit = formData.bos_kits[index];
    setEditingBosKitIndex(index);
    const items = (kit.items || []).map(it => {
      const tId = it.template_id?._id || it.template_id;
      fetchSubtypesForTemplate(tId);
      return {
        template_id: tId,
        subtype_ids: it.subtype_ids?.map(st => st._id || st) || []
      };
    });
    setBosKitForm({
      name: kit.name,
      image: kit.image || "",
      brand_id: kit.brand_id?._id || kit.brand_id || "",
      items: items.length > 0 ? items : [{ template_id: "", subtype_ids: [] }]
    });
    setShowBosKitModal(true);
  };

  const removeBosKit = (index) => {
    const updated = (formData.bos_kits || []).filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, bos_kits: updated }));
  };

  const updateBosItemTemplate = async (index, templateId) => {
    setBosKitForm(prev => {
      const items = [...(prev.items || [])];
      items[index] = { template_id: templateId, subtype_ids: [] };
      return { ...prev, items };
    });

    if (templateId) {
      await fetchSubtypesForTemplate(templateId);
    }
  };

  const updateBosItemSubtypes = (index, subtypeIds) => {
    setBosKitForm(prev => {
      const items = [...(prev.items || [])];
      items[index] = { ...(items[index] || {}), subtype_ids: subtypeIds };
      return { ...prev, items };
    });
  };

  const addBosItem = () => {
    setBosKitForm(prev => ({
      ...prev,
      items: [...(prev.items || []), { template_id: "", subtype_ids: [] }]
    }));
  };

  const removeBosItem = (index) => {
    setBosKitForm(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, idx) => idx !== index)
    }));
  };

  const saveBosKit = () => {
    if (!bosKitForm.name) {
      dispatch(setAlert({ type: "error", message: "BOS Kit Name is required." }));
      return;
    }
    if (!bosKitForm.items || bosKitForm.items.length === 0) {
      dispatch(setAlert({ type: "error", message: "Select at least one product item." }));
      return;
    }
    const hasInvalidItem = bosKitForm.items.some(it => !it.template_id || !it.subtype_ids || it.subtype_ids.length === 0);
    if (hasInvalidItem) {
      dispatch(setAlert({ type: "error", message: "Please select template and at least one subtype for all items." }));
      return;
    }

    const updatedKits = [...(formData.bos_kits || [])];
    const newKit = {
      name: bosKitForm.name,
      image: bosKitForm.image,
      brand_id: bosKitForm.brand_id || null,
      items: bosKitForm.items
    };

    if (editingBosKitIndex !== null) {
      updatedKits[editingBosKitIndex] = newKit;
    } else {
      updatedKits.push(newKit);
    }

    setFormData(prev => ({ ...prev, bos_kits: updatedKits }));
    setShowBosKitModal(false);
  };

  const openViewDetail = async (kit) => {
    setViewingKit(kit);
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const fetchTemplateDetails = async (templatesList) => {
        const details = [];
        for (const t of (templatesList || [])) {
          const tId = t._id || t;
          const res = await axios.get(`${API_URL}/product-templates/get-subtypes?unique_id=ADM_PROD_TMPL&req_for=view&template_id=${tId}`, { headers: authHeaderObj() });
          const subtypes = res.data?.data || [];
          const subtypeDetails = subtypes.map(st => ({
            id: st.id,
            name: st.name
          }));
          details.push({
            id: tId,
            name: t.name || t.text || "",
            subtypes: subtypeDetails
          });
        }
        return details;
      };

      const [baseDetails, bosDetails] = await Promise.all([
        fetchTemplateDetails(kit.base_template_ids),
        fetchTemplateDetails(kit.bos_template_ids)
      ]);

      setKitDetails({ base: baseDetails, bos: bosDetails });
    } catch (e) {
      console.error("Error loading kit template details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const res = await solarKitApi.deleteKit({ id: deleteConfirm._id }, moduleUniqueId);
      if (res.status === "success") {
        dispatch(setAlert({ type: "success", message: "Solar Kit deleted successfully" }));
        fetchKits();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setDeleteConfirm(null); }
  };

  // ==================== RENDER HELPERS ====================
  const baseTemplateOptions = useMemo(() => {
    const allBosKitTemplates = [];
    (formData.bos_kits || []).forEach(kit => {
      (kit.items || []).forEach(item => {
        if (item.template_id && !allBosKitTemplates.includes(String(item.template_id))) {
          allBosKitTemplates.push(String(item.template_id));
        }
      });
    });
    return allTemplates.filter(t =>
      !allBosKitTemplates.includes(String(t.value)) &&
      isBaseOnlyTemplateName(t.text) &&
      (scopedTemplateIds !== null && scopedTemplateIds.has(String(t.value)))
    );
  }, [allTemplates, formData.bos_kits, scopedTemplateIds]);

  const bosTemplateOptions = useMemo(() => {
    return allTemplates.filter(t =>
      !formData.base_template_ids.includes(t.value) &&
      !isBaseOnlyTemplateName(t.text) &&
      (scopedTemplateIds !== null && scopedTemplateIds.has(String(t.value)))
    );
  }, [allTemplates, formData.base_template_ids, scopedTemplateIds]);

  const getEligibleBosTemplatesForKit = (currentKitIndex, currentItems = [], currentItemIndex = null) => {
    const eligiblePool = bosTemplateOptions;
    const selectedInOtherKits = [];

    (formData.bos_kits || []).forEach((kit, idx) => {
      if (idx !== currentKitIndex) {
        (kit.items || []).forEach(item => {
          if (item.template_id) selectedInOtherKits.push(String(item.template_id));
        });
      }
    });

    (currentItems || []).forEach((item, idx) => {
      if (idx !== currentItemIndex && item.template_id) {
        selectedInOtherKits.push(String(item.template_id));
      }
    });

    return eligiblePool.filter(t => !selectedInOtherKits.includes(String(t.value)));
  };

  const filteredKits = useMemo(() => {
    return kits.filter(k => {
      const matchSearch = k.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchInd = !filters.industryType || (k.category_id?.industry_type_id?._id || k.category_id?.industry_type_id) === filters.industryType;
      const matchCat = !filters.category || k.category_id?._id === filters.category;
      const matchSub = !filters.subcategory || k.subcategory_id?._id === filters.subcategory;
      const matchType = !filters.type || k.type_id?._id === filters.type;
      return matchSearch && matchInd && matchCat && matchSub && matchType;
    });
  }, [kits, searchTerm, filters]);

  const columns = [
    {
      header: "Solar kit Details", key: "name", render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
            <FaSolarPanel size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-text-primary">{val}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">
              Solar kit Blueprint • {row.type_id?.name}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Hierarchy", key: "hierarchy", render: (_, row) => {
        const typeName = row.type_id?.type?.name || row.type_id?.name || '—';
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-text-secondary">{row.category_id?.name}</span>
            <span className="text-[10px] text-text-muted italic">{row.subcategory_id?.name} · {typeName}</span>
          </div>
        );
      }
    },
    {
      header: "Architectural Blueprint", key: "templates", render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-text-muted uppercase w-12">Base:</span>
            <span className="text-[10px] font-bold text-primary">{row.base_template_ids?.length || 0} Templates</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[9px] font-black text-text-muted uppercase w-12 mt-0.5">BOS:</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-600">{row.bos_kits?.length || 0} Kits</span>
              {row.bos_kits?.length > 0 && (
                <span className="text-[9px] text-text-muted font-medium max-w-45 truncate block mt-0.5" title={row.bos_kits.map(k => k.name).join(", ")}>
                  ({row.bos_kits.map(k => k.name).join(", ")})
                </span>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      header: "Actions", key: "actions", render: (_, row) => (
        <div className="flex items-center gap-2">
          <IconButton variant="primary" size="sm" onClick={() => openViewDetail(row)}><FaEye size={12} /></IconButton>
          <IconButton variant="warning" size="sm" onClick={() => openEditKit(row)}><FaEdit size={12} /></IconButton>
          <IconButton variant="danger" size="sm" onClick={() => setDeleteConfirm(row)}><FaTrash size={12} /></IconButton>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen space-y-6 pb-24 animate-in fade-in duration-500">
      <PageHeader
        title="Solar Kit Master Definition"
        subtitle="Define centralized architectural blueprints for project kits. These definitions authorize specific product templates for base components and BOS."
        icon={FaShoppingBag}
        stats={[
          { label: "Defined Bundles", value: kits.length, description: "Master templates" },
          { label: "Engineering Scopes", value: kits.length, description: "Active blueprints" }
        ]}
        actions={
          <Button variant="primary" size="md" onClick={openAddKit} leftIcon={<FaPlus />}>
            New Solar Definition
          </Button>
        }
      />

      {/* FILTERS */}
      <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Industry Type</label>
            <DropdownWithSearchInput options={options.industryType} value={filters.industryType} onChange={(val) => handleFilterChange("industryType", val)} placeholder="All Industry Types" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
            <DropdownWithSearchInput options={options.category} value={filters.category} onChange={(val) => handleFilterChange("category", val)} placeholder="All Categories" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Sub-Category</label>
            <DropdownWithSearchInput options={options.subcategory} value={filters.subcategory} onChange={(val) => handleFilterChange("subcategory", val)} placeholder="All Sub-Categories" disabled={!filters.category} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">System Type</label>
            <DropdownWithSearchInput options={options.type} value={filters.type} onChange={(val) => handleFilterChange("type", val)} placeholder="All Types" disabled={!filters.subcategory} />
          </div>
          <div className="relative group">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2 block">Search Definitions</label>
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search definition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-surface border-2 border-border rounded-xl text-sm font-bold text-text-primary focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all placeholder:text-text-muted/40 placeholder:font-medium shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-surface rounded-3xl border-2 border-border overflow-hidden shadow-md">
        <CustomTable
          headers={columns}
          data={filteredKits}
          loading={loading}
          emptyMessage="No Solar kit Definitions Found. Start by defining a new architectural master."
        />
      </div>

      {/* CONFIGURATION DIALOG */}
      <Dialog
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingKit ? "Edit Definition" : "Define Architectural Blueprint"}
        size="xl"
      >
        {!isDataReady ? (
          <PopupDataLoader text="Loading Solar Kit Details..." />
        ) : (
          <div className="space-y-8 p-1">
            {/* Basic Info */}
            <div className="w-full">
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="p-1.5 bg-primary/10 rounded-lg text-primary"><FaFileAlt size={14} /></div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Master Identity</h3>
                </div>
                <CustomInput label="Solar Kit Name" placeholder="e.g. 5kW Residential On-Grid Elite" value={formData.name} onChange={(e) => handleFormChange("name", e.target.value)} required />
                <CustomInput label="Technical Notes" placeholder="Provide technical overview..." value={formData.description} onChange={(e) => handleFormChange("description", e.target.value)} multiline rows={3} />
              </section>
            </div>

            {/* Hierarchy */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Industry Type</label>
                <DropdownWithSearchInput options={options.industryType} value={formData.industry_type_id} onChange={(val) => handleFormChange("industry_type_id", val)} placeholder="Select" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Category</label>
                <DropdownWithSearchInput options={options.category} value={formData.category_id} onChange={(val) => handleFormChange("category_id", val)} placeholder="Select" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Sub-Category</label>
                <DropdownWithSearchInput options={options.subcategory} value={formData.subcategory_id} onChange={(val) => handleFormChange("subcategory_id", val)} placeholder="Select" disabled={!formData.category_id} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">System Type</label>
                <DropdownWithSearchInput options={options.type} value={formData.type_id} onChange={(val) => handleFormChange("type_id", val)} placeholder="Select" disabled={!formData.subcategory_id} />
              </div>
            </section>

            {/* Blueprint Templates */}
            <section className="bg-surface-hover/20 p-6 rounded-3xl border border-border space-y-6">
              <div className="flex items-center gap-2 px-1">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600"><FaLayerGroup size={14} /></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Engineering Template Mapping</h3>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <MultiSelectDropdownWithSearchInput
                    label="Base Component Templates"
                    placeholder="e.g. PV Panels, Inverters"
                    options={baseTemplateOptions}
                    values={formData.base_template_ids}
                    onChange={(vals) => handleFormChange("base_template_ids", vals)}
                  />
                  <p className="text-[10px] text-text-muted italic ml-1">Authorize templates for primary solar components.</p>
                </div>

                {formData.base_template_ids.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-surface rounded-2xl border border-border">
                    {formData.base_template_ids.map(tId => {
                      const templateText = allTemplates.find(t => String(t.value) === String(tId))?.text || "Template";
                      const rawSubtypeOpts = templateSubtypes[tId] || [];
                      const subtypeOpts = rawSubtypeOpts.filter(st => {
                        const scopes = subtypeScopes[tId]?.[st.value] || [];
                        return scopes.includes(String(formData.type_id));
                      });
                      const currentBc = formData.base_components?.find(bc => String(bc.template_id) === String(tId));
                      const selectedSubtypeId = currentBc?.subtype_id || "";
                      return (
                        <div key={tId} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                            {templateText} Subtype <span className="text-red-500">*</span>
                          </label>
                          <DropdownWithSearchInput
                            options={subtypeOpts}
                            value={selectedSubtypeId}
                            onChange={(subVal) => {
                              setFormData(prev => {
                                const bcs = [...(prev.base_components || [])];
                                const idx = bcs.findIndex(bc => String(bc.template_id) === String(tId));
                                if (idx > -1) {
                                  bcs[idx] = { template_id: tId, subtype_id: subVal };
                                } else {
                                  bcs.push({ template_id: tId, subtype_id: subVal });
                                }
                                return { ...prev, base_components: bcs };
                              });
                            }}
                            placeholder="Select subtype"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">BOS Kit Bundles</label>
                      <p className="text-[10px] text-text-muted italic ml-1">Configure distinct Balance of System accessory kits.</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={openAddBosKitModal}
                      leftIcon={<FaPlus />}
                      className="rounded-xl border-dashed h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      Add BOS Kit
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(formData.bos_kits || []).map((kit, index) => {
                      return (
                        <div key={index} className="bg-surface p-4 rounded-2xl border border-border shadow-xs hover:border-primary/40 transition-all flex items-center justify-between group">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">BOS</div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-text-primary uppercase truncate">{kit.name}</p>
                              <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold mt-0.5">
                                {kit.items?.length || 0} Components
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <IconButton variant="primary" size="sm" onClick={() => openEditBosKitModal(index)} className="h-8 w-8 rounded-xl"><FaEdit size={10} /></IconButton>
                            <IconButton variant="danger" size="sm" onClick={() => setDeleteBosKitConfirm(index)} className="h-8 w-8 rounded-xl"><FaTrash size={10} /></IconButton>
                          </div>
                        </div>
                      );
                    })}
                    {(formData.bos_kits || []).length === 0 && (
                      <div className="col-span-full py-8 text-center bg-surface border-2 border-dashed border-border rounded-2xl">
                        <p className="text-[10px] text-text-disabled font-black uppercase tracking-widest">No BOS Kit Bundles defined yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-border mt-8">
              <Button variant="secondary" size="md" onClick={() => setShowDrawer(false)} disabled={loading} className="rounded-2xl px-8">Discard</Button>
              <Button variant="primary" size="md" onClick={saveKit} loading={loading} className="rounded-2xl px-12 shadow-xl shadow-primary/20">
                {editingKit ? "Update Blueprint" : "Finalize Blueprint"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* DETAIL VIEW DIALOG */}
      <Dialog
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Solar kit Blueprint Details"
        size="lg"
      >
        {viewingKit && (
          <div className="space-y-8 p-1">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-inner">
                <FaSolarPanel size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-text-primary uppercase tracking-tight">{viewingKit.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-surface-hover border border-border rounded-lg text-[10px] font-black text-text-secondary uppercase tracking-wider">
                    {viewingKit.category_id?.name}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  <span className="text-xs font-bold text-text-muted">{viewingKit.subcategory_id?.name}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-hover/30 p-5 rounded-3xl border border-border space-y-4">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Technical Overview</p>
                <p className="text-sm text-text-secondary leading-relaxed italic">
                  {viewingKit.description || "No technical description provided for this architectural blueprint."}
                </p>
              </div>
              <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex flex-col justify-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Project Hierarchy Mapping</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">Project Category</span>
                    <span className="text-xs font-black text-text-primary uppercase tracking-tighter">
                      {viewingKit.category_id?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">Sub Category</span>
                    <span className="text-xs font-black text-text-primary uppercase tracking-tighter">
                      {viewingKit.subcategory_id?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">System Type</span>
                    <span className="text-xs font-black text-primary uppercase">
                      {viewingKit.type_id?.type?.name || viewingKit.type_id?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">Configuration Mode</span>
                    <span className="text-xs font-black text-text-primary uppercase tracking-tighter">Blueprint Only</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600"><FaLayerGroup size={14} /></div>
                <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">Engineering Template Authorization</h3>
              </div>

              {loadingDetails ? (
                <PopupDataLoader text="Loading Technical Specs..." size="sm" className="min-h-40 py-6 border-2 border-dashed border-border rounded-2xl bg-surface-hover/20" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">Base Component Templates</label>
                    <div className="space-y-3">
                      {kitDetails.base.map(t => (
                        <div key={t.id} className="bg-surface border-2 border-border p-4 rounded-2xl space-y-3 shadow-xs animate-in fade-in duration-300">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <span className="text-xs font-black text-text-primary uppercase">{t.name}</span>
                          </div>
                          <div className="pl-4 border-l border-border/80 flex flex-wrap gap-2">
                            {t.subtypes.map(st => (
                              <span key={st.id} className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-md border border-primary/10 uppercase">
                                {st.name}
                              </span>
                            ))}
                            {t.subtypes.length === 0 && (
                              <span className="text-[9px] text-text-disabled italic">No technical subtypes defined</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {kitDetails.base.length === 0 && (
                        <span className="text-[10px] text-text-disabled italic pl-1 block">No base templates authorized</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-wider ml-1">BOS Kit Bundles</label>
                    <div className="space-y-4">
                      {(viewingKit.bos_kits || []).map((bk, bki) => {
                        return (
                          <div key={bki} className="bg-surface border-2 border-border p-4 rounded-2xl space-y-4 shadow-xs animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-xl flex items-center justify-center font-black text-xs shrink-0">BOS</div>
                              <div className="truncate">
                                <h4 className="text-xs font-black text-text-primary uppercase truncate">{bk.name}</h4>
                              </div>
                            </div>

                            <div className="pl-4 border-l border-border/80 space-y-3">
                              {bk.template_ids?.map(t => {
                                const tDetail = kitDetails.bos.find(td => String(td.id) === String(t._id || t));
                                return (
                                  <div key={t._id || t} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      <span className="text-[11px] font-black text-text-secondary uppercase">{t.name || tDetail?.name}</span>
                                    </div>
                                    {tDetail && tDetail.subtypes.map(st => (
                                      <div key={st.id} className="pl-3 space-y-1.5">
                                        <p className="text-[9px] font-black text-text-muted uppercase tracking-wide bg-surface-hover/30 px-2 py-0.5 rounded w-max border border-border/30">{st.name}</p>
                                        <div className="space-y-1.5 pl-2">
                                          {st.groups?.map((g, gi) => (
                                            <div key={gi} className="space-y-0.5">
                                              <span className="text-[8px] font-bold text-text-disabled uppercase tracking-wider block opacity-75">{g.name}</span>
                                              <div className="flex flex-wrap gap-1">
                                                {g.attributes?.map(a => (
                                                  <span key={a.id} className="px-1.5 py-0.5 bg-amber-500/5 text-amber-700 text-[8px] font-bold rounded border border-amber-500/10">
                                                    {a.name}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                              {bk.template_ids?.length === 0 && (
                                <span className="text-[9px] text-text-disabled italic">No technical templates defined</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(viewingKit.bos_kits || []).length === 0 && (
                        <span className="text-[10px] text-text-disabled italic pl-1 block">No BOS kits authorized</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-8">
              <Button variant="secondary" size="md" onClick={() => setShowDetailModal(false)} className="rounded-2xl px-12">Close Overview</Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmationPopup
        isOpen={!!deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Purge Master Definition?"
        message={`Are you sure you want to permanently delete "${deleteConfirm?.name}"? This action cannot be reversed.`}
        isLoading={loading}
        variant="danger"
      />

      <ConfirmationPopup
        isOpen={deleteBosKitConfirm !== null}
        onCancel={() => setDeleteBosKitConfirm(null)}
        onConfirm={() => {
          removeBosKit(deleteBosKitConfirm);
          setDeleteBosKitConfirm(null);
        }}
        title="Remove BOS Kit?"
        message={`Are you sure you want to remove the BOS kit "${formData.bos_kits[deleteBosKitConfirm]?.name}" from this solar kit?`}
        variant="danger"
      />

      {/* BOS Kit popup dialog */}
      <Dialog
        isOpen={showBosKitModal}
        onClose={() => setShowBosKitModal(false)}
        title={editingBosKitIndex !== null ? "Edit BOS Kit Configuration" : "Add BOS Kit Configuration"}
        size="lg"
      >
        <div className="space-y-6 p-1">
          <div className="space-y-4">
            <CustomInput
              label="BOS Kit Name"
              placeholder="e.g. Aluminum Structure Mount Kit"
              value={bosKitForm.name}
              onChange={(e) => setBosKitForm(p => ({ ...p, name: e.target.value }))}
              required
            />

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Brand</label>
              <DropdownWithSearchInput
                options={(brands || []).map(b => ({ value: b.id || b._id, text: b.brand_name || b.name || "Brand" }))}
                value={bosKitForm.brand_id}
                onChange={(val) => setBosKitForm(p => ({ ...p, brand_id: val }))}
                placeholder="Select brand"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">BOS Items</label>
                <Button variant="secondary" size="sm" onClick={addBosItem} className="rounded-xl">Add Item</Button>
              </div>

              {(bosKitForm.items || []).map((item, index) => {
                const availableTemplates = getEligibleBosTemplatesForKit(editingBosKitIndex, bosKitForm.items || [], index);
                const rawSubtypeOptions = templateSubtypes[item.template_id] || [];
                const subtypeOptions = rawSubtypeOptions
                  .filter(st => {
                    const scopes = subtypeScopes[item.template_id]?.[st.value] || [];
                    return scopes.includes(String(formData.type_id));
                  })
                  .map(st => ({ value: st.value, text: st.text }));

                return (
                  <div key={index} className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Item {index + 1}</p>
                      {(bosKitForm.items || []).length > 1 && (
                        <Button variant="danger" size="sm" onClick={() => removeBosItem(index)} className="rounded-xl">Remove</Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">Template</label>
                        <DropdownWithSearchInput
                          options={availableTemplates}
                          value={item.template_id}
                          onChange={(val) => updateBosItemTemplate(index, val)}
                          placeholder="Select template"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <MultiSelectDropdownWithSearchInput
                          label="Subtypes"
                          placeholder="Select subtypes"
                          options={subtypeOptions}
                          values={item.subtype_ids || []}
                          onChange={(vals) => updateBosItemSubtypes(index, vals)}
                          disabled={!item.template_id}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="secondary" size="md" onClick={() => setShowBosKitModal(false)}>Cancel</Button>
            <Button variant="primary" size="md" onClick={saveBosKit}>
              {editingBosKitIndex !== null ? "Save Config" : "Add Config"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
