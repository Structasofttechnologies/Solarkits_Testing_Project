import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import ReactCountryFlag from "react-country-flag";
import {
  FaArrowLeft,
  FaWarehouse,
  FaMapMarkerAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaFileInvoiceDollar,
  FaSlidersH,
  FaSearch,
  FaLayerGroup
} from "react-icons/fa";
import { setAlert } from "@/features/alert.slice";
import Button from "@/components/Button";
import Dialog from "@/components/Dialog";
import CustomTable from "@/components/CustomTable";
import IconButton from "@/components/IconButton";
import CustomInput from "@/components/CustomInput";
import Dropdown from "@/components/Dropdown";
import Loader from "@/components/Loader";
import { authHeaderObj } from "@/app/authHeader";

const API_URL = import.meta.env.VITE_API_URL;

export default function WarehousePoConfig({ moduleUniqueId }) {
  const { countryName, warehouseId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  // States
  const [warehouse, setWarehouse] = useState(null);
  const [countryObj, setCountryObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [powerUnits, setPowerUnits] = useState([]);

  // Category, Sub-Category, System Type, and Project Range States (for form)
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [systemTypes, setSystemTypes] = useState([]);
  const [formProjectRanges, setFormProjectRanges] = useState([]);

  // Kits & PO availability states
  const [comboKits, setComboKits] = useState([]);
  const [customizeKits, setCustomizeKits] = useState([]);
  const [kitsSearch, setKitsSearch] = useState("");
  const [kitsTab, setKitsTab] = useState("combokit");
  const [manageKitsDialog, setManageKitsDialog] = useState({
    isOpen: false,
    plan: null,
    disabledKits: []
  });

  // Top Bar Filter States
  const [filterIndustryType, setFilterIndustryType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterSystemType, setFilterSystemType] = useState("");
  const [filterProjectRange, setFilterProjectRange] = useState("");
  const [filterIndustryTypes, setFilterIndustryTypes] = useState([]);
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [filterSystemTypes, setFilterSystemTypes] = useState([]);
  const [filterProjectRanges, setFilterProjectRanges] = useState([]);

  // Dialog State
  const [formDialog, setFormDialog] = useState({
    isOpen: false,
    mode: "create", // "create" or "edit"
    data: {
      id: null,
      name: "",
      subscription_rate: "",
      order_size: "",
      order_size_unit_id: "",
      po_validity_type: "days", // "days" or "monthly_date"
      po_validity_days: "",
      po_validity_date: "",
      category_id: "",
      subcategory_id: "",
      type_id: "",
      project_range_id: "",
      token_settlement_rule: "PRO_RATA",
      default_penalty_type: "PERCENTAGE",
      default_penalty_rate: 10,
      is_active: true
    }
  });

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    plan_name: ""
  });

  const getPlanIdStr = (fieldVal) => {
    if (!fieldVal) return "";
    if (typeof fieldVal === "object") {
      return fieldVal._id || fieldVal.id || "";
    }
    return String(fieldVal);
  };

  const fetchHierarchyOptions = async (levelId, parentId = null) => {
    let url = "";
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=view`;
    if (levelId === "category") url = `${API_URL}/project-types/get-categories${baseQuery}`;
    else if (levelId === "subcategory") url = `${API_URL}/project-types/get-subcategories${baseQuery}&category_id=${parentId}`;
    else if (levelId === "type") url = `${API_URL}/project-types/get-subcategory-types${baseQuery}&subcategory_id=${parentId}`;
    else if (levelId === "range") url = `${API_URL}/project-types/get-ranges${baseQuery}&subcategory_type_id=${parentId}`;

    if (!url || (levelId !== "category" && !parentId)) return [];

    try {
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        const mapped = res.data.data.map(item => ({
          // For ranges: use item.id (the range's own _id), not subcategory_type_id
          value: levelId === "range" ? String(item.id) : (item.subcategory_type_id || item.id),
          text: levelId === "range"
            ? `${item.min_value} - ${item.max_value} ${item.unit_symbol || "kW"}`
            : item.name
        }));
        if (levelId === "category") setCategories(mapped);
        else if (levelId === "subcategory") setSubcategories(mapped);
        else if (levelId === "type") setSystemTypes(mapped);
        else if (levelId === "range") setFormProjectRanges(mapped);
        return mapped;
      }
    } catch (e) {
      console.error(`Error fetching hierarchy ${levelId}:`, e);
    }
    return [];
  };

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

  const fetchFilterHierarchyOptions = async (levelId, parentId = null) => {
    let url = "";
    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=view`;
    if (levelId === "subcategory") url = `${API_URL}/project-types/get-subcategories${baseQuery}&category_id=${parentId}`;
    else if (levelId === "type") url = `${API_URL}/project-types/get-subcategory-types${baseQuery}&subcategory_id=${parentId}`;
    else if (levelId === "range") url = `${API_URL}/project-types/get-ranges${baseQuery}&subcategory_type_id=${parentId}`;

    if (!url || !parentId) return [];

    try {
      const res = await axios.get(url, { headers: authHeaderObj() });
      if (res.data?.status === "success") {
        const mapped = res.data.data.map(item => ({
          // For ranges: use item.id (the range's own _id), not subcategory_type_id
          value: levelId === "range" ? String(item.id) : (item.subcategory_type_id || item.id),
          text: levelId === "range"
            ? `${item.min_value} - ${item.max_value} ${item.unit_symbol || "kW"}`
            : item.name
        }));
        if (levelId === "subcategory") setFilterSubcategories(mapped);
        else if (levelId === "type") setFilterSystemTypes(mapped);
        else if (levelId === "range") setFilterProjectRanges(mapped);
        return mapped;
      }
    } catch (e) {
      console.error(`Error fetching filter hierarchy ${levelId}:`, e);
    }
    return [];
  };

  const handleFilterIndustryTypeChange = (val) => {
    setFilterIndustryType(val);
    setFilterCategory("");
    setFilterSubcategory("");
    setFilterSystemType("");
    setFilterProjectRange("");
    setFilterSubcategories([]);
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    fetchFilterCategories(val);
  };

  const handleFilterCategoryChange = (val) => {
    setFilterCategory(val);
    setFilterSubcategory("");
    setFilterSystemType("");
    setFilterProjectRange("");
    setFilterSubcategories([]);
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    if (val) fetchFilterHierarchyOptions("subcategory", val);
  };

  const handleFilterSubcategoryChange = (val) => {
    setFilterSubcategory(val);
    setFilterSystemType("");
    setFilterProjectRange("");
    setFilterSystemTypes([]);
    setFilterProjectRanges([]);
    if (val) fetchFilterHierarchyOptions("type", val);
  };

  const handleFilterSystemTypeChange = (val) => {
    setFilterSystemType(val);
    setFilterProjectRange("");
    setFilterProjectRanges([]);
    if (val) fetchFilterHierarchyOptions("range", val);
  };

  const handleFilterProjectRangeChange = (val) => {
    setFilterProjectRange(val);
  };

  // Fetch details
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active countries
      const countriesRes = await axios.get(
        `${API_URL}/geolocation/active-countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const activeCountries = countriesRes.data?.countries || [];
      const foundCountry = activeCountries.find(
        c => c.name.toLowerCase() === countryName?.toLowerCase()
      );
      setCountryObj(foundCountry);

      // 2. Fetch all warehouses to find our warehouse
      const warehousesRes = await axios.get(
        `${API_URL}/warehouses?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      const allWarehouses = warehousesRes.data?.warehouses || [];
      const wh = allWarehouses.find(w => (w.id || w._id)?.toString() === warehouseId?.toString());
      setWarehouse(wh);

      // 3. Fetch power units
      const powerRes = await axios.get(
        `${API_URL}/units/power-units?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      ).catch(err => {
        console.error("Error fetching power units:", err);
        return { data: { data: [] } };
      });
      const powerUnitsList = (powerRes.data?.data || []).map(u => ({
        value: u.id,
        symbol: u.symbol,
        text: `${u.name} (${u.symbol})`,
        disabled: u.symbol === 'W' || u.name.toLowerCase() === 'watt'
      }));
      setPowerUnits(powerUnitsList);

      if (wh && foundCountry) {
        // 4. Fetch specific warehouse plans
        const isIndia = foundCountry.iso2?.toLowerCase() === "in";
        const endpoint = isIndia ? "india/po-settings" : "po-settings";

        const [plansRes, comboRes, customizeRes] = await Promise.all([
          axios.get(
            `${API_URL}/solarshop/${endpoint}?unique_id=${moduleUniqueId}&req_for=view&warehouse_id=${warehouseId}`,
            { headers: authHeaderObj() }
          ),
          axios.get(
            `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false&country_id=${foundCountry.id}`,
            { headers: authHeaderObj() }
          ).catch(err => {
            console.error("Error fetching combo kits:", err);
            return { data: { data: [] } };
          }),
          axios.get(
            `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=true&country_id=${foundCountry.id}`,
            { headers: authHeaderObj() }
          ).catch(err => {
            console.error("Error fetching customize kits:", err);
            return { data: { data: [] } };
          })
        ]);

        setPlans(plansRes.data?.data || []);
        // Deduplicate kits by _id to prevent duplicate key warnings
        const dedup = (arr) => {
          const seen = new Set();
          return (arr || []).filter(k => {
            const id = String(k._id || k.id);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
        };
        setComboKits(dedup(comboRes.data?.data));
        setCustomizeKits(dedup(customizeRes.data?.data));

        // Fetch industry types and categories on load
        fetchFilterIndustryTypes();
        fetchFilterCategories();
      }
    } catch (error) {
      console.error("Error fetching warehouse PO configuration data:", error);
      dispatch(setAlert({ type: "error", message: "Failed to load warehouse configurations" }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (moduleUniqueId && token && warehouseId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleUniqueId, token, warehouseId, countryName]);

  const getCurrencySymbol = () => {
    if (!countryObj) return "USD";
    return countryObj.currency_code || "USD";
  };

  // Dialog management
  const openCreateDialog = () => {
    const kwUnit = powerUnits.find(u => u.symbol === "kW");
    setSubcategories([]);
    setSystemTypes([]);
    setFormProjectRanges([]);
    setFormDialog({
      isOpen: true,
      mode: "create",
      data: {
        id: null,
        name: "",
        subscription_rate: "",
        order_size: "",
        order_size_unit_id: kwUnit ? kwUnit.value : "",
        po_validity_type: "days",
        po_validity_days: "",
        po_validity_date: "",
        category_id: "",
        subcategory_id: "",
        type_id: "",
        project_range_id: "",
        token_settlement_rule: "PRO_RATA",
        default_penalty_type: "PERCENTAGE",
        default_penalty_rate: 10,
        is_active: true
      }
    });
  };

  const openEditDialog = (plan) => {
    const kwUnit = powerUnits.find(u => u.symbol === "kW");
    const unitId = plan.order_size_unit?.id || plan.order_size_unit_id || (kwUnit ? kwUnit.value : "");

    const categoryId = getPlanIdStr(plan.category_id);
    const subcategoryId = getPlanIdStr(plan.subcategory_id);
    const typeId = getPlanIdStr(plan.type_id);
    const rangeId = getPlanIdStr(plan.project_range_id);

    setSubcategories([]);
    setSystemTypes([]);
    setFormProjectRanges([]);

    if (categoryId) fetchHierarchyOptions("subcategory", categoryId);
    if (subcategoryId) fetchHierarchyOptions("type", subcategoryId);
    if (typeId) fetchHierarchyOptions("range", typeId);

    setFormDialog({
      isOpen: true,
      mode: "edit",
      data: {
        id: plan.id || plan._id,
        name: plan.name || "",
        subscription_rate: plan.subscription_rate,
        order_size: plan.order_size,
        order_size_unit_id: unitId,
        po_validity_type: plan.po_validity_type || "days",
        po_validity_days: plan.po_validity_days || "",
        po_validity_date: plan.po_validity_date || "",
        category_id: categoryId,
        subcategory_id: subcategoryId,
        type_id: typeId,
        project_range_id: rangeId,
        token_settlement_rule: plan.token_settlement_rule || "PRO_RATA",
        default_penalty_type: plan.default_penalty_type || "PERCENTAGE",
        default_penalty_rate: plan.default_penalty_rate != null ? plan.default_penalty_rate : 10,
        is_active: plan.is_active
      }
    });
  };

  const openDeleteConfirm = (plan) => {
    setDeleteDialog({
      isOpen: true,
      id: plan.id || plan._id,
      plan_name: plan.name || "Selected Plan"
    });
  };

  // Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const {
      id,
      name,
      subscription_rate,
      order_size,
      order_size_unit_id,
      po_validity_type,
      po_validity_days,
      po_validity_date,
      category_id,
      subcategory_id,
      type_id,
      project_range_id,
      token_settlement_rule,
      default_penalty_type,
      default_penalty_rate,
      is_active
    } = formDialog.data;

    // Client-side validations
    if (!name || !name.trim()) {
      dispatch(setAlert({ type: "warning", message: "Please enter a subscription plan name" }));
      return;
    }
    if (Number(subscription_rate) <= 0 || Number(order_size) <= 0) {
      dispatch(setAlert({ type: "warning", message: "Subscription rate and order size limit must be positive numbers" }));
      return;
    }
    if (!order_size_unit_id) {
      dispatch(setAlert({ type: "warning", message: "Please select an order size unit" }));
      return;
    }
    if (!category_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a Category" }));
      return;
    }
    if (!subcategory_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a Sub-Category" }));
      return;
    }
    if (!type_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a System Type" }));
      return;
    }
    if (!project_range_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a Project Range" }));
      return;
    }

    if (po_validity_type === "days") {
      if (!po_validity_days || Number(po_validity_days) <= 0) {
        dispatch(setAlert({ type: "warning", message: "Please enter a valid number of validity days (greater than 0)" }));
        return;
      }
    } else if (po_validity_type === "monthly_date") {
      if (!po_validity_date || Number(po_validity_date) < 1 || Number(po_validity_date) > 31) {
        dispatch(setAlert({ type: "warning", message: "Please select an expiration day of the month from the grid (1-31)" }));
        return;
      }
    } else {
      dispatch(setAlert({ type: "warning", message: "Invalid PO validity type selected" }));
      return;
    }

    setSubmitting(true);
    try {
      const isIndia = countryObj?.iso2?.toLowerCase() === "in";
      const endpointBase = isIndia ? "india/po-settings" : "po-settings";

      if (formDialog.mode === "create") {
        // All kits start as disabled (inactive) by default.
        // The operator uses "Manage PO Kits" to enable the ones they want.
        const allKits = [...comboKits, ...customizeKits];
        const initialDisabledKits = allKits.map(kit => kit.id || kit._id);

        const payload = {
          country_id: warehouse.country_id,
          state_id: warehouse.state_id,
          cluster_id: warehouse.cluster_id || warehouse.cluster,
          warehouse_id: warehouse.id,
          name: name.trim(),
          subscription_rate: Number(subscription_rate),
          order_size: Number(order_size),
          order_size_unit_id,
          po_validity_type,
          po_validity_days: po_validity_type === "days" ? Number(po_validity_days) : null,
          po_validity_date: po_validity_type === "monthly_date" ? Number(po_validity_date) : null,
          category_id,
          subcategory_id,
          type_id,
          project_range_id: project_range_id || null,
          token_settlement_rule: token_settlement_rule || "PRO_RATA",
          default_penalty_type: default_penalty_type || "PERCENTAGE",
          default_penalty_rate: default_penalty_rate != null ? Number(default_penalty_rate) : 10,
          disabled_kits: initialDisabledKits
        };
        const response = await axios.post(
          `${API_URL}/solarshop/${endpointBase}/create?unique_id=${moduleUniqueId}&req_for=add`,
          payload,
          { headers: authHeaderObj() }
        );
        if (response.data.status === "success") {
          dispatch(setAlert({ type: "success", message: "PO subscription plan created successfully" }));
          setFormDialog({ ...formDialog, isOpen: false });
          fetchData();
        }
      } else {
        const originalPlan = plans.find(p => (p.id || p._id) === id);
        const origCat = getPlanIdStr(originalPlan?.category_id);
        const origSub = getPlanIdStr(originalPlan?.subcategory_id);
        const origType = getPlanIdStr(originalPlan?.type_id);

        const origRange = getPlanIdStr(originalPlan?.project_range_id);
        const hierarchyChanged = (
          origCat !== category_id ||
          origSub !== subcategory_id ||
          origType !== type_id ||
          origRange !== project_range_id
        );
        let updatedDisabledKits = originalPlan?.disabled_kits || [];

        if (hierarchyChanged) {
          // If the hierarchy (category, subcategory, type, or range) changes,
          // deactivate all kits for this subscription by default (make them inactive/disabled).
          // Filtered kits for the new hierarchy will start as inactive, and the operator manually activates them.
          const allKits = [...comboKits, ...customizeKits];
          updatedDisabledKits = allKits.map(kit => kit.id || kit._id);
        }

        const payload = {
          id,
          name: name.trim(),
          subscription_rate: Number(subscription_rate),
          order_size: Number(order_size),
          order_size_unit_id,
          po_validity_type,
          po_validity_days: po_validity_type === "days" ? Number(po_validity_days) : null,
          po_validity_date: po_validity_type === "monthly_date" ? Number(po_validity_date) : null,
          category_id,
          subcategory_id,
          type_id,
          project_range_id: project_range_id || null,
          token_settlement_rule: token_settlement_rule || "PRO_RATA",
          default_penalty_type: default_penalty_type || "PERCENTAGE",
          default_penalty_rate: default_penalty_rate != null ? Number(default_penalty_rate) : 10,
          is_active,
          disabled_kits: updatedDisabledKits
        };
        const response = await axios.put(
          `${API_URL}/solarshop/${endpointBase}/update?unique_id=${moduleUniqueId}&req_for=edit`,
          payload,
          { headers: authHeaderObj() }
        );
        if (response.data.status === "success") {
          dispatch(setAlert({ type: "success", message: "PO subscription plan updated successfully" }));
          setFormDialog({ ...formDialog, isOpen: false });
          fetchData();
        }
      }
    } catch (error) {
      console.error("Error submitting PO plan:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to save configuration"
      }));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    setSubmitting(true);
    try {
      const { id } = deleteDialog;
      const isIndia = countryObj?.iso2?.toLowerCase() === "in";
      const endpointBase = isIndia ? "india/po-settings" : "po-settings";
      const response = await axios.post(
        `${API_URL}/solarshop/${endpointBase}/delete?unique_id=${moduleUniqueId}&req_for=delete`,
        { id },
        { headers: authHeaderObj() }
      );
      if (response.data.status === "success") {
        dispatch(setAlert({ type: "success", message: "PO subscription plan deleted successfully" }));
        setDeleteDialog({ isOpen: false, id: null, plan_name: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting PO plan:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to delete configuration"
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (filterCategory && getPlanIdStr(plan.category_id) !== filterCategory) return false;
    if (filterSubcategory && getPlanIdStr(plan.subcategory_id) !== filterSubcategory) return false;
    if (filterSystemType && getPlanIdStr(plan.type_id) !== filterSystemType) return false;
    if (filterProjectRange && getPlanIdStr(plan.project_range_id) !== filterProjectRange) return false;
    return true;
  });

  // Filtered kits for search & management
  // Helper to extract a comparable string ID from either a raw ObjectId or a populated object
  const getKitHierarchyId = (val) => {
    if (!val) return "";
    // Populated object (has _id)
    if (typeof val === "object" && val._id) return String(val._id);
    // Raw string/ObjectId
    return String(val);
  };

  const kitMatchesPlan = (kit, plan) => {
    const solarKit = kit.solar_kit_id;
    // For type_id on the solar kit: it's the ProjectSubcategoryType document (sys_filter_type_maps)
    // plan.type_id is the _id of that document
    const kitCat = getKitHierarchyId(solarKit?.category_id);
    const kitSub = getKitHierarchyId(solarKit?.subcategory_id);
    const kitType = getKitHierarchyId(solarKit?.type_id); // type_id = the mapping record _id
    const kitRange = getKitHierarchyId(kit.project_range_id);

    const planCat = getPlanIdStr(plan.category_id);
    const planSub = getPlanIdStr(plan.subcategory_id);
    const planType = getPlanIdStr(plan.type_id);
    const planRange = getPlanIdStr(plan.project_range_id);

    if (kitCat !== planCat || kitSub !== planSub || kitType !== planType) return false;
    if (planRange && kitRange !== planRange) return false;
    return true;
  };

  const filteredComboKits = comboKits.filter(kit => {
    const searchMatch = !kitsSearch ||
      kit.name?.toLowerCase().includes(kitsSearch.toLowerCase()) ||
      kit.solar_kit_id?.name?.toLowerCase().includes(kitsSearch.toLowerCase());
    if (!searchMatch) return false;

    if (manageKitsDialog.plan) {
      return kitMatchesPlan(kit, manageKitsDialog.plan);
    }
    return true;
  });

  const filteredCustomizeKits = customizeKits.filter(kit => {
    const searchMatch = !kitsSearch ||
      kit.name?.toLowerCase().includes(kitsSearch.toLowerCase()) ||
      kit.solar_kit_id?.name?.toLowerCase().includes(kitsSearch.toLowerCase());
    if (!searchMatch) return false;

    if (manageKitsDialog.plan) {
      return kitMatchesPlan(kit, manageKitsDialog.plan);
    }
    return true;
  });

  // Manage Kits Dialog Handlers
  const openManageKitsDialog = (plan) => {
    setManageKitsDialog({
      isOpen: true,
      plan,
      disabledKits: [...(plan.disabled_kits || [])]
    });
    setKitsSearch("");
    setKitsTab("combokit");
  };

  const getKitCountsForPlan = (plan) => {
    const disabledIds = new Set(plan.disabled_kits || []);
    let activeCount = 0;
    let inactiveCount = 0;

    [...comboKits, ...customizeKits].forEach(kit => {
      if (kitMatchesPlan(kit, plan)) {
        const id = String(kit.id || kit._id);
        if (disabledIds.has(id) || [...disabledIds].some(d => String(d) === id)) inactiveCount++;
        else activeCount++;
      }
    });

    return { activeCount, inactiveCount };
  };

  const isKitDisabled = (kitId) => {
    return manageKitsDialog.disabledKits.some(id => String(id) === String(kitId));
  };

  const handleKitToggle = (kitId) => {
    setManageKitsDialog(prev => {
      const isCurrentlyDisabled = prev.disabledKits.some(id => String(id) === String(kitId));
      const updated = isCurrentlyDisabled
        ? prev.disabledKits.filter(id => String(id) !== String(kitId))
        : [...prev.disabledKits, kitId];
      return { ...prev, disabledKits: updated };
    });
  };

  const handleToggleAllKits = (enableAll) => {
    const activeKitsList = kitsTab === "combokit" ? filteredComboKits : filteredCustomizeKits;
    const activeKitsIds = activeKitsList.map(k => k.id || k._id);

    setManageKitsDialog(prev => {
      let updatedDisabled = [...prev.disabledKits];
      if (enableAll) {
        // Enable all: remove their IDs from the disabled list
        updatedDisabled = updatedDisabled.filter(id => !activeKitsIds.some(activeId => String(activeId) === String(id)));
      } else {
        // Disable all: add their IDs to the disabled list
        activeKitsIds.forEach(id => {
          if (!updatedDisabled.some(disabledId => String(disabledId) === String(id))) {
            updatedDisabled.push(id);
          }
        });
      }
      return { ...prev, disabledKits: updatedDisabled };
    });
  };

  const handleSaveKits = async () => {
    setSubmitting(true);
    try {
      const isIndia = countryObj?.iso2?.toLowerCase() === "in";
      const endpointBase = isIndia ? "india/po-settings" : "po-settings";
      const { plan, disabledKits } = manageKitsDialog;

      const payload = {
        id: plan.id || plan._id,
        disabled_kits: disabledKits
      };

      const response = await axios.put(
        `${API_URL}/solarshop/${endpointBase}/update?unique_id=${moduleUniqueId}&req_for=edit`,
        payload,
        { headers: authHeaderObj() }
      );

      if (response.data.status === "success") {
        dispatch(setAlert({ type: "success", message: "PO kits settings updated successfully" }));
        setManageKitsDialog({ isOpen: false, plan: null, disabledKits: [] });
        fetchData();
      }
    } catch (error) {
      console.error("Error updating PO kits settings:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to update PO kits settings"
      }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader text="Loading PO plans..." />;
  }

  if (!warehouse) {
    return (
      <div className="card p-12 text-center border-2 border-dashed border-border flex flex-col justify-center items-center gap-4">
        <FaWarehouse className="text-4xl text-text-muted opacity-30" />
        <h3 className="text-lg font-black text-text-primary">Warehouse Not Found</h3>
        <Button onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/po-orders`)} variant="secondary" className="rounded-xl">
          Back to List
        </Button>
      </div>
    );
  }

  // Table Headers
  const tableHeaders = [
    { key: "name", label: "Plan Name" },
    { key: "category", label: "Category / Sub / System" },
    { key: "subscription_rate", label: "Subscription Rate" },
    { key: "order_size", label: "Order Size limit" },
    { key: "po_validity", label: "PO Validity" },
    { key: "po_kits", label: "PO Kits" },
    { key: "status", label: "Status", align: "center" },
    { key: "actions", label: "Actions", align: "right" }
  ];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header section with active country info & Back button with premium styling */}
      <div className="relative rounded-2xl bg-linear-120 from-primary to-primary-end shadow-xl">
        <div className="absolute inset-0 bg-grid-white/10 mask-[linear-gradient(0deg,transparent,black)]"></div>
        <div className="relative px-6 py-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/po-orders`)}
                variant="secondary"
                className="w-10 h-10 p-0 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm hover:scale-105 transition-transform shrink-0"
              >
                <FaArrowLeft />
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 text-white shrink-0">
                  <FaFileInvoiceDollar className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight">
                    Configure Warehouse PO Settings
                  </h1>
                  <p className="text-white/80 text-xs mt-0.5 font-medium">
                    Add and manage PO subscription plans specifically for this warehouse.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

              <Button
                onClick={openCreateDialog}
                leftIcon={<FaPlus />}
                className="rounded-xl shadow-md uppercase tracking-wider text-xs font-bold py-2.5 bg-white text-primary hover:bg-white/90 border-white"
              >
                Add Subscription Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Detail Header Card */}
      <div className="card p-6 border-l-4 border-l-primary shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">Warehouse Code</span>
          <span className="font-black text-text-primary text-sm flex items-center gap-2 mt-1">
            <FaWarehouse className="text-primary opacity-60" size={14} />
            {warehouse.warehouse_code}
          </span>
        </div>
        <div className="md:col-span-2">
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">Address</span>
          <span className="font-semibold text-text-secondary text-xs mt-1 block">
            {warehouse.address} (PIN: {warehouse.pincode || "N/A"})
          </span>
        </div>
        <div>
          <span className="font-bold block uppercase tracking-wider text-[9px] text-text-muted">State & Cluster</span>
          <span className="font-bold text-text-secondary text-xs flex flex-col gap-0.5 mt-1">
            <span className="flex items-center gap-1"><FaMapMarkerAlt className="text-primary/50 text-[10px]" /> {warehouse.state}</span>
            <span className="text-text-muted pl-3.5">Cluster: <strong>{warehouse.cluster || "N/A"}</strong></span>
          </span>
        </div>
      </div>

      {/* Filtering Section */}
      <div className="bg-surface rounded-2xl border-2 border-border p-6 shadow-sm flex flex-col md:flex-row items-end gap-4 animate-in fade-in duration-500">
        <div className="flex-grow grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
          <Dropdown
            label="Filter by Industry Type"
            value={filterIndustryType}
            onChange={handleFilterIndustryTypeChange}
            placeholder="All Industry Types"
            options={filterIndustryTypes}
            className="w-full"
          />
          <Dropdown
            label="Filter by Category"
            value={filterCategory}
            onChange={handleFilterCategoryChange}
            placeholder="All Categories"
            options={categories}
            className="w-full"
          />
          <Dropdown
            label="Filter by Sub-Category"
            value={filterSubcategory}
            onChange={handleFilterSubcategoryChange}
            placeholder={filterCategory ? "All Sub-Categories" : "Select Category first"}
            disabled={!filterCategory}
            options={filterSubcategories}
            className="w-full"
          />
          <Dropdown
            label="Filter by System Type"
            value={filterSystemType}
            onChange={handleFilterSystemTypeChange}
            placeholder={filterSubcategory ? "All Types" : "Select Sub-Category first"}
            disabled={!filterSubcategory}
            options={filterSystemTypes}
            className="w-full"
          />
          <Dropdown
            label="Filter by Project Range"
            value={filterProjectRange}
            onChange={handleFilterProjectRangeChange}
            placeholder={filterSystemType ? "All Ranges" : "Select System Type first"}
            disabled={!filterSystemType}
            options={filterProjectRanges}
            className="w-full"
          />
        </div>
        {(filterCategory || filterSubcategory || filterSystemType || filterProjectRange) && (
          <Button
            variant="secondary"
            onClick={() => {
              setFilterCategory("");
              setFilterSubcategory("");
              setFilterSystemType("");
              setFilterProjectRange("");
              setFilterSubcategories([]);
              setFilterSystemTypes([]);
              setFilterProjectRanges([]);
            }}
            className="rounded-xl h-11 px-6 shrink-0 w-full md:w-auto flex items-center justify-center font-bold"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* PO configurations List */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-black text-text-primary flex items-center gap-3 uppercase tracking-[0.2em]">
            <FaFileInvoiceDollar className="text-primary" size={14} />
            Subscription Plans ({filteredPlans.length})
          </h2>
        </div>

        <div className="flex-1 p-6">
          <CustomTable
            headers={tableHeaders}
            data={filteredPlans}
            loading={loading}
            emptyMessage="No PO configurations configured for this warehouse yet."
            containerClassName="border-none shadow-none rounded-none bg-transparent"
            renderRow={(plan) => {
              return (
                <>
                  <td className="px-6 py-4">
                    <div className="font-black text-text-primary tracking-tight text-sm">
                      {plan.name || "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 text-xs font-semibold text-text-secondary">
                      <div>Category: <span className="font-bold text-text-primary">{plan.category_name || "—"}</span></div>
                      <div>Sub-Category: <span className="font-bold text-text-primary">{plan.subcategory_name || "—"}</span></div>
                      <div>System Type: <span className="font-bold text-text-primary">{plan.type_name || "—"}</span></div>
                      {(plan.project_range_id || plan.range_label) && (
                        <div>Range: <span className="font-bold text-primary">{plan.range_label || getPlanIdStr(plan.project_range_id)}</span></div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-secondary text-sm">
                      {getCurrencySymbol()} {plan.subscription_rate.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-secondary text-sm">
                      {plan.order_size.toLocaleString()} {plan.order_size_unit?.symbol || "kW"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-text-secondary text-sm">
                      {plan.po_validity_type === "monthly_date"
                        ? `Monthly: Day ${plan.po_validity_date}`
                        : `${plan.po_validity_days || 0} Days`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const { activeCount, inactiveCount } = getKitCountsForPlan(plan);
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-success inline-block"></span>
                            <span className="font-bold text-text-secondary">
                              {activeCount} Active
                            </span>
                          </div>
                          {inactiveCount > 0 ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block"></span>
                              <span className="font-semibold text-text-muted">
                                {inactiveCount} Inactive
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted italic pl-4">
                              All Active
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {plan.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/20">
                        <FaCheckCircle className="mr-1 text-[9px]" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-danger/10 text-danger border border-danger/20">
                        <FaTimesCircle className="mr-1 text-[9px]" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        onClick={() => openManageKitsDialog(plan)}
                        variant="success"
                        size="sm"
                        tooltip="Manage PO Kits"
                      >
                        <FaSlidersH />
                      </IconButton>
                      <IconButton
                        onClick={() => openEditDialog(plan)}
                        variant="primary"
                        size="sm"
                        tooltip="Edit Configuration"
                      >
                        <FaEdit />
                      </IconButton>
                      <IconButton
                        onClick={() => openDeleteConfirm(plan)}
                        variant="danger"
                        size="sm"
                        tooltip="Delete Configuration"
                      >
                        <FaTrash />
                      </IconButton>
                    </div>
                  </td>
                </>
              );
            }}
          />
        </div>
      </div>

      {/* Add/Edit Form Dialog */}
      <Dialog
        isOpen={formDialog.isOpen}
        onClose={() => setFormDialog({ ...formDialog, isOpen: false })}
        title={formDialog.mode === "create" ? "Configure Warehouse PO plan" : "Update PO plan Configuration"}
        size="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6 pt-2">
          {/* Warehouse Code (Read-Only) */}
          <div className="space-y-2">
            <span className="text-text-secondary mb-2 font-bold uppercase tracking-widest text-[10px]">Target Warehouse</span>
            <div className="w-full h-11 px-4 bg-surface-hover border-2 border-border rounded-xl text-sm font-black text-text-secondary flex items-center gap-3">
              <FaWarehouse className="text-primary opacity-60" size={14} />
              <span>{warehouse.warehouse_code} ({warehouse.state})</span>
            </div>
          </div>

          {/* Category, Sub-Category, System Type, and Project Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Dropdown
              label="Category *"
              value={formDialog.data.category_id}
              onChange={(val) => {
                setFormDialog(prev => ({
                  ...prev,
                  data: {
                    ...prev.data,
                    category_id: val,
                    subcategory_id: "",
                    type_id: "",
                    project_range_id: ""
                  }
                }));
                setSubcategories([]);
                setSystemTypes([]);
                setFormProjectRanges([]);
                if (val) fetchHierarchyOptions("subcategory", val);
              }}
              options={categories}
              placeholder="Select Category"
            />
            <Dropdown
              label="Sub-Category *"
              value={formDialog.data.subcategory_id}
              onChange={(val) => {
                setFormDialog(prev => ({
                  ...prev,
                  data: {
                    ...prev.data,
                    subcategory_id: val,
                    type_id: "",
                    project_range_id: ""
                  }
                }));
                setSystemTypes([]);
                setFormProjectRanges([]);
                if (val) fetchHierarchyOptions("type", val);
              }}
              options={subcategories}
              placeholder="Select Sub-Category"
              disabled={!formDialog.data.category_id}
            />
            <Dropdown
              label="System Type *"
              value={formDialog.data.type_id}
              onChange={(val) => {
                setFormDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, type_id: val, project_range_id: "" }
                }));
                setFormProjectRanges([]);
                if (val) fetchHierarchyOptions("range", val);
              }}
              options={systemTypes}
              placeholder="Select Type"
              disabled={!formDialog.data.subcategory_id}
            />
            <Dropdown
              label="Project Range *"
              value={formDialog.data.project_range_id}
              onChange={(val) => setFormDialog(prev => ({
                ...prev,
                data: { ...prev.data, project_range_id: val }
              }))}
              options={formProjectRanges}
              placeholder={formDialog.data.type_id ? "Select Range" : "Select System Type first"}
              disabled={!formDialog.data.type_id}
            />
          </div>

          {/* Subscription Plan Name */}
          <CustomInput
            label="Subscription Plan Name *"
            type="text"
            value={formDialog.data.name}
            onChange={(e) => setFormDialog({
              ...formDialog,
              data: { ...formDialog.data, name: e.target.value }
            })}
            placeholder="e.g. Basic, Premium, Gold"
          />

          {/* Subscription Rate */}
          <CustomInput
            label="Subscription Rate *"
            type="number"
            min="0.01"
            step="any"
            value={formDialog.data.subscription_rate}
            onChange={(e) => setFormDialog({
              ...formDialog,
              data: { ...formDialog.data, subscription_rate: e.target.value }
            })}
            placeholder="0.00"
            prefix={getCurrencySymbol()}
          />

          {/* Order Size and Unit */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <CustomInput
                label="Order Size Limit *"
                type="number"
                min="0.0001"
                step="any"
                value={formDialog.data.order_size}
                onChange={(e) => setFormDialog({
                  ...formDialog,
                  data: { ...formDialog.data, order_size: e.target.value }
                })}
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <Dropdown
                label="Unit *"
                value={formDialog.data.order_size_unit_id}
                onChange={(val) => setFormDialog({
                  ...formDialog,
                  data: { ...formDialog.data, order_size_unit_id: val }
                })}
                options={powerUnits}
              />
            </div>
          </div>

          {/* PO Validity Type Selection */}
          <div className="space-y-2">
            <span className="text-text-secondary font-bold uppercase tracking-widest text-[10px]">PO Validity Type *</span>
            <div className="flex bg-surface-hover/30 p-1 gap-1 rounded-xl border-2 border-border">
              <button
                type="button"
                onClick={() => setFormDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, po_validity_type: "days" }
                }))}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${formDialog.data.po_validity_type === "days"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover"
                  }`}
              >
                No. of Days
              </button>
              <button
                type="button"
                onClick={() => setFormDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, po_validity_type: "monthly_date" }
                }))}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${formDialog.data.po_validity_type === "monthly_date"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:bg-surface-hover"
                  }`}
              >
                Day of Month
              </button>
            </div>
          </div>

          {/* PO Validity Input / Calendar Grid */}
          {formDialog.data.po_validity_type === "days" ? (
            <CustomInput
              label="PO Validity No of Days *"
              type="number"
              min="1"
              step="1"
              value={formDialog.data.po_validity_days}
              onChange={(e) => setFormDialog({
                ...formDialog,
                data: { ...formDialog.data, po_validity_days: e.target.value }
              })}
              placeholder="e.g. 90"
            />
          ) : (
            <div className="space-y-2 animate-in fade-in duration-300">
              <span className="text-text-secondary font-bold uppercase tracking-widest text-[10px]">Select Expiration Day of Month *</span>
              <div className="grid grid-cols-7 gap-2 p-3 bg-surface border-2 border-border rounded-xl">
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const isSelected = Number(formDialog.data.po_validity_date) === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setFormDialog(prev => ({
                        ...prev,
                        data: { ...prev.data, po_validity_date: day }
                      }))}
                      className={`h-10 rounded-lg flex items-center justify-center font-bold text-xs cursor-pointer border transition-all hover:scale-105 ${isSelected
                          ? "bg-primary border-primary text-white shadow-md"
                          : "bg-surface hover:bg-surface-hover border-border text-text-primary"
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {formDialog.data.po_validity_date && (
                <div className="text-xs text-text-muted font-bold italic mt-1 pl-1">
                  Selected Expiry: Every {formDialog.data.po_validity_date === 1 ? '1st' : formDialog.data.po_validity_date === 2 ? '2nd' : formDialog.data.po_validity_date === 3 ? '3rd' : `${formDialog.data.po_validity_date}th`} of the month.
                </div>
              )}
            </div>
          )}

          {/* PO Token Settlement & Expiry Penalty Rules */}
          <div className="p-4 rounded-2xl bg-surface-hover/40 border-2 border-border/80 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-text-primary font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FaFileInvoiceDollar className="text-primary" /> Token Settlement & Expiry Penalty Rules
              </span>
              <span className="text-[10px] text-text-muted font-bold">Automated Lifecycle</span>
            </div>

            {/* Token Settlement Rule */}
            <div className="space-y-1.5">
              <label className="text-text-secondary font-bold uppercase tracking-widest text-[10px] block">
                Repeat Order Token Settlement Mode *
              </label>
              <select
                value={formDialog.data.token_settlement_rule || "PRO_RATA"}
                onChange={(e) => setFormDialog(prev => ({
                  ...prev,
                  data: { ...prev.data, token_settlement_rule: e.target.value }
                }))}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:border-primary"
              >
                <option value="PRO_RATA">Pro-Rata Settlement (Recommended: Token adjusted proportionally on each repeat kit order)</option>
                <option value="FINAL_ORDER">Final Fulfillment Settlement (Token held in escrow until last remaining batch)</option>
                <option value="UPFRONT">Upfront Settlement (100% token adjusted against the very first linked order)</option>
              </select>
              <p className="text-[10px] text-text-muted italic">
                Controls how the initial commitment token is deducted when EPCs or Franchisees reorder kits against this PO card.
              </p>
            </div>

            {/* Expiry Penalty Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-text-secondary font-bold uppercase tracking-widest text-[10px] block">
                  Default Expiry Penalty Type *
                </label>
                <select
                  value={formDialog.data.default_penalty_type || "PERCENTAGE"}
                  onChange={(e) => setFormDialog(prev => ({
                    ...prev,
                    data: { ...prev.data, default_penalty_type: e.target.value }
                  }))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="PERCENTAGE">Percentage of Escrow Token (% of unfulfilled value)</option>
                  <option value="FIXED_PER_KIT">Fixed Penalty per Unpurchased Kit (₹)</option>
                  <option value="FULL_FORFEIT">100% Token Forfeiture (No refund)</option>
                </select>
              </div>

              {formDialog.data.default_penalty_type !== "FULL_FORFEIT" && (
                <div className="space-y-1.5">
                  <label className="text-text-secondary font-bold uppercase tracking-widest text-[10px] block">
                    {formDialog.data.default_penalty_type === "FIXED_PER_KIT"
                      ? "Penalty Amount per Kit (₹) *"
                      : "Penalty Rate (%) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={formDialog.data.default_penalty_type === "FIXED_PER_KIT" ? "100" : "1"}
                    value={formDialog.data.default_penalty_rate != null ? formDialog.data.default_penalty_rate : 10}
                    onChange={(e) => setFormDialog(prev => ({
                      ...prev,
                      data: { ...prev.data, default_penalty_rate: e.target.value }
                    }))}
                    placeholder={formDialog.data.default_penalty_type === "FIXED_PER_KIT" ? "e.g. 5000" : "e.g. 10"}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-border bg-surface text-text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Active status for edit mode */}
          {formDialog.mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formDialog.data.is_active}
                onChange={(e) => setFormDialog({
                  ...formDialog,
                  data: { ...formDialog.data, is_active: e.target.checked }
                })}
                className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              />
              <label htmlFor="is_active" className="text-xs font-bold text-text-primary uppercase tracking-wide cursor-pointer">
                Plan is active and available
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormDialog({ ...formDialog, isOpen: false })}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
            >
              {formDialog.mode === "create" ? "Confirm setup" : "Update config"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, plan_name: "" })}
        title="Delete PO Plan"
        size="md"
      >
        <div className="space-y-6 pt-2 text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-3xl flex items-center justify-center text-danger border border-danger/20 shadow-inner mx-auto">
            <FaTrash size={28} />
          </div>
          <div>
            <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">Delete PO Plan</h3>
            <p className="text-sm text-text-muted font-bold mt-2 leading-relaxed">
              Are you sure you want to delete PO subscription plan <strong>{deleteDialog.plan_name}</strong>?
            </p>
            <p className="text-xs text-danger font-bold mt-2 uppercase tracking-wider animate-pulse">This operation is irreversible.</p>
          </div>
          <div className="flex gap-3 pt-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialog({ isOpen: false, id: null, plan_name: "" })}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={submitting}
              className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
            >
              Delete Plan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Manage PO Kits Dialog */}
      <Dialog
        isOpen={manageKitsDialog.isOpen}
        onClose={() => setManageKitsDialog({ isOpen: false, plan: null, disabledKits: [] })}
        title={`Manage PO Kits: ${manageKitsDialog.plan?.name || ""}`}
        size="lg"
      >
        <div className="space-y-6 pt-2">
          {/* Warehouse Context Info (Subtle) */}
          <div className="bg-surface-hover/50 border border-border/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-text-secondary">
            <span className="font-bold">Target Warehouse: <strong className="text-text-primary">{warehouse.warehouse_code}</strong></span>
            <span className="font-semibold text-text-muted">State: {warehouse.state}</span>
          </div>

          {/* Search Box and Controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:max-w-xs">
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

            {/* Quick Actions (Enable/Disable All) */}
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleToggleAllKits(true)}
                className="rounded-lg text-[10px] font-black uppercase tracking-wider py-2 px-3 border border-border/40 hover:bg-success-soft hover:text-success hover:border-success/20 transition-all shadow-xs"
              >
                Enable All
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleToggleAllKits(false)}
                className="rounded-lg text-[10px] font-black uppercase tracking-wider py-2 px-3 border border-border/40 hover:bg-danger-soft hover:text-danger hover:border-danger/20 transition-all shadow-xs"
              >
                Disable All
              </Button>
            </div>
          </div>

          {/* Tabs Selector */}
          <div className="flex border-b border-border bg-surface-hover/30 p-1 gap-1 rounded-xl">
            <button
              type="button"
              onClick={() => setKitsTab("combokit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${kitsTab === "combokit"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-surface-hover"
                }`}
            >
              <FaLayerGroup size={12} />
              Combo Kits ({filteredComboKits.length})
            </button>
            <button
              type="button"
              onClick={() => setKitsTab("customizekit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none outline-none cursor-pointer ${kitsTab === "customizekit"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:bg-surface-hover"
                }`}
            >
              <FaSlidersH size={12} />
              Customized Kits ({filteredCustomizeKits.length})
            </button>
          </div>

          {/* Scrollable Kits List */}
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar border border-border/60 rounded-2xl bg-surface divide-y divide-border/40">
            {kitsTab === "combokit" ? (
              filteredComboKits.length > 0 ? (
                filteredComboKits.map((kit) => {
                  const isEnabled = !isKitDisabled(kit.id || kit._id);
                  return (
                    <div key={kit.id || kit._id} className="flex items-center justify-between p-4 hover:bg-surface-hover/30 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-xs text-text-primary uppercase tracking-wide">
                          {kit.name || "N/A"}
                        </span>
                        <span className="text-[10px] text-text-muted font-bold uppercase">
                          Blueprint: <strong className="text-text-secondary">{kit.solar_kit_id?.name || "N/A"}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-lg border border-border/40">
                          {kit.capacity || 0} kW
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleKitToggle(kit.id || kit._id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-border rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs font-bold text-text-muted italic">
                  No combo kits found matching search criteria.
                </div>
              )
            ) : (
              filteredCustomizeKits.length > 0 ? (
                filteredCustomizeKits.map((kit) => {
                  const isEnabled = !isKitDisabled(kit.id || kit._id);
                  return (
                    <div key={kit.id || kit._id} className="flex items-center justify-between p-4 hover:bg-surface-hover/30 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-black text-xs text-text-primary uppercase tracking-wide">
                          {kit.name || "N/A"}
                        </span>
                        <span className="text-[10px] text-text-muted font-bold uppercase">
                          Blueprint: <strong className="text-text-secondary">{kit.solar_kit_id?.name || "N/A"}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-xs text-text-secondary bg-surface-hover px-2.5 py-1 rounded-lg border border-border/40">
                          {kit.capacity || 0} kW
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleKitToggle(kit.id || kit._id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-border rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs font-bold text-text-muted italic">
                  No customized kits found matching search criteria.
                </div>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => setManageKitsDialog({ isOpen: false, plan: null, disabledKits: [] })}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveKits}
              loading={submitting}
              className="flex-1 rounded-xl shadow-lg font-black uppercase tracking-widest text-xs"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
