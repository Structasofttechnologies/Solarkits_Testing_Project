import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "@/features/alert.slice";
import MultiSelectDropdownWithSearchInput from "@/components/MultiSelectDropdownWithSearchInput";
import CustomFilePicker from "@/components/CustomFilePicker";
import Button from "@/components/Button";
import IconButton from "@/components/IconButton";
import Dialog from "@/components/Dialog";
import CustomInput from "@/components/CustomInput";
import Tooltip from "@/components/Tooltip";
import PageHeader from "@/components/PageHeader";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import PopupDataLoader from "@/components/PopupDataLoader";
import { authHeaderObj } from "@/app/authHeader";
import {
  FaPlus,
  FaTrashAlt,
  FaTrademark,
  FaIndustry,
  FaEdit,
  FaStore,
  FaImage,
  FaCheckCircle,
  FaCheck
} from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL;

export default function ManufacturingBrands({ moduleUniqueId }) {
  const dispatch = useDispatch();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Location Data States
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Dialog States
  const [showBrandDialog, setShowBrandDialog] = useState(false);

  // Track if we're editing to prevent auto-reset
  const [isEditing, setIsEditing] = useState(false);
  const [isPreloadingData, setIsPreloadingData] = useState(false);

  // Form States
  const [brandForm, setBrandForm] = useState({
    id: null,
    brand_name: "",
    company_name: "",
    logo: null,
    existing_logo: null,
    country_ids: [],
    state_ids: [],
    district_ids: [],
    is_oem_partner: false,
    is_supplier: false,
  });

  // Confirmation Popup State
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "danger",
    confirmText: "Delete",
    cancelText: "Cancel",
    onConfirm: null,
  });

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ==================== CONFIRMATION HELPER ====================
  const showConfirmation = (title, message, onConfirm, variant = "danger") => {
    setConfirmationState({
      isOpen: true,
      title,
      message,
      variant,
      confirmText: variant === "danger" ? "Delete" : "Confirm",
      cancelText: "Cancel",
      onConfirm: () => {
        onConfirm();
        setConfirmationState(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ==================== LOCATION DATA FETCHING ====================

  // Fetch Countries (geolocation_level_0)
  const fetchCountries = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_URL}/geolocation/countries?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );

      if (res.data?.countries) {
        setCountries(
          res.data.countries.map(c => ({
            value: c.id,
            text: c.name
          }))
        );
      }
    } catch (err) {
      console.error("Countries fetch error:", err);
    }
  }, [moduleUniqueId]);

  // Fetch States (geolocation_level_1)
  const fetchStates = useCallback(async (countryIds = []) => {
    if (!countryIds.length) {
      return [];
    }

    try {
      const allStates = [];

      for (const cid of countryIds) {
        const res = await axios.post(
          `${API_URL}/geolocation/states?unique_id=${moduleUniqueId}&req_for=view`,
          { country_id: cid },
          { headers: authHeaderObj() }
        );

        const formatted = (res.data.states || []).map(s => ({
          value: s.id,
          text: s.name,
          country_id: cid
        }));

        allStates.push(...formatted);
      }

      return allStates;
    } catch (err) {
      console.error("States fetch error:", err);
      return [];
    }
  }, [moduleUniqueId]);

  // Fetch Districts (geolocation_level_2)
  const fetchDistricts = useCallback(async (stateIds = []) => {
    if (!stateIds.length) {
      return [];
    }

    try {
      const allDistricts = [];

      for (const sid of stateIds) {
        const res = await axios.post(
          `${API_URL}/geolocation/districts?unique_id=${moduleUniqueId}&req_for=view`,
          { state_id: sid },
          { headers: authHeaderObj() }
        );

        const formatted = (res.data.districts || []).map(d => ({
          value: d.id,
          text: d.name,
          state_id: sid
        }));

        allDistricts.push(...formatted);
      }

      return allDistricts;
    } catch (err) {
      console.error("Districts fetch error:", err);
      return [];
    }
  }, [moduleUniqueId]);

  // ==================== API FUNCTIONS ====================

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    if (!moduleUniqueId) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/brand-manufacturer/get-brands?unique_id=${moduleUniqueId}&req_for=view`,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        setBrands(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      dispatch(setAlert({
        type: "error",
        message: "Failed to load brands",
        duration: 4000
      }));
    } finally {
      setLoading(false);
    }
  }, [moduleUniqueId, dispatch]);

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    fetchBrands();
    fetchCountries();
  }, [fetchBrands, fetchCountries]);

  // ==================== PRELOAD DATA FOR EDIT MODE ====================
  const preloadEditLocationData = async (countryIds, stateIds) => {
    setIsPreloadingData(true);

    try {
      // Load states based on selected countries
      if (countryIds && countryIds.length > 0) {
        const statesData = await fetchStates(countryIds);
        setStates(statesData);
      }

      // Load districts based on selected states
      if (stateIds && stateIds.length > 0) {
        const districtsData = await fetchDistricts(stateIds);
        setDistricts(districtsData);
      }
    } catch (error) {
      console.error("Error preloading location data:", error);
    } finally {
      setIsPreloadingData(false);
    }
  };

  // ==================== LOCATION DEPENDENCY EFFECTS ====================

  // Effect for states - when countries change
  useEffect(() => {
    // Skip if we're preloading data for edit mode
    if (isPreloadingData) return;

    const loadStates = async () => {
      if (brandForm.country_ids.length > 0) {
        const statesData = await fetchStates(brandForm.country_ids);
        setStates(statesData);
      } else {
        setStates([]);
      }

      // Only reset dependent selections if NOT in edit mode
      if (!isEditing && !isPreloadingData) {
        setBrandForm(prev => ({ ...prev, state_ids: [], district_ids: [] }));
      }
    };

    loadStates();
  }, [brandForm.country_ids, fetchStates, isEditing, isPreloadingData]);

  // Effect for districts - when states change
  useEffect(() => {
    // Skip if we're preloading data for edit mode
    if (isPreloadingData) return;

    const loadDistricts = async () => {
      if (brandForm.state_ids.length > 0) {
        const districtsData = await fetchDistricts(brandForm.state_ids);
        setDistricts(districtsData);
      } else {
        setDistricts([]);
      }

      // Only reset districts if NOT in edit mode
      if (!isEditing && !isPreloadingData) {
        setBrandForm(prev => ({ ...prev, district_ids: [] }));
      }
    };

    loadDistricts();
  }, [brandForm.state_ids, fetchDistricts, isEditing, isPreloadingData]);

  // ==================== BRAND HANDLERS ====================
  const handleSaveBrand = async () => {
    if (!brandForm.brand_name.trim()) {
      dispatch(setAlert({
        type: "warning",
        message: "Brand name is required",
        duration: 3000
      }));
      return false;
    }

    if (!brandForm.company_name.trim()) {
      dispatch(setAlert({
        type: "warning",
        message: "Company name is required",
        duration: 3000
      }));
      return false;
    }

    if (!brandForm.id && !brandForm.logo) {
      dispatch(setAlert({
        type: "warning",
        message: "Brand logo is required",
        duration: 3000
      }));
      return false;
    }

    setIsSaving(true);

    const formData = new FormData();
    formData.append("brand_name", brandForm.brand_name.trim());
    formData.append("company_name", brandForm.company_name.trim());
    formData.append("country_ids", JSON.stringify(brandForm.country_ids));
    formData.append("state_ids", JSON.stringify(brandForm.state_ids));
    formData.append("district_ids", JSON.stringify(brandForm.district_ids));
    formData.append("is_oem_partner", brandForm.is_oem_partner);
    formData.append("is_supplier", brandForm.is_supplier);

    if (brandForm.logo) {
      formData.append("logo", brandForm.logo);
    }

    const baseQuery = `?unique_id=${moduleUniqueId}&req_for=${brandForm.id ? 'edit' : 'add'}`;

    try {
      let res;
      if (brandForm.id) {
        res = await axios.put(
          `${API_URL}/brand-manufacturer/update-brand/${brandForm.id}${baseQuery}`,
          formData,
          {
            headers: {
              ...authHeaderObj(),
              "Content-Type": "multipart/form-data"
            }
          }
        );
      } else {
        res = await axios.post(
          `${API_URL}/brand-manufacturer/add-brand${baseQuery}`,
          formData,
          {
            headers: {
              ...authHeaderObj(),
              "Content-Type": "multipart/form-data"
            }
          }
        );
      }

      if (res.data?.status === "success") {
        await fetchBrands();
        dispatch(setAlert({
          type: "success",
          message: `Brand ${brandForm.id ? 'updated' : 'created'} successfully`,
          duration: 3000
        }));
        handleCloseBrandDialog();
        return true;
      } else {
        dispatch(setAlert({
          type: "error",
          message: res.data?.message || `Failed to ${brandForm.id ? 'update' : 'create'} brand`,
          duration: 4000
        }));
        return false;
      }
    } catch (error) {
      console.error("Failed to save brand:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || `Failed to ${brandForm.id ? 'update' : 'create'} brand`,
        duration: 4000
      }));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    try {
      const res = await axios.delete(
        `${API_URL}/brand-manufacturer/delete-brand/${deleteTarget}?unique_id=${moduleUniqueId}&req_for=delete`,
        { headers: authHeaderObj() }
      );

      if (res.data?.status === "success") {
        await fetchBrands();
        dispatch(setAlert({
          type: "success",
          message: "Brand deleted successfully",
          duration: 3000
        }));
        setDeleteTarget(null);
      } else {
        dispatch(setAlert({
          type: "error",
          message: res.data?.message || "Failed to delete brand",
          duration: 4000
        }));
      }
    } catch (error) {
      console.error("Failed to delete brand:", error);
      dispatch(setAlert({
        type: "error",
        message: error.response?.data?.message || "Failed to delete brand",
        duration: 4000
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== DIALOG HANDLERS ====================
  const handleOpenBrandDialog = async (brand = null) => {
    if (brand) {
      setIsEditing(true);
      setIsPreloadingData(true);
      setShowBrandDialog(true);

      // FIRST load states & districts
      const statesData = await fetchStates(brand.country_ids || []);
      setStates(statesData);

      const districtsData = await fetchDistricts(brand.state_ids || []);
      setDistricts(districtsData);

      // THEN set form (IMPORTANT ORDER)
      setBrandForm({
        id: brand.id,
        brand_name: brand.brand_name,
        company_name: brand.company_name || "",
        logo: null,
        existing_logo: brand.logo,
        country_ids: brand.country_ids || [],
        state_ids: brand.state_ids || [],
        district_ids: brand.district_ids || [],
        is_oem_partner: Boolean(brand.is_oem_partner),
        is_supplier: Boolean(brand.is_supplier),
      });

      setIsPreloadingData(false);
    } else {
      setIsEditing(false);
      setBrandForm({
        id: null,
        brand_name: "",
        company_name: "",
        logo: null,
        existing_logo: null,
        country_ids: [],
        state_ids: [],
        district_ids: [],
        is_oem_partner: false,
        is_supplier: false,
      });
      setStates([]);
      setDistricts([]);
      setShowBrandDialog(true);
    }
  };

  const handleCloseBrandDialog = () => {
    setShowBrandDialog(false);
    setIsEditing(false);
    setIsPreloadingData(false);
    setBrandForm({
      id: null,
      brand_name: "",
      company_name: "",
      logo: null,
      existing_logo: null,
      country_ids: [],
      state_ids: [],
      district_ids: [],
      is_oem_partner: false,
      is_supplier: false,
    });
    setStates([]);
    setDistricts([]);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBrandForm(prev => ({ ...prev, logo: file }));
    }
  };

  // Helper function to get location names
  const getLocationNames = (ids, namesArray) => {
    if (!ids || ids.length === 0) return '-';
    const names = ids.map(id => {
      const item = namesArray.find(n => n.id === id);
      return item ? item.name : '';
    }).filter(name => name);
    return names.join(', ');
  };

  // Filter brands based on search
  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.company_name && brand.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Stats
  const totalBrands = brands.length;

  return (
    <div className="space-y-6 pb-10">
      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        variant={confirmationState.variant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm}
        onCancel={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
        mode="text"
      />

      <PageHeader
        title="Brand Management"
        subtitle="Manage your product brands, company information, and geographic presence."
        icon={FaTrademark}
        stats={[
          { label: "Total Brands", value: totalBrands, description: "Registered in system" }
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => handleOpenBrandDialog()}
            leftIcon={<FaPlus />}
          >
            Add New Brand
          </Button>
        }
      />



      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 w-full">
            <CustomInput
              placeholder="Search brands by name or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<FaStore className="text-text-secondary" />}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-linear-to-r from-secondary/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-xl">
              <FaTrademark className="text-secondary" size={18} />
            </div>
            <div>
              <h2 className="font-bold text-text-primary tracking-tight">Active Brands</h2>
              <p className="text-xs text-text-secondary mt-0.5">Manage product brands, logos, and geographic presence</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-secondary mt-3">Loading brands...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-12 text-center">
            <FaTrademark className="mx-auto text-5xl text-text-secondary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Brands Found</h3>
            <p className="text-text-secondary mb-4">
              {searchTerm ? "Try adjusting your search" : "Get started by adding your first brand"}
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                leftIcon={<FaPlus />}
                onClick={() => handleOpenBrandDialog()}
              >
                Add First Brand
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-hover/50 border-b border-border">
                <tr>
                  <th className="text-left p-6 text-[11px] font-black uppercase tracking-widest text-text-secondary">Logo</th>
                  <th className="text-left p-6 text-[11px] font-black uppercase tracking-widest text-text-secondary">Identity</th>
                  <th className="text-left p-6 text-[11px] font-black uppercase tracking-widest text-text-secondary">Company</th>
                  <th className="text-left p-6 text-[11px] font-black uppercase tracking-widest text-text-secondary">Scope</th>
                  <th className="text-center p-6 text-[11px] font-black uppercase tracking-widest text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="p-6">
                      <div className="relative w-12 h-12">
                        {brand.logo ? (
                          <img
                            src={brand.logo}
                            alt={brand.brand_name}
                            className="w-full h-full object-contain aspect-square rounded-xl bg-white border border-border shadow-sm p-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-hover rounded-xl flex items-center justify-center border border-border/50">
                            <FaImage className="text-text-muted" size={20} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="font-bold text-text-primary text-base flex items-center gap-2 group-hover:text-primary transition-colors">
                          {brand.brand_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                             <FaTrademark size={10} />
                             Brand ID: {brand.id}
                          </div>
                          {brand.is_oem_partner && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              OEM Partner
                            </span>
                          )}
                          {brand.is_supplier && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Supplier
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="font-medium text-text-primary">
                        {brand.company_name || '-'}
                      </div>
                    </td>
                    <td className="p-6">
                       <div className="space-y-1.5 max-w-md">
                          {brand.country_names?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                               {brand.country_names.map(c => (
                                 <span key={c.id} className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tight rounded-md border border-primary/10">
                                   {c.name}
                                 </span>
                               ))}
                            </div>
                          )}
                          <p className="text-xs text-text-secondary font-medium line-clamp-1 opacity-70">
                            {[
                              brand.state_names?.map(s => s.name).join(', '),
                              brand.district_names?.map(d => d.name).join(', ')
                            ].filter(Boolean).join(' › ') || 'No regional mapping'}
                          </p>
                       </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2">
                        <Tooltip text="Edit Configuration" position="top">
                          <IconButton
                            variant="primary"
                            size="md"
                            onClick={() => handleOpenBrandDialog(brand)}
                            className="rounded-xl shadow-sm"
                          >
                            <FaEdit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip text="Purge Brand" position="top">
                          <IconButton
                            variant="danger"
                            size="md"
                            onClick={() => {
                              setDeleteTarget(brand.id);
                              showConfirmation(
                                "Delete Brand",
                                `Are you sure you want to delete "${brand.brand_name}"? This action cannot be undone.`,
                                () => handleDeleteBrand()
                              );
                            }}
                            className="rounded-xl shadow-sm"
                          >
                            <FaTrashAlt />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Brand Dialog */}
      <Dialog
        isOpen={showBrandDialog}
        onClose={handleCloseBrandDialog}
        title={`${brandForm.id ? 'Edit' : 'Add New'} Brand`}
        size="lg"
      >
        {isPreloadingData ? (
          <PopupDataLoader text="Loading geographic definitions..." />
        ) : (
          <div className="space-y-8 p-1">
          {/* Core Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomInput
              label="Brand Name *"
              placeholder="e.g., Tata Nexon, Mahindra Scorpio"
              value={brandForm.brand_name}
              onChange={(e) => setBrandForm(prev => ({ ...prev, brand_name: e.target.value }))}
              required
              className="w-full"
              leftIcon={<FaStore className="text-primary/60" />}
            />

            <CustomInput
              label="Company Name *"
              placeholder="e.g., Tata Motors Limited"
              value={brandForm.company_name}
              onChange={(e) => setBrandForm(prev => ({ ...prev, company_name: e.target.value }))}
              required
              className="w-full"
              leftIcon={<FaIndustry className="text-primary/60" />}
            />
          </div>

          {/* Brand Role / Partner Type Checkboxes */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary ml-1">
              Brand Classification
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* OEM Partner Checkbox */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setBrandForm(prev => ({ ...prev, is_oem_partner: !prev.is_oem_partner }))}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setBrandForm(prev => ({ ...prev, is_oem_partner: !prev.is_oem_partner }));
                  }
                }}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                  brandForm.is_oem_partner
                    ? "bg-primary/10 border-primary/50 text-text-primary shadow-xs"
                    : "bg-surface-hover/30 border-border text-text-secondary hover:border-primary/30 hover:text-text-primary"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  brandForm.is_oem_partner
                    ? "bg-primary border-primary text-white"
                    : "border-border bg-surface"
                }`}>
                  {brandForm.is_oem_partner && <FaCheck size={10} />}
                </div>
                <div>
                  <div className="font-bold text-sm text-text-primary">OEM Partner</div>
                  <div className="text-[11px] text-text-secondary">Original Equipment Manufacturer</div>
                </div>
              </div>

              {/* Supplier Checkbox */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setBrandForm(prev => ({ ...prev, is_supplier: !prev.is_supplier }))}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setBrandForm(prev => ({ ...prev, is_supplier: !prev.is_supplier }));
                  }
                }}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none ${
                  brandForm.is_supplier
                    ? "bg-primary/10 border-primary/50 text-text-primary shadow-xs"
                    : "bg-surface-hover/30 border-border text-text-secondary hover:border-primary/30 hover:text-text-primary"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  brandForm.is_supplier
                    ? "bg-primary border-primary text-white"
                    : "border-border bg-surface"
                }`}>
                  {brandForm.is_supplier && <FaCheck size={10} />}
                </div>
                <div>
                  <div className="font-bold text-sm text-text-primary">Supplier</div>
                  <div className="text-[11px] text-text-secondary">Direct Component / Equipment Supplier</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Logo Management */}
            <div className="space-y-4">
               <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary ml-1">Brand Identity</label>
               <div className="p-6 rounded-2xl border-2 border-dashed border-border bg-surface-hover/30 flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/30">
                  {brandForm.id && brandForm.existing_logo && !brandForm.logo ? (
                    <div className="relative group">
                      <img
                        src={brandForm.existing_logo}
                        alt={brandForm.brand_name}
                        className="w-24 h-24 object-contain aspect-square rounded-2xl bg-white shadow-xl border border-border p-2"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <p className="text-[10px] text-white font-bold uppercase tracking-widest">Current Logo</p>
                      </div>
                    </div>
                  ) : brandForm.logo ? (
                    <div className="w-24 h-24 rounded-2xl bg-success/10 border border-success/30 flex items-center justify-center text-success">
                       <FaCheckCircle size={32} />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/40">
                       <FaImage size={32} />
                    </div>
                  )}
                  
                  <CustomFilePicker
                    name="logo"
                    label={brandForm.id ? "Change Logo" : "Upload Logo *"}
                    onChange={handleLogoChange}
                    accept="image/*"
                    files={brandForm.logo ? [brandForm.logo] : []}
                    className="w-full"
                  />
               </div>
            </div>

            {/* Geographic Presence */}
            <div className="space-y-4">
               <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary ml-1">Geographic Presence</label>
               <div className="space-y-4 p-6 rounded-2xl border border-border bg-surface-hover/30">
                  <MultiSelectDropdownWithSearchInput
                    label="Countries"
                    values={brandForm.country_ids}
                    onChange={(vals) => setBrandForm(prev => ({ ...prev, country_ids: vals }))}
                    options={countries}
                    placeholder="Select countries"
                    className="w-full"
                  />

                  <MultiSelectDropdownWithSearchInput
                    label="States"
                    values={brandForm.state_ids}
                    onChange={(vals) => setBrandForm(prev => ({ ...prev, state_ids: vals }))}
                    options={states}
                    placeholder={brandForm.country_ids.length === 0 ? "Select countries first" : "Select states"}
                    disabled={brandForm.country_ids.length === 0}
                    className="w-full"
                  />

                  <MultiSelectDropdownWithSearchInput
                    label="Districts"
                    values={brandForm.district_ids}
                    onChange={(vals) => setBrandForm(prev => ({ ...prev, district_ids: vals }))}
                    options={districts}
                    placeholder={brandForm.state_ids.length === 0 ? "Select states first" : "Select districts"}
                    disabled={brandForm.state_ids.length === 0}
                    className="w-full"
                  />
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="secondary" onClick={handleCloseBrandDialog} disabled={isSaving} className="px-8">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSaveBrand} 
              loading={isSaving} 
              disabled={!brandForm.brand_name.trim() || !brandForm.company_name.trim() || (!brandForm.id && !brandForm.logo)}
              className="px-10 shadow-lg shadow-primary/20"
              leftIcon={!isSaving && <FaCheckCircle />}
            >
              {brandForm.id ? 'Save Changes' : 'Create Brand'}
            </Button>
          </div>
        </div>
      )}
      </Dialog>
    </div>
  );
}