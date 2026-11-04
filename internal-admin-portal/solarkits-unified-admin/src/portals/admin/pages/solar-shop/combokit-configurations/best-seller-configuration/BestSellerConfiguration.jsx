import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import { authHeaderObj } from "@/app/authHeader";

import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import PageHeader from "@/components/PageHeader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import DropdownWithSearchInput from "@/components/DropdownWithSearchInput";
import Pagination from "@/components/Pagination";
import Dialog from "@/components/Dialog";

import {
  FaAward,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSync,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaCheckCircle,
  FaStar,
  FaFire,
  FaArrowLeft,
  FaBolt,
  FaChartLine,
  FaShoppingBag,
  FaCrown,
  FaGlobeAsia,
  FaExternalLinkAlt
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const MODULE_UID = "ADM_COMBO_KITS";

const DEFAULT_KIT_IMAGE = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80";

export default function BestSellerConfiguration({ moduleUniqueId = MODULE_UID }) {
  const { countryName = "india" } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    scope: {
      scope_label: "All India (National)"
    },
    stats: {
      totalActive: 0,
      totalBookings: 0,
      topSellingKit: "",
      distinctStatesCount: 0,
      distinctDistrictsCount: 0,
      distinctKitsCount: 0
    }
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterKit, setFilterKit] = useState("");
  const [filterKitType, setFilterKitType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pincodeSearchInput, setPincodeSearchInput] = useState("");
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);

  // Geographic masters & Combo Kits
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [districtPincodes, setDistrictPincodes] = useState([]);
  const [modalDistricts, setModalDistricts] = useState([]);
  const [modalPincodes, setModalPincodes] = useState([]);
  const [comboKits, setComboKits] = useState([]);

  // Modal State
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
    badge_text: "Our Best Seller",
    priority: 1,
    is_active: true,
    notes: ""
  });

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

  // 2. Fetch Combo Kits
  useEffect(() => {
    const fetchKits = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/combo-kits/india/get-kits?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.data || [];
        setComboKits(list);
      } catch (err) {
        console.error("Failed to load combo kits:", err);
      }
    };
    fetchKits();
  }, [moduleUniqueId]);

  // 3. Fetch Districts (Loads all active districts when All India, or filters by state)
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        let url = `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view`;
        if (filterState) {
          const selectedStateObj = states.find(
            (s) => s.name?.toLowerCase() === filterState.toLowerCase() || s.id === filterState || s._id === filterState
          );
          const stateId = selectedStateObj?._id || selectedStateObj?.id || filterState;
          url += `&state_id=${stateId}`;
        } else {
          url += `&state_id=all`;
        }
        const res = await axios.get(url, { headers: authHeaderObj() });
        const list = res.data?.districts || res.data?.data || [];
        setDistricts(list);
      } catch (err) {
        console.error("Failed to load districts for filter:", err);
      }
    };
    fetchDistricts();
  }, [filterState, states, moduleUniqueId]);

  // 3b. Fetch Pincodes for filterDistrict
  useEffect(() => {
    if (!filterDistrict) {
      setDistrictPincodes([]);
      setFilterPincode("");
      return;
    }
    const fetchPincodes = async () => {
      try {
        const selectedDistObj = districts.find(
          (d) => d.name?.toLowerCase() === filterDistrict.toLowerCase() || d.id === filterDistrict || d._id === filterDistrict
        );
        const distId = selectedDistObj?._id || selectedDistObj?.id || filterDistrict;
        if (!distId) return;

        const res = await axios.get(
          `${API_URL}/geolocation/district-pincodes/${distId}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.district?.pincodes || [];
        setDistrictPincodes(list);
      } catch (err) {
        console.error("Failed to load district pincodes:", err);
      }
    };
    fetchPincodes();
  }, [filterDistrict, districts, moduleUniqueId]);

  // 4. Modal Districts when formData.state_id changes
  useEffect(() => {
    if (!formData.state_id) {
      setModalDistricts([]);
      setModalPincodes([]);
      return;
    }
    const fetchModalDistricts = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view&state_id=${formData.state_id}`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.districts || res.data?.data || [];
        setModalDistricts(list);
      } catch (err) {
        console.error("Failed to load modal districts:", err);
      }
    };
    fetchModalDistricts();
  }, [formData.state_id, moduleUniqueId]);

  // 4b. Modal Pincodes when formData.district_id changes
  useEffect(() => {
    if (!formData.district_id) {
      setModalPincodes([]);
      return;
    }
    const fetchModalPincodes = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/geolocation/district-pincodes/${formData.district_id}?unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.district?.pincodes || [];
        setModalPincodes(list);
      } catch (err) {
        console.error("Failed to load modal pincodes:", err);
      }
    };
    fetchModalPincodes();
  }, [formData.district_id, moduleUniqueId]);

  // Direct 6-Digit Pincode Lookup
  const handleDirectPincodeLookup = async (pincodeToLookup) => {
    const pin = (pincodeToLookup || pincodeSearchInput || "").trim();
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      dispatch(setAlert({ type: "error", message: "Please enter a valid 6-digit Pincode (e.g. 360001)." }));
      return;
    }

    setIsLookingUpPin(true);
    try {
      const res = await axios.get(`${API_URL}/india/v1/geo/pincode-lookup?pincode=${pin}`);
      if (res.data?.success && res.data?.data) {
        const loc = res.data.data;
        setFilterState(loc.state_name);
        setFilterDistrict(loc.district_name);
        setFilterPincode(pin);
        setPincodeSearchInput(pin);
        setCurrentPage(1);
        dispatch(
          setAlert({
            type: "success",
            message: `Location Resolved: ${loc.locality ? `${loc.locality}, ` : ''}${loc.district_name}, ${loc.state_name} (PIN: ${pin})`
          })
        );
      } else {
        dispatch(setAlert({ type: "warning", message: `No active district found for Pincode ${pin}.` }));
      }
    } catch (err) {
      console.error("Pincode lookup error:", err);
      dispatch(setAlert({ type: "error", message: "Failed to resolve pincode location." }));
    } finally {
      setIsLookingUpPin(false);
    }
  };

  // 5. Fetch Best Seller Records (Ranked by Sales & Booking Volume)
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const selectedStateObj = states.find(
        (s) => s.name?.toLowerCase() === filterState.toLowerCase() || s.id === filterState || s._id === filterState
      );
      const stateId = selectedStateObj?._id || selectedStateObj?.id || "";

      let distId = "";
      if (filterDistrict) {
        const selectedDistObj = districts.find(
          (d) => d.name?.toLowerCase() === filterDistrict.toLowerCase() || d.id === filterDistrict || d._id === filterDistrict
        );
        distId = selectedDistObj?._id || selectedDistObj?.id || filterDistrict;
      }

      const res = await axios.get(`${API_URL}/best-seller-configs`, {
        params: {
          unique_id: moduleUniqueId,
          req_for: "view",
          page: currentPage,
          limit: 25,
          search: searchTerm.trim(),
          state_id: stateId,
          district_id: distId,
          pincode: filterPincode.trim(),
          combo_kit_id: filterKit,
          status: filterStatus
        },
        headers: authHeaderObj()
      });

      if (res.data?.status === "success") {
        setItems(res.data.data || []);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to load best sellers:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to load best seller configurations."
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentPage, filterState, filterDistrict, filterPincode, filterKit, filterStatus, moduleUniqueId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterState("");
    setFilterDistrict("");
    setFilterPincode("");
    setPincodeSearchInput("");
    setFilterKit("");
    setFilterStatus("all");
    setCurrentPage(1);
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      state_id: "",
      state_name: "",
      district_id: "",
      district_name: "",
      pincode: "",
      combo_kit_id: "",
      badge_text: "Our Best Seller",
      priority: 1,
      is_active: true,
      notes: ""
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      state_id: item.state_id?._id || item.state_id || "",
      state_name: item.state_name || "",
      district_id: item.district_id?._id || item.district_id || "",
      district_name: item.district_name || "All Districts",
      pincode: item.pincode || "",
      combo_kit_id: item.combo_kit_id?._id || item.combo_kit_id?.id || item.combo_kit_id || "",
      badge_text: item.badge_text || "Our Best Seller",
      priority: item.priority || 1,
      is_active: item.is_active !== false,
      notes: item.notes || ""
    });
    setShowModal(true);
  };

  // Quick Promote to #1 Top Seller
  const handlePromoteToTop = async (item) => {
    try {
      const kitId = item.combo_kit_id?._id || item.combo_kit_id?.id || item.combo_kit_id;
      const targetStateId = filterState ? (selectedStateObj?._id || item.state_id || null) : null;
      const targetDistrictId = filterDistrict ? (selectedDistrictObj?._id || item.district_id || null) : null;
      const res = await axios.post(
        `${API_URL}/best-seller-configs?unique_id=${moduleUniqueId}&req_for=add`,
        {
          state_id: targetStateId,
          district_id: targetDistrictId,
          combo_kit_id: kitId,
          badge_text: "🔥 #1 Best Seller",
          priority: 1,
          is_active: true,
          is_manual_override: true,
          notes: `Promoted to #1 Top Seller for ${filterDistrict ? `${filterDistrict}, ${filterState}` : (filterState || 'All India')}`
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: `${item.combo_kit_id?.name || "Combo Kit"} promoted to #1 Best Seller!` }));
        fetchRecords();
      }
    } catch (err) {
      console.error("Promote error:", err);
      dispatch(setAlert({ type: "error", message: "Failed to promote kit." }));
    }
  };

  // Save Modal (Create / Update)
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.combo_kit_id) {
      dispatch(setAlert({ type: "error", message: "Please select a Combo Kit." }));
      return;
    }

    setModalLoading(true);
    try {
      if (editingItem) {
        // UPDATE (or Upsert)
        const res = await axios.put(
          `${API_URL}/best-seller-configs/${editingItem._id || editingItem.id}?unique_id=${moduleUniqueId}&req_for=edit`,
          {
            state_id: formData.state_id || null,
            district_id: formData.district_id || null,
            pincode: formData.pincode || null,
            combo_kit_id: formData.combo_kit_id,
            badge_text: formData.badge_text,
            priority: parseInt(formData.priority, 10) || 1,
            is_manual_override: true,
            is_active: formData.is_active,
            notes: formData.notes
          },
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "Best Seller configuration updated successfully." }));
          setShowModal(false);
          fetchRecords();
        }
      } else {
        // CREATE
        const res = await axios.post(
          `${API_URL}/best-seller-configs?unique_id=${moduleUniqueId}&req_for=add`,
          {
            state_id: formData.state_id || null,
            district_id: formData.district_id || null,
            pincode: formData.pincode || null,
            combo_kit_id: formData.combo_kit_id,
            badge_text: formData.badge_text || "Our Best Seller",
            priority: parseInt(formData.priority, 10) || 1,
            is_manual_override: true,
            is_active: formData.is_active,
            notes: formData.notes
          },
          { headers: authHeaderObj() }
        );
        if (res.data?.status === "success") {
          dispatch(setAlert({ type: "success", message: "Combo Kit tagged as Best Seller successfully." }));
          setShowModal(false);
          fetchRecords();
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to save Best Seller configuration."
        })
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Delete / Reset tag
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await axios.delete(
        `${API_URL}/best-seller-configs/${deleteConfirm._id || deleteConfirm.id}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        dispatch(setAlert({ type: "success", message: "Tag removed and reset to dynamic rank." }));
        setDeleteConfirm(null);
        fetchRecords();
      }
    } catch (err) {
      console.error("Delete error:", err);
      dispatch(
        setAlert({
          type: "error",
          message: err.response?.data?.message || "Failed to reset tag."
        })
      );
    }
  };

  // Inline Status Toggle
  const handleToggleStatus = async (item) => {
    try {
      const res = await axios.patch(
        `${API_URL}/best-seller-configs/${item._id || item.id}/toggle-status?unique_id=${moduleUniqueId}&req_for=edit`,
        {
          state_id: item.state_id,
          district_id: item.district_id,
          combo_kit_id: item.combo_kit_id?._id || item.combo_kit_id?.id || item.combo_kit_id
        },
        { headers: authHeaderObj() }
      );
      if (res.data?.status === "success") {
        setItems((prev) =>
          prev.map((it) =>
            (it._id || it.id) === (item._id || item.id) ? { ...it, is_active: res.data.is_active, _id: res.data.item_id || it._id } : it
          )
        );
        dispatch(
          setAlert({
            type: "success",
            message: `Status marked as ${res.data.is_active ? "Active" : "Inactive"}.`
          })
        );
        await fetchRecords();
      }
    } catch (err) {
      console.error("Status toggle error:", err);
      dispatch(setAlert({ type: "error", message: "Failed to update status." }));
    }
  };

  // Selected kit for form preview
  const selectedKitPreview = useMemo(() => {
    if (!formData.combo_kit_id) return null;
    return comboKits.find((k) => (k._id || k.id) === formData.combo_kit_id);
  }, [formData.combo_kit_id, comboKits]);

  // Current Scope Description
  const currentScopeText = useMemo(() => {
    if (filterPincode && filterDistrict && filterState) {
      return `${filterDistrict}, ${filterState} (PIN: ${filterPincode})`;
    }
    if (filterDistrict && filterState) {
      return `${filterDistrict}, ${filterState}`;
    }
    if (filterState) {
      return `${filterState} (State-wide)`;
    }
    return meta.scope?.scope_label || "All India (National Scope)";
  }, [filterPincode, filterDistrict, filterState, meta.scope]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Best Seller Configuration & Ranking"
        subtitle="Catalog combo kits ranked dynamically by live sales and EPC bookings. Filter by All-India, State, or District to review and customize regional top picks."
        icon={FaAward}
        stats={[
          {
            label: "Total Kits in Catalog",
            value: meta.total || items.length,
            description: "All India Combo Kits",
            icon: FaBoxOpen
          },
          {
            label: "Current Ranking Scope",
            value: currentScopeText,
            description: "Live geographic level",
            icon: FaGlobeAsia
          },
          {
            label: "Top Ranked Kit",
            value: meta.stats?.topSellingKit ? `#1 • ${meta.stats.topSellingKit.split(' ')[0]} ${meta.stats.topSellingKit.split(' ')[1] || ''}` : "#1 • 3 kW Kit",
            description: "Highest demand combo kit",
            icon: FaCrown
          },
          {
            label: "Total Regional Demand",
            value: `${Number(meta.stats?.totalBookings || 0).toLocaleString("en-IN")} Units`,
            description: "Cumulative bookings in scope",
            icon: FaFire
          }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaArrowLeft />}
              onClick={() =>
                navigate(`/admin-panel/solar-shop/${countryName || "india"}/combokit-configurations/combo-kits`)
              }
            >
              Combo Kits
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaExternalLinkAlt />}
              onClick={() =>
                navigate("/admin-panel/settings/website-settings/solar-store")
              }
              title="Open Website Configurations to sync Bestselling Showcase"
            >
              Website Showcase
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<FaPlus />}
              onClick={handleOpenAdd}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md cursor-pointer font-bold"
            >
              Add Best Seller Tag
            </Button>
          </div>
        }
      />

      {/* 1. ACTIVE COUNTRY CARD (Setup Location Linked) */}
      <div className="bg-surface rounded-2xl p-5 border border-border/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-primary/20 border-2 border-amber-500/30 flex items-center justify-center text-3xl shadow-sm shrink-0">
              🇮🇳
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-text-primary tracking-tight">India</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <FaCheckCircle className="text-[10px]" /> Active Country
                </span>
                {(!filterState && !filterDistrict && !filterPincode) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    National Level Active
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                National solar catalog master. EPC storefront defaults to All-India rankings, and re-ranks live when State, District, or Pincode is selected.
              </p>
            </div>
          </div>

          {/* Quick Metrics from Setup Location Master */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-surface-hover/70 border border-border/80 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-text-muted uppercase block">States</span>
              <span className="text-base font-black text-text-primary">37</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-surface-hover/70 border border-border/80 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-text-muted uppercase block">Districts</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">844</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-surface-hover/70 border border-border/80 text-center min-w-[95px]">
              <span className="text-[10px] font-bold text-text-muted uppercase block">Pincodes</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">20,532+</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[100px]">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase block">Catalog Kits</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{meta.total || items.length}</span>
            </div>
            {(filterState || filterDistrict || filterPincode) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="font-bold text-xs"
                title="Reset filters back to All India National Scope"
              >
                Reset to All-India
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR WITH SETUP LOCATION PINCODES */}
      <div className="bg-surface rounded-2xl p-5 border border-border/80 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 items-end">
          {/* Search */}
          <div className="space-y-1 lg:col-span-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
              Search Kits
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, kW..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-surface border border-border focus:border-amber-500 rounded-xl text-xs font-semibold text-text-primary placeholder:text-text-muted outline-none transition-colors"
              />
            </div>
          </div>

          {/* State Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 flex items-center justify-between">
              <span>State (Scope)</span>
              {filterState && (
                <span className="text-amber-500 font-bold lowercase text-[9px]">state filtered</span>
              )}
            </label>
            <DropdownWithSearchInput
              options={[
                { text: "All India (National Level)", label: "All India (National Level)", value: "" },
                ...states.map((s) => ({ text: s.name, label: s.name, value: s.name }))
              ]}
              value={filterState}
              onChange={(val) => {
                setFilterState(val);
                setFilterDistrict("");
                setFilterPincode("");
                setCurrentPage(1);
              }}
              placeholder="All India (National)"
            />
          </div>

          {/* District Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 flex items-center justify-between">
              <span>District (Scope)</span>
              {filterDistrict && (
                <span className="text-emerald-500 font-bold lowercase text-[9px]">district filtered</span>
              )}
            </label>
            <DropdownWithSearchInput
              options={[
                { text: filterState ? "All Districts in " + filterState : "All Districts across India (844 Districts)", label: filterState ? "All Districts in " + filterState : "All Districts across India", value: "" },
                ...districts.map((d) => ({
                  text: d.state_name && !filterState ? `${d.name} (${d.state_name})` : d.name,
                  label: d.state_name && !filterState ? `${d.name} (${d.state_name})` : d.name,
                  value: d.name
                }))
              ]}
              value={filterDistrict}
              onChange={(val) => {
                setFilterDistrict(val);
                setFilterPincode("");
                setCurrentPage(1);
                if (val) {
                  const matched = districts.find(d => d.name === val || d.id === val);
                  if (matched) {
                    if (!filterState && matched.state_name) setFilterState(matched.state_name);
                    if (matched.pincodes && matched.pincodes.length > 0) setDistrictPincodes(matched.pincodes);
                  }
                }
              }}
              placeholder={filterState ? `All ${filterState} Districts` : "Search any District across India..."}
            />
          </div>

          {/* Pincode Filter (Live from Setup Location) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1 flex items-center justify-between">
              <span>Pincode (Setup Location)</span>
              {filterPincode && (
                <span className="text-blue-500 font-bold lowercase text-[9px]">pincode active</span>
              )}
            </label>
            <DropdownWithSearchInput
              options={[
                { text: "All Pincodes in District", label: "All Pincodes in District", value: "" },
                ...districtPincodes.map((p) => ({
                  text: `${p.pincode} - ${p.locality || 'Area'}`,
                  label: `${p.pincode} - ${p.locality || 'Area'}`,
                  value: p.pincode
                }))
              ]}
              value={filterPincode}
              onChange={(val) => {
                setFilterPincode(val);
                setPincodeSearchInput(val);
                setCurrentPage(1);
              }}
              placeholder={filterDistrict ? (districtPincodes.length > 0 ? `Select Pincode (${districtPincodes.length} Available)` : "No Pincodes Available") : "Select District or Jump Below"}
              disabled={!filterDistrict && districtPincodes.length === 0}
            />
          </div>

          {/* Kit Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
              Kit Type
            </label>
            <select
              value={filterKitType}
              onChange={(e) => {
                setFilterKitType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">All Kit Types</option>
              <option value="On-Grid">⚡ On-Grid Solar Kits</option>
              <option value="Off-Grid">🔋 Off-Grid Solar Kits</option>
              <option value="Hybrid">⚡🔋 Hybrid Solar Kits</option>
              <option value="Commercial">🏢 Commercial Solar Kits</option>
              <option value="Residential">🏠 Residential Solar Kits</option>
              <option value="1kw">1 kW Kits</option>
              <option value="2kw">2 kW Kits</option>
              <option value="3kw">3 kW Kits</option>
              <option value="5kw">5 kW Kits</option>
              <option value="10kw">10 kW Kits</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider ml-1">
              Active Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text-primary outline-none focus:border-amber-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md" className="flex-1 font-bold">
              Filter
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </form>

        {/* Direct 6-Digit Pincode Quick Lookup Bar */}
        <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text-secondary font-semibold">
            <FaMapMarkerAlt className="text-amber-500 shrink-0" />
            <span>Direct Pincode Jump:</span>
            <span className="text-[11px] text-text-muted">Enter any 6-digit delivery pincode (e.g. 360001) to auto-select State & District.</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 360001"
              value={pincodeSearchInput}
              onChange={(e) => setPincodeSearchInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDirectPincodeLookup();
                }
              }}
              className="w-32 h-8.5 px-3 bg-surface border border-border rounded-lg text-xs font-bold text-text-primary text-center tracking-widest focus:border-amber-500 outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleDirectPincodeLookup()}
              disabled={isLookingUpPin || pincodeSearchInput.length !== 6}
              className="font-bold text-xs"
            >
              {isLookingUpPin ? "Resolving..." : "Lookup PIN"}
            </Button>
            {filterPincode && (
              <button
                type="button"
                onClick={() => {
                  setFilterPincode("");
                  setPincodeSearchInput("");
                }}
                className="text-[11px] text-red-500 font-bold hover:underline cursor-pointer"
              >
                Clear PIN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC RANKING & SCOPE NOTICE BANNER */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <FaCrown size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-primary flex items-center gap-2">
              <span>Ranking Scope:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black uppercase text-[11px] border border-amber-500/30">
                {currentScopeText}
              </span>
            </p>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Kits are ranked by live EPC bookings and demand volume in this area. Changing State or District updates regional rankings automatically.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-black text-text-primary">
            {items.length} Kits Ranked
          </span>
        </div>
      </div>

      {/* BEST SELLERS & RANKING TABLE */}
      <div className="bg-surface rounded-2xl border border-border/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-surface-hover/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-black text-text-primary uppercase tracking-wider">
              {currentScopeText} • Best Seller & Booking Ranking Matrix
            </span>
          </div>
          <span className="text-[11px] font-bold text-text-secondary bg-surface px-3 py-1 rounded-full border border-border">
            Total {items.length} Combo Kits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-hover/60 border-b border-border text-[11px] font-black uppercase tracking-wider text-text-secondary">
                <th className="px-6 py-4">Sales Rank</th>
                <th className="px-6 py-4">Combo Kit Details</th>
                <th className="px-6 py-4">Sales & Booking Volume</th>
                <th className="px-6 py-4">Target Region</th>
                <th className="px-6 py-4">Badge / Tag Display</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-9 w-9 border-3 border-amber-500 border-t-transparent" />
                      <p className="text-xs font-bold text-text-secondary">
                        Calculating live sales rankings for {currentScopeText}...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => {
                  const kit = item.combo_kit_id || {};
                  const isTopOne = item.rank === 1;
                  const isTopThree = item.rank <= 3;

                  return (
                    <tr
                      key={item._id || item.id}
                      className="hover:bg-amber-500/5 transition-colors group"
                    >
                      {/* Priority / Sales Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-2xl font-black flex flex-col items-center justify-center text-xs shadow-xs border ${
                            isTopOne
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white border-amber-300 shadow-amber-500/20 shadow-md ring-2 ring-amber-400/40"
                              : item.rank === 2
                              ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 dark:from-slate-700 dark:to-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 font-bold"
                              : item.rank === 3
                              ? "bg-gradient-to-br from-amber-700/20 to-amber-700/40 text-amber-800 dark:text-amber-300 border-amber-600/30"
                              : "bg-surface-hover text-text-primary border-border"
                          }`}>
                            {isTopOne && <FaCrown className="text-[10px] text-yellow-200 mb-0.5" />}
                            <span>#{item.rank}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-text-muted block">
                              {isTopOne ? "Top Pick" : isTopThree ? "Top Seller" : "Ranked"}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              in {filterDistrict || filterState || "India"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Combo Kit Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={kit.kit_image || DEFAULT_KIT_IMAGE}
                            alt={kit.name || "Combo Kit"}
                            className="w-12 h-12 object-cover rounded-xl border border-border shadow-xs shrink-0"
                            onError={(e) => { e.currentTarget.src = DEFAULT_KIT_IMAGE; }}
                          />
                          <div>
                            <p className="font-bold text-text-primary text-sm line-clamp-1">
                              {kit.name || "Unnamed Kit"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                                <FaBolt className="inline mr-1 text-[9px]" />
                                {kit.capacity ? `${kit.capacity} kW` : "Custom"}
                              </span>
                              {kit.base_price_cached > 0 && (
                                <span className="text-[11px] font-bold text-text-secondary">
                                  ₹{Number(kit.base_price_cached).toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sales & Booking Volume */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-black text-xs text-text-primary">
                            <FaFire className="text-amber-500" />
                            <span>{item.sales_volume || 0} Units Booked</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-text-secondary font-semibold">
                            <span>{item.orders_count || 0} Orders</span>
                            <span>•</span>
                            <span>₹{Number(Math.round(item.revenue || 0)).toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </td>

                      {/* Target Region (State, District & Pincode) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <FaMapMarkerAlt size={12} />
                          </span>
                          <div>
                            <p className="font-black text-text-primary text-xs uppercase tracking-wide">
                              {filterState ? filterState : (item.state_id ? item.state_name : "ALL INDIA (NATIONAL)")}
                            </p>
                            <span className={`inline-block text-[11px] font-semibold mt-0.5 ${
                              item.district_id || filterDistrict
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-text-muted"
                            }`}>
                              {filterDistrict || (item.district_id ? item.district_name : (filterState || item.state_id ? "All Districts" : "National Scope"))}
                            </span>
                            {item.configured_region && !filterState && (
                              <span className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                                Tagged: {item.configured_region}
                              </span>
                            )}
                            {item.pincode && (
                              <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                PIN: {item.pincode} {item.locality ? `• ${item.locality}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Badge Preview */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                          <FaStar className="text-yellow-200 text-[10px]" />
                          <span>{item.badge_text || "Our Best Seller"}</span>
                        </div>
                        {item.is_configured && (
                          <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                            ★ Custom Configured
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-text-muted mt-0.5 italic max-w-xs truncate">
                            {item.notes}
                          </p>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          title={`Click to ${item.is_active ? "deactivate" : "activate"}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              item.is_active ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isTopOne && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToTop(item)}
                              title="Promote to #1 Best Seller in this scope"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer"
                            >
                              <FaCrown size={11} className="text-amber-500" />
                              <span>Make #1</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit badge text, priority rank and notes"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          >
                            <FaEdit size={11} className="text-blue-500" />
                            <span>Edit Badge</span>
                          </button>
                          {item.is_configured && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(item)}
                              title="Reset custom tag and priority back to automatic sales volume ranking"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 text-[11px] font-semibold transition-all cursor-pointer"
                            >
                              <FaTrash size={10} />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <FaAward size={26} />
                      </div>
                      <p className="text-sm font-bold text-text-primary">
                        No Combo Kits available in catalog
                      </p>
                      <p className="text-xs text-text-secondary max-w-md">
                        Please create combo kits under Solar Shop &rarr; Combo Kits first.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ACTION GUIDE LEGEND */}
        <div className="px-6 py-3 bg-surface-hover/50 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-text-primary">💡 Action Guide:</span>
            <span><strong className="text-amber-600">Make #1</strong> promotes kit to #1 top spot.</span>
            <span><strong className="text-blue-600">Edit Badge</strong> customizes badge text & priority.</span>
            <span><strong className="text-gray-600">Reset</strong> restores natural sales volume order.</span>
          </div>
          <span className="text-[11px] text-text-muted">Rankings update dynamically when State or District is filtered.</span>
        </div>

        {/* PAGINATION */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-end">
            <Pagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL DIALOG */}
      <Dialog
        isOpen={showModal}
        onClose={() => !modalLoading && setShowModal(false)}
        title={editingItem ? "Customize Best Seller Tag & Rank" : "Add Custom Best Seller Tag"}
        size="lg"
      >
        <form onSubmit={handleSaveForm} className="space-y-5">
          {/* Notice Alert */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <FaStar className="text-amber-500 mt-0.5 shrink-0" size={16} />
            <p className="text-xs text-text-secondary leading-relaxed">
              When tagged or prioritized, this Combo Kit will showcase in the <strong>"Our Best Seller"</strong> section for EPC contractors browsing from the selected State and District (e.g. <strong>Gujarat &rarr; Rajkot</strong>).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* State Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Select State
              </label>
              <DropdownWithSearchInput
                options={[
                  { text: "All India (National)", label: "All India (National)", value: "" },
                  ...states.map((s) => ({
                    text: s.name,
                    label: s.name,
                    value: s._id || s.id
                  }))
                ]}
                value={formData.state_id}
                onChange={(val) => {
                  const stateObj = states.find((s) => (s._id || s.id) === val);
                  setFormData((prev) => ({
                    ...prev,
                    state_id: val,
                    state_name: stateObj?.name || "All India",
                    district_id: "",
                    district_name: "All Districts"
                  }));
                }}
                placeholder="Choose State (e.g. Gujarat)"
              />
            </div>

            {/* District Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Select District <span className="text-text-muted font-normal">(Optional / All)</span>
              </label>
              <DropdownWithSearchInput
                options={[
                  { text: "★ All Districts in State", label: "★ All Districts in State", value: "" },
                  ...modalDistricts.map((d) => ({
                    text: d.name,
                    label: d.name,
                    value: d._id || d.id
                  }))
                ]}
                value={formData.district_id}
                onChange={(val) => {
                  const distObj = modalDistricts.find((d) => (d._id || d.id) === val);
                  setFormData((prev) => ({
                    ...prev,
                    district_id: val,
                    district_name: distObj ? distObj.name : "All Districts"
                  }));
                }}
                placeholder={formData.state_id ? "Choose District (e.g. Rajkot)" : "Select State First"}
                disabled={!formData.state_id}
              />
            </div>

            {/* Pincode Select (Optional - Setup Location) */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>Select Specific Pincode <span className="text-text-muted font-normal">(Optional - Setup Location)</span></span>
                {formData.pincode && (
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, pincode: "" }))}
                    className="text-[10px] text-amber-600 hover:underline font-bold cursor-pointer"
                  >
                    Clear Pincode (Target All in District)
                  </button>
                )}
              </label>
              <DropdownWithSearchInput
                options={[
                  { text: "★ All Pincodes in District", label: "★ All Pincodes in District", value: "" },
                  ...modalPincodes.map((p) => ({
                    text: `${p.pincode} - ${p.locality || 'Area'}`,
                    label: `${p.pincode} - ${p.locality || 'Area'}`,
                    value: p.pincode
                  }))
                ]}
                value={formData.pincode}
                onChange={(val) => setFormData((prev) => ({ ...prev, pincode: val }))}
                placeholder={formData.district_id ? (modalPincodes.length > 0 ? "Choose Specific Pincode (or Leave for All)" : "No Pincodes Available") : "Select District First"}
                disabled={!formData.district_id}
              />
            </div>
          </div>

          {/* Combo Kit Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">
              Select Combo Kit to Tag <span className="text-danger">*</span>
            </label>
            <DropdownWithSearchInput
              options={comboKits.map((k) => ({
                text: `${k.name} — ${k.capacity || 0} kW ${k.base_price_cached ? `(₹${Number(k.base_price_cached).toLocaleString("en-IN")})` : ""}`,
                label: `${k.name} — ${k.capacity || 0} kW`,
                value: k._id || k.id
              }))}
              value={formData.combo_kit_id}
              onChange={(val) => setFormData((prev) => ({ ...prev, combo_kit_id: val }))}
              placeholder="Search and choose a created Combo Kit..."
              disabled={!!editingItem}
            />

            {/* Kit Preview Card */}
            {selectedKitPreview && (
              <div className="mt-2 p-3 bg-surface-hover rounded-xl border border-border flex items-center gap-3">
                <img
                  src={selectedKitPreview.kit_image || DEFAULT_KIT_IMAGE}
                  alt={selectedKitPreview.name}
                  className="w-12 h-12 object-cover rounded-lg border border-border shrink-0"
                  onError={(e) => { e.currentTarget.src = DEFAULT_KIT_IMAGE; }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-text-primary text-xs truncate">
                    {selectedKitPreview.name}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Capacity: <strong>{selectedKitPreview.capacity || 0} kW</strong> • Inverter: {selectedKitPreview.inverter_mode || "Single"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom Badge Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Badge / Tag Text
              </label>
              <input
                type="text"
                value={formData.badge_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, badge_text: e.target.value }))}
                placeholder="e.g. Our Best Seller / Most Popular"
                className="w-full h-10 px-3 bg-surface border border-border focus:border-amber-500 rounded-xl text-xs font-semibold text-text-primary outline-none"
              />
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1 mt-1">
                {["Our Best Seller", "🔥 #1 Best Seller", "⚡ High Demand", "⭐ Top Rated"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, badge_text: preset }))}
                    className="text-[9px] font-bold px-2 py-0.5 bg-surface-hover hover:bg-amber-500/10 hover:text-amber-600 rounded border border-border cursor-pointer transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Ranking */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Display Rank / Priority
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full h-10 px-3 bg-surface border border-border focus:border-amber-500 rounded-xl text-xs font-semibold text-text-primary outline-none"
              />
              <p className="text-[10px] text-text-muted">
                1 is shown first, followed by 2, 3...
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary">
              Admin Notes / Justification <span className="text-text-muted font-normal">(Internal only)</span>
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. High EPC demand for 3kW subsidy models in Rajkot district"
              className="w-full p-3 bg-surface border border-border focus:border-amber-500 rounded-xl text-xs text-text-primary outline-none resize-none"
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 bg-surface-hover rounded-xl border border-border">
            <div>
              <p className="text-xs font-bold text-text-primary">Active Status</p>
              <p className="text-[10px] text-text-muted">Enable to show immediately in the store</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.is_active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  formData.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowModal(false)}
              disabled={modalLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={modalLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
            >
              {modalLoading ? "Saving..." : editingItem ? "Update Tag" : "Save Best Seller Tag"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION POPUP */}
      <ConfirmationPopup
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Reset Best Seller Tag?"
        message={`Are you sure you want to reset the custom Best Seller tag for "${deleteConfirm?.combo_kit_id?.name || 'this kit'}"? It will revert to dynamic sales-volume ranking.`}
        confirmText="Reset Tag"
        cancelText="Keep"
        variant="danger"
      />
    </div>
  );
}
