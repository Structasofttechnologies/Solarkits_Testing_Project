import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";
import readXlsxFile from "read-excel-file";

import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Pagination from "@/components/Pagination";
import Dialog from "@/components/Dialog";

import {
  FaTruck,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaFileImport,
  FaSync,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaArrowLeft,
  FaBolt,
  FaThLarge,
  FaTable,
  FaLayerGroup,
  FaRupeeSign,
  FaCheck,
  FaExclamationTriangle,
  FaFileCsv,
  FaFileExcel,
  FaDownload,
  FaUpload,
  FaCloudUploadAlt,
  FaTimes,
  FaTimesCircle,
  FaFileAlt,
  FaWarehouse,
  FaRoad,
  FaCalculator,
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const MODULE_UID = "ADM_COMBO_KITS";

const DEFAULT_KIT_IMAGE =
  "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80";

const resolveImageUrl = (url) => {
  if (!url || typeof url !== "string" || url.trim() === "") return DEFAULT_KIT_IMAGE;
  if (url.includes("localhost:3001")) {
    return url.replace("localhost:3001", "localhost:5000");
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const cleanBase = (API_URL || "http://localhost:5000").replace(/\/admin-api|\/api/g, "");
  return `${cleanBase}/${url.startsWith("/") ? url.slice(1) : url}`;
};


const calculateHaversineKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export default function PincodeDeliveryCosts({ moduleUniqueId = MODULE_UID }) {
  const { countryName = "india" } = useParams();
  const dispatch = useDispatch();

  // Navigation & View Mode
  const [selectedKit, setSelectedKit] = useState(null); // null = Cards view, or Kit object / "default"
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const [kitSearchTerm, setKitSearchTerm] = useState("");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    totalActive: 0,
    distinctPincodesCount: 0,
    distinctDistrictsCount: 0,
  });

  // Filters for Pincodes
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterKit, setFilterKit] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Geographic masters & Combo Kits
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [modalDistricts, setModalDistricts] = useState([]);
  const [comboKits, setComboKits] = useState([]);
  const [kitStats, setKitStats] = useState({});

    const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  // Fetch real fulfillment warehouses
  const fetchWarehouses = async () => {
    try {
      setWarehousesLoading(true);
      const res = await axios.get(`${API_URL}/pincode-delivery-costs/fulfillment-warehouses`, {
        headers: authHeaderObj()
      });
      if (res.data?.status === 'success' && Array.isArray(res.data?.data)) {
        setWarehouses(res.data.data);
      }
    } catch (e) {
      console.warn("Failed to load warehouses:", e.message);
    } finally {
      setWarehousesLoading(false);
    }
  };

  // Apply District Rates Modal State
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [districtModalLoading, setDistrictModalLoading] = useState(false);
  const [districtModalDistricts, setDistrictModalDistricts] = useState([]);
  const [districtModalFetchingDistricts, setDistrictModalFetchingDistricts] = useState(false);
  const [districtFormData, setDistrictFormData] = useState({
    combo_kit_id: "",
    combo_kit_name: "",
    state_id: "",
    state_name: "",
    warehouse_id: "",
    warehouse_code: "",
    warehouse_name: "",
    warehouse_type: "",
    warehouse_lat: null,
    warehouse_lng: null,
    pricing_mode: "fixed",
    selected_states: [],
    rate_per_km_loose: 15,
    rate_per_km_po: 10,
    rate_per_km_trial: 12,
    base_delivery_cost: 0,
    distance_km: 0,
    apply_to_all_districts: false,
    selected_district_ids: [],
    loose_delivery_cost: 1500,
    po_delivery_cost: 800,
    trial_delivery_cost: 1200,
    estimated_days_min: 3,
    estimated_days_max: 7,
    is_active: true,
    notes: "",
  });

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    state_id: "",
    state_name: "",
    district_id: "",
    district_name: "",
    pincode: "",
    combo_kit_id: "",
    combo_kit_name: "",
    warehouse_id: "",
    warehouse_code: "",
    warehouse_name: "",
    warehouse_type: "",
    pricing_mode: "fixed",
    rate_per_km_loose: 15,
    rate_per_km_po: 10,
    rate_per_km_trial: 12,
    base_delivery_cost: 0,
    distance_km: 0,
    delivery_cost: 1500,
    loose_delivery_cost: 1500,
    po_delivery_cost: 800,
    trial_delivery_cost: 1200,
    estimated_days_min: 3,
    estimated_days_max: 7,
    is_active: true,
    notes: "",
  });

  // Bulk Import & Update State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMode, setBulkMode] = useState("file"); // "file" | "paste"
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkParsedItems, setBulkParsedItems] = useState([]);
  const [bulkPreviewCount, setBulkPreviewCount] = useState(15);
  const [isExporting, setIsExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 1. Fetch States
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/active-states?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.states || res.data?.data || [];
        setStates(list);
      } catch (err) {
        console.error("Failed to load states:", err);
      }
    };
    fetchStates();
  }, [moduleUniqueId]);

  // 2. Fetch Configured Combo Kits
  const fetchKits = async () => {
    try {
      setKitsLoading(true);
      const isIndia = (countryName || "india").toLowerCase() === "india";
      const res = await axios.get(
        `${API_URL}/combo-kits${isIndia ? "/india" : ""}/get-kits?unique_id=${moduleUniqueId}&req_for=view&is_custom=false`,
        { headers: authHeaderObj() }
      );
      const list = res.data?.data || [];
      setComboKits(list);
    } catch (err) {
      console.error("Failed to load combo kits:", err);
    } finally {
      setKitsLoading(false);
    }
  };

  // 3. Fetch Kit Stats (Count & Price ranges grouped by kit)
  const fetchKitStats = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/pincode-delivery-costs/kit-stats?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success" && Array.isArray(res.data?.data)) {
        const map = {};
        res.data.data.forEach((s) => {
          const key = s._id ? String(s._id) : "default";
          map[key] = {
            total_pincodes: s.total_pincodes || 0,
            min_cost: s.min_cost || 0,
            max_cost: s.max_cost || 0,
            active_count: s.active_count || 0,
          };
        });
        setKitStats(map);
      }
    } catch (err) {
      console.error("Failed to load kit stats:", err);
    }
  };

  useEffect(() => {
    fetchKits();
    fetchKitStats();
    fetchWarehouses();
  }, [moduleUniqueId, countryName]);

  // 4. Filter Districts when filterState changes
  useEffect(() => {
    if (!filterState) {
      setDistricts([]);
      setFilterDistrict("");
      return;
    }
    const fetchDistricts = async () => {
      try {
        const selectedStateObj = states.find(
          (s) => s.name?.toLowerCase() === filterState.toLowerCase() || s.id === filterState
        );
        const stateId = selectedStateObj?._id || selectedStateObj?.id || filterState;
        const res = await axios.get(
          `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view&state_id=${stateId}`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.districts || res.data?.data || [];
        setDistricts(list);
      } catch (err) {
        console.error("Failed to load districts:", err);
      }
    };
    fetchDistricts();
  }, [filterState, states, moduleUniqueId]);

  // 5. Modal Districts when formData.state_name changes
  useEffect(() => {
    if (!formData.state_name && !formData.state_id) {
      setModalDistricts([]);
      return;
    }
    const fetchModalDistricts = async () => {
      try {
        const stateId =
          formData.state_id ||
          states.find((s) => s.name?.toLowerCase() === formData.state_name?.toLowerCase())?._id ||
          states.find((s) => s.name?.toLowerCase() === formData.state_name?.toLowerCase())?.id;

        if (!stateId) return;
        const res = await axios.get(
          `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view&state_id=${stateId}`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.districts || res.data?.data || [];
        setModalDistricts(list);
      } catch (err) {
        console.error("Failed to load modal districts:", err);
      }
    };
    fetchModalDistricts();
  }, [formData.state_name, formData.state_id, states, moduleUniqueId]);

  
  
  // Get all states mapped to the currently selected warehouse
  const currentWarehouseMappedStates = useMemo(() => {
    if (!districtFormData.warehouse_code) return [];
    const wh = warehouses.find(w => w.warehouse_code === districtFormData.warehouse_code);
    return wh?.states || [];
  }, [districtFormData.warehouse_code, warehouses]);

  // Calculate preview distance (KM) from warehouse to selected district
  const activePreviewDistance = useMemo(() => {
    if (!districtFormData.warehouse_lat || !districtFormData.warehouse_lng) return 0;
    let targetDist = null;
    if (districtFormData.selected_district_ids?.length > 0) {
      targetDist = districtModalDistricts.find(d => districtFormData.selected_district_ids.includes(d._id || d.id));
    } else if (districtModalDistricts?.length > 0) {
      targetDist = districtModalDistricts[0];
    }
    if (targetDist && targetDist.lat && targetDist.lng) {
      return calculateHaversineKm(districtFormData.warehouse_lat, districtFormData.warehouse_lng, targetDist.lat, targetDist.lng);
    }
    return 0;
  }, [districtFormData.warehouse_lat, districtFormData.warehouse_lng, districtFormData.selected_district_ids, districtModalDistricts]);

  // Live computed prices based on preview distance
  const livePreviewPrices = useMemo(() => {
    const base = Number(districtFormData.base_delivery_cost) || 0;
    const dist = activePreviewDistance || 0;
    return {
      loose: Math.round(base + (dist * (Number(districtFormData.rate_per_km_loose) || 0))),
      po: Math.round(base + (dist * (Number(districtFormData.rate_per_km_po) || 0))),
      trial: Math.round(base + (dist * (Number(districtFormData.rate_per_km_trial) || 0))),
    };
  }, [activePreviewDistance, districtFormData.base_delivery_cost, districtFormData.rate_per_km_loose, districtFormData.rate_per_km_po, districtFormData.rate_per_km_trial]);

  // 6. Fetch Delivery Cost Records
  const fetchRecords = async (targetKit = selectedKit) => {
    setLoading(true);
    try {
      const params = {
        unique_id: moduleUniqueId,
        req_for: "view",
        page: currentPage,
        limit: 20,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterState) params.state_name = filterState;
      if (filterDistrict) params.district_name = filterDistrict;

      if (targetKit) {
        if (targetKit === "default") {
          params.combo_kit_id = "default";
        } else {
          params.combo_kit_id = targetKit._id || targetKit.id;
        }
      } else if (filterKit) {
        params.combo_kit_id = filterKit;
      }

      if (filterStatus !== "all") params.is_active = filterStatus === "active";

      const res = await axios.get(`${API_URL}/pincode-delivery-costs`, {
        params,
        headers: authHeaderObj(),
      });

      if (res.data?.status === "success") {
        setItems(res.data.data || []);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to load delivery costs:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load pincode delivery costs.",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(selectedKit);
  }, [selectedKit, currentPage, filterState, filterDistrict, filterKit, filterStatus, moduleUniqueId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords(selectedKit);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterState("");
    setFilterDistrict("");
    setFilterKit("");
    setFilterStatus("all");
    setCurrentPage(1);
    fetchRecords(selectedKit);
  };

  // Refresh entire page data
  const handleRefreshAll = () => {
    fetchKits();
    fetchKitStats();
    fetchRecords(selectedKit);
  };

  // Select a kit and drill down into its pincode delivery rates
  const handleSelectKit = (kit) => {
    setSelectedKit(kit);
    setCurrentPage(1);
    setSearchTerm("");
    setFilterState("");
    setFilterDistrict("");
  };

  // Return to all kits overview
  const handleBackToKits = () => {
    setSelectedKit(null);
    setCurrentPage(1);
    setSearchTerm("");
    setFilterState("");
    setFilterDistrict("");
    fetchKitStats();
  };

  // Detect total pincodes in selected districts for the District Rate Modal
  const detectedPincodeCount = useMemo(() => {
    if (!districtModalDistricts || districtModalDistricts.length === 0) return 0;
    if (districtFormData.apply_to_all_districts) {
      return districtModalDistricts.reduce((sum, d) => sum + (d.pincodes?.length || d.pincodes_count || 0), 0);
    }
    const selectedSet = new Set(districtFormData.selected_district_ids || []);
    return districtModalDistricts
      .filter((d) => selectedSet.has(d._id || d.id))
      .reduce((sum, d) => sum + (d.pincodes?.length || d.pincodes_count || 0), 0);
  }, [districtModalDistricts, districtFormData.apply_to_all_districts, districtFormData.selected_district_ids]);

  // Fetch districts for ALL selected states in District Modal
  useEffect(() => {
    const statesToFetch = Array.isArray(districtFormData.selected_states) && districtFormData.selected_states.length > 0
      ? districtFormData.selected_states
      : (districtFormData.state_name ? [districtFormData.state_name] : []);

    if (statesToFetch.length === 0) {
      setDistrictModalDistricts([]);
      return;
    }

    const fetchAllDistrictsForModal = async () => {
      try {
        setDistrictModalFetchingDistricts(true);
        const resolvedIds = statesToFetch
          .map(stName => {
            const clean = String(stName).replace(/\s*\(.*?\)/, '').trim().toLowerCase();
            const matched = states.find(s => s.name?.toLowerCase().includes(clean) || clean.includes(s.name?.toLowerCase()));
            return matched?._id || matched?.id;
          })
          .filter(Boolean);

        if (resolvedIds.length === 0) {
          setDistrictModalDistricts([]);
          return;
        }

        const promises = resolvedIds.map(stId =>
          axios.get(`${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view&state_id=${stId}`, {
            headers: authHeaderObj()
          }).then(res => res.data?.districts || res.data?.data || [])
            .catch(() => [])
        );

        const results = await Promise.all(promises);
        const combined = results.flat();
        setDistrictModalDistricts(combined);
      } catch (err) {
        console.error("Failed to load district modal districts for multi-states:", err);
      } finally {
        setDistrictModalFetchingDistricts(false);
      }
    };
    fetchAllDistrictsForModal();
  }, [districtFormData.selected_states, districtFormData.state_name, states, moduleUniqueId]);

  // Open District Modal
  const handleOpenDistrictModal = (kit = selectedKit) => {
    const targetKitId = kit && kit !== "default" ? kit._id || kit.id : "";
    const targetKitName = kit && kit !== "default" ? kit.name : (kit === "default" ? "All Products (Default Rate)" : "");

    // Default to first available warehouse or Ahmedabad Sub-Depot if available
    const defaultWh = warehouses.find(w => w.warehouse_code === 'WH-AHM-02') || (warehouses.length > 0 ? warehouses[0] : null);
    const defaultStates = defaultWh?.states || [];

    setDistrictFormData({
      combo_kit_id: targetKitId,
      combo_kit_name: targetKitName,
      warehouse_id: defaultWh ? (defaultWh.warehouse_id || defaultWh.id) : "",
      warehouse_code: defaultWh ? defaultWh.warehouse_code : "",
      warehouse_name: defaultWh ? defaultWh.warehouse_name : "",
      warehouse_type: defaultWh ? defaultWh.warehouse_type : "master",
      warehouse_lat: defaultWh ? defaultWh.lat : null,
      warehouse_lng: defaultWh ? defaultWh.lng : null,
      pricing_mode: "fixed",
      rate_per_km_loose: 15,
      rate_per_km_po: 10,
      rate_per_km_trial: 12,
      base_delivery_cost: 0,
      distance_km: 0,
      selected_states: [...defaultStates],
      state_id: "",
      state_name: defaultStates[0] || "",
      apply_to_all_districts: true,
      selected_district_ids: [],
      loose_delivery_cost: 1500,
      po_delivery_cost: 800,
      trial_delivery_cost: 1200,
      estimated_days_min: 3,
      estimated_days_max: 7,
      is_active: true,
      notes: "",
    });
    setDistrictModalDistricts([]);
    setShowDistrictModal(true);
  };

  // Save District Rates (Applies Uniform Rates across all pincodes)
  const handleSaveDistrictRates = async (e) => {
    e.preventDefault();
    const hasStates = (districtFormData.selected_states && districtFormData.selected_states.length > 0) || districtFormData.state_name;
    if (!hasStates) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one fulfillment state." }));
      return;
    }
    if (!districtFormData.apply_to_all_districts && (!districtFormData.selected_district_ids || districtFormData.selected_district_ids.length === 0)) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one district or check 'All Districts in State'." }));
      return;
    }

    setDistrictModalLoading(true);
    try {
      const isKm = districtFormData.pricing_mode === 'per_km';
      const payload = {
        combo_kit_id: districtFormData.combo_kit_id || null,
        selected_states: districtFormData.selected_states || [],
        state_names: districtFormData.selected_states || [],
        state_id: districtFormData.state_id || null,
        state_name: districtFormData.selected_states?.[0] || districtFormData.state_name || "",
        district_ids: districtFormData.apply_to_all_districts ? "all" : districtFormData.selected_district_ids,
        apply_to_all_districts: Boolean(districtFormData.apply_to_all_districts),
        warehouse_id: districtFormData.warehouse_id || null,
        warehouse_code: districtFormData.warehouse_code || null,
        warehouse_name: districtFormData.warehouse_name || null,
        warehouse_type: districtFormData.warehouse_type || null,
        warehouse_lat: districtFormData.warehouse_lat != null ? districtFormData.warehouse_lat : null,
        warehouse_lng: districtFormData.warehouse_lng != null ? districtFormData.warehouse_lng : null,
        pricing_mode: districtFormData.pricing_mode || 'fixed',
        distance_km: activePreviewDistance || 0,
        rate_per_km_loose: Number(districtFormData.rate_per_km_loose) || 0,
        rate_per_km_po: Number(districtFormData.rate_per_km_po) || 0,
        rate_per_km_trial: Number(districtFormData.rate_per_km_trial) || 0,
        base_delivery_cost: Number(districtFormData.base_delivery_cost) || 0,
        loose_delivery_cost: isKm ? livePreviewPrices.loose : (Number(districtFormData.loose_delivery_cost) || 0),
        po_delivery_cost: isKm ? livePreviewPrices.po : (Number(districtFormData.po_delivery_cost) || 0),
        trial_delivery_cost: isKm ? livePreviewPrices.trial : (Number(districtFormData.trial_delivery_cost) || 0),
        delivery_cost: isKm ? livePreviewPrices.loose : (Number(districtFormData.loose_delivery_cost) || 0),
        estimated_days_min: Number(districtFormData.estimated_days_min) || 3,
        estimated_days_max: Number(districtFormData.estimated_days_max) || 7,
        is_active: Boolean(districtFormData.is_active),
        notes: districtFormData.notes?.trim() || null,
      };

      const res = await axios.post(
        `${API_URL}/pincode-delivery-costs/apply-district-rates?unique_id=${moduleUniqueId}&req_for=add`,
        payload,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        dispatch(setAlert({
          type: "success",
          message: res.data.message || "Uniform district delivery rates successfully applied!"
        }));
        setShowDistrictModal(false);
        fetchRecords(selectedKit);
        fetchKitStats();
      }
    } catch (err) {
      console.error("Apply district rates error:", err);
      dispatch(setAlert({
        type: "error",
        message: err.response?.data?.message || "Failed to apply uniform district delivery rates."
      }));
    } finally {
      setDistrictModalLoading(false);
    }
  };

  // Open Modal for Add
  const handleOpenAddForKit = (kit = selectedKit) => {
    setEditingItem(null);
    const targetKitId = kit && kit !== "default" ? kit._id || kit.id : "";
    const targetKitName = kit && kit !== "default" ? kit.name : (kit === "default" ? "All Products (Default Rate)" : "");

    setFormData({
      state_id: "",
      state_name: "",
      district_id: "",
      district_name: "",
      pincode: "",
      combo_kit_id: targetKitId,
      combo_kit_name: targetKitName,
      delivery_cost: 1500,
      loose_delivery_cost: 1500,
      po_delivery_cost: 800,
      trial_delivery_cost: 1200,
      estimated_days_min: 3,
      estimated_days_max: 7,
      is_active: true,
      notes: "",
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      state_id: item.state_id || "",
      state_name: item.state_name || "",
      district_id: item.district_id || "",
      district_name: item.district_name || "",
      pincode: item.pincode || "",
      combo_kit_id: item.combo_kit_id?._id || item.combo_kit_id?.id || item.combo_kit_id || "",
      combo_kit_name: item.combo_kit_name || item.combo_kit_id?.name || "",
      warehouse_id: item.warehouse_id || "",
      warehouse_code: item.warehouse_code || "",
      warehouse_name: item.warehouse_name || "",
      warehouse_type: item.warehouse_type || "master",
      pricing_mode: item.pricing_mode || "fixed",
      rate_per_km_loose: item.rate_per_km_loose || 15,
      rate_per_km_po: item.rate_per_km_po || 10,
      rate_per_km_trial: item.rate_per_km_trial || 12,
      base_delivery_cost: item.base_delivery_cost || 0,
      distance_km: item.distance_km || 0,
      delivery_cost: item.delivery_cost || 0,
      loose_delivery_cost: item.loose_delivery_cost !== undefined ? item.loose_delivery_cost : (item.delivery_cost || 0),
      po_delivery_cost: item.po_delivery_cost !== undefined ? item.po_delivery_cost : (item.delivery_cost || 0),
      trial_delivery_cost: item.trial_delivery_cost !== undefined ? item.trial_delivery_cost : (item.delivery_cost || 0),
      estimated_days_min: item.estimated_days_min || 3,
      estimated_days_max: item.estimated_days_max || 7,
      is_active: item.is_active !== false,
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  // Save Modal Record
  const handleSaveRecord = async (e) => {
    e.preventDefault();

    if (!formData.state_name || !formData.district_name || !formData.pincode) {
      dispatch(setAlert({ type: "warning", message: "State, District, and Pincode are required." }));
      return;
    }

    if (!/^\d{6}$/.test(String(formData.pincode).trim())) {
      dispatch(setAlert({ type: "warning", message: "Please enter a valid 6-digit Indian PIN code." }));
      return;
    }

    if (formData.delivery_cost === "" || Number(formData.delivery_cost) < 0) {
      dispatch(setAlert({ type: "warning", message: "Please enter a valid delivery freight amount." }));
      return;
    }

    setModalLoading(true);
    try {
      const payload = {
        state_id: formData.state_id || null,
        state_name: formData.state_name.trim(),
        district_id: formData.district_id || null,
        district_name: formData.district_name.trim(),
        pincode: String(formData.pincode).trim(),
        combo_kit_id: formData.combo_kit_id || null,
        warehouse_id: formData.warehouse_id || null,
        warehouse_code: formData.warehouse_code || null,
        warehouse_name: formData.warehouse_name || null,
        warehouse_type: formData.warehouse_type || null,
        pricing_mode: formData.pricing_mode || 'fixed',
        distance_km: Number(formData.distance_km) || 0,
        rate_per_km_loose: Number(formData.rate_per_km_loose) || 0,
        rate_per_km_po: Number(formData.rate_per_km_po) || 0,
        rate_per_km_trial: Number(formData.rate_per_km_trial) || 0,
        base_delivery_cost: Number(formData.base_delivery_cost) || 0,
        delivery_cost: Number(formData.delivery_cost || formData.loose_delivery_cost || 0),
        loose_delivery_cost: Number(formData.loose_delivery_cost || formData.delivery_cost || 0),
        po_delivery_cost: Number(formData.po_delivery_cost || formData.delivery_cost || 0),
        trial_delivery_cost: Number(formData.trial_delivery_cost || formData.delivery_cost || 0),
        estimated_days_min: Number(formData.estimated_days_min) || 3,
        estimated_days_max: Number(formData.estimated_days_max) || 7,
        is_active: Boolean(formData.is_active),
        notes: formData.notes?.trim() || null,
      };

      if (editingItem) {
        await axios.put(
          `${API_URL}/pincode-delivery-costs/${editingItem._id || editingItem.id}?unique_id=${moduleUniqueId}&req_for=edit`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Delivery cost rule updated successfully!" }));
      } else {
        await axios.post(
          `${API_URL}/pincode-delivery-costs?unique_id=${moduleUniqueId}&req_for=add`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Pincode delivery cost rule created successfully!" }));
      }

      setShowModal(false);
      fetchRecords(selectedKit);
      fetchKitStats();
    } catch (err) {
      console.error("Save error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save delivery cost rule.",
        })
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Record
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(
        `${API_URL}/pincode-delivery-costs/${deleteConfirm._id || deleteConfirm.id}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );
      dispatch(setAlert({ type: "success", message: "Delivery cost rule deleted." }));
      setDeleteConfirm(null);
      fetchRecords(selectedKit);
      fetchKitStats();
    } catch (err) {
      console.error("Failed to delete rule:", err);
      dispatch(setAlert({ type: "error", message: "Failed to delete rule." }));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SMART PARSER & BULK IMPORT UTILITIES
  // ──────────────────────────────────────────────────────────────────────────

  // Smart parser for single line of text (supports tabs, commas, semicolons, and spaces)
  const parseTextLine = (line, knownStatesList = []) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Detect and skip header row
    const lower = trimmed.toLowerCase();
    if (
      (lower.includes("state") && lower.includes("district")) ||
      (lower.includes("pincode") &&
        (lower.includes("cost") || lower.includes("rate") || lower.includes("freight") || lower.includes("price") || lower.includes("delivery"))) ||
      (lower.includes("state") && lower.includes("pincode"))
    ) {
      return null;
    }

    let state = "";
    let district = "";
    let pincode = "";
    let cost = NaN;
    let minDays = 3;
    let maxDays = 7;
    let isMatched = false;

    // 1. Tab separated (Direct copy from Excel / Google Sheets)
    if (trimmed.includes("\t")) {
      const parts = trimmed.split("\t").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 4) {
        state = parts[0];
        district = parts[1];
        pincode = parts[2].replace(/\D/g, "");
        cost = parseFloat(parts[3].replace(/[^\d.]/g, ""));
        if (parts[4]) minDays = parseInt(parts[4], 10) || 3;
        if (parts[5]) maxDays = parseInt(parts[5], 10) || 7;
        isMatched = true;
      }
    }

    // 2. Comma separated (CSV standard)
    if (!isMatched && trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 4) {
        state = parts[0];
        district = parts[1];
        pincode = parts[2].replace(/\D/g, "");
        cost = parseFloat(parts[3].replace(/[^\d.]/g, ""));
        if (parts[4]) minDays = parseInt(parts[4], 10) || 3;
        if (parts[5]) maxDays = parseInt(parts[5], 10) || 7;
        isMatched = true;
      }
    }

    // 3. Semicolon separated
    if (!isMatched && trimmed.includes(";")) {
      const parts = trimmed.split(";").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length >= 4) {
        state = parts[0];
        district = parts[1];
        pincode = parts[2].replace(/\D/g, "");
        cost = parseFloat(parts[3].replace(/[^\d.]/g, ""));
        if (parts[4]) minDays = parseInt(parts[4], 10) || 3;
        if (parts[5]) maxDays = parseInt(parts[5], 10) || 7;
        isMatched = true;
      }
    }

    // 4. Space / Regex Fallback (e.g. "Gujarat Patan 384265 15500" or "Gujarat Devbhoomi Dwarka 361320 1500")
    if (!isMatched) {
      const pinMatch = trimmed.match(/\b(\d{6})\b/);
      if (pinMatch) {
        pincode = pinMatch[1];
        const pinIndex = pinMatch.index;
        const beforePin = trimmed.slice(0, pinIndex).trim();
        const afterPin = trimmed.slice(pinIndex + 6).trim();

        const costMatch = afterPin.match(/[\d.]+/);
        cost = costMatch ? parseFloat(costMatch[0]) : NaN;

        const remainingNums = afterPin.replace(costMatch ? costMatch[0] : "", "").match(/\d+/g) || [];
        if (remainingNums[0]) minDays = parseInt(remainingNums[0], 10) || 3;
        if (remainingNums[1]) maxDays = parseInt(remainingNums[1], 10) || 7;

        // Match state against loaded states list
        const matchedState = knownStatesList.find((st) => {
          const name = (st.name || st).toLowerCase();
          return beforePin.toLowerCase().startsWith(name);
        });

        if (matchedState) {
          state = matchedState.name || matchedState;
          district = beforePin.slice(state.length).trim().replace(/^[,-]/, "").trim();
        } else {
          const words = beforePin.split(/\s+/);
          state = words[0] || "";
          district = words.slice(1).join(" ") || "";
        }
        isMatched = true;
      }
    }

    if (!isMatched) {
      return {
        raw: trimmed,
        state_name: "",
        district_name: "",
        pincode: "",
        delivery_cost: 0,
        estimated_days_min: 3,
        estimated_days_max: 7,
        isValid: false,
        error: "Unrecognized format. Expected: State, District, 6-digit Pincode, Cost",
      };
    }

    const cleanPincode = String(pincode || "").trim();
    const isValidPin = /^\d{6}$/.test(cleanPincode);
    const isValidCost = !isNaN(cost) && cost >= 0;
    const hasState = Boolean(state && state.trim());
    const hasDistrict = Boolean(district && district.trim());

    let error = "";
    if (!hasState) error = "Missing State name";
    else if (!hasDistrict) error = "Missing District name";
    else if (!isValidPin) error = `Pincode must be 6 digits (${cleanPincode || "empty"})`;
    else if (!isValidCost) error = `Invalid delivery freight cost (${cost})`;

    return {
      raw: trimmed,
      state_name: (state || "").trim(),
      district_name: (district || "").trim(),
      pincode: cleanPincode,
      delivery_cost: isNaN(cost) ? 0 : cost,
      estimated_days_min: minDays,
      estimated_days_max: maxDays,
      isValid: !error,
      error,
    };
  };

  // Re-parse automatically when bulkText changes in "paste" mode
  useEffect(() => {
    if (bulkMode === "paste") {
      if (!bulkText.trim()) {
        setBulkParsedItems([]);
        return;
      }
      const lines = bulkText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const items = lines.map((l) => parseTextLine(l, states)).filter(Boolean);
      setBulkParsedItems(items);
    }
  }, [bulkText, bulkMode, states]);

  // Handle CSV / Excel File Upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setBulkFile(file);
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    try {
      if (isExcel) {
        const rows = await readXlsxFile(file);
        if (!rows || rows.length === 0) {
          dispatch(setAlert({ type: "warning", message: "The selected Excel sheet has no data." }));
          setBulkParsedItems([]);
          return;
        }

        let headerIdx = -1;
        let stateCol = 0;
        let districtCol = 1;
        let pinCol = 2;
        let costCol = 3;
        let minDaysCol = -1;
        let maxDaysCol = -1;

        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = (rows[i] || []).map((c) => String(c || "").toLowerCase().trim());
          const hasState = row.some((c) => c.includes("state"));
          const hasPin = row.some((c) => c.includes("pin") || c.includes("postal"));
          if (hasState || hasPin) {
            headerIdx = i;
            stateCol = row.findIndex((c) => c.includes("state"));
            districtCol = row.findIndex((c) => c.includes("dist"));
            pinCol = row.findIndex((c) => c.includes("pin") || c.includes("postal"));
            costCol = row.findIndex(
              (c) =>
                c.includes("cost") ||
                c.includes("rate") ||
                c.includes("freight") ||
                c.includes("price") ||
                c.includes("delivery")
            );
            minDaysCol = row.findIndex((c) => c.includes("min"));
            maxDaysCol = row.findIndex((c) => c.includes("max"));
            if (stateCol === -1) stateCol = 0;
            if (districtCol === -1) districtCol = 1;
            if (pinCol === -1) pinCol = 2;
            if (costCol === -1) costCol = 3;
            break;
          }
        }

        const dataRows = rows.slice(headerIdx + 1);
        const parsed = [];

        for (const r of dataRows) {
          if (!r || r.every((c) => c === null || c === undefined || c === "")) continue;

          const state = String(r[stateCol] || "").trim();
          const district = String(r[districtCol] || "").trim();
          const pincode = String(r[pinCol] || "").replace(/\D/g, "").trim();
          const rawCost = r[costCol];
          const cost = parseFloat(String(rawCost || "0").replace(/[^\d.]/g, ""));
          const minDays = minDaysCol !== -1 && r[minDaysCol] ? parseInt(r[minDaysCol], 10) || 3 : 3;
          const maxDays = maxDaysCol !== -1 && r[maxDaysCol] ? parseInt(r[maxDaysCol], 10) || 7 : 7;

          const isValidPin = /^\d{6}$/.test(pincode);
          const isValidCost = !isNaN(cost) && cost >= 0;
          let error = "";
          if (!state) error = "Missing State name";
          else if (!district) error = "Missing District name";
          else if (!isValidPin) error = `Pincode must be 6 digits (${pincode || "empty"})`;
          else if (!isValidCost) error = `Invalid delivery freight cost`;

          parsed.push({
            raw: `${state}, ${district}, ${pincode}, ${cost}`,
            state_name: state,
            district_name: district,
            pincode,
            delivery_cost: isNaN(cost) ? 0 : cost,
            estimated_days_min: minDays,
            estimated_days_max: maxDays,
            isValid: !error,
            error,
          });
        }

        setBulkParsedItems(parsed);
      } else {
        // CSV or plain text
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsed = lines.map((l) => parseTextLine(l, states)).filter(Boolean);
        setBulkParsedItems(parsed);
      }
    } catch (err) {
      console.error("File parse error:", err);
      dispatch(setAlert({ type: "error", message: `Failed to parse file: ${err.message}` }));
      setBulkParsedItems([]);
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = ["State", "District", "Pincode", "DeliveryCost", "EstimatedDaysMin", "EstimatedDaysMax"];
    const sampleRows = [
      headers.join(","),
      "Gujarat,Devbhoomi Dwarka,361320,1500,3,7",
      "Gujarat,Jamnagar,361001,1200,3,7",
      "Gujarat,Rajkot,360001,2500,3,7",
      "Gujarat,Patan,384265,15500,3,7",
      "Gujarat,Surat,395003,17500,3,7",
      "Gujarat,Vadodara,390001,14500,3,7",
      "Maharashtra,Pune,411001,1400,3,7",
      "Rajasthan,Jaipur,302001,1800,3,7",
    ];
    const blob = new Blob([sampleRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Solarkits_Pincode_Delivery_Rates_Template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export Current Configured Rates to CSV for Offline Editing & Re-uploading
  const handleExportCurrentRates = async () => {
    try {
      setIsExporting(true);
      const targetKitId =
        selectedKit && selectedKit !== "default"
          ? selectedKit._id || selectedKit.id
          : "default";

      const res = await axios.get(`${API_URL}/pincode-delivery-costs`, {
        params: {
          unique_id: moduleUniqueId,
          req_for: "view",
          combo_kit_id: targetKitId,
          is_export: "true",
          limit: 10000,
        },
        headers: authHeaderObj(),
      });

      const rates = res.data?.data || [];
      if (rates.length === 0) {
        dispatch(
          setAlert({
            type: "warning",
            message: "No pincode rates found to export for this selection.",
          })
        );
        return;
      }

      const headers = [
        "State",
        "District",
        "Pincode",
        "DeliveryCost",
        "EstimatedDaysMin",
        "EstimatedDaysMax",
        "IsActive",
        "Notes",
      ];
      const rows = [headers.join(",")];
      rates.forEach((r) => {
        const state = `"${(r.state_name || "").replace(/"/g, '""')}"`;
        const district = `"${(r.district_name || "").replace(/"/g, '""')}"`;
        const pin = r.pincode || "";
        const cost = r.delivery_cost ?? 0;
        const minDays = r.estimated_days_min ?? 3;
        const maxDays = r.estimated_days_max ?? 7;
        const active = r.is_active !== false ? "true" : "false";
        const notes = `"${(r.notes || "").replace(/"/g, '""')}"`;
        rows.push([state, district, pin, cost, minDays, maxDays, active, notes].join(","));
      });

      const kitLabel =
        selectedKit && selectedKit !== "default"
          ? selectedKit.name.replace(/[^a-zA-Z0-9_-]/g, "_")
          : "Default_Rates";

      const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Pincode_Rates_${kitLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      dispatch(
        setAlert({
          type: "success",
          message: `Exported ${rates.length} pincode rates to CSV!`,
        })
      );
    } catch (err) {
      console.error("Export error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: "Failed to export rates to CSV.",
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Valid and Invalid row counts
  const validCount = useMemo(
    () => bulkParsedItems.filter((i) => i.isValid).length,
    [bulkParsedItems]
  );
  const invalidCount = useMemo(
    () => bulkParsedItems.filter((i) => !i.isValid).length,
    [bulkParsedItems]
  );

  // Bulk Import & Update (Upsert)
  const handleBulkImport = async () => {
    const validItems = bulkParsedItems.filter((i) => i.isValid);

    if (validItems.length === 0) {
      dispatch(
        setAlert({
          type: "warning",
          message:
            "No valid rows found to import. Please check that each row contains State, District, a 6-digit Pincode, and Delivery Cost.",
        })
      );
      return;
    }

    const defaultKitId =
      selectedKit && selectedKit !== "default" ? selectedKit._id || selectedKit.id : null;

    const itemsToSend = validItems.map((item) => ({
      state_name: item.state_name,
      district_name: item.district_name,
      pincode: item.pincode,
      delivery_cost: Number(item.delivery_cost),
      estimated_days_min: item.estimated_days_min || 3,
      estimated_days_max: item.estimated_days_max || 7,
      combo_kit_id: defaultKitId,
      is_active: true,
    }));

    setBulkLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/pincode-delivery-costs/bulk-import?unique_id=${moduleUniqueId}&req_for=add`,
        { items: itemsToSend },
        { headers: authHeaderObj() }
      );

      const countMsg =
        res.data?.message || `Successfully processed and updated ${itemsToSend.length} pincodes!`;
      dispatch(
        setAlert({
          type: "success",
          message: countMsg,
        })
      );
      setShowBulkModal(false);
      setBulkText("");
      setBulkFile(null);
      setBulkParsedItems([]);
      fetchRecords(selectedKit);
      fetchKitStats();
    } catch (err) {
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to bulk import.",
        })
      );
    } finally {
      setBulkLoading(false);
    }
  };

  // Filtered kits based on kitSearchTerm
  const filteredKits = useMemo(() => {
    if (!kitSearchTerm.trim()) return comboKits;
    const term = kitSearchTerm.toLowerCase();
    return comboKits.filter(
      (k) =>
        k.name?.toLowerCase().includes(term) ||
        String(k.capacity || "").includes(term) ||
        k.description?.toLowerCase().includes(term)
    );
  }, [comboKits, kitSearchTerm]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Pincode Wise Delivery Cost Master"
        description="Configure product-specific and regional pincode freight rates across Indian states & districts for configured solar combo kits"
        meta={[
          { label: "Configured Kits", value: comboKits.length },
          { label: "Total Rates", value: meta.total },
          { label: "Active Pincodes", value: meta.distinctPincodesCount },
          { label: "Districts Covered", value: meta.distinctDistrictsCount },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCurrentRates}
              loading={isExporting}
              leftIcon={<FaFileCsv />}
              className="border-border text-text-secondary hover:bg-surface-hover"
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowBulkModal(true)}
              leftIcon={<FaFileImport />}
              className="border-border text-text-secondary hover:bg-surface-hover"
            >
              Bulk Import & Update
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleRefreshAll}
              leftIcon={<FaSync />}
              className="border-border text-text-secondary hover:bg-surface-hover"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* ──────────────────────────────────────────────────────────────────────────
          VIEW 1: SELECTED KIT PINCODE RATES MANAGER (Drill-down view)
          ────────────────────────────────────────────────────────────────────────── */}
      {selectedKit ? (
        <div className="space-y-6">
          {/* Back Button & Kit Banner */}
          <div className="bg-surface rounded-2xl border-2 border-border/80 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToKits}
                  leftIcon={<FaArrowLeft />}
                  className="shrink-0 border-border text-text-secondary hover:bg-surface-hover"
                >
                  All Combo Kits
                </Button>

                <div className="h-10 w-px bg-border/60 hidden sm:block" />

                {selectedKit === "default" ? (
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <FaTruck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          General Fallback Rate
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-text-primary mt-0.5">
                        All Products / General Delivery Rates
                      </h2>
                      <p className="text-xs text-text-secondary">
                        Applies to any customer order when no specific combo kit freight rule is configured
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border-2 border-border/70 overflow-hidden bg-surface-hover shrink-0">
                      <img
                        src={resolveImageUrl(selectedKit.kit_image)}
                        alt={selectedKit.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_KIT_IMAGE;
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <FaBolt size={9} />
                          {selectedKit.capacity || 0} kW Capacity
                        </span>
                        <span className="text-[10px] font-bold text-text-muted">
                          {kitStats[String(selectedKit._id || selectedKit.id)]?.total_pincodes || 0} Configured Pincodes
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-text-primary mt-0.5">
                        {selectedKit.name}
                      </h2>
                      <p className="text-xs text-text-secondary line-clamp-1">
                        {selectedKit.description || "Manage pincode delivery freight charges for this solar combo kit"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons inside this kit */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleExportCurrentRates}
                  loading={isExporting}
                  leftIcon={<FaFileCsv />}
                  className="border-border text-text-secondary hover:bg-surface-hover"
                >
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowBulkModal(true)}
                  leftIcon={<FaFileImport />}
                  className="border-border text-text-secondary hover:bg-surface-hover"
                >
                  Bulk Import & Update
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleOpenDistrictModal(selectedKit)}
                  leftIcon={<FaMapMarkerAlt />}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Apply District Rates
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => handleOpenAddForKit(selectedKit)}
                  leftIcon={<FaPlus />}
                >
                  Add Single PIN Rate
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Toolbar for this Kit */}
          <div className="bg-surface rounded-2xl border-2 border-border/60 p-5 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* Search PIN / City */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                  Search PIN / City
                </label>
                <div className="relative w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                    <FaSearch size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 361320 or Dwarka"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>
              </div>

              {/* State Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                  State
                </label>
                <DropdownWithSearchInput
                  options={[
                    { text: "All States", label: "All States", value: "" },
                    ...states.map((s) => ({ text: s.name, label: s.name, value: s.name })),
                  ]}
                  value={filterState}
                  onChange={(val) => {
                    setFilterState(val);
                    setFilterDistrict("");
                    setCurrentPage(1);
                  }}
                  placeholder="All States"
                />
              </div>

              {/* District Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                  District
                </label>
                <DropdownWithSearchInput
                  options={[
                    { text: "All Districts", label: "All Districts", value: "" },
                    ...districts.map((d) => ({ text: d.name, label: d.name, value: d.name })),
                  ]}
                  value={filterDistrict}
                  onChange={(val) => {
                    setFilterDistrict(val);
                    setCurrentPage(1);
                  }}
                  placeholder="All Districts"
                  disabled={!filterState}
                />
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="md" className="flex-1">
                  Filter
                </Button>
                <Button type="button" variant="secondary" size="md" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Table of Pincode Rates for this Kit */}
          <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-black text-text-primary uppercase tracking-wider">
                  Configured Pincode Delivery Rates for{" "}
                  {selectedKit === "default" ? "All Products" : selectedKit.name}
                </span>
              </div>
              <span className="text-[11px] font-bold text-text-secondary bg-surface px-3 py-1 rounded-full border border-border">
                Total {meta.total || items.length} Record{meta.total === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-hover/60 border-b border-border text-[11px] font-black uppercase tracking-wider text-text-secondary">
                    <th className="px-6 py-4">State & District</th>
                    <th className="px-6 py-4">PIN Code</th>
                    <th className="px-5 py-4">Fulfillment Hub</th>
                    <th className="px-5 py-4">Loose Rate</th>
                    <th className="px-5 py-4">Bulk PO Rate</th>
                    <th className="px-5 py-4">Trial Kit Rate</th>
                    <th className="px-6 py-4">Est. Transit</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-9 w-9 border-3 border-primary border-t-transparent" />
                          <p className="text-xs font-bold text-text-secondary">
                            Loading pincode delivery freight rates...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : items.length > 0 ? (
                    items.map((item) => (
                      <tr
                        key={item._id || item.id}
                        className="hover:bg-primary/5 transition-colors group"
                      >
                        {/* State & District */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FaMapMarkerAlt size={11} />
                            </span>
                            <div>
                              <p className="font-black text-text-primary text-xs uppercase tracking-wide">
                                {item.state_name}
                              </p>
                              <p className="text-[11px] font-semibold text-text-secondary">
                                {item.district_name || "All Districts"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* PIN Code */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-black text-primary px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20">
                            {item.pincode}
                          </span>
                        </td>

                        {/* Fulfillment Hub */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {item.warehouse_name ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-xs text-text-primary flex items-center gap-1">
                                <FaWarehouse className="text-primary text-[10px]" />
                                {item.warehouse_name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                  {item.warehouse_code}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  item.pricing_mode === 'per_km'
                                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                    : 'bg-surface-hover text-text-muted border border-border'
                                }`}>
                                  {item.pricing_mode === 'per_km' ? `KM (~ ${item.distance_km || 0} km)` : 'Fixed Rate'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-text-muted text-[11px] italic">Default Route</span>
                          )}
                        </td>

                        {/* Loose Rate */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            ₹{Number(item.loose_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* PO Rate */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-black text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                            ₹{Number(item.po_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Trial Rate */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-black text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                            ₹{Number(item.trial_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Est Transit */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-text-secondary font-semibold">
                            <FaClock size={11} className="text-text-muted" />
                            <span>
                              {item.estimated_days_min || 3} - {item.estimated_days_max || 7} Days
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              item.is_active !== false
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.is_active !== false ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {item.is_active !== false ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <IconButton
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Rate"
                            >
                              <FaEdit size={12} />
                            </IconButton>
                            <IconButton
                              variant="danger"
                              size="sm"
                              onClick={() => setDeleteConfirm(item)}
                              title="Delete Rule"
                            >
                              <FaTrash size={12} />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted">
                            <FaTruck size={24} className="opacity-40" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-text-primary">
                              No Pincode Rates Configured for this Kit
                            </h4>
                            <p className="text-xs text-text-secondary mt-1">
                              Configure pincode delivery freight charges for {selectedKit === "default" ? "general products" : selectedKit.name} to accurately calculate shipping costs during checkout.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<FaPlus />}
                              onClick={() => handleOpenAddForKit(selectedKit)}
                            >
                              Add Delivery Freight
                            </Button>
                            {searchTerm && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleResetFilters}
                              >
                                Reset Filters
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between">
                <p className="text-xs text-text-secondary font-medium">
                  Showing page {currentPage} of {meta.totalPages} ({meta.total} total rules)
                </p>
                <Pagination
                  currentPage={currentPage}
                  totalPages={meta.totalPages}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ──────────────────────────────────────────────────────────────────────────
           VIEW 2: CONFIGURED COMBO KITS (CARDS FORMAT) - MAIN PAGE
           ────────────────────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Subheader Toolbar & Mode Switcher */}
          <div className="bg-surface rounded-2xl border-2 border-border/70 p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
                <FaLayerGroup size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">
                    Configured Combo Kits
                  </h3>
                  <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    {filteredKits.length} Kits Available
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Click on any combo kit below to view and add pincode-wise delivery freight charges
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search combo kit cards */}
              <div className="relative min-w-56 flex-1 sm:flex-initial">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                  <FaSearch size={12} />
                </span>
                <input
                  type="text"
                  placeholder="Search kit by name, kW..."
                  value={kitSearchTerm}
                  onChange={(e) => setKitSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              {/* Apply District Rates Global Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenDistrictModal(null)}
                leftIcon={<FaMapMarkerAlt />}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs h-10 px-4 text-xs font-black"
              >
                Apply District Rates
              </Button>

              {/* Switch View (Cards vs Master Table) */}
              <div className="flex items-center bg-surface-hover/80 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "cards"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  title="Card Grid View"
                >
                  <FaThLarge size={12} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === "table"
                      ? "bg-surface text-primary shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                  title="Master Table View"
                >
                  <FaTable size={12} />
                  <span>Master Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* If ViewMode is Table, show full Master Table across all products */}
          {viewMode === "table" ? (
            <div className="space-y-6">
              {/* FILTER TOOLBAR */}
              <div className="bg-surface rounded-2xl border-2 border-border/60 p-6 shadow-sm">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                      Search PIN / City
                    </label>
                    <div className="relative w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
                        <FaSearch size={12} />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. 361320 or Dwarka"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-9 pr-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary placeholder:text-text-muted outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                      State
                    </label>
                    <DropdownWithSearchInput
                      options={[
                        { text: "All States", label: "All States", value: "" },
                        ...states.map((s) => ({ text: s.name, label: s.name, value: s.name })),
                      ]}
                      value={filterState}
                      onChange={(val) => {
                        setFilterState(val);
                        setFilterDistrict("");
                        setCurrentPage(1);
                      }}
                      placeholder="All States"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                      District
                    </label>
                    <DropdownWithSearchInput
                      options={[
                        { text: "All Districts", label: "All Districts", value: "" },
                        ...districts.map((d) => ({ text: d.name, label: d.name, value: d.name })),
                      ]}
                      value={filterDistrict}
                      onChange={(val) => {
                        setFilterDistrict(val);
                        setCurrentPage(1);
                      }}
                      placeholder="All Districts"
                      disabled={!filterState}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                      Product / Kit
                    </label>
                    <DropdownWithSearchInput
                      options={[
                        { text: "All Products / Defaults", label: "All Products / Defaults", value: "" },
                        { text: "General Pincode Rate (No Specific Kit)", label: "General Pincode Rate (No Specific Kit)", value: "default" },
                        ...comboKits.map((k) => ({
                          text: `${k.name} (${k.capacity || 0}kW)`,
                          label: `${k.name} (${k.capacity || 0}kW)`,
                          value: k._id || k.id,
                        })),
                      ]}
                      value={filterKit}
                      onChange={(val) => {
                        setFilterKit(val);
                        setCurrentPage(1);
                      }}
                      placeholder="Filter by Product"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="md" className="flex-1">
                      Filter
                    </Button>
                    <Button type="button" variant="secondary" size="md" onClick={handleResetFilters}>
                      Reset
                    </Button>
                  </div>
                </form>
              </div>

              {/* Master Table */}
              <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-black text-text-primary uppercase tracking-wider">
                      All Configured Pincode Delivery Rates
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary bg-surface px-3 py-1 rounded-full border border-border">
                    Total {meta.total || items.length} Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-surface-hover/60 border-b border-border text-[11px] font-black uppercase tracking-wider text-text-secondary">
                        <th className="px-6 py-4">State & District</th>
                        <th className="px-6 py-4">PIN Code</th>
                        <th className="px-6 py-4">Applicable Product / Kit</th>
                        <th className="px-5 py-4">Fulfillment Hub</th>
                        <th className="px-5 py-4">Loose Rate</th>
                        <th className="px-5 py-4">Bulk PO Rate</th>
                        <th className="px-5 py-4">Trial Kit Rate</th>
                        <th className="px-6 py-4">Est. Transit</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="animate-spin rounded-full h-9 w-9 border-3 border-primary border-t-transparent" />
                              <p className="text-xs font-bold text-text-secondary">
                                Loading delivery freight configurations...
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : items.length > 0 ? (
                        items.map((item) => (
                          <tr
                            key={item._id || item.id}
                            className="hover:bg-primary/5 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                  <FaMapMarkerAlt size={11} />
                                </span>
                                <div>
                                  <p className="font-black text-text-primary text-xs uppercase tracking-wide">
                                    {item.state_name}
                                  </p>
                                  <p className="text-[11px] font-semibold text-text-secondary">
                                    {item.district_name || "All Districts"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-black text-primary px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20">
                                {item.pincode}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              {item.combo_kit_id || item.combo_kit_name ? (
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                    <FaBoxOpen size={11} />
                                  </span>
                                  <div>
                                    <p className="text-xs font-bold text-text-primary line-clamp-1">
                                      {typeof item.combo_kit_id === "object" && item.combo_kit_id?.name
                                        ? item.combo_kit_id.name
                                        : item.combo_kit_name || "Specific Kit"}
                                    </p>
                                    {typeof item.combo_kit_id === "object" && item.combo_kit_id?.capacity && (
                                      <span className="text-[10px] text-text-muted font-bold">
                                        Capacity: {item.combo_kit_id.capacity} kW
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-hover px-2.5 py-1 rounded-md border border-border">
                                  All Products (Default Rate)
                                </span>
                              )}
                            </td>

                            {/* Fulfillment Hub */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              {item.warehouse_name ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-xs text-text-primary flex items-center gap-1">
                                    <FaWarehouse className="text-primary text-[10px]" />
                                    {item.warehouse_name}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                      {item.warehouse_code}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                      item.pricing_mode === 'per_km'
                                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                                        : 'bg-surface-hover text-text-muted border border-border'
                                    }`}>
                                      {item.pricing_mode === 'per_km' ? `KM (~ ${item.distance_km || 0} km)` : 'Fixed Rate'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-text-muted text-[11px] italic">Default Route</span>
                              )}
                            </td>

                            {/* Loose Rate */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                ₹{Number(item.loose_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                              </span>
                            </td>

                            {/* PO Rate */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="font-black text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                                ₹{Number(item.po_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                              </span>
                            </td>

                            {/* Trial Rate */}
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="font-black text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                                ₹{Number(item.trial_delivery_cost ?? item.delivery_cost ?? 0).toLocaleString("en-IN")}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-text-secondary font-semibold">
                                <FaClock size={11} className="text-text-muted" />
                                <span>
                                  {item.estimated_days_min || 3} - {item.estimated_days_max || 7} Days
                                </span>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                  item.is_active !== false
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.is_active !== false ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {item.is_active !== false ? "Active" : "Inactive"}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <IconButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenEdit(item)}
                                  title="Edit Rate"
                                >
                                  <FaEdit size={12} />
                                </IconButton>
                                <IconButton
                                  variant="danger"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(item)}
                                  title="Delete Rule"
                                >
                                  <FaTrash size={12} />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="px-6 py-16 text-center">
                            <p className="text-xs font-bold text-text-secondary">
                              No delivery cost records found.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {meta.totalPages > 1 && (
                  <div className="p-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-text-secondary font-medium">
                      Showing page {currentPage} of {meta.totalPages} ({meta.total} total rules)
                    </p>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={meta.totalPages}
                      onPageChange={(p) => setCurrentPage(p)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CARDS GRID VIEW */
            <div className="space-y-6">
              {kitsLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent" />
                  <p className="text-xs font-bold text-text-secondary">
                    Loading configured combo kits...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* SPECIAL CARD: Default / Fallback Rate for All Products */}
                  <div
                    onClick={() => handleSelectKit("default")}
                    className="group bg-surface rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-primary group-hover:text-white transition-colors">
                          <FaTruck size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Fallback Rate
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-text-primary group-hover:text-primary transition-colors">
                          All Products (Default Pincode Rates)
                        </h4>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          Standard pincode freight applied when an ordered combo kit does not have an explicit rate rule.
                        </p>
                      </div>

                      {/* Stats box */}
                      <div className="p-3 bg-surface-hover/70 rounded-xl border border-border flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            Configured Pincodes
                          </p>
                          <p className="text-sm font-black text-text-primary">
                            {kitStats["default"]?.total_pincodes || 0} Pincodes
                          </p>
                        </div>
                        {kitStats["default"]?.total_pincodes > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                              Freight Range
                            </p>
                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                              ₹{kitStats["default"]?.min_cost?.toLocaleString("en-IN")} - ₹{kitStats["default"]?.max_cost?.toLocaleString("en-IN")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-border flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectKit("default");
                        }}
                      >
                        Manage Rates
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FaPlus />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddForKit("default");
                        }}
                      >
                        Add Rate
                      </Button>
                    </div>
                  </div>

                  {/* CONFIGURED COMBO KIT CARDS */}
                  {filteredKits.map((kit) => {
                    const kitId = String(kit._id || kit.id);
                    const stats = kitStats[kitId] || { total_pincodes: 0, min_cost: 0, max_cost: 0, active_count: 0 };
                    const hasRates = stats.total_pincodes > 0;

                    return (
                      <div
                        key={kitId}
                        onClick={() => handleSelectKit(kit)}
                        className="group bg-surface rounded-2xl border-2 border-border/80 hover:border-primary/60 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                      >
                        {/* Cover Image with Badges */}
                        <div className="relative h-44 w-full bg-surface-hover overflow-hidden">
                          <img
                            src={resolveImageUrl(kit.kit_image)}
                            alt={kit.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = DEFAULT_KIT_IMAGE;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                          {/* Capacity Pill (Top Left) */}
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-amber-300 border border-amber-300/30 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm">
                            <FaBolt size={10} className="text-amber-400" />
                            <span>{kit.capacity || 0} kW</span>
                          </div>

                          {/* Pincode Configuration Status Badge (Top Right) */}
                          <div className="absolute top-3 right-3">
                            {hasRates ? (
                              <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-emerald-400/40">
                                <FaCheck size={9} />
                                {stats.total_pincodes} Pincode{stats.total_pincodes === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm border border-amber-400/40">
                                <FaExclamationTriangle size={9} />
                                No Rates Set
                              </span>
                            )}
                          </div>

                          {/* Kit Title at bottom of cover */}
                          <div className="absolute bottom-3 left-3 right-3">
                            <h4 className="text-sm font-black text-white line-clamp-1 drop-shadow-sm group-hover:text-primary-light transition-colors">
                              {kit.name}
                            </h4>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                              <span className="px-2 py-0.5 rounded-md bg-surface-hover border border-border">
                                {kit.base_components?.length || 0} Base Modules
                              </span>
                              <span>•</span>
                              <span className="px-2 py-0.5 rounded-md bg-surface-hover border border-border">
                                {kit.bos_kits?.length || 0} BOS Kits
                              </span>
                            </div>

                            {/* Freight Rate Metric Box */}
                            <div className="p-3 bg-surface-hover/60 rounded-xl border border-border/80 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Delivery Freight
                                </p>
                                {hasRates ? (
                                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                    {stats.min_cost === stats.max_cost
                                      ? `₹${stats.min_cost.toLocaleString("en-IN")}`
                                      : `₹${stats.min_cost.toLocaleString("en-IN")} - ₹${stats.max_cost.toLocaleString("en-IN")}`}
                                  </p>
                                ) : (
                                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                    Not Configured
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                  Coverage
                                </p>
                                <p className="text-xs font-black text-text-primary">
                                  {hasRates ? `${stats.active_count} Active Routes` : "0 Routes"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-border flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectKit(kit);
                              }}
                            >
                              Manage Pincodes ({stats.total_pincodes})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              title="Apply uniform rate for entire district"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDistrictModal(kit);
                              }}
                              className="text-indigo-600 border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs px-2.5 font-bold"
                            >
                              + District
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<FaPlus />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddForKit(kit);
                              }}
                            >
                              Add Rate
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredKits.length === 0 && !kitsLoading && (
                <div className="py-16 text-center bg-surface rounded-2xl border-2 border-border/60">
                  <div className="w-14 h-14 rounded-2xl bg-surface-hover flex items-center justify-center text-text-muted mx-auto mb-3">
                    <FaBoxOpen size={24} className="opacity-40" />
                  </div>
                  <h4 className="font-black text-sm text-text-primary">
                    No Combo Kits Found
                  </h4>
                  <p className="text-xs text-text-secondary mt-1">
                    No combo kits matching &quot;{kitSearchTerm}&quot;. Try resetting your search.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => setKitSearchTerm("")}
                  >
                    Clear Search
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          APPLY DISTRICT / STATE RATES MODAL (AUTO PINCODE FETCH & UNIFORM PRICING)
          ────────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showDistrictModal}
        onClose={() => setShowDistrictModal(false)}
        title={
          districtFormData.combo_kit_id
            ? `Apply District Delivery Rates for ${districtFormData.combo_kit_name || "Selected Kit"}`
            : "Apply Uniform District Delivery Rates (All Products / Fallback)"
        }
        size="lg"
      >
        <form onSubmit={handleSaveDistrictRates} className="space-y-5 p-1 max-h-[80vh] overflow-y-auto pr-1">
          {/* Explanation Banner */}
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <FaMapMarkerAlt size={20} />
            </div>
            <div className="text-xs">
              <p className="font-black text-text-primary text-sm">
                District-Wise Uniform Pincode Rate Configuration
              </p>
              <p className="text-text-secondary mt-1 leading-relaxed">
                Select a State and District. All PIN codes belonging to the chosen district(s) are automatically fetched from the system's Geolocation master. Set one uniform delivery freight for Loose, PO, and Trial orders across all pincodes at once.
              </p>
            </div>
          </div>

          {/* Applicable Product / Combo Kit */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
              Target Product / Combo Kit
            </label>
            <DropdownWithSearchInput
              options={[
                { text: "All Products (General / Fallback Rate)", label: "All Products (General / Fallback Rate)", value: "" },
                ...comboKits.map((k) => ({
                  text: `${k.name} (${k.capacity || 0}kW)`,
                  label: `${k.name} (${k.capacity || 0}kW)`,
                  value: k._id || k.id,
                })),
              ]}
              value={districtFormData.combo_kit_id}
              onChange={(val) => {
                const kObj = comboKits.find((k) => (k._id || k.id) === val);
                setDistrictFormData((prev) => ({
                  ...prev,
                  combo_kit_id: val,
                  combo_kit_name: kObj ? kObj.name : "All Products (General / Fallback Rate)",
                }));
              }}
              placeholder="All Products (General Fallback)"
            />
          </div>

          {/* Fulfillment Warehouse Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <FaWarehouse className="text-primary" /> Fulfillment Warehouse / Hub <span className="text-rose-500">*</span>
              </label>
              {districtFormData.warehouse_code && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {districtFormData.warehouse_type === "master" ? "Master Central Hub" : "Regional Sub-Depot"}
                </span>
              )}
            </div>
            <DropdownWithSearchInput
              options={warehouses.map((w) => ({
                text: `${w.warehouse_name} [${w.warehouse_code}] - ${w.cluster_name}`,
                label: `${w.warehouse_name} [${w.warehouse_code}] - ${w.cluster_name}`,
                value: w.warehouse_code,
              }))}
              value={districtFormData.warehouse_code}
              onChange={(val) => {
                const wh = warehouses.find((w) => w.warehouse_code === val);
                if (wh) {
                  setDistrictFormData((prev) => {
                    const whStates = wh.states || [];
                    return {
                      ...prev,
                      warehouse_id: wh.warehouse_id || wh.id,
                      warehouse_code: wh.warehouse_code,
                      warehouse_name: wh.warehouse_name,
                      warehouse_type: wh.warehouse_type,
                      warehouse_lat: wh.lat,
                      warehouse_lng: wh.lng,
                      selected_states: [...whStates],
                      state_name: whStates[0] || "",
                      state_id: "",
                      selected_district_ids: [],
                      apply_to_all_districts: true,
                    };
                  });
                }
              }}
              placeholder="Select Dispatch Warehouse (e.g. Ahmedabad Sub-Depot, Bhiwandi, Bengaluru...)"
            />
            {districtFormData.warehouse_name && (
              <p className="text-[10px] text-text-muted">
                Assigned States for this Hub:{" "}
                <strong className="text-text-primary">
                  {warehouses.find((w) => w.warehouse_code === districtFormData.warehouse_code)?.states?.join(", ") || "Pan-India"}
                </strong>
              </p>
            )}
          </div>

          {/* Target Fulfillment States (Multi-select with Auto-Select of Warehouse Mapped States) */}
          <div className="space-y-2.5 p-3.5 bg-surface-hover/50 rounded-2xl border-2 border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <FaMapMarkerAlt className="text-primary" /> Fulfillment States <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {(districtFormData.selected_states || []).length} States Selected
                </span>
              </div>

              {/* Quick Actions: Select All Mapped / Clear */}
              <div className="flex items-center gap-2 text-xs">
                {currentWarehouseMappedStates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDistrictFormData((prev) => ({
                        ...prev,
                        selected_states: [...currentWarehouseMappedStates],
                        state_name: currentWarehouseMappedStates[0] || "",
                        selected_district_ids: [],
                        apply_to_all_districts: true,
                      }));
                    }}
                    className="text-[11px] font-black text-primary hover:underline flex items-center gap-1"
                  >
                    <FaCheck size={10} /> Select All Mapped ({currentWarehouseMappedStates.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDistrictFormData((prev) => ({
                      ...prev,
                      selected_states: [],
                      state_name: "",
                      selected_district_ids: [],
                      apply_to_all_districts: false,
                    }));
                  }}
                  className="text-[11px] font-bold text-text-muted hover:text-rose-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Interactive State Badges: Mapped Hub States */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentWarehouseMappedStates.map((stName) => {
                const isSelected = (districtFormData.selected_states || []).some(
                  (s) => s.toLowerCase() === stName.toLowerCase()
                );
                return (
                  <button
                    key={stName}
                    type="button"
                    onClick={() => {
                      setDistrictFormData((prev) => {
                        const cur = prev.selected_states || [];
                        const exists = cur.some((s) => s.toLowerCase() === stName.toLowerCase());
                        const updated = exists
                          ? cur.filter((s) => s.toLowerCase() !== stName.toLowerCase())
                          : [...cur, stName];
                        return {
                          ...prev,
                          selected_states: updated,
                          state_name: updated[0] || "",
                          selected_district_ids: [],
                        };
                      });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-surface hover:bg-surface-hover text-text-secondary border-border"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isSelected ? "bg-white/20 text-white" : "border border-border text-text-muted"
                      }`}
                    >
                      {isSelected ? "✓" : "+"}
                    </span>
                    <span>{stName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary font-bold"
                      }`}
                    >
                      Hub Mapped
                    </span>
                  </button>
                );
              })}

              {/* Extra States added manually */}
              {(districtFormData.selected_states || [])
                .filter(
                  (st) =>
                    !currentWarehouseMappedStates.some((m) => m.toLowerCase() === st.toLowerCase())
                )
                .map((extraSt) => (
                  <span
                    key={extraSt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white border border-indigo-700 text-xs font-black shadow-xs"
                  >
                    <span>✓ {extraSt}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDistrictFormData((prev) => ({
                          ...prev,
                          selected_states: (prev.selected_states || []).filter((s) => s !== extraSt),
                          selected_district_ids: [],
                        }));
                      }}
                      className="hover:text-rose-200 ml-1 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>

            {/* Quick Dropdown to Add Additional States */}
            <div className="pt-1.5">
              <DropdownWithSearchInput
                options={states
                  .filter(
                    (s) =>
                      !(districtFormData.selected_states || []).some(
                        (sel) => sel.toLowerCase() === s.name.toLowerCase()
                      )
                  )
                  .map((s) => ({
                    text: `+ Add ${s.name}`,
                    label: `+ Add ${s.name}`,
                    value: s.name,
                    id: s._id || s.id,
                  }))}
                value=""
                onChange={(val) => {
                  if (!val) return;
                  setDistrictFormData((prev) => {
                    const cur = prev.selected_states || [];
                    if (cur.some((s) => s.toLowerCase() === val.toLowerCase())) return prev;
                    return {
                      ...prev,
                      selected_states: [...cur, val],
                      state_name: prev.state_name || val,
                      selected_district_ids: [],
                    };
                  });
                }}
                placeholder="+ Add other states to this route..."
              />
            </div>
          </div>

          {/* District Selection Options */}
          {(districtFormData.selected_states?.length > 0 || districtFormData.state_name) && (
            <div className="p-4 bg-surface-hover/40 border-2 border-border/70 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-text-primary">
                    District Selection Scope
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Apply to all districts across {(districtFormData.selected_states || [districtFormData.state_name]).join(", ")} or choose specific districts
                  </p>
                </div>

                {/* All Districts Toggle */}
                <label className="flex items-center gap-2 cursor-pointer bg-surface px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-text-primary">
                  <input
                    type="checkbox"
                    checked={districtFormData.apply_to_all_districts}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDistrictFormData((prev) => ({
                        ...prev,
                        apply_to_all_districts: checked,
                        selected_district_ids: checked ? districtModalDistricts.map((d) => d._id || d.id) : [],
                      }));
                    }}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>All Districts in Selected States ({(districtFormData.selected_states || [districtFormData.state_name]).length} States)</span>
                </label>
              </div>

              {districtModalFetchingDistricts ? (
                <div className="py-6 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span>Loading districts and postal pincodes...</span>
                </div>
              ) : !districtFormData.apply_to_all_districts ? (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-text-secondary">
                    Select Specific District(s):
                  </label>
                  <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-surface rounded-xl border border-border">
                    {districtModalDistricts.map((d) => {
                      const dId = d._id || d.id;
                      const isSelected = districtFormData.selected_district_ids.includes(dId);
                      const pinCount = d.pincodes?.length || d.pincodes_count || 0;

                      return (
                        <label
                          key={dId}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary/40 text-primary font-black"
                              : "bg-surface hover:bg-surface-hover border-border text-text-primary font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDistrictFormData((prev) => {
                                  const cur = prev.selected_district_ids || [];
                                  const updated = checked ? [...cur, dId] : cur.filter((id) => id !== dId);
                                  return { ...prev, selected_district_ids: updated };
                                });
                              }}
                              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            <span className="truncate">{d.name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover font-mono font-bold text-text-secondary shrink-0">
                            {pinCount} PINs
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Detected Pincodes Pill */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-600" />
                  <span>
                    Detected Pincodes in Selection:
                  </span>
                </div>
                <span className="font-mono text-sm font-black bg-emerald-500/20 px-2.5 py-0.5 rounded-md">
                  {detectedPincodeCount} PIN Codes
                </span>
              </div>
            </div>
          )}

          {/* Delivery Pricing Calculation Mode Switcher */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <FaRupeeSign className="text-primary" /> Delivery Pricing Mode
              </label>

              {/* Toggle: Fixed vs KM-Wise */}
              <div className="flex items-center bg-surface-hover p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setDistrictFormData((prev) => ({ ...prev, pricing_mode: "fixed" }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    districtFormData.pricing_mode === "fixed"
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Fixed Price (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setDistrictFormData((prev) => ({ ...prev, pricing_mode: "per_km" }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    districtFormData.pricing_mode === "per_km"
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <FaRoad size={11} /> Kilometer (KM) Wise
                </button>
              </div>
            </div>

            {/* Mode 1: Fixed Flat Rate Inputs */}
            {districtFormData.pricing_mode === "fixed" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Loose Order */}
                <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <FaBoxOpen size={11} /> Loose Order
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                      Standard
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={districtFormData.loose_delivery_cost}
                      onChange={(e) => setDistrictFormData((prev) => ({ ...prev, loose_delivery_cost: e.target.value }))}
                      placeholder="e.g. 1500"
                      className="w-full h-10 pl-7 pr-3 bg-surface border-2 border-border focus:border-emerald-500 rounded-lg text-sm font-black text-text-primary outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Applied to single / loose kit orders
                  </p>
                </div>

                {/* Bulk PO Order */}
                <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                      <FaFileAlt size={11} /> Bulk PO Order
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-700 font-bold">
                      Bulk
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={districtFormData.po_delivery_cost}
                      onChange={(e) => setDistrictFormData((prev) => ({ ...prev, po_delivery_cost: e.target.value }))}
                      placeholder="e.g. 800"
                      className="w-full h-10 pl-7 pr-3 bg-surface border-2 border-border focus:border-indigo-500 rounded-lg text-sm font-black text-text-primary outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Applied to bulk Purchase Orders
                  </p>
                </div>

                {/* Trial Kit Order */}
                <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <FaBolt size={11} /> Trial Kit Order
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-bold">
                      Trial
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={districtFormData.trial_delivery_cost}
                      onChange={(e) => setDistrictFormData((prev) => ({ ...prev, trial_delivery_cost: e.target.value }))}
                      placeholder="e.g. 1200"
                      className="w-full h-10 pl-7 pr-3 bg-surface border-2 border-border focus:border-amber-500 rounded-lg text-sm font-black text-text-primary outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Applied in Trial Order Modal (Image 3)
                  </p>
                </div>
              </div>
            ) : (
              /* Mode 2: Kilometer (KM) Wise Rate Inputs & Live Preview */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Base Freight */}
                  <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1">
                    <label className="text-[11px] font-black uppercase text-text-secondary">
                      Base Freight (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={districtFormData.base_delivery_cost}
                        onChange={(e) => setDistrictFormData((prev) => ({ ...prev, base_delivery_cost: e.target.value }))}
                        placeholder="0"
                        className="w-full h-9 pl-6 pr-2 bg-surface border-2 border-border focus:border-primary rounded-lg text-xs font-black text-text-primary outline-none"
                      />
                    </div>
                    <p className="text-[9px] text-text-muted">Minimum fixed charge</p>
                  </div>

                  {/* Loose Rate per KM */}
                  <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1">
                    <label className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                      Loose (₹ / KM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={districtFormData.rate_per_km_loose}
                        onChange={(e) => setDistrictFormData((prev) => ({ ...prev, rate_per_km_loose: e.target.value }))}
                        placeholder="15"
                        className="w-full h-9 pl-6 pr-2 bg-surface border-2 border-border focus:border-emerald-500 rounded-lg text-xs font-black text-text-primary outline-none"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-text-muted">Per KM rate for loose</p>
                  </div>

                  {/* Bulk PO Rate per KM */}
                  <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1">
                    <label className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-400">
                      Bulk PO (₹ / KM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={districtFormData.rate_per_km_po}
                        onChange={(e) => setDistrictFormData((prev) => ({ ...prev, rate_per_km_po: e.target.value }))}
                        placeholder="10"
                        className="w-full h-9 pl-6 pr-2 bg-surface border-2 border-border focus:border-indigo-500 rounded-lg text-xs font-black text-text-primary outline-none"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-text-muted">Per KM rate for PO</p>
                  </div>

                  {/* Trial Kit Rate per KM */}
                  <div className="p-3 bg-surface-hover/50 rounded-xl border-2 border-border/80 space-y-1">
                    <label className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400">
                      Trial Kit (₹ / KM)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-xs">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={districtFormData.rate_per_km_trial}
                        onChange={(e) => setDistrictFormData((prev) => ({ ...prev, rate_per_km_trial: e.target.value }))}
                        placeholder="12"
                        className="w-full h-9 pl-6 pr-2 bg-surface border-2 border-border focus:border-amber-500 rounded-lg text-xs font-black text-text-primary outline-none"
                        required
                      />
                    </div>
                    <p className="text-[9px] text-text-muted">Per KM rate for Trial</p>
                  </div>
                </div>

                {/* Live Distance & Price Calculation Card */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-indigo-500/30 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <FaCalculator /> Live Distance & Rate Calculation Preview
                    </span>
                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-800 dark:text-indigo-200">
                      ~{activePreviewDistance} KM Aerial Distance
                    </span>
                  </div>

                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Dispatch: <strong className="text-text-primary">{districtFormData.warehouse_name || "Primary Warehouse Hub"}</strong> ➔ Destination: <strong className="text-text-primary">{districtModalDistricts.find((d) => (districtFormData.selected_district_ids || []).includes(d._id || d.id))?.name || districtFormData.state_name || "Selected District"}</strong>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-500/20">
                    <div className="bg-surface/90 p-2.5 rounded-xl border border-border text-center shadow-xs">
                      <span className="text-[10px] text-text-muted font-black uppercase block">Loose Order Freight</span>
                      <span className="text-base font-black text-emerald-600 block mt-0.5">
                        ₹{livePreviewPrices.loose.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] text-text-muted block">
                        Base ₹{districtFormData.base_delivery_cost || 0} + ({activePreviewDistance}km × ₹{districtFormData.rate_per_km_loose}/km)
                      </span>
                    </div>

                    <div className="bg-surface/90 p-2.5 rounded-xl border border-border text-center shadow-xs">
                      <span className="text-[10px] text-text-muted font-black uppercase block">Bulk PO Order Freight</span>
                      <span className="text-base font-black text-indigo-600 block mt-0.5">
                        ₹{livePreviewPrices.po.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] text-text-muted block">
                        Base ₹{districtFormData.base_delivery_cost || 0} + ({activePreviewDistance}km × ₹{districtFormData.rate_per_km_po}/km)
                      </span>
                    </div>

                    <div className="bg-surface/90 p-2.5 rounded-xl border border-border text-center shadow-xs">
                      <span className="text-[10px] text-text-muted font-black uppercase block">Trial Kit Order Freight</span>
                      <span className="text-base font-black text-amber-600 block mt-0.5">
                        ₹{livePreviewPrices.trial.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[9px] text-text-muted block">
                        Base ₹{districtFormData.base_delivery_cost || 0} + ({activePreviewDistance}km × ₹{districtFormData.rate_per_km_trial}/km)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transit Days & Route Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary">Min Transit Days</label>
              <input
                type="number"
                min="1"
                max="30"
                value={districtFormData.estimated_days_min}
                onChange={(e) => setDistrictFormData((prev) => ({ ...prev, estimated_days_min: e.target.value }))}
                className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary">Max Transit Days</label>
              <input
                type="number"
                min="1"
                max="60"
                value={districtFormData.estimated_days_max}
                onChange={(e) => setDistrictFormData((prev) => ({ ...prev, estimated_days_max: e.target.value }))}
                className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary outline-none"
              />
            </div>

            <div className="pt-4 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(districtFormData.is_active)}
                  onChange={(e) => setDistrictFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-bold text-text-primary">
                {districtFormData.is_active ? "Active Routes" : "Disabled Routes"}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">Logistics Notes</label>
            <input
              type="text"
              value={districtFormData.notes}
              onChange={(e) => setDistrictFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Uniform dispatch from Regional Central Hub"
              className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs text-text-primary outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setShowDistrictModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={districtModalLoading}
              leftIcon={<FaCheck />}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Apply Uniform Rates ({detectedPincodeCount} PIN Codes)
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────────────
          ADD / EDIT MODAL
          ────────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Delivery Charge Rule" : "Add Pincode Delivery Charge"}
        size="lg"
      >
        <form onSubmit={handleSaveRecord} className="space-y-5 p-1">
          {/* Fulfillment Warehouse Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <FaWarehouse className="text-primary" /> Fulfillment Warehouse / Hub
              </label>
              {formData.warehouse_code && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {formData.warehouse_type === "master" ? "Master Hub" : "Sub-Depot"}
                </span>
              )}
            </div>
            <DropdownWithSearchInput
              options={warehouses.map((w) => ({
                text: `${w.warehouse_name} [${w.warehouse_code}] - ${w.cluster_name}`,
                label: `${w.warehouse_name} [${w.warehouse_code}] - ${w.cluster_name}`,
                value: w.warehouse_code,
              }))}
              value={formData.warehouse_code}
              onChange={(val) => {
                const wh = warehouses.find((w) => w.warehouse_code === val);
                if (wh) {
                  setFormData((prev) => ({
                    ...prev,
                    warehouse_id: wh.warehouse_id || wh.id,
                    warehouse_code: wh.warehouse_code,
                    warehouse_name: wh.warehouse_name,
                    warehouse_type: wh.warehouse_type,
                  }));
                }
              }}
              placeholder="Select Fulfillment Hub (Optional)"
            />
          </div>

          {/* Target Combo Kit Badge in Modal */}
          {formData.combo_kit_id || (selectedKit && selectedKit !== "default") ? (
            <div className="p-3 bg-primary/10 border-2 border-primary/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                  <FaBoxOpen size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    Configuring Freight For Kit
                  </p>
                  <p className="text-xs font-black text-text-primary">
                    {formData.combo_kit_name ||
                      comboKits.find((k) => (k._id || k.id) === formData.combo_kit_id)?.name ||
                      (selectedKit && selectedKit.name) ||
                      "Selected Combo Kit"}
                  </p>
                </div>
              </div>
              {!selectedKit && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, combo_kit_id: "", combo_kit_name: "" }))}
                  className="text-[11px] text-primary font-bold hover:underline"
                >
                  Change / Set Default
                </button>
              )}
            </div>
          ) : (
            /* Combo Kit Dropdown if opened globally */
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                Applicable Product / Combo Kit (Optional)
              </label>
              <DropdownWithSearchInput
                options={[
                  { text: "All Products (General rate for this PIN)", label: "All Products (General rate for this PIN)", value: "" },
                  ...comboKits.map((k) => ({
                    text: `${k.name} (${k.capacity || 0}kW)`,
                    label: `${k.name} (${k.capacity || 0}kW)`,
                    value: k._id || k.id,
                  })),
                ]}
                value={formData.combo_kit_id}
                onChange={(val) => {
                  const kObj = comboKits.find((k) => (k._id || k.id) === val);
                  setFormData((prev) => ({
                    ...prev,
                    combo_kit_id: val,
                    combo_kit_name: kObj ? kObj.name : "",
                  }));
                }}
                placeholder="All Products (Default)"
              />
              <p className="text-[10px] text-text-muted">
                Leave blank to make this the standard rate for all products in this PIN, or select a specific Kit.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                State <span className="text-rose-500">*</span>
              </label>
              <DropdownWithSearchInput
                options={states.map((s) => ({ text: s.name, label: s.name, value: s.name, id: s._id || s.id }))}
                value={formData.state_name}
                onChange={(val) => {
                  const sObj = states.find((s) => s.name === val);
                  setFormData((prev) => ({
                    ...prev,
                    state_name: val,
                    state_id: sObj?._id || sObj?.id || "",
                    district_name: "",
                    district_id: "",
                  }));
                }}
                placeholder="Select State (e.g. Gujarat)"
              />
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                District <span className="text-rose-500">*</span>
              </label>
              <DropdownWithSearchInput
                options={modalDistricts.map((d) => ({ text: d.name, label: d.name, value: d.name, id: d._id || d.id }))}
                value={formData.district_name}
                onChange={(val) => {
                  const dObj = modalDistricts.find((d) => d.name === val);
                  setFormData((prev) => ({
                    ...prev,
                    district_name: val,
                    district_id: dObj?._id || dObj?.id || "",
                  }));
                }}
                placeholder="Select District (e.g. Devbhumi Dwarka)"
                disabled={!formData.state_name}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pincode */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-text-secondary">
                PIN Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, "") }))}
                placeholder="e.g. 361320"
                className="w-full h-11 px-4 bg-surface border-2 border-border focus:border-primary rounded-xl text-sm font-bold text-text-primary outline-none transition-colors font-mono"
              />
              <p className="text-[10px] text-text-muted">Must be exact 6-digit postal PIN code</p>
            </div>

            {/* Loose Order Delivery Cost */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <FaBoxOpen size={11} /> Loose Order Rate (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.loose_delivery_cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, loose_delivery_cost: e.target.value, delivery_cost: e.target.value }))}
                  placeholder="e.g. 1500"
                  className="w-full h-11 pl-8 pr-4 bg-surface border-2 border-border focus:border-emerald-500 rounded-xl text-sm font-black text-text-primary outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-text-muted">Freight for single/loose orders</p>
            </div>
          </div>

          {/* PO Order & Trial Order Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <FaFileAlt size={11} /> Bulk PO Order Rate (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.po_delivery_cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, po_delivery_cost: e.target.value }))}
                  placeholder="e.g. 800"
                  className="w-full h-11 pl-8 pr-4 bg-surface border-2 border-border focus:border-indigo-500 rounded-xl text-sm font-black text-text-primary outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-text-muted">Freight for bulk PO procurement</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <FaBolt size={11} /> Trial Kit Order Rate (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.trial_delivery_cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, trial_delivery_cost: e.target.value }))}
                  placeholder="e.g. 1200"
                  className="w-full h-11 pl-8 pr-4 bg-surface border-2 border-border focus:border-amber-500 rounded-xl text-sm font-black text-text-primary outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-text-muted">Freight in Trial Order Modal (Image 3)</p>
            </div>
          </div>

          {/* Transit Days & Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary">Min Transit Days</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.estimated_days_min}
                onChange={(e) => setFormData((prev) => ({ ...prev, estimated_days_min: e.target.value }))}
                className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary">Max Transit Days</label>
              <input
                type="number"
                min="1"
                max="60"
                value={formData.estimated_days_max}
                onChange={(e) => setFormData((prev) => ({ ...prev, estimated_days_max: e.target.value }))}
                className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-bold text-text-primary outline-none"
              />
            </div>

            <div className="pt-4 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_active)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-bold text-text-primary">
                {formData.is_active ? "Active Route" : "Disabled Route"}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-secondary">Internal Logistics Notes</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Dispatched from Ahmedabad Regional Hub"
              className="w-full h-10 px-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs text-text-primary outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalLoading}>
              {editingItem ? "Update Delivery Charge Rule" : "Create Delivery Charge Rule"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────────────
          BULK IMPORT & UPDATE MODAL
          ────────────────────────────────────────────────────────────────────────── */}
      <Dialog
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title={
          selectedKit && selectedKit !== "default"
            ? `Bulk Import & Update Pincodes for ${selectedKit.name}`
            : "Bulk Import & Update Pincode Delivery Rates"
        }
        size="lg"
      >
        <div className="space-y-4 p-1 max-h-[80vh] overflow-y-auto pr-1">
          {/* Target Product & Upsert Explanation Banner */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-primary font-bold">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <FaBoxOpen size={16} />
              </div>
              <div>
                <p className="leading-tight">
                  Target Product:{" "}
                  <span className="font-black text-text-primary">
                    {selectedKit && selectedKit !== "default"
                      ? selectedKit.name
                      : "General / Fallback Rate (All Products)"}
                  </span>
                </p>
                <p className="text-[11px] text-text-secondary font-normal mt-0.5">
                  ⚡ <strong>Automatic Upsert Active:</strong> Existing pincodes for this kit will be updated with new delivery freight; new pincodes will be created automatically.
                </p>
              </div>
            </div>

            {/* Template & Export Quick Buttons */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<FaDownload size={11} />}
                className="text-[11px] h-8 bg-surface"
              >
                Sample CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCurrentRates}
                loading={isExporting}
                leftIcon={<FaFileCsv size={11} />}
                className="text-[11px] h-8 bg-surface"
              >
                Export Current CSV
              </Button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setBulkMode("file")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                bulkMode === "file"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaUpload size={12} />
              <span>Upload CSV / Excel File</span>
            </button>
            <button
              type="button"
              onClick={() => setBulkMode("paste")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                bulkMode === "paste"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              <FaFileAlt size={12} />
              <span>Paste Data (Excel / CSV / Text)</span>
            </button>
          </div>

          {/* TAB 1: CSV / EXCEL FILE UPLOAD */}
          {bulkMode === "file" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />

              {!bulkFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/60 bg-surface hover:bg-surface-hover/50"
                  }`}
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                    <FaCloudUploadAlt size={26} />
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">
                    Click to browse or drag & drop CSV or Excel file
                  </h4>
                  <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                    Supports <strong className="text-text-secondary">.CSV</strong>,{" "}
                    <strong className="text-text-secondary">.XLSX</strong>, and{" "}
                    <strong className="text-text-secondary">.XLS</strong> files. Columns: State, District, Pincode, DeliveryCost
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-surface border-2 border-primary/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      {bulkFile.name.endsWith(".xlsx") || bulkFile.name.endsWith(".xls") ? (
                        <FaFileExcel size={22} />
                      ) : (
                        <FaFileCsv size={22} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-text-primary truncate max-w-xs sm:max-w-md">
                        {bulkFile.name}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {(bulkFile.size / 1024).toFixed(1)} KB • {bulkParsedItems.length} rows parsed
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkFile(null);
                      setBulkParsedItems([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    leftIcon={<FaTimes size={11} />}
                    className="border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Change File
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT PASTE */}
          {bulkMode === "paste" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">
                  Paste rows directly from <strong>Excel / Google Sheets</strong> or CSV:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBulkText(
                        `Gujarat, Devbhoomi Dwarka, 361320, 1500\nGujarat, Jamnagar, 361001, 1200\nGujarat, Rajkot, 360001, 2500\nGujarat, Patan, 384265, 15500\nMaharashtra, Pune, 411001, 1400`
                      )
                    }
                    className="text-[11px] text-primary font-bold hover:underline"
                  >
                    Load Sample Data
                  </button>
                  {bulkText && (
                    <button
                      type="button"
                      onClick={() => setBulkText("")}
                      className="text-[11px] text-rose-500 font-bold hover:underline ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Gujarat Patan 384265 15500\nGujarat Porbandar 360575 8500\nGujarat Rajkot 360001 2500\nGujarat, Surat, 395003, 17500\nGujarat Vav-Tharad 385565 18500`}
                className="w-full p-3 bg-surface border-2 border-border focus:border-primary rounded-xl text-xs font-mono text-text-primary outline-none"
              />
              <p className="text-[10px] text-text-muted leading-tight">
                * Delimiters supported: Tabs from Excel (\t), Commas (,), Semicolons (;), or Spaces. Header row is automatically detected and skipped.
              </p>
            </div>
          )}

          {/* LIVE PARSED METRICS & PREVIEW TABLE */}
          {bulkParsedItems.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-border">
              {/* Summary Metrics */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <FaCheckCircle size={12} />
                    <span>{validCount} Ready to Import / Update</span>
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                      <FaTimesCircle size={12} />
                      <span>{invalidCount} Invalid Rows (skipped)</span>
                    </span>
                  )}
                </div>

                {bulkParsedItems.length > 5 && (
                  <span className="text-[11px] text-text-muted font-bold">
                    Showing {Math.min(bulkPreviewCount, bulkParsedItems.length)} of {bulkParsedItems.length} rows
                  </span>
                )}
              </div>

              {/* Scrollable Preview Table */}
              <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto bg-surface">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover border-b border-border text-[11px] font-bold text-text-secondary sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-10">#</th>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2">District</th>
                      <th className="px-3 py-2">Pincode</th>
                      <th className="px-3 py-2">Cost (₹)</th>
                      <th className="px-3 py-2">Days</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bulkParsedItems.slice(0, bulkPreviewCount).map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? "hover:bg-surface-hover/50" : "bg-rose-500/5 hover:bg-rose-500/10"}
                      >
                        <td className="px-3 py-2 text-text-muted font-mono text-[11px]">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-text-primary">{row.state_name || "—"}</td>
                        <td className="px-3 py-2 text-text-secondary">{row.district_name || "—"}</td>
                        <td className="px-3 py-2">
                          <span className="font-mono font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                            {row.pincode || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-black text-emerald-700 dark:text-emerald-400">
                          ₹{Number(row.delivery_cost || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-2 text-text-muted text-[11px]">
                          {row.estimated_days_min || 3}-{row.estimated_days_max || 7}d
                        </td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <FaCheck size={10} /> Ready
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400"
                              title={row.error}
                            >
                              <FaTimes size={10} /> {row.error || "Invalid"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkParsedItems.length > bulkPreviewCount && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setBulkPreviewCount((prev) => prev + 25)}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    View more rows ({bulkParsedItems.length - bulkPreviewCount} remaining)...
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5"
            >
              <FaDownload size={11} />
              <span>Download CSV Template</span>
            </button>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={bulkLoading}
                disabled={validCount === 0 || bulkLoading}
                onClick={handleBulkImport}
                leftIcon={<FaCheck size={12} />}
              >
                {validCount > 0
                  ? `Import & Update ${validCount} Rate${validCount === 1 ? "" : "s"}`
                  : "Import Rates"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ──────────────────────────────────────────────────────────────────────────
          DELETE CONFIRMATION POPUP
          ────────────────────────────────────────────────────────────────────────── */}
      <ConfirmationPopup
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Delivery Freight Rule"
        message={`Are you sure you want to remove delivery freight for ${
          deleteConfirm?.district_name || ""
        }, ${deleteConfirm?.state_name || ""} (${deleteConfirm?.pincode || ""})?`}
      />
    </div>
  );
}
