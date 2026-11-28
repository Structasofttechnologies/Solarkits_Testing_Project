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
  FaLandmark,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaSync,
  FaMapMarkerAlt,
  FaBoxOpen,
  FaCheckCircle,
  FaStar,
  FaShieldAlt,
  FaVideo,
  FaImage,
  FaTag,
  FaArrowLeft,
  FaExternalLinkAlt,
  FaFileAlt
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;
const MODULE_UID = "ADM_COMBO_KITS";

const DEFAULT_KIT_IMAGE = "https://images.unsplash.com/photo-1509391365360-2e959784a276?w=400&auto=format&fit=crop&q=80";

export default function GovtTenderKits({ moduleUniqueId = MODULE_UID }) {
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
    stats: {
      totalActive: 0,
      distinctStatesCount: 0,
      totalCount: 0
    }
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Masters
  const [states, setStates] = useState([]);
  const [comboKits, setComboKits] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedKitIds, setSelectedKitIds] = useState([]);
  const [formData, setFormData] = useState({
    state_id: "",
    state_name: "",
    combo_kit_id: "",
    display_name: "",
    tagline: "Specially Configured for Government Projects",
    tender_description: "",
    product_image: "",
    product_video: "",
    display_tag: "Govt. Tender",
    secondary_tag: "Bulk Supply",
    has_dcr_option: true,
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

  // 2. Fetch Catalog Combo Kits
  useEffect(() => {
    const fetchKits = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/combo-kits?status=active&limit=100&unique_id=${moduleUniqueId}&req_for=view`,
          { headers: authHeaderObj() }
        );
        const list = res.data?.combo_kits || res.data?.data || [];
        setComboKits(list);
      } catch (err) {
        console.error("Failed to load combo kits:", err);
      }
    };
    fetchKits();
  }, [moduleUniqueId]);

  // 3. Fetch Configured Govt Tender Kits
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20,
        unique_id: moduleUniqueId,
        req_for: "view"
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterState) params.state_id = filterState;
      if (filterStatus !== "all") params.status = filterStatus;

      const res = await axios.get(`${API_URL}/govt-tender-configs`, {
        params,
        headers: authHeaderObj()
      });

      if (res.data?.status === "success") {
        setItems(res.data.data || []);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch govt tender configs:", err);
      dispatch(
        setAlert({
          type: "danger",
          message: err.response?.data?.message || "Failed to load Govt Tender configurations."
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [currentPage, filterState, filterStatus, searchTerm]);

  // Handle Kit selection to auto-fill display name
  const handleKitSelect = (kitId) => {
    const selectedKit = comboKits.find((k) => String(k._id || k.id) === String(kitId));
    let stName = formData.state_name;
    if (!stName && formData.state_id) {
      const st = states.find((s) => String(s._id || s.id) === String(formData.state_id));
      if (st) stName = st.name;
    }
    const cap = selectedKit?.capacity || selectedKit?.system_capacity || selectedKit?.capacityKW || "";
    const autoName = `${cap ? cap + " kW" : ""} ${stName || "State"} Govt Tender Kit`.trim();

    setFormData((prev) => ({
      ...prev,
      combo_kit_id: kitId,
      display_name: prev.display_name && prev.display_name !== "" ? prev.display_name : autoName,
      product_image: prev.product_image || selectedKit?.product_image || selectedKit?.image_url || ""
    }));
  };

  // Handle State selection
  const handleStateSelect = (stateId) => {
    const st = states.find((s) => String(s._id || s.id) === String(stateId));
    const stName = st?.name || "";
    setFormData((prev) => {
      let dispName = prev.display_name;
      if (prev.combo_kit_id) {
        const selectedKit = comboKits.find((k) => String(k._id || k.id) === String(prev.combo_kit_id));
        const cap = selectedKit?.capacity || selectedKit?.system_capacity || selectedKit?.capacityKW || "";
        dispName = `${cap ? cap + " kW" : ""} ${stName} Govt Tender Kit`.trim();
      }
      return {
        ...prev,
        state_id: stateId,
        state_name: stName,
        display_name: dispName
      };
    });
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setSelectedKitIds([]);
    setFormData({
      state_id: filterState || "",
      state_name: states.find((s) => String(s._id || s.id) === String(filterState))?.name || "",
      combo_kit_id: "",
      display_name: "",
      tagline: "Specially Configured for Government Projects",
      tender_description: "State-specific tender configuration with bulk procurement support and DCR compliant solar modules.",
      product_image: "",
      product_video: "",
      display_tag: "Govt. Tender",
      secondary_tag: "Bulk Supply",
      has_dcr_option: true,
      priority: 1,
      is_active: true,
      notes: ""
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    const kId = String(item.combo_kit_id?._id || item.combo_kit_id || "");
    setSelectedKitIds(kId ? [kId] : []);
    setFormData({
      state_id: item.state_id?._id || item.state_id || "",
      state_name: item.state_name || "",
      combo_kit_id: kId,
      display_name: item.display_name || "",
      tagline: item.tagline || "Specially Configured for Government Projects",
      tender_description: item.tender_description || "",
      product_image: item.product_image || "",
      product_video: item.product_video || "",
      display_tag: item.display_tag || "Govt. Tender",
      secondary_tag: item.secondary_tag || "Bulk Supply",
      has_dcr_option: item.has_dcr_option ?? true,
      priority: item.priority || 1,
      is_active: item.is_active,
      notes: item.notes || ""
    });
    setShowModal(true);
  };

  // Save Modal
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.state_id) {
      dispatch(setAlert({ type: "warning", message: "Please select a target State." }));
      return;
    }
    if (!editingItem && selectedKitIds.length === 0) {
      dispatch(setAlert({ type: "warning", message: "Please select at least one applicable Combo Kit." }));
      return;
    }
    if (editingItem && !formData.combo_kit_id) {
      dispatch(setAlert({ type: "warning", message: "Please select an applicable Combo Kit." }));
      return;
    }

    setModalLoading(true);
    try {
      const payload = {
        ...formData,
        combo_kit_ids: !editingItem ? selectedKitIds : [formData.combo_kit_id],
        combo_kit_id: (!editingItem ? selectedKitIds[0] : formData.combo_kit_id) || formData.combo_kit_id
      };

      if (editingItem) {
        await axios.put(
          `${API_URL}/govt-tender-configs/${editingItem._id || editingItem.id}?unique_id=${moduleUniqueId}&req_for=edit`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: "Tender configuration updated successfully." }));
      } else {
        await axios.post(
          `${API_URL}/govt-tender-configs?unique_id=${moduleUniqueId}&req_for=add`,
          payload,
          { headers: authHeaderObj() }
        );
        dispatch(setAlert({ type: "success", message: `${selectedKitIds.length} Govt Tender Kit(s) configured successfully.` }));
      }
      setShowModal(false);
      fetchConfigs();
    } catch (err) {
      console.error("Save error:", err);
      dispatch(
        setAlert({
          type: "danger",
          message: err.response?.data?.message || "Failed to save configuration."
        })
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (item) => {
    try {
      await axios.patch(
        `${API_URL}/govt-tender-configs/${item._id || item.id}/toggle-status?unique_id=${moduleUniqueId}&req_for=edit`,
        {},
        { headers: authHeaderObj() }
      );
      dispatch(setAlert({ type: "success", message: "Status toggled successfully." }));
      fetchConfigs();
    } catch (err) {
      console.error("Toggle error:", err);
      dispatch(setAlert({ type: "danger", message: "Failed to toggle status." }));
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(
        `${API_URL}/govt-tender-configs/${deleteConfirm._id || deleteConfirm.id}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );
      dispatch(setAlert({ type: "success", message: "Configuration removed successfully." }));
      setDeleteConfirm(null);
      fetchConfigs();
    } catch (err) {
      console.error("Delete error:", err);
      dispatch(setAlert({ type: "danger", message: "Failed to delete configuration." }));
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Govt Tender Kits Configuration"
        subtitle="Configure state-specific Government & PSU tender solar kits, DCR modules, explainer videos and bulk supply tags."
        breadcrumbs={[
          { label: "Dashboard", href: `/admin-panel/dashboard` },
          { label: "Solar Shop", href: `/admin-panel/solar-shop/${countryName}/combokit-configurations/combo-kits` },
          { label: "Govt Tender Kits" }
        ]}
        stats={[
          { label: "Configured Kits", value: meta.stats?.totalCount || items.length, description: "Total tender mapped kits" },
          { label: "Active in Store", value: meta.stats?.totalActive || 0, description: "Live with tender badges" },
          { label: "Covered States", value: meta.stats?.distinctStatesCount || 0, description: "States with active tender specs" }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaArrowLeft />}
              onClick={() => navigate(`/admin-panel/solar-shop/${countryName}/combokit-configurations/combo-kits`)}
            >
              Combo Kits
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<FaPlus />}
              onClick={openAddModal}
            >
              Configure Tender Kit
            </Button>
          </div>
        }
      />

      {/* FILTER BAR */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* State Filter */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Target State
            </label>
            <select
              value={filterState}
              onChange={(e) => {
                setFilterState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              <option value="">All States</option>
              {states.map((st) => (
                <option key={st._id || st.id} value={st._id || st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
              Search Kits
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3 text-text-muted text-xs" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tender name, base kit..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-text-primary text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Reset Action */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FaSync />}
              onClick={() => {
                setFilterState("");
                setFilterStatus("all");
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-surface rounded-2xl border-2 border-border/60 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <FaLandmark size={15} />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-primary">Configured Government Tender Kits</h3>
              <p className="text-xs text-text-secondary">Showing kits actively tagged for state tender procurement</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border">
            Total {items.length} items
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-text-muted space-y-2">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading tender configurations...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-text-muted space-y-3">
            <FaBoxOpen className="mx-auto text-4xl text-text-muted/40" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-text-primary">No Govt Tender Kits Configured Yet</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Select a state and link an existing combo kit to display government tender badges and bulk procurement tags in the online store.
              </p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<FaPlus />} onClick={openAddModal}>
              Configure First Tender Kit
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-text-secondary font-black uppercase tracking-wider border-b border-border/80">
                <tr>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Tender Display Name</th>
                  <th className="py-3 px-4">Base Catalog Kit</th>
                  <th className="py-3 px-4">Display Badges</th>
                  <th className="py-3 px-4">DCR & Media</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((item) => (
                  <tr key={item._id || item.id} className="hover:bg-surface-hover/50 transition-colors">
                    {/* State */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200 dark:border-blue-800">
                        <FaMapMarkerAlt size={10} />
                        {item.state_name}
                      </span>
                    </td>

                    {/* Display Name */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-text-primary line-clamp-1">{item.display_name}</p>
                        <p className="text-[10px] text-text-secondary line-clamp-1 italic">{item.tagline}</p>
                      </div>
                    </td>

                    {/* Base Kit */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.product_image || DEFAULT_KIT_IMAGE}
                          alt={item.combo_kit_name}
                          className="w-9 h-9 rounded-lg object-contain bg-slate-50 border border-border p-0.5 shrink-0"
                          onError={(e) => { e.target.src = DEFAULT_KIT_IMAGE; }}
                        />
                        <div>
                          <p className="font-bold text-text-primary line-clamp-1">{item.combo_kit_name}</p>
                          <span className="text-[10px] text-primary font-black">{item.capacity} kW System</span>
                        </div>
                      </div>
                    </td>

                    {/* Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-700 to-indigo-800 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-2xs uppercase">
                          <FaLandmark size={8} className="text-amber-300" />
                          {item.display_tag || "Govt. Tender"}
                        </span>
                        {item.secondary_tag && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[9px] font-bold px-2 py-0.5 rounded-md">
                            {item.secondary_tag}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DCR & Media */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {item.has_dcr_option && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200">
                            <FaShieldAlt size={9} /> DCR
                          </span>
                        )}
                        {item.product_video && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-200" title="Video explainer attached">
                            <FaVideo size={9} /> Video
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                        {item.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<FaEdit size={13} className="text-primary" />}
                          onClick={() => openEditModal(item)}
                          title="Edit Configuration"
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<FaTrash size={13} className="text-red-500" />}
                          onClick={() => setDeleteConfirm(item)}
                          title="Remove from Govt Tenders"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center">
            <span className="text-xs text-text-secondary">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={meta.totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* CONFIGURE MODAL (DIALOG) */}
      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Govt Tender Kit Configuration" : "Configure Government Tender Kit"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 p-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target State */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Target State <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.state_id}
                onChange={(e) => handleStateSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                required
              >
                <option value="">-- Select State --</option>
                {states.map((st) => (
                  <option key={st._id || st.id} value={st._id || st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Kit will only show tender tags when customer browses in this state.
              </p>
            </div>

            {/* Applicable Combo Kit when editing */}
            {editingItem && (
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Applicable Combo Kit <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.combo_kit_id}
                  onChange={(e) => handleKitSelect(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  required
                >
                  <option value="">-- Select Base Kit --</option>
                  {comboKits.map((kit) => (
                    <option key={kit._id || kit.id} value={kit._id || kit.id}>
                      {kit.capacity || kit.system_capacity || kit.capacityKW} kW - {kit.name || kit.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Multi-Kit Selector when adding new */}
          {!editingItem && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span>Select Applicable Combo Kits for {formData.state_name || "State"}</span>
                  <span className="text-red-500">*</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                    {selectedKitIds.length} of {comboKits.length} Selected
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = comboKits.map(k => String(k._id || k.id));
                      setSelectedKitIds(allIds);
                      if (allIds.length > 0) handleKitSelect(allIds[0]);
                    }}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-border">•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedKitIds([])}
                    className="text-[11px] font-semibold text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-border">
                {comboKits.map((kit) => {
                  const kId = String(kit._id || kit.id);
                  const isChecked = selectedKitIds.includes(kId);
                  const cap = kit.capacity || kit.system_capacity || kit.capacityKW || 0;
                  return (
                    <label
                      key={kId}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/30 text-blue-950 dark:text-blue-100 font-bold"
                          : "bg-surface border-border hover:border-primary/40 text-text-primary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          let next;
                          if (isChecked) {
                            next = selectedKitIds.filter(id => id !== kId);
                          } else {
                            next = [...selectedKitIds, kId];
                          }
                          setSelectedKitIds(next);
                          if (next.length > 0) handleKitSelect(next[0]);
                        }}
                        className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary/30"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {cap} kW
                          </span>
                          <span className="text-xs font-bold truncate block">{kit.name || kit.title}</span>
                        </div>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          Base Kit: {kit.sku || "DCR Combo Kit"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Store Display Name (Tender Title) {!editingItem && selectedKitIds.length > 1 ? "(Auto-generated per kit capacity)" : ""}
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="e.g. 3 kW Gujarat Govt Tender Kit"
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              required={Boolean(editingItem || selectedKitIds.length <= 1)}
            />
          </div>

          {/* Tagline */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="e.g. Specially Configured for Government Projects"
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Display Tag */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Primary Badge Text
              </label>
              <input
                type="text"
                value={formData.display_tag}
                onChange={(e) => setFormData({ ...formData, display_tag: e.target.value })}
                placeholder="Govt. Tender"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Secondary Badge */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Secondary Badge Text
              </label>
              <input
                type="text"
                value={formData.secondary_tag}
                onChange={(e) => setFormData({ ...formData, secondary_tag: e.target.value })}
                placeholder="Bulk Supply"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Media Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Product / Banner Image URL
              </label>
              <input
                type="text"
                value={formData.product_image}
                onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">
                Explainer Video URL
              </label>
              <input
                type="text"
                value={formData.product_video}
                onChange={(e) => setFormData({ ...formData, product_video: e.target.value })}
                placeholder="https://... (MP4 / YouTube / Cloudinary)"
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Tender Description & Specs */}
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Tender Specifications & Eligibility
            </label>
            <textarea
              rows={3}
              value={formData.tender_description}
              onChange={(e) => setFormData({ ...formData, tender_description: e.target.value })}
              placeholder="State tender compliance, DCR module specifications, delivery turnaround, DISCOM/SNA approval requirements..."
              className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.has_dcr_option}
                onChange={(e) => setFormData({ ...formData, has_dcr_option: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-bold text-text-primary text-xs">DCR Module Option Available</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-primary focus:ring-primary h-4 w-4"
              />
              <span className="font-bold text-text-primary text-xs">Active in Online Store</span>
            </label>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" loading={modalLoading}>
              {editingItem ? "Update Configuration" : "Save Tender Configuration"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* DELETE CONFIRMATION POPUP */}
      <ConfirmationPopup
        isOpen={Boolean(deleteConfirm)}
        title="Remove Tender Configuration?"
        message={`Are you sure you want to remove the Government Tender tag for "${deleteConfirm?.display_name}" in ${deleteConfirm?.state_name}? The base combo kit will remain intact in catalog.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
